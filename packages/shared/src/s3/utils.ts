export const isNoLifecycleRuleError = (error) =>
  error?.name === 'NoSuchLifecycleConfiguration';

// TODO: verify whether 'name' is equal to'NoSuchCors'
export const isNoCorsRuleError = (error) => error?.name === 'NoSuchCORS';
