# VeriCred — Deployment Guide (Midnight Preview)

![Deployment Architecture](./deployment-architecture.png)

## Current deployment (real values — see `docs/deployment-preview.json`)

| Field | Value |
| ----- | ----- |
| Network | Midnight Preview |
| Explorer | [contract](https://preview.midnightexplorer.com/contracts/0xe71bf7d73babb895c4524deebcec7fd2ef2a9590854770732492598c91e99df1) · [deploy tx](https://preview.midnightexplorer.com/transactions/0xe67e425d27d858a6486e8fbf7108613ed03f508836848b9958fff223b7b07714) · [block #1083540](https://preview.midnightexplorer.com/blocks/1083540) |
| Contract | VeriCred CAC (`contract/src/cac.compact`) |
| Contract address | `e71bf7d73babb895c4524deebcec7fd2ef2a9590854770732492598c91e99df1` |
| Deployment txId | `0031cfc89200173a266400184751bb6053873d225500c17e7d52e480d932cd0f46` |
| Deployment txHash | `e67e425d27d858a6486e8fbf7108613ed03f508836848b9958fff223b7b07714` |
| Deployment block | 1083540 |
| Deployment status | `SucceedEntirely` |
| Deployed at | 2026-09-30T03:39:05+05:30 |
| Deployer wallet (unshielded) | `mn_addr_preview1xzej9p78pa65rywz4085z9ee75wanmq7gq5k88alrm3j6q8p3wzsr4kmpg` |
| Compact compiler / language / runtime | 0.31.1 / 0.23.0 / 0.16.0 |
| Midnight SDK | 4.1.1 (`@midnight-ntwrk/midnight-js-*`) |
| Proof server | `midnightntwrk/proof-server:8.1.0` (docker, :6300) |
| Post-deploy smoke tx | `issueCredential` — txHash `e5259e1d025527a5fd89b479362a3394f49958ea414984c891bc3898b6107470`, block 1083645, counter 0 → 1 |

Endpoints (baked into `@midnight-ntwrk/testkit-js`):

```text
RPC        https://rpc.preview.midnight.network        (WS wss://rpc.preview.midnight.network)
Indexer    https://indexer.preview.midnight.network/api/v4/graphql   (WS …/graphql/ws)
Faucet     https://faucet.preview.midnight.network/api/drips         (Turnstile-protected)
```

## Prerequisites

- Node ≥ 22 (repo `.nvmrc` pins 24.11.1), npm workspaces installed (`npm install`)
- Docker with the proof server running: `docker compose up -d proof-server` (port 6300)
- A Preview-funded wallet. Provide its seed via env (**never commit it**):
  `export DEPLOYER_SEED=<64-hex-seed>` — fallback exists for the legacy public demo seed.

## Deploy

```bash
# 1. Install everything (workspaces: contract, api, cli, ui)
npm install

# 2. Compile Compact contract (uses pre-compiled managed artifacts when the
#    Compact CLI is unavailable — see contract/package.json "compact" script)
npm run compact --prefix contract

# 3. Deploy to Midnight Preview (9 logged stages; writes .env.preview + docs record)
npm run deploy:preview

# 4. Re-verify an existing deployment without redeploying
CONTRACT_ADDRESS=<hex> npm run verify:preview

# 5. Full on-chain E2E lifecycle (issue → verify → GPA proof pass/fail → revoke → unauthorized)
CONTRACT_ADDRESS=<hex> npx tsx scripts/e2e-preview.ts
```

`deploy:preview` stages: environment validation → wallet validation → balance check
(faucet attempt + polling) → DUST provisioning (registers NIGHT UTXOs, waits for
*spendable* dust) → provider build → ZK deploy proof + submission → indexer
confirmation → `issueCredential` smoke call → artifact recording.

## Frontend builds

```bash
npm run build --prefix vericred-ui            # preprod mode (.env.preprod)
npm run build:preview --prefix vericred-ui    # preview mode (.env.preview ← updated by the deploy script)
```

`vericred-ui/.env.preview` (public values only):

```env
VITE_NETWORK_ID=preview
VITE_CONTRACT_ADDRESS=e71bf7d73babb895c4524deebcec7fd2ef2a9590854770732492598c91e99df1
VITE_CAC_CONTRACT_ADDRESS=e71bf7d73babb895c4524deebcec7fd2ef2a9590854770732492598c91e99df1
VITE_DEPLOYER_WALLET_ADDRESS=mn_addr_preview1xzej9p78pa65rywz4085z9ee75wanmq7gq5k88alrm3j6q8p3wzsr4kmpg
```

Browser sessions currently run the **DemoLedger** (offline-safe mirror of the circuit
ABI). `LiveCacLedger` (`vericred-ui/src/services/cac-service.ts`) is the single wiring
point to drive the deployed Preview contract from the browser via the dApp connector —
set `VITE_CAC_LIVE=true` once implemented; no UI changes required.

## Continuous Integration & Vercel

### GitHub Actions

| Workflow | Trigger | Jobs |
| -------- | ------- | ---- |
| `.github/workflows/ci.yml` | push (main/master/develop), PRs | **quality**: install → typecheck (contract/api/cli/ui) → UI lint → vitest contract tests (14). **build**: full workspace build → Preview-mode bundle (`npm run build:vercel`) → uploads `dist/` artifact |
| `.github/workflows/vercel-deploy.yml` | push to `main` (production), PRs (preview), manual | Deploys via Vercel CLI (`pull → build → deploy --prebuilt`). **Skips gracefully with a notice when secrets are absent** (fork-safe) |

Required repository secrets for deployment (Settings → Secrets and variables → Actions):

```text
VERCEL_TOKEN        # Vercel dashboard → Account → Tokens
VERCEL_ORG_ID       # from `vercel link` (.vercel/project.json → orgId) or dashboard URL
VERCEL_PROJECT_ID   # from `vercel link` (.vercel/project.json → projectId)
```

Bootstrap from a terminal once:

```bash
npm i -g vercel
vercel login
vercel link            # creates .vercel/project.json with orgId/projectId (git-ignored)
vercel env pull        # optional: sync env
```

### vercel.json

```json
{
  "buildCommand": "npm run build:vercel",   // ui build:preview → dist/ (Preview contract baked in)
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]   // SPA routes
}
```

`npm run build:vercel` builds `vericred-ui` in **preview mode**, so the deployed bundle reads
`vericred-ui/.env.preview` — i.e. the live Midnight Preview contract
(`e71bf7d7…e99df1`) — and copies `keys/` + `zkir/` circuit assets into `dist/`.
No secrets are required at build time; all `VITE_*` values are public.

## Operational notes

- The HTTP RPC path (`author_submitExtrinsic`) returns 403 on Preview; the wallet
  provider falls back to wallet-sdk submission automatically (benign warning).
- The private state store (`midnight-level-db/`) is **required** to re-join the contract
  with witness capabilities and is git-ignored. Back it up if you rotate machines.
- Re-running `deploy:preview` deploys a NEW contract; use `verify:preview` /
  `e2e-preview.ts` against the recorded address instead.
