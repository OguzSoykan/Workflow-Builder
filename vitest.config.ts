import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['apps/*/test/**/*.test.ts', 'packages/*/test/**/*.test.ts', 'scripts/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'packages/*/src/**/*.ts',
        'apps/worker/src/**/*.ts',
        'apps/web/src/editor/model.ts',
        'apps/web/src/editor/input-model.ts',
        'apps/web/src/editor/input-draft.ts',
        'apps/web/src/editor/condition-model.ts',
        'apps/web/src/editor/draft-storage.ts',
        'apps/web/src/editor/transfer.ts',
        'apps/web/src/editor/validation-messages.ts',
        'apps/web/src/editor/history.ts',
        'apps/web/src/editor/simulation-view.ts',
        'apps/web/src/editor/examples.ts',
      ],
      reporter: ['text', 'json-summary', 'html'],
    },
  },
});
