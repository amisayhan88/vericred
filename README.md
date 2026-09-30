# VeriCred — Private Proof, Public Trust

**Prove the credential. Never surrender the records behind it.**

Preview contract → · CI · Proposal · User feedback sheet · Usage docs

**CI** ⚡ typecheck · lint · 14 unit tests · full build — green on `main` (measured, below)

Apache-2.0 · Midnight · Hackathon submission (target: Level 5)

---

The **Preview registry is LIVE**. `issueCredential`, `verifyCredential`, `proveGpaThreshold`, `revokeCredential` have all executed on-chain — the contract reads back from the indexer as `totalCredentialsIssued 2`, one credential **VALID**, one **REVOKED**, with zero tooling from this repo involved in the read ([reproduce](#on-chain-deployment)). The **hosted URL is not honest yet** — dv-portal.vercel.app still serves a legacy Next.js bundle, not this Vite app; one project re-point or secret toggle fixes it, and [Hosting](#hosting-vercel) says exactly which. Browser sessions run a demo ledger that mirrors the circuit ABI; the browser-to-contract path is a wired, unimplemented seam — [Status](#status) keeps both distinctions straight.

---

## Contents

[Overview](#overview) · [Live Demo and Quick Links](#live-demo-and-quick-links) · [Privacy Model](#privacy-model) · [How It Works](#how-it-works) · [Ledger Feedback Loop](#ledger-feedback-loop) · [On-Chain Deployment](#on-chain-deployment) · [User Validation](#user-validation) · [Feedback Documentation](#feedback-documentation) · [Diagrams](#diagrams) · [App Screenshots](#app-screenshots) · [App Surface](#app-surface) · [App Architecture](#app-architecture) · [Quick Start](#quick-start) · [Hosting (Vercel)](#hosting-vercel) · [Continuous Integration](#continuous-integration) · [Scripts](#scripts) · [Status](#status)

---

## Overview

VeriCred is a selective-disclosure academic-credential dApp on Midnight. Institutions issue credential commitments to a holder's device; the holder then proves *predicates* of those credentials — GPA ≥ 3.5, degree valid, graduated 2026, course completed — for a verifier's ask, without the issuer, the verifier or the ledger ever receiving the underlying transcript, grades or identity fields.

The ledger holds a `credentialStatus` map, the institution-owner key and one counter. The holder's browser holds the witnesses (scaled GPA, degree hash, key material) encrypted at rest. Compact circuits join the two and emit booleans.

**Core principle: verify the claim, not the data.**

---

## Live Demo and Quick Links

| Resource | Link / Value | Notes |
| -------- | ------------ | ----- |
| Preview contract | `e71bf7d73babb895c4524deebcec7fd2ef2a9590854770732492598c91e99df1` | **LIVE** — read it [yourself](#on-chain-deployment) |
| Deploy tx | txId `0031cfc8…cd0f46` · txHash `e67e425d…b07714` · block **#1083540** | `SucceedEntirely`, 2026-09-30T03:39:05+05:30 |
| Live dApp | https://dv-portal.vercel.app | ⚠️ **legacy Next.js bundle** — not this repo's app; see [Hosting](#hosting-vercel) |
| Run locally | `npm install && docker compose up -d proof-server && npm run dev` | http://localhost:5173 — full product in demo-ledger mode |
| CI | [Actions](https://github.com/amisayhan88/vericred/actions) → VeriCred CI | green on `main`; Vercel job skips until secrets exist |
| Proposal | [PROPOSAL.md](PROPOSAL.md) | problem, privacy claims, roadmap |
| Deployment guide | [docs/deployment.md](docs/deployment.md) · records [deployment-preview.json](docs/deployment-preview.json) · [e2e-preview.json](docs/e2e-preview.json) | every on-chain number in this README lives in those JSONs |
| Usage / troubleshooting | [SUPPORT.md](SUPPORT.md) · [docs/troubleshooting.md](docs/troubleshooting.md) | deploy stuck? contract not found? |
| Feedback sheet | [Google Sheet](https://docs.google.com/spreadsheets/d/1_7gARbK-oHul7sb-ezcMqQoDrB28i2hRTS9bsEp6Tn8) | source of [User Validation](#user-validation); sanitized copy in [docs/user-feedback.csv](docs/user-feedback.csv) |
| Preview faucet | https://faucet.preview.midnight.network (API `/api/drips`) | Turnstile captcha — browser-only, by design |
| Legacy demo video | https://youtu.be/AO1LrfsJX2c | v1 UI, kept for history |

---

## Privacy Model

| Layer | What exists | Who can see it |
| ----- | ----------- | -------------- |
| Public (on-chain) | `credentialStatus: Map<Bytes<32>, Status>`, `institutionOwner: Bytes<32>`, `totalCredentialsIssued` | anyone, via the indexer |
| Private (holder device) | `studentGpaScaled`, `degreeIdHash`, `localSecretKey`; transcript/identity fields in app state | the holder's device only — encrypted local state |
| Proven, not revealed | a commitment is VALID **and** satisfies the requested predicate at the requested threshold | the verifier, via a ZK proof (`VP-XXXX-XXXX` / QR / link) |

Raw witness values are consumed inside circuit execution; nothing but commitments, statuses and boolean outputs reaches the network.

### Limits, stated plainly

- **The browser runs the demo ledger.** `services/cac-service.ts` ships `DemoLedger` (mirrors the circuit ABI 1:1, honest failure when a witness can't satisfy a claim). The on-chain circuits themselves are proven via the node scripts ([E2E 7/7](#on-chain-deployment)); `LiveCacLedger` is the marked, unimplemented browser seam (`VITE_CAC_LIVE=true` once wired).
- **Browser demo state is obfuscation, not custody** — localStorage behind a versioned schema; the node-side store is encrypted LevelDB. Neither is server-side-safe.
- **No on-chain expiry.** `EXPIRED` status and proof expiry are UI-side windows; the ledger enum is UNISSUED/VALID/SUSPENDED/REVOKED only.
- **No per-credential witness binding yet.** Witness values are issuer-pipeline inputs; tying one GPA to one commitment on-chain is roadmap (multi-institution governance is, too — one `institutionOwner` constant today).
- **Two legacy scripts embed a public testnet seed** (preprod tooling predating this work). The Preview tooling requires `DEPLOYER_SEED` and embeds nothing. Rotation recommended — [docs/security.md](docs/security.md).

---

## How It Works

1. **Deploy & bootstrap.** `scripts/deploy-preview.ts` publishes the compiled CAC contract; its constructor anchors `institutionOwner` from the deployer's witness key. The proof server runs loopback-only.
2. **Issue.** `issueCredential(credentialHash)` — institution-key assertion, status → VALID, counter++. The witness bundle (GPA, degree hash) is delivered to the holder's device, never the chain.
3. **Claim.** The holder picks a predicate in `/proof`: GPA threshold (slider), degree validity, graduation, course completion, enrollment, custom.
4. **Prove.** The mapped circuit runs against the private witness (`proveGpaThreshold`, `proveDegreeMatch`, `verifyCredential`). A predicate the witness fails **aborts locally — zero bytes disclosed, zero tx submitted** (E2E step 4).
5. **Share.** A proof is a standalone artifact: `VP-XXXX-XXXX`, proof hash, 90-day expiry window (UI-side), QR / public link `/verify/:vid`.
6. **Verify.** Anyone re-checks the claim plus live ledger status — a revoked or suspended credential fails verification instantly, with the institution's recorded reason where applicable.

---

## Ledger Feedback Loop

State drives behavior everywhere, so screens show the chain's truth, not a hopeful counter.

- **Status gates proofs.** `services/verification.ts` evaluates proof validity *and* credential status; the revocation centre demo writes a real `revokeCredential` on-chain and every outstanding proof flips to failing on next check.
- **Measured, not asserted:** the E2E credential `0x2ef63020…` was issued, proven, then revoked — and the independent read-back below shows it **REVOKED** on the indexer, minutes later, with no local state involved.
- **Honest failure surfaces.** Failed proofs render "nothing was disclosed — a failed circuit leaks nothing"; missing wallets get a connect modal, not a fake account; faucet failure prints the exact funding address instead of looping.
- **Mode honesty.** Header, footer and Settings all print the active ledger mode (`demo` today / `live` after the seam). Nothing in demo mode is labelled ledger-bound.

---

## On-Chain Deployment

| Network | Contract | Status | Evidence |
| ------- | -------- | ------ | -------- |
| **Midnight Preview** | `e71bf7d73babb895c4524deebcec7fd2ef2a9590854770732492598c91e99df1` | **LIVE — issued, proven, revoked** | deploy txHash `e67e425d…b07714` block #1083540 · smoke `issueCredential` txHash `e5259e1d…107470` block #1083645 · E2E txs blocks **#1084103 / #1084107 / #1084111 / #1084116** |
| Midnight Preprod (legacy v1) | `3121b7274109a3ca0de55796986e0cae838632d69aa8521f6b1d8fa46f685661` | exists, counter 0 | historical v1 deploy (block #2199699 per old README, unverified here) |

Independent read-back, measured 2026-09-30 — `npm run read:state -- preview e71bf7d7…` (public indexer only; no wallet, no secrets):

```text
Network                : Midnight preview
Contract               : e71bf7d73babb895c4524deebcec7fd2ef2a9590854770732492598c91e99df1
totalCredentialsIssued : 2
institutionOwner       : 0x00df41ec03f92da9eb1de74c709622d79d465106743df3a41fe02129a4a35272
credentialStatus       : 2 entries
  0xf89e7af884fb1abd7e129583cef0f484950b7f16db1987242413a0a4840fdc6a  VALID     ← deploy smoke
  0x2ef63020e0dbec6e30bd0a847016cbdf63a78d62e2856c7d3073cb437a58c1c0  REVOKED   ← E2E lifecycle
```

**On-chain E2E lifecycle — 7/7 passed** (full JSON: [docs/e2e-preview.json](docs/e2e-preview.json)):

| Step | Circuit | Outcome |
| ---- | ------- | ------- |
| issue | `issueCredential` | VALID, counter +1 — tx `689498da…` block #1084103 |
| verify | `verifyCredential` | confirmed — tx `49f3a7ef…` #1084107 |
| prove (satisfied) | `proveGpaThreshold 350` vs witness 385 | confirmed — tx `6e6520b7…` #1084111 |
| prove (unsatisfied) | `proveGpaThreshold 395` | **rejected locally, no tx, nothing disclosed** — `failed assert: GPA below…` |
| revoke | `revokeCredential` | REVOKED on ledger — tx `325347af…` #1084116 |
| verify revoked | `verifyCredential` | rejected — `failed assert: Credential is not valid or has been revoked` |
| foreign issuer | `issueCredential` w/ random key | rejected — `failed assert: Only accredited institution…` — no tx |

Deployer (Preview): `mn_addr_preview1xzej9p78pa65rywz4085z9ee75wanmq7gq5k88alrm3j6q8p3wzsr4kmpg` — funded 5,000 NIGHT via the official faucet (browser, captcha).

| Service | Endpoint | Purpose |
| ------- | -------- | ------- |
| Preview Indexer | `https://indexer.preview.midnight.network/api/v4/graphql` (+ WS) | contract state reads/subscriptions |
| Preview Node RPC | `https://rpc.preview.midnight.network` (+ WSS) | tx submission (HTTP submit 403s; wallet-sdk path used) |
| Preview Faucet | `https://faucet.preview.midnight.network/api/drips` | funding — Turnstile-protected, manual |
| Proof server | `http://localhost:6300` (loopback) | `midnightntwrk/proof-server:8.1.0` via docker compose |

---

## User Validation

Full data: [docs/user-feedback.csv](docs/user-feedback.csv) (emails and wallet addresses withheld from the public repo) · source sheet linked above.

| Measured | Value |
| -------- | ----- |
| Feedback responses | **54** (01/09/2026 → 26/09/2026) |
| Average rating | **3.76 / 5** (5★ ×10 · 4★ ×21 · 3★ ×23 · 2★ ×0 · 1★ ×0) |
| Wallet entries supplied | 54, **all `0x…` EVM-style**, **0 in `mn_addr_preview1…` format** |

The respondents supplied Midnight-format-wrong addresses (0x strings) and asked mostly for generic wallet features (staking, NFTs, swaps, bridges, ENS, Polygon, fiat on-ramp…). Recorded as **feedback received, not proof of VeriCred on-chain usage** — the honest E2E evidence for usage is the tx table above. What *was* actionable for this product — performance on phones, transaction sorting, CSV export, timestamps, typography, onboarding — shipped; see [Feedback Documentation](#feedback-documentation).

Full respondent table with ratings and verbatim comments: collapsed below (also machine-readable CSV).

<details>
<summary><b>All 54 responses</b> — verbatim comments, contact details and wallet strings withheld from the public repo</summary>

| # | Date | Respondent | Rating | Feedback |
| - | ---- | ---------- | ------ | -------- |
| 1 | 01/09/2026 | Ankan Dalui | ★★★☆☆ | takes too long to load on my phone. please optimize. |
| 2 | 02/09/2026 | Srija Mondal | ★★★★★ | Flawless execution! A portfolio chart over time would make it perfect. |
| 3 | 03/09/2026 | Ishan Das | ★★★★☆ | Great so far. Maybe add biometric login? |
| 4 | 03/09/2026 | Avishek Mondal | ★★★☆☆ | needs better sorting options for transaction history. |
| 5 | 04/09/2026 | Shuvam Dutta | ★★★★★ | Super fast txs. Would be cool to see NFT support in the future. |
| 6 | 04/09/2026 | Uzzal Sardar | ★★★☆☆ | sometimes the app crashes when I switch tabs. fix this. |
| 7 | 05/09/2026 | Tiyasa Mondal | ★★★☆☆ | kinda confusing for beginners. a tutorial overlay would help. |
| 8 | 05/09/2026 | Sudipta Mondal | ★★★★★ | best wallet I've used. maybe add staking directly from dashboard? |
| 9 | 06/09/2026 | Shreya Das | ★★★★☆ | Solid app. Just wish the dashboard was more customizable. |
| 10 | 06/09/2026 | Bristi Sen | ★★★☆☆ | can u add a way to export tx history as csv? it's annoying manually tracking. |
| 11 | 07/09/2026 | Debjit Kanjila | ★★★☆☆ | gas fees estimate is sometimes off compared to the actual charge. |
| 12 | 07/09/2026 | Jishu Das | ★★★★☆ | nice UI but needs more custom token support. |
| 13 | 08/09/2026 | Saikat Prasad Naru | ★★★☆☆ | logging in takes too many clicks. streamline it. |
| 14 | 08/09/2026 | Rishav Biswas | ★★★★☆ | good stuff. add support for multiple accounts under one seed phrase? |
| 15 | 09/09/2026 | Rajdip Ghosh | ★★★☆☆ | it’s decent but lacks fiat onramp options. |
| 16 | 09/09/2026 | Shuvam Dutta | ★★★★☆ | works perfectly but the font size is a bit too small on mobile. |
| 17 | 10/09/2026 | Sounak Bhattacharya | ★★★☆☆ | refresh button doesn't always update the balance immediately. |
| 18 | 10/09/2026 | Most Soha Sabnam | ★★★★☆ | really like the design. please add a price alert feature. |
| 19 | 11/09/2026 | Sankhadip Maity | ★★★★☆ | smooth bridging experience. would love to see L2 support soon. |
| 20 | 12/09/2026 | ROHAN SHARMA | ★★★☆☆ | support team took 2 days to reply. needs to be faster. |
| 21 | 12/09/2026 | Sanchita Sardar | ★★★☆☆ | needs an address book feature so I dont have to paste every time. |
| 22 | 13/09/2026 | SHOBHA BHUTRA | ★★★★☆ | overall great, but face ID integration would be sweet. |
| 23 | 13/09/2026 | Shreya Das | ★★★☆☆ | app size is getting a bit too big for my older phone. |
| 24 | 14/09/2026 | Rikita Roy | ★★★★☆ | clean interface. waiting for the mobile widget on iOS. |
| 25 | 14/09/2026 | Tanish Kar | ★★★★☆ | good security features. please add hardware wallet support (ledger). |
| 26 | 15/09/2026 | Mainak Kahali | ★★★☆☆ | why no Polygon network support yet? |
| 27 | 15/09/2026 | DEBOSHREYA GANGULY | ★★★★☆ | love it. a built-in swap aggregator would make it 5 stars easily. |
| 28 | 16/09/2026 | ABHISHEK DAS | ★★★★☆ | very responsive. just missing p2p trading options. |
| 29 | 16/09/2026 | Sourav Saha | ★★★☆☆ | connecting to some dapps via walletconnect is sometimes buggy. |
| 30 | 17/09/2026 | Puskar Adhikari | ★★★☆☆ | needs better translation for local languages, some text is weird. |
| 31 | 17/09/2026 | ROHAN SHARMA | ★★★★☆ | nice work! add a hide zero balances toggle so my list isn't cluttered. |
| 32 | 18/09/2026 | Ananya Banerjee | ★★★★☆ | pretty intuitive. would be nice to group assets by network visually. |
| 33 | 18/09/2026 | Soumya Chatterjee | ★★★★★ | Absolutely brilliant app. A PnL tracking feature would be the cherry on top. |
| 34 | 19/09/2026 | Rahul Mukherjee | ★★★☆☆ | gas fee customization is a bit hidden, make it more prominent. |
| 35 | 19/09/2026 | Sneha Roy | ★★★★☆ | easy to use. add ENS resolution please! |
| 36 | 20/09/2026 | Arindam Ghosh | ★★★★★ | Highly secure and fast. Just maybe add a light theme for daytime use. |
| 37 | 20/09/2026 | Puja Sarkar | ★★★☆☆ | transaction history doesn't show the exact time, only the date. |
| 38 | 21/09/2026 | Abhishek Nandi | ★★★★☆ | great wallet, but I want to track my staking rewards natively. |
| 39 | 21/09/2026 | Riya Sen | ★★★☆☆ | it's okay, but feels a bit bloated with the new update. |
| 40 | 22/09/2026 | Kaushik Basu | ★★★★★ | 10/10 experience. A native cross-chain bridge would make it literally perfect. |
| 41 | 22/09/2026 | Priyanka Das | ★★★★☆ | stable and fast. missing fingerprint authentication on android though. |
| 42 | 23/09/2026 | Amitava Paul | ★★★☆☆ | token icons take too long to load sometimes, looks glitchy. |
| 43 | 23/09/2026 | Srijit Majumder | ★★★★★ | Amazing app. No complaints, but auto-approve for certain trusted dapps would be cool. |
| 44 | 24/09/2026 | Moumita Saha | ★★★★☆ | reliable app. wish there was a way to easily revoke permissions in-app. |
| 45 | 24/09/2026 | Bipasha Guha | ★★★☆☆ | I don't like the new layout, give us an option to revert to classic view. |
| 46 | 25/09/2026 | Kazi Rahman | ★★★★★ | flawless execution. adding a built-in web3 browser would be epic. |
| 47 | 25/09/2026 | Sumit Pal | ★★★★☆ | good so far. needs a one-tap option to speed up pending transactions. |
| 48 | 26/09/2026 | Nandini Bose | ★★★☆☆ | scanning QR codes is a hit or miss, camera doesn't focus right away. |
| 49 | 26/09/2026 | Tathagata Sen | ★★★★★ | Awesome. A multi-sig feature integration would be great for teams. |
| 50 | 27/09/2026 | Pallavi Dey | ★★★★☆ | really good, but custom RPCs are a bit hard to set up for beginners. |
| 51 | 27/09/2026 | Ritwik Haldar | ★★★☆☆ | I keep getting disconnected from WalletConnect randomly. |
| 52 | 28/09/2026 | Subhamita Kar | ★★★★☆ | nice aesthetic. please add a portfolio distribution pie chart! |
| 53 | 28/09/2026 | Deep Narayan | ★★★★★ | Superb! Way better than competitors. Native fiat withdrawals when? |
| 54 | 29/09/2026 | Anita Chakraborty | ★★★☆☆ | network switching is not very intuitive, takes too much scrolling. |

</details>

---

## Feedback Documentation

### You told us. The app changed.

We read all 54 feedback responses end to end. Wherever a response pointed at something this product
actually does, we changed the code and shipped it — each row below names the commit that exists
because someone said so. Where a request belongs to a generic wallet rather than a credential dApp,
we say that instead of pretending.

| Heard from users | Changed in the app | Commit |
| ---------------- | ------------------ | ------ |
| "takes too long to load on my phone. please optimize." | 3D hero became **opt-in on mobile** (static panel + Load button); WebGL capped at DPR 1.2 on compact; every scene lazy-chunked, IntersectionObserver-gated, reduced-motion aware | [`eaa29d5`](https://github.com/amisayhan88/vericred/commit/eaa29d5) · [`a03e646`](https://github.com/amisayhan88/vericred/commit/a03e646) |
| "needs better sorting options for transaction history." | sort by newest / oldest / type / status on `/transactions` | [`4301a86`](https://github.com/amisayhan88/vericred/commit/4301a86) |
| "can u add a way to export tx history as csv? it's annoying manually tracking." | one-click CSV export of the filtered view (ISO timestamps) | [`4301a86`](https://github.com/amisayhan88/vericred/commit/4301a86) |
| "transaction history doesn't show the exact time, only the date." | full date+time rendering across ledger activity | [`4301a86`](https://github.com/amisayhan88/vericred/commit/4301a86) |
| "works perfectly but the font size is a bit too small on mobile." | base typography bumped on ≤640px screens | [`3d85b42`](https://github.com/amisayhan88/vericred/commit/3d85b42) |
| "kinda confusing for beginners. a tutorial overlay would help." | first-run guided hints on wallet / verify / proof — three numbered steps, dismissible, links to the walkthrough | [`677291c`](https://github.com/amisayhan88/vericred/commit/677291c) |
| "sometimes the app crashes when I switch tabs." | not reproducible on the current build — and the screenshot harness was hardened to **fail closed** on any page/console/overlay error, so a regression like this can't ship silently | [`3130194`](https://github.com/amisayhan88/vericred/commit/3130194) |
| *(found by our own checker while shipping the above)* QR deep-links opened "Credential not found" on fresh sessions — seed commitments re-randomised per load | deterministic seed commitments; `/credential/VC-…` and shared proof links resolve across sessions now, asserted content-first by the capture harness | [`b1e57ce`](https://github.com/amisayhan88/vericred/commit/b1e57ce) |
| gas fees · speed-up tx · staking · NFTs · swaps · bridges · ENS · Polygon/L2 · fiat on-ramp · hardware wallet · multi-sig · address book · price alerts · iOS widgets · "classic view" … | **out of scope** for a credential dApp — recorded honestly as not-done; the requested "light theme" is already the product's design | — |

The 54 responses are deliberately **not** used as usage evidence: every supplied wallet is an `0x…`
EVM string, zero are Midnight-format, none resolves on the indexer. The on-chain proof of usage is
the [E2E table](#on-chain-deployment) — real transactions, reproducible with one command.


---

## Diagrams

Generated from real code via `python3 scripts/generate-doc-diagrams.py` (SVG sources committed alongside; PNGs rendered with sharp):

| Diagram | Shows |
| ------- | ----- |
| ![Architecture](docs/architecture.png) | issuer → app → dual-state split → circuits → Preview → verifier |
| ![User flow](docs/user-flow.png) | nine-step issue → prove → verify journey per role |
| ![ER](docs/er-diagram.png) | actual store entities + ledger fields — no invented tables |
| ![ZK flow](docs/zk-proof-flow.png) | witness → circuit → proof → verified claim, private vs exposed |
| ![Lifecycle](docs/credential-lifecycle.png) | the five real states + timeline event kinds |
| ![Deployment](docs/deployment-architecture.png) | browser → SPA → service seam → providers → contract |

---

## App Screenshots

Captured **headlessly from the production Preview-mode build** (`npm run build:preview` + `vite preview`) with `node scripts/screenshots.mjs` — dev-server artifacts can't contaminate these, and the capture fails closed on any error overlay, page error, blank WebGL canvas or undersized PNG.

<table>
  <tr><th>Desktop 1440×900</th><th>Mobile 390×844</th></tr>
  <tr>
    <td><img src="docs/assets/screenshots/desktop-home.png" width="100%" alt="Landing — WebGL credential proof network hero"/></td>
    <td><img src="docs/assets/screenshots/mobile-home.png" width="48%" alt="Mobile landing with opt-in 3D"/></td>
  </tr>
  <tr>
    <td><img src="docs/assets/screenshots/desktop-wallet.png" width="100%" alt="Student credential wallet"/></td>
    <td><img src="docs/assets/screenshots/mobile-wallet.png" width="48%" alt="Mobile wallet"/></td>
  </tr>
  <tr>
    <td><img src="docs/assets/screenshots/desktop-proof.png" width="100%" alt="Proof generator step 1"/></td>
    <td><img src="docs/assets/screenshots/mobile-proof.png" width="48%" alt="Mobile proof generator"/></td>
  </tr>
  <tr>
    <td><img src="docs/assets/screenshots/desktop-verify.png" width="100%" alt="Verifier portal"/></td>
    <td><img src="docs/assets/screenshots/mobile-verify.png" width="48%" alt="Mobile verifier"/></td>
  </tr>
  <tr>
    <td><img src="docs/assets/screenshots/desktop-credential.png" width="100%" alt="Credential sheet with QR and timeline"/></td>
    <td><img src="docs/assets/screenshots/mobile-credential.png" width="48%" alt="Mobile credential sheet"/></td>
  </tr>
  <tr>
    <td><img src="docs/assets/screenshots/desktop-universities.png" width="100%" alt="University console"/></td>
    <td><img src="docs/assets/screenshots/mobile-universities.png" width="48%" alt="Mobile university console"/></td>
  </tr>
  <tr>
    <td colspan="2"><img src="docs/assets/screenshots/desktop-architecture.png" width="70%" alt="Interactive dual-state architecture"/><img src="docs/assets/screenshots/desktop-verify-result.png" width="28%" alt="Public verification result"/></td>
  </tr>
</table>

**Verification note:** this environment cannot view images, so the set was machine-checked — 20/20 passes, unique SHA-256s, 84–627 KB each, and the hero/architecture shots pass an explicit canvas-raster assertion (>40 KB WebGL element screenshot), which the error pages failed. A previous batch *was* replaced for exactly that reason. Published for a human visual pass, not certified by one. Full report: [capture-report.json](docs/assets/screenshots/capture-report.json).

---

## App Surface

| Route | What it is |
| ----- | ---------- |
| `/` | landing — WebGL proof-network hero, proof-without-disclosure interactive, use cases, technology |
| `/how-it-works` | six-station scroll walkthrough mirroring the real circuit flow |
| `/architecture` | interactive hoverable dual-state topology + circuit reference |
| `/wallet` | student wallet — six credential types, live statuses, proof availability, archive |
| `/proof` | 5-step generator: credential → claim → staged ZK run → disclosure review → share (QR/link) |
| `/verify` | verifier portal: ID / QR paste / JSON upload / wallet session |
| `/verify/:vid` | public verification page — proofs *and* VC ids resolve; no account needed |
| `/credential/:id` | certificate sheet — lifecycle timeline, QR scan beam, redacted privacy panel |
| `/universities` | institution console — overview, issuance, students, **revocation centre**, verification activity |
| `/transactions` · `/settings` · `/legal` | ledger activity (sort/CSV) · network config + endpoint probes · policy |

---

## App Architecture

```text
vericred/
├── contract/                  # cac.compact (8 circuits, 3 witnesses) + compiled managed/
│   └── src/test/              #   vitest circuit+metadata tests (14)
├── api/                       # midnight-js provider wiring, typed API layer
├── vericred-ui/               # Vite + React 19 SPA (Tailwind, Framer Motion, R3F, zustand)
│   └── src/
│       ├── services/          # cac-service.ts → CredentialLedger seam:
│       │                      #   DemoLedger (live today) | LiveCacLedger (wired, unimplemented)
│       ├── pages/             # every route above          ├── components/three/  # 3 lazy scenes
│       ├── store/             # deterministic seeds → stable VC-/VP- deep links
│       └── lib/contract-client.ts                          # demo circuit mirror
├── scripts/                   # deploy-preview · verify-preview · e2e-preview · read-state
│                              # · screenshots.mjs · generate-doc-diagrams.py
├── docs/                      # diagrams, guides, deployment + e2e JSON records, feedback CSV
└── .github/workflows/         # ci.yml · vercel-deploy.yml (secrets-gated)
```

- **Read path:** UI service layer → store; ledger truth simulated 1:1 against the circuit ABI in demo mode, with `read:state`/indexer reads as the live-truth reference.
- **Write path:** proving needs the loopback proof server, so real chain writes run through `scripts/` (polkadot submission + wallet facade), not the browser — until the connector seam lands.
- **Wallet connect:** injected `window.midnight` dApp-connector v4 is attempted first; the demo session fallback is labelled as such everywhere. No fabricated balances.

---

## Quick Start

```bash
# Requirements: Node ≥22 (repo pins 24.11.1 via .nvmrc), Docker, a browser
npm install
docker compose up -d proof-server                    # ZK prover on :6300
npm run dev                                          # http://localhost:5173 (demo ledger, all routes)

# Against the real Preview contract
npm run read:state -- preview e71bf7d7…e99df1        # public read-back, no wallet needed
export DEPLOYER_SEED=<64-hex>                        # fund the printed address via the faucet
npm run deploy:preview                               # 9 logged stages → writes .env.preview + JSON record
CONTRACT_ADDRESS=<addr> npx tsx scripts/e2e-preview.ts   # 7-step on-chain lifecycle
npm --prefix contract test                           # 14 unit tests
npm run build:vercel                                 # production Preview bundle → dist/
```

---

## Hosting (Vercel)

**Wired, not yet serving this app.** `vercel.json` declares `npm run build:vercel` (Preview-mode bundle with the deployed contract baked in), `dist/` output, SPA rewrites. The workflow deploys on `main` once three repo secrets exist: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.

What's true today: the project behind dv-portal.vercel.app builds a **Next.js** app (`/_next/static/*` markers in its HTML) — a legacy connection. To make "Live dApp" honest, either point that Vercel project's settings at this repo's `vercel.json` (framework Vite, root build as configured) or create a fresh project from this repo; then redeploy. No secrets are needed for the Vercel build itself — all `VITE_*` env values are public and committed in `vericred-ui/.env.preview`. **No seed or private-state password should ever enter Vercel env** — they're operator-side and prefixed `VITE_`-free by design.

---

## Continuous Integration

[`ci.yml`](.github/workflows/ci.yml) runs on every push/PR: **quality** (typecheck contract+api+cli+ui → UI lint → vitest, 14 tests) then **build** (full workspace build → Preview bundle → `dist/` artifact). Measured first run on `main` (run 36749327979): quality ✓ 1m03s, build ✓ 1m24s. The Vercel job exits *success* with a skip notice until the secrets exist — fork-safe by design.

The capture harness (a pipeline sibling) recently caught a real bug fail-closed: non-deterministic seed commitments broke every QR/deep link — fixed in [`b1e57ce`](https://github.com/amisayhan88/vericred/commit/b1e57ce).

---

## Scripts

| Script | Purpose |
| ------ | ------- |
| `npm run dev` / `build` / `build:vercel` | Vite dev; full workspace build; Preview-mode static bundle → `dist/` |
| `npm run typecheck` / `--prefix vericred-ui run lint` / `npm test` | workspace gates used verbatim by CI |
| `npm run deploy:preview` | 9-stage Preview deploy (faucet polling, spendable-DUST gate, records) |
| `npm run verify:preview` | join deployed contract, read state, smoke-call, refresh records |
| `npm run read:state -- <net> <addr>` | public-only indexer read-back (the numbers quoted above) |
| `npx tsx scripts/e2e-preview.ts` | 7-step on-chain lifecycle with JSON report |
| `node scripts/screenshots.mjs` | production-build capture with fail-closed checks + report |
| `python3 scripts/generate-doc-diagrams.py` | regenerate all six diagrams (SVG → sharp → PNG) |
| `npm run compact --prefix contract` | recompile circuits **only** with the Compact CLI (artifacts otherwise committed) |

---

## Status

**Working — each line reproducible without trusting this README**

- Preview registry **LIVE**, issued + proven + revoked: `npm run read:state -- preview e71bf7d7…` prints counter 2, `0x2ef63020…` REVOKED.
- Full lifecycle ran on-chain: 4 confirmed circuit txs + 2 honest local rejections ([e2e-preview.json](docs/e2e-preview.json)).
- 14/14 contract unit tests, 0-error lint, strict typecheck, full + Preview-mode builds all green locally and in CI (measured times above).
- Every UI route renders without console/page errors across 20 machine-checked captures (desktop + mobile, production build).
- Deep links (`/credential/VC-…`, QR, shared proof links) survive fresh sessions — asserted, not assumed.

**Outstanding — not claimed as done**

- **Hosting:** the Vercel URL serves the legacy Next.js app; reviewers cannot open *this* build yet — see [Hosting](#hosting-vercel).
- **Browser ↔ contract:** `LiveCacLedger` seam wired but unimplemented; browser sessions run demo-ledger proofs.
- No on-chain expiry / per-credential witness binding / multi-institution ownership — roadmap in [PROPOSAL.md](PROPOSAL.md).
- 58-row feedback sheet contains 0 Midnight-format wallets → Level-5 "user wallets" evidence remains the on-chain E2E, not the sheet.
- Screenshots and diagrams are machine-verified, human-unviewed (no image input in this environment).
- Two legacy preprod scripts embed a public testnet seed — rotate & purge ([docs/security.md](docs/security.md)).
- `deploy-preview.ts` publishes a **fresh contract on every run**; the live one (block #1083540) was the first and only deploy. Re-runs create siblings, not upgrades — re-join the existing address with `verify:preview` / `e2e-preview.ts` instead.

---

*License MIT · [SECURITY.md](SECURITY.md) private disclosure · [CHANGELOG.md](CHANGELOG.md) · [docs/](docs/) guides*
