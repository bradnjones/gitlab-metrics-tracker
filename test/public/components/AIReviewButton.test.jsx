/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import AIReviewButton from '../../../src/public/components/AIReviewButton.jsx';

const theme = {
  colors: {
    primary: '#3b82f6',
    primaryDark: '#2563eb',
    bgPrimary: '#ffffff',
    bgSecondary: '#f9fafb',
    bgTertiary: '#f3f4f6',
    textPrimary: '#111827',
    textSecondary: '#6b7280',
    border: '#e5e7eb',
  },
  spacing: { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px' },
  borderRadius: { full: '9999px', sm: '4px', md: '6px' },
  typography: {
    fontSize: { xs: '0.75rem', sm: '0.875rem', base: '1rem' },
    fontWeight: { medium: 500, semibold: 600 },
  },
  transitions: { fast: '150ms', normal: '200ms', easing: 'ease-in-out' },
};

function renderButton(props = {}) {
  const defaults = { onClick: jest.fn(), loading: false, disabled: false, lastAnalysis: null };
  return render(
    <ThemeProvider theme={theme}>
      <AIReviewButton {...defaults} {...props} />
    </ThemeProvider>
  );
}

describe('AIReviewButton', () => {
  it('renders "Review with AI" text when idle', () => {
    renderButton();
    expect(screen.getByRole('button', { name: /review with ai/i })).toBeInTheDocument();
  });

  it('shows "Reviewing…" text while loading', () => {
    renderButton({ loading: true });
    expect(screen.getByRole('button', { name: /reviewing/i })).toBeInTheDocument();
  });

  it('is disabled when disabled prop is true', () => {
    renderButton({ disabled: true });
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('is disabled while loading', () => {
    renderButton({ loading: true });
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('calls onClick when clicked and not disabled', () => {
    const onClick = jest.fn();
    renderButton({ onClick });
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('shows "Last reviewed" text when lastAnalysis exists', () => {
    renderButton({ lastAnalysis: { createdAt: new Date().toISOString() } });
    expect(screen.getByText(/last reviewed/i)).toBeInTheDocument();
  });

  it('does not show "Last reviewed" text when lastAnalysis is null', () => {
    renderButton({ lastAnalysis: null });
    expect(screen.queryByText(/last reviewed/i)).toBeNull();
  });

  it('shows "just now" for a very recent lastAnalysis', () => {
    renderButton({ lastAnalysis: { createdAt: new Date().toISOString() } });
    expect(screen.getByText(/just now/i)).toBeInTheDocument();
  });

  it('shows minutes ago for lastAnalysis 10 minutes old', () => {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60_000).toISOString();
    renderButton({ lastAnalysis: { createdAt: tenMinutesAgo } });
    expect(screen.getByText(/10m ago/)).toBeInTheDocument();
  });

  it('shows hours ago for lastAnalysis 3 hours old', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60_000).toISOString();
    renderButton({ lastAnalysis: { createdAt: threeHoursAgo } });
    expect(screen.getByText(/3h ago/)).toBeInTheDocument();
  });

  it('renders correctly with only required onClick prop', () => {
    render(
      <ThemeProvider theme={theme}>
        <AIReviewButton onClick={() => {}} />
      </ThemeProvider>
    );
    expect(screen.getByRole('button', { name: /review with ai/i })).not.toBeDisabled();
  });

  it('shows days ago for lastAnalysis 2 days old', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60_000).toISOString();
    renderButton({ lastAnalysis: { createdAt: twoDaysAgo } });
    expect(screen.getByText(/2d ago/)).toBeInTheDocument();
  });
});
