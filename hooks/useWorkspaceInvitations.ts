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
      
      console.log('[useWorkspaceInvitations] Fetching invitations for user:', user.email, user.id);
      
      // Fetch invitations by email - split into two queries for better debugging
      // Query 1: By invitation_email
      const { data: emailInvitations, error: emailError } = await supabase
        .from('workspace_members')
        .select(`
          *,
          owner:workspace_owner_id (
            email,
            firstname,
            lastname
          )
        `)
        .eq('invitation_email', user.email)
        .eq('status', 'pending')
        .neq('workspace_owner_id', user.id)
        .order('invited_at', { ascending: false });

      if (emailError) {
        console.error('[useWorkspaceInvitations] Email query error:', emailError);
      }

      console.log('[useWorkspaceInvitations] Email invitations:', emailInvitations?.length || 0, emailInvitations);

      // Query 2: By user_id (for registered users who already accepted)
      const { data: userIdInvitations, error: userIdError } = await supabase
        .from('workspace_members')
        .select(`
          *,
          owner:workspace_owner_id (
            email,
            firstname,
            lastname
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .neq('workspace_owner_id', user.id)
        .order('invited_at', { ascending: false });

      if (userIdError) {
        console.error('[useWorkspaceInvitations] User ID query error:', userIdError);
      }

      console.log('[useWorkspaceInvitations] User ID invitations:', userIdInvitations?.length || 0, userIdInvitations);

      // Combine results and remove duplicates
      const combined = [...(emailInvitations || []), ...(userIdInvitations || [])];
      const unique = combined.filter((item, index, self) => 
        index === self.findIndex((t) => t.id === item.id)
      );

      console.log('[useWorkspaceInvitations] Total unique invitations:', unique.length);
      
      setInvitations(unique as WorkspaceMember[]);
      setError(null);
    } catch (err) {
      console.error('[useWorkspaceInvitations] Error fetching invitations:', err);
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

