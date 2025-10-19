'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, FolderOpen, ExternalLink, FileUp } from 'lucide-react';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoName: string;
  storageLocation?: string;
}

export function FileUploadModal({
  isOpen,
  onClose,
  videoName,
  storageLocation
}: FileUploadModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Close on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Reset loading state when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setIsDragging(false);
    }
  }, [isOpen]);

  // Drag & Drop Detection
  useEffect(() => {
    if (!isOpen) return;

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      // Only set to false if leaving the window entirely
      if (e.clientX === 0 && e.clientY === 0) {
        setIsDragging(false);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
    };

    document.addEventListener('dragenter', handleDragEnter);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('drop', handleDrop);

    return () => {
      document.removeEventListener('dragenter', handleDragEnter);
      document.removeEventListener('dragleave', handleDragLeave);
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('drop', handleDrop);
    };
  }, [isOpen]);

  const openInNewWindow = () => {
    if (storageLocation) {
      window.open(storageLocation, '_blank', 'noopener,noreferrer');
    }
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  // Error state: No storage location
  if (isOpen && !storageLocation) {
    return (
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Error Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white transition-colors"
              aria-label="Schließen"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mb-4">
                <FolderOpen className="w-8 h-8 text-yellow-400" />
              </div>
              
              <h3 className="text-xl font-semibold text-white mb-2">
                Ordner noch nicht bereit
              </h3>
              
              <p className="text-neutral-400 mb-6">
                Der Video-Ordner für <span className="text-white font-medium">&quot;{videoName}&quot;</span> wird gerade erstellt. 
                Bitte versuche es in wenigen Sekunden erneut.
              </p>

              <button
                onClick={onClose}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Verstanden
              </button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && storageLocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Upload Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl max-w-6xl w-full mx-4 overflow-hidden"
            style={{ maxHeight: '95vh' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-neutral-700 bg-gradient-to-r from-neutral-900 to-neutral-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                  <FolderOpen className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Video-Dateien verwalten
                  </h2>
                  <p className="text-sm text-neutral-400">
                    {videoName}
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="text-neutral-400 hover:text-white transition-colors"
                aria-label="Schließen"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Instructions Bar */}
            <div className="px-6 py-4 bg-blue-500/5 border-b border-blue-500/20">
              <div className="flex items-start gap-3">
                <Upload className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-neutral-300 font-medium mb-1">
                    📁 Alle Dateien für dieses Video hier ablegen
                  </p>
                  <p className="text-xs text-neutral-400">
                    Rohmaterial, Schnitt-Projekte, fertige Videos, Thumbnails - einfach per Drag & Drop ins Fenster ziehen oder direkt im Ordner hochladen.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 px-6 py-3 bg-neutral-800/50 border-b border-neutral-700">
              <button
                onClick={openInNewWindow}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
              >
                <ExternalLink className="w-4 h-4" />
                <span className="text-sm">In neuem Fenster öffnen</span>
              </button>
            </div>

            {/* iFrame Container with Drag & Drop Overlay */}
            <div className="relative" style={{ height: 'calc(95vh - 280px)', minHeight: '500px' }}>
              {/* Loading Spinner */}
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 z-10">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-neutral-400 text-sm">Ordner wird geladen...</p>
                  </div>
                </div>
              )}

              {/* Nextcloud iFrame */}
              <iframe
                src={storageLocation}
                className="w-full h-full bg-neutral-900"
                onLoad={handleIframeLoad}
                title={`Nextcloud Ordner für ${videoName}`}
                sandbox="allow-same-origin allow-scripts allow-forms allow-downloads allow-popups"
              />

              {/* Drag & Drop Overlay */}
              <AnimatePresence>
                {isDragging && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-blue-500/10 backdrop-blur-sm border-4 border-dashed border-blue-400 rounded-lg flex items-center justify-center z-20 pointer-events-none"
                  >
                    <div className="text-center">
                      <motion.div
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        transition={{ repeat: Infinity, duration: 0.8, repeatType: 'reverse' }}
                        className="w-24 h-24 bg-blue-500/20 rounded-full flex items-center justify-center mb-4 mx-auto"
                      >
                        <FileUp className="w-12 h-12 text-blue-400" />
                      </motion.div>
                      <p className="text-2xl font-bold text-white mb-2">
                        Dateien hier ablegen
                      </p>
                      <p className="text-blue-300 text-sm">
                        Alle Dateien werden in deinem Video-Ordner gespeichert
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-neutral-800/50 border-t border-neutral-700">
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs text-neutral-500">
                  💡 <span className="text-neutral-400 font-medium">Tipp:</span> Ziehe Dateien direkt ins Fenster oder nutze den Upload-Button in Nextcloud
                </p>
                <div className="flex items-center gap-2 text-xs text-neutral-500">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Verbunden mit Nextcloud
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

