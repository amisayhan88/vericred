/**
 * VeriCred CAC – Midnight Preprod Deployment Script
 *
 * 1. Initializes WalletFacade with Unshielded, Shielded, and Dust wallets.
 * 2. Checks unshielded NIGHT balance (funded with 1,000,000,000 tNIGHT).
 * 3. Registers NIGHT UTXOs for DUST generation if dust balance is 0.
 * 4. Waits for wallet synchronization.
 * 5. Deploys VeriCred CAC contract with zero-knowledge proving.
 * 6. Updates vericred-ui/.env.preprod and contract-client.ts.
 */
import { pino } from 'pino';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { LedgerParameters } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { FluentWalletBuilder, WalletSeeds, type EnvironmentConfiguration, type DustWalletOptions } from '@midnight-ntwrk/testkit-js';
import { createKeystore } from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import { MidnightWalletProvider } from '../vericred-cli/src/midnight-wallet-provider.js';
import { UnshieldedAddress } from '@midnight-ntwrk/wallet-sdk-address-format';
import { unshieldedToken } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { CompiledCacContractContract } from '../contract/src/index.js';
import { createCacPrivateState } from '../contract/src/cac-witnesses.js';
import { cacPrivateStateKey } from '../api/src/cac-types.js';
import { randomBytes } from 'crypto';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { u8aToHex } from '@polkadot/util';
import axios from 'axios';
import * as Rx from 'rxjs';
import fs from 'fs';
import path from 'path';

setNetworkId('preprod');

const logger = pino({
  level: 'info',
  transport: { target: 'pino-pretty', options: { colorize: true } },
});

const seed = 'c50e1a7e274be3556db4922592e348408e96b9f3eb35414bed30745a1ef2b470';
const rootDir = process.cwd();

const envConfig: EnvironmentConfiguration = {
  walletNetworkId: 'preprod',
  networkId: 'preprod',
  indexer: 'https://indexer.preprod.midnight.network/api/v4/graphql',
  indexerWS: 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws',
  node: 'https://rpc.preprod.midnight.network',
  nodeWS: 'wss://rpc.preprod.midnight.network',
  faucet: 'https://midnight-tmnight-preprod.nethermind.dev/',
  proofServer: process.env.PROOF_SERVER_URL || 'http://localhost:6300',
};

const dustOptions: DustWalletOptions = {
  ledgerParams: LedgerParameters.initialParameters(),
  additionalFeeOverhead: 1_000n,
  feeBlocksMargin: 5,
};

async function main() {
  console.log('\n============================================================');
  console.log('🚀 MIDNIGHT PREPROD SMART CONTRACT DEPLOYMENT (VeriCred CAC)');
  console.log('============================================================\n');

  const uiEnvPreprod = path.resolve(rootDir, 'vericred-ui/.env.preprod');

  const seeds = WalletSeeds.fromMasterSeed(seed);
  const keystore = createKeystore(seeds.unshielded, 'preprod');
  const unshieldedAddress = keystore.getBech32Address().asString();
  const token = unshieldedToken();

  console.log(`📍 Deployer Address: ${unshieldedAddress}`);

  logger.info('Building and starting Midnight wallet provider...');
  const walletProvider = await MidnightWalletProvider.build(logger, envConfig, seed);
  await walletProvider.start();
  const wallet = walletProvider.wallet;

  logger.info('Checking unshielded balance...');
  const initialSyncedState = await Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.tap((s) => {
        const bal = s.unshielded.balances[token.raw] ?? 0n;
        logger.info(`Unshielded balance: ${bal.toString()} tNIGHT | Unshielded synced: ${s.unshielded.progress.isStrictlyComplete()}`);
      }),
      Rx.filter((s) => (s.unshielded.balances[token.raw] ?? 0n) > 0n),
    )
  );

  const balance = initialSyncedState.unshielded.balances[token.raw] ?? 0n;
  logger.info(`Confirmed Deployer Balance: ${balance.toString()} tNIGHT`);

  // Check if NIGHT UTXOs need dust registration
  const availableCoins = initialSyncedState.unshielded.availableCoins;
  const unregistered = availableCoins.filter(
    (coin) => coin.utxo.type === token.raw && coin.meta.registeredForDustGeneration === false
  );

  if (unregistered.length > 0) {
    logger.info(`Registering ${unregistered.length} NIGHT UTXO(s) for dust generation...`);
    try {
      const dustState = await Rx.firstValueFrom(wallet.dust.state);
      const recipe = await wallet.registerNightUtxosForDustGeneration(
        unregistered,
        keystore.getPublicKey(),
        (payload) => keystore.signData(payload),
        dustState.address
      );
      const finalized = await wallet.finalizeRecipe(recipe);
      
      const api = await ApiPromise.create({
        provider: new WsProvider(envConfig.nodeWS),
        throwOnConnect: false,
        noInitWarn: true,
      });
      const hex = u8aToHex(finalized.serialize());
      const extrinsic = api.tx.midnight.sendMnTransaction(hex);
      const extrinsicHex = extrinsic.toHex();
      await api.disconnect().catch(() => {});

      const res = await axios.post(envConfig.node, {
        jsonrpc: '2.0',
        method: 'author_submitExtrinsic',
        params: [extrinsicHex],
        id: 1,
      });
      logger.info(`Dust registration transaction submitted via Substrate HTTP RPC: ${res.data?.result || JSON.stringify(res.data)}`);
    } catch (err: any) {
      logger.warn(`Dust registration note: ${err?.message || err}`);
    }
  }

  logger.info('Waiting for DUST sync & balance...');
  let lastProgressLog = 0;
  await Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.tap((state) => {
        const now = Date.now();
        if (now - lastProgressLog > 3000) {
          lastProgressLog = now;
          let dustBal = 0n;
          try {
            dustBal = state.dust.balance(new Date());
          } catch {}
          const dustProg = state.dust.state.progress;
          const applied = Number(dustProg.appliedIndex);
          const highest = Number(dustProg.highestRelevantWalletIndex);
          const pct = highest > 0 ? ((applied / highest) * 100).toFixed(1) : '0';
          logger.info(`Sync Progress: Dust=${pct}% (${applied}/${highest}) [Dust Balance: ${dustBal}]`);
        }
      }),
      Rx.filter((state) => {
        const isDustComplete = state.dust.state.progress.isStrictlyComplete();
        let dustBal = 0n;
        try {
          dustBal = state.dust.balance(new Date());
        } catch {}
        return isDustComplete || (dustBal > 0n && state.dust.state.progress.isConnected);
      }),
    )
  );

  logger.info('🎉 Wallet ready! Starting contract deployment...');

  const zkConfigPath = path.resolve(rootDir, 'contract/src/managed/cac');
  const privateStateStorePath = path.resolve(rootDir, `preprod-state-${seed.slice(0, 8)}`);
  const zkConfigProvider = new NodeZkConfigProvider<any>(zkConfigPath);

  const providers = {
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName: privateStateStorePath,
      signingKeyStoreName: `${privateStateStorePath}-signing-keys`,
      privateStoragePasswordProvider: () => 'VeriCred-CAC-Preprod-2026-Secret!',
      accountId: seed,
    }),
    publicDataProvider: indexerPublicDataProvider(envConfig.indexer, envConfig.indexerWS),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(envConfig.proofServer, zkConfigProvider),
    walletProvider,
    midnightProvider: walletProvider,
  };

  logger.info('Generating zero-knowledge proofs and deploying VeriCred CAC contract...');
  const initialPrivateState = createCacPrivateState(randomBytes(32), 385, randomBytes(32));

  const deployedCacContract = await deployContract(providers as any, {
    compiledContract: CompiledCacContractContract,
    privateStateId: cacPrivateStateKey,
    initialPrivateState,
  });

  const deployedAddress = deployedCacContract.deployTxData.public.contractAddress;

  console.log('\n============================================================');
  console.log('🎉 SMART CONTRACT DEPLOYED ON MIDNIGHT PREPROD!');
  console.log('============================================================');
  console.log(`📍 Contract Address: ${deployedAddress}`);
  console.log(`🔗 Explorer: https://preprod.midnightexplorer.com/contract/${deployedAddress}`);
  console.log(`👤 Deployer: ${unshieldedAddress}`);
  console.log('============================================================\n');

  // Update .env.preprod
  if (fs.existsSync(uiEnvPreprod)) {
    let content = fs.readFileSync(uiEnvPreprod, 'utf-8');
    content = content.replace(/VITE_CONTRACT_ADDRESS=.*/g, `VITE_CONTRACT_ADDRESS=${deployedAddress}`);
    content = content.replace(/VITE_DEPLOYER_WALLET_ADDRESS=.*/g, `VITE_DEPLOYER_WALLET_ADDRESS=${unshieldedAddress}`);
    fs.writeFileSync(uiEnvPreprod, content);
    logger.info('Updated vericred-ui/.env.preprod');
  }

  const clientFile = path.resolve(rootDir, 'vericred-ui/src/lib/contract-client.ts');
  if (fs.existsSync(clientFile)) {
    let content = fs.readFileSync(clientFile, 'utf-8');
    content = content.replace(/CONTRACT_ADDRESS_PLACEHOLDER = '[^']*'/g, `CONTRACT_ADDRESS_PLACEHOLDER = '${deployedAddress}'`);
    fs.writeFileSync(clientFile, content);
    logger.info('Updated contract-client.ts');
  }

  await walletProvider.stop().catch(() => {});
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
