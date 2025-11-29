/**
 * StakeDrop Bridge
 * Cross-chain coordinator between Midnight and Cardano
 *
 * This bridge script manages the full lifecycle of a StakeDrop epoch:
 * 1. Initialize epoch on both chains
 * 2. Monitor deposits on Midnight
 * 3. Lock pool and initiate Cardano staking
 * 4. Claim staking rewards
 * 5. Select winner via ZK proof on Midnight
 * 6. Finalize epoch on Cardano
 * 7. Process withdrawals
 */

import { config as loadEnv } from 'dotenv';
import { CardanoClient, CardanoClientConfig } from './cardano-client.js';
import { MidnightClient, MidnightClientConfig } from './midnight-client.js';
import {
  BridgeConfig,
  BridgeEvent,
  PoolStatus,
  Commitment,
  TxHash,
  FinalizationResult,
} from './types.js';

loadEnv();

export class StakeDropBridge {
  private cardano: CardanoClient;
  private midnight: MidnightClient;
  private config: BridgeConfig;
  private eventHandlers: ((event: BridgeEvent) => void)[] = [];

  constructor(config: BridgeConfig) {
    this.config = config;

    // Initialize Cardano client
    const cardanoConfig: CardanoClientConfig = {
      network: config.cardanoNetwork,
      blockfrostApiKey: config.cardanoBlockfrostApiKey,
      poolValidatorCbor: '', // Will be set after compilation
      stakePoolId: config.cardanoStakePoolId,
    };
    this.cardano = new CardanoClient(cardanoConfig);

    // Initialize Midnight client
    const midnightConfig: MidnightClientConfig = {
      networkUrl: config.midnightNetworkUrl,
      contractAddress: config.midnightContractAddress,
      proofServerUrl: 'http://localhost:6300', // Default proof server
    };
    this.midnight = new MidnightClient(midnightConfig);
  }

  /**
   * Initialize the bridge
   */
  async initialize(): Promise<void> {
    console.log('='.repeat(60));
    console.log('StakeDrop Bridge - Initializing');
    console.log('='.repeat(60));

    // Initialize Cardano wallet
    console.log('\n[1/2] Connecting to Cardano...');
    await this.cardano.initWallet(this.config.adminMnemonic);
    const cardanoAddress = await this.cardano.getWalletAddress();
    const cardanoBalance = await this.cardano.getWalletBalance();
    console.log(`  Address: ${cardanoAddress}`);
    console.log(`  Balance: ${Number(cardanoBalance) / 1_000_000} ADA`);

    // Connect to Midnight
    console.log('\n[2/2] Connecting to Midnight...');
    await this.midnight.connect();

    console.log('\nBridge initialized successfully!');
    console.log('='.repeat(60));
  }

  /**
   * Start a new epoch
   */
  async startEpoch(params: {
    maxParticipants: number;
    minDeposit: bigint;
    epochDurationSeconds: number;
  }): Promise<{ midnightTx: TxHash; cardanoTx: TxHash }> {
    console.log('\n--- Starting New Epoch ---');

    // Initialize on Midnight
    console.log('\n[Midnight] Initializing epoch...');
    const midnightTx = await this.midnight.initializeEpoch(
      params.maxParticipants,
      params.minDeposit,
      params.epochDurationSeconds
    );

    // Initialize on Cardano
    console.log('\n[Cardano] Creating pool UTxO...');
    const epochEnd = new Date(Date.now() + params.epochDurationSeconds * 1000);
    const adminAddress = await this.cardano.getWalletAddress();
    // Extract PKH from address (simplified)
    const adminPkh = adminAddress.slice(2, 58);
    const cardanoTx = await this.cardano.initializePool(epochEnd, adminPkh);

    console.log('\nEpoch started!');
    console.log(`  Midnight TX: ${midnightTx}`);
    console.log(`  Cardano TX: ${cardanoTx}`);

    return { midnightTx, cardanoTx };
  }

  /**
   * Get current status from both chains
   */
  async getStatus(): Promise<{
    midnight: {
      poolLocked: boolean;
      participantCount: number;
      winnerSelected: boolean;
    };
    cardano: {
      status: PoolStatus;
      totalDeposited: bigint;
      yieldAmount: bigint;
    };
  }> {
    const midnightState = await this.midnight.getPoolState();
    const cardanoState = await this.cardano.getPoolState();

    return {
      midnight: {
        poolLocked: midnightState.poolLocked,
        participantCount: midnightState.participantCount,
        winnerSelected: midnightState.winnerSelected,
      },
      cardano: {
        status: cardanoState?.status || PoolStatus.Collecting,
        totalDeposited: cardanoState?.totalDeposited || BigInt(0),
        yieldAmount: cardanoState?.yieldAmount || BigInt(0),
      },
    };
  }

  /**
   * Lock pool and initiate staking
   */
  async lockAndStake(): Promise<{
    midnightLockTx: TxHash;
    cardanoStakeTx: TxHash;
    stakedAmount: bigint;
  }> {
    console.log('\n--- Locking Pool & Initiating Staking ---');

    // Get current state
    const midnightState = await this.midnight.getPoolState();
    const cardanoState = await this.cardano.getPoolState();

    if (midnightState.participantCount < 2) {
      throw new Error('Need at least 2 participants to start lottery');
    }

    // Lock on Midnight
    console.log('\n[Midnight] Locking pool...');
    const midnightLockTx = await this.midnight.lockPool();

    // Initiate staking on Cardano
    console.log('\n[Cardano] Initiating stake delegation...');
    const stakingResult = await this.cardano.initiateStaking(
      cardanoState?.totalDeposited || BigInt(0)
    );

    this.emitEvent({
      type: 'STAKING_INITIATED',
      txHash: stakingResult.cardanoTxHash,
      amount: stakingResult.stakedAmount,
    });

    console.log('\nPool locked and staking initiated!');
    console.log(`  Staked: ${Number(stakingResult.stakedAmount) / 1_000_000} ADA`);
    console.log(`  Stake Pool: ${stakingResult.stakePoolId}`);

    return {
      midnightLockTx,
      cardanoStakeTx: stakingResult.cardanoTxHash,
      stakedAmount: stakingResult.stakedAmount,
    };
  }

  /**
   * Claim staking rewards
   */
  async claimRewards(): Promise<{ txHash: TxHash; rewardAmount: bigint }> {
    console.log('\n--- Claiming Staking Rewards ---');

    const result = await this.cardano.claimRewards();

    if (result.rewardAmount > BigInt(0)) {
      console.log(`Rewards claimed: ${Number(result.rewardAmount) / 1_000_000} ADA`);
      console.log(`TX: ${result.txHash}`);

      this.emitEvent({
        type: 'YIELD_UPDATED',
        newYield: result.rewardAmount,
      });
    } else {
      console.log('No rewards available yet');
    }

    return result;
  }

  /**
   * Select winner and finalize epoch
   */
  async finalizeEpoch(): Promise<FinalizationResult> {
    console.log('\n--- Finalizing Epoch ---');

    // Get all commitments
    const commitments = await this.midnight.getCommitments();
    console.log(`\nParticipants: ${commitments.length}`);

    if (commitments.length === 0) {
      throw new Error('No participants to select from');
    }

    // Select winner on Midnight
    console.log('\n[Midnight] Selecting winner...');
    const { txHash: midnightTx, winnerCommitment } = await this.midnight.selectWinner(commitments);

    // Get yield amount
    const cardanoState = await this.cardano.getPoolState();
    const yieldAmount = cardanoState?.yieldAmount || BigInt(0);

    // Finalize on Cardano
    console.log('\n[Cardano] Finalizing with winner proof...');
    const winnerProof = await this.midnight.generateWinnerProof(
      '', // Admin doesn't need secret for finalization proof
      winnerCommitment,
      winnerCommitment
    );
    const cardanoTx = await this.cardano.finalizeEpoch(
      winnerCommitment,
      winnerProof,
      yieldAmount
    );

    this.emitEvent({
      type: 'WINNER_SELECTED',
      commitment: winnerCommitment,
    });

    console.log('\nEpoch finalized!');
    console.log(`  Winner: ${winnerCommitment.slice(0, 16)}...`);
    console.log(`  Total Yield: ${Number(yieldAmount) / 1_000_000} ADA`);

    return {
      midnightTxHash: midnightTx,
      cardanoTxHash: cardanoTx,
      winnerCommitment,
      totalYield: yieldAmount,
    };
  }

  /**
   * Process a withdrawal claim
   */
  async processWithdrawal(
    commitment: Commitment,
    secret: string
  ): Promise<{
    isWinner: boolean;
    amount: bigint;
    yieldAmount: bigint;
    cardanoTxHash: TxHash;
  }> {
    console.log('\n--- Processing Withdrawal ---');
    console.log(`Commitment: ${commitment.slice(0, 16)}...`);

    // Get current state
    const midnightState = await this.midnight.getPoolState();
    const cardanoState = await this.cardano.getPoolState();

    if (!midnightState.winnerSelected) {
      throw new Error('Winner not yet selected');
    }

    const isWinner = midnightState.winnerCommitment === commitment;
    console.log(`Status: ${isWinner ? 'WINNER!' : 'Participant'}`);

    // Generate appropriate proof
    let proof: string;
    let claimResult: { txHash: TxHash; claimToken: string };

    if (isWinner) {
      proof = await this.midnight.generateWinnerProof(
        secret,
        commitment,
        midnightState.winnerCommitment!
      );
      claimResult = await this.midnight.claimPrize(commitment, proof, true);
    } else {
      proof = await this.midnight.generateLoserProof(
        secret,
        commitment,
        midnightState.winnerCommitment!
      );
      claimResult = await this.midnight.claimPrize(commitment, proof, false);
    }

    // Process on Cardano
    // For demo, we return mock values
    const principalAmount = BigInt(100_000_000); // 100 ADA
    const yieldAmount = isWinner ? (cardanoState?.yieldAmount || BigInt(0)) : BigInt(0);

    this.emitEvent({
      type: 'WITHDRAWAL_PROCESSED',
      commitment,
      amount: principalAmount + yieldAmount,
    });

    console.log(`\nWithdrawal processed:`);
    console.log(`  Principal: ${Number(principalAmount) / 1_000_000} ADA`);
    console.log(`  Yield: ${Number(yieldAmount) / 1_000_000} ADA`);
    console.log(`  Total: ${Number(principalAmount + yieldAmount) / 1_000_000} ADA`);

    return {
      isWinner,
      amount: principalAmount,
      yieldAmount,
      cardanoTxHash: claimResult.txHash,
    };
  }

  /**
   * Register event handler
   */
  onEvent(handler: (event: BridgeEvent) => void): void {
    this.eventHandlers.push(handler);
  }

  /**
   * Emit event to all handlers
   */
  private emitEvent(event: BridgeEvent): void {
    for (const handler of this.eventHandlers) {
      handler(event);
    }
  }

  /**
   * Get Cardano client (for advanced usage)
   */
  getCardanoClient(): CardanoClient {
    return this.cardano;
  }

  /**
   * Get Midnight client (for advanced usage)
   */
  getMidnightClient(): MidnightClient {
    return this.midnight;
  }
}

// ============================================
// CLI Entry Point
// ============================================

async function main() {
  console.log(`
  ███████╗████████╗ █████╗ ██╗  ██╗███████╗██████╗ ██████╗  ██████╗ ██████╗
  ██╔════╝╚══██╔══╝██╔══██╗██║ ██╔╝██╔════╝██╔══██╗██╔══██╗██╔═══██╗██╔══██╗
  ███████╗   ██║   ███████║█████╔╝ █████╗  ██║  ██║██████╔╝██║   ██║██████╔╝
  ╚════██║   ██║   ██╔══██║██╔═██╗ ██╔══╝  ██║  ██║██╔══██╗██║   ██║██╔═══╝
  ███████║   ██║   ██║  ██║██║  ██╗███████╗██████╔╝██║  ██║╚██████╔╝██║
  ╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚═╝

                  No-Loss Lottery Bridge - Cardano + Midnight
  `);

  // Load configuration from environment
  const config: BridgeConfig = {
    cardanoNetwork: (process.env.CARDANO_NETWORK as 'preview' | 'preprod' | 'mainnet') || 'preview',
    cardanoBlockfrostApiKey: process.env.BLOCKFROST_API_KEY || '',
    cardanoPoolValidatorAddress: process.env.POOL_VALIDATOR_ADDRESS || '',
    cardanoStakePoolId: process.env.STAKE_POOL_ID || 'pool1pu5jlj4q9w9jlxeu370a3c9myx47md5j5m2str0naunn2q3lkdy', // BERRY pool
    midnightNetworkUrl: process.env.MIDNIGHT_NETWORK_URL || 'https://testnet.midnight.network',
    midnightContractAddress: process.env.MIDNIGHT_CONTRACT_ADDRESS || '',
    adminMnemonic: process.env.ADMIN_MNEMONIC || '',
  };

  // Validate required config
  if (!config.adminMnemonic) {
    console.error('Error: ADMIN_MNEMONIC environment variable required');
    console.log('\nCreate a .env file with:');
    console.log('  ADMIN_MNEMONIC="your 24 word mnemonic"');
    console.log('  BLOCKFROST_API_KEY="your blockfrost key"');
    process.exit(1);
  }

  // Initialize bridge
  const bridge = new StakeDropBridge(config);

  // Register event handler
  bridge.onEvent((event) => {
    console.log(`\n[EVENT] ${event.type}:`, event);
  });

  try {
    await bridge.initialize();

    // Show status
    const status = await bridge.getStatus();
    console.log('\n--- Current Status ---');
    console.log('Midnight:', status.midnight);
    console.log('Cardano:', status.cardano);
  } catch (error) {
    console.error('Bridge error:', error);
    process.exit(1);
  }
}

// Run if executed directly
main().catch(console.error);

export default StakeDropBridge;
