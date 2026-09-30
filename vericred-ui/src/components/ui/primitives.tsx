import { useEffect, useRef, useState } from 'react';
import type { FC } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion, useInView, useMotionValue, useSpring, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';

/* -------------------------------------------------------------------------- */
/* Reveal — scroll-triggered entrance                                          */
/* -------------------------------------------------------------------------- */

export const Reveal: FC<{
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}> = ({ children, delay = 0, y = 24, className }) => {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.7, delay, ease: [0.22, 0.61, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
};

/* -------------------------------------------------------------------------- */
/* StaggerText — line-level reveal for headings                               */
/* -------------------------------------------------------------------------- */

export const StaggerText: FC<{ lines: string[]; className?: string; delay?: number }> = ({
  lines,
  className = '',
  delay = 0,
}) => {
  const reduced = useReducedMotion();
  return (
    <motion.span className={`block ${className}`} aria-label={lines.join(' ')}>
      {lines.map((line, i) => (
        <span className="block overflow-hidden" key={i}>
          <motion.span
            className="block"
            initial={reduced ? false : { y: '110%' }}
            whileInView={{ y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.85, delay: delay + i * 0.12, ease: [0.22, 0.61, 0.36, 1] }}
            aria-hidden="true"
          >
            {line}
          </motion.span>
        </span>
      ))}
    </motion.span>
  );
};

/* -------------------------------------------------------------------------- */
/* CountUp — number counter on first view                                     */
/* -------------------------------------------------------------------------- */

export const CountUp: FC<{ value: number; duration?: number; prefix?: string; suffix?: string; decimals?: number }> = ({
  value,
  duration = 1.4,
  prefix = '',
  suffix = '',
  decimals = 0,
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(reduced ? value : 0);

  useEffect(() => {
    if (!inView || reduced) return;
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / (duration * 1000));
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration, reduced]);

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      {display.toFixed(decimals)}
      {suffix}
    </span>
  );
};

/* -------------------------------------------------------------------------- */
/* TiltCard — subtle pointer-driven 3D tilt                                    */
/* -------------------------------------------------------------------------- */

export const TiltCard: FC<{ children: ReactNode; className?: string; maxTilt?: number }> = ({
  children,
  className = '',
  maxTilt = 6,
}) => {
  const reduced = useReducedMotion();
  const rx = useSpring(useMotionValue(0), { stiffness: 160, damping: 22 });
  const ry = useSpring(useMotionValue(0), { stiffness: 160, damping: 22 });

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={`perspective-1000 ${className}`}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        ry.set(px * maxTilt * 2);
        rx.set(-py * maxTilt * 2);
      }}
      onPointerLeave={() => {
        rx.set(0);
        ry.set(0);
      }}
      style={{ rotateX: rx, rotateY: ry, transformStyle: 'preserve-3d' }}
    >
      {children}
    </motion.div>
  );
};

/* -------------------------------------------------------------------------- */
/* Modal — centered dialog with spring transition                              */
/* -------------------------------------------------------------------------- */

export const Modal: FC<{
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  width?: string;
}> = ({ open, onClose, title, children, width = 'max-w-lg' }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <motion.div className="absolute inset-0 bg-[#17171526] backdrop-blur-[2px]" onClick={onClose} />
          <motion.div
            className={`card ${width} relative w-full p-6 shadow-lift`}
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.985 }}
            transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
          >
            {title && (
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-title-lg text-ink">{title}</h3>
                <button onClick={onClose} className="btn-ghost !p-2" aria-label="Close dialog">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* -------------------------------------------------------------------------- */
/* Copy button                                                                */
/* -------------------------------------------------------------------------- */

export const CopyButton: FC<{ value: string; label?: ReactNode; className?: string }> = ({
  value,
  label = 'Copy',
  className = '',
}) => {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(t);
  }, [copied]);
  return (
    <button
      type="button"
      className={`btn-secondary btn-sm ${className}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
        } catch {
          /* clipboard unavailable */
        }
      }}
    >
      {copied ? 'Copied' : label}
    </button>
  );
};
