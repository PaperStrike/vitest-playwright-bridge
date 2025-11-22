import path from 'node:path'
import { defineConfig } from 'eslint/config'
import { includeIgnoreFile } from '@eslint/compat'
import eslint from '@eslint/js'
import markdown from '@eslint/markdown'
import stylistic from '@stylistic/eslint-plugin'
import tseslint from 'typescript-eslint'

export default defineConfig(
  // .gitignore
  includeIgnoreFile(path.resolve(import.meta.dirname, '.gitignore')),
  // JS/TS
  {
    files: ['**/*.?(m|c){js,ts}'],
    extends: [
      eslint.configs.recommended,
      stylistic.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
      {
        languageOptions: {
          parserOptions: {
            projectService: true,
            tsconfigRootDir: import.meta.dirname,
          },
        },
      },
      // Dependency issues.
      {
        rules: {
          // TypeScript isn't smart enough for this.
          '@typescript-eslint/no-non-null-assertion': 'off',
          // For declaration merging, 'with-single-extends' is the most reasonable compromise as of 2025-11.
          // https://github.com/typescript-eslint/typescript-eslint/issues/1614#issuecomment-2150456569
          // https://github.com/typescript-eslint/typescript-eslint/issues/11468#issuecomment-3168083087
          '@typescript-eslint/no-empty-object-type': ['error', {
            allowInterfaces: 'with-single-extends',
          }],
        },
      },
      // Stylistic rules.
      {
        rules: {
          '@typescript-eslint/explicit-member-accessibility': 'error',
          '@typescript-eslint/restrict-template-expressions': ['error', {
            allowAny: false,
            allowBoolean: true,
            allowNullish: true,
            allowNumber: true,
            allowRegExp: true,
          }],
          '@typescript-eslint/no-unused-vars': ['error', {
            args: 'all',
            argsIgnorePattern: '^_',
            caughtErrors: 'all',
            caughtErrorsIgnorePattern: '^_',
            destructuredArrayIgnorePattern: '^_',
            varsIgnorePattern: '^_',
            ignoreRestSiblings: true,
          }],
        },
      },
    ],
  },
  // Test files
  {
    files: ['test/**/*.ts'],
    rules: {
      // @playwright/test likes empty object patterns. (It ASTs the test fns internally.)
      'no-empty-pattern': ['error', { allowObjectPatternsAsParameters: true }],
    },
  },
  // Markdown code blocks
  markdown.configs.processor,
  {
    files: ['*.md/**/*.{js,ts}'],
    extends: [
      // Disable type checks until eslint and typescript can interop better.
      // https://github.com/eslint/markdown/tree/main/examples/typescript
      tseslint.configs.disableTypeChecked,
    ],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
)
