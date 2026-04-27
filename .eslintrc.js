module.exports = {
  root: true,
  env: {
    node: true
  },
  'extends': [
    'plugin:vue/essential',
    '@vue/standard'
  ],
  rules: {
    'no-console': 'off',
    'no-debugger': 'off',
    'camelcase': 'off',
    // Disable multi-word component names rule
    'vue/multi-word-component-names': 'off',

    // Disable unnecessary template attributes rule
    'vue/no-useless-template-attributes': 'off',

    // Disable object curly newline rule
    'object-curly-newline': 'off',

    // Disable unused variable rule for Vue files
    'vue/no-unused-vars': 'off',

    // Disable quote-props rule
    'quote-props': 'off',

    // Disable no-empty rule
    'no-empty': 'off',

    // Disable specific component naming rule for Vue components
    'vue/component-name-in-template-casing': 'off',

    'prefer-const': 'off',

    // Disable 'array-bracket-spacing' rule
    'array-bracket-spacing': 'off'

  },
  parserOptions: {
    parser: '@babel/eslint-parser'
  }
}
