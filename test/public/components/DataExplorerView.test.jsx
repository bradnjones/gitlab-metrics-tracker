/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import DataExplorerView from '../../../src/public/components/DataExplorerView.jsx';

// Mock theme object
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
  borderRadius: { sm: '4px', md: '6px', lg: '8px', full: '9999px' },
  spacing: { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px' },
  typography: {
    fontSize: { xs: '12px', sm: '14px', base: '16px', lg: '18px', xl: '20px' },
    fontWeight: { normal: '400', medium: '500', semibold: '600', bold: '700' },
    lineHeight: { tight: '1.25', normal: '1.5', relaxed: '1.75' },
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  transitions: {
    fast: '0.15s',
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  shadows: { sm: '0 1px 3px rgba(0, 0, 0, 0.1)' },
  breakpoints: {
    mobile: '640px',
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

/**
 * Mock API response for velocity endpoint
 */
const mockVelocityResponse = {
  metrics: [
    {
      iterationId: 'gid://gitlab/Iteration/123',
      iterationTitle: 'Sprint 42',
      startDate: '2025-01-01',
      dueDate: '2025-01-14',
      totalPoints: 50,
      completedPoints: 42,
      rawData: {
        issues: [
          {
            id: 'gid://gitlab/Issue/1',
            title: 'Implement user authentication',
            webUrl: 'https://gitlab.example.com/project/-/issues/1',
            state: 'closed',
            weight: 5,
            createdAt: '2025-01-01T08:00:00Z',
            closedAt: '2025-01-05T16:30:00Z',
            assignees: {
              nodes: [
                { username: 'john.doe' },
                { username: 'jane.smith' }
              ]
            }
          },
          {
            id: 'gid://gitlab/Issue/2',
            title: 'Add data export feature',
            webUrl: 'https://gitlab.example.com/project/-/issues/2',
            state: 'opened',
            weight: 3,
            createdAt: '2025-01-06T09:00:00Z',
            closedAt: null,
            assignees: {
              nodes: [
                { username: 'alice.cooper' }
              ]
            }
          }
        ]
      }
    }
  ],
  count: 1
};

describe('DataExplorerView', () => {
  beforeEach(() => {
    // Clear all fetch mocks before each test
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Test 1: Drives the core structure - component must render 3 sections
  test('renders all three sections with empty states when no iterations selected', () => {
    renderWithTheme(
      <DataExplorerView selectedIterations={[]} />
    );

    // Should render 3 section headers with (0) counts
    expect(screen.getByText('Stories (0)')).toBeInTheDocument();
    expect(screen.getByText('Incidents (0)')).toBeInTheDocument();
    expect(screen.getByText('Merge Requests (0)')).toBeInTheDocument();

    // Should show empty states for all tables
    expect(screen.getByText('No stories found')).toBeInTheDocument();
    expect(screen.getByText('No incidents found')).toBeInTheDocument();
    expect(screen.getByText('No merge requests found')).toBeInTheDocument();
  });

  // Test 2: Drives data fetching and transformation logic for Stories table
  test('fetches and displays stories data when iterations are selected', async () => {
    // Mock fetch for velocity (Stories)
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockVelocityResponse
    });

    // Mock fetch for MTTR (Incidents) - empty
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ metrics: [], count: 0 })
    });

    // Mock fetch for Lead Time (Merge Requests) - empty
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ metrics: [], count: 0 })
    });

    const selectedIterations = [
      { id: 'gid://gitlab/Iteration/123', title: 'Sprint 42' }
    ];

    renderWithTheme(
      <DataExplorerView selectedIterations={selectedIterations} />
    );

    // Should show loading state initially
    expect(screen.getByText('Loading stories...')).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByText('Loading stories...')).not.toBeInTheDocument();
    });

    // Should render table headers (with sort indicators)
    expect(screen.getByText(/Title/)).toBeInTheDocument();
    expect(screen.getByText(/Points/)).toBeInTheDocument();
    // Use getByRole to specifically target the table header, not the filter chip
    expect(screen.getByRole('columnheader', { name: /Status/ })).toBeInTheDocument();
    expect(screen.getByText(/Cycle Time/)).toBeInTheDocument();
    expect(screen.getByText(/Assignees/)).toBeInTheDocument();

    // Should render story data
    expect(screen.getByText('Implement user authentication')).toBeInTheDocument();
    expect(screen.getByText('john.doe, jane.smith')).toBeInTheDocument();
    expect(screen.getByText('4.4 days')).toBeInTheDocument(); // Calculated cycle time

    // Should render second story
    expect(screen.getByText('Add data export feature')).toBeInTheDocument();
    expect(screen.getByText('alice.cooper')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument(); // Open issue

    // Should render status values (may appear in headers too, so use getAllByText)
    const closedElements = screen.getAllByText(/Closed/);
    expect(closedElements.length).toBeGreaterThan(0); // At least header + one row

    const openElements = screen.getAllByText(/Open/);
    expect(openElements.length).toBeGreaterThan(0); // At least header + one row

    // Should show count in section title
    expect(screen.getByText('Stories (2)')).toBeInTheDocument();

    // Verify fetch was called correctly
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/metrics/velocity?iterations=gid://gitlab/Iteration/123'
    );
  });

  // Test 3: Drives empty state handling when no iterations selected
  test('shows empty states for all tables when no iterations selected', () => {
    renderWithTheme(
      <DataExplorerView selectedIterations={[]} />
    );

    // Should show empty state messages for all tables
    expect(screen.getByText('No stories found')).toBeInTheDocument();
    expect(screen.getByText('No incidents found')).toBeInTheDocument();
    expect(screen.getByText('No merge requests found')).toBeInTheDocument();

    // Should NOT show table headers when no data
    expect(screen.queryByText('Title')).not.toBeInTheDocument();
    expect(screen.queryByText('Points')).not.toBeInTheDocument();
  });

  // Test 4: Drives accessibility implementation (ARIA labels on Stories table)
  test('renders accessibility attributes (ARIA label) on Stories table', async () => {
    // Mock fetch for velocity (Stories)
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockVelocityResponse
    });

    // Mock fetch for MTTR (Incidents) - empty
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ metrics: [], count: 0 })
    });

    // Mock fetch for Lead Time (Merge Requests) - empty
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ metrics: [], count: 0 })
    });

    const selectedIterations = [
      { id: 'gid://gitlab/Iteration/123', title: 'Sprint 42' }
    ];

    const { container } = renderWithTheme(
      <DataExplorerView selectedIterations={selectedIterations} />
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByText('Loading stories...')).not.toBeInTheDocument();
    });

    // Should have ARIA label on Stories table
    const tables = container.querySelectorAll('table');
    expect(tables).toHaveLength(1); // Only Stories table exists (others are "Coming Soon")

    expect(tables[0]).toHaveAttribute('aria-label', 'Stories data table');
  });

  // Test 5: Handles API errors gracefully
  test('handles fetch errors gracefully without crashing', async () => {
    // Mock all 3 fetches with errors
    global.fetch.mockRejectedValueOnce(new Error('Network error'));
    global.fetch.mockRejectedValueOnce(new Error('Network error'));
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    const selectedIterations = [
      { id: 'gid://gitlab/Iteration/123', title: 'Sprint 42' }
    ];

    renderWithTheme(
      <DataExplorerView selectedIterations={selectedIterations} />
    );

    // Should show loading states initially
    expect(screen.getByText('Loading stories...')).toBeInTheDocument();
    expect(screen.getByText('Loading incidents...')).toBeInTheDocument();
    expect(screen.getByText('Loading merge requests...')).toBeInTheDocument();

    // Wait for error handling
    await waitFor(() => {
      expect(screen.queryByText('Loading stories...')).not.toBeInTheDocument();
      expect(screen.queryByText('Loading incidents...')).not.toBeInTheDocument();
      expect(screen.queryByText('Loading merge requests...')).not.toBeInTheDocument();
    });

    // Should show empty states (graceful degradation)
    expect(screen.getByText('No stories found')).toBeInTheDocument();
    expect(screen.getByText('No incidents found')).toBeInTheDocument();
    expect(screen.getByText('No merge requests found')).toBeInTheDocument();
  });

  // Test 6: Fetches and displays incidents data
  test('fetches and displays incidents data when iterations are selected', async () => {
    const mockMttrResponse = {
      metrics: [
        {
          iterationId: 'gid://gitlab/Iteration/123',
          iterationTitle: 'Sprint 42',
          startDate: '2025-01-01',
          dueDate: '2025-01-14',
          mttrAvg: 12.5,
          incidentCount: 2,
          rawData: {
            incidents: [
              {
                id: 'gid://gitlab/Issue/500',
                title: 'Production database outage',
                webUrl: 'https://gitlab.example.com/project/-/issues/500',
                state: 'closed',
                createdAt: '2025-01-03T14:00:00Z',
                closedAt: '2025-01-03T20:30:00Z',
                labels: {
                  nodes: [
                    { title: 'severity::critical' },
                    { title: 'type::incident' }
                  ]
                }
              },
              {
                id: 'gid://gitlab/Issue/501',
                title: 'API rate limiting issue',
                webUrl: 'https://gitlab.example.com/project/-/issues/501',
                state: 'closed',
                createdAt: '2025-01-05T09:00:00Z',
                closedAt: '2025-01-05T15:00:00Z',
                labels: {
                  nodes: [
                    { title: 'severity::high' },
                    { title: 'type::incident' }
                  ]
                }
              }
            ]
          }
        }
      ],
      count: 1
    };

    // Mock fetch for velocity (Stories) - empty response
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ metrics: [], count: 0 })
    });

    // Mock fetch for MTTR (Incidents)
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockMttrResponse
    });

    const selectedIterations = [
      { id: 'gid://gitlab/Iteration/123', title: 'Sprint 42' }
    ];

    renderWithTheme(
      <DataExplorerView selectedIterations={selectedIterations} />
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByText('Loading incidents...')).not.toBeInTheDocument();
    });

    // Should render Incidents section with count
    expect(screen.getByText('Incidents (2)')).toBeInTheDocument();

    // Should render incident data
    expect(screen.getByText('Production database outage')).toBeInTheDocument();
    expect(screen.getByText('API rate limiting issue')).toBeInTheDocument();

    // Both incidents happen to have same duration (7.2 hrs) after rounding
    const durationElements = screen.getAllByText('7.2 hrs');
    expect(durationElements).toHaveLength(2); // Both incidents have 7.2 hrs duration

    // Should render severity values (may appear in headers too, so use getAllByText)
    const criticalElements = screen.getAllByText('Critical');
    expect(criticalElements.length).toBeGreaterThan(0); // At least one Critical severity

    const highElements = screen.getAllByText('High');
    expect(highElements.length).toBeGreaterThan(0); // At least one High severity
  });

  // Test 7: Fetches and displays merge requests data
  test('fetches and displays merge requests data when iterations are selected', async () => {
    const mockLeadTimeResponse = {
      metrics: [
        {
          iterationId: 'gid://gitlab/Iteration/123',
          iterationTitle: 'Sprint 42',
          startDate: '2025-01-01',
          dueDate: '2025-01-14',
          leadTimeAvg: 2.3,
          rawData: {
            mergeRequests: [
              {
                id: 'gid://gitlab/MergeRequest/100',
                title: 'Add user authentication',
                webUrl: 'https://gitlab.example.com/project/-/merge_requests/100',
                state: 'merged',
                mergedAt: '2025-01-08T16:00:00Z',
                author: {
                  username: 'john.doe',
                  name: 'John Doe'
                },
                commits: {
                  nodes: [
                    {
                      id: 'commit1',
                      sha: 'abc123',
                      committedDate: '2025-01-06T10:00:00Z'
                    },
                    {
                      id: 'commit2',
                      sha: 'def456',
                      committedDate: '2025-01-07T14:00:00Z'
                    }
                  ]
                }
              },
              {
                id: 'gid://gitlab/MergeRequest/101',
                title: 'Fix security vulnerability',
                webUrl: 'https://gitlab.example.com/project/-/merge_requests/101',
                state: 'merged',
                mergedAt: '2025-01-10T11:00:00Z',
                author: {
                  username: 'jane.smith',
                  name: 'Jane Smith'
                },
                commits: {
                  nodes: [
                    {
                      id: 'commit3',
                      sha: 'ghi789',
                      committedDate: '2025-01-09T09:00:00Z'
                    }
                  ]
                }
              }
            ]
          }
        }
      ],
      count: 1
    };

    // Mock fetch for velocity (Stories) - empty
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ metrics: [], count: 0 })
    });

    // Mock fetch for MTTR (Incidents) - empty
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ metrics: [], count: 0 })
    });

    // Mock fetch for Lead Time (Merge Requests)
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockLeadTimeResponse
    });

    const selectedIterations = [
      { id: 'gid://gitlab/Iteration/123', title: 'Sprint 42' }
    ];

    renderWithTheme(
      <DataExplorerView selectedIterations={selectedIterations} />
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByText('Loading merge requests...')).not.toBeInTheDocument();
    });

    // Should render Merge Requests section with count
    expect(screen.getByText('Merge Requests (2)')).toBeInTheDocument();

    // Should render merge request data
    expect(screen.getByText('Add user authentication')).toBeInTheDocument();
    expect(screen.getByText('john.doe')).toBeInTheDocument();
    expect(screen.getByText('2.3 days')).toBeInTheDocument(); // Lead time: Jan 6 10:00 -> Jan 8 16:00 = 2.25 days ~= 2.3

    expect(screen.getByText('Fix security vulnerability')).toBeInTheDocument();
    expect(screen.getByText('jane.smith')).toBeInTheDocument();
    expect(screen.getByText('1.1 days')).toBeInTheDocument(); // Lead time: Jan 9 09:00 -> Jan 10 11:00 = 1.08 days ~= 1.1 days
  });


  // Test 8: Shows empty states for all tables when no data
  test('shows empty states for all new tables when no data', async () => {
    // Mock all endpoints with empty responses
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ metrics: [], count: 0 })
    });

    const selectedIterations = [
      { id: 'gid://gitlab/Iteration/123', title: 'Sprint 42' }
    ];

    renderWithTheme(
      <DataExplorerView selectedIterations={selectedIterations} />
    );

    // Wait for all data to load
    await waitFor(() => {
      expect(screen.queryByText('Loading stories...')).not.toBeInTheDocument();
      expect(screen.queryByText('Loading incidents...')).not.toBeInTheDocument();
      expect(screen.queryByText('Loading merge requests...')).not.toBeInTheDocument();
    });

    // Should show empty states for all tables
    expect(screen.getByText('No stories found')).toBeInTheDocument();
    expect(screen.getByText('No incidents found')).toBeInTheDocument();
    expect(screen.getByText('No merge requests found')).toBeInTheDocument();

    // Should show counts of 0
    expect(screen.getByText('Stories (0)')).toBeInTheDocument();
    expect(screen.getByText('Incidents (0)')).toBeInTheDocument();
    expect(screen.getByText('Merge Requests (0)')).toBeInTheDocument();
  });

  // Test 9: Renders accessibility attributes on all tables
  test('renders accessibility attributes (ARIA labels) on all tables', async () => {
    const mockResponses = {
      velocity: {
        metrics: [{
          iterationId: 'gid://gitlab/Iteration/123',
          iterationTitle: 'Sprint 42',
          startDate: '2025-01-01',
          dueDate: '2025-01-14',
          rawData: {
            issues: [{
              id: 'gid://gitlab/Issue/1',
              title: 'Test issue',
              webUrl: 'https://gitlab.example.com/project/-/issues/1',
              state: 'closed',
              weight: 3,
              createdAt: '2025-01-01T08:00:00Z',
              closedAt: '2025-01-05T16:00:00Z',
              assignees: { nodes: [] }
            }]
          }
        }],
        count: 1
      },
      mttr: {
        metrics: [{
          iterationId: 'gid://gitlab/Iteration/123',
          rawData: {
            incidents: [{
              id: 'gid://gitlab/Issue/500',
              title: 'Test incident',
              webUrl: 'https://gitlab.example.com/project/-/issues/500',
              state: 'closed',
              createdAt: '2025-01-03T14:00:00Z',
              closedAt: '2025-01-03T20:00:00Z',
              labels: { nodes: [{ title: 'severity::high' }] }
            }]
          }
        }],
        count: 1
      },
      leadTime: {
        metrics: [{
          iterationId: 'gid://gitlab/Iteration/123',
          rawData: {
            mergeRequests: [{
              id: 'gid://gitlab/MergeRequest/100',
              title: 'Test MR',
              webUrl: 'https://gitlab.example.com/project/-/merge_requests/100',
              state: 'merged',
              mergedAt: '2025-01-08T16:00:00Z',
              author: { username: 'testuser' },
              commits: { nodes: [{ committedDate: '2025-01-07T10:00:00Z' }] }
            }]
          }
        }],
        count: 1
      }
    };

    // Mock all 3 fetch calls
    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockResponses.velocity })
      .mockResolvedValueOnce({ ok: true, json: async () => mockResponses.mttr })
      .mockResolvedValueOnce({ ok: true, json: async () => mockResponses.leadTime });

    const selectedIterations = [
      { id: 'gid://gitlab/Iteration/123', title: 'Sprint 42' }
    ];

    const { container } = renderWithTheme(
      <DataExplorerView selectedIterations={selectedIterations} />
    );

    // Wait for all data to load
    await waitFor(() => {
      expect(screen.queryByText('Loading stories...')).not.toBeInTheDocument();
      expect(screen.queryByText('Loading incidents...')).not.toBeInTheDocument();
      expect(screen.queryByText('Loading merge requests...')).not.toBeInTheDocument();
    });

    // Should have ARIA labels on all 3 tables
    const tables = container.querySelectorAll('table');
    expect(tables).toHaveLength(3);

    expect(tables[0]).toHaveAttribute('aria-label', 'Stories data table');
    expect(tables[1]).toHaveAttribute('aria-label', 'Incidents data table');
    expect(tables[2]).toHaveAttribute('aria-label', 'Merge Requests data table');
  });
});
