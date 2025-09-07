'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, LucideIcon } from 'lucide-react';

interface Option {
  value: string;
  label: string;
  icon?: LucideIcon;
  iconColor?: string;
}

interface CustomDropdownProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export default function CustomDropdown({ 
  options, 
  value, 
  onChange, 
  className = '',
  placeholder = 'Auswählen...'
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const selectedOption = options.find(option => option.value === value);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-neutral-900/80 backdrop-blur-md border border-neutral-700 text-white text-sm rounded-xl px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 hover:bg-neutral-800/80 hover:border-neutral-600 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-all duration-300 cursor-pointer text-left flex items-center"
      >
        <div className="flex items-center flex-1 min-w-0">
          {selectedOption?.icon && (
            <div className="mr-2 flex-shrink-0">
              <selectedOption.icon className={`w-4 h-4 ${selectedOption.iconColor || 'text-neutral-400'}`} />
            </div>
          )}
          <span className="truncate">{selectedOption?.label || placeholder}</span>
        </div>
        <ChevronDown 
          className={`w-4 h-4 text-neutral-400 transition-transform duration-200 flex-shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-neutral-900/95 backdrop-blur-md border border-neutral-700 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full px-3 py-2 text-left text-sm transition-colors hover:bg-neutral-800/50 flex items-center ${
                value === option.value 
                  ? 'text-white bg-neutral-800/30' 
                  : 'text-neutral-300 hover:text-white'
              } first:rounded-t-xl last:rounded-b-xl`}
            >
              {option.icon && (
                <div className="mr-2 flex-shrink-0">
                  <option.icon className={`w-4 h-4 ${option.iconColor || 'text-neutral-400'}`} />
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
