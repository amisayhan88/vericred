import { useMemo, useState } from 'react';
import type { FC, FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  Award,
  Ban,
  CheckCircle2,
  CircleDashed,
  Loader2,
  PauseCircle,
  PlayCircle,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useWalletStore } from '../store/useWalletStore';
import type { Credential } from '../store/useWalletStore';
import { cacLedger } from '../services/cac-service';
import { StatusBadge } from '../components/ui/domain';
import { CopyButton, CountUp, Modal, Reveal } from '../components/ui/primitives';
import { truncatedHash } from '../lib/ids';

type Tab = 'overview' | 'issue' | 'students' | 'revocation' | 'activity';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'issue', label: 'Credential issuance' },
  { id: 'students', label: 'Students' },
  { id: 'revocation', label: 'Revocation center' },
  { id: 'activity', label: 'Verification activity' },
];

/* ------------------------------ Sparkline -------------------------------- */

const Sparkline: FC<{ values: number[] }> = ({ values }) => {
  const max = Math.max(1, ...values);
  const w = 220;
  const h = 56;
  const step = w / (values.length - 1 || 1);
  const line = values.map((v, i) => `${i * step},${h - (v / max) * (h - 8) - 3}`).join(' ');
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden>
      <motion.polyline
        points={line}
        fill="none"
        stroke="#2F6B8A"
        strokeWidth="1.6"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.1, ease: 'easeOut' }}
      />
      <polyline points={`0,${h} ${line} ${w},${h}`} fill="rgba(47,107,138,0.07)" stroke="none" />
    </svg>
  );
};

/* ------------------------------- Overview -------------------------------- */

const Stat: FC<{ label: string; value: number; icon: FC<{ className?: string }>; hint?: string; tone?: string }> = ({
  label,
  value,
  icon: Icon,
  hint,
  tone = '#173B57',
}) => (
  <Reveal>
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <p className="mono-label">{label}</p>
        <span
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{ background: `${tone}14`, color: tone }}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-4 font-display text-display-md text-ink" style={{ fontWeight: 500 }}>
        <CountUp value={value} />
      </p>
      {hint && <p className="mt-1 text-caption text-mist">{hint}</p>}
    </div>
  </Reveal>
);

/* ----------------------------- Issuance form ------------------------------ */

const IssueForm: FC = () => {
  const createCredential = useWalletStore((s) => s.createCredential);
  const [studentName, setStudentName] = useState('');
  const [program, setProgram] = useState('Computer Science & Engineering');
  const [title, setTitle] = useState('B.Tech Computer Science');
  const [gpa, setGpa] = useState('3.70');
  const [gradYear, setGradYear] = useState(new Date().getFullYear());
  const [queue, setQueue] = useState<'ACTIVE' | 'PENDING'>('ACTIVE');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ displayId: string; txHash: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) return setError('Student name is required.');
    setError(null);
    setBusy(true);
    try {
      const cred = createCredential({
        studentName: studentName.trim(),
        studentDid: `did:midnight:vc:${studentName
          .trim()
          .toLowerCase()
          .replace(/[^a-z]+/g, '-')}-${Math.random().toString(36).slice(2, 6)}`,
        institution: 'Future Institute of Engineering',
        type: 'DEGREE',
        title,
        program,
        gpa: Math.max(0, Math.min(4, parseFloat(gpa) || 0)),
        graduationYear: gradYear,
        status: queue,
      });
      const tx = await cacLedger.issueCredential(cred.credentialHash);
      setResult({ displayId: cred.displayId, txHash: tx.txHash });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Issuance failed');
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-8 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
        <h3 className="mt-4 text-title-lg text-ink">Credential anchored on-chain</h3>
        <p className="mx-auto mt-2 max-w-md text-body-sm text-mist">
          The public commitment is recorded as VALID under the institution key. The witness bundle was delivered to the
          student’s private state — never to the ledger.
        </p>
        <div className="mx-auto mt-6 max-w-sm space-y-3 text-left">
          <div className="flex items-center justify-between rounded-lg border border-line px-4 py-3">
            <span className="mono-label">Credential ID</span>
            <span className="font-mono text-[13px] font-semibold text-deep">{result.displayId}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-line px-4 py-3">
            <span className="mono-label">Transaction</span>
            <span className="flex items-center gap-2">
              <span className="font-mono text-[12px] text-graphite">{truncatedHash(result.txHash)}</span>
              <CopyButton value={result.txHash} label="Copy" className="!h-7 !px-2.5" />
            </span>
          </div>
        </div>
        <button className="btn-secondary mt-8" onClick={() => setResult(null)}>
          Issue another credential
        </button>
      </motion.div>
    );
  }

  return (
    <form onSubmit={submit} className="card p-6 sm:p-8">
      <h2 className="text-title-lg text-ink">Create & issue credential</h2>
      <p className="mt-1.5 text-body-sm text-mist">
        Issuance is signed by the institution owner key (registrar session).
      </p>
      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label className="input-label" htmlFor="st-name">
            Student name
          </label>
          <input
            id="st-name"
            className="input-field"
            placeholder="e.g. Priya Nair"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
          />
        </div>
        <div>
          <label className="input-label" htmlFor="st-year">
            Graduation year
          </label>
          <input
            id="st-year"
            type="number"
            className="input-field"
            value={gradYear}
            onChange={(e) => setGradYear(parseInt(e.target.value, 10) || gradYear)}
          />
        </div>
        <div>
          <label className="input-label" htmlFor="st-program">
            Program
          </label>
          <input id="st-program" className="input-field" value={program} onChange={(e) => setProgram(e.target.value)} />
        </div>
        <div>
          <label className="input-label" htmlFor="st-title">
            Credential title
          </label>
          <input id="st-title" className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="input-label" htmlFor="st-gpa">
            Cumulative GPA — stored as private witness
          </label>
          <input
            id="st-gpa"
            className="input-field"
            inputMode="decimal"
            value={gpa}
            onChange={(e) => setGpa(e.target.value)}
          />
        </div>
        <div>
          <span className="input-label">Delivery</span>
          <div className="flex w-full gap-1.5 rounded-xl bg-shell p-1.5">
            {(['ACTIVE', 'PENDING'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setQueue(v)}
                className={`flex-1 rounded-lg px-2 py-2 text-center text-caption font-semibold transition-colors ${
                  queue === v ? 'bg-paper text-deep shadow-soft' : 'text-mist hover:text-ink'
                }`}
              >
                {v === 'ACTIVE' ? 'Issue now' : 'Queue for sign-off'}
              </button>
            ))}
          </div>
        </div>
      </div>
      {error && <p className="mt-4 text-caption text-error">{error}</p>}
      <button type="submit" disabled={busy} className="btn-primary mt-8">
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Anchoring commitment…
          </>
        ) : (
          <>
            <Award className="h-4 w-4" /> Generate & issue credential
          </>
        )}
      </button>
    </form>
  );
};

/* ----------------------------- Students table ------------------------------ */

const StudentsTab: FC<{ credentials: Credential[] }> = ({ credentials }) => {
  const [q, setQ] = useState('');
  const rows = credentials.filter(
    (c) =>
      c.studentName.toLowerCase().includes(q.toLowerCase()) ||
      c.title.toLowerCase().includes(q.toLowerCase()) ||
      c.displayId.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
        <h2 className="text-title-md text-ink">Issued credentials ({credentials.length})</h2>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-faint" />
          <input
            className="input-field !h-9 w-56 pl-9 text-caption"
            placeholder="Search student, title, ID…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="table-vc">
          <thead>
            <tr>
              <th>Student</th>
              <th>Credential</th>
              <th className="hidden md:table-cell">Program</th>
              <th className="hidden sm:table-cell">Issue date</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td>
                  <p className="font-semibold text-ink">{c.studentName}</p>
                  <p className="font-mono text-[11px] text-faint">{c.displayId}</p>
                </td>
                <td className="text-graphite">{c.title}</td>
                <td className="hidden text-graphite md:table-cell">{c.program}</td>
                <td className="hidden text-mist sm:table-cell">{new Date(c.issuedAt).toLocaleDateString()}</td>
                <td>
                  <StatusBadge status={c.status} />
                </td>
                <td className="text-right">
                  <Link to={`/credential/${c.displayId}`} className="link-quiet text-caption">
                    View <ArrowRight className="h-3 w-3" />
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-mist">
                  No credentials match “{q}”.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ----------------------------- Revocation -------------------------------- */

const RevocationTab: FC<{ credentials: Credential[] }> = ({ credentials }) => {
  const suspend = useWalletStore((s) => s.suspendCredential);
  const reinstate = useWalletStore((s) => s.reinstateCredential);
  const revoke = useWalletStore((s) => s.revokeCredential);
  const activate = useWalletStore((s) => s.activatePendingCredential);
  const [reason, setReason] = useState('');
  const [confirm, setConfirm] = useState<null | 'revoke' | 'suspend'>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [q, setQ] = useState('');

  const match = credentials.find(
    (c) => c.displayId.toLowerCase().includes(q.toLowerCase()) || c.studentName.toLowerCase().includes(q.toLowerCase()),
  );
  const target = match ?? null;
  const cred = q.trim().length > 0 ? target : null;

  const act = async (kind: 'revoke' | 'suspend' | 'reinstate' | 'activate') => {
    const cred = target;
    if (!cred) return;
    setBusy(true);
    await new Promise((r) => setTimeout(r, 700));
    try {
      if (kind === 'revoke') {
        await cacLedger.revoke(cred.credentialHash);
        revoke(cred.id, reason.trim() || 'Unspecified institutional decision.');
      } else if (kind === 'suspend') {
        await cacLedger.suspend(cred.credentialHash);
        suspend(cred.id, reason.trim() || undefined);
      } else if (kind === 'reinstate') {
        await cacLedger.reinstate(cred.credentialHash);
        reinstate(cred.id);
      } else {
        activate(cred.id);
      }
      setDone(
        kind === 'revoke'
          ? 'Credential permanently revoked and anchored on-chain.'
          : kind === 'suspend'
            ? 'Credential suspended — proofs will now fail verification.'
            : kind === 'reinstate'
              ? 'Credential reinstated as VALID.'
              : 'Pending credential signed and issued.',
      );
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.15fr]">
      <Reveal>
        <div className="card p-6">
          <h2 className="text-title-md text-ink">Search credential</h2>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-faint" />
            <input
              className="input-field pl-9 font-mono text-caption"
              placeholder="VC-… or student name"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setDone(null);
              }}
            />
          </div>
          {!cred && q && <p className="mt-4 text-caption text-error">No credential matches “{q}”.</p>}
          {cred && (
            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-body-sm font-semibold text-ink">{cred.title}</p>
                <StatusBadge status={cred.status} />
              </div>
              <p className="text-caption text-mist">
                {cred.studentName} · {cred.displayId} · issued {new Date(cred.issuedAt).toLocaleDateString()}
              </p>
              {cred.revocationReason && (cred.status === 'REVOKED' || cred.status === 'SUSPENDED') && (
                <p className="rounded-lg bg-shell px-3 py-2.5 text-caption text-graphite">
                  Institution note: “{cred.revocationReason}”
                </p>
              )}
              <p className="text-caption text-faint">
                Lifecycle: Pending → Active → Suspended ⇄ Active → Revoked / Expired
              </p>
            </div>
          )}
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="card p-6">
          <h2 className="text-title-md text-ink">Transition control</h2>
          {done && (
            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 rounded-lg bg-success/10 px-3 py-2.5 text-caption"
              style={{ color: '#2f6a4b' }}
            >
              {done}
            </motion.p>
          )}
          {!cred ? (
            <p className="mt-5 text-body-sm text-mist">Search for a credential to enable status transitions.</p>
          ) : (
            <div className="mt-5 space-y-5">
              <div>
                <label className="input-label" htmlFor="rev-reason">
                  Reason (recorded for auditors — never student-facing)
                </label>
                <textarea
                  id="rev-reason"
                  className="input-field !h-28 py-2.5"
                  placeholder="e.g. Registrar flagged duplicate degree identifier."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2.5">
                {cred.status === 'ACTIVE' && (
                  <button className="btn-secondary" onClick={() => setConfirm('suspend')} disabled={busy}>
                    <PauseCircle className="h-4 w-4 text-warning" /> Suspend
                  </button>
                )}
                {cred.status === 'ACTIVE' && (
                  <button
                    className="btn-secondary !border-error/40 !text-error"
                    onClick={() => setConfirm('revoke')}
                    disabled={busy}
                  >
                    <Ban className="h-4 w-4" /> Revoke permanently
                  </button>
                )}
                {cred.status === 'SUSPENDED' && (
                  <button className="btn-secondary" onClick={() => void act('reinstate')} disabled={busy}>
                    <PlayCircle className="h-4 w-4 text-success" /> Reinstate
                  </button>
                )}
                {cred.status === 'PENDING' && (
                  <button className="btn-primary" onClick={() => void act('activate')} disabled={busy}>
                    <CircleDashed className="h-4 w-4" /> Sign & issue now
                  </button>
                )}
                {(cred.status === 'REVOKED' || cred.status === 'EXPIRED') && (
                  <p className="text-caption text-faint">
                    {cred.status === 'REVOKED'
                      ? 'Revocation is permanent by protocol.'
                      : 'Expired credentials can be re-issued under a new commitment.'}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </Reveal>

      {/* confirm modal */}
      <Modal
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm === 'revoke' ? 'Confirm permanent revocation' : 'Confirm suspension'}
      >
        <div className="space-y-5">
          <p className="text-body-sm text-graphite">
            {confirm === 'revoke'
              ? 'Revoking writes a permanent REVOKED status to the public ledger. All outstanding proofs for this credential stop verifying immediately.'
              : 'Suspending pauses the credential. Existing proofs stop verifying until reinstated, but the action is reversible.'}
          </p>
          {cred && (
            <div className="card-quiet space-y-1.5 p-4 text-body-sm">
              <div className="flex justify-between">
                <span className="text-mist">Credential</span>
                <span className="font-semibold text-ink">{cred.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-mist">Holder</span>
                <span className="text-ink">{cred.studentName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-mist">Reason</span>
                <span className="max-w-[55%] text-right text-graphite">{reason.trim() || '—'}</span>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button className="btn-secondary" onClick={() => setConfirm(null)}>
              Cancel
            </button>
            <button
              className={`btn-primary ${confirm === 'revoke' ? '!bg-error hover:!bg-[#8f3a28]' : ''}`}
              onClick={() => confirm && void act(confirm)}
              disabled={busy}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              {confirm === 'revoke' ? 'Revoke credential' : 'Suspend credential'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

/* ------------------------------- Activity --------------------------------- */

const ActivityTab: FC = () => {
  const verifications = useWalletStore((s) => s.verifications);
  const credentials = useWalletStore((s) => s.credentials);
  const weekly = useMemo(() => {
    const days: number[] = Array.from({ length: 7 }, () => 0);
    verifications.forEach((v) => {
      const d = Math.floor((Date.now() - new Date(v.at).getTime()) / 86_400_000);
      if (d >= 0 && d < 7) days[6 - d] += 1;
    });
    return days.map((n, i) => ({ label: ['6d', '5d', '4d', '3d', '2d', '1d', 'now'][i], value: n }));
  }, [verifications]);

  const typeTone = (t: VerificationLogType) =>
    t === 'EMPLOYER'
      ? 'badge-info'
      : t === 'SCHOLARSHIP_BOARD'
        ? 'badge-pending'
        : t === 'ADMISSIONS_OFFICE'
          ? 'badge-neutral'
          : t === 'CERTIFICATION_BOARD'
            ? 'badge-active'
            : 'badge-neutral';
  type VerificationLogType = (typeof verifications)[number]['verifierType'];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="text-title-md text-ink">Verification requests</h2>
          <span className="chip">
            <Sparkles className="h-3 w-3 text-teal" /> {verifications.length} total
          </span>
        </div>
        <ul className="divide-y divide-line-soft">
          <AnimatePresence initial={false}>
            {verifications.slice(0, 14).map((v) => (
              <motion.li
                key={v.id}
                layout
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-wrap items-center justify-between gap-3 px-6 py-4"
              >
                <div className="flex items-center gap-3.5">
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                      v.outcome === 'PASSED' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                    }`}
                  >
                    {v.outcome === 'PASSED' ? <CheckCircle2 className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                  </span>
                  <div>
                    <p className="text-body-sm font-semibold text-ink">
                      {v.verifier} <span className="text-mist">— {v.claim}</span>
                    </p>
                    <p className="font-mono text-[11px] text-faint">
                      {v.target} · {new Date(v.at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <span className={`badge ${typeTone(v.verifierType)}`}>{v.verifierType.replaceAll('_', ' ')}</span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </div>
      <div className="space-y-6">
        <Reveal>
          <div className="card p-6">
            <p className="mono-label mb-2">Checks · last 7 days</p>
            <Sparkline values={weekly.map((d) => d.value)} />
            <div className="mt-2 flex justify-between font-mono text-[10px] text-faint">
              {weekly.map((d) => (
                <span key={d.label}>{d.label}</span>
              ))}
            </div>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="card p-6">
            <p className="mono-label mb-3">Status mix</p>
            {(['ACTIVE', 'PENDING', 'SUSPENDED', 'EXPIRED', 'REVOKED'] as const).map((st) => {
              const n = credentials.filter((c) => c.status === st).length;
              const pct = credentials.length ? Math.round((n / credentials.length) * 100) : 0;
              return (
                <div key={st} className="mb-3 last:mb-0">
                  <div className="mb-1 flex justify-between text-caption">
                    <span className="text-graphite">{st.toLowerCase()}</span>
                    <span className="font-mono text-mist">{n}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-shell">
                    <motion.div
                      className={`h-full rounded-full ${st === 'REVOKED' ? 'bg-error/70' : st === 'SUSPENDED' ? 'bg-warning/70' : st === 'PENDING' ? 'bg-warning/50' : st === 'EXPIRED' ? 'bg-faint/60' : 'bg-teal'}`}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${Math.max(pct, n ? 4 : 0)}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>
    </div>
  );
};

/* -------------------------------- Page ------------------------------------ */

export const UniversitiesPage: FC = () => {
  const credentials = useWalletStore((s) => s.credentials);
  const transactions = useWalletStore((s) => s.transactions);
  const proofs = useWalletStore((s) => s.proofs);
  const verifications = useWalletStore((s) => s.verifications);
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'overview';
  const setTab = (t: Tab) => setParams(t === 'overview' ? {} : { tab: t }, { replace: true });

  const stats = useMemo(
    () => ({
      issued: credentials.length,
      active: credentials.filter((c) => c.status === 'ACTIVE').length,
      proofs: credentials.reduce((a, c) => a + c.proofsGenerated, 0) + proofs.length,
      requests: verifications.length,
      revoked: credentials.filter((c) => c.status === 'REVOKED').length,
    }),
    [credentials, proofs, verifications],
  );

  return (
    <div style={{ paddingTop: 64 }}>
      <section className="border-b border-line bg-paper" style={{ padding: '56px 0 28px' }}>
        <div className="container-vc flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="overline">Institution console</p>
            <h1 className="mt-2.5 text-display-lg text-ink">Future Institute of Engineering</h1>
            <p className="mt-2 text-body-sm text-mist">
              Registrar session · owner key <span className="font-mono text-caption">a746a0…8da1de</span>
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden h-[76px] w-[210px] overflow-hidden rounded-xl border border-line xl:block">
              <img
                src="/images/library.jpg"
                alt="Library reading room with tall windows"
                loading="lazy"
                className="h-full w-full object-cover"
                style={{ filter: 'saturate(0.8)' }}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`btn-sm rounded-pill border font-semibold transition-colors ${
                    tab === t.id
                      ? 'border-deep bg-deep text-on-dark'
                      : 'border-line bg-paper text-graphite hover:border-teal/40'
                  }`}
                  style={{ height: 36, padding: '0 14px' }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section style={{ padding: '48px 0 112px' }}>
        <div className="container-vc">
          <AnimatePresence mode="wait">
            {tab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-10"
              >
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-5">
                  <Stat label="Credentials issued" value={stats.issued} icon={Award} tone="#173B57" />
                  <Stat label="Active" value={stats.active} icon={Activity} tone="#4F8582" />
                  <Stat label="Verification requests" value={stats.requests} icon={ShieldCheck} tone="#2F6B8A" />
                  <Stat label="Proofs generated" value={stats.proofs} icon={Sparkles} tone="#8A6420" />
                  <Stat label="Revoked" value={stats.revoked} icon={Ban} tone="#A8452F" />
                </div>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr]">
                  <Reveal>
                    <div className="card overflow-hidden">
                      <div className="flex items-center justify-between border-b border-line px-6 py-4">
                        <h2 className="text-title-md text-ink">Recent ledger events</h2>
                        <Link to="/transactions" className="link-quiet text-caption">
                          All activity <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                      <ul className="divide-y divide-line-soft">
                        {transactions.slice(0, 5).map((tx) => (
                          <li key={tx.id} className="flex items-center justify-between gap-4 px-6 py-4">
                            <div>
                              <p className="text-body-sm font-semibold text-ink">{tx.details}</p>
                              <p className="font-mono text-[11px] text-faint">
                                {tx.hash} · {new Date(tx.timestamp).toLocaleString()}
                              </p>
                            </div>
                            <span
                              className={`badge ${tx.status === 'CONFIRMED' ? 'badge-active' : tx.status === 'PENDING' ? 'badge-pending' : 'badge-revoked'}`}
                            >
                              {tx.status}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </Reveal>
                  <Reveal delay={0.1}>
                    <div className="card-dark p-7" style={{ background: 'linear-gradient(165deg,#173B57,#12314A)' }}>
                      <p className="mono-label !text-on-dark-mute">Institution posture</p>
                      <p className="mt-4 font-display text-display-sm leading-snug text-on-dark">
                        Every credential you issue is anchored, revocable, and <i style={{ color: '#A8C1B5' }}>never</i>{' '}
                        a data repository.
                      </p>
                      <ul className="mt-6 space-y-3 text-body-sm text-on-dark-mute">
                        <li className="flex gap-2.5">
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-sage" /> Student witnesses live on their
                          devices — you hold no grade database.
                        </li>
                        <li className="flex gap-2.5">
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-sage" /> Revocation propagates to every
                          verifier instantly.
                        </li>
                        <li className="flex gap-2.5">
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-sage" /> One credential serves employment,
                          admissions and licensing.
                        </li>
                      </ul>
                      <Link
                        to="/architecture"
                        className="btn-sm mt-7 inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 font-semibold text-on-dark hover:bg-white/15"
                      >
                        Read the architecture <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </Reveal>
                </div>
              </motion.div>
            )}
            {tab === 'issue' && (
              <motion.div
                key="issue"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <IssueForm />
              </motion.div>
            )}
            {tab === 'students' && (
              <motion.div
                key="students"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <StudentsTab credentials={credentials} />
              </motion.div>
            )}
            {tab === 'revocation' && (
              <motion.div
                key="revocation"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <RevocationTab credentials={credentials} />
              </motion.div>
            )}
            {tab === 'activity' && (
              <motion.div
                key="activity"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <ActivityTab />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
};

export default UniversitiesPage;
