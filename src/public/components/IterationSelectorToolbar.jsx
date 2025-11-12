/**
 * IterationSelectorToolbar Component
 *
 * Persistent toolbar for displaying and managing selected sprint iterations.
 * Appears at the top of the dashboard with iteration chips and controls.
 *
 * Features:
 * - Displays selected iterations as chips with remove buttons
 * - Empty state message when no iterations selected
 * - "Change Iterations" button to open modal
 * - Sticky positioning at top of viewport
 * - Responsive design for all screen sizes
 * - Theme-based styling
 *
 * @param {Object} props - Component props
 * @param {Array<{id: string, title: string}>} props.selectedIterations - Array of selected iteration objects
 * @param {Function} props.onRemoveIteration - Callback when iteration chip is removed (receives iteration ID)
 * @param {Function} props.onOpenModal - Callback when "Change Iterations" button is clicked
 * @returns {JSX.Element} Rendered toolbar
 */

import styled from 'styled-components';

/**
 * Sticky toolbar container at top of viewport
 *
 * @component
 */
const ToolbarContainer = styled.div`
  position: sticky;
  top: 0;
  z-index: 100;
  background: ${props => props.theme.colors.bgPrimary};
  border-bottom: 1px solid ${props => props.theme.colors.border};
  box-shadow: ${props => props.theme.shadows.sm};
  padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  }
`;

/**
 * Inner content container with max-width
 *
 * @component
 */
const ToolbarContent = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${props => props.theme.spacing.md};
  flex-wrap: wrap;

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    flex-direction: column;
    align-items: stretch;
  }
`;

/**
 * Container for iteration chips
 *
 * @component
 */
const ChipsContainer = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
  flex-wrap: wrap;
  flex: 1;
  min-width: 0;
`;

/**
 * Individual iteration chip
 *
 * @component
 */
const IterationChip = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${props => props.theme.spacing.xs};
  background: ${props => props.theme.colors.primary};
  color: white;
  padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.sm};
  border-radius: ${props => props.theme.borderRadius.full};
  font-size: ${props => props.theme.typography.fontSize.sm};
  font-weight: ${props => props.theme.typography.fontWeight.medium};
  white-space: nowrap;
  box-shadow: ${props => props.theme.shadows.sm};
`;

/**
 * Remove button inside iteration chip
 *
 * @component
 */
const RemoveButton = styled.button`
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
 * Empty state message
 *
 * @component
 */
const EmptyMessage = styled.span`
  color: ${props => props.theme.colors.textSecondary};
  font-size: ${props => props.theme.typography.fontSize.sm};
  font-style: italic;
`;

/**
 * Change Iterations button
 *
 * @component
 */
const ChangeButton = styled.button`
  background: ${props => props.theme.colors.primary};
  color: white;
  border: none;
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  font-size: ${props => props.theme.typography.fontSize.sm};
  font-weight: ${props => props.theme.typography.fontWeight.semibold};
  border-radius: ${props => props.theme.borderRadius.md};
  cursor: pointer;
  white-space: nowrap;
  transition: background ${props => props.theme.transitions.normal} ${props => props.theme.transitions.easing};
  box-shadow: ${props => props.theme.shadows.sm};

  &:hover {
    background: ${props => props.theme.colors.primaryDark};
  }

  &:focus {
    outline: 2px solid ${props => props.theme.colors.primary};
    outline-offset: 2px;
  }

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    width: 100%;
  }
`;

/**
 * IterationSelectorToolbar Component
 *
 * @param {Object} props - Component props
 * @param {Array<{id: string, title: string}>} props.selectedIterations - Selected iterations
 * @param {Function} props.onRemoveIteration - Callback when iteration removed
 * @param {Function} props.onOpenModal - Callback when modal opened
 * @returns {JSX.Element} Rendered toolbar
 */
export default function IterationSelectorToolbar({
  selectedIterations = [],
  onRemoveIteration,
  onOpenModal
}) {
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
   * Handle change iterations button click
   */
  const handleChangeClick = () => {
    if (onOpenModal) {
      onOpenModal();
    }
  };

  return (
    <ToolbarContainer>
      <ToolbarContent>
        <ChipsContainer>
          {selectedIterations.length === 0 ? (
            <EmptyMessage>No sprints selected</EmptyMessage>
          ) : (
            selectedIterations.map((iteration) => {
              const displayTitle = iteration.title || iteration.iterationCadence?.title || `Sprint ${iteration.iid}` || iteration.id;
              return (
                <IterationChip key={iteration.id}>
                  {displayTitle}
                  <RemoveButton
                    onClick={() => handleRemove(iteration.id)}
                    aria-label={`Remove ${displayTitle}`}
                    type="button"
                  >
                    ×
                  </RemoveButton>
                </IterationChip>
              );
            })
          )}
        </ChipsContainer>

        <ChangeButton onClick={handleChangeClick} type="button">
          Change Iterations
        </ChangeButton>
      </ToolbarContent>
    </ToolbarContainer>
  );
}
