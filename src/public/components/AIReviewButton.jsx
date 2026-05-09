/**
 * AIReviewButton Component
 *
 * Toolbar button that triggers an AI metric review.
 * Disabled while loading or when explicitly disabled (no iterations).
 * Shows a "Last reviewed X ago" hint after the first successful run.
 *
 * @module components/AIReviewButton
 */

import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
`;

const Button = styled.button`
  background: ${(p) => p.theme.colors.primary};
  border: none;
  border-radius: ${(p) => p.theme.borderRadius.full};
  color: #fff;
  cursor: pointer;
  font-size: ${(p) => p.theme.typography.fontSize.sm};
  font-weight: ${(p) => p.theme.typography.fontWeight.medium};
  padding: 4px 14px;
  transition: background ${(p) => p.theme.transitions.fast} ${(p) => p.theme.transitions.easing};

  &:hover:not(:disabled) {
    background: ${(p) => p.theme.colors.primaryDark};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:focus {
    outline: 2px solid ${(p) => p.theme.colors.primary};
    outline-offset: 2px;
  }
`;

const LastReviewed = styled.button`
  background: none;
  border: none;
  padding: 0;
  font-size: ${(p) => p.theme.typography.fontSize.xs};
  color: ${(p) => p.theme.colors.textSecondary};
  cursor: pointer;
  text-decoration: underline;
  text-decoration-style: dotted;

  &:hover { color: ${(p) => p.theme.colors.primary}; }
  &:focus { outline: 2px solid ${(p) => p.theme.colors.primary}; outline-offset: 2px; border-radius: 2px; }
`;

/**
 * Format a past ISO timestamp as a human-readable "X ago" string.
 *
 * @param {string} isoString
 * @returns {string}
 */
function formatRelative(isoString) {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/**
 * @param {Object} props
 * @param {Function} props.onClick
 * @param {boolean} [props.loading=false]
 * @param {boolean} [props.disabled=false]
 * @param {Object|null} [props.lastAnalysis] - Most recent analysis (toJSON output)
 * @returns {React.ReactElement}
 */
const AIReviewButton = ({ onClick, onOpenLast, loading = false, disabled = false, lastAnalysis = null }) => {
  return (
    <Wrapper>
      <Button
        type="button"
        onClick={onClick}
        disabled={disabled || loading}
        aria-label={loading ? 'Reviewing…' : 'Review with AI'}
      >
        {loading ? 'Reviewing…' : 'Review with AI'}
      </Button>
      {lastAnalysis && (
        <LastReviewed type="button" onClick={onOpenLast} aria-label="View last AI review">
          Last reviewed {formatRelative(lastAnalysis.createdAt)}
        </LastReviewed>
      )}
    </Wrapper>
  );
};

AIReviewButton.propTypes = {
  onClick: PropTypes.func.isRequired,
  onOpenLast: PropTypes.func,
  loading: PropTypes.bool,
  disabled: PropTypes.bool,
  lastAnalysis: PropTypes.shape({ createdAt: PropTypes.string }),
};


export default AIReviewButton;
