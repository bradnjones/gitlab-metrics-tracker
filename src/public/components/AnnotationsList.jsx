/**
 * AnnotationsList Component
 * Simple dropdown list showing all annotations with edit capability
 */

import { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';

const ListContainer = styled.div`
  position: relative;
  display: inline-block;
`;

const ListButton = styled.button`
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: ${props => props.theme.borderRadius.md};
  padding: 0.5rem 1rem;
  font-size: ${props => props.theme.typography.fontSize.sm};
  font-weight: ${props => props.theme.typography.fontWeight.medium};
  cursor: pointer;
  transition: all ${props => props.theme.transitions.fast} ${props => props.theme.transitions.easing};

  &:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.3);
  }

  &:focus {
    outline: 2px solid rgba(255, 255, 255, 0.5);
    outline-offset: 2px;
  }
`;

const Dropdown = styled.div`
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  background: ${props => props.theme.colors.bgPrimary};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.lg};
  box-shadow: ${props => props.theme.shadows.lg};
  min-width: 300px;
  max-width: 400px;
  max-height: 400px;
  overflow-y: auto;
  z-index: ${props => props.theme.zIndex.dropdown};
`;

const AnnotationItem = styled.div`
  padding: 0.75rem 1rem;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  cursor: pointer;
  transition: background ${props => props.theme.transitions.fast} ${props => props.theme.transitions.easing};

  &:hover {
    background: ${props => props.theme.colors.bgSecondary};
  }

  &:last-child {
    border-bottom: none;
  }
`;

const AnnotationTitle = styled.div`
  font-weight: ${props => props.theme.typography.fontWeight.medium};
  color: ${props => props.theme.colors.textPrimary};
  margin-bottom: 0.25rem;
`;

const AnnotationMeta = styled.div`
  font-size: ${props => props.theme.typography.fontSize.sm};
  color: ${props => props.theme.colors.textSecondary};
`;

const EmptyState = styled.div`
  padding: 2rem;
  text-align: center;
  color: ${props => props.theme.colors.textSecondary};
  font-size: ${props => props.theme.typography.fontSize.sm};
`;

/**
 * AnnotationsList component
 * @param {Object} props
 * @param {Function} props.onEdit - Callback when annotation is clicked for editing
 * @returns {JSX.Element}
 */
export default function AnnotationsList({ onEdit }) {
  const [isOpen, setIsOpen] = useState(false);
  const [annotations, setAnnotations] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Fetch annotations when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchAnnotations();
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const fetchAnnotations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/annotations');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setAnnotations(data);
    } catch (error) {
      console.error('Error fetching annotations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnnotationClick = (annotation) => {
    onEdit(annotation);
    setIsOpen(false);
  };

  return (
    <ListContainer ref={dropdownRef}>
      <ListButton onClick={() => setIsOpen(!isOpen)}>
        Manage Annotations ({annotations.length})
      </ListButton>

      {isOpen && (
        <Dropdown>
          {loading ? (
            <EmptyState>Loading...</EmptyState>
          ) : annotations.length === 0 ? (
            <EmptyState>No annotations yet</EmptyState>
          ) : (
            annotations.map((annotation) => (
              <AnnotationItem
                key={annotation.id}
                onClick={() => handleAnnotationClick(annotation)}
              >
                <AnnotationTitle>{annotation.title}</AnnotationTitle>
                <AnnotationMeta>
                  {annotation.date} • {annotation.type} • {annotation.impact}
                </AnnotationMeta>
              </AnnotationItem>
            ))
          )}
        </Dropdown>
      )}
    </ListContainer>
  );
}
