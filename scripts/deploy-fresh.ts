import { pino } from 'pino';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { MidnightWalletProvider } from '../vericred-cli/src/midnight-wallet-provider.js';
import { getInitialUnshieldedState } from '../vericred-cli/src/wallet-utils.js';
import { UnshieldedAddress } from '@midnight-ntwrk/wallet-sdk-address-format';
import { unshieldedToken } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { type EnvironmentConfiguration } from '@midnight-ntwrk/testkit-js';
import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import { CompiledCacContractContract } from '../contract/src/index.js';
import { createCacPrivateState } from '../contract/src/cac-witnesses.js';
import { cacPrivateStateKey } from '../api/src/cac-types.js';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { u8aToHex } from '@polkadot/util';
import { randomBytes } from 'crypto';
import * as Rx from 'rxjs';
import fs from 'fs';
import path from 'path';

setNetworkId('preprod');

const logger = pino({
  level: 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true },
  },
});

async function main() {
  console.log('\n============================================================');
  console.log('🚀 MIDNIGHT PREPROD SMART CONTRACT DEPLOYMENT (Fresh Wallet)');
  console.log('============================================================\n');

  const rootDir = process.cwd();
  const uiEnvPreprod = path.resolve(rootDir, 'vericred-ui/.env.preprod');

  // Generate a clean 32-byte seed
  const seed = randomBytes(32).toString('hex');
  logger.info(`Generated fresh deployer seed: ${seed}`);

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

  logger.info('Connecting to Midnight Preprod Polkadot RPC...');
  const polkadotProvider = new WsProvider('wss://rpc.preprod.midnight.network');
  const polkadotApi = await ApiPromise.create({ provider: polkadotProvider });
  await polkadotApi.isReady;

  const walletProvider = await MidnightWalletProvider.build(logger, envConfig, seed);

  // Override submitTx with direct Polkadot RPC extrinsic submission
  walletProvider.submitTx = async (tx: any): Promise<string> => {
    const txHex = u8aToHex(tx.serialize());
    logger.info('Submitting transaction to Midnight RPC...');
    return new Promise<string>((resolve, reject) => {
      polkadotApi.tx.midnight.sendMnTransaction(txHex).send((result) => {
        logger.info(`Transaction status: ${result.status.type}`);
        if (result.status.isInBlock || result.status.isFinalized) {
          logger.info(`Transaction finalized in block with hash: ${result.txHash.toHex()}`);
          resolve(result.txHash.toHex());
        }
        if (result.isError) {
          reject(new Error('Transaction submission failed on node'));
        }
      }).catch(reject);
    });
  };

  await walletProvider.start();

  try {
    const initialState = await getInitialUnshieldedState(logger, walletProvider.wallet.unshielded);
    const unshieldedAddress = UnshieldedAddress.codec.encode('preprod', initialState.address);
    const token = unshieldedToken();

    console.log('\n============================================================');
    console.log(`📍 FRESH DEPLOYER ADDRESS:`);
    console.log(`   ${unshieldedAddress.toString()}`);
    console.log(`💧 Faucet Link: https://midnight-tmnight-preprod.nethermind.dev/`);
    console.log('============================================================\n');

    console.log('⏳ Waiting for testnet tokens from faucet (polling balance)...');

    const unshieldedState = await Rx.firstValueFrom(
      walletProvider.wallet.unshielded.state.pipe(
        Rx.filter((s) => s.balances[token.raw] !== undefined && s.balances[token.raw] > 0n),
      ),
    );

    const balance = unshieldedState.balances[token.raw] ?? 0n;
    console.log(`\n🎉 Funds received! Balance: ${balance.toString()} tNIGHT\n`);

    const dustState = await Rx.firstValueFrom(walletProvider.wallet.dust.state);
    const utxos = unshieldedState.availableCoins.filter((coin) => !coin.meta.registeredForDustGeneration);

    logger.info(`Registering ${utxos.length} UTXO for DUST generation in current session...`);
    const recipe = await walletProvider.wallet.registerNightUtxosForDustGeneration(
      utxos,
      walletProvider.unshieldedKeystore.getPublicKey(),
      (payload) => walletProvider.unshieldedKeystore.signData(payload),
      dustState.address,
    );
    const signedRecipe = await walletProvider.wallet.signRecipe(recipe, (payload) =>
      walletProvider.unshieldedKeystore.signData(payload)
    );
    const finalizeTx = await walletProvider.wallet.finalizeRecipe(signedRecipe);
    const txHex = u8aToHex(finalizeTx.serialize());

    logger.info('Submitting DUST registration extrinsic to Midnight Preprod...');
    await new Promise<void>((resolve, reject) => {
      polkadotApi.tx.midnight.sendMnTransaction(txHex).send((res) => {
        logger.info(`DUST registration status: ${res.status.type}`);
        if (res.status.isInBlock || res.status.isFinalized) {
          resolve();
        }
        if (res.isError) {
          reject(new Error('DUST registration failed'));
        }
      }).catch(reject);
    });

    logger.info('Waiting 15s for DUST registration to confirm on-chain...');
    await new Promise((res) => setTimeout(res, 15000));

    const zkConfigPath = path.resolve(rootDir, 'contract/src/managed/cac');
    const privateStateStorePath = path.resolve(rootDir, `preprod-state-${seed.slice(0, 8)}`);
    const zkConfigProvider = new NodeZkConfigProvider<any>(zkConfigPath);

    const providers = {
      privateStateProvider: levelPrivateStateProvider({
        privateStateStoreName: privateStateStorePath,
        signingKeyStoreName: `${privateStateStorePath}-signing-keys`,
        privateStoragePasswordProvider: () => 'VeriCred-CAC-Preprod-2026-Super-Secret!',
        accountId: seed,
      }),
      publicDataProvider: indexerPublicDataProvider(envConfig.indexer, envConfig.indexerWS),
      zkConfigProvider,
      proofProvider: httpClientProofProvider(envConfig.proofServer, zkConfigProvider),
      walletProvider,
      midnightProvider: walletProvider,
    };

    logger.info('Submitting VeriCred CAC smart contract deployment to Midnight Preprod...');
    
    // Deploy CAC contract with initial private state (witnesses)
    const initialPrivateState = createCacPrivateState(
      randomBytes(32),
      385,
      randomBytes(32)
    );

    const deployedCacContract = await deployContract(providers as any, {
      compiledContract: CompiledCacContractContract,
      privateStateId: cacPrivateStateKey,
      initialPrivateState,
    });

    const deployedAddress = deployedCacContract.deployTxData.public.contractAddress;

    console.log('\n============================================================');
    console.log('🎉 SMART CONTRACT DEPLOYED ON MIDNIGHT PREPROD!');
    console.log('============================================================');
    console.log(`📍 Deployed Contract Address: ${deployedAddress}`);
    console.log(`🌐 Network: Midnight Preprod`);
    console.log(`🔗 Explorer: https://preprod.midnightexplorer.com/contract/${deployedAddress}`);
    console.log(`👤 Deployer: ${unshieldedAddress.toString()}`);
    console.log('============================================================\n');

    // Update .env with new seed
    const envFile = path.resolve(rootDir, '.env');
    if (fs.existsSync(envFile)) {
      let envContent = fs.readFileSync(envFile, 'utf-8');
      envContent = envContent.replace(/MIDNIGHT_WALLET_SEED=.*/, `MIDNIGHT_WALLET_SEED=${seed}`);
      fs.writeFileSync(envFile, envContent);
    }

    // Update .env.preprod in vericred-ui
    if (fs.existsSync(uiEnvPreprod)) {
      let content = fs.readFileSync(uiEnvPreprod, 'utf-8');
      content = content.replace(/VITE_CONTRACT_ADDRESS=.*/, `VITE_CONTRACT_ADDRESS=${deployedAddress}`);
      content = content.replace(/VITE_DEPLOYER_WALLET_ADDRESS=.*/, `VITE_DEPLOYER_WALLET_ADDRESS=${unshieldedAddress.toString()}`);
      fs.writeFileSync(uiEnvPreprod, content);
      console.log('✅ Updated vericred-ui/.env.preprod with new contract address.');
    }

    // Update contract-client placeholder
    const clientFile = path.resolve(rootDir, 'vericred-ui/src/lib/contract-client.ts');
    if (fs.existsSync(clientFile)) {
      let clientContent = fs.readFileSync(clientFile, 'utf-8');
      clientContent = clientContent.replace(
        /export const CONTRACT_ADDRESS_PLACEHOLDER = '[^']+';/,
        `export const CONTRACT_ADDRESS_PLACEHOLDER = '${deployedAddress}';`
      );
      fs.writeFileSync(clientFile, clientContent);
      console.log('✅ Updated contract-client.ts placeholder address.');
    }

    // Update useWalletStore default contract address
    const walletStoreFile = path.resolve(rootDir, 'vericred-ui/src/store/useWalletStore.ts');
    if (fs.existsSync(walletStoreFile)) {
      let storeContent = fs.readFileSync(walletStoreFile, 'utf-8');
      storeContent = storeContent.replace(
        /contractAddress: '[^']+',/,
        `contractAddress: '${deployedAddress}',`
      );
      fs.writeFileSync(walletStoreFile, storeContent);
      console.log('✅ Updated useWalletStore.ts default contract address.');
    }

    // Update README.md
    const readmeFile = path.resolve(rootDir, 'README.md');
    if (fs.existsSync(readmeFile)) {
      let readme = fs.readFileSync(readmeFile, 'utf-8');
      readme = readme.replace(/https:\/\/preprod\.midnightexplorer\.com\/contract\/[a-f0-9]+/g, `https://preprod.midnightexplorer.com/contract/${deployedAddress}`);
      fs.writeFileSync(readmeFile, readme);
      console.log('✅ Updated README.md with new contract explorer link.');
    }

    // Rebuild UI dist
    console.log('🔄 Rebuilding UI distribution bundle with updated contract address...');
    const { execSync } = await import('child_process');
    execSync('npm --prefix vericred-ui run build', { stdio: 'inherit' });
    console.log('✅ UI production build ready.');

  } catch (err: any) {
    console.error('\n❌ Deployment transaction error:', err?.message || err);
  } finally {
    await polkadotApi.disconnect().catch(() => {});
    await walletProvider.stop().catch(() => {});
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('❌ Deployment error:', err);
  process.exit(1);
});
