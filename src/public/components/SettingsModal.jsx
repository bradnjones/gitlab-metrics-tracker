/**
 * SettingsView Component
 *
 * Inline settings page for entering GitLab credentials.
 * Rendered as a top-level view (tab), not a modal.
 * Credentials are saved to localStorage and restored on page load.
 *
 * Supports three entry modes:
 * - Manual: type token and project path into separate fields
 * - Import JSON: paste a config blob to populate both fields at once
 * - Export JSON: view current credentials as JSON to copy elsewhere
 */

import { useState } from 'react';
import {
  ModalFooter,
  FormGroup,
  Input,
  PrimaryButton,
  SecondaryButton,
} from './AnnotationModal.styles.jsx';
import styled from 'styled-components';

/* ===== STYLED COMPONENTS ===== */

const PageContainer = styled.div`
  padding: ${props => props.theme.spacing.lg};
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.lg};
`;

const PageTitle = styled.h2`
  font-size: ${props => props.theme.typography.fontSize.xl};
  font-weight: ${props => props.theme.typography.fontWeight.bold};
  color: ${props => props.theme.colors.textPrimary};
  margin: 0;
`;

const FormSection = styled.div`
  max-width: 600px;
`;

const TabBar = styled.div`
  display: flex;
  border-bottom: 1px solid ${props => props.theme.colors.border};
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

const TabContent = styled.div`
  padding-top: ${props => props.theme.spacing.lg};
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

const SuccessBanner = styled.div`
  margin: 0 0 ${props => props.theme.spacing.lg} 0;
  font-size: ${props => props.theme.typography.fontSize.sm};
  color: #166534;
  background: #dcfce7;
  border: 1px solid #86efac;
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
 * SettingsView
 *
 * @param {Object} props
 * @param {Function} props.onSave - Called with { gitlabToken, projectPath, anthropicApiKey? } on save
 * @param {boolean} [props.hasCredentials=false]
 * @param {{ gitlabToken: string, projectPath: string, anthropicApiKey?: string } | null} [props.currentCredentials=null]
 * @returns {JSX.Element}
 */
export default function SettingsModal({ onSave, hasCredentials = false, currentCredentials = null }) {
  const [tab, setTab] = useState('manual');
  const [formData, setFormData] = useState({
    gitlabToken: currentCredentials?.gitlabToken ?? '',
    projectPath: currentCredentials?.projectPath ?? '',
    anthropicApiKey: currentCredentials?.anthropicApiKey ?? '',
  });
  const [errors, setErrors] = useState({});
  const [importJson, setImportJson] = useState('');
  const [importError, setImportError] = useState('');
  const [copyLabel, setCopyLabel] = useState('Copy');
  const [saved, setSaved] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    setSaved(false);
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!formData.gitlabToken.trim()) newErrors.gitlabToken = 'Personal Access Token is required';
    if (!formData.projectPath.trim()) newErrors.projectPath = 'Project path is required';
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    onSave({
      gitlabToken: formData.gitlabToken.trim(),
      projectPath: formData.projectPath.trim(),
      anthropicApiKey: formData.anthropicApiKey.trim(),
    });
    setSaved(true);
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
    const { gitlabToken, projectPath, anthropicApiKey } = parsed;
    if (!gitlabToken || typeof gitlabToken !== 'string') {
      setImportError('Missing or invalid "gitlabToken" field');
      return;
    }
    if (!projectPath || typeof projectPath !== 'string') {
      setImportError('Missing or invalid "projectPath" field');
      return;
    }
    onSave({
      gitlabToken: gitlabToken.trim(),
      projectPath: projectPath.trim(),
      anthropicApiKey: typeof anthropicApiKey === 'string' ? anthropicApiKey.trim() : '',
    });
    setSaved(true);
  };

  const handleCopy = () => {
    if (!currentCredentials) return;
    const exportObj = { gitlabToken: currentCredentials.gitlabToken, projectPath: currentCredentials.projectPath };
    if (currentCredentials.anthropicApiKey) exportObj.anthropicApiKey = currentCredentials.anthropicApiKey;
    navigator.clipboard.writeText(JSON.stringify(exportObj, null, 2)).then(() => {
      setCopyLabel('Copied!');
      setTimeout(() => setCopyLabel('Copy'), 2000);
    });
  };

  const exportJson = (() => {
    if (!currentCredentials) return '';
    const exportObj = { gitlabToken: currentCredentials.gitlabToken, projectPath: currentCredentials.projectPath };
    if (currentCredentials.anthropicApiKey) exportObj.anthropicApiKey = currentCredentials.anthropicApiKey;
    return JSON.stringify(exportObj, null, 2);
  })();

  return (
    <PageContainer>
      <PageTitle>Settings</PageTitle>

      <FormSection>
        <TabBar>
          <Tab type="button" $active={tab === 'manual'} onClick={() => setTab('manual')}>Manual</Tab>
          <Tab type="button" $active={tab === 'import'} onClick={() => setTab('import')}>Import JSON</Tab>
          {hasCredentials && (
            <Tab type="button" $active={tab === 'export'} onClick={() => setTab('export')}>Export JSON</Tab>
          )}
        </TabBar>

        <TabContent>
          <MemoryNotice>
            Credentials are saved to browser localStorage and will persist across page reloads.
            They are never stored server-side — GitLab credentials are sent only to your GitLab instance,
            and the Anthropic API key is sent only to the Anthropic API.
          </MemoryNotice>

          {saved && <SuccessBanner>Credentials saved — you can now use the Dashboard.</SuccessBanner>}

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

              <FormGroup>
                <label htmlFor="settings-anthropic-key">Anthropic API Key <span style={{ fontWeight: 'normal', color: 'inherit', opacity: 0.6 }}>(optional — required for AI Metric Review)</span></label>
                <Input
                  type="text"
                  id="settings-anthropic-key"
                  name="anthropicApiKey"
                  value={formData.anthropicApiKey}
                  onChange={handleChange}
                  autoComplete="off"
                  placeholder="sk-ant-..."
                />
              </FormGroup>

              <ModalFooter>
                <div style={{ marginLeft: 'auto' }}>
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
                  onChange={e => { setImportJson(e.target.value); setImportError(''); setSaved(false); }}
                  placeholder={'{\n  "gitlabToken": "glpat-...",\n  "projectPath": "group/project",\n  "anthropicApiKey": "sk-ant-..." \n}'}
                  $hasError={!!importError}
                  spellCheck={false}
                />
                {importError && <ErrorText role="alert">{importError}</ErrorText>}
              </FormGroup>

              <ModalFooter>
                <div style={{ marginLeft: 'auto' }}>
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
            </div>
          )}
        </TabContent>
      </FormSection>
    </PageContainer>
  );
}
