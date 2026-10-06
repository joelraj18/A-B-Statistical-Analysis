'use client';

import { motion } from 'framer-motion';
import { EASE_APPLE } from '@/lib/motion';

/** Re-mounts on navigation, giving every route a soft rise-in. */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE_APPLE }}>
      {children}
    </motion.div>
  );
}
