'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/utils/supabase';

export interface Video {
  id: string;
  title: string;
  name?: string; // Alias for title (for backwards compatibility)
  status: string;
  storage_location?: string;
  created_at: string;
  publication_date?: string;
  responsible_person?: string;
  inspiration_source?: string;
  description?: string;
  last_updated?: string;
  updated_at?: string;
  duration?: number;
  file_size?: number;
  format?: string;
  thumbnail_url?: string;
  workspace_owner_id?: string;
  created_by?: string;
  user_id?: string;
  // Workspace member permissions (only set for shared workspace videos)
  workspace_permissions?: {
    can_view: boolean;
    can_create: boolean;
    can_edit: boolean;
    can_delete: boolean;
  };
}

interface VideoUpdate {
  status?: string;
  publication_date?: string | null;
  responsible_person?: string | null;
  inspiration_source?: string | null;
  description?: string | null;
  last_updated?: string;
}

/**
 * Hook für das Fetching der eigenen Videos des Users
 */
export function useVideosQuery(userId?: string) {
  return useQuery({
    queryKey: ['videos', 'own', userId],
    queryFn: async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('Nicht authentifiziert');
      }

      console.log('[useVideosQuery] Fetching videos for user:', currentUser.id);

      const { data, error } = await supabase
        .from('videos')
        .select(`
          id,
          title,
          status,
          publication_date,
          responsible_person,
          storage_location,
          inspiration_source,
          description,
          created_at,
          last_updated,
          updated_at,
          duration,
          file_size,
          format,
          thumbnail_url,
          workspace_owner_id,
          created_by,
          user_id
        `)
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[useVideosQuery] Error:', error);
        throw error;
      }

      // Transform to include 'name' alias for backwards compatibility
      const transformedVideos: Video[] = (data || []).map(video => ({
        ...video,
        name: video.title,
      }));

      console.log('[useVideosQuery] Loaded', transformedVideos.length, 'videos');
      return transformedVideos;
    },
    enabled: !!userId, // Nur ausführen wenn User vorhanden
    staleTime: 0, // 🔥 IMMER als stale betrachten → garantiert Refetch bei Tab-Fokus!
    gcTime: 1000 * 60 * 10, // 10 Minuten Cache für Background
    refetchOnWindowFocus: true, // IMMER refetch bei Tab-Fokus (wegen staleTime: 0)
    refetchOnMount: true, // IMMER refetch beim Mount
    refetchOnReconnect: true, // Refetch bei Reconnect
    retry: 3, // 3 Versuche bei Fehler
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
}

/**
 * Hook für das Fetching von Workspace-Videos
 */
export function useSharedWorkspaceVideosQuery(ownerId: string | undefined) {
  return useQuery({
    queryKey: ['videos', 'workspace', ownerId],
    queryFn: async () => {
      if (!ownerId) {
        throw new Error('Owner ID ist erforderlich');
      }

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('Nicht authentifiziert');
      }

      console.log('[useSharedWorkspaceVideosQuery] Fetching videos for workspace:', ownerId);

      const { data, error } = await supabase
        .from('videos')
        .select(`
          id,
          title,
          status,
          publication_date,
          responsible_person,
          storage_location,
          inspiration_source,
          description,
          created_at,
          last_updated,
          updated_at,
          duration,
          file_size,
          format,
          thumbnail_url,
          workspace_owner_id,
          created_by
        `)
        .eq('workspace_owner_id', ownerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[useSharedWorkspaceVideosQuery] Error:', error);
        throw error;
      }

      // Transform to include 'name' alias
      const transformedVideos: Video[] = (data || []).map(video => ({
        ...video,
        name: video.title,
      }));

      console.log('[useSharedWorkspaceVideosQuery] Loaded', transformedVideos.length, 'videos');
      return transformedVideos;
    },
    enabled: !!ownerId, // Nur ausführen wenn ownerId vorhanden ist
    staleTime: 0, // 🔥 IMMER als stale betrachten → garantiert Refetch bei Tab-Fokus!
    gcTime: 1000 * 60 * 10, // 10 Minuten Cache
    refetchOnWindowFocus: true, // IMMER refetch bei Tab-Fokus (wegen staleTime: 0)
    refetchOnMount: true, // IMMER refetch beim Mount
    refetchOnReconnect: true, // Refetch bei Reconnect
    retry: 3, // 3 Versuche bei Fehler
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
}

/**
 * Hook für alle Video-Mutations (Create, Update, Delete)
 */
export function useVideoMutations() {
  const queryClient = useQueryClient();

  // Create Video Mutation
  const createVideoMutation = useMutation({
    mutationFn: async (newVideo: {
      title: string;
      status: string;
      publication_date?: string | null;
      responsible_person?: string | null;
      inspiration_source?: string | null;
      description?: string | null;
    }) => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('Benutzer nicht angemeldet');
      }

      // Ensure user exists in users table
      const { error: userCheckError } = await supabase
        .from('users')
        .select('id')
        .eq('id', currentUser.id)
        .single();

      if (userCheckError && userCheckError.code === 'PGRST116') {
        // User doesn't exist, create them
        const { error: createUserError } = await supabase
          .from('users')
          .insert([
            {
              id: currentUser.id,
              email: currentUser.email,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              is_deleted: false
            }
          ]);

        if (createUserError) {
          throw createUserError;
        }
      }

      const { data, error } = await supabase
        .from('videos')
        .insert([
          {
            user_id: currentUser.id,
            title: newVideo.title,
            status: newVideo.status,
            publication_date: newVideo.publication_date || null,
            responsible_person: newVideo.responsible_person || null,
            storage_location: null,
            inspiration_source: newVideo.inspiration_source || null,
            description: newVideo.description || null,
          }
        ])
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      // Invalidate and refetch videos
      queryClient.invalidateQueries({ queryKey: ['videos', 'own'] });
    },
  });

  // Update Video Mutation - KEIN Optimistic Update, nur echte Success-Verifikation
  const updateVideoMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: VideoUpdate }) => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('Benutzer nicht angemeldet');
      }

      console.log('[updateVideoMutation] 🔄 Starting update for video:', id, updates);

      // 🔥 VERBINDUNGSTEST: Prüfe ob Supabase erreichbar ist
      try {
        const { error: testError } = await supabase
          .from('videos')
          .select('id')
          .eq('id', id)
          .single();
        
        if (testError) {
          throw new Error(`Verbindung zu Supabase fehlgeschlagen: ${testError.message}`);
        }
      } catch (testErr) {
        console.error('[updateVideoMutation] ❌ Connection test failed:', testErr);
        throw new Error('Keine Verbindung zu Supabase. Bitte Seite aktualisieren.');
      }

      // Echte Mutation
      const { data, error } = await supabase
        .from('videos')
        .update({
          ...updates,
          last_updated: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', currentUser.id)
        .select()
        .single();

      if (error) {
        console.error('[updateVideoMutation] ❌ Supabase error:', error);
        throw error;
      }

      console.log('[updateVideoMutation] ✅ Successfully updated:', data);
      return data;
    },
    // KEIN onMutate - keine Optimistic Updates mehr!
    // onSuccess: Cache mit echten Daten aktualisieren
    onSuccess: (data) => {
      console.log('[updateVideoMutation] ✅ onSuccess - Updating cache with real data');
      queryClient.setQueryData(['videos', 'own'], (old: Video[] | undefined) => {
        if (!old) return old;
        return old.map(video => 
          video.id === data.id 
            ? { ...data, name: data.title } // Use real server data
            : video
        );
      });
    },
    // Bei Fehler: Cache invalidieren für korrekten State
    onError: (err) => {
      console.error('[updateVideoMutation] ❌ Error occurred:', err);
      // Cache invalidieren um korrekten State zu bekommen
      queryClient.invalidateQueries({ queryKey: ['videos', 'own'] });
    },
  });

  // Update Workspace Video Mutation - KEIN Optimistic Update, nur echte Success-Verifikation
  const updateWorkspaceVideoMutation = useMutation({
    mutationFn: async ({ 
      id, 
      updates, 
      ownerId 
    }: { 
      id: string; 
      updates: VideoUpdate; 
      ownerId: string;
    }) => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('Benutzer nicht angemeldet');
      }

      console.log('[updateWorkspaceVideoMutation] 🔄 Starting workspace update for video:', id, updates);

      // 🔥 VERBINDUNGSTEST: Prüfe ob Supabase erreichbar ist
      try {
        const { error: testError } = await supabase
          .from('videos')
          .select('id')
          .eq('id', id)
          .single();
        
        if (testError) {
          throw new Error(`Verbindung zu Supabase fehlgeschlagen: ${testError.message}`);
        }
      } catch (testErr) {
        console.error('[updateWorkspaceVideoMutation] ❌ Connection test failed:', testErr);
        throw new Error('Keine Verbindung zu Supabase. Bitte Seite aktualisieren.');
      }

      // Echte Mutation
      const { data, error } = await supabase
        .from('videos')
        .update({
          ...updates,
          last_updated: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[updateWorkspaceVideoMutation] ❌ Supabase error:', error);
        throw error;
      }

      console.log('[updateWorkspaceVideoMutation] ✅ Successfully updated workspace video:', data);
      return data;
    },
    // KEIN onMutate - keine Optimistic Updates mehr!
    // onSuccess: Cache mit echten Daten aktualisieren
    onSuccess: (data, variables) => {
      console.log('[updateWorkspaceVideoMutation] ✅ onSuccess - Updating workspace cache with real data');
      queryClient.setQueryData(['videos', 'workspace', variables.ownerId], (old: Video[] | undefined) => {
        if (!old) return old;
        return old.map(video => 
          video.id === data.id 
            ? { ...data, name: data.title } // Use real server data
            : video
        );
      });
    },
    // Bei Fehler: Cache invalidieren für korrekten State
    onError: (err, variables) => {
      console.error('[updateWorkspaceVideoMutation] ❌ Error occurred:', err);
      // Cache invalidieren um korrekten State zu bekommen
      queryClient.invalidateQueries({ queryKey: ['videos', 'workspace', variables.ownerId] });
    },
  });

  // Delete Video Mutation
  const deleteVideoMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('Benutzer nicht angemeldet');
      }

      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', id)
        .eq('user_id', currentUser.id);

      if (error) {
        throw error;
      }

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos', 'own'] });
    },
  });

  // Delete Workspace Video Mutation
  const deleteWorkspaceVideoMutation = useMutation({
    mutationFn: async ({ id, ownerId }: { id: string; ownerId: string }) => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('Benutzer nicht angemeldet');
      }

      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      return { id, ownerId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['videos', 'workspace', data.ownerId] });
    },
  });

  return {
    createVideo: createVideoMutation.mutate,
    createVideoAsync: createVideoMutation.mutateAsync,
    isCreatingVideo: createVideoMutation.isPending,
    
    updateVideo: updateVideoMutation.mutate,
    updateVideoAsync: updateVideoMutation.mutateAsync,
    isUpdatingVideo: updateVideoMutation.isPending,
    
    updateWorkspaceVideo: updateWorkspaceVideoMutation.mutate,
    updateWorkspaceVideoAsync: updateWorkspaceVideoMutation.mutateAsync,
    isUpdatingWorkspaceVideo: updateWorkspaceVideoMutation.isPending,
    
    deleteVideo: deleteVideoMutation.mutate,
    deleteVideoAsync: deleteVideoMutation.mutateAsync,
    isDeletingVideo: deleteVideoMutation.isPending,
    
    deleteWorkspaceVideo: deleteWorkspaceVideoMutation.mutate,
    deleteWorkspaceVideoAsync: deleteWorkspaceVideoMutation.mutateAsync,
    isDeletingWorkspaceVideo: deleteWorkspaceVideoMutation.isPending,
  };
}

