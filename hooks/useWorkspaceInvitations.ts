'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { WorkspaceMember } from '@/types/workspace';

export function useWorkspaceInvitations() {
  const { user, supabase } = useAuth();
  const queryClient = useQueryClient();

  // Fetch invitations for current user
  const { data: invitations = [], isLoading, error } = useQuery({
    queryKey: ['workspaceInvitations', user?.id, user?.email],
    queryFn: async () => {
      if (!user?.id || !user?.email) {
        return [];
      }
      
      console.log('[useWorkspaceInvitations] Fetching invitations for user:', user.email, user.id);
      
      // Fetch invitations by email - split into two queries for better debugging
      // Query 1: By invitation_email
      const { data: emailInvitations, error: emailError } = await supabase
        .from('workspace_members')
        .select(`
          *,
          owner:users!workspace_members_workspace_owner_id_fkey(
            id,
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
          owner:users!workspace_members_workspace_owner_id_fkey(
            id,
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
      
      return unique as WorkspaceMember[];
    },
    enabled: !!user?.id && !!user?.email, // Nur fetchen wenn User vorhanden
    staleTime: 1000 * 60 * 2, // 2 Minuten Cache - Invitations sollten relativ aktuell sein
    gcTime: 1000 * 60 * 5, // 5 Minuten im Cache halten
    refetchOnWindowFocus: true, // Bei Tab-Fokus refetchen da Invitations zeitkritisch sind
    refetchOnMount: true, // Beim Mount fetchen für aktuelle Invitations
  });

  // Accept invitation mutation
  const acceptInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      if (!user?.id) {
        throw new Error('Nicht angemeldet');
      }

      console.log('[acceptInvitation] Accepting invitation:', invitationId, 'for user:', user.id);
      
      // Update the invitation to active status
      const { data, error: updateError } = await supabase
        .from('workspace_members')
        .update({
          status: 'active',
          user_id: user.id, // Ensure user_id is set
          updated_at: new Date().toISOString()
        })
        .eq('id', invitationId)
        .select();

      if (updateError) {
        console.error('[acceptInvitation] Update error:', updateError);
        throw updateError;
      }

      console.log('[acceptInvitation] Successfully accepted:', data);
      return data;
    },
    onSuccess: () => {
      // Invalidate queries to refetch
      queryClient.invalidateQueries({ queryKey: ['workspaceInvitations'] });
      queryClient.invalidateQueries({ queryKey: ['sharedWorkspaces'] });
    },
  });

  const acceptInvitation = async (invitationId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await acceptInvitationMutation.mutateAsync(invitationId);
      return { success: true };
    } catch (err) {
      console.error('[acceptInvitation] Error accepting invitation:', err);
      return { success: false, error: 'Fehler beim Annehmen der Einladung' };
    }
  };

  // Decline invitation mutation
  const declineInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      if (!user?.id) {
        throw new Error('Nicht angemeldet');
      }

      console.log('[declineInvitation] Declining invitation:', invitationId);
      
      // Delete the invitation
      const { error: deleteError } = await supabase
        .from('workspace_members')
        .delete()
        .eq('id', invitationId);

      if (deleteError) {
        console.error('[declineInvitation] Delete error:', deleteError);
        throw deleteError;
      }

      console.log('[declineInvitation] Successfully declined');
      return invitationId;
    },
    onSuccess: () => {
      // Invalidate queries to refetch
      queryClient.invalidateQueries({ queryKey: ['workspaceInvitations'] });
    },
  });

  const declineInvitation = async (invitationId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await declineInvitationMutation.mutateAsync(invitationId);
      return { success: true };
    } catch (err) {
      console.error('[declineInvitation] Error declining invitation:', err);
      return { success: false, error: 'Fehler beim Ablehnen der Einladung' };
    }
  };

  return {
    invitations,
    isLoading,
    error: error?.message || null,
    acceptInvitation,
    declineInvitation,
  };
}

