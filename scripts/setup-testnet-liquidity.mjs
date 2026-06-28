/**
 * NovaDEX Testnet Liquidity Setup Script
 * 
 * Creates test token issuers and seeds the Stellar Testnet SDEX with
 * offers so that PathPaymentStrictSend can find routes.
 * 
 * What this script does:
 * 1. Creates an ISSUER account (issues USDC, AQUA, yXLM, ARS, SHX on testnet)
 * 2. Creates a MARKET MAKER account (holds tokens and places SDEX offers)
 * 3. Places buy/sell offers on XLM/USDC and XLM/AQUA pairs
 * 4. Outputs the issuer public key to set in .env.local
 * 
 * Usage:
 *   node scripts/setup-testnet-liquidity.mjs
 * 
 * Prerequisites:
 *   npm install @stellar/stellar-sdk (already in project)
 */

import * as StellarSdk from '@stellar/stellar-sdk';

const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const FRIENDBOT_URL = 'https://friendbot.stellar.org';
const NETWORK_PASSPHRASE = StellarSdk.Networks.TESTNET;
const server = new StellarSdk.Horizon.Server(HORIZON_URL);

// Token codes to issue
const TOKEN_CODES = ['USDC', 'AQUA', 'yXLM', 'ARS', 'SHX'];

// Supply to issue per token
const ISSUE_AMOUNT = '100000000'; // 100M units
// Amount to send to market maker
const MM_AMOUNT = '50000000'; // 50M units

// ─── Helpers ───────────────────────────────────────────

async function fundWithFriendbot(publicKey) {
  console.log(`  💸 Funding ${publicKey.substring(0, 8)}... via Friendbot`);
  const response = await fetch(`${FRIENDBOT_URL}?addr=${publicKey}`);
  if (!response.ok) {
    const text = await response.text();
    // Already funded is OK
    if (text.includes('createAccountAlreadyExist')) {
      console.log('  ℹ️  Account already exists, skipping funding');
      return;
    }
    throw new Error(`Friendbot failed: ${text}`);
  }
  console.log('  ✅ Funded with 10000 XLM');
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Main ──────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  NovaDEX Testnet Liquidity Setup');
  console.log('═══════════════════════════════════════════\n');

  // Step 1: Generate keypairs
  const issuerKeypair = StellarSdk.Keypair.random();
  const marketMakerKeypair = StellarSdk.Keypair.random();

  console.log('📋 Generated Keypairs:');
  console.log(`  Issuer:       ${issuerKeypair.publicKey()}`);
  console.log(`  Market Maker: ${marketMakerKeypair.publicKey()}`);
  console.log(`  Issuer Secret: ${issuerKeypair.secret()}`);
  console.log(`  MM Secret:     ${marketMakerKeypair.secret()}\n`);

  // Step 2: Fund both accounts
  console.log('Step 1/5: Funding accounts...');
  await fundWithFriendbot(issuerKeypair.publicKey());
  await sleep(1000);
  await fundWithFriendbot(marketMakerKeypair.publicKey());
  await sleep(2000);

  // Step 3: Create assets
  console.log('\nStep 2/5: Creating assets...');
  const assets = {};
  for (const code of TOKEN_CODES) {
    assets[code] = new StellarSdk.Asset(code, issuerKeypair.publicKey());
    console.log(`  📦 ${code} → issuer: ${issuerKeypair.publicKey()}`);
  }

  // Step 4: Market maker adds trustlines for all tokens
  console.log('\nStep 3/5: Adding trustlines on market maker...');
  const mmAccount = await server.loadAccount(marketMakerKeypair.publicKey());
  
  const trustlineTxBuilder = new StellarSdk.TransactionBuilder(mmAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  for (const code of TOKEN_CODES) {
    trustlineTxBuilder.addOperation(
      StellarSdk.Operation.changeTrust({
        asset: assets[code],
        limit: '1000000000', // 1B limit
      })
    );
    console.log(`  🔗 Trustline: ${code}`);
  }

  const trustlineTx = trustlineTxBuilder.setTimeout(60).build();
  trustlineTx.sign(marketMakerKeypair);
  await server.submitTransaction(trustlineTx);
  console.log('  ✅ All trustlines added');
  await sleep(2000);

  // Step 5: Issue tokens from issuer to market maker
  console.log('\nStep 4/5: Issuing tokens to market maker...');
  const issuerAccount = await server.loadAccount(issuerKeypair.publicKey());

  const issueTxBuilder = new StellarSdk.TransactionBuilder(issuerAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  for (const code of TOKEN_CODES) {
    issueTxBuilder.addOperation(
      StellarSdk.Operation.payment({
        destination: marketMakerKeypair.publicKey(),
        asset: assets[code],
        amount: MM_AMOUNT,
      })
    );
    console.log(`  💰 Sending ${MM_AMOUNT} ${code}`);
  }

  const issueTx = issueTxBuilder.setTimeout(60).build();
  issueTx.sign(issuerKeypair);
  await server.submitTransaction(issueTx);
  console.log('  ✅ All tokens issued');
  await sleep(2000);

  // Step 6: Place SDEX offers (market maker sells tokens for XLM and vice versa)
  console.log('\nStep 5/5: Placing SDEX offers...');
  
  // Offer prices (how many XLM per token)
  const prices = {
    'USDC': { sell: '7.5', buy: '7.0' },   // ~$0.13 per XLM
    'AQUA': { sell: '110', buy: '100' },    // Non-crossed spread
    'yXLM': { sell: '1.05', buy: '0.95' },  // ~1:1 with XLM
    'ARS': { sell: '0.008', buy: '0.007' }, // ~125 ARS per XLM
    'SHX': { sell: '50', buy: '55' },       // ~$0.002 per SHX
  };

  const mmAccountRefresh = await server.loadAccount(marketMakerKeypair.publicKey());
  const offerTxBuilder = new StellarSdk.TransactionBuilder(mmAccountRefresh, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  for (const code of ['USDC', 'AQUA', 'yXLM']) {
    const p = prices[code];
    
    // Sell offer: Market maker sells TOKEN, receives XLM
    // "I'm selling TOKEN for XLM at price P" means buyer pays P XLM per TOKEN
    offerTxBuilder.addOperation(
      StellarSdk.Operation.manageSellOffer({
        selling: assets[code],
        buying: StellarSdk.Asset.native(),
        amount: '1000000',  // 1M tokens for sale
        price: p.sell,       // XLM per token
      })
    );
    console.log(`  📈 Sell ${code}/XLM @ ${p.sell} XLM per ${code} (1M units)`);

    // Buy offer: Market maker buys TOKEN with XLM  
    // This creates the reverse direction (XLM → TOKEN)
    // Price = how much TOKEN per 1 XLM (inverse of buy price)
    const inversePrice = (1 / parseFloat(p.buy)).toFixed(7);
    offerTxBuilder.addOperation(
      StellarSdk.Operation.manageSellOffer({
        selling: StellarSdk.Asset.native(),
        buying: assets[code],
        amount: '2000',      // 2000 XLM worth of buys
        price: inversePrice,
      })
    );
    console.log(`  📉 Buy ${code}/XLM @ ${inversePrice} ${code} per XLM (2000 XLM)`);
  }

  const offerTx = offerTxBuilder.setTimeout(60).build();
  offerTx.sign(marketMakerKeypair);
  await server.submitTransaction(offerTx);
  console.log('  ✅ All SDEX offers placed');

  // ─── Summary ────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════');
  console.log('  ✅ TESTNET LIQUIDITY SETUP COMPLETE');
  console.log('═══════════════════════════════════════════\n');

  console.log('📋 Add this to your .env.local:\n');
  console.log(`NEXT_PUBLIC_TESTNET_ISSUER=${issuerKeypair.publicKey()}`);
  
  console.log('\n📋 Save these secrets (for managing liquidity later):\n');
  console.log(`TESTNET_ISSUER_SECRET=${issuerKeypair.secret()}`);
  console.log(`TESTNET_MM_SECRET=${marketMakerKeypair.secret()}`);
  
  console.log('\n📋 Your Freighter wallet needs a trustline for testnet USDC.');
  console.log('   Go to Freighter → Manage Assets → Add Asset:');
  console.log(`   Code: USDC`);
  console.log(`   Issuer: ${issuerKeypair.publicKey()}`);
  
  console.log('\n📋 Verify offers on Stellar Expert:');
  console.log(`   https://stellar.expert/explorer/testnet/account/${marketMakerKeypair.publicKey()}`);
  
  console.log('\n🔄 After adding NEXT_PUBLIC_TESTNET_ISSUER to .env.local, restart the dev server.\n');
}

main().catch((err) => {
  console.error('\n❌ Error:', err.message || err);
  if (err.response && err.response.data && err.response.data.extras) {
    console.error('\nDetailed Horizon Error:');
    console.error(JSON.stringify(err.response.data.extras.result_codes, null, 2));
  }
  process.exit(1);
});
