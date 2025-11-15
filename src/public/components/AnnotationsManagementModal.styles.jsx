/**
 * Styled components for Annotations Management Modal
 * Reuses modal components from AnnotationModal.styles.jsx
 */

import styled from 'styled-components';

/**
 * Scrollable list container for annotations
 * @component
 */
export const ScrollableList = styled.div`
  max-height: 50vh;
  overflow-y: auto;
  padding: ${props => props.theme.spacing.lg};
  margin: 0;

  /* Firefox scrollbar */
  scrollbar-width: thin;
  scrollbar-color: ${props => props.theme.colors.textSecondary} ${props => props.theme.colors.bgTertiary};

  /* Webkit scrollbar */
  &::-webkit-scrollbar {
    width: 10px;
  }

  &::-webkit-scrollbar-track {
    background: ${props => props.theme.colors.bgTertiary};
    border-radius: ${props => props.theme.borderRadius.md};
  }

  &::-webkit-scrollbar-thumb {
    background: ${props => props.theme.colors.textSecondary};
    border-radius: ${props => props.theme.borderRadius.md};
    border: 2px solid ${props => props.theme.colors.bgTertiary};
  }

  &::-webkit-scrollbar-thumb:hover {
    background: ${props => props.theme.colors.textPrimary};
  }
`;

/**
 * Individual annotation list item
 * @component
 */
export const AnnotationListItem = styled.div`
  display: flex;
  gap: ${props => props.theme.spacing.sm};
  padding: ${props => props.theme.spacing.md};
  margin-bottom: ${props => props.theme.spacing.md};

  /* Clean white background */
  background: ${props => props.theme.colors.bgPrimary};

  /* Use annotation's custom color for left border */
  border: 1px solid ${props => props.theme.colors.border};
  border-left: 4px solid ${props => props.$color || props.theme.colors.primary};

  border-radius: ${props => props.theme.borderRadius.md};
  box-shadow: ${props => props.theme.shadows.sm};

  /* Smoother transition */
  transition: all ${props => props.theme.transitions.normal} ${props => props.theme.transitions.easing};

  &:hover {
    /* Lift effect with stronger shadow */
    transform: translateY(-2px);
    box-shadow: ${props => props.theme.shadows.md};
    border-left-width: 5px;
  }

  &:last-child {
    margin-bottom: 0;
  }
`;

/**
 * Annotation content area (left side)
 * @component
 */
export const AnnotationContent = styled.div`
  flex: 1;
  min-width: 0; /* Allow text truncation */
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.sm};
`;

/**
 * Annotation title
 * @component
 */
export const AnnotationTitle = styled.h4`
  margin: 0;
  font-size: ${props => props.theme.typography.fontSize.lg};
  font-weight: ${props => props.theme.typography.fontWeight.semibold};
  color: ${props => props.theme.colors.textPrimary};
  line-height: ${props => props.theme.typography.lineHeight.tight};
  transition: color ${props => props.theme.transitions.fast} ${props => props.theme.transitions.easing};
`;

/**
 * Annotation meta information (date, type, impact)
 * @component
 */
export const AnnotationMeta = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
  font-size: ${props => props.theme.typography.fontSize.xs};
  color: ${props => props.theme.colors.textSecondary};
  line-height: ${props => props.theme.typography.lineHeight.normal};
  font-weight: ${props => props.theme.typography.fontWeight.medium};
  text-transform: uppercase;
  letter-spacing: 0.025em;

  span:not(:last-child)::after {
    content: '•';
    margin-left: ${props => props.theme.spacing.sm};
    opacity: 0.5;
  }
`;

/**
 * Description preview (truncated to 2 lines)
 * @component
 */
export const DescriptionPreview = styled.p`
  margin: 0;
  font-size: ${props => props.theme.typography.fontSize.sm};
  color: ${props => props.theme.colors.textSecondary};
  line-height: ${props => props.theme.typography.lineHeight.normal};
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
`;

/**
 * Affected metrics row
 * @component
 */
export const AffectedMetricsRow = styled.div`
  font-size: ${props => props.theme.typography.fontSize.xs};
  color: ${props => props.theme.colors.textSecondary};
  line-height: ${props => props.theme.typography.lineHeight.normal};
`;

/**
 * Action buttons group (right side)
 * @component
 */
export const ActionButtonsGroup = styled.div`
  display: flex;
  flex-direction: row;
  gap: ${props => props.theme.spacing.sm};
  align-items: center;
  flex-shrink: 0;
  margin-left: auto;

  @media (max-width: ${props => props.theme.breakpoints?.mobile || '768px'}) {
    flex-direction: column;
    width: 100%;
  }
`;

/**
 * Empty state container
 * @component
 */
export const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${props => props.theme.spacing.xxl};
  text-align: center;
  color: ${props => props.theme.colors.textSecondary};
  gap: ${props => props.theme.spacing.md};
`;

/**
 * Empty state message
 * @component
 */
export const EmptyStateMessage = styled.p`
  margin: 0;
  font-size: ${props => props.theme.typography.fontSize.base};
  color: ${props => props.theme.colors.textSecondary};
  line-height: ${props => props.theme.typography.lineHeight.relaxed};
  max-width: 400px;
`;

/**
 * Loading state container
 * @component
 */
export const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${props => props.theme.spacing.xxl};
  text-align: center;
  color: ${props => props.theme.colors.textSecondary};
  font-size: ${props => props.theme.typography.fontSize.base};
`;

/**
 * Error state container
 * @component
 */
export const ErrorState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${props => props.theme.spacing.xxl};
  text-align: center;
  gap: ${props => props.theme.spacing.md};
`;

/**
 * Error message
 * @component
 */
export const ErrorMessage = styled.p`
  margin: 0;
  font-size: ${props => props.theme.typography.fontSize.base};
  color: ${props => props.theme.colors.danger};
  line-height: ${props => props.theme.typography.lineHeight.relaxed};
`;
