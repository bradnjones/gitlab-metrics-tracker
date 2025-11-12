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
  padding: 12px 12px;

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    padding: 8px 8px;
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
 * Iteration chips section
 *
 * @component
 */
const IterationChipsSection = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.xs};
  flex: 1;
  min-width: 0;
  overflow-x: auto;

  /* Hide scrollbar but keep functionality */
  scrollbar-width: none;
  -ms-overflow-style: none;

  &::-webkit-scrollbar {
    display: none;
  }

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    width: 100%;
    order: 3;
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
  gap: ${props => props.theme.spacing.xs};
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(8px);
  color: white;
  padding: 4px 8px;
  border-radius: 999px;
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
              const baseTitle = iteration.title || iteration.iterationCadence?.title || `Sprint ${iteration.iid}` || iteration.id;
              const endDate = iteration.dueDate ? formatDate(iteration.dueDate) : '';
              const displayTitle = endDate ? `${baseTitle} (${endDate})` : baseTitle;

              return (
                <HeaderIterationChip key={iteration.id}>
                  {displayTitle}
                  <HeaderChipRemoveButton
                    onClick={() => handleRemove(iteration.id)}
                    aria-label={`Remove ${displayTitle}`}
                    type="button"
                  >
                    ×
                  </HeaderChipRemoveButton>
                </HeaderIterationChip>
              );
            })
          )}
        </IterationChipsSection>

        <HeaderChangeButton onClick={handleChangeClick} type="button">
          Change Sprints
        </HeaderChangeButton>
      </CompactHeaderContent>
    </CompactHeader>
  );
}
