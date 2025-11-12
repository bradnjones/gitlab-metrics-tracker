/**
 * ErrorBoundary Component
 *
 * React error boundary that catches JavaScript errors anywhere in the child
 * component tree and displays a fallback UI instead of crashing the entire app.
 *
 * Features:
 * - Catches errors during rendering, lifecycle methods, and constructors
 * - Displays ErrorCard component with error details
 * - Resets error state when children change (allows recovery)
 * - Logs errors to console for debugging
 *
 * Usage:
 * ```jsx
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 *
 * @see https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
 */

import { Component } from 'react';
import ErrorCard from './ErrorCard.jsx';

/**
 * ErrorBoundary Class Component
 *
 * Note: Error boundaries must be class components because they use
 * componentDidCatch and getDerivedStateFromError lifecycle methods.
 *
 * @class
 * @extends {Component}
 */
export default class ErrorBoundary extends Component {
  /**
   * Initialize error boundary state
   *
   * @param {Object} props - Component props
   * @param {React.ReactNode} props.children - Child components to wrap
   */
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  /**
   * Update state when an error is caught
   *
   * This lifecycle method is called after an error has been thrown by a
   * descendant component. It receives the error and should return a value
   * to update state.
   *
   * @param {Error} error - The error that was thrown
   * @returns {Object} New state with error information
   * @static
   */
  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    };
  }

  /**
   * Log error information
   *
   * This lifecycle method is called after an error has been thrown by a
   * descendant component. It's used for logging errors to error reporting
   * services.
   *
   * @param {Error} error - The error that was thrown
   * @param {Object} errorInfo - Information about which component threw the error
   * @returns {void}
   */
  componentDidCatch(error, errorInfo) {
    // Log error to console for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  /**
   * Reset error state when children change
   *
   * This allows the error boundary to recover when new children are rendered.
   *
   * @param {Object} prevProps - Previous props
   * @returns {void}
   */
  componentDidUpdate(prevProps) {
    // Reset error state if children changed
    if (this.state.hasError && prevProps.children !== this.props.children) {
      this.setState({
        hasError: false,
        error: null,
      });
    }
  }

  /**
   * Render method
   *
   * @returns {JSX.Element} Children or error fallback UI
   */
  render() {
    if (this.state.hasError) {
      // Render error fallback UI
      return (
        <ErrorCard
          title="Something went wrong"
          message={this.state.error?.message || 'An unexpected error occurred'}
        />
      );
    }

    // Render children normally when no error
    return this.props.children;
  }
}
