'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, X } from 'lucide-react';

export interface ToastProps {
  id: string;
  type: 'success' | 'error';
  title: string;
  message?: string;
  duration?: number;
  onClose: (id: string) => void;
}

/**
 * Toast Notification Komponente
 * 
 * Features:
 * - Success und Error States
 * - Auto-dismiss nach 3 Sekunden (konfigurierbar)
 * - Framer Motion Animations
 * - Position: Top-right
 */
export function Toast({ id, type, title, message, duration = 3000, onClose }: ToastProps) {
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
  ) : (
    <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
  );

  const bgColor = type === 'success'
    ? 'bg-green-500/10 border-green-500/20'
    : 'bg-red-500/10 border-red-500/20';

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`${bgColor} border backdrop-blur-md rounded-xl p-4 shadow-lg max-w-md w-full`}
    >
      <div className="flex items-start gap-3">
        {icon}
        <div className="flex-1 min-w-0">
          <h4 className="text-white font-medium text-sm">{title}</h4>
          {message && (
            <p className="text-neutral-400 text-sm mt-1">{message}</p>
          )}
        </div>
        <button
          onClick={() => onClose(id)}
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

