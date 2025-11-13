'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import ResponsiblePersonAvatar from './ResponsiblePersonAvatar';

interface ResponsiblePersonOption {
  id: string;
  name: string;
  type: 'owner' | 'member';
  email?: string;
}

interface ResponsiblePersonDropdownSimpleProps {
  value: string;
  onChange: (value: string) => void;
  workspaceOwner?: { id: string; firstname: string; lastname: string; email: string };
  workspaceMembers?: Array<{ 
    id: string; 
    user_id?: string | null;
    status?: 'pending' | 'active' | 'removed';
    user?: { firstname?: string; lastname?: string; email: string } 
  }>;
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
  workspaceOwner,
  workspaceMembers = []
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

  // Build options list with UUIDs - MUST be reactive to workspaceMembers changes!
  const options = React.useMemo(() => {
    const opts: ResponsiblePersonOption[] = [];
    const addedIds = new Set<string>();
    let kosmamediaId: string | null = null;

    // STEP 1: Find kosmamedia ID from workspace members
    workspaceMembers.forEach((member) => {
      if (member.user?.email?.toLowerCase().includes('kosmamedia')) {
        kosmamediaId = member.user_id || null;
      }
    });

    // STEP 2: Add workspace owner FIRST
    if (workspaceOwner && workspaceOwner.id) {
      const ownerName = `${workspaceOwner.firstname || ''} ${workspaceOwner.lastname || ''}`.trim();
      const displayName = ownerName || workspaceOwner.email.split('@')[0];
      opts.push({
        id: workspaceOwner.id,
        name: displayName,
        type: 'owner',
        email: workspaceOwner.email
      });
      addedIds.add(workspaceOwner.id);
    }

    // STEP 3: Add kosmamedia SECOND (if found and not already added as owner)
    if (kosmamediaId && !addedIds.has(kosmamediaId)) {
      opts.push({
        id: kosmamediaId,
        name: 'kosmamedia',
        type: 'member',
        email: 'kosmamedia'
      });
      addedIds.add(kosmamediaId);
    }

    // STEP 4: Add ALL other workspace members
    workspaceMembers.forEach((member) => {
      // Nur aktive Members mit user_id anzeigen, die noch nicht hinzugefügt wurden
      if (member.status === 'active' && member.user_id && !addedIds.has(member.user_id)) {
        let displayName = 'Unbekannt';
        let email = '';
        
        if (member.user) {
          const memberName = `${member.user.firstname || ''} ${member.user.lastname || ''}`.trim();
          displayName = memberName || member.user.email?.split('@')[0] || 'Unbekannt';
          email = member.user.email;
        } else if ('invitation_email' in member && typeof (member as {invitation_email?: string}).invitation_email === 'string') {
          // Fallback: Verwende invitation_email wenn user-Daten fehlen
          email = (member as {invitation_email: string}).invitation_email;
          displayName = email.split('@')[0];
        }
        
        opts.push({
          id: member.user_id, // WICHTIG: user_id verwenden!
          name: displayName,
          type: 'member',
          email: email
        });
        addedIds.add(member.user_id);
      }
    });

    return opts;
  }, [workspaceOwner, workspaceMembers]);

  const handleSelect = (option: ResponsiblePersonOption) => {
    onChange(option.id); // UUID speichern!
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
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
                Keine Optionen verfügbar
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

