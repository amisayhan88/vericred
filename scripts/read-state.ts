/**
 * Public ledger-state reader — reads a deployed VeriCred CAC contract's on-chain
 * state straight from a Midnight network, decoded with the compiled contract module.
 * No wallet, no private state, no proving: a reviewer can reproduce every number
 * the README quotes for On-Chain Deployment.
 *
 * Usage:  npx tsx scripts/read-state.ts <preview|preprod> <contract-address-hex>
 *   npm run read:state -- preview e71bf7d73babb895c4524deebcec7fd2ef2a9590854770732492598c91e99df1
 */
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { CacCompiled, CredentialStatus } from '../contract/src/index.js';
import * as Rx from 'rxjs';

const [network, address] = process.argv.slice(2);
if (network !== 'preview' && network !== 'preprod') {
  console.error('usage: npx tsx scripts/read-state.ts <preview|preprod> <contract-address>');
  process.exit(1);
}
if (!address || !/^[0-9a-f]{64}$/i.test(address)) {
  console.error('contract address must be 64 hex chars');
  process.exit(1);
}

setNetworkId(network);
const pdp = indexerPublicDataProvider(
  `https://indexer.${network}.midnight.network/api/v4/graphql`,
  `wss://indexer.${network}.midnight.network/api/v4/graphql/ws`,
);

const ledger = await Rx.firstValueFrom(
  pdp.contractStateObservable(address, { type: 'latest' }).pipe(
    Rx.map((cs) => CacCompiled.ledger(cs.data)),
    Rx.take(1),
    Rx.timeout({
      first: 45_000,
      with: () => Rx.throwError(() => new Error(`no contract state for ${address} on ${network} within 45s`)),
    }),
  ),
);

const statusName = (s: CredentialStatus) => CredentialStatus[s];
const hex = (b: Uint8Array) => Buffer.from(b).toString('hex');

const entries: string[] = [];
for (const [k, v] of ledger.credentialStatus as unknown as Iterable<[Uint8Array, CredentialStatus]>) {
  entries.push(`  0x${hex(k)}  ${statusName(v)}`);
}

console.log(`Network                : Midnight ${network}`);
console.log(`Contract               : ${address}`);
console.log(`totalCredentialsIssued : ${ledger.totalCredentialsIssued}`);
console.log(`institutionOwner       : 0x${hex(ledger.institutionOwner)}`);
console.log(`credentialStatus       : ${ledger.credentialStatus.size()} entr${ledger.credentialStatus.size() === 1n ? 'y' : 'ies'}`);
console.log(entries.join('\n') || '  (none)');
