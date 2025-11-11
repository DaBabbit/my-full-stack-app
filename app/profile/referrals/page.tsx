'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import TopBar from '@/components/TopBar';
import { 
  ArrowLeft, 
  Users, 
  CheckCircle, 
  Clock, 
  Gift,
  Copy
} from 'lucide-react';

interface ReferredUser {
  id: string;
  name: string;
  email: string;
}

interface Referral {
  id: string;
  referralCode: string;
  status: 'pending' | 'completed' | 'rewarded' | 'expired';
  firstPaymentReceived: boolean;
  rewardAmount: number;
  createdAt: string;
  completedAt: string | null;
  rewardedAt: string | null;
  referredUser: ReferredUser | null;
}

export default function ReferralsPage() {
  const { user, supabase } = useAuth();
  const router = useRouter();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    const fetchReferrals = async () => {
      try {
        console.log('[Referrals Page] Fetching referrals for user:', user?.id);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.log('[Referrals Page] No session found');
          return;
        }

        console.log('[Referrals Page] Calling API...');
        const response = await fetch('/api/referrals/list', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        console.log('[Referrals Page] API response status:', response.status);

        if (response.ok) {
          const data = await response.json();
          console.log('[Referrals Page] API data:', data);
          console.log('[Referrals Page] Referrals count:', data.referrals?.length || 0);
          setReferrals(data.referrals);
        } else {
          const errorText = await response.text();
          console.error('[Referrals Page] API error:', response.status, errorText);
        }
      } catch (error) {
        console.error('[Referrals Page] Error fetching referrals:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReferrals();

    // Setup Realtime subscription for referrals updates
    console.log('[Referrals Page] Setting up Realtime subscription');
    const channel = supabase
      .channel('referrals_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'referrals',
          filter: `referrer_user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[Referrals Page] Realtime update:', payload);
          // Refetch referrals when any change occurs
          fetchReferrals();
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      console.log('[Referrals Page] Cleaning up Realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [user, router, supabase]);

  const copyReferralCode = (code: string) => {
    const referralLink = `${window.location.origin}/signup?ref=${code}`;
    navigator.clipboard.writeText(referralLink);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getStatusBadge = (status: Referral['status']) => {
    const configs = {
      pending: {
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-500/30',
        text: 'text-yellow-300',
        icon: Clock,
        label: 'Link erstellt - Wartet auf Registrierung'
      },
      completed: {
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/30',
        text: 'text-blue-300',
        icon: CheckCircle,
        label: 'Registriert - Abo-Abschluss ausstehend'
      },
      rewarded: {
        bg: 'bg-green-500/10',
        border: 'border-green-500/30',
        text: 'text-green-300',
        icon: Gift,
        label: '250€ Rabatt wird bei nächster Rechnung angewendet'
      },
      expired: {
        bg: 'bg-neutral-500/10',
        border: 'border-neutral-500/30',
        text: 'text-neutral-400',
        icon: Clock,
        label: 'Abgelaufen'
      }
    };

    const config = configs[status];
    const Icon = config.icon;

    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${config.bg} ${config.border}`}>
        <Icon className={`w-4 h-4 ${config.text}`} />
        <span className={`text-xs font-medium ${config.text}`}>{config.label}</span>
      </div>
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount / 100);
  };

  const successfulReferrals = referrals.filter(r => r.status === 'rewarded').length;
  const totalRewards = referrals
    .filter(r => r.status === 'rewarded')
    .reduce((sum, r) => sum + r.rewardAmount, 0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Lade Empfehlungen...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <TopBar />
      <div className="p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.push('/profile')}
              className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Zurück zum Profil
            </button>

          <div className="flex items-center gap-3 mb-4">
            <Users className="w-8 h-8 text-blue-500" />
            <h1 className="text-3xl font-bold">Geworbene Freunde</h1>
          </div>

          <p className="text-neutral-400">
            Empfehle Freunde und erhalte{' '}
            <span className="text-blue-400 font-semibold">250€ Rabatt</span> auf
            deine nächste Rechnung, wenn dein Freund sein erstes Abo bezahlt.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-neutral-900/50 border border-neutral-700 rounded-2xl p-6"
          >
            <div className="text-neutral-400 text-sm mb-2">Gesamt Empfehlungen</div>
            <div className="text-3xl font-bold">{referrals.length}</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-neutral-900/50 border border-neutral-700 rounded-2xl p-6"
          >
            <div className="text-neutral-400 text-sm mb-2">Erfolgreich</div>
            <div className="text-3xl font-bold text-green-400">{successfulReferrals}</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-neutral-900/50 border border-neutral-700 rounded-2xl p-6"
          >
            <div className="text-neutral-400 text-sm mb-2">Gesamte Belohnungen</div>
            <div className="text-3xl font-bold text-blue-400">{formatAmount(totalRewards)}</div>
          </motion.div>
        </div>

        {/* Referrals List */}
        <div className="bg-neutral-900/50 border border-neutral-700 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-neutral-700">
            <h2 className="text-xl font-semibold">Alle Empfehlungen</h2>
          </div>

          {referrals.length === 0 ? (
            <div className="p-12 text-center text-neutral-400">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Du hast noch keine Freunde geworben.</p>
              <p className="text-sm mt-2">Erstelle einen Empfehlungslink in deinem Profil.</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-700">
              {referrals.map((referral) => (
                <motion.div
                  key={referral.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-6 hover:bg-neutral-800/50 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <code className="px-2 py-1 bg-neutral-800 rounded text-sm font-mono">
                          {referral.referralCode}
                        </code>
                        <button
                          onClick={() => copyReferralCode(referral.referralCode)}
                          className="p-1 hover:bg-neutral-700 rounded transition-colors"
                          title="Link kopieren"
                        >
                          {copiedCode === referral.referralCode ? (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4 text-neutral-400" />
                          )}
                        </button>
                      </div>

                      {referral.referredUser ? (
                        <div className="text-neutral-400 text-sm mb-2">
                          Geworben: <span className="text-white">{referral.referredUser.name || referral.referredUser.email}</span>
                        </div>
                      ) : (
                        <div className="text-neutral-500 text-sm mb-2">
                          Noch nicht verwendet
                        </div>
                      )}

                      <div className="text-neutral-500 text-xs">
                        Erstellt am {formatDate(referral.createdAt)}
                        {referral.completedAt && ` • Abgeschlossen am ${formatDate(referral.completedAt)}`}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      {getStatusBadge(referral.status)}
                      {referral.status === 'completed' && referral.referredUser && (
                        <div className="text-xs text-neutral-400 text-right max-w-[200px]">
                          Sobald <span className="text-white">{referral.referredUser.name.split(' ')[0]}</span> ein Abo abschließt, erhältst du 250€ Rabatt
                        </div>
                      )}
                      {referral.status === 'rewarded' && (
                        <div className="text-sm text-green-400 font-medium">
                          +{formatAmount(referral.rewardAmount)} Rabatt erhalten!
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

