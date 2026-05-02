import styled from 'styled-components';

/**
 * Section container for each table
 *
 * @component
 */
export const TableSection = styled.section`
  display: flex;
  flex-direction: column;
`;

/**
 * Section title
 *
 * @component
 */
export const SectionTitle = styled.h2`
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
export const Table = styled.table`
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
export const TableHeader = styled.thead`
  background: ${props => props.theme.colors.bgTertiary};
  border-bottom: 2px solid ${props => props.theme.colors.border};
`;

/**
 * Table header cell - clickable for sorting
 *
 * @component
 */
export const TableHeaderCell = styled.th`
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
export const TableBody = styled.tbody`
  background: ${props => props.theme.colors.bgPrimary};
`;

/**
 * Table row
 *
 * @component
 */
export const TableRow = styled.tr`
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
export const TableCell = styled.td`
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
export const TableLink = styled.a`
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
export const EmptyState = styled.div`
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
export const EmptyStateMessage = styled.p`
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
export const LoadingContainer = styled.div`
  padding: ${props => props.theme.spacing.xl};
  text-align: center;
  color: ${props => props.theme.colors.textSecondary};
`;

/**
 * Summary card for displaying statistics
 *
 * @component
 */
export const SummaryCard = styled.div`
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
export const SummaryStat = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.xs};
`;

/**
 * Summary stat label
 *
 * @component
 */
export const SummaryLabel = styled.div`
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
export const SummaryValue = styled.div`
  font-size: ${props => props.theme.typography.fontSize.xl};
  font-weight: ${props => props.theme.typography.fontWeight.semibold};
  color: ${props => props.theme.colors.textPrimary};
`;

/**
 * Warning indicator for missing data
 *
 * @component
 */
export const WarningIndicator = styled.span`
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
export const WarningIcon = styled.span`
  font-size: ${props => props.theme.typography.fontSize.sm};
`;

/**
 * Info badge for additional metadata
 *
 * @component
 */
export const InfoBadge = styled.span`
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
export const DateWithTimestamp = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

/**
 * Raw timestamp display (small, subtle)
 *
 * @component
 */
export const RawTimestamp = styled.div`
  font-size: ${props => props.theme.typography.fontSize.xxs || '10px'};
  color: ${props => props.theme.colors.textSecondary};
  font-family: monospace;
  opacity: 0.7;
`;
