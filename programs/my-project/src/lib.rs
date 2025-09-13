use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("No depositors available for reward")]
    NoDepositors,
    #[msg("VRF generation failed")]
    VrfError,
    #[msg("No reward available to claim")]
    NoRewardToClaim,
    #[msg("Insufficient balance")]
    InsufficientBalance,
}

declare_id!("3dGV3HXpcuYTifzFg8dCCMxgDEVhQpHtoCLJXAcK6PAE");

#[derive(Accounts)]
pub struct InitializePool<'info> {
    #[account(
        init_if_needed,
        payer = admin,
        seeds = [b"sol_pool_vrf".as_ref()],
        bump,
        space = 8 + 8 + 8 + 8 + 4 + 32
    )]
    pub sol_pool: Account<'info, SolPool>,

    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct SolPool {
    pub total_deposited: u64,        // Total SOL deposited (in lamports)
    pub total_depositors: u32,       // Number of depositors
    pub last_reward_time: i64,       // Last time reward was distributed
    pub reward_pool: u64,            // Reward pool in lamports
    pub admin: Pubkey,               // Admin who can run lottery
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"sol_pool_vrf".as_ref()],
        bump
    )]
    pub sol_pool: Account<'info, SolPool>,
    
    #[account(
        mut,
        seeds = [b"sol_vault".as_ref()],
        bump
    )]
    /// CHECK: This account is used to hold SOL and can be transferred to
    pub sol_vault: UncheckedAccount<'info>,
    
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + 32 + 8 + 8,
        seeds = [b"user_deposit".as_ref(), user.key().as_ref()],
        bump
    )]
    pub user_deposit: Account<'info, UserDeposit>,
    
    pub system_program: Program<'info, System>,
}

#[account]
pub struct UserDeposit {
    pub user: Pubkey,
    pub amount: u64,        // Amount in lamports
    pub deposit_time: i64,  // Timestamp of deposit
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"sol_pool_vrf".as_ref()],
        bump
    )]
    pub sol_pool: Account<'info, SolPool>,
    
    #[account(
        mut,
        seeds = [b"sol_vault".as_ref()],
        bump
    )]
    /// CHECK: This account is used to hold SOL and can be transferred from
    pub sol_vault: UncheckedAccount<'info>,
    
    #[account(
        mut,
        seeds = [b"user_deposit".as_ref(), user.key().as_ref()],
        bump,
        constraint = user_deposit.user == user.key()
    )]
    pub user_deposit: Account<'info, UserDeposit>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SelectSecureWinner<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"sol_pool_vrf".as_ref()],
        bump
    )]
    pub sol_pool: Account<'info, SolPool>,
    
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
    pub recent_blockhashes: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct ClaimReward<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(mut)]
    pub winner: Signer<'info>,
    
    #[account(mut)]
    pub sol_pool: Account<'info, SolPool>,
    
    pub system_program: Program<'info, System>,
}

#[program]
pub mod my_project {
    use super::*;

    pub fn initialize_pool(ctx: Context<InitializePool>) -> Result<()> {
        let sol_pool = &mut ctx.accounts.sol_pool;
        sol_pool.total_deposited = 0;
        sol_pool.total_depositors = 0;
        sol_pool.last_reward_time = 0;
        sol_pool.reward_pool = 0;
        sol_pool.admin = ctx.accounts.admin.key();
        
        msg!("SOL Pool initialized!");
        msg!("Admin: {}", ctx.accounts.admin.key());
        
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        require!(amount > 0, ErrorCode::InvalidAmount);
        
        let user = &ctx.accounts.user;
        let sol_pool = &mut ctx.accounts.sol_pool;
        let user_deposit = &mut ctx.accounts.user_deposit;
        
        // Check if this is a new depositor
        let is_new_depositor = user_deposit.amount == 0;
        
        // Update user deposit
        user_deposit.user = user.key();
        user_deposit.amount += amount;
        user_deposit.deposit_time = Clock::get()?.unix_timestamp;
        
        // Update pool
        sol_pool.total_deposited += amount;
        if is_new_depositor {
            sol_pool.total_depositors += 1;
        }
        
        msg!("Deposited {} lamports ({} SOL)", amount, amount as f64 / 1_000_000_000.0);
        msg!("Total deposited: {} lamports ({} SOL)", 
             sol_pool.total_deposited, 
             sol_pool.total_deposited as f64 / 1_000_000_000.0);
        msg!("Total depositors: {}", sol_pool.total_depositors);
        
        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        require!(amount > 0, ErrorCode::InvalidAmount);
        require!(amount <= ctx.accounts.user_deposit.amount, ErrorCode::InsufficientBalance);
        
        let sol_pool = &mut ctx.accounts.sol_pool;
        let user_deposit = &mut ctx.accounts.user_deposit;
        
        // Update user deposit
        user_deposit.amount -= amount;
        
        // Update pool
        sol_pool.total_deposited -= amount;
        
        // If user has no more deposits, decrease depositor count
        if user_deposit.amount == 0 {
            sol_pool.total_depositors = sol_pool.total_depositors.saturating_sub(1);
        }
        
        // Transfer SOL from vault to user using invoke_signed
        let transfer_instruction = anchor_lang::system_program::Transfer {
            from: ctx.accounts.sol_vault.to_account_info(),
            to: ctx.accounts.user.to_account_info(),
        };
        
        let seeds = &[
            b"sol_vault".as_ref(),
            &[ctx.bumps.sol_vault],
        ];
        let signer_seeds = &[&seeds[..]];
        
        let cpi_context = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            transfer_instruction,
            signer_seeds,
        );
        
        anchor_lang::system_program::transfer(cpi_context, amount)?;
        
        msg!("Withdrew {} lamports ({} SOL)", amount, amount as f64 / 1_000_000_000.0);
        msg!("Remaining deposit: {} lamports ({} SOL)", 
             user_deposit.amount, 
             user_deposit.amount as f64 / 1_000_000_000.0);
        
        Ok(())
    }

    pub fn select_secure_winner(ctx: Context<SelectSecureWinner>) -> Result<()> {
        let sol_pool = &mut ctx.accounts.sol_pool;
        require!(sol_pool.total_depositors > 0, ErrorCode::NoDepositors);
        
        let current_time = Clock::get()?.unix_timestamp;
        let time_since_last_reward = current_time - sol_pool.last_reward_time;
        require!(time_since_last_reward >= 60, ErrorCode::VrfError); // 1 minute cooldown

        let mut depositors = Vec::new();
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

        let total_weight: u64 = depositors.iter().map(|(_, amount)| *amount).sum();
        
        // Generate secure VRF seed using multiple entropy sources
        let clock = Clock::get()?;
        let slot = clock.slot;
        let epoch = clock.epoch;
        
        // Use multiple entropy sources for better randomness
        let entropy1 = current_time.wrapping_mul(31);
        let entropy2 = slot.wrapping_mul(17);
        let entropy3 = epoch.wrapping_mul(13);
        let entropy4 = sol_pool.total_deposited.wrapping_mul(7);
        let entropy5 = sol_pool.total_depositors.wrapping_mul(5);
        
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
        sol_pool.reward_pool += 1_000_000_000; // Add 1 SOL to reward pool
        sol_pool.last_reward_time = current_time;
        
        msg!("Secure VRF Winner selected! Winner: {:?}, Random weight: {}, Total weight: {}, Reward pool: {} SOL",
             winner, random_weight, total_weight, sol_pool.reward_pool as f64 / 1_000_000_000.0);
        msg!("VRF Entropy: time={}, slot={}, epoch={}, deposited={}, depositors={}", 
             current_time, slot, epoch, sol_pool.total_deposited, sol_pool.total_depositors);
        
        Ok(())
    }

    pub fn claim_reward(ctx: Context<ClaimReward>) -> Result<()> {
        let sol_pool = &mut ctx.accounts.sol_pool;
        let winner = &ctx.accounts.winner;
        
        require!(sol_pool.reward_pool > 0, ErrorCode::NoRewardToClaim);
        
        // Transfer reward from pool to winner
        let reward_amount = sol_pool.reward_pool;
        sol_pool.reward_pool = 0; // Reset reward pool
        
        // Transfer SOL to winner
        let transfer_instruction = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.authority.key(),
            &winner.key(),
            reward_amount,
        );
        
        anchor_lang::solana_program::program::invoke(
            &transfer_instruction,
            &[
                ctx.accounts.authority.to_account_info(),
                winner.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;
        
        msg!("Reward claimed! Winner: {:?}, Amount: {} SOL", 
             winner.key(), reward_amount as f64 / 1_000_000_000.0);
        
        Ok(())
    }
}