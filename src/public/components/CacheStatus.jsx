/**
 * CacheStatus Component
 * Displays aggregate cache status with color-coded indicators
 *
 * Story V9.3: Cache Management UI
 *
 * @module components/CacheStatus
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

/**
 * Styled Components
 */

const Container = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #374151;
`;

const StatusIndicator = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${props => props.$color};
`;

const StatusText = styled.span`
  font-weight: 500;
  color: ${props => props.$color};
`;

const CountText = styled.span`
  color: #6b7280;
`;

const LastUpdatedText = styled.span`
  color: #9ca3af;
  font-size: 12px;
`;

const LoadingText = styled.span`
  color: #6b7280;
`;

const ErrorText = styled.span`
  color: #ef4444;
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
export default function CacheStatus() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cacheData, setCacheData] = useState(null);

  useEffect(() => {
    async function fetchCacheStatus() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/cache/status');

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        setCacheData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchCacheStatus();
  }, []);

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
      {cacheData.globalLastUpdated && (
        <LastUpdatedText>
          · Updated {formatRelativeTime(cacheData.globalLastUpdated)}
        </LastUpdatedText>
      )}
    </Container>
  );
}
