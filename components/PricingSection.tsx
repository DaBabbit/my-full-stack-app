'use client';

import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

const TIDYCAL_URL = 'https://tidycal.com/davidkosma/20-minute-meeting-m4ee56v';

const baseFeatures = [
  '12 professionelle Kurzvideos pro Monat',
  'Automatisches Posting auf TikTok, Instagram & YouTube',
  '2 monatliche Strategie-Calls',
  'Zugang zum Kundenportal',
  'Mindestlaufzeit: 3 Monate, danach monatlich kündbar'
];

const scriptingFeatures = [
  'Fertige Skripte & Content-Ideen',
  'Strategische Ideenentwicklung',
  'Content-Planung & Konzeption'
];

export function PricingSection() {
  const [isYearly, setIsYearly] = useState(false);
  const [includeScripting, setIncludeScripting] = useState(false);

  // Preise berechnen
  const getPrice = () => {
    if (isYearly) {
      return includeScripting ? '5.999€' : '4.950€';
    }
    return includeScripting ? '550€' : '450€';
  };

  const getInterval = () => {
    return isYearly ? '/Jahr' : '/Monat';
  };

  const getSavings = () => {
    if (!isYearly) return null;
    const monthlyCost = includeScripting ? 550 * 12 : 450 * 12;
    const yearlyCost = includeScripting ? 5999 : 4950;
    const savings = monthlyCost - yearlyCost;
    return `${savings}€ sparen`;
  };

  const allFeatures = includeScripting 
    ? [...baseFeatures.slice(0, 2), ...scriptingFeatures, ...baseFeatures.slice(2)]
    : baseFeatures;

  return (
    <section className="py-20 bg-black" id="preise">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Einfache, transparente Preise
          </h2>
          <p className="text-neutral-400 text-lg">
            Alles inklusive. Keine versteckten Kosten.
          </p>
        </motion.div>

        {/* Billing Toggle */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="flex justify-center mb-8"
        >
          <div className="inline-flex items-center gap-3 bg-neutral-900/50 backdrop-blur-md rounded-full p-1.5 border border-neutral-800">
            <button
              onClick={() => setIsYearly(false)}
              className={`px-6 py-2.5 rounded-full font-medium text-sm transition-all ${
                !isYearly
                  ? 'bg-white text-black'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Monatlich
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={`px-6 py-2.5 rounded-full font-medium text-sm transition-all ${
                isYearly
                  ? 'bg-white text-black'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Jährlich
              {isYearly && (
                <span className="ml-2 text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
                  Spare bis zu 1.389€
                </span>
              )}
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="relative"
        >
          {/* Popular Badge */}
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
            <span className="px-4 py-1.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full text-sm font-medium">
              Am beliebtesten
            </span>
          </div>

          <div className="bg-neutral-900/50 backdrop-blur-md rounded-3xl p-8 md:p-12 border border-neutral-800 hover:border-neutral-700 transition-all hover:shadow-[0_0_40px_rgba(255,255,255,0.1)]">
            {/* Pricing Header */}
            <div className="text-center mb-8 pb-8 border-b border-neutral-800">
              <h3 className="text-2xl font-semibold text-white mb-4">
                KosmaMedia Pro
              </h3>
              <div className="flex items-baseline justify-center mb-2">
                <span className="text-5xl md:text-6xl font-bold text-white">
                  {getPrice()}
                </span>
                <span className="ml-2 text-neutral-400 text-xl">{getInterval()}</span>
              </div>
              {isYearly && (
                <p className="text-sm text-green-400 font-medium mt-2">
                  {getSavings()} gegenüber monatlicher Zahlung
                </p>
              )}
            </div>

            {/* Scripting Add-on Toggle */}
            <div className="mb-8 p-4 bg-neutral-800/50 rounded-2xl border border-neutral-700">
              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex-1">
                  <div className="font-semibold text-white group-hover:text-neutral-200 transition-colors">
                    Skripting & Ideenentwicklung
                  </div>
                  <div className="text-sm text-neutral-400 mt-1">
                    +100€/Monat (+1.200€/Jahr) - Fertige Skripte & Content-Konzepte
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIncludeScripting(!includeScripting)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ml-4 ${
                    includeScripting ? 'bg-blue-500' : 'bg-neutral-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      includeScripting ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </label>
            </div>

            {/* Features List */}
            <ul className="space-y-4 mb-10">
              {allFeatures.map((feature, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + index * 0.05 }}
                  className="flex items-start"
                >
                  <CheckCircle2 className="w-6 h-6 text-white flex-shrink-0 mt-0.5" />
                  <span className="ml-3 text-neutral-300 text-lg">{feature}</span>
                </motion.li>
              ))}
            </ul>

            {/* CTA Button */}
            <motion.a
              href={TIDYCAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="block w-full py-4 bg-white text-black rounded-full text-center font-semibold text-lg hover:bg-neutral-100 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_rgba(255,255,255,0.3)]"
            >
              Jetzt Beratungsgespräch buchen
            </motion.a>

            {/* Trust Elements */}
            <div className="mt-6 text-center">
              <p className="text-sm text-neutral-500">
                ✓ Kostenlos & unverbindlich ✓ 20 Minuten ✓ Keine Verpflichtung
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
