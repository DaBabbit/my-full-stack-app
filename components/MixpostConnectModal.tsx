'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface Props {
  platform: string;
  platformName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function MixpostConnectModal({ 
  platformName,
  isOpen, 
  onClose,
  onSuccess 
}: Props) {
  const [status, setStatus] = useState<'idle' | 'opening' | 'connecting' | 'syncing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const popupRef = useRef<Window | null>(null);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isOpen) {
      // Cleanup on close
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close();
      }
      setStatus('idle');
      setErrorMessage(null);
    }
  }, [isOpen]);

  const handleOpenMixpost = () => {
    setStatus('opening');
    setErrorMessage(null);

    // Öffne Mixpost Dashboard - dort kann User Accounts verwalten
    // Wenn nicht eingeloggt, sieht User Login-Screen
    // Nach Login bleibt Session und User kann Accounts hinzufügen
    const mixpostUrl = `https://mixpost.davidkosma.de/mixpost`;
    
    // Öffne Mixpost in Popup
    const popup = window.open(
      mixpostUrl,
      'MixpostConnect',
      'width=1200,height=900,left=100,top=50,toolbar=no,menubar=no,location=no,status=no'
    );

    if (!popup) {
      setStatus('error');
      setErrorMessage('Popup wurde blockiert. Bitte erlaube Popups für diese Seite.');
      return;
    }

    popupRef.current = popup;
    setStatus('connecting');

    // Überwache Popup
    checkIntervalRef.current = setInterval(async () => {
      if (popup.closed) {
        // Popup wurde geschlossen
        clearInterval(checkIntervalRef.current!);
        setStatus('syncing');

        // Synchronisiere Accounts von Mixpost
        try {
          const result = await syncAccounts();
          
          // Auch wenn keine neuen Accounts gefunden wurden, ist das OK
          if (result.synced === 0 && result.total === 0) {
            setStatus('error');
            setErrorMessage('Keine neuen Accounts gefunden. Stelle sicher, dass du einen Account in Mixpost verbunden hast.');
          } else {
            setStatus('success');
            
            // Auto-close nach 2 Sekunden
            setTimeout(() => {
              onSuccess();
              onClose();
            }, 2000);
          }
        } catch (error) {
          console.error('Sync error:', error);
          setStatus('error');
          setErrorMessage('Fehler beim Synchronisieren. Stelle sicher, dass du einen Account in Mixpost verbunden hast, dann versuche es erneut.');
        }
      }
    }, 500);

    // Auto-Timeout nach 10 Minuten
    setTimeout(() => {
      if (popup && !popup.closed) {
        popup.close();
        if (checkIntervalRef.current) {
          clearInterval(checkIntervalRef.current);
        }
        setStatus('error');
        setErrorMessage('Zeitüberschreitung. Bitte versuche es erneut.');
      }
    }, 10 * 60 * 1000);
  };

  const syncAccounts = async () => {
    // Get Supabase session for Bearer token
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('Keine Session gefunden');
    }

    const response = await fetch('/api/social-media/sync', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    });

    if (!response.ok) {
      throw new Error('Sync failed');
    }

    return response.json();
  };

  const handleClose = () => {
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.close();
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
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            onClick={handleClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div 
              className="bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-neutral-800"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
                <h2 className="text-xl font-semibold text-white">
                  {platformName} verbinden
                </h2>
                <button
                  onClick={handleClose}
                  className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Content */}
              <div className="p-6">
                {/* Idle State */}
                {status === 'idle' && (
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto">
                      <ExternalLink className="w-8 h-8 text-blue-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">
                        Bereit zum Verbinden
                      </h3>
                      <p className="text-neutral-400 text-sm">
                        Wir öffnen ein neues Fenster, in dem du deinen {platformName}-Account verbinden kannst.
                      </p>
                    </div>
                    <button
                      onClick={handleOpenMixpost}
                      className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
                    >
                      {platformName} verbinden
                    </button>
                    <p className="text-xs text-neutral-500">
                      Nach der Verbindung schließt sich das Fenster automatisch.
                    </p>
                  </div>
                )}

                {/* Opening State */}
                {status === 'opening' && (
                  <div className="text-center space-y-4">
                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto" />
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">
                        Fenster wird geöffnet...
                      </h3>
                      <p className="text-neutral-400 text-sm">
                        Bitte warte einen Moment.
                      </p>
                    </div>
                  </div>
                )}

                {/* Connecting State */}
                {status === 'connecting' && (
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto">
                      <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">
                        Account verbinden
                      </h3>
                      <p className="text-neutral-400 text-sm mb-4">
                        Bitte verbinde deinen {platformName}-Account im geöffneten Fenster.
                      </p>
                      <div className="bg-neutral-800/50 rounded-lg p-4 text-left space-y-2">
                        <p className="text-sm text-neutral-300 font-medium">Im Mixpost Dashboard:</p>
                        <ol className="text-sm text-neutral-400 space-y-1 list-decimal list-inside">
                          <li>Klicke links auf &quot;Accounts&quot;</li>
                          <li>Klicke oben rechts &quot;Add Account&quot;</li>
                          <li>Wähle &quot;{platformName}&quot; aus der Liste</li>
                          <li>Klicke &quot;Connect&quot; → Autorisiere bei {platformName}</li>
                          <li>Nach Success: Schließe das Fenster</li>
                        </ol>
                      </div>
                    </div>
                    <button
                      onClick={handleClose}
                      className="w-full px-6 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition text-sm"
                    >
                      Abbrechen
                    </button>
                  </div>
                )}

                {/* Syncing State */}
                {status === 'syncing' && (
                  <div className="text-center space-y-4">
                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto" />
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">
                        Accounts werden synchronisiert...
                      </h3>
                      <p className="text-neutral-400 text-sm">
                        Bitte warte einen Moment.
                      </p>
                    </div>
                  </div>
                )}

                {/* Success State */}
                {status === 'success' && (
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">
                        Erfolgreich verbunden!
                      </h3>
                      <p className="text-neutral-400 text-sm">
                        Dein {platformName}-Account wurde erfolgreich verbunden.
                      </p>
                    </div>
                  </div>
                )}

                {/* Error State */}
                {status === 'error' && (
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
                      <AlertCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">
                        Fehler beim Verbinden
                      </h3>
                      <p className="text-neutral-400 text-sm">
                        {errorMessage || 'Ein unerwarteter Fehler ist aufgetreten.'}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={handleClose}
                        className="flex-1 px-6 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition"
                      >
                        Schließen
                      </button>
                      <button
                        onClick={() => {
                          setStatus('idle');
                          setErrorMessage(null);
                        }}
                        className="flex-1 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                      >
                        Erneut versuchen
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

