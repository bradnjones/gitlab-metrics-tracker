/**
 * @jest-environment jsdom
 */
import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import AnnotationsManagementModal from '../../../src/public/components/AnnotationsManagementModal.jsx';

// Minimal theme object (consistent with other component tests)
const theme = {
  colors: {
    bgPrimary: '#ffffff',
    bgSecondary: '#f9fafb',
    bgTertiary: '#f3f4f6',
    textPrimary: '#111827',
    textSecondary: '#6b7280',
    border: '#e5e7eb',
    primary: '#3b82f6',
    primaryDark: '#2563eb',
    success: '#22c55e',
    danger: '#ef4444',
    warning: '#f97316',
  },
  typography: {
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75',
    },
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    xxl: '3rem',
  },
  borderRadius: {
    sm: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
  },
  shadows: {
    sm: '0 1px 3px rgba(0, 0, 0, 0.1)',
    md: '0 2px 8px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  },
  transitions: {
    fast: '150ms',
    normal: '200ms',
    easing: 'ease-in-out',
  },
  zIndex: {
    modal: 1000,
    overlay: 999,
  },
};

// Mock annotations data
const mockAnnotations = [
  {
    id: 'ann-1',
    title: 'Sprint Planning Process Change',
    date: '2024-01-15',
    type: 'process',
    impact: 'positive',
    description: 'Implemented new sprint planning workflow with better estimation techniques and team collaboration.',
    affectedMetrics: ['velocity', 'cycle_time_avg'],
    color: '#3b82f6',
  },
  {
    id: 'ann-2',
    title: 'Team Member Onboarding',
    date: '2024-02-01',
    type: 'team',
    impact: 'negative',
    description: 'New developer joined - temporary velocity dip expected during ramp-up period.',
    affectedMetrics: ['velocity', 'throughput'],
    color: '#ef4444',
  },
];

describe('AnnotationsManagementModal', () => {
  const mockOnClose = jest.fn();
  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();
  const mockOnCreate = jest.fn();

  beforeEach(() => {
    // Mock fetch globally
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockAnnotations),
      })
    );

    // Clear all mocks
    mockOnClose.mockClear();
    mockOnEdit.mockClear();
    mockOnDelete.mockClear();
    mockOnCreate.mockClear();
  });

  afterEach(() => {
    // Clean up fetch mock
    global.fetch.mockRestore?.();
    // Clean up body scroll lock
    document.body.style.overflow = '';
  });

  const renderWithTheme = (component) => {
    return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
  };

  test('renders modal when isOpen is true and displays annotations after fetch', async () => {
    // Act
    renderWithTheme(
      <AnnotationsManagementModal
        isOpen={true}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onCreate={mockOnCreate}
      />
    );

    // Assert - Modal header is visible
    expect(screen.getByText(/Manage Annotations/i)).toBeInTheDocument();

    // Assert - Fetch was called
    expect(global.fetch).toHaveBeenCalledWith('/api/annotations');

    // Assert - Annotations are displayed after fetch
    await waitFor(() => {
      expect(screen.getByText('Sprint Planning Process Change')).toBeInTheDocument();
    });

    expect(screen.getByText('Team Member Onboarding')).toBeInTheDocument();

    // Assert - Impact is displayed
    expect(screen.getByText(/positive/i)).toBeInTheDocument();
    expect(screen.getByText(/negative/i)).toBeInTheDocument();
  });

  test('calls onEdit and onDelete callbacks when buttons are clicked', async () => {
    // Act
    renderWithTheme(
      <AnnotationsManagementModal
        isOpen={true}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onCreate={mockOnCreate}
      />
    );

    // Wait for annotations to load
    await waitFor(() => {
      expect(screen.getByText('Sprint Planning Process Change')).toBeInTheDocument();
    });

    // Assert - Edit button calls onEdit with annotation object
    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    editButtons[0].click();
    expect(mockOnEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'ann-1' }));

    // Assert - Delete button shows confirmation and calls onDelete
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });

    // Mock window.confirm
    global.confirm = jest.fn(() => true);
    deleteButtons[0].click();

    expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to delete this annotation?');
    expect(mockOnDelete).toHaveBeenCalledWith('ann-1');
  });

  test('handles loading, empty, and error states correctly', async () => {
    const { unmount } = await import('@testing-library/react');

    // Test 1: Loading state
    global.fetch = jest.fn(() => new Promise(() => {})); // Never resolves

    const { unmount: unmount1 } = renderWithTheme(
      <AnnotationsManagementModal
        isOpen={true}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onCreate={mockOnCreate}
      />
    );

    expect(screen.getByText(/loading annotations/i)).toBeInTheDocument();
    unmount1();

    // Test 2: Empty state
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      })
    );

    const { unmount: unmount2 } = renderWithTheme(
      <AnnotationsManagementModal
        isOpen={true}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onCreate={mockOnCreate}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/no annotations yet/i)).toBeInTheDocument();
    });
    const addButtons = screen.getAllByRole('button', { name: /add annotation/i });
    expect(addButtons.length).toBeGreaterThan(0);
    unmount2();

    // Test 3: Error state
    global.fetch = jest.fn(() => Promise.reject(new Error('Network error')));

    renderWithTheme(
      <AnnotationsManagementModal
        isOpen={true}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onCreate={mockOnCreate}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/failed to load annotations/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  test('closes modal via onClose callback, Escape key, and overlay click', async () => {
    // Setup
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockAnnotations),
      })
    );

    renderWithTheme(
      <AnnotationsManagementModal
        isOpen={true}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onCreate={mockOnCreate}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Sprint Planning Process Change')).toBeInTheDocument();
    });

    // Test 1: Close button
    const closeButtons = screen.getAllByRole('button', { name: /close/i });
    closeButtons[0].click();
    expect(mockOnClose).toHaveBeenCalledTimes(1);

    // Test 2: Escape key
    const { fireEvent } = await import('@testing-library/react');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(mockOnClose).toHaveBeenCalledTimes(2);

    // Test 3: Overlay click
    const overlay = screen.getByTestId('modal-overlay');
    overlay.click();
    expect(mockOnClose).toHaveBeenCalledTimes(3);

    // Test 4: Content click should NOT close
    const content = screen.getByTestId('modal-content');
    content.click();
    expect(mockOnClose).toHaveBeenCalledTimes(3); // Still 3
  });

  test('calls onCreate when Add Annotation button is clicked and locks body scroll when open', async () => {
    // Setup
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockAnnotations),
      })
    );

    const { rerender } = renderWithTheme(
      <AnnotationsManagementModal
        isOpen={true}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onCreate={mockOnCreate}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Sprint Planning Process Change')).toBeInTheDocument();
    });

    // Test 1: Add Annotation button calls onCreate
    const addButtons = screen.getAllByRole('button', { name: /add annotation/i });
    addButtons[0].click();
    expect(mockOnCreate).toHaveBeenCalledTimes(1);

    // Test 2: Body scroll lock when open
    expect(document.body.style.overflow).toBe('hidden');

    // Test 3: Body scroll restored when closed
    rerender(
      <ThemeProvider theme={theme}>
        <AnnotationsManagementModal
          isOpen={false}
          onClose={mockOnClose}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onCreate={mockOnCreate}
        />
      </ThemeProvider>
    );

    expect(document.body.style.overflow).toBe('');
  });
});
