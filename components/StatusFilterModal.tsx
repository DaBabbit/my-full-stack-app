'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Lightbulb, Clock, Scissors, Check, Rocket } from 'lucide-react';
import { type Video } from '@/hooks/useVideosQuery';
import EditableCell from './EditableCell';
import EditableDescription from './EditableDescription';
import EditableResponsiblePerson from './EditableResponsiblePerson';
import CustomDropdown from './CustomDropdown';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';
import { useAuth } from '@/contexts/AuthContext';

interface StatusFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: string;
  videos: Video[];
  onFieldSave: (videoId: string, field: string, value: string) => Promise<void>;
  onDelete: (videoId: string) => Promise<void>;
  canEdit: boolean;
  canDelete: boolean;
}

const statusOptions = [
  { value: 'Idee', label: 'Idee', icon: Lightbulb, iconColor: 'text-gray-400' },
  { value: 'Warten auf Aufnahme', label: 'Warten auf Aufnahme', icon: Clock, iconColor: 'text-red-400' },
  { value: 'In Bearbeitung (Schnitt)', label: 'In Bearbeitung', icon: Scissors, iconColor: 'text-purple-400' },
  { value: 'Schnitt abgeschlossen', label: 'Schnitt abgeschlossen', icon: Check, iconColor: 'text-blue-400' },
  { value: 'Hochgeladen', label: 'Hochgeladen', icon: Rocket, iconColor: 'text-green-400' }
];

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'Idee':
      return Lightbulb;
    case 'Warten auf Aufnahme':
      return Clock;
    case 'In Bearbeitung (Schnitt)':
      return Scissors;
    case 'Schnitt abgeschlossen':
      return Check;
    case 'Hochgeladen':
      return Rocket;
    default:
      return Clock;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Idee':
      return 'text-gray-400';
    case 'Warten auf Aufnahme':
      return 'text-red-400';
    case 'In Bearbeitung (Schnitt)':
      return 'text-purple-400';
    case 'Schnitt abgeschlossen':
      return 'text-blue-400';
    case 'Hochgeladen':
      return 'text-green-400';
    default:
      return 'text-neutral-400';
  }
};

export default function StatusFilterModal({
  isOpen,
  onClose,
  status,
  videos,
  onFieldSave,
  onDelete,
  canEdit,
  canDelete,
}: StatusFilterModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useAuth();
  const { members: workspaceMembers } = useWorkspaceMembers();

  // Filtere Videos nach Status und Suchbegriff
  const filteredVideos = useMemo(() => {
    return videos
      .filter(v => v.status === status)
      .filter(v => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
          v.title?.toLowerCase().includes(term) ||
          v.responsible_person?.toLowerCase().includes(term) ||
          v.description?.toLowerCase().includes(term) ||
          v.storage_location?.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [videos, status, searchTerm]);

  const StatusIcon = getStatusIcon(status);
  const statusColor = getStatusColor(status);

  // Workspace Owner Info
  const workspaceOwner = useMemo(() => {
    if (!user) return undefined;
    return {
      email: user.email || '',
      firstname: user.user_metadata?.firstname,
      lastname: user.user_metadata?.lastname,
    };
  }, [user]);

  // Reset search on close
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

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
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-4 md:inset-8 lg:inset-16 z-[101] flex items-center justify-center pointer-events-none"
          >
            <div className="bg-neutral-900/95 backdrop-blur-xl border border-neutral-700 rounded-3xl shadow-2xl w-full h-full flex flex-col pointer-events-auto overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-neutral-700/50 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl bg-neutral-800 border border-neutral-700`}>
                    <StatusIcon className={`w-5 h-5 ${statusColor}`} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">{status}</h2>
                    <p className="text-sm text-neutral-400 mt-0.5">
                      {filteredVideos.length} {filteredVideos.length === 1 ? 'Video' : 'Videos'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="p-2 hover:bg-neutral-800 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-neutral-400" />
                </button>
              </div>

              {/* Search */}
              <div className="p-6 border-b border-neutral-700/50 flex-shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Videos durchsuchen..."
                    className="w-full pl-10 pr-4 py-2 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-white/50"
                  />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {filteredVideos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <StatusIcon className={`w-16 h-16 ${statusColor} opacity-30 mb-4`} />
                    <p className="text-neutral-400 text-lg">
                      {searchTerm ? 'Keine Videos gefunden' : 'Keine Videos mit diesem Status'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="sticky top-0 bg-neutral-900/95 backdrop-blur-sm z-10">
                        <tr className="border-b border-neutral-700/50">
                          <th className="py-3 px-4 text-left text-sm font-semibold text-neutral-400">Titel</th>
                          <th className="py-3 px-4 text-left text-sm font-semibold text-neutral-400">Status</th>
                          <th className="py-3 px-4 text-left text-sm font-semibold text-neutral-400">Veröffentlichung</th>
                          <th className="py-3 px-4 text-left text-sm font-semibold text-neutral-400">Verantwortlich</th>
                          <th className="py-3 px-4 text-left text-sm font-semibold text-neutral-400">Speicherort</th>
                          <th className="py-3 px-4 text-left text-sm font-semibold text-neutral-400">Inspirationsquelle</th>
                          <th className="py-3 px-4 text-left text-sm font-semibold text-neutral-400">Beschreibung</th>
                          {canDelete && (
                            <th className="py-3 px-4 text-left text-sm font-semibold text-neutral-400">Aktionen</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredVideos.map((video) => (
                          <tr
                            key={video.id}
                            className="border-b border-neutral-700/30 hover:bg-neutral-800/30 transition-colors"
                          >
                            {/* Titel */}
                            <td className="py-4 px-4">
                              <EditableCell
                                value={video.title}
                                videoId={video.id}
                                field="title"
                                onSave={onFieldSave}
                                editable={canEdit}
                                placeholder="Titel eingeben..."
                              />
                            </td>

                            {/* Status */}
                            <td className="py-4 px-4">
                              <CustomDropdown
                                value={video.status}
                                options={statusOptions}
                                onChange={async (newStatus) => {
                                  await onFieldSave(video.id, 'status', newStatus);
                                }}
                                disabled={!canEdit}
                              />
                            </td>

                            {/* Veröffentlichung */}
                            <td className="py-4 px-4">
                              <EditableCell
                                value={video.publication_date}
                                videoId={video.id}
                                field="publication_date"
                                onSave={onFieldSave}
                                editable={canEdit}
                                placeholder="TT.MM.JJJJ"
                                type="date"
                              />
                            </td>

                            {/* Verantwortlich */}
                            <td className="py-4 px-4">
                              <EditableResponsiblePerson
                                value={video.responsible_person}
                                videoId={video.id}
                                onSave={onFieldSave}
                                editable={canEdit}
                                workspaceOwner={workspaceOwner}
                                workspaceMembers={workspaceMembers}
                              />
                            </td>

                            {/* Speicherort */}
                            <td className="py-4 px-4">
                              <EditableCell
                                value={video.storage_location}
                                videoId={video.id}
                                field="storage_location"
                                onSave={onFieldSave}
                                editable={canEdit}
                                placeholder="Speicherort..."
                              />
                            </td>

                            {/* Inspirationsquelle */}
                            <td className="py-4 px-4">
                              <EditableCell
                                value={video.inspiration_source}
                                videoId={video.id}
                                field="inspiration_source"
                                onSave={onFieldSave}
                                editable={canEdit}
                                placeholder="Quelle..."
                              />
                            </td>

                            {/* Beschreibung */}
                            <td className="py-4 px-4 max-w-xs">
                              <EditableDescription
                                value={video.description}
                                videoId={video.id}
                                onSave={onFieldSave}
                                editable={canEdit}
                                placeholder="Beschreibung..."
                              />
                            </td>

                            {/* Aktionen */}
                            {canDelete && (
                              <td className="py-4 px-4">
                                <button
                                  onClick={() => {
                                    if (confirm('Video wirklich löschen?')) {
                                      onDelete(video.id);
                                    }
                                  }}
                                  className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                  title="Video löschen"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

