// VeriCred — staged ZK proof generation pipeline.
// Drives the "Preparing witness → Generating ZK proof → Validating circuit" experience
// while exercising the circuit surface through the service layer.

import { cacLedger, CIRCUIT_BY_CLAIM } from './cac-service';
import { proofVerificationId, sha256Hex, labelToBytes32Hex, randomHashHex } from '../lib/ids';
import type { ClaimType, Credential, ProofRecord } from '../store/useWalletStore';

export type ProofStage = 'idle' | 'witness' | 'proving' | 'validating' | 'complete' | 'failed';

export interface ClaimOption {
  type: ClaimType;
  title: string;
  hint: string;
  requiresThreshold?: boolean;
  requiresCustom?: boolean;
}

export const CLAIM_OPTIONS: ClaimOption[] = [
  { type: 'DEGREE_VALIDITY', title: 'Degree validity', hint: 'Prove your degree is genuine and currently valid' },
  {
    type: 'GPA_THRESHOLD',
    title: 'GPA threshold',
    hint: 'Prove your GPA meets or exceeds a bar — without revealing it',
    requiresThreshold: true,
  },
  { type: 'GRADUATION_STATUS', title: 'Graduation status', hint: 'Prove you completed your program in a given year' },
  {
    type: 'COURSE_COMPLETION',
    title: 'Course completion',
    hint: 'Prove a specific course was completed',
    requiresCustom: true,
  },
  {
    type: 'ENROLLMENT_STATUS',
    title: 'Enrollment status',
    hint: 'Prove current enrollment without disclosing records',
  },
  {
    type: 'CUSTOM',
    title: 'Custom claim',
    hint: 'Compose an arbitrary predicate over private witness data',
    requiresCustom: true,
  },
];

export const STAGE_COPY: Record<ProofStage, string> = {
  idle: '',
  witness: 'Preparing witness…',
  proving: 'Generating ZK proof…',
  validating: 'Validating circuit…',
  complete: 'Proof generated',
  failed: 'Proof could not be generated',
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface GenerateProofInput {
  credential: Credential;
  claimType: ClaimType;
  threshold?: number; // GPA threshold, e.g. 3.5
  customClaim?: string;
}

export interface GeneratedProof extends Omit<ProofRecord, 'id' | 'status'> {
  txHash: string;
}

const DISCLOSED_BY_CLAIM: Record<ClaimType, string[]> = {
  DEGREE_VALIDITY: ['Degree title', 'Issuing institution', 'Credential validity'],
  GPA_THRESHOLD: ['Institution name', 'Program area', 'Threshold satisfied (no exact value)'],
  GRADUATION_STATUS: ['Graduation year', 'Institution name'],
  COURSE_COMPLETION: ['Course title', 'Completion attested'],
  ENROLLMENT_STATUS: ['Enrollment attested', 'Institution name'],
  CUSTOM: ['Claim predicate result (boolean)'],
};

const CONCEALED = [
  'Student identity',
  'Exact GPA',
  'Full transcript',
  'Course grades',
  'Date of birth',
  'Address',
  'Student ID',
];

export function claimLabelFor(input: GenerateProofInput): string {
  const { credential, claimType, threshold, customClaim } = input;
  switch (claimType) {
    case 'GPA_THRESHOLD':
      return `GPA ≥ ${threshold?.toFixed(2) ?? '3.50'}`;
    case 'DEGREE_VALIDITY':
      return `Degree valid: ${credential.title}`;
    case 'GRADUATION_STATUS':
      return `Graduated ${credential.graduationYear} — ${credential.institution}`;
    case 'COURSE_COMPLETION':
      return `Course completed: ${customClaim || credential.title.replace('Course Completion — ', '')}`;
    case 'ENROLLMENT_STATUS':
      return `Enrolled at ${credential.institution}`;
    case 'CUSTOM':
      return customClaim || 'Custom claim satisfied';
  }
}

export async function generateProof(
  input: GenerateProofInput,
  onStage: (stage: ProofStage) => void,
): Promise<GeneratedProof> {
  const { credential, claimType, threshold, customClaim } = input;
  onStage('witness');
  await wait(850);

  onStage('proving');
  const circuit = CIRCUIT_BY_CLAIM[claimType];
  const params = {
    minGpaScaled: Math.round((threshold ?? 3.5) * 100),
    gpaScaled: Math.round(credential.gpa * 100),
    expectedDegreeHash: await labelToBytes32Hex(customClaim || credential.title),
    customClaim,
  };
  const proofRes = await cacLedger.prove(credential.credentialHash, claimType, params);
  if (!proofRes.satisfied) {
    onStage('failed');
    throw new Error(
      claimType === 'GPA_THRESHOLD'
        ? 'The private witness does not satisfy this threshold. Your GPA cannot prove the claim — no data was revealed.'
        : 'The selected claim is not satisfied by this credential.',
    );
  }
  await wait(750);

  onStage('validating');
  const seed = `${credential.credentialHash}|${claimType}|${Date.now()}|${randomHashHex(8)}`;
  const proofHash = `0x${await sha256Hex(seed)}`;
  const tx = await cacLedger.verify(credential.credentialHash);
  await wait(650);

  onStage('complete');
  const createdAt = new Date().toISOString();
  return {
    verificationId: proofVerificationId(proofHash),
    credentialId: credential.id,
    credentialDisplayId: credential.displayId,
    claimType,
    claimLabel: claimLabelFor(input),
    threshold,
    customClaim,
    circuit,
    proofHash,
    createdAt,
    expiresAt: new Date(Date.now() + 90 * 86_400_000).toISOString(),
    disclosedFields: DISCLOSED_BY_CLAIM[claimType],
    concealedFields: CONCEALED,
    txHash: tx.txHash,
  };
}
