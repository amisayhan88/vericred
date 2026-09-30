import { Suspense, lazy, useRef, useState } from 'react';
import type { FC } from 'react';
import { Link } from 'react-router-dom';
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { SectionHead } from './LandingPage';

const HowItWorksScene = lazy(() => import('../components/three/HowItWorksScene'));

const SCENES = [
  {
    range: [0, 0.14] as [number, number],
    index: 'I',
    title: 'A university issues a credential',
    body: 'The registrar signs the record with the institution key. A credential commitment is created — and the sensitive payload stays where it belongs.',
  },
  {
    range: [0.15, 0.33] as [number, number],
    index: 'II',
    title: 'The credential splits into two states',
    body: 'On the Midnight ledger lives a compact public commitment and status. Off-chain, in the student’s encrypted private state, live the GPA, the transcript, the identity fields.',
  },
  {
    range: [0.34, 0.5] as [number, number],
    index: 'III',
    title: 'The student selects a claim',
    body: 'A job asks for “GPA ≥ 3.5”, a board asks for “degree valid”. The student picks the exact claim to prove — never the whole file.',
  },
  {
    range: [0.51, 0.66] as [number, number],
    index: 'IV',
    title: 'A compact ZK circuit generates proof',
    body: 'Witness and public state feed a small formal circuit. It evaluates the predicate and produces a succinct zero-knowledge proof, signed against the credential.',
  },
  {
    range: [0.67, 0.84] as [number, number],
    index: 'V',
    title: 'The verifier receives the proof',
    body: 'The proof travels as a standalone artifact — a verification id, a QR code, a shareable link. No account, no transcript portal, no data pipeline between institutions.',
  },
  {
    range: [0.85, 1] as [number, number],
    index: 'VI',
    title: 'The claim is confirmed — privately',
    body: 'Checking the proof takes milliseconds against public parameters. The verifier learns one fact and nothing more: the answer is yes, and the student’s history was never exposed.',
  },
];

const sceneIndexFor = (p: number) => SCENES.findIndex((s) => p >= s.range[0] && p <= s.range[1]);

export const HowItWorksPage: FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const [active, setActive] = useState(0);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start start', 'end end'] });
  const smooth = useSpring(scrollYProgress, { stiffness: 90, damping: 26, restDelta: 0.001 });
  const barWidth = useTransform(smooth, (v) => `${Math.round(v * 1000) / 10}%`);

  useMotionValueEvent(smooth, 'change', (v) => {
    progressRef.current = v;
    const idx = sceneIndexFor(v);
    if (idx >= 0) setActive((prev) => (prev === idx ? prev : idx));
  });

  const scene = SCENES[active];

  return (
    <div>
      {/* Intro */}
      <section className="border-b border-line bg-paper" style={{ padding: '152px 0 88px' }}>
        <div className="container-vc">
          <SectionHead
            overline="How it works"
            title={
              <>
                Six steps. <span className="italic text-deep">Zero disclosures.</span>
              </>
            }
            body="Scroll through the full journey of a credential — from the registrar’s signature to an employer’s confirmation — and watch each state transition happen in real geometry."
          />
        </div>
      </section>

      {reduced ? (
        <section style={{ padding: '88px 0' }}>
          <div className="container-vc space-y-10">
            {SCENES.map((s) => (
              <div key={s.index} className="card p-8">
                <p className="font-display text-title-lg italic text-teal">{s.index}</p>
                <h3 className="mt-2 text-title-lg text-ink">{s.title}</h3>
                <p className="mt-3 max-w-2xl text-body-md text-mist">{s.body}</p>
              </div>
            ))}
          </div>
        </section>
      ) : (
        /* Scroll stage */
        <div ref={containerRef} className="relative h-[620vh]">
          <div className="sticky top-20 h-[calc(100vh-80px)]">
            <div className="relative h-full w-full">
              <Suspense
                fallback={
                  <div className="flex h-full items-center justify-center text-caption text-mist">
                    Preparing the walkthrough…
                  </div>
                }
              >
                <HowItWorksScene progress={progressRef} />
              </Suspense>

              {/* narrative card */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center px-4 pb-8 sm:items-end sm:justify-start sm:px-8 lg:justify-start">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={scene.index}
                    initial={{ opacity: 0, y: 22 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -14 }}
                    transition={{ duration: 0.45, ease: [0.22, 0.61, 0.36, 1] }}
                    className="card pointer-events-auto max-w-md p-6 sm:p-7"
                    style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)' }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-display text-title-lg italic text-teal">{scene.index}</span>
                      <span className="mono-label">
                        Step {active + 1} / {SCENES.length}
                      </span>
                    </div>
                    <h3 className="mt-3 text-title-lg text-ink">{scene.title}</h3>
                    <p className="mt-2.5 text-body-sm text-mist">{scene.body}</p>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* progress rail (desktop) */}
              <div className="absolute right-6 top-1/2 hidden -translate-y-1/2 flex-col gap-3 lg:flex">
                {SCENES.map((s, i) => (
                  <div key={s.index} className="flex items-center justify-end gap-3">
                    <span className={`mono-label transition-opacity ${i === active ? 'opacity-100' : 'opacity-0'}`}>
                      {s.index}
                    </span>
                    <motion.span
                      className="rounded-full"
                      animate={{
                        width: i === active ? 26 : 8,
                        height: 8,
                        backgroundColor: i === active ? '#173B57' : '#C8C6BC',
                      }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                ))}
              </div>

              {/* mobile progress bar */}
              <div className="absolute inset-x-0 bottom-0 h-[3px] bg-line/70 lg:hidden">
                <motion.div className="h-full bg-teal" style={{ width: barWidth }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Outro */}
      <section className="border-t border-line bg-paper" style={{ padding: '88px 0' }}>
        <div className="container-vc grid grid-cols-1 items-center gap-10 md:grid-cols-[1.4fr_1fr]">
          <SectionHead
            overline="Under the hood"
            title="Every step above is a real circuit"
            body="issueCredential, verifyCredential, proveGpaThreshold and proveDegreeMatch are compiled Compact contracts — the same surface you just scrolled through."
          />
          <motion.div
            className="flex flex-col items-start gap-3"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <Link to="/architecture" className="btn-primary">
              See the architecture
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/proof" className="btn-secondary">
              Try the proof generator
            </Link>
            <Link to="/verify" className="link-quiet btn-ghost">
              Or verify an existing proof <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default HowItWorksPage;
