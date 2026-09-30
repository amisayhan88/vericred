# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] — 2026-09-30

### Added

- **Midnight Preview deployment** of the VeriCred CAC contract
  (`e71bf7d73babb895c4524deebcec7fd2ef2a9590854770732492598c91e99df1`, block #1083540,
  `SucceedEntirely`) with post-deploy smoke call and a **7/7 on-chain E2E lifecycle test**
  (issue → verify → GPA proof pass/fail → revoke → post-revoke rejection → unauthorized-issuer
  rejection). Records: `docs/deployment-preview.json`, `docs/e2e-preview.json`.
- Deployment tooling: `scripts/deploy-preview.ts` (9 logged stages, faucet polling, spendable-DUST
  gating), `scripts/verify-preview.ts` (join + confirm + smoke), `scripts/e2e-preview.ts`.
- **Frontend v2** — full light-mode “privacy infrastructure” redesign (Fraunces/Inter/JetBrains Mono,
  institutional blue-teal-sage palette):
  - 3D system (React Three Fiber, lazily chunked, visibility-gated, reduced-motion aware):
    proof-network hero, six-station scroll walkthrough, interactive dual-state architecture graph.
  - New surfaces: student wallet `/wallet`, 5-step proof generator `/proof` (staged witness →
    proving → validation, disclosure review, QR/link share), verifier portal `/verify` (ID / QR /
    upload / wallet), public verification page `/verify/:vid`, credential sheet `/credential/:id`
    (lifecycle timeline, animated QR beam, redacted privacy panel), university console
    `/universities` (overview, issuance, students, revocation center, activity), rebuilt
    `/transactions`, `/settings`, `/legal`.
  - Landing: hero, “proof without disclosure” interactive, journey steps, use cases with
    photography, technology band; premium floating capsule navbar with animated active pill;
    animated SVG proof-network footer.
- Service layer `services/cac-service.ts` (`CredentialLedger`): `DemoLedger` mirrors the circuit ABI
  1:1 offline; `LiveCacLedger` + `VITE_CAC_LIVE` is the single wiring point for browser↔contract.
- QR generation (`qrcode`, dynamically imported) for credential + proof sharing.
- CI/CD: modernized `.github/workflows/ci.yml` (typecheck · lint · vitest · builds · artifact) and
  new secrets-gated `.github/workflows/vercel-deploy.yml` (production on `main`, preview on PRs);
  `npm run build:vercel` produces the Preview-mode bundle; `vercel.json` updated.
- Documentation set: `docs/architecture.md`, `deployment.md`, `zk-proofs.md`, `user-flows.md`,
  `security.md`, `troubleshooting.md` + six generated diagrams (`docs/*.png|svg`,
  `scripts/generate-doc-diagrams.py`) + real app screenshots (desktop & mobile,
  `scripts/screenshots.mjs` → `docs/assets/screenshots/`).
- Rewritten `README.md` (live deployment tables, testing evidence, screenshots) and `PROPOSAL.md`.

### Changed

- Store extended: credential types/statuses (ACTIVE · PENDING · SUSPENDED · EXPIRED · REVOKED),
  lifecycle timelines, proof records with verification ids, verification logs; schema-versioned
  localStorage persistence.
- UI reads `VITE_NETWORK_ID` / `VITE_CAC_CONTRACT_ADDRESS`; indexer endpoints derive from network;
  explorer links gated behind optional `VITE_EXPLORER_URL`.
- Root `package-lock.json` synced for new UI deps (`three`, `@react-three/fiber`, `@react-three/drei`,
  `qrcode`, `playwright` dev).

### Removed

- Legacy v1 UI (Navbar/Sidebar/Board/MUI theme and related components) and the `@mui/*`,
  `@emotion/*` dependencies; duplicated `proposal.ms`.

### Security

- New deployment scripts embed **no seeds** — `DEPLOYER_SEED` is required at runtime.
  (The legacy preprod scripts still contain a testnet seed that is public in git history; rotation
  recommended — tracked in `docs/security.md`.)

## [0.1.0] — 2026-08

- Initial hackathon build: CAC Compact contract + pre-compiled artifacts, bboard example scaffold,
  preprod deployment (`3121b727…685661`), v1 monochrome dashboard UI, CLI wallet/dust utilities.
