import { motion, useReducedMotion } from 'motion/react';

export function CoreFallback({ progress }: { progress: number }) {
  const reduced = useReducedMotion();
  return (
    <div
      className="core-fallback"
      aria-label={`Rdzeń Kapitału, ${progress.toFixed(2)}% drogi do miliona`}
    >
      <motion.div
        className="core-orbit core-orbit-a"
        animate={reduced ? undefined : { rotate: 360 }}
        transition={{ duration: 22, ease: 'linear', repeat: Infinity }}
      />
      <motion.div
        className="core-orbit core-orbit-b"
        animate={reduced ? undefined : { rotate: -360 }}
        transition={{ duration: 30, ease: 'linear', repeat: Infinity }}
      />
      <motion.div
        className="core-gem"
        animate={
          reduced
            ? undefined
            : {
                scale: [1, 1.035, 1],
                filter: ['brightness(1)', 'brightness(1.2)', 'brightness(1)'],
              }
        }
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <span>MR</span>
      </motion.div>
      <svg className="progress-ring" viewBox="0 0 260 260" aria-hidden="true">
        <circle cx="130" cy="130" r="119" pathLength="100" className="ring-track" />
        <circle
          cx="130"
          cy="130"
          r="119"
          pathLength="100"
          className="ring-progress"
          strokeDasharray={`${Math.min(100, Math.max(0, progress))} 100`}
        />
      </svg>
    </div>
  );
}
