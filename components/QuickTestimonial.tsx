'use client';

import { motion } from 'framer-motion';
import { Quote } from 'lucide-react';

export default function QuickTestimonial() {
  return (
    <section className="py-20 bg-neutral-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative"
        >
          {/* Quote Icon */}
          <div className="absolute -top-6 left-8 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
            <Quote className="w-6 h-6 text-white" />
          </div>

          <div className="bg-neutral-900/50 backdrop-blur-md rounded-3xl p-8 md:p-12 border border-neutral-800">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              {/* Testimonial Text */}
              <div>
                <p className="text-xl md:text-2xl text-white leading-relaxed mb-6">
                  &quot;Mit kosmamedia läuft mein Markenaufbau endlich strukturiert. 
                  David nimmt mir den ganzen Videostress ab - so bleibt mir mehr Zeit für mein Business.&quot;
                </p>
                <div>
                  <div className="font-semibold text-white">Steffen Preiss</div>
                  <div className="text-neutral-400 text-sm">Finanzen & Unternehmertum</div>
                </div>
              </div>

              {/* Video */}
              <div className="relative aspect-[9/16] max-w-xs mx-auto">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl blur-xl" />
                <div className="relative bg-neutral-800 rounded-2xl overflow-hidden border border-neutral-700">
                  {/* Placeholder für Video - in Production durch echtes Video ersetzen */}
                  <div className="aspect-[9/16] bg-neutral-900 flex items-center justify-center">
                    <span className="text-neutral-600">Video wird geladen...</span>
                  </div>
                  {/* 
                  <video
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="w-full h-full object-cover"
                  >
                    <source src="/videos/Testimonial_SteffenPreiss.mp4" type="video/mp4" />
                  </video>
                  */}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

