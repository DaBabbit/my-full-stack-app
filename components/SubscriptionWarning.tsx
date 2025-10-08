'use client';

import { AlertTriangle, CreditCard, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';
import SubscriptionStatusSkeleton from './SubscriptionStatusSkeleton';

interface SubscriptionWarningProps {
  className?: string;
}

export default function SubscriptionWarning({ className = '' }: SubscriptionWarningProps) {
  const router = useRouter();
  const { hasActiveSubscription, subscriptionStatus, isLoading } = usePermissions();

  // Show skeleton while loading
  if (isLoading) {
    return <SubscriptionStatusSkeleton />;
  }

  // Don't show warning if user has active subscription
  if (hasActiveSubscription) {
    return null;
  }

  const getWarningContent = () => {
    switch (subscriptionStatus) {
      case 'expired':
        return {
          icon: AlertTriangle,
          title: 'Abonnement abgelaufen',
          message: 'Ihr Abonnement ist abgelaufen. Reaktivieren Sie es, um wieder Videos erstellen und bearbeiten zu können.',
          buttonText: 'Abonnement reaktivieren',
          buttonIcon: CreditCard
        };
      case 'none':
      default:
        return {
          icon: Zap,
          title: 'Abonnement erforderlich',
          message: 'Sie können Videos anzeigen, aber zum Erstellen und Bearbeiten benötigen Sie ein aktives Abonnement.',
          buttonText: 'Jetzt upgraden',
          buttonIcon: Zap
        };
    }
  };

  const warning = getWarningContent();
  const Icon = warning.icon;
  const ButtonIcon = warning.buttonIcon;

  return (
    <div className={`bg-red-900/20 border border-red-500/30 rounded-2xl p-4 md:p-6 backdrop-blur-sm ${className}`}>
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <div className="p-3 bg-red-500/20 rounded-xl">
            <Icon className="w-6 h-6 text-red-400" />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-red-300 mb-2">
            {warning.title}
          </h3>
          <p className="text-red-200 text-sm md:text-base mb-4">
            {warning.message}
          </p>
          
          <button
            onClick={() => router.push('/pay')}
            className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-medium transition-all duration-300 hover:shadow-[0_0_20px_rgba(239,68,68,0.3)] text-sm md:text-base"
          >
            <ButtonIcon className="w-4 h-4 mr-2" />
            {warning.buttonText}
          </button>
        </div>
      </div>
    </div>
  );
}
