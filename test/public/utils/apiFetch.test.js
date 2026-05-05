/**
 * Tests for apiFetch utility
 *
 * @jest-environment jsdom
 * @module test/public/utils/apiFetch
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { apiFetch, setCredentialsStore } from '../../../src/public/utils/apiFetch.js';

describe('apiFetch', () => {
  beforeEach(() => {
    // Reset credentials before each test
    setCredentialsStore(null);
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });
  });

  test('calls fetch with the provided URL', async () => {
    await apiFetch('/api/iterations');
    expect(global.fetch).toHaveBeenCalledWith('/api/iterations', expect.any(Object));
  });

  test('passes through method, body, and existing headers unchanged', async () => {
    await apiFetch('/api/annotations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'test' }),
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/annotations', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ title: 'test' }),
      headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
    }));
  });

  test('does not inject credential headers when credentials are null', async () => {
    setCredentialsStore(null);
    await apiFetch('/api/iterations');

    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers['X-GitLab-Token']).toBeUndefined();
    expect(options.headers['X-GitLab-Project']).toBeUndefined();
  });

  test('injects X-GitLab-Token header when credentials are set', async () => {
    setCredentialsStore({ gitlabToken: 'glpat-abc123', projectPath: 'group/project' });
    await apiFetch('/api/iterations');

    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers['X-GitLab-Token']).toBe('glpat-abc123');
  });

  test('injects X-GitLab-Project header when credentials are set', async () => {
    setCredentialsStore({ gitlabToken: 'glpat-abc123', projectPath: 'group/project' });
    await apiFetch('/api/iterations');

    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers['X-GitLab-Project']).toBe('group/project');
  });

  test('does not inject X-GitLab-Token when gitlabToken is absent from creds', async () => {
    setCredentialsStore({ projectPath: 'group/project' });
    await apiFetch('/api/iterations');

    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers['X-GitLab-Token']).toBeUndefined();
  });

  test('merges credential headers with existing headers', async () => {
    setCredentialsStore({ gitlabToken: 'tok', projectPath: 'g/p' });
    await apiFetch('/api/metrics/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(options.headers['X-GitLab-Token']).toBe('tok');
    expect(options.headers['X-GitLab-Project']).toBe('g/p');
  });

  test('returns the fetch response', async () => {
    const mockResponse = { ok: true, status: 200, json: jest.fn() };
    global.fetch.mockResolvedValueOnce(mockResponse);

    const result = await apiFetch('/api/health');
    expect(result).toBe(mockResponse);
  });
});

describe('setCredentialsStore', () => {
  beforeEach(() => {
    setCredentialsStore(null);
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
  });

  test('updating credentials takes effect on next apiFetch call', async () => {
    setCredentialsStore({ gitlabToken: 'first-token', projectPath: 'g/p' });
    await apiFetch('/api/iterations');
    expect(global.fetch.mock.calls[0][1].headers['X-GitLab-Token']).toBe('first-token');

    global.fetch.mockClear();
    setCredentialsStore({ gitlabToken: 'second-token', projectPath: 'g/p' });
    await apiFetch('/api/iterations');
    expect(global.fetch.mock.calls[0][1].headers['X-GitLab-Token']).toBe('second-token');
  });

  test('clearing credentials removes headers from subsequent calls', async () => {
    setCredentialsStore({ gitlabToken: 'tok', projectPath: 'g/p' });
    setCredentialsStore(null);
    await apiFetch('/api/iterations');

    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers['X-GitLab-Token']).toBeUndefined();
  });
});
