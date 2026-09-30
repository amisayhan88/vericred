import { useMemo, useState } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, FileUp, Link2, Loader2, ScanLine, ShieldCheck, Upload, Wallet } from 'lucide-react';
import { useWalletStore } from '../store/useWalletStore';
import { evaluate, resolveTarget, type VerificationOutcome } from '../services/verification';
import { VerificationSeal } from '../components/ui/domain';
import { OnboardingHint } from '../components/ui/OnboardingHint';

type Tab = 'id' | 'qr' | 'upload' | 'wallet';

const TABS: Array<{ id: Tab; label: string; Icon: FC<{ className?: string }> }> = [
  { id: 'id', label: 'Verification ID', Icon: ShieldCheck },
  { id: 'qr', label: 'Scan QR', Icon: Camera },
  { id: 'upload', label: 'Upload proof', Icon: Upload },
  { id: 'wallet', label: 'Wallet session', Icon: Wallet },
];

const VERIFIERS = ['Helix Robotics', 'Meridian Analytics', 'Aurelia State College', 'National Scholarship Board'];

export const VerifyPage: FC = () => {
  const navigate = useNavigate();
  const state = useWalletStore();
  const { isConnected, connectWallet } = useWalletStore();
  const [tab, setTab] = useState<Tab>('id');
  const [handle, setHandle] = useState('');
  const [verifier, setVerifier] = useState(VERIFIERS[0]);
  const [checking, setChecking] = useState(false);
  const [outcome, setOutcome] = useState<VerificationOutcome | null>(null);

  const run = async (raw: string) => {
    const value = raw.trim();
    if (!value) return;
    setChecking(true);
    setOutcome(null);
    await new Promise((r) => setTimeout(r, 900));
    const extracted = value.replace(/^https?:\/\/[^/]+\/verify\/?/i, '').split('?')[0];
    const target = resolveTarget(state, extracted);
    const result = evaluate(target);
    setOutcome(result);
    state.logVerification({
      verifier,
      verifierType: 'EMPLOYER',
      target: extracted,
      claim: result.claim ?? result.headline,
      outcome: result.ok ? 'PASSED' : 'FAILED',
    });
    if (result.target.kind === 'proof') state.markProofVerified(result.target.proof.id, verifier);
    setChecking(false);
  };

  const onFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      try {
        const parsed: unknown = JSON.parse(text);
        let vid = '';
        if (typeof parsed === 'string') vid = parsed;
        else if (parsed && typeof parsed === 'object') {
          const obj = parsed as { verificationId?: unknown; id?: unknown };
          vid = typeof obj.verificationId === 'string' ? obj.verificationId : typeof obj.id === 'string' ? obj.id : '';
        }
        void run(vid || handle || 'no-id-in-file');
      } catch {
        void run(handle || file.name.replace(/\.[^.]+$/, ''));
      }
    };
    reader.readAsText(file);
  };

  return (
    <div style={{ paddingTop: 64 }}>
      <section className="border-b border-line bg-paper" style={{ padding: '56px 0 40px' }}>
        <div className="container-vc">
          <p className="overline">Verifier portal</p>
          <h1 className="mt-2.5 max-w-xl text-display-lg text-ink">Check a claim. See nothing else.</h1>
          <p className="mt-3 max-w-xl text-body-md text-mist">
            Enter the verification ID from a proof, scan its QR code, or upload the artifact. You receive the answer —
            the holder’s transcript stays sealed.
          </p>
        </div>
      </section>

      <section style={{ padding: '56px 0 112px' }}>
        <div className="container-vc">
          <OnboardingHint page="verify" />
        </div>
        <div className="container-vc grid grid-cols-1 gap-8 lg:grid-cols-[420px_1fr]">
          {/* Input panel */}
          <div className="card h-fit p-6">
            <div className="mb-5 flex gap-1.5 rounded-xl bg-shell p-1.5">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex flex-1 flex-col items-center gap-1 rounded-lg px-2 py-2.5 text-[11px] font-semibold transition-colors ${
                    tab === t.id ? 'bg-paper text-deep shadow-soft' : 'text-mist hover:text-ink'
                  }`}
                >
                  <t.Icon className="h-4 w-4" />
                  {t.label}
                </button>
              ))}
            </div>

            {tab === 'id' && (
              <div className="space-y-4">
                <div>
                  <label className="input-label" htmlFor="vid">
                    Verification ID or credential ID
                  </label>
                  <input
                    id="vid"
                    className="input-field font-mono"
                    placeholder="VP-… or VC-…"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && void run(handle)}
                  />
                </div>
                <TryHint
                  onPick={(v) => {
                    setHandle(v);
                    void run(v);
                  }}
                />
              </div>
            )}

            {tab === 'qr' && (
              <div className="space-y-4">
                <div className="relative mx-auto flex h-44 w-full max-w-[260px] items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-line bg-shell">
                  <ScanLine className="h-8 w-8 text-faint" />
                  <motion.span
                    className="absolute inset-x-4 h-[2px] bg-teal"
                    aria-hidden
                    initial={{ top: 18 }}
                    animate={{ top: [18, 150, 18] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </div>
                <p className="text-center text-caption text-mist">
                  On a phone, the device camera opens this page directly from a credential QR. Here, paste the scanned
                  link or ID below.
                </p>
                <div>
                  <label className="input-label" htmlFor="qr-paste">
                    Scanned value
                  </label>
                  <input
                    id="qr-paste"
                    className="input-field font-mono"
                    placeholder="https://…/verify/VP-… or VP-…"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                  />
                </div>
              </div>
            )}

            {tab === 'upload' && (
              <div className="space-y-4">
                <label className="card-quiet flex cursor-pointer flex-col items-center gap-2 p-8 text-center transition-colors hover:border-teal/40">
                  <FileUp className="h-6 w-6 text-deep" />
                  <span className="text-body-sm font-semibold text-ink">Drop the proof file</span>
                  <span className="text-caption text-mist">JSON proof artifact exported from a VeriCred wallet</span>
                  <input
                    type="file"
                    accept="application/json,.json"
                    className="hidden"
                    onChange={(e) => onFile(e.target.files?.[0])}
                  />
                </label>
                <p className="text-caption text-mist">
                  Offline without a file? Enter the verification ID from the email or chat the proof arrived through:
                </p>
                <input
                  className="input-field font-mono"
                  placeholder="VP-…"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                />
              </div>
            )}

            {tab === 'wallet' && (
              <div className="space-y-4">
                {isConnected ? (
                  <div className="card-quiet p-4 text-body-sm text-graphite">
                    Wallet session active — checks will be attributed to your connected address on the ledger record.
                  </div>
                ) : (
                  <button className="btn-secondary w-full" onClick={() => void connectWallet('auto')}>
                    <Link2 className="h-4 w-4" /> Connect wallet to sign this check
                  </button>
                )}
                <div>
                  <label className="input-label" htmlFor="vid-w">
                    Verification ID
                  </label>
                  <input
                    id="vid-w"
                    className="input-field font-mono"
                    placeholder="VP-…"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="mt-5">
              <label className="input-label" htmlFor="verifier">
                Checking as
              </label>
              <select
                id="verifier"
                className="input-field"
                value={verifier}
                onChange={(e) => setVerifier(e.target.value)}
              >
                {VERIFIERS.map((v) => (
                  <option key={v}>{v}</option>
                ))}
                <option>Other institution</option>
              </select>
            </div>

            <button className="btn-primary mt-6 w-full" disabled={checking || !handle} onClick={() => void run(handle)}>
              {checking ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Checking proof…
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" /> Verify credential
                </>
              )}
            </button>
          </div>

          {/* Result panel */}
          <div className="min-h-[420px]">
            <AnimatePresence mode="wait">
              {checking && (
                <motion.div
                  key="checking"
                  className="card flex h-full min-h-[420px] flex-col items-center justify-center gap-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <VerificationSeal size={96} />
                  <p className="mono-label">checking proof against public parameters…</p>
                </motion.div>
              )}
              {!checking && outcome && (
                <motion.div
                  key="result"
                  className={`card h-full overflow-hidden ${outcome.ok ? '' : 'border-error/40'}`}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <div
                    className={`flex items-start justify-between gap-4 px-7 py-6 ${outcome.ok ? 'bg-success/[0.06]' : 'bg-error/[0.06]'}`}
                  >
                    <div>
                      <h2 className={`text-display-sm ${outcome.ok ? 'text-success' : 'text-error'}`}>
                        {outcome.ok ? 'Credential valid ✓' : outcome.headline}
                      </h2>
                      {outcome.claim && <p className="mt-1.5 text-body-md text-ink">Claim: {outcome.claim}</p>}
                    </div>
                    <VerificationSeal size={92} ok={outcome.ok} />
                  </div>
                  <div className="px-7 py-6">
                    <dl className="space-y-3">
                      {outcome.credentialTitle && <Row k="Degree" v={outcome.credentialTitle} />}
                      {outcome.institution && <Row k="Institution" v={outcome.institution} />}
                      {outcome.checks.map((c) => (
                        <div
                          key={c.label}
                          className="flex items-start justify-between gap-4 border-b border-line-soft pb-3 last:border-0"
                        >
                          <dt className="flex items-center gap-2.5 text-body-sm text-graphite">
                            <span className={`h-2 w-2 shrink-0 rounded-full ${c.ok ? 'bg-success' : 'bg-error'}`} />
                            {c.label}
                          </dt>
                          <dd className="max-w-[62%] text-right text-caption text-mist">{c.detail}</dd>
                        </div>
                      ))}
                      <div className="flex items-start justify-between gap-4 pt-2">
                        <dt className="text-body-sm font-semibold text-ink">Private academic data</dt>
                        <dd className="badge badge-neutral">Not disclosed</dd>
                      </div>
                    </dl>
                    <div className="mt-6 flex flex-wrap items-center gap-3">
                      <button
                        className="btn-secondary btn-sm"
                        onClick={() => {
                          setOutcome(null);
                          setHandle('');
                        }}
                      >
                        Verify another
                      </button>
                      {outcome.target.kind === 'proof' && (
                        <button
                          className="link-quiet btn-ghost text-body-sm"
                          onClick={() =>
                            navigate(
                              `/verify/${outcome.target.kind === 'proof' ? outcome.target.proof.verificationId : ''}`,
                            )
                          }
                        >
                          Open public record
                          <motion.span whileHover={{ x: 2 }}>→</motion.span>
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
              {!checking && !outcome && (
                <motion.div
                  key="empty"
                  className="card flex h-full min-h-[420px] flex-col items-center justify-center gap-3 p-8 text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-shell text-mist">
                    <ShieldCheck className="h-6 w-6" />
                  </span>
                  <p className="text-title-md text-ink">Awaiting a proof</p>
                  <p className="max-w-sm text-body-sm text-mist">
                    The result appears here — the claim, the issuing institution, and the explicit list of what was{' '}
                    <em>not</em> disclosed.
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

const Row: FC<{ k: string; v: string }> = ({ k, v }) => (
  <div className="flex items-baseline justify-between gap-4 border-b border-line-soft pb-3">
    <dt className="text-body-sm text-graphite">{k}</dt>
    <dd className="text-right font-mono text-[13px] font-semibold text-ink">{v}</dd>
  </div>
);

const TryHint: FC<{ onPick: (v: string) => void }> = ({ onPick }) => {
  const proofs = useWalletStore((s) => s.proofs);
  const sample = useMemo(() => proofs.find((p) => p.status !== 'EXPIRED')?.verificationId, [proofs]);
  if (!sample) return null;
  return (
    <p className="text-caption text-mist">
      Evaluating the demo? Try a seeded proof id:{' '}
      <button className="link-quiet font-mono" onClick={() => onPick(sample)}>
        {sample}
      </button>
    </p>
  );
};

export default VerifyPage;
