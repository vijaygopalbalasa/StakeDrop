# StakeDrop

**Privacy-Preserving No-Loss Lottery on Cardano + Midnight**

Built for the Cardano Hackathon powered by Hack2Skills

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Cardano](https://img.shields.io/badge/Cardano-Preview%20Testnet-blue)](https://cardano.org/)
[![Midnight](https://img.shields.io/badge/Midnight-ZK%20Privacy-purple)](https://midnight.network/)

---

## Overview

StakeDrop is a **no-loss lottery protocol** that combines Cardano's native staking yields with Midnight Network's zero-knowledge privacy. Users deposit ADA into a shared pool that earns staking rewards. At the end of each epoch, one random winner receives all the yield while everyone else gets their full principal back.

**Key Features:**
- Zero risk of principal loss
- Real yield from Cardano staking (~4.5% APY)
- Privacy-preserving deposits via ZK commitments
- Anonymous winner selection
- Self-custody with secret file ownership

---

## Table of Contents

- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Smart Contracts](#smart-contracts)
- [Frontend Components](#frontend-components)
- [Testing](#testing)
- [Security](#security)
- [Roadmap](#roadmap)
- [License](#license)

---

## How It Works

### The No-Loss Mechanism

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  EPOCH LIFECYCLE                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. COLLECTING        2. STAKING          3. WINNER          4. DISTRIBUTING│
│  ┌──────────┐         ┌──────────┐        ┌──────────┐       ┌──────────┐   │
│  │ Users    │         │ Pool is  │        │ ZK proof │       │ Winner   │   │
│  │ deposit  │   ──►   │ delegated│  ──►   │ selects  │  ──►  │ gets     │   │
│  │ funds    │         │ to stake │        │ winner   │       │ yield    │   │
│  │ privately│         │ pool     │        │ privately│       │ + stake  │   │
│  └──────────┘         └──────────┘        └──────────┘       └──────────┘   │
│                                                              │ Others   │   │
│                                                              │ get      │   │
│                                                              │ stake    │   │
│                                                              │ back     │   │
│                                                              └──────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Example Scenario

| Participant | Deposits | After Epoch (Winner: Alice) |
|-------------|----------|----------------------------|
| Alice       | 100 ADA  | 100 ADA + 5 ADA yield      |
| Bob         | 100 ADA  | 100 ADA (principal back)   |
| Charlie     | 100 ADA  | 100 ADA (principal back)   |
| **Pool**    | 300 ADA  | Yield: ~5 ADA @ 4.5% APY   |

**Result**: Alice wins the entire yield. Bob and Charlie lose nothing.

### Privacy with Zero-Knowledge Proofs

StakeDrop uses Midnight Network's ZK infrastructure to ensure:

1. **Hidden Deposit Amounts** - Deposits create cryptographic commitments: `commitment = hash(secret || amount)`
2. **Anonymous Participation** - Only commitments are stored on-chain, not identities
3. **Private Winner Selection** - Winner is determined without revealing who until they claim
4. **Ownership Proofs** - Withdrawals require ZK proofs that verify secret ownership without revealing it

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Next.js 14)                          │
│                     MeshJS Wallet Integration + React UI                     │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
            ┌─────────────────────┼─────────────────────┐
            ▼                     ▼                     ▼
┌───────────────────┐   ┌─────────────────┐   ┌─────────────────────┐
│  MIDNIGHT NETWORK │   │   BLOCKFROST    │   │   CARDANO NETWORK   │
│   (Privacy Layer) │   │   (API Layer)   │   │   (Staking Layer)   │
│                   │   │                 │   │                     │
│ • ZK Commitments  │   │ • UTxO queries  │   │ • Aiken Validators  │
│ • Private Proofs  │   │ • Tx submission │   │ • Pool Delegation   │
│ • Winner Selection│   │ • Chain state   │   │ • Yield Collection  │
│ • Anonymous Claims│   │                 │   │ • Fund Distribution │
└───────────────────┘   └─────────────────┘   └─────────────────────┘
```

### Data Flow

1. **Deposit Flow:**
   - User generates 32-byte random secret locally
   - Commitment computed: `SHA-256(secret || amount)`
   - Secret file downloaded to user's device
   - Deposit transaction sent to Cardano with commitment
   - Commitment registered on Midnight for privacy tracking

2. **Staking Flow:**
   - Admin initiates staking when pool reaches threshold
   - Pool UTxO delegated to Cardano stake pool
   - Rewards accrue over epoch duration (~5 days)

3. **Winner Selection Flow:**
   - Randomness derived from on-chain entropy
   - Winner commitment selected via verifiable random function
   - Winner published without revealing identity

4. **Withdrawal Flow:**
   - User uploads secret file
   - ZK proof generated proving ownership
   - Winner gets principal + yield, losers get principal
   - Replay protection prevents double withdrawals

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js 14, TypeScript, TailwindCSS | User interface with App Router |
| **Wallet** | MeshJS | Cardano wallet integration (Eternl, Nami, Lace) |
| **Blockchain Data** | Blockfrost API | Query Cardano chain state |
| **Smart Contracts (Cardano)** | Aiken (Plutus V3) | Pool validator, staking logic |
| **Smart Contracts (Midnight)** | Compact | ZK circuits for privacy |
| **Cryptography** | SHA-256, blake2b | Commitment scheme, signatures |
| **Styling** | TailwindCSS | Neo-brutalist design system |

---

## Project Structure

```
/StakeDrop
├── /contracts/cardano              # Aiken smart contracts
│   ├── aiken.toml                  # Project configuration
│   ├── aiken.lock                  # Dependency lock file
│   ├── /lib/stakedrop/
│   │   └── types.ak                # Shared type definitions
│   ├── /validators/
│   │   └── pool.ak                 # Main pool validator (Plutus V3)
│   └── /scripts/
│       ├── deploy.ts               # Deployment script
│       └── package.json            # Script dependencies
│
├── /midnight                       # Midnight Compact contracts
│   ├── package.json
│   └── /src/
│       └── stakedrop.compact       # ZK circuit definitions
│
├── /frontend                       # Next.js application
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── .env.example                # Environment template
│   └── /src/
│       ├── /app/                   # Next.js App Router
│       │   ├── layout.tsx          # Root layout with providers
│       │   ├── page.tsx            # Landing page
│       │   ├── globals.css         # Global styles
│       │   ├── /app/
│       │   │   └── page.tsx        # Main application page
│       │   └── /admin/
│       │       └── page.tsx        # Admin dashboard
│       ├── /components/
│       │   ├── Header.tsx          # Navigation header
│       │   ├── Footer.tsx          # Site footer
│       │   ├── DepositForm.tsx     # Deposit with commitment
│       │   ├── WithdrawForm.tsx    # Withdraw with ZK proof
│       │   ├── PoolStats.tsx       # Pool statistics display
│       │   ├── WalletConnect.tsx   # Wallet connection UI
│       │   ├── EpochTimer.tsx      # Countdown timer
│       │   └── /landing/           # Landing page sections
│       ├── /hooks/
│       │   ├── useCardanoWallet.ts # Wallet state management
│       │   └── usePool.ts          # Pool state management
│       ├── /lib/
│       │   ├── blockfrost.ts       # Blockfrost API client
│       │   ├── contract.ts         # Contract interaction helpers
│       │   ├── midnight.ts         # Midnight ZK integration
│       │   ├── validation.ts       # Input validation
│       │   ├── errors.ts           # Error handling
│       │   ├── fees.ts             # Fee estimation
│       │   └── constants.ts        # Configuration constants
│       └── /types/
│           └── index.ts            # TypeScript definitions
│
├── .gitignore
├── LICENSE
└── README.md
```

---

## Getting Started

### Prerequisites

```bash
# Node.js 18+ required
node --version  # v18.0.0 or higher

# Install Aiken (Cardano smart contract language)
curl -sSfL https://install.aiken-lang.org | bash
source ~/.bashrc  # or restart terminal
aiken --version   # v1.1.5 or higher
```

### Supported Wallets

- [Eternl](https://eternl.io/) - Full-featured Cardano wallet
- [Nami](https://namiwallet.io/) - Simple and lightweight
- [Lace](https://www.lace.io/) - Official IOG wallet

Configure your wallet for **Preview Testnet**.

### Get Test ADA

Visit the [Cardano Preview Faucet](https://faucet.preview.world.dev.cardano.org/) to get free test ADA.

---

### Installation

#### 1. Clone Repository

```bash
git clone https://github.com/vijaygopalbalasa/StakeDrop.git
cd StakeDrop
```

#### 2. Install Dependencies

```bash
# Root dependencies
npm install

# Frontend dependencies
cd frontend
npm install
```

#### 3. Configure Environment

Copy the example environment file:

```bash
cp frontend/.env.example frontend/.env.local
```

Edit `frontend/.env.local`:

```env
# Cardano Network Configuration
NEXT_PUBLIC_CARDANO_NETWORK=preview

# Blockfrost API (get free key at https://blockfrost.io)
NEXT_PUBLIC_BLOCKFROST_API_KEY=previewXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Pool Validator (deployed contract address)
NEXT_PUBLIC_POOL_VALIDATOR_HASH=b70f951d843a747f8a41e81aaa107a5f427b8e4a8b2124048e9030c7

# Feature Flags
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_DEBUG_MODE=false
```

#### 4. Build Smart Contracts

```bash
cd contracts/cardano
aiken build
aiken check  # Run tests - should show 7/7 passing
```

#### 5. Start Development Server

```bash
cd frontend
npm run dev
```

#### 6. Open Application

Navigate to **http://localhost:3000**

---

## Smart Contracts

### Cardano Pool Validator (Aiken)

The main validator at `contracts/cardano/validators/pool.ak` handles:

**Pool State (Datum):**
```aiken
type PoolDatum {
  admin: VerificationKeyHash,
  epoch_id: Int,
  epoch_end: POSIXTime,
  total_deposited: Int,
  participant_count: Int,
  midnight_root: ByteArray,
  status: PoolStatus,
  stake_pool_id: ByteArray,
  yield_amount: Int,
  winner_commitment: ByteArray,
  withdrawal_count: Int,
  winner_withdrawn: Bool,
  withdrawn_commitments: List<ByteArray>,
}
```

**Supported Actions (Redeemer):**
```aiken
type PoolRedeemer {
  Deposit { commitment: ByteArray, amount: Int }
  InitiateStaking
  UpdateYield { new_yield: Int }
  FinalizeEpoch { winner_commitment: ByteArray, winner_proof: ByteArray }
  WithdrawWinner { commitment: ByteArray, midnight_proof: ByteArray }
  WithdrawLoser { commitment: ByteArray, midnight_proof: ByteArray }
  ClosePool
}
```

**Security Features:**
- Minimum deposit enforcement (10 ADA)
- Admin signature verification
- ZK proof validation for withdrawals
- Replay attack protection via commitment tracking
- Division-by-zero guards

### Midnight Privacy Contracts (Compact)

Located at `midnight/src/stakedrop.compact`:

**Commitment Generation:**
```compact
witness generateCommitment(secret: Bytes<32>, amount: Field): Commitment {
  return hash(concat(secret, toBytes(amount)));
}
```

**Winner Proof Circuit:**
```compact
export circuit proveWinner(
  secret: Bytes<32>,            // Private
  amount: Field,                // Private
  myCommitment: Commitment,     // Public
  winnerCommitment: Commitment  // Public
): Boolean {
  return isWinner(secret, amount, myCommitment, winnerCommitment);
}
```

**Loser Proof Circuit:**
```compact
export circuit proveLoser(
  secret: Bytes<32>,            // Private
  amount: Field,                // Private
  myCommitment: Commitment,     // Public
  winnerCommitment: Commitment, // Public
  isRegistered: Boolean         // Public
): Boolean {
  const ownsCommitment = verifyOwnership(secret, amount, myCommitment);
  const notWinner = myCommitment != winnerCommitment;
  return ownsCommitment && isRegistered && notWinner;
}
```

---

## Frontend Components

### Key Components

| Component | Purpose |
|-----------|---------|
| `WalletConnect.tsx` | Handles wallet connection with Eternl, Nami, Lace support |
| `DepositForm.tsx` | Deposit flow with secret generation and file download |
| `WithdrawForm.tsx` | Withdrawal with secret file upload and proof generation |
| `PoolStats.tsx` | Displays pool status, participant count, prize amount |
| `EpochTimer.tsx` | Countdown to epoch end |

### Custom Hooks

| Hook | Purpose |
|------|---------|
| `useCardanoWallet` | Wallet state, connection, balance, transactions |
| `usePool` | Pool state, deposits, withdrawals, status |

### Library Modules

| Module | Purpose |
|--------|---------|
| `blockfrost.ts` | Blockfrost API integration for chain queries |
| `contract.ts` | Contract encoding/decoding, transaction building |
| `midnight.ts` | ZK commitment and proof generation |
| `validation.ts` | Input validation (amounts, addresses, secrets) |
| `errors.ts` | Custom error types with user-friendly messages |
| `fees.ts` | Transaction fee estimation |

---

## Testing

### Run Contract Tests

```bash
cd contracts/cardano
aiken check
```

Expected output:
```
Testing ...
  deposit_minimum_enforced ..................... PASS
  admin_requires_signature ..................... PASS
  winner_gets_yield ............................ PASS
  loser_gets_principal_only .................... PASS
  all_must_withdraw_before_close ............... PASS
  replay_protection_blocks_double_withdrawal ... PASS
  proof_type_verification ...................... PASS

Summary: 7 passed, 0 failed
```

### Run Frontend Build

```bash
cd frontend
npm run lint
npm run build
```

### Manual Testing Flow

1. **Connect Wallet** - Use Eternl/Nami on Preview testnet
2. **Get Test ADA** - Use the faucet link in the app
3. **Make Deposit** - Enter amount, download secret file
4. **Check Pool Stats** - Verify deposit registered
5. **Test Withdrawal** - Upload secret file, claim funds

---

## Security

### Security Features

- **ZK Proof Verification**: All withdrawals verified via blake2b signature check
- **Replay Protection**: Withdrawn commitments tracked to prevent double spending
- **Admin Controls**: Epoch management requires admin signature
- **Input Validation**: Client-side and on-chain validation
- **Self-Custody**: Users control their secrets locally

### Security Considerations

1. **Secret File Storage**: Users must securely store their secret files. Lost secrets mean lost funds.
2. **Testnet Only**: This is a hackathon project. Not audited for mainnet use.
3. **Admin Trust**: Current version requires trusted admin for epoch management.

### Known Limitations

- Demo mode uses simulated ZK proofs (not real Midnight network)
- Admin key is centralized (future: DAO governance)
- No formal security audit performed

---

## Roadmap

- [x] Core deposit/withdraw flow
- [x] Wallet integration (Eternl, Nami, Lace)
- [x] ZK commitment scheme
- [x] Aiken smart contracts with tests
- [x] Midnight Compact privacy contracts
- [x] Input validation and error handling
- [x] Fee estimation
- [ ] Full Midnight network integration
- [ ] Multi-pool support (different stake tiers)
- [ ] DAO governance for parameters
- [ ] Security audit
- [ ] Mainnet deployment

---

## Resources

### Documentation
- [Midnight Developer Hub](https://midnight.network/developer-hub)
- [Midnight Documentation](https://docs.midnight.network/)
- [Cardano Developer Portal](https://developers.cardano.org/)
- [Aiken Language Guide](https://aiken-lang.org/language-tour)
- [MeshJS Documentation](https://meshjs.dev/apis)

### Tools
- [Blockfrost Dashboard](https://blockfrost.io/)
- [Cardano Preview Faucet](https://faucet.preview.world.dev.cardano.org/)
- [CardanoScan Preview](https://preview.cardanoscan.io/)

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- Built for the **Cardano Hackathon** powered by **Hack2Skills**
- Thanks to IOG for Cardano and Midnight Network
- Thanks to the Aiken team for the smart contract language
- Thanks to MeshJS for wallet integration tools
