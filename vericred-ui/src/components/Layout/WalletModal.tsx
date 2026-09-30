import { useState } from 'react';
import type { FC } from 'react';
import { CheckCircle2, KeyRound, Link2, Loader2, LogOut, Wallet } from 'lucide-react';
import { Modal } from '../ui/primitives';
import { useWalletStore } from '../../store/useWalletStore';
import { cacLedger } from '../../services/cac-service';

const PROVIDERS = [
  { id: 'lace' as const, name: 'Midnight Lace', detail: 'Browser extension · dApp connector v4' },
  { id: '1am' as const, name: '1AM Wallet', detail: 'Mobile / extension wallet' },
  { id: 'custom' as const, name: 'Preprod demo session', detail: 'Evaluate the product without a wallet' },
];

export const WalletModal: FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const {
    isConnected,
    walletAddress,
    balance,
    activeWalletType,
    networkId,
    contractAddress,
    connectWallet,
    disconnectWallet,
  } = useWalletStore();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connect = async (provider: '1am' | 'lace' | 'custom') => {
    setBusy(provider);
    setError(null);
    try {
      await connectWallet(provider);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connection failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isConnected ? 'Wallet session' : 'Connect a wallet'}>
      {isConnected ? (
        <div className="space-y-4">
          <div className="card-quiet space-y-3 p-4">
            <Row
              label="Provider"
              value={
                activeWalletType === 'custom'
                  ? 'Demo session'
                  : activeWalletType === 'lace'
                    ? 'Midnight Lace'
                    : '1AM Wallet'
              }
            />
            <div>
              <p className="mono-label mb-1">Address</p>
              <p className="break-all font-mono text-caption text-graphite">{walletAddress}</p>
            </div>
            <Row label="Balance" value={balance} />
            <Row label="Network" value={`Midnight ${networkId}`} />
            <Row label="Ledger mode" value={cacLedger.mode === 'live' ? 'Live contract' : 'Demo ledger'} />
            <div>
              <p className="mono-label mb-1">Contract</p>
              <p className="break-all font-mono text-caption text-graphite">{contractAddress}</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="badge badge-active">
              <CheckCircle2 className="h-3.5 w-3.5" /> Connected
            </span>
            <button className="btn-secondary btn-sm" onClick={disconnectWallet}>
              <LogOut className="h-3.5 w-3.5" /> Disconnect
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-body-sm text-mist">
            VeriCred connects through the Midnight dApp connector API. Private witness state stays in your local
            provider — only compact commitments reach the network.
          </p>
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              onClick={() => connect(p.id)}
              disabled={busy !== null}
              className="card card-hover flex w-full items-center justify-between gap-3 p-4 text-left"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-shell text-deep">
                  {p.id === 'custom' ? <KeyRound className="h-4 w-4" /> : <Wallet className="h-4 w-4" />}
                </span>
                <span>
                  <span className="block text-body-sm font-semibold text-ink">{p.name}</span>
                  <span className="block text-caption text-mist">{p.detail}</span>
                </span>
              </span>
              {busy === p.id ? (
                <Loader2 className="h-4 w-4 animate-spin text-teal" />
              ) : (
                <Link2 className="h-4 w-4 text-faint" />
              )}
            </button>
          ))}
          {error && <p className="text-caption text-error">{error}</p>}
        </div>
      )}
    </Modal>
  );
};

const Row: FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between text-body-sm">
    <span className="text-mist">{label}</span>
    <span className="font-semibold text-ink">{value}</span>
  </div>
);
