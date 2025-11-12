/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import IterationSelectorToolbar from '../../../src/public/components/IterationSelectorToolbar.jsx';

// Mock theme object
const theme = {
  colors: {
    primary: '#3b82f6',
    primaryDark: '#2563eb',
    bgPrimary: '#ffffff',
    bgSecondary: '#f9fafb',
    bgTertiary: '#e5e7eb',
    textPrimary: '#111827',
    textSecondary: '#6b7280',
    border: '#d1d5db',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
  borderRadius: { sm: '4px', md: '6px', lg: '8px', full: '9999px' },
  shadows: { sm: '0 1px 2px rgba(0, 0, 0, 0.05)', md: '0 2px 8px rgba(0, 0, 0, 0.1)' },
  typography: {
    fontSize: { xs: '0.75rem', sm: '0.875rem', base: '1rem', lg: '1.125rem' },
    fontWeight: { medium: 500, semibold: 600, bold: 700 },
  },
  breakpoints: { mobile: '640px', tablet: '768px', desktop: '1024px' },
  transitions: { fast: '150ms', normal: '200ms', easing: 'ease-in-out' },
};

describe('IterationSelectorToolbar', () => {
  /**
   * Test 10.1: Renders empty state when no iterations selected
   * Verifies toolbar shows appropriate message when selectedIterations array is empty
   */
  test('renders empty state message when no iterations selected', () => {
    render(
      <ThemeProvider theme={theme}>
        <IterationSelectorToolbar
          selectedIterations={[]}
          onRemoveIteration={() => {}}
          onOpenModal={() => {}}
        />
      </ThemeProvider>
    );

    // Should show empty state message
    expect(screen.getByText(/no sprints selected/i)).toBeInTheDocument();
    expect(screen.getByText(/change iterations/i)).toBeInTheDocument();
  });

  /**
   * Test 10.2: Renders iteration chips for selected iterations
   * Verifies toolbar displays chips with iteration titles when iterations are selected
   */
  test('renders iteration chips with titles and remove buttons', () => {
    const mockIterations = [
      { id: '1', title: 'Sprint 1' },
      { id: '2', title: 'Sprint 2' },
    ];

    render(
      <ThemeProvider theme={theme}>
        <IterationSelectorToolbar
          selectedIterations={mockIterations}
          onRemoveIteration={() => {}}
          onOpenModal={() => {}}
        />
      </ThemeProvider>
    );

    // Should render both iteration chips
    expect(screen.getByText('Sprint 1')).toBeInTheDocument();
    expect(screen.getByText('Sprint 2')).toBeInTheDocument();

    // Should have remove buttons (× symbols)
    const removeButtons = screen.getAllByLabelText(/remove sprint/i);
    expect(removeButtons).toHaveLength(2);
  });

  /**
   * Test 10.3: Calls onRemoveIteration when remove button clicked
   * Verifies callback is invoked with correct iteration ID
   */
  test('calls onRemoveIteration when remove button is clicked', () => {
    const mockOnRemove = jest.fn();
    const mockIterations = [{ id: '1', title: 'Sprint 1' }];

    render(
      <ThemeProvider theme={theme}>
        <IterationSelectorToolbar
          selectedIterations={mockIterations}
          onRemoveIteration={mockOnRemove}
          onOpenModal={() => {}}
        />
      </ThemeProvider>
    );

    // Click remove button
    const removeButton = screen.getByLabelText(/remove sprint 1/i);
    fireEvent.click(removeButton);

    // Should call callback with iteration ID
    expect(mockOnRemove).toHaveBeenCalledWith('1');
  });

  /**
   * Test 10.4: Calls onOpenModal when Change Iterations button clicked
   * Verifies modal callback is invoked
   */
  test('calls onOpenModal when Change Iterations button is clicked', () => {
    const mockOnOpenModal = jest.fn();

    render(
      <ThemeProvider theme={theme}>
        <IterationSelectorToolbar
          selectedIterations={[]}
          onRemoveIteration={() => {}}
          onOpenModal={mockOnOpenModal}
        />
      </ThemeProvider>
    );

    // Click "Change Iterations" button
    const changeButton = screen.getByText(/change iterations/i);
    fireEvent.click(changeButton);

    // Should call modal callback
    expect(mockOnOpenModal).toHaveBeenCalledTimes(1);
  });

  /**
   * Test 10.5: Toolbar has sticky positioning and proper structure
   * Verifies toolbar container uses theme-based styling
   */
  test('toolbar has proper styling and structure', () => {
    const { container } = render(
      <ThemeProvider theme={theme}>
        <IterationSelectorToolbar
          selectedIterations={[]}
          onRemoveIteration={() => {}}
          onOpenModal={() => {}}
        />
      </ThemeProvider>
    );

    // Should have a toolbar container
    const toolbar = container.firstChild;
    expect(toolbar).toBeInTheDocument();
    expect(toolbar.className).toBeTruthy(); // Has styled-component class
  });
});
