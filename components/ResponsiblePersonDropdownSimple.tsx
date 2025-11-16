'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import ResponsiblePersonAvatar from './ResponsiblePersonAvatar';
import { ResponsiblePersonOption } from '@/hooks/useResponsiblePeople';

interface ResponsiblePersonDropdownSimpleProps {
  value: string;
  onChange: (value: string) => void;
  options?: ResponsiblePersonOption[];
  isOptionsLoading?: boolean;
  // OPTIMIZATION: personMap für schnellere Avatar-Anzeige
  personMap?: Record<string, { firstname?: string; lastname?: string; email: string }>;
}

/**
 * Simpler Dropdown für "Verantwortliche Person" in Modals (Add/Edit)
 * 
 * Features:
 * - Workspace Owner Option
 * - ALL Workspace Members (inkl. eingeladene Mitarbeiter)
 * - Gleicher Look wie CustomDropdown
 */
export default function ResponsiblePersonDropdownSimple({
  value,
  onChange,
  options = [],
  isOptionsLoading = false,
  personMap = {}
}: ResponsiblePersonDropdownSimpleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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

  // Calculate optimal dropdown position when opening
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const buttonRect = dropdownRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - buttonRect.bottom;
      const spaceAbove = buttonRect.top;
      const dropdownHeight = 240; // max-h-60 = 240px

      // If not enough space below but more space above, open upwards
      if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
        setDropdownPosition('top');
      } else {
        setDropdownPosition('bottom');
      }
    }
  }, [isOpen]);

  const handleSelect = (option: ResponsiblePersonOption) => {
    onChange(option.id); // UUID speichern!
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isOptionsLoading || options.length === 0}
        className={`
          w-full px-3 py-2
          flex items-center justify-between gap-2
          bg-neutral-800 border border-neutral-700
          rounded-lg text-white
          focus:outline-none focus:ring-2 focus:ring-white focus:border-white
          transition-all
          ${isOpen ? 'ring-2 ring-white/50' : ''}
        `}
      >
        <ResponsiblePersonAvatar
          responsiblePerson={value || null}
          size="sm"
          showFullName={true}
          preloadedUserData={value ? personMap[value] : null}
        />
        
        <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div 
          ref={menuRef}
          className={`absolute z-50 ${
            dropdownPosition === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
          } w-auto min-w-full max-w-[400px] bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl overflow-hidden`}
        >
          <div className="py-1 max-h-64 overflow-y-auto">
            {options.map((option) => {
              const isSelected = option.id === value;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleSelect(option)}
                  className={`
                    w-full px-3 py-2 flex items-center justify-between gap-2
                    hover:bg-neutral-800 transition-colors
                    whitespace-nowrap
                    ${isSelected ? 'bg-neutral-800/50' : ''}
                  `}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <ResponsiblePersonAvatar 
                      responsiblePerson={option.id} 
                      size="sm" 
                      showFullName={false}
                      preloadedUserData={personMap[option.id]}
                    />
                    <span className="text-neutral-200 text-sm truncate">{option.name}</span>
                  </div>
                  {isSelected && (
                    <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                  )}
                </button>
              );
            })}
            
            {options.length === 0 && (
              <div className="px-3 py-2 text-sm text-neutral-500 text-center">
                {isOptionsLoading ? 'Lade Optionen...' : 'Keine Optionen verfügbar'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

