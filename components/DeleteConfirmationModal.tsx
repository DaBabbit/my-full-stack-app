'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  itemName?: string;
}

export default function DeleteConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message,
  itemName 
}: DeleteConfirmationModalProps) {
  // Body scroll lock - Verbesserte Version
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = `-${scrollY}px`;
      
      return () => {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.top = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  const handleConfirm = () => {
    onConfirm();
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
                    {itemName && (
                      <p className="text-sm text-neutral-400 mt-1">&quot;{itemName}&quot;</p>
                    )}
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
                  <div className="flex items-start space-x-3">
                    <Trash2 className="w-5 h-5 mt-0.5 text-red-400 flex-shrink-0" />
                    <div>
                      <p className="text-red-200 text-sm leading-relaxed">
                        {message}
                      </p>
                      <p className="text-red-300 text-xs mt-2 font-medium">
                        ⚠️ Diese Aktion kann nicht rückgängig gemacht werden.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleConfirm}
                    className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-medium transition-all duration-300 flex items-center justify-center space-x-2 hover:shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                  >
                    <Trash2 className="w-5 h-5" />
                    <span>Löschen</span>
                  </button>
                  
                  <button
                    onClick={onClose}
                    className="px-6 py-3 bg-neutral-700 hover:bg-neutral-600 text-white rounded-xl font-medium transition-colors"
                  >
                    Abbrechen
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
