# StakeDrop

**Privacy-Preserving No-Loss Lottery on Cardano + Midnight**

Built for the Cardano Hackathon powered by Hack2Skills

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Cardano](https://img.shields.io/badge/Cardano-Preview%20Testnet-blue)](https://cardano.org/)
[![Midnight](https://img.shields.io/badge/Midnight-ZK%20Privacy-purple)](https://midnight.network/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![Aiken](https://img.shields.io/badge/Aiken-Smart%20Contracts-red)](https://aiken-lang.org/)

---

## Live Demo

**Frontend**: [StakeDrop on Vercel](https://stake-drop.vercel.app) *(Deploy to see live)*

**Smart Contract**: Deployed on Cardano Preview Testnet
- **Validator Hash**: `b70f951d843a747f8a41e81aaa107a5f427b8e4a8b2124048e9030c7`
- **Script Address**: `addr_test1wzkslg5wcgaf3l792pu35g89arr0y7h3j5tz3ysfr5jpsc3aq7vnw`

---

## Overview

StakeDrop is a **no-loss lottery protocol** that combines Cardano's native staking yields with Midnight Network's zero-knowledge privacy. Users deposit ADA into a shared pool that earns staking rewards. At the end of each epoch, one random winner receives all the yield while everyone else gets their full principal back.

### Why StakeDrop?

| Traditional Lottery | StakeDrop |
|---------------------|-----------|
| Lose your money if you don't win | Get your full deposit back |
| No privacy - everyone sees your bet | ZK commitments hide your participation |
| House always wins | Protocol takes no fees (yield-only) |
| Trust the operator | Trustless smart contracts |

---

## Key Features

- **Zero Risk**: Your principal is always safe - worst case you get 100% back
- **Real Yield**: Powered by Cardano staking (~4.5% APY)
- **Privacy-First**: ZK commitments ensure anonymous participation
- **Wallet-Based Recovery**: No files to download - your wallet IS your key
- **On-Chain Verification**: All deposits and commitments verified on blockchain
- **Neo-Brutalist UI**: Modern, bold design with excellent UX

---

## Table of Contents

- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Smart Contracts](#smart-contracts)
- [Frontend Features](#frontend-features)
- [API Integration](#api-integration)
- [Deployment](#deployment)
- [Security](#security)
- [Roadmap](#roadmap)

---

## How It Works

### The No-Loss Mechanism

```
+-----------------------------------------------------------------------------+
|  EPOCH LIFECYCLE                                                             |
+-----------------------------------------------------------------------------+
|                                                                              |
|  1. COLLECTING        2. STAKING          3. SELECTING        4. DISTRIBUTING|
|  +----------+         +----------+        +----------+        +----------+   |
|  | Users    |         | Pool is  |        | ZK proof |        | Winner   |   |
|  | deposit  |   -->   | delegated|  -->   | selects  |  -->   | gets     |   |
|  | funds    |         | to stake |        | winner   |        | yield    |   |
|  | privately|         | pool     |        | randomly |        | + stake  |   |
|  +----------+         +----------+        +----------+        +----------+   |
|                                                               | Others   |   |
|                                                               | get      |   |
|                                                               | stake    |   |
|                                                               | back     |   |
|                                                               +----------+   |
+-----------------------------------------------------------------------------+
```

### Example Scenario

| Participant | Deposits | After Epoch (Winner: Alice) |
|-------------|----------|----------------------------|
| Alice       | 100 ADA  | 100 ADA + 5 ADA yield      |
| Bob         | 100 ADA  | 100 ADA (principal back)   |
| Charlie     | 100 ADA  | 100 ADA (principal back)   |
| **Pool**    | 300 ADA  | Yield: ~5 ADA @ 4.5% APY   |

**Result**: Alice wins the entire yield. Bob and Charlie lose nothing.

### Privacy Flow

1. **Deposit**: User signs a message with wallet -> generates deterministic secret -> creates commitment
2. **On-Chain**: Only commitment (hash) stored - not identity or amount details
3. **Winner Selection**: Random winner chosen from on-chain commitments
4. **Withdrawal**: User proves ownership via ZK proof without revealing identity

---

## Architecture

```
+-----------------------------------------------------------------------------+
|                              FRONTEND (Next.js 14)                          |
|                     MeshJS Wallet + TailwindCSS + Neo-Brutalist UI          |
+--------------------------------------+--------------------------------------+
                                       |
            +--------------------------+--------------------------+
            |                          |                          |
            v                          v                          v
+-------------------+     +-------------------+     +-------------------+
|  CARDANO NETWORK  |     |   BLOCKFROST/     |     |  MIDNIGHT NETWORK |
|   (Settlement)    |     |   KOIOS API       |     |   (Privacy)       |
|                   |     |                   |     |                   |
| - Aiken Validator |     | - UTxO queries    |     | - Compact Circuit |
| - Pool Delegation |     | - Tx metadata     |     | - ZK Commitments  |
| - Fund Storage    |     | - Chain state     |     | - Winner Proofs   |
| - CIP-20 Metadata |     | - Epoch info      |     | - Loser Proofs    |
+-------------------+     +-------------------+     +-------------------+
```

### Key Data Flows

**Deposit Flow:**
```
User Wallet --> Sign Message --> SHA-256(signature) --> Commitment
                                        |
                                        v
                              Cardano Tx with CIP-20 Metadata
                                        |
                                        v
                              On-Chain Commitment Registry
```

**Withdrawal Flow:**
```
User Wallet --> Re-sign Message --> Verify Commitment Match
                                        |
                                        v
                              Generate ZK Proof (Winner/Loser)
                                        |
                                        v
                              Cardano Withdrawal Tx
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js 14, TypeScript, TailwindCSS | Modern React with App Router |
| **Wallet** | MeshJS | Cardano wallet integration |
| **Blockchain API** | Blockfrost + Koios (fallback) | Chain queries, tx submission |
| **Smart Contracts** | Aiken (Plutus V3) | Pool validator logic |
| **Privacy Layer** | Midnight Compact | ZK circuits for privacy |
| **Styling** | TailwindCSS | Neo-brutalist design system |
| **Deployment** | Vercel | Serverless hosting |

---

## Getting Started

### Prerequisites

```bash
# Node.js 18+ required
node --version  # v18.0.0 or higher

# Install Aiken (optional - for contract development)
curl -sSfL https://install.aiken-lang.org | bash
aiken --version   # v1.1.5 or higher
```

### Installation

```bash
# Clone repository
git clone https://github.com/vijaygopalbalasa/StakeDrop.git
cd StakeDrop

# Install frontend dependencies
cd frontend
npm install

# Configure environment
cp .env.example .env.local
```

### Environment Variables

Edit `frontend/.env.local`:

```env
# Network Configuration
NEXT_PUBLIC_CARDANO_NETWORK=preview

# Blockfrost API (get free key at https://blockfrost.io)
NEXT_PUBLIC_BLOCKFROST_PROJECT_ID=previewXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Contract Address (pre-deployed)
NEXT_PUBLIC_POOL_VALIDATOR_HASH=b70f951d843a747f8a41e81aaa107a5f427b8e4a8b2124048e9030c7

# Optional: Admin wallet for pool management
NEXT_PUBLIC_ADMIN_ADDRESS=addr_test1qz...
```

### Run Development Server

```bash
cd frontend
npm run dev
```

Open **http://localhost:3000**

### Supported Wallets

- **Eternl** - Full-featured Cardano wallet
- **Nami** - Simple and lightweight
- **Lace** - Official IOG wallet
- **Flint** - Mobile-friendly option

Configure your wallet for **Preview Testnet** and get test ADA from the [Cardano Faucet](https://faucet.preview.world.dev.cardano.org/).

---

## Smart Contracts

### Cardano Pool Validator (Aiken)

Located at `contracts/cardano/validators/pool.ak`

**Pool State (Datum):**
```aiken
type PoolDatum {
  admin: VerificationKeyHash,
  epoch_id: Int,
  epoch_end: POSIXTime,
  total_deposited: Int,
  participant_count: Int,
  midnight_root: ByteArray,      // Merkle root of commitments
  status: PoolStatus,            // Collecting | Staking | SelectingWinner | Distributing
  stake_pool_id: ByteArray,
  yield_amount: Int,
  winner_commitment: ByteArray,  // Selected winner's commitment
  withdrawal_count: Int,
  winner_withdrawn: Bool,
  withdrawn_commitments: List<ByteArray>,  // Replay protection
}
```

**Supported Actions:**
- `Deposit` - Add funds with ZK commitment
- `InitiateStaking` - Start staking period
- `UpdateYield` - Update accumulated yield
- `FinalizeEpoch` - Select winner commitment
- `WithdrawWinner` - Winner claims principal + yield
- `WithdrawLoser` - Non-winner claims principal
- `ClosePool` - Admin cleanup

### Midnight Privacy Contracts (Compact)

Located at `midnight/src/stakedrop.compact`

**7 Compiled Circuits:**
1. `generateCommitment` - Create ZK commitment from secret
2. `verifyOwnership` - Prove you own a commitment
3. `proveWinner` - Prove you are the winner
4. `proveLoser` - Prove you participated but didn't win
5. `verifyProof` - Validate any proof
6. `isParticipant` - Check participation status
7. `selectWinner` - Random winner selection

---

## Frontend Features

### Pages

| Route | Purpose |
|-------|---------|
| `/` | Landing page with features and CTA |
| `/app` | Main application - deposit/withdraw interface |
| `/admin` | Pool management dashboard |

### Key Components

| Component | Features |
|-----------|----------|
| `DepositForm` | Amount input, wallet signing, commitment generation, tx history |
| `WithdrawForm` | Deposit selection, proof generation, on-chain verification |
| `PoolStats` | Live pool data, participant count, prize amount |
| `WalletConnect` | Multi-wallet support, network switching |
| `EpochTimer` | Countdown to epoch end |

### Blockchain Integration

The app fetches deposit data directly from the blockchain:

```typescript
// Fetch deposits from blockchain transaction metadata
const deposits = await fetchDepositsFromBlockchain();

// Verify commitment exists on-chain
const isVerified = await isCommitmentOnChain(commitment);

// Get commitments from CIP-20 metadata (label 674)
const commitments = await getCommitmentsFromBlockchain();
```

---

## API Integration

### Blockfrost (Primary)

```typescript
// UTxO queries
GET /addresses/{address}/utxos

// Transaction metadata
GET /txs/{hash}/metadata

// Epoch info
GET /epochs/latest
```

### Koios (Fallback)

Free, no API key required:

```typescript
// Blockchain tip
GET /tip

// Address info
POST /address_info
```

---

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Set environment variables:
   - `NEXT_PUBLIC_CARDANO_NETWORK`
   - `NEXT_PUBLIC_BLOCKFROST_PROJECT_ID`
   - `NEXT_PUBLIC_POOL_VALIDATOR_HASH`
4. Deploy

### Manual Build

```bash
cd frontend
npm run build
npm start
```

### Contract Deployment

```bash
cd contracts/cardano
aiken build
node scripts/deploy.mjs
```

---

## Security

### Security Features

- **ZK Proof Verification**: Withdrawals require valid proofs
- **Replay Protection**: Withdrawn commitments tracked
- **On-Chain Verification**: All data verified from blockchain
- **Wallet-Derived Secrets**: Deterministic, recoverable
- **Input Validation**: Client + on-chain validation

### Security Model

| Aspect | Status |
|--------|--------|
| Smart Contract Tests | 7/7 passing |
| ZK Circuit Compilation | 7 circuits verified |
| Input Validation | Comprehensive |
| Replay Protection | Implemented |
| Admin Controls | Signature verified |

### Known Limitations

- Testnet only (not audited for mainnet)
- Admin key is centralized (future: DAO)
- Midnight integration is simulated in demo mode

---

## Roadmap

### Completed

- [x] Core deposit/withdraw flow
- [x] Multi-wallet integration (Eternl, Nami, Lace, Flint)
- [x] ZK commitment scheme
- [x] Aiken smart contracts with tests
- [x] Midnight Compact contracts (7 circuits)
- [x] Blockchain-based deposit verification
- [x] On-chain commitment fetching
- [x] CIP-20 metadata integration
- [x] Koios API fallback
- [x] Neo-brutalist UI design
- [x] Vercel deployment ready

### Planned

- [ ] Full Midnight mainnet integration
- [ ] Multi-pool support (different stake tiers)
- [ ] DAO governance for parameters
- [ ] Security audit
- [ ] Mainnet deployment

---

## Project Structure

```
StakeDrop/
├── contracts/cardano/           # Aiken smart contracts
│   ├── validators/pool.ak       # Main pool validator
│   ├── lib/stakedrop/types.ak   # Type definitions
│   └── scripts/                 # Deployment scripts
├── midnight/                    # Midnight Compact contracts
│   └── src/stakedrop.compact    # ZK circuits
├── frontend/                    # Next.js application
│   ├── src/
│   │   ├── app/                 # Pages (/, /app, /admin)
│   │   ├── components/          # React components
│   │   ├── hooks/               # Custom hooks
│   │   ├── lib/                 # Utilities
│   │   │   ├── blockchain.ts    # On-chain data fetching
│   │   │   ├── blockfrost.ts    # Blockfrost API
│   │   │   ├── koios.ts         # Koios API (fallback)
│   │   │   ├── contract.ts      # Contract helpers
│   │   │   └── midnight.ts      # ZK integration
│   │   └── types/               # TypeScript types
│   ├── .env.example             # Environment template
│   └── package.json
├── README.md
└── LICENSE
```

---

## Resources

### Documentation
- [Midnight Developer Hub](https://midnight.network/developer-hub)
- [Cardano Developer Portal](https://developers.cardano.org/)
- [Aiken Language Guide](https://aiken-lang.org/language-tour)
- [MeshJS Documentation](https://meshjs.dev/apis)

### Tools
- [Blockfrost Dashboard](https://blockfrost.io/)
- [Cardano Preview Faucet](https://faucet.preview.world.dev.cardano.org/)
- [CardanoScan Preview](https://preview.cardanoscan.io/)

---

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push branch (`git push origin feature/amazing`)
5. Open Pull Request

---

## License

MIT License - see [LICENSE](LICENSE) file.

---

## Acknowledgments

- Built for **Cardano Hackathon** powered by **Hack2Skills**
- Cardano Foundation & IOG for blockchain infrastructure
- Midnight Network for ZK privacy layer
- Aiken team for smart contract language
- MeshJS team for wallet integration

---

**Made with love for the Cardano community**
