'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  CreditCard, 
  PauseCircle, 
  XCircle,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function ManageSubscriptionPage() {
  const { user } = useAuth();
  const { subscription, currentSubscription, fetchSubscription } = useSubscription();
  const router = useRouter();
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isPauseModalOpen, setIsPauseModalOpen] = useState(false);
  const [isPausing, setIsPausing] = useState(false);

  const handleOpenCustomerPortal = async () => {
    try {
      const response = await fetch('/api/stripe/customer-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        window.location.href = data.url;
      } else {
        toast.error('Fehler beim Öffnen des Kundenportals', {
          position: "top-right",
          autoClose: 3000,
          theme: "dark"
        });
      }
    } catch (err) {
      console.error('Customer portal error:', err);
      toast.error('Netzwerkfehler', {
        position: "top-right",
        autoClose: 3000,
        theme: "dark"
      });
    }
  };

  const handlePauseSubscription = async () => {
    if (!subscription?.stripe_subscription_id) return;

    setIsPausing(true);
    try {
      const response = await fetch('/api/stripe/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId: subscription.stripe_subscription_id }),
      });

      if (response.ok) {
        toast.success('Abonnement erfolgreich pausiert!', {
          position: "top-right",
          autoClose: 3000,
          theme: "dark"
        });
        await fetchSubscription();
        setIsPauseModalOpen(false);
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        const data = await response.json();
        toast.error(data.error || 'Fehler beim Pausieren', {
          position: "top-right",
          autoClose: 3000,
          theme: "dark"
        });
      }
    } catch (err) {
      console.error('Pause subscription error:', err);
      toast.error('Netzwerkfehler', {
        position: "top-right",
        autoClose: 3000,
        theme: "dark"
      });
    } finally {
      setIsPausing(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!subscription?.stripe_subscription_id) return;

    setIsCancelling(true);
    try {
      const response = await fetch('/api/stripe/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId: subscription.stripe_subscription_id }),
      });

      if (response.ok) {
        toast.success('Abonnement erfolgreich gekündigt!', {
          position: "top-right",
          autoClose: 3000,
          theme: "dark"
        });
        await fetchSubscription();
        setIsCancelModalOpen(false);
        setTimeout(() => {
          router.push('/profile');
        }, 1500);
      } else {
        const data = await response.json();
        toast.error(data.error || 'Fehler beim Kündigen', {
          position: "top-right",
          autoClose: 3000,
          theme: "dark"
        });
      }
    } catch (err) {
      console.error('Cancel subscription error:', err);
      toast.error('Netzwerkfehler', {
        position: "top-right",
        autoClose: 3000,
        theme: "dark"
      });
    } finally {
      setIsCancelling(false);
    }
  };

  if (!user) {
    router.push('/login');
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-black text-white pt-24">
      <ToastContainer />
      
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="mb-6 flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Zurück</span>
        </button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold mb-2">Abo verwalten</h1>
          <p className="text-neutral-400">Verwalte dein Abonnement und Zahlungen</p>
        </motion.div>

        {/* Subscription Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-neutral-900/50 backdrop-blur-md rounded-3xl p-6 border border-neutral-700 mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-3 ${
                currentSubscription?.status === 'active' ? 'bg-green-400' : 
                currentSubscription?.status === 'canceled' ? 'bg-red-400' : 'bg-yellow-400'
              }`} />
              <div>
                <p className="text-white font-medium text-lg">
                  Status: <span className="capitalize">{currentSubscription?.status || 'Unbekannt'}</span>
                </p>
                <p className="text-sm text-neutral-400">Plan: Premium</p>
              </div>
            </div>
            {currentSubscription?.status === 'active' && !currentSubscription.cancel_at_period_end && (
              <CheckCircle className="w-8 h-8 text-green-400" />
            )}
          </div>

          {currentSubscription?.current_period_end && (
            <div className="p-4 bg-neutral-800/50 rounded-2xl">
              <p className="text-white font-medium">
                {currentSubscription?.cancel_at_period_end ? "Ende Abrechnungszeitraum" : "Nächste Abrechnung"}
              </p>
              <p className="text-neutral-400">
                {new Date(currentSubscription.current_period_end).toLocaleDateString('de-DE')}
              </p>
            </div>
          )}
        </motion.div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Plan ändern */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.02 }}
            className="bg-neutral-900/50 backdrop-blur-md rounded-3xl p-6 border border-neutral-700 hover:border-blue-500/50 transition-all duration-300 cursor-pointer"
            onClick={handleOpenCustomerPortal}
          >
            <div className="p-3 bg-blue-500/20 rounded-2xl w-fit mb-4">
              <CreditCard className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Plan ändern</h3>
            <p className="text-neutral-400 mb-4">
              Wechsle zu einem anderen Plan oder aktualisiere deine Zahlungsmethode
            </p>
            <div className="flex items-center text-blue-400 text-sm font-medium">
              <span>Zum Kundenportal</span>
              <ExternalLink className="w-4 h-4 ml-2" />
            </div>
          </motion.div>

          {/* Abo pausieren */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 1.02 }}
            className="bg-neutral-900/50 backdrop-blur-md rounded-3xl p-6 border border-neutral-700 hover:border-yellow-500/50 transition-all duration-300 cursor-pointer"
            onClick={() => setIsPauseModalOpen(true)}
          >
            <div className="p-3 bg-yellow-500/20 rounded-2xl w-fit mb-4">
              <PauseCircle className="w-6 h-6 text-yellow-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Abo pausieren</h3>
            <p className="text-neutral-400 mb-4">
              Pausiere dein Abo vorübergehend ohne es komplett zu kündigen
            </p>
            <div className="flex items-center text-yellow-400 text-sm font-medium">
              <span>Pausieren</span>
              <RefreshCw className="w-4 h-4 ml-2" />
            </div>
          </motion.div>

          {/* Abo kündigen */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            whileHover={{ scale: 1.02 }}
            className="bg-neutral-900/50 backdrop-blur-md rounded-3xl p-6 border border-neutral-700 hover:border-red-500/50 transition-all duration-300 cursor-pointer"
            onClick={() => setIsCancelModalOpen(true)}
          >
            <div className="p-3 bg-red-500/20 rounded-2xl w-fit mb-4">
              <XCircle className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Abo kündigen</h3>
            <p className="text-neutral-400 mb-4">
              Kündige dein Abonnement zum Ende des aktuellen Abrechnungszeitraums
            </p>
            <div className="flex items-center text-red-400 text-sm font-medium">
              <span>Kündigen</span>
              <AlertTriangle className="w-4 h-4 ml-2" />
            </div>
          </motion.div>
        </div>

        {/* Info Box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-neutral-300">
              <p className="font-medium text-blue-400 mb-1">Wichtige Informationen</p>
              <ul className="list-disc list-inside space-y-1 text-neutral-400">
                <li>Änderungen am Abo werden sofort wirksam oder zum nächsten Abrechnungszeitraum</li>
                <li>Bei Kündigung behältst du Zugriff bis zum Ende des bezahlten Zeitraums</li>
                <li>Pausierte Abos können jederzeit wieder aktiviert werden</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Pause Modal */}
      {isPauseModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-neutral-900 rounded-3xl p-6 max-w-md w-full border border-yellow-500/20"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-yellow-500/20 rounded-xl">
                <PauseCircle className="w-6 h-6 text-yellow-400" />
              </div>
              <h3 className="text-xl font-semibold text-white">Abo pausieren?</h3>
            </div>
            
            <p className="text-neutral-400 mb-6">
              Dein Abonnement wird pausiert. Du behältst Zugriff bis zum Ende des aktuellen Abrechnungszeitraums.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setIsPauseModalOpen(false)}
                disabled={isPausing}
                className="flex-1 p-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-2xl transition-all duration-300 disabled:opacity-50"
              >
                Abbrechen
              </button>
              <button
                onClick={handlePauseSubscription}
                disabled={isPausing}
                className="flex-1 p-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-2xl transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isPausing ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    <span>Pausiere...</span>
                  </>
                ) : (
                  <span>Pausieren</span>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Cancel Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-neutral-900 rounded-3xl p-6 max-w-md w-full border border-red-500/20"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-500/20 rounded-xl">
                <XCircle className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-xl font-semibold text-white">Abo kündigen?</h3>
            </div>
            
            <p className="text-neutral-400 mb-6">
              Bist du sicher, dass du dein Abonnement kündigen möchtest? Du behältst Zugriff bis zum Ende des aktuellen Abrechnungszeitraums.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setIsCancelModalOpen(false)}
                disabled={isCancelling}
                className="flex-1 p-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-2xl transition-all duration-300 disabled:opacity-50"
              >
                Abbrechen
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={isCancelling}
                className="flex-1 p-3 bg-red-500 hover:bg-red-600 text-white rounded-2xl transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isCancelling ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    <span>Kündige...</span>
                  </>
                ) : (
                  <span>Kündigen</span>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

