# VeriCred Architecture

![VeriCred Architecture](./architecture.png)

## System overview

VeriCred is a dual-state credential system on the **Midnight Network**:

| Layer | Location | Contents |
| ----- | -------- | -------- |
| Public ledger state | Midnight Preview (on-chain) | `credentialStatus: Map<Bytes<32>, CredentialStatus>`, `institutionOwner: Bytes<32>`, `totalCredentialsIssued: Counter` |
| Private witness state | Holder device (encrypted, off-chain) | `studentGpaScaled: Uint<16>`, `degreeIdHash: Bytes<32>`, `localSecretKey: Bytes<32>`, plus UI-side credential metadata |
| Computation | Compact ZK circuits | `issueCredential`, `verifyCredential`, `proveGpaThreshold`, `proveDegreeMatch`, `suspendCredential`, `reinstateCredential`, `revokeCredential`, `batchIssueCredentials` |

Nothing else — no names, grades, transcripts, or identity fields — ever reaches the ledger.

## Repository layout

```text
contract/    cac.compact source + compiled managed artifacts (zkir, prover/verifier keys) + vitest tests
api/         provider wiring & typed API layer (BBoard API, cac-types)
vericred-ui/ Vite + React 19 SPA (Tailwind, Framer Motion, React Three Fiber, zustand)
vericred-cli/ wallet facade, dust utilities, launcher
scripts/     deploy-preview.ts · verify-preview.ts · deploy-preprod.ts · capture-dust-state.ts · generate-doc-diagrams.py
docs/        this documentation + deployment record (deployment-preview.json)
```

## Frontend architecture

The UI never talks to Midnight SDK primitives directly. Every ledger-shaped
operation flows through one interface:

```text
UI pages (wallet / proof / verify / universities)
   └── services/proof-pipeline.ts · services/verification.ts
         └── services/cac-service.ts → interface CredentialLedger
               ├── DemoLedger  (default) — mirrors the circuit ABI 1:1, offline-safe
               └── LiveCacLedger (VITE_CAC_LIVE=true + VITE_CAC_CONTRACT_ADDRESS)
                     → midnight-js provider stack (wallet, proof server, indexer,
                       private state) exactly as used by scripts/deploy-preview.ts
```

This keeps demo evaluation and live-network usage on identical code paths; the
switch is configuration, not a rewrite.

State management: a single zustand store (`vericred-ui/src/store/useWalletStore.ts`)
holds credentials, proofs, verification logs and ledger transactions, persisted to
localStorage with schema-versioned reset. Entities and real field names are
documented in [er-diagram.png](./er-diagram.png).

## 3D visualization layer

Three.js (React Three Fiber + drei) is used strictly as *proof-infrastructure
geometry*, lazily chunked and visibility-gated:

- `ProofNetworkScene` — hero: University → Credential → ZK Proof → Student → Verifier ring with flowing proof particles
- `HowItWorksScene` — six scroll-driven stations mirroring the real circuit flow
- `ArchitectureScene` — hoverable dual-state topology (this document, interactive)

All scenes cap DPR, reduce particle counts on mobile, pause off-screen
(IntersectionObserver → `frameloop`), and honor `prefers-reduced-motion`.

## Trust model

- **Issuer authorization**: `issueCredential` / `revoke` / `suspend` / `reinstate` / `batchIssue` assert
  `publicKey(localSecretKey(), 0) == institutionOwner` — only the deploying institution key can mutate status.
- **Holder privacy**: witnesses are produced locally (`contract/src/cac-witnesses.ts`); the proving key material
  never leaves the device; the proof server only sees circuit inputs, not plaintext records beyond the witness values
  required by the circuit.
- **Verifier minimalism**: verification consumes a proof artifact (verificationId / QR / link) and yields booleans
  plus public labels — see [zk-proofs.md](./zk-proofs.md).
