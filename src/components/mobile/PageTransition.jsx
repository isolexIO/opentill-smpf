import React from 'react';
import { motion } from 'framer-motion';

export default function PageTransition({ children, direction = 'forward' }) {
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;

  if (isDesktop) {
    return children;
  }

  const variants = {
    initial: {
      opacity: 0,
      x: direction === 'forward' ? 100 : -100,
    },
    animate: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.3,
        ease: 'easeOut',
      },
    },
    exit: {
      opacity: 0,
      x: direction === 'forward' ? -100 : 100,
      transition: {
        duration: 0.3,
        ease: 'easeIn',
      },
    },
  };

  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {children}
    </motion.div>
  );
}