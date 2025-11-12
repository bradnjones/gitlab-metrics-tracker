/**
 * @jest-environment jsdom
 */

import { render } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { SkeletonChart, SkeletonMetricCard } from '../../../src/public/components/SkeletonLoader.jsx';

// Mock theme
const theme = {
  colors: { bgTertiary: '#f3f4f6' },
  borderRadius: { xl: '12px' },
};

describe('SkeletonLoader', () => {
  /**
   * Test 5.1: SkeletonChart renders
   * Verifies SkeletonChart component renders with correct dimensions
   */
  test('SkeletonChart renders with correct structure', () => {
    const { container } = render(
      <ThemeProvider theme={theme}>
        <SkeletonChart />
      </ThemeProvider>
    );

    // Should render a div (skeleton placeholder)
    expect(container.firstChild).toBeInTheDocument();
    expect(container.firstChild).toHaveStyle({
      height: '350px', // Matches chart card height from design spec
    });
  });

  /**
   * Test 5.2: SkeletonMetricCard renders
   * Verifies SkeletonMetricCard component renders with correct dimensions
   */
  test('SkeletonMetricCard renders with correct structure', () => {
    const { container } = render(
      <ThemeProvider theme={theme}>
        <SkeletonMetricCard />
      </ThemeProvider>
    );

    // Should render a div (skeleton placeholder)
    expect(container.firstChild).toBeInTheDocument();
    expect(container.firstChild).toHaveStyle({
      height: '120px', // Matches metric card height from design spec
    });
  });

  /**
   * Test 5.3: Shimmer animation applies
   * Verifies skeleton components have shimmer animation styling
   * Note: We check for the styled-component className presence
   */
  test('skeleton components have shimmer animation', () => {
    const { container: chartContainer } = render(
      <ThemeProvider theme={theme}>
        <SkeletonChart />
      </ThemeProvider>
    );

    const { container: cardContainer } = render(
      <ThemeProvider theme={theme}>
        <SkeletonMetricCard />
      </ThemeProvider>
    );

    // Both should have styled-component classes (shimmer is in CSS)
    expect(chartContainer.firstChild.className).toBeTruthy();
    expect(cardContainer.firstChild.className).toBeTruthy();
  });
});
