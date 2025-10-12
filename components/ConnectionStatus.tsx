'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/utils/supabase';
import { motion, AnimatePresence } from 'framer-motion';

export function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(true);
  const [showWarning, setShowWarning] = useState(false);
  
  // 🔥 REQUEST GUARD: Verhindert parallele checkSupabaseConnection Calls
  const isCheckingRef = useRef(false);
  const lastCheckTimeRef = useRef(0);

  useEffect(() => {
    // Browser Online/Offline Status
    const handleOnline = () => {
      console.log('[ConnectionStatus] 🟢 Browser is online');
      setIsOnline(true);
      checkSupabaseConnection();
    };
    
    const handleOffline = () => {
      console.log('[ConnectionStatus] 🔴 Browser is offline');
      setIsOnline(false);
      setShowWarning(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Supabase Connection Check
    const checkSupabaseConnection = async () => {
      // GUARD 1: Verhindere parallele Requests
      if (isCheckingRef.current) {
        console.log('[ConnectionStatus] ⏭️ Skipping connection check - already in progress');
        return;
      }

      // GUARD 2: Debounce - mindestens 5 Sekunden zwischen Checks
      const now = Date.now();
      const timeSinceLastCheck = now - lastCheckTimeRef.current;
      if (timeSinceLastCheck < 5000) {
        console.log(`[ConnectionStatus] ⏭️ Skipping connection check - too recent (${Math.floor(timeSinceLastCheck / 1000)}s ago)`);
        return;
      }

      isCheckingRef.current = true;
      lastCheckTimeRef.current = now;
      console.log('[ConnectionStatus] 🔍 Checking connection...');
      
      try {
        // Check if session exists
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('[ConnectionStatus] ❌ Connection LOST - Session error:', sessionError.message);
          setIsSupabaseConnected(false);
          setShowWarning(true);
          return;
        }

        if (!session) {
          console.warn('[ConnectionStatus] ❌ Connection LOST - No session');
          setIsSupabaseConnected(false);
          setShowWarning(true);
          return;
        }

        // Test DB connection with a simple query
        const { error: dbError } = await supabase
          .from('videos')
          .select('id')
          .limit(1);

        if (dbError) {
          console.error('[ConnectionStatus] ❌ Connection LOST - DB error:', dbError.message);
          setIsSupabaseConnected(false);
          setShowWarning(true);
        } else {
          console.log('[ConnectionStatus] ✅ Connection OK - Session valid, DB reachable');
          setIsSupabaseConnected(true);
          setShowWarning(false);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error('[ConnectionStatus] ❌ Connection check failed:', errorMsg);
        setIsSupabaseConnected(false);
        setShowWarning(true);
      } finally {
        isCheckingRef.current = false;
      }
    };

    // Check connection every 30 seconds (weniger aggressive für Chrome/Safari)
    const interval = setInterval(checkSupabaseConnection, 30000);
    
    // Initial check
    checkSupabaseConnection();

    // Listen to auth state changes - DEADLOCK-FIX mit setTimeout
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      console.log('[ConnectionStatus] Auth state changed:', event);
      
      // ⚡ KRITISCH: setTimeout(0) verhindert Deadlocks
      setTimeout(() => {
        if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
          checkSupabaseConnection();
        }
        
        if (event === 'TOKEN_REFRESHED') {
          console.log('[ConnectionStatus] 🔄 Token refreshed successfully');
          setIsSupabaseConnected(true);
          setShowWarning(false);
        }
      }, 0);
    });

    // Check on tab visibility change - MIT GUARD!
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        const now = Date.now();
        const timeSinceLastCheck = now - lastCheckTimeRef.current;
        
        // Nur checken wenn letzter Check > 5 Sekunden her
        if (timeSinceLastCheck >= 5000) {
          console.log('[ConnectionStatus] 👁️ Tab visible - checking connection...');
          checkSupabaseConnection();
        } else {
          console.log(`[ConnectionStatus] ⏭️ Tab visible but skipping check - too recent (${Math.floor(timeSinceLastCheck / 1000)}s ago)`);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
      subscription.unsubscribe();
    };
  }, []);

  const handleReconnect = async () => {
    console.log('[ConnectionStatus] 🔄 Reconnecting...');
    
    // Try to refresh the session
    const { error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error('[ConnectionStatus] ❌ Reconnect failed:', error.message);
      // Redirect to login if refresh fails
      window.location.href = '/login?reason=connection_lost';
    } else {
      console.log('[ConnectionStatus] ✅ Reconnected successfully');
      setIsSupabaseConnected(true);
      setShowWarning(false);
      // Reload the page to refetch all data
      window.location.reload();
    }
  };

  const shouldShow = !isOnline || !isSupabaseConnected || showWarning;

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-red-500/95 to-orange-500/95 backdrop-blur-md border-b border-red-400/20 shadow-2xl"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {/* Animated pulse icon */}
                <div className="relative">
                  <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                  <div className="absolute inset-0 w-3 h-3 bg-white rounded-full animate-ping"></div>
                </div>
                
                <div>
                  <p className="text-white font-semibold text-sm">
                    {!isOnline 
                      ? '⚠️ Keine Internetverbindung' 
                      : '⚠️ Verbindung zu Supabase unterbrochen'}
                  </p>
                  <p className="text-white/80 text-xs mt-0.5">
                    {!isOnline 
                      ? 'Bitte überprüfe deine Internetverbindung' 
                      : 'Änderungen können nicht gespeichert werden'}
                  </p>
                </div>
              </div>
              
              <button
                onClick={handleReconnect}
                className="px-4 py-2 bg-white text-red-600 rounded-lg font-medium text-sm hover:bg-red-50 transition-colors duration-200 shadow-lg"
              >
                🔄 Neu verbinden
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

