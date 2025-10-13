'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff } from 'lucide-react';

export function ConnectionStatus() {
  const pathname = usePathname();
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

  // ✅ Nur in Dashboard, Videos und Workspace-Seiten anzeigen
  const allowedPages = ['/dashboard', '/dashboard/videos', '/dashboard/workspace'];
  const isAllowedPage = allowedPages.some(page => pathname?.startsWith(page));
  
  const shouldShow = isAllowedPage && (!isOnline || !isSupabaseConnected || showWarning);

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ y: -20, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -20, opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          className="fixed top-20 right-4 z-[9999] max-w-md"
        >
          <div className="bg-gradient-to-br from-neutral-900/95 to-neutral-800/95 backdrop-blur-xl border border-red-500/30 rounded-2xl shadow-2xl p-4">
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className="flex-shrink-0 mt-0.5">
                <div className="relative">
                  <WifiOff className="w-6 h-6 text-red-400" />
                  <div className="absolute inset-0 w-6 h-6 animate-ping">
                    <WifiOff className="w-6 h-6 text-red-400 opacity-30" />
                  </div>
                </div>
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm mb-1">
                  Verbindungsfehler
                </p>
                <p className="text-neutral-300 text-xs leading-relaxed mb-3">
                  Bitte Seite neu laden
                </p>
                
                {/* Button */}
                <button
                  onClick={handleReconnect}
                  className="w-full px-3 py-2 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white rounded-lg font-medium text-xs transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  🔄 Seite neu laden
                </button>
              </div>
            </div>
            
            {/* Log info */}
            <div className="mt-3 pt-3 border-t border-neutral-700/50">
              <p className="text-neutral-500 text-[10px] leading-relaxed">
                {!isOnline 
                  ? 'Log: Browser offline - Keine Netzwerkverbindung' 
                  : 'Log: Supabase-Verbindung unterbrochen - Session/DB-Fehler'}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

