/**
 * AnnotationsManagementModal Component
 * Modal dialog for managing (viewing, editing, deleting) annotations
 *
 * Features:
 * - Display all annotations in a scrollable list
 * - Each annotation shows: title, date, type, impact, description preview, affected metrics
 * - Edit and Delete buttons for each annotation
 * - Add Annotation button in footer
 * - Loading, empty, and error states
 * - Escape key to close
 * - Body scroll lock when open
 * - Click overlay to close
 *
 * Design Reference: UX/UI Design Agent proposal
 * - Modal structure: Based on AnnotationModal.jsx
 * - List layout: Card-based with left accent bar (impact color)
 */

import { useState, useEffect } from 'react';
import {
  ModalOverlay,
  Modal,
  ModalHeader,
  CloseButton,
  ModalFooter,
  PrimaryButton,
  SecondaryButton,
  DangerButton,
} from './AnnotationModal.styles.jsx';
import {
  ScrollableList,
  AnnotationListItem,
  AnnotationContent,
  AnnotationTitle,
  AnnotationMeta,
  DescriptionPreview,
  AffectedMetricsRow,
  ActionButtonsGroup,
  EmptyState,
  EmptyStateMessage,
  LoadingState,
  ErrorState,
  ErrorMessage,
} from './AnnotationsManagementModal.styles.jsx';

/**
 * AnnotationsManagementModal - Modal dialog for managing annotations
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is visible
 * @param {Function} props.onClose - Callback when modal closes
 * @param {Function} props.onEdit - Callback when Edit clicked (passes annotation object)
 * @param {Function} props.onDelete - Callback when Delete confirmed (passes annotation ID)
 * @param {Function} props.onCreate - Callback when Add Annotation clicked
 * @returns {JSX.Element|null}
 */
export default function AnnotationsManagementModal({ isOpen, onClose, onEdit, onDelete, onCreate }) {
  const [annotations, setAnnotations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch annotations when modal opens
   */
  useEffect(() => {
    if (isOpen) {
      fetchAnnotations();
    }
  }, [isOpen]);

  /**
   * Prevent body scroll when modal is open
   */
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  /**
   * Close modal on Escape key
   */
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  /**
   * Fetch annotations from API
   */
  const fetchAnnotations = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/annotations');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setAnnotations(data);
    } catch (err) {
      console.error('Error fetching annotations:', err);
      setError('Failed to load annotations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle Edit button click
   * @param {Object} annotation - Annotation to edit
   */
  const handleEdit = (annotation) => {
    if (onEdit) {
      onEdit(annotation);
    }
  };

  /**
   * Handle Delete button click
   * @param {string} annotationId - ID of annotation to delete
   */
  const handleDelete = (annotationId) => {
    if (onDelete) {
      if (window.confirm('Are you sure you want to delete this annotation?')) {
        onDelete(annotationId);
      }
    }
  };

  /**
   * Handle Add Annotation button click
   */
  const handleCreate = () => {
    if (onCreate) {
      onCreate();
    }
  };

  /**
   * Handle overlay click (close modal)
   * @param {Event} e - Click event
   */
  const handleOverlayClick = (e) => {
    // Only close if clicking the overlay itself, not the modal content
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  /**
   * Format affected metrics for display
   * @param {Array<string>} metrics - Array of metric IDs
   * @returns {string} Formatted metrics string
   */
  const formatAffectedMetrics = (metrics) => {
    if (!metrics || metrics.length === 0) return 'None';

    const metricLabels = {
      velocity: 'Velocity',
      throughput: 'Throughput',
      cycle_time_avg: 'Cycle Time',
      deployment_frequency: 'Deployment Frequency',
      lead_time_avg: 'Lead Time',
      mttr_avg: 'MTTR',
      change_failure_rate: 'Change Failure Rate',
    };

    return metrics.map(m => metricLabels[m] || m).join(', ');
  };

  /**
   * Format date for display
   * @param {string} dateString - ISO date string
   * @returns {string} Formatted date (e.g., "Jan 15, 2024")
   */
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  /**
   * Capitalize first letter
   * @param {string} str - String to capitalize
   * @returns {string} Capitalized string
   */
  const capitalize = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={handleOverlayClick} data-testid="modal-overlay">
      <Modal
        style={{ maxWidth: '800px' }}
        onClick={(e) => e.stopPropagation()}
        data-testid="modal-content"
      >
        <ModalHeader>
          <h3>Manage Annotations ({annotations.length})</h3>
          <CloseButton type="button" onClick={onClose} aria-label="Close modal">
            &times;
          </CloseButton>
        </ModalHeader>

        {loading ? (
          <LoadingState>Loading annotations...</LoadingState>
        ) : error ? (
          <ErrorState>
            <ErrorMessage>{error}</ErrorMessage>
            <SecondaryButton type="button" onClick={fetchAnnotations}>
              Retry
            </SecondaryButton>
          </ErrorState>
        ) : annotations.length === 0 ? (
          <EmptyState>
            <EmptyStateMessage>
              No annotations yet. Add annotations to track events and their impact on metrics.
            </EmptyStateMessage>
            <PrimaryButton type="button" onClick={handleCreate}>
              Add Annotation
            </PrimaryButton>
          </EmptyState>
        ) : (
          <ScrollableList>
            {annotations.map((annotation) => (
              <AnnotationListItem key={annotation.id} $impact={annotation.impact}>
                <AnnotationContent>
                  <AnnotationTitle>{annotation.title}</AnnotationTitle>
                  <AnnotationMeta>
                    <span>{formatDate(annotation.date)}</span>
                    <span>{capitalize(annotation.type)}</span>
                    <span>{capitalize(annotation.impact)}</span>
                  </AnnotationMeta>
                  {annotation.description && (
                    <DescriptionPreview>{annotation.description}</DescriptionPreview>
                  )}
                  <AffectedMetricsRow>
                    Affected: {formatAffectedMetrics(annotation.affectedMetrics)}
                  </AffectedMetricsRow>
                </AnnotationContent>
                <ActionButtonsGroup>
                  <SecondaryButton
                    type="button"
                    onClick={() => handleEdit(annotation)}
                    aria-label={`Edit annotation: ${annotation.title}`}
                  >
                    Edit
                  </SecondaryButton>
                  <DangerButton
                    type="button"
                    onClick={() => handleDelete(annotation.id)}
                    aria-label={`Delete annotation: ${annotation.title}`}
                  >
                    Delete
                  </DangerButton>
                </ActionButtonsGroup>
              </AnnotationListItem>
            ))}
          </ScrollableList>
        )}

        <ModalFooter>
          <PrimaryButton type="button" onClick={handleCreate}>
            Add Annotation
          </PrimaryButton>
          <SecondaryButton type="button" onClick={onClose}>
            Close
          </SecondaryButton>
        </ModalFooter>
      </Modal>
    </ModalOverlay>
  );
}
