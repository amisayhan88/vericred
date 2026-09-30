import { useEffect, useMemo, useState } from 'react';
import type { FC } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, ArrowLeft } from 'lucide-react';
import { useWalletStore } from '../store/useWalletStore';
import { evaluate, resolveTarget } from '../services/verification';
import { VerificationSeal, QrFrame } from '../components/ui/domain';
import { CopyButton } from '../components/ui/primitives';
import { truncatedHash } from '../lib/ids';

export const VerificationResultPage: FC = () => {
  const { vid = '' } = useParams();
  const state = useWalletStore();
  const [booted, setBooted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setBooted(true), 550);
    return () => clearTimeout(t);
  }, []);

  const outcome = useMemo(() => evaluate(resolveTarget(state, vid)), [state, vid]);
  const url = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <div style={{ paddingTop: 64 }} className="min-h-screen">
      <section style={{ padding: '72px 0 112px' }}>
        <div className="container-vc max-w-3xl">
          <div className="mb-10 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 font-display text-lg text-ink no-underline">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-deep text-on-dark">
                <Check className="h-4 w-4" strokeWidth={3} />
              </span>
              VeriCred
            </Link>
            <span className="chip">Public verification</span>
          </div>

          <div className="card overflow-hidden">
            <div
              className="flex flex-col items-center gap-6 px-6 py-10 text-center sm:px-12"
              style={{
                background: outcome.ok
                  ? 'linear-gradient(180deg,#F4F8F4, #FFFFFF)'
                  : 'linear-gradient(180deg,#FAF3F1,#FFFFFF)',
              }}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.55, ease: [0.22, 0.61, 0.36, 1] }}
              >
                <VerificationSeal size={116} ok={outcome.ok} />
              </motion.div>
              <div>
                <h1 className="text-display-sm text-ink">{outcome.headline}</h1>
                <p className="mt-2 font-mono text-caption text-mist">{vid.toUpperCase()}</p>
              </div>

              <motion.div
                className="w-full max-w-md space-y-2.5 text-left"
                initial={booted ? 'show' : 'hidden'}
                animate="show"
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.14 } } }}
              >
                {(outcome.ok
                  ? ['Credential authentic', 'Institution verified', 'Proof valid', 'Credential active']
                  : outcome.checks.map((c) => c.label)
                ).map((label) => {
                  const row = outcome.checks.find((c) => c.label.startsWith(label.slice(0, 12)));
                  const ok = outcome.ok ? true : (row?.ok ?? false);
                  return (
                    <motion.div
                      key={label}
                      className="flex items-center justify-between rounded-lg border border-line bg-paper px-4 py-3"
                      variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
                    >
                      <span className="flex items-center gap-2.5 text-body-sm font-semibold text-ink">
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-full ${ok ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}
                        >
                          <Check className="h-3 w-3" strokeWidth={3} />
                        </span>
                        {label}
                      </span>
                      <span className="mono-label" style={{ color: ok ? '#3E7C5B' : '#A8452F' }}>
                        {ok ? 'verified' : 'failed'}
                      </span>
                    </motion.div>
                  );
                })}
              </motion.div>

              {outcome.claim && (
                <p className="text-body-md text-graphite">
                  Proven claim: <b className="text-ink">{outcome.claim}</b>
                </p>
              )}

              <div className="mt-2 w-full max-w-md rounded-xl bg-shell px-5 py-4">
                <p className="text-body-sm font-semibold text-ink">No private academic information was disclosed.</p>
                <p className="mt-1.5 text-caption text-mist">
                  The verifier received the boolean attestation above and the public labels:{' '}
                  {outcome.disclosed.join(', ') || '—'}. Identity, exact GPA and transcript records remain in encrypted
                  witness storage.
                </p>
              </div>

              {outcome.target.kind === 'proof' && (
                <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row sm:items-end sm:justify-between">
                  <div className="space-y-2 text-left">
                    <p className="mono-label">Proof hash</p>
                    <p className="font-mono text-caption text-graphite">
                      {truncatedHash(outcome.target.proof.proofHash, 14, 8)}
                    </p>
                    <p className="text-caption text-mist">
                      Valid until {new Date(outcome.target.proof.expiresAt).toLocaleDateString()}
                    </p>
                    <div className="flex gap-2 pt-1">
                      <CopyButton value={url} label="Copy link" className="btn-sm" />
                    </div>
                  </div>
                  <QrFrame value={url} size={132} beam={false} caption="Re-check anytime" />
                </div>
              )}
            </div>
            <div className="flex items-center justify-between border-t border-line px-6 py-4">
              <Link to="/verify" className="link-quiet text-body-sm">
                <ArrowLeft className="h-3.5 w-3.5" /> Verifier portal
              </Link>
              <Link to="/" className="text-caption text-mist">
                Powered by VeriCred · Midnight Network
              </Link>
            </div>
          </div>

          <p className="mt-8 text-center text-caption text-faint">
            This page reveals exactly what the proof discloses — and nothing more.
          </p>
        </div>
      </section>
    </div>
  );
};

export default VerificationResultPage;
