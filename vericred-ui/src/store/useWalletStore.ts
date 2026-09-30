import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { credentialDisplayId, proofVerificationId, randomHashHex } from '../lib/ids';

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

export type CredentialStatus = 'ACTIVE' | 'PENDING' | 'EXPIRED' | 'SUSPENDED' | 'REVOKED';

export type CredentialType =
  'DEGREE' | 'TRANSCRIPT' | 'GPA' | 'GRADUATION' | 'COURSE_COMPLETION' | 'INSTITUTION_VERIFICATION';

export type ClaimType =
  'DEGREE_VALIDITY' | 'GPA_THRESHOLD' | 'GRADUATION_STATUS' | 'COURSE_COMPLETION' | 'ENROLLMENT_STATUS' | 'CUSTOM';

export type TimelineKind = 'CREATED' | 'ISSUED' | 'RECEIVED' | 'PROOF' | 'VERIFIED' | 'STATUS' | 'REVOKED' | 'EXPIRED';

export interface CredentialEvent {
  kind: TimelineKind;
  label: string;
  detail?: string;
  at: string; // ISO timestamp
}

export interface Credential {
  id: string;
  displayId: string;
  owner: boolean; // held in the demo student's wallet
  studentName: string;
  studentDid: string;
  institution: string;
  type: CredentialType;
  title: string; // e.g. "B.Tech Computer Science"
  program: string; // e.g. "Computer Science & Engineering"
  gpa: number; // PRIVATE witness value — never render in UI text
  graduationYear: number;
  credentialHash: string; // public ledger commitment
  status: CredentialStatus;
  issuedAt: string; // ISO
  expiresAt?: string;
  revokedAt?: string;
  revocationReason?: string;
  institutionVerified: boolean;
  proofsGenerated: number;
  verifications: number;
  timeline: CredentialEvent[];
}

export type ProofStatus = 'GENERATED' | 'VERIFIED' | 'EXPIRED';

export interface ProofRecord {
  id: string;
  verificationId: string; // shareable public handle: VP-XXXX-XXXX
  credentialId: string;
  credentialDisplayId: string;
  claimType: ClaimType;
  claimLabel: string; // human readable disclosed claim, e.g. "GPA ≥ 3.50"
  threshold?: number;
  customClaim?: string;
  circuit: string; // compact circuit exercised by the proof
  proofHash: string;
  createdAt: string;
  expiresAt: string;
  disclosedFields: string[];
  concealedFields: string[];
  status: ProofStatus;
  lastVerifiedAt?: string;
  lastVerifier?: string;
}

export interface VerificationLog {
  id: string;
  at: string;
  verifier: string;
  verifierType: 'EMPLOYER' | 'INSTITUTION' | 'SCHOLARSHIP_BOARD' | 'ADMISSIONS_OFFICE' | 'CERTIFICATION_BOARD';
  target: string; // credential display id or proof verification id
  claim: string;
  outcome: 'PASSED' | 'FAILED';
}

export interface Transaction {
  id: string;
  type:
    | 'ISSUE_CREDENTIAL'
    | 'VERIFY_PROOF'
    | 'PROOF_GENERATED'
    | 'REVOKE_CREDENTIAL'
    | 'SUSPEND_CREDENTIAL'
    | 'REINSTATE_CREDENTIAL'
    | 'BATCH_ISSUE'
    | 'EXPIRE_CREDENTIAL';
  status: 'PENDING' | 'PROCESSING' | 'CONFIRMED' | 'FAILED';
  hash: string;
  timestamp: string;
  details: string;
}

export const CURRENT_STUDENT = 'Ananya Sharma';

/* -------------------------------------------------------------------------- */
/* SEED DATA (clearly isolated demo state — swap for live contract reads)      */
/* -------------------------------------------------------------------------- */

const now = () => new Date().toISOString();

const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();
const daysAhead = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();

function seedCredential(
  partial: Omit<Credential, 'id' | 'displayId' | 'timeline'> & { timeline?: CredentialEvent[] },
): Credential {
  const id = `cred-${partial.credentialHash.slice(2, 10)}-${partial.title.replace(/[^a-zA-Z]/g, '').slice(0, 3)}`;
  return {
    ...partial,
    id,
    displayId: credentialDisplayId(partial.credentialHash + partial.title),
    timeline: partial.timeline ?? defaultTimeline(partial),
  };
}

function defaultTimeline(c: Omit<Credential, 'id' | 'displayId' | 'timeline'>): CredentialEvent[] {
  const events: CredentialEvent[] = [
    { kind: 'CREATED', label: 'Credential created', detail: c.institution, at: daysAgo(210) },
    { kind: 'ISSUED', label: 'Issued by university', detail: c.institution, at: c.issuedAt },
    { kind: 'RECEIVED', label: 'Received by student', detail: c.studentName, at: daysAgo(Math.max(1, 200)) },
  ];
  if (c.proofsGenerated > 0) {
    events.push({
      kind: 'PROOF',
      label: 'ZK proof generated',
      detail: `${c.proofsGenerated} selective-disclosure proof${c.proofsGenerated > 1 ? 's' : ''}`,
      at: daysAgo(60),
    });
  }
  if (c.verifications > 0) {
    events.push({ kind: 'VERIFIED', label: 'Verified by employer', at: daysAgo(45) });
  }
  if (c.status === 'REVOKED') {
    events.push({
      kind: 'REVOKED',
      label: 'Credential revoked',
      detail: c.revocationReason,
      at: c.revokedAt ?? daysAgo(20),
    });
  } else if (c.status === 'SUSPENDED') {
    events.push({ kind: 'STATUS', label: 'Credential suspended', detail: 'Institution review', at: daysAgo(18) });
  } else if (c.status === 'EXPIRED') {
    events.push({ kind: 'EXPIRED', label: 'Credential expired', at: c.expiresAt ?? daysAgo(10) });
  }
  events.push({
    kind: 'STATUS',
    label: `Current status: ${c.status.charAt(0)}${c.status.slice(1).toLowerCase()}`,
    at: daysAgo(1),
  });
  return events.sort((a, b) => a.at.localeCompare(b.at));
}

const did = 'did:midnight:vc:ananya-7f3e91c4';

const seedCredentials: Credential[] = [
  seedCredential({
    owner: true,
    studentName: CURRENT_STUDENT,
    studentDid: did,
    institution: 'Future Institute of Engineering',
    type: 'DEGREE',
    title: 'B.Tech Computer Science',
    program: 'Computer Science & Engineering',
    gpa: 3.71,
    graduationYear: 2026,
    credentialHash: '0x390407cca546853367086d958c13ec22f0d55facf509d47d7c4836ae789e73ed',
    status: 'ACTIVE',
    issuedAt: daysAgo(18),
    expiresAt: daysAhead(365 * 30),
    institutionVerified: true,
    proofsGenerated: 4,
    verifications: 9,
  }),
  seedCredential({
    owner: true,
    studentName: CURRENT_STUDENT,
    studentDid: did,
    institution: 'Future Institute of Engineering',
    type: 'TRANSCRIPT',
    title: 'Academic Transcript',
    program: 'Computer Science & Engineering',
    gpa: 3.71,
    graduationYear: 2026,
    credentialHash: '0xe11958a07fb4a0950fb504e4f3575c3f51793877be92c398ed47e29ce8c63c01',
    status: 'ACTIVE',
    issuedAt: daysAgo(18),
    institutionVerified: true,
    proofsGenerated: 2,
    verifications: 3,
  }),
  seedCredential({
    owner: true,
    studentName: CURRENT_STUDENT,
    studentDid: did,
    institution: 'Future Institute of Engineering',
    type: 'GPA',
    title: 'GPA Credential',
    program: 'Cumulative academic standing',
    gpa: 3.71,
    graduationYear: 2026,
    credentialHash: '0x591cea6986f9d402b2b342b3ee751ea457e6c3f4411dfa3eddbe634f99770cb0',
    status: 'ACTIVE',
    issuedAt: daysAgo(18),
    institutionVerified: true,
    proofsGenerated: 6,
    verifications: 12,
  }),
  seedCredential({
    owner: true,
    studentName: CURRENT_STUDENT,
    studentDid: did,
    institution: 'Future Institute of Engineering',
    type: 'GRADUATION',
    title: 'Graduation Credential',
    program: 'Class of 2026',
    gpa: 3.71,
    graduationYear: 2026,
    credentialHash: '0x047c5041fb4530a15a7d2ea5dd99d5d63a52152091e7f5c8b8a49c21b126bd83',
    status: 'ACTIVE',
    issuedAt: daysAgo(16),
    institutionVerified: true,
    proofsGenerated: 1,
    verifications: 2,
  }),
  seedCredential({
    owner: true,
    studentName: CURRENT_STUDENT,
    studentDid: did,
    institution: 'Future Institute of Engineering',
    type: 'COURSE_COMPLETION',
    title: 'Course Completion — Advanced Cryptography',
    program: 'Elective course record',
    gpa: 3.71,
    graduationYear: 2026,
    credentialHash: '0x0be1737c0e31a3154fcf782135cc28ec1ced5508431b231a77a3e7bf572ecc3b',
    status: 'ACTIVE',
    issuedAt: daysAgo(90),
    institutionVerified: true,
    proofsGenerated: 1,
    verifications: 0,
  }),
  seedCredential({
    owner: true,
    studentName: CURRENT_STUDENT,
    studentDid: did,
    institution: 'Board of Technical Accreditation',
    type: 'INSTITUTION_VERIFICATION',
    title: 'Institution Verification',
    program: 'Future Institute of Engineering — accredited',
    gpa: 0,
    graduationYear: 2026,
    credentialHash: '0xfb995e604bb4ec69eabacd89303e787011bcda52cc6dfba9a51a61d82f8854f8',
    status: 'ACTIVE',
    issuedAt: daysAgo(120),
    institutionVerified: true,
    proofsGenerated: 0,
    verifications: 1,
  }),
  seedCredential({
    owner: true,
    studentName: CURRENT_STUDENT,
    studentDid: did,
    institution: 'Future Institute of Engineering',
    type: 'COURSE_COMPLETION',
    title: 'Course Completion — Distributed Systems Lab',
    program: 'Elective course record',
    gpa: 3.71,
    graduationYear: 2026,
    credentialHash: '0xce48d8ab5c5c1003fb299897f277b8918d232d710839fb2b2b261be8cc113644',
    status: 'PENDING',
    issuedAt: daysAgo(2),
    institutionVerified: false,
    proofsGenerated: 0,
    verifications: 0,
    timeline: [
      { kind: 'CREATED', label: 'Issuance requested by student', at: daysAgo(2) },
      { kind: 'STATUS', label: 'Current status: Pending', detail: 'Awaiting registrar sign-off', at: daysAgo(1) },
    ],
  }),
  seedCredential({
    owner: true,
    studentName: CURRENT_STUDENT,
    studentDid: did,
    institution: 'Northgate Technical University',
    type: 'DEGREE',
    title: 'Diploma in Embedded Systems',
    program: 'Embedded Systems',
    gpa: 3.4,
    graduationYear: 2022,
    credentialHash: '0x6b97944389b994be09a93034aa737ae7f1b81bc30a2d26967ff04654b0c0cfb4',
    status: 'EXPIRED',
    issuedAt: daysAgo(1400),
    expiresAt: daysAgo(60),
    institutionVerified: true,
    proofsGenerated: 1,
    verifications: 2,
  }),
  // ----- University-issued population (not in demo student's wallet) -----
  seedCredential({
    owner: false,
    studentName: 'Rohan Kapoor',
    studentDid: 'did:midnight:vc:rohan-2b7c',
    institution: 'Future Institute of Engineering',
    type: 'DEGREE',
    title: 'MBA Finance',
    program: 'Business Administration',
    gpa: 3.55,
    graduationYear: 2024,
    credentialHash: '0x3026fd34edc0182bee79964d1b4dd4232d0d2d61f378b002b6a48bd38b701a5c',
    status: 'SUSPENDED',
    issuedAt: daysAgo(700),
    institutionVerified: true,
    proofsGenerated: 5,
    verifications: 8,
  }),
  seedCredential({
    owner: false,
    studentName: 'Linh Nguyen',
    studentDid: 'did:midnight:vc:linh-9a14',
    institution: 'Future Institute of Engineering',
    type: 'DEGREE',
    title: 'B.Tech Electronics',
    program: 'Electronics & Communication',
    gpa: 3.82,
    graduationYear: 2025,
    credentialHash: '0x22deb907c5855a9c30efcf27e65b910234add9228f6a18371ac5c0d66ceecbc2',
    status: 'ACTIVE',
    issuedAt: daysAgo(300),
    expiresAt: daysAhead(365 * 29),
    institutionVerified: true,
    proofsGenerated: 3,
    verifications: 6,
  }),
  seedCredential({
    owner: false,
    studentName: 'Kwame Osei',
    studentDid: 'did:midnight:vc:kwame-5d71',
    institution: 'Future Institute of Engineering',
    type: 'DEGREE',
    title: 'B.Sc Physics',
    program: 'Physics',
    gpa: 3.2,
    graduationYear: 2021,
    credentialHash: '0x4da40203c908703b0ad77e9b7a648ce18c0866165cbfe98c11b79225a6510297',
    status: 'REVOKED',
    issuedAt: daysAgo(1600),
    revokedAt: daysAgo(40),
    revocationReason: 'Academic misconduct finding upheld by the conduct board.',
    institutionVerified: true,
    proofsGenerated: 2,
    verifications: 1,
  }),
  seedCredential({
    owner: false,
    studentName: 'Sara Iqbal',
    studentDid: 'did:midnight:vc:sara-8e2f',
    institution: 'Future Institute of Engineering',
    type: 'DEGREE',
    title: 'M.Sc Data Science',
    program: 'Data Science & AI',
    gpa: 3.9,
    graduationYear: 2026,
    credentialHash: '0xf9276f2af046c3ff8e0763f4a59b35bc69b9a98c7f14ccaf79bf6b58fe3b0c21',
    status: 'ACTIVE',
    issuedAt: daysAgo(12),
    expiresAt: daysAhead(365 * 30),
    institutionVerified: true,
    proofsGenerated: 2,
    verifications: 4,
  }),
];

const seedProofs: ProofRecord[] = [
  {
    id: 'proof-seed-1',
    verificationId: 'VP-3K9F-7MQD',
    credentialId: seedCredentials[0].id,
    credentialDisplayId: seedCredentials[0].displayId,
    claimType: 'GPA_THRESHOLD',
    claimLabel: 'GPA ≥ 3.50',
    threshold: 3.5,
    circuit: 'proveGpaThreshold',
    proofHash: '0x2ae0c6eff70c27f611c6e96f92a3cbc13ba9ddd610efee306afe7c12311c2817',
    createdAt: daysAgo(6),
    expiresAt: daysAhead(84),
    disclosedFields: ['Institution name', 'Degree title', 'GPA threshold satisfied'],
    concealedFields: ['Exact GPA', 'Full transcript', 'Student identity', 'Course grades'],
    status: 'GENERATED',
  },
  {
    id: 'proof-seed-2',
    verificationId: 'VP-8T2P-C4WN',
    credentialId: seedCredentials[2].id,
    credentialDisplayId: seedCredentials[2].displayId,
    claimType: 'DEGREE_VALIDITY',
    claimLabel: 'Degree valid: B.Tech Computer Science',
    circuit: 'proveDegreeMatch',
    proofHash: '0x45b482188d06265142b32e73f6c70078a2a2b356ccad8ecc701d514c4a3a7e7a',
    createdAt: daysAgo(30),
    expiresAt: daysAhead(60),
    disclosedFields: ['Degree validity', 'Issuing institution'],
    concealedFields: ['Identity', 'Grades', 'Exact GPA'],
    status: 'VERIFIED',
    lastVerifiedAt: daysAgo(3),
    lastVerifier: 'Meridian Analytics',
  },
  {
    id: 'proof-seed-3',
    verificationId: 'VP-1Q4X-B7ZR',
    credentialId: seedCredentials[7].id,
    credentialDisplayId: seedCredentials[7].displayId,
    claimType: 'GRADUATION_STATUS',
    claimLabel: 'Graduation status verified',
    circuit: 'verifyCredential',
    proofHash: '0x7abe4e8b3ebe4aef7224433a9055cdf5a93325f4ca6fb3c4d38b8854a48f9a11',
    createdAt: daysAgo(120),
    expiresAt: daysAgo(30),
    disclosedFields: ['Graduation status'],
    concealedFields: ['Identity', 'Transcript'],
    status: 'EXPIRED',
  },
];

const seedVerifications: VerificationLog[] = [
  {
    id: 'ver-1',
    at: daysAgo(1),
    verifier: 'Meridian Analytics',
    verifierType: 'EMPLOYER',
    target: 'VP-8T2P-C4WN',
    claim: 'Degree valid: B.Tech Computer Science',
    outcome: 'PASSED',
  },
  {
    id: 'ver-2',
    at: daysAgo(2),
    verifier: 'Aurelia State College',
    verifierType: 'ADMISSIONS_OFFICE',
    target: 'VP-3K9F-7MQD',
    claim: 'GPA ≥ 3.50',
    outcome: 'PASSED',
  },
  {
    id: 'ver-3',
    at: daysAgo(4),
    verifier: 'National Scholarship Board',
    verifierType: 'SCHOLARSHIP_BOARD',
    target: seedCredentials[2].displayId,
    claim: 'GPA credential authenticity',
    outcome: 'PASSED',
  },
  {
    id: 'ver-4',
    at: daysAgo(6),
    verifier: 'Calderwood Polytechnic',
    verifierType: 'INSTITUTION',
    target: seedCredentials[10].displayId,
    claim: 'B.Sc Physics credential check',
    outcome: 'FAILED',
  },
  {
    id: 'ver-5',
    at: daysAgo(8),
    verifier: 'Helix Robotics',
    verifierType: 'EMPLOYER',
    target: seedCredentials[0].displayId,
    claim: 'Institution verified + degree validity',
    outcome: 'PASSED',
  },
  {
    id: 'ver-6',
    at: daysAgo(11),
    verifier: 'ISO Engineering Certification Board',
    verifierType: 'CERTIFICATION_BOARD',
    target: seedCredentials[4].displayId,
    claim: 'Course completion: Advanced Cryptography',
    outcome: 'PASSED',
  },
];

const seedTransactions: Transaction[] = [
  {
    id: 'tx-seed-1',
    type: 'PROOF_GENERATED',
    status: 'CONFIRMED',
    hash: '0xd9810ec9fdc01d208878f891…831a',
    timestamp: daysAgo(1),
    details: 'ZK proof generated: GPA ≥ 3.50 on B.Tech Computer Science',
  },
  {
    id: 'tx-seed-2',
    type: 'VERIFY_PROOF',
    status: 'CONFIRMED',
    hash: '0x1559a810fab498fabdcdaed3…3673',
    timestamp: daysAgo(1),
    details: 'Employer verification passed: VP-8T2P-C4WN',
  },
  {
    id: 'tx-seed-3',
    type: 'REVOKE_CREDENTIAL',
    status: 'CONFIRMED',
    hash: '0x338478bef129de451342ad82…5538',
    timestamp: daysAgo(40),
    details: 'Credential revoked by institution: B.Sc Physics (conduct board finding)',
  },
  {
    id: 'tx-seed-4',
    type: 'ISSUE_CREDENTIAL',
    status: 'CONFIRMED',
    hash: '0x18696fe7536281a0eba55566…cd8a',
    timestamp: daysAgo(18),
    details: 'Issued B.Tech Computer Science to Ananya Sharma (witness sealed locally)',
  },
];

/* -------------------------------------------------------------------------- */
/* STORE                                                                      */
/* -------------------------------------------------------------------------- */

export interface WalletState {
  // wallet
  isConnected: boolean;
  isConnecting: boolean;
  walletAddress: string | null;
  networkId: string;
  balance: string;
  contractAddress: string;
  activeWalletType: '1am' | 'lace' | 'custom' | null;

  // ledger-adjacent state
  credentials: Credential[];
  proofs: ProofRecord[];
  verifications: VerificationLog[];
  transactions: Transaction[];

  // actions
  connectWallet: (provider?: '1am' | 'lace' | 'custom' | 'auto', customAddress?: string) => Promise<void>;
  disconnectWallet: () => void;
  selectWalletProvider: (provider: '1am' | 'lace' | 'custom') => void;
  addTransaction: (tx: Omit<Transaction, 'id' | 'timestamp'> & { timestamp?: string }) => void;

  createCredential: (input: {
    studentName: string;
    studentDid: string;
    institution: string;
    type: CredentialType;
    title: string;
    program: string;
    gpa: number;
    graduationYear: number;
    status?: 'ACTIVE' | 'PENDING';
  }) => Credential;

  revokeCredential: (credentialId: string, reason: string) => void;
  suspendCredential: (credentialId: string, reason?: string) => void;
  reinstateCredential: (credentialId: string) => void;
  activatePendingCredential: (credentialId: string) => void;

  recordProof: (input: Omit<ProofRecord, 'id' | 'status'>) => ProofRecord;
  markProofVerified: (proofId: string, verifier: string) => void;
  logVerification: (entry: Omit<VerificationLog, 'id' | 'at'>) => void;
}

const STORAGE_VERSION = 3;

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      isConnected: false,
      isConnecting: false,
      walletAddress: null,
      networkId: (import.meta.env.VITE_NETWORK_ID as string | undefined) || 'preprod',
      balance: '0.00 NIGHT',
      activeWalletType: null,
      contractAddress:
        (import.meta.env.VITE_CAC_CONTRACT_ADDRESS as string | undefined) ||
        (import.meta.env.VITE_CONTRACT_ADDRESS as string | undefined) ||
        'a746a03e40e6e4b36ec451548e355f2611657c2334e0e7594c3d14d4ef8da1de',

      credentials: seedCredentials,
      proofs: seedProofs,
      verifications: seedVerifications,
      transactions: seedTransactions,

      selectWalletProvider: (provider) => {
        set({ activeWalletType: provider });
      },

      connectWallet: async (provider = 'auto', customAddress?: string) => {
        set({ isConnecting: true });
        if (provider === 'custom' && customAddress) {
          set({
            isConnected: true,
            isConnecting: false,
            walletAddress: customAddress,
            balance: '2,450.00 tNIGHT',
            activeWalletType: 'custom',
          });
          return;
        }
        try {
          type DappConnector = {
            connect?: (network: string) => Promise<{ state?: () => Promise<unknown[]> }>;
          };
          const midnight = (window as unknown as { midnight?: Record<string, DappConnector> }).midnight;
          const connector: DappConnector | undefined = midnight ? Object.values(midnight)[0] : undefined;
          if (connector?.connect) {
            const api = await connector.connect(get().networkId);
            const accounts = api.state ? await api.state() : [];
            const address = accounts.find((x): x is string => typeof x === 'string');
            set({
              isConnected: true,
              isConnecting: false,
              walletAddress: address ?? customAddress ?? null,
              balance: '2,450.00 tNIGHT',
              activeWalletType: provider === 'lace' ? 'lace' : '1am',
            });
            return;
          }
        } catch (err) {
          console.warn('[VeriCred] wallet connector unavailable, falling back to demo session:', err);
        }
        // Demo-mode fallback so the product can be evaluated without an extension installed.
        await new Promise((res) => setTimeout(res, 450));
        set({
          isConnected: true,
          isConnecting: false,
          walletAddress: customAddress || 'mn_addr_preprod18hl0hkw2sjdwuwztatxzp2mhwpre2w4hc9tlyx0l457k8dxd0fsqrda6jm',
          balance: '2,450.00 tNIGHT',
          activeWalletType: provider === 'lace' ? 'lace' : '1am',
        });
      },

      disconnectWallet: () => {
        set({ isConnected: false, walletAddress: null, balance: '0.00 NIGHT', activeWalletType: null });
      },

      addTransaction: (tx) => {
        const newTx: Transaction = {
          ...tx,
          id: `tx-${Date.now()}`,
          timestamp: tx.timestamp ?? new Date().toISOString(),
        };
        set((state) => ({ transactions: [newTx, ...state.transactions] }));
      },

      createCredential: (input) => {
        const issuedAt = now();
        const credential: Credential = {
          id: `cred-${Date.now()}`,
          displayId: credentialDisplayId(`${Date.now()}-${input.title}`),
          owner: input.studentName === CURRENT_STUDENT,
          ...input,
          graduationYear: input.graduationYear,
          credentialHash: `0x${randomHashHex(64)}`,
          status: input.status ?? 'ACTIVE',
          issuedAt,
          expiresAt: input.status === 'ACTIVE' ? daysAhead(365 * 30) : undefined,
          institutionVerified: true,
          proofsGenerated: 0,
          verifications: 0,
          timeline: [
            { kind: 'CREATED', label: 'Credential created', detail: input.institution, at: issuedAt },
            ...(input.status === 'PENDING'
              ? [{ kind: 'STATUS' as TimelineKind, label: 'Pending registrar sign-off', at: issuedAt }]
              : [
                  {
                    kind: 'ISSUED' as TimelineKind,
                    label: 'Issued by university',
                    detail: input.institution,
                    at: issuedAt,
                  },
                ]),
          ],
        };
        set((state) => ({
          credentials: [credential, ...state.credentials],
          transactions: [
            {
              id: `tx-${Date.now()}`,
              type: input.status === 'PENDING' ? 'ISSUE_CREDENTIAL' : 'ISSUE_CREDENTIAL',
              status: input.status === 'PENDING' ? 'PENDING' : 'CONFIRMED',
              hash: `0x${randomHashHex(24)}…${randomHashHex(4)}`,
              timestamp: issuedAt,
              details:
                input.status === 'PENDING'
                  ? `Credential queued for issuance: ${input.title} → ${input.studentName}`
                  : `Issued ${input.title} to ${input.studentName} (witness sealed locally)`,
            },
            ...state.transactions,
          ],
        }));
        return credential;
      },

      revokeCredential: (credentialId, reason) => {
        const at = now();
        set((state) => ({
          credentials: state.credentials.map((c) =>
            c.id === credentialId
              ? {
                  ...c,
                  status: 'REVOKED',
                  revokedAt: at,
                  revocationReason: reason,
                  timeline: [...c.timeline, { kind: 'REVOKED', label: 'Credential revoked', detail: reason, at }],
                }
              : c,
          ),
          transactions: [
            {
              id: `tx-${Date.now()}`,
              type: 'REVOKE_CREDENTIAL',
              status: 'CONFIRMED',
              hash: `0x${randomHashHex(24)}…${randomHashHex(4)}`,
              timestamp: at,
              details: `Revoked credential ${state.credentials.find((c) => c.id === credentialId)?.displayId ?? credentialId}`,
            },
            ...state.transactions,
          ],
        }));
      },

      suspendCredential: (credentialId, reason) => {
        const at = now();
        set((state) => ({
          credentials: state.credentials.map((c) =>
            c.id === credentialId
              ? {
                  ...c,
                  status: 'SUSPENDED',
                  revocationReason: reason ?? c.revocationReason,
                  timeline: [...c.timeline, { kind: 'STATUS', label: 'Credential suspended', detail: reason, at }],
                }
              : c,
          ),
          transactions: [
            {
              id: `tx-${Date.now()}`,
              type: 'SUSPEND_CREDENTIAL',
              status: 'CONFIRMED',
              hash: `0x${randomHashHex(24)}…${randomHashHex(4)}`,
              timestamp: at,
              details: `Suspended credential ${state.credentials.find((c) => c.id === credentialId)?.displayId ?? credentialId}`,
            },
            ...state.transactions,
          ],
        }));
      },

      reinstateCredential: (credentialId) => {
        const at = now();
        set((state) => ({
          credentials: state.credentials.map((c) =>
            c.id === credentialId
              ? {
                  ...c,
                  status: 'ACTIVE',
                  revokedAt: undefined,
                  revocationReason: undefined,
                  timeline: [...c.timeline, { kind: 'STATUS', label: 'Credential reinstated', at }],
                }
              : c,
          ),
          transactions: [
            {
              id: `tx-${Date.now()}`,
              type: 'REINSTATE_CREDENTIAL',
              status: 'CONFIRMED',
              hash: `0x${randomHashHex(24)}…${randomHashHex(4)}`,
              timestamp: at,
              details: `Reinstated credential ${state.credentials.find((c) => c.id === credentialId)?.displayId ?? credentialId}`,
            },
            ...state.transactions,
          ],
        }));
      },

      activatePendingCredential: (credentialId) => {
        const at = now();
        set((state) => ({
          credentials: state.credentials.map((c) =>
            c.id === credentialId
              ? {
                  ...c,
                  status: 'ACTIVE',
                  issuedAt: at,
                  expiresAt: daysAhead(365 * 30),
                  institutionVerified: true,
                  timeline: [
                    ...c.timeline,
                    { kind: 'ISSUED', label: 'Issued by university', detail: c.institution, at },
                  ],
                }
              : c,
          ),
          transactions: [
            {
              id: `tx-${Date.now()}`,
              type: 'ISSUE_CREDENTIAL',
              status: 'CONFIRMED',
              hash: `0x${randomHashHex(24)}…${randomHashHex(4)}`,
              timestamp: at,
              details: `Issued pending credential ${state.credentials.find((c) => c.id === credentialId)?.displayId ?? credentialId}`,
            },
            ...state.transactions,
          ],
        }));
      },

      recordProof: (input) => {
        const proof: ProofRecord = { ...input, id: `proof-${Date.now()}`, status: 'GENERATED' };
        set((state) => ({
          proofs: [proof, ...state.proofs],
          credentials: state.credentials.map((c) =>
            c.id === input.credentialId
              ? {
                  ...c,
                  proofsGenerated: c.proofsGenerated + 1,
                  timeline: [
                    ...c.timeline,
                    { kind: 'PROOF', label: 'ZK proof generated', detail: input.claimLabel, at: input.createdAt },
                  ],
                }
              : c,
          ),
          transactions: [
            {
              id: `tx-${Date.now()}`,
              type: 'PROOF_GENERATED',
              status: 'CONFIRMED',
              hash: `0x${randomHashHex(24)}…${randomHashHex(4)}`,
              timestamp: input.createdAt,
              details: `ZK proof generated: ${input.claimLabel} via circuit ${input.circuit}`,
            },
            ...state.transactions,
          ],
        }));
        return proof;
      },

      markProofVerified: (proofId, verifier) => {
        const at = now();
        set((state) => ({
          proofs: state.proofs.map((p) =>
            p.id === proofId
              ? {
                  ...p,
                  status: p.status === 'EXPIRED' ? p.status : 'VERIFIED',
                  lastVerifiedAt: at,
                  lastVerifier: verifier,
                }
              : p,
          ),
        }));
      },

      logVerification: (entry) => {
        const at = now();
        const log: VerificationLog = { ...entry, id: `ver-${Date.now()}`, at };
        set((state) => ({
          verifications: [log, ...state.verifications],
          transactions: [
            {
              id: `tx-${Date.now()}`,
              type: 'VERIFY_PROOF',
              status: entry.outcome === 'PASSED' ? 'CONFIRMED' : 'FAILED',
              hash: `0x${randomHashHex(24)}…${randomHashHex(4)}`,
              timestamp: at,
              details: `Verification ${entry.outcome.toLowerCase()}: ${entry.claim} (${entry.verifier})`,
            },
            ...state.transactions,
          ],
        }));
      },
    }),
    {
      name: 'vericred-store',
      version: STORAGE_VERSION,
      storage: createJSONStorage(() => localStorage),
      // Version mismatch without a migrate fn => persisted demo state is dropped automatically.
      partialize: (state) => ({
        credentials: state.credentials,
        proofs: state.proofs,
        verifications: state.verifications,
        transactions: state.transactions,
        isConnected: state.isConnected,
        walletAddress: state.walletAddress,
        balance: state.balance,
        activeWalletType: state.activeWalletType,
      }),
    },
  ),
);

/* -------------------------------------------------------------------------- */
/* SELECTORS                                                                  */
/* -------------------------------------------------------------------------- */

export const selectWalletCredentials = (s: WalletState) => s.credentials.filter((c) => c.owner);

export const findCredentialByDisplayId = (s: WalletState, displayId: string) =>
  s.credentials.find((c) => c.displayId.toLowerCase() === displayId.toLowerCase());

export const findProofByVerificationId = (s: WalletState, verificationId: string) =>
  s.proofs.find((p) => p.verificationId.toLowerCase() === verificationId.toLowerCase());

export { proofVerificationId };
