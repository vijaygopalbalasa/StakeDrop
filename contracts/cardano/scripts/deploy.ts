/**
 * StakeDrop Pool Deployment Script
 *
 * Deploys the StakeDrop pool validator to Cardano testnet/mainnet.
 *
 * Prerequisites:
 * - BLOCKFROST_PROJECT_ID environment variable
 * - ADMIN_MNEMONIC environment variable (24-word seed phrase)
 * - CARDANO_NETWORK environment variable (preview/preprod/mainnet)
 *
 * Usage:
 *   npx ts-node scripts/deploy.ts
 */

import {
  BlockfrostProvider,
  MeshWallet,
  Transaction,
  resolvePaymentKeyHash,
  serializePlutusScript,
  resolveScriptHash,
} from '@meshsdk/core';
import * as fs from 'fs';
import * as path from 'path';

// Configuration from environment
const NETWORK = process.env.CARDANO_NETWORK || 'preview';
const BLOCKFROST_KEY = process.env.BLOCKFROST_PROJECT_ID;
const ADMIN_MNEMONIC = process.env.ADMIN_MNEMONIC;

// Validate environment
if (!BLOCKFROST_KEY) {
  console.error('Error: BLOCKFROST_PROJECT_ID environment variable is required');
  process.exit(1);
}

if (!ADMIN_MNEMONIC) {
  console.error('Error: ADMIN_MNEMONIC environment variable is required');
  process.exit(1);
}

// Network configuration
const NETWORK_IDS: Record<string, number> = {
  mainnet: 1,
  preview: 0,
  preprod: 0,
};

const BLOCKFROST_URLS: Record<string, string> = {
  mainnet: 'https://cardano-mainnet.blockfrost.io/api',
  preview: 'https://cardano-preview.blockfrost.io/api',
  preprod: 'https://cardano-preprod.blockfrost.io/api',
};

/**
 * Encode PoolDatum to Plutus Data format
 * Matches the Aiken contract structure exactly
 */
function encodeDatum(datum: {
  admin: string;
  epochId: number;
  epochEnd: number;
  totalDeposited: number;
  participantCount: number;
  midnightRoot: string;
  status: number;
  stakePoolId: string;
  yieldAmount: number;
  winnerCommitment: string;
  withdrawalCount: number;
  winnerWithdrawn: boolean;
  withdrawnCommitments: string[];
}): object {
  // Status as constructor (0=Collecting, 1=Staking, 2=Distributing, 3=Completed)
  const statusData = {
    alternative: datum.status,
    fields: [],
  };

  // PoolDatum as constructor index 0 with 13 fields
  return {
    constructor: 0,
    fields: [
      datum.admin, // admin: VerificationKeyHash (bytes)
      datum.epochId, // epoch_id: Int
      datum.epochEnd, // epoch_end: Int
      datum.totalDeposited, // total_deposited: Int
      datum.participantCount, // participant_count: Int
      datum.midnightRoot, // midnight_root: ByteArray
      statusData, // status: PoolStatus (constructor)
      datum.stakePoolId, // stake_pool_id: ByteArray
      datum.yieldAmount, // yield_amount: Int
      datum.winnerCommitment, // winner_commitment: ByteArray
      datum.withdrawalCount, // withdrawal_count: Int
      datum.winnerWithdrawn ? 1 : 0, // winner_withdrawn: Bool (as int for Plutus)
      datum.withdrawnCommitments, // withdrawn_commitments: List<ByteArray>
    ],
  };
}

async function deployPool() {
  console.log('='.repeat(60));
  console.log('StakeDrop Pool Deployment');
  console.log('='.repeat(60));
  console.log(`Network: ${NETWORK}`);
  console.log(`Blockfrost URL: ${BLOCKFROST_URLS[NETWORK]}`);
  console.log('');

  // 1. Setup provider and wallet
  console.log('1. Setting up provider and wallet...');
  const provider = new BlockfrostProvider(BLOCKFROST_KEY!);

  const wallet = new MeshWallet({
    networkId: NETWORK_IDS[NETWORK],
    fetcher: provider,
    submitter: provider,
    key: {
      type: 'mnemonic',
      words: ADMIN_MNEMONIC!.split(' '),
    },
  });

  const adminAddress = await wallet.getUsedAddresses();
  if (adminAddress.length === 0) {
    console.error('Error: Wallet has no addresses. Make sure the mnemonic is correct.');
    process.exit(1);
  }

  const adminPkh = resolvePaymentKeyHash(adminAddress[0]);
  console.log(`   Admin address: ${adminAddress[0]}`);
  console.log(`   Admin PKH: ${adminPkh}`);

  // Check wallet balance
  const utxos = await wallet.getUtxos();
  const totalLovelace = utxos.reduce((sum, utxo) => {
    const lovelace = utxo.output.amount.find((a) => a.unit === 'lovelace');
    return sum + BigInt(lovelace?.quantity || 0);
  }, BigInt(0));

  console.log(`   Wallet balance: ${Number(totalLovelace) / 1_000_000} ADA`);

  if (totalLovelace < BigInt(10_000_000)) {
    console.error('Error: Insufficient funds. Need at least 10 ADA for deployment.');
    process.exit(1);
  }

  // 2. Load compiled validator
  console.log('\n2. Loading compiled validator...');
  const plutusJsonPath = path.join(__dirname, '..', 'plutus.json');

  if (!fs.existsSync(plutusJsonPath)) {
    console.error(`Error: plutus.json not found at ${plutusJsonPath}`);
    console.error('Run "aiken build" first to compile the contract.');
    process.exit(1);
  }

  const plutusJson = JSON.parse(fs.readFileSync(plutusJsonPath, 'utf8'));
  const validator = plutusJson.validators.find(
    (v: { title: string }) => v.title === 'pool.pool.spend'
  );

  if (!validator) {
    console.error('Error: pool.pool.spend validator not found in plutus.json');
    process.exit(1);
  }

  console.log(`   Validator hash: ${validator.hash}`);
  console.log(`   Compiled code size: ${validator.compiledCode.length} chars`);

  // 3. Create script address
  console.log('\n3. Creating script address...');
  const script = {
    code: validator.compiledCode,
    version: 'V3' as const,
  };

  const scriptAddress = serializePlutusScript(script, undefined, NETWORK_IDS[NETWORK]).address;
  console.log(`   Script address: ${scriptAddress}`);

  // 4. Calculate epoch parameters
  console.log('\n4. Calculating epoch parameters...');
  const now = Date.now();
  const epochDurationDays = 7; // 1 week epochs
  const epochEnd = now + epochDurationDays * 24 * 60 * 60 * 1000;

  // Use a simple incrementing epoch ID based on time
  const epochId = Math.floor(now / (7 * 24 * 60 * 60 * 1000));

  console.log(`   Epoch ID: ${epochId}`);
  console.log(`   Epoch End: ${new Date(epochEnd).toISOString()}`);

  // 5. Create initial datum
  console.log('\n5. Creating initial datum...');
  const initialDatum = {
    admin: adminPkh,
    epochId: epochId,
    epochEnd: epochEnd,
    totalDeposited: 0,
    participantCount: 0,
    midnightRoot: '00'.repeat(32), // 32 zero bytes
    status: 0, // Collecting
    stakePoolId: '00'.repeat(28), // 28 zero bytes (pool ID placeholder)
    yieldAmount: 0,
    winnerCommitment: '00'.repeat(32), // 32 zero bytes
    withdrawalCount: 0,
    winnerWithdrawn: false,
    withdrawnCommitments: [], // Empty list for PHASE 1.3
  };

  console.log('   Initial datum:', JSON.stringify(initialDatum, null, 2));

  // 6. Build and submit transaction
  console.log('\n6. Building deployment transaction...');
  const tx = new Transaction({ initiator: wallet });

  // Send initial funds to script address with datum
  tx.sendLovelace(
    {
      address: scriptAddress,
      datum: {
        value: encodeDatum(initialDatum),
        inline: true,
      },
    },
    '5000000' // 5 ADA initial deposit
  );

  const unsignedTx = await tx.build();
  console.log('   Transaction built successfully');

  console.log('\n7. Signing transaction...');
  const signedTx = await wallet.signTx(unsignedTx);
  console.log('   Transaction signed');

  console.log('\n8. Submitting transaction...');
  const txHash = await wallet.submitTx(signedTx);
  console.log(`   Transaction submitted!`);
  console.log(`   TX Hash: ${txHash}`);

  // 7. Save deployment info
  console.log('\n9. Saving deployment info...');
  const deploymentInfo = {
    network: NETWORK,
    txHash,
    validatorHash: validator.hash,
    scriptAddress,
    adminAddress: adminAddress[0],
    adminPkh,
    deployedAt: new Date().toISOString(),
    epochId,
    epochEnd,
    initialDeposit: '5000000',
    contractVersion: plutusJson.preamble.version,
    plutusVersion: plutusJson.preamble.plutusVersion,
  };

  const deploymentPath = path.join(__dirname, '..', 'deployment.json');
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`   Saved to: ${deploymentPath}`);

  // 8. Print summary
  console.log('\n' + '='.repeat(60));
  console.log('DEPLOYMENT SUCCESSFUL!');
  console.log('='.repeat(60));
  console.log(`
Network:          ${NETWORK}
Transaction Hash: ${txHash}
Validator Hash:   ${validator.hash}
Script Address:   ${scriptAddress}
Admin Address:    ${adminAddress[0]}
Epoch ID:         ${epochId}
Epoch End:        ${new Date(epochEnd).toISOString()}

View on Explorer:
  https://cardanoscan.io/transaction/${txHash}

Next Steps:
1. Wait for transaction confirmation (~20 seconds on testnet)
2. Update frontend/.env with:
   NEXT_PUBLIC_POOL_VALIDATOR_HASH=${validator.hash}
   NEXT_PUBLIC_POOL_SCRIPT_ADDRESS=${scriptAddress}
3. Test deposit functionality
`);
}

// Run deployment
deployPool().catch((error) => {
  console.error('\nDeployment failed:', error);
  process.exit(1);
});
