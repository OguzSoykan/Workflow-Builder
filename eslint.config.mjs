import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

const internalImports = {
  group: ['@workflow-builder/*/*', '**/apps/*/src/**', '**/packages/*/src/**'],
  message: 'Use workspace public exports.',
};
export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.wrangler/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,mjs}'],
    rules: { 'no-restricted-imports': ['error', { patterns: [internalImports] }] },
  },
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: ['@workflow-builder/worker'],
          patterns: [internalImports, { group: ['**/worker/**'] }],
        },
      ],
    },
  },
  {
    files: ['apps/worker/src/**/*.ts'],
    languageOptions: { globals: globals.worker },
    rules: {
      'no-restricted-imports': [
        'error',
        { paths: ['@workflow-builder/web'], patterns: [internalImports, { group: ['**/web/**'] }] },
      ],
    },
  },
  {
    files: ['packages/*/src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            internalImports,
            {
              group: [
                'node:*',
                'react',
                'react-dom',
                'hono',
                'openai',
                'firebase*',
                '@cloudflare/*',
                '@workflow-builder/web',
                '@workflow-builder/worker',
                '**/apps/**',
                '**/web/**',
                '**/worker/**',
              ],
              message: 'Shared packages must be runtime independent.',
            },
          ],
        },
      ],
      'no-restricted-globals': ['error', 'fetch', 'window', 'document', 'process'],
    },
  },
  {
    files: ['packages/workflow-contract/src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            internalImports,
            {
              group: [
                '@workflow-builder/*',
                '**/workflow-core/**',
                'node:*',
                'react*',
                'hono',
                'openai',
                'firebase*',
                '@cloudflare/*',
                '**/apps/**',
              ],
            },
          ],
        },
      ],
    },
  },
  { files: ['**/*.mjs', '**/*.config.ts'], languageOptions: { globals: globals.node } },
);
