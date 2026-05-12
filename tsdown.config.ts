import decorators from 'rolldown-plugin-babel-decorators'
import { defineConfig } from 'tsdown'

export default defineConfig([
  {
    entry: {
      browser: 'src/browser/index.ts',
    },
    tsconfig: 'tsconfig.build.json',
    dts: {
      build: true,
      compilerOptions: {
        stripInternal: true,
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
    tsconfig: 'tsconfig.build.json',
    dts: {
      build: true,
      compilerOptions: {
        stripInternal: true,
      },
    },
    plugins: [
      decorators(),
    ],
    format: ['esm', 'cjs'],
    platform: 'node',
    sourcemap: true,
  },
])
