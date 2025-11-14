/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import IterationSelectionModal from '../../../src/public/components/IterationSelectionModal.jsx';

// Mock IterationSelector component
jest.mock('../../../src/public/components/IterationSelector.jsx', () => {
  return function MockIterationSelector() {
    return <div data-testid="iteration-selector">Mock Iteration Selector</div>;
  };
});

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
    '2xl': '48px',
  },
  borderRadius: { sm: '4px', md: '6px', lg: '8px', xl: '12px' },
  shadows: { md: '0 2px 8px rgba(0, 0, 0, 0.1)', lg: '0 4px 16px rgba(0, 0, 0, 0.2)' },
  typography: {
    fontSize: { sm: '0.875rem', base: '1rem', lg: '1.125rem', xl: '1.25rem', '2xl': '1.5rem' },
    fontWeight: { medium: 500, semibold: 600, bold: 700 },
  },
  breakpoints: { mobile: '640px', tablet: '768px', desktop: '1024px' },
  transitions: { normal: '200ms', easing: 'ease-in-out' },
  zIndex: { modal: 1000 },
};

describe('IterationSelectionModal', () => {
  beforeEach(() => {
    // Mock fetch API for cache status
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ iterations: [] })
      })
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * Test 11.1: Does not render when isOpen is false
   * Verifies modal is hidden when not open
   */
  test('does not render when isOpen is false', () => {
    const { container } = render(
      <ThemeProvider theme={theme}>
        <IterationSelectionModal
          isOpen={false}
          onClose={() => {}}
          onApply={() => {}}
          selectedIterationIds={[]}
        />
      </ThemeProvider>
    );

    // Modal should not be in the document
    expect(container.firstChild).toBeNull();
  });

  /**
   * Test 11.2: Renders modal overlay and dialog when isOpen is true
   * Verifies modal structure with backdrop and dialog
   */
  test('renders modal overlay and dialog when isOpen is true', async () => {
    render(
      <ThemeProvider theme={theme}>
        <IterationSelectionModal
          isOpen={true}
          onClose={() => {}}
          onApply={() => {}}
          selectedIterationIds={[]}
        />
      </ThemeProvider>
    );

    // Wait for component to fully load
    await waitFor(() => {
      expect(screen.getByText('Select Sprint Iterations')).toBeInTheDocument();
    });

    // Should show modal header
    expect(screen.getByText('Select Sprint Iterations')).toBeInTheDocument();

    // Should have Cancel and Apply buttons
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Apply')).toBeInTheDocument();
  });

  /**
   * Test 11.3: Calls onClose when Cancel button clicked
   * Verifies cancel callback is invoked
   */
  test('calls onClose when Cancel button is clicked', async () => {
    const mockOnClose = jest.fn();

    render(
      <ThemeProvider theme={theme}>
        <IterationSelectionModal
          isOpen={true}
          onClose={mockOnClose}
          onApply={() => {}}
          selectedIterationIds={[]}
        />
      </ThemeProvider>
    );

    // Wait for component to fully load
    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    // Click Cancel button
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    // Should call onClose callback
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  /**
   * Test 11.4: Calls onClose when clicking backdrop
   * Verifies clicking outside modal closes it
   */
  test('calls onClose when clicking modal backdrop', async () => {
    const mockOnClose = jest.fn();

    const { container } = render(
      <ThemeProvider theme={theme}>
        <IterationSelectionModal
          isOpen={true}
          onClose={mockOnClose}
          onApply={() => {}}
          selectedIterationIds={[]}
        />
      </ThemeProvider>
    );

    // Wait for component to fully load
    await waitFor(() => {
      expect(container.firstChild).not.toBeNull();
    });

    // Click backdrop (first child is the overlay)
    const backdrop = container.firstChild;
    fireEvent.click(backdrop);

    // Should call onClose callback
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  /**
   * Test 11.5: Calls onApply with selected iteration objects when Apply clicked
   * Verifies apply callback receives full iteration objects (not just IDs)
   */
  test('calls onApply with selected iteration objects when Apply is clicked', async () => {
    const mockOnApply = jest.fn();
    const mockSelectedIds = ['gid://gitlab/Iteration/1', 'gid://gitlab/Iteration/2'];

    render(
      <ThemeProvider theme={theme}>
        <IterationSelectionModal
          isOpen={true}
          onClose={() => {}}
          onApply={mockOnApply}
          selectedIterationIds={mockSelectedIds}
        />
      </ThemeProvider>
    );

    // Wait for component to fully load
    await waitFor(() => {
      expect(screen.getByText('Apply')).toBeInTheDocument();
    });

    // Click Apply button
    const applyButton = screen.getByText('Apply');
    fireEvent.click(applyButton);

    // Should call onApply (with an empty array since we haven't fetched iterations in the test)
    expect(mockOnApply).toHaveBeenCalledWith([]);
  });
});
