module.exports = {
  extends: 'stylelint-config-sass-guidelines',
  plugins: ['stylelint-order'],
  rules: {
    'order/order': ['custom-properties', 'declarations'],
    'selector-class-pattern': null,
    'selector-no-qualifying-type': [true, { ignore: ['attribute', 'class'] }],
    'max-nesting-depth': 3, // Increased from default 1 to allow existing code
    'declaration-property-value-disallowed-list': null, // Allow border: none
    // Disable all @stylistic rules to prevent formatting changes
    '@stylistic/indentation': null,
    '@stylistic/block-opening-brace-space-before': null,
    '@stylistic/declaration-block-trailing-semicolon': null,
    '@stylistic/declaration-block-semicolon-newline-after': null,
    '@stylistic/number-leading-zero': null,
    '@stylistic/declaration-colon-space-after': null,
    '@stylistic/color-hex-case': null,
    'declaration-empty-line-before': null,
    'rule-empty-line-before': null,
    'shorthand-property-no-redundant-values': null,
    'selector-pseudo-element-colon-notation': null,
  },
};
