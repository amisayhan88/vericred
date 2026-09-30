/**
 * VeriCred CAC — Midnight Preview end-to-end lifecycle test.
 *
 * Exercises the REAL circuits against the deployed Preview contract:
 *   1. issueCredential(hash)            → VALID on ledger
 *   2. verifyCredential(hash)           → true
 *   3. proveGpaThreshold(hash, 350)     → true   (witness GPA 385 ≥ 350)
 *   4. proveGpaThreshold(hash, 395)     → MUST fail locally, discloses nothing
 *   5. revokeCredential(hash)           → REVOKED on ledger
 *   6. verifyCredential(hash)           → MUST fail (revoked)
 *   7. unauthorized issue               → simulated second key MUST fail assertion
 *
 * Results are appended to docs/e2e-preview.json.
 *
 * Usage: CONTRACT_ADDRESS=<hex> npx tsx scripts/e2e-preview.ts
 */
import { pino } from 'pino';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { LedgerParameters } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { WalletSeeds, type DustWalletOptions, type EnvironmentConfiguration } from '@midnight-ntwrk/testkit-js';
import { createKeystore } from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { MidnightWalletProvider } from '../vericred-cli/src/midnight-wallet-provider.js';
import { unshieldedToken } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { CompiledCacContractContract, CacCompiled } from '../contract/src/index.js';
import { cacPrivateStateKey } from '../api/src/cac-types.js';
import { randomBytes } from 'crypto';
import * as Rx from 'rxjs';
import fs from 'fs';
import path from 'path';

setNetworkId('preview');

const logger = pino({ level: 'info', transport: { target: 'pino-pretty', options: { colorize: true } } });
const seed = process.env.DEPLOYER_SEED;
if (!seed || seed.length !== 64) {
  console.error('❌ DEPLOYER_SEED env var (64-hex) is required. Never commit seeds — see docs/security.md.');
  process.exit(1);
}
const contractAddress = process.env.CONTRACT_ADDRESS;
if (!contractAddress) {
  console.error('❌ CONTRACT_ADDRESS required');
  process.exit(1);
}
const rootDir = process.cwd();

const envConfig: EnvironmentConfiguration = {
  walletNetworkId: 'preview',
  networkId: 'preview',
  indexer: 'https://indexer.preview.midnight.network/api/v4/graphql',
  indexerWS: 'wss://indexer.preview.midnight.network/api/v4/graphql/ws',
  node: 'https://rpc.preview.midnight.network',
  nodeWS: 'wss://rpc.preview.midnight.network',
  faucet: 'https://faucet.preview.midnight.network/api/drips',
  proofServer: process.env.PROOF_SERVER_URL || 'http://localhost:6300',
};

const dustOptions: DustWalletOptions = {
  ledgerParams: LedgerParameters.initialParameters(),
  additionalFeeOverhead: 1_000n,
  feeBlocksMargin: 5,
};

type StepResult = { step: string; expected: string; actual: string; passed: boolean; txHash?: string; block?: number };
const results: StepResult[] = [];
const record = (r: StepResult) => {
  results.push(r);
  logger.info(`${r.passed ? '✅' : '❌'} ${r.step} — expected: ${r.expected} · actual: ${r.actual}`);
};

async function main(): Promise<void> {
  console.log('\n=== VeriCred E2E lifecycle on Midnight Preview ===');
  const walletProvider = await MidnightWalletProvider.build(logger, envConfig, seed);
  await walletProvider.start();
  const dustBalanceOf = (s: { dust: { balance(now: Date): bigint } }) => {
    try {
      return s.dust.balance(new Date());
    } catch {
      return 0n;
    }
  };
  await Rx.firstValueFrom(
    walletProvider.wallet.state().pipe(
      Rx.filter((s) => dustBalanceOf(s) > 0n && (s.unshielded.balances[unshieldedToken().raw] ?? 0n) > 0n),
      Rx.timeout({ first: 30 * 60_000, with: () => Rx.throwError(() => new Error('wallet not ready')) }),
    ),
  );
  logger.info('Wallet ready');

  const zkConfigPath = path.resolve(rootDir, 'contract/src/managed/cac');
  const privateStateStorePath = path.resolve(rootDir, `preview-state-${seed.slice(0, 8)}`);
  const zkConfigProvider = new NodeZkConfigProvider<never>(zkConfigPath);
  const providers = {
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName: privateStateStorePath,
      signingKeyStoreName: `${privateStateStorePath}-signing-keys`,
      privateStoragePasswordProvider: () => process.env.PRIVATE_STATE_PASSWORD || 'VeriCred-CAC-Preview-Local',
      accountId: seed,
    }),
    publicDataProvider: indexerPublicDataProvider(envConfig.indexer, envConfig.indexerWS),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(envConfig.proofServer, zkConfigProvider),
    walletProvider,
    midnightProvider: walletProvider,
  };

  const contract = await findDeployedContract(providers as never, {
    contractAddress,
    compiledContract: CompiledCacContractContract,
    privateStateId: cacPrivateStateKey,
  });
  type CallTx = {
    issueCredential(h: Uint8Array): Promise<{ public: { txHash: string; blockHeight: number } }>;
    verifyCredential(h: Uint8Array): Promise<{ public: { txHash: string; blockHeight: number } }>;
    proveGpaThreshold(h: Uint8Array, min: bigint): Promise<{ public: { txHash: string; blockHeight: number } }>;
    revokeCredential(h: Uint8Array): Promise<{ public: { txHash: string; blockHeight: number } }>;
  };
  const callTx = contract.callTx as never as CallTx;

  const ledgerState = () =>
    Rx.firstValueFrom(
      providers.publicDataProvider.contractStateObservable(contractAddress, { type: 'latest' }).pipe(
        Rx.map((cs) => CacCompiled.ledger(cs.data)),
        Rx.take(1),
        Rx.timeout({ first: 5 * 60_000, with: () => Rx.throwError(() => new Error('state timeout')) }),
      ),
    );

  const hash = randomBytes(32);
  const hashHex = `0x${Buffer.from(hash).toString('hex')}`;
  logger.info(`Test credential hash: ${hashHex}`);

  // 1. issue
  const before = await ledgerState();
  const issue = await callTx.issueCredential(hash);
  const afterIssue = await waitForCounter(before.totalCredentialsIssued + 1n);
  record({
    step: 'issueCredential',
    expected: 'counter +1, status VALID',
    actual: `counter ${afterIssue.totalCredentialsIssued}, status ${CacCompiled.CredentialStatus[afterIssue.credentialStatus.lookup(hash)]}`,
    passed: afterIssue.credentialStatus.lookup(hash) === CacCompiled.CredentialStatus.VALID,
    txHash: issue.public.txHash,
    block: issue.public.blockHeight,
  });

  // 2. verify (Boolean circuit — resolves iff the on-chain assertion passes)
  const v1 = await callTx.verifyCredential(hash);
  record({
    step: 'verifyCredential (active)',
    expected: 'assertion passes → tx confirmed',
    actual: `confirmed in block #${v1.public.blockHeight}`,
    passed: true,
    txHash: v1.public.txHash,
    block: v1.public.blockHeight,
  });

  // 3. GPA proof — satisfied (witness 385 ≥ 350): real ZK proof tx on Preview
  const g1 = await callTx.proveGpaThreshold(hash, 350n);
  record({
    step: 'proveGpaThreshold ≥ 3.50 (witness 3.85)',
    expected: 'proof generated → tx confirmed',
    actual: `confirmed in block #${g1.public.blockHeight}`,
    passed: true,
    txHash: g1.public.txHash,
    block: g1.public.blockHeight,
  });

  // 4. GPA proof — unsatisfied (395 > 385): must fail locally, reveal nothing
  let unsatisfiedFailed = false;
  let unsatisfiedErr = '';
  try {
    await callTx.proveGpaThreshold(hash, 395n);
  } catch (e) {
    unsatisfiedFailed = true;
    unsatisfiedErr = e instanceof Error ? e.message.split('\n')[0] : String(e);
  }
  record({
    step: 'proveGpaThreshold ≥ 3.95 (witness 3.85)',
    expected: 'circuit assertion failure, no disclosure',
    actual: unsatisfiedFailed ? `rejected: ${unsatisfiedErr.slice(0, 90)}` : 'UNEXPECTEDLY PASSED',
    passed: unsatisfiedFailed,
  });

  // 5. revoke
  const rev = await callTx.revokeCredential(hash);
  const afterRevoke = await waitForStatus(CacCompiled.CredentialStatus.REVOKED);
  record({
    step: 'revokeCredential',
    expected: 'status REVOKED',
    actual: `status ${CacCompiled.CredentialStatus[afterRevoke.credentialStatus.lookup(hash)]}`,
    passed: afterRevoke.credentialStatus.lookup(hash) === CacCompiled.CredentialStatus.REVOKED,
    txHash: rev.public.txHash,
    block: rev.public.blockHeight,
  });

  // 6. verify after revoke — must fail
  let revokedFailed = false;
  try {
    await callTx.verifyCredential(hash);
  } catch (e) {
    revokedFailed = true;
    logger.info(`verifyCredential(revoked) rejected: ${(e instanceof Error ? e.message : String(e)).split('\n')[0]}`);
  }
  record({
    step: 'verifyCredential (revoked)',
    expected: 'assertion failure',
    actual: revokedFailed ? 'rejected' : 'UNEXPECTEDLY PASSED',
    passed: revokedFailed,
  });

  // 7. unauthorized issuer — institution-owner assertion must reject a foreign key
  let unauthorizedFailed = false;
  let unauthorizedErr = '';
  try {
    const foreignState = {
      secretKey: randomBytes(32),
      studentGpaScaled: 400,
      degreeIdHash: randomBytes(32),
    };
    providers.privateStateProvider.setContractAddress(contractAddress);
    await providers.privateStateProvider.set('e2e-foreign' as never, foreignState as never);
    const foreign = await findDeployedContract(providers as never, {
      contractAddress,
      compiledContract: CompiledCacContractContract,
      privateStateId: 'e2e-foreign' as never,
    });
    await (foreign.callTx as never as CallTx).issueCredential(randomBytes(32));
  } catch (e) {
    unauthorizedFailed = true;
    unauthorizedErr = e instanceof Error ? e.message.split('\n')[0] : String(e);
  }
  record({
    step: 'issueCredential with foreign institution key',
    expected: 'owner assertion failure',
    actual: unauthorizedFailed ? `rejected: ${unauthorizedErr.slice(0, 90)}` : 'UNEXPECTEDLY PASSED',
    passed: unauthorizedFailed,
  });

  const passed = results.filter((r) => r.passed).length;
  console.log(`\n=== E2E result: ${passed}/${results.length} passed ===`);
  const outFile = path.resolve(rootDir, 'docs/e2e-preview.json');
  const existing = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, 'utf8')) : { runs: [] };
  existing.runs.push({ at: new Date().toISOString(), contractAddress, credentialHash: hashHex, passed, total: results.length, results });
  fs.writeFileSync(outFile, JSON.stringify(existing, null, 2));
  logger.info(`Wrote ${outFile}`);

  await walletProvider.stop().catch(() => {});
  process.exit(passed === results.length ? 0 : 1);

  async function waitForCounter(target: bigint) {
    return Rx.firstValueFrom(
      providers.publicDataProvider.contractStateObservable(contractAddress, { type: 'latest' }).pipe(
        Rx.map((cs) => CacCompiled.ledger(cs.data)),
        Rx.filter((ls) => ls.totalCredentialsIssued >= target),
        Rx.take(1),
        Rx.timeout({ first: 10 * 60_000, with: () => Rx.throwError(() => new Error('counter timeout')) }),
      ),
    );
  }
  async function waitForStatus(target: number) {
    return Rx.firstValueFrom(
      providers.publicDataProvider.contractStateObservable(contractAddress, { type: 'latest' }).pipe(
        Rx.map((cs) => CacCompiled.ledger(cs.data)),
        Rx.filter((ls) => ls.credentialStatus.member(hash) && ls.credentialStatus.lookup(hash) === target),
        Rx.take(1),
        Rx.timeout({ first: 10 * 60_000, with: () => Rx.throwError(() => new Error('status timeout')) }),
      ),
    );
  }
}

main().catch((err) => {
  console.error('❌ Fatal:', err);
  process.exit(1);
});
