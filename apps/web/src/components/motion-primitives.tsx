'use client';

import { motion, type Variants } from 'motion/react';
import type { ReactNode } from 'react';

export const listVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};

export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
};

export function FadeIn({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={className}>
      {children}
    </motion.div>
  );
}

export function MotionList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.ul variants={listVariants} initial="hidden" animate="show" className={className}>
      {children}
    </motion.ul>
  );
}

export function MotionItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.li variants={itemVariants} className={className}>
      {children}
    </motion.li>
  );
}
