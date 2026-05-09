/**
 * API fetch utility with credential injection
 *
 * Provides a module-level credential store and a drop-in fetch replacement
 * that injects GitLab credential headers on every request.
 * Credentials are held in module memory only — never written to any storage.
 *
 * @module public/utils/apiFetch
 */

/** @type {{ gitlabToken: string, projectPath: string, anthropicApiKey?: string } | null} */
let _credentials = null;

/**
 * Set the active credentials.
 * Called by CredentialsContext whenever the user saves new credentials.
 * Pass null to clear (e.g. on logout).
 *
 * @param {{ gitlabToken: string, projectPath: string, anthropicApiKey?: string } | null} creds
 * @returns {void}
 */
export function setCredentialsStore(creds) {
  _credentials = creds;
}

/**
 * Drop-in replacement for fetch() that injects credential headers.
 * All other behaviour (method, body, existing headers) is passed through unchanged.
 *
 * @param {string} url - Request URL
 * @param {RequestInit} [options={}] - Standard fetch options
 * @returns {Promise<Response>}
 */
export async function apiFetch(url, options = {}) {
  const headers = { ...options.headers };

  if (_credentials?.gitlabToken) {
    headers['X-GitLab-Token'] = _credentials.gitlabToken;
  }
  if (_credentials?.projectPath) {
    headers['X-GitLab-Project'] = _credentials.projectPath;
  }
  if (_credentials?.anthropicApiKey) {
    headers['X-Anthropic-Key'] = _credentials.anthropicApiKey;
  }

  return fetch(url, { ...options, headers });
}
