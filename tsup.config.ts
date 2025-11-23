import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: {
      browser: 'src/browser/index.ts',
    },
    dts: {
      compilerOptions: {
        stripInternal: true,

        // Workaround for tsup not supporting project references
        // https://github.com/egoist/tsup/issues/647
        composite: false,
        lib: ['ESNext', 'DOM', 'DOM.Iterable'],
      },
    },
    format: 'esm',
    platform: 'browser',
    sourcemap: true,
  },
  {
    entry: {
      plugin: 'src/plugin/index.ts',
    },
    dts: {
      compilerOptions: {
        stripInternal: true,

        // same workaround as above
        composite: false,
        types: ['node'],
      },
    },
    format: 'esm',
    platform: 'node',
    sourcemap: true,
  },
])
