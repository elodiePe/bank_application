import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const PIECES = ['🎉', '✨', '⭐', '🎊', '💛', '💙'];
const COUNT = 18;

/** A short burst of emoji particles from the center, fired whenever `trigger` changes to a new
 * value — used to celebrate a level-up, an unlocked badge, or a finished daily quest without
 * pulling in a confetti library for something this small. */
export function Confetti({ trigger }: { trigger: number }) {
  const particles = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => {
        const angle = (i / COUNT) * Math.PI * 2 + Math.random() * 0.5;
        const distance = 80 + Math.random() * 80;
        return {
          key: `${trigger}-${i}`,
          emoji: PIECES[i % PIECES.length],
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance - 40,
          rotate: Math.random() * 360,
          delay: Math.random() * 0.15,
        };
      }),
    [trigger],
  );

  if (trigger === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center">
      <AnimatePresence>
        {particles.map((p) => (
          <motion.span
            key={p.key}
            className="absolute text-2xl"
            initial={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 0.5 }}
            animate={{ opacity: 0, x: p.x, y: p.y, rotate: p.rotate, scale: 1.1 }}
            transition={{ duration: 1.1, delay: p.delay, ease: 'easeOut' }}
          >
            {p.emoji}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}
