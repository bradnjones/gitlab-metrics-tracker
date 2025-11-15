/**
 * AnnotationModal Styled Components
 * Preserves exact visual design from prototype
 *
 * Design Reference: /Users/brad/dev/smi/gitlab-sprint-metrics/
 * - Modal structure: src/public/index.html (lines 259-325)
 * - Styling: src/public/css/styles.css (lines 476-580)
 */

import styled from 'styled-components';

/**
 * Modal overlay - Semi-transparent backdrop that covers entire viewport
 * Clicking overlay closes the modal
 * @component
 */
export const ModalOverlay = styled.div`
  /* Layout */
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${props => props.theme.spacing.md};

  /* Visual */
  background: rgba(0, 0, 0, 0.5);
  z-index: ${props => props.theme.zIndex.modal};
`;

/**
 * Modal dialog container
 * @component
 */
export const Modal = styled.div`
  /* Layout */
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;

  /* Visual */
  background: ${props => props.theme.colors.bgPrimary};
  border-radius: ${props => props.theme.borderRadius.xl};
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
`;

/**
 * Modal header with title and close button
 * @component
 */
export const ModalHeader = styled.div`
  /* Layout */
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${props => props.theme.spacing.lg};

  /* Visual */
  border-bottom: 1px solid ${props => props.theme.colors.border};

  h3 {
    font-size: ${props => props.theme.typography.fontSize['2xl']};
    margin: 0;
    color: ${props => props.theme.colors.textPrimary};
    font-weight: ${props => props.theme.typography.fontWeight.semibold};
  }
`;

/**
 * Close button (×) - positioned in header
 * @component
 */
export const CloseButton = styled.button`
  /* Reset */
  background: none;
  border: none;
  padding: 0;

  /* Visual */
  font-size: 2rem;
  line-height: 1;
  color: ${props => props.theme.colors.textSecondary};
  cursor: pointer;

  /* Interaction */
  transition: color ${props => props.theme.transitions.normal} ${props => props.theme.transitions.easing};

  &:hover {
    color: ${props => props.theme.colors.textPrimary};
  }

  &:focus {
    outline: 2px solid ${props => props.theme.colors.primary};
    outline-offset: 2px;
  }
`;

/**
 * Modal body containing form
 * @component
 */
export const ModalBody = styled.form`
  padding: ${props => props.theme.spacing.lg};
`;

/**
 * Modal footer with action buttons
 * @component
 */
export const ModalFooter = styled.div`
  /* Layout */
  display: flex;
  justify-content: flex-end;
  gap: ${props => props.theme.spacing.md};
  padding: ${props => props.theme.spacing.lg};
  border-top: 1px solid ${props => props.theme.colors.border};
`;

/**
 * Form group - wrapper for label + input
 * @component
 */
export const FormGroup = styled.div`
  margin-bottom: ${props => props.theme.spacing.lg};

  label {
    display: block;
    margin-bottom: ${props => props.theme.spacing.sm};
    font-weight: ${props => props.theme.typography.fontWeight.medium};
    color: ${props => props.theme.colors.textPrimary};
    font-size: ${props => props.theme.typography.fontSize.base};
  }
`;

/**
 * Text input field (also used for date inputs)
 * @component
 */
export const Input = styled.input`
  /* Layout */
  width: 100%;
  padding: 0.75rem;

  /* Visual */
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.md};
  font-size: ${props => props.theme.typography.fontSize.base};
  font-family: inherit;
  color: ${props => props.theme.colors.textPrimary};
  background: ${props => props.theme.colors.bgPrimary};

  /* Interaction */
  transition: border-color ${props => props.theme.transitions.normal} ${props => props.theme.transitions.easing};

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &::placeholder {
    color: ${props => props.theme.colors.textSecondary};
    opacity: 0.6;
  }
`;

/**
 * Textarea field for description
 * @component
 */
export const Textarea = styled.textarea`
  /* Layout */
  width: 100%;
  padding: 0.75rem;
  resize: vertical;
  min-height: 80px;

  /* Visual */
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.md};
  font-size: ${props => props.theme.typography.fontSize.base};
  font-family: inherit;
  color: ${props => props.theme.colors.textPrimary};
  background: ${props => props.theme.colors.bgPrimary};
  line-height: ${props => props.theme.typography.lineHeight.normal};

  /* Interaction */
  transition: border-color ${props => props.theme.transitions.normal} ${props => props.theme.transitions.easing};

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &::placeholder {
    color: ${props => props.theme.colors.textSecondary};
    opacity: 0.6;
  }
`;

/**
 * Select dropdown field
 * @component
 */
export const Select = styled.select`
  /* Layout */
  width: 100%;
  padding: 0.75rem;

  /* Visual */
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.md};
  font-size: ${props => props.theme.typography.fontSize.base};
  font-family: inherit;
  color: ${props => props.theme.colors.textPrimary};
  background: ${props => props.theme.colors.bgPrimary};
  cursor: pointer;

  /* Interaction */
  transition: border-color ${props => props.theme.transitions.normal} ${props => props.theme.transitions.easing};

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  option {
    padding: ${props => props.theme.spacing.sm};
  }
`;

/**
 * Form row for 2-column layout (Type + Impact)
 * @component
 */
export const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${props => props.theme.spacing.md};

  /* Responsive: Stack on mobile */
  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    grid-template-columns: 1fr;
  }
`;

/**
 * Checkbox group container
 * @component
 */
export const CheckboxGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${props => props.theme.spacing.md};

  label {
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.sm};
    font-weight: normal;
    cursor: pointer;

    /* Override FormGroup label styles */
    margin-bottom: 0;
  }
`;

/**
 * Checkbox input
 * @component
 */
export const Checkbox = styled.input.attrs({ type: 'checkbox' })`
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: ${props => props.theme.colors.primary};

  &:focus {
    outline: 2px solid ${props => props.theme.colors.primary};
    outline-offset: 2px;
  }
`;

/**
 * Primary button (Save)
 * @component
 */
export const PrimaryButton = styled.button`
  /* Layout */
  padding: 0.75rem 1.5rem;

  /* Visual */
  background: ${props => props.theme.colors.primary};
  color: white;
  border: none;
  border-radius: ${props => props.theme.borderRadius.lg};
  font-size: ${props => props.theme.typography.fontSize.base};
  font-weight: ${props => props.theme.typography.fontWeight.medium};
  cursor: pointer;

  /* Interaction */
  transition: all ${props => props.theme.transitions.normal} ${props => props.theme.transitions.easing};

  &:hover:not(:disabled) {
    background: ${props => props.theme.colors.primaryDark};
    transform: translateY(-1px);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    background: ${props => props.theme.colors.textSecondary};
    cursor: not-allowed;
    opacity: 0.5;
  }

  &:focus {
    outline: 2px solid ${props => props.theme.colors.primary};
    outline-offset: 2px;
  }
`;

/**
 * Secondary button (Cancel)
 * @component
 */
export const SecondaryButton = styled.button`
  /* More compact padding */
  padding: 0.5rem 1rem;
  min-width: 70px;

  /* Outlined style instead of filled */
  background: transparent;
  color: ${props => props.theme.colors.primary};
  border: 1.5px solid ${props => props.theme.colors.primary};
  border-radius: ${props => props.theme.borderRadius.md};

  /* Typography */
  font-size: ${props => props.theme.typography.fontSize.sm};
  font-weight: ${props => props.theme.typography.fontWeight.semibold};
  cursor: pointer;

  /* Smooth transitions */
  transition: all ${props => props.theme.transitions.fast} ${props => props.theme.transitions.easing};

  &:hover {
    background: ${props => props.theme.colors.primary};
    color: white;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
  }

  &:active {
    transform: translateY(0);
  }

  &:focus {
    outline: 2px solid ${props => props.theme.colors.primary};
    outline-offset: 2px;
  }
`;

/**
 * Danger button (Delete)
 * @component
 */
export const DangerButton = styled.button`
  /* More compact padding */
  padding: 0.5rem 1rem;
  min-width: 70px;

  /* Outlined style (not filled red - too aggressive) */
  background: transparent;
  color: ${props => props.theme.colors.danger};
  border: 1.5px solid ${props => props.theme.colors.danger};
  border-radius: ${props => props.theme.borderRadius.md};

  /* Typography */
  font-size: ${props => props.theme.typography.fontSize.sm};
  font-weight: ${props => props.theme.typography.fontWeight.semibold};
  cursor: pointer;

  /* Smooth transitions */
  transition: all ${props => props.theme.transitions.fast} ${props => props.theme.transitions.easing};

  &:hover:not(:disabled) {
    background: ${props => props.theme.colors.danger};
    color: white;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(239, 68, 68, 0.25);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    background: transparent;
    border-color: ${props => props.theme.colors.textSecondary};
    color: ${props => props.theme.colors.textSecondary};
    cursor: not-allowed;
    opacity: 0.5;
  }

  &:focus {
    outline: 2px solid ${props => props.theme.colors.danger};
    outline-offset: 2px;
  }
`;
