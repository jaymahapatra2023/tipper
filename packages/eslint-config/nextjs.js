/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: [require.resolve('./base')],
  env: {
    browser: true,
    node: true,
    es2022: true,
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
};
