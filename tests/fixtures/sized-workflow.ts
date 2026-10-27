import { utf8ByteLength, type Workflow } from '@workflow-builder/workflow-contract';
import { purchaseWorkflow } from './purchase.ts';

// Schema-only fixture: topology is irrelevant to an independent byte-limit check.
export function sizedWorkflow(bytes: number): Workflow {
  const workflow = purchaseWorkflow();
  workflow.inputs = Array.from({ length: 30 }, (_, index) => ({
    key: `field${index}`,
    label: 'Field',
    required: false,
    type: 'enum',
    options: Array.from({ length: 100 }, (_, option) => `option${option}`),
  }));
  let remaining = bytes - utf8ByteLength(JSON.stringify(workflow));
  for (const field of workflow.inputs) {
    if (field.type !== 'enum') continue;
    field.options = field.options.map((option) => {
      const padding = Math.min(120 - option.length, remaining);
      remaining -= padding;
      return option + 'x'.repeat(padding);
    });
  }
  if (remaining !== 0) throw new Error('Requested fixture size is outside available capacity');
  return workflow;
}
