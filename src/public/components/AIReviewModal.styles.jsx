/**
 * AIReviewModal Styled Components
 *
 * @module components/AIReviewModal.styles
 */

import styled from 'styled-components';

export const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${(p) => p.theme.spacing.md};
  background: rgba(0, 0, 0, 0.6);
  z-index: ${(p) => p.theme.zIndex.modal};
  animation: fadeIn 0.2s ease-out;

  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
`;

export const Modal = styled.div`
  width: 80vw;
  max-width: 900px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  background: ${(p) => p.theme.colors.bgPrimary};
  border-radius: ${(p) => p.theme.borderRadius.xl};
  box-shadow: ${(p) => p.theme.shadows.xl};
  overflow: hidden;
  animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  @media (max-width: ${(p) => p.theme.breakpoints.tablet}) {
    width: 100%;
    max-width: 100%;
    max-height: 100%;
    border-radius: 0;
  }
`;

export const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${(p) => p.theme.spacing.lg};
  flex-shrink: 0;
  border-bottom: 1px solid ${(p) => p.theme.colors.border};

  h3 {
    margin: 0;
    font-size: ${(p) => p.theme.typography.fontSize.xl};
    font-weight: ${(p) => p.theme.typography.fontWeight.semibold};
    color: ${(p) => p.theme.colors.textPrimary};
  }
`;

export const CloseButton = styled.button`
  background: none;
  border: none;
  padding: ${(p) => p.theme.spacing.sm};
  margin: -${(p) => p.theme.spacing.sm};
  font-size: 2rem;
  line-height: 1;
  color: ${(p) => p.theme.colors.textSecondary};
  cursor: pointer;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color ${(p) => p.theme.transitions.normal} ${(p) => p.theme.transitions.easing};

  &:hover { color: ${(p) => p.theme.colors.textPrimary}; }
  &:focus {
    outline: 2px solid ${(p) => p.theme.colors.primary};
    outline-offset: 2px;
    border-radius: ${(p) => p.theme.borderRadius.sm};
  }
`;

export const ContentBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${(p) => p.theme.spacing.lg};
`;

export const MarkdownContent = styled.div`
  font-size: ${(p) => p.theme.typography.fontSize.base};
  line-height: ${(p) => p.theme.typography.lineHeight.normal};
  color: ${(p) => p.theme.colors.textPrimary};

  h1, h2, h3 { color: ${(p) => p.theme.colors.textPrimary}; margin-top: 1.5em; }
  h1:first-child, h2:first-child, h3:first-child { margin-top: 0; }
  p { margin-bottom: 0.75em; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 1em; }
  th, td { border: 1px solid ${(p) => p.theme.colors.border}; padding: 6px 12px; text-align: left; }
  th { background: ${(p) => p.theme.colors.bgTertiary}; font-weight: ${(p) => p.theme.typography.fontWeight.semibold}; }
  code { background: ${(p) => p.theme.colors.bgTertiary}; padding: 2px 4px; border-radius: 3px; font-size: 0.9em; }
`;

export const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${(p) => p.theme.spacing.md};
  padding: ${(p) => p.theme.spacing.xl};
`;

export const Spinner = styled.div`
  width: 32px;
  height: 32px;
  border: 3px solid ${(p) => p.theme.colors.border};
  border-top-color: ${(p) => p.theme.colors.primary};
  border-radius: 50%;
  animation: spin 0.8s linear infinite;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

export const StatusMessage = styled.p`
  color: ${(p) => p.theme.colors.textSecondary};
  font-size: ${(p) => p.theme.typography.fontSize.base};
  text-align: center;
  margin: 0;
`;

export const ErrorMessage = styled.p`
  color: ${(p) => p.theme.colors.danger};
  font-size: ${(p) => p.theme.typography.fontSize.base};
  padding: ${(p) => p.theme.spacing.md};
  border: 1px solid ${(p) => p.theme.colors.danger};
  border-radius: ${(p) => p.theme.borderRadius.md};
`;

export const AnalysisMeta = styled.div`
  display: flex;
  gap: ${(p) => p.theme.spacing.lg};
  margin-top: ${(p) => p.theme.spacing.lg};
  padding-top: ${(p) => p.theme.spacing.md};
  border-top: 1px solid ${(p) => p.theme.colors.border};
`;

export const MetaItem = styled.span`
  font-size: ${(p) => p.theme.typography.fontSize.sm};
  color: ${(p) => p.theme.colors.textSecondary};
`;

export const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  padding: ${(p) => p.theme.spacing.md} ${(p) => p.theme.spacing.lg};
  border-top: 1px solid ${(p) => p.theme.colors.border};
  flex-shrink: 0;
`;

export const CopyButton = styled.button`
  background: none;
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: ${(p) => p.theme.borderRadius.md};
  padding: ${(p) => p.theme.spacing.sm} ${(p) => p.theme.spacing.md};
  font-size: ${(p) => p.theme.typography.fontSize.sm};
  color: ${(p) => p.theme.colors.textSecondary};
  cursor: pointer;
  transition: all ${(p) => p.theme.transitions.normal} ${(p) => p.theme.transitions.easing};

  &:hover {
    background: ${(p) => p.theme.colors.bgTertiary};
    color: ${(p) => p.theme.colors.textPrimary};
  }
`;

export const KeyboardHint = styled.div`
  padding: ${(p) => p.theme.spacing.sm} ${(p) => p.theme.spacing.lg};
  text-align: center;
  font-size: ${(p) => p.theme.typography.fontSize.sm};
  color: ${(p) => p.theme.colors.textSecondary};
  background: ${(p) => p.theme.colors.bgTertiary};
  border-top: 1px solid ${(p) => p.theme.colors.border};
  flex-shrink: 0;

  @media (max-width: ${(p) => p.theme.breakpoints.tablet}) {
    display: none;
  }
`;

export const ChatSection = styled.div`
  border-top: 1px solid ${(p) => p.theme.colors.border};
  margin-top: ${(p) => p.theme.spacing.lg};
  padding-top: ${(p) => p.theme.spacing.md};
`;

export const ChatThread = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(p) => p.theme.spacing.sm};
  margin-bottom: ${(p) => p.theme.spacing.md};
  max-height: 280px;
  overflow-y: auto;
`;

export const ChatBubble = styled.div`
  max-width: 80%;
  padding: ${(p) => p.theme.spacing.sm} ${(p) => p.theme.spacing.md};
  border-radius: ${(p) => p.theme.borderRadius.lg};
  font-size: ${(p) => p.theme.typography.fontSize.sm};
  line-height: ${(p) => p.theme.typography.lineHeight.normal};
  align-self: ${(p) => (p.$isUser ? 'flex-end' : 'flex-start')};
  background: ${(p) =>
    p.$isUser ? p.theme.colors.primary : p.theme.colors.bgTertiary};
  color: ${(p) =>
    p.$isUser ? '#fff' : p.theme.colors.textPrimary};
  word-break: break-word;

  /* Markdown styles for assistant bubbles */
  p { margin: 0 0 0.5em 0; }
  p:last-child { margin-bottom: 0; }
  h1, h2, h3 { margin: 0.75em 0 0.25em; font-size: 1em; font-weight: 600; }
  ul, ol { margin: 0.25em 0 0.5em 1.25em; padding: 0; }
  li { margin-bottom: 0.2em; }
  strong { font-weight: 600; }
  code { background: rgba(0,0,0,0.08); padding: 1px 4px; border-radius: 3px; font-size: 0.9em; }
  table { border-collapse: collapse; width: 100%; margin: 0.5em 0; font-size: 0.85em; }
  th, td { border: 1px solid ${(p) => p.theme.colors.border}; padding: 4px 8px; text-align: left; }
  th { background: rgba(0,0,0,0.05); font-weight: 600; }
`;

export const ChatInputRow = styled.div`
  display: flex;
  gap: ${(p) => p.theme.spacing.sm};
  align-items: flex-end;
`;

export const ChatInput = styled.input`
  flex: 1;
  padding: ${(p) => p.theme.spacing.sm} ${(p) => p.theme.spacing.md};
  font-size: ${(p) => p.theme.typography.fontSize.sm};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: ${(p) => p.theme.borderRadius.md};
  background: ${(p) => p.theme.colors.bgPrimary};
  color: ${(p) => p.theme.colors.textPrimary};
  outline: none;

  &:focus {
    border-color: ${(p) => p.theme.colors.primary};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export const SendButton = styled.button`
  padding: ${(p) => p.theme.spacing.sm} ${(p) => p.theme.spacing.md};
  background: ${(p) => p.theme.colors.primary};
  color: #fff;
  border: none;
  border-radius: ${(p) => p.theme.borderRadius.md};
  font-size: ${(p) => p.theme.typography.fontSize.sm};
  font-weight: ${(p) => p.theme.typography.fontWeight.medium};
  cursor: pointer;
  white-space: nowrap;
  transition: background ${(p) => p.theme.transitions.normal} ${(p) => p.theme.transitions.easing};

  &:hover:not(:disabled) {
    background: ${(p) => p.theme.colors.primaryDark || p.theme.colors.primary};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;
