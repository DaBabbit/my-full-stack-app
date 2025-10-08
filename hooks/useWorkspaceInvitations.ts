'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { WorkspaceMember } from '@/types/workspace';

export function useWorkspaceInvitations() {
  const { user, supabase } = useAuth();
  const [invitations, setInvitations] = useState<WorkspaceMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch invitations for current user
  const fetchInvitations = useCallback(async () => {
    if (!user?.id || !user?.email) {
      setInvitations([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Fetch invitations by email (for users not yet registered) or by user_id
      const { data, error: fetchError } = await supabase
        .from('workspace_members')
        .select(`
          *,
          owner:workspace_owner_id (
            email,
            firstname,
            lastname
          )
        `)
        .or(`invitation_email.eq.${user.email},user_id.eq.${user.id}`)
        .eq('status', 'pending')
        .neq('workspace_owner_id', user.id) // Don't show own invitations
        .order('invited_at', { ascending: false });

      if (fetchError) throw fetchError;

      setInvitations(data as WorkspaceMember[] || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching invitations:', err);
      setError('Fehler beim Laden der Einladungen');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, user?.email, supabase]);

  // Accept invitation
  const acceptInvitation = useCallback(async (invitationId: string): Promise<{ success: boolean; error?: string }> => {
    if (!user?.id) {
      return { success: false, error: 'Nicht angemeldet' };
    }

    try {
      // Update the invitation to active status
      const { error: updateError } = await supabase
        .from('workspace_members')
        .update({
          status: 'active',
          user_id: user.id, // Set the actual user_id
          updated_at: new Date().toISOString()
        })
        .eq('id', invitationId);

      if (updateError) throw updateError;

      await fetchInvitations();
      return { success: true };
    } catch (err) {
      console.error('Error accepting invitation:', err);
      return { success: false, error: 'Fehler beim Annehmen der Einladung' };
    }
  }, [user?.id, supabase, fetchInvitations]);

  // Decline invitation
  const declineInvitation = useCallback(async (invitationId: string): Promise<{ success: boolean; error?: string }> => {
    if (!user?.id) {
      return { success: false, error: 'Nicht angemeldet' };
    }

    try {
      // Delete the invitation
      const { error: deleteError } = await supabase
        .from('workspace_members')
        .delete()
        .eq('id', invitationId);

      if (deleteError) throw deleteError;

      await fetchInvitations();
      return { success: true };
    } catch (err) {
      console.error('Error declining invitation:', err);
      return { success: false, error: 'Fehler beim Ablehnen der Einladung' };
    }
  }, [user?.id, supabase, fetchInvitations]);

  // Initial load
  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  // Realtime subscription for invitations
  useEffect(() => {
    if (!user?.id || !user?.email) return;

    const channel = supabase
      .channel(`workspace_invitations_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workspace_members',
          filter: `invitation_email=eq.${user.email}`
        },
        () => {
          console.log('Workspace invitation updated, refreshing...');
          fetchInvitations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, user?.email, supabase, fetchInvitations]);

  return {
    invitations,
    isLoading,
    error,
    acceptInvitation,
    declineInvitation,
    fetchInvitations
  };
}

