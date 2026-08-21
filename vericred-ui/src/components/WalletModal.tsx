import React, { useState } from 'react';
import { useWalletStore } from '../store/useWalletStore';
import { X, Wallet, CheckCircle2, Copy, Check, Lock, RefreshCw } from 'lucide-react';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({ isOpen, onClose }) => {
  const { isConnected, isConnecting, walletAddress, balance, connectWallet, disconnectWallet, activeWalletType } = useWalletStore();
  const [manualAddr, setManualAddr] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'1am' | 'lace' | 'manual'>('1am');

  if (!isOpen) return null;

  const handleCopy = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleConnect = async (provider: '1am' | 'lace' | 'manual') => {
    if (provider === 'manual') {
      if (!manualAddr.trim()) return;
      await connectWallet('custom', manualAddr.trim());
    } else {
      await connectWallet(provider);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-canvas rounded-xl border border-hairline shadow-card overflow-hidden p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Wallet className="w-4 h-4 text-on-primary" />
            </div>
            <div>
              <h2 className="text-title-sm text-ink">Wallet Manager</h2>
              <p className="text-caption text-muted">Preprod Testnet Connector</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-surface-soft text-muted hover:text-ink transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isConnected ? (
          <div className="space-y-4">
            {/* Connected State */}
            <div className="card-content p-4 space-y-3" style={{ padding: '16px' }}>
              <div className="flex items-center justify-between">
                <span className="text-caption font-semibold text-muted uppercase tracking-wider">Active Wallet</span>
                <span className="badge-pill bg-[#ecfdf5] text-success text-caption" style={{ fontSize: '11px' }}>
                  <CheckCircle2 className="w-3 h-3" /> Connected ({activeWalletType || '1am'})
                </span>
              </div>

              <div>
                <div className="text-caption text-muted mb-1">Wallet Address</div>
                <div className="flex items-center justify-between p-2.5 rounded-md bg-surface-soft border border-hairline-soft font-mono text-caption text-ink">
                  <span>{walletAddress?.substring(0, 14)}...{walletAddress?.substring(walletAddress.length - 8)}</span>
                  <button onClick={handleCopy} className="p-1 text-muted hover:text-ink transition-colors">
                    {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-body-sm font-semibold text-ink">Balance</span>
                <span className="text-title-sm text-ink">{balance}</span>
              </div>
            </div>

            <button
              onClick={() => { disconnectWallet(); onClose(); }}
              className="btn-secondary w-full text-error border-error/30 hover:bg-[#fef2f2]"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Disconnect Wallet</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Tab Selector — nav-pill-group */}
            <div className="nav-pill-group w-full">
              <button
                onClick={() => setActiveTab('1am')}
                className={`nav-pill-item flex-1 text-center ${activeTab === '1am' ? 'active' : ''}`}
              >
                1am Wallet
              </button>
              <button
                onClick={() => setActiveTab('lace')}
                className={`nav-pill-item flex-1 text-center ${activeTab === 'lace' ? 'active' : ''}`}
              >
                Midnight Lace
              </button>
              <button
                onClick={() => setActiveTab('manual')}
                className={`nav-pill-item flex-1 text-center ${activeTab === 'manual' ? 'active' : ''}`}
              >
                Custom
              </button>
            </div>

            {activeTab === '1am' && (
              <div className="card-content p-4 space-y-3" style={{ padding: '16px' }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-primary text-on-primary font-bold flex items-center justify-center text-caption">
                    1AM
                  </div>
                  <div>
                    <h3 className="text-body-sm font-semibold text-ink">1am Midnight Extension</h3>
                    <p className="text-caption text-muted">Browser wallet for Midnight Preprod</p>
                  </div>
                </div>
                <button
                  onClick={() => handleConnect('1am')}
                  disabled={isConnecting}
                  className="btn-primary w-full"
                >
                  {isConnecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                  <span>{isConnecting ? 'Connecting...' : 'Connect 1am Wallet'}</span>
                </button>
              </div>
            )}

            {activeTab === 'lace' && (
              <div className="card-content p-4 space-y-3" style={{ padding: '16px' }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-primary text-on-primary font-bold flex items-center justify-center text-caption">
                    LACE
                  </div>
                  <div>
                    <h3 className="text-body-sm font-semibold text-ink">Midnight Lace Wallet</h3>
                    <p className="text-caption text-muted">Official Lace DApp Connector</p>
                  </div>
                </div>
                <button
                  onClick={() => handleConnect('lace')}
                  disabled={isConnecting}
                  className="btn-primary w-full"
                >
                  {isConnecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                  <span>{isConnecting ? 'Connecting...' : 'Connect Lace Wallet'}</span>
                </button>
              </div>
            )}

            {activeTab === 'manual' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-caption font-semibold text-ink mb-1.5">
                    Enter Preprod Wallet Address
                  </label>
                  <input
                    type="text"
                    placeholder="mn_addr_preprod..."
                    value={manualAddr}
                    onChange={(e) => setManualAddr(e.target.value)}
                    className="input-field font-mono text-caption"
                  />
                </div>
                <button
                  onClick={() => handleConnect('manual')}
                  disabled={!manualAddr.trim()}
                  className="btn-primary w-full"
                >
                  Set Active Address
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
