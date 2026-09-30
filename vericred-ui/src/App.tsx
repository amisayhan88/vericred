import { useEffect } from 'react';
import type { FC, ReactNode } from 'react';
import { BrowserRouter, Route, Routes, useLocation, Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Compass } from 'lucide-react';
import { SiteHeader } from './components/layout/SiteHeader';
import { SiteFooter } from './components/layout/SiteFooter';
import LandingPage from './pages/LandingPage';
import HowItWorksPage from './pages/HowItWorksPage';
import ArchitecturePage from './pages/ArchitecturePage';
import WalletPage from './pages/WalletPage';
import ProofGeneratorPage from './pages/ProofGeneratorPage';
import VerifyPage from './pages/VerifyPage';
import VerificationResultPage from './pages/VerificationResultPage';
import CredentialDetailPage from './pages/CredentialDetailPage';
import UniversitiesPage from './pages/UniversitiesPage';
import TransactionsPage from './pages/TransactionsPage';
import SettingsPage from './pages/SettingsPage';
import LegalPage from './pages/LegalPage';

const NotFoundPage: FC = () => (
  <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-shell text-deep">
      <Compass className="h-6 w-6" />
    </span>
    <h1 className="mt-6 text-display-sm text-ink">This page wasn’t issued to you</h1>
    <p className="mt-3 max-w-sm text-body-md text-mist">The route has no valid commitment on this ledger.</p>
    <Link to="/" className="btn-primary mt-8">
      Return to VeriCred
    </Link>
  </div>
);

const PageFrame: FC<{ children: ReactNode; pathKey: string }> = ({ children, pathKey }) => {
  const reduced = useReducedMotion();
  return (
    <motion.main
      key={pathKey}
      className="flex-1"
      initial={reduced ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduced ? undefined : { opacity: 0, y: -6 }}
      transition={{ duration: 0.38, ease: [0.22, 0.61, 0.36, 1] }}
    >
      {children}
    </motion.main>
  );
};

const ScrollToTop: FC = () => {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const id = hash.slice(1);
      const t = setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 140);
      return () => clearTimeout(t);
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, hash]);
  return null;
};

const Shell: FC = () => {
  const location = useLocation();
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <SiteHeader />
      <ScrollToTop />
      <AnimatePresence mode="wait">
        <PageFrame pathKey={location.pathname}>
          <Routes location={location}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="/architecture" element={<ArchitecturePage />} />
            <Route path="/wallet" element={<WalletPage />} />
            <Route path="/proof" element={<ProofGeneratorPage />} />
            <Route path="/verify" element={<VerifyPage />} />
            <Route path="/verify/:vid" element={<VerificationResultPage />} />
            <Route path="/credential/:id" element={<CredentialDetailPage />} />
            <Route path="/universities" element={<UniversitiesPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/legal" element={<LegalPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </PageFrame>
      </AnimatePresence>
      <SiteFooter />
    </div>
  );
};

export const App: FC = () => (
  <BrowserRouter>
    <Shell />
  </BrowserRouter>
);

export default App;
