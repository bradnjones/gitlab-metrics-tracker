import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { apiFetch } from '../utils/apiFetch.js';
import DataExplorerIssuesTable, { transformIssueToStory } from './DataExplorerIssuesTable.jsx';
import DataExplorerIncidentsTable, { transformIncident } from './DataExplorerIncidentsTable.jsx';
import DataExplorerMRsTable, { transformMergeRequest } from './DataExplorerMRsTable.jsx';

/* ===== STYLED COMPONENTS ===== */

/**
 * Main container for DataExplorerView
 * Applies page-level padding and spacing
 *
 * @component
 */
const ExplorerContainer = styled.div`
  padding: ${props => props.theme.spacing.lg};
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.xl};

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.md};
    gap: ${props => props.theme.spacing.lg};
  }
`;

/* ===== COMPONENT ===== */

/**
 * DataExplorerView Component
 *
 * Displays raw data tables for Stories, Incidents, and Merge Requests
 * from selected sprint iterations. Owns all state, data-fetching, and
 * sorting logic; delegates rendering to focused sub-components.
 *
 * Tables:
 * - Stories: Fetched from /api/metrics/velocity
 * - Incidents: Fetched from /api/metrics/mttr
 * - Merge Requests: Fetched from /api/metrics/lead-time
 *
 * @param {Object} props
 * @param {Array} props.selectedIterations - Selected sprint iterations [{id, title, ...}]
 * @returns {JSX.Element}
 */
export default function DataExplorerView({ selectedIterations }) {
  // Stories state
  const [storiesData, setStoriesData] = useState([]);
  const [loadingStories, setLoadingStories] = useState(false);

  // Incidents state
  const [incidentsData, setIncidentsData] = useState([]);
  const [loadingIncidents, setLoadingIncidents] = useState(false);

  // Merge Requests state
  const [mergeRequestsData, setMergeRequestsData] = useState([]);
  const [loadingMergeRequests, setLoadingMergeRequests] = useState(false);

  // Sorting state (shared across all tables)
  const [sortColumn, setSortColumn] = useState('title');
  const [sortDirection, setSortDirection] = useState('asc');

  /**
   * Handle column header click to sort data
   *
   * @param {string} column - Column name to sort by
   */
  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  /**
   * Sort an array by the current sort column and direction
   *
   * @param {Array} data - Data array to sort
   * @returns {Array} Sorted copy of the array
   */
  const sortedData = (data) => {
    if (!data || data.length === 0) return data;

    return [...data].sort((a, b) => {
      let aVal = a[sortColumn];
      let bVal = b[sortColumn];

      if (aVal === null || aVal === undefined || aVal === '-') aVal = '';
      if (bVal === null || bVal === undefined || bVal === '-') bVal = '';

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      let comparison = 0;
      if (aVal < bVal) comparison = -1;
      if (aVal > bVal) comparison = 1;

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };

  /**
   * Fetch stories data from velocity endpoint when iterations change
   */
  useEffect(() => {
    setStoriesData([]);

    if (!selectedIterations || selectedIterations.length === 0) {
      return;
    }

    const fetchStories = async () => {
      try {
        setLoadingStories(true);

        const iterationsParam = selectedIterations.map(iter => iter.id).join(',');
        const response = await apiFetch(`/api/metrics/velocity?iterations=${iterationsParam}`);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        const storiesMap = new Map();
        data.metrics.forEach(metric => {
          if (metric.rawData && metric.rawData.issues) {
            metric.rawData.issues.forEach(issue => {
              if (!storiesMap.has(issue.id)) {
                storiesMap.set(issue.id, transformIssueToStory(issue, metric.iterationTitle));
              }
            });
          }
        });

        setStoriesData(Array.from(storiesMap.values()));
      } catch (error) {
        console.error('Failed to fetch stories:', error);
      } finally {
        setLoadingStories(false);
      }
    };

    fetchStories();
  }, [selectedIterations]);

  /**
   * Fetch incidents data from MTTR endpoint when iterations change
   */
  useEffect(() => {
    setIncidentsData([]);

    if (!selectedIterations || selectedIterations.length === 0) {
      return;
    }

    const fetchIncidents = async () => {
      try {
        setLoadingIncidents(true);

        const iterationsParam = selectedIterations.map(iter => iter.id).join(',');
        const response = await apiFetch(`/api/metrics/mttr?iterations=${iterationsParam}`);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        const incidentsMap = new Map();
        data.metrics.forEach(metric => {
          if (metric.rawData && metric.rawData.incidents) {
            metric.rawData.incidents.forEach(incident => {
              if (!incidentsMap.has(incident.id)) {
                incidentsMap.set(incident.id, transformIncident(incident));
              }
            });
          }
        });

        setIncidentsData(Array.from(incidentsMap.values()));
      } catch (error) {
        console.error('Failed to fetch incidents:', error);
      } finally {
        setLoadingIncidents(false);
      }
    };

    fetchIncidents();
  }, [selectedIterations]);

  /**
   * Fetch merge requests data from lead-time endpoint when iterations change
   */
  useEffect(() => {
    setMergeRequestsData([]);

    if (!selectedIterations || selectedIterations.length === 0) {
      return;
    }

    const fetchMergeRequests = async () => {
      try {
        setLoadingMergeRequests(true);

        const iterationsParam = selectedIterations.map(iter => iter.id).join(',');
        const response = await apiFetch(`/api/metrics/lead-time?iterations=${iterationsParam}`);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        const mergeRequestsMap = new Map();
        data.metrics.forEach(metric => {
          if (metric.rawData && metric.rawData.mergeRequests) {
            metric.rawData.mergeRequests.forEach(mr => {
              if (mr.state === 'merged' && !mergeRequestsMap.has(mr.id)) {
                mergeRequestsMap.set(mr.id, transformMergeRequest(mr));
              }
            });
          }
        });

        setMergeRequestsData(Array.from(mergeRequestsMap.values()));
      } catch (error) {
        console.error('Failed to fetch merge requests:', error);
      } finally {
        setLoadingMergeRequests(false);
      }
    };

    fetchMergeRequests();
  }, [selectedIterations]);

  return (
    <ExplorerContainer>
      <DataExplorerIssuesTable
        storiesData={storiesData}
        loadingStories={loadingStories}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onSort={handleSort}
        sortedData={sortedData}
      />
      <DataExplorerIncidentsTable
        incidentsData={incidentsData}
        loadingIncidents={loadingIncidents}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onSort={handleSort}
        sortedData={sortedData}
      />
      <DataExplorerMRsTable
        mergeRequestsData={mergeRequestsData}
        loadingMergeRequests={loadingMergeRequests}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onSort={handleSort}
        sortedData={sortedData}
      />
    </ExplorerContainer>
  );
}
