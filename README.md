# MonadSocial - Decentralized Social Feed on Monad Testnet

[![MonadSocial Demo](https://img.shields.io/badge/Live%20Demo-836EF9?style=for-the-badge&logo=vercel&logoColor=white)](https://monad-social-feed.vercel.app/)
[![GitHub Repo](https://img.shields.io/badge/Repo-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/hasitha481/monad-social-feed)
[![Monad Testnet](https://img.shields.io/badge/Chain-Monad%20Testnet-200052?style=for-the-badge&logo=ethereum&logoColor=836EF9)](https://explorer.testnet.monad.xyz)

**MonadSocial** is a fully decentralized Twitter-inspired social media dApp built on the Monad blockchain testnet. Leveraging Monad's high-performance EVM Layer 1 (10k TPS, 1-second blocks), it enables seamless, low-cost interactions like posting micro-updates (text or photos), engaging via likes and comments (with micro gas fees to prevent spam), and participating in real-time polls that settle in under 1 second. Users earn mood-based rewards for engagement, with permanent on-chain ownership tracked by wallet addresses (e.g., "0xahd8...hyaba"). Posts include live transaction counters to gamify virality, and the mobile-responsive UI uses Monad's signature purple/blue branding (#836EF9 primary, #200052 backgrounds).

This MVP has generated **500+ testnet transactions**, positioning early users (and builders!) for Monad airdrops (est. 10-20% supply) and ecosystem grants ($1K-$10K+). Built as a strategic contribution to earn the "Full Access" Monad Discord role – join the "Nads" community!

## ✨ Features

- **On-Chain Posts**: Text or photo updates (IPFS storage) with permanent ownership via wallet addresses. Edit/delete with timestamps.
- **Engagement**: Likes, comments, and shares with 0.001 MON micro-fees (anti-spam). Real-time optimistic updates.
- **Real-Time Polls**: Create/vote on polls with sub-1s settlement and visual progress bars. Delete as creator.
- **Profiles**: Wallet-based identities with display names, bios, photos (0.001 MON setup fee), and stats (post count, saved items).
- **Gamification**: Tx counters per post, mood rewards for positive interactions, saved posts section.
- **UX Polish**: Rich text editor (bold/italic/emoji), mobile-responsive, Monad diamond/heart icons.
- **Low-Cost**: < $0.01 per interaction – no gas wars, thanks to Monad's efficiency.

All data persists via hybrid backend (off-chain JSON for speed) + on-chain verification.

## 🔗 Live Demo

- **dApp Frontend**: [https://monad-social-feed.vercel.app](https://monad-social-feed.vercel.app) (Vercel – mobile-friendly)
- **Backend API**: [https://monad-social-backend.onrender.com](https://monad-social-backend.onrender.com) (Render – polls/posts persistence)
- **Contracts Explorer**: 
  - Post.sol: [0xbd0aa2B4c307B6b635906200886C4Def990337bd](https://explorer.testnet.monad.xyz/address/0xbd0aa2B4c307B6b635906200886C4Def990337bd)
  - Poll.sol: [0xeaF1080862033ED8C1A8CF0afE4cDb1798c9A43b](https://explorer.testnet.monad.xyz/address/0xeaF1080862033ED8C1A8CF0afE4cDb1798c9A43b)
- **Testnet Setup**: Add Monad Testnet to MetaMask (RPC: https://rpc.testnet.monad.xyz, Chain ID: 10143). Faucet: [faucet.monad.xyz](https://faucet.monad.xyz) for MON tokens.

**Quick Test**: Connect wallet → Post "Hello Monad!" → Like/comment → Create poll → Vote. Watch txs on explorer!

## 🛠 Tech Stack

| Layer | Tech |
|-------|------|
| **Frontend** | React/TypeScript, Tailwind CSS, ethers.js v6, MetaMask integration |
| **Backend** | Node.js/Express, JSON file persistence (/data/*.json for posts/polls/profiles) |
| **Blockchain** | Solidity contracts (Post.sol, Poll.sol), Hardhat for deploy/test, Monad testnet RPC |
| **Storage** | IPFS (via Pinata for photos), On-chain for ownership/txs |
| **Deploy** | Vercel (frontend), Render (backend – free tier), GitHub monorepo |
| **Tools** | VS Code, Git Bash, MetaMask, Monad Explorer |

**Project Structure**:
```
monad-social-feed/
├── README.md                  # This file
├── vercel.json                # Monorepo deploy config
├── frontend/                  # React app
│   ├── src/
│   │   ├── components/        # Feed.jsx, PostForm.jsx, Poll.jsx, Profile.jsx
│   │   ├── hooks/             # useWallet.ts, useContracts.ts
│   │   ├── App.tsx            # Main layout
│   │   └── index.css          # Monad branding
│   ├── public/                # Icons, favicon
│   └── package.json           # React deps
├── backend/                   # Express server
│   ├── server.js              # API routes (posts, polls, profiles)
│   └── data/                  # JSON storage (posts.json, polls.json, etc.)
└── contracts/                 # Solidity
    ├── Post.sol               # Posts/likes/comments
    ├── Poll.sol               # Polls/votes
    └── hardhat.config.js      # Monad testnet deploy
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (npm/yarn)
- MetaMask wallet (add Monad Testnet: RPC https://rpc.testnet.monad.xyz, Chain ID 10143)
- Testnet MON: [faucet.monad.xyz](https://faucet.monad.xyz)

### Local Setup
1. **Clone & Install**:
   ```bash
   git clone https://github.com/hasitha481/monad-social-feed.git
   cd monad-social-feed
   npm install  # Root deps (if any)
   cd frontend && npm install  # React
   cd ../backend && npm install  # Express
   ```

2. **Deploy Contracts** (if not live):
   ```bash
   cd contracts
   npx hardhat compile
   npx hardhat run scripts/deploy.js --network monadTestnet  # Outputs addresses
   ```
   - Update `/frontend/src/contracts/abis.ts` with addresses.

3. **Run Backend**:
   ```bash
   cd backend
   node server.js  # Runs on http://localhost:3001
   ```

4. **Run Frontend**:
   ```bash
   cd frontend
   npm start  # http://localhost:3000
   ```

5. **Test**:
   - Connect MetaMask → Post/like/poll → Check explorer for txs.
   - Generate interactions: Aim for 500+ txns!

### Production Deploy
- **Frontend**: `cd frontend && vercel --prod` (free, auto-builds on push).
- **Backend**: Push to GitHub → Render auto-deploys (free tier).
- **Env Vars**: In Vercel/Render dashboard: `PINATA_API_KEY` (for IPFS photos).

## 📊 Metrics & Proof
- **Txns Generated**: 500+ on Monad testnet (explorer links above – search addresses for activity).
- **Gas Efficiency**: <0.001 MON per post/like/poll – Monad's speed in action!
- **Community**: Shared in Monad Discord #ecosystem; tagged @monad_xyz on X.

## 🤝 Contributing
1. Fork repo → Create branch (`git checkout -b feature/polls-v2`).
2. Commit changes (`git commit -m "Add poll notifications"`).
3. Push/PR (`git push origin feature/polls-v2`).
- Issues? Open one: Bugs, features, or Monad mainnet migration.

**Roadmap**:
- Mainnet launch (post-token).
- Notifications/hashtags/mentions.
- Advanced rewards (staking MON for boosts).
- Mobile app (React Native).

## 📄 License
MIT License – Free to fork/build on! See [LICENSE](LICENSE).

## 🙏 Acknowledgments
- **Monad Team**: $225M-funded L1 powering this – thanks for the ecosystem! @monad_xyz
- **Tools**: OpenZeppelin contracts, ethers.js, Pinata IPFS, Vercel/Render hosting.
- **Community**: "Nads" in Discord #ecosystem – your feedback made this shine.

💎 #MonadSocial #Web3

---

*Questions? DM @Hasitha21891279 on X or Monad Discord : hasitha481 *
