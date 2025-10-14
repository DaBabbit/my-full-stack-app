'use client';

import { useEffect } from 'react';
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
 */
export function Toast({ id, type, title, message, duration = 3000, onClose, onClick, actionLabel }: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  const icon = type === 'success' ? (
    <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
  ) : type === 'error' ? (
    <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
  ) : (
    <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
  );

  const bgColor = type === 'success'
    ? 'bg-green-500/10 border-green-500/20'
    : type === 'error'
    ? 'bg-red-500/10 border-red-500/20'
    : 'bg-yellow-500/10 border-yellow-500/20';

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`${bgColor} border backdrop-blur-md rounded-xl p-4 shadow-lg max-w-md w-full ${onClick ? 'cursor-pointer hover:shadow-xl transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {icon}
        <div className="flex-1 min-w-0">
          <h4 className="text-white font-medium text-sm">{title}</h4>
          {message && (
            <p className="text-neutral-400 text-sm mt-1">{message}</p>
          )}
          {onClick && actionLabel && (
            <button className="text-yellow-400 hover:text-yellow-300 text-sm font-medium mt-2 inline-block">
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
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

/**
 * Toast Container für Position und Stacking
 */
export function ToastContainer({ toasts, onClose }: { 
  toasts: ToastProps[]; 
  onClose: (id: string) => void;
}) {
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast {...toast} onClose={onClose} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

