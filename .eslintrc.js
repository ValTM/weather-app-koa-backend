module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  env: {
    node: true,
    browser: false,
    mocha: true
  },
  root: true,
  rules: {
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/ban-types': 'error',
    'comma-dangle': 'error',
    'max-len': ['error', 120],
    'quotes': ['error', 'single'],
    'semi': 'error'
  }
};
