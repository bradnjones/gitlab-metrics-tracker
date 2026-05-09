/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import AIReviewModal from '../../../src/public/components/AIReviewModal.jsx';

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
    danger: '#ef4444',
  },
  spacing: { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px', xxl: '48px' },
  borderRadius: { sm: '4px', md: '6px', lg: '8px', xl: '12px' },
  shadows: { xl: '0 20px 25px -5px rgba(0,0,0,0.1)' },
  typography: {
    fontSize: { xs: '0.75rem', sm: '0.875rem', base: '1rem', lg: '1.125rem', xl: '1.25rem' },
    fontWeight: { medium: 500, semibold: 600 },
    lineHeight: { normal: 1.5 },
  },
  breakpoints: { tablet: '768px' },
  transitions: { normal: '200ms', easing: 'ease-in-out' },
  zIndex: { modal: 1000 },
};

const makeAnalysis = (overrides = {}) => ({
  id: 'test-id',
  createdAt: '2025-01-15T12:00:00.000Z',
  response: '## Headline\n\nAll metrics stable.',
  model: 'claude-sonnet-4-6',
  latencyMs: 2500,
  usage: { input: 1000, output: 300 },
  status: 'succeeded',
  ...overrides,
});

function renderModal(props = {}) {
  const defaults = { isOpen: true, onClose: jest.fn(), analysis: makeAnalysis(), loading: false, error: null };
  return render(
    <ThemeProvider theme={theme}>
      <AIReviewModal {...defaults} {...props} />
    </ThemeProvider>
  );
}

describe('AIReviewModal', () => {
  it('returns null when isOpen is false', () => {
    const { container } = renderModal({ isOpen: false });
    expect(container.firstChild).toBeNull();
  });

  it('renders modal header and close button when open', () => {
    renderModal();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('Close AI review')).toBeInTheDocument();
    expect(screen.getByText('AI Metric Review')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = jest.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByLabelText('Close AI review'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when ESC key is pressed', () => {
    const onClose = jest.fn();
    renderModal({ onClose });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders without optional props (uses defaults)', () => {
    render(
      <ThemeProvider theme={theme}>
        <AIReviewModal isOpen={true} onClose={() => {}} />
      </ThemeProvider>
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows spinner and loading text when loading=true', () => {
    renderModal({ loading: true, analysis: null });
    expect(screen.getByText(/analyzing/i)).toBeInTheDocument();
  });

  it('shows error message when error is set', () => {
    renderModal({ loading: false, analysis: null, error: 'AI not configured' });
    expect(screen.getByText(/AI not configured/)).toBeInTheDocument();
  });

  it('renders analysis response content', () => {
    renderModal();
    expect(screen.getByText(/All metrics stable/)).toBeInTheDocument();
  });

  it('renders model and latency metadata when analysis exists', () => {
    renderModal();
    expect(screen.getByText(/claude-sonnet-4-6/)).toBeInTheDocument();
    expect(screen.getByText(/2\.5s/)).toBeInTheDocument();
  });

  it('calls clipboard writeText when copy button is clicked', () => {
    Object.assign(navigator, { clipboard: { writeText: jest.fn() } });
    renderModal();
    fireEvent.click(screen.getByText(/copy/i));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('## Headline\n\nAll metrics stable.');
  });

  it('does not render copy button when analysis has no response', () => {
    renderModal({ analysis: makeAnalysis({ response: null }) });
    expect(screen.queryByText(/copy/i)).toBeNull();
  });

  it('calls onClose when overlay background is clicked directly', () => {
    const onClose = jest.fn();
    const { container } = renderModal({ onClose });
    fireEvent.click(container.firstChild); // Click the overlay itself (not a child)
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close when clicking modal content (not the overlay)', () => {
    const onClose = jest.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not close when a non-ESC key is pressed', () => {
    const onClose = jest.fn();
    renderModal({ onClose });
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows no token count when analysis has no usage', () => {
    renderModal({ analysis: makeAnalysis({ usage: null }) });
    expect(screen.queryByText(/tokens/i)).toBeNull();
  });

  it('shows no model or latency when analysis has null fields', () => {
    renderModal({ analysis: makeAnalysis({ model: null, latencyMs: null, usage: null }) });
    expect(screen.queryByText(/model:/i)).toBeNull();
    expect(screen.queryByText(/latency:/i)).toBeNull();
  });

  it('shows spinner when loading=true and no streamingText', () => {
    renderModal({ loading: true, analysis: null, streamingText: '' });
    expect(screen.getByText(/analyzing/i)).toBeInTheDocument();
  });

  it('renders streaming partial markdown when loading=true and streamingText is non-empty', () => {
    renderModal({ loading: true, analysis: null, streamingText: '## Partial heading' });
    expect(screen.queryByText(/analyzing/i)).toBeNull();
    expect(screen.getByText(/Partial heading/)).toBeInTheDocument();
  });

  it('renders final analysis (not streamingText) when loading=false and analysis is set', () => {
    renderModal({
      loading: false,
      analysis: makeAnalysis({ response: '## Final report' }),
      streamingText: '## Partial heading',
    });
    expect(screen.getByText(/Final report/)).toBeInTheDocument();
    expect(screen.queryByText(/Partial heading/)).toBeNull();
  });
});
