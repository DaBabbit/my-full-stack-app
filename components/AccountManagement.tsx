import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { User, Mail, Lock, Check } from 'lucide-react';

export function AccountManagement() {
  const { user, signOut, supabase, updateUserProfile } = useAuth();
  const router = useRouter();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [hasExistingName, setHasExistingName] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Check if user signed in with OAuth
  const isOAuthUser = user?.app_metadata?.provider === 'google';

  // Load user profile data
  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('users')
          .select('firstname, lastname')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error loading profile:', error);
          return;
        }

        if (data?.firstname && data?.lastname) {
          setFirstname(data.firstname);
          setLastname(data.lastname);
          setHasExistingName(true);
        } else {
          setIsEditing(true); // Allow editing if no name exists
        }
      } catch (err) {
        console.error('Error:', err);
      }
    };

    loadProfile();
  }, [user?.id, supabase]);

  const handleSaveName = async () => {
    if (!firstname.trim() || !lastname.trim()) {
      setError('Bitte gib Vor- und Nachnamen ein.');
      return;
    }

    if (firstname.trim().length < 2 || lastname.trim().length < 2) {
      setError('Vor- und Nachname müssen mindestens 2 Zeichen lang sein.');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      await updateUserProfile(firstname, lastname);
      setHasExistingName(true);
      setIsEditing(false);
    } catch (err) {
      console.error('Error saving name:', err);
      setError('Fehler beim Speichern. Bitte versuche es erneut.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/user/delete?userId=${user.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete account');
      }
      
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Delete account error:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-neutral-900/50 backdrop-blur-md rounded-3xl border border-neutral-700 p-6 mb-8">
      <h2 className="text-xl font-semibold mb-6 text-white">Profileinstellungen</h2>
      
      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-xl text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* User Information */}
      <div className="space-y-4">
        {/* Vorname */}
        <div>
          <label className="block text-sm font-medium text-neutral-400 mb-2">
            Vorname
          </label>
          {isEditing && !hasExistingName ? (
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-neutral-400" />
              </div>
              <input
                type="text"
                value={firstname}
                onChange={(e) => setFirstname(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-neutral-800/50 border border-neutral-700 rounded-xl text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-white focus:border-white transition-all"
                placeholder="Max"
                disabled={isSaving}
              />
            </div>
          ) : (
            <div className="flex items-center px-4 py-3 bg-neutral-800/30 border border-neutral-700/50 rounded-xl">
              <User className="h-5 w-5 text-neutral-400 mr-3" />
              <span className="text-white">{firstname || '-'}</span>
              {hasExistingName && (
                <Check className="h-4 w-4 text-green-400 ml-auto" />
              )}
            </div>
          )}
        </div>

        {/* Nachname */}
        <div>
          <label className="block text-sm font-medium text-neutral-400 mb-2">
            Nachname
          </label>
          {isEditing && !hasExistingName ? (
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-neutral-400" />
              </div>
              <input
                type="text"
                value={lastname}
                onChange={(e) => setLastname(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-neutral-800/50 border border-neutral-700 rounded-xl text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-white focus:border-white transition-all"
                placeholder="Mustermann"
                disabled={isSaving}
              />
            </div>
          ) : (
            <div className="flex items-center px-4 py-3 bg-neutral-800/30 border border-neutral-700/50 rounded-xl">
              <User className="h-5 w-5 text-neutral-400 mr-3" />
              <span className="text-white">{lastname || '-'}</span>
              {hasExistingName && (
                <Check className="h-4 w-4 text-green-400 ml-auto" />
              )}
            </div>
          )}
        </div>

        {/* Save Button (only show if editing and no existing name) */}
        {isEditing && !hasExistingName && (
          <button
            onClick={handleSaveName}
            disabled={isSaving}
            className="w-full px-6 py-3 bg-white hover:bg-neutral-100 text-black rounded-xl font-medium transition-all duration-300 hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Wird gespeichert...' : 'Namen speichern'}
          </button>
        )}

        {/* Info text if name already set */}
        {hasExistingName && (
          <p className="text-xs text-neutral-500 mt-2">
            Dein Name kann aus Sicherheitsgründen nicht mehr geändert werden.
          </p>
        )}

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-neutral-400 mb-2">
            E-Mail
          </label>
          <div className="flex items-center px-4 py-3 bg-neutral-800/30 border border-neutral-700/50 rounded-xl">
            <Mail className="h-5 w-5 text-neutral-400 mr-3" />
            <span className="text-white">{user?.email}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 pt-6 border-t border-neutral-700">
        {!isOAuthUser && (
          <button
            onClick={() => router.push(`/reset-password?email=${encodeURIComponent(user?.email || '')}`)}
            className="w-full flex items-center justify-center px-6 py-3 bg-neutral-800 hover:bg-white hover:text-black text-white rounded-xl font-medium transition-all duration-300 border border-neutral-700 hover:border-white hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]"
          >
            <Lock className="w-5 h-5 mr-2" />
            Passwort zurücksetzen
          </button>
        )}
      </div>

      {/* Delete Account Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900/50 backdrop-blur-md rounded-3xl p-6 max-w-md w-full border border-neutral-700">
            <h3 className="text-xl font-semibold mb-4 text-white">Delete Account?</h3>
            <p className="text-neutral-400 mb-6">
              This action cannot be undone. All your data will be permanently deleted.
            </p>
            {error && (
              <p className="text-white mb-4">{error}</p>
            )}
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-neutral-400 hover:bg-neutral-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isLoading}
                className="px-4 py-2 bg-neutral-800 hover:bg-white hover:text-black text-white rounded-lg disabled:opacity-50 transition-all duration-300 border border-neutral-700 hover:border-white hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]"
              >
                {isLoading ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 