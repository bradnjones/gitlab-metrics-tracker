/**
 * CredentialsContext
 *
 * Holds GitLab credentials (PAT + project path) in React state only.
 * Credentials are never written to localStorage, sessionStorage, or any
 * persistent medium. Refreshing the page requires re-entry.
 *
 * @module public/contexts/CredentialsContext
 */

import { createContext, useContext, useState, useEffect } from 'react';
import { setCredentialsStore } from '../utils/apiFetch.js';

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
  const [credentials, setCredentials] = useState(null);

  // Keep the apiFetch module store in sync whenever credentials change
  useEffect(() => {
    setCredentialsStore(credentials);
  }, [credentials]);

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
