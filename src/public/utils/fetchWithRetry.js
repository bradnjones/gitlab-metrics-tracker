/**
 * Fetch with automatic retry logic
 *
 * Retries failed HTTP requests with exponential backoff to handle transient failures
 * such as server restarts, network hiccups, or rate limiting.
 *
 * @module utils/fetchWithRetry
 */

/**
 * Delays execution for specified milliseconds
 *
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise<void>} Promise that resolves after delay
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetch with retry logic and exponential backoff
 *
 * @param {string} url - URL to fetch
 * @param {Object} [options={}] - Fetch options
 * @param {number} [maxRetries=3] - Maximum number of retry attempts
 * @param {number} [baseDelay=500] - Base delay in ms for exponential backoff
 * @returns {Promise<Response>} Fetch response
 * @throws {Error} If all retry attempts fail
 *
 * @example
 * try {
 *   const response = await fetchWithRetry('/api/metrics/velocity?iterations=1,2,3');
 *   const data = await response.json();
 * } catch (error) {
 *   console.error('All retry attempts failed:', error);
 * }
 */
export async function fetchWithRetry(url, options = {}, maxRetries = 3, baseDelay = 500) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // If response is OK or client error (4xx), don't retry
      // Only retry on server errors (5xx) or network failures
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }

      // Server error (5xx) - retry
      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);

      // Don't retry if this was the last attempt
      if (attempt < maxRetries) {
        const delayMs = baseDelay * Math.pow(2, attempt);
        console.warn(
          `[fetchWithRetry] Attempt ${attempt + 1}/${maxRetries + 1} failed for ${url}. ` +
          `Retrying in ${delayMs}ms... (Status: ${response.status})`
        );
        await delay(delayMs);
      }

    } catch (error) {
      // Network error or fetch failure - retry
      lastError = error;

      // Don't retry if this was the last attempt
      if (attempt < maxRetries) {
        const delayMs = baseDelay * Math.pow(2, attempt);
        console.warn(
          `[fetchWithRetry] Attempt ${attempt + 1}/${maxRetries + 1} failed for ${url}. ` +
          `Retrying in ${delayMs}ms... (Error: ${error.message})`
        );
        await delay(delayMs);
      }
    }
  }

  // All retries exhausted
  throw new Error(
    `Failed to fetch ${url} after ${maxRetries + 1} attempts. Last error: ${lastError.message}`
  );
}
