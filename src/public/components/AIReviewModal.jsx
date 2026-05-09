/**
 * AIReviewModal Component
 *
 * Displays an AI-generated metric review report in a scrollable modal.
 * Renders markdown via react-markdown + remark-gfm. Closes on ESC or overlay click.
 *
 * @module components/AIReviewModal
 */

import React, { useEffect, useRef, useState } from 'react';
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
  LoadingState,
  Spinner,
  StatusMessage,
  ErrorMessage,
  AnalysisMeta,
  MetaItem,
  Footer,
  CopyButton,
  KeyboardHint,
  ChatSection,
  ChatThread,
  ChatBubble,
  ChatInputRow,
  ChatInput,
  SendButton,
} from './AIReviewModal.styles.jsx';

/**
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {Object|null} props.analysis - Analysis entity (toJSON output) or null
 * @param {boolean} props.loading - True while request is in flight
 * @param {string|null} props.error
 * @param {string} [props.streamingText] - Partial text being streamed; shown while loading
 * @param {Function} [props.onChat] - Called with (analysisId, message) to send follow-up
 * @param {boolean} [props.chatLoading] - True while chat response is streaming
 * @param {string} [props.chatStreamingText] - Partial chat assistant text while streaming
 * @returns {React.ReactElement|null}
 */
const AIReviewModal = ({
  isOpen,
  onClose,
  analysis = null,
  loading = false,
  error = null,
  streamingText = '',
  onChat = null,
  chatLoading = false,
  chatStreamingText = '',
}) => {
  const closeButtonRef = useRef(null);
  const [chatInput, setChatInput] = useState('');

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

  const handleSend = () => {
    const trimmed = chatInput.trim();
    if (!trimmed || chatLoading || !analysis || !onChat) return;
    onChat(analysis.id, trimmed);
    setChatInput('');
  };

  const handleChatKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
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
          {loading && !streamingText && (
            <LoadingState>
              <Spinner />
              <StatusMessage>Analyzing metrics…</StatusMessage>
            </LoadingState>
          )}
          {loading && streamingText && (
            <MarkdownContent>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingText}</ReactMarkdown>
            </MarkdownContent>
          )}
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

              <ChatSection>
                {((analysis.conversationHistory && analysis.conversationHistory.length > 0) || (chatLoading && chatStreamingText)) && (
                  <ChatThread>
                    {(analysis.conversationHistory || []).map((msg, i) => (
                      <ChatBubble key={i} $isUser={msg.role === 'user'}>
                        {msg.content}
                      </ChatBubble>
                    ))}
                    {chatLoading && chatStreamingText && (
                      <ChatBubble $isUser={false}>{chatStreamingText}</ChatBubble>
                    )}
                  </ChatThread>
                )}
                <ChatInputRow>
                  <ChatInput
                    placeholder="Ask a follow-up question…"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={handleChatKeyDown}
                    disabled={chatLoading}
                    aria-label="Follow-up question"
                  />
                  <SendButton
                    type="button"
                    onClick={handleSend}
                    disabled={chatLoading}
                  >
                    Send
                  </SendButton>
                </ChatInputRow>
              </ChatSection>
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
    id: PropTypes.string,
    response: PropTypes.string,
    model: PropTypes.string,
    latencyMs: PropTypes.number,
    usage: PropTypes.shape({ input: PropTypes.number, output: PropTypes.number }),
    conversationHistory: PropTypes.arrayOf(
      PropTypes.shape({ role: PropTypes.string, content: PropTypes.string })
    ),
  }),
  loading: PropTypes.bool,
  error: PropTypes.string,
  streamingText: PropTypes.string,
  onChat: PropTypes.func,
  chatLoading: PropTypes.bool,
  chatStreamingText: PropTypes.string,
};


export default AIReviewModal;
