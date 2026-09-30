import { useEffect, useMemo, useState } from 'react';
import type { FC } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  GraduationCap,
  Loader2,
  QrCode,
  RotateCcw,
  Share2,
  ShieldCheck,
} from 'lucide-react';
import { useWalletStore } from '../store/useWalletStore';
import type { ClaimType, ProofRecord } from '../store/useWalletStore';
import { CLAIM_OPTIONS, generateProof, type GeneratedProof, type ProofStage } from '../services/proof-pipeline';
import { StatusBadge, QrFrame } from '../components/ui/domain';
import { CopyButton } from '../components/ui/primitives';
import { Stepper } from '../components/ui/domain';
import { OnboardingHint } from '../components/ui/OnboardingHint';
import { truncatedHash } from '../lib/ids';

const STEPS = ['Credential', 'Claim', 'Prove', 'Review', 'Share'];

/* Orbiting particle ring shown while proving */
const ProofOrbit: FC = () => {
  const reduced = useReducedMotion();
  return (
    <motion.svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      aria-hidden
      animate={reduced ? undefined : { rotate: 360 }}
      transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
    >
      <circle cx="60" cy="60" r="46" fill="none" stroke="#E7E7E2" strokeWidth="1" />
      <circle cx="60" cy="60" r="30" fill="none" stroke="#E7E7E2" strokeWidth="1" strokeDasharray="2 5" />
      {[0, 60, 120, 180, 240, 300].map((deg, i) => (
        <circle
          key={deg}
          cx={60 + 46 * Math.cos((deg * Math.PI) / 180)}
          cy={60 + 46 * Math.sin((deg * Math.PI) / 180)}
          r={i % 2 ? 3 : 4.5}
          fill={i % 2 ? '#A8C1B5' : '#4F8582'}
        />
      ))}
      <circle cx="60" cy="60" r="8" fill="#173B57" />
    </motion.svg>
  );
};

export const ProofGeneratorPage: FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const credentials = useWalletStore((s) => s.credentials);
  const recordProof = useWalletStore((s) => s.recordProof);

  const wallet = useMemo(() => credentials.filter((c) => c.owner && c.status === 'ACTIVE'), [credentials]);

  const [step, setStep] = useState(0);
  const [credentialId, setCredentialId] = useState<string | null>(params.get('cred'));
  const [claim, setClaim] = useState<ClaimType>('GPA_THRESHOLD');
  const [threshold, setThreshold] = useState(3.5);
  const [customClaim, setCustomClaim] = useState('');

  const [stage, setStage] = useState<ProofStage>('idle');
  const [error, setError] = useState<string | null>(null);
  const [proof, setProof] = useState<GeneratedProof | null>(null);

  const credential = wallet.find((c) => c.id === credentialId) ?? null;
  const claimOption = CLAIM_OPTIONS.find((o) => o.type === claim)!;
  const busy = stage === 'witness' || stage === 'proving' || stage === 'validating';

  useEffect(() => {
    if (credential && claim === 'COURSE_COMPLETION' && !customClaim) {
      setCustomClaim(credential.title.replace('Course Completion — ', ''));
    }
  }, [credential, claim, customClaim]);

  const canNext =
    step === 0
      ? !!credential
      : step === 1
        ? (!claimOption.requiresThreshold || threshold >= 0) &&
          (!claimOption.requiresCustom || customClaim.trim().length > 0)
        : true;

  const run = async () => {
    if (!credential) return;
    setStage('witness');
    setError(null);
    try {
      const out = await generateProof(
        {
          credential,
          claimType: claim,
          threshold: claimOption.requiresThreshold ? threshold : undefined,
          customClaim: customClaim.trim() || undefined,
        },
        setStage,
      );
      setProof(out);
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Proof generation failed');
      setStage('failed');
    }
  };

  const commitAndShare = () => {
    if (!proof) return;
    const stored: ProofRecord = recordProof(proof);
    setProof({ ...proof });
    setStep(4);
    return stored;
  };

  const verifyUrl =
    typeof window !== 'undefined' && proof ? `${window.location.origin}/verify/${proof.verificationId}` : '';

  return (
    <div style={{ paddingTop: 64 }}>
      <section className="border-b border-line bg-paper" style={{ padding: '56px 0 32px' }}>
        <div className="container-vc">
          <p className="overline">Proof generator</p>
          <h1 className="mt-2.5 text-display-lg text-ink">What do you want to prove?</h1>
          <div className="mt-6 overflow-x-auto no-scrollbar">
            <Stepper steps={STEPS} current={step} maxDone={proof ? 3 : stage === 'complete' ? 2 : -1} />
          </div>
        </div>
      </section>

      <section style={{ padding: '48px 0 112px' }}>
        <div className="container-vc">
          <OnboardingHint page="proof" />
        </div>
        <div className="container-vc grid grid-cols-1 gap-8 lg:grid-cols-[340px_1fr]">
          {/* Left rail */}
          <aside className="space-y-5">
            <div className="card p-5">
              <p className="mono-label mb-3">Selected credential</p>
              {credential ? (
                <div>
                  <p className="text-body-sm font-semibold text-ink">{credential.title}</p>
                  <p className="mt-1 text-caption text-mist">{credential.institution}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <StatusBadge status={credential.status} />
                    <span className="mono-label text-[10px]">{credential.displayId}</span>
                  </div>
                </div>
              ) : (
                <p className="text-caption text-faint">None selected yet.</p>
              )}
            </div>
            <div className="card p-5">
              <p className="mono-label mb-3">Claim</p>
              <p className="text-body-sm font-semibold text-ink">{claimOption.title}</p>
              <p className="mt-1 text-caption text-mist">{claimOption.hint}</p>
              {claimOption.requiresThreshold && (
                <p className="mt-3 font-mono text-[12px] text-teal">GPA ≥ {threshold.toFixed(2)}</p>
              )}
              {claimOption.requiresCustom && customClaim && (
                <p className="mt-3 font-mono text-[12px] text-teal">“{customClaim.trim()}”</p>
              )}
            </div>
            <div className="card-quiet p-5 text-caption text-mist">
              <ShieldCheck className="mb-2 h-4 w-4 text-teal" />
              The generated proof attests only to this claim. Identity, exact GPA and transcript values remain in
              encrypted witness storage on your device.
            </div>
            <Link to="/wallet" className="link-quiet btn-ghost text-body-sm">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to wallet
            </Link>
          </aside>

          {/* Main panel */}
          <div className="card relative min-h-[480px] overflow-hidden">
            <AnimatePresence mode="wait">
              {/* STEP 0 — credential */}
              {step === 0 && (
                <motion.div
                  key="s0"
                  className="p-6 sm:p-8"
                  initial={{ opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -18 }}
                >
                  <h2 className="text-title-lg text-ink">Select a credential</h2>
                  <p className="mt-1.5 text-body-sm text-mist">
                    Pick one of your active credentials to prove a claim against.
                  </p>
                  <div className="mt-6 space-y-3">
                    {wallet.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setCredentialId(c.id)}
                        className={`card flex w-full items-center justify-between gap-4 p-4 text-left transition-all ${
                          credentialId === c.id ? 'border-deep/50 shadow-soft' : 'hover:border-teal/40'
                        }`}
                      >
                        <span className="flex items-center gap-3.5">
                          <span
                            className={`flex h-9 w-9 items-center justify-center rounded-md ${credentialId === c.id ? 'bg-deep text-on-dark' : 'bg-shell text-mist'}`}
                          >
                            <GraduationCap className="h-4 w-4" />
                          </span>
                          <span>
                            <span className="block text-body-sm font-semibold text-ink">{c.title}</span>
                            <span className="block text-caption text-mist">
                              {c.institution} · {c.program}
                            </span>
                          </span>
                        </span>
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-full border ${credentialId === c.id ? 'border-teal bg-teal text-white' : 'border-line'}`}
                        >
                          {credentialId === c.id && <Check className="h-3 w-3" strokeWidth={3} />}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="mt-8 flex justify-end">
                    <button className="btn-primary" disabled={!canNext} onClick={() => setStep(1)}>
                      Choose claim <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 1 — claim */}
              {step === 1 && (
                <motion.div
                  key="s1"
                  className="p-6 sm:p-8"
                  initial={{ opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -18 }}
                >
                  <h2 className="text-title-lg text-ink">Select the claim</h2>
                  <p className="mt-1.5 text-body-sm text-mist">Each claim maps to a different compact circuit.</p>
                  <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {CLAIM_OPTIONS.map((o) => (
                      <button
                        key={o.type}
                        onClick={() => setClaim(o.type)}
                        className={`card p-4 text-left transition-all ${claim === o.type ? 'border-teal/60 bg-teal/[0.04] shadow-soft' : 'hover:border-teal/30'}`}
                      >
                        <span className="flex items-center justify-between">
                          <span className="text-body-sm font-semibold text-ink">{o.title}</span>
                          <span className="font-mono text-[10px] text-faint">{o.type}</span>
                        </span>
                        <span className="mt-1 block text-caption text-mist">{o.hint}</span>
                      </button>
                    ))}
                  </div>

                  {claimOption.requiresThreshold && (
                    <div className="card-quiet mt-6 p-5">
                      <div className="flex items-center justify-between">
                        <p className="text-body-sm font-semibold text-ink">Minimum GPA to attest</p>
                        <p className="font-mono text-title-sm text-deep">{threshold.toFixed(2)}</p>
                      </div>
                      <input
                        type="range"
                        min={2}
                        max={4}
                        step={0.05}
                        value={threshold}
                        onChange={(e) => setThreshold(parseFloat(e.target.value))}
                        className="mt-3 w-full accent-[#2F6B8A]"
                        aria-label="GPA threshold"
                      />
                      <div className="mt-1 flex justify-between font-mono text-[10.5px] text-faint">
                        <span>2.00</span>
                        <span>3.00</span>
                        <span>4.00</span>
                      </div>
                    </div>
                  )}
                  {claimOption.requiresCustom && (
                    <div className="mt-6">
                      <label className="input-label" htmlFor="custom-claim">
                        {claim === 'COURSE_COMPLETION' ? 'Course or requirement' : 'Custom claim predicate (demo)'}
                      </label>
                      <input
                        id="custom-claim"
                        className="input-field"
                        placeholder="e.g. Advanced Cryptography — completed with attestation"
                        value={customClaim}
                        onChange={(e) => setCustomClaim(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="mt-8 flex justify-between">
                    <button className="btn-secondary" onClick={() => setStep(0)}>
                      <ArrowLeft className="h-4 w-4" /> Credential
                    </button>
                    <button className="btn-primary" disabled={!canNext} onClick={() => setStep(2)}>
                      Generate ZK proof <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 2 — prove */}
              {step === 2 && (
                <motion.div
                  key="s2"
                  className="flex min-h-[480px] flex-col items-center justify-center p-6 sm:p-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {busy || stage === 'complete' ? (
                    <>
                      <ProofOrbit />
                      <div className="mt-8 w-full max-w-sm space-y-3">
                        {(
                          [
                            { key: 'witness', label: 'Preparing witness' },
                            { key: 'proving', label: 'Generating ZK proof' },
                            { key: 'validating', label: 'Validating circuit' },
                            { key: 'complete', label: 'Proof generated' },
                          ] as const
                        ).map((row, i) => {
                          const order = ['witness', 'proving', 'validating', 'complete'] as const;
                          const stageIdx = order.indexOf(stage);
                          const current = stage === row.key;
                          const done = stage === 'complete' || (stageIdx >= 0 && stageIdx > i);
                          return (
                            <div
                              key={row.key}
                              className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
                                done
                                  ? 'border-teal/35 bg-teal/[0.05]'
                                  : current
                                    ? 'border-deep/40 bg-paper shadow-soft'
                                    : 'border-line bg-paper opacity-50'
                              }`}
                            >
                              {done ? (
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-teal" />
                              ) : current ? (
                                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-deep" />
                              ) : (
                                <span className="h-2 w-2 shrink-0 rounded-full bg-line" />
                              )}
                              <span
                                className={`text-body-sm ${done || current ? 'font-semibold text-ink' : 'text-mist'}`}
                              >
                                {done ? row.label : current ? `${row.label}…` : row.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <p className="mono-label mt-6">
                        circuit ·{' '}
                        {claim === 'GPA_THRESHOLD'
                          ? 'proveGpaThreshold'
                          : claim === 'DEGREE_VALIDITY' || claim === 'COURSE_COMPLETION' || claim === 'CUSTOM'
                            ? 'proveDegreeMatch'
                            : 'verifyCredential'}
                      </p>
                    </>
                  ) : stage === 'failed' ? (
                    <div className="max-w-md text-center">
                      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-error/10 text-error">
                        <AlertTriangle className="h-6 w-6" />
                      </span>
                      <h3 className="mt-5 text-title-lg text-ink">No proof produced</h3>
                      <p className="mt-2 text-body-sm text-mist">{error}</p>
                      <p className="mt-3 text-caption text-faint">
                        Nothing was disclosed — a failed circuit leaks nothing.
                      </p>
                      <div className="mt-6 flex justify-center gap-3">
                        <button className="btn-secondary" onClick={() => setStep(1)}>
                          Adjust claim
                        </button>
                        <button className="btn-primary" onClick={run}>
                          <RotateCcw className="h-4 w-4" /> Retry
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="max-w-sm text-center">
                      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-deep/[0.06] text-deep">
                        <ShieldCheck className="h-6 w-6" />
                      </span>
                      <h3 className="mt-5 text-title-lg text-ink">Ready to prove</h3>
                      <p className="mt-2 text-body-sm text-mist">
                        We’ll evaluate <b>{claimOption.title}</b> against the witness data held for{' '}
                        <b>{credential?.title}</b>.
                      </p>
                      <button className="btn-primary mt-7" onClick={run}>
                        Generate ZK proof <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  <button className="link-quiet btn-ghost mt-8 text-body-sm" onClick={() => setStep(1)}>
                    <ArrowLeft className="h-3.5 w-3.5" /> Edit claim
                  </button>
                </motion.div>
              )}

              {/* STEP 3 — review */}
              {step === 3 && proof && (
                <motion.div
                  key="s3"
                  className="p-6 sm:p-8"
                  initial={{ opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -18 }}
                >
                  <span className="badge badge-active">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Proof generated
                  </span>
                  <h2 className="mt-4 text-display-sm text-ink">{proof.claimLabel}</h2>
                  <p className="mt-1.5 text-body-sm text-mist">
                    Review exactly what this proof discloses before sharing it.
                  </p>
                  <div className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div className="card-quiet p-5">
                      <p className="mono-label mb-3 text-teal">Disclosed</p>
                      <ul className="space-y-2 text-body-sm text-ink">
                        {proof.disclosedFields.map((f) => (
                          <li key={f} className="flex items-start gap-2.5">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal" /> {f}
                          </li>
                        ))}
                        <li className="flex items-start gap-2.5 font-mono text-caption text-mist">
                          <span className="mt-0.5 h-4 w-4 shrink-0 text-center leading-4">✓</span>{' '}
                          {truncatedHash(proof.proofHash)}
                        </li>
                      </ul>
                    </div>
                    <div className="card-quiet p-5">
                      <p className="mono-label mb-3 text-mist">Concealed</p>
                      <ul className="space-y-2 text-body-sm text-mist">
                        {proof.concealedFields.map((f) => (
                          <li key={f} className="flex items-center gap-2.5">
                            <span className="redacted inline-block h-3.5 w-3.5 shrink-0" /> {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-shell px-4 py-3 text-caption text-mist">
                    <span>
                      Circuit <span className="font-mono text-graphite">{proof.circuit}</span> · valid until{' '}
                      {new Date(proof.expiresAt).toLocaleDateString()}
                    </span>
                    <span className="font-mono text-[11px]">tx {truncatedHash(proof.txHash)}</span>
                  </div>
                  <div className="mt-8 flex justify-between">
                    <button
                      className="btn-secondary"
                      onClick={() => {
                        setStep(1);
                        setStage('idle');
                        setProof(null);
                      }}
                    >
                      <ArrowLeft className="h-4 w-4" /> Change claim
                    </button>
                    <button className="btn-primary" onClick={commitAndShare}>
                      Share proof <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 4 — share */}
              {step === 4 && proof && (
                <motion.div
                  key="s4"
                  className="p-6 sm:p-8"
                  initial={{ opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <h2 className="text-title-lg text-ink">Proof ready to share</h2>
                  <p className="mt-1.5 text-body-sm text-mist">Any verifier can check this proof — you decide who.</p>
                  <div className="mt-7 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_auto]">
                    <div className="space-y-4">
                      <div className="card p-5">
                        <p className="mono-label mb-1.5">Verification ID</p>
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-mono text-title-md text-deep">{proof.verificationId}</p>
                          <CopyButton value={proof.verificationId} label={<Copy className="h-4 w-4" />} />
                        </div>
                      </div>
                      <div className="card p-5">
                        <p className="mono-label mb-1.5">Public link</p>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="font-mono text-caption break-all text-graphite">{verifyUrl}</p>
                          <div className="flex gap-2">
                            <CopyButton value={verifyUrl} />
                            <button
                              className="btn-secondary btn-sm"
                              onClick={() => {
                                if (typeof navigator.share === 'function')
                                  void navigator.share({ url: verifyUrl, title: 'VeriCred proof' });
                                else void navigate(`/verify/${proof.verificationId}`);
                              }}
                            >
                              <Share2 className="h-3.5 w-3.5" />{' '}
                              {typeof navigator.share === 'function' ? 'Share' : 'Open'}
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Link to={`/verify/${proof.verificationId}`} className="btn-primary btn-sm">
                          <QrCode className="h-4 w-4" /> View public verification page
                        </Link>
                        <Link to="/wallet" className="btn-secondary btn-sm">
                          Back to wallet
                        </Link>
                      </div>
                    </div>
                    <div className="lg:pl-4">
                      <QrFrame value={verifyUrl || proof.verificationId} size={170} caption="Scan to verify" />
                    </div>
                  </div>
                  <p className="mt-8 max-w-lg text-caption text-faint">
                    This proof is a standalone artifact — it stays valid until the expiry shown above or until the
                    underlying credential’s status changes on the ledger.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ProofGeneratorPage;
