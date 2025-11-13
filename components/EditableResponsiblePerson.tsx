'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Loader2, Check } from 'lucide-react';
import ResponsiblePersonAvatar from './ResponsiblePersonAvatar';

interface ResponsiblePersonOption {
  id: string; // UUID des Users
  name: string; // Display name (nur für Anzeige, nicht zum Speichern!)
  type: 'kosmamedia' | 'owner' | 'member';
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
 * - Kosmamedia Logo Option
 * - Workspace Owner Option
 * - Workspace Members (wenn vorhanden)
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
  const [kosmamediaId, setKosmamediaId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Load kosmamedia UUID once on mount
  useEffect(() => {
    const loadKosmamediaId = async () => {
      const { supabase } = await import('@/utils/supabase');
      const { data } = await supabase
        .from('users')
        .select('id')
        .ilike('email', '%kosmamedia%')
        .limit(1)
        .single();
      
      if (data) {
        setKosmamediaId(data.id);
      }
    };
    
    loadKosmamediaId();
  }, []);

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

  // Build options list with UUIDs
  const options: ResponsiblePersonOption[] = [];
  const addedIds = new Set<string>(); // Track bereits hinzugefügte IDs

  // Add kosmamedia (if ID is loaded)
  if (kosmamediaId) {
    options.push({
      id: kosmamediaId,
      name: 'kosmamedia',
      type: 'kosmamedia'
    });
    addedIds.add(kosmamediaId);
  }

  // Add workspace owner
  if (workspaceOwner && workspaceOwner.id && !addedIds.has(workspaceOwner.id)) {
    options.push({
      id: workspaceOwner.id, // UUID!
      name: `${workspaceOwner.firstname || ''} ${workspaceOwner.lastname || ''}`.trim() || workspaceOwner.email,
      type: 'owner',
      email: workspaceOwner.email
    });
    addedIds.add(workspaceOwner.id);
  }

  // Add workspace members - nur ACTIVE members mit user_id
  (workspaceMembers || []).forEach((member) => {
    // Nur aktive Members mit user_id anzeigen, die noch nicht hinzugefügt wurden
    // WICHTIG: Auch Members ohne user-Objekt anzeigen (nutze dann invitation_email als Fallback)
    if (member.status === 'active' && member.user_id && !addedIds.has(member.user_id)) {
      let displayName = 'Unbekannt';
      let email = '';
      
      if (member.user) {
        const memberName = `${member.user.firstname || ''} ${member.user.lastname || ''}`.trim();
        displayName = memberName || member.user.email?.split('@')[0] || 'Unbekannt';
        email = member.user.email;
      } else if ((member as any).invitation_email) {
        // Fallback: Verwende invitation_email wenn user-Daten fehlen
        email = (member as any).invitation_email;
        displayName = email.split('@')[0];
      }
      
      options.push({
        id: member.user_id, // WICHTIG: user_id verwenden, nicht member.id!
        name: displayName,
        type: 'member',
        email: email
      });
      addedIds.add(member.user_id);
    }
  });

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

