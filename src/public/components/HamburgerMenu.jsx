import { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';

/**
 * Hamburger button
 * @component
 */
const HamburgerButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: ${props => props.theme.borderRadius.md};
  color: rgba(255, 255, 255, 0.95);
  cursor: pointer;
  transition: all ${props => props.theme.transitions.fast} ${props => props.theme.transitions.easing};

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.4);
    color: rgba(255, 255, 255, 1);
  }

  &:focus {
    outline: 2px solid rgba(255, 255, 255, 0.8);
    outline-offset: 2px;
  }

  &:active {
    transform: scale(0.95);
  }

  ${props => props.$isOpen && `
    background: rgba(255, 255, 255, 0.25);
    border-color: rgba(255, 255, 255, 0.5);
  `}
`;

/**
 * Dropdown menu container
 * @component
 */
const DropdownMenu = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: ${props => props.theme.zIndex.dropdown};
  background: ${props => props.theme.colors.bgPrimary};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.lg};
  box-shadow: ${props => props.theme.shadows.lg};
  min-width: 220px;
  opacity: 0;
  transform: translateY(-8px);
  animation: dropdownFadeIn ${props => props.theme.transitions.fast} ${props => props.theme.transitions.easing} forwards;

  @keyframes dropdownFadeIn {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

/**
 * Container for hamburger menu
 * @component
 */
const HamburgerMenuContainer = styled.div`
  position: relative;
  display: inline-block;
`;

/**
 * Hamburger icon (three horizontal lines)
 * @component
 */
const HamburgerIcon = styled.svg`
  width: 24px;
  height: 24px;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
`;

/**
 * Individual menu item
 * @component
 */
const MenuItem = styled.button`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
  width: 100%;
  padding: 12px 16px;
  text-align: left;
  background: transparent;
  border: none;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  color: ${props => props.theme.colors.textPrimary};
  font-size: ${props => props.theme.typography.fontSize.sm};
  font-weight: ${props => props.theme.typography.fontWeight.medium};
  cursor: pointer;
  transition: background ${props => props.theme.transitions.fast} ${props => props.theme.transitions.easing};

  &:hover {
    background: ${props => props.theme.colors.bgSecondary};
  }

  &:focus {
    outline: 2px solid ${props => props.theme.colors.primary};
    outline-offset: -2px;
    background: ${props => props.theme.colors.bgSecondary};
  }

  &:last-child {
    border-bottom: none;
    border-bottom-left-radius: ${props => props.theme.borderRadius.lg};
    border-bottom-right-radius: ${props => props.theme.borderRadius.lg};
  }

  &:first-child {
    border-top-left-radius: ${props => props.theme.borderRadius.lg};
    border-top-right-radius: ${props => props.theme.borderRadius.lg};
  }
`;

/**
 * Menu item icon
 * @component
 */
const MenuItemIcon = styled.span`
  font-size: ${props => props.theme.typography.fontSize.lg};
  line-height: 1;
  opacity: 0.7;
`;

/**
 * Menu item text
 * @component
 */
const MenuItemText = styled.span`
  flex: 1;
`;

/**
 * HamburgerMenu Component
 *
 * Dropdown menu for header actions (Manage Annotations, Add Annotation, Change Sprints)
 *
 * @param {Object} props
 * @param {Function} props.onManageAnnotations - Callback for "Manage Annotations" action
 * @param {Function} props.onAddAnnotation - Callback for "Add Annotation" action
 * @param {Function} props.onChangeSprints - Callback for "Change Sprints" action
 * @returns {JSX.Element}
 */
export default function HamburgerMenu({ onManageAnnotations, onAddAnnotation, onChangeSprints }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  /**
   * Toggle menu open/close
   */
  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  /**
   * Handle menu item click (close menu after action)
   * @param {Function} callback - Callback to invoke
   */
  const handleMenuItemClick = (callback) => {
    setIsOpen(false);
    if (callback) {
      callback();
    }
  };

  /**
   * Close dropdown when clicking outside
   */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
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

  /**
   * Close dropdown on Escape key
   */
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  return (
    <HamburgerMenuContainer ref={menuRef}>
      <HamburgerButton
        onClick={handleToggle}
        $isOpen={isOpen}
        aria-label="Menu"
        aria-expanded={isOpen}
        aria-haspopup="true"
        type="button"
      >
        <HamburgerIcon viewBox="0 0 24 24" fill="none">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </HamburgerIcon>
      </HamburgerButton>

      {isOpen && (
        <DropdownMenu role="menu" aria-label="Actions menu">
          <MenuItem
            onClick={() => handleMenuItemClick(onManageAnnotations)}
            role="menuitem"
            type="button"
          >
            <MenuItemIcon>📋</MenuItemIcon>
            <MenuItemText>Manage Annotations</MenuItemText>
          </MenuItem>

          <MenuItem
            onClick={() => handleMenuItemClick(onAddAnnotation)}
            role="menuitem"
            type="button"
          >
            <MenuItemIcon>➕</MenuItemIcon>
            <MenuItemText>Add Annotation</MenuItemText>
          </MenuItem>

          <MenuItem
            onClick={() => handleMenuItemClick(onChangeSprints)}
            role="menuitem"
            type="button"
          >
            <MenuItemIcon>🔄</MenuItemIcon>
            <MenuItemText>Change Sprints</MenuItemText>
          </MenuItem>
        </DropdownMenu>
      )}
    </HamburgerMenuContainer>
  );
}
