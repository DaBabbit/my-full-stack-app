'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { UserX, AlertTriangle } from 'lucide-react';
import { WorkspaceMember } from '@/types/workspace';

interface RemoveMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  member: WorkspaceMember | null;
  isRemoving: boolean;
}

export default function RemoveMemberModal({
  isOpen,
  onClose,
  onConfirm,
  member,
  isRemoving
}: RemoveMemberModalProps) {
  if (!member) return null;

  const memberName = member.user?.firstname && member.user?.lastname 
    ? `${member.user.firstname} ${member.user.lastname}`
    : member.user?.email || member.invitation_email || 'Unbekannt';

  const isPending = member.status === 'pending';
  const title = isPending ? 'Einladung zurückziehen?' : 'Mitarbeiter entfernen?';
  const description = isPending
    ? `Möchtest du die Einladung an ${memberName} wirklich zurückziehen?`
    : `Möchtest du ${memberName} wirklich aus dem Team entfernen?`;
  const confirmButtonText = isPending ? 'Einladung zurückziehen' : 'Entfernen';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-neutral-900/95 backdrop-blur-xl rounded-3xl border border-neutral-700 p-8 max-w-md w-full shadow-2xl"
          >
            {/* Icon */}
            <div className="flex items-center justify-center mb-6">
              <div className="bg-red-500/10 rounded-full p-4">
                <UserX className="w-8 h-8 text-red-400" />
              </div>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-white text-center mb-4">
              {title}
            </h2>

            {/* Description */}
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-neutral-300 text-sm leading-relaxed">
                  {description}
                </p>
              </div>
            </div>

            {!isPending && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-6">
                <p className="text-neutral-300 text-sm leading-relaxed">
                  <span className="font-semibold text-red-400">Achtung:</span> Der Mitarbeiter verliert sofort den Zugriff auf dieses Workspace und alle Videos.
                </p>
              </div>
            )}

            {/* Member Info */}
            <div className="bg-neutral-800/50 rounded-2xl p-4 mb-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400 text-sm">Name/E-Mail:</span>
                  <span className="text-white text-sm font-medium">{memberName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400 text-sm">Rolle:</span>
                  <span className="text-white text-sm">
                    {member.role === 'collaborator' ? 'Mitarbeiter' : 'Betrachter'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400 text-sm">Status:</span>
                  <span className={`text-sm ${isPending ? 'text-yellow-400' : 'text-green-400'}`}>
                    {isPending ? 'Einladung ausstehend' : 'Aktiv'}
                  </span>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={isRemoving}
                className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white rounded-2xl py-3 px-6 font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Abbrechen
              </button>
              <button
                onClick={onConfirm}
                disabled={isRemoving}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-2xl py-3 px-6 font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isRemoving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Wird entfernt...</span>
                  </>
                ) : (
                  <span>{confirmButtonText}</span>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

