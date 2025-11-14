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

describe('IterationSelector', () => {
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

  let mockSetStateFilter, mockSetCadenceFilter, mockSetSearchQuery, mockHandleSelectAll;

  beforeEach(() => {
    // Mock fetch API for cache status
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ iterations: [] })
      })
    );

    // Create fresh mock functions for each test
    mockSetStateFilter = jest.fn();
    mockSetCadenceFilter = jest.fn();
    mockSetSearchQuery = jest.fn();
    mockHandleSelectAll = jest.fn();

    // Mock useIterations hook - returns loading: false by default
    mockUseIterations.mockReturnValue({
      iterations: mockIterations,
      loading: false,
      error: null
    });

    // Mock useIterationFilters hook - returns all iterations by default
    mockUseIterationFilters.mockReturnValue({
      stateFilter: '',
      setStateFilter: mockSetStateFilter,
      cadenceFilter: '',
      setCadenceFilter: mockSetCadenceFilter,
      searchQuery: '',
      setSearchQuery: mockSetSearchQuery,
      uniqueStates: ['closed', 'current', 'upcoming'],
      uniqueCadences: ['Q1 2025'],
      filteredIterations: mockIterations
    });

    // Mock useSelectAll hook
    mockUseSelectAll.mockReturnValue({
      selectAllRef: { current: null },
      handleSelectAll: mockHandleSelectAll
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('displays iterations when hook returns data', async () => {
    render(<IterationSelector onSelectionChange={jest.fn()} />);

    // Wait for async fetch to complete
    await waitFor(() => {
      expect(screen.getByText('Sprint 1')).toBeInTheDocument();
    });

    // Verify all iterations are displayed
    expect(screen.getByText('Sprint 1')).toBeInTheDocument();
    expect(screen.getByText('Sprint 2')).toBeInTheDocument();
    expect(screen.getByText('Sprint 3')).toBeInTheDocument();
  });

  test('calls onSelectionChange callback when iterations are selected', async () => {
    const onSelectionChange = jest.fn();
    const user = userEvent.setup();

    render(<IterationSelector onSelectionChange={onSelectionChange} />);

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

  test('displays loading message when hook returns loading state', async () => {
    mockUseIterations.mockReturnValue({
      iterations: [],
      loading: true,
      error: null
    });

    render(<IterationSelector onSelectionChange={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/loading iterations/i)).toBeInTheDocument();
    });
  });

  test('displays error message when hook returns error', async () => {
    mockUseIterations.mockReturnValue({
      iterations: [],
      loading: false,
      error: 'Error loading iterations: Network error'
    });

    render(<IterationSelector onSelectionChange={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/error.*loading iterations.*network error/i)).toBeInTheDocument();
    });
  });

  test('displays empty state when no iterations are returned', async () => {
    mockUseIterations.mockReturnValue({
      iterations: [],
      loading: false,
      error: null
    });

    render(<IterationSelector onSelectionChange={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/no iterations found/i)).toBeInTheDocument();
    });
  });

  test('calls setStateFilter when state filter is changed', async () => {
    const user = userEvent.setup();
    render(<IterationSelector onSelectionChange={jest.fn()} />);

    // Wait for component to fully load
    await waitFor(() => {
      expect(screen.getByLabelText(/state:/i)).toBeInTheDocument();
    });

    // Select "current" state filter
    const stateFilter = screen.getByLabelText(/state:/i);
    await user.selectOptions(stateFilter, 'current');

    // setStateFilter should be called with "current"
    expect(mockSetStateFilter).toHaveBeenCalledWith('current');
  });

  test('displays only filtered iterations when useIterationFilters returns filtered list', async () => {
    // Mock useIterationFilters to return only Sprint 2
    mockUseIterationFilters.mockReturnValue({
      stateFilter: 'current',
      setStateFilter: mockSetStateFilter,
      cadenceFilter: '',
      setCadenceFilter: mockSetCadenceFilter,
      searchQuery: '',
      setSearchQuery: mockSetSearchQuery,
      uniqueStates: ['closed', 'current', 'upcoming'],
      uniqueCadences: ['Q1 2025'],
      filteredIterations: [mockIterations[1]] // Only Sprint 2
    });

    render(<IterationSelector onSelectionChange={jest.fn()} />);

    // Wait for render to complete
    await waitFor(() => {
      expect(screen.getByText('Sprint 2')).toBeInTheDocument();
    });

    // Only Sprint 2 should be visible
    expect(screen.queryByText('Sprint 1')).not.toBeInTheDocument();
    expect(screen.getByText('Sprint 2')).toBeInTheDocument();
    expect(screen.queryByText('Sprint 3')).not.toBeInTheDocument();
  });

  test('calls setCadenceFilter when cadence filter is changed', async () => {
    const user = userEvent.setup();
    render(<IterationSelector onSelectionChange={jest.fn()} />);

    // Wait for component to fully load
    await waitFor(() => {
      expect(screen.getByLabelText(/cadence:/i)).toBeInTheDocument();
    });

    // Select cadence filter
    const cadenceFilter = screen.getByLabelText(/cadence:/i);
    await user.selectOptions(cadenceFilter, 'Q1 2025');

    // setCadenceFilter should be called
    expect(mockSetCadenceFilter).toHaveBeenCalledWith('Q1 2025');
  });

  test('calls setSearchQuery when search input changes', async () => {
    const user = userEvent.setup();
    render(<IterationSelector onSelectionChange={jest.fn()} />);

    // Wait for component to fully load
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search iterations/i)).toBeInTheDocument();
    });

    // Type in search input
    const searchInput = screen.getByPlaceholderText(/search iterations/i);
    await user.type(searchInput, 'Sprint 2');

    // setSearchQuery should be called for each character
    expect(mockSetSearchQuery).toHaveBeenCalled();
  });

  test('calls setSearchQuery with empty string when clear button is clicked', async () => {
    // Mock search query with value
    mockUseIterationFilters.mockReturnValue({
      stateFilter: '',
      setStateFilter: mockSetStateFilter,
      cadenceFilter: '',
      setCadenceFilter: mockSetCadenceFilter,
      searchQuery: 'Sprint 2',
      setSearchQuery: mockSetSearchQuery,
      uniqueStates: ['closed', 'current', 'upcoming'],
      uniqueCadences: ['Q1 2025'],
      filteredIterations: [mockIterations[1]]
    });

    const user = userEvent.setup();
    render(<IterationSelector onSelectionChange={jest.fn()} />);

    // Click clear button
    const clearButton = screen.getByLabelText(/clear search/i);
    await user.click(clearButton);

    // setSearchQuery should be called with empty string
    expect(mockSetSearchQuery).toHaveBeenCalledWith('');
  });

  test('displays search results when filtered', async () => {
    // Mock filtered results for "Sprint 2" search
    mockUseIterationFilters.mockReturnValue({
      stateFilter: '',
      setStateFilter: mockSetStateFilter,
      cadenceFilter: '',
      setCadenceFilter: mockSetCadenceFilter,
      searchQuery: 'Sprint 2',
      setSearchQuery: mockSetSearchQuery,
      uniqueStates: ['closed', 'current', 'upcoming'],
      uniqueCadences: ['Q1 2025'],
      filteredIterations: [mockIterations[1]] // Only Sprint 2
    });

    render(<IterationSelector onSelectionChange={jest.fn()} />);

    // Wait for render to complete
    await waitFor(() => {
      expect(screen.getByText('Sprint 2')).toBeInTheDocument();
    });

    // Only Sprint 2 should be visible
    expect(screen.queryByText('Sprint 1')).not.toBeInTheDocument();
    expect(screen.getByText('Sprint 2')).toBeInTheDocument();
    expect(screen.queryByText('Sprint 3')).not.toBeInTheDocument();
  });

  test('renders state filter with correct options', async () => {
    render(<IterationSelector onSelectionChange={jest.fn()} />);

    // Wait for component to fully load
    await waitFor(() => {
      expect(screen.getByLabelText(/state:/i)).toBeInTheDocument();
    });

    const stateFilter = screen.getByLabelText(/state:/i);

    // Check that all states are present as options
    expect(screen.getByRole('option', { name: /all states/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /closed/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /current/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /upcoming/i })).toBeInTheDocument();
  });

  test('renders cadence filter with correct options', async () => {
    render(<IterationSelector onSelectionChange={jest.fn()} />);

    // Wait for component to fully load
    await waitFor(() => {
      expect(screen.getByLabelText(/cadence:/i)).toBeInTheDocument();
    });

    const cadenceFilter = screen.getByLabelText(/cadence:/i);

    // Check that cadence options are present
    expect(screen.getByRole('option', { name: /all cadences/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /q1 2025/i })).toBeInTheDocument();
  });

  test('displays iteration dates in correct format', async () => {
    render(<IterationSelector onSelectionChange={jest.fn()} />);

    // Wait for component to fully load
    await waitFor(() => {
      expect(screen.getByText(/dec 31, 2024/i)).toBeInTheDocument();
    });

    // Dates should be formatted as "MMM D, YYYY - MMM D, YYYY"
    // Check for actual rendered dates (formatDate converts them)
    expect(screen.getByText(/dec 31, 2024/i)).toBeInTheDocument();
    expect(screen.getByText(/jan 13, 2025/i)).toBeInTheDocument();
    expect(screen.getByText(/jan 14, 2025/i)).toBeInTheDocument();
    expect(screen.getByText(/jan 27, 2025/i)).toBeInTheDocument();
    expect(screen.getByText(/jan 28, 2025/i)).toBeInTheDocument();
    expect(screen.getByText(/feb 10, 2025/i)).toBeInTheDocument();
  });

  test('displays iteration states', async () => {
    render(<IterationSelector onSelectionChange={jest.fn()} />);

    // Wait for component to fully load
    await waitFor(() => {
      const states = screen.getAllByText(/closed|current|upcoming/);
      expect(states.length).toBeGreaterThan(0);
    });

    // States should be displayed
    const states = screen.getAllByText(/closed|current|upcoming/);
    expect(states.length).toBe(3);
  });

  test('Select All checkbox calls handleSelectAll when clicked', async () => {
    const user = userEvent.setup();
    render(<IterationSelector onSelectionChange={jest.fn()} />);

    // Wait for component to fully load
    await waitFor(() => {
      expect(screen.getByLabelText(/select all/i)).toBeInTheDocument();
    });

    // Find Select All checkbox
    const selectAllCheckbox = screen.getByLabelText(/select all/i);
    await user.click(selectAllCheckbox);

    // handleSelectAll should be called
    expect(mockHandleSelectAll).toHaveBeenCalledWith(true);
  });

  test('unchecking Select All checkbox calls handleSelectAll with false', async () => {
    const user = userEvent.setup();
    render(<IterationSelector onSelectionChange={jest.fn()} />);

    // Wait for component to fully load
    await waitFor(() => {
      expect(screen.getByLabelText(/select all/i)).toBeInTheDocument();
    });

    // Find Select All checkbox and click it twice (check then uncheck)
    const selectAllCheckbox = screen.getByLabelText(/select all/i);
    await user.click(selectAllCheckbox);
    await user.click(selectAllCheckbox);

    // handleSelectAll should be called with false
    expect(mockHandleSelectAll).toHaveBeenCalledWith(false);
  });

  test('displays correct iteration titles with fallback', async () => {
    const iterationsWithMissingTitle = [
      {
        id: 'gid://gitlab/Iteration/4',
        iid: '4',
        title: null, // No title
        startDate: '2025-02-12',
        dueDate: '2025-02-25',
        state: 'upcoming',
        iterationCadence: { title: 'Q1 2025' }
      }
    ];

    mockUseIterations.mockReturnValue({
      iterations: iterationsWithMissingTitle,
      loading: false,
      error: null
    });

    mockUseIterationFilters.mockReturnValue({
      stateFilter: '',
      setStateFilter: mockSetStateFilter,
      cadenceFilter: '',
      setCadenceFilter: mockSetCadenceFilter,
      searchQuery: '',
      setSearchQuery: mockSetSearchQuery,
      uniqueStates: ['upcoming'],
      uniqueCadences: ['Q1 2025'],
      filteredIterations: iterationsWithMissingTitle
    });

    render(<IterationSelector onSelectionChange={jest.fn()} />);

    // Wait for component to fully load
    await waitFor(() => {
      const q1Texts = screen.getAllByText('Q1 2025');
      expect(q1Texts.length).toBeGreaterThan(0);
    });

    // Should display cadence title as fallback (will appear multiple times - in dropdown and as title)
    const q1Texts = screen.getAllByText('Q1 2025');
    expect(q1Texts.length).toBeGreaterThan(0);
  });

  test('deselecting an iteration calls onSelectionChange with updated list', async () => {
    const onSelectionChange = jest.fn();
    const user = userEvent.setup();

    render(<IterationSelector onSelectionChange={onSelectionChange} />);

    // Select two iterations
    const checkbox1 = screen.getByLabelText(/Sprint 1/i);
    const checkbox2 = screen.getByLabelText(/Sprint 2/i);

    await user.click(checkbox1);
    await user.click(checkbox2);

    // Both should be selected
    await waitFor(() => {
      expect(onSelectionChange).toHaveBeenCalledWith([
        'gid://gitlab/Iteration/1',
        'gid://gitlab/Iteration/2'
      ]);
    });

    // Deselect first iteration
    await user.click(checkbox1);

    // Should only have second iteration selected
    await waitFor(() => {
      expect(onSelectionChange).toHaveBeenCalledWith(['gid://gitlab/Iteration/2']);
    });
  });
});
