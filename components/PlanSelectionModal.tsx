'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Sparkles } from 'lucide-react';
import { PLANS, Plan } from '@/config/plans';

interface PlanSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PlanSelectionModal({
  isOpen,
  onClose,
  onSuccess,
}: PlanSelectionModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isLoadingIframe, setIsLoadingIframe] = useState(false);
  const [showFallbackButton, setShowFallbackButton] = useState(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedPlan(null);
      setIsLoadingIframe(false);
      setShowFallbackButton(false);
    }
  }, [isOpen]);

  // Listen for payment success messages from Invoice Ninja iFrame
  useEffect(() => {
    if (!selectedPlan) return;

    const handleMessage = (event: MessageEvent) => {
      // Security: Check origin
      const invoiceNinjaUrl = process.env.NEXT_PUBLIC_INVOICE_NINJA_URL;
      if (invoiceNinjaUrl && event.origin !== new URL(invoiceNinjaUrl).origin) {
        return;
      }

      // Invoice Ninja might send different event types
      if (
        event.data.type === 'payment_success' ||
        event.data.status === 'paid' ||
        event.data === 'payment_complete'
      ) {
        console.log('[PlanModal] Payment success detected!');
        onSuccess();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [selectedPlan, onSuccess]);

  // Fallback: Show "Fertig" button after 5 seconds if no message received
  useEffect(() => {
    if (!selectedPlan) return;

    const timer = setTimeout(() => {
      setShowFallbackButton(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, [selectedPlan]);

  const handlePlanSelect = (plan: Plan) => {
    if (!plan.paymentLink) {
      console.error('[PlanModal] No payment link configured for plan:', plan.id);
      return;
    }
    setSelectedPlan(plan);
    setIsLoadingIframe(true);
  };

  const handleBack = () => {
    setSelectedPlan(null);
    setIsLoadingIframe(false);
    setShowFallbackButton(false);
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
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-5xl max-h-[90vh] overflow-hidden bg-neutral-900/95 backdrop-blur-xl rounded-3xl border border-neutral-700 shadow-2xl"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-all duration-200"
            aria-label="Schließen"
          >
            <X className="w-5 h-5" />
          </button>

          {!selectedPlan ? (
            /* Plan Selection View */
            <div className="p-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">
                  Wähle deinen Plan
                </h2>
                <p className="text-neutral-400">
                  Starte mit einem Test-Abo oder wähle das volle Social Media Paket
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {PLANS.map((plan) => (
                  <motion.div
                    key={plan.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`
                      relative p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300
                      ${
                        plan.highlighted
                          ? 'bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/50 shadow-lg shadow-blue-500/20'
                          : 'bg-neutral-800/50 border-neutral-700 hover:border-neutral-600'
                      }
                    `}
                    onClick={() => handlePlanSelect(plan)}
                  >
                    {plan.highlighted && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full text-xs font-semibold text-white">
                          <Sparkles className="w-3 h-3" />
                          Empfohlen
                        </span>
                      </div>
                    )}

                    <div className="mb-4">
                      <h3 className="text-xl font-bold text-white mb-2">
                        {plan.name}
                      </h3>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold text-white">
                          {plan.price}€
                        </span>
                        <span className="text-neutral-400">
                          /{plan.billingPeriod}
                        </span>
                      </div>
                    </div>

                    <ul className="space-y-3 mb-6">
                      {plan.features.map((feature, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-3 text-neutral-300"
                        >
                          <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      className={`
                        w-full py-3 px-6 rounded-xl font-semibold transition-all duration-300
                        ${
                          plan.highlighted
                            ? 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg'
                            : 'bg-neutral-700 hover:bg-neutral-600 text-white'
                        }
                      `}
                    >
                      Jetzt auswählen
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          ) : (
            /* iFrame View */
            <div className="h-[90vh] flex flex-col">
              {/* Header with Back Button */}
              <div className="flex items-center justify-between p-4 border-b border-neutral-700">
                <button
                  onClick={handleBack}
                  className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  Zurück
                </button>
                <h3 className="text-lg font-semibold text-white">
                  {selectedPlan.name}
                </h3>
                <div className="w-20" /> {/* Spacer for centering */}
              </div>

              {/* iFrame Container */}
              <div className="relative flex-1 bg-neutral-800">
                {isLoadingIframe && (
                  <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/50 backdrop-blur-sm z-10">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-neutral-400">Lade Zahlungsseite...</p>
                    </div>
                  </div>
                )}

                <iframe
                  src={selectedPlan.paymentLink}
                  className="w-full h-full"
                  onLoad={() => setIsLoadingIframe(false)}
                  title={`Zahlung für ${selectedPlan.name}`}
                  allow="payment"
                />

                {/* Fallback Button */}
                {showFallbackButton && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute bottom-4 right-4"
                  >
                    <button
                      onClick={onSuccess}
                      className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold shadow-lg transition-all duration-300"
                    >
                      Zahlung abgeschlossen
                    </button>
                  </motion.div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

