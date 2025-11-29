/**
 * StakeDrop Cardano Client
 * Handles all Cardano blockchain interactions
 */

import {
  MeshWallet,
  BlockfrostProvider,
  Transaction,
  resolveStakeKeyHash,
  serializePlutusScript,
  resolvePlutusScriptAddress,
} from '@meshsdk/core';
import {
  CardanoPoolState,
  PoolStatus,
  StakingResult,
  CardanoError,
  TxHash,
  Commitment,
} from './types.js';

export interface CardanoClientConfig {
  network: 'preview' | 'preprod' | 'mainnet';
  blockfrostApiKey: string;
  poolValidatorCbor: string;
  stakePoolId: string;
}

export class CardanoClient {
  private provider: BlockfrostProvider;
  private wallet: MeshWallet | null = null;
  private config: CardanoClientConfig;
  private validatorAddress: string;

  constructor(config: CardanoClientConfig) {
    this.config = config;
    this.provider = new BlockfrostProvider(config.blockfrostApiKey);
    this.validatorAddress = this.deriveValidatorAddress(config.poolValidatorCbor);
  }

  /**
   * Initialize wallet from mnemonic
   */
  async initWallet(mnemonic: string): Promise<void> {
    this.wallet = new MeshWallet({
      networkId: this.config.network === 'mainnet' ? 1 : 0,
      fetcher: this.provider,
      submitter: this.provider,
      key: {
        type: 'mnemonic',
        words: mnemonic.split(' '),
      },
    });
  }

  /**
   * Derive validator address from CBOR
   */
  private deriveValidatorAddress(cbor: string): string {
    const script = {
      code: cbor,
      version: 'V3' as const,
    };
    return resolvePlutusScriptAddress(script, this.config.network === 'mainnet' ? 1 : 0);
  }

  /**
   * Get current pool state from UTxO
   */
  async getPoolState(): Promise<CardanoPoolState | null> {
    try {
      const utxos = await this.provider.fetchAddressUTxOs(this.validatorAddress);

      if (utxos.length === 0) {
        return null;
      }

      // Find the pool UTxO (should have inline datum)
      const poolUtxo = utxos.find((utxo) => utxo.output.plutusData);

      if (!poolUtxo || !poolUtxo.output.plutusData) {
        return null;
      }

      // Parse datum (this is simplified - real implementation would decode CBOR)
      const datum = poolUtxo.output.plutusData;

      // For hackathon, return mock state - real implementation parses datum
      return {
        epochId: 1,
        status: PoolStatus.Collecting,
        totalDeposited: BigInt(poolUtxo.output.amount[0].quantity),
        participantCount: 0,
        yieldAmount: BigInt(0),
        stakePoolId: this.config.stakePoolId,
        winnerCommitment: null,
      };
    } catch (error) {
      throw new CardanoError('Failed to fetch pool state', { error });
    }
  }

  /**
   * Create initial pool UTxO
   */
  async initializePool(
    epochEnd: Date,
    adminPkh: string
  ): Promise<TxHash> {
    if (!this.wallet) {
      throw new CardanoError('Wallet not initialized');
    }

    const datum = this.buildPoolDatum({
      admin: adminPkh,
      epochId: 1,
      epochEnd: epochEnd.getTime(),
      totalDeposited: 0,
      participantCount: 0,
      midnightRoot: '',
      status: PoolStatus.Collecting,
      stakePoolId: this.config.stakePoolId,
      yieldAmount: 0,
      winnerCommitment: '',
    });

    const tx = new Transaction({ initiator: this.wallet });

    tx.sendLovelace(
      {
        address: this.validatorAddress,
        datum: { value: datum, inline: true },
      },
      '5000000' // 5 ADA initial
    );

    const unsignedTx = await tx.build();
    const signedTx = await this.wallet.signTx(unsignedTx);
    const txHash = await this.wallet.submitTx(signedTx);

    return txHash;
  }

  /**
   * Initiate staking - delegate pool funds to stake pool
   */
  async initiateStaking(poolAmount: bigint): Promise<StakingResult> {
    if (!this.wallet) {
      throw new CardanoError('Wallet not initialized');
    }

    try {
      // Get wallet addresses
      const addresses = await this.wallet.getUsedAddresses();
      const changeAddress = addresses[0];

      // Build staking transaction
      const tx = new Transaction({ initiator: this.wallet });

      // Register stake address if needed
      const rewardAddress = await this.wallet.getRewardAddresses();
      if (rewardAddress.length > 0) {
        tx.registerStake(rewardAddress[0]);
      }

      // Delegate to stake pool
      tx.delegateStake(rewardAddress[0], this.config.stakePoolId);

      const unsignedTx = await tx.build();
      const signedTx = await this.wallet.signTx(unsignedTx);
      const txHash = await this.wallet.submitTx(signedTx);

      return {
        cardanoTxHash: txHash,
        stakedAmount: poolAmount,
        stakePoolId: this.config.stakePoolId,
        delegationCertificate: txHash, // Simplified
      };
    } catch (error) {
      throw new CardanoError('Failed to initiate staking', { error });
    }
  }

  /**
   * Claim staking rewards
   */
  async claimRewards(): Promise<{ txHash: TxHash; rewardAmount: bigint }> {
    if (!this.wallet) {
      throw new CardanoError('Wallet not initialized');
    }

    try {
      const rewardAddresses = await this.wallet.getRewardAddresses();
      if (rewardAddresses.length === 0) {
        throw new CardanoError('No reward address found');
      }

      // Check available rewards
      const accountInfo = await this.provider.fetchAccountInfo(rewardAddresses[0]);
      const rewardAmount = BigInt(accountInfo.withdrawableAmount || '0');

      if (rewardAmount === BigInt(0)) {
        return { txHash: '', rewardAmount: BigInt(0) };
      }

      // Withdraw rewards
      const tx = new Transaction({ initiator: this.wallet });
      tx.withdrawRewards(rewardAddresses[0], rewardAmount.toString());

      const unsignedTx = await tx.build();
      const signedTx = await this.wallet.signTx(unsignedTx);
      const txHash = await this.wallet.submitTx(signedTx);

      return { txHash, rewardAmount };
    } catch (error) {
      throw new CardanoError('Failed to claim rewards', { error });
    }
  }

  /**
   * Finalize epoch with winner
   */
  async finalizeEpoch(
    winnerCommitment: Commitment,
    winnerProof: string,
    yieldAmount: bigint
  ): Promise<TxHash> {
    if (!this.wallet) {
      throw new CardanoError('Wallet not initialized');
    }

    try {
      // Get current pool UTxO
      const utxos = await this.provider.fetchAddressUTxOs(this.validatorAddress);
      const poolUtxo = utxos.find((utxo) => utxo.output.plutusData);

      if (!poolUtxo) {
        throw new CardanoError('Pool UTxO not found');
      }

      // Build finalization redeemer
      const redeemer = {
        data: {
          alternative: 3, // FinalizeEpoch
          fields: [
            { bytes: winnerCommitment },
            { bytes: winnerProof },
          ],
        },
      };

      // Build new datum with Distributing status
      const newDatum = this.buildPoolDatum({
        admin: '', // Keep existing
        epochId: 1,
        epochEnd: 0,
        totalDeposited: 0,
        participantCount: 0,
        midnightRoot: '',
        status: PoolStatus.Distributing,
        stakePoolId: this.config.stakePoolId,
        yieldAmount: Number(yieldAmount),
        winnerCommitment: winnerCommitment,
      });

      const tx = new Transaction({ initiator: this.wallet });

      // Spend pool UTxO and create new one with updated state
      tx.redeemValue({
        value: poolUtxo,
        script: {
          code: this.config.poolValidatorCbor,
          version: 'V3' as const,
        },
        redeemer: redeemer,
      });

      tx.sendLovelace(
        {
          address: this.validatorAddress,
          datum: { value: newDatum, inline: true },
        },
        poolUtxo.output.amount[0].quantity
      );

      const unsignedTx = await tx.build();
      const signedTx = await this.wallet.signTx(unsignedTx);
      const txHash = await this.wallet.submitTx(signedTx);

      return txHash;
    } catch (error) {
      throw new CardanoError('Failed to finalize epoch', { error });
    }
  }

  /**
   * Process winner withdrawal
   */
  async processWinnerWithdrawal(
    commitment: Commitment,
    proof: string,
    principalAmount: bigint,
    yieldAmount: bigint
  ): Promise<TxHash> {
    if (!this.wallet) {
      throw new CardanoError('Wallet not initialized');
    }

    // Implementation would spend pool UTxO with WithdrawWinner redeemer
    // and send principal + yield to winner's address
    throw new CardanoError('Not implemented');
  }

  /**
   * Process loser withdrawal
   */
  async processLoserWithdrawal(
    commitment: Commitment,
    proof: string,
    principalAmount: bigint
  ): Promise<TxHash> {
    if (!this.wallet) {
      throw new CardanoError('Wallet not initialized');
    }

    // Implementation would spend pool UTxO with WithdrawLoser redeemer
    // and send principal to loser's address
    throw new CardanoError('Not implemented');
  }

  /**
   * Build pool datum object
   */
  private buildPoolDatum(params: {
    admin: string;
    epochId: number;
    epochEnd: number;
    totalDeposited: number;
    participantCount: number;
    midnightRoot: string;
    status: PoolStatus;
    stakePoolId: string;
    yieldAmount: number;
    winnerCommitment: string;
  }): object {
    // Status to constructor index
    const statusIndex = {
      [PoolStatus.Collecting]: 0,
      [PoolStatus.Staking]: 1,
      [PoolStatus.Distributing]: 2,
      [PoolStatus.Completed]: 3,
    };

    return {
      constructor: 0,
      fields: [
        { bytes: params.admin },
        { int: params.epochId },
        { int: params.epochEnd },
        { int: params.totalDeposited },
        { int: params.participantCount },
        { bytes: params.midnightRoot },
        { constructor: statusIndex[params.status], fields: [] },
        { bytes: params.stakePoolId },
        { int: params.yieldAmount },
        { bytes: params.winnerCommitment },
      ],
    };
  }

  /**
   * Get validator address
   */
  getValidatorAddress(): string {
    return this.validatorAddress;
  }

  /**
   * Get wallet address
   */
  async getWalletAddress(): Promise<string> {
    if (!this.wallet) {
      throw new CardanoError('Wallet not initialized');
    }
    const addresses = await this.wallet.getUsedAddresses();
    return addresses[0];
  }

  /**
   * Get wallet balance
   */
  async getWalletBalance(): Promise<bigint> {
    if (!this.wallet) {
      throw new CardanoError('Wallet not initialized');
    }
    const balance = await this.wallet.getBalance();
    const lovelace = balance.find((b) => b.unit === 'lovelace');
    return BigInt(lovelace?.quantity || '0');
  }
}
