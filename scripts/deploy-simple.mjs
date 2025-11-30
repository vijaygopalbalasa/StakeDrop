/**
 * Simple StakeDrop Pool Deployment Script
 * Deploys the pool contract to Cardano Preview testnet
 */

import {
  BlockfrostProvider,
  MeshWallet,
  Transaction,
  serializePlutusScript,
  resolvePaymentKeyHash,
} from '@meshsdk/core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const BLOCKFROST_API_KEY = 'previews3K87dO1HJih9spuT5I3OsaEH6839VPP';
const WALLET_MNEMONIC = 'rebuild tumble coil scatter palm embody merit betray cash inform fantasy used urban economy visa inflict magic dog innocent reason hill close laugh alpha';

// Load the compiled validator from plutus.json
function loadValidator() {
  const blueprintPath = path.join(__dirname, '../contracts/cardano/plutus.json');
  const blueprint = JSON.parse(fs.readFileSync(blueprintPath, 'utf-8'));

  const validator = blueprint.validators.find(v => v.title === 'pool.pool.spend');
  if (!validator) {
    throw new Error('Pool validator not found');
  }

  return {
    code: validator.compiledCode,
    hash: validator.hash,
  };
}

// Create initial pool datum using mConStr format
function createInitialDatum(adminPkh, epochId, epochEndTime) {
  // Simple approach - just send without datum first to initialize
  // The actual pool datum will be created by the first deposit
  return null;
}

async function main() {
  console.log('🚀 StakeDrop Pool Deployment');
  console.log('============================\n');

  // Initialize Blockfrost provider
  const provider = new BlockfrostProvider(BLOCKFROST_API_KEY);

  // Initialize wallet
  console.log('📦 Loading wallet...');
  const wallet = new MeshWallet({
    networkId: 0, // testnet
    fetcher: provider,
    submitter: provider,
    key: {
      type: 'mnemonic',
      words: WALLET_MNEMONIC.split(' '),
    },
  });

  // Get wallet info
  const walletAddress = await wallet.getChangeAddress();
  console.log(`   Address: ${walletAddress}`);

  // Get UTxOs
  const utxos = await wallet.getUtxos();
  console.log(`   UTxOs: ${utxos.length}`);

  if (utxos.length === 0) {
    console.error('❌ No UTxOs found. Get test ADA from faucet.');
    process.exit(1);
  }

  // Calculate balance
  let totalLovelace = BigInt(0);
  for (const utxo of utxos) {
    const lovelace = utxo.output.amount.find(a => a.unit === 'lovelace');
    if (lovelace) {
      totalLovelace += BigInt(lovelace.quantity);
    }
  }
  console.log(`   Balance: ${Number(totalLovelace) / 1_000_000} ADA\n`);

  // Load validator
  console.log('📜 Loading validator...');
  const validator = loadValidator();
  console.log(`   Hash: ${validator.hash}`);

  // Get script address
  const script = {
    code: validator.code,
    version: 'V3',
  };

  const scriptAddress = serializePlutusScript(script, undefined, 0).address;
  console.log(`   Script Address: ${scriptAddress}\n`);

  // Get admin PKH
  const adminPkh = resolvePaymentKeyHash(walletAddress);
  console.log(`   Admin PKH: ${adminPkh}`);

  // Get current epoch
  console.log('\n📅 Fetching epoch info...');
  const latestBlock = await provider.fetchBlockInfo('latest');
  const currentEpoch = latestBlock.epoch || 100;
  const epochEndTime = Date.now() + (5 * 24 * 60 * 60 * 1000); // 5 days from now
  console.log(`   Current Epoch: ${currentEpoch}`);
  console.log(`   Pool Epoch End: ${new Date(epochEndTime).toISOString()}`);

  // Create initial datum
  console.log('\n📝 Creating initial datum...');
  const datum = createInitialDatum(adminPkh, currentEpoch, epochEndTime);

  // Build transaction
  console.log('\n🔨 Building transaction...');
  const tx = new Transaction({ initiator: wallet });

  // For initial deployment, just send ADA to the script address
  // This creates the script address on-chain
  // The actual pool UTxO with datum will be created by the first deposit
  tx.sendLovelace(scriptAddress, '5000000'); // 5 ADA

  // Add metadata
  tx.setMetadata(674, {
    msg: ['StakeDrop Pool Initialization'],
    epoch: currentEpoch,
    admin: adminPkh.slice(0, 32),
  });

  // Build, sign, submit
  console.log('\n✍️  Signing transaction...');
  const unsignedTx = await tx.build();
  const signedTx = await wallet.signTx(unsignedTx);

  console.log('📤 Submitting transaction...');
  const txHash = await wallet.submitTx(signedTx);

  console.log('\n✅ Pool deployed successfully!');
  console.log('================================');
  console.log(`Transaction Hash: ${txHash}`);
  console.log(`Script Address: ${scriptAddress}`);
  console.log(`Validator Hash: ${validator.hash}`);
  console.log(`Admin Address: ${walletAddress}`);
  console.log(`\nExplorer: https://preview.cardanoscan.io/transaction/${txHash}`);

  // Save deployment info
  const deploymentInfo = {
    network: 'preview',
    txHash,
    scriptAddress,
    validatorHash: validator.hash,
    adminAddress: walletAddress,
    adminPkh,
    epochId: currentEpoch,
    epochEnd: epochEndTime,
    deployedAt: new Date().toISOString(),
  };

  const deploymentPath = path.join(__dirname, '../deployment-info.json');
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\nDeployment info saved to: ${deploymentPath}`);

  // Output env vars
  console.log('\n📋 Add to frontend/.env.local:');
  console.log('--------------------------------');
  console.log(`NEXT_PUBLIC_POOL_SCRIPT_ADDRESS_PREVIEW=${scriptAddress}`);
  console.log(`NEXT_PUBLIC_POOL_VALIDATOR_HASH=${validator.hash}`);
  console.log(`NEXT_PUBLIC_ADMIN_ADDRESS=${walletAddress}`);
}

main().catch(err => {
  console.error('\n❌ Deployment failed:', err.message);
  console.error(err);
  process.exit(1);
});
