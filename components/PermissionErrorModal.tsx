'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Lock, 
  AlertTriangle, 
  Check, 
  Zap, 
  Users, 
  Edit, 
  Trash2, 
  Plus,
  Crown,
  UserCheck,
  Eye
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';

interface PermissionErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: string; // z.B. "Video erstellen", "Video bearbeiten", etc.
}

export default function PermissionErrorModal({ isOpen, onClose, action }: PermissionErrorModalProps) {
  const router = useRouter();
  const permissions = usePermissions();

  const getSubscriptionStatusInfo = () => {
    switch (permissions.subscriptionStatus) {
      case 'expired':
        return {
          title: 'Abonnement abgelaufen',
          description: 'Ihr Abonnement ist abgelaufen. Reaktivieren Sie es, um wieder alle Funktionen nutzen zu können.',
          buttonText: 'Abonnement reaktivieren',
          buttonIcon: Zap,
          color: 'orange'
        };
      case 'none':
      default:
        return {
          title: 'Abonnement erforderlich',
          description: 'Sie benötigen ein aktives Abonnement, um Videos zu erstellen und zu bearbeiten.',
          buttonText: 'Jetzt upgraden',
          buttonIcon: Crown,
          color: 'red'
        };
    }
  };

  const getRoleInfo = () => {
    switch (permissions.userRole) {
      case 'owner':
        return { icon: Crown, label: 'Besitzer', color: 'text-yellow-400' };
      case 'collaborator':
        return { icon: UserCheck, label: 'Mitarbeiter', color: 'text-blue-400' };
      case 'viewer':
        return { icon: Eye, label: 'Betrachter', color: 'text-green-400' };
      case 'none':
      default:
        return { icon: Lock, label: 'Kein Zugriff', color: 'text-red-400' };
    }
  };

  const statusInfo = getSubscriptionStatusInfo();
  const roleInfo = getRoleInfo();
  const StatusIcon = statusInfo.buttonIcon;
  const RoleIcon = roleInfo.icon;

  const permissionItems = [
    {
      icon: Plus,
      label: 'Videos erstellen',
      allowed: permissions.canCreateVideos,
      description: 'Neue Video-Projekte anlegen'
    },
    {
      icon: Edit,
      label: 'Videos bearbeiten',
      allowed: permissions.canEditVideos,
      description: 'Status und Details ändern'
    },
    {
      icon: Trash2,
      label: 'Videos löschen',
      allowed: permissions.canDeleteVideos,
      description: 'Video-Projekte entfernen'
    },
    {
      icon: Users,
      label: 'Mitarbeiter einladen',
      allowed: permissions.canInviteCollaborators,
      description: 'Andere zur Zusammenarbeit einladen'
    }
  ];

  const handleUpgrade = () => {
    onClose();
    router.push('/pay');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 touch-action-none"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ 
              type: "spring", 
              damping: 25, 
              stiffness: 300,
              duration: 0.3 
            }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 touch-action-none overscroll-y-contain touch-action-pan-y"
          >
            <div className="bg-neutral-900/95 backdrop-blur-md rounded-3xl border border-neutral-700 w-full max-w-md max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-neutral-700">
                <div className="flex items-center space-x-3">
                  <div className={`p-3 rounded-xl ${
                    statusInfo.color === 'red' ? 'bg-red-500/20' : 'bg-orange-500/20'
                  }`}>
                    <Lock className={`w-6 h-6 ${
                      statusInfo.color === 'red' ? 'text-red-400' : 'text-orange-400'
                    }`} />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">Zugriff verweigert</h2>
                    <p className="text-sm text-neutral-400">Aktion: {action}</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Status Info */}
                <div className={`p-4 rounded-2xl border ${
                  statusInfo.color === 'red' 
                    ? 'bg-red-900/20 border-red-500/30' 
                    : 'bg-orange-900/20 border-orange-500/30'
                }`}>
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className={`w-5 h-5 mt-0.5 ${
                      statusInfo.color === 'red' ? 'text-red-400' : 'text-orange-400'
                    }`} />
                    <div>
                      <h3 className={`font-semibold ${
                        statusInfo.color === 'red' ? 'text-red-300' : 'text-orange-300'
                      }`}>
                        {statusInfo.title}
                      </h3>
                      <p className={`text-sm mt-1 ${
                        statusInfo.color === 'red' ? 'text-red-200' : 'text-orange-200'
                      }`}>
                        {statusInfo.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Current Role */}
                <div className="bg-neutral-800/50 rounded-2xl p-4 border border-neutral-700">
                  <div className="flex items-center space-x-3 mb-3">
                    <RoleIcon className={`w-5 h-5 ${roleInfo.color}`} />
                    <div>
                      <h4 className="text-white font-medium">Ihre aktuelle Rolle</h4>
                      <p className={`text-sm ${roleInfo.color}`}>{roleInfo.label}</p>
                    </div>
                  </div>
                </div>

                {/* Permissions List */}
                <div className="bg-neutral-800/50 rounded-2xl p-4 border border-neutral-700">
                  <h4 className="text-white font-medium mb-4 flex items-center">
                    <Lock className="w-4 h-4 mr-2 text-neutral-400" />
                    Ihre Berechtigungen
                  </h4>
                  <div className="space-y-3">
                    {permissionItems.map((item) => {
                      const ItemIcon = item.icon;
                      return (
                        <div key={item.label} className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${
                            item.allowed ? 'bg-green-500/20' : 'bg-red-500/20'
                          }`}>
                            <ItemIcon className={`w-4 h-4 ${
                              item.allowed ? 'text-green-400' : 'text-red-400'
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className="text-white text-sm font-medium">
                                {item.label}
                              </span>
                              {item.allowed ? (
                                <Check className="w-4 h-4 text-green-400" />
                              ) : (
                                <X className="w-4 h-4 text-red-400" />
                              )}
                            </div>
                            <p className="text-xs text-neutral-400 truncate">
                              {item.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleUpgrade}
                    className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all duration-300 flex items-center justify-center space-x-2 ${
                      statusInfo.color === 'red'
                        ? 'bg-red-600 hover:bg-red-500 text-white hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]'
                        : 'bg-orange-600 hover:bg-orange-500 text-white hover:shadow-[0_0_20px_rgba(251,146,60,0.3)]'
                    }`}
                  >
                    <StatusIcon className="w-5 h-5" />
                    <span>{statusInfo.buttonText}</span>
                  </button>
                  
                  <button
                    onClick={onClose}
                    className="px-6 py-3 bg-neutral-700 hover:bg-neutral-600 text-white rounded-xl font-medium transition-colors"
                  >
                    Schließen
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
