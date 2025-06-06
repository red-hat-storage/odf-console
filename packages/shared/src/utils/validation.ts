/**
 * Starts and ends with a lowercase letter or number
 */
export const startAndEndsWithAlphanumerics = /^[a-z0-9](.*[a-z0-9])?$/;

/**
 * Only lowercase letters, numbers, non-consecutive periods, or hyphens
 */
export const alphaNumericsPeriodsHyphensNonConsecutive =
  /(^[a-z0-9]|^([-.](?![-.])))+([a-z0-9]|([-.](?![-.])))*[a-z0-9]*$/;

export const nonEmptyString = /^(?!\s*$).+/;

export default {
  startAndEndsWithAlphanumerics,
  alphaNumericsPeriodsHyphensNonConsecutive,
  nonEmptyString,
};
