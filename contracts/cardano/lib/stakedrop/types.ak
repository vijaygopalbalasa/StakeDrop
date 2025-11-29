use aiken/crypto.{VerificationKeyHash}

/// Minimum deposit in lovelace (10 ADA)
pub const min_deposit: Int = 10_000_000

/// Pool status enum
pub type PoolStatus {
  /// Pool is accepting deposits
  Collecting
  /// Funds are staked and earning yield
  Staking
  /// Winner selected, withdrawals are open
  Distributing
  /// Pool epoch completed
  Completed
}

/// Pool state stored in datum
pub type PoolDatum {
  /// Pool administrator public key hash
  admin: VerificationKeyHash,
  /// Epoch identifier
  epoch_id: Int,
  /// Epoch end time (POSIX milliseconds)
  epoch_end: Int,
  /// Total deposited amount (in lovelace)
  total_deposited: Int,
  /// Number of participants
  participant_count: Int,
  /// Midnight commitment root (merkle root of all commitments)
  midnight_root: ByteArray,
  /// Current pool status
  status: PoolStatus,
  /// Staking pool ID for delegation
  stake_pool_id: ByteArray,
  /// Accumulated yield from staking (in lovelace)
  yield_amount: Int,
  /// Winner's commitment hash (set after selection)
  winner_commitment: ByteArray,
  /// Number of withdrawals processed (for tracking)
  withdrawal_count: Int,
  /// Whether winner has withdrawn
  winner_withdrawn: Bool,
  /// PHASE 1.3: List of commitments that have already withdrawn (replay protection)
  withdrawn_commitments: List<ByteArray>,
}

/// Actions that can be performed on the pool
pub type PoolRedeemer {
  /// Deposit funds into the pool (requires Midnight commitment proof)
  Deposit { commitment: ByteArray, amount: Int }
  /// Admin locks the pool and initiates staking
  InitiateStaking
  /// Admin updates yield after claiming staking rewards
  UpdateYield { new_yield: Int }
  /// Admin finalizes epoch with winner from Midnight ZK proof
  FinalizeEpoch { winner_commitment: ByteArray, winner_proof: ByteArray }
  /// Winner withdraws principal + yield (PHASE 1.3: includes commitment for replay protection)
  WithdrawWinner { commitment: ByteArray, midnight_proof: ByteArray }
  /// Loser withdraws principal only (PHASE 1.3: includes commitment for replay protection)
  WithdrawLoser { commitment: ByteArray, midnight_proof: ByteArray }
  /// Admin closes the pool after all withdrawals
  ClosePool
}

/// Participant record (stored off-chain, referenced by commitment)
pub type Participant {
  /// Commitment hash from Midnight
  commitment: ByteArray,
  /// Deposited amount
  amount: Int,
  /// Deposit timestamp
  deposited_at: Int,
  /// Whether funds have been withdrawn
  withdrawn: Bool,
}
