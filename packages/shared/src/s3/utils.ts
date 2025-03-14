export const isNoLifecycleRuleError = (error) =>
  error?.name === 'NoSuchLifecycleConfiguration';

export const isNoCorsRuleError = (error) =>
  error?.name === 'NoSuchCORSConfiguration';
