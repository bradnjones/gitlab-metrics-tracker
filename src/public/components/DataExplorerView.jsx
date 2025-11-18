import { useState, useEffect } from 'react';
import styled from 'styled-components';

/* ===== STYLED COMPONENTS ===== */

/**
 * Main container for DataExplorerView
 * Applies page-level padding and spacing
 *
 * @component
 */
const ExplorerContainer = styled.div`
  padding: ${props => props.theme.spacing.lg};
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.xl};

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.md};
    gap: ${props => props.theme.spacing.lg};
  }
`;

/**
 * Section container for each table
 *
 * @component
 */
const TableSection = styled.section`
  display: flex;
  flex-direction: column;
`;

/**
 * Section title
 *
 * @component
 */
const SectionTitle = styled.h2`
  font-size: ${props => props.theme.typography.fontSize.xl};
  font-weight: ${props => props.theme.typography.fontWeight.semibold};
  color: ${props => props.theme.colors.textPrimary};
  margin-bottom: ${props => props.theme.spacing.sm};
  line-height: ${props => props.theme.typography.lineHeight.tight};
`;

/**
 * Styled table - compact for maximum data density
 *
 * @component
 */
const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: ${props => props.theme.typography.fontSize.xs};
  min-width: 600px;

  @media (min-width: ${props => props.theme.breakpoints.tablet}) {
    min-width: 100%;
  }
`;

/**
 * Table header
 *
 * @component
 */
const TableHeader = styled.thead`
  background: ${props => props.theme.colors.bgTertiary};
  border-bottom: 2px solid ${props => props.theme.colors.border};
`;

/**
 * Table header cell - clickable for sorting
 *
 * @component
 */
const TableHeaderCell = styled.th`
  padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.sm};
  text-align: left;
  font-size: ${props => props.theme.typography.fontSize.xs};
  font-weight: ${props => props.theme.typography.fontWeight.semibold};
  color: ${props => props.theme.colors.textPrimary};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
  transition: background-color ${props => props.theme.transitions.fast};

  &:hover {
    background-color: ${props => props.theme.colors.bgSecondary};
  }

  &:first-child {
    padding-left: ${props => props.theme.spacing.md};
  }

  &:last-child {
    padding-right: ${props => props.theme.spacing.md};
  }
`;

/**
 * Table body
 *
 * @component
 */
const TableBody = styled.tbody`
  background: ${props => props.theme.colors.bgPrimary};
`;

/**
 * Table row
 *
 * @component
 */
const TableRow = styled.tr`
  border-bottom: 1px solid ${props => props.theme.colors.border};
  transition: background-color ${props => props.theme.transitions.fast};

  &:hover {
    background-color: ${props => props.theme.colors.bgTertiary};
  }

  &:last-child {
    border-bottom: none;
  }
`;

/**
 * Table cell
 *
 * @component
 */
const TableCell = styled.td`
  padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.sm};
  font-size: ${props => props.theme.typography.fontSize.xs};
  font-weight: ${props => props.theme.typography.fontWeight.normal};
  color: ${props => props.theme.colors.textSecondary};
  line-height: ${props => props.theme.typography.lineHeight.tight};

  &:first-child {
    padding-left: ${props => props.theme.spacing.md};
    color: ${props => props.theme.colors.textPrimary};
    font-weight: ${props => props.theme.typography.fontWeight.medium};
  }

  &:last-child {
    padding-right: ${props => props.theme.spacing.md};
  }

  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

/**
 * Link styled for table cells
 *
 * @component
 */
const TableLink = styled.a`
  color: ${props => props.theme.colors.primary};
  text-decoration: none;
  font-weight: ${props => props.theme.typography.fontWeight.medium};

  &:hover {
    text-decoration: underline;
    color: ${props => props.theme.colors.primaryDark};
  }

  &:visited {
    color: ${props => props.theme.colors.primary};
  }
`;

/**
 * Empty state container
 *
 * @component
 */
const EmptyState = styled.div`
  padding: ${props => props.theme.spacing.xl};
  text-align: center;
  color: ${props => props.theme.colors.textSecondary};
  font-size: ${props => props.theme.typography.fontSize.sm};
  line-height: ${props => props.theme.typography.lineHeight.relaxed};
`;

/**
 * Empty state message
 *
 * @component
 */
const EmptyStateMessage = styled.p`
  font-size: ${props => props.theme.typography.fontSize.base};
  font-weight: ${props => props.theme.typography.fontWeight.medium};
  color: ${props => props.theme.colors.textPrimary};
  margin: 0;
`;

/**
 * Loading spinner container
 *
 * @component
 */
const LoadingContainer = styled.div`
  padding: ${props => props.theme.spacing.xl};
  text-align: center;
  color: ${props => props.theme.colors.textSecondary};
`;

/**
 * Coming soon message
 *
 * @component
 */
const ComingSoonMessage = styled.div`
  padding: ${props => props.theme.spacing.xl};
  text-align: center;
  color: ${props => props.theme.colors.textSecondary};
  font-size: ${props => props.theme.typography.fontSize.base};
  font-style: italic;
`;

/**
 * Summary card for displaying statistics
 *
 * @component
 */
const SummaryCard = styled.div`
  background: ${props => props.theme.colors.bgSecondary};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.md};
  padding: ${props => props.theme.spacing.md};
  margin-bottom: ${props => props.theme.spacing.md};
  display: flex;
  flex-wrap: wrap;
  gap: ${props => props.theme.spacing.lg};
`;

/**
 * Summary statistic item
 *
 * @component
 */
const SummaryStat = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.xs};
`;

/**
 * Summary stat label
 *
 * @component
 */
const SummaryLabel = styled.div`
  font-size: ${props => props.theme.typography.fontSize.xs};
  font-weight: ${props => props.theme.typography.fontWeight.medium};
  color: ${props => props.theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

/**
 * Summary stat value
 *
 * @component
 */
const SummaryValue = styled.div`
  font-size: ${props => props.theme.typography.fontSize.xl};
  font-weight: ${props => props.theme.typography.fontWeight.semibold};
  color: ${props => props.theme.colors.textPrimary};
`;

/**
 * Warning indicator for missing data
 *
 * @component
 */
const WarningIndicator = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${props => props.theme.spacing.xs};
  color: ${props => props.theme.colors.warning};
  font-weight: ${props => props.theme.typography.fontWeight.medium};
`;

/**
 * Warning icon
 *
 * @component
 */
const WarningIcon = styled.span`
  font-size: ${props => props.theme.typography.fontSize.sm};
`;

/**
 * Info badge for additional metadata
 *
 * @component
 */
const InfoBadge = styled.span`
  display: inline-block;
  padding: 2px 6px;
  background: ${props => props.theme.colors.bgTertiary};
  color: ${props => props.theme.colors.textSecondary};
  font-size: ${props => props.theme.typography.fontSize.xxs || '10px'};
  border-radius: ${props => props.theme.borderRadius.sm};
  margin-left: ${props => props.theme.spacing.xs};
  font-weight: ${props => props.theme.typography.fontWeight.medium};
`;

/**
 * Container for date with raw timestamp
 *
 * @component
 */
const DateWithTimestamp = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

/**
 * Raw timestamp display (small, subtle)
 *
 * @component
 */
const RawTimestamp = styled.div`
  font-size: ${props => props.theme.typography.fontSize.xxs || '10px'};
  color: ${props => props.theme.colors.textSecondary};
  font-family: monospace;
  opacity: 0.7;
`;

/* ===== HELPER FUNCTIONS ===== */

/**
 * Calculate cycle time in days from created to closed dates
 *
 * @param {string} createdAt - ISO date string when issue was created
 * @param {string|null} closedAt - ISO date string when issue was closed (null if open)
 * @returns {number|null} Cycle time in days (rounded to 1 decimal) or null if not closed
 */
const calculateCycleTime = (createdAt, closedAt) => {
  if (!closedAt) return null;

  const created = new Date(createdAt);
  const closed = new Date(closedAt);
  const diffMs = closed - created;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  return Math.round(diffDays * 10) / 10; // Round to 1 decimal
};

/**
 * Format date for display (date only, no time)
 *
 * @param {string|null} isoDate - ISO date string
 * @returns {string} Formatted date (MM/DD/YYYY) or '-'
 */
const formatDate = (isoDate) => {
  if (!isoDate) return '-';
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric'
  });
};

/**
 * Transform GitLab issue to Story table format
 *
 * @param {Object} issue - GitLab issue object from rawData
 * @param {string} iterationTitle - Title of the iteration
 * @returns {Object} Transformed story object for table display
 */
const transformIssueToStory = (issue, iterationTitle) => {
  // Calculate cycle time from inProgressAt to closedAt (or createdAt if no inProgressAt)
  const startDate = issue.inProgressAt || issue.createdAt;
  const cycleTime = issue.closedAt
    ? calculateCycleTime(startDate, issue.closedAt)
    : null;

  // Extract assignees from GraphQL nodes structure
  const assignees = issue.assignees?.nodes || [];
  const assigneeNames = assignees.length > 0
    ? assignees.map(a => a.username).join(', ')
    : 'Unassigned';

  // Check if there are more notes beyond the first batch (20 notes)
  const hasMoreNotes = issue.notes?.pageInfo?.hasNextPage || false;

  // Count how many notes were fetched
  const noteCount = issue.notes?.nodes?.length || 0;

  return {
    id: issue.id,
    title: issue.title,
    webUrl: issue.webUrl,
    points: issue.weight || 1,
    status: issue.state === 'closed' ? 'Closed' : 'Open',
    startedAt: formatDate(issue.inProgressAt),
    startedAtRaw: issue.inProgressAt, // Raw ISO timestamp for verification
    startedAtSource: issue.inProgressAtSource || 'status_change', // 'created' or 'status_change'
    closedAt: formatDate(issue.closedAt),
    cycleTime: cycleTime !== null ? cycleTime : null,
    assignees: assigneeNames,
    // Metadata for investigation
    missingInProgress: !issue.inProgressAt,
    hasMoreNotes: hasMoreNotes,
    noteCount: noteCount
  };
};

/**
 * Extract severity from incident labels
 *
 * @param {Array<Object>} labels - GitLab label objects from incident
 * @returns {string} Severity level ('Critical', 'High', 'Medium', 'Low', or 'Unknown')
 */
const extractSeverity = (labels) => {
  if (!labels || !labels.nodes || labels.nodes.length === 0) {
    return 'Unknown';
  }

  // Look for severity::* labels (GitLab pattern)
  const severityLabel = labels.nodes.find(label =>
    label.title && label.title.toLowerCase().startsWith('severity::')
  );

  if (!severityLabel) return 'Unknown';

  // Extract severity value (e.g., "severity::high" -> "High")
  const severity = severityLabel.title.split('::')[1];
  return severity ? severity.charAt(0).toUpperCase() + severity.slice(1) : 'Unknown';
};

/**
 * Transform GitLab incident to Incident table format
 *
 * @param {Object} incident - GitLab incident object from rawData
 * @returns {Object} Transformed incident object for table display
 */
const transformIncident = (incident) => {
  // Calculate duration from created to closed (or null if still open)
  const duration = incident.closedAt
    ? calculateCycleTime(incident.createdAt, incident.closedAt) * 24 // Convert days to hours
    : null;

  // Extract severity from labels
  const severity = extractSeverity(incident.labels);

  return {
    id: incident.id,
    title: incident.title,
    webUrl: incident.webUrl,
    severity,
    startTime: formatDate(incident.createdAt),
    duration: duration !== null ? duration : null,
    resolvedAt: formatDate(incident.closedAt)
  };
};

/**
 * Calculate lead time in days from first commit to merge
 *
 * @param {Array<Object>} commits - Commit objects with committedDate
 * @param {string} mergedAt - ISO date string when MR was merged
 * @returns {number|null} Lead time in days or null if no commits
 */
const calculateLeadTime = (commits, mergedAt) => {
  if (!commits || !commits.nodes || commits.nodes.length === 0 || !mergedAt) {
    return null;
  }

  // Find earliest commit
  const earliestCommit = commits.nodes.reduce((earliest, commit) => {
    const commitDate = new Date(commit.committedDate);
    return commitDate < earliest ? commitDate : earliest;
  }, new Date(commits.nodes[0].committedDate));

  const merged = new Date(mergedAt);
  const diffMs = merged - earliestCommit;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  return Math.round(diffDays * 10) / 10; // Round to 1 decimal
};

/**
 * Transform GitLab merge request to MR table format
 *
 * @param {Object} mergeRequest - GitLab MR object from rawData
 * @returns {Object} Transformed MR object for table display
 */
const transformMergeRequest = (mergeRequest) => {
  // Calculate lead time from first commit to merge
  const leadTime = mergeRequest.state === 'merged'
    ? calculateLeadTime(mergeRequest.commits, mergeRequest.mergedAt)
    : null;

  // Extract author username
  const author = mergeRequest.author?.username || 'Unknown';

  return {
    id: mergeRequest.id,
    title: mergeRequest.title,
    webUrl: mergeRequest.webUrl,
    author,
    mergedAt: formatDate(mergeRequest.mergedAt),
    leadTime: leadTime !== null ? leadTime : null
  };
};

/* ===== COMPONENT ===== */

/**
 * DataExplorerView Component
 *
 * Displays raw data tables for Stories, Incidents, and Merge Requests
 * from selected sprint iterations.
 *
 * Tables:
 * - Stories: Fetched from /api/metrics/velocity
 * - Incidents: Fetched from /api/metrics/mttr
 * - Merge Requests: Fetched from /api/metrics/lead-time
 *
 * @param {Object} props
 * @param {Array} props.selectedIterations - Selected sprint iterations [{id, title, ...}]
 * @returns {JSX.Element}
 */
export default function DataExplorerView({ selectedIterations }) {
  // Stories state
  const [storiesData, setStoriesData] = useState([]);
  const [loadingStories, setLoadingStories] = useState(false);

  // Incidents state
  const [incidentsData, setIncidentsData] = useState([]);
  const [loadingIncidents, setLoadingIncidents] = useState(false);

  // Merge Requests state
  const [mergeRequestsData, setMergeRequestsData] = useState([]);
  const [loadingMergeRequests, setLoadingMergeRequests] = useState(false);

  // Sorting state (shared across all tables)
  const [sortColumn, setSortColumn] = useState('title'); // Default sort by title
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' or 'desc'

  /**
   * Handle column header click to sort data
   *
   * @param {string} column - Column name to sort by
   */
  const handleSort = (column) => {
    if (sortColumn === column) {
      // Toggle direction if clicking same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to ascending
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  /**
   * Sort stories data based on current sort column and direction
   *
   * @param {Array} data - Stories data to sort
   * @returns {Array} Sorted stories data
   */
  const sortedData = (data) => {
    if (!data || data.length === 0) return data;

    return [...data].sort((a, b) => {
      let aVal = a[sortColumn];
      let bVal = b[sortColumn];

      // Handle null/undefined values
      if (aVal === null || aVal === undefined || aVal === '-') aVal = '';
      if (bVal === null || bVal === undefined || bVal === '-') bVal = '';

      // String comparison (case-insensitive)
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      // Compare values
      let comparison = 0;
      if (aVal < bVal) comparison = -1;
      if (aVal > bVal) comparison = 1;

      // Apply sort direction
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };

  /**
   * Fetch stories data from velocity endpoint when iterations change
   */
  useEffect(() => {
    // Clear old data immediately
    setStoriesData([]);

    // Don't fetch if no iterations selected
    if (!selectedIterations || selectedIterations.length === 0) {
      return;
    }

    const fetchStories = async () => {
      try {
        setLoadingStories(true);

        const iterationIds = selectedIterations.map(iter => iter.id);
        const iterationsParam = iterationIds.join(',');

        const response = await fetch(`/api/metrics/velocity?iterations=${iterationsParam}`);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // Extract and transform stories from raw data
        // Use a Map to deduplicate stories by ID (same story can appear in multiple iterations)
        const storiesMap = new Map();
        data.metrics.forEach(metric => {
          if (metric.rawData && metric.rawData.issues) {
            metric.rawData.issues.forEach(issue => {
              if (!storiesMap.has(issue.id)) {
                storiesMap.set(issue.id, transformIssueToStory(issue, metric.iterationTitle));
              }
            });
          }
        });

        setStoriesData(Array.from(storiesMap.values()));
      } catch (error) {
        console.error('Failed to fetch stories:', error);
        // Keep empty array on error
      } finally {
        setLoadingStories(false);
      }
    };

    fetchStories();
  }, [selectedIterations]);

  /**
   * Fetch incidents data from MTTR endpoint when iterations change
   */
  useEffect(() => {
    // Clear old data immediately
    setIncidentsData([]);

    // Don't fetch if no iterations selected
    if (!selectedIterations || selectedIterations.length === 0) {
      return;
    }

    const fetchIncidents = async () => {
      try {
        setLoadingIncidents(true);

        const iterationIds = selectedIterations.map(iter => iter.id);
        const iterationsParam = iterationIds.join(',');

        const response = await fetch(`/api/metrics/mttr?iterations=${iterationsParam}`);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // Extract and transform incidents from raw data
        // Use a Map to deduplicate incidents by ID (same incident can appear in multiple iterations)
        const incidentsMap = new Map();
        data.metrics.forEach(metric => {
          if (metric.rawData && metric.rawData.incidents) {
            metric.rawData.incidents.forEach(incident => {
              if (!incidentsMap.has(incident.id)) {
                incidentsMap.set(incident.id, transformIncident(incident));
              }
            });
          }
        });

        setIncidentsData(Array.from(incidentsMap.values()));
      } catch (error) {
        console.error('Failed to fetch incidents:', error);
        // Keep empty array on error
      } finally {
        setLoadingIncidents(false);
      }
    };

    fetchIncidents();
  }, [selectedIterations]);

  /**
   * Fetch merge requests data from lead-time endpoint when iterations change
   */
  useEffect(() => {
    // Clear old data immediately
    setMergeRequestsData([]);

    // Don't fetch if no iterations selected
    if (!selectedIterations || selectedIterations.length === 0) {
      return;
    }

    const fetchMergeRequests = async () => {
      try {
        setLoadingMergeRequests(true);

        const iterationIds = selectedIterations.map(iter => iter.id);
        const iterationsParam = iterationIds.join(',');

        const response = await fetch(`/api/metrics/lead-time?iterations=${iterationsParam}`);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // Extract and transform merge requests from raw data
        // Use a Map to deduplicate MRs by ID (same MR can appear in multiple iterations)
        const mergeRequestsMap = new Map();
        data.metrics.forEach(metric => {
          if (metric.rawData && metric.rawData.mergeRequests) {
            metric.rawData.mergeRequests.forEach(mr => {
              // Only include merged MRs (ignore open/closed without merge)
              if (mr.state === 'merged' && !mergeRequestsMap.has(mr.id)) {
                mergeRequestsMap.set(mr.id, transformMergeRequest(mr));
              }
            });
          }
        });

        setMergeRequestsData(Array.from(mergeRequestsMap.values()));
      } catch (error) {
        console.error('Failed to fetch merge requests:', error);
        // Keep empty array on error
      } finally {
        setLoadingMergeRequests(false);
      }
    };

    fetchMergeRequests();
  }, [selectedIterations]);

  return (
    <ExplorerContainer>
      {/* Stories Section */}
      <TableSection>
        <SectionTitle>Stories ({storiesData.length})</SectionTitle>
        {loadingStories ? (
          <LoadingContainer>Loading stories...</LoadingContainer>
        ) : storiesData && storiesData.length > 0 ? (
          <>
            {/* InProgress Date Statistics Summary */}
            <SummaryCard>
              <SummaryStat>
                <SummaryLabel>Total Stories</SummaryLabel>
                <SummaryValue>{storiesData.length}</SummaryValue>
              </SummaryStat>
              <SummaryStat>
                <SummaryLabel>Closed Stories</SummaryLabel>
                <SummaryValue>
                  {storiesData.filter(s => s.status === 'Closed').length}
                </SummaryValue>
              </SummaryStat>
              <SummaryStat>
                <SummaryLabel>w/ Status Change</SummaryLabel>
                <SummaryValue>
                  {storiesData.filter(s => s.status === 'Closed' && s.startedAtSource === 'status_change').length}
                </SummaryValue>
              </SummaryStat>
              <SummaryStat>
                <SummaryLabel>w/ CreatedAt Fallback</SummaryLabel>
                <SummaryValue style={{ color: '#f59e0b' }}>
                  {storiesData.filter(s => s.status === 'Closed' && s.startedAtSource === 'created').length}
                  {storiesData.filter(s => s.status === 'Closed').length > 0 && (
                    <span style={{ fontSize: '0.7em', marginLeft: '0.5em' }}>
                      ({((storiesData.filter(s => s.status === 'Closed' && s.startedAtSource === 'created').length / storiesData.filter(s => s.status === 'Closed').length) * 100).toFixed(1)}%)
                    </span>
                  )}
                </SummaryValue>
              </SummaryStat>
              <SummaryStat>
                <SummaryLabel>Closed w/ More Notes (BUG)</SummaryLabel>
                <SummaryValue style={{ color: storiesData.filter(s => s.status === 'Closed' && s.missingInProgress && s.hasMoreNotes).length > 0 ? '#ef4444' : '#10b981' }}>
                  {storiesData.filter(s => s.status === 'Closed' && s.missingInProgress && s.hasMoreNotes).length}
                </SummaryValue>
              </SummaryStat>
            </SummaryCard>
            <Table aria-label="Stories data table">
            <TableHeader>
              <tr>
                <TableHeaderCell onClick={() => handleSort('title')}>
                  Title {sortColumn === 'title' && (sortDirection === 'asc' ? '▲' : '▼')}
                </TableHeaderCell>
                <TableHeaderCell onClick={() => handleSort('points')}>
                  Points {sortColumn === 'points' && (sortDirection === 'asc' ? '▲' : '▼')}
                </TableHeaderCell>
                <TableHeaderCell onClick={() => handleSort('status')}>
                  Status {sortColumn === 'status' && (sortDirection === 'asc' ? '▲' : '▼')}
                </TableHeaderCell>
                <TableHeaderCell onClick={() => handleSort('startedAt')}>
                  Started {sortColumn === 'startedAt' && (sortDirection === 'asc' ? '▲' : '▼')}
                </TableHeaderCell>
                <TableHeaderCell onClick={() => handleSort('closedAt')}>
                  Closed {sortColumn === 'closedAt' && (sortDirection === 'asc' ? '▲' : '▼')}
                </TableHeaderCell>
                <TableHeaderCell onClick={() => handleSort('cycleTime')}>
                  Cycle Time {sortColumn === 'cycleTime' && (sortDirection === 'asc' ? '▲' : '▼')}
                </TableHeaderCell>
                <TableHeaderCell onClick={() => handleSort('assignees')}>
                  Assignees {sortColumn === 'assignees' && (sortDirection === 'asc' ? '▲' : '▼')}
                </TableHeaderCell>
              </tr>
            </TableHeader>
            <TableBody>
              {sortedData(storiesData).map((story) => (
                <TableRow key={story.id}>
                  <TableCell>
                    {story.webUrl ? (
                      <TableLink href={story.webUrl} target="_blank" rel="noopener noreferrer">
                        {story.title}
                      </TableLink>
                    ) : (
                      story.title
                    )}
                  </TableCell>
                  <TableCell>{story.points}</TableCell>
                  <TableCell>{story.status}</TableCell>
                  <TableCell>
                    {story.missingInProgress && story.status === 'Closed' ? (
                      // Only show warning for CLOSED stories missing InProgress
                      <WarningIndicator
                        title={
                          story.hasMoreNotes
                            ? `CLOSED story missing InProgress in first ${story.noteCount} notes - more notes need to be fetched (BUG!)`
                            : `Checked all ${story.noteCount} notes - no InProgress status change found. Story likely never moved to "In Progress".`
                        }
                      >
                        <WarningIcon>⚠️</WarningIcon>
                        {story.startedAt}
                        {story.hasMoreNotes ? (
                          <InfoBadge title={`Only ${story.noteCount} notes checked, more available - should not happen for closed stories!`}>
                            BUG: {story.noteCount}+
                          </InfoBadge>
                        ) : (
                          <InfoBadge title={`All ${story.noteCount} notes checked - genuinely no InProgress status`}>
                            All {story.noteCount} notes
                          </InfoBadge>
                        )}
                      </WarningIndicator>
                    ) : story.missingInProgress && story.status === 'Open' ? (
                      // Open story without InProgress - this is normal, show N/A
                      <span title="Open stories don't need InProgress date (not used in cycle time)">
                        N/A (Open)
                      </span>
                    ) : (
                      // Has InProgress date - show formatted date and raw timestamp
                      <DateWithTimestamp>
                        <div>
                          {story.startedAt}
                          {story.startedAtSource === 'created' && (
                            <InfoBadge title="Using createdAt as fallback - no InProgress status change found in notes">
                              📅 Created
                            </InfoBadge>
                          )}
                          {story.hasMoreNotes && (
                            <InfoBadge title={`${story.noteCount} notes fetched, more available`}>
                              {story.noteCount}+
                            </InfoBadge>
                          )}
                        </div>
                        <RawTimestamp title={story.startedAtSource === 'created' ? 'Using createdAt (fallback)' : 'InProgress timestamp from status change'}>
                          {story.startedAtRaw}
                          {story.startedAtSource === 'created' && ' (created)'}
                        </RawTimestamp>
                      </DateWithTimestamp>
                    )}
                  </TableCell>
                  <TableCell>{story.closedAt}</TableCell>
                  <TableCell>
                    {story.cycleTime !== null ? `${story.cycleTime} days` : 'In Progress'}
                  </TableCell>
                  <TableCell>{story.assignees}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </>
        ) : (
          <EmptyState>
            <EmptyStateMessage>No stories found</EmptyStateMessage>
          </EmptyState>
        )}
      </TableSection>

      {/* Incidents Section */}
      <TableSection>
        <SectionTitle>Incidents ({incidentsData.length})</SectionTitle>
        {loadingIncidents ? (
          <LoadingContainer>Loading incidents...</LoadingContainer>
        ) : incidentsData && incidentsData.length > 0 ? (
          <Table aria-label="Incidents data table">
            <TableHeader>
              <tr>
                <TableHeaderCell onClick={() => handleSort('title')}>
                  Title {sortColumn === 'title' && (sortDirection === 'asc' ? '▲' : '▼')}
                </TableHeaderCell>
                <TableHeaderCell onClick={() => handleSort('severity')}>
                  Severity {sortColumn === 'severity' && (sortDirection === 'asc' ? '▲' : '▼')}
                </TableHeaderCell>
                <TableHeaderCell onClick={() => handleSort('startTime')}>
                  Start Time {sortColumn === 'startTime' && (sortDirection === 'asc' ? '▲' : '▼')}
                </TableHeaderCell>
                <TableHeaderCell onClick={() => handleSort('duration')}>
                  Duration {sortColumn === 'duration' && (sortDirection === 'asc' ? '▲' : '▼')}
                </TableHeaderCell>
                <TableHeaderCell onClick={() => handleSort('resolvedAt')}>
                  Resolved {sortColumn === 'resolvedAt' && (sortDirection === 'asc' ? '▲' : '▼')}
                </TableHeaderCell>
              </tr>
            </TableHeader>
            <TableBody>
              {sortedData(incidentsData).map((incident) => (
                <TableRow key={incident.id}>
                  <TableCell>
                    {incident.webUrl ? (
                      <TableLink href={incident.webUrl} target="_blank" rel="noopener noreferrer">
                        {incident.title}
                      </TableLink>
                    ) : (
                      incident.title
                    )}
                  </TableCell>
                  <TableCell>{incident.severity}</TableCell>
                  <TableCell>{incident.startTime}</TableCell>
                  <TableCell>
                    {incident.duration !== null ? `${incident.duration.toFixed(1)} hrs` : 'Open'}
                  </TableCell>
                  <TableCell>{incident.resolvedAt}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState>
            <EmptyStateMessage>No incidents found</EmptyStateMessage>
          </EmptyState>
        )}
      </TableSection>

      {/* Merge Requests Section */}
      <TableSection>
        <SectionTitle>Merge Requests ({mergeRequestsData.length})</SectionTitle>
        {loadingMergeRequests ? (
          <LoadingContainer>Loading merge requests...</LoadingContainer>
        ) : mergeRequestsData && mergeRequestsData.length > 0 ? (
          <Table aria-label="Merge Requests data table">
            <TableHeader>
              <tr>
                <TableHeaderCell onClick={() => handleSort('title')}>
                  Title {sortColumn === 'title' && (sortDirection === 'asc' ? '▲' : '▼')}
                </TableHeaderCell>
                <TableHeaderCell onClick={() => handleSort('author')}>
                  Author {sortColumn === 'author' && (sortDirection === 'asc' ? '▲' : '▼')}
                </TableHeaderCell>
                <TableHeaderCell onClick={() => handleSort('mergedAt')}>
                  Merged {sortColumn === 'mergedAt' && (sortDirection === 'asc' ? '▲' : '▼')}
                </TableHeaderCell>
                <TableHeaderCell onClick={() => handleSort('leadTime')}>
                  Lead Time {sortColumn === 'leadTime' && (sortDirection === 'asc' ? '▲' : '▼')}
                </TableHeaderCell>
              </tr>
            </TableHeader>
            <TableBody>
              {sortedData(mergeRequestsData).map((mr) => (
                <TableRow key={mr.id}>
                  <TableCell>
                    {mr.webUrl ? (
                      <TableLink href={mr.webUrl} target="_blank" rel="noopener noreferrer">
                        {mr.title}
                      </TableLink>
                    ) : (
                      mr.title
                    )}
                  </TableCell>
                  <TableCell>{mr.author}</TableCell>
                  <TableCell>{mr.mergedAt}</TableCell>
                  <TableCell>
                    {mr.leadTime !== null ? `${mr.leadTime} days` : 'N/A'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState>
            <EmptyStateMessage>No merge requests found</EmptyStateMessage>
          </EmptyState>
        )}
      </TableSection>
    </ExplorerContainer>
  );
}
