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
 * Styled table
 *
 * @component
 */
const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: ${props => props.theme.typography.fontSize.sm};
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
 * Table header cell
 *
 * @component
 */
const TableHeaderCell = styled.th`
  padding: ${props => props.theme.spacing.md};
  text-align: left;
  font-size: ${props => props.theme.typography.fontSize.sm};
  font-weight: ${props => props.theme.typography.fontWeight.semibold};
  color: ${props => props.theme.colors.textPrimary};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;

  &:first-child {
    padding-left: ${props => props.theme.spacing.lg};
  }

  &:last-child {
    padding-right: ${props => props.theme.spacing.lg};
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
  padding: ${props => props.theme.spacing.md};
  font-size: ${props => props.theme.typography.fontSize.sm};
  font-weight: ${props => props.theme.typography.fontWeight.normal};
  color: ${props => props.theme.colors.textSecondary};
  line-height: ${props => props.theme.typography.lineHeight.normal};

  &:first-child {
    padding-left: ${props => props.theme.spacing.lg};
    color: ${props => props.theme.colors.textPrimary};
    font-weight: ${props => props.theme.typography.fontWeight.medium};
  }

  &:last-child {
    padding-right: ${props => props.theme.spacing.lg};
  }

  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
 * Format date/time for display
 *
 * @param {string|null} isoDate - ISO date string
 * @returns {string} Formatted date/time or fallback text
 */
const formatDateTime = (isoDate) => {
  if (!isoDate) return '-';
  const date = new Date(isoDate);
  return date.toLocaleString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
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

  return {
    id: issue.id,
    title: issue.title,
    points: issue.weight || 1,
    status: issue.state === 'closed' ? 'Closed' : 'Open',
    startedAt: formatDateTime(issue.inProgressAt),
    closedAt: formatDateTime(issue.closedAt),
    cycleTime: cycleTime !== null ? cycleTime : null,
    assignees: assigneeNames
  };
};

/* ===== COMPONENT ===== */

/**
 * DataExplorerView Component
 *
 * Displays raw data tables for Stories, Incidents, Merge Requests, and Deployments
 * from selected sprint iterations.
 *
 * Phase 1: Fetches Stories data from /api/metrics/velocity (only endpoint with raw data)
 * Phase 2: Will fetch Incidents, MRs, Deployments when backend exposes raw data
 *
 * @param {Object} props
 * @param {Array} props.selectedIterations - Selected sprint iterations [{id, title, ...}]
 * @returns {JSX.Element}
 */
export default function DataExplorerView({ selectedIterations }) {
  const [storiesData, setStoriesData] = useState([]);
  const [loadingStories, setLoadingStories] = useState(false);

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
        const stories = [];
        data.metrics.forEach(metric => {
          if (metric.rawData && metric.rawData.issues) {
            metric.rawData.issues.forEach(issue => {
              stories.push(transformIssueToStory(issue, metric.iterationTitle));
            });
          }
        });

        setStoriesData(stories);
      } catch (error) {
        console.error('Failed to fetch stories:', error);
        // Keep empty array on error
      } finally {
        setLoadingStories(false);
      }
    };

    fetchStories();
  }, [selectedIterations]);
  return (
    <ExplorerContainer>
      {/* Stories Section */}
      <TableSection>
        <SectionTitle>Stories ({storiesData.length})</SectionTitle>
        {loadingStories ? (
          <LoadingContainer>Loading stories...</LoadingContainer>
        ) : storiesData && storiesData.length > 0 ? (
          <Table aria-label="Stories data table">
            <TableHeader>
              <tr>
                <TableHeaderCell>Title</TableHeaderCell>
                <TableHeaderCell>Points</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Started Work</TableHeaderCell>
                <TableHeaderCell>Closed</TableHeaderCell>
                <TableHeaderCell>Cycle Time</TableHeaderCell>
                <TableHeaderCell>Assignees</TableHeaderCell>
              </tr>
            </TableHeader>
            <TableBody>
              {storiesData.map((story) => (
                <TableRow key={story.id}>
                  <TableCell>{story.title}</TableCell>
                  <TableCell>{story.points}</TableCell>
                  <TableCell>{story.status}</TableCell>
                  <TableCell>{story.startedAt}</TableCell>
                  <TableCell>{story.closedAt}</TableCell>
                  <TableCell>
                    {story.cycleTime !== null ? `${story.cycleTime} days` : 'In Progress'}
                  </TableCell>
                  <TableCell>{story.assignees}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState>
            <EmptyStateMessage>No stories found</EmptyStateMessage>
          </EmptyState>
        )}
      </TableSection>

      {/* Incidents Section */}
      <TableSection>
        <SectionTitle>Incidents</SectionTitle>
        <ComingSoonMessage>
          Coming soon - Backend needs to expose incident raw data in API response
        </ComingSoonMessage>
      </TableSection>

      {/* Merge Requests Section */}
      <TableSection>
        <SectionTitle>Merge Requests</SectionTitle>
        <ComingSoonMessage>
          Coming soon - Backend needs to expose merge request raw data in API response
        </ComingSoonMessage>
      </TableSection>

      {/* Deployments Section */}
      <TableSection>
        <SectionTitle>Deployments</SectionTitle>
        <ComingSoonMessage>
          Coming soon - Backend needs to expose deployment/pipeline raw data in API response
        </ComingSoonMessage>
      </TableSection>
    </ExplorerContainer>
  );
}
