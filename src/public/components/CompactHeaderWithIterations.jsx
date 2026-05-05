/**
 * CompactHeaderWithIterations Component
 *
 * Unified header combining branding and sprint display controls.
 * Fixed single-row height regardless of how many sprints are selected.
 *
 * @param {Object} props
 * @param {Array<{id: string, title: string, iterationCadence?: {title: string}, iid?: number, dueDate?: string}>} props.selectedIterations - All selected (cached) iterations
 * @param {Array<Object>} props.displayedIterations - Subset currently shown in charts
 * @param {Function} props.onOpenModal - Callback when "Change Sprints" clicked (cache modal)
 * @param {Function} props.onOpenDisplayFilter - Callback when sprint summary pill clicked
 * @returns {JSX.Element} Compact header component
 */

import styled from 'styled-components';
import React, { useState } from 'react';
import CacheStatus from './CacheStatus.jsx';
import RefreshButton from './RefreshButton.jsx';
import HamburgerMenu from './HamburgerMenu.jsx';

/* ===== STYLED COMPONENTS ===== */

/**
 * Compact unified header with sticky positioning
 *
 * @component
 */
const CompactHeader = styled.header`
  position: sticky;
  top: 0;
  z-index: 100;
  background: linear-gradient(135deg, ${props => props.theme.colors.primary} 0%, ${props => props.theme.colors.primaryDark} 100%);
  color: white;
  box-shadow: ${props => props.theme.shadows.md};
  padding: 16px 12px;

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    padding: 12px 8px;
  }
`;

/**
 * Inner content container with max-width and flex layout
 *
 * @component
 */
const CompactHeaderContent = styled.div`
  max-width: 100%;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.md};

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    flex-wrap: wrap;
    gap: ${props => props.theme.spacing.sm};
  }
`;

/**
 * Left section (Hamburger + Branding)
 *
 * @component
 */
const LeftSection = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.md};
  flex-shrink: 0;

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    width: 100%;
  }
`;

/**
 * Right section (Cache Status + Refresh Button)
 *
 * @component
 */
const RightSection = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
  flex-shrink: 0;
  margin-left: auto;

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    width: 100%;
    order: 4;
  }
`;

/**
 * Branding section (title + subtitle)
 *
 * @component
 */
const BrandingSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    width: 100%;
  }
`;

/**
 * Compact title with enhanced font weight and explicit white color
 *
 * @component
 */
const CompactTitle = styled.h1`
  font-size: ${props => props.theme.typography.fontSize.xl};
  font-weight: 800;
  color: #ffffff;
  margin: 0;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    font-size: ${props => props.theme.typography.fontSize.lg};
  }
`;

/**
 * Compact subtitle
 *
 * @component
 */
const CompactSubtitle = styled.p`
  font-size: ${props => props.theme.typography.fontSize.sm};
  margin: 0;
  opacity: 0.9;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    font-size: ${props => props.theme.typography.fontSize.xs};
  }
`;

/**
 * Compact clickable pill showing sprint count + date range
 *
 * @component
 */
const SprintSummaryPill = styled.button`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: ${props => props.theme.borderRadius.md};
  color: white;
  cursor: pointer;
  padding: 6px 12px;
  flex-shrink: 0;
  transition: background ${props => props.theme.transitions.fast} ${props => props.theme.transitions.easing};

  &:hover {
    background: rgba(255, 255, 255, 0.25);
  }

  &:focus {
    outline: 2px solid white;
    outline-offset: 2px;
  }

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    width: 100%;
    order: 3;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: ${props => props.theme.spacing.md};
  }
`;

const PillTopLine = styled.span`
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: ${props => props.theme.typography.fontSize.sm};
  font-weight: ${props => props.theme.typography.fontWeight.semibold};
  white-space: nowrap;
`;

const PillBottomLine = styled.span`
  font-size: ${props => props.theme.typography.fontSize.xs};
  opacity: 0.8;
  white-space: nowrap;
`;

const Chevron = styled.span`
  font-size: 10px;
  opacity: 0.8;
`;

/**
 * Row below the main header showing per-iteration chips
 *
 * @component
 */
const ChipList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${props => props.theme.spacing.xs};
  padding: 6px 12px 8px;
`;

/**
 * Individual iteration chip
 *
 * @component
 */
const IterationChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: ${props => props.theme.borderRadius.full};
  color: white;
  font-size: ${props => props.theme.typography.fontSize.xs};
  font-weight: ${props => props.theme.typography.fontWeight.medium};
  padding: 2px 8px 2px 10px;
  white-space: nowrap;
`;

/**
 * Remove (×) button inside a chip
 *
 * @component
 */
const ChipRemoveButton = styled.button`
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  opacity: 0.7;
  padding: 0 2px;

  &:hover { opacity: 1; }
  &:focus { outline: 1px solid white; border-radius: 2px; }
`;

/**
 * Actions section (cache status, refresh button, change sprints button)
 *
 * @component
 */
const ActionsSection = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.md};
  flex-shrink: 0;

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    width: 100%;
    flex-wrap: wrap;
    gap: ${props => props.theme.spacing.sm};
  }
`;

/**
 * Cache management section (status + refresh button)
 *
 * @component
 */
const CacheManagementSection = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(8px);
  border-radius: ${props => props.theme.borderRadius.md};
  border: 1px solid rgba(255, 255, 255, 0.2);

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    width: 100%;
    justify-content: space-between;
  }
`;

/**
 * Change iterations button (light button on gradient)
 *
 * @component
 */
const HeaderChangeButton = styled.button`
  background: white;
  color: ${props => props.theme.colors.primary};
  border: none;
  padding: 6px 16px;
  font-size: ${props => props.theme.typography.fontSize.sm};
  font-weight: ${props => props.theme.typography.fontWeight.semibold};
  border-radius: ${props => props.theme.borderRadius.md};
  cursor: pointer;
  white-space: nowrap;
  transition: all ${props => props.theme.transitions.normal} ${props => props.theme.transitions.easing};
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  &:hover {
    background: rgba(255, 255, 255, 0.95);
    transform: translateY(-1px);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15);
  }

  &:active {
    transform: translateY(0);
  }

  &:focus {
    outline: 2px solid white;
    outline-offset: 2px;
  }

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    width: 100%;
  }
`;

/* ===== COMPONENT ===== */

/**
 * Format ISO date to MM/DD
 * @param {string} dateString
 * @returns {string}
 */
function fmtDate(dateString) {
  if (!dateString) return '';
  const d = new Date(dateString);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/**
 * Format an iteration into a compact chip label.
 * Uses cadence initials + due date when available; falls back to iteration title.
 * @param {Object} iteration
 * @returns {string} e.g. "DS 1/14" or "Sprint 1"
 */
function formatChipLabel(iteration) {
  if (!iteration.iterationCadence?.title || !iteration.dueDate) {
    return iteration.title;
  }
  const initials = iteration.iterationCadence.title
    .split(' ')
    .map(w => w[0])
    .join('');
  return `${initials} ${fmtDate(iteration.dueDate)}`;
}

/**
 * Build date range string from an array of iterations
 * @param {Array<Object>} iterations
 * @returns {string} e.g. "10/25 – 5/23"
 */
function buildDateRange(iterations) {
  const dates = iterations.map(it => it.dueDate).filter(Boolean).sort();
  if (dates.length === 0) return '';
  if (dates.length === 1) return fmtDate(dates[0]);
  return `${fmtDate(dates[0])} – ${fmtDate(dates[dates.length - 1])}`;
}

/**
 * CompactHeaderWithIterations Component
 *
 * @param {Object} props
 * @param {Array<Object>} props.selectedIterations - All selected (cached) iterations
 * @param {Array<Object>} props.displayedIterations - Subset currently shown in charts
 * @param {Function} props.onOpenModal - Opens cache selection modal ("Change Sprints")
 * @param {Function} props.onOpenDisplayFilter - Opens sprint display filter modal
 * @param {Function} props.onOpenAnnotationModal
 * @param {Function} props.onOpenManageAnnotations
 * @param {Function} [props.onRemoveIteration] - Called with iteration id when chip × is clicked
 * @param {Function} [props.onExportCSV]
 * @param {boolean} [props.exporting=false]
 * @returns {JSX.Element}
 */
function CompactHeaderWithIterations({
  selectedIterations = [],
  displayedIterations = [],
  onOpenModal,
  onOpenDisplayFilter,
  onOpenAnnotationModal,
  onOpenManageAnnotations,
  onRemoveIteration,
  onExportCSV,
  exporting = false,
}) {
  const [cacheRefreshKey, setCacheRefreshKey] = useState(0);

  const handleRefreshComplete = () => setCacheRefreshKey(prev => prev + 1);

  const total = selectedIterations.length;
  const shown = displayedIterations.length;
  const countLabel = total === 0
    ? null
    : shown === total
      ? `${total} sprint${total !== 1 ? 's' : ''}`
      : `${shown} of ${total} sprints`;

  const dateRange = buildDateRange(displayedIterations.length > 0 ? displayedIterations : selectedIterations);

  return (
    <CompactHeader>
      <CompactHeaderContent>
        {/* LEFT SECTION: Hamburger + Branding */}
        <LeftSection>
          <HamburgerMenu
            onManageAnnotations={() => onOpenManageAnnotations?.()}
            onAddAnnotation={() => onOpenAnnotationModal?.()}
            onChangeSprints={() => onOpenModal?.()}
            onExportCSV={onExportCSV}
            canExport={selectedIterations.length > 0}
            exporting={exporting}
          />

          <BrandingSection>
            <CompactTitle>GitLab Sprint Metrics</CompactTitle>
            <CompactSubtitle>Track performance with context</CompactSubtitle>
          </BrandingSection>
        </LeftSection>

        {/* MIDDLE SECTION: Sprint summary pill (count + date range) or empty label */}
        <SprintSummaryPill
          type="button"
          onClick={() => total > 0 && onOpenDisplayFilter?.()}
          title={total > 0 ? 'Click to filter which sprints are displayed' : undefined}
          disabled={total === 0}
        >
          {total === 0
            ? <span>No sprints selected</span>
            : <>
                <PillTopLine>
                  <span>{countLabel}</span>
                  <Chevron>▾</Chevron>
                </PillTopLine>
                {dateRange && <PillBottomLine>{dateRange}</PillBottomLine>}
              </>
          }
        </SprintSummaryPill>

        {/* RIGHT SECTION: Cache Status + Refresh Button */}
        <RightSection>
          <CacheManagementSection>
            <CacheStatus key={cacheRefreshKey} />
            <RefreshButton onRefreshComplete={handleRefreshComplete} />
          </CacheManagementSection>
        </RightSection>
      </CompactHeaderContent>

      {/* CHIP LIST: per-iteration chips with remove buttons */}
      {selectedIterations.length > 0 && (
        <ChipList>
          {selectedIterations.map(it => (
            <IterationChip key={it.id}>
              {formatChipLabel(it)}
              <ChipRemoveButton
                type="button"
                aria-label={`Remove ${it.title}`}
                onClick={() => onRemoveIteration?.(it.id)}
              >
                ×
              </ChipRemoveButton>
            </IterationChip>
          ))}
        </ChipList>
      )}
    </CompactHeader>
  );
}

/**
 * Custom comparison for React.memo — skip re-render when nothing visible changed
 *
 * @param {Object} prevProps
 * @param {Object} nextProps
 * @returns {boolean}
 */
function arePropsEqual(prevProps, nextProps) {
  const ids = (arr) => (arr ?? []).map(it => it.id).sort().join(',');

  if (ids(prevProps.selectedIterations) !== ids(nextProps.selectedIterations)) return false;
  if (ids(prevProps.displayedIterations) !== ids(nextProps.displayedIterations)) return false;

  if (
    prevProps.onOpenModal !== nextProps.onOpenModal ||
    prevProps.onOpenDisplayFilter !== nextProps.onOpenDisplayFilter ||
    prevProps.onOpenAnnotationModal !== nextProps.onOpenAnnotationModal ||
    prevProps.onOpenManageAnnotations !== nextProps.onOpenManageAnnotations ||
    prevProps.onRemoveIteration !== nextProps.onRemoveIteration ||
    prevProps.onExportCSV !== nextProps.onExportCSV ||
    prevProps.exporting !== nextProps.exporting
  ) return false;

  return true;
}

// Wrap with memo to prevent unnecessary re-renders when parent updates
export default React.memo(CompactHeaderWithIterations, arePropsEqual);
