'use client';

import { motion } from 'framer-motion';

const steps = [
  {
    icon: '👋',
    title: 'Kennenlernen',
    description: '30-Min Call, Strategie definieren'
  },
  {
    icon: '🎥',
    title: 'Du filmst',
    description: 'Mit unseren Skripten & Guides'
  },
  {
    icon: '🚀',
    title: 'Wir veröffentlichen',
    description: 'Automatisch auf allen Plattformen'
  }
];

export default function HowItWorksSimple() {
  return (
    <section className="py-20 bg-black">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            So funktioniert's
          </h2>
          <p className="text-neutral-400 text-lg">
            Einfach. Schnell. Effektiv.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="relative"
            >
              {/* Connector Line (except last) */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-neutral-700 to-transparent" />
              )}

              <div className="relative bg-neutral-900/50 backdrop-blur-md rounded-2xl p-8 border border-neutral-800 hover:border-neutral-700 transition-colors">
                {/* Step Number */}
                <div className="absolute -top-4 -left-4 w-8 h-8 bg-white text-black rounded-full flex items-center justify-center font-bold text-sm">
                  {index + 1}
                </div>

                {/* Icon */}
                <div className="text-5xl mb-4">{step.icon}</div>

                {/* Content */}
                <h3 className="text-xl font-semibold text-white mb-2">
                  {step.title}
                </h3>
                <p className="text-neutral-400">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

