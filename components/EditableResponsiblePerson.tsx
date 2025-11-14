'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Loader2, Check } from 'lucide-react';
import ResponsiblePersonAvatar from './ResponsiblePersonAvatar';

interface ResponsiblePersonOption {
  id: string; // UUID des Users
  name: string; // Display name (nur für Anzeige, nicht zum Speichern!)
  type: 'owner' | 'member';
  email?: string;
}

interface EditableResponsiblePersonProps {
  value: string | null | undefined; // UUID
  videoId: string;
  onSave: (videoId: string, field: string, value: string) => Promise<void>;
  editable?: boolean;
  isLoading?: boolean;
  workspaceOwner?: { id: string; firstname: string; lastname: string; email: string };
  workspaceMembers?: Array<{ 
    id: string; 
    user_id?: string | null;
    status?: 'pending' | 'active' | 'removed';
    user?: { firstname?: string; lastname?: string; email: string } 
  }>;
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
  workspaceOwner,
  workspaceMembers = []
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

  // Build options list with UUIDs - MUST be reactive to workspaceMembers changes!
  const options = React.useMemo(() => {
    const opts: ResponsiblePersonOption[] = [];
    const addedIds = new Set<string>(); // Track bereits hinzugefügte IDs
    let kosmamediaId: string | null = null;

    // STEP 0: Find kosmamedia ID from workspace members
    (workspaceMembers || []).forEach((member) => {
      if (member.user?.email?.toLowerCase().includes('kosmamedia')) {
        kosmamediaId = member.user_id || null;
      }
    });

    // STEP 1: Add kosmamedia FIRST (if found)
    if (kosmamediaId) {
      opts.push({
        id: kosmamediaId,
        name: 'kosmamedia',
        type: 'member',
        email: 'kosmamedia'
      });
      addedIds.add(kosmamediaId);
    }

    // STEP 2: Add workspace owner SECOND
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

    // STEP 3: Add ALL other workspace members with their REAL names
    (workspaceMembers || []).forEach((member) => {
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
          id: member.user_id,
          name: displayName,
          type: 'member',
          email: email
        });
        addedIds.add(member.user_id);
      }
    });

    // DEBUG: Log welche Options gebaut wurden
    console.log('[EditableResponsiblePerson] 📋 Built options:', opts.length, 'total');
    console.log('  ├─ owner:', opts.filter(o => o.type === 'owner').length);
    console.log('  └─ members:', opts.filter(o => o.type === 'member').length);
    console.log('[EditableResponsiblePerson] 📝 Details:');
    opts.forEach((o, i) => {
      console.log(`  ${i+1}. [${o.type}] ${o.name} (${o.id.substring(0, 8)}...)`);
    });
    console.log('[EditableResponsiblePerson] 📥 Input data:');
    console.log('  ├─ workspaceOwner:', workspaceOwner ? workspaceOwner.email : 'NONE');
    console.log('  └─ workspaceMembers count:', workspaceMembers?.length || 0);
    if (workspaceMembers && workspaceMembers.length > 0) {
      console.log('[EditableResponsiblePerson] 👥 WorkspaceMembers details:');
      workspaceMembers.forEach((m, i) => {
        const name = m.user ? `${m.user.firstname || ''} ${m.user.lastname || ''}`.trim() || m.user.email : 'no user data';
        console.log(`  ${i+1}. [${m.status}] ${name} (${m.user_id?.substring(0, 8) || 'no ID'}...)`);
      });
    }

    return opts;
  }, [workspaceOwner, workspaceMembers]);

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
        disabled={isSaving || isLoading}
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
          {(isSaving || isLoading) && (
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
                Keine Optionen verfügbar
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

