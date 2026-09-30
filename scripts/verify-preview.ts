/**
 * VeriCred CAC — Midnight Preview post-deployment verification.
 *
 * Joins an ALREADY DEPLOYED contract (private state persisted by a previous
 * deploy-preview.ts run in preview-state-<seed8>/), confirms its ledger state via
 * the indexer, executes a real `issueCredential` circuit call, waits for the
 * on-chain counter to move, then records docs/deployment-preview.json and
 * updates vericred-ui/.env.preview.
 *
 * Usage:
 *   CONTRACT_ADDRESS=<32-byte-hex> npx tsx scripts/verify-preview.ts
 *   (npm run verify:preview)
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

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: { target: 'pino-pretty', options: { colorize: true } },
});

const seed = process.env.DEPLOYER_SEED;
if (!seed || seed.length !== 64) {
  console.error('❌ DEPLOYER_SEED env var (64-hex) is required. Never commit seeds — see docs/security.md.');
  process.exit(1);
}
const contractAddress = process.env.CONTRACT_ADDRESS;
if (!contractAddress) {
  console.error('❌ CONTRACT_ADDRESS env var is required (32-byte hex of the deployed contract).');
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

const stage = (msg: string) => logger.info(`\n=== ${msg} ===`);

async function main(): Promise<void> {
  console.log('\n============================================================');
  console.log('🔎 MIDNIGHT PREVIEW — VeriCred CAC post-deployment verification');
  console.log('============================================================');

  const seeds = WalletSeeds.fromMasterSeed(seed);
  const keystore = createKeystore(seeds.unshielded, 'preview');
  const unshieldedAddress = keystore.getBech32Address().asString();
  logger.info(`Wallet: ${unshieldedAddress}`);
  logger.info(`Contract: ${contractAddress}`);

  stage('Starting wallet (shielded + unshielded + dust)…');
  const walletProvider = await MidnightWalletProvider.build(logger, envConfig, seed);
  await walletProvider.start();

  // Wait until dust is spendable (needed to balance the smoke circuit call).
  const dustBalanceOf = (state: { dust: { balance(now: Date): bigint } }): bigint => {
    try {
      return state.dust.balance(new Date());
    } catch {
      return 0n;
    }
  };
  await Rx.firstValueFrom(
    walletProvider.wallet.state().pipe(
      Rx.filter((s) => dustBalanceOf(s) > 0n && (s.unshielded.balances[unshieldedToken().raw] ?? 0n) > 0n),
      Rx.timeout({
        first: 30 * 60_000,
        with: () => Rx.throwError(() => new Error('Wallet (NIGHT+DUST) not ready within 30 minutes')),
      }),
    ),
  );
  logger.info('✅ Wallet ready (NIGHT + spendable DUST)');

  const zkConfigPath = path.resolve(rootDir, 'contract/src/managed/cac');
  const privateStateStorePath = path.resolve(rootDir, `preview-state-${seed.slice(0, 8)}`);
  // levelPrivateStateProvider keeps all stores inside the shared ./midnight-level-db directory,
  // keyed by the logical store path prefix.
  if (!fs.existsSync(path.resolve(rootDir, 'midnight-level-db'))) {
    throw new Error('No midnight-level-db private state store found — run scripts/deploy-preview.ts first.');
  }
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

  stage('Joining deployed contract (findDeployedContract)…');
  const contract = await findDeployedContract(providers as never, {
    contractAddress,
    compiledContract: CompiledCacContractContract,
    privateStateId: cacPrivateStateKey,
  });
  logger.info(`✅ Joined contract at ${contractAddress}`);

  stage('Reading initial ledger state via indexer…');
  const initial = await Rx.firstValueFrom(
    providers.publicDataProvider.contractStateObservable(contractAddress, { type: 'latest' }).pipe(
      Rx.map((cs) => CacCompiled.ledger(cs.data)),
      Rx.take(1),
      Rx.timeout({
        first: 5 * 60_000,
        with: () => Rx.throwError(() => new Error('Indexer did not return contract state within 5 minutes')),
      }),
    ),
  );
  logger.info(
    `Ledger state — totalCredentialsIssued: ${initial.totalCredentialsIssued} · credentialStatus entries: ${initial.credentialStatus.size()} · institutionOwner: 0x${Buffer.from(initial.institutionOwner).toString('hex').slice(0, 16)}…`,
  );

  stage('Smoke interaction — issueCredential (real circuit + real tx)…');
  const smokeHash = randomBytes(32);
  const smokeTx = await (contract.callTx as never as {
    issueCredential(hash: Uint8Array): Promise<{ public: { txHash: string; blockHeight: number; txId: string } }>;
  }).issueCredential(smokeHash);
  logger.info(
    `issueCredential confirmed — txId: ${smokeTx.public.txId} · txHash: ${smokeTx.public.txHash} · block #${smokeTx.public.blockHeight}`,
  );

  const before = initial.totalCredentialsIssued;
  const after = await Rx.firstValueFrom(
    providers.publicDataProvider.contractStateObservable(contractAddress, { type: 'latest' }).pipe(
      Rx.map((cs) => CacCompiled.ledger(cs.data)),
      Rx.tap((ls) => logger.info(`totalCredentialsIssued = ${ls.totalCredentialsIssued}`)),
      Rx.filter((ls) => ls.totalCredentialsIssued > before),
      Rx.take(1),
      Rx.timeout({
        first: 10 * 60_000,
        with: () => Rx.throwError(() => new Error('Counter did not increment within 10 minutes')),
      }),
    ),
  );
  logger.info(`✅ Counter moved ${before} → ${after.totalCredentialsIssued} — contract is USABLE on Preview`);

  stage('Recording artifacts…');
  const info = JSON.parse(
    fs.readFileSync(path.resolve(rootDir, 'contract/src/managed/cac/compiler/contract-info.json'), 'utf8'),
  );
  const record = {
    network: 'Midnight Preview',
    contractName: 'VeriCred CAC (Confidential Academic Credentials)',
    contractAddress,
    deployerUnshieldedAddress: unshieldedAddress,
    deployment: {
      note: 'Deployment transaction details recorded from the deploy-preview.ts run (scripts/deploy-preview.ts stage 6 log).',
      txId: process.env.DEPLOY_TX_ID ?? null,
      txHash: process.env.DEPLOY_TX_HASH ?? null,
      blockHeight: process.env.DEPLOY_BLOCK ? Number(process.env.DEPLOY_BLOCK) : null,
      status: process.env.DEPLOY_STATUS ?? null,
      deployedAt: process.env.DEPLOYED_AT ?? null,
    },
    smokeInteraction: {
      circuit: 'issueCredential',
      credentialHash: `0x${Buffer.from(smokeHash).toString('hex')}`,
      txId: smokeTx.public.txId,
      txHash: smokeTx.public.txHash,
      blockHeight: smokeTx.public.blockHeight,
      totalCredentialsIssuedBefore: String(before),
      totalCredentialsIssuedAfter: String(after.totalCredentialsIssued),
    },
    endpoints: {
      rpc: envConfig.node,
      indexer: envConfig.indexer,
      faucet: envConfig.faucet,
      proofServer: envConfig.proofServer,
    },
    compact: {
      compiler: String(info['compiler-version']),
      language: String(info['language-version']),
      runtime: String(info['runtime-version']),
    },
    verifiedAt: new Date().toISOString(),
  };
  fs.mkdirSync(path.resolve(rootDir, 'docs'), { recursive: true });
  fs.writeFileSync(path.resolve(rootDir, 'docs/deployment-preview.json'), JSON.stringify(record, null, 2));
  logger.info('Wrote docs/deployment-preview.json');

  const uiEnvPreview = path.resolve(rootDir, 'vericred-ui/.env.preview');
  if (fs.existsSync(uiEnvPreview)) {
    let content = fs.readFileSync(uiEnvPreview, 'utf-8');
    const setVar = (key: string, value: string) => {
      const re = new RegExp(`^${key}=.*$`, 'm');
      content = re.test(content) ? content.replace(re, `${key}=${value}`) : `${content.trimEnd()}\n${key}=${value}\n`;
    };
    setVar('VITE_NETWORK_ID', 'preview');
    setVar('VITE_CONTRACT_ADDRESS', contractAddress);
    setVar('VITE_CAC_CONTRACT_ADDRESS', contractAddress);
    setVar('VITE_DEPLOYER_WALLET_ADDRESS', unshieldedAddress);
    fs.writeFileSync(uiEnvPreview, content);
    logger.info('Updated vericred-ui/.env.preview');
  }

  console.log('\n============================================================');
  console.log('🎉 VERIFIED — VeriCred CAC is live and usable on Midnight Preview');
  console.log('============================================================');
  console.log(`📍 Contract Address: ${contractAddress}`);
  console.log(`🔥 Smoke TX:         ${smokeTx.public.txHash} (block #${smokeTx.public.blockHeight})`);
  console.log(`👤 Wallet:           ${unshieldedAddress}`);
  console.log('============================================================\n');

  await walletProvider.stop().catch(() => {});
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
