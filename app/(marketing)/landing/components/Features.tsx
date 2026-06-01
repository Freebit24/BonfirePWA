"use client";

import { motion } from 'framer-motion';
import { Eye, DoorClosed, Layout } from 'lucide-react';

const principles = [
  {
    icon: <Eye className="w-5 h-5 text-orange-400/80" />,
    title: 'Clarity over clutter',
    desc: 'Events are presented clearly, without feeds designed to distract or overwhelm. What you see is what matters.'
  },
  {
    icon: <DoorClosed className="w-5 h-5 text-amber-400/80" />,
    title: 'Intentional access',
    desc: 'Private, public, or invite-only — gatherings happen with purpose, not accidental virality.'
  },
  {
    icon: <Layout className="w-5 h-5 text-orange-300/80" />,
    title: 'A space you can shape',
    desc: 'Communities feel personal and considered, not like rented space inside someone else’s platform.'
  }
];

export default function Features() {
  return (
    <section className="relative py-24 md:py-32 container mx-auto px-6">

      {/* Soft section transition divider */}
      <div className="mb-20">
        <div className="mx-auto h-px w-48 bg-gradient-to-r from-transparent via-neutral-700/60 to-transparent" />
      </div>

      {/* Section header */}
      <div className="mb-20 max-w-2xl">
        <h2 className="text-3xl md:text-4xl font-semibold text-white mb-4">
          Built for depth, not scroll depth.
        </h2>
        <p className="text-neutral-400 text-lg leading-relaxed">
          A quieter approach to events and community — designed around focus and intention.
        </p>
      </div>

      {/* Principles grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        {principles.map((p, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.6, ease: 'easeOut' }}
            viewport={{ once: true }}
            className="
              p-6 rounded-2xl
              bg-neutral-900/30
              border border-neutral-800/60
            "
          >
            <div className="mb-4 p-3 rounded-xl bg-neutral-800/40 w-fit">
              {p.icon}
            </div>

            <h3 className="text-lg font-medium text-white mb-2">
              {p.title}
            </h3>

            <p className="text-neutral-400 text-sm leading-relaxed">
              {p.desc}
            </p>
          </motion.div>
        ))}
      </div>

    </section>
  );
}