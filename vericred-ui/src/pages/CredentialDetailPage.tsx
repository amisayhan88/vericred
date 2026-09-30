import { useMemo } from 'react';
import type { FC, ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Award, CalendarClock, FileCheck2, KeyRound } from 'lucide-react';
import { useWalletStore } from '../store/useWalletStore';
import { StatusBadge, Timeline, QrFrame } from '../components/ui/domain';
import { CopyButton, Reveal, TiltCard } from '../components/ui/primitives';
import { truncatedHash } from '../lib/ids';

const PRIVATE_FIELDS = [
  'Personal identity',
  'Student ID',
  'Transcript records',
  'Date of birth',
  'Address',
  'Exact GPA',
];

export const CredentialDetailPage: FC = () => {
  const { id = '' } = useParams();
  const credentials = useWalletStore((s) => s.credentials);
  const credential = useMemo(
    () => credentials.find((c) => c.displayId.toLowerCase() === id.toLowerCase() || c.id === id),
    [credentials, id],
  );

  if (!credential) {
    return (
      <div style={{ paddingTop: 64 }} className="min-h-screen">
        <div className="container-vc py-24 text-center">
          <h1 className="text-display-sm text-ink">Credential not found</h1>
          <p className="mx-auto mt-3 max-w-sm text-body-md text-mist">
            No record matches <span className="font-mono text-caption">{id}</span> on this ledger view.
          </p>
          <Link to="/wallet" className="btn-primary mt-8">
            Back to wallet
          </Link>
        </div>
      </div>
    );
  }

  const verifyUrl = `${window.location.origin}/verify/${credential.displayId}`;
  const monthYear = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <div style={{ paddingTop: 64 }}>
      <section style={{ padding: '56px 0 112px' }}>
        <div className="container-vc">
          <Link
            to={credential.owner ? '/wallet' : '/universities'}
            className="link-quiet mb-8 inline-flex text-body-sm"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> {credential.owner ? 'My wallet' : 'Institution records'}
          </Link>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.5fr_1fr]">
            {/* Certificate */}
            <TiltCard maxTilt={3}>
              <div className="card relative overflow-hidden">
                <div
                  className="absolute inset-x-0 top-0 h-1.5"
                  style={{ background: 'linear-gradient(90deg,#173B57,#4F8582 55%,#C9B99A)' }}
                  aria-hidden
                />
                <div className="bg-pattern-dots absolute inset-0 opacity-40" aria-hidden />
                <div className="relative p-8 sm:p-10">
                  <div className="flex flex-wrap items-start justify-between gap-6">
                    <div>
                      <p className="mono-label">Credential</p>
                      <p className="mt-4 flex items-center gap-2 text-body-sm text-graphite">
                        <Award className="h-4 w-4 text-deep" /> {credential.institution}
                      </p>
                      <h1 className="mt-4 font-display text-display-md text-ink">{credential.program}</h1>
                      <p className="text-title-lg text-ink">{credential.title}</p>
                    </div>
                    <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border border-sand bg-[#F8F5EE]">
                      <KeyRound className="h-10 w-10 text-sand-deep" />
                    </div>
                  </div>

                  <dl className="mt-10 grid grid-cols-2 gap-x-8 gap-y-6 border-t border-line pt-8 sm:grid-cols-3">
                    <Meta label="Issued" value={monthYear(credential.issuedAt)} />
                    <Meta label="Status" value={<StatusBadge status={credential.status} />} />
                    <Meta
                      label="Verification"
                      value={
                        credential.status === 'ACTIVE' ? (
                          <span className="flex items-center gap-1.5 text-body-sm font-semibold text-success">
                            <FileCheck2 className="h-4 w-4" /> Cryptographically verified
                          </span>
                        ) : (
                          <span className="text-body-sm text-mist">See ledger status</span>
                        )
                      }
                    />
                    <Meta
                      label="Credential ID"
                      value={<span className="font-mono text-[13px]">{credential.displayId}</span>}
                    />
                    <Meta label="Holder" value={credential.studentName} />
                    <Meta
                      label="Commitment"
                      value={
                        <span className="font-mono text-[12px]">{truncatedHash(credential.credentialHash, 8, 6)}</span>
                      }
                    />
                  </dl>

                  {credential.status === 'EXPIRED' && credential.expiresAt && (
                    <p className="mt-6 flex items-center gap-2 rounded-lg bg-shell px-4 py-3 text-caption text-mist">
                      <CalendarClock className="h-4 w-4 text-warning" /> This credential’s validity window ended{' '}
                      {monthYear(credential.expiresAt)}.
                    </p>
                  )}
                  {credential.status === 'REVOKED' && credential.revocationReason && (
                    <p className="mt-6 rounded-lg bg-error/[0.06] px-4 py-3 text-caption" style={{ color: '#8f3a28' }}>
                      Revoked {credential.revokedAt ? monthYear(credential.revokedAt) : ''} —{' '}
                      {credential.revocationReason}
                    </p>
                  )}

                  {credential.owner && credential.status === 'ACTIVE' && (
                    <div className="mt-8 flex flex-wrap gap-3">
                      <Link to={`/proof?cred=${credential.id}`} className="btn-primary btn-sm">
                        Generate a proof
                      </Link>
                      <CopyButton value={verifyUrl} label="Copy verification link" />
                    </div>
                  )}
                </div>
              </div>
            </TiltCard>

            {/* Side column */}
            <div className="space-y-6">
              <Reveal>
                <div className="card p-6">
                  <QrFrame value={verifyUrl} size={190} caption="Scan to open the verifier" />
                  <Link to={`/verify/${credential.displayId}`} className="btn-secondary btn-sm mt-5 w-full">
                    Open verification page
                  </Link>
                </div>
              </Reveal>

              <Reveal delay={0.1}>
                <div className="card-dark p-6" style={{ background: '#14344B' }}>
                  <p className="mono-label mb-4 !text-on-dark-mute">Private information protected</p>
                  <ul className="space-y-3.5">
                    {PRIVATE_FIELDS.map((f, i) => (
                      <motion.li
                        key={f}
                        className="flex items-center justify-between gap-4"
                        initial={{ opacity: 0, x: -8 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.07 }}
                      >
                        <span className="text-body-sm text-on-dark-mute">{f}</span>
                        <span
                          className="redacted block h-4 flex-1"
                          style={{
                            background:
                              'repeating-linear-gradient(-55deg,#2C5870,#2C5870 6px,#244A60 6px,#244A60 12px)',
                          }}
                        />
                      </motion.li>
                    ))}
                  </ul>
                  <p className="mt-5 border-t border-white/10 pt-4 text-caption text-on-dark-mute">
                    Only verified claims are disclosed. Values above never leave the holder’s encrypted witness state.
                  </p>
                </div>
              </Reveal>
            </div>
          </div>

          {/* Lifecycle */}
          <Reveal className="mt-16">
            <div className="card p-8">
              <div className="mb-8 flex items-center justify-between">
                <h2 className="text-title-lg text-ink">Credential lifecycle</h2>
                <span className="chip">from the public ledger</span>
              </div>
              <Timeline events={credential.timeline} />
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
};

const Meta: FC<{ label: string; value: ReactNode }> = ({ label, value }) => (
  <div>
    <dt className="mono-label !text-[10px]">{label}</dt>
    <dd className="mt-1.5 text-body-sm font-semibold text-ink">{value}</dd>
  </div>
);

export default CredentialDetailPage;
