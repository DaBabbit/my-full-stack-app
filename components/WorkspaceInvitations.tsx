'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Users, Loader2 } from 'lucide-react';
import { useWorkspaceInvitations } from '@/hooks/useWorkspaceInvitations';

export default function WorkspaceInvitations() {
  const { invitations, isLoading, acceptInvitation, declineInvitation } = useWorkspaceInvitations();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleAccept = async (invitationId: string) => {
    setProcessingId(invitationId);
    const result = await acceptInvitation(invitationId);
    if (!result.success) {
      alert(result.error || 'Fehler beim Annehmen der Einladung');
    }
    setProcessingId(null);
  };

  const handleDecline = async (invitationId: string) => {
    setProcessingId(invitationId);
    const result = await declineInvitation(invitationId);
    if (!result.success) {
      alert(result.error || 'Fehler beim Ablehnen der Einladung');
    }
    setProcessingId(null);
  };

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-neutral-400 animate-spin" />
      </div>
    );
  }

  if (invitations.length === 0) {
    return null; // Don't show anything if no invitations
  }

  return (
    <div className="border-t border-neutral-700">
      <div className="px-4 py-3 bg-neutral-800/30">
        <h4 className="text-sm font-semibold text-white flex items-center">
          <Users className="w-4 h-4 mr-2" />
          Workspace-Einladungen
        </h4>
      </div>
      <div className="max-h-60 overflow-y-auto">
        {invitations.map((invitation) => (
          <motion.div
            key={invitation.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 border-b border-neutral-700/50 hover:bg-neutral-800/20 transition-colors"
          >
            <div className="mb-3">
              <p className="text-white text-sm font-medium mb-1">
                Einladung zum Workspace
              </p>
              <p className="text-neutral-400 text-xs">
                von{' '}
                <span className="text-white font-medium">
                  {invitation.owner?.firstname && invitation.owner?.lastname
                    ? `${invitation.owner.firstname} ${invitation.owner.lastname}`
                    : invitation.owner?.email || 'Unbekannt'}
                </span>
              </p>
            </div>

            {/* Permissions Preview */}
            <div className="mb-3 flex flex-wrap gap-1">
              {invitation.permissions.can_view && (
                <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">
                  Ansehen
                </span>
              )}
              {invitation.permissions.can_create && (
                <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                  Erstellen
                </span>
              )}
              {invitation.permissions.can_edit && (
                <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">
                  Bearbeiten
                </span>
              )}
              {invitation.permissions.can_delete && (
                <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded">
                  Löschen
                </span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => handleAccept(invitation.id)}
                disabled={processingId === invitation.id}
                className="flex-1 flex items-center justify-center px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processingId === invitation.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    Annehmen
                  </>
                )}
              </button>
              <button
                onClick={() => handleDecline(invitation.id)}
                disabled={processingId === invitation.id}
                className="flex-1 flex items-center justify-center px-3 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processingId === invitation.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <X className="w-4 h-4 mr-1" />
                    Ablehnen
                  </>
                )}
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

