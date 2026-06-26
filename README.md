# NovaDEX

NovaDEX is an intent-based DEX aggregator for Stellar. It compares liquidity across Stellar sources, estimates the best swap route, supports wallet-native identity through Freighter or Albedo, and records user/history analytics through Supabase-backed API routes.

The app is built with Next.js App Router, React, Tailwind CSS, Zustand, Stellar SDK/Freighter APIs, Supabase, and Soroban contract workspaces.

## Features

- Wallet connect with Freighter and Albedo
- Testnet/mainnet-aware Stellar configuration
- Smart route estimation across SDEX/Horizon and Aquarius
- Route alternatives, price impact, savings, and route fingerprints
- Swap history, wallet analytics, favourites, and global metrics APIs
- Soroban contract workspace for the aggregator router and price oracle

## Project Structure

```text
src/app/                 Next.js App Router pages, layout, and API routes
src/app/client-app.tsx   Main interactive NovaDEX application shell
src/lib/                 Stellar, routing, auth, and Supabase helpers
src/store/               Zustand wallet, swap, and toast stores
src/types/               Shared application and Supabase types
supabase/schema.sql      Database schema for users, swaps, favourites, and stats
contracts/               Soroban Rust workspace
```

## Requirements

- Node.js 20 or newer
- npm
- A Supabase project
- Freighter browser extension for the full wallet flow
- Rust and Stellar/Soroban tooling if you plan to build or deploy contracts

## Environment Setup

Copy the example file and fill in the project-specific values:

```bash
cp .env.example .env.local
```

Required values:

```env
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_HORIZON_URL=https://horizon-testnet.stellar.org
NEXT_PUBLIC_AQUARIUS_API_URL=https://amm-api.aqua.network
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
NEXT_PUBLIC_AGGREGATOR_CONTRACT_ID=set_after_contract_deploy
NEXT_PUBLIC_ORACLE_CONTRACT_ID=set_after_contract_deploy
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_PROTOCOL_FEE_BPS=10
```

Initialize Supabase by running [supabase/schema.sql](supabase/schema.sql) in the Supabase SQL editor.

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Scripts

```bash
npm run dev      # Start the Next.js development server
npm run lint     # Run Next.js ESLint checks
npm run build    # Create a production build
npm run start    # Serve the production build
```

## Contracts

Soroban contracts live in the `contracts/` Rust workspace:

- `contracts/aggregator_router`
- `contracts/price_oracle`

Build them with your installed Stellar/Soroban toolchain from the `contracts` directory.

## Verification

Current project checks:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

