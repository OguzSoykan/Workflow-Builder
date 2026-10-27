import { readFileSync, writeFileSync } from 'node:fs';
import { getWorkflowJsonSchema } from '@workflow-builder/workflow-contract';

const path = new URL('../docs/openapi.json', import.meta.url);
const spec = JSON.parse(readFileSync(path, 'utf8'));
spec.components.schemas.Workflow = getWorkflowJsonSchema();
writeFileSync(path, JSON.stringify(spec, null, 2) + '\n');
