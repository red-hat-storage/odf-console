const stylelint = require('stylelint');

const ruleName = 'custom/pf-prefix';
const messages = stylelint.utils.ruleMessages(ruleName, {
  expected: (name) =>
    `Expected "${name}" to be prefixed with "pf-v5-" or "pf-m-" if it starts with "pf-" or ".pf-".`,
});

module.exports = stylelint.createPlugin(ruleName, () => {
  return (root, result) => {
    // Regular expression to match variables, class names, mixins, etc., that start with pf- or .pf-
    const pfRegex = /(\.pf-|pf-)(?!v5-|m-)/;

    root.walkDecls((decl) => {
      const value = decl.value;
      const prop = decl.prop;

      // Check the value and property of the declaration
      if (pfRegex.test(value) || pfRegex.test(prop)) {
        stylelint.utils.report({
          message: messages.expected(prop),
          node: decl,
          result,
          ruleName,
        });
      }
    });

    root.walkRules((rule) => {
      const selector = rule.selector;

      // Check the selector (e.g., class names, IDs)
      if (pfRegex.test(selector)) {
        stylelint.utils.report({
          message: messages.expected(selector),
          node: rule,
          result,
          ruleName,
        });
      }
    });

    root.walkAtRules((atRule) => {
      const name = atRule.name;
      const params = atRule.params;

      // Check the name and parameters of at-rules (e.g., mixins, functions)
      if (pfRegex.test(name) || pfRegex.test(params)) {
        stylelint.utils.report({
          message: messages.expected(name),
          node: atRule,
          result,
          ruleName,
        });
      }
    });
  };
});

module.exports.ruleName = ruleName;
module.exports.messages = messages;
