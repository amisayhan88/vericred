# VeriCred — Security

## Data protection model

| Data class | Where it lives | Who can see it |
| ---------- | -------------- | -------------- |
| Credential commitment (`credentialHash`, 32B) | Midnight Preview ledger | Everyone |
| Credential status (VALID/SUSPENDED/REVOKED) | Midnight Preview ledger | Everyone |
| Institution owner public key | Midnight Preview ledger | Everyone |
| `totalCredentialsIssued` counter | Midnight Preview ledger | Everyone |
| Exact GPA (`studentGpaScaled`) | Holder device — encrypted private state provider | Nobody else; only the circuit’s boolean output is revealed |
| Degree hash (`degreeIdHash`) | Holder device | Nobody else |
| Institution secret key (`localSecretKey`) | Registrar device | Nobody else; only the derived public key is on-chain |
| Identity, transcript, DOB, address | Holder device / institution systems | Never submitted to the network at all |

## ZK proof generation

- Circuits are compiled Compact programs (compiler 0.31.1). Proving happens against a
  local proof server (`midnightntwrk/proof-server:8.1.0`, docker, port 6300) — the
  prover sees circuit inputs (witness values), never a full database, and the produced
  proof reveals only the public output (a boolean) plus the public statement.
- A claim the witness cannot satisfy (e.g. GPA ≥ 3.95 with witness 3.85) fails during
  local circuit execution: **no transaction is submitted and nothing is disclosed**
  (verified in `docs/e2e-preview.json`).

## Credential authorization

- `issueCredential`, `revokeCredential`, `suspendCredential`, `reinstateCredential`,
  `batchIssueCredentials` all assert
  `publicKey(localSecretKey(), 0) == institutionOwner`.
- A foreign key attempting issuance fails the assertion locally and cannot produce a
  valid transaction (covered by the E2E “unauthorized issuer” step).
- Status transitions are permanent where intended: `REVOKED` is terminal in the circuit
  (no reinstate path from REVOKED), while `SUSPENDED ⇄ VALID` is reversible.

## Wallet security

- Browser sessions connect through the Midnight dApp connector (Lace / 1AM). The web
  app never sees seed phrases; transaction balancing/signing happens inside the wallet
  extension (`balanceUnsealedTransaction` / `submitTransaction` connector calls).
- Node-side deployment uses `wallet-sdk` with a seed supplied via `DEPLOYER_SEED`.

## Environment & secret handling

- Secrets belong in `.env.local` / CI secrets — both are git-ignored (`.env`,
  `.env.local` in `.gitignore`). Committed `.env.preprod` / `.env.preview` contain
  **public** values only (contract addresses, deployer *public* address, network id).
- The private state store (`midnight-level-db/`, `preview-state-*`, `preprod-state-*`)
  is git-ignored and encrypted at rest with a passphrase
  (`PRIVATE_STATE_PASSWORD`).

## Known limitations (honest list)

1. **Legacy demo seed in git history.** The pre-existing `scripts/deploy-preprod.ts`
   and `scripts/capture-dust-state.ts` hardcode a testnet seed (`c50e1a7e…`). It only
   ever controlled testnet funds, but it must be considered public. The Preview
   tooling (`deploy-preview.ts` / `verify-preview.ts` / `e2e-preview.ts`) contains no
   embedded seed and requires `DEPLOYER_SEED` at runtime. Rotate to a fresh funded
   wallet for any serious use and purge the legacy constants from the preprod scripts.
2. **UI ledger mode.** The web app currently ships with `DemoLedger` (offline-safe,
   mirrors the circuit ABI). `LiveCacLedger` is the marked wiring point for browser
   sessions against the deployed Preview contract (`VITE_CAC_LIVE=true` +
   `VITE_CAC_CONTRACT_ADDRESS`, already set in `vericred-ui/.env.preview`).
3. **Proof server trust.** The local proof server sees witness values during proving.
   Run it locally (as docker-compose does) or use a trusted remote prover.
4. **Demo persistence.** Browser demo state (credentials/proofs) is localStorage-only
   and schema-versioned; it is not a substitute for indexer-derived live state.
5. **No formal audit.** Circuits are small and assertive, but the project has not
   undergone a third-party security audit.
