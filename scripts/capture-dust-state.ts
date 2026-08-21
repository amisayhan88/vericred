/**
 * PHASE 1: Capture DUST wallet state checkpoint near chain tip.
 * Run this once. It starts the wallet, waits for the first event batch
 * to learn the chain tip (maxId), then serializes the EMPTY wallet state
 * with offset=maxId so next run can skip all historical events.
 *
 * Usage: NODE_OPTIONS='--max-old-space-size=8192' npx tsx scripts/capture-dust-state.ts
 */
import { pino } from 'pino';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { MidnightWalletProvider } from '../vericred-cli/src/midnight-wallet-provider.js';
import { type EnvironmentConfiguration } from '@midnight-ntwrk/testkit-js';
import { LedgerParameters } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import * as Rx from 'rxjs';
import fs from 'fs';
import path from 'path';

setNetworkId('preprod');

const logger = pino({
  level: 'info',
  transport: { target: 'pino-pretty', options: { colorize: true } },
});

const seed = 'c50e1a7e274be3556db4922592e348408e96b9f3eb35414bed30745a1ef2b470';
const CHECKPOINT_FILE = path.resolve(process.cwd(), 'dust-checkpoint.json');

const envConfig: EnvironmentConfiguration = {
  walletNetworkId: 'preprod',
  networkId: 'preprod',
  indexer: 'https://indexer.preprod.midnight.network/api/v4/graphql',
  indexerWS: 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws',
  node: 'https://rpc.preprod.midnight.network',
  nodeWS: 'wss://rpc.preprod.midnight.network',
  faucet: 'https://midnight-tmnight-preprod.nethermind.dev/',
  proofServer: 'http://localhost:6300',
};

async function main() {
  logger.info('=== Phase 1: Capturing DUST wallet checkpoint near chain tip ===');
  logger.info('Building wallet (without starting sync)...');
  
  const walletProvider = await MidnightWalletProvider.build(logger, envConfig, seed);
  
  logger.info('Starting wallet to get first event batch...');
  await walletProvider.start();

  logger.info('Waiting for first event batch from indexer (to learn chain tip maxId)...');

  // Wait until highestRelevantWalletIndex > 0 — this happens after the first event batch arrives
  // which gives us the maxId = total DUST events on chain
  const firstSyncedState = await Rx.firstValueFrom(
    walletProvider.wallet.dust.state.pipe(
      Rx.filter((s) => s.progress.highestRelevantWalletIndex > 0n),
      Rx.timeout({ each: 30000, with: () => Rx.throwError(() => new Error('Timeout waiting for first event batch')) }),
    ),
  );

  const maxId = firstSyncedState.progress.highestRelevantWalletIndex;
  const appliedIndex = firstSyncedState.progress.appliedIndex;
  logger.info(`Chain tip maxId: ${maxId}, current appliedIndex: ${appliedIndex}`);

  // Serialize the current wallet state (empty DUST state with current offset)
  logger.info('Serializing wallet state...');
  const serialized = await walletProvider.wallet.dust.serializeState();
  
  // Parse and patch the offset to near chain tip (maxId - 10)
  const stateJson = JSON.parse(serialized);
  const targetOffset = (maxId - 10n).toString();
  stateJson.offset = targetOffset;
  
  const patched = JSON.stringify(stateJson);
  fs.writeFileSync(CHECKPOINT_FILE, patched);
  
  logger.info(`✅ Checkpoint saved to ${CHECKPOINT_FILE}`);
  logger.info(`   Original offset: ${stateJson.offset} -> Patched offset: ${targetOffset}`);
  logger.info(`   Chain tip: ${maxId}`);
  logger.info('');
  logger.info('Now run: npm run deploy:preprod');
  logger.info('The deployment will restore from checkpoint and sync only ~10 events.');

  await walletProvider.stop().catch(() => {});
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
