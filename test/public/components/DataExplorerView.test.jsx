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
            state: 'closed',
            weight: 5,
            createdAt: '2025-01-01T08:00:00Z',
            closedAt: '2025-01-05T16:30:00Z',
            assignees: [
              { username: 'john.doe' },
              { username: 'jane.smith' }
            ]
          },
          {
            id: 'gid://gitlab/Issue/2',
            title: 'Add data export feature',
            state: 'opened',
            weight: 3,
            createdAt: '2025-01-06T09:00:00Z',
            closedAt: null,
            assignees: [
              { username: 'alice.cooper' }
            ]
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

  // Test 1: Drives the core structure - component must render 4 sections
  test('renders all four sections (Stories table + Coming Soon for others)', () => {
    renderWithTheme(
      <DataExplorerView selectedIterations={[]} />
    );

    // Should render 4 section headers
    expect(screen.getByText(/Stories/)).toBeInTheDocument();
    expect(screen.getByText('Incidents')).toBeInTheDocument();
    expect(screen.getByText('Merge Requests')).toBeInTheDocument();
    expect(screen.getByText('Deployments')).toBeInTheDocument();

    // Should show "Coming Soon" for Incidents, MRs, Deployments
    expect(screen.getByText(/Coming soon - Backend needs to expose incident raw data/)).toBeInTheDocument();
    expect(screen.getByText(/Coming soon - Backend needs to expose merge request raw data/)).toBeInTheDocument();
    expect(screen.getByText(/Coming soon - Backend needs to expose deployment\/pipeline raw data/)).toBeInTheDocument();
  });

  // Test 2: Drives data fetching and transformation logic for Stories table
  test('fetches and displays stories data when iterations are selected', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockVelocityResponse
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

    // Should render table headers
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Points')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Cycle Time')).toBeInTheDocument();
    expect(screen.getByText('Assignees')).toBeInTheDocument();

    // Should render story data
    expect(screen.getByText('Implement user authentication')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Closed')).toBeInTheDocument();
    expect(screen.getByText('4.4 days')).toBeInTheDocument(); // Calculated cycle time
    expect(screen.getByText('john.doe, jane.smith')).toBeInTheDocument();

    // Should render second story
    expect(screen.getByText('Add data export feature')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument(); // Open issue
    expect(screen.getByText('alice.cooper')).toBeInTheDocument();

    // Should show count in section title
    expect(screen.getByText('Stories (2)')).toBeInTheDocument();

    // Verify fetch was called correctly
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/metrics/velocity?iterations=gid://gitlab/Iteration/123'
    );
  });

  // Test 3: Drives empty state handling when no iterations selected
  test('shows empty state for Stories when no iterations selected', () => {
    renderWithTheme(
      <DataExplorerView selectedIterations={[]} />
    );

    // Should show empty state message for Stories
    expect(screen.getByText('No stories found')).toBeInTheDocument();

    // Should NOT show table headers when no data
    expect(screen.queryByText('Title')).not.toBeInTheDocument();
    expect(screen.queryByText('Points')).not.toBeInTheDocument();

    // Should show "Coming Soon" for other sections
    expect(screen.getByText(/Coming soon - Backend needs to expose incident raw data/)).toBeInTheDocument();
    expect(screen.getByText(/Coming soon - Backend needs to expose merge request raw data/)).toBeInTheDocument();
    expect(screen.getByText(/Coming soon - Backend needs to expose deployment\/pipeline raw data/)).toBeInTheDocument();
  });

  // Test 4: Drives accessibility implementation (ARIA labels on Stories table)
  test('renders accessibility attributes (ARIA label) on Stories table', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockVelocityResponse
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
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    const selectedIterations = [
      { id: 'gid://gitlab/Iteration/123', title: 'Sprint 42' }
    ];

    renderWithTheme(
      <DataExplorerView selectedIterations={selectedIterations} />
    );

    // Should show loading state initially
    expect(screen.getByText('Loading stories...')).toBeInTheDocument();

    // Wait for error handling
    await waitFor(() => {
      expect(screen.queryByText('Loading stories...')).not.toBeInTheDocument();
    });

    // Should show empty state (graceful degradation)
    expect(screen.getByText('No stories found')).toBeInTheDocument();
  });
});
