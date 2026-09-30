# VeriCred — Troubleshooting

## Preview deployment takes too long

Work through the pipeline in order (each stage is logged by `scripts/deploy-preview.ts`):

1. **RPC connectivity** — `curl -X POST https://rpc.preview.midnight.network -H 'Content-Type: application/json' -d '{"jsonrpc":"2.0","method":"chain_getHeader","params":[],"id":1}'`
   should return a header with a recent `number` (hex block height).
2. **Indexer connectivity** — `https://indexer.preview.midnight.network/api/v4/graphql` answers POST
   (a GET returns 405 — that is expected, not an outage).
3. **Proof server** — `curl http://localhost:6300` must answer (docker compose service
   `proof-server`, image `midnightntwrk/proof-server:8.1.0`). If it is down, deploy hangs
   in “Generating ZK deployment proof”.
4. **Wallet sync** — the script logs `DUST sync: x% (applied/highest)`. First run replays
   all DUST events (~257k on Preview as of Sep 2026) and takes several minutes. Subsequent
   runs re-sync because the wallet state is in-memory (`txHistoryStorage`); budget ~4 min.
5. **DUST availability ≠ DUST sync.** A freshly registered NIGHT UTXO converts to spendable
   DUST gradually. Deploying with `dust balance 0` fails with
   `Wallet.InsufficientFunds: could not balance dust`. The current script waits for
   *spendable* dust (`dustBalanceOf(state) > 0`), not just sync completion.

## Transaction pending / stuck

- Keep the **txId/txHash** the script prints (`Deployment tx confirmed — txId … · txHash … · block …`).
- Re-check inclusion: the indexer exposes JSON-RPC helpers (`midnight_contractState`,
  `midnight_getLedgerState`); the SDK’s `publicDataProvider.contractStateObservable(address, {type:'latest'})`
  emits as soon as the indexer processes the block.
- `status: "SucceedEntirely"` in the deploy log means finalized on-chain; if the indexer
  lags, the confirmation step simply waits (10-minute budget in the script).
- HTTP RPC `author_submitExtrinsic` may return **403** on Preview; the wallet provider
  automatically falls back to `wallet.submitTransaction` — the 403 warning is benign
  (observed in the successful 2026-09-30 deployment).

## Contract not found

1. **Right network?** `mn_addr_preview…` addresses and the `preview` indexer/RPC only
   match Preview deployments; preprod addresses will never resolve there.
2. **Right address?** The contract address is *not* the deploy txId. Recover it from the
   private-state store keys:
   `node -e "…level('./midnight-level-db')…"` — keys look like
   `!<store-path>:<account>!<CONTRACT_ADDRESS>:cacPrivateState`.
3. **Indexer lag** — poll `contractStateObservable` instead of a one-shot fetch.
4. **Private state present?** `findDeployedContract` with an existing `privateStateId`
   requires the LevelDB store created during deployment (`midnight-level-db/`, git-ignored).
   Without it you can still read public state, but cannot run circuits that need witnesses.

## Faucet

- `POST https://faucet.preview.midnight.network/api/drips` requires a valid Cloudflare
  Turnstile token (`403 Captcha verification failed` otherwise). Fund via the official
  faucet page in a browser, then re-run the script — it polls the balance for
  `FAUCET_POLL_MINUTES` (default 20).

## UI shows “demo” ledger

Expected by default: `services/cac-service.ts` selects `DemoLedger` unless
`VITE_CAC_LIVE=true` **and** `VITE_CAC_CONTRACT_ADDRESS` are set at build time, and
`LiveCacLedger` has been completed (marked integration point). The deployed Preview
address lives in `vericred-ui/.env.preview` and `docs/deployment-preview.json`.
