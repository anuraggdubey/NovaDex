//! NovaDEX Price Oracle — Soroban Smart Contract
//!
//! Contract 2 of 2. Records on-chain price checkpoints and savings proofs.
//! This contract creates the immutable audit trail that proves NovaDEX gave
//! users a better price than any single direct swap source.
//!
//! Key capabilities:
//! - record_price: logs a price for a trading pair from a specific source
//! - record_savings: saves the on-chain savings proof after a swap
//! - get_price: returns the latest price for a pair
//! - get_user_total_savings: cumulative savings for a user's analytics dashboard
//! - is_price_stale: returns true if last price is > 60 seconds old

#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror,
    Address, BytesN, Env, Map, String, Symbol, Vec,
    panic_with_error,
};

// ==========================================
// DATA TYPES
// ==========================================

/// Source identifier for a price record.
/// 0 = SDEX Orderbook, 1 = Aquarius AMM, 2 = Anchor Rate
#[contracttype]
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum PriceSource {
    Sdex    = 0,
    Aquarius = 1,
    Anchor  = 2,
}

/// A single price checkpoint recorded on-chain.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct PriceRecord {
    /// Trading pair identifier: e.g. hash of "XLM/USDC"
    pub pair_id: BytesN<32>,
    /// Price as a scaled integer (price * 10^7, matching Stellar's 7-decimal precision)
    pub price_scaled: i128,
    /// DEX source where this price was observed
    pub source: u32, // PriceSource as u32 for contracttype compatibility
    /// Ledger timestamp when this price was recorded
    pub timestamp: u64,
}

/// On-chain proof that a user received a better price via NovaDEX routing.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct SavingsProof {
    /// User's Stellar wallet address
    pub user: Address,
    /// Trading pair identifier
    pub pair_id: BytesN<32>,
    /// USDC-equivalent savings from this specific swap
    pub savings_amount: i128,
    /// Best price available via direct single-source swap at execution time
    pub best_direct_price: i128,
    /// Actual price achieved via NovaDEX routing
    pub actual_price: i128,
    /// Ledger timestamp of the swap
    pub timestamp: u64,
    /// Transaction hash on Stellar (as bytes)
    pub tx_hash: BytesN<32>,
}

// ==========================================
// STORAGE KEYS
// ==========================================

#[contracttype]
pub enum OracleKey {
    Admin,
    /// Latest price record for a pair: pair_id -> PriceRecord
    LatestPrice(BytesN<32>),
    /// Cumulative user savings: user address -> total savings (scaled i128)
    UserTotalSavings(Address),
    /// Count of savings proofs recorded per user (for analytics)
    UserSavingsCount(Address),
    /// Authorized recorders: only these addresses can record prices/savings
    AuthorizedRecorder(Address),
    /// Price staleness threshold in seconds (default: 60)
    StalenessThreshold,
}

// ==========================================
// ERRORS
// ==========================================

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum OracleError {
    NotInitialized         = 1,
    AlreadyInitialized     = 2,
    NotAdmin               = 3,
    NotAuthorizedRecorder  = 4,
    PriceNotFound          = 5,
    InvalidPrice           = 6, // price <= 0
    InvalidSavings         = 7, // savings_amount <= 0
    ZeroAddress            = 8,
}

// Price staleness threshold: 60 seconds
const DEFAULT_STALENESS_THRESHOLD: u64 = 60;

// ==========================================
// CONTRACT
// ==========================================

#[contract]
pub struct PriceOracle;

#[contractimpl]
impl PriceOracle {
    // ----------------------------------------
    // ADMIN / SETUP
    // ----------------------------------------

    /// Initialize the oracle. Sets admin and authorizes the router contract
    /// as the primary price recorder.
    pub fn initialize(
        env: Env,
        admin: Address,
        router_contract: Address,
    ) -> Result<(), OracleError> {
        if env.storage().instance().has(&OracleKey::Admin) {
            return Err(OracleError::AlreadyInitialized);
        }

        env.storage().instance().set(&OracleKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&OracleKey::AuthorizedRecorder(router_contract.clone()), &true);
        env.storage()
            .instance()
            .set(&OracleKey::StalenessThreshold, &DEFAULT_STALENESS_THRESHOLD);

        env.events().publish(
            (Symbol::new(&env, "oracle_initialized"),),
            (admin, router_contract),
        );

        Ok(())
    }

    /// Authorize an additional address to record prices/savings.
    pub fn add_recorder(env: Env, recorder: Address) -> Result<(), OracleError> {
        Self::require_admin(&env)?;
        env.storage()
            .instance()
            .set(&OracleKey::AuthorizedRecorder(recorder), &true);
        Ok(())
    }

    /// Update the staleness threshold in seconds.
    pub fn set_staleness_threshold(env: Env, seconds: u64) -> Result<(), OracleError> {
        Self::require_admin(&env)?;
        env.storage()
            .instance()
            .set(&OracleKey::StalenessThreshold, &seconds);
        Ok(())
    }

    // ----------------------------------------
    // RECORDING FUNCTIONS
    // ----------------------------------------

    /// Record a price checkpoint for a trading pair.
    /// Called by the router contract before executing each swap.
    ///
    /// # Arguments
    /// * `pair_id`      — 32-byte hash identifying the trading pair (e.g. SHA256 of "XLM/USDC")
    /// * `price_scaled` — price * 10^7 (Stellar's 7-decimal precision)
    /// * `source`       — 0=SDEX, 1=Aquarius, 2=Anchor
    pub fn record_price(
        env: Env,
        caller: Address,
        pair_id: BytesN<32>,
        price_scaled: i128,
        source: u32,
    ) -> Result<(), OracleError> {
        caller.require_auth();
        Self::require_authorized_recorder(&env, &caller)?;

        if price_scaled <= 0 {
            return Err(OracleError::InvalidPrice);
        }

        let now = env.ledger().timestamp();

        let record = PriceRecord {
            pair_id: pair_id.clone(),
            price_scaled,
            source,
            timestamp: now,
        };

        env.storage()
            .persistent()
            .set(&OracleKey::LatestPrice(pair_id.clone()), &record);

        env.events().publish(
            (Symbol::new(&env, "price_recorded"),),
            (pair_id, price_scaled, source, now),
        );

        Ok(())
    }

    /// Record an on-chain savings proof after a successful swap.
    /// This is the immutable record that the user got a better deal via NovaDEX.
    ///
    /// # Arguments
    /// * `user`              — wallet address of the trader
    /// * `pair_id`           — trading pair identifier
    /// * `savings_amount`    — USDC-equivalent savings (scaled by 10^6)
    /// * `best_direct_price` — best price available via direct single-source swap
    /// * `actual_price`      — price actually achieved via NovaDEX routing
    /// * `tx_hash`           — Stellar transaction hash (32 bytes)
    pub fn record_savings(
        env: Env,
        caller: Address,
        user: Address,
        pair_id: BytesN<32>,
        savings_amount: i128,
        best_direct_price: i128,
        actual_price: i128,
        tx_hash: BytesN<32>,
    ) -> Result<(), OracleError> {
        caller.require_auth();
        Self::require_authorized_recorder(&env, &caller)?;

        if savings_amount <= 0 {
            return Err(OracleError::InvalidSavings);
        }

        let now = env.ledger().timestamp();

        // Update cumulative savings for this user
        let current_savings: i128 = env
            .storage()
            .persistent()
            .get(&OracleKey::UserTotalSavings(user.clone()))
            .unwrap_or(0);

        env.storage()
            .persistent()
            .set(&OracleKey::UserTotalSavings(user.clone()), &(current_savings + savings_amount));

        // Update swap count for this user
        let current_count: u64 = env
            .storage()
            .persistent()
            .get(&OracleKey::UserSavingsCount(user.clone()))
            .unwrap_or(0);

        env.storage()
            .persistent()
            .set(&OracleKey::UserSavingsCount(user.clone()), &(current_count + 1));

        // Emit the savings proof as an event (permanently on-chain, queryable by anyone)
        env.events().publish(
            (Symbol::new(&env, "savings_proof"), user.clone()),
            (
                pair_id,
                savings_amount,
                best_direct_price,
                actual_price,
                tx_hash,
                now,
            ),
        );

        Ok(())
    }

    // ----------------------------------------
    // READ FUNCTIONS
    // ----------------------------------------

    /// Returns the latest price record for a pair.
    pub fn get_price(env: Env, pair_id: BytesN<32>) -> Result<PriceRecord, OracleError> {
        env.storage()
            .persistent()
            .get(&OracleKey::LatestPrice(pair_id))
            .ok_or(OracleError::PriceNotFound)
    }

    /// Returns true if the latest price for a pair is older than the staleness threshold.
    /// The router refuses to execute a swap if the oracle price is stale.
    pub fn is_price_stale(env: Env, pair_id: BytesN<32>) -> bool {
        let threshold: u64 = env
            .storage()
            .instance()
            .get(&OracleKey::StalenessThreshold)
            .unwrap_or(DEFAULT_STALENESS_THRESHOLD);

        match env
            .storage()
            .persistent()
            .get::<_, PriceRecord>(&OracleKey::LatestPrice(pair_id))
        {
            Some(record) => {
                let now = env.ledger().timestamp();
                now.saturating_sub(record.timestamp) > threshold
            }
            None => true, // No price recorded = treat as stale
        }
    }

    /// Returns cumulative USDC-equivalent savings for a user across all their swaps.
    /// Displayed on the personal analytics dashboard.
    pub fn get_user_total_savings(env: Env, user: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&OracleKey::UserTotalSavings(user))
            .unwrap_or(0)
    }

    /// Returns the number of savings proofs recorded for a user.
    pub fn get_user_savings_count(env: Env, user: Address) -> u64 {
        env.storage()
            .persistent()
            .get(&OracleKey::UserSavingsCount(user))
            .unwrap_or(0)
    }

    /// Returns the admin address.
    pub fn get_admin(env: Env) -> Result<Address, OracleError> {
        env.storage()
            .instance()
            .get(&OracleKey::Admin)
            .ok_or(OracleError::NotInitialized)
    }

    /// Record savings proof directly by the trader (user must authorize).
    pub fn record_savings_user(
        env: Env,
        user: Address,
        pair_id: BytesN<32>,
        savings_amount: i128,
        best_direct_price: i128,
        actual_price: i128,
        tx_hash: BytesN<32>,
    ) -> Result<(), OracleError> {
        user.require_auth();
        Self::require_initialized(&env)?;

        if savings_amount <= 0 {
            return Err(OracleError::InvalidSavings);
        }

        let now = env.ledger().timestamp();

        let current_savings: i128 = env
            .storage()
            .persistent()
            .get(&OracleKey::UserTotalSavings(user.clone()))
            .unwrap_or(0);

        env.storage()
            .persistent()
            .set(&OracleKey::UserTotalSavings(user.clone()), &(current_savings + savings_amount));

        let current_count: u64 = env
            .storage()
            .persistent()
            .get(&OracleKey::UserSavingsCount(user.clone()))
            .unwrap_or(0);

        env.storage()
            .persistent()
            .set(&OracleKey::UserSavingsCount(user.clone()), &(current_count + 1));

        env.events().publish(
            (Symbol::new(&env, "savings_proof"), user.clone()),
            (
                pair_id,
                savings_amount,
                best_direct_price,
                actual_price,
                tx_hash,
                now,
            ),
        );

        Ok(())
    }

    // ----------------------------------------
    // INTERNAL HELPERS
    // ----------------------------------------

    fn require_admin(env: &Env) -> Result<(), OracleError> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&OracleKey::Admin)
            .ok_or(OracleError::NotInitialized)?;
        admin.require_auth();
        Ok(())
    }

    fn require_initialized(env: &Env) -> Result<(), OracleError> {
        if !env.storage().instance().has(&OracleKey::Admin) {
            return Err(OracleError::NotInitialized);
        }
        Ok(())
    }

    fn require_authorized_recorder(env: &Env, caller: &Address) -> Result<(), OracleError> {
        let is_authorized: bool = env
            .storage()
            .instance()
            .get(&OracleKey::AuthorizedRecorder(caller.clone()))
            .unwrap_or(false);

        if !is_authorized {
            return Err(OracleError::NotAuthorizedRecorder);
        }
        Ok(())
    }
}

// ==========================================
// TESTS
// ==========================================

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env, Address, BytesN};

    fn make_pair_id(env: &Env, label: &str) -> BytesN<32> {
        let bytes: [u8; 32] = {
            let mut b = [0u8; 32];
            let src = label.as_bytes();
            let len = src.len().min(32);
            b[..len].copy_from_slice(&src[..len]);
            b
        };
        BytesN::from_array(env, &bytes)
    }

    #[test]
    fn test_initialize_oracle() {
        let env = Env::default();
        let contract_id = env.register_contract(None, PriceOracle);
        let client = PriceOracleClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let router = Address::generate(&env);

        client.initialize(&admin, &router);

        assert_eq!(client.get_admin().unwrap(), admin);
    }

    #[test]
    fn test_price_stale_when_not_recorded() {
        let env = Env::default();
        let contract_id = env.register_contract(None, PriceOracle);
        let client = PriceOracleClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let router = Address::generate(&env);
        client.initialize(&admin, &router);

        let pair = make_pair_id(&env, "XLM/USDC");
        assert!(client.is_price_stale(&pair));
    }

    #[test]
    fn test_record_and_get_price() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, PriceOracle);
        let client = PriceOracleClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let router = Address::generate(&env);
        client.initialize(&admin, &router);

        let pair = make_pair_id(&env, "XLM/USDC");
        let price = 1_210_000i128; // 0.121 USDC per XLM * 10^7

        client.record_price(&router, &pair, &price, &0u32);

        let record = client.get_price(&pair).unwrap();
        assert_eq!(record.price_scaled, price);
        assert_eq!(record.source, 0);
    }

    #[test]
    fn test_user_savings_accumulate() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, PriceOracle);
        let client = PriceOracleClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let router = Address::generate(&env);
        let user = Address::generate(&env);
        client.initialize(&admin, &router);

        let pair = make_pair_id(&env, "XLM/USDC");
        let tx_bytes: [u8; 32] = [1u8; 32];
        let tx_hash = BytesN::from_array(&env, &tx_bytes);

        // Record first savings: 500_000 (0.50 USDC in scaled units)
        client.record_savings(&router, &user, &pair, &500_000i128, &1_200_000i128, &1_250_000i128, &tx_hash);
        assert_eq!(client.get_user_total_savings(&user), 500_000);

        // Record second savings: 840_000 (0.84 USDC)
        let tx_bytes2: [u8; 32] = [2u8; 32];
        let tx_hash2 = BytesN::from_array(&env, &tx_bytes2);
        client.record_savings(&router, &user, &pair, &840_000i128, &1_200_000i128, &1_250_000i128, &tx_hash2);
        assert_eq!(client.get_user_total_savings(&user), 1_340_000);
        assert_eq!(client.get_user_savings_count(&user), 2);
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #6)")]
    fn test_record_price_invalid_price() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, PriceOracle);
        let client = PriceOracleClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let router = Address::generate(&env);
        client.initialize(&admin, &router);

        let pair = make_pair_id(&env, "XLM/USDC");
        client.record_price(&router, &pair, &0i128, &0u32); // price <= 0
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #4)")]
    fn test_record_price_unauthorized() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, PriceOracle);
        let client = PriceOracleClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let router = Address::generate(&env);
        client.initialize(&admin, &router);

        let pair = make_pair_id(&env, "XLM/USDC");
        let rando = Address::generate(&env); // not an authorized recorder
        client.record_price(&rando, &pair, &1_000_000i128, &0u32);
    }

    #[test]
    fn test_record_savings_user_happy_path() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, PriceOracle);
        let client = PriceOracleClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let router = Address::generate(&env);
        client.initialize(&admin, &router);

        let user = Address::generate(&env);
        let pair = make_pair_id(&env, "XLM/USDC");
        let tx_hash = BytesN::from_array(&env, &[0xABu8; 32]);

        client.record_savings_user(
            &user,
            &pair,
            &750_000i128,     // savings_amount
            &1_200_000i128,   // best_direct_price
            &1_250_000i128,   // actual_price
            &tx_hash,
        );

        assert_eq!(client.get_user_total_savings(&user), 750_000);
        assert_eq!(client.get_user_savings_count(&user), 1);
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #1)")]
    fn test_record_savings_user_not_initialized() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, PriceOracle);
        let client = PriceOracleClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        let pair = make_pair_id(&env, "XLM/USDC");
        let tx_hash = BytesN::from_array(&env, &[0xCDu8; 32]);

        client.record_savings_user(
            &user,
            &pair,
            &500_000i128,
            &1_200_000i128,
            &1_250_000i128,
            &tx_hash,
        );
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #7)")]
    fn test_record_savings_user_invalid_savings() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, PriceOracle);
        let client = PriceOracleClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let router = Address::generate(&env);
        client.initialize(&admin, &router);

        let user = Address::generate(&env);
        let pair = make_pair_id(&env, "XLM/USDC");
        let tx_hash = BytesN::from_array(&env, &[0xEFu8; 32]);

        client.record_savings_user(
            &user,
            &pair,
            &0i128,           // savings_amount <= 0
            &1_200_000i128,
            &1_250_000i128,
            &tx_hash,
        );
    }

    #[test]
    #[should_panic]
    fn test_double_initialize_fails() {
        let env = Env::default();
        let contract_id = env.register_contract(None, PriceOracle);
        let client = PriceOracleClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let router = Address::generate(&env);
        client.initialize(&admin, &router);
        client.initialize(&admin, &router); // should panic
    }
}
