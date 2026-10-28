import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import { EN } from '../src/i18n/en';
import { getLocale, setLocale, t } from '../src/i18n/i18n';
import { collectKeys, sourceFiles, TRANSLATED_MAPS } from './i18n-keys';

const placeholders = (text: string) =>
  [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

describe('English catalog (FR-11)', () => {
  const { keys, dynamic } = collectKeys();

  it('translates every source string with the same placeholders and has no stale entries', () => {
    expect([...keys].filter((key) => !(key in EN))).toEqual([]);
    expect(Object.keys(EN).filter((key) => !keys.has(key))).toEqual([]);
    for (const key of keys) expect(placeholders(EN[key] as string), key).toEqual(placeholders(key));
  });

  it('only translates known maps dynamically', () => {
    expect(dynamic.every((entry) => /VALUE_MESSAGES|: known$/.test(entry))).toBe(true);
  });

  it('leaves no Turkish copy outside t() in the UI sources', () => {
    const turkish = /[çğıöşüÇĞİÖŞÜ]/;
    const leftovers: string[] = [];
    for (const path of sourceFiles()) {
      const file = ts.createSourceFile(
        path,
        readFileSync(path, 'utf8'),
        ts.ScriptTarget.Latest,
        true,
        path.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
      );
      const exempt = (node: ts.Node) => {
        for (let parent = node.parent; parent; parent = parent.parent) {
          if (ts.isCallExpression(parent) && parent.expression.getText(file) === 't') return true;
          if (ts.isVariableDeclaration(parent) && TRANSLATED_MAPS.has(parent.name.getText(file)))
            return true;
        }
        return false;
      };
      const visit = (node: ts.Node) => {
        const text =
          ts.isJsxText(node) || ts.isStringLiteralLike(node)
            ? node.getText(file)
            : ts.isTemplateExpression(node)
              ? node.getText(file)
              : '';
        if (turkish.test(text) && !exempt(node) && !/Türkçe/.test(text))
          leftovers.push(`${path.split('/src/')[1]}: ${text.trim().slice(0, 60)}`);
        else ts.forEachChild(node, visit);
      };
      visit(file);
    }
    expect(leftovers).toEqual([]);
  });
});

describe('t()', () => {
  it('fills placeholders, falls back to the source and switches language', () => {
    expect(getLocale()).toBe('tr');
    expect(t('{kind} ekle', { kind: 'Onay' })).toBe('Onay ekle');
    setLocale('en');
    expect(t('{kind} ekle', { kind: 'Approval' })).toBe('Add Approval');
    expect(t('Bilinmeyen metin {x}', { x: 1 })).toBe('Bilinmeyen metin 1');
    expect(t('{missing} kalır')).toBe('{missing} kalır');
    setLocale('tr');
    expect(t('Geri al')).toBe('Geri al');
  });
});
