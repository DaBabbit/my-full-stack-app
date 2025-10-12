'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Loader2, Check } from 'lucide-react';
import ResponsiblePersonAvatar from './ResponsiblePersonAvatar';

interface ResponsiblePersonOption {
  id: string;
  name: string;
  type: 'kosmamedia' | 'owner' | 'member';
  email?: string;
}

interface EditableResponsiblePersonProps {
  value: string | null | undefined;
  videoId: string;
  onSave: (videoId: string, field: string, value: string) => Promise<void>;
  editable?: boolean;
  isLoading?: boolean;
  workspaceOwner?: { firstname: string; lastname: string; email: string };
  workspaceMembers?: Array<{ id: string; user?: { firstname?: string; lastname?: string; email: string } }>;
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
  const [isSaving, setIsSaving] = useState(false);
  const [selectedValue, setSelectedValue] = useState(value || '');
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Build options list
  const options: ResponsiblePersonOption[] = [
    {
      id: 'kosmamedia',
      name: 'kosmamedia',
      type: 'kosmamedia'
    }
  ];

  // Add workspace owner
  if (workspaceOwner) {
    const ownerName = `${workspaceOwner.firstname} ${workspaceOwner.lastname}`.trim();
    if (ownerName) {
      options.push({
        id: 'owner',
        name: ownerName,
        type: 'owner',
        email: workspaceOwner.email
      });
    }
  }

  // Add workspace members
  workspaceMembers.forEach((member) => {
    if (member.user?.firstname && member.user?.lastname) {
      const memberName = `${member.user.firstname} ${member.user.lastname}`.trim();
      options.push({
        id: member.id,
        name: memberName,
        type: 'member',
        email: member.user.email
      });
    }
  });

  const handleSelect = async (option: ResponsiblePersonOption) => {
    setIsOpen(false);
    
    if (option.name === selectedValue) return;

    setSelectedValue(option.name);
    setIsSaving(true);
    console.log('[EditableResponsiblePerson] 💾 Saving:', option.name);

    try {
      await onSave(videoId, 'responsible_person', option.name);
      console.log('[EditableResponsiblePerson] ✅ Save successful');
    } catch (error) {
      console.error('[EditableResponsiblePerson] ❌ Save failed:', error);
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
        <div className="absolute z-50 mt-2 w-full min-w-[200px] bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl overflow-hidden">
          <div className="py-1 max-h-64 overflow-y-auto">
            {options.map((option) => {
              const isSelected = option.name === selectedValue;
              return (
                <button
                  key={option.id}
                  onClick={() => handleSelect(option)}
                  className={`
                    w-full px-3 py-2 flex items-center justify-between gap-2
                    hover:bg-neutral-800 transition-colors
                    ${isSelected ? 'bg-neutral-800/50' : ''}
                  `}
                >
                  <ResponsiblePersonAvatar 
                    responsiblePerson={option.name} 
                    size="sm" 
                    showFullName={true}
                  />
                  {isSelected && (
                    <Check className="w-4 h-4 text-green-400" />
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

