import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Server, Database, Cpu, RefreshCw, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useWalletStore } from '../store/useWalletStore';
import { cacLedger } from '../services/cac-service';
import { vericredClient } from '../lib/contract-client';
import { CopyButton, Reveal } from '../components/ui/primitives';

type ProbeState = 'checking' | 'up' | 'down';

const EndpointRow: FC<{
  icon: FC<{ className?: string }>;
  name: string;
  url: string;
  probe: boolean;
  delay: number;
}> = ({ icon: Icon, name, url, probe, delay }) => {
  const [state, setState] = useState<ProbeState>('checking');
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    setState('checking');
    const timer = setTimeout(async () => {
      if (!probe) {
        if (alive) setState('down');
        return;
      }
      try {
        const ac = new AbortController();
        const to = setTimeout(() => ac.abort(), 2200);
        await fetch(url, { mode: 'no-cors', signal: ac.signal });
        clearTimeout(to);
        if (alive) setState('up');
      } catch {
        // browser demo without running proof server => expected offline
        if (alive) setState('down');
      }
    }, 600 + delay);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [probe, url, delay, nonce]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft px-6 py-4 last:border-b-0">
      <div className="flex items-center gap-3.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-shell text-deep">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="text-body-sm font-semibold text-ink">{name}</p>
          <p className="font-mono text-[12px] text-mist">{url}</p>
        </div>
      </div>
      <div className="flex items-center gap-2.5">
        {state === 'up' ? (
          <span className="badge badge-active">
            <CheckCircle2 className="h-3.5 w-3.5" /> reachable
          </span>
        ) : state === 'checking' ? (
          <span className="badge badge-neutral">
            <Clock className="h-3.5 w-3.5 animate-spin" /> probing…
          </span>
        ) : (
          <span className="badge badge-pending">
            <XCircle className="h-3.5 w-3.5" /> {cacLedger.mode === 'live' ? 'unreachable' : 'demo (local)'}
          </span>
        )}
        <button className="btn-ghost !p-2" onClick={() => setNonce((n) => n + 1)} aria-label={`Re-probe ${name}`}>
          <RefreshCw className="h-3.5 w-3.5 text-mist" />
        </button>
      </div>
    </div>
  );
};

export const SettingsPage: FC = () => {
  const { networkId, contractAddress, credentials, proofs, transactions } = useWalletStore();
  const [resetMsg, setResetMsg] = useState(false);

  const resetDemo = () => {
    try {
      localStorage.removeItem('vericred-store');
      setResetMsg(true);
      setTimeout(() => window.location.reload(), 500);
    } catch {
      setResetMsg(false);
    }
  };

  return (
    <div style={{ paddingTop: 64 }}>
      <section className="border-b border-line bg-paper" style={{ padding: '56px 0 32px' }}>
        <div className="container-vc">
          <p className="overline">Operations</p>
          <h1 className="mt-2.5 text-display-lg text-ink">Network & configuration</h1>
          <p className="mt-2 max-w-xl text-body-md text-mist">
            VeriCred binds one Compact contract, one proof server and one indexer endpoint. The UI reads everything else
            through the service layer — switching the demo ledger for the live contract is a configuration change, not a
            rewrite.
          </p>
        </div>
      </section>

      <section style={{ padding: '48px 0 112px' }}>
        <div className="container-vc grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr]">
          <Reveal>
            <div className="card overflow-hidden">
              <div className="border-b border-line px-6 py-4">
                <h2 className="text-title-md text-ink">Endpoints</h2>
              </div>
              <EndpointRow
                icon={Server}
                name="Proof server (Compact prover)"
                url={vericredClient.getProofServerUrl()}
                probe
                delay={0}
              />
              <EndpointRow
                icon={Database}
                name="Indexer (public state)"
                url={`https://indexer.${networkId}.midnight.network`}
                probe
                delay={250}
              />
              <EndpointRow
                icon={Cpu}
                name="Ledger mode"
                url={`VITE_CAC_LIVE=${cacLedger.mode === 'live' ? 'true' : 'unset'} · ${cacLedger.mode}`}
                probe={false}
                delay={400}
              />
              <EndpointRow icon={Activity} name="Network" url={`Midnight ${networkId}`} probe={false} delay={550} />
            </div>
          </Reveal>

          <div className="space-y-6">
            <Reveal>
              <div className="card p-6">
                <p className="mono-label mb-3">Deployed contract</p>
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-[12.5px] break-all text-graphite">{contractAddress}</p>
                  <CopyButton value={contractAddress} className="shrink-0" />
                </div>
                <p className="mt-3 text-caption text-mist">
                  The institution-owner constant (public key of the registrar) is set at construction. Issuance and
                  revocation circuits assert against it.
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="card p-6">
                <p className="mono-label mb-4">Local state</p>
                <ul className="space-y-2.5 text-body-sm">
                  <li className="flex justify-between">
                    <span className="text-mist">Credentials tracked</span>
                    <span className="font-semibold text-ink">{credentials.length}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-mist">Proofs in this browser</span>
                    <span className="font-semibold text-ink">{proofs.length}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-mist">Ledger events</span>
                    <span className="font-semibold text-ink">{transactions.length}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-mist">Private witness store</span>
                    <span className="text-teal">encrypted · local</span>
                  </li>
                </ul>
                <button className="btn-secondary btn-sm mt-5 w-full" onClick={resetDemo}>
                  Reset demo data
                </button>
                {resetMsg && <p className="mt-2 text-center text-caption text-success">Cleared — reloading…</p>}
              </div>
            </Reveal>

            <Reveal delay={0.15}>
              <div className="card-quiet p-6">
                <p className="text-body-sm font-semibold text-ink">Wire the live contract</p>
                <p className="mt-2 text-caption leading-relaxed text-mist">
                  Set <code className="font-mono text-deep">VITE_CAC_LIVE=true</code> and{' '}
                  <code className="font-mono text-deep">VITE_CAC_CONTRACT_ADDRESS</code>, then complete{' '}
                  <code className="font-mono">LiveCacLedger</code> using the existing Midnight provider stack (
                  <Link to="/architecture" className="link-quiet">
                    architecture docs
                  </Link>
                  ). No component changes required.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SettingsPage;
