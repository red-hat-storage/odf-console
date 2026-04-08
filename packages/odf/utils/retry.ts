type RetryOptions = {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  timeoutMs?: number;
  backoffFactor?: number;
};

const sleep = (ms: number): Promise<void> =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Retries an async operation with exponential backoff.
 * Rejects with the last error once maxRetries or timeoutMs is exceeded.
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const {
    maxRetries = 5,
    initialDelayMs = 1000,
    maxDelayMs = 30_000,
    timeoutMs,
    backoffFactor = 2,
  } = options ?? {};

  const startTime = Date.now();
  let lastError: unknown;

  // Sequential retry with backoff requires awaiting in a loop.
  /* eslint-disable no-await-in-loop */
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (timeoutMs != null && Date.now() - startTime >= timeoutMs) {
      break;
    }

    try {
      return await fn();
    } catch (err) {
      lastError = err;
    }

    if (attempt < maxRetries) {
      const delay = Math.min(
        initialDelayMs * backoffFactor ** attempt,
        maxDelayMs
      );

      if (timeoutMs != null) {
        const remaining = timeoutMs - (Date.now() - startTime);
        if (remaining <= 0) break;
        await sleep(Math.min(delay, remaining));
      } else {
        await sleep(delay);
      }
    }
  }
  /* eslint-enable no-await-in-loop */

  throw lastError;
}
