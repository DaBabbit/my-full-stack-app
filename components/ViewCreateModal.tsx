'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Filter, ArrowUpDown } from 'lucide-react';
import type { WorkspaceView } from '@/hooks/useWorkspaceViews';

interface ViewCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (viewData: {
    name: string;
    filters: Record<string, any>;
    sort_config?: { field: string; direction: 'asc' | 'desc' };
  }) => Promise<void>;
  editView?: WorkspaceView | null;
  currentFilters?: Record<string, any>;
  currentSort?: { field: string; direction: 'asc' | 'desc' };
}

/**
 * Modal zum Erstellen/Bearbeiten einer View
 * 
 * Features:
 * - Name eingeben
 * - Aktuelle Filter übernehmen
 * - Sortierung speichern
 */
export function ViewCreateModal({
  isOpen,
  onClose,
  onSave,
  editView,
  currentFilters = {},
  currentSort,
}: ViewCreateModalProps) {
  const [name, setName] = useState('');
  const [includeFilters, setIncludeFilters] = useState(true);
  const [includeSort, setIncludeSort] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (editView) {
      setName(editView.name);
      setIncludeFilters(Object.keys(editView.filters || {}).length > 0);
      setIncludeSort(!!editView.sort_config);
    } else {
      setName('');
      setIncludeFilters(Object.keys(currentFilters).length > 0);
      setIncludeSort(!!currentSort);
    }
  }, [editView, currentFilters, currentSort, isOpen]);

  // Close on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSaving) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isSaving, onClose]);

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Bitte gib einen Namen für die Ansicht ein.');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        name: name.trim(),
        filters: includeFilters ? currentFilters : {},
        sort_config: includeSort ? currentSort : undefined,
      });
      onClose();
    } catch (error) {
      console.error('Error saving view:', error);
      alert('Fehler beim Speichern der Ansicht. Bitte versuche es erneut.');
    } finally {
      setIsSaving(false);
    }
  };

  const activeFiltersCount = Object.keys(currentFilters).filter(key => {
    const value = currentFilters[key];
    return value !== null && value !== undefined && value !== '';
  }).length;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={!isSaving ? onClose : undefined}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-neutral-700 bg-gradient-to-r from-neutral-900 to-neutral-800">
            <div>
              <h2 className="text-xl font-semibold text-white">
                {editView ? 'Ansicht bearbeiten' : 'Neue Ansicht erstellen'}
              </h2>
              <p className="text-sm text-neutral-400 mt-1">
                Speichere aktuelle Filter und Sortierung
              </p>
            </div>

            <button
              onClick={onClose}
              disabled={isSaving}
              className="text-neutral-400 hover:text-white transition-colors disabled:opacity-50"
              aria-label="Schließen"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Name Input */}
            <div>
              <label htmlFor="view-name" className="block text-sm font-medium text-neutral-300 mb-2">
                Name der Ansicht
              </label>
              <input
                id="view-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z.B. Videos in Bearbeitung"
                className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
                disabled={isSaving}
              />
            </div>

            {/* Include Filters */}
            <div className="flex items-start gap-3 p-4 bg-neutral-800/50 rounded-lg border border-neutral-700">
              <input
                type="checkbox"
                id="include-filters"
                checked={includeFilters}
                onChange={(e) => setIncludeFilters(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-neutral-600 bg-neutral-700 text-blue-600 focus:ring-2 focus:ring-blue-500"
                disabled={isSaving}
              />
              <div className="flex-1">
                <label htmlFor="include-filters" className="flex items-center gap-2 text-sm font-medium text-white cursor-pointer">
                  <Filter className="w-4 h-4 text-blue-400" />
                  Aktuelle Filter einbeziehen
                </label>
                {activeFiltersCount > 0 ? (
                  <p className="text-xs text-neutral-400 mt-1">
                    {activeFiltersCount} Filter aktiv
                  </p>
                ) : (
                  <p className="text-xs text-neutral-500 mt-1">
                    Keine Filter aktiv
                  </p>
                )}
              </div>
            </div>

            {/* Include Sort */}
            <div className="flex items-start gap-3 p-4 bg-neutral-800/50 rounded-lg border border-neutral-700">
              <input
                type="checkbox"
                id="include-sort"
                checked={includeSort}
                onChange={(e) => setIncludeSort(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-neutral-600 bg-neutral-700 text-blue-600 focus:ring-2 focus:ring-blue-500"
                disabled={isSaving}
              />
              <div className="flex-1">
                <label htmlFor="include-sort" className="flex items-center gap-2 text-sm font-medium text-white cursor-pointer">
                  <ArrowUpDown className="w-4 h-4 text-blue-400" />
                  Aktuelle Sortierung einbeziehen
                </label>
                {currentSort ? (
                  <p className="text-xs text-neutral-400 mt-1">
                    Sortiert nach: {currentSort.field} ({currentSort.direction === 'asc' ? 'Aufsteigend' : 'Absteigend'})
                  </p>
                ) : (
                  <p className="text-xs text-neutral-500 mt-1">
                    Standard-Sortierung
                  </p>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-xs text-blue-300/80">
                💡 <span className="font-medium">Tipp:</span> Diese Ansicht wird für alle Workspace-Mitglieder sichtbar sein.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-neutral-700 bg-neutral-800/50">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-sm text-neutral-400 hover:text-white hover:bg-neutral-700 rounded-lg transition-colors disabled:opacity-50"
            >
              Abbrechen
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving || !name.trim()}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Speichern...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Speichern
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

