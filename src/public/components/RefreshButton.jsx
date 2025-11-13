/**
 * RefreshButton Component
 * Button to manually clear cache and trigger refresh
 *
 * Story V9.3: Cache Management UI
 *
 * @module components/RefreshButton
 */

import React, { useState } from 'react';
import styled from 'styled-components';

/**
 * LocalStorage key for selected iterations (must match VelocityApp.jsx)
 */
const STORAGE_KEY = 'gitlab-metrics-selected-iterations';

/**
 * Styled Components
 */

const Button = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 14px;
  font-weight: 500;
  color: ${props => (props.$variant === 'success' ? '#10b981' : props.$variant === 'error' ? '#ef4444' : '#374151')};
  background-color: ${props => (props.$variant === 'success' ? '#d1fae5' : props.$variant === 'error' ? '#fee2e2' : '#f3f4f6')};
  border: 1px solid ${props => (props.$variant === 'success' ? '#10b981' : props.$variant === 'error' ? '#ef4444' : '#d1d5db')};
  border-radius: 6px;
  cursor: ${props => (props.disabled ? 'not-allowed' : 'pointer')};
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background-color: ${props => (props.$variant === 'success' ? '#a7f3d0' : props.$variant === 'error' ? '#fecaca' : '#e5e7eb')};
  }

  &:active:not(:disabled) {
    transform: scale(0.98);
  }

  &:disabled {
    opacity: 0.6;
  }
`;

const Icon = styled.span`
  display: inline-flex;
  font-size: 16px;

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  ${props =>
    props.$spinning &&
    `
    animation: spin 1s linear infinite;
  `}
`;

/**
 * RefreshButton Component
 *
 * @param {Object} props - Component props
 * @param {Function} [props.onRefreshComplete] - Callback function called after successful cache clear
 * @returns {JSX.Element} Refresh button
 */
export default function RefreshButton({ onRefreshComplete }) {
  const [state, setState] = useState('idle'); // idle | loading | success | error
  const [errorMessage, setErrorMessage] = useState('');

  /**
   * Handle button click - clear cache via API and localStorage
   */
  async function handleClick() {
    try {
      setState('loading');
      setErrorMessage('');

      const response = await fetch('/api/cache', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Clear localStorage to remove persisted iteration selections
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (localStorageError) {
        console.warn('Failed to clear localStorage:', localStorageError);
        // Continue anyway - cache clear succeeded
      }

      // Success
      setState('success');

      // Call callback if provided
      if (onRefreshComplete) {
        onRefreshComplete();
      }

      // Reload the page after a short delay to show success state
      // This ensures all components get fresh data and localStorage is cleared
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      setState('error');
      setErrorMessage(err.message);

      // Reset to idle after 5 seconds
      setTimeout(() => {
        setState('idle');
        setErrorMessage('');
      }, 5000);
    }
  }

  /**
   * Render button text based on state
   */
  function renderButtonText() {
    switch (state) {
      case 'loading':
        return 'Clearing...';
      case 'success':
        return 'Cache cleared!';
      case 'error':
        return 'Clear failed';
      default:
        return 'Refresh Cache';
    }
  }

  /**
   * Render button icon based on state
   */
  function renderIcon() {
    switch (state) {
      case 'loading':
        return <Icon $spinning>↻</Icon>;
      case 'success':
        return <Icon>✓</Icon>;
      case 'error':
        return <Icon>⚠</Icon>;
      default:
        return <Icon>↻</Icon>;
    }
  }

  /**
   * Get button variant for styling
   */
  function getVariant() {
    switch (state) {
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  }

  return (
    <Button
      onClick={handleClick}
      disabled={state === 'loading'}
      $variant={getVariant()}
      title={state === 'error' ? errorMessage : ''}
    >
      {renderIcon()}
      {renderButtonText()}
    </Button>
  );
}
