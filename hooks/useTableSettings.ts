'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/utils/supabase';
import { useCallback } from 'react';

export interface TableSettings {
  id?: string;
  user_id: string;
  workspace_owner_id: string;
  context: 'own_videos' | 'workspace_videos';
  column_order: string[];
  column_widths: Record<string, number>;
  hidden_columns: string[];
  created_at?: string;
  updated_at?: string;
}

interface UseTableSettingsOptions {
  userId?: string;
  workspaceOwnerId?: string;
  context: 'own_videos' | 'workspace_videos';
}

/**
 * Hook für das Laden und Speichern von Tabellen-Einstellungen
 * 
 * Logik:
 * - Bei eigenen Videos: Lade Settings des aktuellen Users
 * - Bei geteilten Workspaces: Lade Settings des Workspace-Owners
 */
export function useTableSettings({ 
  userId, 
  workspaceOwnerId,
  context 
}: UseTableSettingsOptions) {
  const queryClient = useQueryClient();

  // Bestimme, wessen Settings geladen werden sollen
  // Bei geteilten Workspaces: Settings vom Owner
  // Bei eigenen Videos: Settings vom User
  const settingsOwnerId = context === 'workspace_videos' && workspaceOwnerId 
    ? workspaceOwnerId 
    : userId;

  // Query für das Laden der Settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['tableSettings', settingsOwnerId, context],
    queryFn: async () => {
      if (!settingsOwnerId) {
        throw new Error('User ID erforderlich');
      }

      console.log('[useTableSettings] Loading settings for:', { settingsOwnerId, context });

      const { data, error } = await supabase
        .from('user_table_settings')
        .select('*')
        .eq('user_id', settingsOwnerId)
        .eq('workspace_owner_id', settingsOwnerId)
        .eq('context', context)
        .maybeSingle();

      if (error) {
        console.error('[useTableSettings] Error loading settings:', error);
        throw error;
      }

      console.log('[useTableSettings] Loaded settings:', data);
      return data as TableSettings | null;
    },
    enabled: !!settingsOwnerId,
    staleTime: 1000 * 60 * 5, // 5 Minuten
    gcTime: 1000 * 60 * 30, // 30 Minuten Cache
  });

  // Mutation für das Speichern der Settings
  const saveSettingsMutation = useMutation({
    mutationFn: async (newSettings: Partial<TableSettings>) => {
      if (!userId) {
        throw new Error('User ID erforderlich');
      }

      console.log('[useTableSettings] Saving settings:', newSettings);

      // Bei geteilten Workspaces können nur Owners ihre Settings ändern
      if (context === 'workspace_videos' && userId !== workspaceOwnerId) {
        throw new Error('Nur Workspace-Owner können Settings ändern');
      }

      const settingsData = {
        user_id: userId,
        workspace_owner_id: userId,
        context,
        column_order: newSettings.column_order || [],
        column_widths: newSettings.column_widths || {},
        hidden_columns: newSettings.hidden_columns || [],
      };

      // Upsert: Insert or Update
      const { data, error } = await supabase
        .from('user_table_settings')
        .upsert(settingsData, {
          onConflict: 'user_id,workspace_owner_id,context'
        })
        .select()
        .single();

      if (error) {
        console.error('[useTableSettings] Error saving settings:', error);
        throw error;
      }

      console.log('[useTableSettings] Settings saved successfully:', data);
      return data as TableSettings;
    },
    onSuccess: (data) => {
      // Cache aktualisieren
      queryClient.setQueryData(['tableSettings', settingsOwnerId, context], data);
      console.log('[useTableSettings] Cache updated');
    },
  });

  // Helper-Funktionen
  const updateColumnOrder = useCallback((newOrder: string[]) => {
    return saveSettingsMutation.mutateAsync({
      ...settings,
      column_order: newOrder,
    });
  }, [settings, saveSettingsMutation]);

  const updateColumnWidth = useCallback((columnId: string, width: number) => {
    return saveSettingsMutation.mutateAsync({
      ...settings,
      column_widths: {
        ...(settings?.column_widths || {}),
        [columnId]: width,
      },
    });
  }, [settings, saveSettingsMutation]);

  const toggleColumnVisibility = useCallback((columnId: string) => {
    const currentHidden = settings?.hidden_columns || [];
    const newHidden = currentHidden.includes(columnId)
      ? currentHidden.filter(id => id !== columnId)
      : [...currentHidden, columnId];

    return saveSettingsMutation.mutateAsync({
      ...settings,
      hidden_columns: newHidden,
    });
  }, [settings, saveSettingsMutation]);

  const resetSettings = useCallback(async () => {
    if (!userId) return;

    const { error } = await supabase
      .from('user_table_settings')
      .delete()
      .eq('user_id', userId)
      .eq('workspace_owner_id', userId)
      .eq('context', context);

    if (error) {
      console.error('[useTableSettings] Error resetting settings:', error);
      throw error;
    }

    queryClient.invalidateQueries({ queryKey: ['tableSettings', settingsOwnerId, context] });
  }, [userId, context, settingsOwnerId, queryClient]);

  return {
    settings,
    isLoading,
    isSaving: saveSettingsMutation.isPending,
    saveSettings: saveSettingsMutation.mutateAsync,
    updateColumnOrder,
    updateColumnWidth,
    toggleColumnVisibility,
    resetSettings,
  };
}

