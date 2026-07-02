<div align="center">

# ◆ NovaDEX

**Intent-based DEX aggregator on Stellar**

Smart routing · Best execution · On-chain settlement

[![Next.js](https://img.shields.io/badge/Next.js_14-black?logo=nextdotjs)](https://nextjs.org)
[![Stellar](https://img.shields.io/badge/Stellar-7C3AED?logo=stellar)](https://stellar.org)
[![Soroban](https://img.shields.io/badge/Soroban-059669)](https://soroban.stellar.org)
[![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![CI](https://github.com/anuraggdubey/NovaDex/actions/workflows/ci.yml/badge.svg)](https://github.com/anuraggdubey/NovaDex/actions/workflows/ci.yml)

</div>

---

## What is NovaDEX?

NovaDEX finds the **optimal swap route** across Stellar's liquidity sources (SDEX, Aquarius AMM pools) and executes it through a single atomic transaction — Soroban router attestation, path-payment liquidity, and on-chain savings proof.

## Live Demo & Submission Proof

| Resource | Link |
|----------|------|
| **Live App** | _Add your deployed URL here (e.g. `https://novadex.vercel.app`)_ |
| **Demo Video** | _Add your demo video URL here (e.g. Loom / YouTube)_ |
| **Repository** | [github.com/anuraggdubey/NovaDex](https://github.com/anuraggdubey/NovaDex) |
| **Twitter / X** | [@anuraggdubeyy](https://x.com/anuraggdubeyy) |

## Deployed Contracts (Stellar Testnet)

Redeployed **2026-07-02** with `attest_swap` (router) and `record_savings_user` (oracle).

| Contract | ID | Explorer |
|----------|-----|----------|
| **Aggregator Router** | `CDUBGNAQCVTCPNRE3AUVFYPYE6UWFBVHPGX4BRBDGFNWBV7WERNC3Q7U` | [Stellar Expert](https://stellar.expert/explorer/testnet/contract/CDUBGNAQCVTCPNRE3AUVFYPYE6UWFBVHPGX4BRBDGFNWBV7WERNC3Q7U) |
| **Price Oracle** | `CBPPZGP6ER3EGT5LIJNOWQE3QYRNFH5FRCT4ZHB2D6RPXV5SEV2H2RLK` | [Stellar Expert](https://stellar.expert/explorer/testnet/contract/CBPPZGP6ER3EGT5LIJNOWQE3QYRNFH5FRCT4ZHB2D6RPXV5SEV2H2RLK) |

- **Network:** Stellar Testnet  
- **Protocol fee:** 10 bps (0.1%)  
- **Admin:** `GBOOE7MNH34TFXUJFY5B2IFUTKKJSSH77JDPA3HTHWLGKGIOCOVHPPW5`

## Real-World Utility (The "Binance Example")

How does swapping tokens on a DEX actually translate to real money?

If a user wants to cash out their crypto, they can use NovaDEX on Mainnet to swap their volatile `XLM` into `USDC` at the absolute best market rate. Because Binance natively supports Stellar USDC deposits, the user can instantly transfer that USDC from their Freighter wallet directly to Binance (settling in < 5 seconds for a fraction of a penny), and then withdraw it to their bank account as US Dollars.

👉 **[Read the full Real-World Workflow & Binance Example here](working.md)**

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 · React 18 · Tailwind CSS · Framer Motion |
| State | Zustand stores (wallet, swap, toast) |
| Wallets | Freighter · Albedo |
| Backend | Next.js API routes · Supabase (Postgres) |
| Contracts | Soroban (Rust) — Aggregator Router + Price Oracle |
| Network | Stellar Testnet (mainnet-ready) |

## Project Structure

```
src/
├── app/              → Pages, layouts, API routes
│   └── client-app.tsx → Main application shell
├── components/       → Reusable UI (logo, etc.)
├── lib/              → Stellar SDK, routing engine, Supabase client
├── store/            → Zustand stores
└── types/            → TypeScript interfaces

contracts/
├── aggregator_router/ → Soroban swap router contract
└── price_oracle/      → On-chain price feed contract

supabase/
└── schema.sql         → Database schema
```

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
# Fill in your Supabase keys (never commit .env.local)

# 3. Run Supabase schema
# Paste supabase/schema.sql in Supabase SQL Editor

# 4. Start dev server
npm run dev
```

Open **http://localhost:3000**

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_STELLAR_NETWORK` | `testnet` or `mainnet` |
| `NEXT_PUBLIC_HORIZON_URL` | Horizon API endpoint |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (**secret — server only**) |
| `NEXT_PUBLIC_AGGREGATOR_CONTRACT_ID` | Deployed router contract ID |
| `NEXT_PUBLIC_ORACLE_CONTRACT_ID` | Deployed oracle contract ID |
| `NEXT_PUBLIC_TESTNET_ISSUER` | Testnet token issuer (testnet only) |

> See [`.env.example`](.env.example) for the full template. **Never commit `.env.local`** — it contains Supabase service keys.

## Contracts

Soroban smart contracts in `contracts/` (Rust workspace):

- **`aggregator_router`** — Route quotes, `attest_swap` on-chain settlement attestation, split swap logic
- **`price_oracle`** — Price checkpoints and `record_savings_user` on-chain savings proof

Build and redeploy:

```bash
cd contracts
stellar contract build
# See DEPLOYMENT_GUIDE.md for full deploy + initialize steps
```

## Scripts

```bash
npm run dev       # Dev server
npm run build     # Production build
npm run lint      # ESLint
npm run typecheck # TypeScript check
```

---

<div align="center">
<sub>Built for the Stellar ecosystem ◆ Stellar Hackathon 2026</sub>
</div>
