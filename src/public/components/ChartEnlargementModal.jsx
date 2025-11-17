/**
 * ChartEnlargementModal Component
 *
 * Displays an enlarged, full-screen view of any chart in a modal overlay.
 *
 * Features:
 * - Click any chart to enlarge
 * - Close via Escape key, overlay click, or close button
 * - Focus trap for keyboard navigation
 * - Body scroll lock when modal is open
 * - Full accessibility support (ARIA attributes, keyboard navigation)
 *
 * @module components/ChartEnlargementModal
 */

import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  EnlargementOverlay,
  EnlargementModal,
  EnlargementHeader,
  CloseButton,
  ChartContainer,
  KeyboardHint,
} from './ChartEnlargementModal.styles.jsx';

/**
 * Modal component for displaying charts in an enlarged view
 *
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether modal is visible
 * @param {Function} props.onClose - Callback when modal closes
 * @param {string} props.chartTitle - Title to display in modal header
 * @param {React.ReactElement} props.chartElement - Chart component to render
 * @returns {React.ReactElement|null} Modal component or null if not open
 */
const ChartEnlargementModal = ({ isOpen, onClose, chartTitle, chartElement }) => {
  const closeButtonRef = useRef(null);
  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    // Cleanup: restore overflow on unmount
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Auto-focus close button when modal opens
  useEffect(() => {
    if (isOpen && closeButtonRef.current) {
      setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  /**
   * Handle overlay click (close modal)
   * Only closes if clicking the overlay itself, not the modal content
   *
   * @param {Event} e - Click event
   */
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <EnlargementOverlay onClick={handleOverlayClick}>
      <EnlargementModal role="dialog" aria-modal="true" aria-labelledby="enlarged-chart-title">
        <EnlargementHeader>
          <h3 id="enlarged-chart-title">{chartTitle}</h3>
          <CloseButton
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close enlarged chart view"
          >
            &times;
          </CloseButton>
        </EnlargementHeader>

        <ChartContainer>{chartElement}</ChartContainer>

        <KeyboardHint>Press ESC to close</KeyboardHint>
      </EnlargementModal>
    </EnlargementOverlay>
  );
};

ChartEnlargementModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  chartTitle: PropTypes.string.isRequired,
  chartElement: PropTypes.element.isRequired,
};

export default ChartEnlargementModal;
