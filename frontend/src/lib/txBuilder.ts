/**
 * Transaction Builder for StakeDrop
 * Builds proper Plutus transactions for deposits and withdrawals
 */

import {
  getPoolScriptAddress,
  getPoolValidator,
  PoolDatum,
  PoolStatus,
  encodePoolDatum,
  encodePoolRedeemer,
  POOL_VALIDATOR_CBOR,
} from './contract';
import { BlockchainUTxO, getPoolStateFromChain, getTxExplorerUrl } from './blockchain';
import { LOVELACE_PER_ADA } from './constants';

// ============================================
// Types
// ============================================

export interface TransactionResult {
  success: boolean;
  txHash?: string;
  explorerUrl?: string;
  error?: string;
}

export interface DepositParams {
  wallet: any; // BrowserWallet from MeshJS
  commitment: string; // 32-byte hex commitment
  amountLovelace: bigint;
}

export interface WithdrawParams {
  wallet: any;
  commitment: string;
  proof: string; // ZK proof hex
  isWinner: boolean;
}

// ============================================
// Deposit Transaction
// ============================================

/**
 * Build and submit a deposit transaction
 *
 * This creates a proper Plutus transaction that:
 * 1. Spends the current pool UTxO
 * 2. Creates a new pool UTxO with updated datum (increased total, participant count)
 * 3. Adds the user's deposit amount to the pool value
 */
export async function buildDepositTransaction(
  params: DepositParams
): Promise<TransactionResult> {
  const { wallet, commitment, amountLovelace } = params;

  try {
    // Import MeshJS dynamically to support SSR
    const { MeshTxBuilder, BlockfrostProvider } = await import('@meshsdk/core');

    // Get Blockfrost provider
    const blockfrostKey = process.env.NEXT_PUBLIC_BLOCKFROST_PROJECT_ID || '';
    if (!blockfrostKey) {
      throw new Error('Blockfrost API key not configured');
    }

    const provider = new BlockfrostProvider(blockfrostKey);
    const scriptAddress = getPoolScriptAddress();

    // Get current pool state
    const poolState = await getPoolStateFromChain();

    // User addresses and UTxOs
    const userAddress = await wallet.getChangeAddress();
    const userUtxos = await wallet.getUtxos();
    const collateral = await wallet.getCollateral();

    if (!collateral || collateral.length === 0) {
      throw new Error('No collateral set. Please enable collateral in your wallet settings.');
    }

    // If no pool UTxO exists, this is the first deposit - create initial state
    if (!poolState) {
      console.log('No existing pool UTxO - creating initial pool state');
      return await createInitialPoolDeposit(params, provider);
    }

    // Build updated datum
    const newDatum: PoolDatum = {
      ...poolState.datum,
      totalDeposited: poolState.datum.totalDeposited + amountLovelace,
      participantCount: poolState.datum.participantCount + 1,
    };

    // Calculate new pool value
    const newPoolValue = poolState.lovelaceValue + amountLovelace;

    // Build the Deposit redeemer
    const redeemer = encodePoolRedeemer({
      type: 'Deposit',
      commitment,
      amount: amountLovelace,
    });

    // Build transaction using MeshTxBuilder
    const txBuilder = new MeshTxBuilder({
      fetcher: provider,
      submitter: provider,
      verbose: true,
    });

    const unsignedTx = await txBuilder
      // Spend the pool UTxO
      .spendingPlutusScriptV3()
      .txIn(poolState.utxo.tx_hash, poolState.utxo.output_index)
      .txInInlineDatumPresent()
      .txInRedeemerValue(redeemer, 'JSON')
      .txInScript(POOL_VALIDATOR_CBOR)
      // Add user input for the deposit amount
      .selectUtxosFrom(userUtxos)
      // Output: Pool UTxO with updated value and datum
      .txOut(scriptAddress, [
        { unit: 'lovelace', quantity: newPoolValue.toString() }
      ])
      .txOutInlineDatumValue(encodePoolDatum(newDatum), 'JSON')
      // Collateral
      .txInCollateral(
        collateral[0].input.txHash,
        collateral[0].input.outputIndex,
        collateral[0].output.amount,
        collateral[0].output.address
      )
      .changeAddress(userAddress)
      .complete();

    // Sign and submit
    const signedTx = await wallet.signTx(unsignedTx, true); // partial sign
    const txHash = await wallet.submitTx(signedTx);

    return {
      success: true,
      txHash,
      explorerUrl: getTxExplorerUrl(txHash),
    };

  } catch (error) {
    console.error('Deposit transaction failed:', error);
    return {
      success: false,
      error: formatTransactionError(error),
    };
  }
}

/**
 * Create the initial pool deposit when no pool UTxO exists
 */
async function createInitialPoolDeposit(
  params: DepositParams,
  provider: any
): Promise<TransactionResult> {
  const { wallet, commitment, amountLovelace } = params;

  try {
    const { MeshTxBuilder, resolvePaymentKeyHash } = await import('@meshsdk/core');

    const scriptAddress = getPoolScriptAddress();
    const userAddress = await wallet.getChangeAddress();
    const userUtxos = await wallet.getUtxos();

    // Get admin PKH from user (first depositor becomes admin for demo)
    const adminPkh = resolvePaymentKeyHash(userAddress);

    // Create initial datum
    const initialDatum: PoolDatum = {
      admin: adminPkh,
      epochId: Math.floor(Date.now() / (5 * 24 * 60 * 60 * 1000)), // Simple epoch ID
      epochEnd: Date.now() + 5 * 24 * 60 * 60 * 1000, // 5 days from now
      totalDeposited: amountLovelace,
      participantCount: 1,
      midnightRoot: '',
      status: PoolStatus.Collecting,
      stakePoolId: '',
      yieldAmount: BigInt(0),
      winnerCommitment: '',
      withdrawalCount: 0,
      winnerWithdrawn: false,
      withdrawnCommitments: [],
    };

    // For initial deposit, just send to script address with datum
    // No need to spend existing pool UTxO
    const txBuilder = new MeshTxBuilder({
      fetcher: provider,
      submitter: provider,
      verbose: true,
    });

    const unsignedTx = await txBuilder
      .selectUtxosFrom(userUtxos)
      .txOut(scriptAddress, [
        { unit: 'lovelace', quantity: amountLovelace.toString() }
      ])
      .txOutInlineDatumValue(encodePoolDatum(initialDatum), 'JSON')
      .changeAddress(userAddress)
      .complete();

    const signedTx = await wallet.signTx(unsignedTx);
    const txHash = await wallet.submitTx(signedTx);

    return {
      success: true,
      txHash,
      explorerUrl: getTxExplorerUrl(txHash),
    };

  } catch (error) {
    console.error('Initial deposit failed:', error);
    return {
      success: false,
      error: formatTransactionError(error),
    };
  }
}

// ============================================
// Withdrawal Transaction
// ============================================

/**
 * Build and submit a withdrawal transaction
 */
export async function buildWithdrawTransaction(
  params: WithdrawParams
): Promise<TransactionResult> {
  const { wallet, commitment, proof, isWinner } = params;

  try {
    const { MeshTxBuilder, BlockfrostProvider, resolvePaymentKeyHash } = await import('@meshsdk/core');

    const blockfrostKey = process.env.NEXT_PUBLIC_BLOCKFROST_PROJECT_ID || '';
    const provider = new BlockfrostProvider(blockfrostKey);
    const scriptAddress = getPoolScriptAddress();

    // Get pool state
    const poolState = await getPoolStateFromChain();
    if (!poolState) {
      throw new Error('Pool not found. Cannot withdraw.');
    }

    if (poolState.datum.status !== PoolStatus.Distributing) {
      throw new Error('Pool is not in distribution phase. Withdrawals not open.');
    }

    // Check if already withdrawn (replay protection)
    if (poolState.datum.withdrawnCommitments.includes(commitment)) {
      throw new Error('This commitment has already been withdrawn.');
    }

    // User info
    const userAddress = await wallet.getChangeAddress();
    const userPkh = resolvePaymentKeyHash(userAddress);
    const collateral = await wallet.getCollateral();

    if (!collateral || collateral.length === 0) {
      throw new Error('No collateral set. Please enable collateral in your wallet settings.');
    }

    // Calculate withdrawal amount
    const depositPerParticipant = poolState.datum.participantCount > 0
      ? poolState.datum.totalDeposited / BigInt(poolState.datum.participantCount)
      : BigInt(0);

    const withdrawAmount = isWinner
      ? depositPerParticipant + poolState.datum.yieldAmount
      : depositPerParticipant;

    // Remaining pool value
    const remainingValue = poolState.lovelaceValue - withdrawAmount;

    // Updated datum
    const newDatum: PoolDatum = {
      ...poolState.datum,
      withdrawalCount: poolState.datum.withdrawalCount + 1,
      winnerWithdrawn: isWinner ? true : poolState.datum.winnerWithdrawn,
      withdrawnCommitments: [...poolState.datum.withdrawnCommitments, commitment],
    };

    // Build redeemer
    const redeemer = encodePoolRedeemer(
      isWinner
        ? { type: 'WithdrawWinner', commitment, midnightProof: proof }
        : { type: 'WithdrawLoser', commitment, midnightProof: proof }
    );

    // Build transaction
    const txBuilder = new MeshTxBuilder({
      fetcher: provider,
      submitter: provider,
      verbose: true,
    });

    const unsignedTx = await txBuilder
      // Spend pool UTxO
      .spendingPlutusScriptV3()
      .txIn(poolState.utxo.tx_hash, poolState.utxo.output_index)
      .txInInlineDatumPresent()
      .txInRedeemerValue(redeemer, 'JSON')
      .txInScript(POOL_VALIDATOR_CBOR)
      // Pool continues with remaining value
      .txOut(scriptAddress, [
        { unit: 'lovelace', quantity: remainingValue.toString() }
      ])
      .txOutInlineDatumValue(encodePoolDatum(newDatum), 'JSON')
      // User receives their share
      .txOut(userAddress, [
        { unit: 'lovelace', quantity: withdrawAmount.toString() }
      ])
      // Required signer
      .requiredSignerHash(userPkh)
      // Collateral
      .txInCollateral(
        collateral[0].input.txHash,
        collateral[0].input.outputIndex,
        collateral[0].output.amount,
        collateral[0].output.address
      )
      .changeAddress(userAddress)
      .complete();

    // Sign and submit
    const signedTx = await wallet.signTx(unsignedTx, true);
    const txHash = await wallet.submitTx(signedTx);

    return {
      success: true,
      txHash,
      explorerUrl: getTxExplorerUrl(txHash),
    };

  } catch (error) {
    console.error('Withdraw transaction failed:', error);
    return {
      success: false,
      error: formatTransactionError(error),
    };
  }
}

// ============================================
// Simple Deposit (Fallback)
// ============================================

/**
 * Simple deposit that just sends ADA to script address with metadata
 * Used when proper contract interaction isn't available
 */
export async function buildSimpleDeposit(
  wallet: any,
  commitment: string,
  amountLovelace: bigint,
  epochId: number
): Promise<TransactionResult> {
  try {
    const { Transaction } = await import('@meshsdk/core');

    const scriptAddress = getPoolScriptAddress();
    const tx = new Transaction({ initiator: wallet });

    // Send to script address
    tx.sendLovelace(scriptAddress, amountLovelace.toString());

    // Include metadata
    tx.setMetadata(674, {
      msg: ['StakeDrop Deposit'],
      commitment: commitment.slice(0, 64),
      epoch: epochId,
      amount: amountLovelace.toString(),
    });

    const unsignedTx = await tx.build();
    const signedTx = await wallet.signTx(unsignedTx);
    const txHash = await wallet.submitTx(signedTx);

    return {
      success: true,
      txHash,
      explorerUrl: getTxExplorerUrl(txHash),
    };

  } catch (error) {
    console.error('Simple deposit failed:', error);
    return {
      success: false,
      error: formatTransactionError(error),
    };
  }
}

// ============================================
// Error Handling
// ============================================

/**
 * Format transaction errors into user-friendly messages
 */
function formatTransactionError(error: any): string {
  const msg = error?.message?.toLowerCase() || String(error).toLowerCase();

  if (msg.includes('insufficient') || msg.includes('not enough')) {
    return 'Insufficient funds. Please add more ADA to your wallet.';
  }

  if (msg.includes('collateral')) {
    return 'Collateral required. Enable collateral in your wallet settings (usually 5 ADA).';
  }

  if (msg.includes('rejected') || msg.includes('declined') || msg.includes('cancelled')) {
    return 'Transaction was cancelled by user.';
  }

  if (msg.includes('script') || msg.includes('validator')) {
    return 'Smart contract validation failed. Please check your inputs.';
  }

  if (msg.includes('network') || msg.includes('connection') || msg.includes('fetch')) {
    return 'Network error. Please check your connection and try again.';
  }

  if (msg.includes('utxo') || msg.includes('input')) {
    return 'UTxO selection failed. Please try again with different inputs.';
  }

  // Return original message if no match
  return error?.message || 'Transaction failed. Please try again.';
}

// ============================================
// Admin Transactions
// ============================================

/**
 * Admin: Initiate staking phase
 */
export async function buildInitiateStakingTx(wallet: any): Promise<TransactionResult> {
  // TODO: Implement admin transaction for InitiateStaking
  return {
    success: false,
    error: 'Admin transactions not yet implemented',
  };
}

/**
 * Admin: Finalize epoch with winner
 */
export async function buildFinalizeEpochTx(
  wallet: any,
  winnerCommitment: string,
  winnerProof: string
): Promise<TransactionResult> {
  // TODO: Implement admin transaction for FinalizeEpoch
  return {
    success: false,
    error: 'Admin transactions not yet implemented',
  };
}
