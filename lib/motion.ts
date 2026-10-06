import type { Transition } from 'framer-motion';

/** Apple-like ease-out (fast start, long settle). */
export const EASE_APPLE = [0.16, 1, 0.3, 1] as const;

export const spring: Transition = { type: 'spring', stiffness: 420, damping: 36, mass: 0.9 };
export const softSpring: Transition = { type: 'spring', stiffness: 260, damping: 30 };
export const fade: Transition = { duration: 0.45, ease: EASE_APPLE };
