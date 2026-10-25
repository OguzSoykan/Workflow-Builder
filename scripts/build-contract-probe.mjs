import { build } from 'vite';

// Test-only bundle; never added to the production web assets or Worker.
await build({
  configFile: false,
  build: {
    lib: {
      entry: 'tests/platform/browser-probe.ts',
      name: 'WorkflowProbe',
      formats: ['iife'],
      fileName: () => 'probe.js',
    },
    outDir: 'tests/platform/dist',
    emptyOutDir: true,
  },
});
