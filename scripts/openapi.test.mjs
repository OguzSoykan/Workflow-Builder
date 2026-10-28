import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { Ajv2020 } from 'ajv/dist/2020.js';

const spec = JSON.parse(readFileSync(new URL('../docs/openapi.json', import.meta.url), 'utf8'));
const methods = new Set(['get', 'post', 'put', 'patch', 'delete']);

function walk(value, visit) {
  if (!value || typeof value !== 'object') return;
  visit(value);
  for (const child of Object.values(value)) walk(child, visit);
}

test('OpenAPI draft has unique operations, resolvable references and explicit path parameters', () => {
  assert.equal(spec.openapi, '3.1.0');
  assert.ok(spec.info.title && spec.info.version);
  const ids = new Set();
  for (const [path, item] of Object.entries(spec.paths)) {
    for (const name of [...path.matchAll(/\{([^}]+)\}/g)].map((match) => match[1])) {
      assert.ok(
        item.parameters.some(
          (parameter) => parameter.name === name && parameter.in === 'path' && parameter.required,
        ),
      );
    }
    for (const [method, operation] of Object.entries(item)) {
      if (!methods.has(method)) continue;
      assert.ok(operation.operationId && !ids.has(operation.operationId));
      ids.add(operation.operationId);
      assert.ok(Object.keys(operation.responses).some((status) => /^2\d\d$/.test(status)));
      for (const [status, response] of Object.entries(operation.responses)) {
        assert.match(status, /^[1-5]\d\d$/);
        const definition = response.$ref
          ? response.$ref
              .slice(2)
              .split('/')
              .reduce((current, key) => current[key], spec)
          : response;
        assert.equal(typeof definition.description, 'string');
        if (status === '204') assert.ok(!('content' in response));
      }
    }
  }
  walk(spec, (value) => {
    if (!('$ref' in value)) return;
    assert.ok(value.$ref.startsWith('#/'), 'Only local references are permitted');
    const resolved = value.$ref
      .slice(2)
      .split('/')
      .reduce((current, key) => current?.[key], spec);
    assert.ok(resolved, `Unresolved reference: ${value.$ref}`);
  });
  assert.equal(ids.size, 16);
});

const implemented = new Set([
  'get /api/health',
  'get /api/config',
  'get /api/v1/me',
  'get /api/v1/workflows',
  'post /api/v1/workflows',
  'get /api/v1/workflows/{id}',
  'put /api/v1/workflows/{id}',
  'delete /api/v1/workflows/{id}',
  'get /api/v1/workflows/{id}/revisions',
  'get /api/v1/workflows/{id}/revisions/{n}',
  'get /api/v1/ai/limits',
  'post /api/v1/ai/workflows/generate',
]);

test('only listed operations are implemented and member routes require bearer authentication', () => {
  for (const [path, item] of Object.entries(spec.paths)) {
    assert.ok(!/auth\/(login|register)|simulations\/run|workflows\/validate/.test(path));
    for (const [method, operation] of Object.entries(item)) {
      if (!methods.has(method)) continue;
      assert.equal(
        operation['x-status'],
        implemented.has(`${method} ${path}`) ? 'implemented' : 'planned',
      );
      if (path.startsWith('/api/v1/me') || path.startsWith('/api/v1/workflows')) {
        assert.deepEqual(operation.security, [{ firebaseBearer: [] }]);
      }
    }
  }
  assert.equal(spec.components.schemas.Workflow.properties.schemaVersion.const, 1);
  assert.equal(spec.components.schemas.Workflow.properties.nodes.maxItems, 50);
  assert.equal(spec.components.schemas.Workflow.properties.edges.maxItems, 100);
  assert.equal(spec.components.schemas.Workflow.properties.inputs.maxItems, 30);
  assert.equal(spec.components.schemas.Workflow.additionalProperties, false);
  assert.ok(spec.paths['/api/v1/ai/workflows/edit'].post['x-decisions'].includes('D-11'));
});

test('JSON Schema 2020 schemas compile; health/error examples pass and bad envelopes fail', () => {
  const ajv = new Ajv2020({ strict: false });
  ajv.addSchema(spec, 'workflow-api');
  for (const [name, schema] of Object.entries(spec.components.schemas)) {
    const validate = ajv.compile({ $ref: `workflow-api#/components/schemas/${name}` });
    for (const example of schema.examples ?? []) assert.equal(validate(example), true);
  }
  const profile = ajv.compile({ $ref: 'workflow-api#/components/schemas/Profile' });
  assert.equal(profile(spec.components.schemas.Profile.examples[0]), true);
  assert.equal(profile({ data: { uid: '' }, meta: { requestId: 'x' } }), false);
  const health = ajv.compile({ $ref: 'workflow-api#/components/schemas/Health' });
  assert.equal(health({ data: { status: 'bad' }, meta: { requestId: 'test' } }), false);
  assert.equal(health({ data: { status: 'ok' } }), false);
  const error = ajv.compile({ $ref: 'workflow-api#/components/schemas/Error' });
  assert.equal(error({ error: { code: 'BAD' }, requestId: 'test' }), false);
});
