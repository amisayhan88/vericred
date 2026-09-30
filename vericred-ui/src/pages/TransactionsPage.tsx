import { useMemo, useState } from 'react';
import type { FC } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  Download,
  History,
  Loader2,
  Search,
  XCircle,
} from 'lucide-react';
import { useWalletStore } from '../store/useWalletStore';
import type { Transaction } from '../store/useWalletStore';

const TX_TONE: Record<Transaction['status'], string> = {
  CONFIRMED: 'badge-active',
  PENDING: 'badge-pending',
  PROCESSING: 'badge-info',
  FAILED: 'badge-revoked',
};

const TYPE_LABEL: Record<Transaction['type'], string> = {
  ISSUE_CREDENTIAL: 'Issuance',
  VERIFY_PROOF: 'Verification',
  PROOF_GENERATED: 'Proof',
  REVOKE_CREDENTIAL: 'Revocation',
  SUSPEND_CREDENTIAL: 'Suspension',
  REINSTATE_CREDENTIAL: 'Reinstatement',
  BATCH_ISSUE: 'Batch',
  EXPIRE_CREDENTIAL: 'Expiry',
};

// Optional — set VITE_EXPLORER_URL to link transactions to a block explorer.
const EXPLORER = (import.meta.env.VITE_EXPLORER_URL as string | undefined)?.replace(/\/$/, '');

type SortMode = 'NEWEST' | 'OLDEST' | 'TYPE' | 'STATUS';

const toCsv = (rows: Transaction[]) =>
  [
    'timestamp,type,status,hash,details',
    ...rows.map((t) =>
      [new Date(t.timestamp).toISOString(), t.type, t.status, `"${t.hash}"`, `"${t.details.replace(/"/g, "'")}"`].join(
        ',',
      ),
    ),
  ].join('\n');

export const TransactionsPage: FC = () => {
  const transactions = useWalletStore((s) => s.transactions);
  const networkId = useWalletStore((s) => s.networkId);
  const [q, setQ] = useState('');
  const [type, setType] = useState<'ALL' | Transaction['type']>('ALL');
  const [sort, setSort] = useState<SortMode>('NEWEST');

  const rows = useMemo(() => {
    const filtered = transactions.filter(
      (t) =>
        (type === 'ALL' || t.type === type) &&
        (t.hash.toLowerCase().includes(q.toLowerCase()) || t.details.toLowerCase().includes(q.toLowerCase())),
    );
    const byTime = (a: Transaction, b: Transaction) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    switch (sort) {
      case 'OLDEST':
        return [...filtered].sort((a, b) => -byTime(a, b));
      case 'TYPE':
        return [...filtered].sort((a, b) => a.type.localeCompare(b.type) || byTime(a, b));
      case 'STATUS':
        return [...filtered].sort((a, b) => a.status.localeCompare(b.status) || byTime(a, b));
      default:
        return [...filtered].sort(byTime);
    }
  }, [transactions, q, type, sort]);

  const exportCsv = () => {
    const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vericred-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ paddingTop: 64 }}>
      <section className="border-b border-line bg-paper" style={{ padding: '56px 0 32px' }}>
        <div className="container-vc">
          <p className="overline">Network</p>
          <h1 className="mt-2.5 text-display-lg text-ink">Ledger activity</h1>
          <p className="mt-2 max-w-xl text-body-md text-mist">
            State transitions on the Midnight {networkId} contract — issuances, status changes and verification
            checkpoints. Witness data never appears here.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-faint" />
              <input
                className="input-field !h-9 w-full pl-9 text-caption sm:w-72"
                placeholder="Search hash or event…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {(['ALL', 'ISSUE_CREDENTIAL', 'PROOF_GENERATED', 'VERIFY_PROOF', 'REVOKE_CREDENTIAL'] as const).map(
                (t) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`badge cursor-pointer ${type === t ? 'badge-info' : 'badge-neutral hover:border-teal/40'}`}
                  >
                    {t === 'ALL' ? 'All' : TYPE_LABEL[t]}
                  </button>
                ),
              )}
            </div>
            <div className="flex items-center gap-2 sm:ml-auto">
              <label className="flex items-center gap-2 text-caption text-mist">
                <ArrowUpDown className="h-3.5 w-3.5" />
                <span className="sr-only">Sort transactions</span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortMode)}
                  className="input-field !h-9 w-auto py-0 text-caption"
                >
                  <option value="NEWEST">Newest first</option>
                  <option value="OLDEST">Oldest first</option>
                  <option value="TYPE">By type</option>
                  <option value="STATUS">By status</option>
                </select>
              </label>
              <button onClick={exportCsv} className="btn-secondary btn-sm" title="Export current view as CSV">
                <Download className="h-3.5 w-3.5" /> CSV
              </button>
            </div>
          </div>
        </div>
      </section>

      <section style={{ padding: '48px 0 112px' }}>
        <div className="container-vc">
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table-vc">
                <thead>
                  <tr>
                    <th>Transaction</th>
                    <th>Event</th>
                    <th>Status</th>
                    <th className="hidden md:table-cell">Timestamp</th>
                    <th className="text-right">Explorer</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((tx, i) => (
                    <motion.tr
                      key={tx.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.3) }}
                    >
                      <td className="font-mono text-[12.5px] font-semibold text-ink">{tx.hash}</td>
                      <td>
                        <p className="text-body-sm text-graphite">{tx.details}</p>
                        <span className="mono-label !text-[10px]">{TYPE_LABEL[tx.type]}</span>
                      </td>
                      <td>
                        <span className={`badge ${TX_TONE[tx.status]}`}>
                          {tx.status === 'CONFIRMED' ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : tx.status === 'PENDING' ? (
                            <Clock className="h-3.5 w-3.5" />
                          ) : tx.status === 'PROCESSING' ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5" />
                          )}
                          {tx.status.toLowerCase()}
                        </span>
                      </td>
                      <td className="hidden text-caption text-mist md:table-cell">
                        {new Date(tx.timestamp).toLocaleString()}
                      </td>
                      <td className="text-right">
                        {EXPLORER ? (
                          <a
                            href={`${EXPLORER}/tx/${tx.hash.replace(/…/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="link-quiet text-caption"
                            title="Open in block explorer"
                          >
                            <History className="h-3.5 w-3.5" /> View <ArrowUpRight className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-caption text-faint">on-chain</span>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-16 text-center text-mist">
                        No matching transactions.{' '}
                        <button
                          className="link-quiet"
                          onClick={() => {
                            setQ('');
                            setType('ALL');
                          }}
                        >
                          Clear filters
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <p className="mt-6 text-caption text-faint">
            Read-only ledger explorer view.{' '}
            <Link to="/settings" className="link-quiet">
              Network configuration →
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
};

export default TransactionsPage;
