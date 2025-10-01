import { useSubscription } from '@/hooks/useSubscription';
import { useRouter } from 'next/navigation';

export function SubscriptionStatus() {
  const { subscription, currentSubscription, isLoading, error } = useSubscription();
  const router = useRouter();

  if (isLoading) {
    return <div className="animate-pulse">Subscription-Status wird überprüft...</div>;
  }

  if (error) {
    return <div className="text-red-500">Fehler beim Überprüfen des Subscription-Status: {error}</div>;
  }

  // Show active subscription
  if (subscription?.status === 'active' || subscription?.status === 'trialing') {
    return (
      <div className="text-center space-y-4">
        <div className="bg-green-100 text-green-800 p-4 rounded-lg">
          Sie haben ein aktives Abonnement!
        </div>
        <button
          onClick={() => router.push('/profile')}
          className="bg-primary hover:bg-primary-darker text-white px-6 py-2 rounded-lg"
        >
          Abonnement-Details anzeigen
        </button>
      </div>
    );
  }

  // Show canceled subscription that's still active until period end
  if (currentSubscription?.cancel_at_period_end && 
      currentSubscription?.status === 'active' &&
      new Date(currentSubscription.current_period_end) > new Date()) {
    const endDate = new Date(currentSubscription.current_period_end).toLocaleDateString('de-DE');
    return (
      <div className="text-center space-y-4">
        <div className="bg-orange-100 text-orange-800 p-4 rounded-lg">
          <div className="font-semibold">Ihr Abonnement wurde gekündigt</div>
          <div className="text-sm mt-1">
            Sie haben noch bis zum {endDate} Zugriff auf alle Premium-Funktionen.
          </div>
        </div>
        <button
          onClick={() => router.push('/profile')}
          className="bg-primary hover:bg-primary-darker text-white px-6 py-2 rounded-lg"
        >
          Abonnement-Details anzeigen
        </button>
      </div>
    );
  }

  return null;
} 