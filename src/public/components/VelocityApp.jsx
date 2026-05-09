/**
 * VelocityApp Component
 *
 * Main application container for the GitLab Sprint Metrics Dashboard.
 * Optimized layout with compact header for maximum chart visibility.
 *
 * Design Changes (Dashboard Optimization):
 * - Replaced Header + IterationSelectorToolbar with CompactHeaderWithIterations
 * - Reduced header height from 172px to 56px (67% reduction)
 * - Reduced content padding from 24px to 16px
 * - Reduced chart card padding from 24px to 16px
 * - Reduced chart title size from 20px to 18px
 * - Reduced grid gap from 24px to 16px
 * - Increased max-width from 1400px to 1600px on wide screens
 * - Total vertical space gained: ~124px (17.6% increase)
 *
 * Features:
 * - Compact unified header with gradient and translucent chips
 * - Wrapped in ErrorBoundary for error handling
 * - Shows EmptyState when no iterations selected
 * - Theme-based styling throughout
 * - Responsive layout with 3-column grid on wide screens
 *
 * @returns {JSX.Element} Rendered application
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { useMetricsExport } from '../hooks/useMetricsExport.js';
import { useCredentials } from '../contexts/CredentialsContext.jsx';
import { apiFetch } from '../utils/apiFetch.js';
import useAppModals from '../hooks/useAppModals.js';
import ErrorBoundary from './ErrorBoundary.jsx';
import CompactHeaderWithIterations from './CompactHeaderWithIterations.jsx';
import ViewNavigation from './ViewNavigation.jsx';
import EmptyState from './EmptyState.jsx';
import IterationSelectionModal from './IterationSelectionModal.jsx';
import SprintDisplayFilterModal from './SprintDisplayFilterModal.jsx';
import AnnotationModal from './AnnotationModal.jsx';
import AnnotationsManagementModal from './AnnotationsManagementModal.jsx';
import SettingsModal from './SettingsModal.jsx';
import MetricsSummary from './MetricsSummary.jsx';
import VelocityChart from './VelocityChart.jsx';
import CycleTimeChart from './CycleTimeChart.jsx';
import DeploymentFrequencyChart from './DeploymentFrequencyChart.jsx';
import LeadTimeChart from './LeadTimeChart.jsx';
import MTTRChart from './MTTRChart.jsx';
import ChangeFailureRateChart from './ChangeFailureRateChart.jsx';
import DataExplorerView from './DataExplorerView.jsx';
import AIReviewButton from './AIReviewButton.jsx';
import AIReviewModal from './AIReviewModal.jsx';
import { useAIReview } from '../hooks/useAIReview.js';
import MetricInfoIcon from './MetricInfoIcon.jsx';

/**
 * Main app container
 *
 * @component
 */
const AppContainer = styled.div`
  min-height: 100vh;
  background: ${props => props.theme.colors.bgSecondary};
`;

/**
 * Optimized content container with minimal padding for maximum viewport usage
 *
 * @component
 */
const Content = styled.div`
  max-width: 100%;
  margin: 0 auto;
  padding: ${props => props.theme.spacing.sm};

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: 4px;
  }
`;

/**
 * Optimized charts grid with responsive columns
 *
 * @component
 */
const ChartsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${props => props.theme.spacing.md};
  margin-bottom: ${props => props.theme.spacing.lg};

  @media (min-width: ${props => props.theme.breakpoints.wide}) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (max-width: ${props => props.theme.breakpoints.desktop}) {
    grid-template-columns: 1fr;
  }
`;

/**
 * Optimized chart card with tighter padding
 *
 * @component
 */
const ChartCard = styled.div`
  background: ${props => props.theme.colors.bgPrimary};
  padding: ${props => props.theme.spacing.md};
  border-radius: ${props => props.theme.borderRadius.lg};
  box-shadow: ${props => props.theme.shadows.md};
  min-height: 320px;

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    padding: ${props => props.theme.spacing.sm};
    min-height: 280px;
  }
`;

/**
 * Optimized chart title (smaller, consistent)
 *
 * @component
 */
const ChartTitle = styled.h3`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: ${props => props.theme.colors.textPrimary};
  font-size: ${props => props.theme.typography.fontSize.lg};
  font-weight: ${props => props.theme.typography.fontWeight.semibold};
  margin: 0 0 ${props => props.theme.spacing.md} 0;
  line-height: ${props => props.theme.typography.lineHeight.tight};
`;

/**
 * Toolbar row above the charts grid, right-aligned
 *
 * @component
 */
const ChartsToolbar = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${props => props.theme.spacing.sm};
  margin-bottom: ${props => props.theme.spacing.sm};
`;

/**
 * Pill toggle button for annotation visibility
 *
 * @component
 */
const AnnotationToggleButton = styled.button`
  background: ${props => props.theme.colors.bgPrimary};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.full};
  color: ${props => props.theme.colors.textSecondary};
  cursor: pointer;
  font-size: ${props => props.theme.typography.fontSize.sm};
  font-weight: ${props => props.theme.typography.fontWeight.medium};
  padding: 4px 12px;
  transition: background ${props => props.theme.transitions.fast} ${props => props.theme.transitions.easing},
              color ${props => props.theme.transitions.fast} ${props => props.theme.transitions.easing};

  &:hover {
    background: ${props => props.theme.colors.bgTertiary};
    color: ${props => props.theme.colors.textPrimary};
  }

  &:focus {
    outline: 2px solid ${props => props.theme.colors.primary};
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }
`;

/**
 * VelocityApp Component
 *
 * @returns {JSX.Element} Rendered application
 */
/** @type {Record<string, { description: string, goodDirection: 'up'|'down', goodLabel: string }>} */
const CHART_TOOLTIPS = {
  velocity: {
    description: 'Story points and issues completed per sprint. Measures team output and throughput over time.',
    goodDirection: 'up',
    goodLabel: 'increasing velocity indicates growing throughput and team capacity',
  },
  cycleTime: {
    description: 'Average time from when work starts to when it is delivered. Measures flow efficiency and execution speed.',
    goodDirection: 'down',
    goodLabel: 'lower cycle time means faster feedback loops and reduced delivery risk',
  },
  deployFreq: {
    description: 'How often code is released to production. Frequent small releases reduce batch size and deployment risk.',
    goodDirection: 'up',
    goodLabel: 'higher frequency signals a healthy, low-risk delivery pipeline',
  },
  leadTime: {
    description: 'Time from first commit to production deployment. Measures end-to-end delivery speed from code to customer.',
    goodDirection: 'down',
    goodLabel: 'shorter lead time means faster delivery of value and quicker response to feedback',
  },
  mttr: {
    description: 'Mean Time to Recovery — how quickly the team restores service after an incident. Reflects operational maturity.',
    goodDirection: 'down',
    goodLabel: 'lower MTTR limits user impact and indicates strong incident response practices',
  },
  changeFailureRate: {
    description: 'Percentage of deployments that cause incidents or require a rollback. Reflects release quality and testing effectiveness.',
    goodDirection: 'down',
    goodLabel: 'fewer failures mean higher quality and more reliable releases',
  },
};

const STORAGE_KEY = 'gitlab-metrics-selected-iterations';
const SHOW_ANNOTATIONS_KEY = 'show-annotations';
const SHOW_P90_KEY = 'chart-show-p90';
const SHOW_P50_KEY = 'chart-show-p50';
const SHOW_AVERAGE_KEY = 'chart-show-average';

export default function VelocityApp() {
  const { credentials, setCredentials } = useCredentials();
  const [selectedIterations, setSelectedIterations] = useState([]);
  // null = show all; Set<string> = explicit subset
  const [displayedIterationIds, setDisplayedIterationIds] = useState(null);
  const { exportCSV, exporting } = useMetricsExport(selectedIterations);
  const [currentView, setCurrentView] = useState(() => credentials ? 'dashboard' : 'settings');
  const {
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
  } = useAppModals();
  const { run: runAIReview, chat: chatAIReview, loading: aiLoading, error: aiError, lastAnalysis, streamingText: aiStreamingText, chatLoading: aiChatLoading, chatStreamingText: aiChatStreamingText, pendingChatMessage: aiPendingChatMessage } = useAIReview();
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const [annotationRefreshKey, setAnnotationRefreshKey] = useState(0);
  const [annotationError, setAnnotationError] = useState(null);
  const [showAnnotations, setShowAnnotations] = useState(() => {
    try {
      const stored = localStorage.getItem(SHOW_ANNOTATIONS_KEY);
      return stored === null ? true : stored !== 'false';
    } catch {
      return true;
    }
  });
  const [showP90, setShowP90] = useState(() => {
    try {
      const stored = localStorage.getItem(SHOW_P90_KEY);
      return stored === null ? true : stored !== 'false';
    } catch {
      return true;
    }
  });
  const [showP50, setShowP50] = useState(() => {
    try {
      const stored = localStorage.getItem(SHOW_P50_KEY);
      return stored === null ? true : stored !== 'false';
    } catch {
      return true;
    }
  });
  const [showAverage, setShowAverage] = useState(() => {
    try {
      const stored = localStorage.getItem(SHOW_AVERAGE_KEY);
      return stored === null ? true : stored !== 'false';
    } catch {
      return true;
    }
  });

  // Derive the subset of iterations actually shown in charts
  const displayedIterations = useMemo(() => {
    if (!displayedIterationIds) return selectedIterations;
    return selectedIterations.filter(iter => displayedIterationIds.has(iter.id));
  }, [selectedIterations, displayedIterationIds]);

  const handleAIReview = useCallback(() => {
    setIsReviewModalOpen(true);
    runAIReview(displayedIterations.map((i) => i.id));
  }, [displayedIterations, runAIReview]);

  // Load selected iterations from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Validate data structure: must be array of objects with id property
        if (Array.isArray(parsed) && parsed.every(item => item && typeof item === 'object' && item.id)) {
          setSelectedIterations(parsed);
        } else {
          console.warn('Invalid localStorage data format, clearing...');
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (error) {
      console.warn('Failed to load selections from localStorage:', error);
      // Clear corrupted data
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Save selected iterations to localStorage whenever they change
  useEffect(() => {
    try {
      if (selectedIterations.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedIterations));
      } else {
        // Clear localStorage when no selections
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (error) {
      console.warn('Failed to save selections to localStorage:', error);
    }
  }, [selectedIterations]);

  // Add keyboard shortcut listener for Ctrl+N to open annotation modal
  useEffect(() => {
    const handleKeyPress = (event) => {
      // Check for Ctrl+N (or Cmd+N on Mac)
      if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
        event.preventDefault(); // Prevent browser's default "new window" behavior
        openAnnotationModal();
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    // Cleanup listener on unmount
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [openAnnotationModal]);

  /**
   * Handle applying the sprint display filter
   * @param {Set<string>} newDisplayedIds
   */
  const handleApplyDisplayFilter = useCallback((newDisplayedIds) => {
    // null means "show all" — normalise when everything is selected
    if (newDisplayedIds.size >= selectedIterations.length) {
      setDisplayedIterationIds(null);
    } else {
      setDisplayedIterationIds(new Set(newDisplayedIds));
    }
    closeDisplayFilterModal();
  }, [selectedIterations.length, closeDisplayFilterModal]);

  /**
   * Handle applying iteration selection from cache modal.
   * Reconciles displayedIterationIds: keeps previously-shown iterations that
   * still exist, and shows any brand-new additions.
   * @param {Array<Object>} newIterations
   */
  const handleApplyIterations = (newIterations) => {
    if (displayedIterationIds !== null) {
      const oldIds = new Set(selectedIterations.map(it => it.id));
      const reconciled = new Set();
      newIterations.forEach(it => {
        // Show if it was displayed before, or if it's brand new to the pool
        if (displayedIterationIds.has(it.id) || !oldIds.has(it.id)) {
          reconciled.add(it.id);
        }
      });
      // Normalise to null when everything is shown
      setDisplayedIterationIds(reconciled.size === newIterations.length ? null : reconciled);
    }
    setSelectedIterations(newIterations);
    closeIterationModal();
  };

  /**
   * Handle saving an annotation from the modal
   * @param {Object} annotationData - Annotation data to save
   */
  const handleSaveAnnotation = async (annotationData) => {
    setAnnotationError(null);
    try {
      const isEditing = editingAnnotation !== null;
      const url = isEditing ? `/api/annotations/${editingAnnotation.id}` : '/api/annotations';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await apiFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(annotationData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Close modal on success
      closeAnnotationModal();

      // Trigger charts to refresh and show updated annotation
      setAnnotationRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error saving annotation:', error);
      setAnnotationError(`Failed to save annotation: ${error.message}`);
    }
  };

  /**
   * Handle deleting an annotation
   * @param {string} annotationId - ID of annotation to delete
   */
  const handleDeleteAnnotation = async (annotationId) => {
    setAnnotationError(null);
    try {
      const response = await apiFetch(`/api/annotations/${annotationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Close modal on success
      closeAnnotationModal();

      // Trigger charts to refresh and remove deleted annotation
      setAnnotationRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error deleting annotation:', error);
      setAnnotationError(`Failed to delete annotation: ${error.message}`);
    }
  };

  /**
   * Handle deleting an annotation from manage modal
   * @param {string} annotationId - ID of annotation to delete
   */
  const handleDeleteAnnotationFromManage = async (annotationId) => {
    await handleDeleteAnnotation(annotationId);
    // Refresh the annotations list in the manage modal
    setAnnotationRefreshKey(prev => prev + 1);
  };

  /**
   * Remove a single iteration from the selected set by id
   */
  const handleRemoveIteration = useCallback((id) => {
    setSelectedIterations(prev => prev.filter(it => it.id !== id));
  }, []);

  /**
   * Toggle P90 visibility on Cycle Time and Lead Time charts and persist the preference
   */
  const handleToggleP90 = useCallback(() => {
    setShowP90(prev => {
      const next = !prev;
      try {
        localStorage.setItem(SHOW_P90_KEY, String(next));
      } catch {
        // Ignore write errors
      }
      return next;
    });
  }, []);

  /**
   * Toggle P50 visibility on Cycle Time and Lead Time charts and persist the preference
   */
  const handleToggleP50 = useCallback(() => {
    setShowP50(prev => {
      const next = !prev;
      try {
        localStorage.setItem(SHOW_P50_KEY, String(next));
      } catch {
        // Ignore write errors
      }
      return next;
    });
  }, []);

  /**
   * Toggle Average visibility on Cycle Time and Lead Time charts and persist the preference
   */
  const handleToggleAverage = useCallback(() => {
    setShowAverage(prev => {
      const next = !prev;
      try {
        localStorage.setItem(SHOW_AVERAGE_KEY, String(next));
      } catch {
        // Ignore write errors
      }
      return next;
    });
  }, []);

  /**
   * Toggle annotation visibility on all charts and persist the preference
   */
  const handleToggleAnnotations = useCallback(() => {
    setShowAnnotations(prev => {
      const next = !prev;
      try {
        localStorage.setItem(SHOW_ANNOTATIONS_KEY, String(next));
      } catch {
        // Ignore write errors
      }
      return next;
    });
  }, []);

  return (
    <ErrorBoundary>
      <AppContainer>
        <CompactHeaderWithIterations
          selectedIterations={selectedIterations}
          displayedIterations={displayedIterations}
          onOpenModal={openIterationModal}
          onOpenDisplayFilter={openDisplayFilterModal}
          onOpenAnnotationModal={openAnnotationModal}
          onOpenManageAnnotations={openManageAnnotationsModal}
          onRemoveIteration={handleRemoveIteration}
          onExportCSV={exportCSV}
          exporting={exporting}
          onOpenSettings={() => setCurrentView('settings')}
        />

        <ViewNavigation
          currentView={currentView}
          onViewChange={setCurrentView}
          hasSelectedIterations={selectedIterations.length > 0}
        />

        <Content>
          {currentView === 'settings' && (
            <SettingsModal
              hasCredentials={credentials !== null}
              currentCredentials={credentials}
              onSave={(creds) => {
                setCredentials(creds);
                setCurrentView('dashboard');
              }}
            />
          )}
          {currentView !== 'settings' && !credentials && (
            <EmptyState
              title="Credentials Required"
              message="Enter your GitLab Personal Access Token and project path in Settings before loading metrics."
              ctaText="Go to Settings"
              onCTA={() => setCurrentView('settings')}
            />
          )}
          {currentView !== 'settings' && credentials && selectedIterations.length === 0 && (
            <EmptyState
              title="No Iterations Selected"
              message="Select sprint iterations to view velocity metrics and team performance data."
            />
          )}
          {currentView !== 'settings' && credentials && selectedIterations.length > 0 && (
            <>
              {currentView === 'dashboard' && (
                <>
                  <MetricsSummary selectedIterations={displayedIterations} />
                  <ChartsToolbar>
                    {(() => {
                      const onlyOneVisible = [showAverage, showP50, showP90].filter(Boolean).length === 1;
                      return (
                        <>
                          <AnnotationToggleButton
                            onClick={handleToggleAverage}
                            disabled={showAverage && onlyOneVisible}
                          >
                            {showAverage ? 'Average: On' : 'Average: Off'}
                          </AnnotationToggleButton>
                          <AnnotationToggleButton
                            onClick={handleToggleP50}
                            disabled={showP50 && onlyOneVisible}
                          >
                            {showP50 ? 'P50: On' : 'P50: Off'}
                          </AnnotationToggleButton>
                          <AnnotationToggleButton
                            onClick={handleToggleP90}
                            disabled={showP90 && onlyOneVisible}
                          >
                            {showP90 ? 'P90: On' : 'P90: Off'}
                          </AnnotationToggleButton>
                        </>
                      );
                    })()}
                    <AnnotationToggleButton onClick={handleToggleAnnotations}>
                      {showAnnotations ? 'Annotations: On' : 'Annotations: Off'}
                    </AnnotationToggleButton>
                    <AIReviewButton
                      onClick={handleAIReview}
                      onOpenLast={() => setIsReviewModalOpen(true)}
                      loading={aiLoading}
                      disabled={displayedIterations.length === 0}
                      lastAnalysis={lastAnalysis}
                    />
                  </ChartsToolbar>
                  <AIReviewModal
                    isOpen={isReviewModalOpen}
                    onClose={() => setIsReviewModalOpen(false)}
                    analysis={lastAnalysis}
                    loading={aiLoading}
                    error={aiError}
                    streamingText={aiStreamingText}
                    onChat={chatAIReview}
                    chatLoading={aiChatLoading}
                    chatStreamingText={aiChatStreamingText}
                    pendingChatMessage={aiPendingChatMessage}
                  />
                  <ChartsGrid>
              <ChartCard>
                <ChartTitle>Velocity Trend <MetricInfoIcon label="Velocity Trend" tooltip={CHART_TOOLTIPS.velocity} /></ChartTitle>
                <VelocityChart
                  selectedIterations={displayedIterations}
                  annotationRefreshKey={annotationRefreshKey}
                  showAnnotations={showAnnotations}
                />
              </ChartCard>

              <ChartCard>
                <ChartTitle>Cycle Time <MetricInfoIcon label="Cycle Time" tooltip={CHART_TOOLTIPS.cycleTime} /></ChartTitle>
                <CycleTimeChart
                  selectedIterations={displayedIterations}
                  annotationRefreshKey={annotationRefreshKey}
                  showAnnotations={showAnnotations}
                  showP90={showP90}
                  showP50={showP50}
                  showAverage={showAverage}
                />
              </ChartCard>

              <ChartCard>
                <ChartTitle>Deployment Frequency <MetricInfoIcon label="Deployment Frequency" tooltip={CHART_TOOLTIPS.deployFreq} /></ChartTitle>
                <DeploymentFrequencyChart
                  selectedIterations={displayedIterations}
                  annotationRefreshKey={annotationRefreshKey}
                  showAnnotations={showAnnotations}
                />
              </ChartCard>

              <ChartCard>
                <ChartTitle>Lead Time <MetricInfoIcon label="Lead Time" tooltip={CHART_TOOLTIPS.leadTime} /></ChartTitle>
                <LeadTimeChart
                  selectedIterations={displayedIterations}
                  annotationRefreshKey={annotationRefreshKey}
                  showAnnotations={showAnnotations}
                  showP90={showP90}
                  showP50={showP50}
                  showAverage={showAverage}
                />
              </ChartCard>

              <ChartCard>
                <ChartTitle>MTTR (Mean Time to Recovery) <MetricInfoIcon label="MTTR" tooltip={CHART_TOOLTIPS.mttr} /></ChartTitle>
                <MTTRChart
                  selectedIterations={displayedIterations}
                  annotationRefreshKey={annotationRefreshKey}
                  showAnnotations={showAnnotations}
                />
              </ChartCard>

              <ChartCard>
                <ChartTitle>Change Failure Rate <MetricInfoIcon label="Change Failure Rate" tooltip={CHART_TOOLTIPS.changeFailureRate} /></ChartTitle>
                <ChangeFailureRateChart
                  selectedIterations={displayedIterations}
                  annotationRefreshKey={annotationRefreshKey}
                  showAnnotations={showAnnotations}
                />
              </ChartCard>
            </ChartsGrid>
                </>
              )}

              {currentView === 'annotations' && (
                <EmptyState
                  title="Annotations View"
                  message="Annotation timeline view coming soon. For now, use the hamburger menu to manage annotations."
                />
              )}

              {currentView === 'insights' && (
                <EmptyState
                  title="Insights View"
                  message="Insights and correlation analysis view coming soon."
                />
              )}

              {currentView === 'dataExplorer' && (
                <DataExplorerView
                  selectedIterations={displayedIterations}
                />
              )}

            </>
          )}
          </Content>

        <IterationSelectionModal
          isOpen={isModalOpen}
          onClose={closeIterationModal}
          onApply={handleApplyIterations}
          selectedIterationIds={selectedIterations.map(iter => iter.id)}
        />

        <SprintDisplayFilterModal
          isOpen={isDisplayFilterModalOpen}
          onClose={closeDisplayFilterModal}
          onApply={handleApplyDisplayFilter}
          iterations={selectedIterations}
          displayedIds={displayedIterationIds}
        />

        {annotationError && (
          <div
            role="alert"
            style={{
              position: 'fixed',
              bottom: '24px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#ef4444',
              color: '#fff',
              padding: '12px 20px',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              zIndex: 9999,
              maxWidth: '480px',
              cursor: 'pointer',
            }}
            onClick={() => setAnnotationError(null)}
          >
            {annotationError}
          </div>
        )}

        <AnnotationModal
          isOpen={isAnnotationModalOpen}
          onClose={closeAnnotationModal}
          onSave={handleSaveAnnotation}
          onDelete={handleDeleteAnnotation}
          annotation={editingAnnotation}
        />

        <AnnotationsManagementModal
          isOpen={isManageAnnotationsModalOpen}
          onClose={closeManageAnnotationsModal}
          onEdit={startEditAnnotation}
          onDelete={handleDeleteAnnotationFromManage}
          onCreate={startCreateAnnotation}
        />

      </AppContainer>
    </ErrorBoundary>
  );
}
