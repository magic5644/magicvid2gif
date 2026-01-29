// @ts-check
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 6,
        sourceType: 'module'
      }
    },
    plugins: {
      '@typescript-eslint': tseslint
    },
    rules: {
      '@typescript-eslint/naming-convention': 'warn',
      'semi': ['warn', 'always'],
      'curly': 'warn',
      'eqeqeq': 'warn',
      'no-throw-literal': 'warn'
    }
  },
  {
    ignores: [
      'out/**',
      'dist/**',
      '**/*.d.ts',
      'src/test/suite/index.js',
      'src/test/suite/*.js'
    ]
  }
];
