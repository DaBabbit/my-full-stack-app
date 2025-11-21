'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, ArrowDown, Filter, EyeOff, ChevronRight } from 'lucide-react';

export type ColumnType = 'text' | 'status' | 'person' | 'date' | 'location';

interface ColumnHeaderDropdownProps {
  columnId: string;
  columnLabel: string;
  columnType: ColumnType;
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement>;
  onSort: (direction: 'asc' | 'desc') => void;
  onFilter: () => void;
  onHide: () => void;
  canFilter?: boolean; // Einige Spalten können nicht gefiltert werden
  canSort?: boolean; // Einige Spalten können nicht sortiert werden
}

export function ColumnHeaderDropdown({
  isOpen,
  onClose,
  triggerRef,
  onSort,
  onFilter,
  onHide,
  canFilter = true,
  canSort = true,
}: ColumnHeaderDropdownProps) {
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [showSortSubmenu, setShowSortSubmenu] = useState(false);
  const [sortSubmenuPosition, setSortSubmenuPosition] = useState<{ top: number; left: number } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const sortButtonRef = useRef<HTMLButtonElement>(null);
  const submenuCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Berechne Position basierend auf Trigger-Element mit Viewport-Check
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const dropdownWidth = 200;
      const dropdownHeight = 200; // Geschätzte Höhe
      
      let left = rect.left;
      let top = rect.bottom + 4;
      
      // Prüfe ob genug Platz rechts ist
      if (left + dropdownWidth > viewportWidth) {
        left = Math.max(16, viewportWidth - dropdownWidth - 16);
      }
      
      // Prüfe ob genug Platz unten ist
      if (top + dropdownHeight > viewportHeight) {
        top = rect.top - dropdownHeight - 4;
        // Falls auch oben nicht genug Platz
        if (top < 0) {
          top = Math.max(16, (viewportHeight - dropdownHeight) / 2);
        }
      }
      
      setPosition({ top, left });
    }
  }, [isOpen, triggerRef]);

  // Berechne Position für Sort-Submenu mit Viewport-Check
  useEffect(() => {
    if (showSortSubmenu && sortButtonRef.current) {
      const rect = sortButtonRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const submenuWidth = 180;
      const submenuHeight = 100; // 2 Optionen
      
      let left = rect.right + 4;
      let top = rect.top;
      
      // Prüfe ob genug Platz rechts ist
      if (left + submenuWidth > viewportWidth) {
        // Zeige links vom Hauptmenü
        left = rect.left - submenuWidth - 4;
      }
      
      // Prüfe ob genug Platz unten ist
      if (top + submenuHeight > viewportHeight) {
        top = viewportHeight - submenuHeight - 16;
      }
      
      // Prüfe ob zu weit oben
      if (top < 16) {
        top = 16;
      }
      
      setSortSubmenuPosition({ top, left });
    } else {
      setSortSubmenuPosition(null);
    }
  }, [showSortSubmenu]);

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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (submenuCloseTimeoutRef.current) {
        clearTimeout(submenuCloseTimeoutRef.current);
      }
    };
  }, []);

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
        className="bg-neutral-800/95 backdrop-blur-md border border-neutral-700 rounded-lg shadow-2xl overflow-hidden w-[200px]"
      >
        {/* Sortieren mit Submenu - Nur anzeigen wenn canSort true */}
        {canSort && (
        <div 
          className="relative"
          onMouseEnter={() => {
            // Lösche pending timeout
            if (submenuCloseTimeoutRef.current) {
              clearTimeout(submenuCloseTimeoutRef.current);
              submenuCloseTimeoutRef.current = null;
            }
            setShowSortSubmenu(true);
          }}
          onMouseLeave={() => {
            // Verzögere das Schließen um 300ms
            submenuCloseTimeoutRef.current = setTimeout(() => {
              setShowSortSubmenu(false);
            }, 300);
          }}
        >
          <button
            ref={sortButtonRef}
            className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-white hover:bg-neutral-700 transition-colors"
          >
            <div className="flex items-center gap-2">
              <ArrowUp className="w-4 h-4" />
              <span>Sortieren</span>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-400" />
          </button>

          {/* Sortieren Submenu - Portal für bessere Positionierung */}
          {showSortSubmenu && sortSubmenuPosition && createPortal(
            <div
              style={{
                position: 'fixed',
                top: `${sortSubmenuPosition.top}px`,
                left: `${sortSubmenuPosition.left}px`,
                zIndex: 10000,
                pointerEvents: 'auto'
              }}
              className="bg-neutral-800/95 backdrop-blur-md border border-neutral-700 rounded-lg shadow-2xl overflow-hidden w-[180px]"
              onMouseEnter={() => {
                // Lösche pending timeout wenn Maus ins Submenu geht
                if (submenuCloseTimeoutRef.current) {
                  clearTimeout(submenuCloseTimeoutRef.current);
                  submenuCloseTimeoutRef.current = null;
                }
                setShowSortSubmenu(true);
              }}
              onMouseLeave={() => {
                // Verzögere das Schließen um 300ms
                submenuCloseTimeoutRef.current = setTimeout(() => {
                  setShowSortSubmenu(false);
                }, 300);
              }}
            >
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('[ColumnHeaderDropdown] Aufsteigend clicked');
                  onSort('asc');
                  setShowSortSubmenu(false);
                  onClose();
                }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-white hover:bg-neutral-700 transition-colors"
              >
                <ArrowUp className="w-4 h-4" />
                <span>Aufsteigend</span>
              </button>
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('[ColumnHeaderDropdown] Absteigend clicked');
                  onSort('desc');
                  setShowSortSubmenu(false);
                  onClose();
                }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-white hover:bg-neutral-700 transition-colors"
              >
                <ArrowDown className="w-4 h-4" />
                <span>Absteigend</span>
              </button>
            </div>,
            document.body
          )}
        </div>
        )}

        {/* Filtern */}
        {canFilter && (
          <button
            onClick={() => {
              onFilter();
              onClose();
            }}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-white hover:bg-neutral-700 transition-colors"
          >
            <Filter className="w-4 h-4" />
            <span>Filtern</span>
          </button>
        )}

        {/* Verbergen */}
        <button
          onClick={() => {
            onHide();
            onClose();
          }}
          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-white hover:bg-neutral-700 transition-colors border-t border-neutral-700/50"
        >
          <EyeOff className="w-4 h-4" />
          <span>Verbergen</span>
        </button>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

