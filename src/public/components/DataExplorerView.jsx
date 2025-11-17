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

/* ===== COMPONENT ===== */

/**
 * DataExplorerView Component
 *
 * Displays raw data tables for Stories, Incidents, Merge Requests, and Deployments
 * from selected sprint iterations.
 *
 * @param {Object} props
 * @param {Array} props.selectedIterations - Selected sprint iterations
 * @param {Array} props.storiesData - Stories/issues data
 * @param {Array} props.incidentsData - Production incidents data
 * @param {Array} props.mergeRequestsData - Merge requests data
 * @param {Array} props.deploymentsData - Deployment data
 * @returns {JSX.Element}
 */
export default function DataExplorerView({
  selectedIterations,
  storiesData,
  incidentsData,
  mergeRequestsData,
  deploymentsData
}) {
  return (
    <ExplorerContainer>
      {/* Stories Section */}
      <TableSection>
        <SectionTitle>Stories</SectionTitle>
        {storiesData && storiesData.length > 0 ? (
          <Table aria-label="Stories data table">
            <TableHeader>
              <tr>
                <TableHeaderCell>Title</TableHeaderCell>
                <TableHeaderCell>Points</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
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
                  <TableCell>{story.cycleTime} days</TableCell>
                  <TableCell>{story.assignees.join(', ')}</TableCell>
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
        {incidentsData && incidentsData.length > 0 ? (
          <Table aria-label="Incidents data table">
            <TableHeader>
              <tr>
                <TableHeaderCell>Title</TableHeaderCell>
                <TableHeaderCell>Severity</TableHeaderCell>
                <TableHeaderCell>Duration</TableHeaderCell>
                <TableHeaderCell>Resolved Date</TableHeaderCell>
              </tr>
            </TableHeader>
            <TableBody>
              {incidentsData.map((incident) => (
                <TableRow key={incident.id}>
                  <TableCell>{incident.title}</TableCell>
                  <TableCell>{incident.severity}</TableCell>
                  <TableCell>{incident.duration} hours</TableCell>
                  <TableCell>{incident.resolvedDate}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState>
            <EmptyStateMessage>No incidents recorded</EmptyStateMessage>
          </EmptyState>
        )}
      </TableSection>

      {/* Merge Requests Section */}
      <TableSection>
        <SectionTitle>Merge Requests</SectionTitle>
        {mergeRequestsData && mergeRequestsData.length > 0 ? (
          <Table aria-label="Merge requests data table">
            <TableHeader>
              <tr>
                <TableHeaderCell>Title</TableHeaderCell>
                <TableHeaderCell>Author</TableHeaderCell>
                <TableHeaderCell>Merged Date</TableHeaderCell>
                <TableHeaderCell>Lead Time</TableHeaderCell>
              </tr>
            </TableHeader>
            <TableBody>
              {mergeRequestsData.map((mr) => (
                <TableRow key={mr.id}>
                  <TableCell>{mr.title}</TableCell>
                  <TableCell>{mr.author}</TableCell>
                  <TableCell>{mr.mergedDate}</TableCell>
                  <TableCell>N/A</TableCell>
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

      {/* Deployments Section */}
      <TableSection>
        <SectionTitle>Deployments</SectionTitle>
        {deploymentsData && deploymentsData.length > 0 ? (
          <Table aria-label="Deployments data table">
            <TableHeader>
              <tr>
                <TableHeaderCell>Environment</TableHeaderCell>
                <TableHeaderCell>Deployed Date</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
              </tr>
            </TableHeader>
            <TableBody>
              {deploymentsData.map((deployment) => (
                <TableRow key={deployment.id}>
                  <TableCell>{deployment.environment}</TableCell>
                  <TableCell>{deployment.deployedDate}</TableCell>
                  <TableCell>{deployment.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState>
            <EmptyStateMessage>No deployments found</EmptyStateMessage>
          </EmptyState>
        )}
      </TableSection>
    </ExplorerContainer>
  );
}
