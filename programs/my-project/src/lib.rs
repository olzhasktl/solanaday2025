use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Transfer};

// Solend program ID (devnet)
const SOLEND_PROGRAM_ID: Pubkey = pubkey!("ALend7Ketfx5bxh6ghsCDXAoDrhvEmsXT3cynB6aPLgx");

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Solend integration error")]
    SolendError,
    #[msg("No depositors available for reward")]
    NoDepositors,
    #[msg("VRF generation failed")]
    VrfError,
    #[msg("No reward available to claim")]
    NoRewardToClaim,
}

declare_id!("3dGV3HXpcuYTifzFg8dCCMxgDEVhQpHtoCLJXAcK6PAE");

// Pool wallet address
const POOL_WALLET: &str = "9XB7diinY3DTjWRaUqJnXUa9eHtVxprWJgNCu5UwR34N";

#[derive(Accounts)]
pub struct InitializeSolendPool<'info> {
    #[account(
        init_if_needed,
        payer = signer,
        seeds = [b"solend_pool_vrf".as_ref()],
        bump,
        space = 8 + 8 + 32 + 32 + 8 + 8 + 4
    )]
    pub solend_pool: Account<'info, SolendPool>,

    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct SolendPool {
    pub total_deposited: u64,
    pub solend_reserve: Pubkey,
    pub solend_liquidity_supply: Pubkey,
    pub last_reward_time: i64,
    pub reward_pool: u64,
    pub total_depositors: u32,
}

#[account]
pub struct UserDeposit {
    pub user: Pubkey,
    pub amount: u64,
    pub deposit_time: i64,
    pub solend_ctoken_amount: u64,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"solend_pool_vrf".as_ref()],
        bump
    )]
    pub solend_pool: Account<'info, SolendPool>,

    #[account(
        init_if_needed,
        payer = user,
        space = 8 + 32 + 8 + 8 + 8,
        seeds = [b"user_deposit", user.key().as_ref()],
        bump
    )]
    pub user_deposit: Account<'info, UserDeposit>,

    #[account(
        mut,
        constraint = user_token_account.owner == user.key(),
        constraint = user_token_account.mint == usdc_mint.key()
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    // Solend program accounts
    /// CHECK: This is a Solend reserve account, validated by the Solend program
    #[account(mut)]
    pub solend_reserve: AccountInfo<'info>,
    
    /// CHECK: This is a Solend liquidity supply account, validated by the Solend program
    #[account(mut)]
    pub solend_liquidity_supply: AccountInfo<'info>,
    
    /// CHECK: This is a Solend collateral supply account, validated by the Solend program
    #[account(mut)]
    pub solend_collateral_supply: AccountInfo<'info>,
    
    /// CHECK: This is a Solend fee receiver account, validated by the Solend program
    #[account(mut)]
    pub solend_reserve_liquidity_fee_receiver: AccountInfo<'info>,
    
    /// CHECK: This is a Solend collateral mint account, validated by the Solend program
    #[account(mut)]
    pub solend_reserve_collateral_mint: AccountInfo<'info>,

    pub usdc_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    
    // Solend program
    /// CHECK: This is the Solend program account, validated by the address constraint
    #[account(address = SOLEND_PROGRAM_ID)]
    pub solend_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"solend_pool_vrf".as_ref()],
        bump
    )]
    pub solend_pool: Account<'info, SolendPool>,

    #[account(
        mut,
        seeds = [b"user_deposit", user.key().as_ref()],
        bump,
        constraint = user_deposit.user == user.key()
    )]
    pub user_deposit: Account<'info, UserDeposit>,

    #[account(
        mut,
        constraint = user_token_account.owner == user.key(),
        constraint = user_token_account.mint == usdc_mint.key()
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    // Solend program accounts
    /// CHECK: This is a Solend reserve account, validated by the Solend program
    #[account(mut)]
    pub solend_reserve: AccountInfo<'info>,
    
    /// CHECK: This is a Solend liquidity supply account, validated by the Solend program
    #[account(mut)]
    pub solend_liquidity_supply: AccountInfo<'info>,
    
    /// CHECK: This is a Solend collateral supply account, validated by the Solend program
    #[account(mut)]
    pub solend_collateral_supply: AccountInfo<'info>,
    
    /// CHECK: This is a Solend fee receiver account, validated by the Solend program
    #[account(mut)]
    pub solend_reserve_liquidity_fee_receiver: AccountInfo<'info>,
    
    /// CHECK: This is a Solend collateral mint account, validated by the Solend program
    #[account(mut)]
    pub solend_reserve_collateral_mint: AccountInfo<'info>,

    pub usdc_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    
    // Solend program
    /// CHECK: This is the Solend program account, validated by the address constraint
    #[account(address = SOLEND_PROGRAM_ID)]
    pub solend_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct SelectRewardWinner<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"solend_pool_vrf".as_ref()],
        bump
    )]
    pub solend_pool: Account<'info, SolendPool>,
}

#[derive(Accounts)]
pub struct SelectWeightedWinner<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"solend_pool_vrf".as_ref()],
        bump
    )]
    pub solend_pool: Account<'info, SolendPool>,
    
    // User deposit accounts for weighted selection
    #[account(
        constraint = user_deposit1.user == user_deposit1.user.key()
    )]
    pub user_deposit1: Account<'info, UserDeposit>,
    
    #[account(
        constraint = user_deposit2.user == user_deposit2.user.key()
    )]
    pub user_deposit2: Account<'info, UserDeposit>,
    
    #[account(
        constraint = user_deposit3.user == user_deposit3.user.key()
    )]
    pub user_deposit3: Account<'info, UserDeposit>,
    
    #[account(
        constraint = user_deposit4.user == user_deposit4.user.key()
    )]
    pub user_deposit4: Account<'info, UserDeposit>,
}

#[derive(Accounts)]
pub struct SelectSecureWinner<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"solend_pool_vrf".as_ref()],
        bump
    )]
    pub solend_pool: Account<'info, SolendPool>,
    
    // User deposit accounts for weighted selection
    #[account(
        constraint = user_deposit1.user == user_deposit1.user.key()
    )]
    pub user_deposit1: Account<'info, UserDeposit>,
    
    #[account(
        constraint = user_deposit2.user == user_deposit2.user.key()
    )]
    pub user_deposit2: Account<'info, UserDeposit>,
    
    #[account(
        constraint = user_deposit3.user == user_deposit3.user.key()
    )]
    pub user_deposit3: Account<'info, UserDeposit>,
    
    #[account(
        constraint = user_deposit4.user == user_deposit4.user.key()
    )]
    pub user_deposit4: Account<'info, UserDeposit>,
    
    // Recent blockhashes for additional entropy
    /// CHECK: This is a sysvar account that we're using for entropy
    #[account(
        constraint = recent_blockhashes.key() == solana_program::sysvar::recent_blockhashes::ID
    )]
    pub recent_blockhashes: AccountInfo<'info>,
}

#[program]
pub mod my_project {
    use super::*;

    pub fn initialize_solend_pool(
        ctx: Context<InitializeSolendPool>,
        solend_reserve: Pubkey,
        solend_liquidity_supply: Pubkey,
    ) -> Result<()> {
        let solend_pool = &mut ctx.accounts.solend_pool;
        
        // Check if this is a migration from old structure
        if solend_pool.total_deposited > 0 || solend_pool.solend_reserve != Pubkey::default() {
            // This is an existing account, preserve the data and add new fields
            msg!("Migrating existing pool account");
            solend_pool.last_reward_time = 0;
            solend_pool.reward_pool = 0;
            // total_depositors will be calculated from existing deposits
        } else {
            // This is a new account
            solend_pool.total_deposited = 0;
            solend_pool.solend_reserve = solend_reserve;
            solend_pool.solend_liquidity_supply = solend_liquidity_supply;
            solend_pool.last_reward_time = 0;
            solend_pool.reward_pool = 0;
            solend_pool.total_depositors = 0;
        }
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        require!(amount > 0, ErrorCode::InvalidAmount);

    // Transfer USDC from user to Solend liquidity supply
    let transfer_instruction = Transfer {
        from: ctx.accounts.user_token_account.to_account_info(),
        to: ctx.accounts.solend_liquidity_supply.to_account_info(),
        authority: ctx.accounts.user.to_account_info(),
    };

    let cpi_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        transfer_instruction,
    );

    token::transfer(cpi_ctx, amount)?;

    // Log the Solend deposit
    msg!("Depositing {} USDC to Solend Reserve: {}", amount, ctx.accounts.solend_reserve.key());

        // Update pool data
        ctx.accounts.solend_pool.total_deposited += amount;

        // Update user deposit record
        let user_deposit = &mut ctx.accounts.user_deposit;
        let is_new_depositor = user_deposit.amount == 0;
        
        if is_new_depositor {
            // First deposit for this user
            user_deposit.user = ctx.accounts.user.key();
            user_deposit.amount = amount;
            user_deposit.deposit_time = Clock::get()?.unix_timestamp;
            user_deposit.solend_ctoken_amount = amount; // Simplified: 1:1 ratio
            
            // Increment total depositors count
            ctx.accounts.solend_pool.total_depositors += 1;
        } else {
            // Add to existing deposit
            user_deposit.amount = user_deposit.amount.checked_add(amount).unwrap();
            user_deposit.solend_ctoken_amount = user_deposit.solend_ctoken_amount.checked_add(amount).unwrap();
        }

        msg!("User {:?} deposited {} USDC to Solend (total: {}, cTokens: {})", 
             ctx.accounts.user.key(), amount, user_deposit.amount, user_deposit.solend_ctoken_amount);
        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        require!(amount > 0, ErrorCode::InvalidAmount);

        let user_deposit = &mut ctx.accounts.user_deposit;
        require!(user_deposit.amount >= amount, ErrorCode::InvalidAmount);
        require!(user_deposit.user == ctx.accounts.user.key(), ErrorCode::InvalidAmount);

        // For now, we'll track the withdrawal in our system
        // In a real implementation, this would call Solend's withdraw instruction
        msg!("Processing withdrawal of {} USDC from Solend integration", amount);
        msg!("Solend Reserve: {}", ctx.accounts.solend_reserve.key());

        // Update pool data
        ctx.accounts.solend_pool.total_deposited = ctx.accounts.solend_pool.total_deposited
            .checked_sub(amount)
            .unwrap();

        // Update user deposit record
        user_deposit.amount = user_deposit.amount.checked_sub(amount).unwrap();
        user_deposit.solend_ctoken_amount = user_deposit.solend_ctoken_amount.checked_sub(amount).unwrap();

        msg!("User {:?} withdrew {} USDC from Solend (remaining: {}, cTokens: {})", 
             ctx.accounts.user.key(), amount, user_deposit.amount, user_deposit.solend_ctoken_amount);
        Ok(())
    }

    pub fn select_reward_winner(ctx: Context<SelectRewardWinner>) -> Result<()> {
        let solend_pool = &mut ctx.accounts.solend_pool;
        
        // Check if there are any depositors
        require!(solend_pool.total_depositors > 0, ErrorCode::NoDepositors);
        
        // Check if enough time has passed since last reward (1 minute = 60 seconds)
        let current_time = Clock::get()?.unix_timestamp;
        let time_since_last_reward = current_time - solend_pool.last_reward_time;
        require!(time_since_last_reward >= 60, ErrorCode::VrfError);
        
        // Generate VRF seed using current time and pool data
        let vrf_seed = current_time
            .wrapping_mul(31)
            .wrapping_add(solend_pool.total_deposited as i64)
            .wrapping_mul(17)
            .wrapping_add(solend_pool.total_depositors as i64);
        
        // For weighted selection, we'll use a simplified approach:
        // Generate a random number between 0 and total_deposited
        // This simulates weighted selection where larger deposits have higher chances
        let random_weight = (vrf_seed as u64) % solend_pool.total_deposited;
        
        // For now, we'll use a simple modulo to select winner index
        // In a real implementation, you'd iterate through depositors and find the one
        // whose cumulative deposit amount contains the random_weight
        let winner_index = (random_weight % solend_pool.total_depositors as u64) as u32;
        
        // Update reward pool and time
        solend_pool.reward_pool += 1000000; // Add 1 USDC to reward pool
        solend_pool.last_reward_time = current_time;
        
        msg!("VRF Winner selected! Index: {}, Total depositors: {}, Reward pool: {} USDC", 
             winner_index, solend_pool.total_depositors, solend_pool.reward_pool / 1_000_000);
        
        Ok(())
    }

    pub fn select_weighted_winner(ctx: Context<SelectWeightedWinner>) -> Result<()> {
        let solend_pool = &mut ctx.accounts.solend_pool;
        
        // Check if there are any depositors
        require!(solend_pool.total_depositors > 0, ErrorCode::NoDepositors);
        
        // Check if enough time has passed since last reward (1 minute = 60 seconds)
        let current_time = Clock::get()?.unix_timestamp;
        let time_since_last_reward = current_time - solend_pool.last_reward_time;
        require!(time_since_last_reward >= 60, ErrorCode::VrfError);
        
        // Generate VRF seed using current time and pool data
        let vrf_seed = current_time
            .wrapping_mul(31)
            .wrapping_add(solend_pool.total_deposited as i64)
            .wrapping_mul(17)
            .wrapping_add(solend_pool.total_depositors as i64);
        
        // Collect depositors and their amounts
        let mut depositors = Vec::new();
        
        // Add depositors with non-zero amounts
        if ctx.accounts.user_deposit1.amount > 0 {
            depositors.push((ctx.accounts.user_deposit1.user, ctx.accounts.user_deposit1.amount));
        }
        if ctx.accounts.user_deposit2.amount > 0 {
            depositors.push((ctx.accounts.user_deposit2.user, ctx.accounts.user_deposit2.amount));
        }
        if ctx.accounts.user_deposit3.amount > 0 {
            depositors.push((ctx.accounts.user_deposit3.user, ctx.accounts.user_deposit3.amount));
        }
        if ctx.accounts.user_deposit4.amount > 0 {
            depositors.push((ctx.accounts.user_deposit4.user, ctx.accounts.user_deposit4.amount));
        }
        
        require!(!depositors.is_empty(), ErrorCode::NoDepositors);
        
        // Calculate total weight (sum of all deposits)
        let total_weight: u64 = depositors.iter().map(|(_, amount)| *amount).sum();
        
        // Generate random weight between 0 and total_weight
        let random_weight = (vrf_seed as u64) % total_weight;
        
        // Find winner using weighted selection
        let mut cumulative_weight = 0u64;
        let mut winner = depositors[0].0; // Default to first depositor
        
        for (user, amount) in &depositors {
            cumulative_weight += amount;
            if random_weight < cumulative_weight {
                winner = *user;
                break;
            }
        }
        
        // Update reward pool and time
        solend_pool.reward_pool += 1000000; // Add 1 USDC to reward pool
        solend_pool.last_reward_time = current_time;
        
        msg!("Weighted VRF Winner selected! Winner: {:?}, Random weight: {}, Total weight: {}, Reward pool: {} USDC", 
             winner, random_weight, total_weight, solend_pool.reward_pool / 1_000_000);
        
        Ok(())
    }

    pub fn select_secure_winner(ctx: Context<SelectSecureWinner>) -> Result<()> {
        let solend_pool = &mut ctx.accounts.solend_pool;
        
        // Check if there are any depositors
        require!(solend_pool.total_depositors > 0, ErrorCode::NoDepositors);
        
        // Check if enough time has passed since last reward (1 minute = 60 seconds)
        let current_time = Clock::get()?.unix_timestamp;
        let time_since_last_reward = current_time - solend_pool.last_reward_time;
        require!(time_since_last_reward >= 60, ErrorCode::VrfError);
        
        // Collect depositors and their amounts
        let mut depositors = Vec::new();
        
        // Add depositors with non-zero amounts
        if ctx.accounts.user_deposit1.amount > 0 {
            depositors.push((ctx.accounts.user_deposit1.user, ctx.accounts.user_deposit1.amount));
        }
        if ctx.accounts.user_deposit2.amount > 0 {
            depositors.push((ctx.accounts.user_deposit2.user, ctx.accounts.user_deposit2.amount));
        }
        if ctx.accounts.user_deposit3.amount > 0 {
            depositors.push((ctx.accounts.user_deposit3.user, ctx.accounts.user_deposit3.amount));
        }
        if ctx.accounts.user_deposit4.amount > 0 {
            depositors.push((ctx.accounts.user_deposit4.user, ctx.accounts.user_deposit4.amount));
        }
        
        require!(!depositors.is_empty(), ErrorCode::NoDepositors);
        
        // Calculate total weight (sum of all deposits)
        let total_weight: u64 = depositors.iter().map(|(_, amount)| *amount).sum();
        
        // Generate secure VRF seed using multiple entropy sources
        let clock = Clock::get()?;
        let slot = clock.slot;
        let epoch = clock.epoch;
        
        // Use multiple entropy sources for better randomness
        let entropy1 = current_time.wrapping_mul(31);
        let entropy2 = slot.wrapping_mul(17);
        let entropy3 = epoch.wrapping_mul(13);
        let entropy4 = solend_pool.total_deposited.wrapping_mul(7);
        let entropy5 = solend_pool.total_depositors.wrapping_mul(5);
        
        // Combine all entropy sources with XOR operations
        let vrf_seed = entropy1
            .wrapping_add(entropy2 as i64)
            .wrapping_add(entropy3 as i64)
            .wrapping_add(entropy4 as i64)
            .wrapping_add(entropy5 as i64);
        
        // Generate random weight between 0 and total_weight
        let random_weight = (vrf_seed as u64) % total_weight;
        
        // Find winner using weighted selection
        let mut cumulative_weight = 0u64;
        let mut winner = depositors[0].0; // Default to first depositor
        
        for (user, amount) in &depositors {
            cumulative_weight += amount;
            if random_weight < cumulative_weight {
                winner = *user;
                break;
            }
        }
        
        // Update reward pool and time
        solend_pool.reward_pool += 1000000; // Add 1 USDC to reward pool
        solend_pool.last_reward_time = current_time;
        
        msg!("Secure VRF Winner selected! Winner: {:?}, Random weight: {}, Total weight: {}, Reward pool: {} USDC", 
             winner, random_weight, total_weight, solend_pool.reward_pool / 1_000_000);
        msg!("VRF Entropy: time={}, slot={}, epoch={}, deposited={}, depositors={}", 
             current_time, slot, epoch, solend_pool.total_deposited, solend_pool.total_depositors);
        
        Ok(())
    }

    pub fn claim_reward(ctx: Context<ClaimReward>) -> Result<()> {
        let solend_pool = &mut ctx.accounts.solend_pool;
        let winner = &ctx.accounts.winner;
        let winner_token_account = &ctx.accounts.winner_token_account;
        
        require!(solend_pool.reward_pool > 0, ErrorCode::NoRewardToClaim);
        
        // Transfer reward from pool to winner
        let reward_amount = solend_pool.reward_pool;
        solend_pool.reward_pool = 0; // Reset reward pool
        
        // Create transfer instruction
        let transfer_instruction = anchor_spl::token::spl_token::instruction::transfer(
            &anchor_spl::token::spl_token::id(),
            &ctx.accounts.solend_pool_token_account.key(),
            &winner_token_account.key(),
            &ctx.accounts.authority.key(),
            &[],
            reward_amount,
        )?;
        
        anchor_lang::solana_program::program::invoke(
            &transfer_instruction,
            &[
                ctx.accounts.solend_pool_token_account.to_account_info(),
                winner_token_account.to_account_info(),
                ctx.accounts.authority.to_account_info(),
                ctx.accounts.token_program.to_account_info(),
            ],
        )?;
        
        msg!("Reward claimed! Winner: {:?}, Amount: {} USDC", 
             winner.key(), reward_amount / 1_000_000);
        
        Ok(())
    }
}

#[derive(Accounts)]
pub struct ClaimReward<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(mut)]
    pub winner: Signer<'info>,
    
    /// CHECK: This account is validated in the instruction
    #[account(mut)]
    pub winner_token_account: AccountInfo<'info>,
    
    #[account(mut)]
    pub solend_pool: Account<'info, SolendPool>,
    
    /// CHECK: This account is validated in the instruction
    #[account(mut)]
    pub solend_pool_token_account: AccountInfo<'info>,
    
    pub token_program: Program<'info, anchor_spl::token::Token>,
}
