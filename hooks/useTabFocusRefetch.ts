'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Hook für smarten Tab-Fokus-Refetch
 * Best Practice: Page Visibility API mit Debounce, kein window.focus (verhindert Doppel-Refetches)
 */
export function useTabFocusRefetch() {
  const queryClient = useQueryClient();
  const isRefetchingRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    const handleVisibilityChange = () => {
      // Cleanup vorheriger Timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      if (!document.hidden) {
        console.log('[useTabFocusRefetch] 👁️ Tab became visible');
        
        // Debounce: 500ms warten bevor Refetch (Browser Background Tab Throttling)
        console.log('[useTabFocusRefetch] ⏳ Waiting 500ms before refetch...');
        
        timeoutRef.current = setTimeout(() => {
          if (isRefetchingRef.current) {
            console.log('[useTabFocusRefetch] ⏭️ Skipping - already refetching');
            return;
          }

          isRefetchingRef.current = true;
          console.log('[useTabFocusRefetch] 🔄 Triggering refetch now');
          
          // Nur invalidieren - React Query refetcht automatisch wenn stale
          queryClient.invalidateQueries({ 
            queryKey: ['videos'],
            exact: false,
            refetchType: 'active' // Nur aktive Queries refetchen
          });
          
          // Reset flag nach 2 Sekunden
          setTimeout(() => {
            isRefetchingRef.current = false;
          }, 2000);
        }, 500);
      } else {
        console.log('[useTabFocusRefetch] 💤 Tab hidden');
      }
    };

    // NUR visibilitychange, KEIN window.focus (verhindert Doppel-Refetches)
    document.addEventListener('visibilitychange', handleVisibilityChange);

    console.log('[useTabFocusRefetch] ✅ Tab focus handler registered (with debounce)');

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      console.log('[useTabFocusRefetch] ❌ Tab focus handler unregistered');
    };
  }, [queryClient]);
}

