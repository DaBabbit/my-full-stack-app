'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Loader2, CheckCircle2 } from 'lucide-react';

interface AutomationSettings {
  id?: string;
  trigger_status: string;
  assigned_person_id: string | null;
}

interface User {
  id: string;
  firstname?: string;
  lastname?: string;
  email: string;
}

interface AutomationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AutomationSettingsModal({ isOpen, onClose }: AutomationSettingsModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  
  // Available users for assignment
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  
  // Settings for each trigger status
  const [ideaSettings, setIdeaSettings] = useState<AutomationSettings>({
    trigger_status: 'Idee',
    assigned_person_id: null
  });
  
  const [waitingSettings, setWaitingSettings] = useState<AutomationSettings>({
    trigger_status: 'Warten auf Aufnahme',
    assigned_person_id: null
  });

  useEffect(() => {
    if (!user || !isOpen) return;
    
    loadSettings();
  }, [user, isOpen]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      
      // 1. Load available users (self + kosmamedia + workspace collaborators)
      const users: User[] = [];
      
      // Add self
      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('id, firstname, lastname, email')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          users.push(profile);
        }
      }
      
      // Add kosmamedia
      const { data: kosmamedia } = await supabase
        .from('users')
        .select('id, firstname, lastname, email')
        .ilike('email', '%kosmamedia%')
        .limit(1)
        .maybeSingle();
      
      if (kosmamedia && kosmamedia.id !== user?.id) {
        users.push(kosmamedia);
      }
      
      // Add workspace members (collaborators invited by this user)
      const { data: members } = await supabase
        .from('workspace_members')
        .select('user_id, users!workspace_members_user_id_fkey(id, firstname, lastname, email)')
        .eq('workspace_owner_id', user?.id)
        .eq('status', 'active');
      
      if (members) {
        members.forEach((member: { user_id: string; users: User[] }) => {
          const userData = member.users?.[0]; // Supabase returns array
          if (userData && !users.find(u => u.id === userData.id)) {
            users.push(userData);
          }
        });
      }
      
      setAvailableUsers(users);
      
      // 2. Load existing automation settings
      const { data: settings } = await supabase
        .from('automation_settings')
        .select('*')
        .eq('user_id', user?.id)
        .is('workspace_owner_id', null);
      
      if (settings) {
        const ideaSetting = settings.find(s => s.trigger_status === 'Idee');
        const waitingSetting = settings.find(s => s.trigger_status === 'Warten auf Aufnahme');
        
        if (ideaSetting) {
          setIdeaSettings(ideaSetting);
        }
        if (waitingSetting) {
          setWaitingSettings(waitingSetting);
        }
      }
      
    } catch (error) {
      console.error('[Automation Settings] Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setSaved(false);
      
      // Save or update settings for "Idee"
      if (ideaSettings.assigned_person_id) {
        if (ideaSettings.id) {
          await supabase
            .from('automation_settings')
            .update({
              assigned_person_id: ideaSettings.assigned_person_id,
              updated_at: new Date().toISOString()
            })
            .eq('id', ideaSettings.id);
        } else {
          await supabase
            .from('automation_settings')
            .insert({
              user_id: user?.id,
              trigger_status: 'Idee',
              assigned_person_id: ideaSettings.assigned_person_id
            });
        }
      } else if (ideaSettings.id) {
        // Delete if no person assigned
        await supabase
          .from('automation_settings')
          .delete()
          .eq('id', ideaSettings.id);
      }
      
      // Save or update settings for "Warten auf Aufnahme"
      if (waitingSettings.assigned_person_id) {
        if (waitingSettings.id) {
          await supabase
            .from('automation_settings')
            .update({
              assigned_person_id: waitingSettings.assigned_person_id,
              updated_at: new Date().toISOString()
            })
            .eq('id', waitingSettings.id);
        } else {
          await supabase
            .from('automation_settings')
            .insert({
              user_id: user?.id,
              trigger_status: 'Warten auf Aufnahme',
              assigned_person_id: waitingSettings.assigned_person_id
            });
        }
      } else if (waitingSettings.id) {
        // Delete if no person assigned
        await supabase
          .from('automation_settings')
          .delete()
          .eq('id', waitingSettings.id);
      }
      
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 1500);
      
      // Reload settings
      await loadSettings();
      
    } catch (error) {
      console.error('[Automation Settings] Save error:', error);
    } finally {
      setSaving(false);
    }
  };

  const getUserDisplayName = (userId: string | null) => {
    if (!userId) return 'Keine Automatisierung';
    const user = availableUsers.find(u => u.id === userId);
    if (!user) return 'Unbekannt';
    
    if (user.firstname && user.lastname) {
      return `${user.firstname} ${user.lastname}`;
    }
    return user.email.split('@')[0];
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-neutral-800">
            <h2 className="text-xl font-semibold text-white">Automatisierung konfigurieren</h2>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(80vh-180px)]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
            ) : (
              <>
                {/* Info Box */}
                <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-sm text-blue-200">
                    <strong>ℹ️ Hinweis:</strong> Für die Status <strong>&quot;In Bearbeitung (Schnitt)&quot;</strong>, <strong>&quot;Schnitt abgeschlossen&quot;</strong> und <strong>&quot;Hochgeladen&quot;</strong> wird automatisch <strong>kosmamedia</strong> zugewiesen.
                  </p>
                </div>

                {/* Settings */}
                <div className="space-y-6">
                  {/* Idee */}
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-white">
                      Status: Idee
                    </label>
                    <p className="text-sm text-neutral-400">
                      Wer soll automatisch zugewiesen werden?
                    </p>
                    <select
                      value={ideaSettings.assigned_person_id || ''}
                      onChange={(e) => setIdeaSettings({ ...ideaSettings, assigned_person_id: e.target.value || null })}
                      className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    >
                      <option value="">Keine Automatisierung</option>
                      {availableUsers.map(user => (
                        <option key={user.id} value={user.id}>
                          {getUserDisplayName(user.id)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Warten auf Aufnahme */}
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-white">
                      Status: Warten auf Aufnahme
                    </label>
                    <p className="text-sm text-neutral-400">
                      Wer soll automatisch zugewiesen werden?
                    </p>
                    <select
                      value={waitingSettings.assigned_person_id || ''}
                      onChange={(e) => setWaitingSettings({ ...waitingSettings, assigned_person_id: e.target.value || null })}
                      className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    >
                      <option value="">Keine Automatisierung</option>
                      {availableUsers.map(user => (
                        <option key={user.id} value={user.id}>
                          {getUserDisplayName(user.id)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-neutral-800">
            <button
              onClick={onClose}
              className="px-4 py-2 text-neutral-400 hover:text-white transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Speichert...</span>
                </>
              ) : saved ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Gespeichert!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Speichern</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

