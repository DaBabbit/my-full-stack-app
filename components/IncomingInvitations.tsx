'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Users, Loader2, Mail, Eye, Edit, Plus, Trash2 } from 'lucide-react';
import { useWorkspaceInvitations } from '@/hooks/useWorkspaceInvitations';

export default function IncomingInvitations() {
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
    if (!confirm('Möchtest du diese Einladung wirklich ablehnen?')) {
      return;
    }
    
    setProcessingId(invitationId);
    const result = await declineInvitation(invitationId);
    if (!result.success) {
      alert(result.error || 'Fehler beim Ablehnen der Einladung');
    }
    setProcessingId(null);
  };

  if (isLoading) {
    return (
      <div className="bg-neutral-900/50 backdrop-blur-md rounded-3xl border border-neutral-700 p-6">
        <h2 className="text-xl font-semibold mb-6 text-white">Eingehende Einladungen zur Mitarbeit</h2>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-neutral-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <div className="bg-neutral-900/50 backdrop-blur-md rounded-3xl border border-neutral-700 p-6">
        <h2 className="text-xl font-semibold mb-6 text-white">Eingehende Einladungen zur Mitarbeit</h2>
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-neutral-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-neutral-600" />
          </div>
          <p className="text-neutral-400 text-sm">
            Keine ausstehenden Einladungen
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-neutral-900/50 backdrop-blur-md rounded-3xl border border-neutral-700 p-6">
      <div className="flex items-center mb-6">
        <div className="p-2 bg-blue-500/20 rounded-xl mr-3">
          <Users className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">Eingehende Einladungen zur Mitarbeit</h2>
          <p className="text-neutral-400 text-sm">
            {invitations.length} {invitations.length === 1 ? 'Einladung' : 'Einladungen'} ausstehend
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {invitations.map((invitation) => (
          <motion.div
            key={invitation.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4"
          >
            <div className="mb-3">
              <p className="text-white font-medium mb-1">
                Workspace-Einladung
              </p>
              <p className="text-neutral-400 text-sm">
                von{' '}
                <span className="text-white font-medium">
                  {invitation.owner?.firstname && invitation.owner?.lastname
                    ? `${invitation.owner.firstname} ${invitation.owner.lastname}`
                    : invitation.owner?.email || 'Unbekannt'}
                </span>
              </p>
            </div>

            {/* Permissions */}
            <div className="mb-4">
              <p className="text-neutral-400 text-xs mb-2">Deine Berechtigungen:</p>
              <div className="flex flex-wrap gap-2">
                {invitation.permissions.can_view && (
                  <span className="flex items-center text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-lg">
                    <Eye className="w-3 h-3 mr-1" />
                    Videos ansehen
                  </span>
                )}
                {invitation.permissions.can_create && (
                  <span className="flex items-center text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded-lg">
                    <Plus className="w-3 h-3 mr-1" />
                    Videos erstellen
                  </span>
                )}
                {invitation.permissions.can_edit && (
                  <span className="flex items-center text-xs px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-lg">
                    <Edit className="w-3 h-3 mr-1" />
                    Videos bearbeiten
                  </span>
                )}
                {invitation.permissions.can_delete && (
                  <span className="flex items-center text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded-lg">
                    <Trash2 className="w-3 h-3 mr-1" />
                    Videos löschen
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => handleAccept(invitation.id)}
                disabled={processingId === invitation.id}
                className="flex-1 flex items-center justify-center px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-all duration-300 hover:shadow-[0_0_20px_rgba(34,197,94,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processingId === invitation.id ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Check className="w-5 h-5 mr-2" />
                    Annehmen
                  </>
                )}
              </button>
              <button
                onClick={() => handleDecline(invitation.id)}
                disabled={processingId === invitation.id}
                className="flex-1 flex items-center justify-center px-4 py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-medium transition-all duration-300 border border-neutral-700 hover:border-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processingId === invitation.id ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <X className="w-5 h-5 mr-2" />
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

