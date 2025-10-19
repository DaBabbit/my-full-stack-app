'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/utils/supabase';

export interface Video {
  id: string;
  title: string;
  name?: string; // Alias for title (for backwards compatibility)
  status: string;
  storage_location?: string;
  file_drop_url?: string; // Nextcloud File Drop URL for uploading files
  nextcloud_path?: string; // WebDAV path for direct uploads (e.g. /KosmahdmAccountTest/video-folder/)
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
          file_drop_url,
          nextcloud_path,
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

      console.log('[useVideosQuery] ✅ Loaded', transformedVideos.length, 'videos from', data ? 'server' : 'cache');
      return transformedVideos;
    },
    enabled: !!userId, // Nur ausführen wenn User vorhanden
    staleTime: 1000 * 60 * 2, // 2 Minuten - Best Practice für Chrome/Safari
    gcTime: 1000 * 60 * 10, // 10 Minuten Cache
    refetchOnWindowFocus: true, // Refetch bei Tab-Fokus (nur wenn stale)
    refetchOnMount: false, // Nur refetch wenn stale
    refetchOnReconnect: true, // Refetch bei Reconnect
    retry: 2, // 2 Versuche bei Fehler
    retryDelay: 1000, // 1 Sekunde Delay
    networkMode: 'online', // Nur wenn online, verhindert hängende Queries
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
          file_drop_url,
          nextcloud_path,
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
    staleTime: 1000 * 60 * 2, // 2 Minuten - Best Practice für Chrome/Safari
    gcTime: 1000 * 60 * 10, // 10 Minuten Cache
    refetchOnWindowFocus: true, // Refetch bei Tab-Fokus (nur wenn stale)
    refetchOnMount: false, // Nur refetch wenn stale
    refetchOnReconnect: true, // Refetch bei Reconnect
    retry: 2, // 2 Versuche bei Fehler
    retryDelay: 1000, // 1 Sekunde Delay
    networkMode: 'online', // Nur wenn online, verhindert hängende Queries
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
            workspace_owner_id: currentUser.id, // ✅ SET workspace_owner_id = user_id für eigene Videos
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

      // 🔥 VERBESSERTER VERBINDUNGSTEST: Auth + DB-Verbindung
      try {
        // 1. Auth-Session prüfen
        const { data: { session }, error: authError } = await supabase.auth.getSession();
        if (authError || !session) {
          throw new Error(`Auth-Session ungültig: ${authError?.message || 'Keine Session'}`);
        }
        
        // 2. DB-Verbindung mit einfachem Query testen
        const { error: testError } = await supabase
          .from('videos')
          .select('id')
          .eq('id', id)
          .single();
        
        if (testError && testError.code !== 'PGRST116') { // PGRST116 = "not found" ist OK
          throw new Error(`DB-Verbindung fehlgeschlagen: ${testError.message}`);
        }
        
        console.log('[updateVideoMutation] ✅ Connection test passed');
      } catch (testErr) {
        console.error('[updateVideoMutation] ❌ Connection test failed:', testErr);
        const errorMessage = testErr instanceof Error ? testErr.message : 'Unbekannter Fehler';
        throw new Error(`Verbindungsproblem: ${errorMessage}. Bitte Seite aktualisieren.`);
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
    // Server-First: KEINE Optimistic Updates, nur echte Server-Bestätigung
    onSuccess: (data) => {
      console.log('[updateVideoMutation] ✅ Success! Supabase confirmed update:', data);
      
      // Cache mit echten Server-Daten updaten - mit korrektem Query Key!
      // Query Key muss mit useVideosQuery übereinstimmen: ['videos', 'own', userId]
      queryClient.setQueriesData(
        { queryKey: ['videos', 'own'], exact: false },
        (old: Video[] | undefined) => {
          if (!old) {
            console.log('[updateVideoMutation] ⚠️ No cache found for query');
            return old;
          }
          
          const updated = old.map(video => 
            video.id === data.id 
              ? { ...data, name: data.title } // Echte Server-Daten
              : video
          );
          
          console.log('[updateVideoMutation] 📦 Cache updated with real server data');
          return updated;
        }
      );
    },
    // Bei Fehler: Nur loggen, kein Rollback nötig (keine Optimistic Updates)
    onError: (err) => {
      console.error('[updateVideoMutation] ❌ Failed:', err.message || err);
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

      // 🔥 VERBESSERTER VERBINDUNGSTEST: Auth + DB-Verbindung
      try {
        // 1. Auth-Session prüfen
        const { data: { session }, error: authError } = await supabase.auth.getSession();
        if (authError || !session) {
          throw new Error(`Auth-Session ungültig: ${authError?.message || 'Keine Session'}`);
        }
        
        // 2. DB-Verbindung mit einfachem Query testen
        const { error: testError } = await supabase
          .from('videos')
          .select('id')
          .eq('id', id)
          .single();
        
        if (testError && testError.code !== 'PGRST116') { // PGRST116 = "not found" ist OK
          throw new Error(`DB-Verbindung fehlgeschlagen: ${testError.message}`);
        }
        
        console.log('[updateWorkspaceVideoMutation] ✅ Connection test passed');
      } catch (testErr) {
        console.error('[updateWorkspaceVideoMutation] ❌ Connection test failed:', testErr);
        const errorMessage = testErr instanceof Error ? testErr.message : 'Unbekannter Fehler';
        throw new Error(`Verbindungsproblem: ${errorMessage}. Bitte Seite aktualisieren.`);
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
    // Server-First: KEINE Optimistic Updates, nur echte Server-Bestätigung
    onSuccess: (data, variables) => {
      console.log('[updateWorkspaceVideoMutation] ✅ Success! Supabase confirmed update:', data);
      
      // Cache mit echten Server-Daten updaten - korrekter Query Key!
      queryClient.setQueryData(['videos', 'workspace', variables.ownerId], (old: Video[] | undefined) => {
        if (!old) {
          console.log('[updateWorkspaceVideoMutation] ⚠️ No cache found');
          return old;
        }
        
        const updated = old.map(video => 
          video.id === data.id 
            ? { ...data, name: data.title } // Echte Server-Daten
            : video
        );
        
        console.log('[updateWorkspaceVideoMutation] 📦 Workspace cache updated with real server data');
        return updated;
      });
    },
    // Bei Fehler: Nur loggen
    onError: (err) => {
      console.error('[updateWorkspaceVideoMutation] ❌ Failed:', err.message || err);
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

  // Bulk Update Videos Mutation (für eigene Videos)
  const bulkUpdateVideosMutation = useMutation({
    mutationFn: async ({ 
      videoIds, 
      updates 
    }: { 
      videoIds: string[]; 
      updates: Partial<VideoUpdate>;
    }) => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('Benutzer nicht angemeldet');
      }

      console.log('[bulkUpdateVideosMutation] Updating', videoIds.length, 'videos with:', updates);

      // Batch update mit Promise.all für parallele Updates
      const updatePromises = videoIds.map(async (videoId) => {
        const { data, error } = await supabase
          .from('videos')
          .update({
            ...updates,
            last_updated: new Date().toISOString()
          })
          .eq('id', videoId)
          .eq('user_id', currentUser.id)
          .select()
          .single();

        if (error) {
          console.error('[bulkUpdateVideosMutation] Error updating video', videoId, ':', error);
          throw error;
        }

        return data;
      });

      const results = await Promise.all(updatePromises);
      console.log('[bulkUpdateVideosMutation] Successfully updated', results.length, 'videos');
      
      return { 
        updated: results, 
        count: results.length 
      };
    },
    onSuccess: (data) => {
      console.log('[bulkUpdateVideosMutation] ✅ Bulk update successful');
      // Invalidate cache to refetch all videos
      queryClient.invalidateQueries({ queryKey: ['videos', 'own'] });
    },
    onError: (err) => {
      console.error('[bulkUpdateVideosMutation] ❌ Bulk update failed:', err);
    },
  });

  // Bulk Update Workspace Videos Mutation (für geteilte Workspaces)
  const bulkUpdateWorkspaceVideosMutation = useMutation({
    mutationFn: async ({ 
      videoIds, 
      updates, 
      ownerId 
    }: { 
      videoIds: string[]; 
      updates: Partial<VideoUpdate>;
      ownerId: string;
    }) => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('Benutzer nicht angemeldet');
      }

      console.log('[bulkUpdateWorkspaceVideosMutation] Updating', videoIds.length, 'workspace videos with:', updates);

      // Batch update mit Promise.all für parallele Updates
      const updatePromises = videoIds.map(async (videoId) => {
        const { data, error } = await supabase
          .from('videos')
          .update({
            ...updates,
            last_updated: new Date().toISOString()
          })
          .eq('id', videoId)
          .select()
          .single();

        if (error) {
          console.error('[bulkUpdateWorkspaceVideosMutation] Error updating video', videoId, ':', error);
          throw error;
        }

        return data;
      });

      const results = await Promise.all(updatePromises);
      console.log('[bulkUpdateWorkspaceVideosMutation] Successfully updated', results.length, 'workspace videos');
      
      return { 
        updated: results, 
        count: results.length,
        ownerId 
      };
    },
    onSuccess: (data) => {
      console.log('[bulkUpdateWorkspaceVideosMutation] ✅ Bulk update successful');
      // Invalidate cache to refetch workspace videos
      queryClient.invalidateQueries({ queryKey: ['videos', 'workspace', data.ownerId] });
    },
    onError: (err) => {
      console.error('[bulkUpdateWorkspaceVideosMutation] ❌ Bulk update failed:', err);
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
    
    bulkUpdateVideos: bulkUpdateVideosMutation.mutate,
    bulkUpdateVideosAsync: bulkUpdateVideosMutation.mutateAsync,
    isBulkUpdating: bulkUpdateVideosMutation.isPending,
    
    bulkUpdateWorkspaceVideos: bulkUpdateWorkspaceVideosMutation.mutate,
    bulkUpdateWorkspaceVideosAsync: bulkUpdateWorkspaceVideosMutation.mutateAsync,
    isBulkUpdatingWorkspace: bulkUpdateWorkspaceVideosMutation.isPending,
  };
}

