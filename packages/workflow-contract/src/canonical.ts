import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';
import { compareText, type ValidationIssue } from './issues.ts';
import { parseWorkflow, type Workflow } from './schema.ts';

export class WorkflowContractError extends Error {
  readonly issues: readonly ValidationIssue[];

  constructor(issues: readonly ValidationIssue[]) {
    super('Invalid workflow document');
    this.name = 'WorkflowContractError';
    this.issues = issues;
  }
}

function requireWorkflow(input: unknown): Workflow {
  const parsed = parseWorkflow(input);
  if (!parsed.success) throw new WorkflowContractError(parsed.issues);
  return parsed.data;
}

function sortedKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortedKeys);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => compareText(a, b))
        .map(([key, child]) => [key, sortedKeys(child)]),
    );
  }
  return value;
}

function businessJSON(workflow: Workflow): string {
  const { schemaVersion, workflowId, title, description, locale } = workflow;
  return JSON.stringify(
    sortedKeys({
      schemaVersion,
      workflowId,
      title,
      ...(description === undefined ? {} : { description }),
      locale,
      inputs: workflow.inputs
        .map((field) =>
          field.type === 'enum'
            ? { ...field, options: [...field.options].sort(compareText) }
            : field,
        )
        .sort((a, b) => compareText(a.key, b.key)),
      nodes: workflow.nodes
        .map(({ id, type, label, config }) => ({
          id,
          type,
          label,
          config:
            type === 'condition' &&
            'operator' in config &&
            config.operator === 'in' &&
            Array.isArray(config.value)
              ? { ...config, value: [...config.value].sort(compareText) }
              : config,
        }))
        .sort((a, b) => compareText(a.id, b.id)),
      edges: [...workflow.edges].sort((a, b) => compareText(a.id, b.id)),
    }),
  );
}

/** Version 1 canonical business JSON; not a lossless export (layout is omitted). */
export function canonicalizeWorkflow(input: unknown): string {
  return businessJSON(requireWorkflow(input));
}

/** SHA-256 hex over UTF-8 canonical JSON. Never trusts a supplied contentHash. */
export function computeContentHash(input: unknown): string {
  return bytesToHex(sha256(utf8ToBytes(canonicalizeWorkflow(input))));
}

/** Lossless snapshot: array order and layout survive; the derived hash is refreshed. */
export function withContentHash(input: unknown): Workflow & { contentHash: string } {
  const workflow = requireWorkflow(input);
  const result = {
    ...workflow,
    contentHash: bytesToHex(sha256(utf8ToBytes(businessJSON(workflow)))),
  };
  // Adding the derived field must not make an export exceed the document limit.
  requireWorkflow(result);
  return result;
}

export function serializeWorkflow(input: unknown): string {
  return JSON.stringify(sortedKeys(withContentHash(input)));
}

export function hasValidContentHash(input: unknown): boolean {
  const parsed = parseWorkflow(input);
  return (
    parsed.success &&
    parsed.data.contentHash !== undefined &&
    parsed.data.contentHash === computeContentHash(parsed.data)
  );
}
