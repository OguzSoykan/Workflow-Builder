import { readFileSync } from 'node:fs';
import { Ajv2020 } from 'ajv/dist/2020.js';
import { expect, it } from 'vitest';
import { getWorkflowJsonSchema, parseWorkflow } from '@workflow-builder/workflow-contract';
import { purchaseWorkflow } from '../../../tests/fixtures/purchase';

it('keeps the OpenAPI workflow schema synchronized with the public contract', () => {
  const spec = JSON.parse(
    readFileSync(new URL('../../../docs/openapi.json', import.meta.url), 'utf8'),
  ) as { components: { schemas: { Workflow: object } } };
  expect(spec.components.schemas.Workflow).toEqual(getWorkflowJsonSchema());
  const validate = new Ajv2020({ strict: false }).compile(spec.components.schemas.Workflow);
  expect(validate(purchaseWorkflow())).toBe(true);
  for (const change of [
    { schemaVersion: 2 },
    { locale: 'xx' },
    { owner_uid: 'forged' },
    { title: '' },
    { nodes: Array(51).fill(purchaseWorkflow().nodes[0]) },
  ]) {
    const workflow = { ...purchaseWorkflow(), ...change };
    expect(validate(workflow)).toBe(false);
    expect(parseWorkflow(workflow).success).toBe(false);
  }
});
