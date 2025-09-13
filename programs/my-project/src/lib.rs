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
}

declare_id!("6ZAmv942Z6KnN6QNRATu3qJo6gRnprqWR7KJLMrKkMSA");

// Pool wallet address
const POOL_WALLET: &str = "9XB7diinY3DTjWRaUqJnXUa9eHtVxprWJgNCu5UwR34N";

#[derive(Accounts)]
pub struct InitializeSolendPool<'info> {
    #[account(
        init,
        payer = signer,
        seeds = [b"solend_pool".as_ref()],
        bump,
        space = 8 + 8 + 32 + 32
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
        seeds = [b"solend_pool".as_ref()],
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
        seeds = [b"solend_pool".as_ref()],
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

#[program]
pub mod my_project {
    use super::*;

    pub fn initialize_solend_pool(
        ctx: Context<InitializeSolendPool>,
        solend_reserve: Pubkey,
        solend_liquidity_supply: Pubkey,
    ) -> Result<()> {
        let solend_pool = &mut ctx.accounts.solend_pool;
        solend_pool.total_deposited = 0;
        solend_pool.solend_reserve = solend_reserve;
        solend_pool.solend_liquidity_supply = solend_liquidity_supply;
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
        if user_deposit.amount == 0 {
            // First deposit for this user
            user_deposit.user = ctx.accounts.user.key();
            user_deposit.amount = amount;
            user_deposit.deposit_time = Clock::get()?.unix_timestamp;
            user_deposit.solend_ctoken_amount = amount; // Simplified: 1:1 ratio
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
}