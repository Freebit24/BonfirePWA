"use client";

import { motion } from 'framer-motion';

const steps = [
  {
    step: '01',
    title: 'Discover what’s happening',
    text: 'Browse public events around you — or explore what communities are hosting nearby.'
  },
  {
    step: '02',
    title: 'Join with intent',
    text: 'Join open events instantly, or request access to private ones — without noise or spam.'
  },
  {
    step: '03',
    title: 'Host when you’re ready',
    text: 'Create your own event, manage attendees, and bring people together — simply.'
  }
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-28 md:py-36">
      <div className="container mx-auto px-6">

        {/* Section heading */}
        <div className="text-center mb-20 max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-semibold text-white">
            From discovery to participation in minutes.
          </h2>
        </div>

        {/* Steps container (intentionally constrained width) */}
        <div className="relative max-w-5xl mx-auto">

          {/* Connector line (desktop only, optically aligned) */}
          <div className="hidden md:block absolute top-[2.75rem] left-1/2 -translate-x-1/2 w-[70%] h-px bg-gradient-to-r from-transparent via-neutral-700/40 to-transparent" />

          <div className="grid md:grid-cols-3 gap-16">
            {steps.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.6, ease: 'easeOut' }}
                viewport={{ once: true }}
                className="relative z-10 flex flex-col items-center text-center"
              >
                {/* Step marker */}
                <div className="mb-4 w-16 h-16 rounded-full bg-neutral-950 border border-neutral-800 flex items-center justify-center text-lg font-medium text-orange-400">
                  {item.step}
                </div>

                <h3 className="text-lg font-medium text-white mb-2">
                  {item.title}
                </h3>

                <p className="text-sm text-neutral-400 leading-relaxed max-w-xs">
                  {item.text}
                </p>
              </motion.div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}