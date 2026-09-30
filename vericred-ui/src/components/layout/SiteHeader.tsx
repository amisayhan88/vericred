import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Menu, ShieldCheck, Wallet, X } from 'lucide-react';
import { useWalletStore } from '../../store/useWalletStore';
import { WalletModal } from './WalletModal';

const NAV_ITEMS: Array<{ label: string; to: string; route: string }> = [
  { label: 'Platform', to: '/#platform', route: '/' },
  { label: 'How It Works', to: '/how-it-works', route: '/how-it-works' },
  { label: 'For Universities', to: '/universities', route: '/universities' },
  { label: 'For Students', to: '/wallet', route: '/wallet' },
  { label: 'For Verifiers', to: '/verify', route: '/verify' },
  { label: 'Technology', to: '/architecture', route: '/architecture' },
];

const isAnchor = (to: string) => to.includes('#');

export const SiteHeader: FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const { isConnected, walletAddress, connectWallet } = useWalletStore();
  const navigate = useNavigate();
  const location = useLocation();
  const reduced = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  const go = (to: string) => {
    if (isAnchor(to)) {
      const [, hash] = to.split('#');
      if (location.pathname !== '/') {
        void navigate('/');
        setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }), 120);
      } else {
        document.getElementById(hash)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
      }
    } else {
      void navigate(to);
    }
  };

  const isActive = (item: (typeof NAV_ITEMS)[number]) =>
    isAnchor(item.to) ? location.pathname === '/' : location.pathname.startsWith(item.route);

  return (
    <>
      <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center px-5 pt-5 sm:pt-6">
        <motion.div
          className={`pointer-events-auto flex w-full max-w-[1200px] items-center justify-between gap-4 rounded-full border transition-all duration-300 ${
            scrolled
              ? 'border-line bg-paper/85 shadow-card backdrop-blur-xl'
              : 'border-line-soft bg-paper/55 backdrop-blur-lg'
          }`}
          style={{ height: scrolled ? 60 : 68, paddingLeft: 16, paddingRight: 12 }}
          initial={reduced ? false : { y: -68, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 0.61, 0.36, 1] }}
        >
          {/* Logo — single-line wordmark */}
          <Link to="/" className="flex shrink-0 items-center gap-3 px-1 no-underline" aria-label="VeriCred home">
            <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-deep text-on-dark shadow-soft">
              <ShieldCheck className="h-[17px] w-[17px]" />
              <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-teal ring-2 ring-paper" />
            </span>
            <span className="text-[17px] font-semibold tracking-[-0.01em] text-ink">VeriCred</span>
          </Link>

          {/* Center nav — animated pill indicator */}
          <nav className="hidden items-center gap-1.5 lg:flex" aria-label="Primary">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.label}
                onClick={() => go(item.to)}
                className={`relative rounded-full px-4 py-2 text-[13.5px] font-medium transition-colors duration-200 ${
                  isActive(item) ? 'text-ink' : 'text-mist hover:text-ink'
                }`}
              >
                {isActive(item) && (
                  <motion.span
                    layoutId="vc-nav-pill"
                    className="absolute inset-0 rounded-full bg-shell shadow-soft"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative">{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Right cluster */}
          <div className="flex shrink-0 items-center gap-2.5">
            <button
              onClick={() => go('/verify')}
              className="hidden rounded-full px-4 py-2 text-[13.5px] font-medium text-graphite transition-colors hover:bg-shell hover:text-ink md:block"
            >
              Verify Credential
            </button>
            {isConnected ? (
              <button
                onClick={() => setWalletOpen(true)}
                className="flex h-9 items-center gap-2 rounded-full border border-line bg-paper px-3.5 text-[12px] font-semibold text-ink shadow-soft transition-colors hover:border-teal/50"
              >
                <Wallet className="h-3.5 w-3.5 text-teal" />
                <span className="font-mono">
                  {walletAddress ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}` : 'Wallet'}
                </span>
              </button>
            ) : (
              <button
                onClick={() => void connectWallet('auto')}
                className="group flex h-9 items-center gap-1.5 rounded-full bg-deep px-4 text-[13px] font-semibold text-on-dark shadow-soft transition-all hover:bg-[#12314A]"
              >
                Get Started
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </button>
            )}
            <button
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink transition-colors hover:bg-shell lg:hidden"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </motion.div>
      </header>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="fixed inset-0 z-50 bg-canvas lg:hidden"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22 }}
          >
            <div className="container-vc flex h-20 items-center">
              <span className="font-display text-lg text-ink">VeriCred</span>
            </div>
            <nav className="container-vc mt-2 flex flex-col gap-1" aria-label="Mobile">
              {NAV_ITEMS.map((item, i) => (
                <motion.button
                  key={item.label}
                  onClick={() => {
                    setMenuOpen(false);
                    go(item.to);
                  }}
                  className="flex items-center justify-between rounded-xl px-4 py-4 text-left text-[19px] font-medium text-ink"
                  initial={{ opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.04 * i + 0.05 }}
                >
                  {item.label}
                  <ArrowRight className="h-4 w-4 text-faint" />
                </motion.button>
              ))}
              <div className="mt-4 flex flex-col gap-2.5">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    go('/verify');
                  }}
                  className="btn-secondary w-full !rounded-pill"
                >
                  Verify Credential
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    go('/wallet');
                  }}
                  className="btn-primary w-full !rounded-pill"
                >
                  Get Started
                </button>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      <WalletModal open={walletOpen} onClose={() => setWalletOpen(false)} />
    </>
  );
};
