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
} from './DataExplorer.styles.jsx';

/* ===== HELPER FUNCTIONS ===== */

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
 * Calculate lead time in days from first commit to merge
 *
 * @param {Array<Object>} commits - Commit objects with committedDate
 * @param {string} mergedAt - ISO date string when MR was merged
 * @returns {number|null} Lead time in days or null if no commits
 */
export const calculateLeadTime = (commits, mergedAt) => {
  if (!commits || !commits.nodes || commits.nodes.length === 0 || !mergedAt) {
    return null;
  }

  const earliestCommit = commits.nodes.reduce((earliest, commit) => {
    const commitDate = new Date(commit.committedDate);
    return commitDate < earliest ? commitDate : earliest;
  }, new Date(commits.nodes[0].committedDate));

  const merged = new Date(mergedAt);
  const diffMs = merged - earliestCommit;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  return Math.round(diffDays * 10) / 10;
};

/**
 * Transform GitLab merge request to MR table format
 *
 * @param {Object} mergeRequest - GitLab MR object from rawData
 * @returns {Object} Transformed MR object for table display
 */
export const transformMergeRequest = (mergeRequest) => {
  const leadTime = mergeRequest.state === 'merged'
    ? calculateLeadTime(mergeRequest.commits, mergeRequest.mergedAt)
    : null;

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
 * DataExplorerMRsTable component
 *
 * Renders the Merge Requests table with sortable columns.
 *
 * @param {Object} props
 * @param {Array} props.mergeRequestsData - Transformed MR objects to display
 * @param {boolean} props.loadingMergeRequests - Whether MRs are currently loading
 * @param {string} props.sortColumn - Currently active sort column key
 * @param {string} props.sortDirection - 'asc' or 'desc'
 * @param {Function} props.onSort - Callback when a column header is clicked
 * @param {Function} props.sortedData - Function that sorts an array by current sort state
 * @returns {JSX.Element}
 */
export default function DataExplorerMRsTable({
  mergeRequestsData,
  loadingMergeRequests,
  sortColumn,
  sortDirection,
  onSort,
  sortedData,
}) {
  const sortIndicator = (col) =>
    sortColumn === col ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : '';

  return (
    <TableSection>
      <SectionTitle>Merge Requests ({mergeRequestsData.length})</SectionTitle>
      {loadingMergeRequests ? (
        <LoadingContainer>Loading merge requests...</LoadingContainer>
      ) : mergeRequestsData && mergeRequestsData.length > 0 ? (
        <Table aria-label="Merge Requests data table">
          <TableHeader>
            <tr>
              <TableHeaderCell onClick={() => onSort('title')}>
                Title{sortIndicator('title')}
              </TableHeaderCell>
              <TableHeaderCell onClick={() => onSort('author')}>
                Author{sortIndicator('author')}
              </TableHeaderCell>
              <TableHeaderCell onClick={() => onSort('mergedAt')}>
                Merged{sortIndicator('mergedAt')}
              </TableHeaderCell>
              <TableHeaderCell onClick={() => onSort('leadTime')}>
                Lead Time{sortIndicator('leadTime')}
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
  );
}
