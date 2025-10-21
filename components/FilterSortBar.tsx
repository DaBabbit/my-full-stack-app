'use client';

import { useState, useRef, useEffect } from 'react';
import { Filter, ArrowUpDown, Settings, X, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FilterSortBarProps {
  // Active filters
  activeFilters?: Record<string, string | number | boolean | null>;
  onFilterChange?: (filters: Record<string, string | number | boolean | null>) => void;
  
  // Sort config
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  
  // Actions
  onOpenFilterModal?: () => void;
  onOpenSortModal?: () => void;
  onOpenColumnsSettings?: () => void;
  onInviteMember?: () => void;
  
  // Display
  showInvite?: boolean;
  workspaceName?: string;
}

export function FilterSortBar({
  activeFilters = {},
  onFilterChange,
  sortField,
  sortDirection,
  onOpenFilterModal,
  onOpenSortModal,
  onOpenColumnsSettings,
  onInviteMember,
  showInvite = false,
  workspaceName
}: FilterSortBarProps) {
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Count active filters (exclude empty values)
  const activeFilterCount = Object.values(activeFilters).filter(v => v !== null && v !== undefined && v !== '').length;

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSettingsDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRemoveFilter = (key: string) => {
    if (onFilterChange) {
      const newFilters = { ...activeFilters };
      delete newFilters[key];
      onFilterChange(newFilters);
    }
  };

  return (
    <div className="flex items-center justify-between mb-6">
      {/* Title */}
      <h1 className="text-3xl font-bold text-white">
        {workspaceName ? `Videos von ${workspaceName}` : 'Alle Videos'}
      </h1>

      {/* Right Side: Filter Badges + Actions */}
      <div className="flex items-center gap-3">
        {/* Active Filter Badges */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2">
            {Object.entries(activeFilters).map(([key, value]) => {
              if (!value) return null;
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 border border-blue-500/30 rounded-lg text-blue-400 text-sm"
                >
                  <span className="font-medium">{String(value)}</span>
                  <button
                    onClick={() => handleRemoveFilter(key)}
                    className="hover:text-blue-300 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Sort Badge (if active) */}
        {sortField && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={onOpenSortModal}
            className="flex items-center gap-2 px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-300 hover:text-white hover:border-blue-500 transition-all text-sm"
          >
            <ArrowUpDown className="w-4 h-4" />
            <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
          </motion.button>
        )}

        {/* Filter Button */}
        <button
          onClick={onOpenFilterModal}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${
            activeFilterCount > 0
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
              : 'bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white hover:border-blue-500'
          }`}
          title="Filter"
        >
          <Filter className="w-4 h-4" />
          {activeFilterCount > 0 && (
            <span className="text-xs font-semibold">{activeFilterCount}</span>
          )}
        </button>

        {/* Sort Button */}
        <button
          onClick={onOpenSortModal}
          className="flex items-center gap-2 px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-300 hover:text-white hover:border-blue-500 transition-all text-sm"
          title="Sortierung"
        >
          <ArrowUpDown className="w-4 h-4" />
        </button>

        {/* Settings Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
            className="flex items-center gap-2 px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-300 hover:text-white hover:border-blue-500 transition-all text-sm"
            title="Einstellungen"
          >
            <Settings className="w-4 h-4" />
          </button>

          <AnimatePresence>
            {showSettingsDropdown && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="absolute top-full right-0 mt-2 z-[9999] bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl overflow-hidden min-w-[200px]"
              >
                <button
                  onClick={() => {
                    onOpenColumnsSettings?.();
                    setShowSettingsDropdown(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-neutral-300 hover:bg-neutral-700 hover:text-white transition-colors flex items-center gap-3"
                >
                  <Settings className="w-4 h-4" />
                  Spalten
                </button>
                <button
                  onClick={() => {
                    onOpenFilterModal?.();
                    setShowSettingsDropdown(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-neutral-300 hover:bg-neutral-700 hover:text-white transition-colors flex items-center gap-3"
                >
                  <Filter className="w-4 h-4" />
                  Filter
                </button>
                <button
                  onClick={() => {
                    onOpenSortModal?.();
                    setShowSettingsDropdown(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-neutral-300 hover:bg-neutral-700 hover:text-white transition-colors flex items-center gap-3"
                >
                  <ArrowUpDown className="w-4 h-4" />
                  Sortierung
                </button>
                {showInvite && (
                  <>
                    <div className="border-t border-neutral-700" />
                    <button
                      onClick={() => {
                        onInviteMember?.();
                        setShowSettingsDropdown(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-neutral-300 hover:bg-neutral-700 hover:text-white transition-colors flex items-center gap-3"
                    >
                      <UserPlus className="w-4 h-4" />
                      Mitglied einladen
                    </button>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

