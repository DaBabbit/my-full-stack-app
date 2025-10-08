'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface SharedWorkspace {
  id: string;
  workspace_owner_id: string;
  owner_name: string;
  owner_email: string;
  role: string;
  permissions: {
    can_view: boolean;
    can_create: boolean;
    can_edit: boolean;
    can_delete: boolean;
  };
  member_since: string;
}

export function useSharedWorkspaces() {
  const { user, supabase } = useAuth();
  const [sharedWorkspaces, setSharedWorkspaces] = useState<SharedWorkspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSharedWorkspaces = useCallback(async () => {
    if (!user?.id) {
      setSharedWorkspaces([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Fetch all active workspace memberships where user is not the owner
      const { data, error: fetchError } = await supabase
        .from('workspace_members')
        .select(`
          id,
          workspace_owner_id,
          role,
          permissions,
          created_at,
          owner:workspace_owner_id (
            email,
            firstname,
            lastname
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .neq('workspace_owner_id', user.id); // Don't show own workspace

      if (fetchError) throw fetchError;

      const transformed: SharedWorkspace[] = (data || []).map((item: any) => ({
        id: item.id,
        workspace_owner_id: item.workspace_owner_id,
        owner_name: item.owner?.firstname && item.owner?.lastname
          ? `${item.owner.firstname} ${item.owner.lastname}`
          : item.owner?.email || 'Unbekannt',
        owner_email: item.owner?.email || '',
        role: item.role,
        permissions: item.permissions,
        member_since: item.created_at,
      }));

      setSharedWorkspaces(transformed);
      setError(null);
    } catch (err) {
      console.error('Error fetching shared workspaces:', err);
      setError('Fehler beim Laden der geteilten Workspaces');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, supabase]);

  // Initial load
  useEffect(() => {
    fetchSharedWorkspaces();
  }, [fetchSharedWorkspaces]);

  // Realtime subscription for workspace memberships
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`shared_workspaces_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workspace_members',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          console.log('Shared workspaces updated, refreshing...');
          fetchSharedWorkspaces();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, supabase, fetchSharedWorkspaces]);

  return {
    sharedWorkspaces,
    isLoading,
    error,
    fetchSharedWorkspaces
  };
}

