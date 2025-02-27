export const isNoLifecycleRuleError = (error) =>
  error?.name === 'NoSuchLifecycleConfiguration';
