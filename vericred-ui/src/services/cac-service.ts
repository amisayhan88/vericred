// VeriCred — contract service layer.
//
// The UI talks to `cacLedger` (this module), never to components directly.
// `DemoLedger` exercises the same circuit surface as `contract/src/cac.compact`
// through the isolated mock client in `lib/contract-client.ts`.
// `LiveCacLedger` is the single, clearly-marked integration point for wiring the
// deployed Midnight contract (see contexts/BrowserDeployedBoardManager.ts for the
// provider stack already used by the bboard example) — no UI rewrite needed.

import { vericredClient } from '../lib/contract-client';
import { labelToBytes32Hex } from '../lib/ids';
import type { ClaimType } from '../store/useWalletStore';

export interface LedgerResult {
  txHash: string;
  confirmed: boolean;
}

export interface ProofResult {
  proof: string; // hex commitment for demo display / QR payload
  satisfied: boolean;
  circuit: string;
}

export interface CredentialLedger {
  readonly mode: 'demo' | 'live';
  issueCredential(credentialHash: string): Promise<LedgerResult>;
  batchIssue(hashes: [string, string, string]): Promise<LedgerResult>;
  revoke(credentialHash: string): Promise<LedgerResult>;
  suspend(credentialHash: string): Promise<LedgerResult>;
  reinstate(credentialHash: string): Promise<LedgerResult>;
  prove(credentialHash: string, claimType: ClaimType, params: ProveParams): Promise<ProofResult>;
  verify(credentialHash: string): Promise<LedgerResult & { status: 'VALID' | 'UNKNOWN' }>;
}

export interface ProveParams {
  minGpaScaled?: number; // 350 => 3.50
  expectedDegreeHash?: string;
  customClaim?: string;
  gpaScaled?: number; // private witness value supplied in demo mode only
}

const CIRCUIT_BY_CLAIM: Record<ClaimType, string> = {
  GPA_THRESHOLD: 'proveGpaThreshold',
  DEGREE_VALIDITY: 'proveDegreeMatch',
  GRADUATION_STATUS: 'verifyCredential',
  COURSE_COMPLETION: 'proveDegreeMatch',
  ENROLLMENT_STATUS: 'verifyCredential',
  CUSTOM: 'proveGpaThreshold',
};

/** Demo implementation mirroring the Compact circuit ABI one-to-one. */
class DemoLedger implements CredentialLedger {
  readonly mode = 'demo' as const;

  async issueCredential(credentialHash: string): Promise<LedgerResult> {
    const res = await vericredClient.issueCredentialCircuit(credentialHash);
    return { txHash: res.txHash, confirmed: res.status === 'SUCCESS' };
  }

  async batchIssue(hashes: [string, string, string]): Promise<LedgerResult> {
    const res = await vericredClient.batchIssueCredentialsCircuit(hashes[0], hashes[1], hashes[2]);
    return { txHash: res.txHash, confirmed: res.status === 'SUCCESS' };
  }

  async revoke(credentialHash: string): Promise<LedgerResult> {
    const res = await vericredClient.revokeCredentialCircuit(credentialHash);
    return { txHash: res.txHash, confirmed: res.status === 'SUCCESS' };
  }

  async suspend(credentialHash: string): Promise<LedgerResult> {
    const res = await vericredClient.suspendCredentialCircuit(credentialHash);
    return { txHash: res.txHash, confirmed: res.status === 'SUCCESS' };
  }

  async reinstate(credentialHash: string): Promise<LedgerResult> {
    const res = await vericredClient.reinstateCredentialCircuit(credentialHash);
    return { txHash: res.txHash, confirmed: res.status === 'SUCCESS' };
  }

  async prove(credentialHash: string, claimType: ClaimType, params: ProveParams): Promise<ProofResult> {
    const circuit = CIRCUIT_BY_CLAIM[claimType];
    if (circuit === 'proveGpaThreshold') {
      const min = params.minGpaScaled ?? 350;
      const gpa = params.gpaScaled ?? min; // demo witness always satisfies unless caller withholds
      const res = await vericredClient.proveGpaThresholdCircuit(credentialHash, min);
      return { proof: res.zkProofHex, satisfied: gpa >= min ? res.isSatisfied : false, circuit };
    }
    if (circuit === 'proveDegreeMatch') {
      const expected = params.expectedDegreeHash ?? (await labelToBytes32Hex(params.customClaim ?? 'degree'));
      const res = await vericredClient.proveDegreeMatchCircuit(credentialHash, expected);
      return { proof: res.zkProofHex, satisfied: res.isSatisfied, circuit };
    }
    const res = await vericredClient.proveGpaThresholdCircuit(credentialHash, 0);
    return { proof: res.zkProofHex, satisfied: true, circuit: 'verifyCredential' };
  }

  async verify(credentialHash: string): Promise<LedgerResult & { status: 'VALID' | 'UNKNOWN' }> {
    const res = await vericredClient.verifyCredentialCircuit(credentialHash);
    return { txHash: res.txHash, confirmed: true, status: res.onLedger ? 'VALID' : 'UNKNOWN' };
  }
}

/**
 * Live integration stub. When a CAC contract is deployed on Midnight (preprod or later),
 * implement this class with the BrowserDeployedBoardManager provider stack +
 * `CompiledCacContractContract` from ../../contract and set `VITE_CAC_CONTRACT_ADDRESS`
 * (plus `VITE_CAC_LIVE=true`) to switch the whole product over.
 */
class LiveCacLedger implements CredentialLedger {
  readonly mode = 'live' as const;
  constructor(private readonly contractAddress: string) {
    // TODO(contract-integration): join the deployed CAC contract via
    // @midnight-ntwrk/midnight-js-contracts and cache the DeployedCacAPI here.
    console.info('[VeriCred] LiveCacLedger selected — contract integration pending.', contractAddress);
  }
  private unsupported(): never {
    throw new Error('Live contract integration is not wired yet. Unset VITE_CAC_LIVE to use the demo ledger.');
  }
  issueCredential(): Promise<LedgerResult> {
    this.unsupported();
  }
  batchIssue(): Promise<LedgerResult> {
    this.unsupported();
  }
  revoke(): Promise<LedgerResult> {
    this.unsupported();
  }
  suspend(): Promise<LedgerResult> {
    this.unsupported();
  }
  reinstate(): Promise<LedgerResult> {
    this.unsupported();
  }
  prove(): Promise<ProofResult> {
    this.unsupported();
  }
  verify(): Promise<LedgerResult & { status: 'VALID' | 'UNKNOWN' }> {
    this.unsupported();
  }
}

function selectLedger(): CredentialLedger {
  const flag = import.meta.env.VITE_CAC_LIVE as string | undefined;
  const addr = import.meta.env.VITE_CAC_CONTRACT_ADDRESS as string | undefined;
  if (flag === 'true' && addr) return new LiveCacLedger(addr);
  return new DemoLedger();
}

export const cacLedger: CredentialLedger = selectLedger();

export { CIRCUIT_BY_CLAIM };
