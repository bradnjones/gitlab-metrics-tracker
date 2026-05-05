/**
 * SettingsModal Component
 *
 * Modal for entering GitLab credentials (Personal Access Token and project path).
 * Credentials are held in React state only — never saved to disk, localStorage,
 * or sessionStorage.
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

/**
 * Small notice box below the form fields
 * @component
 */
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

/**
 * SettingsModal
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is visible
 * @param {Function} props.onSave - Called with { gitlabToken, projectPath } when user clicks Save
 * @param {Function} props.onClose - Called when user clicks Cancel (only shown when credentials already set)
 * @param {boolean} [props.hasCredentials=false] - Whether credentials are already set (controls Cancel visibility)
 * @returns {JSX.Element|null}
 */
export default function SettingsModal({ isOpen, onSave, onClose, hasCredentials = false }) {
  const [formData, setFormData] = useState({ gitlabToken: '', projectPath: '' });
  const [errors, setErrors] = useState({});

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({ gitlabToken: '', projectPath: '' });
      setErrors({});
    }
  }, [isOpen]);

  // Escape key closes only when already configured
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen && hasCredentials) {
        onClose();
      }
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

  /**
   * @param {React.ChangeEvent<HTMLInputElement>} e
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  /**
   * @param {React.FormEvent} e
   */
  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!formData.gitlabToken.trim()) {
      newErrors.gitlabToken = 'Personal Access Token is required';
    }
    if (!formData.projectPath.trim()) {
      newErrors.projectPath = 'Project path is required';
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    onSave({ gitlabToken: formData.gitlabToken.trim(), projectPath: formData.projectPath.trim() });
  };

  /**
   * Overlay click only closes when credentials are already set
   * @param {React.MouseEvent} e
   */
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && hasCredentials) {
      onClose();
    }
  };

  if (!isOpen) return null;

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

        <ModalBody onSubmit={handleSubmit} noValidate>
          <MemoryNotice>
            These credentials are held in browser memory only and are never saved to disk.
            You will need to re-enter them each time you reload the page.
          </MemoryNotice>

          <FormGroup>
            <label htmlFor="settings-token">GitLab Personal Access Token</label>
            <Input
              type="password"
              id="settings-token"
              name="gitlabToken"
              value={formData.gitlabToken}
              onChange={handleChange}
              autoComplete="off"
              placeholder="glpat-xxxxxxxxxxxxxxxxxxxx"
              required
            />
            {errors.gitlabToken && (
              <span role="alert" style={{ color: 'red', fontSize: '0.875rem' }}>
                {errors.gitlabToken}
              </span>
            )}
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
            {errors.projectPath && (
              <span role="alert" style={{ color: 'red', fontSize: '0.875rem' }}>
                {errors.projectPath}
              </span>
            )}
          </FormGroup>

          <ModalFooter>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '1rem' }}>
              {hasCredentials && (
                <SecondaryButton type="button" onClick={onClose}>
                  Cancel
                </SecondaryButton>
              )}
              <PrimaryButton type="submit">Save</PrimaryButton>
            </div>
          </ModalFooter>
        </ModalBody>
      </Modal>
    </ModalOverlay>
  );
}
