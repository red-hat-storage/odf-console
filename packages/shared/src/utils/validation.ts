/**
 * Starts and ends with a lowercase letter or number
 */
export const startAndEndsWithAlphanumerics =
  /^(?![\W])([a-z0-9]|[\W]*([a-z0-9]))+(?![\W])$/;

/**
 * Only lowercase letters, numbers, non-consecutive periods, or hyphens
 */
export const alphaNumericsPeriodsHyphensNonConsecutive =
  /^[a-z0-9]+([a-z0-9]|([-.](?![-.])))*[a-z0-9]*$/;

export default {
  startAndEndsWithAlphanumerics,
  alphaNumericsPeriodsHyphensNonConsecutive,
};
