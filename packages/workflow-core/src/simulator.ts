import {
  compareText,
  computeContentHash,
  isFieldValue,
  parseWorkflow,
  type InputField,
  type ValidationIssue,
  type Workflow,
  type WorkflowNode,
} from '@workflow-builder/workflow-contract';
import { validateWorkflow } from './validator.ts';

// Workflow Contract §5. Pure: no clock, randomness or IO; the caller supplies runId.
export type InputValue = number | string | boolean;
export type SimulationStatus = 'waiting_for_approval' | 'completed' | 'rejected';
export type ApprovalDecision = 'approved' | 'rejected';

export interface SimulationStep {
  stepIndex: number;
  nodeId: string;
  nodeType: WorkflowNode['type'];
  action: 'start' | 'evaluate' | 'await_approval' | 'decide' | 'end';
  selectedHandle?: string;
  decision?: ApprovalDecision;
  outputState?: { conditionResult?: boolean; outcome?: 'completed' | 'rejected' };
}

export interface SimulationRun {
  runId: string;
  workflowContentHash: string;
  inputValues: Record<string, InputValue>;
  status: SimulationStatus;
  currentNodeId: string;
  trace: SimulationStep[];
  outcome?: 'completed' | 'rejected';
}

export type InputIssueCode =
  'INPUT_REQUIRED' | 'INPUT_TYPE_INVALID' | 'INPUT_OUT_OF_RANGE' | 'INPUT_UNKNOWN';
export interface InputIssue {
  code: InputIssueCode;
  fieldKey: string;
}

// The validating state of §5: a failure returns no run (the `failed` outcome).
export type SimulationResult =
  | { ok: true; run: SimulationRun }
  | { ok: false; error: 'WORKFLOW_INVALID'; issues: ValidationIssue[] }
  | { ok: false; error: 'INPUT_INVALID'; inputIssues: InputIssue[] }
  | { ok: false; error: 'WORKFLOW_CHANGED' | 'NOT_WAITING' };

function withinBounds(field: InputField, value: InputValue): boolean {
  switch (field.type) {
    case 'number':
    case 'date':
      return (
        (field.validation?.min === undefined ||
          (value as number | string) >= field.validation.min) &&
        (field.validation?.max === undefined || (value as number | string) <= field.validation.max)
      );
    case 'string':
      return (
        (field.validation?.minLength === undefined ||
          (value as string).length >= field.validation.minLength) &&
        (field.validation?.maxLength === undefined ||
          (value as string).length <= field.validation.maxLength)
      );
    default:
      return true;
  }
}

/** Applies defaults and checks required/used fields, types and bounds (D-14). */
export function normalizeInputs(
  workflow: Workflow,
  provided: Readonly<Record<string, unknown>>,
): { values: Record<string, InputValue>; issues: InputIssue[] } {
  const used = new Set(
    workflow.nodes.flatMap((node) => (node.type === 'condition' ? [node.config.fieldKey] : [])),
  );
  const fields = new Map(workflow.inputs.map((field) => [field.key, field]));
  const issues: InputIssue[] = Object.keys(provided)
    .filter((key) => !fields.has(key))
    .sort(compareText)
    .map((fieldKey) => ({ code: 'INPUT_UNKNOWN', fieldKey }));
  const values: Record<string, InputValue> = {};
  for (const field of [...workflow.inputs].sort((a, b) => compareText(a.key, b.key))) {
    const raw = Object.hasOwn(provided, field.key) ? provided[field.key] : undefined;
    const value = raw === undefined ? field.defaultValue : raw;
    if (value === undefined) {
      if (field.required || used.has(field.key))
        issues.push({ code: 'INPUT_REQUIRED', fieldKey: field.key });
      continue;
    }
    if (!isFieldValue(field, value)) {
      issues.push({ code: 'INPUT_TYPE_INVALID', fieldKey: field.key });
      continue;
    }
    const typed = value as InputValue;
    if (!withinBounds(field, typed)) {
      issues.push({ code: 'INPUT_OUT_OF_RANGE', fieldKey: field.key });
      continue;
    }
    values[field.key] = typed;
  }
  return { values, issues };
}

// Ordered operators compare same-typed numbers, or ISO dates by code unit; else no order.
function compareValues(actual: InputValue, expected: unknown): number | null {
  if (typeof actual === 'number' && typeof expected === 'number') return actual - expected;
  if (typeof actual === 'string' && typeof expected === 'string')
    return compareText(actual, expected);
  return null;
}

/** Case-sensitive text, ISO date order and exact enum options, as the validator requires. */
export function evaluateCondition(
  node: Extract<WorkflowNode, { type: 'condition' }>,
  values: Readonly<Record<string, InputValue>>,
): boolean {
  const { fieldKey, operator, value: expected } = node.config;
  const actual = values[fieldKey];
  if (actual === undefined) return false;
  const order = compareValues(actual, expected);
  switch (operator) {
    case 'eq':
      return actual === expected;
    case 'neq':
      return actual !== expected;
    case 'gt':
    case 'after':
      return order !== null && order > 0;
    case 'gte':
      return order !== null && order >= 0;
    case 'lt':
    case 'before':
      return order !== null && order < 0;
    case 'lte':
      return order !== null && order <= 0;
    case 'contains':
      return (
        typeof actual === 'string' && typeof expected === 'string' && actual.includes(expected)
      );
    case 'in':
      return Array.isArray(expected) && typeof actual === 'string' && expected.includes(actual);
  }
}

type Transition = { handle: string; detail: Partial<SimulationStep> } | null;

// Start and condition move on automatically; an approval stops the run (null).
function automatic(node: WorkflowNode, values: Readonly<Record<string, InputValue>>): Transition {
  if (node.type === 'start') return { handle: 'next', detail: { action: 'start' } };
  if (node.type !== 'condition') return null;
  const conditionResult = evaluateCondition(node, values);
  return {
    handle: conditionResult ? 'true' : 'false',
    detail: { action: 'evaluate', outputState: { conditionResult } },
  };
}

// Runs from `nodeId` until an approval waits or an end is reached; graphs are validated acyclic.
function advance(workflow: Workflow, run: SimulationRun, nodeId: string): SimulationRun {
  const trace = [...run.trace];
  const nodes = new Map(workflow.nodes.map((node) => [node.id, node]));
  let current = nodes.get(nodeId);
  for (let guard = 0; current && guard <= workflow.nodes.length; guard += 1) {
    const base = { stepIndex: trace.length, nodeId: current.id, nodeType: current.type };
    if (current.type === 'end') {
      const outcome = current.config.outcome;
      trace.push({ ...base, action: 'end', outputState: { outcome } });
      return { ...run, status: outcome, currentNodeId: current.id, trace, outcome };
    }
    const transition = automatic(current, run.inputValues);
    if (!transition) {
      trace.push({ ...base, action: 'await_approval' });
      return { ...run, status: 'waiting_for_approval', currentNodeId: current.id, trace };
    }
    trace.push({
      ...base,
      action: 'start',
      ...transition.detail,
      selectedHandle: transition.handle,
    });
    const from = current.id;
    const edge = workflow.edges.find(
      (item) => item.sourceNodeId === from && item.sourceHandle === transition.handle,
    );
    current = edge && nodes.get(edge.targetNodeId);
  }
  // Unreachable for validated graphs; kept so a broken invariant cannot loop.
  throw new Error('Simulation did not reach an approval or end.');
}

export function startSimulation(
  input: unknown,
  inputValues: Readonly<Record<string, unknown>>,
  runId: string,
): SimulationResult {
  const validation = validateWorkflow(input);
  const parsed = parseWorkflow(input);
  if (!validation.valid || !parsed.success)
    return { ok: false, error: 'WORKFLOW_INVALID', issues: validation.issues };
  const workflow = parsed.data;
  const { values, issues } = normalizeInputs(workflow, inputValues);
  if (issues.length) return { ok: false, error: 'INPUT_INVALID', inputIssues: issues };
  const start = workflow.nodes.find((node) => node.type === 'start');
  if (!start) return { ok: false, error: 'WORKFLOW_INVALID', issues: validation.issues };
  const empty: SimulationRun = {
    runId,
    workflowContentHash: computeContentHash(workflow),
    inputValues: values,
    status: 'waiting_for_approval',
    currentNodeId: start.id,
    trace: [],
  };
  return { ok: true, run: advance(workflow, empty, start.id) };
}

/** Applies a manual verdict; a changed workflow (different content hash) is rejected. */
export function decideApproval(
  input: unknown,
  run: SimulationRun,
  decision: ApprovalDecision,
): SimulationResult {
  const parsed = parseWorkflow(input);
  if (!parsed.success || computeContentHash(parsed.data) !== run.workflowContentHash)
    return { ok: false, error: 'WORKFLOW_CHANGED' };
  const workflow = parsed.data;
  const node = workflow.nodes.find((item) => item.id === run.currentNodeId);
  if (run.status !== 'waiting_for_approval' || node?.type !== 'approval')
    return { ok: false, error: 'NOT_WAITING' };
  const decided: SimulationRun = {
    ...run,
    trace: [
      ...run.trace,
      {
        stepIndex: run.trace.length,
        nodeId: node.id,
        nodeType: 'approval',
        action: 'decide',
        decision,
        selectedHandle: decision,
      },
    ],
  };
  const edge = workflow.edges.find(
    (item) => item.sourceNodeId === node.id && item.sourceHandle === decision,
  );
  if (!edge) return { ok: false, error: 'WORKFLOW_CHANGED' };
  return { ok: true, run: advance(workflow, decided, edge.targetNodeId) };
}
