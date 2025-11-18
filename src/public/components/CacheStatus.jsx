/**
 * CacheStatus Component
 * Displays aggregate cache status with color-coded indicators
 *
 * Story V9.3: Cache Management UI
 *
 * @module components/CacheStatus
 */

import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';

/**
 * Styled Components
 */

const Container = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: white;
`;

const StatusIndicator = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${props => props.$color};
  box-shadow: 0 0 4px ${props => props.$color};
`;

const StatusText = styled.span`
  font-weight: 600;
  color: white;
`;

const CountText = styled.span`
  color: rgba(255, 255, 255, 0.9);
`;

const LastUpdatedText = styled.span`
  color: rgba(255, 255, 255, 0.75);
  font-size: 12px;
`;

const LoadingText = styled.span`
  color: rgba(255, 255, 255, 0.9);
`;

const ErrorText = styled.span`
  color: #fca5a5;
  font-weight: 600;
`;

/**
 * Status color mapping
 */
const STATUS_COLORS = {
  fresh: '#10b981', // Green
  aging: '#f59e0b', // Yellow/Amber
  stale: '#ef4444', // Red
  none: '#9ca3af', // Gray
  error: '#ef4444', // Red
};

/**
 * Calculate aggregate status from iterations
 * Priority: stale > aging > fresh > none
 *
 * @param {Array} iterations - Cache iteration metadata
 * @returns {string} Aggregate status
 */
function calculateAggregateStatus(iterations) {
  if (!iterations || iterations.length === 0) {
    return 'none';
  }

  // Check for stale (highest priority)
  if (iterations.some(item => item.status === 'stale')) {
    return 'stale';
  }

  // Check for aging (medium priority)
  if (iterations.some(item => item.status === 'aging')) {
    return 'aging';
  }

  // All fresh (lowest priority)
  return 'fresh';
}

/**
 * Format timestamp as relative time (e.g., "5 minutes ago")
 *
 * @param {string} isoTimestamp - ISO 8601 timestamp
 * @returns {string} Formatted relative time
 */
function formatRelativeTime(isoTimestamp) {
  if (!isoTimestamp) return '';

  const now = new Date();
  const then = new Date(isoTimestamp);
  const diffMs = now - then;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }
}

/**
 * CacheStatus Component
 *
 * @returns {JSX.Element} Cache status indicator
 */
function CacheStatus() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cacheData, setCacheData] = useState(null);
  const [displayTime, setDisplayTime] = useState(null);

  // Use ref to store timestamp without triggering re-renders
  const timestampRef = useRef(null);
  const [cacheTimestamp, setCacheTimestamp] = useState(null);

  // Store previous values in ref to avoid triggering setState unnecessarily
  const prevDataRef = useRef(null);

  // Track whether we've completed the initial fetch (avoids stale closure issue)
  const hasFetchedOnceRef = useRef(false);

  // Poll for cache status updates every 5 seconds
  useEffect(() => {
    async function fetchCacheStatus() {
      try {
        // Only show loading on initial fetch (avoid stale closure by using ref)
        if (!hasFetchedOnceRef.current) {
          setLoading(true);
          setError(null); // Clear any previous errors on first fetch
        }

        const response = await fetch('/api/cache/status');

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // Mark that we've completed the first fetch
        if (!hasFetchedOnceRef.current) {
          hasFetchedOnceRef.current = true;
          setLoading(false);
        }

        // Check if data has changed BEFORE calling setState
        if (!prevDataRef.current) {
          // First time - update all state
          prevDataRef.current = data;
          setCacheData(data);
          if (data.globalLastUpdated) {
            timestampRef.current = data.globalLastUpdated;
            setCacheTimestamp(data.globalLastUpdated);
          }
        } else {
          // Only update if timestamp or count changed
          // Iterations array may have reference changes but same data - ignore those
          const hasChanged =
            prevDataRef.current.globalLastUpdated !== data.globalLastUpdated ||
            prevDataRef.current.totalCachedIterations !== data.totalCachedIterations;

          if (hasChanged) {
            // Data actually changed - update state
            prevDataRef.current = data;
            setCacheData(data);

            // If timestamp changed, update display
            if (data.globalLastUpdated !== timestampRef.current) {
              timestampRef.current = data.globalLastUpdated;
              setCacheTimestamp(data.globalLastUpdated);
            }
          }
          // If nothing changed, do absolutely nothing - no setState calls
        }
      } catch (err) {
        setError(err.message);
        // Only set loading to false if we haven't fetched successfully yet
        if (!hasFetchedOnceRef.current) {
          setLoading(false);
        }
      }
    }

    // Initial fetch
    fetchCacheStatus();

    // Poll every 5 seconds to detect newly cached iterations
    const pollInterval = setInterval(fetchCacheStatus, 5000);

    // Cleanup on unmount
    return () => clearInterval(pollInterval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update display time when cache timestamp changes (cache refresh)
  useEffect(() => {
    if (cacheTimestamp) {
      setDisplayTime(formatRelativeTime(cacheTimestamp));
    }
  }, [cacheTimestamp]);

  // Separate timer for updating the time display every 60 seconds (completely independent)
  // Updates the relative time display without triggering cache data refetch
  useEffect(() => {
    function updateDisplayTime() {
      if (timestampRef.current) {
        setDisplayTime(formatRelativeTime(timestampRef.current));
      }
    }

    // Update display time every 60 seconds
    const displayInterval = setInterval(updateDisplayTime, 60000);

    // Cleanup on unmount
    return () => clearInterval(displayInterval);
  }, []); // Empty deps - this timer runs completely independently

  // Use the display time state which updates independently on a 60-second timer
  const formattedLastUpdated = displayTime;

  // Loading state
  if (loading) {
    return (
      <Container>
        <LoadingText>Loading cache status...</LoadingText>
      </Container>
    );
  }

  // Error state
  if (error) {
    return (
      <Container>
        <StatusIndicator $color={STATUS_COLORS.error} />
        <ErrorText>Error loading cache status</ErrorText>
      </Container>
    );
  }

  // No cache
  if (!cacheData || cacheData.totalCachedIterations === 0) {
    return (
      <Container>
        <StatusIndicator $color={STATUS_COLORS.none} />
        <StatusText $color={STATUS_COLORS.none}>No cache</StatusText>
      </Container>
    );
  }

  // Calculate aggregate status
  const aggregateStatus = calculateAggregateStatus(cacheData.iterations);
  const statusColor = STATUS_COLORS[aggregateStatus];

  return (
    <Container>
      <StatusIndicator $color={statusColor} />
      <StatusText $color={statusColor}>
        {aggregateStatus.charAt(0).toUpperCase() + aggregateStatus.slice(1)}
      </StatusText>
      <CountText>
        {cacheData.totalCachedIterations} iteration{cacheData.totalCachedIterations !== 1 ? 's' : ''}
      </CountText>
      {formattedLastUpdated && (
        <LastUpdatedText>
          · Updated {formattedLastUpdated}
        </LastUpdatedText>
      )}
    </Container>
  );
}

// Wrap with memo to prevent re-renders when parent updates
export default React.memo(CacheStatus);
