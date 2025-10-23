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

  console.log('[ViewTabs] 🚀 Component rendered');
  console.log('[ViewTabs] 📋 Views:', views.length, 'views');
  console.log('[ViewTabs] 🔑 canManageViews:', canManageViews);
  console.log('[ViewTabs] 📍 contextMenuViewId state:', contextMenuViewId);

  // ESC key to close menu
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && contextMenuViewId) {
        console.log('[ViewTabs] ⌨️ ESC pressed, closing menu');
        setContextMenuViewId(null);
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, [contextMenuViewId]);

  const defaultView = views.find(v => v.is_default);

  return (
    <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-2">
      {/* "Alle Videos" Tab */}
      <button
        onClick={() => onViewChange(null)}
        className={`
          relative px-3 py-1.5 rounded-md text-xs whitespace-nowrap transition-all
          ${activeViewId === null
            ? 'bg-blue-600 text-white shadow-md'
            : 'bg-neutral-800/50 text-neutral-400 hover:bg-neutral-800 hover:text-white'
          }
        `}
      >
        Alle Videos
        {defaultView === undefined && activeViewId === null && (
          <Star className="absolute -top-1 -right-1 w-3 h-3 text-yellow-400 fill-yellow-400" />
        )}
      </button>

      {/* Custom Views */}
      {views.map((view) => {
        console.log('[ViewTabs] 🔄 Rendering view:', view.name, 'id:', view.id);
        return (
        <div key={view.id} className="relative">
          <button
            onClick={() => onViewChange(view.id)}
            className={`
              relative px-3 py-1.5 pr-7 rounded-md text-xs whitespace-nowrap transition-all
              ${activeViewId === view.id
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-neutral-800/50 text-neutral-400 hover:bg-neutral-800 hover:text-white'
              }
            `}
          >
            {view.name}
            {view.is_default && (
              <Star className="absolute -top-1 -left-1 w-3 h-3 text-yellow-400 fill-yellow-400" />
            )}
          </button>

          {/* Context Menu Button */}
          {canManageViews && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                console.log('[ViewTabs] 🔘 Button clicked for view:', view.name, view.id);
                console.log('[ViewTabs] 📊 Current contextMenuViewId:', contextMenuViewId);
                const newValue = contextMenuViewId === view.id ? null : view.id;
                console.log('[ViewTabs] ✨ Setting contextMenuViewId to:', newValue);
                setContextMenuViewId(newValue);
              }}
              className="absolute top-1/2 -translate-y-1/2 right-1 p-0.5 hover:bg-neutral-700 rounded text-neutral-500 hover:text-white transition-colors z-10"
            >
              <MoreVertical className="w-3 h-3" />
            </button>
          )}

          {/* Context Menu with Backdrop */}
          {contextMenuViewId === view.id && (
            <>
              {/* Backdrop Overlay */}
              <div 
                className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[9998]"
                onClick={() => {
                  console.log('[ViewTabs] 🚫 Backdrop clicked, closing menu');
                  setContextMenuViewId(null);
                }}
              />
              
              {/* Dropdown Menu */}
              <AnimatePresence>
                <motion.div
                  ref={contextMenuRef}
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-full right-0 mb-2 z-[9999] bg-neutral-800/95 backdrop-blur-md border border-neutral-700 rounded-lg shadow-2xl overflow-hidden min-w-[180px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => {
                      console.log('[ViewTabs] ⭐ Set default clicked');
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
                      console.log('[ViewTabs] ✏️ Edit clicked');
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
                      console.log('[ViewTabs] 🗑️ Delete clicked');
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
            </>
          )}
        </div>
        );
      })}

      {/* "+ Ansicht erstellen" Button */}
      {canManageViews && (
        <button
          onClick={onCreateView}
          className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs whitespace-nowrap bg-neutral-800/30 border border-dashed border-neutral-600 text-neutral-500 hover:bg-neutral-800 hover:text-white hover:border-blue-500 transition-all"
        >
          <Plus className="w-3 h-3" />
          Ansicht
        </button>
      )}
    </div>
  );
}

