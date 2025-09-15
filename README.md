# MonadSocial - Decentralized Social Feed on Monad
# 🚀 MonadSocial - Decentralized Social Feed

A Twitter-like decentralized social media dApp built on Monad blockchain testnet.

## 🌟 Features

- **Post Updates**: Text and photo posts with permanent blockchain ownership
- **Real-time Interactions**: Like, comment, and share with micro gas fees
- **Instant Polls**: Voting that settles in <1 second (powered by Monad's speed)
- **Wallet Identity**: Display as truncated addresses (0xahd8...hyaba)
- **Mobile-First**: Responsive design with Monad branding
- **Gamification**: Transaction counters and mood-based rewards

## 🛠 Tech Stack

- **Blockchain**: Monad Testnet (EVM-compatible)
- **Smart Contracts**: Solidity + Hardhat
- **Frontend**: React + TypeScript + Tailwind CSS
- **Integration**: ethers.js
- **Storage**: IPFS (Pinata)
- **Deployment**: Vercel/Netlify

## 🔗 Monad Network Details

- **RPC URL**: https://rpc.testnet.monad.xyz
- **Chain ID**: 41454
- **Explorer**: https://explorer.testnet.monad.xyz
- **Faucet**: https://faucet.monad.xyz

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MetaMask wallet
- Monad testnet MON tokens

### Setup
```bash
# Clone repository
git clone <your-repo-url>
cd monad-social-feed

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Fill in your private key and API keys

# Compile contracts
npm run compile

# Start frontend
npm run frontend