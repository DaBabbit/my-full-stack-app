'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FolderOpen, Upload, Zap } from 'lucide-react';
import { NextcloudUploader } from './NextcloudUploader';
import { supabase } from '@/utils/supabase';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoId: string;
  videoName: string;
  storageLocation?: string;
  nextcloudPath?: string;
  onUploadSuccess?: (fileNames: string[]) => void;
  onUploadError?: (errorMessage: string) => void;
}

export function FileUploadModal({
  isOpen,
  onClose,
  videoId,
  videoName,
  storageLocation,
  nextcloudPath,
  onUploadSuccess,
  onUploadError
}: FileUploadModalProps) {
  const [showAutomationPrompt, setShowAutomationPrompt] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [isTriggering, setIsTriggering] = useState(false);

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

  const openInNewWindow = () => {
    if (storageLocation) {
      window.open(storageLocation, '_blank', 'noopener,noreferrer');
    }
  };

  // Handler für erfolgreichen Upload - zeigt Automatisierungs-Prompt
  const handleUploadSuccess = (fileNames: string[]) => {
    setUploadedFiles(fileNames);
    setShowAutomationPrompt(true);
    if (onUploadSuccess) {
      onUploadSuccess(fileNames);
    }
  };

  // Trigger Automatisierung: Status auf "In Bearbeitung" + kosmamedia als Zuständig
  const triggerAutomation = async () => {
    setIsTriggering(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('Nicht authentifiziert');
      }

      const response = await fetch('/api/automation/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          videoId,
          allFilesUploaded: true
        })
      });

      if (!response.ok) {
        throw new Error('Automatisierung fehlgeschlagen');
      }

      console.log('[FileUploadModal] ✅ Automatisierung erfolgreich getriggert');
      
      // Schließe Modal nach erfolgreichem Trigger
      setShowAutomationPrompt(false);
      onClose();
    } catch (error) {
      console.error('[FileUploadModal] ❌ Automatisierung fehlgeschlagen:', error);
    } finally {
      setIsTriggering(false);
    }
  };

  // Handler für "Nein" - schließe Prompt, aber lasse Modal offen
  const dismissAutomationPrompt = () => {
    setShowAutomationPrompt(false);
  };

  // Error state: No nextcloud path or storage location
  if (isOpen && (!nextcloudPath || !storageLocation)) {
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
                className="flex items-center gap-2 px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg transition-colors"
              >
                <FolderOpen className="w-4 h-4" />
                <span className="text-sm">Ordner durchsuchen</span>
              </button>
            </div>

            {/* Upload Content */}
            <div className="px-6 py-6" style={{ maxHeight: 'calc(95vh - 280px)', overflowY: 'auto' }}>
              <NextcloudUploader
                videoId={videoId}
                videoName={videoName}
                nextcloudPath={nextcloudPath}
                onUploadSuccess={handleUploadSuccess}
                onUploadError={onUploadError}
              />
            </div>

            {/* Automatisierungs-Prompt nach Upload */}
            <AnimatePresence>
              {showAutomationPrompt && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
                >
                  <div className="bg-gradient-to-br from-purple-900/90 to-blue-900/90 border-2 border-purple-500/50 rounded-2xl p-8 max-w-lg w-full shadow-2xl">
                    {/* Blitz-Icon */}
                    <div className="w-16 h-16 bg-yellow-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Zap className="w-8 h-8 text-yellow-400" fill="currentColor" />
                    </div>

                    <h3 className="text-2xl font-bold text-white text-center mb-3">
                      Automatisierung
                    </h3>

                    <p className="text-lg text-neutral-200 text-center mb-6">
                      Waren das alle Dateien, die für die Bearbeitung nötig sind?
                    </p>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={dismissAutomationPrompt}
                        disabled={isTriggering}
                        className="flex-1 px-6 py-3 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Nein
                      </button>
                      
                      <button
                        onClick={triggerAutomation}
                        disabled={isTriggering}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-all font-medium shadow-lg hover:shadow-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isTriggering ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Wird verarbeitet...</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-4 h-4" fill="currentColor" />
                            <span>Ja, Bearbeitung starten</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <p className="text-xs text-blue-200 text-center">
                        ⚡ Status wird auf <span className="font-semibold">&quot;In Bearbeitung&quot;</span> gesetzt und kosmamedia wird automatisch als zuständige Person zugewiesen.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

