/**
 * @jest-environment jsdom
 */
import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import userEvent from '@testing-library/user-event';
import AnnotationsList from '../../../src/public/components/AnnotationsList.jsx';

// Import theme
const theme = {
  colors: {
    bgPrimary: '#1a1a1a',
    bgSecondary: '#2a2a2a',
    textPrimary: '#ffffff',
    textSecondary: '#9ca3af',
    border: '#374151',
  },
  typography: {
    fontSize: {
      sm: '0.875rem',
    },
    fontWeight: {
      medium: '500',
    },
  },
  borderRadius: {
    md: '0.375rem',
    lg: '0.5rem',
  },
  shadows: {
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  },
  transitions: {
    fast: '150ms',
    easing: 'ease-in-out',
  },
  zIndex: {
    dropdown: 1000,
  },
};

describe('AnnotationsList', () => {
  const mockOnEdit = jest.fn();

  beforeEach(() => {
    global.fetch = jest.fn();
    mockOnEdit.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const renderWithTheme = (component) => {
    return render(
      <ThemeProvider theme={theme}>
        {component}
      </ThemeProvider>
    );
  };

  test('displays correct annotation count on mount', async () => {
    const mockAnnotations = [
      {
        id: '1',
        title: 'Test Annotation',
        date: '2025-01-15',
        type: 'process',
        impact: 'positive',
      },
      {
        id: '2',
        title: 'Another Annotation',
        date: '2025-01-20',
        type: 'team',
        impact: 'negative',
      },
    ];

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAnnotations,
    });

    renderWithTheme(<AnnotationsList onEdit={mockOnEdit} />);

    // Wait for annotations to be fetched
    await waitFor(() => {
      expect(screen.getByText(/Manage Annotations \(2\)/i)).toBeInTheDocument();
    });

    // Verify fetch was called on mount
    expect(global.fetch).toHaveBeenCalledWith('/api/annotations');
  });

  test('starts with count of 0 when no annotations exist', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    renderWithTheme(<AnnotationsList onEdit={mockOnEdit} />);

    await waitFor(() => {
      expect(screen.getByText(/Manage Annotations \(0\)/i)).toBeInTheDocument();
    });
  });

  test('opens dropdown when button is clicked', async () => {
    const user = userEvent.setup();
    const mockAnnotations = [
      {
        id: '1',
        title: 'Test Annotation',
        date: '2025-01-15',
        type: 'process',
        impact: 'positive',
      },
    ];

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => mockAnnotations,
    });

    renderWithTheme(<AnnotationsList onEdit={mockOnEdit} />);

    // Wait for initial fetch
    await waitFor(() => {
      expect(screen.getByText(/Manage Annotations \(1\)/i)).toBeInTheDocument();
    });

    // Click button to open dropdown
    const button = screen.getByText(/Manage Annotations \(1\)/i);
    await user.click(button);

    // Dropdown should be visible
    await waitFor(() => {
      expect(screen.getByText('Test Annotation')).toBeInTheDocument();
    });
  });

  test('shows loading state while fetching', async () => {
    global.fetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderWithTheme(<AnnotationsList onEdit={mockOnEdit} />);

    // Should show 0 initially while loading
    expect(screen.getByText(/Manage Annotations \(0\)/i)).toBeInTheDocument();
  });

  test('handles fetch error gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    renderWithTheme(<AnnotationsList onEdit={mockOnEdit} />);

    // Should still render with 0 count even if fetch fails
    await waitFor(() => {
      expect(screen.getByText(/Manage Annotations \(0\)/i)).toBeInTheDocument();
    });

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  test('calls onEdit when annotation is clicked', async () => {
    const user = userEvent.setup();
    const mockAnnotations = [
      {
        id: '1',
        title: 'Test Annotation',
        date: '2025-01-15',
        type: 'process',
        impact: 'positive',
      },
    ];

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => mockAnnotations,
    });

    renderWithTheme(<AnnotationsList onEdit={mockOnEdit} />);

    // Wait for initial fetch
    await waitFor(() => {
      expect(screen.getByText(/Manage Annotations \(1\)/i)).toBeInTheDocument();
    });

    // Open dropdown
    const button = screen.getByText(/Manage Annotations \(1\)/i);
    await user.click(button);

    // Click annotation
    const annotation = await screen.findByText('Test Annotation');
    await user.click(annotation);

    // Should call onEdit with annotation
    expect(mockOnEdit).toHaveBeenCalledWith(mockAnnotations[0]);
  });

  test('displays empty state when no annotations exist', async () => {
    const user = userEvent.setup();

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    renderWithTheme(<AnnotationsList onEdit={mockOnEdit} />);

    // Wait for fetch
    await waitFor(() => {
      expect(screen.getByText(/Manage Annotations \(0\)/i)).toBeInTheDocument();
    });

    // Open dropdown
    const button = screen.getByText(/Manage Annotations \(0\)/i);
    await user.click(button);

    // Should show empty state
    expect(screen.getByText('No annotations yet')).toBeInTheDocument();
  });

  test('closes dropdown when clicking outside', async () => {
    const user = userEvent.setup();
    const mockAnnotations = [
      {
        id: '1',
        title: 'Test Annotation',
        date: '2025-01-15',
        type: 'process',
        impact: 'positive',
      },
    ];

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => mockAnnotations,
    });

    renderWithTheme(
      <div>
        <div data-testid="outside">Outside</div>
        <AnnotationsList onEdit={mockOnEdit} />
      </div>
    );

    // Wait for fetch
    await waitFor(() => {
      expect(screen.getByText(/Manage Annotations \(1\)/i)).toBeInTheDocument();
    });

    // Open dropdown
    const button = screen.getByText(/Manage Annotations \(1\)/i);
    await user.click(button);

    // Dropdown should be visible
    await waitFor(() => {
      expect(screen.getByText('Test Annotation')).toBeInTheDocument();
    });

    // Click outside
    const outside = screen.getByTestId('outside');
    await user.click(outside);

    // Dropdown should be closed
    await waitFor(() => {
      expect(screen.queryByText('Test Annotation')).not.toBeInTheDocument();
    });
  });
});
