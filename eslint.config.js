import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const tsconfigRootDir = new URL('.', import.meta.url).pathname;

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'dev-dist/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
      // Agent worktrees (a second checkout confuses the typed parser).
      '.claude/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { parserOptions: { tsconfigRootDir } } },
  {
    files: ['src/**/*.ts', 'kernel/**/*.ts', 'levels/**/*.ts'],
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    files: ['tools/**/*.ts', 'tests/**/*.ts', '*.config.ts', '*.config.js'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    },
  },
);
