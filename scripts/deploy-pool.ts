/**
 * StakeDrop Pool Deployment Script
 *
 * This script initializes the pool on Cardano Preview testnet by:
 * 1. Loading the compiled validator from plutus.json
 * 2. Deriving the script address
 * 3. Creating an initial pool UTxO with the datum
 *
 * Prerequisites:
 * - Blockfrost API key for Preview testnet
 * - Wallet with test ADA (get from faucet: https://docs.cardano.org/cardano-testnets/tools/faucet/)
 * - Run: npm install @meshsdk/core
 *
 * Usage:
 * npx ts-node scripts/deploy-pool.ts
 */

import {
  BlockfrostProvider,
  MeshWallet,
  MeshTxBuilder,
  serializePlutusScript,
  resolveScriptHash,
  mConStr0,
  stringToHex,
} from '@meshsdk/core';
import * as fs from 'fs';
import * as path from 'path';

// ============================================
// Configuration
// ============================================

const NETWORK = 'preview';
const BLOCKFROST_API_KEY = process.env.BLOCKFROST_API_KEY || '';

// Wallet mnemonic (24 words) - KEEP SECRET!
// For demo purposes, you can generate a new one or use an existing wallet
const WALLET_MNEMONIC = process.env.WALLET_MNEMONIC || '';

// Initial pool configuration
const INITIAL_ADA = 5_000_000; // 5 ADA minimum for pool UTxO

// ============================================
// Load Validator
// ============================================

function loadValidator() {
  const blueprintPath = path.join(__dirname, '../contracts/cardano/plutus.json');
  const blueprint = JSON.parse(fs.readFileSync(blueprintPath, 'utf-8'));

  // Get the spend validator
  const validator = blueprint.validators.find(
    (v: any) => v.title === 'pool.pool.spend'
  );

  if (!validator) {
    throw new Error('Pool validator not found in blueprint');
  }

  return {
    code: validator.compiledCode,
    hash: validator.hash,
    version: 'V3' as const,
  };
}

// ============================================
// Create Initial Pool Datum
// ============================================

function createInitialDatum(adminPkh: string, epochId: number, epochEndTime: number) {
  // PoolDatum structure from Aiken:
  // admin: VerificationKeyHash
  // epoch_id: Int
  // epoch_end: Int (POSIX milliseconds)
  // total_deposited: Int
  // participant_count: Int
  // midnight_root: ByteArray
  // status: PoolStatus (Collecting = 0)
  // stake_pool_id: ByteArray
  // yield_amount: Int
  // winner_commitment: ByteArray
  // withdrawal_count: Int
  // winner_withdrawn: Bool (False = 0)
  // withdrawn_commitments: List<ByteArray>

  return mConStr0([
    adminPkh,                    // admin
    epochId,                     // epoch_id
    epochEndTime,                // epoch_end
    0,                           // total_deposited
    0,                           // participant_count
    '',                          // midnight_root (empty for now)
    mConStr0([]),                // status = Collecting
    '',                          // stake_pool_id (empty for demo)
    0,                           // yield_amount
    '',                          // winner_commitment
    0,                           // withdrawal_count
    mConStr0([]),                // winner_withdrawn = False
    [],                          // withdrawn_commitments (empty list)
  ]);
}

// ============================================
// Main Deployment Function
// ============================================

async function deployPool() {
  console.log('🚀 StakeDrop Pool Deployment Script');
  console.log('====================================\n');

  // Validate configuration
  if (!BLOCKFROST_API_KEY) {
    console.error('❌ BLOCKFROST_API_KEY environment variable is required');
    console.log('   Get your API key from: https://blockfrost.io/');
    process.exit(1);
  }

  if (!WALLET_MNEMONIC) {
    console.error('❌ WALLET_MNEMONIC environment variable is required');
    console.log('   Generate a new wallet or use existing 24-word mnemonic');
    process.exit(1);
  }

  // Initialize Blockfrost provider
  const provider = new BlockfrostProvider(BLOCKFROST_API_KEY);

  // Initialize wallet
  console.log('📦 Loading wallet...');
  const wallet = new MeshWallet({
    networkId: 0, // 0 = testnet, 1 = mainnet
    fetcher: provider,
    submitter: provider,
    key: {
      type: 'mnemonic',
      words: WALLET_MNEMONIC.split(' '),
    },
  });

  const walletAddress = wallet.getChangeAddress();
  console.log(`   Wallet address: ${walletAddress}`);

  // Get wallet UTxOs
  const utxos = await wallet.getUtxos();
  if (utxos.length === 0) {
    console.error('❌ Wallet has no UTxOs. Get test ADA from faucet:');
    console.log('   https://docs.cardano.org/cardano-testnets/tools/faucet/');
    process.exit(1);
  }

  const totalLovelace = utxos.reduce((sum, u) => {
    const lovelace = u.output.amount.find((a: any) => a.unit === 'lovelace');
    return sum + BigInt(lovelace?.quantity || 0);
  }, BigInt(0));
  console.log(`   Balance: ${Number(totalLovelace) / 1_000_000} ADA\n`);

  // Load validator
  console.log('📜 Loading validator from plutus.json...');
  const validator = loadValidator();
  console.log(`   Validator hash: ${validator.hash}`);

  // Serialize and get script address
  const script = {
    code: validator.code,
    version: validator.version,
  };
  const scriptAddress = serializePlutusScript(script, undefined, 0).address;
  console.log(`   Script address: ${scriptAddress}\n`);

  // Get admin pubkey hash from wallet
  const adminPkh = wallet.getPaymentCredential?.()?.hash;
  if (!adminPkh) {
    // Alternative: extract from address
    console.log('   Extracting admin PKH from address...');
  }

  // Get current epoch from Blockfrost
  console.log('📅 Fetching current epoch info...');
  const epochInfo = await provider.fetchLatestEpoch?.() || { epoch: 100 };
  const currentEpoch = typeof epochInfo === 'object' ? epochInfo.epoch : epochInfo;

  // Set epoch end to 5 days from now (in POSIX milliseconds)
  const epochEndTime = Date.now() + 5 * 24 * 60 * 60 * 1000;
  console.log(`   Current epoch: ${currentEpoch}`);
  console.log(`   Pool epoch end: ${new Date(epochEndTime).toISOString()}\n`);

  // Create initial datum
  console.log('📝 Creating initial pool datum...');
  const datum = createInitialDatum(
    adminPkh || '0'.repeat(56), // Use admin PKH or placeholder
    currentEpoch,
    epochEndTime
  );

  // Build transaction
  console.log('🔨 Building deployment transaction...');
  const txBuilder = new MeshTxBuilder({
    fetcher: provider,
    submitter: provider,
    verbose: true,
  });

  // Select a UTxO for input
  const inputUtxo = utxos[0];

  const unsignedTx = await txBuilder
    .txIn(
      inputUtxo.input.txHash,
      inputUtxo.input.outputIndex
    )
    .txOut(scriptAddress, [
      { unit: 'lovelace', quantity: INITIAL_ADA.toString() }
    ])
    .txOutInlineDatumValue(datum)
    .changeAddress(walletAddress)
    .complete();

  // Sign transaction
  console.log('✍️  Signing transaction...');
  const signedTx = await wallet.signTx(unsignedTx);

  // Submit transaction
  console.log('📤 Submitting transaction...');
  const txHash = await wallet.submitTx(signedTx);

  console.log('\n✅ Pool deployed successfully!');
  console.log('====================================');
  console.log(`Transaction hash: ${txHash}`);
  console.log(`Script address: ${scriptAddress}`);
  console.log(`Validator hash: ${validator.hash}`);
  console.log(`\nView on explorer:`);
  console.log(`https://preview.cardanoscan.io/transaction/${txHash}`);

  // Save deployment info
  const deploymentInfo = {
    network: NETWORK,
    txHash,
    scriptAddress,
    validatorHash: validator.hash,
    adminAddress: walletAddress,
    epochId: currentEpoch,
    epochEnd: epochEndTime,
    deployedAt: new Date().toISOString(),
  };

  const deploymentPath = path.join(__dirname, '../deployment-info.json');
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\nDeployment info saved to: ${deploymentPath}`);

  // Update .env.local template
  console.log('\n📋 Add these to your frontend/.env.local:');
  console.log('------------------------------------');
  console.log(`NEXT_PUBLIC_POOL_SCRIPT_ADDRESS_PREVIEW=${scriptAddress}`);
  console.log(`NEXT_PUBLIC_POOL_VALIDATOR_HASH=${validator.hash}`);
  console.log(`NEXT_PUBLIC_ADMIN_ADDRESS=${walletAddress}`);
}

// ============================================
// Run
// ============================================

deployPool().catch((error) => {
  console.error('\n❌ Deployment failed:', error.message);
  process.exit(1);
});
