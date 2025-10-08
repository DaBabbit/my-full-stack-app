'use client';

import { useState } from 'react';
import { Users, UserPlus, Trash2, Edit, Eye, Crown, Check, X } from 'lucide-react';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';
import InviteUserModal from './InviteUserModal';
import { WorkspaceMember, WorkspacePermissions } from '@/types/workspace';
import { motion, AnimatePresence } from 'framer-motion';

export default function TeamManagement() {
  const { members, isLoading, isOwner, inviteMember, updateMemberPermissions, removeMember } = useWorkspaceMembers();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [editPermissions, setEditPermissions] = useState<WorkspacePermissions | null>(null);

  const handleInvite = async (email: string, permissions: WorkspacePermissions) => {
    const result = await inviteMember(email, permissions);
    return result;
  };

  const startEditPermissions = (member: WorkspaceMember) => {
    setEditingMember(member.id);
    setEditPermissions(member.permissions);
  };

  const cancelEditPermissions = () => {
    setEditingMember(null);
    setEditPermissions(null);
  };

  const savePermissions = async (memberId: string) => {
    if (!editPermissions) return;

    const result = await updateMemberPermissions(memberId, editPermissions);
    if (result.success) {
      setEditingMember(null);
      setEditPermissions(null);
    }
  };

  const handleRemoveMember = async (member: WorkspaceMember) => {
    if (!confirm(`Möchtest du ${member.user?.email} wirklich aus dem Team entfernen?`)) {
      return;
    }

    await removeMember(member.id);
  };

  const getRoleIcon = (role: string) => {
    if (role === 'owner') return Crown;
    if (role === 'viewer') return Eye;
    return Edit;
  };

  const getRoleColor = (role: string) => {
    if (role === 'owner') return 'text-yellow-400';
    if (role === 'viewer') return 'text-green-400';
    return 'text-blue-400';
  };

  const getRoleName = (role: string) => {
    if (role === 'owner') return 'Besitzer';
    if (role === 'collaborator') return 'Mitarbeiter';
    return 'Betrachter';
  };

  // Filter out owner from the list (they can't edit/remove themselves)
  const collaborators = members.filter(m => m.role !== 'owner');

  if (!isOwner) {
    return (
      <div className="bg-neutral-900/50 backdrop-blur-md rounded-3xl border border-neutral-700 p-6">
        <div className="text-center py-8">
          <Users className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
          <p className="text-neutral-400">
            Nur Workspace-Besitzer können das Team verwalten.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-neutral-900/50 backdrop-blur-md rounded-3xl border border-neutral-700 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-500/20 rounded-xl mr-3">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Team-Verwaltung</h2>
              <p className="text-neutral-400 text-sm">
                {collaborators.length} Mitarbeiter · Unlimited
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-all duration-300 flex items-center space-x-2 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]"
          >
            <UserPlus className="w-5 h-5" />
            <span>Einladen</span>
          </button>
        </div>

        {/* Loading */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <span className="loading loading-ring loading-lg text-white"></span>
          </div>
        ) : collaborators.length === 0 ? (
          /* Empty State */
          <div className="text-center py-12">
            <div className="p-4 bg-neutral-800/50 rounded-2xl w-fit mx-auto mb-4">
              <Users className="w-12 h-12 text-neutral-600" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Noch keine Team-Mitglieder
            </h3>
            <p className="text-neutral-400 mb-6">
              Lade Mitarbeiter ein, um gemeinsam an deinen Videos zu arbeiten
            </p>
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-all duration-300 inline-flex items-center space-x-2"
            >
              <UserPlus className="w-5 h-5" />
              <span>Ersten Mitarbeiter einladen</span>
            </button>
          </div>
        ) : (
          /* Members List */
          <div className="space-y-3">
            <AnimatePresence>
              {collaborators.map((member) => {
                const RoleIcon = getRoleIcon(member.role);
                const roleColor = getRoleColor(member.role);
                const isEditing = editingMember === member.id;

                return (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between">
                      {/* Member Info */}
                      <div className="flex items-center flex-1">
                        <div className="w-10 h-10 bg-neutral-700 rounded-full flex items-center justify-center text-sm font-medium text-white mr-3">
                          {member.user?.firstname?.[0] || member.user?.email?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <p className="text-white font-medium">
                              {member.user?.firstname && member.user?.lastname
                                ? `${member.user.firstname} ${member.user.lastname}`
                                : member.user?.email || 'Unbekannt'}
                            </p>
                            {member.status === 'pending' && (
                              <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full">
                                Einladung ausstehend
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <RoleIcon className={`w-4 h-4 ${roleColor}`} />
                            <p className="text-neutral-400 text-sm">{getRoleName(member.role)}</p>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      {!isEditing ? (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => startEditPermissions(member)}
                            className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-700 rounded-lg transition-colors"
                            title="Berechtigungen bearbeiten"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRemoveMember(member)}
                            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Mitglied entfernen"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => savePermissions(member.id)}
                            className="p-2 text-green-400 hover:text-green-300 hover:bg-green-500/10 rounded-lg transition-colors"
                            title="Speichern"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={cancelEditPermissions}
                            className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-700 rounded-lg transition-colors"
                            title="Abbrechen"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Edit Permissions */}
                    {isEditing && editPermissions && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 pt-4 border-t border-neutral-700 space-y-2"
                      >
                        {[
                          { key: 'can_view', label: 'Ansehen', icon: Eye },
                          { key: 'can_create', label: 'Erstellen', icon: UserPlus },
                          { key: 'can_edit', label: 'Bearbeiten', icon: Edit },
                          { key: 'can_delete', label: 'Löschen', icon: Trash2 }
                        ].map(({ key, label, icon: Icon }) => (
                          <label
                            key={key}
                            className="flex items-center p-2 rounded-lg hover:bg-neutral-700/50 cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={editPermissions[key as keyof WorkspacePermissions]}
                              onChange={(e) =>
                                setEditPermissions({
                                  ...editPermissions,
                                  [key]: e.target.checked
                                })
                              }
                              className="w-4 h-4 text-blue-500 rounded focus:ring-blue-500"
                            />
                            <Icon className="w-4 h-4 text-neutral-400 mx-3" />
                            <span className="text-white text-sm">{label}</span>
                          </label>
                        ))}
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      <InviteUserModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={handleInvite}
      />
    </>
  );
}

