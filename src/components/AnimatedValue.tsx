import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import { useEffect } from 'react';

export function AnimatedValue({ value }: { value: string }) {
  const reduced = useReducedMotion();
  const numeric = Number(value);
  const motionValue = useMotionValue(numeric);
  const formatted = useTransform(motionValue, (current) =>
    new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(current),
  );
  useEffect(() => {
    if (reduced) {
      motionValue.set(numeric);
      return;
    }
    return animate(motionValue, numeric, { duration: 1.2, ease: [0.22, 1, 0.36, 1] }).stop;
  }, [motionValue, numeric, reduced]);
  return <motion.span>{formatted}</motion.span>;
}
