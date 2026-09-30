import type { FC } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import { cacLedger } from '../../services/cac-service';
import { useWalletStore } from '../../store/useWalletStore';
import { truncatedHash } from '../../lib/ids';

const NODES: Array<[number, number]> = [
  [20, 34],
  [86, 14],
  [152, 30],
  [214, 12],
  [284, 26],
  [62, 54],
  [128, 62],
  [246, 52],
];
const EDGES: Array<[number, number]> = [
  [0, 5],
  [5, 6],
  [6, 2],
  [1, 5],
  [2, 7],
  [7, 3],
  [3, 4],
  [6, 1],
  [0, 1],
];

/** Tiny animated proof-network for the footer (SVG keeps it WebGL-free). */
const ProofNetworkGlyph: FC = () => {
  const reduced = useReducedMotion();
  return (
    <svg width="304" height="76" viewBox="0 0 304 76" fill="none" aria-hidden>
      {EDGES.map(([a, b], i) => (
        <motion.line
          key={i}
          x1={NODES[a][0]}
          y1={NODES[a][1]}
          x2={NODES[b][0]}
          y2={NODES[b][1]}
          stroke="#4F8582"
          strokeOpacity={0.35}
          strokeWidth={1}
          strokeDasharray="54"
          initial={reduced ? undefined : { strokeDashoffset: 54 }}
          animate={reduced ? undefined : { strokeDashoffset: [54, 0, -54] }}
          transition={{ duration: 4.5, repeat: Infinity, delay: i * 0.35, ease: 'easeInOut' }}
        />
      ))}
      {NODES.map(([x, y], i) => (
        <motion.circle
          key={i}
          cx={x}
          cy={y}
          r={i % 3 === 0 ? 3.4 : 2.6}
          fill={i % 3 === 0 ? '#173B57' : '#7FA396'}
          initial={reduced ? undefined : { opacity: 0.45, scale: 0.8 }}
          animate={reduced ? undefined : { opacity: [0.45, 1, 0.45], scale: [0.85, 1.05, 0.85] }}
          transition={{ duration: 3.2, repeat: Infinity, delay: i * 0.4, ease: 'easeInOut' }}
          style={{ transformOrigin: `${x}px ${y}px` }}
        />
      ))}
    </svg>
  );
};

const COLUMNS: Array<{ title: string; links: Array<{ label: string; to: string }> }> = [
  {
    title: 'Platform',
    links: [
      { label: 'Credential Wallet', to: '/wallet' },
      { label: 'Proof Generator', to: '/proof' },
      { label: 'Verifier Portal', to: '/verify' },
      { label: 'University Dashboard', to: '/universities' },
    ],
  },
  {
    title: 'Technology',
    links: [
      { label: 'Privacy Architecture', to: '/architecture' },
      { label: 'How It Works', to: '/how-it-works' },
      { label: 'Network & Settings', to: '/settings' },
      { label: 'Ledger Activity', to: '/transactions' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Documentation', to: '/how-it-works' },
      { label: 'GitHub', to: 'https://github.com/amisayhan88/vericred' },
      { label: 'Contact', to: 'mailto:hello@vericred.network' },
      { label: 'Privacy & Terms', to: '/legal' },
    ],
  },
];

export const SiteFooter: FC = () => {
  const { networkId, contractAddress } = useWalletStore();
  return (
    <footer className="mt-auto border-t border-line bg-paper">
      <div className="container-vc grid grid-cols-1 gap-12 py-16 lg:grid-cols-[1.2fr_2fr]">
        <div>
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-deep text-on-dark">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <span className="font-display text-xl text-ink">VeriCred</span>
          </Link>
          <p className="mt-4 max-w-xs text-body-md text-mist">
            Private academic credentials,
            <br />
            verified without unnecessary disclosure.
          </p>
          <div className="mt-6 opacity-90">
            <ProofNetworkGlyph />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="mono-label mb-4">{col.title}</p>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {l.to.startsWith('http') || l.to.startsWith('mailto:') ? (
                      <a
                        href={l.to}
                        target={l.to.startsWith('http') ? '_blank' : undefined}
                        rel="noreferrer"
                        className="text-body-sm text-graphite transition-colors hover:text-deep"
                      >
                        {l.label}
                      </a>
                    ) : (
                      <Link to={l.to} className="text-body-sm text-graphite transition-colors hover:text-deep">
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-line-soft">
        <div className="container-vc flex flex-col items-start justify-between gap-3 py-5 text-caption text-mist sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} VeriCred Protocol — academic infrastructure on the Midnight Network.</p>
          <div className="flex flex-wrap items-center gap-4 font-mono text-[11.5px]">
            <span>
              Network <span className="text-teal">{networkId}</span>
            </span>
            <span>
              Ledger <span className="text-graphite">{cacLedger.mode}</span>
            </span>
            <span className="font-mono text-[11.5px] text-faint">{truncatedHash(contractAddress, 8, 6)}</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
