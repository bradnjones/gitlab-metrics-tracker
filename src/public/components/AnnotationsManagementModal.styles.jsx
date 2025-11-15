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
  max-height: 60vh;
  overflow-y: auto;
  margin: ${props => props.theme.spacing.md} 0;

  /* Scrollbar styling */
  scrollbar-width: thin;
  scrollbar-color: ${props => props.theme.colors.border} transparent;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.borderRadius.md};
  }

  &::-webkit-scrollbar-thumb:hover {
    background: ${props => props.theme.colors.textSecondary};
  }
`;

/**
 * Individual annotation list item
 * @component
 */
export const AnnotationListItem = styled.div`
  display: flex;
  gap: ${props => props.theme.spacing.md};
  padding: ${props => props.theme.spacing.md};
  margin-bottom: ${props => props.theme.spacing.sm};
  background: ${props => props.theme.colors.bgPrimary};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.lg};
  border-left: 4px solid ${props => {
    switch (props.$impact) {
      case 'positive':
        return props.theme.colors.success;
      case 'negative':
        return props.theme.colors.danger;
      case 'neutral':
      default:
        return props.theme.colors.warning;
    }
  }};
  box-shadow: ${props => props.theme.shadows.sm};
  transition: all ${props => props.theme.transitions.normal} ${props => props.theme.transitions.easing};

  &:hover {
    background: ${props => props.theme.colors.bgTertiary};
    box-shadow: ${props => props.theme.shadows.md};
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
  gap: ${props => props.theme.spacing.xs};
`;

/**
 * Annotation title
 * @component
 */
export const AnnotationTitle = styled.h4`
  margin: 0;
  font-size: ${props => props.theme.typography.fontSize.base};
  font-weight: ${props => props.theme.typography.fontWeight.semibold};
  color: ${props => props.theme.colors.textPrimary};
  line-height: ${props => props.theme.typography.lineHeight.tight};
`;

/**
 * Annotation meta information (date, type, impact)
 * @component
 */
export const AnnotationMeta = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
  font-size: ${props => props.theme.typography.fontSize.sm};
  color: ${props => props.theme.colors.textSecondary};
  line-height: ${props => props.theme.typography.lineHeight.normal};

  span:not(:last-child)::after {
    content: '•';
    margin-left: ${props => props.theme.spacing.sm};
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
  flex-direction: column;
  gap: ${props => props.theme.spacing.sm};
  align-items: stretch;
  flex-shrink: 0;

  @media (max-width: ${props => props.theme.breakpoints?.mobile || '768px'}) {
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
