'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import ResponsiblePersonAvatar from './ResponsiblePersonAvatar';
import type { FilterValue } from '@/hooks/useWorkspaceViews';

export type FilterType = 'status' | 'person' | 'location' | 'date';

interface FilterSubmenuProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement>;
  filterType: FilterType;
  columnLabel: string;
  currentValue: FilterValue; // Aktuell gesetzter Filter-Wert
  onApply: (value: FilterValue) => void;
  // Data für Optionen
  statusOptions?: string[];
  personOptions?: Array<{ id: string; firstname: string; lastname: string; email: string }>;
  locationOptions?: string[];
}

const DEFAULT_STATUS_OPTIONS = [
  'Idee',
  'Warten auf Aufnahme',
  'In Bearbeitung',
  'Schnitt abgeschlossen',
  'Hochgeladen'
];

export function FilterSubmenu({
  isOpen,
  onClose,
  triggerRef,
  filterType,
  columnLabel,
  currentValue,
  onApply,
  statusOptions = DEFAULT_STATUS_OPTIONS,
  personOptions = [],
  locationOptions = [],
}: FilterSubmenuProps) {
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Lokaler State für Filter-Werte
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(
    Array.isArray(currentValue) ? currentValue : []
  );
  const [selectedPersons, setSelectedPersons] = useState<string[]>(
    Array.isArray(currentValue) ? currentValue : []
  );
  const [selectedLocations, setSelectedLocations] = useState<string[]>(
    Array.isArray(currentValue) ? currentValue : []
  );
  const [dateRange, setDateRange] = useState<{ from?: string; to?: string }>(
    currentValue && typeof currentValue === 'object' && !Array.isArray(currentValue) ? currentValue : {}
  );
  // Initialisiere dateRangeMode: wenn bereits "from" gesetzt ist, starte mit "to"
  const [dateRangeMode, setDateRangeMode] = useState<'from' | 'to'>(() => {
    const initialRange = currentValue && typeof currentValue === 'object' && !Array.isArray(currentValue) ? currentValue : {};
    return initialRange.from ? 'to' : 'from';
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Berechne Position basierend auf Trigger-Element
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Dropdown Breite
      const dropdownWidth = 300;
      const dropdownHeight = 400; // Geschätzt
      
      let left = rect.left;
      let top = rect.bottom + 4;
      
      // Prüfe ob genug Platz rechts ist
      if (left + dropdownWidth > viewportWidth) {
        left = viewportWidth - dropdownWidth - 16;
      }
      
      // Prüfe ob genug Platz unten ist
      if (top + dropdownHeight > viewportHeight) {
        top = rect.top - dropdownHeight - 4;
      }
      
      setPosition({ top, left });
    }
  }, [isOpen, triggerRef]);

  // Click outside zum Schließen
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose, triggerRef]);

  // ESC key zum Schließen
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleApply = () => {
    if (filterType === 'status') {
      onApply(selectedStatuses.length > 0 ? selectedStatuses : null);
    } else if (filterType === 'person') {
      onApply(selectedPersons.length > 0 ? selectedPersons : null);
    } else if (filterType === 'location') {
      onApply(selectedLocations.length > 0 ? selectedLocations : null);
    } else if (filterType === 'date') {
      onApply((dateRange.from || dateRange.to) ? dateRange : null);
    }
    onClose();
  };

  const handleClear = () => {
    if (filterType === 'status') {
      setSelectedStatuses([]);
    } else if (filterType === 'person') {
      setSelectedPersons([]);
    } else if (filterType === 'location') {
      setSelectedLocations([]);
    } else if (filterType === 'date') {
      setDateRange({});
      setDateRangeMode('from');
    }
  };

  if (!isOpen || !mounted || !position) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        ref={dropdownRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        style={{
          position: 'fixed',
          top: `${position.top}px`,
          left: `${position.left}px`,
          zIndex: 9999
        }}
        className="bg-neutral-900/95 backdrop-blur-md border border-neutral-700 rounded-lg shadow-2xl overflow-hidden w-[300px]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-700">
          <h3 className="text-sm font-medium text-white">
            {columnLabel} filtern
          </h3>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[400px] overflow-y-auto">
          {/* Status Filter */}
          {filterType === 'status' && (
            <div className="space-y-2">
              {statusOptions.map((status) => (
                <label
                  key={status}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  <div className="relative flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={selectedStatuses.includes(status)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedStatuses([...selectedStatuses, status]);
                        } else {
                          setSelectedStatuses(selectedStatuses.filter(s => s !== status));
                        }
                      }}
                      className="w-4 h-4 rounded border-neutral-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                    />
                  </div>
                  <span className="text-sm text-white">{status}</span>
                </label>
              ))}
            </div>
          )}

          {/* Person Filter */}
          {filterType === 'person' && (
            <div className="space-y-2">
              {/* Nicht zugewiesen Option */}
              <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer">
                <div className="relative flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={selectedPersons.includes('unassigned')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedPersons([...selectedPersons, 'unassigned']);
                      } else {
                        setSelectedPersons(selectedPersons.filter(id => id !== 'unassigned'));
                      }
                    }}
                    className="w-4 h-4 rounded border-neutral-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                  />
                </div>
                <span className="text-sm text-neutral-400 italic">Nicht zugewiesen</span>
              </label>

              {/* Personen */}
              {personOptions.map((person) => (
                <label
                  key={person.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  <div className="relative flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={selectedPersons.includes(person.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPersons([...selectedPersons, person.id]);
                        } else {
                          setSelectedPersons(selectedPersons.filter(id => id !== person.id));
                        }
                      }}
                      className="w-4 h-4 rounded border-neutral-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                    />
                  </div>
                  <ResponsiblePersonAvatar
                    responsiblePerson={person.id}
                    size="sm"
                  />
                  <span className="text-sm text-white">
                    {person.firstname && person.lastname
                      ? `${person.firstname} ${person.lastname}`
                      : person.email.split('@')[0]}
                  </span>
                </label>
              ))}
            </div>
          )}

          {/* Location Filter */}
          {filterType === 'location' && (
            <div className="space-y-2">
              {locationOptions.length > 0 ? (
                locationOptions.map((location) => (
                  <label
                    key={location}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
                  >
                    <div className="relative flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={selectedLocations.includes(location)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedLocations([...selectedLocations, location]);
                          } else {
                            setSelectedLocations(selectedLocations.filter(l => l !== location));
                          }
                        }}
                        className="w-4 h-4 rounded border-neutral-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                      />
                    </div>
                    <span className="text-sm text-white">{location}</span>
                  </label>
                ))
              ) : (
                <p className="text-sm text-neutral-400 text-center py-4">
                  Keine Speicherorte verfügbar
                </p>
              )}
            </div>
          )}

          {/* Date Filter - Ein Kalender mit zwei Klicks */}
          {filterType === 'date' && (
            <div className="space-y-4">
              <div className="text-xs text-neutral-400 mb-2">
                {dateRangeMode === 'from' 
                  ? 'Klicken Sie auf ein Datum für "Von"'
                  : dateRange.from 
                    ? `Von: ${new Date(dateRange.from).toLocaleDateString('de-DE')} - Klicken Sie auf ein Datum für "Bis"`
                    : 'Klicken Sie auf ein Datum für "Von"'}
              </div>
              <div className="relative">
                <input
                  type="date"
                  value={dateRangeMode === 'from' ? (dateRange.from || '') : (dateRange.to || '')}
                  onChange={(e) => {
                    const selectedDate = e.target.value;
                    if (dateRangeMode === 'from') {
                      setDateRange({ from: selectedDate, to: dateRange.to });
                      // Nach "von" automatisch zu "bis" wechseln
                      setDateRangeMode('to');
                    } else {
                      // "bis" wurde ausgewählt - Filter anwenden und schließen
                      setDateRange({ from: dateRange.from, to: selectedDate });
                      // Automatisch anwenden wenn beide Daten gesetzt sind
                      if (dateRange.from && selectedDate) {
                        setTimeout(() => {
                          handleApply();
                        }, 100);
                      }
                    }
                  }}
                  min={dateRangeMode === 'to' && dateRange.from ? dateRange.from : undefined}
                  className="w-full bg-neutral-800 border border-neutral-700 text-white text-sm rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
              </div>
              {(dateRange.from || dateRange.to) && (
                <div className="flex items-center gap-2 text-xs">
                  {dateRange.from && (
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded">
                      Von: {new Date(dateRange.from).toLocaleDateString('de-DE')}
                    </span>
                  )}
                  {dateRange.to && (
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded">
                      Bis: {new Date(dateRange.to).toLocaleDateString('de-DE')}
                    </span>
                  )}
                  <button
                    onClick={() => {
                      setDateRange({});
                      setDateRangeMode('from');
                    }}
                    className="text-neutral-400 hover:text-white transition-colors"
                  >
                    Zurücksetzen
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-700 bg-neutral-800/50">
          <button
            onClick={handleClear}
            className="text-sm text-neutral-400 hover:text-white transition-colors"
          >
            Zurücksetzen
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-medium transition-colors"
          >
            Anwenden
          </button>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

