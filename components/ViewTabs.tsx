'use client';

import { Plus, MoreVertical, Trash2, Edit, Star } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { WorkspaceView } from '@/hooks/useWorkspaceViews';

interface ViewTabsProps {
  activeViewId: string | null; // null = "Alle Videos"
  views: WorkspaceView[];
  onViewChange: (viewId: string | null) => void;
  onCreateView: () => void;
  onEditView: (view: WorkspaceView) => void;
  onDeleteView: (viewId: string) => void;
  onSetDefault: (viewId: string | null) => void;
  canManageViews?: boolean; // Permission check
}

/**
 * Tabs für verschiedene Ansichten (Views)
 * 
 * Features:
 * - "Alle Videos" als Standard-Tab
 * - Custom Views als Tabs
 * - Kontext-Menü für Edit/Delete
 * - "+ Ansicht erstellen" Button
 */
export function ViewTabs({
  activeViewId,
  views,
  onViewChange,
  onCreateView,
  onEditView,
  onDeleteView,
  onSetDefault,
  canManageViews = true,
}: ViewTabsProps) {
  const [contextMenuViewId, setContextMenuViewId] = useState<string | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Close context menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenuViewId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const defaultView = views.find(v => v.is_default);

  return (
    <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
      {/* "Alle Videos" Tab */}
      <button
        onClick={() => onViewChange(null)}
        className={`
          relative px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all
          ${activeViewId === null
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
            : 'bg-neutral-800/50 text-neutral-300 hover:bg-neutral-800 hover:text-white'
          }
        `}
      >
        Alle Videos
        {defaultView === undefined && activeViewId === null && (
          <Star className="absolute -top-1 -right-1 w-4 h-4 text-yellow-400 fill-yellow-400" />
        )}
      </button>

      {/* Custom Views */}
      {views.map((view) => (
        <div key={view.id} className="relative">
          <button
            onClick={() => onViewChange(view.id)}
            className={`
              relative px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all
              ${activeViewId === view.id
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'bg-neutral-800/50 text-neutral-300 hover:bg-neutral-800 hover:text-white'
              }
            `}
          >
            {view.name}
            {view.is_default && (
              <Star className="absolute -top-1 -right-1 w-4 h-4 text-yellow-400 fill-yellow-400" />
            )}
          </button>

          {/* Context Menu Button */}
          {canManageViews && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setContextMenuViewId(contextMenuViewId === view.id ? null : view.id);
              }}
              className="absolute -top-2 -right-2 p-1 bg-neutral-700 hover:bg-neutral-600 rounded-full text-neutral-400 hover:text-white transition-colors"
            >
              <MoreVertical className="w-3 h-3" />
            </button>
          )}

          {/* Context Menu */}
          {contextMenuViewId === view.id && (
            <AnimatePresence>
              <motion.div
                ref={contextMenuRef}
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="absolute top-full right-0 mt-2 z-50 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl overflow-hidden min-w-[180px]"
              >
                <button
                  onClick={() => {
                    onSetDefault(view.is_default ? null : view.id);
                    setContextMenuViewId(null);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-white hover:bg-neutral-700 transition-colors"
                >
                  <Star className={`w-4 h-4 ${view.is_default ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                  {view.is_default ? 'Als Standard entfernen' : 'Als Standard festlegen'}
                </button>

                <button
                  onClick={() => {
                    onEditView(view);
                    setContextMenuViewId(null);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-white hover:bg-neutral-700 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  Bearbeiten
                </button>

                <button
                  onClick={() => {
                    if (confirm(`Möchtest du die Ansicht "${view.name}" wirklich löschen?`)) {
                      onDeleteView(view.id);
                      setContextMenuViewId(null);
                    }
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Löschen
                </button>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      ))}

      {/* "+ Ansicht erstellen" Button */}
      {canManageViews && (
        <button
          onClick={onCreateView}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap bg-neutral-800/30 border border-dashed border-neutral-600 text-neutral-400 hover:bg-neutral-800 hover:text-white hover:border-blue-500 transition-all"
        >
          <Plus className="w-4 h-4" />
          Ansicht erstellen
        </button>
      )}
    </div>
  );
}

