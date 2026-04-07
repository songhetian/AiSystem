import tsParser from '../frontend/node_modules/@typescript-eslint/parser/dist/index.js';
import tsPlugin from '../frontend/node_modules/@typescript-eslint/eslint-plugin/dist/index.js';

export default [
  {
    ignores: ['node_modules/**', 'dist/**']
  },
  {
    files: ['src/**/*.ts', 'prisma/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
        sourceType: 'module'
      }
    },
    plugins: {
      '@typescript-eslint': tsPlugin
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_'
        }
      ],
      '@typescript-eslint/no-explicit-any': 'off'
    }
  }
];
