const { defineConfig } = require('eslint/config');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');
const tslintPlugin = require('@typescript-eslint/eslint-plugin');
const tslintParser = require('@typescript-eslint/parser');
const eslintConfigPrettier = require('eslint-config-prettier/flat');

module.exports = defineConfig([
  eslintPluginPrettierRecommended,
  {
    ignores: ['dist/*', 'node_modules/*'],
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tslintParser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    plugins: {
      '@typescript-eslint': tslintPlugin,
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
    },
  },
  {
    files: ['**/*.js'], // Config files don't need type-aware rules
    languageOptions: {
      parser: tslintParser,
    },
  },
  eslintConfigPrettier,
]);
