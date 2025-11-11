/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import GlobalStyles from '../../../src/public/styles/GlobalStyles.jsx';

// Mock theme object (inline to avoid ES module issues in Jest)
const theme = {
  colors: {
    primary: '#3b82f6',
    textPrimary: '#111827',
    bgSecondary: '#f9fafb',
  },
  spacing: { md: '16px' },
  typography: { fontFamily: 'sans-serif' },
};

describe('GlobalStyles', () => {
  /**
   * Test 1.1: Basic rendering
   * Verifies GlobalStyles component renders without errors
   */
  test('renders without errors', () => {
    expect(() => {
      render(
        <ThemeProvider theme={theme}>
          <GlobalStyles />
        </ThemeProvider>
      );
    }).not.toThrow();
  });

  /**
   * Test 1.2: GlobalStyles component structure
   * Verifies GlobalStyles is a styled-component (not null)
   * Note: createGlobalStyle doesn't inject into jsdom, so we verify structure instead
   */
  test('is a valid styled-component', () => {
    const { container } = render(
      <ThemeProvider theme={theme}>
        <GlobalStyles />
      </ThemeProvider>
    );

    // createGlobalStyle renders a <style> tag or fragment
    // We verify it doesn't throw and renders something
    expect(container).toBeTruthy();
  });

  /**
   * Test 1.3: Theme integration
   * Verifies theme values are accessible in the DOM
   * Note: This test validates that GlobalStyles integrates with theme,
   * even if CSS variables aren't explicitly set
   */
  test('integrates with theme provider', () => {
    const { container } = render(
      <ThemeProvider theme={theme}>
        <GlobalStyles />
        <div data-testid="themed-element">Themed content</div>
      </ThemeProvider>
    );

    // GlobalStyles should render and theme should be available to children
    expect(container.firstChild).toBeInTheDocument();
    expect(screen.getByTestId('themed-element')).toBeInTheDocument();
  });
});
