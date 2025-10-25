'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/utils/supabase';

export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
  priority: number; // 0 = höchste Priorität
}

export type FilterValue = string[] | { from?: string; to?: string } | string | number | boolean | null;

export interface WorkspaceView {
  id: string;
  workspace_owner_id: string;
  name: string;
  is_default: boolean;
  filters: Record<string, FilterValue>; // Flexibel für verschiedene Filter-Typen
  sort_config?: SortConfig[]; // Array für Mehrfach-Sortierung
  column_settings?: {
    order: string[];
    widths: Record<string, number>;
    hidden: string[];
  };
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface CreateViewInput {
  name: string;
  filters?: Record<string, FilterValue>;
  sort_config?: SortConfig[];
  column_settings?: {
    order: string[];
    widths: Record<string, number>;
    hidden: string[];
  };
  is_default?: boolean;
}

/**
 * Hook für CRUD-Operationen auf Workspace Views
 * 
 * Views sind workspace-spezifisch und werden von allen Mitgliedern geteilt
 */
export function useWorkspaceViews(workspaceOwnerId?: string) {
  const queryClient = useQueryClient();

  // Query für das Laden aller Views eines Workspaces
  const { data: views = [], isLoading } = useQuery({
    queryKey: ['workspaceViews', workspaceOwnerId],
    queryFn: async () => {
      if (!workspaceOwnerId) {
        throw new Error('Workspace Owner ID erforderlich');
      }

      console.log('[useWorkspaceViews] Loading views for workspace:', workspaceOwnerId);

      const { data, error } = await supabase
        .from('workspace_views')
        .select('*')
        .eq('workspace_owner_id', workspaceOwnerId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[useWorkspaceViews] Error loading views:', error);
        throw error;
      }

      console.log('[useWorkspaceViews] Loaded', data?.length || 0, 'views');
      return data as WorkspaceView[];
    },
    enabled: !!workspaceOwnerId,
    staleTime: 1000 * 60 * 5, // 5 Minuten
    gcTime: 1000 * 60 * 30, // 30 Minuten Cache
  });

  // Mutation für das Erstellen einer neuen View
  const createViewMutation = useMutation({
    mutationFn: async (input: CreateViewInput) => {
      if (!workspaceOwnerId) {
        throw new Error('Workspace Owner ID erforderlich');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Nicht authentifiziert');
      }

      console.log('[useWorkspaceViews] Creating view:', input);

      const { data, error } = await supabase
        .from('workspace_views')
        .insert([{
          workspace_owner_id: workspaceOwnerId,
          name: input.name,
          filters: input.filters || {},
          sort_config: input.sort_config || null,
          column_settings: input.column_settings || null,
          is_default: input.is_default || false,
          created_by: user.id,
        }])
        .select()
        .single();

      if (error) {
        console.error('[useWorkspaceViews] Error creating view:', error);
        throw error;
      }

      console.log('[useWorkspaceViews] View created successfully:', data);
      return data as WorkspaceView;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaceViews', workspaceOwnerId] });
    },
  });

  // Mutation für das Aktualisieren einer View
  const updateViewMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CreateViewInput> }) => {
      console.log('[useWorkspaceViews] Updating view:', id, updates);

      const { data, error } = await supabase
        .from('workspace_views')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[useWorkspaceViews] Error updating view:', error);
        throw error;
      }

      console.log('[useWorkspaceViews] View updated successfully:', data);
      return data as WorkspaceView;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaceViews', workspaceOwnerId] });
    },
  });

  // Mutation für das Löschen einer View
  const deleteViewMutation = useMutation({
    mutationFn: async (viewId: string) => {
      console.log('[useWorkspaceViews] Deleting view:', viewId);

      const { error } = await supabase
        .from('workspace_views')
        .delete()
        .eq('id', viewId);

      if (error) {
        console.error('[useWorkspaceViews] Error deleting view:', error);
        throw error;
      }

      console.log('[useWorkspaceViews] View deleted successfully');
      return viewId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaceViews', workspaceOwnerId] });
    },
  });

  // Mutation für das Setzen der Default-View
  const setDefaultViewMutation = useMutation({
    mutationFn: async (viewId: string | null) => {
      if (!workspaceOwnerId) {
        throw new Error('Workspace Owner ID erforderlich');
      }

      console.log('[useWorkspaceViews] Setting default view:', viewId);

      // Zuerst alle Views auf is_default = false setzen
      const { error: resetError } = await supabase
        .from('workspace_views')
        .update({ is_default: false })
        .eq('workspace_owner_id', workspaceOwnerId);

      if (resetError) {
        console.error('[useWorkspaceViews] Error resetting default views:', resetError);
        throw resetError;
      }

      // Dann die ausgewählte View auf is_default = true setzen (falls vorhanden)
      if (viewId) {
        const { error: setError } = await supabase
          .from('workspace_views')
          .update({ is_default: true })
          .eq('id', viewId);

        if (setError) {
          console.error('[useWorkspaceViews] Error setting default view:', setError);
          throw setError;
        }
      }

      console.log('[useWorkspaceViews] Default view set successfully');
      return viewId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaceViews', workspaceOwnerId] });
    },
  });

  return {
    views,
    isLoading,
    createView: createViewMutation.mutateAsync,
    isCreating: createViewMutation.isPending,
    updateView: updateViewMutation.mutateAsync,
    isUpdating: updateViewMutation.isPending,
    deleteView: deleteViewMutation.mutateAsync,
    isDeleting: deleteViewMutation.isPending,
    setDefaultView: setDefaultViewMutation.mutateAsync,
    isSettingDefault: setDefaultViewMutation.isPending,
  };
}

