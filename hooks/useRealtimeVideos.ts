'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/utils/supabase';

/**
 * Hook für Supabase Realtime-Integration mit React Query
 * Invalidiert den Query-Cache bei Realtime-Events
 */
export function useRealtimeVideos(userId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    console.log('[useRealtimeVideos] 🔥 POLLING KOMPLETT DEAKTIVIERT - Nur Tab-Focus-Refetch verwenden');
    
    // 🚨 POLLING DEAKTIVIERT: Verhindert Race Conditions mit Mutations!
    // Tab-Focus-Refetch + staleTime: 0 reichen aus für frische Daten
    // Polling verursachte: Mutation speichert → Polling refetcht → Alte Daten überschreiben neue!
    
    return () => {
      console.log('[useRealtimeVideos] No cleanup needed - no polling active');
    };
  }, [userId, queryClient]);
}

/**
 * Hook für Workspace-spezifische Realtime-Updates
 */
export function useRealtimeWorkspaceVideos(ownerId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!ownerId) return;

    console.log('[useRealtimeWorkspaceVideos] 🔥 POLLING KOMPLETT DEAKTIVIERT - Nur Tab-Focus-Refetch verwenden');
    
    // 🚨 POLLING DEAKTIVIERT: Verhindert Race Conditions mit Workspace-Mutations!
    // Tab-Focus-Refetch + staleTime: 0 reichen aus für frische Workspace-Daten
    
    return () => {
      console.log('[useRealtimeWorkspaceVideos] No cleanup needed - no polling active');
    };
  }, [ownerId, queryClient]);
}

