'use client';

import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

const TIDYCAL_URL = 'https://tidycal.com/davidkosma/20-minute-meeting-m4ee56v';

const features = [
  '12 professionelle Kurzvideos pro Monat',
  'Automatisches Posting auf TikTok, Instagram & YouTube',
  'Fertige Skripte & Content-Ideen inklusive',
  '2 monatliche Strategie-Calls',
  'Zugang zum Kundenportal',
  'Monatlich kündbar'
];

export function PricingSection() {
  return (
    <section className="py-20 bg-black" id="preise">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Einfache, transparente Preise
          </h2>
          <p className="text-neutral-400 text-lg">
            Alles inklusive. Keine versteckten Kosten.
          </p>
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
                  450€
                </span>
                <span className="ml-2 text-neutral-400 text-xl">/Monat</span>
              </div>
              <p className="text-sm text-neutral-500 mt-2">
                Jahresabo verfügbar (1 Monat gratis)
              </p>
            </div>

            {/* Features List */}
            <ul className="space-y-4 mb-10">
              {features.map((feature, index) => (
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
