'use client';

import { motion } from 'framer-motion';
import { X, CheckSquare, Square } from 'lucide-react';

interface BulkEditBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onCancel: () => void;
}

/**
 * Floating Action Bar für Bulk-Edit Operationen
 * 
 * Features:
 * - Zeigt Anzahl ausgewählter Videos
 * - Alle auswählen/abwählen
 * - Bulk bearbeiten Button
 * - Abbrechen Button
 * - Glassmorphism Design mit Animation
 */
export default function BulkEditBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onCancel
}: BulkEditBarProps) {
  const allSelected = selectedCount === totalCount && totalCount > 0;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-40"
    >
      <div className="bg-black/80 backdrop-blur-md border border-neutral-700 rounded-2xl shadow-2xl px-6 py-4">
        <div className="flex items-center gap-4">
          {/* Selected Count */}
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-blue-400" />
            <span className="text-white font-medium">
              {selectedCount} {selectedCount === 1 ? 'Video' : 'Videos'} ausgewählt
            </span>
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-neutral-700" />

          {/* Select All / Deselect All */}
          <button
            onClick={allSelected ? onDeselectAll : onSelectAll}
            className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
          >
            {allSelected ? (
              <>
                <Square className="w-4 h-4" />
                <span>Alle abwählen</span>
              </>
            ) : (
              <>
                <CheckSquare className="w-4 h-4" />
                <span>Alle auswählen</span>
              </>
            )}
          </button>

          {/* Cancel Button */}
          <button
            onClick={onCancel}
            className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
            <span>Abbrechen</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}

