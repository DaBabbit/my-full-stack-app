'use client';

import { motion } from 'framer-motion';
import { Hourglass, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Back Button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-neutral-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück zur Startseite
        </Link>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-neutral-900/50 backdrop-blur-md rounded-3xl p-12 border border-neutral-800 text-center"
        >
          {/* Animated Hourglass */}
          <motion.div
            animate={{
              rotateZ: [0, 180, 180, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              times: [0, 0.4, 0.6, 1],
              ease: "easeInOut"
            }}
            className="inline-flex items-center justify-center w-24 h-24 mb-8 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full"
          >
            <Hourglass className="w-12 h-12 text-white" />
          </motion.div>

          {/* Heading */}
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Noch in Arbeit
          </h1>
          
          {/* Subtext */}
          <p className="text-xl text-neutral-300 mb-6">
            Das neue Kundenportal erscheint bald!
          </p>

          {/* Info Box */}
          <div className="bg-neutral-800/50 rounded-2xl p-6 border border-neutral-700 mb-8">
            <p className="text-neutral-300 leading-relaxed">
              Die Zusammenarbeit erfolgt aktuell noch über das alte Kundenportal.
              <br />
              Mehr dazu erfährst du in deinem Kennenlerngespräch.
            </p>
          </div>

          {/* CTA Button */}
          <motion.a
            href="https://tidycal.com/davidkosma/20-minute-meeting-m4ee56v"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-block px-8 py-4 bg-white text-black rounded-full font-semibold text-lg hover:bg-neutral-100 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_rgba(255,255,255,0.3)]"
          >
            Jetzt Kennenlerngespräch buchen
          </motion.a>

          {/* Small Trust Text */}
          <p className="mt-6 text-sm text-neutral-500">
            Kostenlos • 20 Minuten • Unverbindlich
          </p>
        </motion.div>
      </div>
    </div>
  );
}
