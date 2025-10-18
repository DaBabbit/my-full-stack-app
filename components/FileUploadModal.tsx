'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, FolderOpen, AlertCircle, Loader2, ExternalLink } from 'lucide-react';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoName: string;
  fileDropUrl?: string;
  storageLocation?: string;
}

export function FileUploadModal({
  isOpen,
  onClose,
  videoName,
  fileDropUrl,
  storageLocation
}: FileUploadModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [iframeError, setIframeError] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Detect mobile devices
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setIframeError(false);
    }
  }, [isOpen]);

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

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setIframeError(true);
  };

  const openInNewWindow = () => {
    if (fileDropUrl) {
      window.open(fileDropUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const openStorageLocation = () => {
    if (storageLocation) {
      window.open(storageLocation, '_blank', 'noopener,noreferrer');
    }
  };

  // Error state: No file drop URL
  if (isOpen && !fileDropUrl) {
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
                <AlertCircle className="w-8 h-8 text-yellow-400" />
              </div>
              
              <h3 className="text-xl font-semibold text-white mb-2">
                Upload noch nicht bereit
              </h3>
              
              <p className="text-neutral-400 mb-6">
                Der Upload-Ordner für <span className="text-white font-medium">&quot;{videoName}&quot;</span> wird gerade erstellt. 
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
      {isOpen && fileDropUrl && (
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
            className="relative bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl max-w-4xl w-full mx-4 overflow-hidden"
            style={{ maxHeight: '90vh' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-neutral-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                  <Upload className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Dateien hochladen
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

            {/* Action Buttons */}
            <div className="flex items-center gap-2 px-6 py-3 bg-neutral-800/50 border-b border-neutral-700">
              {storageLocation && (
                <button
                  onClick={openStorageLocation}
                  className="flex items-center gap-2 px-3 py-2 bg-neutral-700/50 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-lg transition-all"
                >
                  <FolderOpen className="w-4 h-4" />
                  <span className="text-sm">Ordner durchsuchen</span>
                </button>
              )}

              {(isMobile || iframeError) && (
                <button
                  onClick={openInNewWindow}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span className="text-sm">In neuem Fenster öffnen</span>
                </button>
              )}
            </div>

            {/* Content */}
            <div className="relative" style={{ height: 'calc(90vh - 180px)', minHeight: '400px' }}>
              {/* Loading State */}
              {isLoading && !iframeError && (
                <div className="absolute inset-0 flex items-center justify-center bg-neutral-900">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-3" />
                    <p className="text-neutral-400">Lade Upload-Bereich...</p>
                  </div>
                </div>
              )}

              {/* Error State */}
              {iframeError && (
                <div className="absolute inset-0 flex items-center justify-center bg-neutral-900">
                  <div className="text-center max-w-md px-4">
                    <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">
                      Upload konnte nicht geladen werden
                    </h3>
                    <p className="text-neutral-400 mb-6">
                      Der Upload-Bereich kann nicht angezeigt werden. 
                      Bitte öffne den Upload in einem neuen Fenster.
                    </p>
                    <button
                      onClick={openInNewWindow}
                      className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors mx-auto"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>In neuem Fenster öffnen</span>
                    </button>
                  </div>
                </div>
              )}

              {/* iFrame - Desktop only */}
              {!isMobile && (
                <iframe
                  src={fileDropUrl}
                  className={`w-full h-full border-0 ${isLoading || iframeError ? 'invisible' : 'visible'}`}
                  title="Nextcloud File Upload"
                  onLoad={handleIframeLoad}
                  onError={handleIframeError}
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                />
              )}

              {/* Mobile: Direct Link */}
              {isMobile && (
                <div className="flex items-center justify-center h-full bg-neutral-900">
                  <div className="text-center px-4">
                    <Upload className="w-16 h-16 text-blue-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">
                      Mobiler Upload
                    </h3>
                    <p className="text-neutral-400 mb-6">
                      Auf mobilen Geräten öffnen wir den Upload in einem neuen Fenster 
                      für eine bessere Erfahrung.
                    </p>
                    <button
                      onClick={openInNewWindow}
                      className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors mx-auto"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Upload öffnen</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-neutral-800/50 border-t border-neutral-700">
              <p className="text-xs text-neutral-500 text-center">
                💡 Tipp: Du kannst Dateien per Drag & Drop hochladen oder über den Button auswählen. 
                Nach dem Upload sind die Dateien im Ordner verfügbar.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

