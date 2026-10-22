import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['apps/worker/test/**/*.test.ts', 'packages/*/test/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.ts', 'apps/worker/src/**/*.ts'],
      reporter: ['text', 'json-summary', 'html'],
    },
  },
});
