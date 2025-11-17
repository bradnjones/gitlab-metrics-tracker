/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import ChartEnlargementModal from '../../../src/public/components/ChartEnlargementModal.jsx';

// Mock theme object matching application theme
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
  shadows: {
    md: '0 2px 8px rgba(0, 0, 0, 0.1)',
    lg: '0 4px 16px rgba(0, 0, 0, 0.2)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  },
  typography: {
    fontSize: { sm: '0.875rem', base: '1rem', lg: '1.125rem', xl: '1.25rem', '2xl': '1.5rem' },
    fontWeight: { medium: 500, semibold: 600, bold: 700 },
    lineHeight: { normal: 1.5 },
  },
  breakpoints: { mobile: '640px', tablet: '768px', desktop: '1024px' },
  transitions: { normal: '200ms', easing: 'ease-in-out' },
  zIndex: { modal: 1000 },
};

// Mock chart element for testing
const MockChart = () => <div data-testid="mock-chart">Chart Content</div>;

describe('ChartEnlargementModal', () => {
  /**
   * Test 1: Modal renders when isOpen is true and hides when false
   * Verifies core visibility logic driven by isOpen prop
   */
  describe('Modal Visibility', () => {
    test('does not render when isOpen is false', () => {
      const { container } = render(
        <ThemeProvider theme={theme}>
          <ChartEnlargementModal
            isOpen={false}
            onClose={() => {}}
            chartTitle="Test Chart"
            chartElement={<MockChart />}
          />
        </ThemeProvider>
      );

      // Modal should not be in the document
      expect(container.firstChild).toBeNull();
    });

    test('renders modal when isOpen is true', () => {
      render(
        <ThemeProvider theme={theme}>
          <ChartEnlargementModal
            isOpen={true}
            onClose={() => {}}
            chartTitle="Test Chart"
            chartElement={<MockChart />}
          />
        </ThemeProvider>
      );

      // Modal should be visible with title
      expect(screen.getByText('Test Chart')).toBeInTheDocument();

      // Chart element should be rendered
      expect(screen.getByTestId('mock-chart')).toBeInTheDocument();

      // Close button should be present
      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    });
  });

  /**
   * Test 2: Modal closes via all three mechanisms
   * Verifies onClose callback is invoked for overlay click, close button, and Escape key
   */
  describe('Close Mechanisms', () => {
    test('calls onClose when close button is clicked', () => {
      const handleClose = jest.fn();

      render(
        <ThemeProvider theme={theme}>
          <ChartEnlargementModal
            isOpen={true}
            onClose={handleClose}
            chartTitle="Test Chart"
            chartElement={<MockChart />}
          />
        </ThemeProvider>
      );

      // Click close button
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);

      // onClose should be called once
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    test('calls onClose when overlay is clicked', () => {
      const handleClose = jest.fn();

      render(
        <ThemeProvider theme={theme}>
          <ChartEnlargementModal
            isOpen={true}
            onClose={handleClose}
            chartTitle="Test Chart"
            chartElement={<MockChart />}
          />
        </ThemeProvider>
      );

      // Click overlay (not the modal content)
      const overlay = screen.getByText('Test Chart').closest('div').parentElement.parentElement;
      fireEvent.click(overlay);

      // onClose should be called once
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    test('does not call onClose when modal content is clicked', () => {
      const handleClose = jest.fn();

      render(
        <ThemeProvider theme={theme}>
          <ChartEnlargementModal
            isOpen={true}
            onClose={handleClose}
            chartTitle="Test Chart"
            chartElement={<MockChart />}
          />
        </ThemeProvider>
      );

      // Click modal content (not overlay)
      const modalContent = screen.getByText('Test Chart');
      fireEvent.click(modalContent);

      // onClose should NOT be called
      expect(handleClose).not.toHaveBeenCalled();
    });

    test('calls onClose when Escape key is pressed', () => {
      const handleClose = jest.fn();

      render(
        <ThemeProvider theme={theme}>
          <ChartEnlargementModal
            isOpen={true}
            onClose={handleClose}
            chartTitle="Test Chart"
            chartElement={<MockChart />}
          />
        </ThemeProvider>
      );

      // Press Escape key
      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });

      // onClose should be called once
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  /**
   * Test 3: ARIA attributes for accessibility
   * Verifies modal has correct semantic HTML and ARIA attributes
   */
  describe('Accessibility', () => {
    test('modal has correct ARIA attributes', () => {
      render(
        <ThemeProvider theme={theme}>
          <ChartEnlargementModal
            isOpen={true}
            onClose={() => {}}
            chartTitle="Test Chart"
            chartElement={<MockChart />}
          />
        </ThemeProvider>
      );

      // Find modal by role
      const dialog = screen.getByRole('dialog');

      // Should have role="dialog"
      expect(dialog).toBeInTheDocument();

      // Should have aria-modal="true"
      expect(dialog).toHaveAttribute('aria-modal', 'true');

      // Should have aria-labelledby pointing to title
      const ariaLabelledBy = dialog.getAttribute('aria-labelledby');
      expect(ariaLabelledBy).toBeTruthy();

      // Title element should have matching id
      const title = screen.getByText('Test Chart');
      expect(title).toHaveAttribute('id', ariaLabelledBy);
    });

    test('close button has aria-label', () => {
      render(
        <ThemeProvider theme={theme}>
          <ChartEnlargementModal
            isOpen={true}
            onClose={() => {}}
            chartTitle="Test Chart"
            chartElement={<MockChart />}
          />
        </ThemeProvider>
      );

      // Close button should have aria-label
      const closeButton = screen.getByRole('button', { name: /close enlarged chart view/i });
      expect(closeButton).toBeInTheDocument();
      expect(closeButton).toHaveAttribute('aria-label');
    });
  });

  /**
   * Test 4: Body scroll lock when modal is open
   * Verifies document body scroll is locked when modal opens and restored when closes
   */
  describe('Body Scroll Lock', () => {
    let originalOverflow;

    beforeEach(() => {
      // Save original overflow value
      originalOverflow = document.body.style.overflow;
    });

    afterEach(() => {
      // Restore original overflow value
      document.body.style.overflow = originalOverflow;
    });

    test('locks body scroll when modal opens', () => {
      const { rerender } = render(
        <ThemeProvider theme={theme}>
          <ChartEnlargementModal
            isOpen={false}
            onClose={() => {}}
            chartTitle="Test Chart"
            chartElement={<MockChart />}
          />
        </ThemeProvider>
      );

      // Initially, overflow should not be 'hidden'
      expect(document.body.style.overflow).not.toBe('hidden');

      // Open modal
      rerender(
        <ThemeProvider theme={theme}>
          <ChartEnlargementModal
            isOpen={true}
            onClose={() => {}}
            chartTitle="Test Chart"
            chartElement={<MockChart />}
          />
        </ThemeProvider>
      );

      // Body overflow should be 'hidden'
      expect(document.body.style.overflow).toBe('hidden');
    });

    test('restores body scroll when modal closes', () => {
      const { rerender, unmount } = render(
        <ThemeProvider theme={theme}>
          <ChartEnlargementModal
            isOpen={true}
            onClose={() => {}}
            chartTitle="Test Chart"
            chartElement={<MockChart />}
          />
        </ThemeProvider>
      );

      // Body overflow should be 'hidden' when modal is open
      expect(document.body.style.overflow).toBe('hidden');

      // Close modal
      rerender(
        <ThemeProvider theme={theme}>
          <ChartEnlargementModal
            isOpen={false}
            onClose={() => {}}
            chartTitle="Test Chart"
            chartElement={<MockChart />}
          />
        </ThemeProvider>
      );

      // Body overflow should be restored (empty string = default)
      expect(document.body.style.overflow).toBe('');
    });

    test('cleans up body scroll on unmount', () => {
      const { unmount } = render(
        <ThemeProvider theme={theme}>
          <ChartEnlargementModal
            isOpen={true}
            onClose={() => {}}
            chartTitle="Test Chart"
            chartElement={<MockChart />}
          />
        </ThemeProvider>
      );

      // Body overflow should be 'hidden'
      expect(document.body.style.overflow).toBe('hidden');

      // Unmount component
      unmount();

      // Body overflow should be restored
      expect(document.body.style.overflow).toBe('');
    });
  });

  /**
   * Test 5: Focus management when modal opens
   * Verifies close button receives focus when modal opens
   */
  describe('Focus Management', () => {
    test('auto-focuses close button when modal opens', async () => {
      jest.useFakeTimers();

      const { rerender } = render(
        <ThemeProvider theme={theme}>
          <ChartEnlargementModal
            isOpen={false}
            onClose={() => {}}
            chartTitle="Test Chart"
            chartElement={<MockChart />}
          />
        </ThemeProvider>
      );

      // Open modal
      rerender(
        <ThemeProvider theme={theme}>
          <ChartEnlargementModal
            isOpen={true}
            onClose={() => {}}
            chartTitle="Test Chart"
            chartElement={<MockChart />}
          />
        </ThemeProvider>
      );

      // Fast-forward timers to allow focus to be set (setTimeout delay)
      jest.advanceTimersByTime(100);

      // Close button should have focus
      const closeButton = screen.getByRole('button', { name: /close enlarged chart view/i });
      expect(closeButton).toHaveFocus();

      jest.useRealTimers();
    });
  });
});
