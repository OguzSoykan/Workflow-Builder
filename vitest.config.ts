import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['apps/*/test/**/*.test.ts', 'packages/*/test/**/*.test.ts', 'scripts/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.ts', 'apps/worker/src/**/*.ts'],
      reporter: ['text', 'json-summary', 'html'],
    },
  },
});
