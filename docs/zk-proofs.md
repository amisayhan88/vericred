# VeriCred — Zero-Knowledge Proofs

![ZK Proof Flow](./zk-proof-flow.png)

## Circuits (from `contract/src/cac.compact`, language 0.23)

| Circuit | Kind | Public inputs | Private witnesses | Public output |
| ------- | ---- | ------------- | ----------------- | ------------- |
| `issueCredential(credentialHash)` | write | credentialHash | `localSecretKey` (institution) | — (sets status VALID, increments counter) |
| `verifyCredential(credentialHash)` | read | credentialHash | — | `Boolean` (status == VALID) |
| `proveGpaThreshold(credentialHash, minGpaScaled)` | prove | hash + threshold | `studentGpaScaled` | `Boolean` (gpa ≥ threshold) |
| `proveDegreeMatch(credentialHash, expectedDegreeHash)` | prove | hash + expected hash | `degreeIdHash` | `Boolean` (degree matches) |
| `suspendCredential` / `reinstateCredential` / `revokeCredential` | write | credentialHash | `localSecretKey` (institution) | — (status transition) |
| `batchIssueCredentials(h1,h2,h3)` | write | 3 hashes | `localSecretKey` | — (3× VALID + counter += 3) |

Witness implementations live in `contract/src/cac-witnesses.ts`
(`CacPrivateState = { secretKey, studentGpaScaled, degreeIdHash }`).

Compiled artifacts (zkir + prover/verifier keys) are checked in under
`contract/src/managed/cac/` — compiler **0.31.1**, language **0.23.0**, runtime **0.16.0**
(see `compiler/contract-info.json`).

## What is private vs. public

**Never leaves the holder device (private witness):**
- exact GPA (only the comparison result is revealed)
- transcript rows, course grades
- student identity, DID, date of birth, address
- the institution's secret key (only its derived public key is on-chain as `institutionOwner`)

**Public on the Midnight ledger:**
- 32-byte credential commitments (`credentialHash`)
- credential status (`VALID` / `SUSPENDED` / `REVOKED` — the `CredentialStatus` enum)
- `institutionOwner` public key and the `totalCredentialsIssued` counter
- proof-carrying transactions (they prove a predicate; they do not contain the data)

## Proof generation in the product

`vericred-ui/src/services/proof-pipeline.ts` drives the staged UX
(`Preparing witness → Generating ZK proof → Validating circuit → Proof generated`)
and calls the `CredentialLedger` interface (`services/cac-service.ts`), which maps
claims to circuits exactly as the table above:

- `GPA_THRESHOLD → proveGpaThreshold` (threshold scaled ×100; if the private witness
  does not satisfy it, generation **fails honestly** and nothing is disclosed)
- `DEGREE_VALIDITY / COURSE_COMPLETION / CUSTOM → proveDegreeMatch`
- `GRADUATION_STATUS / ENROLLMENT_STATUS → verifyCredential`

A generated proof is a shareable artifact: `verificationId (VP-XXXX-XXXX)`,
proof hash, disclosed/concealed field lists, expiry, and a QR/link to the public
verification page `/verify/:vid`.

## Verification semantics

`services/verification.ts` evaluates a proof or credential handle against
ledger-adjacent state:

- proof expired → fails (`Proof expired`)
- underlying credential no longer `ACTIVE` (revoked/suspended/expired) → fails,
  with the institution's recorded reason where applicable
- otherwise → `Credential valid ✓` with the explicit note
  **“Private academic data: Not disclosed”**
