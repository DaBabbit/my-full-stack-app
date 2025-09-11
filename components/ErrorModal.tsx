'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, ExternalLink } from 'lucide-react';

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  details?: string;
  actionText?: string;
  actionUrl?: string;
}

export default function ErrorModal({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  details, 
  actionText,
  actionUrl 
}: ErrorModalProps) {
  const handleAction = () => {
    if (actionUrl) {
      window.open(actionUrl, '_blank');
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9998] touch-action-none"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ 
              type: "spring", 
              damping: 25, 
              stiffness: 300,
              duration: 0.3 
            }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 touch-action-none overscroll-y-contain touch-action-pan-y"
          >
            <div className="bg-neutral-900/95 backdrop-blur-md rounded-3xl border border-red-500/30 w-full max-w-md shadow-[0_0_50px_rgba(239,68,68,0.3)]">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-red-500/20">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-red-500/20 rounded-xl">
                    <AlertTriangle className="w-6 h-6 text-red-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">{title}</h2>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="bg-red-900/20 border border-red-500/30 rounded-2xl p-4 mb-6">
                  <p className="text-red-200 text-sm leading-relaxed mb-2">
                    {message}
                  </p>
                  {details && (
                    <details className="mt-3">
                      <summary className="text-red-300 text-xs cursor-pointer hover:text-red-200">
                        Technische Details anzeigen
                      </summary>
                      <pre className="text-red-400 text-xs mt-2 p-2 bg-red-950/30 rounded border border-red-500/20 overflow-x-auto">
                        {details}
                      </pre>
                    </details>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  {actionText && actionUrl && (
                    <button
                      onClick={handleAction}
                      className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-medium transition-all duration-300 flex items-center justify-center space-x-2 hover:shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>{actionText}</span>
                    </button>
                  )}
                  
                  <button
                    onClick={onClose}
                    className="px-6 py-3 bg-neutral-700 hover:bg-neutral-600 text-white rounded-xl font-medium transition-colors"
                  >
                    Verstanden
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
