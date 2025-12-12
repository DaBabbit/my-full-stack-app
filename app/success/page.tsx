'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, Sparkles } from 'lucide-react';

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"
        />
      </div>

      {/* Main Content */}
      <div className="max-w-2xl w-full relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-neutral-900/50 backdrop-blur-md rounded-3xl p-8 md:p-12 border border-neutral-800 text-center relative"
        >
          {/* Decorative Sparkles */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="absolute top-8 right-8"
          >
            <Sparkles className="w-6 h-6 text-green-400" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="absolute top-8 left-8"
          >
            <Sparkles className="w-6 h-6 text-blue-400" />
          </motion.div>

          {/* Success Icon with Animation */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 20,
              delay: 0.2
            }}
            className="inline-flex items-center justify-center w-24 h-24 mb-8 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-full relative"
          >
            {/* Outer Ring Animation */}
            <motion.div
              initial={{ scale: 1, opacity: 0 }}
              animate={{ scale: [1, 1.5, 1.5], opacity: [0.5, 0.3, 0] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeOut",
                times: [0, 0.5, 1]
              }}
              className="absolute inset-0 border-4 border-green-400 rounded-full"
            />
            
            {/* Check Icon */}
            <CheckCircle2 className="w-12 h-12 text-green-400" strokeWidth={2.5} />
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="text-3xl md:text-4xl font-bold text-white mb-4"
          >
            Zahlung erfolgreich!
          </motion.h1>
          
          {/* Subtext */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="text-xl text-neutral-300 mb-8"
          >
            Vielen Dank für dein Vertrauen! 🎉
          </motion.p>

          {/* Info Box */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="bg-neutral-800/50 rounded-2xl p-6 border border-neutral-700"
          >
            <p className="text-neutral-300 leading-relaxed">
              Alle weiteren Informationen findest du in deinem <span className="text-white font-semibold">Kundenportal</span>.
              <br />
              <span className="text-sm text-neutral-400 mt-2 inline-block">
                Du kannst diese Seite nun schließen oder zum Dashboard navigieren.
              </span>
            </p>
          </motion.div>

          {/* Additional Info */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.5 }}
            className="mt-6 text-sm text-neutral-500"
          >
            Du erhältst in Kürze eine Bestätigung per E-Mail
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}

