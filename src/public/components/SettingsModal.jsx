/**
 * SettingsModal Component
 *
 * Modal for entering GitLab credentials (Personal Access Token and project path).
 * Credentials are held in React state only — never saved to disk, localStorage,
 * or sessionStorage.
 *
 * Supports three entry modes:
 * - Manual: type token and project path into separate fields
 * - Import: paste a JSON config blob to populate both fields at once
 * - Export: view the current credentials as a JSON blob to copy elsewhere
 *
 * Rules:
 * - Not dismissible when credentials are null (forces entry before using the app).
 * - Dismissible (shows Cancel) when credentials are already set.
 */

import { useState, useEffect } from 'react';
import {
  ModalOverlay,
  Modal,
  ModalHeader,
  CloseButton,
  ModalBody,
  ModalFooter,
  FormGroup,
  Input,
  PrimaryButton,
  SecondaryButton,
} from './AnnotationModal.styles.jsx';
import styled from 'styled-components';

/* ===== STYLED COMPONENTS ===== */

const TabBar = styled.div`
  display: flex;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  margin-bottom: ${props => props.theme.spacing.lg};
  gap: 0;
`;

const Tab = styled.button`
  background: none;
  border: none;
  border-bottom: 2px solid ${props => props.$active ? props.theme.colors.primary : 'transparent'};
  color: ${props => props.$active ? props.theme.colors.primary : props.theme.colors.textSecondary};
  cursor: pointer;
  font-size: ${props => props.theme.typography.fontSize.sm};
  font-weight: ${props => props.$active ? props.theme.typography.fontWeight.semibold : props.theme.typography.fontWeight.medium};
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  transition: color 0.15s, border-color 0.15s;
  margin-bottom: -1px;

  &:hover {
    color: ${props => props.theme.colors.primary};
  }
`;

const MemoryNotice = styled.p`
  margin: 0 0 ${props => props.theme.spacing.lg} 0;
  font-size: ${props => props.theme.typography.fontSize.sm};
  color: ${props => props.theme.colors.textSecondary};
  background: ${props => props.theme.colors.bgSecondary};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.md};
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  line-height: 1.5;
`;

const JsonTextarea = styled.textarea`
  width: 100%;
  box-sizing: border-box;
  min-height: 120px;
  font-family: 'Courier New', Courier, monospace;
  font-size: ${props => props.theme.typography.fontSize.sm};
  border: 1px solid ${props => props.$hasError ? 'red' : props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.md};
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  resize: vertical;
  background: ${props => props.theme.colors.bgSecondary};
  color: ${props => props.theme.colors.textPrimary};

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 2px ${props => props.theme.colors.primary}33;
  }
`;

const ErrorText = styled.span`
  color: red;
  font-size: ${props => props.theme.typography.fontSize.sm};
  display: block;
  margin-top: 4px;
`;

const CopyButton = styled.button`
  background: none;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.md};
  color: ${props => props.theme.colors.textSecondary};
  cursor: pointer;
  font-size: ${props => props.theme.typography.fontSize.sm};
  padding: 4px 10px;
  transition: background 0.15s, color 0.15s;

  &:hover {
    background: ${props => props.theme.colors.bgSecondary};
    color: ${props => props.theme.colors.textPrimary};
  }
`;

const ExportLabelRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${props => props.theme.spacing.sm};
`;

/* ===== COMPONENT ===== */

/**
 * SettingsModal
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onSave - Called with { gitlabToken, projectPath }
 * @param {Function} props.onClose - Called when Cancel clicked (only when credentials set)
 * @param {boolean} [props.hasCredentials=false]
 * @param {{ gitlabToken: string, projectPath: string } | null} [props.currentCredentials=null]
 * @returns {JSX.Element|null}
 */
export default function SettingsModal({ isOpen, onSave, onClose, hasCredentials = false, currentCredentials = null }) {
  const [tab, setTab] = useState('manual');
  const [formData, setFormData] = useState({ gitlabToken: '', projectPath: '' });
  const [errors, setErrors] = useState({});
  const [importJson, setImportJson] = useState('');
  const [importError, setImportError] = useState('');
  const [copyLabel, setCopyLabel] = useState('Copy');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setTab('manual');
      setFormData({ gitlabToken: '', projectPath: '' });
      setErrors({});
      setImportJson('');
      setImportError('');
      setCopyLabel('Copy');
    }
  }, [isOpen]);

  // Escape key closes only when already configured
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen && hasCredentials) onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, hasCredentials, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!formData.gitlabToken.trim()) newErrors.gitlabToken = 'Personal Access Token is required';
    if (!formData.projectPath.trim()) newErrors.projectPath = 'Project path is required';
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    onSave({ gitlabToken: formData.gitlabToken.trim(), projectPath: formData.projectPath.trim() });
  };

  const handleImportSubmit = (e) => {
    e.preventDefault();
    setImportError('');
    let parsed;
    try {
      parsed = JSON.parse(importJson.trim());
    } catch {
      setImportError('Invalid JSON — check the format and try again');
      return;
    }
    const { gitlabToken, projectPath } = parsed;
    if (!gitlabToken || typeof gitlabToken !== 'string') {
      setImportError('Missing or invalid "gitlabToken" field');
      return;
    }
    if (!projectPath || typeof projectPath !== 'string') {
      setImportError('Missing or invalid "projectPath" field');
      return;
    }
    onSave({ gitlabToken: gitlabToken.trim(), projectPath: projectPath.trim() });
  };

  const handleCopy = () => {
    if (!currentCredentials) return;
    const json = JSON.stringify({ gitlabToken: currentCredentials.gitlabToken, projectPath: currentCredentials.projectPath }, null, 2);
    navigator.clipboard.writeText(json).then(() => {
      setCopyLabel('Copied!');
      setTimeout(() => setCopyLabel('Copy'), 2000);
    });
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && hasCredentials) onClose();
  };

  if (!isOpen) return null;

  const exportJson = currentCredentials
    ? JSON.stringify({ gitlabToken: currentCredentials.gitlabToken, projectPath: currentCredentials.projectPath }, null, 2)
    : '';

  return (
    <ModalOverlay onClick={handleOverlayClick}>
      <Modal>
        <ModalHeader>
          <h3>GitLab Settings</h3>
          {hasCredentials && (
            <CloseButton type="button" onClick={onClose} aria-label="Close settings">
              &times;
            </CloseButton>
          )}
        </ModalHeader>

        <ModalBody noValidate>
          <MemoryNotice>
            Credentials are held in browser memory only and are never saved to disk.
            You will need to re-enter them each time you reload the page.
          </MemoryNotice>

          <TabBar>
            <Tab type="button" $active={tab === 'manual'} onClick={() => setTab('manual')}>Manual</Tab>
            <Tab type="button" $active={tab === 'import'} onClick={() => setTab('import')}>Import JSON</Tab>
            {hasCredentials && (
              <Tab type="button" $active={tab === 'export'} onClick={() => setTab('export')}>Export JSON</Tab>
            )}
          </TabBar>

          {tab === 'manual' && (
            <form onSubmit={handleManualSubmit} noValidate>
              <FormGroup>
                <label htmlFor="settings-token">GitLab Personal Access Token</label>
                <Input
                  type="text"
                  id="settings-token"
                  name="gitlabToken"
                  value={formData.gitlabToken}
                  onChange={handleChange}
                  autoComplete="off"
                  placeholder="glpat-xxxxxxxxxxxxxxxxxxxx"
                  required
                />
                {errors.gitlabToken && <span role="alert" style={{ color: 'red', fontSize: '0.875rem' }}>{errors.gitlabToken}</span>}
              </FormGroup>

              <FormGroup>
                <label htmlFor="settings-project">GitLab Project Path</label>
                <Input
                  type="text"
                  id="settings-project"
                  name="projectPath"
                  value={formData.projectPath}
                  onChange={handleChange}
                  placeholder="group/subgroup/project"
                  required
                />
                {errors.projectPath && <span role="alert" style={{ color: 'red', fontSize: '0.875rem' }}>{errors.projectPath}</span>}
              </FormGroup>

              <ModalFooter>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '1rem' }}>
                  {hasCredentials && <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>}
                  <PrimaryButton type="submit">Save</PrimaryButton>
                </div>
              </ModalFooter>
            </form>
          )}

          {tab === 'import' && (
            <form onSubmit={handleImportSubmit} noValidate>
              <FormGroup>
                <label htmlFor="settings-import-json">Paste config JSON</label>
                <JsonTextarea
                  id="settings-import-json"
                  value={importJson}
                  onChange={e => { setImportJson(e.target.value); setImportError(''); }}
                  placeholder={'{\n  "gitlabToken": "glpat-...",\n  "projectPath": "group/project"\n}'}
                  $hasError={!!importError}
                  spellCheck={false}
                />
                {importError && <ErrorText role="alert">{importError}</ErrorText>}
              </FormGroup>

              <ModalFooter>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '1rem' }}>
                  {hasCredentials && <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>}
                  <PrimaryButton type="submit">Import &amp; Save</PrimaryButton>
                </div>
              </ModalFooter>
            </form>
          )}

          {tab === 'export' && hasCredentials && (
            <div>
              <FormGroup>
                <ExportLabelRow>
                  <label htmlFor="settings-export-json">Current config</label>
                  <CopyButton type="button" onClick={handleCopy}>{copyLabel}</CopyButton>
                </ExportLabelRow>
                <JsonTextarea
                  id="settings-export-json"
                  value={exportJson}
                  readOnly
                  spellCheck={false}
                  onClick={e => e.target.select()}
                  aria-label="Exported config JSON"
                />
              </FormGroup>

              <ModalFooter>
                <div style={{ marginLeft: 'auto' }}>
                  <SecondaryButton type="button" onClick={onClose}>Close</SecondaryButton>
                </div>
              </ModalFooter>
            </div>
          )}
        </ModalBody>
      </Modal>
    </ModalOverlay>
  );
}
