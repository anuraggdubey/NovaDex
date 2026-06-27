<div align="center">

# ◆ NovaDEX

**Intent-based DEX aggregator on Stellar**

Smart routing · Best execution · On-chain settlement

[![Next.js](https://img.shields.io/badge/Next.js_14-black?logo=nextdotjs)](https://nextjs.org)
[![Stellar](https://img.shields.io/badge/Stellar-7C3AED?logo=stellar)](https://stellar.org)
[![Soroban](https://img.shields.io/badge/Soroban-059669)](https://soroban.stellar.org)
[![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com)

</div>

---

## What is NovaDEX?

NovaDEX finds the **optimal swap route** across Stellar's liquidity sources (SDEX, Aquarius AMM pools) and executes it through a single Soroban transaction — giving you the best price with minimal slippage.

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
# Fill in your Supabase keys + contract IDs

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
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `NEXT_PUBLIC_AGGREGATOR_CONTRACT_ID` | Deployed router contract ID |
| `NEXT_PUBLIC_ORACLE_CONTRACT_ID` | Deployed oracle contract ID |

> See [`.env.example`](.env.example) for the full template.

## Contracts

Soroban smart contracts in `contracts/` (Rust workspace):

- **`aggregator_router`** — Executes multi-hop swaps atomically on-chain
- **`price_oracle`** — Provides reliable price feeds for route comparison

Build with the Stellar/Soroban CLI toolchain. After deployment, paste the contract IDs into `.env.local`.

## Scripts

```bash
npm run dev      # Dev server
npm run build    # Production build
npm run lint     # ESLint
npx tsc --noEmit # Type check
```

---

<div align="center">
<sub>Built for the Stellar ecosystem ◆</sub>
</div>
