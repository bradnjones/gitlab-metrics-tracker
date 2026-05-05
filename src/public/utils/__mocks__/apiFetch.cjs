/**
 * Jest mock for apiFetch module (CommonJS version)
 *
 * Delegates to global.fetch so existing tests that mock global.fetch
 * continue to work without modification. Tests that want to assert on
 * the exact apiFetch call can override this mock with jest.mock().
 *
 * The credential-injection logic is bypassed in tests (credentials are
 * a runtime concern tested separately in apiFetch.test.js).
 */

const apiFetch = (...args) => global.fetch(...args);
const setCredentialsStore = jest.fn();

module.exports = { apiFetch, setCredentialsStore };
