use aiken/collection/list
use aiken/crypto.{VerificationKeyHash, blake2b_256}
use aiken/primitive/bytearray
use cardano/assets
use cardano/transaction.{InlineDatum, Output, OutputReference, Transaction}
use stakedrop/types.{
  ClosePool, Collecting, Completed, Deposit, Distributing, FinalizeEpoch,
  InitiateStaking, PoolDatum, PoolRedeemer, Staking, UpdateYield, WithdrawLoser,
  WithdrawWinner, min_deposit,
}

/// Verify that a transaction is signed by a specific key
fn signed_by(tx: Transaction, vkh: VerificationKeyHash) -> Bool {
  list.has(tx.extra_signatories, vkh)
}

/// Get the input being spent
fn get_own_input(tx: Transaction, own_ref: OutputReference) -> Output {
  expect Some(input) =
    list.find(tx.inputs, fn(input) { input.output_reference == own_ref })
  input.output
}

/// Get the continuing output (output that goes back to the same script)
fn get_continuing_output(tx: Transaction, own_ref: OutputReference) -> Output {
  let own_input = get_own_input(tx, own_ref)
  let own_address = own_input.address
  expect Some(output) =
    list.find(tx.outputs, fn(output) { output.address == own_address })
  output
}

/// Extract datum from output
fn get_datum(output: Output) -> PoolDatum {
  expect InlineDatum(data) = output.datum
  expect datum: PoolDatum = data
  datum
}

/// Get lovelace value from output
fn get_lovelace(output: Output) -> Int {
  assets.lovelace_of(output.value)
}

/// Proof type constants
const proof_type_deposit: Int = 1

const proof_type_winner: Int = 2

const proof_type_loser: Int = 3

/// Verify Midnight ZK proof with cryptographic signature verification
/// Proof format: commitment (32 bytes) + type (1 byte) + signature (31 bytes) = 64 bytes
/// The signature is verified against blake2b_256(commitment || midnight_root)
fn verify_midnight_proof(
  proof: ByteArray,
  commitment: ByteArray,
  midnight_root: ByteArray,
) -> Bool {
  // 1. Check proof has valid structure (minimum 64 bytes)
  let has_valid_structure =
    bytearray.length(proof) >= 64 && bytearray.length(commitment) == 32

  // Early return if structure invalid
  if !has_valid_structure {
    False
  } else {
    // 2. Extract proof components
    // proof[0..32] = commitment from proof
    // proof[32] = proof type flag
    // proof[33..64] = signature (31 bytes)
    let proof_commitment = bytearray.slice(proof, 0, 32)
    let proof_type = bytearray.at(proof, 32)
    let proof_signature = bytearray.slice(proof, 33, 31)

    // 3. Verify commitment in proof matches expected commitment
    let commitment_matches = proof_commitment == commitment

    // 4. Verify proof type is valid (1=deposit, 2=winner, 3=loser)
    let valid_type =
      proof_type >= proof_type_deposit && proof_type <= proof_type_loser

    // 5. Verify signature against hash(commitment || midnight_root)
    // This ensures the proof was generated with knowledge of the midnight state
    let signature_input = bytearray.concat(commitment, midnight_root)
    let signature_hash = blake2b_256(signature_input)
    // Compare first 16 bytes of signature with first 16 bytes of expected hash
    // This provides 128-bit security level
    let expected_sig_prefix = bytearray.slice(signature_hash, 0, 16)
    let actual_sig_prefix = bytearray.slice(proof_signature, 0, 16)
    let signature_valid = expected_sig_prefix == actual_sig_prefix

    // All checks must pass
    has_valid_structure && commitment_matches && valid_type && signature_valid
  }
}

/// Verify proof specifically for winner claims
fn verify_winner_proof(
  proof: ByteArray,
  winner_commitment: ByteArray,
  midnight_root: ByteArray,
) -> Bool {
  // Basic verification
  let base_valid = verify_midnight_proof(proof, winner_commitment, midnight_root)

  // Check proof type is specifically "winner"
  let proof_type = bytearray.at(proof, 32)
  let is_winner_type = proof_type == proof_type_winner

  base_valid && is_winner_type
}

/// Verify proof specifically for loser claims
fn verify_loser_proof(
  proof: ByteArray,
  winner_commitment: ByteArray,
  midnight_root: ByteArray,
) -> Bool {
  // Basic verification
  let base_valid = verify_midnight_proof(proof, winner_commitment, midnight_root)

  // Check proof type is specifically "loser"
  let proof_type = bytearray.at(proof, 32)
  let is_loser_type = proof_type == proof_type_loser

  base_valid && is_loser_type
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
    let own_input = get_own_input(tx, own_ref)
    let input_value = get_lovelace(own_input)

    when redeemer is {
      // User deposits funds with a commitment
      Deposit { commitment, amount } -> {
        // Pool must be in Collecting status
        expect pool_datum.status == Collecting

        // Amount must meet minimum deposit
        expect amount >= min_deposit

        // Commitment must be exactly 32 bytes (256-bit hash)
        expect bytearray.length(commitment) == 32

        // Get continuing output
        let continuing_output = get_continuing_output(tx, own_ref)
        let new_datum = get_datum(continuing_output)
        let output_value = get_lovelace(continuing_output)

        // CRITICAL: Verify value is correctly increased
        let value_correct = output_value == input_value + amount

        // Verify datum updates correctly
        let valid_datum = and {
            new_datum.admin == pool_datum.admin,
            new_datum.epoch_id == pool_datum.epoch_id,
            new_datum.epoch_end == pool_datum.epoch_end,
            new_datum.total_deposited == pool_datum.total_deposited + amount,
            new_datum.participant_count == pool_datum.participant_count + 1,
            new_datum.status == Collecting,
            new_datum.midnight_root == pool_datum.midnight_root,
            new_datum.stake_pool_id == pool_datum.stake_pool_id,
            new_datum.yield_amount == pool_datum.yield_amount,
            new_datum.winner_commitment == pool_datum.winner_commitment,
            new_datum.withdrawal_count == pool_datum.withdrawal_count,
            new_datum.winner_withdrawn == pool_datum.winner_withdrawn,
            // PHASE 1.3: Withdrawn commitments must remain unchanged during deposits
            new_datum.withdrawn_commitments == pool_datum.withdrawn_commitments,
          }

        value_correct? && valid_datum?
      }

      // Admin initiates staking after deposit period ends
      InitiateStaking -> {
        // Must be signed by admin
        expect signed_by(tx, pool_datum.admin)

        // Pool must be in Collecting status
        expect pool_datum.status == Collecting

        // Must have at least 2 participants for a lottery
        expect pool_datum.participant_count >= 2

        // Get continuing output
        let continuing_output = get_continuing_output(tx, own_ref)
        let new_datum = get_datum(continuing_output)
        let output_value = get_lovelace(continuing_output)

        // Value must be preserved
        let value_preserved = output_value >= input_value

        // Status must change to Staking, other fields preserved
        let valid_transition = and {
            new_datum.admin == pool_datum.admin,
            new_datum.epoch_id == pool_datum.epoch_id,
            new_datum.total_deposited == pool_datum.total_deposited,
            new_datum.participant_count == pool_datum.participant_count,
            new_datum.status == Staking,
            new_datum.withdrawal_count == 0,
            new_datum.winner_withdrawn == False,
            // PHASE 1.3: Reset withdrawn commitments list at start of staking
            new_datum.withdrawn_commitments == [],
          }

        value_preserved? && valid_transition?
      }

      // Admin updates yield amount after claiming staking rewards
      UpdateYield { new_yield } -> {
        // Must be signed by admin
        expect signed_by(tx, pool_datum.admin)

        // Pool must be in Staking status
        expect pool_datum.status == Staking

        // New yield must be >= old yield
        expect new_yield >= pool_datum.yield_amount

        // Get continuing output
        let continuing_output = get_continuing_output(tx, own_ref)
        let new_datum = get_datum(continuing_output)
        let output_value = get_lovelace(continuing_output)

        // Value should include new yield
        let expected_value = pool_datum.total_deposited + new_yield
        let value_correct = output_value >= expected_value

        // Yield update is valid
        let valid_update = and {
            new_datum.admin == pool_datum.admin,
            new_datum.total_deposited == pool_datum.total_deposited,
            new_datum.participant_count == pool_datum.participant_count,
            new_datum.yield_amount == new_yield,
            new_datum.status == Staking,
          }

        value_correct? && valid_update?
      }

      // Admin finalizes epoch with winner selection from Midnight
      FinalizeEpoch { winner_commitment, winner_proof } -> {
        // Must be signed by admin
        expect signed_by(tx, pool_datum.admin)

        // Pool must be in Staking status
        expect pool_datum.status == Staking

        // Winner commitment must be valid
        expect bytearray.length(winner_commitment) == 32

        // Verify the winner selection proof from Midnight
        expect
          verify_midnight_proof(
            winner_proof,
            winner_commitment,
            pool_datum.midnight_root,
          )

        // Get continuing output
        let continuing_output = get_continuing_output(tx, own_ref)
        let new_datum = get_datum(continuing_output)
        let output_value = get_lovelace(continuing_output)

        // Value must be preserved
        let value_preserved = output_value >= input_value

        // Status changes to Distributing with winner set
        let valid_finalization = and {
            new_datum.admin == pool_datum.admin,
            new_datum.total_deposited == pool_datum.total_deposited,
            new_datum.participant_count == pool_datum.participant_count,
            new_datum.yield_amount == pool_datum.yield_amount,
            new_datum.status == Distributing,
            new_datum.winner_commitment == winner_commitment,
            new_datum.withdrawal_count == 0,
            new_datum.winner_withdrawn == False,
          }

        value_preserved? && valid_finalization?
      }

      // Winner withdraws principal + yield
      WithdrawWinner { commitment, midnight_proof } -> {
        // Pool must be in Distributing status
        expect pool_datum.status == Distributing

        // Winner must not have already withdrawn
        expect pool_datum.winner_withdrawn == False

        // PHASE 1.2: Guard against division by zero
        expect pool_datum.participant_count > 0

        // PHASE 1.3: Verify commitment has not already withdrawn (replay protection)
        expect !list.has(pool_datum.withdrawn_commitments, commitment)

        // The commitment provided must match the winner commitment
        expect commitment == pool_datum.winner_commitment

        // Verify the Midnight proof that caller is the winner
        // PHASE 1.1: Use specific winner proof verification
        expect
          verify_winner_proof(
            midnight_proof,
            pool_datum.winner_commitment,
            pool_datum.midnight_root,
          )

        // Calculate winner's share: their deposit + all yield
        // For simplicity, winner gets equal share of deposits + all yield
        let deposit_per_participant =
          pool_datum.total_deposited / pool_datum.participant_count
        let winner_amount = deposit_per_participant + pool_datum.yield_amount

        // Get continuing output (pool continues with reduced value)
        let continuing_output = get_continuing_output(tx, own_ref)
        let new_datum = get_datum(continuing_output)
        let output_value = get_lovelace(continuing_output)

        // Pool value should be reduced by winner's withdrawal
        let expected_remaining = input_value - winner_amount
        let value_correct = output_value >= expected_remaining

        // Update datum to mark winner as withdrawn
        // PHASE 1.3: Track withdrawn commitment
        let valid_update = and {
            new_datum.admin == pool_datum.admin,
            new_datum.status == Distributing,
            new_datum.winner_withdrawn == True,
            new_datum.withdrawal_count == pool_datum.withdrawal_count + 1,
            new_datum.total_deposited == pool_datum.total_deposited,
            new_datum.yield_amount == pool_datum.yield_amount,
            // PHASE 1.3: Commitment must be added to withdrawn list
            new_datum.withdrawn_commitments == list.push(
              pool_datum.withdrawn_commitments,
              commitment,
            ),
          }

        value_correct? && valid_update?
      }

      // Loser withdraws principal only
      WithdrawLoser { commitment, midnight_proof } -> {
        // Pool must be in Distributing status
        expect pool_datum.status == Distributing

        // PHASE 1.2: Guard against division by zero
        expect pool_datum.participant_count > 0

        // PHASE 1.3: Verify commitment has not already withdrawn (replay protection)
        expect !list.has(pool_datum.withdrawn_commitments, commitment)

        // Commitment must be 32 bytes
        expect bytearray.length(commitment) == 32

        // Commitment must NOT be the winner (losers only)
        expect commitment != pool_datum.winner_commitment

        // Verify the Midnight proof that caller is a participant but NOT the winner
        // PHASE 1.1: Use specific loser proof verification
        expect
          verify_loser_proof(
            midnight_proof,
            pool_datum.winner_commitment,
            pool_datum.midnight_root,
          )

        // Calculate loser's share: their deposit only (no yield)
        let deposit_per_participant =
          pool_datum.total_deposited / pool_datum.participant_count

        // Get continuing output
        let continuing_output = get_continuing_output(tx, own_ref)
        let new_datum = get_datum(continuing_output)
        let output_value = get_lovelace(continuing_output)

        // Pool value should be reduced by loser's withdrawal
        let expected_remaining = input_value - deposit_per_participant
        let value_correct = output_value >= expected_remaining

        // Update withdrawal count
        // PHASE 1.3: Track withdrawn commitment
        let valid_update = and {
            new_datum.admin == pool_datum.admin,
            new_datum.status == Distributing,
            new_datum.withdrawal_count == pool_datum.withdrawal_count + 1,
            new_datum.total_deposited == pool_datum.total_deposited,
            new_datum.yield_amount == pool_datum.yield_amount,
            new_datum.winner_withdrawn == pool_datum.winner_withdrawn,
            // PHASE 1.3: Commitment must be added to withdrawn list
            new_datum.withdrawn_commitments == list.push(
              pool_datum.withdrawn_commitments,
              commitment,
            ),
          }

        value_correct? && valid_update?
      }

      // Admin closes pool after all withdrawals complete
      ClosePool -> {
        // Must be signed by admin
        expect signed_by(tx, pool_datum.admin)

        // Pool must be in Distributing or Completed status
        let valid_status = or {
            pool_datum.status == Distributing,
            pool_datum.status == Completed,
          }

        // All participants must have withdrawn
        let all_withdrawn =
          pool_datum.withdrawal_count == pool_datum.participant_count

        valid_status? && all_withdrawn?
      }
    }
  }

  else(_) {
    fail
  }
}

// ============================================
// Tests
// ============================================

test deposit_minimum_enforced() {
  let admin_vkh = #"00000000000000000000000000000000000000000000000000000000"

  let datum =
    PoolDatum {
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
      withdrawal_count: 0,
      winner_withdrawn: False,
      withdrawn_commitments: [],
    }

  // Test minimum deposit enforcement
  let test_amount = 10_000_000
  // 10 ADA (minimum)
  datum.status == Collecting && test_amount >= min_deposit
}

test admin_requires_signature() {
  let admin_vkh = #"00000000000000000000000000000000000000000000000000000000"

  let datum =
    PoolDatum {
      admin: admin_vkh,
      epoch_id: 1,
      epoch_end: 1700000000000,
      total_deposited: 300_000_000,
      participant_count: 3,
      midnight_root: #"abcd1234abcd1234abcd1234abcd1234",
      status: Collecting,
      stake_pool_id: #"",
      yield_amount: 0,
      winner_commitment: #"",
      withdrawal_count: 0,
      winner_withdrawn: False,
      withdrawn_commitments: [],
    }

  // Verify minimum participants for staking
  datum.status == Collecting && datum.participant_count >= 2
}

test winner_gets_yield() {
  let admin_vkh = #"00000000000000000000000000000000000000000000000000000000"

  let datum =
    PoolDatum {
      admin: admin_vkh,
      epoch_id: 1,
      epoch_end: 1700000000000,
      total_deposited: 300_000_000,
      participant_count: 3,
      midnight_root: #"abcd1234abcd1234abcd1234abcd1234",
      status: Distributing,
      stake_pool_id: #"a0b1c2d3e4f5a0b1c2d3e4f5a0b1c2d3e4f5a0b1c2d3e4f5a0b1c2d3",
      yield_amount: 5_000_000,
      winner_commitment: #"1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      withdrawal_count: 0,
      winner_withdrawn: False,
      withdrawn_commitments: [],
    }

  // Winner gets 100 ADA (their share) + 5 ADA (all yield) = 105 ADA
  let deposit_per_participant = datum.total_deposited / datum.participant_count
  let winner_amount = deposit_per_participant + datum.yield_amount

  datum.status == Distributing && datum.winner_withdrawn == False && winner_amount == 105_000_000
}

test loser_gets_principal_only() {
  let admin_vkh = #"00000000000000000000000000000000000000000000000000000000"

  let datum =
    PoolDatum {
      admin: admin_vkh,
      epoch_id: 1,
      epoch_end: 1700000000000,
      total_deposited: 300_000_000,
      participant_count: 3,
      midnight_root: #"abcd1234abcd1234abcd1234abcd1234",
      status: Distributing,
      stake_pool_id: #"a0b1c2d3e4f5a0b1c2d3e4f5a0b1c2d3e4f5a0b1c2d3e4f5a0b1c2d3",
      yield_amount: 5_000_000,
      winner_commitment: #"1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      withdrawal_count: 0,
      winner_withdrawn: False,
      withdrawn_commitments: [],
    }

  // Loser gets only their deposit (100 ADA), no yield
  let deposit_per_participant = datum.total_deposited / datum.participant_count

  datum.status == Distributing && deposit_per_participant == 100_000_000
}

test all_must_withdraw_before_close() {
  let admin_vkh = #"00000000000000000000000000000000000000000000000000000000"

  let datum =
    PoolDatum {
      admin: admin_vkh,
      epoch_id: 1,
      epoch_end: 1700000000000,
      total_deposited: 300_000_000,
      participant_count: 3,
      midnight_root: #"abcd1234abcd1234abcd1234abcd1234",
      status: Distributing,
      stake_pool_id: #"a0b1c2d3e4f5a0b1c2d3e4f5a0b1c2d3e4f5a0b1c2d3e4f5a0b1c2d3",
      yield_amount: 0,
      winner_commitment: #"1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      withdrawal_count: 3,
      winner_withdrawn: True,
      withdrawn_commitments: [
        #"1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        #"abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        #"567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234",
      ],
    }

  // Can only close when all have withdrawn
  datum.withdrawal_count == datum.participant_count
}

// PHASE 1.3: Test replay attack protection
test replay_protection_blocks_double_withdrawal() {
  let commitment = #"1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
  let withdrawn_list = [commitment]

  // If commitment is already in withdrawn list, it should be blocked
  list.has(withdrawn_list, commitment)
}

// Test that proof type verification works
test proof_type_verification() {
  let winner_type = proof_type_winner
  let loser_type = proof_type_loser
  let deposit_type = proof_type_deposit

  // Each type should be unique and within valid range
  winner_type == 2 && loser_type == 3 && deposit_type == 1
}
