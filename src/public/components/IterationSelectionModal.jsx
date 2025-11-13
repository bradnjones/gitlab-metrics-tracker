/**
 * IterationSelectionModal Component
 *
 * Modal overlay for selecting sprint iterations.
 * Uses existing IterationSelector component in a modal dialog.
 *
 * Features:
 * - Full-screen overlay with backdrop
 * - Centered modal dialog
 * - Close button in header
 * - Cancel and Apply buttons in footer
 * - Click outside to close
 * - ESC key to close
 * - Embeds IterationSelector component
 * - Theme-based styling
 *
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {Function} props.onClose - Callback when modal is closed (no changes)
 * @param {Function} props.onApply - Callback when Apply is clicked (receives selected IDs)
 * @param {Array<string>} props.selectedIterationIds - Currently selected iteration IDs
 * @returns {JSX.Element|null} Rendered modal or null if not open
 */

import { useState, useEffect } from 'react';
import styled from 'styled-components';
import IterationSelector from './IterationSelector.jsx';

/**
 * Full-screen overlay backdrop
 *
 * @component
 */
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: ${props => props.theme.zIndex?.modal || 1000};
  padding: ${props => props.theme.spacing.md};
  overflow-y: auto;
`;

/**
 * Modal dialog container
 *
 * @component
 */
const ModalDialog = styled.div`
  background: ${props => props.theme.colors.bgPrimary};
  border-radius: ${props => props.theme.borderRadius.xl};
  box-shadow: ${props => props.theme.shadows.lg};
  max-width: 900px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  position: relative;

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    max-width: 100%;
    max-height: 100vh;
    border-radius: 0;
  }
`;

/**
 * Modal header with title and close button
 *
 * @component
 */
const ModalHeader = styled.div`
  padding: ${props => props.theme.spacing.lg} ${props => props.theme.spacing.xl};
  border-bottom: 1px solid ${props => props.theme.colors.border};
  display: flex;
  align-items: center;
  justify-content: space-between;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
  }
`;

/**
 * Modal title
 *
 * @component
 */
const ModalTitle = styled.h2`
  color: ${props => props.theme.colors.textPrimary};
  font-size: ${props => props.theme.typography.fontSize['2xl']};
  font-weight: ${props => props.theme.typography.fontWeight.bold};
  margin: 0;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: ${props => props.theme.typography.fontSize.xl};
  }
`;

/**
 * Close button (X)
 *
 * @component
 */
const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.colors.textSecondary};
  cursor: pointer;
  padding: ${props => props.theme.spacing.xs};
  font-size: ${props => props.theme.typography.fontSize['2xl']};
  line-height: 1;
  transition: color ${props => props.theme.transitions.normal} ${props => props.theme.transitions.easing};

  &:hover {
    color: ${props => props.theme.colors.textPrimary};
  }

  &:focus {
    outline: 2px solid ${props => props.theme.colors.primary};
    outline-offset: 2px;
    border-radius: ${props => props.theme.borderRadius.sm};
  }
`;

/**
 * Modal body content with scrolling
 *
 * @component
 */
const ModalBody = styled.div`
  padding: ${props => props.theme.spacing.xl};
  overflow-y: auto;
  flex: 1;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.lg};
  }
`;

/**
 * Modal footer with action buttons
 *
 * @component
 */
const ModalFooter = styled.div`
  padding: ${props => props.theme.spacing.lg} ${props => props.theme.spacing.xl};
  border-top: 1px solid ${props => props.theme.colors.border};
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: ${props => props.theme.spacing.md};

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
    flex-direction: column-reverse;
    gap: ${props => props.theme.spacing.sm};
  }
`;

/**
 * Cancel button
 *
 * @component
 */
const CancelButton = styled.button`
  background: ${props => props.theme.colors.bgSecondary};
  color: ${props => props.theme.colors.textPrimary};
  border: 1px solid ${props => props.theme.colors.border};
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.lg};
  font-size: ${props => props.theme.typography.fontSize.base};
  font-weight: ${props => props.theme.typography.fontWeight.semibold};
  border-radius: ${props => props.theme.borderRadius.md};
  cursor: pointer;
  transition: background ${props => props.theme.transitions.normal} ${props => props.theme.transitions.easing};

  &:hover {
    background: ${props => props.theme.colors.bgTertiary};
  }

  &:focus {
    outline: 2px solid ${props => props.theme.colors.primary};
    outline-offset: 2px;
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    width: 100%;
  }
`;

/**
 * Apply button
 *
 * @component
 */
const ApplyButton = styled.button`
  background: ${props => props.theme.colors.primary};
  color: white;
  border: none;
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.lg};
  font-size: ${props => props.theme.typography.fontSize.base};
  font-weight: ${props => props.theme.typography.fontWeight.semibold};
  border-radius: ${props => props.theme.borderRadius.md};
  cursor: pointer;
  transition: background ${props => props.theme.transitions.normal} ${props => props.theme.transitions.easing};

  &:hover {
    background: ${props => props.theme.colors.primaryDark};
  }

  &:focus {
    outline: 2px solid ${props => props.theme.colors.primary};
    outline-offset: 2px;
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    width: 100%;
  }
`;

/**
 * IterationSelectionModal Component
 *
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {Function} props.onClose - Callback when modal is closed
 * @param {Function} props.onApply - Callback when Apply is clicked (receives array of iteration objects)
 * @param {Array<string>} props.selectedIterationIds - Currently selected iteration IDs
 * @returns {JSX.Element|null} Rendered modal or null
 */
export default function IterationSelectionModal({
  isOpen = false,
  onClose,
  onApply,
  selectedIterationIds = []
}) {
  const [tempSelectedIds, setTempSelectedIds] = useState(selectedIterationIds);
  const [allIterations, setAllIterations] = useState([]);
  const [prefetchedIds, setPrefetchedIds] = useState(new Set());
  const [selectorKey, setSelectorKey] = useState(0);

  // Update temp selection when prop changes
  useEffect(() => {
    setTempSelectedIds(selectedIterationIds);
  }, [selectedIterationIds]);

  // Fetch all iterations to get full data for selected IDs
  // Also reset tempSelectedIds when modal opens to sync with current selections
  useEffect(() => {
    if (isOpen) {
      // Reset temp selections to match current selections when modal opens
      setTempSelectedIds(selectedIterationIds);

      // Increment key to force IterationSelector to remount with fresh props
      setSelectorKey(prev => prev + 1);

      const fetchIterations = async () => {
        try {
          const response = await fetch('/api/iterations');
          const data = await response.json();
          setAllIterations(data.iterations || []);
        } catch (error) {
          console.error('Failed to fetch iterations:', error);
          setAllIterations([]);
        }
      };
      fetchIterations();
    } else {
      // Reset prefetch tracking when modal closes
      setPrefetchedIds(new Set());
    }
  }, [isOpen, selectedIterationIds]);

  // Background prefetch: When user selects new iterations, start fetching their data
  // This populates the cache so data loads instantly when they click "Apply"
  useEffect(() => {
    if (!isOpen) return;

    // Find newly selected iterations (not yet prefetched)
    const newlySelected = tempSelectedIds.filter(id => !prefetchedIds.has(id));

    if (newlySelected.length === 0) return;

    // Prefetch data for newly selected iterations
    newlySelected.forEach(async (iterationId) => {
      try {
        // Mark as prefetching to avoid duplicate requests
        setPrefetchedIds(prev => new Set([...prev, iterationId]));

        // Trigger cache population by calling velocity endpoint
        // We don't need the response - just want to populate the cache
        await fetch(`/api/metrics/velocity?iterations=${encodeURIComponent(iterationId)}`);

        // Note: We're ignoring the response. The goal is cache population, not UI update.
      } catch (error) {
        // Silent failure - prefetch is optional optimization
        // If it fails, data will be fetched normally when user clicks Apply
        console.debug(`Background prefetch failed for ${iterationId}:`, error.message);
      }
    });
  }, [tempSelectedIds, isOpen, prefetchedIds]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  /**
   * Handle backdrop click to close modal
   * @param {Event} event - Click event
   */
  const handleBackdropClick = (event) => {
    // Only close if clicking the backdrop itself, not the dialog
    if (event.target === event.currentTarget) {
      handleClose();
    }
  };

  /**
   * Handle close button click
   */
  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  /**
   * Handle Apply button click
   */
  const handleApply = () => {
    if (onApply) {
      // Find full iteration objects for selected IDs
      const selectedIterations = allIterations.filter(iter =>
        tempSelectedIds.includes(iter.id)
      );
      onApply(selectedIterations);
    }
  };

  /**
   * Handle iteration selection change from IterationSelector
   * @param {Array<string>} iterationIds - Selected iteration IDs
   */
  const handleSelectionChange = (iterationIds) => {
    setTempSelectedIds(iterationIds);
  };

  // Don't render if not open
  if (!isOpen) {
    return null;
  }

  return (
    <ModalOverlay onClick={handleBackdropClick}>
      <ModalDialog onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>Select Sprint Iterations</ModalTitle>
          <CloseButton onClick={handleClose} aria-label="Close modal" type="button">
            ×
          </CloseButton>
        </ModalHeader>

        <ModalBody>
          <IterationSelector
            key={selectorKey} // Force remount when modal opens to get fresh state
            onSelectionChange={handleSelectionChange}
            initialSelectedIds={tempSelectedIds}
          />
        </ModalBody>

        <ModalFooter>
          <CancelButton onClick={handleClose} type="button">
            Cancel
          </CancelButton>
          <ApplyButton onClick={handleApply} type="button">
            Apply
          </ApplyButton>
        </ModalFooter>
      </ModalDialog>
    </ModalOverlay>
  );
}
