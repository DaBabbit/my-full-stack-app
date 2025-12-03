'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    question: 'Muss ich selbst filmen?',
    answer: 'Ja, du filmst die Videos selbst - aber keine Sorge: Wir liefern dir fertige Skripte, Guides und Anleitungen. Du musst nur auf "Aufnahme" drücken.'
  },
  {
    question: 'Wie schnell sehe ich Ergebnisse?',
    answer: 'Die ersten Videos sind innerhalb von 2 Wochen online. Sichtbare Reichweiten-Steigerungen siehst du meist nach 4-6 Wochen konsequenter Veröffentlichung.'
  },
  {
    question: 'Kann ich jederzeit kündigen?',
    answer: 'Ja, das Monatsabo ist monatlich kündbar. Keine Mindestlaufzeit, keine versteckten Kosten.'
  },
  {
    question: 'Was kostet es wirklich?',
    answer: '450€ pro Monat für 12 professionelle Kurzvideos inklusive Schnitt, Posting und Strategie. Komplett transparent, keine Zusatzkosten.'
  }
];

export default function MinimalFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-20 bg-neutral-950" id="faq">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Häufige Fragen
          </h2>
          <p className="text-neutral-400">
            Alles, was du wissen musst
          </p>
        </motion.div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full text-left bg-neutral-900/50 backdrop-blur-md rounded-2xl p-6 border border-neutral-800 hover:border-neutral-700 transition-all"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white pr-8">
                    {faq.question}
                  </h3>
                  <ChevronDown
                    className={`w-5 h-5 text-neutral-400 transition-transform flex-shrink-0 ${
                      openIndex === index ? 'rotate-180' : ''
                    }`}
                  />
                </div>

                <AnimatePresence>
                  {openIndex === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <p className="text-neutral-400 mt-4 leading-relaxed">
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

