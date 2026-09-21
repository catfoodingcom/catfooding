"use client";

import { AnimatePresence, motion } from "framer-motion";

export function CatThoughtBubble({ thought }: { thought: string }) {
  return (
    <div className="flex justify-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={thought}
          initial={{ opacity: 0, y: 6, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.96 }}
          transition={{ duration: 0.25 }}
          className="chunky-border bg-ink-raised px-4 py-2 rounded-2xl"
        >
          <p className="font-mono text-xs text-acid text-center">&ldquo;{thought}&rdquo;</p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
