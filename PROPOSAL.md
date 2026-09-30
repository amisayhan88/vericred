# VeriCred — Project Proposal

### Confidential Academic Credentials on the Midnight Network

| | |
|---|---|
| **Product** | Privacy-preserving academic credential issuance & verification platform |
| **Network** | Midnight **Preview** (contract deployed & E2E-verified — see [README](README.md#-live-deployment)) |
| **Contract** | `e71bf7d73babb895c4524deebcec7fd2ef2a9590854770732492598c91e99df1` |
| **Stack** | Compact 0.23 (compiler 0.31.1) · midnight-js 4.1.1 · Vite + React 19 · TypeScript · Tailwind · Framer Motion · React Three Fiber |
| **Status** | Deployed, on-chain E2E 7/7, unit tests 14/14, CI/CD + Vercel pipeline wired |

---

## 1. Executive Summary

**VeriCred** lets accredited institutions issue cryptographically verifiable academic credentials,
and lets students prove exactly what a verifier asks — *"GPA ≥ 3.50"*, *"degree valid"*, *"graduated
2026"* — using zero-knowledge proofs on Midnight, **without revealing transcripts, identities, or any
adjacent personal data**.

The platform is built on Midnight's dual-state model: a compact public commitment and status live on
the ledger; the sensitive witness (GPA, degree hash, keys) stays encrypted on the holder's device and
is consumed only inside small formal ZK circuits.

## 2. Problem

1. **Over-disclosure.** Verifying one fact (a GPA floor) currently requires handing over an entire
   transcript — grades, retakes, identity fields, address, date of birth.
2. **Fraud & slow checks.** Forged PDFs and diploma mills persist because verification is manual,
   bilateral, and days-slow (registrar calls, email chains, paid agencies).
3. **No holder sovereignty.** Students don't own their records; institutions and agencies mediate
   every check and charge for it.
4. **Naive blockchain fixes leak more.** Putting grades on-chain trades one problem for a worse one.
   VeriCred puts *commitments and booleans* on-chain — never the data.

## 3. Solution

```text
University ──issueCredential──▶ Public ledger: { credentialHash → VALID }
     │                          (no PII, ever)
     └──sealed witness──▶ Student device (encrypted private state)
                                   │
                     student picks a claim (e.g. GPA ≥ 3.50)
                                   │
                    Compact circuit proveGpaThreshold(hash, 350)
                                   │
                        succinct ZK proof (VP-XXXX-XXXX)
                                   │
                 Verifier checks in ms → "true" + public labels only
```

**Circuits (compiled, deployed):** `issueCredential`, `verifyCredential`, `proveGpaThreshold`,
`proveDegreeMatch`, `suspendCredential`, `reinstateCredential`, `revokeCredential`,
`batchIssueCredentials` — all issuer-mutating circuits assert the institution-owner key.

**Product surfaces (all implemented):**

| Route | Surface |
| ----- | ------- |
| `/` | Marketing landing — 3D proof-network hero, “proof without disclosure” interactive, use cases |
| `/how-it-works` | Cinematic six-station scroll walkthrough of the real circuit flow |
| `/architecture` | Interactive dual-state topology (hoverable 3D) + circuit reference |
| `/wallet` | Student credential wallet — six credential types, live statuses, proof availability |
| `/proof` | 5-step proof generator — claim picker, staged ZK animation, disclosure review, QR share |
| `/verify`, `/verify/:vid` | Verifier portal (ID / QR / upload / wallet) + minimal public verification page |
| `/credential/:id` | Credential sheet — certificate layout, lifecycle timeline, QR, redacted privacy panel |
| `/universities` | Institution console — issuance, student table, revocation center, verification activity |
| `/transactions`, `/settings`, `/legal` | Ledger activity, network configuration, policy |

## 4. Privacy Model

| Data | Location | Visible to |
| ---- | -------- | ---------- |
| Credential commitment (32B hash) | On-chain | Everyone |
| Status (VALID/SUSPENDED/REVOKED) | On-chain | Everyone |
| Institution owner public key, issue counter | On-chain | Everyone |
| Exact GPA, degree hash, secret key | Encrypted witness, holder device | Nobody — circuits emit booleans only |
| Name, transcript, DOB, address | Never submitted anywhere | Nobody |

A failed proof (e.g. threshold above the real GPA) is rejected **locally** — no transaction, no
disclosure. Verified on-chain in the E2E run (step 4 of `docs/e2e-preview.json`).

## 5. Current State — Verified, Not Promised

- **Deployed on Midnight Preview**: block #1083540, status `SucceedEntirely`
  (full record: [`docs/deployment-preview.json`](docs/deployment-preview.json))
- **On-chain E2E 7/7**: issue → verify → ZK GPA proof (pass **and** honest-fail) → revoke →
  post-revoke rejection → unauthorized-issuer rejection ([`docs/e2e-preview.json`](docs/e2e-preview.json))
- **Unit tests 14/14** (vitest, contract simulator)
- **CI/CD**: GitHub Actions (typecheck · lint · tests · builds) + secrets-gated Vercel deploy
- **Docs**: architecture, deployment, ZK proofs, user flows, security (incl. known limitations),
  troubleshooting — with generated diagrams (`docs/*.png`)

## 6. Roadmap

1. **LiveCacLedger in the browser** — flip `VITE_CAC_LIVE` and complete the marked integration point
   in `vericred-ui/src/services/cac-service.ts` so wallets drive the deployed Preview contract
   directly (provider stack already proven by the deploy scripts).
2. **Multi-institution governance** — per-institution owner keys / allowlist instead of a single
   `institutionOwner` constant.
3. **W3C VC interop** — export proofs as Verifiable Credentials for non-Midnight verifiers.
4. **Credential expiry on-chain** — encode validity windows in ledger state (currently UI-side).
5. **Mainnet** — redeploy the identical artifact set against Midnight mainnet once available to the
   project, with a rotated deployer key and audited circuits.

## 7. Why Midnight

- **Dual-state by design** — private witnesses are a protocol primitive, not an app-side bolt-on.
- **Compact** — small formal circuits with compiled prover/verifier keys; cheap to audit.
- **Data-privacy L1 posture** — “prove, don't disclose” matches the regulatory reality of academic
  records (FERPA/GDPR-adjacent minimization) better than any transparent ledger.

## 8. References

- [README](README.md) — live deployment table, features, testing evidence
- [docs/architecture.md](docs/architecture.md) · [docs/zk-proofs.md](docs/zk-proofs.md) ·
  [docs/security.md](docs/security.md) · [docs/deployment.md](docs/deployment.md) ·
  [docs/user-flows.md](docs/user-flows.md) · [docs/troubleshooting.md](docs/troubleshooting.md)
- Contract source: [`contract/src/cac.compact`](contract/src/cac.compact)
