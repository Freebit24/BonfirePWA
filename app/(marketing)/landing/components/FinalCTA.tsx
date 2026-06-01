"use client";

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

export default function FinalCTA() {
  const router = useRouter();
  return (
    <section className="relative py-28 overflow-hidden">
      {/* Background wash */}
      <div className="absolute inset-0 bg-gradient-to-b from-neutral-950 via-orange-950/20 to-neutral-950" />

      <div className="container mx-auto px-6 relative z-10 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="text-4xl md:text-5xl font-semibold text-white mb-6"
        >
          Ready to gather?
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1, duration: 0.6, ease: 'easeOut' }}
          className="text-neutral-400 text-lg max-w-xl mx-auto mb-10 leading-relaxed"
        >
          Create events, bring people together, and build communities that actually show up.
        </motion.p>

        <div className="flex flex-col items-center gap-4">
          <button
            onClick={() => router.push('/home')}
            className="
              px-10 py-5 rounded-xl
              bg-white text-black
              text-lg font-semibold
              transition-all
              hover:bg-neutral-200 hover:scale-[1.03]
              shadow-[0_0_0_0_rgba(255,255,255,0.0)]
              hover:shadow-[0_0_40px_-10px_rgba(234,88,12,0.35)]
            "
          >
            Get started
          </button>

          <p className="text-sm text-neutral-500">
            Get started at your own pace
          </p>
        </div>
      </div>
    </section>
  );
}