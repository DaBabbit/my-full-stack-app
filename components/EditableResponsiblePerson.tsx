'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Loader2, Check } from 'lucide-react';
import ResponsiblePersonAvatar from './ResponsiblePersonAvatar';
import { ResponsiblePersonOption } from '@/hooks/useResponsiblePeople';

interface EditableResponsiblePersonProps {
  value: string | null | undefined; // UUID
  videoId: string;
  onSave: (videoId: string, field: string, value: string) => Promise<void>;
  editable?: boolean;
  isLoading?: boolean;
  options?: ResponsiblePersonOption[];
  isOptionsLoading?: boolean;
}

/**
 * Dropdown-Komponente für "Verantwortliche Person"
 * 
 * Features:
 * - Workspace Owner Option
 * - ALL Workspace Members (inkl. eingeladene Mitarbeiter)
 * - Modernes Dropdown im Stil von CustomDropdown
 * - Avatar-Anzeige in der Tabelle (kompakt)
 * - Voller Name in Edit-Ansicht
 */
export default function EditableResponsiblePerson({
  value,
  videoId,
  onSave,
  editable = true,
  isLoading = false,
  options = [],
  isOptionsLoading = false
}: EditableResponsiblePersonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedValue, setSelectedValue] = useState(value || '');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Update local value wenn external value sich ändert
  useEffect(() => {
    setSelectedValue(value || '');
  }, [value]);

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
      const dropdownHeight = 256; // max-h-64 = 256px

      // If not enough space below but more space above, open upwards
      if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
        setDropdownPosition('top');
      } else {
        setDropdownPosition('bottom');
      }
    }
  }, [isOpen]);

  const handleSelect = async (option: ResponsiblePersonOption) => {
    setIsOpen(false);
    
    const userIdToSave = option.id; // Already UUID!

    if (userIdToSave === selectedValue) return;

    setSelectedValue(userIdToSave);
    setIsSaving(true);

    try {
      await onSave(videoId, 'responsible_person', userIdToSave); // Save UUID!
    } catch (error) {
      console.error('[EditableResponsiblePerson] Save failed:', error);
      // Revert on error
      setSelectedValue(value || '');
    } finally {
      setIsSaving(false);
    }
  };

  if (!editable) {
    return (
      <div className="py-2 px-3">
        <ResponsiblePersonAvatar 
          responsiblePerson={value} 
          size="sm" 
          showFullName={false}
        />
      </div>
    );
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSaving || isLoading || isOptionsLoading || options.length === 0}
        className={`
          w-full min-h-[44px] px-3 py-2
          flex items-center justify-between gap-2
          bg-neutral-800/30 hover:bg-neutral-800 
          rounded-lg transition-all duration-200
          ${(isSaving || isLoading) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${isOpen ? 'ring-2 ring-white/50' : ''}
        `}
      >
        <ResponsiblePersonAvatar 
          responsiblePerson={selectedValue} 
          size="sm" 
          showFullName={false}
        />
        
        <div className="flex items-center gap-2">
          {(isSaving || isLoading || isOptionsLoading) && (
            <Loader2 className="w-4 h-4 text-neutral-400 animate-spin" />
          )}
          <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
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
              const isSelected = option.id === selectedValue;
              return (
                <button
                  key={option.id}
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
                      showFullName={true}
                    />
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

