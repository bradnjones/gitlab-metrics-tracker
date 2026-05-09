/**
 * AIReviewModal Component
 *
 * Displays an AI-generated metric review report in a scrollable modal.
 * Renders markdown via react-markdown + remark-gfm. Closes on ESC or overlay click.
 *
 * @module components/AIReviewModal
 */

import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Overlay,
  Modal,
  Header,
  CloseButton,
  ContentBody,
  MarkdownContent,
  StatusMessage,
  ErrorMessage,
  AnalysisMeta,
  MetaItem,
  Footer,
  CopyButton,
  KeyboardHint,
} from './AIReviewModal.styles.jsx';

/**
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {Object|null} props.analysis - Analysis entity (toJSON output) or null
 * @param {boolean} props.loading - True while request is in flight
 * @param {string|null} props.error
 * @returns {React.ReactElement|null}
 */
const AIReviewModal = ({ isOpen, onClose, analysis = null, loading = false, error = null }) => {
  const closeButtonRef = useRef(null);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && closeButtonRef.current) {
      setTimeout(() => closeButtonRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(analysis.response);
  };

  if (!isOpen) return null;

  const totalTokens =
    analysis?.usage ? (analysis.usage.input || 0) + (analysis.usage.output || 0) : null;

  return (
    <Overlay onClick={handleOverlayClick}>
      <Modal role="dialog" aria-modal="true" aria-labelledby="ai-review-title">
        <Header>
          <h3 id="ai-review-title">AI Metric Review</h3>
          <CloseButton
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close AI review"
          >
            &times;
          </CloseButton>
        </Header>

        <ContentBody>
          {loading && <StatusMessage>Analyzing metrics…</StatusMessage>}
          {!loading && error && <ErrorMessage>{error}</ErrorMessage>}
          {!loading && !error && analysis && (
            <>
              <MarkdownContent>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {analysis.response || ''}
                </ReactMarkdown>
              </MarkdownContent>
              <AnalysisMeta>
                {analysis.model && <MetaItem>Model: {analysis.model}</MetaItem>}
                {analysis.latencyMs != null && (
                  <MetaItem>Latency: {(analysis.latencyMs / 1000).toFixed(1)}s</MetaItem>
                )}
                {totalTokens != null && <MetaItem>Tokens: {totalTokens}</MetaItem>}
              </AnalysisMeta>
            </>
          )}
        </ContentBody>

        {analysis?.response && (
          <Footer>
            <CopyButton type="button" onClick={handleCopy}>
              Copy as Markdown
            </CopyButton>
          </Footer>
        )}

        <KeyboardHint>Press ESC to close</KeyboardHint>
      </Modal>
    </Overlay>
  );
};

AIReviewModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  analysis: PropTypes.shape({
    response: PropTypes.string,
    model: PropTypes.string,
    latencyMs: PropTypes.number,
    usage: PropTypes.shape({ input: PropTypes.number, output: PropTypes.number }),
  }),
  loading: PropTypes.bool,
  error: PropTypes.string,
};


export default AIReviewModal;
