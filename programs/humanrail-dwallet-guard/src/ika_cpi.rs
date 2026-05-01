//! Ika CPI integration — updated to match the current devnet program format.
//!
//! Mirrors `ika-dwallet-anchor::DWalletContext::approve_message` from the
//! Ika repo (commit 3bd7945, post-April-14 2026 upgrade).
//!
//! New format (7 accounts, 100 bytes):
//!   [discriminator(1), bump(1), message_hash(32), message_metadata_hash(32),
//!    user_pubkey(32), signature_scheme(2)]
//!
//! Accounts:
//!   0. coordinator       (readonly)
//!   1. message_approval  (writable)
//!   2. dwallet           (readonly)
//!   3. caller_program    (readonly, executable)
//!   4. cpi_authority     (readonly, signer)
//!   5. payer             (writable, signer)
//!   6. system_program    (readonly)

use anchor_lang::prelude::*;
use anchor_lang::solana_program::instruction::AccountMeta;

/// Ika devnet program ID.
pub const IKA_PROGRAM_ID: Pubkey = pubkey!("87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY");

/// Seed for deriving the CPI authority PDA from a caller program.
pub const CPI_AUTHORITY_SEED: &[u8] = b"__ika_cpi_authority";

/// approve_message instruction discriminator.
const IX_APPROVE_MESSAGE: u8 = 8;

/// CPI context for invoking Ika dWallet instructions.
pub struct DWalletContext<'info> {
    /// The Ika dWallet program account.
    pub dwallet_program: AccountInfo<'info>,
    /// The CPI authority PDA (derived from caller program).
    pub cpi_authority: AccountInfo<'info>,
    /// The calling program account (must be executable).
    pub caller_program: AccountInfo<'info>,
    /// Bump seed for the CPI authority PDA.
    pub cpi_authority_bump: u8,
}

impl<'info> DWalletContext<'info> {
    /// Approve a message for signing via CPI using the current devnet format.
    ///
    /// Creates a MessageApproval PDA on behalf of the calling program.
    /// The dWallet's authority must be set to this program's CPI authority PDA.
    pub fn approve_message(
        &self,
        coordinator: &AccountInfo<'info>,
        message_approval: &AccountInfo<'info>,
        dwallet: &AccountInfo<'info>,
        payer: &AccountInfo<'info>,
        system_program: &AccountInfo<'info>,
        message_digest: [u8; 32],
        message_metadata_digest: [u8; 32],
        user_pubkey: [u8; 32],
        signature_scheme: u16,
        bump: u8,
    ) -> Result<()> {
        // Instruction data: [disc(1), bump(1), msg_digest(32), msg_meta_digest(32),
        //   user_pubkey(32), scheme(2)] = 100 bytes
        let mut ix_data = Vec::with_capacity(100);
        ix_data.push(IX_APPROVE_MESSAGE);
        ix_data.push(bump);
        ix_data.extend_from_slice(&message_digest);
        ix_data.extend_from_slice(&message_metadata_digest);
        ix_data.extend_from_slice(&user_pubkey);
        ix_data.extend_from_slice(&signature_scheme.to_le_bytes());

        let ix = anchor_lang::solana_program::instruction::Instruction {
            program_id: self.dwallet_program.key(),
            accounts: vec![
                AccountMeta::new_readonly(coordinator.key(), false),
                AccountMeta::new(message_approval.key(), false),
                AccountMeta::new_readonly(dwallet.key(), false),
                AccountMeta::new_readonly(self.caller_program.key(), false),
                AccountMeta::new_readonly(self.cpi_authority.key(), true),
                AccountMeta::new(payer.key(), true),
                AccountMeta::new_readonly(system_program.key(), false),
            ],
            data: ix_data,
        };

        let account_infos = &[
            coordinator.clone(),
            message_approval.clone(),
            dwallet.clone(),
            self.caller_program.clone(),
            self.cpi_authority.clone(),
            payer.clone(),
            system_program.clone(),
            self.dwallet_program.clone(),
        ];

        let seeds = &[CPI_AUTHORITY_SEED, &[self.cpi_authority_bump]];
        let signer_seeds = &[&seeds[..]];
        anchor_lang::solana_program::program::invoke_signed(&ix, account_infos, signer_seeds)?;
        Ok(())
    }

    /// Transfer dWallet authority via CPI.
    pub fn transfer_dwallet(
        &self,
        dwallet: &AccountInfo<'info>,
        new_authority: &Pubkey,
    ) -> Result<()> {
        let mut ix_data = Vec::with_capacity(33);
        ix_data.push(24); // IX_TRANSFER_OWNERSHIP
        ix_data.extend_from_slice(new_authority.as_ref());

        let ix = anchor_lang::solana_program::instruction::Instruction {
            program_id: self.dwallet_program.key(),
            accounts: vec![
                AccountMeta::new_readonly(self.caller_program.key(), false),
                AccountMeta::new_readonly(self.cpi_authority.key(), true),
                AccountMeta::new(dwallet.key(), false),
            ],
            data: ix_data,
        };

        let account_infos = &[
            self.caller_program.clone(),
            self.cpi_authority.clone(),
            dwallet.clone(),
            self.dwallet_program.clone(),
        ];

        let seeds = &[CPI_AUTHORITY_SEED, &[self.cpi_authority_bump]];
        let signer_seeds = &[&seeds[..]];
        anchor_lang::solana_program::program::invoke_signed(&ix, account_infos, signer_seeds)?;
        Ok(())
    }
}
