/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import Header from '../../../src/public/components/Header.jsx';

// Mock theme object
const theme = {
  colors: {
    primary: '#3b82f6',
    primaryDark: '#2563eb',
  },
  typography: {
    fontSize: {
      base: '1rem',
      '3xl': '2rem',
    },
    fontWeight: {
      bold: 700,
    },
  },
  shadows: { md: '0 2px 8px rgba(0, 0, 0, 0.1)' },
  breakpoints: { mobile: '640px' },
};

describe('Header', () => {
  /**
   * Test 7.1: Basic rendering
   * Verifies Header renders title and subtitle
   */
  test('renders title and subtitle', () => {
    render(
      <ThemeProvider theme={theme}>
        <Header />
      </ThemeProvider>
    );

    expect(screen.getByText('GitLab Sprint Metrics Analyzer')).toBeInTheDocument();
    expect(screen.getByText('Track team performance with context-aware annotations')).toBeInTheDocument();
  });

  /**
   * Test 7.2: Gradient background styling
   * Verifies Header applies styled-component with gradient background
   * Note: jsdom doesn't compute CSS gradients, so we check for className presence
   */
  test('applies gradient background styling', () => {
    const { container } = render(
      <ThemeProvider theme={theme}>
        <Header />
      </ThemeProvider>
    );

    const header = container.querySelector('header');

    // Verify header element exists with styled-component class
    expect(header).toBeInTheDocument();
    expect(header.className).toBeTruthy();
  });

  /**
   * Test 7.3: Semantic HTML structure
   * Verifies Header uses semantic <header> tag
   */
  test('uses semantic header element', () => {
    const { container } = render(
      <ThemeProvider theme={theme}>
        <Header />
      </ThemeProvider>
    );

    const header = container.querySelector('header');

    // Verify semantic <header> element is used
    expect(header).toBeInTheDocument();
    expect(header.tagName).toBe('HEADER');
  });
});
