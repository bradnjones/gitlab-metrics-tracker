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
  InfoBadge,
  DateWithTimestamp,
  RawTimestamp,
} from './DataExplorer.styles.jsx';

/* ===== HELPER FUNCTIONS ===== */

/**
 * Calculate cycle time in days from two ISO date strings
 *
 * @param {string} startIso - ISO date string for start
 * @param {string} endIso - ISO date string for end
 * @returns {number} Difference in days (rounded to 1 decimal)
 */
const calculateCycleTime = (startIso, endIso) => {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const diffDays = (end - start) / (1000 * 60 * 60 * 24);
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
 * Extract severity from incident labels
 *
 * @param {Array<Object>} labels - GitLab label objects from incident
 * @returns {string} Severity level ('Critical', 'High', 'Medium', 'Low', or 'Unknown')
 */
export const extractSeverity = (labels) => {
  if (!labels || !labels.nodes || labels.nodes.length === 0) {
    return 'Unknown';
  }

  const severityLabel = labels.nodes.find(label =>
    label.title && label.title.toLowerCase().startsWith('severity::')
  );

  if (!severityLabel) return 'Unknown';

  const severity = severityLabel.title.split('::')[1];
  return severity ? severity.charAt(0).toUpperCase() + severity.slice(1) : 'Unknown';
};

/**
 * Transform GitLab incident to Incident table format
 *
 * @param {Object} incident - GitLab incident object from rawData (with timeline metadata)
 * @returns {Object} Transformed incident object for table display
 */
export const transformIncident = (incident) => {
  const startTime = incident.actualStartTime || incident.createdAt;
  const endTime = incident.actualEndTime || incident.closedAt;

  const duration = endTime
    ? calculateCycleTime(startTime, endTime) * 24
    : null;

  const severity = extractSeverity(incident.labels);

  return {
    id: incident.id,
    title: incident.title,
    webUrl: incident.webUrl,
    severity,
    startTime: formatDate(startTime),
    startTimeRaw: startTime,
    startTimeSource: incident.startTimeSource || 'created',
    duration: duration !== null ? duration : null,
    resolvedAt: formatDate(endTime),
    resolvedAtRaw: endTime,
    endTimeSource: incident.endTimeSource || (incident.closedAt ? 'closed' : null),
    hasTimelineEvents: incident.hasTimelineEvents || false,
  };
};

/* ===== COMPONENT ===== */

/**
 * DataExplorerIncidentsTable component
 *
 * Renders the Incidents table with summary stats and sortable columns.
 *
 * @param {Object} props
 * @param {Array} props.incidentsData - Transformed incident objects to display
 * @param {boolean} props.loadingIncidents - Whether incidents are currently loading
 * @param {string} props.sortColumn - Currently active sort column key
 * @param {string} props.sortDirection - 'asc' or 'desc'
 * @param {Function} props.onSort - Callback when a column header is clicked
 * @param {Function} props.sortedData - Function that sorts an array by current sort state
 * @returns {JSX.Element}
 */
export default function DataExplorerIncidentsTable({
  incidentsData,
  loadingIncidents,
  sortColumn,
  sortDirection,
  onSort,
  sortedData,
}) {
  const sortIndicator = (col) =>
    sortColumn === col ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : '';

  return (
    <TableSection>
      <SectionTitle>Incidents ({incidentsData.length})</SectionTitle>
      {loadingIncidents ? (
        <LoadingContainer>Loading incidents...</LoadingContainer>
      ) : incidentsData && incidentsData.length > 0 ? (
        <>
          <SummaryCard>
            <SummaryStat>
              <SummaryLabel>Total Incidents</SummaryLabel>
              <SummaryValue>{incidentsData.length}</SummaryValue>
            </SummaryStat>
            <SummaryStat>
              <SummaryLabel>w/ Timeline Start</SummaryLabel>
              <SummaryValue style={{ color: '#10b981' }}>
                {incidentsData.filter(i => i.startTimeSource === 'timeline').length}
                {incidentsData.length > 0 && (
                  <span style={{ fontSize: '0.7em', marginLeft: '0.5em' }}>
                    ({((incidentsData.filter(i => i.startTimeSource === 'timeline').length / incidentsData.length) * 100).toFixed(1)}%)
                  </span>
                )}
              </SummaryValue>
            </SummaryStat>
            <SummaryStat>
              <SummaryLabel>w/ CreatedAt Fallback</SummaryLabel>
              <SummaryValue style={{ color: '#f59e0b' }}>
                {incidentsData.filter(i => i.startTimeSource === 'created').length}
                {incidentsData.length > 0 && (
                  <span style={{ fontSize: '0.7em', marginLeft: '0.5em' }}>
                    ({((incidentsData.filter(i => i.startTimeSource === 'created').length / incidentsData.length) * 100).toFixed(1)}%)
                  </span>
                )}
              </SummaryValue>
            </SummaryStat>
            <SummaryStat>
              <SummaryLabel>w/ Timeline End</SummaryLabel>
              <SummaryValue style={{ color: '#10b981' }}>
                {incidentsData.filter(i =>
                  i.endTimeSource === 'timeline_end' ||
                  i.endTimeSource === 'timeline_stop' ||
                  i.endTimeSource === 'timeline_mitigated'
                ).length}
              </SummaryValue>
            </SummaryStat>
            <SummaryStat>
              <SummaryLabel>w/ ClosedAt Fallback</SummaryLabel>
              <SummaryValue style={{ color: '#f59e0b' }}>
                {incidentsData.filter(i => i.endTimeSource === 'closed').length}
              </SummaryValue>
            </SummaryStat>
          </SummaryCard>
          <Table aria-label="Incidents data table">
            <TableHeader>
              <tr>
                <TableHeaderCell onClick={() => onSort('title')}>
                  Title{sortIndicator('title')}
                </TableHeaderCell>
                <TableHeaderCell onClick={() => onSort('severity')}>
                  Severity{sortIndicator('severity')}
                </TableHeaderCell>
                <TableHeaderCell onClick={() => onSort('startTime')}>
                  Start Time{sortIndicator('startTime')}
                </TableHeaderCell>
                <TableHeaderCell onClick={() => onSort('duration')}>
                  Duration{sortIndicator('duration')}
                </TableHeaderCell>
                <TableHeaderCell onClick={() => onSort('resolvedAt')}>
                  Resolved{sortIndicator('resolvedAt')}
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
                  <TableCell>
                    <DateWithTimestamp>
                      <div>
                        {incident.startTime}
                        {incident.startTimeSource === 'timeline' ? (
                          <InfoBadge title="Using actual incident start time from timeline events">
                            ⏱️ Timeline
                          </InfoBadge>
                        ) : (
                          <InfoBadge title="Using issue createdAt as fallback - no timeline 'Start time' tag found">
                            📅 Created
                          </InfoBadge>
                        )}
                      </div>
                      <RawTimestamp title={incident.startTimeSource === 'timeline' ? 'Timeline "Start time" event' : 'Fallback to createdAt'}>
                        {incident.startTimeRaw}
                        {incident.startTimeSource === 'created' && ' (created)'}
                      </RawTimestamp>
                    </DateWithTimestamp>
                  </TableCell>
                  <TableCell>
                    {incident.duration !== null ? `${incident.duration.toFixed(1)} hrs` : 'Open'}
                  </TableCell>
                  <TableCell>
                    {incident.resolvedAt !== '-' ? (
                      <DateWithTimestamp>
                        <div>
                          {incident.resolvedAt}
                          {incident.endTimeSource === 'timeline_end' ? (
                            <InfoBadge title="Using actual incident end time from timeline 'End time' tag">
                              ⏱️ Timeline End
                            </InfoBadge>
                          ) : incident.endTimeSource === 'timeline_stop' ? (
                            <InfoBadge title="Using actual incident stop time from timeline 'Stop time' tag">
                              ⏱️ Timeline Stop
                            </InfoBadge>
                          ) : incident.endTimeSource === 'timeline_mitigated' ? (
                            <InfoBadge title="Using 'Impact mitigated' timeline event (no 'End time' or 'Stop time' tag)">
                              ⏱️ Mitigated
                            </InfoBadge>
                          ) : incident.endTimeSource === 'closed' ? (
                            <InfoBadge title="Using issue closedAt as fallback - no timeline end events found">
                              📅 Closed
                            </InfoBadge>
                          ) : null}
                        </div>
                        <RawTimestamp title={
                          incident.endTimeSource === 'timeline_end' ? 'Timeline "End time" event' :
                          incident.endTimeSource === 'timeline_stop' ? 'Timeline "Stop time" event' :
                          incident.endTimeSource === 'timeline_mitigated' ? 'Timeline "Impact mitigated" event' :
                          'Fallback to closedAt'
                        }>
                          {incident.resolvedAtRaw}
                          {incident.endTimeSource === 'closed' && ' (closed)'}
                        </RawTimestamp>
                      </DateWithTimestamp>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      ) : (
        <EmptyState>
          <EmptyStateMessage>No incidents found</EmptyStateMessage>
        </EmptyState>
      )}
    </TableSection>
  );
}
