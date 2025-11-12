import styled from 'styled-components';

/**
 * SkeletonLoader Components
 * Placeholder skeletons for charts and metric cards with shimmer animation
 *
 * @module
 */

/**
 * Skeleton loader for chart cards
 * Gray pulsing rectangle with shimmer effect
 * Height matches ChartCard from design spec (350px)
 *
 * @component
 */
export const SkeletonChart = styled.div`
  background: ${({ theme }) => theme.colors?.bgTertiary || '#f3f4f6'};
  border-radius: ${({ theme }) => theme.borderRadius?.xl || '12px'};
  height: 350px;
  position: relative;
  overflow: hidden;

  /* Shimmer effect */
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: -150%;
    width: 150%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.3),
      transparent
    );
    animation: shimmer 2s infinite;
  }

  @keyframes shimmer {
    0% {
      left: -150%;
    }
    100% {
      left: 150%;
    }
  }

  @media (max-width: ${({ theme }) => theme.breakpoints?.tablet || '768px'}) {
    height: 300px;
  }
`;

/**
 * Skeleton loader for metric summary cards
 * Gray pulsing rectangle with shimmer effect
 * Height matches MetricCard from design spec (120px)
 *
 * @component
 */
export const SkeletonMetricCard = styled.div`
  background: ${({ theme }) => theme.colors?.bgTertiary || '#f3f4f6'};
  border-radius: ${({ theme }) => theme.borderRadius?.xl || '12px'};
  height: 120px;
  position: relative;
  overflow: hidden;

  /* Shimmer effect (same as SkeletonChart) */
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: -150%;
    width: 150%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.3),
      transparent
    );
    animation: shimmer 2s infinite;
  }

  @keyframes shimmer {
    0% {
      left: -150%;
    }
    100% {
      left: 150%;
    }
  }
`;
