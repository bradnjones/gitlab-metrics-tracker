/**
 * CredentialsContext
 *
 * Holds GitLab credentials (PAT + project path) in React state, persisted
 * to localStorage so they survive page reloads.
 *
 * @module public/contexts/CredentialsContext
 */

import { createContext, useContext, useState, useCallback } from 'react';
import { setCredentialsStore } from '../utils/apiFetch.js';

const CREDENTIALS_KEY = 'gitlab-metrics-credentials';

/**
 * @typedef {{ gitlabToken: string, projectPath: string }} Credentials
 */

/** @type {React.Context<{ credentials: Credentials|null, setCredentials: Function }|null>} */
const CredentialsContext = createContext({ credentials: null, setCredentials: () => {} });

/**
 * CredentialsProvider
 *
 * Wrap the application with this provider so any component can access
 * GitLab credentials via `useCredentials()`.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @returns {JSX.Element}
 */
export function CredentialsProvider({ children }) {
  /** @type {[Credentials|null, Function]} */
  const [credentials, setCredentialsState] = useState(() => {
    try {
      const stored = localStorage.getItem(CREDENTIALS_KEY);
      const parsed = stored ? JSON.parse(stored) : null;
      // Sync module store immediately so apiFetch has credentials before first render
      setCredentialsStore(parsed);
      return parsed;
    } catch {
      return null;
    }
  });

  // Synchronously update the apiFetch store and localStorage before React re-renders,
  // so chart useEffects that fire on the same render cycle see the new credentials.
  const setCredentials = useCallback((creds) => {
    setCredentialsStore(creds);
    try {
      if (creds) {
        localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(creds));
      } else {
        localStorage.removeItem(CREDENTIALS_KEY);
      }
    } catch {
      // Ignore write errors (e.g. private browsing quota)
    }
    setCredentialsState(creds);
  }, []);

  return (
    <CredentialsContext.Provider value={{ credentials, setCredentials }}>
      {children}
    </CredentialsContext.Provider>
  );
}

/**
 * useCredentials — access the credentials context
 *
 * @returns {{ credentials: Credentials|null, setCredentials: Function }}
 */
export function useCredentials() {
  return useContext(CredentialsContext);
}
