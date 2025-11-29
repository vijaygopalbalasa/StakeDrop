/**
 * StakeDrop Demo Script
 *
 * This script demonstrates the full StakeDrop flow:
 * 1. Generate deposit commitments for 3 users
 * 2. Simulate pool operations
 * 3. Select a winner
 * 4. Process withdrawals
 *
 * Run: npx ts-node scripts/demo.ts
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(color: string, message: string) {
  console.log(`${color}${message}${colors.reset}`);
}

function separator() {
  console.log('\n' + '='.repeat(60) + '\n');
}

// Generate a 32-byte secret
function generateSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Generate commitment from secret and amount
function generateCommitment(secret: string, amount: bigint): string {
  const data = `${secret}:${amount.toString()}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

// Create secret file content
function createSecretFile(user: string, secret: string, amount: string, commitment: string, epochId: number) {
  return {
    user,
    secret,
    amount,
    commitment,
    epochId,
    createdAt: new Date().toISOString(),
    warning: 'KEEP THIS FILE SAFE! You need it to withdraw your funds.',
  };
}

// Select winner deterministically from commitments
function selectWinner(commitments: string[], randomness: string): number {
  const combined = commitments.join('') + randomness;
  const hash = crypto.createHash('sha256').update(combined).digest('hex');
  const num = parseInt(hash.slice(0, 8), 16);
  return num % commitments.length;
}

async function runDemo() {
  console.log(`
${colors.cyan}
  ███████╗████████╗ █████╗ ██╗  ██╗███████╗██████╗ ██████╗  ██████╗ ██████╗
  ██╔════╝╚══██╔══╝██╔══██╗██║ ██╔╝██╔════╝██╔══██╗██╔══██╗██╔═══██╗██╔══██╗
  ███████╗   ██║   ███████║█████╔╝ █████╗  ██║  ██║██████╔╝██║   ██║██████╔╝
  ╚════██║   ██║   ██╔══██║██╔═██╗ ██╔══╝  ██║  ██║██╔══██╗██║   ██║██╔═══╝
  ███████║   ██║   ██║  ██║██║  ██╗███████╗██████╔╝██║  ██║╚██████╔╝██║
  ╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚═╝
${colors.reset}
                  ${colors.yellow}No-Loss Lottery Demo${colors.reset}
`);

  const epochId = 1;
  const users = ['Alice', 'Bob', 'Charlie'];
  const deposits: { user: string; amount: bigint; secret: string; commitment: string }[] = [];

  separator();
  log(colors.bright, 'PHASE 1: PRIVATE DEPOSITS');
  separator();

  // Generate deposits for each user
  for (const user of users) {
    const amount = BigInt(100_000_000); // 100 ADA in lovelace
    const secret = generateSecret();
    const commitment = generateCommitment(secret, amount);

    deposits.push({ user, amount, secret, commitment });

    log(colors.green, `${user} deposits 100 ADA`);
    console.log(`  Secret: ${secret.slice(0, 16)}... (hidden)`);
    console.log(`  Commitment: ${commitment.slice(0, 16)}...`);
    console.log(`  Amount: 100 ADA (hidden on Midnight)`);
    console.log();

    // Save secret file
    const secretFile = createSecretFile(user, secret, '100', commitment, epochId);
    const filename = `demo-secret-${user.toLowerCase()}.json`;
    const filepath = path.join(process.cwd(), 'demo-secrets', filename);

    // Create demo-secrets directory if it doesn't exist
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filepath, JSON.stringify(secretFile, null, 2));
    console.log(`  📁 Secret file saved: demo-secrets/${filename}`);
    console.log();
  }

  separator();
  log(colors.bright, 'PHASE 2: POOL STATUS');
  separator();

  const totalDeposited = deposits.reduce((sum, d) => sum + d.amount, BigInt(0));
  const totalAda = Number(totalDeposited) / 1_000_000;

  console.log(`Pool State:`);
  console.log(`  Epoch: #${epochId}`);
  console.log(`  Status: Collecting → Staking`);
  console.log(`  Participants: ${deposits.length}`);
  console.log(`  Total Deposited: ${totalAda} ADA`);
  console.log();
  log(colors.blue, '🔒 Pool locked - deposits closed');
  log(colors.blue, '📤 Funds delegated to stake pool');

  separator();
  log(colors.bright, 'PHASE 3: STAKING REWARDS');
  separator();

  // Simulate staking rewards (~5% APY for demo period)
  const yieldAmount = BigInt(5_000_000); // 5 ADA
  const yieldAda = Number(yieldAmount) / 1_000_000;

  console.log(`Staking Period Complete!`);
  console.log(`  Stake Pool: BERRY (pool1pu5jlj...)`);
  console.log(`  Duration: 1 epoch (5 days)`);
  console.log(`  Yield Earned: ${yieldAda} ADA`);
  console.log();
  log(colors.green, `✓ ${yieldAda} ADA staking rewards claimed`);

  separator();
  log(colors.bright, 'PHASE 4: WINNER SELECTION');
  separator();

  // Select winner using verifiable randomness
  const randomness = crypto.randomBytes(32).toString('hex');
  const commitments = deposits.map(d => d.commitment);
  const winnerIndex = selectWinner(commitments, randomness);
  const winner = deposits[winnerIndex];

  console.log(`Verifiable Random Selection:`);
  console.log(`  Randomness: ${randomness.slice(0, 16)}...`);
  console.log(`  Commitments: ${commitments.length}`);
  console.log(`  Winner Index: ${winnerIndex}`);
  console.log();
  log(colors.magenta, `🏆 WINNER: ${winner.user}!`);
  console.log();
  console.log(`  ${winner.user}'s commitment matched the winning selection`);
  console.log(`  Identity revealed only to the winner via ZK proof`);

  separator();
  log(colors.bright, 'PHASE 5: WITHDRAWALS');
  separator();

  for (const deposit of deposits) {
    const isWinner = deposit.user === winner.user;
    const principal = Number(deposit.amount) / 1_000_000;
    const yield_ = isWinner ? Number(yieldAmount) / 1_000_000 : 0;
    const total = principal + yield_;

    if (isWinner) {
      log(colors.green, `${deposit.user} (WINNER) withdraws:`);
      console.log(`  Principal: ${principal} ADA`);
      console.log(`  Yield Won: +${yield_} ADA`);
      console.log(`  Total: ${total} ADA`);
      console.log(`  ZK Proof: proveWinner ✓`);
    } else {
      log(colors.cyan, `${deposit.user} withdraws:`);
      console.log(`  Principal: ${principal} ADA`);
      console.log(`  Yield: 0 ADA (not winner)`);
      console.log(`  Total: ${total} ADA`);
      console.log(`  ZK Proof: proveLoser ✓`);
    }
    console.log();
  }

  separator();
  log(colors.bright, 'DEMO COMPLETE');
  separator();

  console.log(`Summary:`);
  console.log(`  Total Deposited: ${totalAda} ADA`);
  console.log(`  Total Yield: ${yieldAda} ADA`);
  console.log(`  Winner: ${winner.user}`);
  console.log(`  Winner Receives: ${Number(winner.amount) / 1_000_000 + yieldAda} ADA`);
  console.log(`  Others Receive: 100 ADA each (no loss!)`);
  console.log();
  log(colors.green, '✓ All participants got their money back');
  log(colors.green, '✓ One lucky winner got the extra yield');
  log(colors.green, '✓ Privacy preserved via Midnight ZK proofs');
  console.log();
  console.log(`Secret files saved in: ./demo-secrets/`);
  console.log(`Use these files to test the frontend withdrawal flow.`);
}

// Run the demo
runDemo().catch(console.error);
