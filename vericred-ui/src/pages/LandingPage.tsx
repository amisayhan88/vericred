import { Suspense, lazy, useState } from 'react';
import type { FC, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  Award,
  Building2,
  Check,
  GraduationCap,
  Landmark,
  Lock,
  ScrollText,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { Reveal, StaggerText } from '../components/ui/primitives';
import { ProofWithoutDisclosure } from '../components/marketing/ProofWithoutDisclosure';
import { useWalletStore } from '../store/useWalletStore';

const ProofNetworkScene = lazy(() => import('../components/three/ProofNetworkScene'));

/* -------------------------------------------------------------------------- */
/* Trusted-by marks (fictional institutions — neutral academic wordmarks)      */
/* -------------------------------------------------------------------------- */

const INSTITUTIONS = [
  'Future Institute of Engineering',
  'Northgate Technical University',
  'Aurelia State College',
  'Calderwood Polytechnic',
  'Halden Institute of Technology',
  'Meridian School of Applied Sciences',
];

const Crest: FC<{ seed: number }> = ({ seed }) => {
  const glyphs = [
    'M12 3 4 7v5c0 5 3.5 8 8 9 4.5-1 8-4 8-9V7l-8-4Z',
    'M5 20V8l7-5 7 5v12M9 20v-6h6v6',
    'M12 3v18M5 8l14 8M19 8 5 16',
  ];
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden>
      <path d={glyphs[seed % glyphs.length]} strokeLinejoin="round" />
    </svg>
  );
};

/* -------------------------------------------------------------------------- */
/* Hero                                                                        */
/* -------------------------------------------------------------------------- */

/* Feedback: “takes too long to load on my phone” — on compact screens the WebGL hero
   is opt-in; a lightweight static panel renders instead until the user asks for 3D. */
const HeroStaticPanel: FC<{ onLoad: () => void }> = ({ onLoad }) => (
  <div className="flex h-full flex-col items-center justify-center gap-5 bg-pattern-grid p-6 text-center">
    <svg width="240" height="140" viewBox="0 0 240 140" fill="none" aria-hidden>
      <line x1="30" y1="30" x2="120" y2="70" stroke="#C8C6BC" strokeWidth="1" />
      <line x1="210" y1="30" x2="120" y2="70" stroke="#C8C6BC" strokeWidth="1" />
      <line x1="30" y1="110" x2="120" y2="70" stroke="#C8C6BC" strokeWidth="1" />
      <line x1="210" y1="110" x2="120" y2="70" stroke="#C8C6BC" strokeWidth="1" />
      <rect x="92" y="52" width="56" height="36" rx="6" fill="#FFFFFF" stroke="#173B57" strokeWidth="1.2" />
      <line x1="100" y1="62" x2="140" y2="62" stroke="#173B57" strokeWidth="2" />
      <line x1="100" y1="70" x2="132" y2="70" stroke="#DDD9CE" strokeWidth="2" />
      <line x1="100" y1="78" x2="126" y2="78" stroke="#DDD9CE" strokeWidth="2" />
      <circle cx="30" cy="30" r="6" fill="#173B57" />
      <circle cx="210" cy="30" r="6" fill="#4F8582" />
      <circle cx="30" cy="110" r="6" fill="#2F6B8A" />
      <circle cx="210" cy="110" r="6" fill="#C9B99A" />
    </svg>
    <div>
      <p className="text-body-sm font-semibold text-ink">Credential Proof Network</p>
      <p className="mono-label mt-1">3D view paused to save data & battery</p>
    </div>
    <button onClick={onLoad} className="btn-secondary btn-sm">
      Load 3D visualization
    </button>
  </div>
);

const Hero: FC = () => {
  const reduced = useReducedMotion();
  const [compact] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches);
  const [scene3d, setScene3d] = useState(!compact);
  return (
    <section className="relative overflow-hidden" style={{ paddingTop: 120, paddingBottom: 96 }}>
      <div className="bg-pattern-grid pointer-events-none absolute inset-0 opacity-70" aria-hidden />
      <div
        className="pointer-events-none absolute -top-40 right-[-12%] h-[560px] w-[560px] rounded-full opacity-50"
        style={{
          background: 'radial-gradient(closest-side, rgba(168,193,181,0.28), rgba(232,224,209,0.14), transparent)',
        }}
        aria-hidden
      />
      <div className="container-vc relative grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <span className="chip">
              <span className="h-1.5 w-1.5 rounded-full bg-teal" />
              Built on Midnight · Compact ZK circuits
            </span>
          </motion.div>

          <h1 className="mt-6 font-display text-display-xl text-ink">
            <StaggerText lines={['Credentials you', 'can prove.']} delay={0.15} />
            <StaggerText lines={['Details you never have to reveal.']} delay={0.3} className="italic text-deep" />
          </h1>

          <Reveal delay={0.45}>
            <p className="mt-6 max-w-md text-body-lg text-graphite">
              VeriCred enables universities and students to issue and verify academic credentials using
              privacy-preserving zero-knowledge proofs on Midnight.
            </p>
          </Reveal>

          <Reveal delay={0.55}>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/universities?tab=issue" className="btn-primary group">
                Issue a Credential
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link to="/verify" className="btn-secondary">
                <ShieldCheck className="h-4 w-4 text-teal" />
                Verify a Credential
              </Link>
              <Link to="/how-it-works" className="link-quiet btn-ghost ml-1">
                Explore how it works
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </Reveal>

          <Reveal delay={0.7}>
            <ul className="mt-10 flex flex-wrap gap-x-8 gap-y-3">
              {[
                { icon: Lock, label: 'Private witnesses never leave the device' },
                { icon: ScrollText, label: 'Dual-state on-chain / off-chain architecture' },
                { icon: Check, label: 'Formal Compact circuits, per claim' },
              ].map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-2 text-caption text-mist">
                  <Icon className="h-3.5 w-3.5 text-teal" />
                  {label}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        <div className="lg:col-span-6">
          <Reveal y={32} delay={0.25}>
            <div
              className="card relative overflow-hidden bg-paper/70"
              style={{ boxShadow: '0 24px 64px -32px rgba(23,59,87,0.25)' }}
            >
              <div className="flex items-center justify-between border-b border-line-soft px-5 py-3">
                <span className="mono-label">Credential Proof Network</span>
                <span className="chip !py-1 !text-[10px]">live geometry</span>
              </div>
              <div className="h-[340px] sm:h-[420px]">
                {scene3d ? (
                  <Suspense
                    fallback={
                      <div className="flex h-full items-center justify-center">
                        <div className="flex flex-col items-center gap-3 text-mist">
                          <span className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-teal" />
                          <span className="mono-label">Preparing proof network…</span>
                        </div>
                      </div>
                    }
                  >
                    <ProofNetworkScene />
                  </Suspense>
                ) : (
                  <HeroStaticPanel onLoad={() => setScene3d(true)} />
                )}
              </div>
              <div className="flex items-center justify-between border-t border-line-soft px-5 py-3 text-caption text-mist">
                <span>Move your cursor — the network responds.</span>
                <span className="font-mono text-[11px] text-teal">zk: satisfied ✓</span>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
};

/* -------------------------------------------------------------------------- */
/* Section header helper                                                       */
/* -------------------------------------------------------------------------- */

export const SectionHead: FC<{ overline: string; title: ReactNode; body?: string; align?: 'left' | 'center' }> = ({
  overline,
  title,
  body,
  align = 'left',
}) => (
  <Reveal className={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
    <p className="overline">{overline}</p>
    <h2 className="mt-4 text-display-md text-ink">{title}</h2>
    {body && <p className="mt-4 text-body-lg text-mist">{body}</p>}
  </Reveal>
);

/* -------------------------------------------------------------------------- */
/* Landing                                                                     */
/* -------------------------------------------------------------------------- */

const USE_CASES: Array<{
  icon: FC<{ className?: string }>;
  title: string;
  body: string;
  to: string;
  image?: { src: string; alt: string };
}> = [
  {
    icon: Landmark,
    title: 'Universities',
    body: 'Issue signed credentials and manage lifecycle — suspend, reinstate, revoke — without hosting raw student records.',
    to: '/universities',
    image: { src: '/images/building.jpg', alt: 'University academic building behind a lawn' },
  },
  {
    icon: GraduationCap,
    title: 'Students',
    body: 'Hold every degree, transcript and course record in one wallet, and prove what a request actually asks for.',
    to: '/wallet',
  },
  {
    icon: UserRound,
    title: 'Employers',
    body: 'Verify claims in seconds — GPA thresholds, degree validity, enrollment — with no transcript ever shared.',
    to: '/verify',
    image: {
      src: '/images/verifier.jpg',
      alt: 'Two professionals shaking hands after a successful verification meeting',
    },
  },
  {
    icon: Award,
    title: 'Professional certifications',
    body: 'Engineering boards and accreditation bodies issue transferable credentials that survive platform changes.',
    to: '/verify',
  },
  {
    icon: ScrollText,
    title: 'Scholarship verification',
    body: 'Families prove income-adjacent eligibility claims; boards see only the attested result.',
    to: '/how-it-works',
  },
  {
    icon: Building2,
    title: 'Admissions',
    body: 'Cross-institution transfer of records with per-claim selective disclosure for entrance thresholds.',
    to: '/how-it-works',
  },
];

const WHY = [
  {
    icon: Lock,
    title: 'Private by design',
    body: 'Grades, identity and history live in an encrypted local witness. The network only ever sees commitments and booleans.',
  },
  {
    icon: ShieldCheck,
    title: 'Cryptographically verifiable',
    body: 'Every claim is backed by a compact zero-knowledge circuit — checked against public parameters, not institutional goodwill.',
  },
  {
    icon: Check,
    title: 'Selective disclosure',
    body: 'Prove GPA ≥ 3.5 without proving GPA = 3.71. Prove graduation without proving where you lived.',
  },
];

export const LandingPage: FC = () => {
  return (
    <div>
      <Hero />

      {/* Trusted by */}
      <section className="border-y border-line bg-paper">
        <div className="container-vc py-10">
          <Reveal>
            <p className="mono-label text-center">Issuing pilots with academic institutions</p>
            <ul className="mt-6 grid grid-cols-2 items-center justify-items-center gap-x-6 gap-y-5 md:grid-cols-3 lg:grid-cols-6">
              {INSTITUTIONS.map((name, i) => (
                <li key={name} className="flex items-center gap-2.5 text-mist/90">
                  <Crest seed={i} />
                  <span className="font-display text-[13px] leading-tight tracking-wide" style={{ fontWeight: 500 }}>
                    {name}
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* Proof without disclosure */}
      <section id="platform" className="scroll-mt-24" style={{ padding: '112px 0' }}>
        <div className="container-vc">
          <SectionHead
            overline="The core idea"
            title={
              <>
                Proof without <span className="italic text-deep">disclosure</span>
              </>
            }
            body="Verification does not have to mean exposure. Watch the same request handled two different ways."
          />
          <div className="mt-14">
            <ProofWithoutDisclosure />
          </div>
        </div>
      </section>

      {/* Journey steps */}
      <section className="border-y border-line bg-paper" style={{ padding: '96px 0' }}>
        <div className="container-vc">
          <SectionHead overline="From issuance to verification" title="One credential, two states" align="center" />
          <div className="mt-14 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-5">
            {[
              {
                step: '01',
                t: 'University issues',
                d: 'The registrar signs a credential; identity fields never leave the institution.',
              },
              {
                step: '02',
                t: 'State splits',
                d: 'A public commitment anchors the ledger; the witness stays private to the student.',
              },
              {
                step: '03',
                t: 'Student selects a claim',
                d: '“GPA ≥ 3.5”, “degree valid” — whatever the request actually needs.',
              },
              { step: '04', t: 'Circuit proves', d: 'A Compact zero-knowledge circuit evaluates the claim locally.' },
              {
                step: '05',
                t: 'Verifier confirms',
                d: 'The proof is checked in milliseconds. Nothing else is disclosed.',
              },
            ].map((s, i) => (
              <Reveal key={s.step} delay={i * 0.08}>
                <div className="relative">
                  <p className="font-display text-display-sm text-sand" style={{ fontWeight: 600 }}>
                    {s.step}
                  </p>
                  <h3 className="mt-3 text-title-md text-ink">{s.t}</h3>
                  <p className="mt-2 text-body-sm text-mist">{s.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.2} className="mt-12 text-center">
            <Link to="/how-it-works" className="btn-secondary">
              Experience the full walkthrough
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* Why VeriCred */}
      <section style={{ padding: '112px 0' }}>
        <div className="container-vc grid grid-cols-1 gap-12 lg:grid-cols-[1fr_1.35fr] lg:gap-20">
          <div>
            <SectionHead
              overline="Why VeriCred"
              title={
                <>
                  Trust infrastructure, not <span className="italic text-deep">data hoarding</span>
                </>
              }
              body="Three commitments shape every circuit we ship."
            />
            <Reveal delay={0.2} className="mt-8 overflow-hidden rounded-xl border border-line">
              <img
                src="/images/graduation.jpg"
                alt="Graduates in academic dress at a commencement ceremony"
                className="h-64 w-full object-cover"
                loading="lazy"
                style={{ filter: 'saturate(0.86)' }}
              />
            </Reveal>
          </div>
          <div className="space-y-5 lg:pt-4">
            {WHY.map((w, i) => (
              <Reveal key={w.title} delay={i * 0.1}>
                <div className="card card-hover flex gap-5 p-7">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-deep/[0.06] text-deep">
                    <w.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-title-md text-ink">{w.title}</h3>
                    <p className="mt-2 max-w-lg text-body-sm text-mist">{w.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className="border-y border-line bg-shell/60" style={{ padding: '112px 0' }}>
        <div className="container-vc">
          <SectionHead overline="Use cases" title="Built for every party in the chain of trust" />
          <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {USE_CASES.map((u, i) => (
              <Reveal key={u.title} delay={i * 0.06} className="h-full">
                <Link to={u.to} className="card card-hover block h-full overflow-hidden no-underline">
                  {u.image && (
                    <div className="h-40 overflow-hidden border-b border-line-soft">
                      <img
                        src={u.image.src}
                        alt={u.image.alt}
                        loading="lazy"
                        className="h-full w-full object-cover"
                        style={{ filter: 'saturate(0.8) brightness(0.98)' }}
                      />
                    </div>
                  )}
                  <div className="p-7">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal/10 text-teal">
                      <u.icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-5 text-title-md text-ink">{u.title}</h3>
                    <p className="mt-2.5 text-body-sm text-mist">{u.body}</p>
                    <span className="link-quiet mt-5 text-caption">
                      Learn more <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Student band */}
      <section style={{ padding: '112px 0' }}>
        <div className="container-vc grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <Reveal y={32}>
            <div className="relative overflow-hidden rounded-2xl border border-line">
              <img
                src="/images/student.jpg"
                alt="A graduate holding a mortarboard in front of a university building"
                className="h-[420px] w-full object-cover"
                loading="lazy"
                style={{ filter: 'saturate(0.82)' }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-deep/55 via-deep/10 to-transparent" aria-hidden />
              <div
                className="card absolute bottom-5 left-5 right-5 p-4 backdrop-blur"
                style={{ background: 'rgba(255,255,255,0.92)' }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="mono-label">VeriCred Wallet</p>
                    <p className="mt-1 text-body-sm font-semibold text-ink">
                      {useWalletStore.getState().credentials.filter((c) => c.owner && c.status === 'ACTIVE').length}{' '}
                      credentials · 1 pending issuance
                    </p>
                  </div>
                  <Link to="/wallet" className="btn-primary btn-sm">
                    Open wallet
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
          <div>
            <SectionHead
              overline="For students"
              title={
                <>
                  Own the record. <span className="italic text-deep">Share the answer.</span>
                </>
              }
              body="Your transcript never leaves your device. When an employer asks for a GPA floor or a board asks for graduation status, you generate a proof for exactly that — nothing adjacent, nothing extra."
            />
            <Reveal delay={0.2} className="mt-8">
              <ul className="space-y-3 text-body-sm text-graphite">
                {[
                  'Every credential carries live status from the public ledger',
                  'Proofs expire on your terms — share windows you control',
                  'QR + verification IDs make checks effortless for employers',
                ].map((line) => (
                  <li key={line} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
                    {line}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Technology */}
      <section className="border-t border-line" style={{ padding: '96px 0' }}>
        <div className="container-vc">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
            <SectionHead
              overline="Technology"
              title="Quiet cryptography, auditable infrastructure"
              body="VeriCred runs on the Midnight Network with Compact smart contracts. Dual-state design keeps witness data off-chain while public commitments remain independently checkable."
            />
            <Reveal delay={0.15}>
              <div className="flex flex-wrap gap-2.5">
                {[
                  'Midnight Network',
                  'Compact',
                  'Zero-Knowledge Proofs',
                  'Dual-State Architecture',
                  'Cryptographic Verification',
                ].map((t) => (
                  <span key={t} className="chip !bg-paper">
                    {t}
                  </span>
                ))}
              </div>
              <div className="mt-6 flex gap-3">
                <Link to="/architecture" className="btn-secondary btn-sm">
                  Privacy architecture
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link to="/settings" className="btn-ghost text-nav-link">
                  Network configuration
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ padding: '112px 0' }}>
        <div className="container-vc">
          <Reveal>
            <div
              className="card-dark relative overflow-hidden px-8 py-16 text-center sm:px-16 sm:py-20"
              style={{ background: '#14344B' }}
            >
              <img
                src="/images/campus.jpg"
                alt=""
                aria-hidden
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover opacity-[0.22]"
                style={{ filter: 'saturate(0.55)' }}
              />
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    'linear-gradient(165deg, rgba(20,52,75,0.82) 0%, rgba(20,52,75,0.62) 60%, rgba(20,52,75,0.88) 100%)',
                }}
                aria-hidden
              />
              <div className="bg-pattern-dots pointer-events-none absolute inset-0 opacity-[0.10]" aria-hidden />
              <p className="relative font-mono text-[11px] uppercase tracking-[0.24em] text-on-dark-mute">
                Get started
              </p>
              <h2 className="relative mx-auto mt-4 max-w-2xl text-display-lg text-on-dark">
                Issue credentials students can prove —{' '}
                <span className="italic" style={{ color: '#A8C1B5' }}>
                  without exposing them
                </span>
              </h2>
              <div className="relative mt-9 flex flex-wrap items-center justify-center gap-3">
                <Link
                  to="/universities?tab=issue"
                  className="btn-primary !bg-on-dark !text-deep !shadow-none hover:!bg-white"
                >
                  Start issuing
                </Link>
                <Link
                  to="/verify"
                  className="btn-secondary !border-on-dark-mute/30 !bg-transparent !text-on-dark hover:!bg-white/5"
                >
                  Verify a proof
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
