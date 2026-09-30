/**
 * VeriCred CAC — Midnight **Preview** network deployment script.
 *
 * Pipeline (every stage logged):
 *   Environment validation → Wallet validation → Balance check (faucet attempt if empty)
 *   → Contract compilation artifacts check → ZK deployment transaction → Submission
 *   → Network confirmation (indexer contractState) → Post-deployment smoke interaction
 *   → Artifact recording (docs/deployment-preview.json) + vericred-ui/.env.preview update.
 *
 * Secrets: the deployer seed is read from the DEPLOYER_SEED env var (64-hex) and is
 * REQUIRED — this script never embeds a seed. See docs/security.md for rotation guidance.
 *
 * Usage:
 *   NODE_OPTIONS='--max-old-space-size=8192' npx tsx scripts/deploy-preview.ts
 *   (npm run deploy:preview)
 */
import { pino } from 'pino';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { LedgerParameters } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import {
  FaucetClient,
  WalletSeeds,
  type DustWalletOptions,
  type EnvironmentConfiguration,
} from '@midnight-ntwrk/testkit-js';
import { createKeystore } from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import { MidnightWalletProvider } from '../vericred-cli/src/midnight-wallet-provider.js';
import { unshieldedToken } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { CompiledCacContractContract, CacCompiled } from '../contract/src/index.js';
import { createCacPrivateState } from '../contract/src/cac-witnesses.js';
import { cacPrivateStateKey } from '../api/src/cac-types.js';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { u8aToHex } from '@polkadot/util';
import { randomBytes } from 'crypto';
import * as Rx from 'rxjs';
import axios from 'axios';
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

const FAUCET_POLL_MINUTES = Number(process.env.FAUCET_POLL_MINUTES ?? 20);
const stage = (msg: string) => logger.info(`\n=== ${msg} ===`);

async function validateEnvironment(): Promise<void> {
  stage('Stage 1/9 · Environment validation (Midnight Preview)');
  logger.info(`Network: preview`);
  logger.info(`RPC:     ${envConfig.node}`);
  logger.info(`Indexer: ${envConfig.indexer}`);
  logger.info(`Faucet:  ${envConfig.faucet}`);
  logger.info(`Proof:   ${envConfig.proofServer}`);

  const header = await axios.post(
    envConfig.node,
    { jsonrpc: '2.0', method: 'chain_getHeader', params: [], id: 1 },
    { timeout: 15_000 },
  );
  const blockNumber = parseInt(String(header.data?.result?.number ?? '0x0'), 16);
  if (!blockNumber) throw new Error('Preview RPC did not return a chain header');
  logger.info(`Preview RPC reachable — chain height #${blockNumber}`);

  try {
    const proofHealth = await axios.get(`${envConfig.proofServer}/api/v1/health`, { timeout: 8_000 });
    logger.info(`Proof server health: ${JSON.stringify(proofHealth.data)}`);
  } catch {
    const root = await axios.get(envConfig.proofServer, { timeout: 8_000 });
    logger.info(`Proof server reachable (HTTP ${root.status})`);
  }

  const zkPath = path.resolve(rootDir, 'contract/src/managed/cac');
  for (const f of ['zkir/issueCredential.zkir', 'keys/issueCredential.prover', 'compiler/contract-info.json']) {
    if (!fs.existsSync(path.join(zkPath, f))) {
      throw new Error(`Missing compiled artifact ${f} — run 'npm run compact' with the Compact toolchain first`);
    }
  }
  const info = JSON.parse(fs.readFileSync(path.join(zkPath, 'compiler/contract-info.json'), 'utf8'));
  logger.info(
    `Compiled CAC artifacts OK — compact compiler ${info['compiler-version']}, language ${info['language-version']}, runtime ${info['runtime-version']}`,
  );
}

async function main(): Promise<void> {
  console.log('\n============================================================');
  console.log('🚀 MIDNIGHT PREVIEW DEPLOYMENT — VeriCred CAC contract');
  console.log('============================================================');

  await validateEnvironment();

  stage('Stage 2/9 · Wallet validation');
  const seeds = WalletSeeds.fromMasterSeed(seed);
  const keystore = createKeystore(seeds.unshielded, 'preview');
  const unshieldedAddress = keystore.getBech32Address().asString();
  logger.info(`Deployer unshielded address: ${unshieldedAddress}`);
  if (!unshieldedAddress.startsWith('mn_addr_preview')) {
    throw new Error(`Derived address is not a Preview address: ${unshieldedAddress}`);
  }

  logger.info('Building wallet provider (shielded + unshielded + dust)…');
  const walletProvider = await MidnightWalletProvider.build(logger, envConfig, seed);
  await walletProvider.start();
  const wallet = walletProvider.wallet;
  const token = unshieldedToken();

  stage('Stage 3/9 · Balance check');
  let balance = 0n;
  try {
    const synced = await Rx.firstValueFrom(
      wallet.state().pipe(
        Rx.filter((s) => s.unshielded.progress.isConnected),
        Rx.map((s) => s.unshielded.balances[token.raw] ?? 0n),
        Rx.timeout({ first: 90_000, with: () => Rx.throwError(() => new Error('wallet sync timeout')) }),
      ),
    );
    balance = synced;
  } catch (e) {
    logger.warn(`Initial balance probe failed (${String(e)}), treating as 0`);
  }
  logger.info(`Unshielded NIGHT balance: ${balance.toString()}`);

  if (balance === 0n) {
    logger.info('Balance is 0 — attempting faucet drip…');
    const faucet = new FaucetClient(envConfig.faucet, logger);
    try {
      await faucet.requestTokens(unshieldedAddress);
      logger.info('Faucet drip accepted');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.warn(`Automated faucet drip failed: ${msg}`);
      logger.warn('============================================================');
      logger.warn(`Fund this wallet manually via the official Midnight Preview faucet:`);
      logger.warn(`  address: ${unshieldedAddress}`);
      logger.warn('Then leave this script running — it polls for the balance.');
      logger.warn('============================================================');
    }
    const deadline = Date.now() + FAUCET_POLL_MINUTES * 60_000;
    while (balance === 0n && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 15_000));
      balance = await Rx.firstValueFrom(
        wallet.state().pipe(Rx.map((s) => s.unshielded.balances[token.raw] ?? 0n), Rx.take(1)),
      );
      logger.info(`Polling balance… ${balance.toString()} NIGHT`);
    }
    if (balance === 0n) {
      throw new Error(
        `Deployer wallet ${unshieldedAddress} has no NIGHT on Preview after ${FAUCET_POLL_MINUTES} min. Fund it via the official faucet and re-run.`,
      );
    }
  }
  logger.info(`✅ Funding confirmed: ${balance.toString()} NIGHT`);

  stage('Stage 4/9 · DUST provisioning');
  const initialState = await Rx.firstValueFrom(wallet.state());
  const unregistered = initialState.unshielded.availableCoins.filter(
    (coin) => coin.utxo.type === token.raw && coin.meta.registeredForDustGeneration === false,
  );
  if (unregistered.length > 0) {
    logger.info(`Registering ${unregistered.length} NIGHT UTXO(s) for dust generation…`);
    const dustState = await Rx.firstValueFrom(wallet.dust.state);
    const recipe = await wallet.registerNightUtxosForDustGeneration(
      unregistered,
      keystore.getPublicKey(),
      (payload) => keystore.signData(payload),
      dustState.address,
    );
    const finalized = await wallet.finalizeRecipe(recipe);
    const api = await ApiPromise.create({
      provider: new WsProvider(envConfig.nodeWS),
      throwOnConnect: false,
      noInitWarn: true,
    });
    const extrinsic = api.tx.midnight.sendMnTransaction(u8aToHex(finalized.serialize()));
    const extrinsicHex = extrinsic.toHex();
    await api.disconnect().catch(() => {});
    const res = await axios.post(
      envConfig.node,
      { jsonrpc: '2.0', method: 'author_submitExtrinsic', params: [extrinsicHex], id: 1 },
      { timeout: 30_000 },
    );
    logger.info(`Dust registration submitted: ${res.data?.result || JSON.stringify(res.data)}`);
  } else {
    logger.info('No unregistered NIGHT UTXOs — dust already provisioned or not required.');
  }

  logger.info('Waiting for spendable DUST (generation accrues per block after registration)…');
  let lastLog = 0;
  const dustBalanceOf = (state: { dust: { balance(now: Date): bigint } }): bigint => {
    try {
      return state.dust.balance(new Date());
    } catch {
      return 0n;
    }
  };
  await Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.tap((state) => {
        const now = Date.now();
        if (now - lastLog > 10_000) {
          lastLog = now;
          const prog = state.dust.state.progress;
          const applied = Number(prog.appliedIndex);
          const highest = Number(prog.highestRelevantWalletIndex);
          const pct = highest > 0 ? ((applied / highest) * 100).toFixed(1) : '0.0';
          logger.info(`DUST sync: ${pct}% (${applied}/${highest}) · spendable dust ${dustBalanceOf(state)}`);
        }
      }),
      // Readiness = actual spendable dust, not just sync progress: freshly registered
      // NIGHT UTXOs convert to DUST gradually, and deploying too early fails with
      // Wallet.InsufficientFunds (could not balance dust).
      Rx.filter((state) => dustBalanceOf(state) > 0n),
      Rx.timeout({
        first: 45 * 60_000,
        with: () =>
          Rx.throwError(
            () => new Error('No spendable DUST after 45 minutes — re-run the script; registration persists on-chain.'),
          ),
      }),
    ),
  );
  logger.info('✅ Wallet ready (NIGHT + spendable DUST)');

  stage('Stage 5/9 · Contract compilation artifacts (pre-verified) → building providers');
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

  stage('Stage 6/9 · Generating ZK deployment proof & submitting transaction');
  const deployedAt = new Date().toISOString();
  const initialPrivateState = createCacPrivateState(randomBytes(32), 385, randomBytes(32));
  const deployed = await deployContract(providers as never, {
    compiledContract: CompiledCacContractContract,
    privateStateId: cacPrivateStateKey,
    initialPrivateState,
  });

  const contractAddress = deployed.deployTxData.public.contractAddress;
  logger.info(`📍 Contract address: ${contractAddress}`);
  const deployTxId = deployed.deployTxData.public.txId;
  const deployTxHash = (deployed.deployTxData.public as { txHash?: string }).txHash;
  const deployBlockHeight = (deployed.deployTxData.public as { blockHeight?: number }).blockHeight;
  const deployStatus = JSON.stringify(deployed.deployTxData.public.status);
  logger.info(
    `Deployment tx confirmed — txId: ${deployTxId} · txHash: ${deployTxHash ?? 'n/a'} · block: ${deployBlockHeight ?? 'n/a'} · status: ${deployStatus}`,
  );

  stage('Stage 7/9 · Network confirmation (indexer contract state)');
  await Rx.firstValueFrom(
    providers.publicDataProvider.contractStateObservable(contractAddress, { type: 'latest' }).pipe(
      Rx.tap(() => logger.info(`✅ Contract state visible on Preview indexer for ${contractAddress}`)),
      Rx.take(1),
      Rx.timeout({
        first: 10 * 60_000,
        with: () => Rx.throwError(() => new Error('Contract not confirmed by the indexer within 10 minutes')),
      }),
    ),
  );

  stage('Stage 8/9 · Post-deployment smoke interaction (issueCredential)');
  const smokeHash = randomBytes(32);
  const smokeTx = await (deployed.callTx as never as {
    issueCredential(hash: Uint8Array): Promise<{ public: { txHash: string; blockHeight: number } }>;
  }).issueCredential(smokeHash);
  logger.info(
    `issueCredential confirmed — txHash: ${smokeTx.public.txHash} · block #${smokeTx.public.blockHeight}`,
  );

  const issuedCount = await Rx.firstValueFrom(
    providers.publicDataProvider.contractStateObservable(contractAddress, { type: 'latest' }).pipe(
      Rx.map((cs) => CacCompiled.ledger(cs.data)),
      Rx.tap((ls) => logger.info(`Ledger state: totalCredentialsIssued = ${ls.totalCredentialsIssued}`)),
      Rx.filter((ls) => ls.totalCredentialsIssued >= 1n),
      Rx.timeout({
        first: 10 * 60_000,
        with: () => Rx.throwError(() => new Error('Smoke interaction did not confirm within 10 minutes')),
      }),
    ),
  ).then((ls) => ls.totalCredentialsIssued);
  logger.info(`✅ Post-deployment interaction confirmed on-chain (totalCredentialsIssued = ${issuedCount})`);

  stage('Stage 9/9 · Recording artifacts & updating configuration');
  const record = {
    network: 'Midnight Preview',
    contractName: 'VeriCred CAC (Confidential Academic Credentials)',
    contractAddress,
    deploymentTxId: deployTxId,
    deploymentTxHash: deployTxHash ?? null,
    deploymentBlockHeight: deployBlockHeight ?? null,
    deploymentStatus: deployStatus,
    deployedAt,
    smokeInteraction: {
      circuit: 'issueCredential',
      txHash: smokeTx.public.txHash,
      blockHeight: smokeTx.public.blockHeight,
      totalCredentialsIssued: String(issuedCount),
    },
    deployerUnshieldedAddress: unshieldedAddress,
    endpoints: { rpc: envConfig.node, indexer: envConfig.indexer, faucet: envConfig.faucet, proofServer: envConfig.proofServer },
    compact: infoVersions(),
  };
  fs.mkdirSync(path.resolve(rootDir, 'docs'), { recursive: true });
  fs.writeFileSync(path.resolve(rootDir, 'docs/deployment-preview.json'), JSON.stringify(record, null, 2));
  logger.info(`Wrote docs/deployment-preview.json`);

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
  console.log('🎉 VERICRED CAC DEPLOYED ON MIDNIGHT PREVIEW');
  console.log('============================================================');
  console.log(`📍 Contract Address: ${contractAddress}`);
  console.log(`🧾 Deployment TX:    ${deployTxId} (hash ${deployTxHash ?? 'n/a'}, block ${deployBlockHeight ?? 'n/a'})`);
  console.log(`🔥 Smoke TX:         ${smokeTx.public.txHash} (issueCredential, block #${smokeTx.public.blockHeight})`);
  console.log(`👤 Deployer:         ${unshieldedAddress}`);
  console.log(`🕒 Deployed at:      ${deployedAt}`);
  console.log('============================================================\n');

  await walletProvider.stop().catch(() => {});
  process.exit(0);
}

function infoVersions(): Record<string, string> {
  try {
    const info = JSON.parse(
      fs.readFileSync(path.resolve(rootDir, 'contract/src/managed/cac/compiler/contract-info.json'), 'utf8'),
    );
    return {
      compiler: String(info['compiler-version']),
      language: String(info['language-version']),
      runtime: String(info['runtime-version']),
    };
  } catch {
    return { compiler: 'unknown' };
  }
}

main().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
