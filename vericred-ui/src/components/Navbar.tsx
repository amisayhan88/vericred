import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useWalletStore } from '../store/useWalletStore';
import { WalletModal } from './WalletModal';
import { Wallet, Lock, CheckCircle2, Award, ChevronDown } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { isConnected, isConnecting, walletAddress, balance, activeWalletType } = useWalletStore();
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 bg-canvas border-b border-hairline" style={{ height: '64px' }}>
        <div className="max-w-[1200px] mx-auto h-full flex items-center justify-between px-6">
          {/* Logo + Wordmark */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center group-hover:bg-primary-active transition-colors">
              <Award className="w-5 h-5 text-on-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-title-sm font-semibold text-ink leading-tight tracking-tight">
                VeriCred
              </span>
              <span className="text-caption text-muted leading-tight">
                Confidential Credentials
              </span>
            </div>
          </Link>

          {/* Center Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            <Link to="/dashboard" className="text-nav-link text-muted hover:text-ink px-3 py-2 rounded-md transition-colors">
              Dashboard
            </Link>
            <Link to="/issue" className="text-nav-link text-muted hover:text-ink px-3 py-2 rounded-md transition-colors">
              Issue
            </Link>
            <Link to="/verify" className="text-nav-link text-muted hover:text-ink px-3 py-2 rounded-md transition-colors">
              Verify
            </Link>
            <Link to="/transactions" className="text-nav-link text-muted hover:text-ink px-3 py-2 rounded-md transition-colors">
              Transactions
            </Link>
            <Link to="/analytics" className="text-nav-link text-muted hover:text-ink px-3 py-2 rounded-md transition-colors">
              Analytics
            </Link>
          </nav>

          {/* Right Cluster */}
          <div className="flex items-center gap-3">
            {/* Network Badge */}
            <div className="hidden sm:flex items-center gap-2 badge-pill">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-caption text-muted">Preprod</span>
            </div>

            {isConnected ? (
              <div className="flex items-center gap-2">
                <div className="hidden md:flex flex-col items-end px-3 py-1.5">
                  <span className="text-body-sm font-semibold text-ink">{balance}</span>
                  <span className="text-caption text-success flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {activeWalletType === '1am' ? '1am Active' : 'Connected'}
                  </span>
                </div>
                <button
                  onClick={() => setIsWalletModalOpen(true)}
                  className="btn-secondary text-body-sm"
                  style={{ height: '36px', padding: '8px 14px' }}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span className="font-mono text-caption">{walletAddress?.substring(0, 6)}...{walletAddress?.substring(walletAddress.length - 4)}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-muted" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsWalletModalOpen(true)}
                disabled={isConnecting}
                className="btn-primary"
              >
                <Wallet className="w-4 h-4" />
                <span>{isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <WalletModal isOpen={isWalletModalOpen} onClose={() => setIsWalletModalOpen(false)} />
    </>
  );
};
