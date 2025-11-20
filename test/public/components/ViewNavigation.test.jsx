/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import ViewNavigation from '../../../src/public/components/ViewNavigation.jsx';

// Mock theme object
const theme = {
  colors: {
    primary: '#3b82f6',
    primaryDark: '#2563eb',
    textPrimary: '#111827',
    textSecondary: '#6b7280',
    bgPrimary: '#ffffff',
    bgSecondary: '#f9fafb',
    border: '#e5e7eb',
  },
  borderRadius: { sm: '4px', md: '6px', lg: '8px' },
  spacing: { xs: '4px', sm: '8px', md: '16px', lg: '24px' },
  typography: {
    fontSize: { xs: '12px', sm: '14px', base: '16px' },
    fontWeight: { medium: '500', semibold: '600' },
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  transitions: {
    fast: '0.15s',
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  shadows: { sm: '0 1px 3px rgba(0, 0, 0, 0.1)' },
  breakpoints: {
    tablet: '768px',
    desktop: '1024px',
  },
};

/**
 * Helper to render component with theme
 */
const renderWithTheme = (component) => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

describe('ViewNavigation', () => {
  test('renders navigation buttons for all views', () => {
    const mockOnViewChange = jest.fn();

    renderWithTheme(
      <ViewNavigation
        currentView="dashboard"
        onViewChange={mockOnViewChange}
        hasSelectedIterations={true}
      />
    );

    // Should render both view buttons (Dashboard and Data Explorer)
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Data Explorer')).toBeInTheDocument();
  });

  test('calls onViewChange when clicking a view button', () => {
    const mockOnViewChange = jest.fn();

    renderWithTheme(
      <ViewNavigation
        currentView="dashboard"
        onViewChange={mockOnViewChange}
        hasSelectedIterations={true}
      />
    );

    // Click on Data Explorer button
    const dataExplorerButton = screen.getByText('Data Explorer');
    fireEvent.click(dataExplorerButton);

    // Should call callback with 'dataExplorer' view
    expect(mockOnViewChange).toHaveBeenCalledWith('dataExplorer');
  });

  test('highlights the current active view', () => {
    const mockOnViewChange = jest.fn();

    renderWithTheme(
      <ViewNavigation
        currentView="dataExplorer"
        onViewChange={mockOnViewChange}
        hasSelectedIterations={true}
      />
    );

    // Data Explorer button should have active styling
    const dataExplorerButton = screen.getByText('Data Explorer');
    expect(dataExplorerButton.closest('button')).toHaveAttribute('aria-current', 'page');
  });

  test('disables view buttons when no iterations are selected', () => {
    const mockOnViewChange = jest.fn();

    renderWithTheme(
      <ViewNavigation
        currentView="dashboard"
        onViewChange={mockOnViewChange}
        hasSelectedIterations={false}
      />
    );

    // Dashboard should not be disabled, but Data Explorer should be disabled when no iterations selected
    expect(screen.getByText('Dashboard')).not.toBeDisabled();
    expect(screen.getByText('Data Explorer')).toBeDisabled();
  });
});
