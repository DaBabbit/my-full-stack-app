'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, LucideIcon, Loader2 } from 'lucide-react';

interface Option {
  value: string;
  label: string;
  icon?: LucideIcon;
  iconColor?: string;
  disabled?: boolean; // Einzelne Option kann deaktiviert werden
}

interface CustomDropdownProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
}

export default function CustomDropdown({ 
  options, 
  value, 
  onChange, 
  className = '',
  placeholder = 'Auswählen...',
  disabled = false,
  isLoading = false
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const selectedOption = options.find(option => option.value === value);


  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && !isLoading && setIsOpen(!isOpen)}
        disabled={disabled || isLoading}
        className={`w-full bg-neutral-900/80 backdrop-blur-md border border-neutral-700 text-white text-sm rounded-xl px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-all duration-300 text-left flex items-center ${
          disabled || isLoading 
            ? 'opacity-50 cursor-not-allowed' 
            : 'hover:bg-neutral-800/80 hover:border-neutral-600 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] cursor-pointer'
        }`}
      >
        <div className="flex items-center flex-1 min-w-0">
          {isLoading ? (
            <div className="mr-2 flex-shrink-0">
              <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
            </div>
          ) : selectedOption?.icon ? (
            <div className="mr-2 flex-shrink-0">
              <selectedOption.icon className={`w-4 h-4 ${selectedOption.iconColor || 'text-neutral-400'}`} />
            </div>
          ) : null}
          <span className="truncate">
            {isLoading ? 'Wird aktualisiert...' : (selectedOption?.label || placeholder)}
          </span>
        </div>
        {!isLoading && (
          <ChevronDown 
            className={`w-4 h-4 text-neutral-400 transition-transform duration-200 flex-shrink-0 ${
              isOpen ? 'rotate-180' : ''
            }`} 
          />
        )}
      </button>

      {isOpen && (
        <div 
          ref={menuRef}
          className={`absolute left-0 right-0 ${
            dropdownPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
          } bg-neutral-900/95 backdrop-blur-md border border-neutral-700 rounded-xl shadow-xl z-[9999] max-h-60 overflow-y-auto`}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                if (!option.disabled) {
                  onChange(option.value);
                  setIsOpen(false);
                }
              }}
              disabled={option.disabled}
              className={`w-full px-3 py-2 text-left text-sm transition-colors flex items-center ${
                option.disabled
                  ? 'cursor-not-allowed opacity-40 text-neutral-500'
                  : value === option.value 
                    ? 'text-white bg-neutral-800/30 hover:bg-neutral-800/50' 
                    : 'text-neutral-300 hover:text-white hover:bg-neutral-800/50'
              } first:rounded-t-xl last:rounded-b-xl`}
            >
              {option.icon && (
                <div className="mr-2 flex-shrink-0">
                  <option.icon className={`w-4 h-4 ${option.disabled ? 'text-neutral-600' : (option.iconColor || 'text-neutral-400')}`} />
                </div>
              )}
              <span className="truncate">{option.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Custom Glow Effect on Hover */}
      <div className="absolute inset-0 rounded-xl bg-white/5 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
    </div>
  );
}
