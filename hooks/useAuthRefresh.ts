'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '@/utils/supabase';

/**
 * Hook für automatisches Auth-Token-Refresh
 * Verhindert "Invalid Refresh Token" Fehler bei Inaktivität
 */
export function useAuthRefresh() {
  const refreshTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const lastRefreshRef = useRef<number>(Date.now());

  useEffect(() => {
    const refreshSession = async () => {
      const now = Date.now();
      const timeSinceLastRefresh = now - lastRefreshRef.current;
      const minutesSinceRefresh = Math.floor(timeSinceLastRefresh / 60000);
      
      console.log(`[useAuthRefresh] ⏰ Last refresh was ${minutesSinceRefresh} minutes ago`);
      
      // Nur refreshen wenn mehr als 10 Minuten seit letztem Refresh (weniger aggressive)
      if (timeSinceLastRefresh < 10 * 60 * 1000) {
        console.log('[useAuthRefresh] ⏭️ Skipping refresh - too recent');
        return;
      }

      try {
        console.log('[useAuthRefresh] 🔄 Refreshing session now...');
        const { data, error } = await supabase.auth.refreshSession();
        
        if (error) {
          console.error('[useAuthRefresh] ❌ Session refresh failed:', error);
          
          // Bei bestimmten Fehlern: Redirect zu Login
          if (
            error.message.includes('Invalid Refresh Token') ||
            error.message.includes('Refresh Token Not Found')
          ) {
            console.error('[useAuthRefresh] 🚨 Invalid token - redirecting to login...');
            // Kleines Delay, damit User die Error-Message sieht
            setTimeout(() => {
              window.location.href = '/login?reason=session_expired';
            }, 2000);
          }
          return;
        }
        
        if (data?.session) {
          const expiresAt = data.session.expires_at 
            ? new Date(data.session.expires_at * 1000).toLocaleTimeString() 
            : 'unknown';
          console.log(`[useAuthRefresh] ✅ Session refreshed - valid until ${expiresAt}`);
          lastRefreshRef.current = now;
        }
      } catch (err) {
        console.error('[useAuthRefresh] ❌ Unexpected refresh error:', err);
      }
    };

    // Refresh bei Tab-Fokus (wenn inaktiv war)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        const inactiveDuration = Date.now() - lastRefreshRef.current;
        const inactiveMinutes = Math.floor(inactiveDuration / 60000);
        console.log(`[useAuthRefresh] 👁️ Tab visible - inactive for ${inactiveMinutes} minutes`);
        
        // Wenn mehr als 10 Minuten inaktiv: Sofort refreshen
        if (inactiveDuration > 10 * 60 * 1000) {
          refreshSession();
        }
      }
    };

    // Refresh bei Window-Focus
    const handleFocus = () => {
      const inactiveDuration = Date.now() - lastRefreshRef.current;
      const inactiveMinutes = Math.floor(inactiveDuration / 60000);
      console.log(`[useAuthRefresh] 🪟 Window focused - inactive for ${inactiveMinutes} minutes`);
      
      // Wenn mehr als 10 Minuten inaktiv: Sofort refreshen
      if (inactiveDuration > 10 * 60 * 1000) {
        refreshSession();
      }
    };

    // Periodischer Refresh alle 15 Minuten (wenn aktiv) - weniger aggressive
    const scheduleNextRefresh = () => {
      refreshTimeoutRef.current = setTimeout(() => {
        if (!document.hidden) {
          refreshSession();
        }
        scheduleNextRefresh(); // Nächsten Refresh planen
      }, 15 * 60 * 1000); // 15 Minuten
    };

    // Event Listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    // Initial refresh nach 10 Minuten planen
    scheduleNextRefresh();

    // Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED') {
        console.log('[useAuthRefresh] ✅ Token refreshed by Supabase');
        lastRefreshRef.current = Date.now();
      }
      
      if (event === 'SIGNED_OUT') {
        console.log('[useAuthRefresh] 👋 User signed out');
        lastRefreshRef.current = Date.now();
      }
    });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      subscription.unsubscribe();
    };
  }, []);
}

