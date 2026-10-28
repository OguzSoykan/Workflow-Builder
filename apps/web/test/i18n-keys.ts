// Collects translatable source strings: literal first arguments of t() and values of the label/error
// maps that are translated at their lookup sites. Used by the catalog completeness test.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

const ROOT = new URL('../src/', import.meta.url).pathname;
export const TRANSLATED_MAPS = new Set([
  'NODE_LABELS',
  'HANDLE_LABELS',
  'INPUT_LABELS',
  'OPERATOR_LABELS',
  'EXAMPLE_LABELS',
  'STATUS_LABELS',
  'STATUS_TEXT',
  'SOURCE_LABELS',
  'VALUE_MESSAGES',
  'IMPORT_ERRORS',
  'ERRORS',
  'MESSAGES',
]);

export function sourceFiles(dir = ROOT): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? entry.name === 'i18n'
        ? []
        : sourceFiles(join(dir, entry.name))
      : /\.tsx?$/.test(entry.name)
        ? [join(dir, entry.name)]
        : [],
  );
}

export function collectKeys(): { keys: Set<string>; dynamic: string[] } {
  const keys = new Set<string>();
  const dynamic: string[] = [];
  for (const path of sourceFiles()) {
    const file = ts.createSourceFile(
      path,
      readFileSync(path, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
      path.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node) && node.expression.getText(file) === 't' && node.arguments[0]) {
        const arg = node.arguments[0];
        if (ts.isStringLiteralLike(arg)) keys.add(arg.text);
        else if (!/(\b[A-Z_]+)\[|as string/.test(arg.getText(file)))
          dynamic.push(`${path.split('/src/')[1]}: ${arg.getText(file)}`);
      }
      if (
        ts.isVariableDeclaration(node) &&
        TRANSLATED_MAPS.has(node.name.getText(file)) &&
        node.initializer
      ) {
        const init = ts.isAsExpression(node.initializer)
          ? node.initializer.expression
          : node.initializer;
        if (ts.isObjectLiteralExpression(init))
          for (const property of init.properties)
            if (ts.isPropertyAssignment(property)) {
              const value = property.initializer;
              if (ts.isStringLiteralLike(value)) keys.add(value.text);
              else if (ts.isTemplateExpression(value))
                dynamic.push(`${path.split('/src/')[1]}: map template ${value.getText(file)}`);
            }
      }
      ts.forEachChild(node, visit);
    };
    visit(file);
  }
  return { keys, dynamic };
}
