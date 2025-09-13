use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Transfer};

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid amount")]
    InvalidAmount,
}

declare_id!("6ZAmv942Z6KnN6QNRATu3qJo6gRnprqWR7KJLMrKkMSA");

// Pool wallet address
const POOL_WALLET: &str = "9XB7diinY3DTjWRaUqJnXUa9eHtVxprWJgNCu5UwR34N";

#[derive(Accounts)]
pub struct InitializePool<'info> {
    #[account(
        init,
        payer = signer,
        seeds = [b"pool".as_ref()],
        bump,
        space = 8 + 32
    )]
    pub pool_account: Account<'info, PoolAccount>,

    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct PoolAccount {
    pub total_deposited: u64,
}

#[account]
pub struct UserDeposit {
    pub user: Pubkey,
    pub amount: u64,
    pub deposit_time: i64,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"pool".as_ref()],
        bump
    )]
    pub pool_account: Account<'info, PoolAccount>,

    #[account(
        init_if_needed,
        payer = user,
        space = 8 + 32 + 8 + 8,
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

    #[account(
        mut,
        constraint = pool_token_account.mint == usdc_mint.key(),
        constraint = pool_token_account.owner == pool_account.key()
    )]
    pub pool_token_account: Account<'info, TokenAccount>,

    pub usdc_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[program]
pub mod my_project {
    use super::*;

    pub fn initialize_pool(ctx: Context<InitializePool>) -> Result<()> {
        let pool_account = &mut ctx.accounts.pool_account;
        pool_account.total_deposited = 0;
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        require!(amount > 0, ErrorCode::InvalidAmount);

        // Transfer USDC from user to pool
        let transfer_instruction = Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.pool_token_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            transfer_instruction,
        );

        token::transfer(cpi_ctx, amount)?;

        // Update pool data
        ctx.accounts.pool_account.total_deposited += amount;

        // Update user deposit record
        let user_deposit = &mut ctx.accounts.user_deposit;
        if user_deposit.amount == 0 {
            // First deposit for this user
            user_deposit.user = ctx.accounts.user.key();
            user_deposit.amount = amount;
            user_deposit.deposit_time = Clock::get()?.unix_timestamp;
        } else {
            // Add to existing deposit
            user_deposit.amount = user_deposit.amount.checked_add(amount).unwrap();
        }

        msg!("User {:?} deposited {} USDC to pool (total: {})", 
             ctx.accounts.user.key(), amount, user_deposit.amount);
        Ok(())
    }
}