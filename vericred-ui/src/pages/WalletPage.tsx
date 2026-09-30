import { useMemo, useState } from 'react';
import type { FC } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BadgeCheck,
  Eye,
  GraduationCap,
  KeyRound,
  QrCode,
  ScrollText,
  ShieldHalf,
  Wallet as WalletIcon,
} from 'lucide-react';
import { CURRENT_STUDENT, useWalletStore } from '../store/useWalletStore';
import type { Credential } from '../store/useWalletStore';
import { StatusBadge } from '../components/ui/domain';
import { Reveal, TiltCard } from '../components/ui/primitives';
import { OnboardingHint } from '../components/ui/OnboardingHint';

const TYPE_ICON: Record<Credential['type'], FC<{ className?: string }>> = {
  DEGREE: GraduationCap,
  TRANSCRIPT: ScrollText,
  GPA: ShieldHalf,
  GRADUATION: BadgeCheck,
  COURSE_COMPLETION: ScrollText,
  INSTITUTION_VERIFICATION: KeyRound,
};

const fmt = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });

const CredentialTile: FC<{ credential: Credential; index: number }> = ({ credential, index }) => {
  const Icon = TYPE_ICON[credential.type];
  const canProve = credential.status === 'ACTIVE';
  return (
    <Reveal delay={index * 0.06}>
      <TiltCard maxTilt={4} className="h-full">
        <div className="card card-hover flex h-full flex-col p-6">
          <div className="flex items-start justify-between gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-deep/[0.06] text-deep">
              <Icon className="h-5 w-5" />
            </span>
            <StatusBadge status={credential.status} />
          </div>
          <div className="mt-4 flex-1">
            <p className="mono-label">{credential.type.replaceAll('_', ' ')}</p>
            <h3 className="mt-1.5 font-display text-title-lg leading-snug text-ink">{credential.title}</h3>
            <p className="mt-1 text-body-sm text-mist">{credential.institution}</p>
          </div>
          <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-line-soft pt-4 text-center">
            <div>
              <dt className="mono-label !text-[10px]">Issued</dt>
              <dd className="mt-1 text-body-sm font-semibold text-ink">{fmt(credential.issuedAt)}</dd>
            </div>
            <div>
              <dt className="mono-label !text-[10px]">Verified</dt>
              <dd
                className={`mt-1 text-body-sm font-semibold ${credential.institutionVerified ? 'text-success' : 'text-warning'}`}
              >
                {credential.institutionVerified ? 'Yes' : 'Pending'}
              </dd>
            </div>
            <div>
              <dt className="mono-label !text-[10px]">Proofs</dt>
              <dd className="mt-1 text-body-sm font-semibold text-ink">{credential.proofsGenerated}</dd>
            </div>
          </dl>
          <div className="mt-5 flex items-center gap-2">
            {canProve ? (
              <Link to={`/proof?cred=${credential.id}`} className="btn-primary btn-sm flex-1">
                Generate proof
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <span className="badge badge-neutral flex-1 justify-center !py-2 text-caption">
                {credential.status === 'PENDING'
                  ? 'Issuance pending'
                  : `Proof unavailable — ${credential.status.toLowerCase()}`}
              </span>
            )}
            <Link
              to={`/credential/${credential.displayId}`}
              className="btn-secondary btn-sm !px-2.5"
              aria-label={`View ${credential.title}`}
              title="Credential detail"
            >
              <Eye className="h-4 w-4 text-mist" />
            </Link>
            <Link
              to={`/verify/${credential.displayId}`}
              className="btn-secondary btn-sm !px-2.5"
              aria-label={`Public verification page for ${credential.title}`}
              title="Public verification"
            >
              <QrCode className="h-4 w-4 text-mist" />
            </Link>
          </div>
        </div>
      </TiltCard>
    </Reveal>
  );
};

export const WalletPage: FC = () => {
  const { credentials, isConnected, walletAddress, connectWallet } = useWalletStore();
  const mine = useMemo(() => credentials.filter((c) => c.owner), [credentials]);
  const active = mine.filter((c) => c.status === 'ACTIVE');
  const pending = mine.filter((c) => c.status === 'PENDING');
  const archive = mine.filter((c) => c.status === 'EXPIRED' || c.status === 'REVOKED' || c.status === 'SUSPENDED');
  const [showArchive, setShowArchive] = useState(false);

  return (
    <div style={{ paddingTop: 64 }}>
      <section className="border-b border-line bg-paper" style={{ padding: '64px 0 40px' }}>
        <div className="container-vc flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="overline">Student experience</p>
            <h1 className="mt-3 text-display-lg text-ink">Credential wallet</h1>
            <p className="mt-3 max-w-xl text-body-md text-mist">
              Every record your institutions have issued to you — each with live ledger status and selective-disclosure
              proofs. Private fields never leave this device.
            </p>
          </div>
          <div className="card p-5 lg:w-96">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2.5">
                <WalletIcon className="h-[18px] w-[18px] text-teal" />
                <span className="text-body-sm font-semibold text-ink">
                  {isConnected ? 'Wallet connected' : 'Demo session'}
                </span>
              </span>
              {!isConnected && (
                <button className="btn-secondary btn-sm" onClick={() => void connectWallet('auto')}>
                  Connect
                </button>
              )}
            </div>
            <p className="mt-3 break-all font-mono text-caption text-mist">
              {walletAddress ?? `did:midnight:vc:${CURRENT_STUDENT.toLowerCase().replace(' ', '-')}`}
            </p>
            <p className="mt-1 text-caption text-faint">Holder: {CURRENT_STUDENT}</p>
          </div>
        </div>
      </section>

      <section style={{ padding: '56px 0 96px' }}>
        <div className="container-vc space-y-12">
          <OnboardingHint page="wallet" />
          <div>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-title-lg text-ink">
                Active <span className="ml-1 font-mono text-caption text-mist">{active.length}</span>
              </h2>
              <Link to="/proof" className="link-quiet text-caption">
                Generate a proof for any claim <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            {active.length === 0 ? (
              <div className="card p-12 text-center">
                <p className="text-title-md text-ink">No credentials yet</p>
                <p className="mx-auto mt-2 max-w-sm text-body-sm text-mist">
                  Ask your registrar to issue a VeriCred — or explore the demo issuance in the university dashboard.
                </p>
                <Link to="/universities?tab=issue" className="btn-primary mt-6">
                  Try issuing
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {active.map((c, i) => (
                  <CredentialTile key={c.id} credential={c} index={i} />
                ))}
              </div>
            )}
          </div>

          {pending.length > 0 && (
            <div>
              <h2 className="mb-6 text-title-lg text-ink">
                Pending issuance <span className="ml-1 font-mono text-caption text-mist">{pending.length}</span>
              </h2>
              <div className="space-y-3">
                {pending.map((c, i) => (
                  <Reveal key={c.id} delay={i * 0.05}>
                    <div className="card flex flex-wrap items-center justify-between gap-4 p-5">
                      <div>
                        <p className="text-body-sm font-semibold text-ink">{c.title}</p>
                        <p className="mt-0.5 text-caption text-mist">
                          {c.institution} · requested {fmt(c.issuedAt)} — awaiting registrar sign-off
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <motion.span
                          className="h-2 w-2 rounded-full bg-warning"
                          animate={{ opacity: [1, 0.3, 1] }}
                          transition={{ duration: 1.8, repeat: Infinity }}
                          aria-hidden
                        />
                        <StatusBadge status={c.status} />
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          )}

          <div>
            <button onClick={() => setShowArchive((v) => !v)} className="btn-ghost text-body-sm">
              {showArchive ? 'Hide' : 'View'} archive ({archive.length})
            </button>
            {showArchive && (
              <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {archive.map((c, i) => (
                  <CredentialTile key={c.id} credential={c} index={i} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default WalletPage;
