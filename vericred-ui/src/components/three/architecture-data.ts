// VeriCred — architecture graph data (dependency-free: safe to import eagerly
// while the 3D scene itself stays lazily loaded).

export type ArchKey = 'university' | 'credential' | 'public' | 'private' | 'circuit' | 'proof' | 'verifier';

export interface ArchNodeDef {
  key: ArchKey;
  label: string;
  tone: string;
  position: [number, number, number];
}

export const ARCH_NODES: ArchNodeDef[] = [
  { key: 'university', label: 'University', tone: '#173B57', position: [0, 3.05, 0] },
  { key: 'credential', label: 'Credential Data', tone: '#C9B99A', position: [0, 1.7, 0] },
  { key: 'public', label: 'Public Ledger', tone: '#2F6B8A', position: [-1.9, 0.25, 0.3] },
  { key: 'private', label: 'Private Witness', tone: '#4F8582', position: [1.9, 0.25, -0.3] },
  { key: 'circuit', label: 'Compact ZK Circuit', tone: '#173B57', position: [0, -1.25, 0] },
  { key: 'proof', label: 'ZK Proof', tone: '#4F8582', position: [0, -2.55, 0.2] },
  { key: 'verifier', label: 'Verifier', tone: '#7FA396', position: [0, -3.75, 0] },
];

export const ARCH_COPY: Record<ArchKey, { title: string; body: string; tag: string }> = {
  university: {
    title: 'University',
    tag: 'Issuer',
    body: 'Accredited institutions sign and issue credentials. Their public key is the institution-owner constant recorded on the Midnight ledger.',
  },
  credential: {
    title: 'Credential Data',
    tag: 'Source record',
    body: 'Every credential splits into two states at the moment of issuance — a verifiable public commitment and a confidential private witness.',
  },
  public: {
    title: 'Public Ledger',
    tag: 'On-chain',
    body: 'Commitments and status transitions (issued, suspended, revoked) live on-chain as compact disclosures. No names, grades, or transcripts — ever.',
  },
  private: {
    title: 'Private Witness',
    tag: 'Off-chain',
    body: 'Sensitive values — GPA, course records, identity data — stay encrypted in the holder\u2019s private state provider and are never submitted to the network.',
  },
  circuit: {
    title: 'Compact ZK Circuit',
    tag: 'Computation',
    body: 'A small formal circuit joins both states and evaluates a claim such as \u201CGPA \u2265 3.5\u201D — revealing only a boolean result as its public output.',
  },
  proof: {
    title: 'ZK Proof',
    tag: 'Artifact',
    body: 'The circuit produces a succinct zero-knowledge proof: a portable artifact that convinces any verifier without exposing the underlying data.',
  },
  verifier: {
    title: 'Verifier',
    tag: 'Relying party',
    body: 'Employers, admissions offices, and boards check the proof against public parameters in milliseconds — no access to the student\u2019s records required.',
  },
};
