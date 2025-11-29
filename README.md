# StakeDrop

**Privacy-Preserving No-Loss Lottery on Cardano + Midnight**

Built for the Cardano Hackathon powered by Hack2Skills

---

## Overview

StakeDrop is a no-loss lottery protocol that combines Cardano's staking yields with Midnight's zero-knowledge privacy layer. Users deposit funds, which are pooled and staked to earn real ADA rewards. A random winner receives all the yield, while everyone else gets their principal back - **no one loses**.

### Key Features

- **No Loss Guaranteed** - Every participant gets at least their deposit back
- **Privacy First** - Deposit amounts and identities hidden using ZK proofs
- **Real Yield** - Powered by Cardano's stake pool delegation
- **Transparent Selection** - Verifiable random winner selection via ZK circuits

---

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (NextJS)                        │
│              MeshJS Midnight + Cardano Wallet Integration        │
└─────────────────────────────┬───────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ MIDNIGHT NETWORK │  │  BRIDGE SCRIPT  │  │ CARDANO NETWORK │
│  (Privacy Layer) │  │   (TypeScript)  │  │ (Staking Layer) │
│                  │  │                 │  │                 │
│ • Shielded       │  │ • Query Midnight│  │ • Aiken Pool    │
│   Deposits       │◄─┤   commitments   ├─►│   Validator     │
│ • ZK Proofs      │  │ • Aggregate     │  │ • Stake to Pool │
│ • Private Winner │  │   deposits      │  │ • Claim Rewards │
│   Selection      │  │ • Trigger       │  │                 │
│ • Anonymous      │  │   staking       │  │                 │
│   Withdrawal     │  └─────────────────┘  └─────────────────┘
└─────────────────┘
```

### User Flow

1. **Alice deposits 100 ADA** → Generates secret file, commitment registered on Midnight
2. **Bob deposits 100 ADA** → Same process, identity hidden
3. **Charlie deposits 100 ADA** → Pool now has 300 ADA
4. **Pool locks** → Deposits close, staking begins
5. **Bridge stakes funds** → 300 ADA delegated to Cardano stake pool
6. **Epoch ends** → Staking rewards: ~5 ADA
7. **Winner selected** → ZK proof determines winner privately
8. **Alice wins!** → Claims 100 ADA + 5 ADA yield
9. **Bob & Charlie** → Claim back 100 ADA each

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Smart Contracts (Cardano) | **Aiken** | Pool validator, staking logic |
| Smart Contracts (Midnight) | **Compact** | Private deposits, ZK winner selection |
| Frontend | **NextJS 14 + TypeScript** | User interface |
| Wallet Integration | **MeshJS** | Dual-chain wallet support |
| Bridge | **Node.js/TypeScript** | Cross-chain coordination |

---

## Project Structure

```
/stakedrop
├── /contracts/cardano      # Aiken smart contracts
│   ├── aiken.toml
│   ├── /lib/stakedrop/types.ak
│   └── /validators/pool.ak
│
├── /midnight               # Midnight Compact contracts
│   ├── package.json
│   └── /src/stakedrop.compact
│
├── /frontend               # NextJS application
│   ├── /src/app            # Pages
│   ├── /src/components     # UI components
│   ├── /src/hooks          # React hooks
│   └── /src/lib            # Utilities
│
├── /bridge                 # Cross-chain bridge
│   └── /src
│       ├── index.ts
│       ├── cardano-client.ts
│       └── midnight-client.ts
│
├── docker-compose.yml
└── README.md
```

---

## Prerequisites

### Required Software

```bash
# Node.js 20+
node --version  # Should be >= 20

# Aiken (Cardano smart contracts)
cargo install aiken --version 1.1.5

# Docker (for Midnight proof server)
docker --version
```

### Wallets

- **[Lace Wallet](https://www.lace.io/)** - For Midnight testnet
- **[Eternl Wallet](https://eternl.io/)** - For Cardano Preview testnet

### Testnet Tokens

- **Cardano Preview Faucet**: https://faucet.preview.world.dev.cardano.org/
- **Midnight Testnet**: Request access at https://midnight.network/developer-hub

---

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/vijaygopalbalasa/StakeDrop.git
cd StakeDrop
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

```bash
cp bridge/.env.example bridge/.env
# Edit bridge/.env with your API keys and mnemonic
```

### 4. Build Contracts

```bash
# Build Cardano contracts
cd contracts/cardano
aiken build

# Build Midnight contracts
cd ../../midnight
npm run compile
```

### 5. Start Development

```bash
# Start all services
docker-compose up -d

# Or run frontend only
cd frontend
npm run dev
```

### 6. Open Application

Visit http://localhost:3000

---

## Smart Contracts

### Cardano Pool Validator (Aiken)

The pool validator manages:
- Deposits with Midnight commitment verification
- Stake pool delegation
- Yield distribution
- Winner/loser withdrawals

```aiken
validator pool {
  spend(datum, redeemer, own_ref, tx) {
    when redeemer is {
      Deposit { commitment, amount } -> // Register deposit
      InitiateStaking -> // Admin locks pool, starts staking
      FinalizeEpoch { winner_commitment, proof } -> // Set winner
      WithdrawWinner { proof } -> // Winner claims yield + principal
      WithdrawLoser { proof } -> // Loser claims principal
    }
  }
}
```

### Midnight Privacy Contract (Compact)

The Compact contract handles:
- Private commitment registration
- ZK proof generation for ownership
- Verifiable random winner selection
- Anonymous withdrawal proofs

```compact
// Generate commitment from secret + amount
export circuit proveDeposit(secret, amount, commitment): Boolean

// Prove you are the winner
export circuit proveWinner(secret, myCommitment, winnerCommitment): Boolean

// Prove you are a participant (but not winner)
export circuit proveLoser(secret, myCommitment, winnerCommitment): Boolean
```

---

## Bridge Script

The bridge coordinates cross-chain operations:

```bash
# Start bridge service
cd bridge
npm run dev

# Available commands
npm run stake      # Initiate staking
npm run finalize   # Select winner and finalize epoch
npm run status     # Check pool status on both chains
```

---

## Environment Variables

### Bridge (`.env`)

```env
CARDANO_NETWORK=preview
BLOCKFROST_API_KEY=your_blockfrost_key
STAKE_POOL_ID=pool1pu5jlj...
MIDNIGHT_NETWORK_URL=https://testnet.midnight.network
ADMIN_MNEMONIC=your 24 word mnemonic
```

### Frontend (`.env.local`)

```env
NEXT_PUBLIC_NETWORK=preview
NEXT_PUBLIC_BLOCKFROST_API_KEY=your_key
NEXT_PUBLIC_MIDNIGHT_NETWORK_URL=http://localhost:6300
```

---

## Demo Flow

### For Judges

1. **Connect Wallet** - Use Eternl on Preview testnet
2. **Deposit** - Enter amount, download secret file
3. **View Pool** - See TVL, participant count, epoch timer
4. **Withdraw** - Upload secret file, claim funds

### Demo Transactions

| Step | Chain | Action |
|------|-------|--------|
| 1 | Midnight | Shielded deposit (amount hidden) |
| 2 | Cardano | Stake delegation (transparent) |
| 3 | Cardano | Reward claim (transparent) |
| 4 | Midnight | Winner selection (private) |
| 5 | Cardano | Withdrawal (verified by ZK proof) |

---

## Security Considerations

- **Secret Files** - Users must save their secret files securely. Lost secrets = lost funds.
- **ZK Proofs** - All ownership claims are verified via zero-knowledge proofs.
- **Admin Keys** - Bridge requires admin keys for epoch management.
- **Testnet Only** - This is a hackathon project, not production-ready.

---

## Roadmap

- [ ] Multi-pool support (different stake amounts)
- [ ] DAO governance for pool parameters
- [ ] NFT tickets for lottery entries
- [ ] Mainnet deployment

---

## Team

Built for the Cardano Hackathon powered by Hack2Skills

---

## Resources

- [Midnight Network](https://midnight.network/)
- [Midnight Docs](https://docs.midnight.network/)
- [Cardano Developer Portal](https://developers.cardano.org/)
- [Aiken Language](https://aiken-lang.org/)
- [MeshJS](https://meshjs.dev/)

---

## License

MIT License - See [LICENSE](LICENSE) for details
