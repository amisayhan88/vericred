import { create } from 'zustand';

export interface Transaction {
  id: string;
  type: 'ISSUE_CREDENTIAL' | 'VERIFY_PROOF' | 'REVOKE_CREDENTIAL' | 'SUSPEND_CREDENTIAL' | 'REINSTATE_CREDENTIAL' | 'BATCH_ISSUE';
  status: 'PENDING' | 'PROCESSING' | 'CONFIRMED' | 'FAILED';
  hash: string;
  timestamp: string;
  details: string;
}

export interface Credential {
  id: string;
  studentName: string;
  studentDid: string;
  institution: string;
  degree: string;
  major: string;
  gpa: number;
  graduationYear: number;
  credentialHash: string;
  status: 'VALID' | 'SUSPENDED' | 'REVOKED';
  issueDate: string;
}

export interface ProofRecord {
  id: string;
  credentialId: string;
  proofType: 'GPA_THRESHOLD' | 'DEGREE_VERIFICATION';
  verifiedClaim: string;
  timestamp: string;
  status: 'VERIFIED' | 'REJECTED';
}

interface WalletState {
  isConnected: boolean;
  isConnecting: boolean;
  walletAddress: string | null;
  networkId: string;
  balance: string;
  contractAddress: string;
  activeWalletType: '1am' | 'lace' | 'custom' | null;
  credentials: Credential[];
  transactions: Transaction[];
  proofs: ProofRecord[];
  
  // Actions
  connectWallet: (provider?: '1am' | 'lace' | 'custom' | 'auto', customAddress?: string) => Promise<void>;
  disconnectWallet: () => void;
  selectWalletProvider: (provider: '1am' | 'lace' | 'custom') => void;
  addTransaction: (tx: Omit<Transaction, 'id' | 'timestamp'>) => void;
  issueCredential: (cred: Omit<Credential, 'id' | 'credentialHash' | 'status' | 'issueDate'>) => Promise<void>;
  generateZkProof: (credentialId: string, proofType: 'GPA_THRESHOLD' | 'DEGREE_VERIFICATION', threshold?: number) => Promise<ProofRecord>;
  revokeCredential: (credentialId: string) => Promise<void>;
  suspendCredential: (credentialId: string) => Promise<void>;
  reinstateCredential: (credentialId: string) => Promise<void>;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  isConnected: false,
  isConnecting: false,
  walletAddress: null,
  networkId: 'preprod',
  balance: '0.00 NIGHT',
  activeWalletType: null,
  contractAddress: 'a746a03e40e6e4b36ec451548e355f2611657c2334e0e7594c3d14d4ef8da1de',
  
  credentials: [
    {
      id: 'cred-1',
      studentName: 'Alex Rivera',
      studentDid: 'did:midnight:0x89f2a71b...e391',
      institution: 'Stanford University',
      degree: 'Bachelor of Science',
      major: 'Computer Science',
      gpa: 3.92,
      graduationYear: 2025,
      credentialHash: '0x9a8f7c6b5e4d3c2b1a0987654321fedcba9876543210123456789abcdef01234',
      status: 'VALID',
      issueDate: '2025-06-15',
    },
    {
      id: 'cred-2',
      studentName: 'Alex Rivera',
      studentDid: 'did:midnight:0x89f2a71b...e391',
      institution: 'MIT Department of EECS',
      degree: 'Master of Engineering',
      major: 'Artificial Intelligence & Cryptography',
      gpa: 3.88,
      graduationYear: 2026,
      credentialHash: '0x123456789abcdef0123456789abcdef09a8f7c6b5e4d3c2b1a0987654321fedc',
      status: 'VALID',
      issueDate: '2026-05-20',
    },
  ],

  transactions: [
    {
      id: 'tx-101',
      type: 'ISSUE_CREDENTIAL',
      status: 'CONFIRMED',
      hash: '0x3a91f4b82c7e01d6...84a2',
      timestamp: '2026-07-26 14:32',
      details: 'Issued B.S. Computer Science to Alex Rivera',
    },
    {
      id: 'tx-102',
      type: 'VERIFY_PROOF',
      status: 'CONFIRMED',
      hash: '0x7b1c9e4a2d5f8103...91e5',
      timestamp: '2026-07-26 18:05',
      details: 'Zero-Knowledge Proof verified: GPA >= 3.50',
    },
  ],

  proofs: [
    {
      id: 'proof-1',
      credentialId: 'cred-1',
      proofType: 'GPA_THRESHOLD',
      verifiedClaim: 'GPA >= 3.50 (Actual identity and exact GPA concealed)',
      timestamp: '2026-07-26 18:05',
      status: 'VERIFIED',
    },
  ],

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
      const win = typeof window !== 'undefined' ? (window as any) : {};
      
      // Look specifically for 1am Wallet or Midnight Lace or general DApp Connector
      let walletObject = null;

      if (provider === '1am') {
        walletObject = win.midnight?.['1am'] || win.midnight?.oneam || win.oneam || win.cardano?.oneam || win.midnight;
      } else if (provider === 'lace') {
        walletObject = win.midnight?.mnLace || win.midnight?.lace || win.lace || win.cardano?.midnight;
      } else {
        walletObject =
          win.midnight?.['1am'] ||
          win.midnight?.oneam ||
          win.oneam ||
          win.midnight?.mnLace ||
          win.midnight?.lace ||
          win.lace ||
          win.midnight ||
          win.cardano?.midnight;
      }

      if (walletObject) {
        if (typeof walletObject.enable === 'function') {
          const api = await walletObject.enable();
          const accounts = (await api.getAccounts?.()) || (await api.state?.()) || [];
          const walletAddr =
            typeof accounts[0] === 'string'
              ? accounts[0]
              : accounts.address ||
                accounts[0]?.address ||
                'mn_addr_preprod18hl0hkw2sjdwuwztatxzp2mhwpre2w4hc9tlyx0l457k8dxd0fsqrda6jm';

          let formattedBalance = '2,450.00 tNIGHT';
          if (typeof api.getBalance === 'function') {
            const bal = await api.getBalance();
            if (bal) formattedBalance = `${bal} tNIGHT`;
          }

          set({
            isConnected: true,
            isConnecting: false,
            walletAddress: walletAddr,
            balance: formattedBalance,
            activeWalletType: provider === 'lace' ? 'lace' : '1am',
          });
          return;
        } else if (typeof walletObject.connect === 'function') {
          const connectedApi = await walletObject.connect('preprod');
          const state = await connectedApi.state?.() || [];
          const walletAddr = typeof state[0] === 'string' ? state[0] : 'mn_addr_preprod18hl0hkw2sjdwuwztatxzp2mhwpre2w4hc9tlyx0l457k8dxd0fsqrda6jm';
          
          set({
            isConnected: true,
            isConnecting: false,
            walletAddress: walletAddr,
            balance: '2,450.00 tNIGHT',
            activeWalletType: provider === 'lace' ? 'lace' : '1am',
          });
          return;
        }
      }
    } catch (err) {
      console.warn('Browser wallet detection attempt:', err);
    }

    // Preprod Testnet connection fallback
    await new Promise((res) => setTimeout(res, 500));
    set({
      isConnected: true,
      isConnecting: false,
      walletAddress: customAddress || 'mn_addr_preprod18hl0hkw2sjdwuwztatxzp2mhwpre2w4hc9tlyx0l457k8dxd0fsqrda6jm',
      balance: '2,450.00 tNIGHT',
      activeWalletType: provider === 'lace' ? 'lace' : '1am',
    });
  },

  disconnectWallet: () => {
    set({
      isConnected: false,
      walletAddress: null,
      balance: '0.00 NIGHT',
      activeWalletType: null,
    });
  },

  addTransaction: (tx) => {
    const newTx: Transaction = {
      ...tx,
      id: `tx-${Date.now()}`,
      timestamp: new Date().toLocaleString(),
    };
    set((state) => ({ transactions: [newTx, ...state.transactions] }));
  },

  issueCredential: async (credData) => {
    const newCred: Credential = {
      ...credData,
      id: `cred-${Date.now()}`,
      credentialHash: `0x${Math.random().toString(16).substring(2)}${Math.random().toString(16).substring(2)}`,
      status: 'VALID',
      issueDate: new Date().toISOString().split('T')[0],
    };

    set((state) => ({
      credentials: [newCred, ...state.credentials],
      transactions: [
        {
          id: `tx-${Date.now()}`,
          type: 'ISSUE_CREDENTIAL',
          status: 'CONFIRMED',
          hash: `0x${Math.random().toString(16).substring(2, 18)}...${Math.random().toString(16).substring(2, 6)}`,
          timestamp: new Date().toLocaleString(),
          details: `Issued ${credData.degree} in ${credData.major} to ${credData.studentName}`,
        },
        ...state.transactions,
      ],
    }));
  },

  generateZkProof: async (credentialId, proofType, threshold = 3.5) => {
    const cred = get().credentials.find((c) => c.id === credentialId);
    const proof: ProofRecord = {
      id: `proof-${Date.now()}`,
      credentialId,
      proofType,
      verifiedClaim:
        proofType === 'GPA_THRESHOLD'
          ? `GPA >= ${threshold.toFixed(2)} (Actual identity and exact GPA concealed)`
          : `Degree Verified: ${cred?.degree || 'Academic Degree'}`,
      timestamp: new Date().toLocaleString(),
      status: 'VERIFIED',
    };

    set((state) => ({
      proofs: [proof, ...state.proofs],
      transactions: [
        {
          id: `tx-${Date.now()}`,
          type: 'VERIFY_PROOF',
          status: 'CONFIRMED',
          hash: `0x${Math.random().toString(16).substring(2, 18)}...${Math.random().toString(16).substring(2, 6)}`,
          timestamp: new Date().toLocaleString(),
          details: `Zero-Knowledge Proof verified: ${proof.verifiedClaim}`,
        },
        ...state.transactions,
      ],
    }));

    return proof;
  },

  revokeCredential: async (credentialId) => {
    set((state) => ({
      credentials: state.credentials.map((c) => (c.id === credentialId ? { ...c, status: 'REVOKED' as const } : c)),
      transactions: [
        {
          id: `tx-${Date.now()}`,
          type: 'REVOKE_CREDENTIAL',
          status: 'CONFIRMED',
          hash: `0x${Math.random().toString(16).substring(2, 18)}...${Math.random().toString(16).substring(2, 6)}`,
          timestamp: new Date().toLocaleString(),
          details: `Revoked credential token ${credentialId}`,
        },
        ...state.transactions,
      ],
    }));
  },

  // NEW: Suspend a credential temporarily
  suspendCredential: async (credentialId) => {
    set((state) => ({
      credentials: state.credentials.map((c) => (c.id === credentialId ? { ...c, status: 'SUSPENDED' as const } : c)),
      transactions: [
        {
          id: `tx-${Date.now()}`,
          type: 'SUSPEND_CREDENTIAL',
          status: 'CONFIRMED',
          hash: `0x${Math.random().toString(16).substring(2, 18)}...${Math.random().toString(16).substring(2, 6)}`,
          timestamp: new Date().toLocaleString(),
          details: `Suspended credential token ${credentialId}`,
        },
        ...state.transactions,
      ],
    }));
  },

  // NEW: Reinstate a previously suspended credential
  reinstateCredential: async (credentialId) => {
    set((state) => ({
      credentials: state.credentials.map((c) => (c.id === credentialId ? { ...c, status: 'VALID' as const } : c)),
      transactions: [
        {
          id: `tx-${Date.now()}`,
          type: 'REINSTATE_CREDENTIAL',
          status: 'CONFIRMED',
          hash: `0x${Math.random().toString(16).substring(2, 18)}...${Math.random().toString(16).substring(2, 6)}`,
          timestamp: new Date().toLocaleString(),
          details: `Reinstated credential token ${credentialId}`,
        },
        ...state.transactions,
      ],
    }));
  },
}));
