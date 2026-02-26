module.exports = {
  extends: 'stylelint-config-sass-guidelines',
  plugins: ['stylelint-order'],
  rules: {
    'order/order': ['custom-properties', 'declarations'],
    'selector-class-pattern': null,
    'selector-no-qualifying-type': [true, { ignore: ['attribute', 'class'] }],
    'max-nesting-depth': 3, // Increased from default 1 to allow existing code
    'declaration-property-value-disallowed-list': null, // Allow border: none
  },
};
