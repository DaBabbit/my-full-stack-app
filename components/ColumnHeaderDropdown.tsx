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
}

export function ColumnHeaderDropdown({
  isOpen,
  onClose,
  triggerRef,
  onSort,
  onFilter,
  onHide,
  canFilter = true,
}: ColumnHeaderDropdownProps) {
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [showSortSubmenu, setShowSortSubmenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Berechne Position basierend auf Trigger-Element
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: rect.left
      });
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
        {/* Sortieren mit Submenu */}
        <div
          className="relative"
          onMouseEnter={() => setShowSortSubmenu(true)}
          onMouseLeave={() => setShowSortSubmenu(false)}
        >
          <button
            onClick={() => setShowSortSubmenu(!showSortSubmenu)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-white hover:bg-neutral-700 transition-colors"
          >
            <div className="flex items-center gap-2">
              <ArrowUp className="w-4 h-4" />
              <span>Sortieren</span>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-400" />
          </button>

          {/* Sortieren Submenu */}
          {showSortSubmenu && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.1 }}
              className="absolute left-full top-0 ml-1 bg-neutral-800/95 backdrop-blur-md border border-neutral-700 rounded-lg shadow-2xl overflow-hidden w-[180px] z-[10000]"
              onMouseEnter={() => setShowSortSubmenu(true)}
              onMouseLeave={() => setShowSortSubmenu(false)}
            >
              <button
                onClick={() => {
                  onSort('asc');
                  onClose();
                }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-white hover:bg-neutral-700 transition-colors"
              >
                <ArrowUp className="w-4 h-4" />
                <span>Aufsteigend</span>
              </button>
              <button
                onClick={() => {
                  onSort('desc');
                  onClose();
                }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-white hover:bg-neutral-700 transition-colors"
              >
                <ArrowDown className="w-4 h-4" />
                <span>Absteigend</span>
              </button>
            </motion.div>
          )}
        </div>

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

