import { useEffect, useState } from 'react';
import type { FC, ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { BadgeCheck, Ban, CalendarClock, Check, CircleDashed, Clock, ShieldCheck, Lock } from 'lucide-react';
import type { CredentialStatus, TimelineKind } from '../../store/useWalletStore';
import { qrDataUrl } from '../../services/qr';

/* -------------------------------------------------------------------------- */
/* Status badge                                                                */
/* -------------------------------------------------------------------------- */

const STATUS_META: Record<CredentialStatus, { cls: string; label: string; Icon: FC<{ className?: string }> }> = {
  ACTIVE: { cls: 'badge-active', label: 'Active', Icon: BadgeCheck },
  PENDING: { cls: 'badge-pending', label: 'Pending', Icon: CircleDashed },
  EXPIRED: { cls: 'badge-expired', label: 'Expired', Icon: CalendarClock },
  SUSPENDED: { cls: 'badge-pending', label: 'Suspended', Icon: Clock },
  REVOKED: { cls: 'badge-revoked', label: 'Revoked', Icon: Ban },
};

export const StatusBadge: FC<{ status: CredentialStatus; className?: string }> = ({ status, className = '' }) => {
  const meta = STATUS_META[status];
  const Icon = meta.Icon;
  return (
    <span className={`badge ${meta.cls} ${className}`}>
      <Icon className="h-3.5 w-3.5" />
      {meta.label}
    </span>
  );
};

/* -------------------------------------------------------------------------- */
/* Credential lifecycle timeline                                               */
/* -------------------------------------------------------------------------- */

const TIMELINE_ICON: Record<TimelineKind, ReactNode> = {
  CREATED: <CircleDashed className="h-4 w-4" />,
  ISSUED: <BadgeCheck className="h-4 w-4" />,
  RECEIVED: <Check className="h-4 w-4" />,
  PROOF: <ShieldCheck className="h-4 w-4" />,
  VERIFIED: <BadgeCheck className="h-4 w-4" />,
  STATUS: <Clock className="h-4 w-4" />,
  REVOKED: <Ban className="h-4 w-4" />,
  EXPIRED: <CalendarClock className="h-4 w-4" />,
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

export const Timeline: FC<{ events: { kind: TimelineKind; label: string; detail?: string; at: string }[] }> = ({
  events,
}) => {
  return (
    <ol className="relative space-y-0">
      {events.map((e, i) => (
        <li key={`${e.at}-${i}`} className="relative flex gap-4 pb-7 last:pb-0">
          {i < events.length - 1 && (
            <motion.span
              className="absolute left-[15px] top-8 h-[calc(100%-20px)] w-px bg-line"
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true }}
              style={{ transformOrigin: 'top' }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            />
          )}
          <motion.span
            className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-paper text-teal shadow-soft"
            initial={{ opacity: 0, scale: 0.6 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: i * 0.1 }}
          >
            {TIMELINE_ICON[e.kind]}
          </motion.span>
          <motion.div
            className="pt-1"
            initial={{ opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.05 + i * 0.1 }}
          >
            <p className="text-body-sm font-semibold text-ink">{e.label}</p>
            {e.detail && <p className="text-caption text-mist mt-0.5">{e.detail}</p>}
            <p className="mono-label mt-1">{fmtDate(e.at)}</p>
          </motion.div>
        </li>
      ))}
    </ol>
  );
};

/* -------------------------------------------------------------------------- */
/* QR code card with scanning beam                                             */
/* -------------------------------------------------------------------------- */

export const QrFrame: FC<{ value: string; size?: number; caption?: string; beam?: boolean }> = ({
  value,
  size = 200,
  caption,
  beam = true,
}) => {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    let alive = true;
    qrDataUrl(value, { size })
      .then((out) => alive && setDataUrl(out))
      .catch(() => alive && setDataUrl(null));
    return () => {
      alive = false;
    };
  }, [value, size]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative overflow-hidden rounded-xl border border-line bg-paper p-3 shadow-soft"
        style={{ width: size + 24 }}
      >
        {dataUrl ? (
          <img
            src={dataUrl}
            width={size}
            height={size}
            alt={`QR code for ${caption ?? 'verification'}`}
            className="block"
          />
        ) : (
          <div className="flex items-center justify-center text-caption text-faint" style={{ height: size }}>
            <Lock className="mr-2 h-3.5 w-3.5" /> Rendering…
          </div>
        )}
        {beam && !reduced && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute left-3 right-3 h-8"
            style={{
              background:
                'linear-gradient(180deg, rgba(79,133,130,0) 0%, rgba(79,133,130,0.16) 45%, rgba(47,107,138,0.32) 50%, rgba(79,133,130,0.16) 55%, rgba(79,133,130,0) 100%)',
            }}
            initial={{ top: 10 }}
            animate={{ top: [10, size + 2, 10] }}
            transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
          />
        )}
      </div>
      {caption && <p className="mono-label text-center">{caption}</p>}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Verification seal (rotating SVG micro-3D)                                   */
/* -------------------------------------------------------------------------- */

export const VerificationSeal: FC<{ size?: number; ok?: boolean }> = ({ size = 120, ok = true }) => {
  const reduced = useReducedMotion();
  const color = ok ? '#3E7C5B' : '#A8452F';
  return (
    <motion.svg width={size} height={size} viewBox="0 0 120 120" fill="none" aria-hidden>
      <motion.g
        style={{ transformOrigin: '60px 60px' }}
        animate={reduced ? undefined : { rotate: 360 }}
        transition={{ duration: 26, repeat: Infinity, ease: 'linear' }}
      >
        <circle cx="60" cy="60" r="56" stroke={color} strokeOpacity="0.25" strokeWidth="1" strokeDasharray="3 6" />
        <circle
          cx="60"
          cy="60"
          r="48"
          stroke={color}
          strokeOpacity="0.5"
          strokeWidth="1.4"
          strokeDasharray="14 5 4 5"
        />
      </motion.g>
      <circle cx="60" cy="60" r="38" fill={ok ? '#E9F3EC' : '#F8EAE6'} stroke={color} strokeWidth="1.4" />
      <motion.path
        d={ok ? 'M44 61.5 54.5 71 77 47.5' : 'M47 47 73 73 M73 47 47 73'}
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.9, delay: 0.2, ease: 'easeOut' }}
      />
    </motion.svg>
  );
};

/* -------------------------------------------------------------------------- */
/* Stepper (proof wizard)                                                      */
/* -------------------------------------------------------------------------- */

export const Stepper: FC<{ steps: string[]; current: number; onStep?: (i: number) => void; maxDone?: number }> = ({
  steps,
  current,
  onStep,
  maxDone = -1,
}) => (
  <ol className="flex items-center gap-2 sm:gap-3">
    {steps.map((s, i) => {
      const done = maxDone >= 0 ? i <= maxDone : i < current;
      const active = i === current;
      const clickable = onStep && (done || active) && (maxDone < 0 || i <= maxDone);
      return (
        <li key={s} className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            disabled={!clickable}
            onClick={() => clickable && onStep?.(i)}
            className={`flex items-center gap-2 rounded-pill border px-2.5 py-1.5 text-caption transition-colors ${
              active
                ? 'border-deep bg-deep text-on-dark'
                : done
                  ? 'border-line bg-shell text-graphite'
                  : 'border-line-soft bg-paper text-faint'
            } ${clickable ? 'cursor-pointer' : 'cursor-default'}`}
          >
            <span
              className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
                active ? 'bg-on-dark/20 text-on-dark' : done ? 'bg-teal/15 text-teal' : 'bg-shell text-faint'
              }`}
            >
              {done ? <Check className="h-2.5 w-2.5" /> : i + 1}
            </span>
            <span className="hidden font-semibold sm:inline">{s}</span>
          </button>
          {i < steps.length - 1 && <span className="h-px w-3 bg-line sm:w-6" aria-hidden />}
        </li>
      );
    })}
  </ol>
);
