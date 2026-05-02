import {
  Table,
  TableHeader,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
  TableLink,
  EmptyState,
  EmptyStateMessage,
  LoadingContainer,
  SectionTitle,
  TableSection,
  SummaryCard,
  SummaryStat,
  SummaryLabel,
  SummaryValue,
  WarningIndicator,
  WarningIcon,
  InfoBadge,
  DateWithTimestamp,
  RawTimestamp,
} from './DataExplorer.styles.jsx';

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

  return Math.round(diffDays * 10) / 10;
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
export const transformIssueToStory = (issue, iterationTitle) => {
  const startDate = issue.inProgressAt || issue.createdAt;
  const cycleTime = issue.closedAt
    ? calculateCycleTime(startDate, issue.closedAt)
    : null;

  const assignees = issue.assignees?.nodes || [];
  const assigneeNames = assignees.length > 0
    ? assignees.map(a => a.username).join(', ')
    : 'Unassigned';

  const hasMoreNotes = issue.notes?.pageInfo?.hasNextPage || false;
  const noteCount = issue.notes?.nodes?.length || 0;

  return {
    id: issue.id,
    title: issue.title,
    webUrl: issue.webUrl,
    points: issue.weight || 1,
    status: issue.state === 'closed' ? 'Closed' : 'Open',
    startedAt: formatDate(issue.inProgressAt),
    startedAtRaw: issue.inProgressAt,
    startedAtSource: issue.inProgressAtSource || 'status_change',
    closedAt: formatDate(issue.closedAt),
    cycleTime: cycleTime !== null ? cycleTime : null,
    assignees: assigneeNames,
    missingInProgress: !issue.inProgressAt,
    hasMoreNotes: hasMoreNotes,
    noteCount: noteCount
  };
};

/* ===== COMPONENT ===== */

/**
 * DataExplorerIssuesTable component
 *
 * Renders the Stories (issues) table with summary stats and sortable columns.
 *
 * @param {Object} props
 * @param {Array} props.storiesData - Transformed story objects to display
 * @param {boolean} props.loadingStories - Whether stories are currently loading
 * @param {string} props.sortColumn - Currently active sort column key
 * @param {string} props.sortDirection - 'asc' or 'desc'
 * @param {Function} props.onSort - Callback when a column header is clicked
 * @param {Function} props.sortedData - Function that sorts an array by current sort state
 * @returns {JSX.Element}
 */
export default function DataExplorerIssuesTable({
  storiesData,
  loadingStories,
  sortColumn,
  sortDirection,
  onSort,
  sortedData,
}) {
  const sortIndicator = (col) =>
    sortColumn === col ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : '';

  return (
    <TableSection>
      <SectionTitle>Stories ({storiesData.length})</SectionTitle>
      {loadingStories ? (
        <LoadingContainer>Loading stories...</LoadingContainer>
      ) : storiesData && storiesData.length > 0 ? (
        <>
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
                <TableHeaderCell onClick={() => onSort('title')}>
                  Title{sortIndicator('title')}
                </TableHeaderCell>
                <TableHeaderCell onClick={() => onSort('points')}>
                  Points{sortIndicator('points')}
                </TableHeaderCell>
                <TableHeaderCell onClick={() => onSort('status')}>
                  Status{sortIndicator('status')}
                </TableHeaderCell>
                <TableHeaderCell onClick={() => onSort('startedAt')}>
                  Started{sortIndicator('startedAt')}
                </TableHeaderCell>
                <TableHeaderCell onClick={() => onSort('closedAt')}>
                  Closed{sortIndicator('closedAt')}
                </TableHeaderCell>
                <TableHeaderCell onClick={() => onSort('cycleTime')}>
                  Cycle Time{sortIndicator('cycleTime')}
                </TableHeaderCell>
                <TableHeaderCell onClick={() => onSort('assignees')}>
                  Assignees{sortIndicator('assignees')}
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
                      <span title="Open stories don't need InProgress date (not used in cycle time)">
                        N/A (Open)
                      </span>
                    ) : (
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
  );
}
