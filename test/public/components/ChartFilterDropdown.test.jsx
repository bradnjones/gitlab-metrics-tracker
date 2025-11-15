/**
 * ChartFilterDropdown Component Tests
 *
 * Tests for per-chart iteration filtering dropdown component.
 * Following TDD approach: Write tests FIRST, then implement.
 *
 * @jest-environment jsdom
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import ChartFilterDropdown from '../../../src/public/components/ChartFilterDropdown';

// Mock theme object matching application theme
const theme = {
  colors: {
    primary: '#3b82f6',
    primaryDark: '#2563eb',
    textPrimary: '#111827',
    textSecondary: '#6b7280',
    bgPrimary: '#ffffff',
    bgSecondary: '#f9fafb',
    bgTertiary: '#f3f4f6',
    border: '#e5e7eb',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
  },
  typography: {
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
    },
  },
  borderRadius: {
    sm: '4px',
    md: '6px',
    lg: '8px',
    full: '999px',
  },
};

/**
 * Helper to render component with theme
 * @param {JSX.Element} component - Component to render
 * @returns {Object} Render result
 */
const renderWithTheme = (component) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

/**
 * Mock iteration data for testing
 */
const mockIterations = [
  {
    id: '1',
    title: 'Sprint 10/25',
    startDate: '2024-10-25',
    dueDate: '2024-11-08'
  },
  {
    id: '2',
    title: 'Sprint 11/08',
    startDate: '2024-11-08',
    dueDate: '2024-11-22'
  },
  {
    id: '3',
    title: 'Sprint 11/22',
    startDate: '2024-11-22',
    dueDate: '2024-12-06'
  }
];

describe('ChartFilterDropdown', () => {
  let mockOnFilterChange;
  let mockOnReset;

  beforeEach(() => {
    mockOnFilterChange = jest.fn();
    mockOnReset = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Rendering', () => {
    it('should render filter button with icon and text', () => {
      renderWithTheme(
        <ChartFilterDropdown
          availableIterations={mockIterations}
          excludedIterationIds={[]}
          onFilterChange={mockOnFilterChange}
          onReset={mockOnReset}
        />
      );

      const filterButton = screen.getByRole('button', { name: /filter iterations/i });
      expect(filterButton).toBeInTheDocument();
      expect(filterButton).toHaveTextContent('Filter');
    });

    it('should not show warning badge when no exclusions', () => {
      renderWithTheme(
        <ChartFilterDropdown
          availableIterations={mockIterations}
          excludedIterationIds={[]}
          onFilterChange={mockOnFilterChange}
          onReset={mockOnReset}
        />
      );

      // Warning badge should not be visible (check for specific badge format "X/Y")
      const badge = screen.queryByRole('status');
      expect(badge).not.toBeInTheDocument();
    });

    it('should show warning badge when iterations are excluded', () => {
      renderWithTheme(
        <ChartFilterDropdown
          availableIterations={mockIterations}
          excludedIterationIds={['1']}
          onFilterChange={mockOnFilterChange}
          onReset={mockOnReset}
        />
      );

      // Badge should show "2/3" (2 visible out of 3 total)
      const badge = screen.getByText('2/3');
      expect(badge).toBeInTheDocument();
    });

    it('should have dropdown closed by default', () => {
      renderWithTheme(
        <ChartFilterDropdown
          availableIterations={mockIterations}
          excludedIterationIds={[]}
          onFilterChange={mockOnFilterChange}
          onReset={mockOnReset}
        />
      );

      const filterButton = screen.getByRole('button', { name: /filter iterations/i });
      expect(filterButton).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('Dropdown Interaction', () => {
    it('should open dropdown when filter button clicked', async () => {
      const user = userEvent.setup();

      renderWithTheme(
        <ChartFilterDropdown
          availableIterations={mockIterations}
          excludedIterationIds={[]}
          onFilterChange={mockOnFilterChange}
          onReset={mockOnReset}
        />
      );

      const filterButton = screen.getByRole('button', { name: /filter iterations/i });
      await user.click(filterButton);

      expect(filterButton).toHaveAttribute('aria-expanded', 'true');

      // Dropdown should be visible
      const dropdown = screen.getByRole('dialog', { name: /filter iterations/i });
      expect(dropdown).toBeInTheDocument();
    });

    it('should show all iterations in dropdown', async () => {
      const user = userEvent.setup();

      renderWithTheme(
        <ChartFilterDropdown
          availableIterations={mockIterations}
          excludedIterationIds={[]}
          onFilterChange={mockOnFilterChange}
          onReset={mockOnReset}
        />
      );

      // Open dropdown
      const filterButton = screen.getByRole('button', { name: /filter iterations/i });
      await user.click(filterButton);

      // All iterations should be visible with checkboxes
      mockIterations.forEach(iteration => {
        expect(screen.getByText(iteration.title)).toBeInTheDocument();
      });
    });

    it('should show iteration dates in dropdown', async () => {
      const user = userEvent.setup();

      renderWithTheme(
        <ChartFilterDropdown
          availableIterations={mockIterations}
          excludedIterationIds={[]}
          onFilterChange={mockOnFilterChange}
          onReset={mockOnReset}
        />
      );

      // Open dropdown
      const filterButton = screen.getByRole('button', { name: /filter iterations/i });
      await user.click(filterButton);

      // Should show formatted dates (check for date pattern, dates may vary by timezone)
      expect(screen.getByText(/10\/2\d\/2024 - 11\/\d\/2024/i)).toBeInTheDocument();
    });

    it('should close dropdown when close button clicked', async () => {
      const user = userEvent.setup();

      renderWithTheme(
        <ChartFilterDropdown
          availableIterations={mockIterations}
          excludedIterationIds={[]}
          onFilterChange={mockOnFilterChange}
          onReset={mockOnReset}
        />
      );

      // Open dropdown
      const filterButton = screen.getByRole('button', { name: /filter iterations/i });
      await user.click(filterButton);

      // Close dropdown
      const closeButton = screen.getByRole('button', { name: /close filter menu/i });
      await user.click(closeButton);

      expect(filterButton).toHaveAttribute('aria-expanded', 'false');
    });

    it('should close dropdown when overlay clicked', async () => {
      const user = userEvent.setup();

      renderWithTheme(
        <ChartFilterDropdown
          availableIterations={mockIterations}
          excludedIterationIds={[]}
          onFilterChange={mockOnFilterChange}
          onReset={mockOnReset}
        />
      );

      // Open dropdown
      const filterButton = screen.getByRole('button', { name: /filter iterations/i });
      await user.click(filterButton);

      // Click overlay (implemented as clicking outside the dropdown)
      const overlay = screen.getByRole('dialog').previousSibling;
      await user.click(overlay);

      expect(filterButton).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('Iteration Filtering', () => {
    it('should check all iterations by default when no exclusions', async () => {
      const user = userEvent.setup();

      renderWithTheme(
        <ChartFilterDropdown
          availableIterations={mockIterations}
          excludedIterationIds={[]}
          onFilterChange={mockOnFilterChange}
          onReset={mockOnReset}
        />
      );

      // Open dropdown
      const filterButton = screen.getByRole('button', { name: /filter iterations/i });
      await user.click(filterButton);

      // All checkboxes should be checked
      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach(checkbox => {
        expect(checkbox).toBeChecked();
      });
    });

    it('should uncheck excluded iterations', async () => {
      const user = userEvent.setup();

      renderWithTheme(
        <ChartFilterDropdown
          availableIterations={mockIterations}
          excludedIterationIds={['1']}
          onFilterChange={mockOnFilterChange}
          onReset={mockOnReset}
        />
      );

      // Open dropdown
      const filterButton = screen.getByRole('button', { name: /filter iterations/i });
      await user.click(filterButton);

      // First iteration should be unchecked
      const checkbox1 = screen.getByRole('checkbox', { name: /sprint 10\/25/i });
      expect(checkbox1).not.toBeChecked();

      // Other iterations should be checked
      const checkbox2 = screen.getByRole('checkbox', { name: /sprint 11\/08/i });
      const checkbox3 = screen.getByRole('checkbox', { name: /sprint 11\/22/i });
      expect(checkbox2).toBeChecked();
      expect(checkbox3).toBeChecked();
    });

    it('should toggle iteration when checkbox clicked', async () => {
      const user = userEvent.setup();

      renderWithTheme(
        <ChartFilterDropdown
          availableIterations={mockIterations}
          excludedIterationIds={[]}
          onFilterChange={mockOnFilterChange}
          onReset={mockOnReset}
        />
      );

      // Open dropdown
      const filterButton = screen.getByRole('button', { name: /filter iterations/i });
      await user.click(filterButton);

      // Uncheck first iteration
      const checkbox1 = screen.getByRole('checkbox', { name: /sprint 10\/25/i });
      await user.click(checkbox1);

      // Checkbox should now be unchecked
      expect(checkbox1).not.toBeChecked();
    });

    it('should update selection count when iteration toggled', async () => {
      const user = userEvent.setup();

      renderWithTheme(
        <ChartFilterDropdown
          availableIterations={mockIterations}
          excludedIterationIds={[]}
          onFilterChange={mockOnFilterChange}
          onReset={mockOnReset}
        />
      );

      // Open dropdown
      const filterButton = screen.getByRole('button', { name: /filter iterations/i });
      await user.click(filterButton);

      // Initial count: "Showing 3 of 3 iterations"
      expect(screen.getByText(/showing 3 of 3 iterations/i)).toBeInTheDocument();

      // Uncheck first iteration
      const checkbox1 = screen.getByRole('checkbox', { name: /sprint 10\/25/i });
      await user.click(checkbox1);

      // Updated count: "Showing 2 of 3 iterations"
      expect(screen.getByText(/showing 2 of 3 iterations/i)).toBeInTheDocument();
    });

    it('should call onFilterChange when Apply clicked', async () => {
      const user = userEvent.setup();

      renderWithTheme(
        <ChartFilterDropdown
          availableIterations={mockIterations}
          excludedIterationIds={[]}
          onFilterChange={mockOnFilterChange}
          onReset={mockOnReset}
        />
      );

      // Open dropdown
      const filterButton = screen.getByRole('button', { name: /filter iterations/i });
      await user.click(filterButton);

      // Uncheck first iteration
      const checkbox1 = screen.getByRole('checkbox', { name: /sprint 10\/25/i });
      await user.click(checkbox1);

      // Click Apply
      const applyButton = screen.getByRole('button', { name: /apply filter changes/i });
      await user.click(applyButton);

      // Should call onFilterChange with excluded IDs
      expect(mockOnFilterChange).toHaveBeenCalledWith(['1']);
    });

    it('should close dropdown after Apply clicked', async () => {
      const user = userEvent.setup();

      renderWithTheme(
        <ChartFilterDropdown
          availableIterations={mockIterations}
          excludedIterationIds={[]}
          onFilterChange={mockOnFilterChange}
          onReset={mockOnReset}
        />
      );

      // Open dropdown
      const filterButton = screen.getByRole('button', { name: /filter iterations/i });
      await user.click(filterButton);

      // Click Apply
      const applyButton = screen.getByRole('button', { name: /apply filter changes/i });
      await user.click(applyButton);

      // Dropdown should be closed
      expect(filterButton).toHaveAttribute('aria-expanded', 'false');
    });

    it('should revert changes when dropdown closed without applying', async () => {
      const user = userEvent.setup();

      renderWithTheme(
        <ChartFilterDropdown
          availableIterations={mockIterations}
          excludedIterationIds={[]}
          onFilterChange={mockOnFilterChange}
          onReset={mockOnReset}
        />
      );

      // Open dropdown
      const filterButton = screen.getByRole('button', { name: /filter iterations/i });
      await user.click(filterButton);

      // Uncheck first iteration
      const checkbox1 = screen.getByRole('checkbox', { name: /sprint 10\/25/i });
      await user.click(checkbox1);

      // Close without applying
      const closeButton = screen.getByRole('button', { name: /close filter menu/i });
      await user.click(closeButton);

      // Reopen dropdown
      await user.click(filterButton);

      // First iteration should still be checked (changes reverted)
      const checkbox1Reopened = screen.getByRole('checkbox', { name: /sprint 10\/25/i });
      expect(checkbox1Reopened).toBeChecked();
    });
  });

  describe('Reset Functionality', () => {
    it('should call onReset when Reset button clicked', async () => {
      const user = userEvent.setup();

      renderWithTheme(
        <ChartFilterDropdown
          availableIterations={mockIterations}
          excludedIterationIds={['1']}
          onFilterChange={mockOnFilterChange}
          onReset={mockOnReset}
        />
      );

      // Open dropdown
      const filterButton = screen.getByRole('button', { name: /filter iterations/i });
      await user.click(filterButton);

      // Click Reset
      const resetButton = screen.getByRole('button', { name: /reset to global selection/i });
      await user.click(resetButton);

      // Should call onReset
      expect(mockOnReset).toHaveBeenCalled();
    });

    it('should close dropdown after Reset clicked', async () => {
      const user = userEvent.setup();

      renderWithTheme(
        <ChartFilterDropdown
          availableIterations={mockIterations}
          excludedIterationIds={['1']}
          onFilterChange={mockOnFilterChange}
          onReset={mockOnReset}
        />
      );

      // Open dropdown
      const filterButton = screen.getByRole('button', { name: /filter iterations/i });
      await user.click(filterButton);

      // Click Reset
      const resetButton = screen.getByRole('button', { name: /reset to global selection/i });
      await user.click(resetButton);

      // Dropdown should be closed
      expect(filterButton).toHaveAttribute('aria-expanded', 'false');
    });

    it('should disable Reset button when no exclusions and no pending changes', async () => {
      const user = userEvent.setup();

      renderWithTheme(
        <ChartFilterDropdown
          availableIterations={mockIterations}
          excludedIterationIds={[]}
          onFilterChange={mockOnFilterChange}
          onReset={mockOnReset}
        />
      );

      // Open dropdown
      const filterButton = screen.getByRole('button', { name: /filter iterations/i });
      await user.click(filterButton);

      // Reset button should be disabled
      const resetButton = screen.getByRole('button', { name: /reset to global selection/i });
      expect(resetButton).toBeDisabled();
    });

    it('should enable Reset button when exclusions exist', async () => {
      const user = userEvent.setup();

      renderWithTheme(
        <ChartFilterDropdown
          availableIterations={mockIterations}
          excludedIterationIds={['1']}
          onFilterChange={mockOnFilterChange}
          onReset={mockOnReset}
        />
      );

      // Open dropdown
      const filterButton = screen.getByRole('button', { name: /filter iterations/i });
      await user.click(filterButton);

      // Reset button should be enabled
      const resetButton = screen.getByRole('button', { name: /reset to global selection/i });
      expect(resetButton).not.toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes on filter button', () => {
      renderWithTheme(
        <ChartFilterDropdown
          availableIterations={mockIterations}
          excludedIterationIds={[]}
          onFilterChange={mockOnFilterChange}
          onReset={mockOnReset}
          chartTitle="Lead Time Chart"
        />
      );

      const filterButton = screen.getByRole('button', { name: /filter iterations for lead time chart/i });
      expect(filterButton).toHaveAttribute('aria-expanded', 'false');
      expect(filterButton).toHaveAttribute('aria-haspopup', 'true');
    });

    it('should have role="dialog" on dropdown menu', async () => {
      const user = userEvent.setup();

      renderWithTheme(
        <ChartFilterDropdown
          availableIterations={mockIterations}
          excludedIterationIds={[]}
          onFilterChange={mockOnFilterChange}
          onReset={mockOnReset}
        />
      );

      // Open dropdown
      const filterButton = screen.getByRole('button', { name: /filter iterations/i });
      await user.click(filterButton);

      const dropdown = screen.getByRole('dialog');
      expect(dropdown).toBeInTheDocument();
    });

    it('should have role="status" on warning badge', () => {
      renderWithTheme(
        <ChartFilterDropdown
          availableIterations={mockIterations}
          excludedIterationIds={['1']}
          onFilterChange={mockOnFilterChange}
          onReset={mockOnReset}
        />
      );

      const badge = screen.getByRole('status');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute('aria-label', 'Showing 2 of 3 iterations');
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();

      renderWithTheme(
        <ChartFilterDropdown
          availableIterations={mockIterations}
          excludedIterationIds={[]}
          onFilterChange={mockOnFilterChange}
          onReset={mockOnReset}
        />
      );

      const filterButton = screen.getByRole('button', { name: /filter iterations/i });

      // Tab to filter button
      await user.tab();
      expect(filterButton).toHaveFocus();

      // Press Enter to open dropdown
      await user.keyboard('{Enter}');
      expect(filterButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('should close dropdown on Escape key', async () => {
      const user = userEvent.setup();

      renderWithTheme(
        <ChartFilterDropdown
          availableIterations={mockIterations}
          excludedIterationIds={[]}
          onFilterChange={mockOnFilterChange}
          onReset={mockOnReset}
        />
      );

      // Open dropdown
      const filterButton = screen.getByRole('button', { name: /filter iterations/i });
      await user.click(filterButton);

      // Press Escape
      await user.keyboard('{Escape}');

      // Dropdown should be closed
      expect(filterButton).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty iterations array', () => {
      renderWithTheme(
        <ChartFilterDropdown
          availableIterations={[]}
          excludedIterationIds={[]}
          onFilterChange={mockOnFilterChange}
          onReset={mockOnReset}
        />
      );

      const filterButton = screen.getByRole('button', { name: /filter iterations/i });
      expect(filterButton).toBeInTheDocument();
    });

    it('should handle all iterations excluded', () => {
      renderWithTheme(
        <ChartFilterDropdown
          availableIterations={mockIterations}
          excludedIterationIds={['1', '2', '3']}
          onFilterChange={mockOnFilterChange}
          onReset={mockOnReset}
        />
      );

      // Badge should show "0/3"
      const badge = screen.getByText('0/3');
      expect(badge).toBeInTheDocument();
    });

    it('should handle iterations without dates', async () => {
      const user = userEvent.setup();

      const iterationsWithoutDates = [
        { id: '1', title: 'Sprint 1' }
      ];

      renderWithTheme(
        <ChartFilterDropdown
          availableIterations={iterationsWithoutDates}
          excludedIterationIds={[]}
          onFilterChange={mockOnFilterChange}
          onReset={mockOnReset}
        />
      );

      // Open dropdown
      const filterButton = screen.getByRole('button', { name: /filter iterations/i });
      await user.click(filterButton);

      // Should render without crashing
      expect(screen.getByText('Sprint 1')).toBeInTheDocument();
    });

    it('should sync with external prop changes', () => {
      const { rerender } = renderWithTheme(
        <ChartFilterDropdown
          availableIterations={mockIterations}
          excludedIterationIds={[]}
          onFilterChange={mockOnFilterChange}
          onReset={mockOnReset}
        />
      );

      // No badge initially (check for role="status" badge specifically)
      expect(screen.queryByRole('status')).not.toBeInTheDocument();

      // Update props externally
      rerender(
        <ThemeProvider theme={theme}>
          <ChartFilterDropdown
            availableIterations={mockIterations}
            excludedIterationIds={['1', '2']}
            onFilterChange={mockOnFilterChange}
            onReset={mockOnReset}
          />
        </ThemeProvider>
      );

      // Badge should now show "1/3"
      expect(screen.getByText('1/3')).toBeInTheDocument();
    });
  });
});
