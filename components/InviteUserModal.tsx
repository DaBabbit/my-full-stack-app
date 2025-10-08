'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, UserPlus, Check, Eye, Edit, Trash2, Plus } from 'lucide-react';
import { WorkspacePermissions, ROLE_PERMISSIONS, WorkspaceRole } from '@/types/workspace';

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (email: string, permissions: WorkspacePermissions) => Promise<{ success: boolean; error?: string }>;
}

export default function InviteUserModal({ isOpen, onClose, onInvite }: InviteUserModalProps) {
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<WorkspaceRole>('collaborator');
  const [customPermissions, setCustomPermissions] = useState<WorkspacePermissions>(
    ROLE_PERMISSIONS.collaborator
  );
  const [isInviting, setIsInviting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleRoleChange = (role: WorkspaceRole) => {
    setSelectedRole(role);
    setCustomPermissions(ROLE_PERMISSIONS[role]);
  };

  const handlePermissionToggle = (permission: keyof WorkspacePermissions) => {
    setCustomPermissions(prev => ({
      ...prev,
      [permission]: !prev[permission]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!email.trim()) {
      setError('Bitte gib eine E-Mail-Adresse ein.');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Bitte gib eine gültige E-Mail-Adresse ein.');
      return;
    }

    setIsInviting(true);

    const result = await onInvite(email, customPermissions);

    if (result.success) {
      setSuccess(true);
      setEmail('');
      setSelectedRole('collaborator');
      setCustomPermissions(ROLE_PERMISSIONS.collaborator);
      
      // Close after short delay to show success
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } else {
      setError(result.error || 'Fehler beim Einladen');
    }

    setIsInviting(false);
  };

  const handleClose = () => {
    if (!isInviting) {
      setEmail('');
      setError('');
      setSuccess(false);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop with blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-50"
          />
          
          {/* Modal Content */}
          <div className="fixed inset-0 flex items-center justify-center p-4 z-50 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-neutral-900/95 backdrop-blur-md rounded-3xl p-6 max-w-lg w-full border border-neutral-700 pointer-events-auto"
            >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-500/20 rounded-xl mr-3">
                  <UserPlus className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold text-white">Benutzer einladen</h3>
              </div>
              <button
                onClick={handleClose}
                className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                disabled={isInviting}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Input */}
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  E-Mail-Adresse
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-neutral-400" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-neutral-800/50 border border-neutral-700 rounded-xl text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="user@example.com"
                    disabled={isInviting || success}
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-3">
                  Rolle wählen
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleRoleChange('collaborator')}
                    disabled={isInviting || success}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      selectedRole === 'collaborator'
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-neutral-700 hover:border-neutral-600'
                    }`}
                  >
                    <Edit className="w-5 h-5 text-blue-400 mb-2" />
                    <p className="text-white font-medium text-sm">Collaborator</p>
                    <p className="text-neutral-400 text-xs mt-1">Kann bearbeiten</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRoleChange('viewer')}
                    disabled={isInviting || success}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      selectedRole === 'viewer'
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-neutral-700 hover:border-neutral-600'
                    }`}
                  >
                    <Eye className="w-5 h-5 text-green-400 mb-2" />
                    <p className="text-white font-medium text-sm">Viewer</p>
                    <p className="text-neutral-400 text-xs mt-1">Nur ansehen</p>
                  </button>
                </div>
              </div>

              {/* Custom Permissions */}
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-3">
                  Berechtigungen
                </label>
                <div className="space-y-2">
                  <label className="flex items-center p-3 bg-neutral-800/30 rounded-xl cursor-pointer hover:bg-neutral-800/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={customPermissions.can_view}
                      onChange={() => handlePermissionToggle('can_view')}
                      disabled={isInviting || success}
                      className="w-4 h-4 text-blue-500 rounded focus:ring-blue-500 focus:ring-offset-0"
                    />
                    <Eye className="w-4 h-4 text-neutral-400 mx-3" />
                    <span className="text-white text-sm">Videos ansehen</span>
                  </label>

                  <label className="flex items-center p-3 bg-neutral-800/30 rounded-xl cursor-pointer hover:bg-neutral-800/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={customPermissions.can_create}
                      onChange={() => handlePermissionToggle('can_create')}
                      disabled={isInviting || success}
                      className="w-4 h-4 text-blue-500 rounded focus:ring-blue-500 focus:ring-offset-0"
                    />
                    <Plus className="w-4 h-4 text-neutral-400 mx-3" />
                    <span className="text-white text-sm">Videos erstellen</span>
                  </label>

                  <label className="flex items-center p-3 bg-neutral-800/30 rounded-xl cursor-pointer hover:bg-neutral-800/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={customPermissions.can_edit}
                      onChange={() => handlePermissionToggle('can_edit')}
                      disabled={isInviting || success}
                      className="w-4 h-4 text-blue-500 rounded focus:ring-blue-500 focus:ring-offset-0"
                    />
                    <Edit className="w-4 h-4 text-neutral-400 mx-3" />
                    <span className="text-white text-sm">Videos bearbeiten</span>
                  </label>

                  <label className="flex items-center p-3 bg-neutral-800/30 rounded-xl cursor-pointer hover:bg-neutral-800/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={customPermissions.can_delete}
                      onChange={() => handlePermissionToggle('can_delete')}
                      disabled={isInviting || success}
                      className="w-4 h-4 text-blue-500 rounded focus:ring-blue-500 focus:ring-offset-0"
                    />
                    <Trash2 className="w-4 h-4 text-neutral-400 mx-3" />
                    <span className="text-white text-sm">Videos löschen</span>
                  </label>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-red-900/20 border border-red-500/30 rounded-xl text-red-300 text-sm"
                >
                  {error}
                </motion.div>
              )}

              {/* Success Message */}
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-green-900/20 border border-green-500/30 rounded-xl text-green-300 text-sm flex items-center"
                >
                  <Check className="w-5 h-5 mr-2" />
                  Einladung erfolgreich versendet!
                </motion.div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isInviting || success}
                  className="flex-1 px-4 py-3 text-neutral-400 hover:bg-neutral-800 rounded-xl transition-colors disabled:opacity-50"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isInviting || success}
                  className="flex-1 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-all duration-300 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isInviting ? 'Wird eingeladen...' : success ? 'Eingeladen!' : 'Einladen'}
                </button>
              </div>
            </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

