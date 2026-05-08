import { useState, useCallback } from 'react';

/**
 * Manages all modal open/close state for the main application.
 *
 * Pure state orchestration — no side effects, no API calls.
 * Centralises the five inter-related modal states that previously
 * lived as individual useState calls in VelocityApp.
 *
 * @returns {{
 *   isModalOpen: boolean,
 *   isDisplayFilterModalOpen: boolean,
 *   isAnnotationModalOpen: boolean,
 *   isManageAnnotationsModalOpen: boolean,
 *   editingAnnotation: Object|null,
 *   openIterationModal: Function,
 *   closeIterationModal: Function,
 *   openDisplayFilterModal: Function,
 *   closeDisplayFilterModal: Function,
 *   openAnnotationModal: Function,
 *   closeAnnotationModal: Function,
 *   openManageAnnotationsModal: Function,
 *   closeManageAnnotationsModal: Function,
 *   startEditAnnotation: Function,
 *   startCreateAnnotation: Function,
 * }}
 */
export default function useAppModals() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDisplayFilterModalOpen, setIsDisplayFilterModalOpen] = useState(false);
  const [isAnnotationModalOpen, setIsAnnotationModalOpen] = useState(false);
  const [isManageAnnotationsModalOpen, setIsManageAnnotationsModalOpen] = useState(false);
  const [editingAnnotation, setEditingAnnotation] = useState(null);

  /** Open the iteration selection modal. */
  const openIterationModal = useCallback(() => setIsModalOpen(true), []);

  /** Close the iteration selection modal. */
  const closeIterationModal = useCallback(() => setIsModalOpen(false), []);

  /** Open the sprint display filter modal. */
  const openDisplayFilterModal = useCallback(() => setIsDisplayFilterModalOpen(true), []);

  /** Close the sprint display filter modal. */
  const closeDisplayFilterModal = useCallback(() => setIsDisplayFilterModalOpen(false), []);

  /** Open the annotation create/edit modal. */
  const openAnnotationModal = useCallback(() => setIsAnnotationModalOpen(true), []);

  /** Close the annotation modal and clear any annotation being edited. */
  const closeAnnotationModal = useCallback(() => {
    setIsAnnotationModalOpen(false);
    setEditingAnnotation(null);
  }, []);

  /** Open the annotations management modal. */
  const openManageAnnotationsModal = useCallback(() => setIsManageAnnotationsModalOpen(true), []);

  /** Close the annotations management modal. */
  const closeManageAnnotationsModal = useCallback(() => setIsManageAnnotationsModalOpen(false), []);

  /**
   * Transition from the manage modal to the annotation edit modal.
   * Closes manage modal, sets the annotation to edit, and opens the annotation modal.
   *
   * @param {Object} annotation - The annotation object to edit.
   */
  const startEditAnnotation = useCallback((annotation) => {
    setEditingAnnotation(annotation);
    setIsManageAnnotationsModalOpen(false);
    setIsAnnotationModalOpen(true);
  }, []);

  /**
   * Transition from the manage modal to the annotation create modal.
   * Closes manage modal, clears any editing state, and opens the annotation modal.
   */
  const startCreateAnnotation = useCallback(() => {
    setEditingAnnotation(null);
    setIsManageAnnotationsModalOpen(false);
    setIsAnnotationModalOpen(true);
  }, []);

  return {
    isModalOpen,
    isDisplayFilterModalOpen,
    isAnnotationModalOpen,
    isManageAnnotationsModalOpen,
    editingAnnotation,
    openIterationModal,
    closeIterationModal,
    openDisplayFilterModal,
    closeDisplayFilterModal,
    openAnnotationModal,
    closeAnnotationModal,
    openManageAnnotationsModal,
    closeManageAnnotationsModal,
    startEditAnnotation,
    startCreateAnnotation,
  };
}
