// Temporary declaration-only fix for https://github.com/xyflow/xyflow/issues/6038.
// Keep strict/exactOptionalPropertyTypes and full library checks enabled.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const root = new URL('../node_modules/@xyflow/system/', import.meta.url);
const version = JSON.parse(readFileSync(new URL('package.json', root), 'utf8')).version;
if (version !== '0.0.83')
  throw new Error('Review/remove the xyflow declaration patch for this version.');
const originalHash = '996f688cb1fa9ec6d13ba2b871558ce48d426f0122eadbc2595c57d764951e4c';
const patchedHash = '3a203cb5d77ae51bfa361dc2e31e7eecfa19b175f2517e717077dc33acfe135d';
const fields = [
  'sourcePosition',
  'targetPosition',
  'hidden',
  'selected',
  'dragging',
  'draggable',
  'selectable',
  'connectable',
  'deletable',
  'dragHandle',
  'width',
  'height',
  'initialWidth',
  'initialHeight',
  'parentId',
  'zIndex',
  'extent',
  'expandParent',
  'ariaLabel',
  'origin',
  'handles',
];
const digest = (text) => createHash('sha256').update(text).digest('hex');
// Verify both files before writing either of them. Unknown contents fail closed.
const updates = ['esm', 'umd'].map((variant) => {
  const path = new URL(`dist/${variant}/types/nodes.d.ts`, root);
  const text = readFileSync(path, 'utf8');
  if (digest(text) === patchedHash) return { path, text };
  if (digest(text) !== originalHash) throw new Error(`Unexpected xyflow ${variant} declarations.`);
  const boundary = text.indexOf('    measured?: {');
  let head = text.slice(0, boundary);
  for (const field of fields) {
    head = head.replace(new RegExp(`(    ${field}\\?: [^;]+);`), '$1 | undefined;');
  }
  const result = head + text.slice(boundary);
  if (digest(result) !== patchedHash)
    throw new Error('The xyflow declaration patch did not match.');
  return { path, text: result };
});
for (const { path, text } of updates) writeFileSync(path, text);
console.log('Verified xyflow 0.0.83 declaration-only compatibility patch.');
