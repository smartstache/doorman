use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, TokenAccount, Transfer, SetAuthority};
use spl_token::instruction::AuthorityType;
use std::ops::DerefMut;

declare_id!("D8bTW1sgKaSki1TBUwxarPySLp3TNVgB2bwRVbbTLYeV");

use {
    anchor_lang::{
        solana_program::system_program, AnchorDeserialize, AnchorSerialize,
        Key,
    },
};

const PREFIX: &str = "doorman";

// max whitelist size
const MAX_LEN: usize = 500;


#[program]
pub mod doorman {
    use super::*;

    use anchor_lang::solana_program::{
        program::{invoke},
        system_instruction,
    };

    pub fn initialize(ctx: Context<Initialize>,
                      _mint_token_vault_bump: u8,                           // for whatever reason the bump needed to be first, otherwise it complains about seed
                      num_tokens: u64,
                      cost_in_lamports: u64,
                      go_live_date: i64) -> ProgramResult {
        let config_account = &mut ctx.accounts.config;
        config_account.treasury = *ctx.accounts.treasury.key;
        config_account.cost_in_lamports = cost_in_lamports;
        config_account.mint_token_vault = *ctx.accounts.mint_token_vault.to_account_info().key;
        config_account.authority = *ctx.accounts.authority.key;
        config_account.whitelist = ctx.accounts.whitelist.key();
        config_account.go_live_date = go_live_date;
        config_account.mint = *ctx.accounts.mint.to_account_info().key;
        config_account.mint_token_vault_bump = _mint_token_vault_bump;
        config_account.counter = 0;
        config_account.whitelist_on = true;

        // first: init the whitelist data account
        let mut whitelist = ctx.accounts.whitelist.load_init()?;
        let data = whitelist.deref_mut();
        data.addresses = [Pubkey::default(); MAX_LEN];

        msg!("token account owner: {}", ctx.accounts.mint_token_vault.owner);

        // set pda authority
        let (mint_token_vault_authority, _mint_token_vault_authority_bump) =
            Pubkey::find_program_address(&[PREFIX.as_bytes()], ctx.program_id);

        token::set_authority(
            ctx.accounts.into_set_authority_context(),
            AuthorityType::AccountOwner,
            Some(mint_token_vault_authority),
        )?;

        msg!("mint token vault owner: {}", ctx.accounts.mint_token_vault.owner);

        // Transfer mint token from user to vault
        token::transfer(
            ctx.accounts.into_transfer_to_pda_context(),
            num_tokens
        )?;

        Ok(())
    }

    pub fn add_mint_tokens(ctx: Context<AddMintTokens>, num_tokens: u64) -> ProgramResult {

        // Transfer mint token from user to vault
        token::transfer(
            ctx.accounts.into_transfer_to_pda_context(),
            num_tokens
        )?;

        Ok(())
    }

    pub fn add_whitelist_addresses(
        ctx: Context<AddWhitelistAddresses>,
        addresses: Vec<Pubkey>,
    ) -> ProgramResult {
        let config = &mut ctx.accounts.config;
        let mut whitelist = ctx.accounts.whitelist.load_mut()?;

        if !config.whitelist.eq(&ctx.accounts.whitelist.key()) {
            msg!("wrong whitelist: {}", &ctx.accounts.whitelist.key());
            return Err(ErrorCode::WrongWhitelist.into());
        }

        let length = addresses.len();
        let counter = config.counter as usize;

        // Check that new addresses don't exceed remaining space
        if length + counter > MAX_LEN {
            return Err(ErrorCode::NotEnoughSpace.into());
        }

        msg!("counter: {}", counter);
        for i in 0..length {
            whitelist.addresses[counter + i] = addresses[i];
        }
        config.counter = counter as u16 + addresses.len() as u16;
        msg!("new counter: {}", config.counter);

        Ok(())
    }

    pub fn reset_whitelist_counter(ctx: Context<ResetWhitelistCounter>) -> ProgramResult {
        let config_account = &mut ctx.accounts.config;
        config_account.counter = 0;
        Ok(())
    }

    /*
    pub fn initialize(ctx: Context<Initialize>,
                      _mint_token_vault_bump: u8,                           // for whatever reason the bump needed to be first, otherwise it complains about seed
                      num_tokens: u64,
                      cost_in_lamports: u64,
                      go_live_date: i64) -> ProgramResult {

        let config_account = &mut ctx.accounts.config;
        config_account.treasury = *ctx.accounts.treasury.key;
        config_account.cost_in_lamports = cost_in_lamports;
        config_account.mint_token_vault = *ctx.accounts.mint_token_vault.to_account_info().key;
        config_account.authority = *ctx.accounts.authority.key;
        config_account.go_live_date = go_live_date;
        config_account.mint = *ctx.accounts.mint.to_account_info().key;
        config_account.mint_token_vault_bump = _mint_token_vault_bump;

        msg!("token account owner: {}", ctx.accounts.mint_token_vault.owner);

        // set pda authority
        let (mint_token_vault_authority, _mint_token_vault_authority_bump) =
            Pubkey::find_program_address(&[PREFIX.as_bytes()], ctx.program_id);

        token::set_authority(
            ctx.accounts.into_set_authority_context(),
            AuthorityType::AccountOwner,
            Some(mint_token_vault_authority),
        )?;

        msg!("mint token vault owner: {}", ctx.accounts.mint_token_vault.owner);

        // Transfer mint token from user to vault
        token::transfer(
            ctx.accounts.into_transfer_to_pda_context(),
            num_tokens
        )?;

        Ok(())
    }

     */

    pub fn update_config(ctx: Context<UpdateConfig>,
                         cost_in_lamports: Option<u64>,
                         go_live_date: Option<i64>,
                         on: Option<bool>) -> ProgramResult {
        let config_account = &mut ctx.accounts.config;

        if let Some(price) = cost_in_lamports {
            msg!("setting new price: {}", price);
            config_account.cost_in_lamports = price;
        }
        if let Some(date) = go_live_date {
            msg!("setting new go live date: {}", date);
            config_account.go_live_date = date;
        }
        if let Some(whitelist_on) = on {
            msg!("setting whitelist to: {}", whitelist_on);
            config_account.whitelist_on = whitelist_on;
        }
        Ok(())
    }


    // user sends sol for a mint token
    pub fn purchase_mint_token(ctx: Context<PurchaseMintToken>, whitelist_address_index: u16) -> ProgramResult {

        let config = &mut ctx.accounts.config;
        let clock = &ctx.accounts.clock;

        // check that we're live
        if clock.unix_timestamp < config.go_live_date {
            return Err(ErrorCode::DoormanNotLiveYet.into());
        }

        // check that the payer can pay for this
        if ctx.accounts.payer.lamports() < config.cost_in_lamports {
            return Err(ErrorCode::NotEnoughSOL.into());
        }

        // check we've got enough mint tokens
        if ctx.accounts.mint_token_vault.amount == 0 {
            return Err(ErrorCode::NotEnoughMintTokens.into());
        }

        // make sure the proper treasury was passed in - move to the attribute/annotation
        if ctx.accounts.treasury.key != &config.treasury {
            return Err(ErrorCode::WrongTreasury.into());
        }

        // check if we need to check the whitelist
        if config.whitelist_on {

            // make sure proper whitelist was passed in
            if !config.whitelist.eq(&ctx.accounts.whitelist.key()) {
                msg!("wrong whitelist: {}", &ctx.accounts.whitelist.key());
                return Err(ErrorCode::WrongWhitelist.into());
            }

            let i = whitelist_address_index as usize;

            // make sure the index is in range
            if i >= MAX_LEN - 1 || i > config.counter as usize {
                return Err(ErrorCode::WhitelistAddressIndexOutOfRange.into());
            }

            // check if the key at the given index matches
            let payer_key = ctx.accounts.payer.key;
            let mut whitelist = ctx.accounts.whitelist.load_mut()?;

            // if this address is found on the whitelist at the given index, remove it
            if payer_key.eq(&whitelist.addresses[i].key()) {
                msg!("whitelist address key matches!");
                whitelist.addresses[i] = Pubkey::default();
            } else {
                return Err(ErrorCode::WhitelistAddressNotFound.into());
            }

        }

        // now on to the actual purchase
        if *ctx.accounts.mint_token_vault.to_account_info().key != config.mint_token_vault  {
            return Err(ErrorCode::WrongTokenVault.into());
        }

        // transfer sol to treasury
        invoke(
            &system_instruction::transfer(
                ctx.accounts.payer.key,
                &config.treasury,
                config.cost_in_lamports,
            ),
            &[
                ctx.accounts.payer.clone(),
                ctx.accounts.treasury.clone(),
                ctx.accounts.system_program.clone(),
            ],
        )?;

        // transfer a mint token from the vault to the payer
        let (_mint_token_vault_authority, _mint_token_vault_authority_bump) =
            Pubkey::find_program_address(&[PREFIX.as_bytes()], ctx.program_id);
        let authority_seeds = &[PREFIX.as_bytes(), &[_mint_token_vault_authority_bump]];

        token::transfer(
            ctx.accounts
                .into_transfer_to_payer_context()
                .with_signer(&[&authority_seeds[..]]),
            1,
        )?;

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(mint_token_vault_bump: u8)]
pub struct Initialize<'info> {
    #[account(
    init,
    payer = authority,
    )]
    config: ProgramAccount<'info, Config>,
    #[account(mut, signer)]
    authority: AccountInfo<'info>,
    #[account(zero)]
    whitelist: AccountLoader<'info, Whitelist>,
    treasury: AccountInfo<'info>,
    mint: Account<'info, Mint>,                                      // mint for the token used to hit the candy machine
    system_program: Program<'info, System>,
    rent: Sysvar<'info, Rent>,
    #[account(executable, "token_program.key == &token::ID")]
    token_program: AccountInfo<'info>,
    #[account(mut, "authority_mint_account.owner == *authority.key")]
    authority_mint_account: Account<'info, TokenAccount>,
    #[account(
    init,
    seeds = [PREFIX.as_bytes(), mint.key().as_ref()],
    bump = mint_token_vault_bump,
    payer = authority,
    token::mint = mint,
    token::authority = authority
    )]
    mint_token_vault: Account<'info, TokenAccount>,
}

// from the excellent escrow tutorial: https://hackmd.io/@ironaddicteddog/anchor_example_escrow
impl<'info> Initialize<'info> {
    fn into_transfer_to_pda_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        let cpi_accounts = Transfer {
            from: self.authority_mint_account.to_account_info().clone(),
            to: self.mint_token_vault.to_account_info().clone(),
            authority: self.authority.clone(),
        };
        CpiContext::new(self.token_program.clone(), cpi_accounts)
    }

    fn into_set_authority_context(&self) -> CpiContext<'_, '_, '_, 'info, SetAuthority<'info>> {
        let cpi_accounts = SetAuthority {
            account_or_mint: self.mint_token_vault.to_account_info().clone(),
            current_authority: self.authority.clone(),
        };
        CpiContext::new(self.token_program.clone(), cpi_accounts)
    }
}


#[derive(Accounts)]
#[instruction(mint_token_vault_bump: u8)]
pub struct AddMintTokens<'info> {
    #[account(mut, signer)]
    authority: AccountInfo<'info>,
    mint: Account<'info, Mint>,                                      // mint for the token used to hit the candy machine
    // system_program: Program<'info, System>,

    // rent: Sysvar<'info, Rent>,

    #[account(executable, "token_program.key == &token::ID")]
    token_program: AccountInfo<'info>,

    #[account(mut, "authority_mint_account.owner == *authority.key")]
    authority_mint_account: Account<'info, TokenAccount>,
    #[account(mut)]
    mint_token_vault: Account<'info, TokenAccount>,
}

impl<'info> AddMintTokens<'info> {

    fn into_transfer_to_pda_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        let cpi_accounts = Transfer {
            from: self.authority_mint_account.to_account_info().clone(),
            to: self.mint_token_vault.to_account_info().clone(),
            authority: self.authority.clone(),
        };
        CpiContext::new(self.token_program.clone(), cpi_accounts)
    }
}


#[derive(Accounts)]
pub struct AddWhitelistAddresses<'info> {
    #[account(mut, has_one = authority)]
    config: ProgramAccount<'info, Config>,
    #[account(mut)]
    whitelist: AccountLoader<'info, Whitelist>,
    authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct ResetWhitelistCounter<'info> {
    #[account(mut, has_one = authority)]
    config: ProgramAccount<'info, Config>,
    authority: Signer<'info>,
}

#[account(zero_copy)]
pub struct Whitelist {
    addresses: [Pubkey; 500],        // note: this has to be set to a literal like this. can't be set to MAX_LEN constant
}

#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    #[account(mut, has_one = authority)]
    config: ProgramAccount<'info, Config>,
    authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct PurchaseMintToken<'info> {

    #[account(mut)]
    config: ProgramAccount<'info, Config>,
    #[account(mut, signer)]
    payer: AccountInfo<'info>,
    #[account(mut)]
    whitelist: AccountLoader<'info, Whitelist>,
    #[account(address = system_program::ID)]
    system_program: AccountInfo<'info>,
    #[account(mut)]
    treasury: AccountInfo<'info>,
    #[account(mut)]
    mint_token_vault: Account<'info, TokenAccount>,
    mint_token_vault_authority: AccountInfo<'info>,
    clock: Sysvar<'info, Clock>,

    #[account(mut, "payer_mint_account.owner == *payer.key")]
    payer_mint_account: Account<'info, TokenAccount>,

    #[account(executable, "token_program.key == &token::ID")]
    token_program: AccountInfo<'info>,
}

impl<'info> PurchaseMintToken<'info> {

    fn into_transfer_to_payer_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        let cpi_accounts = Transfer {
            from: self.mint_token_vault.to_account_info().clone(),
            to: self.payer_mint_account.to_account_info().clone(),
            authority: self.mint_token_vault_authority.clone(),
        };
        CpiContext::new(self.token_program.clone(), cpi_accounts)
    }

}

#[account]
#[derive(Default)]
pub struct Config {
    whitelist_on: bool,
    cost_in_lamports: u64,            // the cost for a mint token
    go_live_date: i64,
    authority: Pubkey,
    whitelist: Pubkey,
    treasury: Pubkey,                   // the account to send the sol to
    mint: Pubkey,
    mint_token_vault: Pubkey,
    mint_token_vault_bump: u8,
    counter: u16,                       // keep track of list size
}

#[error]
pub enum ErrorCode {
    #[msg("Not enough SOL to pay for the mint token")]
    NotEnoughSOL,
    #[msg("Wrong treasury")]
    WrongTreasury,
    #[msg("Wrong token vault")]
    WrongTokenVault,
    #[msg("No mint tokens left")]
    NotEnoughMintTokens,
    #[msg("Doorman not live yet")]
    DoormanNotLiveYet,
    #[msg("Not enough space left in whitelist!")]
    NotEnoughSpace,
    #[msg("Wrong whitelist")]
    WrongWhitelist,
    #[msg("Whitelist address index out of range")]
    WhitelistAddressIndexOutOfRange,
    #[msg("Whitelisted address not found at given index")]
    WhitelistAddressNotFound

}



