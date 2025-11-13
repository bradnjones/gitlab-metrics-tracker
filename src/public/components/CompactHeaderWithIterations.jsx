/**
 * CompactHeaderWithIterations Component
 *
 * Unified header combining branding and iteration selection.
 * Reduces header height from 172px to 56px (~67% reduction).
 *
 * Design specifications:
 * - Gradient: 135deg, #3b82f6 → #2563eb
 * - Padding: 12px 24px (desktop), 8px 16px (mobile)
 * - Height: ~56px (desktop), ~48px+ (mobile with wrapping)
 * - Chips: Translucent white with backdrop blur
 * - Button: White background with primary text color
 *
 * @param {Object} props
 * @param {Array<{id: string, title: string, iterationCadence?: {title: string}, iid?: number}>} props.selectedIterations - Selected iterations
 * @param {Function} props.onRemoveIteration - Callback when iteration chip removed
 * @param {Function} props.onOpenModal - Callback when "Change Sprints" clicked
 * @returns {JSX.Element} Compact header component
 */

import styled from 'styled-components';
import React, { useState } from 'react';
import CacheStatus from './CacheStatus.jsx';
import RefreshButton from './RefreshButton.jsx';

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
  justify-content: space-between;
  gap: ${props => props.theme.spacing.md};

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    flex-wrap: wrap;
    gap: ${props => props.theme.spacing.sm};
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
 * Compact title
 *
 * @component
 */
const CompactTitle = styled.h1`
  font-size: ${props => props.theme.typography.fontSize.xl};
  font-weight: ${props => props.theme.typography.fontWeight.bold};
  margin: 0;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

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
 * Iteration chips section with multi-row wrapping
 *
 * @component
 */
const IterationChipsSection = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  min-width: 0;

  /* Enable multi-row wrapping */
  flex-wrap: wrap;

  /* Constrain to max 2 rows on desktop */
  max-height: 60px;
  overflow-y: auto;

  /* Thin scrollbar for overflow scenarios */
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.5) transparent;

  &::-webkit-scrollbar {
    width: 4px;
    height: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.5);
    border-radius: 2px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    width: 100%;
    order: 3;
    max-height: none;
    overflow-y: visible;
  }
`;

/**
 * Translucent iteration chip for header
 *
 * @component
 */
const HeaderIterationChip = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(8px);
  color: white;
  padding: 2px 5px;
  border-radius: 6px;
  font-size: ${props => props.theme.typography.fontSize.xs};
  font-weight: ${props => props.theme.typography.fontWeight.medium};
  white-space: nowrap;
  border: 1px solid rgba(255, 255, 255, 0.3);
  transition: background ${props => props.theme.transitions.fast} ${props => props.theme.transitions.easing};

  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

/**
 * Remove button for header chips
 *
 * @component
 */
const HeaderChipRemoveButton = styled.button`
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 0;
  margin: 0;
  font-size: ${props => props.theme.typography.fontSize.base};
  line-height: 1;
  opacity: 0.8;
  transition: opacity ${props => props.theme.transitions.fast} ${props => props.theme.transitions.easing};

  &:hover {
    opacity: 1;
  }

  &:focus {
    outline: 2px solid white;
    outline-offset: 2px;
    border-radius: ${props => props.theme.borderRadius.sm};
  }
`;

/**
 * Empty chips message
 *
 * @component
 */
const EmptyChipsMessage = styled.span`
  font-size: ${props => props.theme.typography.fontSize.sm};
  font-style: italic;
  opacity: 0.7;
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
 * CompactHeaderWithIterations Component
 *
 * @param {Object} props
 * @param {Array<{id: string, title: string, iterationCadence?: {title: string}, iid?: number}>} props.selectedIterations
 * @param {Function} props.onRemoveIteration
 * @param {Function} props.onOpenModal
 * @returns {JSX.Element}
 */
export default function CompactHeaderWithIterations({
  selectedIterations = [],
  onRemoveIteration,
  onOpenModal
}) {
  // State to trigger cache status refresh
  const [cacheRefreshKey, setCacheRefreshKey] = useState(0);

  /**
   * Format date to short MM/DD format matching graph labels
   * @param {string} dateString - ISO date string
   * @returns {string} Formatted date string (e.g., "10/26")
   */
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  /**
   * Get cadence initials for compact display
   * @param {string} title - Cadence title (e.g., "Devs Sprint")
   * @returns {string} Initials (e.g., "DS")
   */
  const getCadenceInitials = (title) => {
    if (!title) return '';
    return title
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase();
  };

  /**
   * Handle remove iteration button click
   * @param {string} iterationId - ID of iteration to remove
   */
  const handleRemove = (iterationId) => {
    if (onRemoveIteration) {
      onRemoveIteration(iterationId);
    }
  };

  /**
   * Handle change sprints button click
   */
  const handleChangeClick = () => {
    if (onOpenModal) {
      onOpenModal();
    }
  };

  /**
   * Handle cache refresh complete
   * Triggers cache status component to refetch data
   */
  const handleRefreshComplete = () => {
    setCacheRefreshKey(prev => prev + 1);
  };

  return (
    <CompactHeader>
      <CompactHeaderContent>
        <BrandingSection>
          <CompactTitle>GitLab Sprint Metrics</CompactTitle>
          <CompactSubtitle>Track performance with context</CompactSubtitle>
        </BrandingSection>

        <IterationChipsSection>
          {selectedIterations.length === 0 ? (
            <EmptyChipsMessage>No sprints selected</EmptyChipsMessage>
          ) : (
            selectedIterations.map((iteration) => {
              // Full title for tooltip
              const baseTitle = iteration.title || iteration.iterationCadence?.title || `Sprint ${iteration.iid}` || iteration.id;
              const fullTitle = iteration.dueDate ? `${baseTitle} (${formatDate(iteration.dueDate)})` : baseTitle;

              // Compact display: "DS 10/25" format
              const cadenceInitials = getCadenceInitials(iteration.iterationCadence?.title);
              const endDate = iteration.dueDate ? formatDate(iteration.dueDate) : '';
              const displayTitle = cadenceInitials && endDate ? `${cadenceInitials} ${endDate}` : fullTitle;

              return (
                <HeaderIterationChip key={iteration.id} title={fullTitle}>
                  {displayTitle}
                  <HeaderChipRemoveButton
                    onClick={() => handleRemove(iteration.id)}
                    aria-label={`Remove ${fullTitle}`}
                    type="button"
                  >
                    ×
                  </HeaderChipRemoveButton>
                </HeaderIterationChip>
              );
            })
          )}
        </IterationChipsSection>

        <ActionsSection>
          <CacheManagementSection>
            <CacheStatus key={cacheRefreshKey} />
            <RefreshButton onRefreshComplete={handleRefreshComplete} />
          </CacheManagementSection>

          <HeaderChangeButton onClick={handleChangeClick} type="button">
            Change Sprints
          </HeaderChangeButton>
        </ActionsSection>
      </CompactHeaderContent>
    </CompactHeader>
  );
}
