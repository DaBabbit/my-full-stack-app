'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import TopBar from '@/components/TopBar';
import { motion } from 'framer-motion';
import { Zap, Save, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';

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

export default function AutomationSettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
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
    if (!user) {
      router.push('/login');
      return;
    }
    
    loadSettings();
  }, [user, router]);

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
        members.forEach((member: any) => {
          if (member.users && !users.find(u => u.id === member.users.id)) {
            users.push(member.users);
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
      setTimeout(() => setSaved(false), 3000);
      
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

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      <TopBar />
      
      <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            onClick={() => router.push('/profile')}
            className="flex items-center gap-2 text-neutral-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Zurück zum Profil</span>
          </button>
          
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl flex items-center justify-center border border-blue-500/30">
              <Zap className="w-6 h-6 text-blue-400" strokeWidth={2} />
            </div>
            <h1 className="text-3xl font-bold text-white">Automatisierung</h1>
          </div>
          
          <p className="text-neutral-400 mt-2">
            Lege fest, wer automatisch als zuständige Person zugewiesen wird, wenn ein Video in einen bestimmten Status wechselt.
          </p>
        </motion.div>

        {/* Info Box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl"
        >
          <p className="text-sm text-blue-200">
            <strong>ℹ️ Hinweis:</strong> Für die Status <strong>&quot;In Bearbeitung (Schnitt)&quot;</strong>, <strong>&quot;Schnitt abgeschlossen&quot;</strong> und <strong>&quot;Hochgeladen&quot;</strong> wird automatisch <strong>kosmamedia</strong> zugewiesen. Diese Einstellungen können nicht geändert werden.
          </p>
        </motion.div>

        {/* Settings Cards */}
        <div className="space-y-6">
          {/* Idee */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6"
          >
            <h3 className="text-lg font-semibold text-white mb-2">
              Status: Idee
            </h3>
            <p className="text-sm text-neutral-400 mb-4">
              Wer soll automatisch zugewiesen werden, wenn ein Video auf &quot;Idee&quot; gesetzt wird?
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
          </motion.div>

          {/* Warten auf Aufnahme */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6"
          >
            <h3 className="text-lg font-semibold text-white mb-2">
              Status: Warten auf Aufnahme
            </h3>
            <p className="text-sm text-neutral-400 mb-4">
              Wer soll automatisch zugewiesen werden, wenn ein Video auf &quot;Warten auf Aufnahme&quot; gesetzt wird?
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
          </motion.div>
        </div>

        {/* Save Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 flex items-center gap-4"
        >
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-xl transition-all font-semibold shadow-lg hover:shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Speichert...</span>
              </>
            ) : saved ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>Gespeichert!</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>Einstellungen speichern</span>
              </>
            )}
          </button>
        </motion.div>
      </div>
    </div>
  );
}

