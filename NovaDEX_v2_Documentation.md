# NOVADEX
## *Stellar's First Intent-Based DEX Aggregator*

**Full Project Documentation — v2.0**

| | |
|---|---|
| **Builder** | Anurag Dubey |
| **Hackathon** | Stellar Hackathon 2026 — $10,000 USD Prize Pool |
| **Network** | Stellar Testnet (Mainnet after win) |
| **Smart Contracts** | 2 Soroban contracts (Rust) |
| **Frontend** | Next.js 14 + TypeScript + Tailwind CSS |
| **Backend** | Next.js API Routes + Supabase (PostgreSQL) |
| **Auth / Identity** | Freighter Wallet (public key = user ID) |
| **Status** | Build in progress — Testnet first |

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Problem Statement](#2-problem-statement)
3. [Solution & Core Primitives](#3-solution--core-primitives)
4. [Unique Features (What Makes NovaDEX Stand Out)](#4-unique-features)
5. [System Architecture](#5-system-architecture)
6. [Wallet Connection & Authentication](#6-wallet-connection--authentication)
7. [Smart Contracts (Soroban)](#7-smart-contracts-soroban)
8. [Backend — Next.js API Routes + Supabase](#8-backend--nextjs-api-routes--supabase)
9. [Database Schema](#9-database-schema)
10. [Frontend — Pages & UI Structure](#10-frontend--pages--ui-structure)
11. [UI Design System](#11-ui-design-system)
12. [Full Tech Stack](#12-full-tech-stack)
13. [User Flows](#13-user-flows)
14. [Data Flows (Swap + Auth + History)](#14-data-flows)
15. [Testnet Setup Guide](#15-testnet-setup-guide)
16. [Build Plan (Day by Day)](#16-build-plan-day-by-day)
17. [Why NovaDEX Wins](#17-why-novadex-wins)
18. [Post-Hackathon Roadmap](#18-post-hackathon-roadmap)
19. [Glossary](#19-glossary)

---

## 1. Project Overview

### What is NovaDEX?

NovaDEX is the first intent-based DEX aggregator on the Stellar network. It is the missing infrastructure layer between a user who wants to swap assets and the fragmented liquidity spread across Stellar's SDEX order books, Aquarius AMM pools, and anchor exchange rates.

On Ethereum, protocols like 1inch and Paraswap route billions of dollars in daily volume by finding optimal swap paths automatically. Stellar has none of this. NovaDEX builds it — and adds features that even Ethereum aggregators do not have, like on-chain savings proof and wallet-native identity.

> ***"Swap any Stellar asset. Get the best price. No thinking required."***

### What NovaDEX Does in Plain Terms

A user connects their Freighter wallet. They pick two assets and an amount. NovaDEX instantly checks every source of liquidity on Stellar — order books, AMM pools, and anchor rates — finds the cheapest route including multi-hop paths, and executes the entire trade in one atomic transaction. The user sees exactly how much they saved compared to going directly.

Their swap history, savings, and analytics are stored in Supabase under their wallet address. No account creation. No password. The wallet is the account.

---

## 2. Problem Statement

### Stellar DeFi Has a Fragmentation Problem

Stellar is a mature Layer 1 blockchain with real, active liquidity. It has a built-in decentralized exchange (SDEX), a thriving AMM ecosystem (Aquarius), multiple fiat-backed anchors (Circle USDC, MoneyGram, Flutterwave), and dozens of tradeable asset pairs. On paper, this is everything you need for DeFi.

But in practice, all of this liquidity is disconnected. There is no unified layer that lets a user say "give me the best price" and actually get it. Users have to manually check each source, do the math themselves, and execute trades one at a time. Most of the time they leave money on the table without knowing it.

### Specific Problems

| **Problem** | **Real-World Impact** |
|---|---|
| No cross-source price aggregation | A user swapping XLM to USDC on SDEX might get 5% worse price than Aquarius — they will never know |
| No multi-hop routing | XLM to USDT via XLM-USDC-USDT is often cheaper than direct. No tool surfaces this on Stellar |
| No order splitting for large trades | Swapping 50,000 XLM in one place destroys the price. No tool splits orders to reduce slippage |
| No savings transparency | Users have no way to quantify what they left on the table. No benchmark, no comparison |
| Developer-only tooling | Stellar Lab and Horizon explorers are built for engineers. Normal users cannot use them comfortably |
| No personal swap history | Users have no consolidated view of their past trades, routes, and money saved |
| Wallet onboarding friction | New users who only have USDC cannot transact without first acquiring XLM for fees — nobody handles this gracefully |

### Why This Gap Has Persisted

Soroban, Stellar's smart contract platform, only launched on mainnet in 2024. Most builders are still learning the ecosystem. The infrastructure layer — aggregators, oracles, routing engines — has not been built yet. NovaDEX fills the most impactful of these gaps first.

---

## 3. Solution & Core Primitives

### Three Primitives That Do Not Exist on Stellar Today

#### Primitive 1 — Real-Time Multi-Source Aggregation

NovaDEX simultaneously fetches live price data from SDEX order books (via Horizon API), Aquarius AMM pools (via Aquarius API), and major anchor exchange rates. This happens in parallel every time a user types a swap amount, with a debounce to avoid hammering the APIs. The result is a unified price view across the entire Stellar liquidity landscape.

#### Primitive 2 — Smart Route Calculation Engine

The routing engine does not just compare direct prices. It constructs a graph where every asset is a node and every liquidity source is an edge. It then explores direct paths, two-hop paths (A-B-C), and three-hop paths (A-B-C-D) between the input and output asset. For each path, it calculates net output after fees and slippage. The best path wins.

For large orders, the engine also calculates whether splitting across multiple sources produces better output than any single source. This order-splitting is invisible to the user — they just see a better price.

#### Primitive 3 — Atomic Execution via Soroban

When the user approves, a Soroban smart contract executes the entire route atomically. Either the full swap completes at the quoted price (within slippage tolerance), or the entire transaction reverts. No partial execution. No unexpected outcomes. The smart contract enforces a minimum output amount before execution proceeds.

### NovaDEX vs What Exists Today

| **Feature** | **SDEX / Aquarius Native UI** | **NovaDEX** |
|---|---|---|
| Multi-source aggregation | No — one source at a time | **Yes — SDEX + Aquarius + Anchors** |
| Multi-hop routing | No | **Yes — up to 3 hops** |
| Order splitting | No | **Yes — automatic for large trades** |
| Savings display | No | **Yes — live dollar amount saved** |
| Atomic execution | Partial | **Full — via Soroban contract** |
| Slippage protection | Manual | **Automatic with configurable tolerance** |
| Personal swap history | No | **Yes — stored in Supabase per wallet** |
| Non-technical UX | No | **Yes — built for normal users** |
| Price impact warnings | No | **Yes — yellow >1%, red >3%** |

---

## 4. Unique Features

These are features that go beyond basic aggregation — things that make NovaDEX genuinely differentiated even compared to Ethereum aggregators.

### Feature 1 — Savings Proof (On-Chain)

When a swap executes, NovaDEX records the best single-source price at that moment and the actual price the user received. The difference — the savings — is stored on-chain in the Price Oracle contract as a provable record. This is not just a UI display. It is an immutable proof that the user got a better deal.

This is something no Ethereum aggregator does. 1inch shows savings on a UI. NovaDEX proves it on-chain.

### Feature 2 — Wallet-Native Identity (No Auth System)

There is no registration, no login, no email, no password. The Freighter wallet public key is the user identity. When a user connects their wallet, NovaDEX checks Supabase for a row with that public key. If it does not exist, a new user record is created automatically. All their data lives under their public key forever.

If they switch to a new device and connect the same wallet, all their history comes back instantly. This is what Web3 identity should look like.

### Feature 3 — Smart Slippage Engine

Most DEX UIs give you a single slippage tolerance setting (0.5%, 1%, etc.) and leave it at that. NovaDEX's slippage engine is adaptive. For small, liquid pairs it recommends 0.1%. For large orders or illiquid pairs it calculates the actual expected slippage from the order book depth and recommends a minimum tolerance that covers it. It prevents both failed transactions (tolerance too low) and value loss (tolerance too high, leaving MEV room).

### Feature 4 — Route Fingerprint

Every swap route has a unique fingerprint — a hash of the path taken, sources used, and prices at execution time. This fingerprint is stored in Supabase and displayed to the user. It allows NovaDEX to detect if the same route is being used across many users and surface that as a "popular route" indicator. It also provides an audit trail if a user wants to dispute a trade outcome.

### Feature 5 — Price Impact Simulation

Before executing, NovaDEX simulates what would happen to the pool/order book if the swap goes through. It shows the user their price impact — how much their trade moves the market. This is shown as a percentage and a dollar amount. Red if above 3%, yellow if above 1%, green below 1%. No other Stellar tool does this.

### Feature 6 — Favourites & Swap Presets

Users can save frequently used asset pairs as favourites. They can also save swap presets — a saved pair with a default amount. One click to load a preset and execute their usual weekly swap. Stored in Supabase under their wallet address.

### Feature 7 — Personal Analytics Dashboard

Every user gets a private analytics page showing: total volume swapped, total savings generated by NovaDEX, most used asset pairs, preferred routes, average slippage, and swap frequency over time. This data is private — only visible when their wallet is connected. It is pulled from Supabase with Row Level Security enforced via their wallet signature.

### Feature 8 — Gas-Free Onboarding Hint

If a user connects a wallet that holds USDC but zero XLM, NovaDEX detects this and shows a banner explaining the situation with a direct link to get XLM from Stellar's Friendbot (testnet) or a recommended on-ramp (mainnet). This solves the most common new-user friction point on Stellar.

---

## 5. System Architecture

### Four-Layer Architecture

```
Architecture Overview (Top to Bottom)

[ User Browser ]
│
[ Next.js Frontend — React Server + Client Components ]
│                          │
[ Next.js API Routes ]      [ Client-Side Routing Engine ]
│                          │
[ Supabase (PostgreSQL) ]   [ Horizon API + Aquarius API ]
│
[ Soroban Smart Contracts on Stellar Network ]
│
[ Stellar Testnet / Mainnet ]
```

### Layer 1 — Next.js Frontend

The frontend is a Next.js 14 application using the App Router. Pages that display user-specific data (swap history, analytics) use React Server Components to fetch data server-side from Supabase — keeping API keys secure and improving performance. The swap interface itself is a Client Component because it needs real-time price updates and wallet interaction.

State management uses Zustand for wallet connection state and swap configuration. React Query handles all API calls to Horizon and Aquarius with automatic caching, background refetching every 10 seconds, and stale-while-revalidate behaviour so prices stay fresh without hammering the APIs.

### Layer 2 — Next.js API Routes (Backend)

Next.js API routes serve as the backend. They handle all Supabase writes — recording swaps, updating user records, saving favourites. The API routes hold the Supabase service role key (which has full database access) in environment variables on the server. The client never touches the service key. This is the security boundary.

API routes also handle wallet signature verification when a user needs to prove ownership of their public key for sensitive operations like accessing their private analytics data.

### Layer 3 — Supabase

Supabase is the persistence layer. It holds all user data, swap history, favourites, and route analytics. Row Level Security (RLS) policies ensure users can only read their own rows. The service role key in API routes bypasses RLS for writes, which is safe because the API routes validate the wallet signature before writing.

### Layer 4 — Soroban Smart Contracts

Two Soroban contracts deployed on Stellar handle all on-chain logic. The Aggregator Router executes swaps atomically. The Price Oracle records price checkpoints and savings proofs. These contracts are the trustless execution layer — once a transaction is signed and submitted, no server can interfere with it.

---

## 6. Wallet Connection & Authentication

### How Identity Works in NovaDEX

There is no traditional authentication system. No JWT tokens from a login form. No email verification. The Freighter wallet is the identity layer. When a user connects their wallet, their Stellar public key becomes their user ID across the entire application.

The public key is a 56-character string starting with G — for example: `GBXX3LFMWIELYB4N5DMKE3XGSZ5CNMHF33WL5XTQE4CYJKQFWWBZUOT`. This is unique to the user's wallet and cannot be spoofed without their private key.

### What Freighter Is

Freighter is the official Stellar browser wallet extension. It is available for Chrome, Firefox, and Brave from freighter.app. It stores the user's Stellar private key locally and never exposes it to any website. When a transaction needs to be signed, Freighter shows a popup, the user reviews and approves, and Freighter returns the signed transaction — the private key never leaves the browser extension.

### What You Need to Install

```bash
npm install @stellar/freighter-api stellar-sdk
```

That is it. Freighter API is the bridge between your Next.js app and the Freighter extension. Stellar SDK handles transaction building and submission.

### The Three Freighter Functions NovaDEX Uses

| **Function** | **What It Does in NovaDEX** |
|---|---|
| `isConnected()` | Checks if the Freighter extension is installed in the browser. If false, show the "Install Freighter" prompt instead of the connect button |
| `requestAccess()` | Triggers the Freighter permission popup. User sees "NovaDEX wants to know your public key" and approves. Returns the public key. This is the login. |
| `getPublicKey()` | Returns the already-connected wallet's public key without triggering a popup. Used on page load to restore wallet state. |
| `signTransaction(xdr)` | When a swap is ready to execute, this triggers a popup showing the transaction details. User reviews and approves. Returns the signed XDR string ready to submit to Stellar. |
| `getNetwork()` | Returns which network the wallet is set to (testnet or mainnet). NovaDEX checks this to ensure the user is on the right network. |

### The Full Wallet Connection Flow

```
Wallet Connection — Step by Step

Step 1: Page loads
— Call isConnected() to check if Freighter is installed
— If not installed: show "Install Freighter" button linking to freighter.app
— If installed: call getPublicKey() to check if already connected

Step 2: User clicks "Connect Wallet"
— Call requestAccess() — Freighter popup appears
— User clicks "Approve" in the popup
— requestAccess() returns the public key

Step 3: Upsert to Supabase
— POST to /api/users/connect with the public key
— API route checks if a user row exists for this public key
— If not: creates new user row (first_seen = now)
— If yes: updates last_seen = now

Step 4: UI updates
— Header shows shortened public key: GBXX...ZUOT
— User XLM and USDC balances load from Horizon
— Swap button becomes active
— If balance has no XLM: show onboarding banner
```

### What Happens When User Disconnects

The user clicks "Disconnect" in the header dropdown. NovaDEX clears the public key from Zustand state and localStorage. The UI returns to the unauthenticated state. No server call needed — there is nothing to invalidate because there are no session tokens.

### Network Check

On wallet connect, NovaDEX calls `getNetwork()` and checks if it matches the app's configured network. During development and testnet phase, if a user's Freighter is set to mainnet, NovaDEX shows a warning banner: "Switch Freighter to Testnet to use NovaDEX." This prevents accidental mainnet transactions during testing.

### Row Level Security — How Private Data Stays Private

For sensitive operations like reading personal analytics, NovaDEX asks the user to sign a challenge message with their wallet. The signed message proves they own the public key without revealing the private key. The API route verifies this signature using Stellar SDK's verify function, then issues a short-lived token that authorizes read access to that user's Supabase rows.

---

## 7. Smart Contracts (Soroban)

NovaDEX deploys two Soroban contracts written in Rust. Soroban is Stellar's smart contract platform, launched on mainnet in 2024. Contracts compile to WebAssembly and run deterministically on the Stellar network.

### Contract 1 — Aggregator Router

- **File:** `contracts/aggregator_router/src/lib.rs`
- **Language:** Rust + Soroban SDK
- **Purpose:** Executes multi-hop swaps atomically across SDEX and Aquarius
- **Testnet Contract ID:** Set after first deploy — stored in `.env.local`

#### Key Functions

| **Function Signature** | **Description** |
|---|---|
| `swap(env, route, amount_in, min_out, deadline)` | Main swap function. Takes a route (ordered list of asset hops and sources), executes each hop in sequence, enforces min_out and deadline, reverts entirely if either condition fails |
| `get_quote(env, route, amount_in)` | Read-only simulation. Returns expected output for a given route without executing. Called by frontend every few seconds to keep quotes fresh |
| `split_swap(env, routes, amounts, min_total_out)` | Executes a split order across multiple routes in one atomic call. Used for large trades. All legs execute or all revert. |
| `set_protocol_fee(env, fee_bps)` | Admin only. Sets protocol fee in basis points. 10 bps = 0.1%. Collected from each swap and held in the contract. |
| `withdraw_fees(env, recipient)` | Admin only. Withdraws accumulated protocol fees to the specified address. |
| `get_protocol_fee(env)` | Public read. Returns current fee in basis points. Frontend uses this to show fee to user before swap. |

#### How Atomic Execution Works

Soroban contracts on Stellar are atomic by default at the transaction level. If any operation inside the contract call throws an error, the entire transaction is rolled back. NovaDEX uses this guarantee so that a 3-hop swap either completes fully or the user gets their original tokens back. There is no state where the user ends up with a partial result.

The `deadline` parameter prevents the transaction from executing if it sits in the mempool too long. If block time > deadline, the contract reverts. This protects users from stale transactions executing at outdated prices.

#### Slippage Protection Logic

The `min_out` parameter is calculated by the frontend: `quoted_output * (1 - slippage_tolerance)`. The contract compares the actual output of the final hop against `min_out`. If actual output is below `min_out` — meaning prices moved against the user between quote and execution — the contract reverts. The user pays only the Stellar network fee (a fraction of a cent) and gets their tokens back.

---

### Contract 2 — Price Oracle

- **File:** `contracts/price_oracle/src/lib.rs`
- **Language:** Rust + Soroban SDK
- **Purpose:** Records on-chain price checkpoints and savings proofs

#### Key Functions

| **Function Signature** | **Description** |
|---|---|
| `record_price(env, pair_id, price, source)` | Records a price for a trading pair from a specific source (SDEX, Aquarius, etc.) with a timestamp. Called by the router before executing a swap. |
| `record_savings(env, user, pair_id, savings_amount, best_direct_price, actual_price)` | Saves the savings proof on-chain after a successful swap. This is the immutable record that the user got a better deal. |
| `get_price(env, pair_id)` | Returns the latest recorded price for a pair. Used by router to validate execution price is not stale. |
| `get_user_total_savings(env, user)` | Returns total cumulative savings for a user across all their swaps. Displayed on analytics dashboard. |
| `is_price_stale(env, pair_id)` | Returns true if the last recorded price is more than 60 seconds old. Router refuses to execute if price is stale. |

#### Why the Oracle Contract Exists

Without an on-chain price reference, NovaDEX would be a black box. The oracle creates transparency: every price used in a swap execution is recorded on-chain with a timestamp and source. Anyone can verify that the price used was real. The savings proof is cryptographically verifiable — it cannot be fabricated by the frontend.

---

## 8. Backend — Next.js API Routes + Supabase

### Architecture Decision

NovaDEX uses Next.js API routes as the backend. This means the API lives in the same repository as the frontend — no separate Express server, no separate deployment. API routes run serverlessly on Vercel. The Supabase service role key (which has full DB access) lives only in server-side environment variables and never reaches the client browser.

### API Routes — Full List

| **Method + Route** | **Purpose** | **Auth Required** |
|---|---|---|
| `POST /api/users/connect` | Upsert user on wallet connect — creates row if new, updates last_seen if existing | Public key in body |
| `GET /api/users/[pubkey]/profile` | Returns user profile: first_seen, swap_count, total_volume, total_savings | Wallet signature |
| `GET /api/users/[pubkey]/history` | Returns paginated swap history for a wallet address — newest first | Wallet signature |
| `GET /api/users/[pubkey]/analytics` | Returns personal analytics: volume by pair, savings over time, route breakdown | Wallet signature |
| `POST /api/swaps/record` | Records a completed swap in the database after successful on-chain execution | Public key + tx hash |
| `GET /api/swaps/[txHash]` | Returns details of a specific swap by transaction hash — public endpoint | None |
| `POST /api/favourites/add` | Adds an asset pair to a user's favourites list | Wallet signature |
| `DELETE /api/favourites/remove` | Removes an asset pair from favourites | Wallet signature |
| `GET /api/favourites/[pubkey]` | Returns all favourites for a wallet address | Wallet signature |
| `POST /api/presets/save` | Saves a swap preset (pair + default amount) | Wallet signature |
| `GET /api/presets/[pubkey]` | Returns all saved presets for a wallet | Wallet signature |
| `GET /api/analytics/global` | Returns platform-wide stats: total volume, total trades, total savings, top pairs | None — public |
| `GET /api/analytics/pairs` | Returns top trading pairs by volume across all users | None — public |
| `POST /api/auth/verify` | Verifies a wallet signature for sensitive operations. Returns a short-lived access token | Public key + signature |

### Signature Verification Flow

For routes marked "Wallet signature" above, the client sends the user's public key plus a signed message. The message is a standard challenge: `"NovaDEX auth: {timestamp} {publicKey}"`. The API route uses Stellar SDK's `Keypair.verify()` to confirm the signature matches the public key. If valid, the operation proceeds. If not, it returns 401.

This is not a full JWT auth system — it is a lightweight proof-of-ownership check that is sufficient for a hackathon while being genuinely secure. No tokens are stored. Each sensitive request re-verifies the signature.

### Supabase Client Setup

Two Supabase clients are used. The browser client (created with the anon key) is used only for real-time subscriptions if added later. All reads and writes go through the API routes using the server client (created with the service role key). This keeps the service key server-side only.

---

## 9. Database Schema

All tables live in Supabase PostgreSQL. Row Level Security is enabled on all tables. The service role key used in API routes bypasses RLS for writes. The anon key (if ever used client-side) would be restricted by RLS to only read the current user's rows.

### Table 1 — users

| **Column** | **Type + Notes** |
|---|---|
| `wallet_address` | TEXT — Primary key. The Stellar public key. 56 characters starting with G. |
| `first_seen` | TIMESTAMPTZ — When the wallet first connected to NovaDEX. Set on upsert, never updated. |
| `last_seen` | TIMESTAMPTZ — Updated every time the wallet connects. |
| `swap_count` | INTEGER — Total number of swaps. Incremented on each recorded swap. Default 0. |
| `total_volume_usdc` | NUMERIC(20,6) — Cumulative swap volume in USDC equivalent. Computed and stored on each swap. |
| `total_savings_usdc` | NUMERIC(20,6) — Total USDC equivalent saved via NovaDEX routing vs best direct swap. |
| `preferred_network` | TEXT — Either `testnet` or `mainnet`. Set on first connect based on wallet network. |
| `created_at` | TIMESTAMPTZ — Row creation timestamp. Same as first_seen. Auto-set by Supabase. |

### Table 2 — swaps

| **Column** | **Type + Notes** |
|---|---|
| `id` | UUID — Primary key. Auto-generated by Supabase. |
| `wallet_address` | TEXT — Foreign key to users.wallet_address. |
| `tx_hash` | TEXT — Stellar transaction hash. Unique. Used to look up swap on Stellar Expert. |
| `asset_in_code` | TEXT — Symbol of the asset the user sent. e.g. `XLM` |
| `asset_in_issuer` | TEXT — Issuer of the input asset. Null for native XLM. |
| `asset_out_code` | TEXT — Symbol of the asset the user received. e.g. `USDC` |
| `asset_out_issuer` | TEXT — Issuer of the output asset. |
| `amount_in` | NUMERIC(20,7) — Exact amount sent by the user. |
| `amount_out` | NUMERIC(20,7) — Exact amount received by the user. |
| `amount_out_direct_best` | NUMERIC(20,7) — What the best single-source direct swap would have returned. Used to calculate savings. |
| `savings_usdc` | NUMERIC(20,6) — USDC-equivalent savings from using NovaDEX routing. |
| `route_fingerprint` | TEXT — Hash of the route taken. Encodes hops, sources, and prices. |
| `route_json` | JSONB — Full route details: each hop, source used, price at that hop. |
| `slippage_tolerance` | NUMERIC(5,2) — Slippage tolerance used for this swap in percent. |
| `price_impact` | NUMERIC(5,2) — Estimated price impact as a percent. |
| `protocol_fee_usdc` | NUMERIC(20,6) — Protocol fee charged in USDC equivalent. |
| `network` | TEXT — `testnet` or `mainnet`. |
| `status` | TEXT — `completed`, `reverted`, or `pending`. |
| `executed_at` | TIMESTAMPTZ — When the transaction was confirmed on-chain. |
| `created_at` | TIMESTAMPTZ — When the swap record was created in Supabase. |

### Table 3 — favourites

| **Column** | **Type + Notes** |
|---|---|
| `id` | UUID — Primary key. |
| `wallet_address` | TEXT — Foreign key to users. |
| `asset_in_code` | TEXT — Input asset symbol. |
| `asset_in_issuer` | TEXT — Input asset issuer. Null for XLM. |
| `asset_out_code` | TEXT — Output asset symbol. |
| `asset_out_issuer` | TEXT — Output asset issuer. |
| `label` | TEXT — Optional user-defined label. e.g. `"My weekly XLM to USDC"` |
| `created_at` | TIMESTAMPTZ |

### Table 4 — presets

| **Column** | **Type + Notes** |
|---|---|
| `id` | UUID — Primary key. |
| `wallet_address` | TEXT — Foreign key to users. |
| `asset_in_code` | TEXT |
| `asset_in_issuer` | TEXT |
| `asset_out_code` | TEXT |
| `asset_out_issuer` | TEXT |
| `default_amount` | NUMERIC(20,7) — Pre-filled amount for this preset. |
| `label` | TEXT — User-defined name for this preset. |
| `use_count` | INTEGER — How many times this preset has been used. For analytics. |
| `last_used_at` | TIMESTAMPTZ |
| `created_at` | TIMESTAMPTZ |

### Table 5 — global_stats (single-row aggregate)

| **Column** | **Type + Notes** |
|---|---|
| `id` | INTEGER — Always 1. Single row table. |
| `total_volume_usdc` | NUMERIC(20,6) — Platform-wide total swap volume. |
| `total_swaps` | BIGINT — Total number of swaps across all users. |
| `total_savings_usdc` | NUMERIC(20,6) — Platform-wide total savings generated. |
| `unique_wallets` | INTEGER — Number of distinct wallet addresses that have swapped. |
| `last_updated` | TIMESTAMPTZ — Updated by a Supabase trigger after each swap record insert. |

---

## 10. Frontend — Pages & UI Structure

NovaDEX has 6 pages. All built with Next.js App Router. Server Components where possible, Client Components only where wallet interaction or real-time data is needed.

### Page 1 — Swap (Home) `/`

**Component type:** Client Component — needs real-time prices and wallet state

**Purpose:** Main swap interface. This is where 90% of users spend 90% of their time.

UI components on this page:

- **Navbar** — NovaDEX logo left, wallet connect button right. When connected: shortened pubkey + XLM balance + disconnect dropdown.
- **From token selector** — searchable dropdown of all Stellar assets. Shows user balance for each. Large number input with max button.
- **Swap direction toggle** — arrow button between From and To inputs that flips the pair.
- **To token selector** — same as From. Amount field is read-only, shows expected output.
- **Route card** — shows winning route: source icons, hop arrows, expected output, fees. Expandable to show full path.
- **Alternative routes accordion** — 2-3 other routes collapsed below the winner. Shows their prices for comparison.
- **Savings badge** — green badge: "You save 0.42 USDC vs best direct swap." Pulls from route engine comparison.
- **Price impact bar** — visual indicator. Green if under 1%, yellow 1-3%, red over 3%.
- **Slippage settings** — gear icon opens a small panel. Presets: 0.1% / 0.5% / 1% / Custom.
- **Swap button** — disabled until wallet connected and route found. Shows loading spinner during quote fetch.
- **Confirmation modal** — appears on swap click. Shows full breakdown: route, amounts, fees, savings, slippage. Separate confirm button triggers Freighter sign popup.
- **Success screen** — after confirmed tx: tokens received, savings, tx hash with Stellar Expert link, "Swap Again" button.
- **No XLM banner** — if connected wallet has USDC but 0 XLM, shows a banner explaining how to get XLM.

### Page 2 — History `/history`

**Component type:** Server Component for initial load + Client for pagination

**Purpose:** Personal swap history for the connected wallet. Private — requires connected wallet.

- **Swap history table** — columns: date, pair (in/out), amount in, amount out, savings, route used, status, tx hash link.
- **Filters** — by asset pair, by date range, by status (completed/reverted).
- **Savings summary row** at top — total savings this wallet has earned via NovaDEX across all time.
- **Empty state** — if no swaps yet, shows a prompt to make the first swap.
- **Pagination** — 20 rows per page. Server-side pagination via Supabase range queries.

### Page 3 — Analytics `/analytics`

**Component type:** Hybrid — Server for global stats, Client for personal charts

**Purpose:** Platform stats (public) + personal analytics (private, wallet required).

- **Global stats strip** — Total Volume, Total Swaps, Total Savings Generated, Unique Wallets. Public data from `global_stats` table.
- **Top pairs table** — most traded pairs platform-wide with 24h volume and average savings.
- **Personal section** (wallet required) — volume over time chart, savings per week, most used pairs, favourite routes, average slippage used.

### Page 4 — Route Explorer `/routes`

**Component type:** Client Component

**Purpose:** Power-user view. Explore all available routes for any pair and order size.

- **Pair and amount selector** at top.
- **Route comparison table** — all discovered routes ranked by output. Columns: path, sources, output, fee, price impact, savings vs direct.
- **Order size slider** — drag to see how routing changes as order size increases. Shows the crossover point where splitting becomes optimal.
- **Source breakdown** — SDEX vs Aquarius vs Anchor prices side by side for the selected pair.

### Page 5 — Pools `/pools`

**Component type:** Server Component — static data refreshed every 60s via Next.js revalidate

**Purpose:** View Aquarius AMM pools that NovaDEX routes through.

- **Pool list** — pair, TVL, 24h volume, fee rate, NovaDEX routing volume through this pool.
- **Pool detail modal** — pool reserves, price history chart, fee earned by LPs.
- **External link to Aquarius** to add liquidity — NovaDEX does not manage LP positions in v1.

### Page 6 — About `/about`

**Component type:** Server Component — fully static

**Purpose:** What NovaDEX is, how routing works, smart contract addresses, FAQ.

- Project overview and problem statement.
- How routing works — plain English with a simple diagram.
- Smart contract addresses — testnet and mainnet after deploy.
- FAQ: Is NovaDEX custodial (No), does it store private keys (No), which wallets are supported (Freighter only in v1), what is the protocol fee (0.1%).
- GitHub and Twitter links.

---

## 11. UI Design System

### Design Philosophy

NovaDEX is a precision trading tool. The UI should feel like something between a Bloomberg terminal and Linear — dense with information but never cluttered, confident but not aggressive. Every element earns its place by communicating something useful. Decoration is a design failure.

The signature element is the route visualisation card — the one place where the design spends its visual budget. Every other element is quieter so this card can breathe and command attention.

Dark background is the correct choice here — not because it is "crypto aesthetic" but because traders spend long sessions in this interface and dark is easier on the eyes. The darkness also makes the route card's indigo accent pop cleanly.

### Typography

| **Role** | **Specification** |
|---|---|
| Display numbers (swap amounts) | Inter, 48px, weight 800, tracking -0.03em, color `#F9FAFB` — used for the main amount inputs only |
| Section headings | Inter, 18px, weight 600, tracking -0.01em, color `#F9FAFB` |
| Body text | Inter, 14px, weight 400, line-height 1.6, color `#9CA3AF` |
| Data and addresses | JetBrains Mono, 13px, weight 400, color `#9CA3AF` — tx hashes, public keys, token amounts in tables |
| Labels and captions | Inter, 12px, weight 500, uppercase, letter-spacing 0.08em, color `#6B7280` — used for column headers and field labels |
| Badges | Inter, 11px, weight 700, uppercase, tracking 0.06em |

### Colour Palette

| **Name — Hex** | **Usage** |
|---|---|
| Background — `#0A0F1E` | Page background. Near-black with a blue undertone. Not pure black. |
| Surface — `#111827` | Card backgrounds, modal backgrounds, input backgrounds. |
| Surface Elevated — `#1F2937` | Hover states, dropdown panels, tooltip backgrounds. |
| Border — `#1F2937` | Default borders. Same as Surface Elevated — creates flush look. |
| Border Light — `#374151` | Dividers, separator lines, focused input borders. |
| Accent — `#818CF8` | Indigo. Primary accent — route lines, active states, savings badge, CTA buttons. |
| Accent Dark — `#6366F1` | Button hover, pressed states. |
| Accent Background — `#1E1B4B` | Tinted background for info boxes and highlighted cards. |
| Teal — `#2DD4BF` | Secondary accent. Used for contract-related info, addresses, on-chain data. |
| Green — `#34D399` | Positive values — savings amount, completed status, low price impact. |
| Yellow — `#FBBF24` | Warnings — medium price impact, network mismatch, slippage caution. |
| Red — `#F87171` | Errors — high price impact, failed transactions, reverted swaps. |
| Text Primary — `#F9FAFB` | Main readable text on dark backgrounds. |
| Text Secondary — `#9CA3AF` | Labels, placeholders, secondary information. |
| Text Muted — `#6B7280` | Captions, disabled states, timestamps. |

### Component Rules

- **Cards** — background `#111827`, border `1px solid #1F2937`, border-radius `16px`, padding `24px`. No drop shadow.
- **Inputs** — background `#0A0F1E`, border `1px solid #1F2937`, border-radius `10px`. On focus: border-color `#818CF8`, no glow effect. Font: Inter 16px for amounts, 14px for other fields.
- **Primary button** — background `#6366F1`, text white, border-radius `10px`, padding `14px 28px`, Inter 15px weight 600. Hover: background `#4F46E5`.
- **Secondary button** — background transparent, border `1px solid #374151`, text `#9CA3AF`. Hover: border-color `#818CF8`, text `#F9FAFB`.
- **Badges** — border-radius `4px` (not pill), padding `3px 8px`, Inter 11px uppercase weight 700. No glowing borders.
- **Tables** — header background `#1F2937` with `#9CA3AF` text. Row alternation: `#111827` and `#161D2E`. JetBrains Mono for all numerical data.
- **Modals** — max-width `480px`, background `#111827`, border `1px solid #374151`, `backdrop-filter: blur(8px)` on the overlay.
- **Route card** — `border-left: 3px solid #6366F1`, special elevation treatment: background `#111827` with a very subtle inner border `#1E1B4B`. This is the one component that gets special treatment.

### What NovaDEX Does Not Look Like

- No gradient hero backgrounds — no purple-to-blue sweeps across the page header.
- No glowing neon borders on cards or buttons.
- No animated floating token logos or particle effects.
- No pill-shaped buttons with a gradient fill.
- No dark-mode-by-default crypto clichés — the dark background is intentional and restrained, not atmospheric.
- No Lottie animations for loading states — use simple CSS spinners.
- No marketing copy inside the app — this is a tool, not a landing page.

---

## 12. Full Tech Stack

### Frontend

| **Package / Tool** | **Role + Notes** |
|---|---|
| Next.js 14 (App Router) | Framework. Server Components for history/analytics pages, Client Components for swap interface. |
| TypeScript | Type safety across the entire codebase. Especially important for Stellar SDK types. |
| Tailwind CSS 3 | Utility-first styling. Custom design tokens configured in `tailwind.config.ts`. No component library. |
| Zustand | Global state for wallet connection status, connected public key, and swap configuration. Lightweight, no boilerplate. |
| TanStack Query (React Query) | Data fetching with caching and background refetch. Horizon and Aquarius calls go through React Query. 10s stale time for prices. |
| `stellar-sdk` | Official Stellar JavaScript SDK. Transaction building, XDR encoding, submitting to Horizon, asset types, keypair operations. |
| `@stellar/freighter-api` | Official Freighter wallet API. Wallet connection, public key retrieval, transaction signing. |
| Recharts | Price charts and savings-over-time charts on analytics page. Lightweight, works well with React. |
| Lucide React | Icon set. Consistent, minimal, well-maintained. |
| date-fns | Date formatting for trade history timestamps. |
| clsx + tailwind-merge | Conditional className utilities — standard Next.js pattern. |

### Backend

| **Package / Tool** | **Role + Notes** |
|---|---|
| Next.js API Routes | Serverless backend. All Supabase writes, signature verification, and analytics aggregation go through these routes. |
| `@supabase/supabase-js` | Supabase client. Two instances: server client (service role key, in API routes) and browser client (anon key, for subscriptions). |
| Supabase PostgreSQL | Primary database. Hosted by Supabase. Row Level Security enabled on all tables. |
| Supabase Row Level Security | Ensures users can only query their own rows when using anon key. Service role key bypasses for API route writes. |

### Smart Contracts

| **Tool** | **Role** |
|---|---|
| Rust | Contract language. Required for Soroban contracts. |
| Soroban SDK (`soroban-sdk` crate) | Stellar's smart contract SDK. Provides env, storage, token interfaces, and more. |
| `soroban-cli` | Command-line tool for building, deploying, and invoking Soroban contracts. |
| `wasm-pack` | Compiles Rust contracts to WebAssembly for deployment. |

### Infrastructure & Tooling

| **Tool** | **Role** |
|---|---|
| Vercel | Deployment for Next.js app. Free tier sufficient for hackathon. Automatic preview deployments per PR. |
| Supabase Cloud | Hosted PostgreSQL. Free tier: 500MB storage, 2GB bandwidth — more than enough for hackathon. |
| Stellar Testnet | Test network. Free. Resets periodically — does not affect us since we also persist to Supabase. |
| Stellar Friendbot | Testnet XLM faucet. `https://friendbot.stellar.org/?addr=YOUR_PUBLIC_KEY` |
| Stellar Laboratory (lab.stellar.org) | Create testnet accounts, inspect transactions, test contract invocations. |
| Stellar Expert | Block explorer for testnet and mainnet. Used for tx hash links in the UI. |
| Freighter Wallet | Browser extension. The only supported wallet in v1. Install from freighter.app. |
| Horizon Testnet API | `https://horizon-testnet.stellar.org` — all SDEX data. |
| Aquarius API | `https://amm-api.aqua.network` — AMM pool data. |

---

## 13. User Flows

### Flow 1 — First-Time User

```
First-Time User Flow

1. User lands on NovaDEX home page
2. Swap interface is visible but Swap button is greyed out with text "Connect Wallet"
3. User clicks "Connect Wallet" in header
4. isConnected() check:
   — Freighter not installed: modal appears with "Install Freighter" button + brief explanation
   — Freighter installed: requestAccess() fires, Freighter popup appears
5. User approves in Freighter popup
6. Public key received — POST to /api/users/connect — new user row created in Supabase
7. getNetwork() checked — if wrong network, yellow banner appears
8. Horizon API called — user XLM + USDC balance loaded
9. If XLM balance is 0: orange banner "You need XLM to pay network fees" with Friendbot link
10. Header updates: shows GBXX...ZUOT + XLM balance
11. Swap button becomes active
```

### Flow 2 — Standard Swap

```
Standard Swap Flow

1. User selects From asset (e.g. XLM) — balance shows automatically
2. User types amount (e.g. 500)
3. After 400ms debounce, routing engine fires:
   — Parallel calls: Horizon order book, Aquarius pool quote, Horizon path-find
   — Route graph constructed, best path calculated
   — Price impact estimated from order book depth
4. UI updates:
   — To amount field shows expected output
   — Route card appears with winning route details
   — Savings badge shows vs best direct swap
   — Price impact indicator coloured accordingly
5. User reviews and clicks "Swap"
6. Confirmation modal opens — shows full breakdown
7. User clicks "Confirm Swap"
8. signTransaction() called — Freighter popup appears with tx details
9. User approves in Freighter
10. Signed transaction submitted to Horizon
11. NovaDEX polls for confirmation (up to 30s)
12. On confirmation: POST to /api/swaps/record — swap saved to Supabase
13. Success screen: output received, savings, tx hash link
```

### Flow 3 — Large Order with Splitting

```
Large Order Flow

1. User enters a large amount (e.g. 50,000 XLM)
2. Routing engine detects single-source slippage would exceed 2%
3. Split algorithm runs: calculates optimal split across SDEX + Aquarius
   e.g. 65% Aquarius Pool + 35% SDEX order book
4. UI shows split route card: "Order split across 2 sources for best execution"
5. Combined output shown vs single-source output — difference highlighted
6. User confirms — Soroban split_swap() called with both legs atomically
7. Both legs execute or both revert — no partial fills
```

### Flow 4 — Returning User Checks History

```
History Flow

1. User connects wallet (or is already connected)
2. Navigates to /history
3. Next.js Server Component calls /api/users/[pubkey]/history
4. API route verifies public key exists in users table
5. Supabase query: SELECT * FROM swaps WHERE wallet_address = pubkey ORDER BY executed_at DESC
6. Page renders with swap history table
7. User can filter by pair, date range, status
8. Pagination loads next 20 rows on demand
```

---

## 14. Data Flows

### Swap Data Flow — End to End

```
Swap Execution Data Flow

PRICE FETCH PHASE:
Browser → Horizon API: GET /order_book?selling=XLM&buying=USDC
Browser → Aquarius API: GET /api/v1/pools/ + /swap/quote/
Browser → Horizon API: GET /paths/strict-send (multi-hop paths)
All three run in parallel via Promise.all()

ROUTE CALCULATION PHASE (client-side):
Routing engine receives all three price responses
Builds route graph → runs path algorithm → ranks all routes
Returns: best_route, alternative_routes, savings_vs_direct, price_impact

EXECUTION PHASE:
Browser → Soroban contract: get_quote(route, amount_in) — final pre-execution check
Browser → Freighter: signTransaction(xdr)
Freighter → Browser: signed XDR returned
Browser → Horizon: POST /transactions with signed XDR
Horizon → Stellar Network: transaction broadcast

RECORDING PHASE (after on-chain confirmation):
Browser → Next.js API route: POST /api/swaps/record
API route → Supabase: INSERT into swaps table
API route → Supabase: UPDATE users SET swap_count, total_volume, total_savings
API route → Supabase: UPDATE global_stats (via trigger)
```

### Authentication Data Flow

```
Wallet Auth Flow

CONNECT:
Browser → Freighter: requestAccess()
Freighter → Browser: public key
Browser → Next.js API: POST /api/users/connect { publicKey }
API → Supabase: UPSERT users WHERE wallet_address = publicKey
API → Browser: { success: true, isNewUser: boolean }

SIGNATURE VERIFICATION (for private routes):
Browser → Freighter: signMessage("NovaDEX auth: {timestamp} {publicKey}")
Freighter → Browser: signature
Browser → Next.js API: POST /api/auth/verify { publicKey, signature, timestamp }
API: Keypair.verify(publicKey, message, signature) — returns true/false
API → Browser: { verified: true } or 401
```

---

## 15. Testnet Setup Guide

### Step 1 — Install Freighter

Go to freighter.app and install the browser extension. After install, open it, create a new wallet, and save the recovery phrase. Then go to Settings inside Freighter and switch to Testnet.

### Step 2 — Create and Fund a Testnet Account

Inside Freighter on testnet, copy your public key. Then visit:

```
https://friendbot.stellar.org/?addr=YOUR_PUBLIC_KEY
```

This sends 10,000 testnet XLM to your account instantly. Free. Do this for your main dev account.

### Step 3 — Get Testnet USDC

Testnet USDC is issued by Circle on Stellar testnet. The issuer address is:

```
GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5
```

To receive USDC you first need a trustline. Go to Stellar Laboratory at lab.stellar.org, navigate to Transaction Builder, build a Change Trust operation for the USDC asset with the issuer above, sign with your testnet account, and submit. Then you can receive USDC from the Stellar Discord testnet faucet or from another test account you control.

### Step 4 — Set Up Supabase

- Create a free account at supabase.com
- Create a new project — pick a region close to your users
- Go to the SQL Editor and run the `CREATE TABLE` statements for all 5 tables from Section 9
- Enable Row Level Security on all tables in the Supabase dashboard
- Copy your project URL and both keys (anon and service_role) from Project Settings > API

### Step 5 — Environment Variables

Create a `.env.local` file in the root of your Next.js project:

```env
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_HORIZON_URL=https://horizon-testnet.stellar.org
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_AGGREGATOR_CONTRACT_ID=set_after_contract_deploy
NEXT_PUBLIC_ORACLE_CONTRACT_ID=set_after_contract_deploy
```

> Never commit `.env.local` to git. Add it to `.gitignore` immediately.

### Step 6 — Deploy Soroban Contracts

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install soroban-cli
cargo install --locked soroban-cli

# Add wasm target
rustup target add wasm32-unknown-unknown

# Build contracts
cd contracts
soroban contract build

# Deploy aggregator router
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/aggregator_router.wasm \
  --network testnet \
  --source YOUR_SECRET_KEY

# Save the returned contract ID into NEXT_PUBLIC_AGGREGATOR_CONTRACT_ID in .env.local
# Deploy price oracle the same way — save that contract ID too

# Initialize the router contract
soroban contract invoke \
  --id CONTRACT_ID \
  --network testnet \
  --source YOUR_SECRET_KEY \
  -- initialize \
  --admin YOUR_PUBLIC_KEY \
  --fee-bps 10
```

### Step 7 — Run the App

```bash
npm install
npm run dev
```

App runs at `http://localhost:3000`. Connect Freighter (set to testnet), swap some testnet assets, check Supabase to confirm rows are being written.

### Going to Mainnet (After Winning)

Change `NEXT_PUBLIC_STELLAR_NETWORK` to `mainnet`, update `NEXT_PUBLIC_HORIZON_URL` to `https://horizon.stellar.org`, redeploy both Soroban contracts to mainnet, update the contract ID env vars. Deploy to Vercel. Done. No code changes needed — the network is entirely config-driven.

---

## 16. Build Plan (Day by Day)

### Phase 1 — Foundation (Days 1–2)

**Phase 1 Goal: Get a swap working end-to-end. Ugly is fine.**

#### DAY 1 — Project Setup + Wallet + Price Fetch

```bash
npx create-next-app@latest novadex --typescript --tailwind --app
```

- Install: `stellar-sdk`, `@stellar/freighter-api`, `@supabase/supabase-js`, `zustand`, `@tanstack/react-query`, `recharts`, `lucide-react`
- Set up Supabase project, create all 5 tables, copy env vars
- Build `WalletStore` in Zustand (`publicKey`, `isConnected`, `connect`, `disconnect`)
- Build `ConnectWallet` component with `isConnected()` + `requestAccess()` logic
- Build `/api/users/connect` API route — upsert to Supabase
- Hit Horizon order book API for XLM/USDC, log results
- Hit Aquarius API for XLM/USDC pool, log results

#### DAY 2 — Basic Routing Engine + Swap UI

- Build routing engine module: takes pair + amount, returns best quote from SDEX vs Aquarius
- Build basic swap UI: From selector, To selector, amount input
- Wire routing engine to UI — display best quote in To field
- Add route card showing source and expected output
- Add savings badge comparing best route vs second-best
- Build `/api/swaps/record` API route
- Test a real testnet swap manually via Stellar Lab to verify routing logic

---

### Phase 2 — Core Features (Days 3–5)

**Phase 2 Goal: Soroban contracts live, multi-hop routing, full swap flow.**

#### DAY 3 — Soroban Contracts

- Write `aggregator_router` contract in Rust
- Write `price_oracle` contract in Rust
- Test both contracts locally with `soroban-cli invoke`
- Deploy both to testnet, save contract IDs to `.env.local`
- Build contract client module in TypeScript (wraps soroban-cli calls)
- Test calling `get_quote()` from the frontend

#### DAY 4 — Multi-Hop Routing + Slippage

- Extend routing engine to explore 2-hop and 3-hop paths
- Add Horizon strict-send path finding as an additional data source
- Build route fingerprint generation
- Build adaptive slippage engine (calculates recommended tolerance from order book depth)
- Add slippage settings panel to swap UI
- Add price impact calculation and indicator

#### DAY 5 — Full Swap Execution + Confirmation Modal

- Wire `signTransaction()` to the confirmed route
- Build confirmation modal with full swap breakdown
- Build success screen with savings and tx hash
- Handle error states: transaction failed, reverted, timeout
- Wire `/api/swaps/record` to fire after confirmed tx
- Test full swap flow end-to-end on testnet — multiple pairs

---

### Phase 3 — Features + Polish (Days 6–7)

**Phase 3 Goal: Demo-ready. Every feature works. Looks sharp.**

#### DAY 6 — History, Analytics, Favourites

- Build `/history` page with swap history table, filters, pagination
- Build `/analytics` page with global stats + personal charts
- Build favourites: add/remove endpoint, favourites display on swap page
- Build order splitting for large trades
- Add no-XLM onboarding banner
- Add network mismatch warning banner
- Build `/api/auth/verify` for signature verification

#### DAY 7 — Polish, Deploy, Demo Prep

- Full UI polish: spacing, typography consistency, responsive check
- Build `/routes` explorer page
- Build `/pools` page
- Build `/about` page
- Error boundary handling across all pages
- Deploy to Vercel, test on production URL
- Record demo video (show live savings badge, show Supabase row being written)
- Write hackathon submission copy

---

### MVP vs Stretch Goals

| **Feature** | **Phase** | **MVP or Stretch** |
|---|---|---|
| SDEX + Aquarius aggregation | Phase 1 | MVP |
| Savings badge | Phase 1 | MVP |
| Supabase swap history | Phase 1 | MVP |
| Wallet connect (Freighter) | Phase 1 | MVP |
| Soroban atomic execution | Phase 2 | MVP |
| Multi-hop routing (2 hops) | Phase 2 | MVP |
| Slippage protection | Phase 2 | MVP |
| Confirmation modal | Phase 2 | MVP |
| /history page | Phase 3 | MVP |
| /analytics page | Phase 3 | MVP |
| Favourites & presets | Phase 3 | Stretch |
| Order splitting | Phase 3 | Stretch |
| 3-hop routing | Phase 3 | Stretch |
| Price oracle contract | Phase 3 | Stretch |
| Signature-based auth | Phase 3 | Stretch |
| /routes explorer page | Phase 3 | Stretch |
| Mobile responsive | Phase 3 | Stretch |

---

## 17. Why NovaDEX Wins

### Judge Checklist

| **What Judges Look For** | **Others** | **NovaDEX** |
|---|---|---|
| Real ecosystem problem | General DeFi tools | **Liquidity fragmentation is THE problem in Stellar DeFi right now** |
| Novel — not already built | Clones and tutorials | **No DEX aggregator exists on Stellar. Provably first.** |
| Technical depth | Frontend-only dApps | **2 Soroban contracts + routing algorithm + Next.js backend + Supabase** |
| Live demo-able product | Mockups and slides | **Full working swap on testnet. Judges can try it.** |
| Ecosystem impact | Single-use tools | **Fills the most critical infrastructure gap in Stellar DeFi** |
| Business model | No monetisation plan | **0.1% protocol fee — every dollar of volume is revenue** |
| Post-hackathon potential | Weekend projects | **Could become core Stellar infrastructure like 1inch on Ethereum** |

### The Demo Moment

During the demo, do this live. Open NovaDEX. Enter 1000 XLM to USDC. Let the routing engine run — takes about 1 second. Point to the green savings badge. Say:

> *"SDEX gives you 47.21 USDC. NovaDEX finds a route through Aquarius and gives you 48.09 USDC. You just saved 88 cents on a $95 trade. Scale that to 10 million dollars of daily volume and NovaDEX saves Stellar traders $90,000 a day."*

Then click swap and show the Freighter popup confirming the transaction.

That sequence — live price, live savings, live execution — is more compelling than any slide.

---

## 18. Post-Hackathon Roadmap

Showing judges a credible plan beyond the hackathon signals this is a real project, not a weekend demo.

| **Timeline** | **Milestone** |
|---|---|
| Week 1 after win | Mainnet deployment. Update env vars, redeploy contracts, push to production Vercel. Done. |
| Month 1 | Open-source the routing engine as an npm package: `@novadex/stellar-router`. Any Stellar dApp can use NovaDEX routing without building their own. |
| Month 1–2 | Apply for Stellar Community Fund grant. Use the hackathon win as proof of traction. |
| Month 2 | Add anchor rate aggregation — pull rates from MoneyGram, Flutterwave, and other Stellar anchors into the routing graph. |
| Month 3 | Public routing API. Third-party dApps can call NovaDEX routing endpoints to get optimal routes without running the engine themselves. Rate-limited free tier + paid tier. |
| Month 4 | Limit orders via Soroban. User places a limit: "swap 500 XLM for USDC when XLM hits $0.11." A keeper network monitors prices and executes when the condition is met. |
| Month 6 | Mobile app. React Native with Freighter mobile SDK when available. |
| Long term | NovaDEX becomes the default routing layer for Stellar DeFi — the 1inch of the Stellar ecosystem. |

---

## 19. Glossary

| **Term** | **Definition** |
|---|---|
| SDEX | Stellar Decentralized Exchange — the order book exchange baked into the Stellar protocol itself. Any two assets can be traded directly on it. No smart contract needed. |
| Aquarius | An AMM (Automated Market Maker) protocol built on Stellar. Users deposit asset pairs into liquidity pools, traders swap against those pools. Separate from SDEX. |
| AMM | Automated Market Maker — prices trades using a mathematical formula (x\*y=k) instead of an order book. Price moves continuously based on the ratio of assets in the pool. |
| Soroban | Stellar's smart contract platform. Contracts are written in Rust, compiled to WebAssembly, and deployed on-chain. Launched on mainnet in 2024. |
| Horizon API | Stellar's official REST API for querying all network data — balances, order books, transaction history, paths. Completely public and free. Two versions: testnet and mainnet. |
| Freighter | The official Stellar browser wallet extension. Stores private keys locally. Never exposes them to websites. Only signs what the user explicitly approves. |
| Public Key | A 56-character identifier starting with G. This is the user's wallet address and identity in NovaDEX. Safe to share publicly. |
| Private Key | The secret that controls a Stellar wallet. Never shared. Stored inside Freighter. NovaDEX never sees or touches the private key. |
| XDR | External Data Representation — the binary format Stellar uses for transactions. Stellar SDK builds XDR, Freighter signs it, Horizon submits it. |
| Multi-hop routing | A swap path that goes through intermediate assets. e.g. XLM → USDC → USDT instead of direct XLM → USDT. Often cheaper because intermediate pairs have better liquidity. |
| Slippage | The difference between the price you see when you request a quote and the price you actually get when the transaction executes. Caused by other trades happening between those two moments. |
| Price Impact | How much your specific trade moves the market price. A large trade on a shallow order book moves the price significantly against you, leaving you with worse output. |
| Atomic Execution | A transaction that either fully completes or fully reverts. No partial states. Soroban contracts are atomic by default — the key property that makes NovaDEX safe. |
| Trustline | An explicit opt-in on Stellar — every account must add a trustline for each non-native asset (anything that is not XLM) before they can hold it. |
| Anchor | A company on Stellar that issues fiat-backed tokens and handles deposit/withdrawal of real-world currency. e.g. Circle issues USDC on Stellar. MoneyGram is an anchor. |
| Friendbot | Stellar's testnet faucet. Sends 10,000 testnet XLM to any account for free. Only works on testnet. URL: `https://friendbot.stellar.org/?addr=YOUR_ADDRESS` |
| Route Fingerprint | A hash of the swap path taken — which assets, which sources, in which order. Stored in Supabase and used for audit trails and route analytics. |
| RLS | Row Level Security — a Supabase/PostgreSQL feature that enforces data access rules at the database level. Ensures user A cannot read user B's swap history even if they try. |
| Service Role Key | Supabase's admin key. Bypasses RLS. Must be kept server-side only — never in browser code or client-side environment variables. |
| Anon Key | Supabase's public key. Subject to RLS policies. Safe to include in client-side code. Used for operations that respect row-level permissions. |
| App Router | Next.js 14's routing system. Supports React Server Components, streaming, and layouts. Used instead of the older Pages Router. |
| Server Component | A React component that renders on the server. Can directly fetch from Supabase without exposing API keys. Used for history and analytics pages in NovaDEX. |
| Client Component | A React component with `"use client"` directive. Runs in the browser. Required for wallet interaction, real-time prices, and interactive swap UI. |
