#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as bip39 from 'bip39';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Import wallet from Lace mnemonic phrase
 * Converts mnemonic to seed using BIP39 and creates wallet
 */
class MnemonicImporter {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..', '..');
    this.envPath = path.join(this.projectRoot, '.env');
  }

  /**
   * Convert mnemonic to seed using BIP39
   * Returns a 64-byte hex seed for Midnight wallet
   */
  mnemonicToSeed(mnemonic) {
    // Normalize the mnemonic
    const normalized = mnemonic.trim().toLowerCase().split(/\s+/).join(' ');

    // Validate mnemonic
    if (!bip39.validateMnemonic(normalized)) {
      throw new Error('Invalid mnemonic phrase');
    }

    // Convert to seed (returns Buffer)
    const seedBuffer = bip39.mnemonicToSeedSync(normalized);
    // Return first 32 bytes as hex (64 chars)
    return seedBuffer.slice(0, 32).toString('hex');
  }

  /**
   * Create wallet instance to get the testnet address
   */
  async createWalletForAddress(seed) {
    try {
      const { WalletBuilder } = await import('@midnight-ntwrk/wallet');
      const { getZswapNetworkId, setNetworkId, NetworkId } = await import('@midnight-ntwrk/midnight-js-network-id');

      setNetworkId(NetworkId.TestNet);

      const indexer = 'https://indexer.testnet-02.midnight.network/api/v1/graphql';
      const indexerWS = 'wss://indexer.testnet-02.midnight.network/api/v1/graphql/ws';
      const node = 'https://rpc.testnet-02.midnight.network';
      const proofServer = 'http://127.0.0.1:6300';

      console.log('🔗 Creating testnet wallet to get address...');

      const wallet = await WalletBuilder.buildFromSeed(
        indexer,
        indexerWS,
        proofServer,
        node,
        seed,
        getZswapNetworkId(),
        'info'
      );

      wallet.start();

      const { firstValueFrom } = await import('rxjs');
      await new Promise(resolve => setTimeout(resolve, 2000));

      const state = await firstValueFrom(wallet.state());
      const address = state.address;

      await wallet.close();

      return address;
    } catch (error) {
      console.warn('⚠️  Could not create wallet:', error.message);
      return null;
    }
  }

  /**
   * Update .env file
   */
  updateEnvFile(seed, address = null) {
    let envContent = `# Midnight Testnet Configuration
# Imported from Lace wallet mnemonic
WALLET_SEED=${seed}`;

    if (address) {
      envContent += `
WALLET_ADDRESS=${address}`;
    }

    fs.writeFileSync(this.envPath, envContent);
  }

  async import(mnemonic) {
    try {
      console.log('🌙 Midnight Wallet Mnemonic Importer\n');

      // Convert mnemonic to seed
      console.log('🔐 Converting mnemonic to seed...');
      const seed = this.mnemonicToSeed(mnemonic);
      console.log(`💰 Seed: ${seed}\n`);

      // Get wallet address
      const address = await this.createWalletForAddress(seed);

      if (address) {
        console.log('🏠 Wallet address:');
        console.log(`📍 Address: ${address}\n`);
      }

      this.updateEnvFile(seed, address);

      console.log('✅ Wallet imported successfully!');
      console.log('💡 Seed and address saved to .env file');

      return { seed, address };
    } catch (error) {
      console.error('❌ Import failed:', error.message);
      process.exit(1);
    }
  }
}

// Get mnemonic from command line or environment
const mnemonic = process.argv.slice(2).join(' ') || process.env.MNEMONIC;

if (!mnemonic) {
  console.log('Usage: node import-mnemonic.js <mnemonic words>');
  process.exit(1);
}

const importer = new MnemonicImporter();
importer.import(mnemonic).catch(console.error);
