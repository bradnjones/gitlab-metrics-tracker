/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the custom hooks before importing the component
const mockUseIterations = jest.fn();
const mockUseIterationFilters = jest.fn();
const mockUseSelectAll = jest.fn();

jest.mock('../../../src/public/hooks/useIterations.js', () => ({
  useIterations: () => mockUseIterations()
}));

jest.mock('../../../src/public/hooks/useIterationFilters.js', () => ({
  useIterationFilters: () => mockUseIterationFilters()
}));

jest.mock('../../../src/public/hooks/useSelectAll.js', () => ({
  useSelectAll: () => mockUseSelectAll()
}));

import IterationSelector from '../../../src/public/components/IterationSelector.jsx';

describe.skip('IterationSelector', () => {
  const mockIterations = [
    {
      id: 'gid://gitlab/Iteration/1',
      iid: '1',
      title: 'Sprint 1',
      startDate: '2025-01-01',
      dueDate: '2025-01-14',
      state: 'closed',
      iterationCadence: { title: 'Q1 2025' }
    },
    {
      id: 'gid://gitlab/Iteration/2',
      iid: '2',
      title: 'Sprint 2',
      startDate: '2025-01-15',
      dueDate: '2025-01-28',
      state: 'current',
      iterationCadence: { title: 'Q1 2025' }
    },
    {
      id: 'gid://gitlab/Iteration/3',
      iid: '3',
      title: 'Sprint 3',
      startDate: '2025-01-29',
      dueDate: '2025-02-11',
      state: 'upcoming',
      iterationCadence: { title: 'Q1 2025' }
    }
  ];

  beforeEach(() => {
    global.fetch = jest.fn();

    // Mock useIterations hook
    mockUseIterations.mockReturnValue({
      iterations: mockIterations,
      loading: false,
      error: null
    });

    // Mock useIterationFilters hook
    mockUseIterationFilters.mockReturnValue({
      stateFilter: 'all',
      setStateFilter: jest.fn(),
      cadenceFilter: 'all',
      setCadenceFilter: jest.fn(),
      searchQuery: '',
      setSearchQuery: jest.fn(),
      uniqueStates: ['closed', 'current', 'upcoming'],
      uniqueCadences: ['Q1 2025'],
      filteredIterations: mockIterations
    });

    // Mock useSelectAll hook
    mockUseSelectAll.mockReturnValue({
      selectAllRef: { current: null },
      handleSelectAll: jest.fn()
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('fetches iterations from API on mount and displays them', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ iterations: mockIterations })
    });

    render(<IterationSelector onSelectionChange={jest.fn()} />);

    // Should show loading state initially
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    // Wait for iterations to load
    await waitFor(() => {
      expect(screen.getByText('Sprint 1')).toBeInTheDocument();
    });

    // Verify all iterations are displayed
    expect(screen.getByText('Sprint 1')).toBeInTheDocument();
    expect(screen.getByText('Sprint 2')).toBeInTheDocument();
    expect(screen.getByText('Sprint 3')).toBeInTheDocument();

    // Verify fetch was called correctly
    expect(global.fetch).toHaveBeenCalledWith('/api/iterations');
  });

  test('calls onSelectionChange callback when iterations are selected', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ iterations: mockIterations })
    });

    const onSelectionChange = jest.fn();
    const user = userEvent.setup();

    render(<IterationSelector onSelectionChange={onSelectionChange} />);

    // Wait for iterations to load
    await waitFor(() => {
      expect(screen.getByText('Sprint 1')).toBeInTheDocument();
    });

    // Select first iteration
    const checkbox1 = screen.getByLabelText(/Sprint 1/i);
    await user.click(checkbox1);

    // Callback should be called with selected iteration IDs
    await waitFor(() => {
      expect(onSelectionChange).toHaveBeenCalledWith(['gid://gitlab/Iteration/1']);
    });

    // Select second iteration
    const checkbox2 = screen.getByLabelText(/Sprint 2/i);
    await user.click(checkbox2);

    // Callback should be called with both IDs
    await waitFor(() => {
      expect(onSelectionChange).toHaveBeenCalledWith([
        'gid://gitlab/Iteration/1',
        'gid://gitlab/Iteration/2'
      ]);
    });
  });

  test('displays error message when API fetch fails', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    render(<IterationSelector onSelectionChange={jest.fn()} />);

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText(/error.*loading iterations/i)).toBeInTheDocument();
    });
  });

  test('displays empty state when no iterations are returned', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ iterations: [] })
    });

    render(<IterationSelector onSelectionChange={jest.fn()} />);

    // Wait for empty state message
    await waitFor(() => {
      expect(screen.getByText(/no iterations found/i)).toBeInTheDocument();
    });
  });

  test('filters iterations by state when state filter is changed', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ iterations: mockIterations })
    });

    const user = userEvent.setup();
    render(<IterationSelector onSelectionChange={jest.fn()} />);

    // Wait for iterations to load
    await waitFor(() => {
      expect(screen.getByText('Sprint 1')).toBeInTheDocument();
    });

    // All iterations should be visible initially
    expect(screen.getByText('Sprint 1')).toBeInTheDocument();
    expect(screen.getByText('Sprint 2')).toBeInTheDocument();
    expect(screen.getByText('Sprint 3')).toBeInTheDocument();

    // Select "current" state filter
    const stateFilter = screen.getByLabelText(/state:/i);
    await user.selectOptions(stateFilter, 'current');

    // Only Sprint 2 (current) should be visible
    await waitFor(() => {
      expect(screen.queryByText('Sprint 1')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Sprint 2')).toBeInTheDocument();
    expect(screen.queryByText('Sprint 3')).not.toBeInTheDocument();
  });

  test('shows all iterations when "All States" is selected', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ iterations: mockIterations })
    });

    const user = userEvent.setup();
    render(<IterationSelector onSelectionChange={jest.fn()} />);

    // Wait for iterations to load
    await waitFor(() => {
      expect(screen.getByText('Sprint 1')).toBeInTheDocument();
    });

    // Filter to current
    const stateFilter = screen.getByLabelText(/state:/i);
    await user.selectOptions(stateFilter, 'current');

    await waitFor(() => {
      expect(screen.queryByText('Sprint 1')).not.toBeInTheDocument();
    });

    // Reset to "All States"
    await user.selectOptions(stateFilter, '');

    // All iterations should be visible again
    await waitFor(() => {
      expect(screen.getByText('Sprint 1')).toBeInTheDocument();
    });
    expect(screen.getByText('Sprint 2')).toBeInTheDocument();
    expect(screen.getByText('Sprint 3')).toBeInTheDocument();
  });

  test('filters iterations by search query', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ iterations: mockIterations })
    });

    const user = userEvent.setup();
    render(<IterationSelector onSelectionChange={jest.fn()} />);

    // Wait for iterations to load
    await waitFor(() => {
      expect(screen.getByText('Sprint 1')).toBeInTheDocument();
    });

    // Search for "Sprint 2"
    const searchInput = screen.getByPlaceholderText(/search iterations/i);
    await user.type(searchInput, 'Sprint 2');

    // Only Sprint 2 should be visible
    await waitFor(() => {
      expect(screen.queryByText('Sprint 1')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Sprint 2')).toBeInTheDocument();
    expect(screen.queryByText('Sprint 3')).not.toBeInTheDocument();
  });

  test('search is case-insensitive', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ iterations: mockIterations })
    });

    const user = userEvent.setup();
    render(<IterationSelector onSelectionChange={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Sprint 1')).toBeInTheDocument();
    });

    // Search with lowercase
    const searchInput = screen.getByPlaceholderText(/search iterations/i);
    await user.type(searchInput, 'sprint 2');

    // Should still find Sprint 2
    await waitFor(() => {
      expect(screen.queryByText('Sprint 1')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Sprint 2')).toBeInTheDocument();
  });

  test('clear button resets search', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ iterations: mockIterations })
    });

    const user = userEvent.setup();
    render(<IterationSelector onSelectionChange={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Sprint 1')).toBeInTheDocument();
    });

    // Search for Sprint 2
    const searchInput = screen.getByPlaceholderText(/search iterations/i);
    await user.type(searchInput, 'Sprint 2');

    await waitFor(() => {
      expect(screen.queryByText('Sprint 1')).not.toBeInTheDocument();
    });

    // Click clear button
    const clearButton = screen.getByLabelText(/clear search/i);
    await user.click(clearButton);

    // All iterations should be visible again
    await waitFor(() => {
      expect(screen.getByText('Sprint 1')).toBeInTheDocument();
    });
    expect(screen.getByText('Sprint 2')).toBeInTheDocument();
    expect(screen.getByText('Sprint 3')).toBeInTheDocument();
  });

  test('search combines with state filter', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ iterations: mockIterations })
    });

    const user = userEvent.setup();
    render(<IterationSelector onSelectionChange={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Sprint 1')).toBeInTheDocument();
    });

    // Filter to current state (Sprint 2)
    const stateFilter = screen.getByLabelText(/state:/i);
    await user.selectOptions(stateFilter, 'current');

    await waitFor(() => {
      expect(screen.queryByText('Sprint 1')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Sprint 2')).toBeInTheDocument();

    // Search for "Sprint" (should still only show Sprint 2)
    const searchInput = screen.getByPlaceholderText(/search iterations/i);
    await user.type(searchInput, 'Sprint');

    // Sprint 2 should still be visible (matches both filters)
    expect(screen.getByText('Sprint 2')).toBeInTheDocument();
    expect(screen.queryByText('Sprint 1')).not.toBeInTheDocument();
    expect(screen.queryByText('Sprint 3')).not.toBeInTheDocument();
  });

  test('filters iterations by cadence when cadence filter is changed', async () => {
    const iterationsWithCadences = [
      {
        id: 'gid://gitlab/Iteration/1',
        iid: '1',
        title: 'Sprint 1',
        startDate: '2025-01-01',
        dueDate: '2025-01-14',
        state: 'closed',
        iterationCadence: { title: 'Q1 2025' }
      },
      {
        id: 'gid://gitlab/Iteration/2',
        iid: '2',
        title: 'Sprint 2',
        startDate: '2025-01-15',
        dueDate: '2025-01-28',
        state: 'current',
        iterationCadence: { title: 'Q1 2025' }
      },
      {
        id: 'gid://gitlab/Iteration/3',
        iid: '3',
        title: 'Sprint 3',
        startDate: '2025-04-01',
        dueDate: '2025-04-14',
        state: 'upcoming',
        iterationCadence: { title: 'Q2 2025' }
      }
    ];

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ iterations: iterationsWithCadences })
    });

    const user = userEvent.setup();
    render(<IterationSelector onSelectionChange={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Sprint 1')).toBeInTheDocument();
    });

    // All iterations should be visible initially
    expect(screen.getByText('Sprint 1')).toBeInTheDocument();
    expect(screen.getByText('Sprint 2')).toBeInTheDocument();
    expect(screen.getByText('Sprint 3')).toBeInTheDocument();

    // Select "Q1 2025" cadence filter
    const cadenceFilter = screen.getByLabelText(/cadence:/i);
    await user.selectOptions(cadenceFilter, 'Q1 2025');

    // Only Sprint 1 and 2 (Q1 2025) should be visible
    await waitFor(() => {
      expect(screen.queryByText('Sprint 3')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Sprint 1')).toBeInTheDocument();
    expect(screen.getByText('Sprint 2')).toBeInTheDocument();
  });

  test('shows all iterations when "All Cadences" is selected', async () => {
    const iterationsWithCadences = [
      {
        id: 'gid://gitlab/Iteration/1',
        iid: '1',
        title: 'Sprint 1',
        startDate: '2025-01-01',
        dueDate: '2025-01-14',
        state: 'closed',
        iterationCadence: { title: 'Q1 2025' }
      },
      {
        id: 'gid://gitlab/Iteration/2',
        iid: '2',
        title: 'Sprint 2',
        startDate: '2025-04-01',
        dueDate: '2025-04-14',
        state: 'current',
        iterationCadence: { title: 'Q2 2025' }
      }
    ];

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ iterations: iterationsWithCadences })
    });

    const user = userEvent.setup();
    render(<IterationSelector onSelectionChange={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Sprint 1')).toBeInTheDocument();
    });

    // Filter to Q1 2025
    const cadenceFilter = screen.getByLabelText(/cadence:/i);
    await user.selectOptions(cadenceFilter, 'Q1 2025');

    await waitFor(() => {
      expect(screen.queryByText('Sprint 2')).not.toBeInTheDocument();
    });

    // Reset to "All Cadences"
    await user.selectOptions(cadenceFilter, '');

    // All iterations should be visible again
    await waitFor(() => {
      expect(screen.getByText('Sprint 1')).toBeInTheDocument();
    });
    expect(screen.getByText('Sprint 2')).toBeInTheDocument();
  });

  test('cadence filter combines with state filter and search', async () => {
    const iterationsWithCadences = [
      {
        id: 'gid://gitlab/Iteration/1',
        iid: '1',
        title: 'Sprint 1',
        startDate: '2025-01-01',
        dueDate: '2025-01-14',
        state: 'closed',
        iterationCadence: { title: 'Q1 2025' }
      },
      {
        id: 'gid://gitlab/Iteration/2',
        iid: '2',
        title: 'Sprint 2',
        startDate: '2025-01-15',
        dueDate: '2025-01-28',
        state: 'current',
        iterationCadence: { title: 'Q1 2025' }
      },
      {
        id: 'gid://gitlab/Iteration/3',
        iid: '3',
        title: 'Sprint 3',
        startDate: '2025-04-01',
        dueDate: '2025-04-14',
        state: 'current',
        iterationCadence: { title: 'Q2 2025' }
      }
    ];

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ iterations: iterationsWithCadences })
    });

    const user = userEvent.setup();
    render(<IterationSelector onSelectionChange={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Sprint 1')).toBeInTheDocument();
    });

    // Filter to current state (Sprint 2 and 3)
    const stateFilter = screen.getByLabelText(/state:/i);
    await user.selectOptions(stateFilter, 'current');

    await waitFor(() => {
      expect(screen.queryByText('Sprint 1')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Sprint 2')).toBeInTheDocument();
    expect(screen.getByText('Sprint 3')).toBeInTheDocument();

    // Add cadence filter for Q1 2025 (should show only Sprint 2)
    const cadenceFilter = screen.getByLabelText(/cadence:/i);
    await user.selectOptions(cadenceFilter, 'Q1 2025');

    await waitFor(() => {
      expect(screen.queryByText('Sprint 3')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Sprint 2')).toBeInTheDocument();
    expect(screen.queryByText('Sprint 1')).not.toBeInTheDocument();
  });

  // Select All Checkbox Tests
  describe('Select All checkbox', () => {
    test('renders Select All checkbox in the controls bar', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ iterations: mockIterations })
      });

      render(<IterationSelector onSelectionChange={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Sprint 1')).toBeInTheDocument();
      });

      // Select All checkbox should be present
      const selectAllCheckbox = screen.getByLabelText(/select all/i);
      expect(selectAllCheckbox).toBeInTheDocument();
      expect(selectAllCheckbox).not.toBeChecked();
    });

    test('selects all visible iterations when Select All is checked', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ iterations: mockIterations })
      });

      const onSelectionChange = jest.fn();
      const user = userEvent.setup();

      render(<IterationSelector onSelectionChange={onSelectionChange} />);

      await waitFor(() => {
        expect(screen.getByText('Sprint 1')).toBeInTheDocument();
      });

      // Click Select All
      const selectAllCheckbox = screen.getByLabelText(/select all/i);
      await user.click(selectAllCheckbox);

      // All iterations should be selected
      await waitFor(() => {
        expect(onSelectionChange).toHaveBeenCalledWith([
          'gid://gitlab/Iteration/1',
          'gid://gitlab/Iteration/2',
          'gid://gitlab/Iteration/3'
        ]);
      });

      // Individual checkboxes should be checked
      expect(screen.getByLabelText(/Sprint 1/i)).toBeChecked();
      expect(screen.getByLabelText(/Sprint 2/i)).toBeChecked();
      expect(screen.getByLabelText(/Sprint 3/i)).toBeChecked();
    });

    test('deselects all iterations when Select All is unchecked', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ iterations: mockIterations })
      });

      const onSelectionChange = jest.fn();
      const user = userEvent.setup();

      render(<IterationSelector onSelectionChange={onSelectionChange} />);

      await waitFor(() => {
        expect(screen.getByText('Sprint 1')).toBeInTheDocument();
      });

      const selectAllCheckbox = screen.getByLabelText(/select all/i);

      // First, select all
      await user.click(selectAllCheckbox);

      await waitFor(() => {
        expect(selectAllCheckbox).toBeChecked();
      });

      // Then, unselect all
      await user.click(selectAllCheckbox);

      await waitFor(() => {
        expect(onSelectionChange).toHaveBeenCalledWith([]);
      });

      // Individual checkboxes should be unchecked
      expect(screen.getByLabelText(/Sprint 1/i)).not.toBeChecked();
      expect(screen.getByLabelText(/Sprint 2/i)).not.toBeChecked();
      expect(screen.getByLabelText(/Sprint 3/i)).not.toBeChecked();
    });

    test('shows indeterminate state when some but not all iterations are selected', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ iterations: mockIterations })
      });

      const user = userEvent.setup();
      render(<IterationSelector onSelectionChange={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Sprint 1')).toBeInTheDocument();
      });

      // Select only Sprint 1
      const checkbox1 = screen.getByLabelText(/Sprint 1/i);
      await user.click(checkbox1);

      await waitFor(() => {
        expect(checkbox1).toBeChecked();
      });

      // Select All should be indeterminate
      const selectAllCheckbox = screen.getByLabelText(/select all/i);
      expect(selectAllCheckbox.indeterminate).toBe(true);
      expect(selectAllCheckbox).not.toBeChecked();
    });

    test('selects only filtered iterations when filters are active', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ iterations: mockIterations })
      });

      const onSelectionChange = jest.fn();
      const user = userEvent.setup();

      render(<IterationSelector onSelectionChange={onSelectionChange} />);

      await waitFor(() => {
        expect(screen.getByText('Sprint 1')).toBeInTheDocument();
      });

      // Filter to current state (only Sprint 2)
      const stateFilter = screen.getByLabelText(/state:/i);
      await user.selectOptions(stateFilter, 'current');

      await waitFor(() => {
        expect(screen.queryByText('Sprint 1')).not.toBeInTheDocument();
      });

      // Click Select All - should only select Sprint 2
      const selectAllCheckbox = screen.getByLabelText(/select all/i);
      await user.click(selectAllCheckbox);

      await waitFor(() => {
        expect(onSelectionChange).toHaveBeenCalledWith([
          'gid://gitlab/Iteration/2'
        ]);
      });

      // Only Sprint 2 should be checked
      expect(screen.getByLabelText(/Sprint 2/i)).toBeChecked();
    });

    test('selects only searched iterations when search is active', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ iterations: mockIterations })
      });

      const onSelectionChange = jest.fn();
      const user = userEvent.setup();

      render(<IterationSelector onSelectionChange={onSelectionChange} />);

      await waitFor(() => {
        expect(screen.getByText('Sprint 1')).toBeInTheDocument();
      });

      // Search for "Sprint 3"
      const searchInput = screen.getByPlaceholderText(/search iterations/i);
      await user.type(searchInput, 'Sprint 3');

      await waitFor(() => {
        expect(screen.queryByText('Sprint 1')).not.toBeInTheDocument();
      });

      // Click Select All - should only select Sprint 3
      const selectAllCheckbox = screen.getByLabelText(/select all/i);
      await user.click(selectAllCheckbox);

      await waitFor(() => {
        expect(onSelectionChange).toHaveBeenCalledWith([
          'gid://gitlab/Iteration/3'
        ]);
      });

      // Only Sprint 3 should be checked
      expect(screen.getByLabelText(/Sprint 3/i)).toBeChecked();
    });

    test('updates Select All state when filters change', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ iterations: mockIterations })
      });

      const user = userEvent.setup();
      render(<IterationSelector onSelectionChange={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Sprint 1')).toBeInTheDocument();
      });

      // Select all iterations (no filters)
      const selectAllCheckbox = screen.getByLabelText(/select all/i);
      await user.click(selectAllCheckbox);

      await waitFor(() => {
        expect(selectAllCheckbox).toBeChecked();
      });

      // Now apply a filter to show only Sprint 2 (current)
      const stateFilter = screen.getByLabelText(/state:/i);
      await user.selectOptions(stateFilter, 'current');

      await waitFor(() => {
        expect(screen.queryByText('Sprint 1')).not.toBeInTheDocument();
      });

      // Select All should now show indeterminate (Sprint 1 and 3 are selected but not visible)
      // or be checked if Sprint 2 is the only visible one and it's selected
      expect(selectAllCheckbox).toBeChecked();
    });

    test('deselects all filtered iterations when unchecking Select All with active filters', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ iterations: mockIterations })
      });

      const onSelectionChange = jest.fn();
      const user = userEvent.setup();

      render(<IterationSelector onSelectionChange={onSelectionChange} />);

      await waitFor(() => {
        expect(screen.getByText('Sprint 1')).toBeInTheDocument();
      });

      // Filter to current state (only Sprint 2)
      const stateFilter = screen.getByLabelText(/state:/i);
      await user.selectOptions(stateFilter, 'current');

      await waitFor(() => {
        expect(screen.queryByText('Sprint 1')).not.toBeInTheDocument();
      });

      // Select all filtered iterations
      const selectAllCheckbox = screen.getByLabelText(/select all/i);
      await user.click(selectAllCheckbox);

      await waitFor(() => {
        expect(selectAllCheckbox).toBeChecked();
      });

      // Deselect all
      await user.click(selectAllCheckbox);

      await waitFor(() => {
        expect(onSelectionChange).toHaveBeenCalledWith([]);
      });

      expect(screen.getByLabelText(/Sprint 2/i)).not.toBeChecked();
    });
  });
});
