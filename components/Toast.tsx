'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, X, AlertCircle } from 'lucide-react';

export interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'warning';
  title: string;
  message?: string;
  duration?: number;
  onClose: (id: string) => void;
  onClick?: () => void;
  actionLabel?: string;
}

/**
 * Toast Notification Komponente
 * 
 * Features:
 * - Success, Error und Warning States
 * - Auto-dismiss nach 3 Sekunden (konfigurierbar)
 * - Optional Click-Handler (z.B. für "Aktualisieren" Action)
 * - Framer Motion Animations
 * - Position: Top-right
 * - Mobile-optimiert
 */
export function Toast({ id, type, title, message, duration = 3000, onClose, onClick, actionLabel }: ToastProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Auto-Dismiss Timer
  useEffect(() => {
    if (duration > 0 && !isHovered) {
      const timer = setTimeout(() => {
        onClose(id);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose, isHovered]);

  const icon = type === 'success' ? (
    <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-green-400 flex-shrink-0" />
  ) : type === 'error' ? (
    <XCircle className="w-4 h-4 md:w-5 md:h-5 text-red-400 flex-shrink-0" />
  ) : (
    <AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-yellow-400 flex-shrink-0" />
  );

  const bgColor = type === 'success'
    ? 'bg-green-500/10 border-green-500/20'
    : type === 'error'
    ? 'bg-red-500/10 border-red-500/20'
    : 'bg-yellow-500/10 border-yellow-500/20';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 300, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ 
        opacity: 0, 
        x: 300,
        scale: 0.8,
        transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
      }}
      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
      className={`${bgColor} border backdrop-blur-md rounded-lg md:rounded-xl p-3 md:p-4 shadow-lg w-full ${onClick ? 'cursor-pointer hover:shadow-xl transition-shadow' : ''}`}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-start gap-2 md:gap-3">
        {icon}
        <div className="flex-1 min-w-0">
          <h4 className="text-white font-medium text-xs md:text-sm">{title}</h4>
          {message && (
            <p className="text-neutral-400 text-xs md:text-sm mt-0.5 md:mt-1 line-clamp-2">{message}</p>
          )}
          {onClick && actionLabel && (
            <button className="text-yellow-400 hover:text-yellow-300 text-xs md:text-sm font-medium mt-1 md:mt-2 inline-block">
              {actionLabel}
            </button>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose(id);
          }}
          className="text-neutral-400 hover:text-white transition-colors flex-shrink-0"
          aria-label="Close"
        >
          <X className="w-3 h-3 md:w-4 md:h-4" />
        </button>
      </div>
    </motion.div>
  );
}

/**
 * Toast Container für Position und Stacking
 * Mobile-optimiert mit kleinerer Größe und besserem Stacking
 */
export function ToastContainer({ toasts, onClose }: { 
  toasts: ToastProps[]; 
  onClose: (id: string) => void;
}) {
  return (
    <div className="fixed top-2 right-2 md:top-4 md:right-4 z-[9999] flex flex-col gap-2 pointer-events-none w-[calc(100vw-1rem)] md:w-auto max-w-[400px]">
      <AnimatePresence mode="popLayout" initial={false}>
        {toasts.map((toast) => (
          <motion.div 
            key={toast.id} 
            className="pointer-events-auto"
            layout
          >
            <Toast {...toast} onClose={onClose} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

