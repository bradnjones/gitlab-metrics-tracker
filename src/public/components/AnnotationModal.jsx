/**
 * AnnotationModal Component
 * Modal dialog for creating and editing sprint annotations
 *
 * Features:
 * - Create/Edit modes with form pre-population
 * - Required field validation (date, title, type, impact)
 * - Multi-select checkboxes for affected metrics
 * - Auto-focus on date field when modal opens
 * - Escape key to close modal
 * - Body scroll lock when modal is open
 * - Click overlay to close
 *
 * Design Reference: /Users/brad/dev/smi/gitlab-sprint-metrics/
 * - Modal structure: src/public/index.html (lines 259-325)
 * - Interaction: src/public/js/app.js (lines 156-260)
 */

import { useState, useEffect, useRef } from 'react';
import {
  ModalOverlay,
  Modal,
  ModalHeader,
  CloseButton,
  ModalBody,
  ModalFooter,
  FormGroup,
  Input,
  Textarea,
  Select,
  FormRow,
  CheckboxGroup,
  Checkbox,
  PrimaryButton,
  SecondaryButton,
  DangerButton,
} from './AnnotationModal.styles.jsx';

/**
 * Event type options for annotation
 */
const EVENT_TYPES = [
  { value: 'process', label: 'Process Change' },
  { value: 'team', label: 'Team Change' },
  { value: 'tooling', label: 'Tooling Update' },
  { value: 'external', label: 'External Factor' },
  { value: 'incident', label: 'Incident' },
];

/**
 * Impact options for annotation
 */
const IMPACT_OPTIONS = [
  { value: 'positive', label: 'Positive' },
  { value: 'negative', label: 'Negative' },
  { value: 'neutral', label: 'Neutral' },
];

/**
 * Available metrics that can be affected
 */
const AFFECTED_METRICS = [
  { value: 'velocity', label: 'Velocity' },
  { value: 'throughput', label: 'Throughput' },
  { value: 'cycle_time_avg', label: 'Cycle Time' },
  { value: 'deployment_frequency', label: 'Deployment Frequency' },
  { value: 'lead_time_avg', label: 'Lead Time' },
  { value: 'mttr_avg', label: 'MTTR' },
  { value: 'change_failure_rate', label: 'Change Failure Rate' },
];

/**
 * AnnotationModal - Modal dialog for creating/editing annotations
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is visible
 * @param {Function} props.onClose - Callback when modal closes
 * @param {Function} props.onSave - Callback when form is submitted with form data
 * @param {Function} [props.onDelete] - Callback when delete button is clicked (edit mode only)
 * @param {Object} [props.annotation] - Existing annotation for edit mode (null = create mode)
 * @returns {JSX.Element|null}
 */
export default function AnnotationModal({ isOpen, onClose, onSave, onDelete, annotation = null }) {
  const [formData, setFormData] = useState({
    date: '',
    title: '',
    description: '',
    type: '',
    impact: '',
    affectedMetrics: [],
    color: '#3b82f6', // Default blue color
  });

  const dateInputRef = useRef(null);
  const isEditMode = annotation !== null;

  // Populate form when editing existing annotation or reset when creating new
  useEffect(() => {
    if (isOpen) {
      if (annotation) {
        setFormData({
          date: annotation.date || '',
          title: annotation.title || '',
          description: annotation.description || '',
          type: annotation.type || '',
          impact: annotation.impact || '',
          affectedMetrics: annotation.affectedMetrics || [],
          color: annotation.color || '#3b82f6', // Use annotation color or default blue
        });
      } else {
        // Reset form when opening in create mode
        setFormData({
          date: new Date().toISOString().split('T')[0], // Default to today
          title: '',
          description: '',
          type: '',
          impact: '',
          affectedMetrics: [],
          color: '#3b82f6', // Default blue color
        });
      }
    }
  }, [annotation, isOpen]);

  // Auto-focus date field when modal opens
  useEffect(() => {
    if (isOpen && dateInputRef.current) {
      // Small delay to ensure modal is fully rendered
      setTimeout(() => {
        // Check ref is still valid (component not unmounted)
        if (dateInputRef.current) {
          dateInputRef.current.focus();
        }
      }, 100);
    }
  }, [isOpen]);

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

  // Prevent body scroll when modal is open
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
   * Handle form input changes
   * @param {Event} e - Input change event
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /**
   * Handle checkbox toggle for affected metrics
   * @param {string} metricValue - Metric identifier
   */
  const handleMetricToggle = (metricValue) => {
    setFormData((prev) => {
      const currentMetrics = prev.affectedMetrics;
      const isSelected = currentMetrics.includes(metricValue);

      return {
        ...prev,
        affectedMetrics: isSelected
          ? currentMetrics.filter((m) => m !== metricValue)
          : [...currentMetrics, metricValue],
      };
    });
  };

  /**
   * Handle form submission
   * @param {Event} e - Form submit event
   */
  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  /**
   * Handle delete button click
   * @param {Event} e - Click event
   */
  const handleDelete = (e) => {
    e.preventDefault();
    if (onDelete && annotation) {
      if (window.confirm('Are you sure you want to delete this annotation?')) {
        onDelete(annotation.id);
      }
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

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={handleOverlayClick}>
      <Modal>
        <ModalHeader>
          <h3>{isEditMode ? 'Edit Annotation' : 'Add Annotation'}</h3>
          <CloseButton type="button" onClick={onClose} aria-label="Close modal">
            &times;
          </CloseButton>
        </ModalHeader>

        <ModalBody onSubmit={handleSubmit}>
          {/* Date Field */}
          <FormGroup>
            <label htmlFor="date">Date</label>
            <Input
              ref={dateInputRef}
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              required
            />
          </FormGroup>

          {/* Title Field */}
          <FormGroup>
            <label htmlFor="title">Title</label>
            <Input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Brief description"
              required
            />
          </FormGroup>

          {/* Description Field */}
          <FormGroup>
            <label htmlFor="description">Description</label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Detailed information (optional)"
              rows={3}
            />
          </FormGroup>

          {/* Type + Impact Row */}
          <FormRow>
            {/* Type Field */}
            <FormGroup>
              <label htmlFor="type">Type</label>
              <Select id="type" name="type" value={formData.type} onChange={handleInputChange} required>
                <option value="">Select type</option>
                {EVENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </Select>
            </FormGroup>

            {/* Impact Field */}
            <FormGroup>
              <label htmlFor="impact">Impact</label>
              <Select id="impact" name="impact" value={formData.impact} onChange={handleInputChange} required>
                <option value="">Select impact</option>
                {IMPACT_OPTIONS.map((impact) => (
                  <option key={impact.value} value={impact.value}>
                    {impact.label}
                  </option>
                ))}
              </Select>
            </FormGroup>
          </FormRow>

          {/* Color Field */}
          <FormGroup>
            <label htmlFor="color">Annotation Color</label>
            <Input
              type="color"
              id="color"
              name="color"
              value={formData.color}
              onChange={handleInputChange}
            />
          </FormGroup>

          {/* Affected Metrics */}
          <FormGroup>
            <label>Affected Metrics</label>
            <CheckboxGroup>
              {AFFECTED_METRICS.map((metric) => (
                <label key={metric.value}>
                  <Checkbox
                    checked={formData.affectedMetrics.includes(metric.value)}
                    onChange={() => handleMetricToggle(metric.value)}
                  />
                  {metric.label}
                </label>
              ))}
            </CheckboxGroup>
          </FormGroup>

          {/* Footer Buttons */}
          <ModalFooter>
            {isEditMode && onDelete && (
              <DangerButton type="button" onClick={handleDelete}>
                Delete
              </DangerButton>
            )}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '1rem' }}>
              <SecondaryButton type="button" onClick={onClose}>
                Cancel
              </SecondaryButton>
              <PrimaryButton type="submit">Save</PrimaryButton>
            </div>
          </ModalFooter>
        </ModalBody>
      </Modal>
    </ModalOverlay>
  );
}
