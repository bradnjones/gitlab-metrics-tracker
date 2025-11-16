/**
 * @jest-environment jsdom
 */
import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import userEvent from '@testing-library/user-event';
import CompactHeaderWithIterations from '../../../src/public/components/CompactHeaderWithIterations.jsx';

// Mock child components that make API calls
jest.mock('../../../src/public/components/CacheStatus.jsx', () => {
  return jest.fn(() => <div data-testid="cache-status">Cache: Fresh</div>);
});

jest.mock('../../../src/public/components/RefreshButton.jsx', () => {
  return jest.fn(() => <button data-testid="refresh-button">Refresh</button>);
});

// Minimal theme object (consistent with HamburgerMenu.test.jsx)
const theme = {
  colors: {
    bgPrimary: '#ffffff',
    bgSecondary: '#f9fafb',
    textPrimary: '#1f2937',
    textSecondary: '#6b7280',
    border: '#e5e7eb',
    primary: '#3b82f6',
    primaryDark: '#2563eb',
  },
  typography: {
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
    },
    fontWeight: {
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },
  spacing: {
    sm: '0.5rem',
    md: '1rem',
  },
  borderRadius: {
    sm: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
  },
  shadows: {
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  },
  transitions: {
    fast: '150ms',
    normal: '250ms',
    easing: 'ease-in-out',
  },
  zIndex: {
    dropdown: 1000,
  },
  breakpoints: {
    tablet: '768px',
  },
};

describe('CompactHeaderWithIterations', () => {
  const mockOnOpenManageAnnotations = jest.fn();
  const mockOnOpenAnnotationModal = jest.fn();
  const mockOnOpenModal = jest.fn();
  const mockOnRemoveIteration = jest.fn();

  beforeEach(() => {
    mockOnOpenManageAnnotations.mockClear();
    mockOnOpenAnnotationModal.mockClear();
    mockOnOpenModal.mockClear();
    mockOnRemoveIteration.mockClear();
  });

  const renderWithTheme = (component) => {
    return render(
      <ThemeProvider theme={theme}>
        {component}
      </ThemeProvider>
    );
  };

  test('renders header with branding and all expected sections', () => {
    // Act
    renderWithTheme(
      <CompactHeaderWithIterations
        selectedIterations={[]}
        onOpenManageAnnotations={mockOnOpenManageAnnotations}
        onOpenAnnotationModal={mockOnOpenAnnotationModal}
        onOpenModal={mockOnOpenModal}
        onRemoveIteration={mockOnRemoveIteration}
      />
    );

    // Assert - Branding
    expect(screen.getByText('GitLab Sprint Metrics')).toBeInTheDocument();
    expect(screen.getByText('Track performance with context')).toBeInTheDocument();

    // Assert - Hamburger menu button
    expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument();

    // Assert - Cache status and refresh button
    expect(screen.getByTestId('cache-status')).toBeInTheDocument();
    expect(screen.getByTestId('refresh-button')).toBeInTheDocument();

    // Assert - Empty state message when no iterations selected
    expect(screen.getByText('No sprints selected')).toBeInTheDocument();
  });

  test('passes onOpenManageAnnotations callback to HamburgerMenu and calls it when "Manage Annotations" clicked', async () => {
    // Arrange
    const user = userEvent.setup();

    // Act
    renderWithTheme(
      <CompactHeaderWithIterations
        selectedIterations={[]}
        onOpenManageAnnotations={mockOnOpenManageAnnotations}
        onOpenAnnotationModal={mockOnOpenAnnotationModal}
        onOpenModal={mockOnOpenModal}
        onRemoveIteration={mockOnRemoveIteration}
      />
    );

    // Open hamburger menu
    const menuButton = screen.getByRole('button', { name: 'Menu' });
    await user.click(menuButton);

    // Assert - Menu is open
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Act - Click "Manage Annotations" menu item
    await user.click(screen.getByText('Manage Annotations'));

    // Assert - Callback was called
    expect(mockOnOpenManageAnnotations).toHaveBeenCalledTimes(1);
    expect(mockOnOpenManageAnnotations).toHaveBeenCalledWith();

    // Assert - Menu closes after click
    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  test('passes onOpenAnnotationModal callback to HamburgerMenu and calls it when "Add Annotation" clicked', async () => {
    // Arrange
    const user = userEvent.setup();

    // Act
    renderWithTheme(
      <CompactHeaderWithIterations
        selectedIterations={[]}
        onOpenManageAnnotations={mockOnOpenManageAnnotations}
        onOpenAnnotationModal={mockOnOpenAnnotationModal}
        onOpenModal={mockOnOpenModal}
        onRemoveIteration={mockOnRemoveIteration}
      />
    );

    // Open hamburger menu
    const menuButton = screen.getByRole('button', { name: 'Menu' });
    await user.click(menuButton);

    // Act - Click "Add Annotation" menu item
    await user.click(screen.getByText('Add Annotation'));

    // Assert - Callback was called
    expect(mockOnOpenAnnotationModal).toHaveBeenCalledTimes(1);
    expect(mockOnOpenAnnotationModal).toHaveBeenCalledWith();

    // Assert - Menu closes after click
    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  test('passes onOpenModal callback to HamburgerMenu and calls it when "Change Sprints" clicked', async () => {
    // Arrange
    const user = userEvent.setup();

    // Act
    renderWithTheme(
      <CompactHeaderWithIterations
        selectedIterations={[]}
        onOpenManageAnnotations={mockOnOpenManageAnnotations}
        onOpenAnnotationModal={mockOnOpenAnnotationModal}
        onOpenModal={mockOnOpenModal}
        onRemoveIteration={mockOnRemoveIteration}
      />
    );

    // Open hamburger menu
    const menuButton = screen.getByRole('button', { name: 'Menu' });
    await user.click(menuButton);

    // Act - Click "Change Sprints" menu item
    await user.click(screen.getByText('Change Sprints'));

    // Assert - Callback was called
    expect(mockOnOpenModal).toHaveBeenCalledTimes(1);
    expect(mockOnOpenModal).toHaveBeenCalledWith();

    // Assert - Menu closes after click
    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  test('renders iteration chips when iterations are selected', () => {
    // Arrange
    const mockIterations = [
      {
        id: '1',
        title: 'Sprint 1',
        dueDate: '2024-01-15',
        iterationCadence: { title: 'Devs Sprint' },
      },
      {
        id: '2',
        title: 'Sprint 2',
        dueDate: '2024-01-29',
        iterationCadence: { title: 'Devs Sprint' },
      },
    ];

    // Act
    renderWithTheme(
      <CompactHeaderWithIterations
        selectedIterations={mockIterations}
        onOpenManageAnnotations={mockOnOpenManageAnnotations}
        onOpenAnnotationModal={mockOnOpenAnnotationModal}
        onOpenModal={mockOnOpenModal}
        onRemoveIteration={mockOnRemoveIteration}
      />
    );

    // Assert - No "No sprints selected" message
    expect(screen.queryByText('No sprints selected')).not.toBeInTheDocument();

    // Assert - Iteration chips are rendered with compact format (DS = Devs Sprint initials)
    // Note: Dates may be off by 1 day due to UTC/local timezone conversion
    expect(screen.getByText('DS 1/14')).toBeInTheDocument();
    expect(screen.getByText('DS 1/28')).toBeInTheDocument();
  });

  test('calls onRemoveIteration callback when iteration chip remove button is clicked', async () => {
    // Arrange
    const user = userEvent.setup();
    const mockIterations = [
      {
        id: '1',
        title: 'Sprint 1',
        dueDate: '2024-01-15',
        iterationCadence: { title: 'Devs Sprint' },
      },
    ];

    // Act
    renderWithTheme(
      <CompactHeaderWithIterations
        selectedIterations={mockIterations}
        onOpenManageAnnotations={mockOnOpenManageAnnotations}
        onOpenAnnotationModal={mockOnOpenAnnotationModal}
        onOpenModal={mockOnOpenModal}
        onRemoveIteration={mockOnRemoveIteration}
      />
    );

    // Find the remove button (× button) for Sprint 1
    const removeButton = screen.getByRole('button', { name: /Remove.*Sprint 1/i });

    // Act - Click remove button
    await user.click(removeButton);

    // Assert - Callback was called with iteration ID
    expect(mockOnRemoveIteration).toHaveBeenCalledTimes(1);
    expect(mockOnRemoveIteration).toHaveBeenCalledWith('1');
  });

  test('all three hamburger menu callbacks work independently within the same component instance', async () => {
    // Arrange
    const user = userEvent.setup();

    // Act
    renderWithTheme(
      <CompactHeaderWithIterations
        selectedIterations={[]}
        onOpenManageAnnotations={mockOnOpenManageAnnotations}
        onOpenAnnotationModal={mockOnOpenAnnotationModal}
        onOpenModal={mockOnOpenModal}
        onRemoveIteration={mockOnRemoveIteration}
      />
    );

    const menuButton = screen.getByRole('button', { name: 'Menu' });

    // Test 1: Manage Annotations
    await user.click(menuButton);
    await user.click(screen.getByText('Manage Annotations'));
    expect(mockOnOpenManageAnnotations).toHaveBeenCalledTimes(1);

    // Test 2: Add Annotation
    await user.click(menuButton);
    await user.click(screen.getByText('Add Annotation'));
    expect(mockOnOpenAnnotationModal).toHaveBeenCalledTimes(1);

    // Test 3: Change Sprints
    await user.click(menuButton);
    await user.click(screen.getByText('Change Sprints'));
    expect(mockOnOpenModal).toHaveBeenCalledTimes(1);

    // Assert - All callbacks were called exactly once
    expect(mockOnOpenManageAnnotations).toHaveBeenCalledTimes(1);
    expect(mockOnOpenAnnotationModal).toHaveBeenCalledTimes(1);
    expect(mockOnOpenModal).toHaveBeenCalledTimes(1);
  });
});
