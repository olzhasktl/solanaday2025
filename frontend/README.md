# Solana VRF Lottery Frontend

A modern React-based frontend for the Solana VRF Lottery system.

## Features

- **Deposit**: Deposit USDC to participate in the VRF lottery
- **Balance**: View your deposit balance and pool statistics
- **Rewards**: Run VRF lottery and claim rewards
- **Withdraw**: Withdraw your deposited USDC

## Tech Stack

- React 18
- Vite (build tool)
- Solana Web3.js
- Anchor (Solana program framework)
- Solana Wallet Adapter
- Lucide React (icons)

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Open your browser to `http://localhost:3000`

## Wallet Connection

The app supports:
- Phantom Wallet
- Solflare Wallet
- Other Solana wallets via Wallet Adapter

## How It Works

1. **Connect Wallet**: Connect your Solana wallet to interact with the program
2. **Deposit USDC**: Deposit USDC to participate in the lottery
3. **View Balance**: Check your deposit and pool statistics
4. **Run Lottery**: Execute VRF lottery to select a winner
5. **Claim Rewards**: Winner can claim the reward pool
6. **Withdraw**: Withdraw your deposited USDC anytime

## VRF System

The lottery uses a secure multi-entropy VRF system:
- Multiple entropy sources (time, slot, epoch, pool data)
- Weighted selection based on deposit amounts
- 1-minute cooldown between lottery runs
- Fair reward distribution

## Development

- **Build**: `npm run build`
- **Preview**: `npm run preview`

## Network

Currently configured for Solana Devnet. Update the network configuration in `src/utils/wallet.js` to change networks.

## Program Integration

The frontend connects to the deployed Solana program:
- Program ID: `3dGV3HXpcuYTifzFg8dCCMxgDEVhQpHtoCLJXAcK6PAE`
- Network: Devnet
- USDC Mint: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`
