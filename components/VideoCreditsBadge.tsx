'use client';

import { useState, useRef, useEffect } from 'react';
import { Film, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

interface VideoCreditsBadgeProps {
  currentCredits: number;
  monthlyLimit: number;
  billingStart?: string;
  billingEnd?: string;
  isLoading?: boolean;
}

export function VideoCreditsBadge({ 
  currentCredits, 
  monthlyLimit, 
  billingStart,
  billingEnd,
  isLoading = false 
}: VideoCreditsBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const badgeRef = useRef<HTMLDivElement>(null);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (showInfoModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [showInfoModal]);

  // Berechne verbleibende Tage
  const getRemainingDays = () => {
    if (!billingEnd) return 0;
    const end = new Date(billingEnd);
    const today = new Date();
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  // Formatiere Datum für Anzeige
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-DE', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  const remainingDays = getRemainingDays();

  const handleMouseEnter = () => {
    tooltipTimeoutRef.current = setTimeout(() => {
      setShowTooltip(true);
    }, 300);
  };

  const handleMouseLeave = () => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }
    setShowTooltip(false);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-800/50 border border-neutral-700 backdrop-blur-md">
        <div className="w-4 h-4 border-2 border-neutral-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-neutral-400 hidden md:inline">Lädt...</span>
      </div>
    );
  }

  return (
    <>
      <motion.div
        ref={badgeRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="relative flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-800/50 border border-neutral-700 backdrop-blur-md transition-all duration-300 hover:bg-neutral-800 hover:border-neutral-600"
      >
        {/* Icon */}
        <Film className="w-4 h-4 text-neutral-300" />
        
        {/* Text - Desktop: volle Beschreibung, Mobil: nur Zahlen */}
        <div className="flex items-center gap-1">
          <span className="hidden lg:inline text-xs font-medium text-white">Videocredits:</span>
          <span className="text-xs font-bold text-white">
            {currentCredits} / {monthlyLimit}
          </span>
        </div>

        {/* Info Icon */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowInfoModal(true);
          }}
          className="ml-1 p-0.5 hover:bg-neutral-700 rounded-full transition-colors"
        >
          <Info className="w-3.5 h-3.5 text-neutral-400 hover:text-white" />
        </button>
      </motion.div>

      {/* Hover Tooltip */}
      {mounted && showTooltip && badgeRef.current && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              top: `${badgeRef.current.getBoundingClientRect().bottom + 8}px`,
              left: `${badgeRef.current.getBoundingClientRect().left}px`,
              zIndex: 10001
            }}
            className="bg-neutral-900/95 backdrop-blur-md border border-neutral-700 rounded-lg shadow-2xl p-4 w-[280px]"
          >
            <h4 className="text-sm font-semibold text-white mb-2">Video-Guthaben</h4>
            <div className="space-y-1.5 text-xs text-neutral-300">
              <p>
                <span className="font-medium text-white">{currentCredits}</span> von{' '}
                <span className="font-medium text-white">{monthlyLimit}</span> Credits verfügbar
              </p>
              <p className="text-neutral-400">
                Abrechnungszeitraum: {formatDate(billingStart)} – {formatDate(billingEnd)}
              </p>
              <p className="text-neutral-400">
                Reset in: <span className="font-medium text-white">{remainingDays}</span> Tagen
              </p>
            </div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}

      {/* Info Modal */}
      {mounted && showInfoModal && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4"
            onClick={() => setShowInfoModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-neutral-900/95 backdrop-blur-md border border-neutral-700 rounded-2xl shadow-2xl max-w-md w-full p-6"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Film className="w-5 h-5 text-neutral-300" />
                  Videocredits-Info
                </h3>
                <button
                  onClick={() => setShowInfoModal(false)}
                  className="text-neutral-400 hover:text-white transition-colors p-1 hover:bg-neutral-800 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="space-y-4 text-sm text-neutral-300">
                <p className="leading-relaxed">
                  Videocredits erklären dein monatliches Guthaben an Videos, die im Rahmen deines Abos produziert werden.
                </p>

                <ul className="space-y-2 list-none">
                  <li className="flex items-start gap-2">
                    <span className="text-neutral-500 mt-0.5">•</span>
                    <span>
                      <span className="font-medium text-white">Monatliches Kontingent:</span>{' '}
                      {monthlyLimit} Videos
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-neutral-500 mt-0.5">•</span>
                    <span>
                      Nicht genutzte Credits verfallen am Ende des Abrechnungszeitraums
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-neutral-500 mt-0.5">•</span>
                    <span>
                      Neue Credits werden automatisch zum Monatsbeginn gutgeschrieben
                    </span>
                  </li>
                </ul>

                <div className="pt-4 border-t border-neutral-700 space-y-2">
                  <p className="text-neutral-400">
                    <span className="font-medium text-white">Letzter Reset:</span>{' '}
                    {formatDate(billingStart)}
                  </p>
                  <p className="text-neutral-400">
                    <span className="font-medium text-white">Nächster Reset:</span>{' '}
                    {formatDate(billingEnd)} ({remainingDays} Tage)
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-6">
                <button
                  onClick={() => setShowInfoModal(false)}
                  className="w-full px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg font-medium transition-colors"
                >
                  Verstanden
                </button>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

