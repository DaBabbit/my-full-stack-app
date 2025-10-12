'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import ResponsiblePersonAvatar from './ResponsiblePersonAvatar';

interface ResponsiblePersonOption {
  id: string;
  name: string;
  type: 'kosmamedia' | 'owner' | 'member';
  email?: string;
}

interface ResponsiblePersonDropdownSimpleProps {
  value: string;
  onChange: (value: string) => void;
  workspaceOwner?: { firstname: string; lastname: string; email: string };
  workspaceMembers?: Array<{ id: string; user?: { firstname?: string; lastname?: string; email: string } }>;
}

/**
 * Simpler Dropdown für "Verantwortliche Person" in Modals (Add/Edit)
 * 
 * Features:
 * - Kosmamedia Option
 * - Workspace Owner Option
 * - Workspace Members
 * - Gleicher Look wie CustomDropdown
 */
export default function ResponsiblePersonDropdownSimple({
  value,
  onChange,
  workspaceOwner,
  workspaceMembers = []
}: ResponsiblePersonDropdownSimpleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const handleSelect = (option: ResponsiblePersonOption) => {
    onChange(option.name);
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
        <div className="absolute z-50 mt-2 w-full min-w-[200px] bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl overflow-hidden">
          <div className="py-1 max-h-64 overflow-y-auto">
            {options.map((option) => {
              const isSelected = option.name === value;
              return (
                <button
                  key={option.id}
                  type="button"
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

