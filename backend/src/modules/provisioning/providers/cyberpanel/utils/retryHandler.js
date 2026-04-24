function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout(promise, timeoutMs, timeoutMessage = "Operation timed out") {
  let timer;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise((_, reject) => {
      timer = setTimeout(() => {
        const error = new Error(timeoutMessage);
        error.code = "CYBERPANEL_TIMEOUT";
        reject(error);
      }, timeoutMs);
    }),
  ]);
}

async function executeWithRetry(operation, options = {}) {
  const retries = Number(options.retries ?? 2);
  const baseDelayMs = Number(options.baseDelayMs ?? 1000);
  const factor = Number(options.factor ?? 2);
  const timeoutMs = Number(options.timeoutMs ?? 60000);
  const shouldRetry = typeof options.shouldRetry === "function"
    ? options.shouldRetry
    : (error) => error?.code === "CYBERPANEL_TIMEOUT" || /timeout|temporar|connection|econn/i.test(error?.message || "");

  let attempt = 0;
  let lastError;

  while (attempt <= retries) {
    try {
      return await withTimeout(
        Promise.resolve().then(() => operation(attempt + 1)),
        timeoutMs,
        `Operation timed out after ${timeoutMs}ms`
      );
    } catch (error) {
      lastError = error;
      if (attempt >= retries || !shouldRetry(error)) {
        throw error;
      }

      if (typeof options.onRetry === "function") {
        await options.onRetry({ attempt: attempt + 1, nextAttempt: attempt + 2, error });
      }

      const delayMs = baseDelayMs * Math.pow(factor, attempt);
      await sleep(delayMs);
      attempt += 1;
    }
  }

  throw lastError;
}

module.exports = {
  executeWithRetry,
  withTimeout,
};
