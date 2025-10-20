'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye, EyeOff, GripVertical, RotateCcw } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

export interface ColumnConfig {
  id: string;
  label: string;
  fixed?: boolean; // Kann nicht verschoben oder ausgeblendet werden
  resizable?: boolean;
}

interface TableColumnsSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  columns: ColumnConfig[];
  columnOrder: string[];
  hiddenColumns: string[];
  onColumnOrderChange: (newOrder: string[]) => void;
  onToggleColumnVisibility: (columnId: string) => void;
  onReset: () => void;
}

/**
 * Modal für Spalten-Einstellungen
 * 
 * Features:
 * - Spalten-Sichtbarkeit ein/ausschalten
 * - Spalten-Reihenfolge per Drag & Drop
 * - Reset zu Standardeinstellungen
 */
export function TableColumnsSettings({
  isOpen,
  onClose,
  columns,
  columnOrder,
  hiddenColumns,
  onColumnOrderChange,
  onToggleColumnVisibility,
  onReset,
}: TableColumnsSettingsProps) {
  const [localOrder, setLocalOrder] = useState<string[]>(columnOrder);

  useEffect(() => {
    setLocalOrder(columnOrder);
  }, [columnOrder]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(localOrder);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setLocalOrder(items);
    onColumnOrderChange(items);
  };

  const getColumnById = (id: string) => columns.find(col => col.id === id);

  // Sortiere Spalten nach localOrder
  const orderedColumns = localOrder
    .map(id => getColumnById(id))
    .filter((col): col is ColumnConfig => col !== undefined);

  // Fixierte Spalten (nicht draggable)
  const fixedColumns = columns.filter(col => col.fixed);
  const movableColumns = orderedColumns.filter(col => !col.fixed);

  // Close on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden"
          style={{ maxHeight: '80vh' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-neutral-700 bg-gradient-to-r from-neutral-900 to-neutral-800">
            <div>
              <h2 className="text-xl font-semibold text-white">
                Spalten anpassen
              </h2>
              <p className="text-sm text-neutral-400 mt-1">
                Spalten ausblenden, anzeigen und Reihenfolge ändern
              </p>
            </div>

            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-white transition-colors"
              aria-label="Schließen"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 140px)' }}>
            {/* Fixed Columns */}
            {fixedColumns.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-neutral-400 mb-3">
                  Fixierte Spalten
                </h3>
                <div className="space-y-2">
                  {fixedColumns.map(column => (
                    <div
                      key={column.id}
                      className="flex items-center justify-between p-3 bg-neutral-800/30 rounded-lg border border-neutral-700/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-neutral-600">
                          <GripVertical className="w-5 h-5" />
                        </div>
                        <span className="text-white font-medium">{column.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-neutral-500">Immer sichtbar</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Draggable Columns */}
            <div>
              <h3 className="text-sm font-medium text-neutral-400 mb-3">
                Anpassbare Spalten
              </h3>

              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="columns">
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={`space-y-2 ${snapshot.isDraggingOver ? 'bg-blue-500/5 rounded-lg p-2' : ''}`}
                    >
                      {movableColumns.map((column, index) => {
                        const isHidden = hiddenColumns.includes(column.id);

                        return (
                          <Draggable
                            key={column.id}
                            draggableId={column.id}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`flex items-center justify-between p-3 bg-neutral-800 rounded-lg border border-neutral-700 transition-all ${
                                  snapshot.isDragging ? 'shadow-xl ring-2 ring-blue-500' : ''
                                } ${isHidden ? 'opacity-50' : ''}`}
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    {...provided.dragHandleProps}
                                    className="text-neutral-400 hover:text-white cursor-grab active:cursor-grabbing"
                                  >
                                    <GripVertical className="w-5 h-5" />
                                  </div>
                                  <span className="text-white font-medium">{column.label}</span>
                                </div>

                                <button
                                  onClick={() => onToggleColumnVisibility(column.id)}
                                  className={`p-2 rounded-lg transition-colors ${
                                    isHidden
                                      ? 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-700'
                                      : 'text-blue-400 hover:text-blue-300 hover:bg-blue-500/10'
                                  }`}
                                  title={isHidden ? 'Einblenden' : 'Ausblenden'}
                                >
                                  {isHidden ? (
                                    <EyeOff className="w-5 h-5" />
                                  ) : (
                                    <Eye className="w-5 h-5" />
                                  )}
                                </button>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>

            {/* Info */}
            <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-xs text-blue-300/80">
                💡 <span className="font-medium">Tipp:</span> Ziehe Spalten mit der Maus, um die Reihenfolge zu ändern. 
                Klicke auf das Augen-Symbol, um Spalten ein- oder auszublenden.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-neutral-700 bg-neutral-800/50">
            <button
              onClick={onReset}
              className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-400 hover:text-white hover:bg-neutral-700 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Zurücksetzen
            </button>

            <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Fertig
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

