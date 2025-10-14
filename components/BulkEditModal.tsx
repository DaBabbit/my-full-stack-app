'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle } from 'lucide-react';
import CustomDropdown from './CustomDropdown';
import ResponsiblePersonDropdownSimple from './ResponsiblePersonDropdownSimple';
import { Lightbulb, Clock, Scissors, Check, Rocket } from 'lucide-react';

interface BulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: BulkUpdateData) => void;
  selectedCount: number;
  workspaceOwner?: { firstname: string; lastname: string; email: string };
  workspaceMembers?: Array<{ id: string; user?: { firstname?: string; lastname?: string; email: string } }>;
}

export interface BulkUpdateData {
  fields: {
    status?: string;
    description?: string;
    publication_date?: string;
    responsible_person?: string;
    inspiration_source?: string;
  };
  enabledFields: {
    status: boolean;
    description: boolean;
    publication_date: boolean;
    responsible_person: boolean;
    inspiration_source: boolean;
  };
}

/**
 * Modal für Bulk-Edit von mehreren Videos
 * 
 * Features:
 * - Alle editierbaren Felder
 * - Checkboxen um Felder zu aktivieren/deaktivieren
 * - Preview der betroffenen Videos
 * - Validierung vor Speichern
 */
export default function BulkEditModal({
  isOpen,
  onClose,
  onSave,
  selectedCount,
  workspaceOwner,
  workspaceMembers = []
}: BulkEditModalProps) {
  const [enabledFields, setEnabledFields] = useState({
    status: false,
    description: false,
    publication_date: false,
    responsible_person: false,
    inspiration_source: false
  });

  const [fieldValues, setFieldValues] = useState({
    status: 'Idee',
    description: '',
    publication_date: '',
    responsible_person: '',
    inspiration_source: ''
  });

  const handleToggleField = (field: keyof typeof enabledFields) => {
    setEnabledFields(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleSave = () => {
    // Validierung: mindestens ein Feld muss aktiviert sein
    const hasEnabledField = Object.values(enabledFields).some(v => v);
    if (!hasEnabledField) {
      alert('Bitte wählen Sie mindestens ein Feld zum Bearbeiten aus.');
      return;
    }

    // Nur aktivierte Felder zurückgeben
    const updates: BulkUpdateData = {
      fields: {},
      enabledFields
    };

    if (enabledFields.status) updates.fields.status = fieldValues.status;
    if (enabledFields.description) updates.fields.description = fieldValues.description;
    if (enabledFields.publication_date) updates.fields.publication_date = fieldValues.publication_date;
    if (enabledFields.responsible_person) updates.fields.responsible_person = fieldValues.responsible_person;
    if (enabledFields.inspiration_source) updates.fields.inspiration_source = fieldValues.inspiration_source;

    onSave(updates);
    handleClose();
  };

  const handleClose = () => {
    // Reset state
    setEnabledFields({
      status: false,
      description: false,
      publication_date: false,
      responsible_person: false,
      inspiration_source: false
    });
    setFieldValues({
      status: 'Idee',
      description: '',
      publication_date: '',
      responsible_person: '',
      inspiration_source: ''
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="bg-neutral-900/95 backdrop-blur-md rounded-3xl p-6 max-w-2xl w-full border border-neutral-700 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-white">Mehrere Videos bearbeiten</h3>
              <p className="text-sm text-neutral-400 mt-1">
                {selectedCount} {selectedCount === 1 ? 'Video' : 'Videos'} ausgewählt
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-neutral-400" />
            </button>
          </div>

          {/* Info Banner */}
          <div className="flex items-start gap-3 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6">
            <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-blue-300">
                Wählen Sie die Eigenschaften aus, die Sie für alle ausgewählten Videos ändern möchten.
              </p>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Status */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="enable-status"
                checked={enabledFields.status}
                onChange={() => handleToggleField('status')}
                className="mt-1 w-4 h-4 rounded border-neutral-700 bg-neutral-800 text-white focus:ring-white focus:ring-offset-0"
              />
              <div className="flex-1">
                <label htmlFor="enable-status" className="block text-sm font-medium text-neutral-300 mb-2 cursor-pointer">
                  Status
                </label>
                <CustomDropdown
                  options={[
                    { value: 'Idee', label: 'Idee', icon: Lightbulb, iconColor: 'text-gray-400' },
                    { value: 'Warten auf Aufnahme', label: 'Warten auf Aufnahme', icon: Clock, iconColor: 'text-red-400' },
                    { value: 'In Bearbeitung (Schnitt)', label: 'In Bearbeitung (Schnitt)', icon: Scissors, iconColor: 'text-purple-400' },
                    { value: 'Schnitt abgeschlossen', label: 'Schnitt abgeschlossen', icon: Check, iconColor: 'text-blue-400' },
                    { value: 'Hochgeladen', label: 'Hochgeladen', icon: Rocket, iconColor: 'text-green-400' }
                  ]}
                  value={fieldValues.status}
                  onChange={(value) => setFieldValues(prev => ({ ...prev, status: value }))}
                  disabled={!enabledFields.status}
                />
              </div>
            </div>

            {/* Description */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="enable-description"
                checked={enabledFields.description}
                onChange={() => handleToggleField('description')}
                className="mt-1 w-4 h-4 rounded border-neutral-700 bg-neutral-800 text-white focus:ring-white focus:ring-offset-0"
              />
              <div className="flex-1">
                <label htmlFor="enable-description" className="block text-sm font-medium text-neutral-300 mb-2 cursor-pointer">
                  Beschreibung
                </label>
                <textarea
                  value={fieldValues.description}
                  onChange={(e) => setFieldValues(prev => ({ ...prev, description: e.target.value }))}
                  disabled={!enabledFields.description}
                  rows={3}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-white focus:border-white resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Beschreibung für alle ausgewählten Videos..."
                />
              </div>
            </div>

            {/* Publication Date */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="enable-publication-date"
                checked={enabledFields.publication_date}
                onChange={() => handleToggleField('publication_date')}
                className="mt-1 w-4 h-4 rounded border-neutral-700 bg-neutral-800 text-white focus:ring-white focus:ring-offset-0"
              />
              <div className="flex-1">
                <label htmlFor="enable-publication-date" className="block text-sm font-medium text-neutral-300 mb-2 cursor-pointer">
                  Veröffentlichungsdatum
                </label>
                <input
                  type="date"
                  value={fieldValues.publication_date}
                  onChange={(e) => setFieldValues(prev => ({ ...prev, publication_date: e.target.value }))}
                  disabled={!enabledFields.publication_date}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white focus:border-white disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Responsible Person */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="enable-responsible-person"
                checked={enabledFields.responsible_person}
                onChange={() => handleToggleField('responsible_person')}
                className="mt-1 w-4 h-4 rounded border-neutral-700 bg-neutral-800 text-white focus:ring-white focus:ring-offset-0"
              />
              <div className="flex-1">
                <label htmlFor="enable-responsible-person" className="block text-sm font-medium text-neutral-300 mb-2 cursor-pointer">
                  Verantwortliche Person
                </label>
                <div className={!enabledFields.responsible_person ? 'opacity-50 pointer-events-none' : ''}>
                  <ResponsiblePersonDropdownSimple
                    value={fieldValues.responsible_person}
                    onChange={(value) => setFieldValues(prev => ({ ...prev, responsible_person: value }))}
                    workspaceOwner={workspaceOwner}
                    workspaceMembers={workspaceMembers}
                  />
                </div>
              </div>
            </div>

            {/* Inspiration Source */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="enable-inspiration-source"
                checked={enabledFields.inspiration_source}
                onChange={() => handleToggleField('inspiration_source')}
                className="mt-1 w-4 h-4 rounded border-neutral-700 bg-neutral-800 text-white focus:ring-white focus:ring-offset-0"
              />
              <div className="flex-1">
                <label htmlFor="enable-inspiration-source" className="block text-sm font-medium text-neutral-300 mb-2 cursor-pointer">
                  Inspiration Quelle
                </label>
                <input
                  type="url"
                  value={fieldValues.inspiration_source}
                  onChange={(e) => setFieldValues(prev => ({ ...prev, inspiration_source: e.target.value }))}
                  disabled={!enabledFields.inspiration_source}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-white focus:border-white disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 justify-end mt-8">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-neutral-400 hover:bg-neutral-800 rounded-lg transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-white hover:bg-neutral-100 text-black rounded-lg font-medium transition-all duration-300 hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]"
            >
              {selectedCount} {selectedCount === 1 ? 'Video' : 'Videos'} aktualisieren
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

