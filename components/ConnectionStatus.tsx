'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import { motion, AnimatePresence } from 'framer-motion';

export function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(true);
  const [showWarning, setShowWarning] = useState(false);

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
      try {
        // Check if session exists
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('[ConnectionStatus] ❌ Session error:', sessionError);
          setIsSupabaseConnected(false);
          setShowWarning(true);
          return;
        }

        if (!session) {
          console.warn('[ConnectionStatus] ⚠️ No session found');
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
          console.error('[ConnectionStatus] ❌ DB connection error:', dbError);
          setIsSupabaseConnected(false);
          setShowWarning(true);
        } else {
          console.log('[ConnectionStatus] ✅ Supabase connection OK');
          setIsSupabaseConnected(true);
          setShowWarning(false);
        }
      } catch (err) {
        console.error('[ConnectionStatus] ❌ Connection check failed:', err);
        setIsSupabaseConnected(false);
        setShowWarning(true);
      }
    };

    // Check connection every 10 seconds
    const interval = setInterval(checkSupabaseConnection, 10000);
    
    // Initial check
    checkSupabaseConnection();

    // Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      console.log('[ConnectionStatus] Auth state changed:', event);
      
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        checkSupabaseConnection();
      }
      
      if (event === 'TOKEN_REFRESHED') {
        console.log('[ConnectionStatus] 🔄 Token refreshed successfully');
        setIsSupabaseConnected(true);
        setShowWarning(false);
      }
    });

    // Check on tab visibility change
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('[ConnectionStatus] 👁️ Tab visible - checking connection...');
        checkSupabaseConnection();
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
    console.log('[ConnectionStatus] 🔄 Manual reconnect triggered');
    
    // Try to refresh the session
    const { error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error('[ConnectionStatus] ❌ Session refresh failed:', error);
      // Redirect to login if refresh fails
      window.location.href = '/login';
    } else {
      console.log('[ConnectionStatus] ✅ Session refreshed successfully');
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

