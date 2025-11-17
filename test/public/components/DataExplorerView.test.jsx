/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
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
  borderRadius: { sm: '4px', md: '6px', lg: '8px' },
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

describe('DataExplorerView', () => {
  // Test 1: Drives the core structure - component must render 4 sections with titles
  test('renders all four table sections with correct headers', () => {
    renderWithTheme(
      <DataExplorerView
        selectedIterations={[]}
        storiesData={[]}
        incidentsData={[]}
        mergeRequestsData={[]}
        deploymentsData={[]}
      />
    );

    // Should render 4 section headers
    expect(screen.getByText('Stories')).toBeInTheDocument();
    expect(screen.getByText('Incidents')).toBeInTheDocument();
    expect(screen.getByText('Merge Requests')).toBeInTheDocument();
    expect(screen.getByText('Deployments')).toBeInTheDocument();
  });

  // Test 2: Drives data rendering logic for Stories table
  test('displays stories data in table with all required columns', () => {
    const mockStoriesData = [
      {
        id: 'story-1',
        title: 'Implement user authentication',
        points: 5,
        status: 'closed',
        cycleTime: 3.5,
        assignees: ['John Doe', 'Jane Smith']
      },
      {
        id: 'story-2',
        title: 'Add data export feature',
        points: 3,
        status: 'open',
        cycleTime: 1.2,
        assignees: ['Alice Cooper']
      }
    ];

    renderWithTheme(
      <DataExplorerView
        selectedIterations={[]}
        storiesData={mockStoriesData}
        incidentsData={[]}
        mergeRequestsData={[]}
        deploymentsData={[]}
      />
    );

    // Should render table headers
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Points')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Cycle Time')).toBeInTheDocument();
    expect(screen.getByText('Assignees')).toBeInTheDocument();

    // Should render story data
    expect(screen.getByText('Implement user authentication')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('closed')).toBeInTheDocument();
    expect(screen.getByText('3.5 days')).toBeInTheDocument();
    expect(screen.getByText('John Doe, Jane Smith')).toBeInTheDocument();

    expect(screen.getByText('Add data export feature')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('open')).toBeInTheDocument();
    expect(screen.getByText('1.2 days')).toBeInTheDocument();
    expect(screen.getByText('Alice Cooper')).toBeInTheDocument();
  });

  // Test 3: Drives empty state handling across all sections
  test('shows empty state for each section when no data provided', () => {
    renderWithTheme(
      <DataExplorerView
        selectedIterations={[]}
        storiesData={[]}
        incidentsData={[]}
        mergeRequestsData={[]}
        deploymentsData={[]}
      />
    );

    // Should show empty state messages for all sections
    expect(screen.getByText('No stories found')).toBeInTheDocument();
    expect(screen.getByText('No incidents recorded')).toBeInTheDocument();
    expect(screen.getByText('No merge requests found')).toBeInTheDocument();
    expect(screen.getByText('No deployments found')).toBeInTheDocument();

    // Should NOT show table headers when no data
    expect(screen.queryByText('Title')).not.toBeInTheDocument();
    expect(screen.queryByText('Points')).not.toBeInTheDocument();
    expect(screen.queryByText('Severity')).not.toBeInTheDocument();
    expect(screen.queryByText('Author')).not.toBeInTheDocument();
  });

  // Test 4: Drives accessibility implementation (ARIA labels)
  test('renders accessibility attributes (ARIA labels) on all tables', () => {
    const mockStoriesData = [
      { id: 'story-1', title: 'Story 1', points: 5, status: 'closed', cycleTime: 3.5, assignees: ['John'] }
    ];
    const mockIncidentsData = [
      { id: 'incident-1', title: 'Incident 1', severity: 'high', duration: 2.5, resolvedDate: '2025-01-15' }
    ];
    const mockMRData = [
      { id: 'mr-1', title: 'MR 1', author: 'Alice', mergedDate: '2025-01-14' }
    ];
    const mockDeploymentsData = [
      { id: 'deploy-1', environment: 'production', deployedDate: '2025-01-16', status: 'success' }
    ];

    const { container } = renderWithTheme(
      <DataExplorerView
        selectedIterations={[]}
        storiesData={mockStoriesData}
        incidentsData={mockIncidentsData}
        mergeRequestsData={mockMRData}
        deploymentsData={mockDeploymentsData}
      />
    );

    // Should have ARIA labels on all tables
    const tables = container.querySelectorAll('table');
    expect(tables).toHaveLength(4);

    expect(tables[0]).toHaveAttribute('aria-label', 'Stories data table');
    expect(tables[1]).toHaveAttribute('aria-label', 'Incidents data table');
    expect(tables[2]).toHaveAttribute('aria-label', 'Merge requests data table');
    expect(tables[3]).toHaveAttribute('aria-label', 'Deployments data table');
  });
});
