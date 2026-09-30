import { useEffect, useRef, useState } from 'react';
import type { FC } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import { Check, EyeOff, FileText, Lock } from 'lucide-react';

interface TranscriptField {
  label: string;
  demo: string;
  sensitive: boolean;
}

const FIELDS: TranscriptField[] = [
  { label: 'Name', demo: 'A. Sharma', sensitive: true },
  { label: 'Student ID', demo: 'FIE-2022-0187', sensitive: true },
  { label: 'Courses', demo: '17 records', sensitive: true },
  { label: 'Grades', demo: 'A, A−, B+ …', sensitive: true },
  { label: 'GPA', demo: '3.71', sensitive: true },
  { label: 'Address', demo: 'Pune, IN', sensitive: true },
  { label: 'Date of birth', demo: '04 · 1999', sensitive: true },
  { label: 'Institution', demo: 'Future Institute of Engineering', sensitive: false },
  { label: 'Degree', demo: 'B.Tech Computer Science', sensitive: false },
];

const CLAIMS = ['GPA ≥ 3.50', 'Degree valid', 'Institution verified'];

const spring = { type: 'spring', stiffness: 260, damping: 26 } as const;

export const ProofWithoutDisclosure: FC = () => {
  const [protectedMode, setProtectedMode] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-120px' });
  const reduced = useReducedMotion();

  // Auto-demonstrate the transformation once on first view.
  useEffect(() => {
    if (!inView || reduced) return;
    const t = setTimeout(() => setProtectedMode(true), 1800);
    return () => clearTimeout(t);
  }, [inView, reduced]);

  return (
    <div ref={ref} className="grid grid-cols-1 items-center gap-6 lg:grid-cols-[1fr_auto_1.15fr] lg:gap-10">
      {/* Traditional flow */}
      <div className="card p-6">
        <div className="mb-5 flex items-center justify-between">
          <p className="mono-label">Traditional verification</p>
          <span className="badge badge-revoked">
            <EyeOff className="h-3.5 w-3.5" style={{ opacity: 0.55 }} /> Over-disclosure
          </span>
        </div>
        <div className="mb-5 flex items-center gap-2 text-caption text-mist">
          <span className="chip !bg-shell">Student</span>
          <span className="h-px flex-1 bg-line" aria-hidden />
          <span className="chip !bg-shell">Full transcript</span>
          <span className="h-px flex-1 bg-line" aria-hidden />
          <span className="chip !bg-shell">Employer</span>
        </div>
        <div className="card-quiet space-y-2 p-4 font-mono text-[12.5px]" aria-hidden>
          {FIELDS.map((f) => (
            <motion.div
              key={f.label}
              className="flex items-center justify-between gap-3"
              animate={
                protectedMode ? (f.sensitive ? { opacity: 0.16, filter: 'blur(0px)' } : { opacity: 1 }) : { opacity: 1 }
              }
              transition={spring}
            >
              <span className="text-mist">{f.label}</span>
              <span className={`text-ink ${f.sensitive && protectedMode ? 'tracking-[0.3em]' : ''}`}>
                {f.sensitive && protectedMode ? '••••••' : f.demo}
              </span>
            </motion.div>
          ))}
        </div>
        <p className="mt-4 text-body-sm text-mist">
          Every check hands the verifier the whole record — identity, grades, address, date of birth — long after the
          hire decision is made.
        </p>
      </div>

      {/* Toggle */}
      <div className="flex items-center justify-center gap-3 lg:flex-col">
        <button
          onClick={() => setProtectedMode((v) => !v)}
          className={`btn-sm inline-flex items-center gap-2 rounded-pill border font-semibold transition-colors ${
            protectedMode ? 'border-teal/40 bg-teal/10 text-teal' : 'border-line bg-paper text-graphite'
          }`}
          style={{ height: 38, padding: '0 16px' }}
          aria-pressed={protectedMode}
        >
          <Lock className="h-3.5 w-3.5" />
          {protectedMode ? 'ZK mode active' : 'Apply ZK proof'}
        </button>
        <motion.span
          className="mono-label hidden lg:block"
          animate={{ opacity: protectedMode ? 1 : 0.55 }}
          style={{ maxWidth: 90, textAlign: 'center' }}
        >
          selective disclosure
        </motion.span>
      </div>

      {/* VeriCred flow */}
      <div className={`card relative overflow-hidden p-6 transition-colors ${protectedMode ? 'border-deep/25' : ''}`}>
        <div className="mb-5 flex items-center justify-between">
          <p className="mono-label">With VeriCred</p>
          <AnimatePresence mode="wait">
            <motion.span
              key={protectedMode ? 'on' : 'off'}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className={`badge ${protectedMode ? 'badge-active' : 'badge-neutral'}`}
            >
              {protectedMode ? (
                <>
                  <Check className="h-3.5 w-3.5" /> Minimal disclosure
                </>
              ) : (
                <>
                  <FileText className="h-3.5 w-3.5" /> Waiting
                </>
              )}
            </motion.span>
          </AnimatePresence>
        </div>
        <div className="mb-5 flex items-center gap-2 text-caption text-mist">
          <span className="chip !bg-shell">Student</span>
          <span className="h-px flex-1 bg-teal/50" aria-hidden />
          <motion.span
            className="chip !border-teal/50 !bg-teal/10 !text-teal"
            animate={protectedMode ? { x: [0, 6, 0] } : undefined}
            transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 1.4 }}
          >
            ZK proof
          </motion.span>
          <span className="h-px flex-1 bg-teal/50" aria-hidden />
          <span className="chip !bg-shell">Employer</span>
        </div>

        <div className="relative min-h-[176px]">
          <AnimatePresence mode="wait">
            {!protectedMode ? (
              <motion.div
                key="raw"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="card-quiet space-y-2 p-4 font-mono text-[12.5px]"
              >
                {FIELDS.map((f) => (
                  <div key={f.label} className="flex items-center justify-between gap-3">
                    <span className="text-mist">{f.label}</span>
                    <span className="text-ink">{f.demo}</span>
                  </div>
                ))}
              </motion.div>
            ) : (
              <motion.div key="claims" className="space-y-3" aria-label="Disclosed claims">
                {CLAIMS.map((c, i) => (
                  <motion.div
                    key={c}
                    initial={{ opacity: 0, x: 14 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.12 + i * 0.14, ...spring }}
                    className="flex items-center justify-between rounded-lg border border-teal/25 bg-teal/[0.06] px-4 py-3"
                  >
                    <span className="flex items-center gap-2.5 text-body-sm font-semibold text-ink">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal/15">
                        <Check className="h-3 w-3 text-teal" strokeWidth={3} />
                      </span>
                      {c}
                    </span>
                    <span className="mono-label" style={{ fontSize: 10 }}>
                      proven
                    </span>
                  </motion.div>
                ))}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="pt-1 text-center text-caption text-mist"
                >
                  Nothing else leaves the device.
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="mt-4 text-body-sm text-mist">
          A compact zero-knowledge circuit evaluates the claims above against the private witness. Only{' '}
          <span className="font-semibold text-ink">booleans and public labels</span> are revealed.
        </p>
      </div>
    </div>
  );
};
