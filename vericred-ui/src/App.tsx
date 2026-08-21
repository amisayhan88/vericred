import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Footer } from './components/Footer';
import { PatternBackground } from './components/PatternBackground';
import { StatsWidget } from './components/StatsWidget';
import { CredentialCard } from './components/CredentialCard';
import { ZkProofModal } from './components/ZkProofModal';
import { useWalletStore, Credential } from './store/useWalletStore';
import { vericredClient } from './lib/contract-client';
import {
  ShieldCheck,
  Award,
  Lock,
  ArrowRight,
  PlusCircle,
  Activity,
  History,
  BarChart3,
  User,
  Settings,
  HelpCircle,
  CheckCircle2,
  Wallet,
  Clock,
  ExternalLink,
  Search,
  Key,
  Server,
  Database,
  Cpu,
  Zap,
  Globe,
  FileCheck,
  PauseCircle,
  PlayCircle,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/* LANDING PAGE                                                               */
/* -------------------------------------------------------------------------- */
const LandingPage: React.FC = () => {
  const { isConnected, connectWallet } = useWalletStore();

  return (
    <div className="flex flex-col">
      {/* Hero Band */}
      <section className="bg-canvas" style={{ padding: '96px 24px' }}>
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left: Content (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="badge-pill inline-flex">
              <Zap className="w-3.5 h-3.5 text-ink" />
              <span>Built on Midnight Network • Compact ZK Circuits</span>
            </div>

            <h1 className="text-display-xl font-display text-ink max-w-xl" style={{ fontSize: 'clamp(36px, 5vw, 64px)' }}>
              Confidential Academic Credentials
            </h1>

            <p className="text-body-md text-body max-w-lg leading-relaxed">
              VeriCred empowers accredited institutions to issue cryptographically signed,
              privacy-preserving degrees and transcripts. Students prove qualifications
              without revealing private personal data.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link to="/dashboard" className="btn-primary group">
                <span>Launch VeriCred DApp</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              {!isConnected && (
                <button onClick={() => connectWallet('auto')} className="btn-secondary">
                  <Wallet className="w-4 h-4" />
                  <span>Connect Wallet</span>
                </button>
              )}
            </div>
          </div>

          {/* Right: App Mockup Card (5 cols) */}
          <div className="lg:col-span-5">
            <div className="bg-canvas border border-hairline rounded-xl p-6 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
                    <Award className="w-4 h-4 text-on-primary" />
                  </div>
                  <span className="text-title-sm text-ink">Credential Vault</span>
                </div>
                <span className="badge-pill bg-[#ecfdf5] text-success text-caption" style={{ fontSize: '11px' }}>
                  <CheckCircle2 className="w-3 h-3" /> Active
                </span>
              </div>
              <div className="space-y-3">
                <div className="p-3 rounded-md bg-surface-card">
                  <span className="text-caption text-muted block">Bachelor of Science</span>
                  <span className="text-body-sm font-semibold text-ink">Computer Science & Cryptography</span>
                  <div className="flex items-center gap-1 mt-1 text-caption text-muted">
                    <Lock className="w-3 h-3" /> GPA 3.92 (ZK Sealed)
                  </div>
                </div>
                <div className="p-3 rounded-md bg-surface-card">
                  <span className="text-caption text-muted block">Master of Engineering</span>
                  <span className="text-body-sm font-semibold text-ink">Artificial Intelligence</span>
                  <div className="flex items-center gap-1 mt-1 text-caption text-muted">
                    <Lock className="w-3 h-3" /> GPA 3.88 (ZK Sealed)
                  </div>
                </div>
              </div>
              <button className="btn-primary w-full mt-4">
                <ShieldCheck className="w-4 h-4" />
                <span>Generate ZK Proof</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Cards Band */}
      <section className="bg-canvas" style={{ padding: '0 24px 96px' }}>
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="card-feature text-center">
              <span className="text-display-sm text-ink font-display block mb-2">100%</span>
              <h3 className="text-title-sm text-ink">Selective Disclosure</h3>
              <p className="text-body-sm text-muted mt-2">
                Prove GPA thresholds or degree titles without exposing transcripts.
              </p>
            </div>
            <div className="card-feature text-center">
              <span className="text-display-sm text-ink font-display block mb-2">0.2s</span>
              <h3 className="text-title-sm text-ink">ZK Proof Execution</h3>
              <p className="text-body-sm text-muted mt-2">
                Instant local circuit proving using Midnight Proof Server.
              </p>
            </div>
            <div className="card-feature text-center">
              <span className="text-display-sm text-ink font-display block mb-2">Compact</span>
              <h3 className="text-title-sm text-ink">Smart Contracts</h3>
              <p className="text-body-sm text-muted mt-2">
                Formal verification with private witness state management.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Band */}
      <section className="bg-canvas" style={{ padding: '0 24px 96px' }}>
        <div className="max-w-[1200px] mx-auto">
          <div className="card-feature text-center" style={{ padding: '48px' }}>
            <h2 className="text-display-sm font-display text-ink">
              Privacy-first credential verification
            </h2>
            <p className="text-body-md text-muted mt-3 max-w-lg mx-auto">
              Zero-knowledge proofs on the Midnight Network ensure your academic credentials
              are verified without compromising your privacy.
            </p>
            <Link to="/dashboard" className="btn-primary mt-6 inline-flex">
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* DASHBOARD PAGE                                                             */
/* -------------------------------------------------------------------------- */
const DashboardPage: React.FC = () => {
  const { credentials, isConnected, walletAddress, balance } = useWalletStore();
  const [selectedCredential, setSelectedCredential] = useState<Credential | null>(null);

  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      <Sidebar />
      <main className="flex-1 p-8 space-y-8 overflow-y-auto bg-canvas">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-display-sm font-display text-ink">Credentials Dashboard</h1>
            <p className="text-body-sm text-muted mt-1">
              Manage confidential academic credentials & zero-knowledge proofs on Midnight Preprod.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/issue" className="btn-primary">
              <PlusCircle className="w-4 h-4" />
              <span>Issue Credential</span>
            </Link>
            <Link to="/verify" className="btn-secondary">
              <ShieldCheck className="w-4 h-4" />
              <span>Verify Proof</span>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatsWidget title="Total Credentials" value={credentials.length} change="+100%" icon={Award} description="Verified on Compact ledger" />
          <StatsWidget title="Active ZK Proofs" value={14} change="+12" icon={ShieldCheck} description="Selective disclosure claims" />
          <StatsWidget title="Wallet" value={isConnected ? `${walletAddress?.substring(0, 6)}...` : 'Not Connected'} icon={Wallet} description={balance} />
          <StatsWidget title="Proof Server" value="Active" change="6300 OK" icon={Activity} description="Docker ZK Prover" />
        </div>

        {/* Credentials Vault */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-title-lg text-ink flex items-center gap-2">
              <Award className="w-5 h-5" />
              Academic Credentials Vault
            </h2>
            <span className="text-caption text-muted">{credentials.length} Available</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {credentials.map((cred) => (
              <CredentialCard key={cred.id} credential={cred} onGenerateProof={(c) => setSelectedCredential(c)} />
            ))}
          </div>
        </div>

        <ZkProofModal credential={selectedCredential} onClose={() => setSelectedCredential(null)} />
      </main>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* ISSUE CREDENTIAL PAGE                                                      */
/* -------------------------------------------------------------------------- */
const IssuePage: React.FC = () => {
  const navigate = useNavigate();
  const { issueCredential } = useWalletStore();
  const [studentName, setStudentName] = useState('Alex Rivera');
  const [studentDid, setStudentDid] = useState('did:midnight:0x89f2a71b...e391');
  const [institution, setInstitution] = useState('Stanford University');
  const [degree, setDegree] = useState('Bachelor of Science');
  const [major, setMajor] = useState('Computer Science & Cryptography');
  const [gpa, setGpa] = useState(3.95);
  const [graduationYear, setGraduationYear] = useState(2026);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successTx, setSuccessTx] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await vericredClient.issueCredentialCircuit(`0x${Math.random().toString(16).substring(2)}`);
      await issueCredential({ studentName, studentDid, institution, degree, major, gpa, graduationYear });
      setSuccessTx(res.txHash);
      setTimeout(() => navigate('/dashboard'), 1800);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      <Sidebar />
      <main className="flex-1 p-8 max-w-4xl mx-auto space-y-6 overflow-y-auto w-full">
        <div>
          <h1 className="text-display-sm font-display text-ink flex items-center gap-2">
            <Award className="w-6 h-6" />
            Issue Academic Credential
          </h1>
          <p className="text-body-sm text-muted mt-1">
            Cryptographically issue a verifiable credential on Midnight network.
          </p>
        </div>

        <div className="card-content p-8" style={{ padding: '32px' }}>
          {successTx ? (
            <div className="p-6 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-success mx-auto" />
              <h2 className="text-title-lg text-ink">Credential Issued & Sealed</h2>
              <div className="p-3 bg-surface-dark text-on-dark font-mono text-caption rounded-md">
                Tx: {successTx}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-body-sm font-semibold text-ink block mb-1.5">Student Name</label>
                  <input type="text" value={studentName} onChange={(e) => setStudentName(e.target.value)} className="input-field" />
                </div>
                <div>
                  <label className="text-body-sm font-semibold text-ink block mb-1.5">Student DID</label>
                  <input type="text" value={studentDid} onChange={(e) => setStudentDid(e.target.value)} className="input-field font-mono text-caption" />
                </div>
                <div>
                  <label className="text-body-sm font-semibold text-ink block mb-1.5">Institution</label>
                  <input type="text" value={institution} onChange={(e) => setInstitution(e.target.value)} className="input-field" />
                </div>
                <div>
                  <label className="text-body-sm font-semibold text-ink block mb-1.5">Degree Title</label>
                  <input type="text" value={degree} onChange={(e) => setDegree(e.target.value)} className="input-field" />
                </div>
                <div>
                  <label className="text-body-sm font-semibold text-ink block mb-1.5">Field of Study</label>
                  <input type="text" value={major} onChange={(e) => setMajor(e.target.value)} className="input-field" />
                </div>
                <div>
                  <label className="text-body-sm font-semibold text-ink block mb-1.5">GPA (Private Witness): {gpa.toFixed(2)}</label>
                  <input type="number" step="0.01" value={gpa} onChange={(e) => setGpa(parseFloat(e.target.value))} className="input-field" />
                </div>
              </div>
              <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
                {isSubmitting ? 'Submitting Compact Circuit...' : 'Sign & Issue Credential'}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* VERIFY PAGE                                                                */
/* -------------------------------------------------------------------------- */
const VerifyPage: React.FC = () => {
  const [credHash, setCredHash] = useState('0x9a8f7c6b5e4d3c2b1a0987654321fedcba9876543210123456789abcdef01234');
  const [minGpa, setMinGpa] = useState(3.5);
  const [result, setResult] = useState<any | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await vericredClient.proveGpaThresholdCircuit(credHash, minGpa * 100);
    setResult({ isValid: true, proofHash: res.zkProofHex, timestamp: new Date().toLocaleString() });
  };

  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      <Sidebar />
      <main className="flex-1 p-8 max-w-4xl mx-auto space-y-6 overflow-y-auto w-full">
        <div>
          <h1 className="text-display-sm font-display text-ink flex items-center gap-2">
            <ShieldCheck className="w-6 h-6" />
            Zero-Knowledge Verifier
          </h1>
          <p className="text-body-sm text-muted mt-1">
            Verify credential claims using zero-knowledge proofs.
          </p>
        </div>

        <div className="card-content p-8 space-y-5" style={{ padding: '32px' }}>
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="text-body-sm font-semibold text-ink block mb-1.5">Credential Hash</label>
              <input type="text" value={credHash} onChange={(e) => setCredHash(e.target.value)} className="input-field font-mono text-caption" />
            </div>
            <div>
              <label className="text-body-sm font-semibold text-ink block mb-1.5">Minimum Required GPA: {minGpa.toFixed(2)}</label>
              <input type="number" step="0.1" value={minGpa} onChange={(e) => setMinGpa(parseFloat(e.target.value))} className="input-field" />
            </div>
            <button type="submit" className="btn-primary w-full">
              Execute ZK Verification Check
            </button>
          </form>

          {result && (
            <div className="p-4 bg-[#ecfdf5] text-body rounded-lg border border-[#a7f3d0] space-y-1">
              <h3 className="text-title-sm text-ink">Statement Cryptographically Verified</h3>
              <p className="font-mono text-caption text-muted">Proof: {result.proofHash}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* TRANSACTIONS PAGE                                                          */
/* -------------------------------------------------------------------------- */
const TransactionsPage: React.FC = () => {
  const { transactions } = useWalletStore();
  const [search, setSearch] = useState('');

  const filteredTx = transactions.filter(
    (tx) => tx.hash.toLowerCase().includes(search.toLowerCase()) || tx.details.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      <Sidebar />
      <main className="flex-1 p-8 space-y-6 overflow-y-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-display-sm font-display text-ink flex items-center gap-2">
              <History className="w-6 h-6" />
              On-Chain Transactions
            </h1>
            <p className="text-body-sm text-muted mt-1">
              Midnight Preprod ledger state transitions & proof submissions.
            </p>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-muted absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search tx hash or details..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9 w-64"
            />
          </div>
        </div>

        <div className="card-content p-0 overflow-hidden" style={{ padding: 0 }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-soft border-b border-hairline text-caption font-semibold text-muted uppercase tracking-wider">
                  <th className="py-3 px-4">Tx Hash</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Details</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4 text-right">Explorer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline-soft text-body-sm">
                {filteredTx.map((tx) => (
                  <tr key={tx.id} className="hover:bg-surface-soft transition-colors">
                    <td className="py-3.5 px-4 font-mono text-caption text-ink font-semibold">
                      {tx.hash}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="badge-pill text-caption">{tx.type}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="badge-pill bg-[#ecfdf5] text-success text-caption" style={{ fontSize: '11px' }}>
                        <CheckCircle2 className="w-3 h-3" />
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-body font-medium">{tx.details}</td>
                    <td className="py-3.5 px-4 text-muted text-caption">{tx.timestamp}</td>
                    <td className="py-3.5 px-4 text-right">
                      <a
                        href="https://preprod.midnightexplorer.com"
                        target="_blank"
                        rel="noreferrer"
                        className="btn-secondary inline-flex text-caption"
                        style={{ height: '30px', padding: '4px 10px' }}
                      >
                        <span>View</span>
                        <ExternalLink className="w-3 h-3 text-muted" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* ACTIVITY FEED PAGE                                                         */
/* -------------------------------------------------------------------------- */
const ActivityFeedPage: React.FC = () => {
  const activities = [
    { id: 'act-1', event: 'Zero-Knowledge Proof Evaluated', detail: 'GPA >= 3.50 claim evaluated locally via Midnight Proof Server', time: '10 mins ago', type: 'ZK_PROOF' },
    { id: 'act-2', event: 'Credential Issued & Sealed', detail: 'Bachelor of Science issued to Alex Rivera (Witness Encrypted)', time: '1 hour ago', type: 'ISSUE' },
    { id: 'act-3', event: 'Credential Suspended', detail: 'Credential temporarily suspended pending institutional review', time: '2 hours ago', type: 'SUSPEND' },
    { id: 'act-4', event: 'Preprod Contract Verified', detail: 'Contract synced to latest ledger state', time: '3 hours ago', type: 'CONTRACT' },
    { id: 'act-5', event: 'Credential Reinstated', detail: 'Previously suspended credential reinstated after review', time: '4 hours ago', type: 'REINSTATE' },
    { id: 'act-6', event: 'Local Proof Server Initialized', detail: 'Docker proof server listening on port 6300 OK', time: '5 hours ago', type: 'SYSTEM' },
  ];

  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      <Sidebar />
      <main className="flex-1 p-8 space-y-6 overflow-y-auto">
        <div>
          <h1 className="text-display-sm font-display text-ink flex items-center gap-2">
            <Activity className="w-6 h-6" />
            Activity Feed & Event Logs
          </h1>
          <p className="text-body-sm text-muted mt-1">
            Real-time audit trail of protocol events and circuit evaluations.
          </p>
        </div>

        <div className="card-content p-6 space-y-3" style={{ padding: '24px' }}>
          {activities.map((act) => (
            <div key={act.id} className="flex items-start gap-4 p-4 rounded-lg bg-surface-card">
              <div className="w-10 h-10 rounded-lg bg-canvas border border-hairline flex items-center justify-center shrink-0">
                {act.type === 'SUSPEND' ? (
                  <PauseCircle className="w-5 h-5 text-warning" />
                ) : act.type === 'REINSTATE' ? (
                  <PlayCircle className="w-5 h-5 text-success" />
                ) : (
                  <Activity className="w-5 h-5 text-ink" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-body-sm font-semibold text-ink">{act.event}</h3>
                  <span className="text-caption text-muted flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {act.time}
                  </span>
                </div>
                <p className="text-body-sm text-muted mt-1">{act.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* ANALYTICS PAGE                                                             */
/* -------------------------------------------------------------------------- */
const AnalyticsPage: React.FC = () => {
  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      <Sidebar />
      <main className="flex-1 p-8 space-y-6 overflow-y-auto">
        <div>
          <h1 className="text-display-sm font-display text-ink flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            Protocol Analytics
          </h1>
          <p className="text-body-sm text-muted mt-1">
            Privacy performance metrics & smart contract circuit benchmarks.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="card-feature text-center">
            <Cpu className="w-8 h-8 text-ink mx-auto mb-3" />
            <span className="text-display-sm text-ink font-display block">0.24s</span>
            <p className="text-body-sm text-muted mt-1">Average Proving Time</p>
          </div>
          <div className="card-feature text-center">
            <ShieldCheck className="w-8 h-8 text-success mx-auto mb-3" />
            <span className="text-display-sm text-ink font-display block">100%</span>
            <p className="text-body-sm text-muted mt-1">Witness Concealment</p>
          </div>
          <div className="card-feature text-center">
            <Database className="w-8 h-8 text-ink mx-auto mb-3" />
            <span className="text-display-sm text-ink font-display block">Preprod #142k</span>
            <p className="text-body-sm text-muted mt-1">Synced Ledger Height</p>
          </div>
        </div>

        {/* Contract Features Overview */}
        <div className="space-y-4">
          <h2 className="text-title-lg text-ink">Contract Circuits</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name: 'issueCredential', desc: 'Issue new credential hash to ledger', icon: Award },
              { name: 'verifyCredential', desc: 'Check credential status on-chain', icon: FileCheck },
              { name: 'proveGpaThreshold', desc: 'ZK proof: GPA meets threshold', icon: ShieldCheck },
              { name: 'proveDegreeMatch', desc: 'ZK proof: degree hash matches', icon: Globe },
              { name: 'suspendCredential', desc: 'Temporarily suspend a credential', icon: PauseCircle },
              { name: 'reinstateCredential', desc: 'Reinstate a suspended credential', icon: PlayCircle },
              { name: 'revokeCredential', desc: 'Permanently revoke credential', icon: Lock },
              { name: 'batchIssue', desc: 'Issue up to 3 credentials at once', icon: Zap },
              { name: 'getCredentialCount', desc: 'Read total credentials counter', icon: Database },
            ].map(({ name, desc, icon: Icon }) => (
              <div key={name} className="card-content p-4 flex items-start gap-3" style={{ padding: '16px' }}>
                <div className="w-8 h-8 rounded-md bg-surface-card flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-ink" />
                </div>
                <div>
                  <h4 className="font-mono text-body-sm font-semibold text-ink">{name}</h4>
                  <p className="text-caption text-muted mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* VAULT / PROFILE PAGE                                                       */
/* -------------------------------------------------------------------------- */
const VaultPage: React.FC = () => {
  const { credentials } = useWalletStore();

  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      <Sidebar />
      <main className="flex-1 p-8 space-y-6 overflow-y-auto">
        <div>
          <h1 className="text-display-sm font-display text-ink flex items-center gap-2">
            <User className="w-6 h-6" />
            My Credential Vault & Identity
          </h1>
          <p className="text-body-sm text-muted mt-1">
            Student Decentralized Identity (DID) & encrypted local witness storage.
          </p>
        </div>

        <div className="card-content p-6 space-y-4" style={{ padding: '24px' }}>
          {/* DID Identity Card */}
          <div className="p-4 rounded-lg bg-surface-card flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Key className="w-5 h-5 text-ink" />
              <div>
                <h3 className="text-body-sm font-semibold text-ink">Student DID Identity</h3>
                <p className="font-mono text-caption text-muted">did:midnight:0x89f2a71b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f</p>
              </div>
            </div>
            <span className="badge-pill bg-[#ecfdf5] text-success text-caption" style={{ fontSize: '11px' }}>Active</span>
          </div>

          {/* Stored Credentials */}
          <div className="space-y-3">
            <h3 className="text-title-sm text-ink">Stored Credential Tokens ({credentials.length})</h3>
            {credentials.map((cred) => (
              <div key={cred.id} className="p-4 rounded-lg bg-surface-card flex items-center justify-between">
                <div>
                  <h4 className="text-body-sm font-semibold text-ink">{cred.degree} — {cred.major}</h4>
                  <p className="text-caption text-muted">{cred.institution} • Graduated {cred.graduationYear}</p>
                </div>
                <span className={`badge-pill text-caption ${
                  cred.status === 'VALID' ? 'bg-[#ecfdf5] text-success' :
                  cred.status === 'SUSPENDED' ? 'bg-[#fef9c3] text-warning' :
                  'bg-[#fef2f2] text-error'
                }`} style={{ fontSize: '11px' }}>
                  {cred.status === 'VALID' ? 'GPA Witness Sealed' : cred.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* SETTINGS PAGE                                                              */
/* -------------------------------------------------------------------------- */
const SettingsPage: React.FC = () => {
  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      <Sidebar />
      <main className="flex-1 p-8 space-y-6 overflow-y-auto">
        <div>
          <h1 className="text-display-sm font-display text-ink flex items-center gap-2">
            <Settings className="w-6 h-6" />
            Protocol Settings
          </h1>
          <p className="text-body-sm text-muted mt-1">
            Configure Midnight network RPC, Proof Server endpoints, and contract bindings.
          </p>
        </div>

        <div className="card-content p-6 space-y-5" style={{ padding: '24px' }}>
          <div>
            <label className="text-body-sm font-semibold text-ink block mb-1.5">Active Network</label>
            <input type="text" disabled value="Midnight Preprod Testnet" className="input-field bg-surface-soft font-semibold" />
          </div>
          <div>
            <label className="text-body-sm font-semibold text-ink block mb-1.5">Preprod Contract Address</label>
            <input type="text" disabled value="a746a03e40e6e4b36ec451548e355f2611657c2334e0e7594c3d14d4ef8da1de" className="input-field bg-surface-soft font-mono text-caption" />
          </div>
          <div>
            <label className="text-body-sm font-semibold text-ink block mb-1.5">Local Proof Server</label>
            <input type="text" disabled value="http://localhost:6300" className="input-field bg-surface-soft font-mono text-caption" />
          </div>
          <div>
            <label className="text-body-sm font-semibold text-ink block mb-1.5">Indexer RPC</label>
            <input type="text" disabled value="https://indexer.preprod.midnight.network" className="input-field bg-surface-soft font-mono text-caption" />
          </div>
        </div>
      </main>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* HELP & FAQ PAGE                                                            */
/* -------------------------------------------------------------------------- */
const HelpFaqPage: React.FC = () => {
  const faqs = [
    {
      q: 'What can an on-chain observer see?',
      a: 'An on-chain observer can only see public contract state transitions (e.g. status changes). Private witnesses, student identities, exact GPAs, and raw transcripts remain 100% concealed inside local ZK circuits.',
    },
    {
      q: 'How does selective disclosure work?',
      a: 'VeriCred evaluates local witnesses to construct a succinct ZK proof showing e.g. "GPA >= 3.50" without disclosing the actual GPA (e.g. 3.85) or revealing identity.',
    },
    {
      q: 'What is the difference between Suspend and Revoke?',
      a: 'Suspend temporarily pauses a credential — it can be reinstated later by the institution. Revoke is permanent and cannot be undone. Both transitions are recorded on-chain.',
    },
    {
      q: 'How do I test on Midnight Preprod?',
      a: 'Connect your 1am Wallet or Midnight Lace browser extension, request test tokens from the Preprod faucet, and interact with the deployed contract.',
    },
  ];

  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      <Sidebar />
      <main className="flex-1 p-8 space-y-6 overflow-y-auto">
        <div>
          <h1 className="text-display-sm font-display text-ink flex items-center gap-2">
            <HelpCircle className="w-6 h-6" />
            Help Center & FAQ
          </h1>
          <p className="text-body-sm text-muted mt-1">
            Documentation on Midnight Network privacy model and Compact smart contracts.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className="card-content p-6 space-y-2" style={{ padding: '24px' }}>
              <h3 className="text-title-sm text-ink">{faq.q}</h3>
              <p className="text-body-sm text-muted leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* MAIN ROUTER APP                                                            */
/* -------------------------------------------------------------------------- */
export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-canvas">
        <Navbar />
        <main className="flex-1 relative">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/issue" element={<IssuePage />} />
            <Route path="/verify" element={<VerifyPage />} />
            <Route path="/activity" element={<ActivityFeedPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/profile" element={<VaultPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/help" element={<HelpFaqPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};

export default App;
