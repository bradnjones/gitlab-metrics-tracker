/**
 * SprintDisplayFilterModal Component
 *
 * Lightweight modal for filtering which cached/selected sprints are
 * shown in the charts. Unlike IterationSelectionModal, this handles
 * no downloading — it only toggles display visibility.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {Function} props.onApply - Receives Set<string> of displayed iteration IDs
 * @param {Array<Object>} props.iterations - All selected iteration objects
 * @param {Set<string>|null} props.displayedIds - Currently displayed IDs (null = all)
 */

import { useState, useEffect, useMemo } from 'react';
import styled from 'styled-components';

/* ===== HELPERS ===== */

/**
 * Format an ISO date string to MM/DD
 * @param {string} dateStr
 * @returns {string}
 */
function fmtDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/**
 * Build the compact label for a sprint (e.g. "DS 10/25")
 * @param {Object} iter
 * @returns {string}
 */
function sprintLabel(iter) {
  const initials = iter.iterationCadence?.title
    ?.split(' ').map(w => w[0]).join('').toUpperCase() || '';
  const end = fmtDate(iter.dueDate);
  return initials && end ? `${initials} ${end}` : iter.title || `Sprint ${iter.iid || '?'}`;
}

/* ===== STYLED COMPONENTS ===== */

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: ${props => props.theme.zIndex?.modal || 2000};
  padding: ${props => props.theme.spacing.md};
`;

const Dialog = styled.div`
  background: ${props => props.theme.colors.bgPrimary};
  border-radius: ${props => props.theme.borderRadius.xl};
  box-shadow: ${props => props.theme.shadows.xl};
  width: 100%;
  max-width: 680px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    max-width: 100%;
    max-height: 100vh;
    border-radius: 0;
  }
`;

const Header = styled.div`
  padding: ${props => props.theme.spacing.lg} ${props => props.theme.spacing.xl};
  border-bottom: 1px solid ${props => props.theme.colors.border};
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
`;

const Title = styled.h2`
  margin: 0;
  font-size: ${props => props.theme.typography.fontSize['2xl']};
  font-weight: ${props => props.theme.typography.fontWeight.bold};
  color: ${props => props.theme.colors.textPrimary};
`;

const CloseBtn = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.colors.textSecondary};
  font-size: ${props => props.theme.typography.fontSize['2xl']};
  line-height: 1;
  cursor: pointer;
  padding: ${props => props.theme.spacing.xs};
  transition: color ${props => props.theme.transitions.fast} ease-out;

  &:hover { color: ${props => props.theme.colors.textPrimary}; }
  &:focus { outline: 2px solid ${props => props.theme.colors.primary}; outline-offset: 2px; border-radius: ${props => props.theme.borderRadius.sm}; }
`;

const Toolbar = styled.div`
  padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.xl};
  border-bottom: 1px solid ${props => props.theme.colors.border};
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.md};
  flex-shrink: 0;
  flex-wrap: wrap;
`;

const BulkActions = styled.div`
  display: flex;
  gap: ${props => props.theme.spacing.sm};
`;

const BulkBtn = styled.button`
  background: ${props => props.theme.colors.bgTertiary};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.md};
  color: ${props => props.theme.colors.textPrimary};
  cursor: pointer;
  font-size: ${props => props.theme.typography.fontSize.sm};
  font-weight: ${props => props.theme.typography.fontWeight.medium};
  padding: 4px 12px;
  transition: background ${props => props.theme.transitions.fast} ease-out;

  &:hover { background: ${props => props.theme.colors.border}; }
  &:focus { outline: 2px solid ${props => props.theme.colors.primary}; outline-offset: 2px; }
`;

const SearchInput = styled.input`
  flex: 1;
  min-width: 140px;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.md};
  color: ${props => props.theme.colors.textPrimary};
  font-size: ${props => props.theme.typography.fontSize.sm};
  padding: 5px 10px;
  background: ${props => props.theme.colors.bgPrimary};

  &:focus { outline: 2px solid ${props => props.theme.colors.primary}; outline-offset: -1px; border-color: transparent; }
  &::placeholder { color: ${props => props.theme.colors.textSecondary}; }
`;

const Body = styled.div`
  padding: ${props => props.theme.spacing.lg} ${props => props.theme.spacing.xl};
  overflow-y: auto;
  flex: 1;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: ${props => props.theme.spacing.sm};

  @media (max-width: ${props => props.theme.breakpoints.desktop}) {
    grid-template-columns: repeat(4, 1fr);
  }

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const CheckItem = styled.label`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border: 1px solid ${props => props.$checked ? props.theme.colors.primary : props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.md};
  background: ${props => props.$checked ? 'rgba(59, 130, 246, 0.08)' : props.theme.colors.bgSecondary};
  cursor: pointer;
  font-size: ${props => props.theme.typography.fontSize.sm};
  color: ${props => props.theme.colors.textPrimary};
  user-select: none;
  transition: border-color ${props => props.theme.transitions.fast} ease-out,
              background ${props => props.theme.transitions.fast} ease-out;

  &:hover {
    border-color: ${props => props.theme.colors.primary};
    background: rgba(59, 130, 246, 0.05);
  }

  input[type="checkbox"] {
    accent-color: ${props => props.theme.colors.primary};
    flex-shrink: 0;
    width: 14px;
    height: 14px;
  }
`;

const EmptyMsg = styled.p`
  color: ${props => props.theme.colors.textSecondary};
  font-style: italic;
  text-align: center;
  margin: ${props => props.theme.spacing.xl} 0;
`;

const Footer = styled.div`
  padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.xl};
  border-top: 1px solid ${props => props.theme.colors.border};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${props => props.theme.spacing.md};
  flex-shrink: 0;
  flex-wrap: wrap;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    flex-direction: column-reverse;
    align-items: stretch;
  }
`;

const FooterCount = styled.span`
  color: ${props => props.theme.colors.textSecondary};
  font-size: ${props => props.theme.typography.fontSize.sm};

  strong { color: ${props => props.theme.colors.textPrimary}; }
`;

const FooterActions = styled.div`
  display: flex;
  gap: ${props => props.theme.spacing.md};

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    flex-direction: column-reverse;
  }
`;

const CancelBtn = styled.button`
  background: ${props => props.theme.colors.bgSecondary};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.md};
  color: ${props => props.theme.colors.textPrimary};
  cursor: pointer;
  font-size: ${props => props.theme.typography.fontSize.base};
  font-weight: ${props => props.theme.typography.fontWeight.semibold};
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.lg};
  transition: background ${props => props.theme.transitions.normal} ease-out;

  &:hover { background: ${props => props.theme.colors.bgTertiary}; }
  &:focus { outline: 2px solid ${props => props.theme.colors.primary}; outline-offset: 2px; }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) { width: 100%; }
`;

const ApplyBtn = styled.button`
  background: ${props => props.theme.colors.primary};
  border: none;
  border-radius: ${props => props.theme.borderRadius.md};
  color: white;
  cursor: pointer;
  font-size: ${props => props.theme.typography.fontSize.base};
  font-weight: ${props => props.theme.typography.fontWeight.semibold};
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.lg};
  transition: background ${props => props.theme.transitions.normal} ease-out;

  &:hover:not(:disabled) { background: ${props => props.theme.colors.primaryDark}; }
  &:focus { outline: 2px solid ${props => props.theme.colors.primary}; outline-offset: 2px; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) { width: 100%; }
`;

/* ===== COMPONENT ===== */

export default function SprintDisplayFilterModal({
  isOpen = false,
  onClose,
  onApply,
  iterations = [],
  displayedIds = null,
}) {
  const [tempIds, setTempIds] = useState(new Set());
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTempIds(displayedIds ? new Set(displayedIds) : new Set(iterations.map(it => it.id)));
      setSearch('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const filtered = useMemo(() => {
    if (!search.trim()) return iterations;
    const q = search.toLowerCase();
    return iterations.filter(it => sprintLabel(it).toLowerCase().includes(q));
  }, [iterations, search]);

  const toggle = (id) => {
    setTempIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setTempIds(prev => new Set([...prev, ...filtered.map(it => it.id)]));

  const deselectAll = () => {
    setTempIds(prev => {
      const next = new Set(prev);
      filtered.forEach(it => next.delete(it.id));
      return next;
    });
  };

  const handleApply = () => onApply?.(tempIds);

  if (!isOpen) return null;

  return (
    <Overlay onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <Dialog onClick={(e) => e.stopPropagation()}>
        <Header>
          <Title>Sprint Display Filter</Title>
          <CloseBtn onClick={onClose} aria-label="Close" type="button">×</CloseBtn>
        </Header>

        <Toolbar>
          <BulkActions>
            <BulkBtn type="button" onClick={selectAll}>Select All</BulkBtn>
            <BulkBtn type="button" onClick={deselectAll}>Deselect All</BulkBtn>
          </BulkActions>
          <SearchInput
            type="text"
            placeholder="Filter sprints..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Toolbar>

        <Body>
          {filtered.length === 0 ? (
            <EmptyMsg>No sprints match &ldquo;{search}&rdquo;</EmptyMsg>
          ) : (
            <Grid>
              {filtered.map(iter => {
                const checked = tempIds.has(iter.id);
                return (
                  <CheckItem key={iter.id} $checked={checked}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(iter.id)}
                    />
                    {sprintLabel(iter)}
                  </CheckItem>
                );
              })}
            </Grid>
          )}
        </Body>

        <Footer>
          <FooterCount>
            <strong>{tempIds.size}</strong> of {iterations.length} displayed
          </FooterCount>
          <FooterActions>
            <CancelBtn type="button" onClick={onClose}>Cancel</CancelBtn>
            <ApplyBtn type="button" onClick={handleApply} disabled={tempIds.size === 0}>
              Apply
            </ApplyBtn>
          </FooterActions>
        </Footer>
      </Dialog>
    </Overlay>
  );
}
