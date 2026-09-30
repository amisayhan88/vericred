// VeriCred — verification evaluation shared by the verifier portal and the
// public verification page. Pure read-only checks over ledger-adjacent state.

import type { Credential, ProofRecord } from '../store/useWalletStore';
import type { WalletState } from '../store/useWalletStore';

export interface CheckRow {
  label: string;
  ok: boolean;
  detail: string;
}

export type VerificationTarget =
  | { kind: 'proof'; proof: ProofRecord; credential?: Credential }
  | { kind: 'credential'; credential: Credential }
  | { kind: 'unknown'; handle: string };

export interface VerificationOutcome {
  ok: boolean;
  headline: string;
  checks: CheckRow[];
  disclosed: string[];
  concealed: string[];
  claim?: string;
  credentialTitle?: string;
  institution?: string;
  target: VerificationTarget;
}

const isExpired = (iso?: string) => !!iso && new Date(iso).getTime() < Date.now();

export function resolveTarget(state: WalletState, handle: string): VerificationTarget {
  const normalized = handle.trim().toUpperCase();
  const proof = state.proofs.find((p) => p.verificationId.toUpperCase() === normalized);
  if (proof) {
    return { kind: 'proof', proof, credential: state.credentials.find((c) => c.id === proof.credentialId) };
  }
  const credential = state.credentials.find(
    (c) => c.displayId.toUpperCase() === normalized || c.credentialHash.replace(/^0x/, '').toUpperCase() === normalized,
  );
  if (credential) return { kind: 'credential', credential };
  return { kind: 'unknown', handle };
}

export function evaluate(target: VerificationTarget): VerificationOutcome {
  if (target.kind === 'unknown') {
    return {
      ok: false,
      headline: 'No record found on the VeriCred ledger',
      checks: [
        {
          label: 'Credential authentic',
          ok: false,
          detail: 'The handle does not resolve to any issued credential or proof.',
        },
      ],
      disclosed: [],
      concealed: [],
      target,
    };
  }

  if (target.kind === 'credential') {
    const c = target.credential;
    const active = c.status === 'ACTIVE';
    const expired = c.status === 'EXPIRED' || isExpired(c.expiresAt);
    const revoked = c.status === 'REVOKED';
    const suspended = c.status === 'SUSPENDED';
    return {
      ok: active,
      headline: active
        ? 'Credential valid'
        : revoked
          ? 'Credential revoked'
          : suspended
            ? 'Credential suspended'
            : expired
              ? 'Credential expired'
              : 'Credential not yet active',
      checks: [
        {
          label: 'Credential authentic',
          ok: c.institutionVerified,
          detail: c.institutionVerified
            ? 'Signature matches the issuing institution.'
            : 'Issuance still pending institution signature.',
        },
        { label: 'Institution verified', ok: c.institutionVerified, detail: c.institution },
        {
          label: `Credential ${c.status.toLowerCase()}`,
          ok: active,
          detail: revoked
            ? (c.revocationReason ?? 'Revoked by the issuing institution.')
            : suspended
              ? 'Temporarily suspended pending institution review.'
              : expired
                ? `Validity window ended ${c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : ''}.`
                : 'Status confirmed against the public ledger.',
        },
      ],
      disclosed: [c.institution, c.title, `Issued ${new Date(c.issuedAt).toLocaleDateString()}`],
      concealed: ['Exact GPA', 'Full transcript', 'Student identity', 'Course-by-course grades'],
      credentialTitle: c.title,
      institution: c.institution,
      target,
    };
  }

  const p = target.proof;
  const c = target.credential;
  const proofExpired = isExpired(p.expiresAt);
  const credentialActive = !c || c.status === 'ACTIVE';
  return {
    ok: !proofExpired && credentialActive,
    headline: !credentialActive
      ? 'Proof invalid — underlying credential is no longer active'
      : proofExpired
        ? 'Proof expired'
        : 'Credential valid',
    checks: [
      {
        label: 'Credential authentic',
        ok: true,
        detail: `Issued under ${p.credentialDisplayId}.`,
      },
      {
        label: 'Institution verified',
        ok: true,
        detail: c?.institution ?? 'Verified University',
      },
      {
        label: 'Proof valid',
        ok: !proofExpired,
        detail: proofExpired
          ? `This proof's validity window ended ${new Date(p.expiresAt).toLocaleDateString()}.`
          : `Circuit ${p.circuit} verified — claim: ${p.claimLabel}.`,
      },
      {
        label: credentialActive ? 'Credential active' : `Credential ${c?.status.toLowerCase()}`,
        ok: credentialActive,
        detail: credentialActive
          ? 'Underlying credential is valid on the public ledger.'
          : (c?.revocationReason ?? 'The issuing institution changed this credential’s status.'),
      },
    ],
    disclosed: p.disclosedFields,
    concealed: p.concealedFields,
    claim: p.claimLabel,
    credentialTitle: c?.title,
    institution: c?.institution,
    target,
  };
}
