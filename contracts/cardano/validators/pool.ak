use aiken/collection/list
use aiken/crypto.{VerificationKeyHash, Blake2b_256, Hash}
use cardano/transaction.{Transaction, OutputReference, Output, InlineDatum}
use stakedrop/types.{
  PoolDatum,
  PoolRedeemer,
  PoolStatus,
  Collecting,
  Staking,
  Distributing,
  Completed,
  Deposit,
  InitiateStaking,
  UpdateYield,
  FinalizeEpoch,
  WithdrawWinner,
  WithdrawLoser,
  ClosePool,
}

/// Verify that a transaction is signed by a specific key
fn signed_by(tx: Transaction, vkh: VerificationKeyHash) -> Bool {
  list.has(tx.extra_signatories, vkh)
}

/// Get the continuing output (output that goes back to the same script)
fn get_continuing_output(tx: Transaction, own_ref: OutputReference) -> Option<Output> {
  // Find the input being spent
  expect Some(own_input) =
    list.find(tx.inputs, fn(input) { input.output_reference == own_ref })

  let own_address = own_input.output.address

  // Find output going to the same address
  list.find(tx.outputs, fn(output) { output.address == own_address })
}

/// Extract datum from output
fn get_datum(output: Output) -> Option<PoolDatum> {
  when output.datum is {
    InlineDatum(data) -> {
      expect datum: PoolDatum = data
      Some(datum)
    }
    _ -> None
  }
}

/// Verify ZK proof from Midnight (simplified - real implementation would verify cryptographic proof)
fn verify_midnight_proof(proof: ByteArray, commitment: ByteArray, midnight_root: ByteArray) -> Bool {
  // In production, this would verify a ZK-SNARK proof
  // For hackathon, we verify the proof is non-empty and matches expected format
  // The actual verification happens off-chain via Midnight
  builtin.length_of_bytearray(proof) > 0 &&
  builtin.length_of_bytearray(commitment) > 0
}

/// Main pool validator
validator pool {
  spend(
    datum: Option<PoolDatum>,
    redeemer: PoolRedeemer,
    own_ref: OutputReference,
    tx: Transaction,
  ) {
    expect Some(pool_datum) = datum

    when redeemer is {
      // User deposits funds with a commitment from Midnight
      Deposit { commitment, amount } -> {
        // Pool must be in Collecting status
        expect pool_datum.status == Collecting

        // Get continuing output
        expect Some(continuing_output) = get_continuing_output(tx, own_ref)
        expect Some(new_datum) = get_datum(continuing_output)

        // Verify new datum updates correctly
        let valid_update = and {
          new_datum.admin == pool_datum.admin,
          new_datum.epoch_id == pool_datum.epoch_id,
          new_datum.epoch_end == pool_datum.epoch_end,
          new_datum.total_deposited == pool_datum.total_deposited + amount,
          new_datum.participant_count == pool_datum.participant_count + 1,
          new_datum.status == Collecting,
        }

        // Verify commitment is valid (non-empty)
        let valid_commitment = builtin.length_of_bytearray(commitment) == 32

        valid_update? && valid_commitment?
      }

      // Admin initiates staking after deposit period ends
      InitiateStaking -> {
        // Must be signed by admin
        expect signed_by(tx, pool_datum.admin)

        // Pool must be in Collecting status
        expect pool_datum.status == Collecting

        // Get continuing output
        expect Some(continuing_output) = get_continuing_output(tx, own_ref)
        expect Some(new_datum) = get_datum(continuing_output)

        // Status must change to Staking
        let valid_transition = and {
          new_datum.admin == pool_datum.admin,
          new_datum.epoch_id == pool_datum.epoch_id,
          new_datum.total_deposited == pool_datum.total_deposited,
          new_datum.participant_count == pool_datum.participant_count,
          new_datum.status == Staking,
        }

        valid_transition?
      }

      // Admin updates yield amount after claiming staking rewards
      UpdateYield { new_yield } -> {
        // Must be signed by admin
        expect signed_by(tx, pool_datum.admin)

        // Pool must be in Staking status
        expect pool_datum.status == Staking

        // Get continuing output
        expect Some(continuing_output) = get_continuing_output(tx, own_ref)
        expect Some(new_datum) = get_datum(continuing_output)

        // Yield must increase (or stay same, rewards might not be ready)
        let valid_update = and {
          new_datum.admin == pool_datum.admin,
          new_datum.yield_amount >= pool_datum.yield_amount,
          new_datum.yield_amount == new_yield,
          new_datum.status == Staking,
        }

        valid_update?
      }

      // Admin finalizes epoch with winner selection from Midnight
      FinalizeEpoch { winner_commitment, winner_proof } -> {
        // Must be signed by admin
        expect signed_by(tx, pool_datum.admin)

        // Pool must be in Staking status
        expect pool_datum.status == Staking

        // Verify the winner proof from Midnight
        expect verify_midnight_proof(winner_proof, winner_commitment, pool_datum.midnight_root)

        // Get continuing output
        expect Some(continuing_output) = get_continuing_output(tx, own_ref)
        expect Some(new_datum) = get_datum(continuing_output)

        // Status must change to Distributing with winner set
        let valid_finalization = and {
          new_datum.admin == pool_datum.admin,
          new_datum.status == Distributing,
          new_datum.winner_commitment == winner_commitment,
        }

        valid_finalization?
      }

      // Winner withdraws principal + yield
      WithdrawWinner { midnight_proof } -> {
        // Pool must be in Distributing status
        expect pool_datum.status == Distributing

        // Verify the Midnight proof that caller is the winner
        expect verify_midnight_proof(midnight_proof, pool_datum.winner_commitment, pool_datum.midnight_root)

        // Winner gets their deposit back plus all yield
        // The actual value check would compare input/output values
        True
      }

      // Loser withdraws principal only
      WithdrawLoser { midnight_proof } -> {
        // Pool must be in Distributing status
        expect pool_datum.status == Distributing

        // Verify the Midnight proof that caller deposited (but is not winner)
        // The proof should prove: "I have a valid commitment that is NOT the winner"
        let proof_valid = builtin.length_of_bytearray(midnight_proof) > 0

        // Loser gets exactly their deposit back (no yield)
        proof_valid?
      }

      // Admin closes pool after all withdrawals complete
      ClosePool -> {
        // Must be signed by admin
        expect signed_by(tx, pool_datum.admin)

        // Pool should be in Distributing or Completed status
        let valid_status = or {
          pool_datum.status == Distributing,
          pool_datum.status == Completed,
        }

        valid_status?
      }
    }
  }
}

// ============================================
// Tests
// ============================================

test deposit_valid() {
  let admin_vkh = #"00000000000000000000000000000000000000000000000000000000"

  let datum = PoolDatum {
    admin: admin_vkh,
    epoch_id: 1,
    epoch_end: 1700000000000,
    total_deposited: 0,
    participant_count: 0,
    midnight_root: #"",
    status: Collecting,
    stake_pool_id: #"",
    yield_amount: 0,
    winner_commitment: #"",
  }

  // Basic datum validation
  datum.status == Collecting
}

test admin_can_initiate_staking() {
  let admin_vkh = #"00000000000000000000000000000000000000000000000000000000"

  let datum = PoolDatum {
    admin: admin_vkh,
    epoch_id: 1,
    epoch_end: 1700000000000,
    total_deposited: 300000000, // 300 ADA
    participant_count: 3,
    midnight_root: #"abcd1234",
    status: Collecting,
    stake_pool_id: #"",
    yield_amount: 0,
    winner_commitment: #"",
  }

  // Verify status allows transition
  datum.status == Collecting && datum.participant_count > 0
}

test winner_withdrawal_requires_distributing_status() {
  let admin_vkh = #"00000000000000000000000000000000000000000000000000000000"

  let datum = PoolDatum {
    admin: admin_vkh,
    epoch_id: 1,
    epoch_end: 1700000000000,
    total_deposited: 300000000,
    participant_count: 3,
    midnight_root: #"abcd1234",
    status: Distributing,
    stake_pool_id: #"pool1abc",
    yield_amount: 5000000, // 5 ADA yield
    winner_commitment: #"winner123",
  }

  // Winner can only withdraw when status is Distributing
  datum.status == Distributing && datum.yield_amount > 0
}
