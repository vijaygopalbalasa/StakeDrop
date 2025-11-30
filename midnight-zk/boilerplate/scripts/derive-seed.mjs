#!/usr/bin/env node
/**
 * Test different derivation methods to find the correct seed for Lace wallet
 */

import * as bip39 from 'bip39';
import { WalletBuilder } from '@midnight-ntwrk/wallet';
import { getZswapNetworkId, setNetworkId, NetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { firstValueFrom } from 'rxjs';

const mnemonic = 'soccer worth thank detail flight claw describe tent wealth above medal naive praise grab curve song wide monitor point puppy angry option reward wait';
const expectedAddress = 'mn_shield-addr_test12fxztr6pm88rm5367daar6fk98nsxy8ux07fy6gn8ch0trgkswsqxqy5x5qkmslu26laf92eeqp08j80pueuhqsrwv4yx8mg3sjsl5c39su05hn7';

setNetworkId(NetworkId.TestNet);

async function testSeed(seedHex, method) {
  try {
    console.log(`\n--- Testing ${method} ---`);
    console.log(`Seed: ${seedHex}`);

    const wallet = await WalletBuilder.buildFromSeed(
      'https://indexer.testnet-02.midnight.network/api/v1/graphql',
      'wss://indexer.testnet-02.midnight.network/api/v1/graphql/ws',
      'http://127.0.0.1:6300',
      'https://rpc.testnet-02.midnight.network',
      seedHex,
      getZswapNetworkId(),
      'error'
    );

    wallet.start();
    await new Promise(r => setTimeout(r, 2000));

    const state = await firstValueFrom(wallet.state());
    const derivedAddress = state.address;

    console.log(`Derived Address: ${derivedAddress}`);
    console.log(`Expected: ${expectedAddress}`);
    console.log(`Match: ${derivedAddress === expectedAddress ? 'YES!' : 'No'}`);

    await wallet.close();

    return derivedAddress === expectedAddress;
  } catch (e) {
    console.log(`Error: ${e.message}`);
    return false;
  }
}

async function main() {
  console.log('Testing different derivation methods for Lace mnemonic...\n');
  console.log(`Mnemonic: ${mnemonic}`);
  console.log(`Expected Address: ${expectedAddress}\n`);

  // Method 1: mnemonicToEntropy (what the forum post suggested)
  const entropy = bip39.mnemonicToEntropy(mnemonic);
  console.log(`Method 1 - mnemonicToEntropy: ${entropy} (${entropy.length} chars)`);

  // Method 2: mnemonicToSeedSync first 32 bytes (what we were using)
  const seedBuffer = bip39.mnemonicToSeedSync(mnemonic);
  const seed32 = seedBuffer.slice(0, 32).toString('hex');
  console.log(`Method 2 - mnemonicToSeedSync (first 32): ${seed32} (${seed32.length} chars)`);

  // Method 3: mnemonicToSeedSync full 64 bytes as is
  const seed64 = seedBuffer.toString('hex');
  console.log(`Method 3 - mnemonicToSeedSync (full 64): ${seed64.slice(0, 32)}... (${seed64.length} chars)`);

  // Method 4: Different slicing of seed buffer
  const seedLast32 = seedBuffer.slice(32, 64).toString('hex');
  console.log(`Method 4 - mnemonicToSeedSync (last 32): ${seedLast32} (${seedLast32.length} chars)`);

  // Test each method
  let found = false;

  found = await testSeed(entropy, 'mnemonicToEntropy');
  if (found) {
    console.log('\n\nFOUND! Use mnemonicToEntropy');
    process.exit(0);
  }

  found = await testSeed(seed32, 'mnemonicToSeedSync (first 32)');
  if (found) {
    console.log('\n\nFOUND! Use mnemonicToSeedSync (first 32)');
    process.exit(0);
  }

  found = await testSeed(seedLast32, 'mnemonicToSeedSync (last 32)');
  if (found) {
    console.log('\n\nFOUND! Use mnemonicToSeedSync (last 32)');
    process.exit(0);
  }

  console.log('\n\nNone of the standard methods matched.');
  console.log('The Lace wallet likely uses a custom derivation path (CIP-1852 Cardano-style).');
  console.log('We should request new tokens to the SDK-generated address instead.');
}

main().catch(console.error);
