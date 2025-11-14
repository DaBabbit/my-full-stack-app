'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Loader2 } from 'lucide-react';

interface AutomationSettings {
  id?: string;
  user_id?: string;
  workspace_owner_id?: string | null;
  auto_assign_on_idea: string | null;
  auto_assign_on_waiting_for_recording: string | null;
  created_at?: string;
  updated_at?: string;
}


interface AutomationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void; // Callback für Toast
}

interface AvailablePerson {
  id: string;
  name: string;
  type: 'none' | 'owner' | 'member';
}

export function AutomationSettingsModal({ isOpen, onClose, onSuccess }: AutomationSettingsModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Available persons for assignment
  const [availablePersons, setAvailablePersons] = useState<AvailablePerson[]>([]);
  
  // Settings (one row per user)
  const [settings, setSettings] = useState<AutomationSettings>({
    auto_assign_on_idea: null,
    auto_assign_on_waiting_for_recording: null
  });

  // Body scroll lock - Verhindert Hintergrund-Scrollen
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = `-${scrollY}px`;

      return () => {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.top = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      
      // 1. Load available persons (Keine Automatisierung + kosmamedia + owner + ALL workspace members)
      const persons: AvailablePerson[] = [];
      const addedIds = new Set<string>();
      let kosmamediaId: string | null = null;
      
      // Add "Keine Automatisierung" option
      persons.push({
        id: '',
        name: 'Keine Automatisierung',
        type: 'none'
      });
      
      // Load workspace members to find kosmamedia
      const { data: members } = await supabase
        .from('workspace_members')
        .select('id, user_id, invitation_email')
        .eq('workspace_owner_id', user?.id)
        .eq('status', 'active');
      
      // Find kosmamedia ID
      if (members && Array.isArray(members)) {
        for (const member of members) {
          if (!member.user_id) continue;
          try {
            const { data: userData } = await supabase
              .from('users')
              .select('id, email')
              .eq('id', member.user_id)
              .single();
            
            if (userData && userData.email?.toLowerCase().includes('kosmamedia')) {
              kosmamediaId = userData.id;
              break;
            }
          } catch (err) {
            console.error('[AutomationSettings] Error checking member:', err);
          }
        }
      }
      
      // Add kosmamedia FIRST (if found)
      if (kosmamediaId) {
        persons.push({
          id: kosmamediaId,
          name: 'kosmamedia',
          type: 'member'
        });
        addedIds.add(kosmamediaId);
      }
      
      // Add self (owner) SECOND
      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('id, firstname, lastname, email')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          const displayName = profile.firstname && profile.lastname 
            ? `${profile.firstname} ${profile.lastname}` 
            : profile.email.split('@')[0];
          persons.push({
            id: profile.id,
            name: displayName,
            type: 'owner'
          });
          addedIds.add(profile.id);
        }
      }
      
      // Add ALL other workspace members with their REAL names
      if (members && Array.isArray(members)) {
        for (const member of members) {
          if (!member.user_id || addedIds.has(member.user_id)) continue;
          
          try {
            // Fetch user details separately
            const { data: userData } = await supabase
              .from('users')
              .select('id, email, firstname, lastname')
              .eq('id', member.user_id)
              .single();
            
            if (userData && userData.id) {
              const displayName = userData.firstname && userData.lastname 
                ? `${userData.firstname} ${userData.lastname}` 
                : userData.email?.split('@')[0] || member.invitation_email?.split('@')[0] || 'Unbekannt';
              
              persons.push({
                id: userData.id,
                name: displayName,
                type: 'member'
              });
              addedIds.add(userData.id);
            }
          } catch (err) {
            // Fallback: use invitation_email if user data fetch fails
            if (member.invitation_email) {
              persons.push({
                id: member.user_id,
                name: member.invitation_email.split('@')[0],
                type: 'member'
              });
              addedIds.add(member.user_id);
            }
            console.error('[AutomationSettings] Error fetching user for member:', member.user_id, err);
          }
        }
      }
      
      console.log('[AutomationSettings] ✅ Available persons:', persons.length, persons);
      setAvailablePersons(persons);
      
      // 2. Load existing automation settings
      const { data: existingSettings } = await supabase
        .from('automation_settings')
        .select('*')
        .eq('user_id', user?.id)
        .is('workspace_owner_id', null)
        .maybeSingle();
      
      console.log('[AutomationSettings] Existing settings:', existingSettings);
      
      if (existingSettings) {
        setSettings(existingSettings);
      }
      
    } catch (error) {
      console.error('[Automation Settings] Load error:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user || !isOpen) return;
    
    loadSettings();
  }, [user, isOpen, loadSettings]);

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Upsert settings (insert or update)
      if (settings.id) {
        // Update existing
        const { error } = await supabase
          .from('automation_settings')
          .update({
            auto_assign_on_idea: settings.auto_assign_on_idea || null,
            auto_assign_on_waiting_for_recording: settings.auto_assign_on_waiting_for_recording || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', settings.id);
        
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('automation_settings')
          .insert({
            user_id: user?.id,
            workspace_owner_id: null, // null = eigene Videos
            auto_assign_on_idea: settings.auto_assign_on_idea || null,
            auto_assign_on_waiting_for_recording: settings.auto_assign_on_waiting_for_recording || null
          });
        
        if (error) throw error;
      }
      
      // Sofort schließen und Toast anzeigen
      onClose();
      if (onSuccess) {
        onSuccess('Automatisierung erfolgreich gespeichert');
      }
      
    } catch (error) {
      console.error('[Automation Settings] Save error:', error);
      if (onSuccess) {
        onSuccess('Fehler beim Speichern der Automatisierung');
      }
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
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
                      value={settings.auto_assign_on_idea || ''}
                      onChange={(e) => setSettings({ ...settings, auto_assign_on_idea: e.target.value || null })}
                      className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer"
                    >
                      {availablePersons.map(person => (
                        <option key={person.id} value={person.id}>
                          {person.name}
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
                      value={settings.auto_assign_on_waiting_for_recording || ''}
                      onChange={(e) => setSettings({ ...settings, auto_assign_on_waiting_for_recording: e.target.value || null })}
                      className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer"
                    >
                      {availablePersons.map(person => (
                        <option key={person.id} value={person.id}>
                          {person.name}
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
        </>
      )}
    </AnimatePresence>
  );
}

