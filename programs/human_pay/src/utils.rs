use anchor_lang::prelude::*;
use anchor_spl::token_2022::{self, TransferChecked};

/// Execute a Token 2022 transfer.
/// This is structured to be swapped with confidential transfer once integrated.
///
/// In production, this would use the Confidential Transfer extension:
/// - Encrypt amounts using ElGamal
/// - Generate zero-knowledge proofs
/// - Execute confidential transfer instruction
///
/// Current implementation uses standard TransferChecked for development.
pub fn execute_transfer<'info>(
    from: AccountInfo<'info>,
    to: AccountInfo<'info>,
    mint: AccountInfo<'info>,
    authority: AccountInfo<'info>,
    token_program: AccountInfo<'info>,
    amount: u64,
    decimals: u8,
    signer_seeds: Option<&[&[&[u8]]]>,
) -> Result<()> {
    let cpi_accounts = TransferChecked {
        from,
        to,
        mint,
        authority,
    };

    let cpi_ctx = if let Some(seeds) = signer_seeds {
        CpiContext::new_with_signer(token_program, cpi_accounts, seeds)
    } else {
        CpiContext::new(token_program, cpi_accounts)
    };

    token_2022::transfer_checked(cpi_ctx, amount, decimals)?;

    Ok(())
}

/// Placeholder for confidential transfer execution.
/// This would integrate with Token 2022 Confidential Transfer extension.
///
/// The confidential transfer flow would be:
/// 1. Encrypt the transfer amount for both sender and recipient
/// 2. Generate range proofs to prove amount is valid
/// 3. Generate equality proofs to prove encrypted amounts match
/// 4. Execute the confidential transfer instruction
#[allow(dead_code)]
pub fn execute_confidential_transfer<'info>(
    _from: AccountInfo<'info>,
    _to: AccountInfo<'info>,
    _mint: AccountInfo<'info>,
    _authority: AccountInfo<'info>,
    _token_program: AccountInfo<'info>,
    _amount: u64,
    _signer_seeds: Option<&[&[&[u8]]]>,
) -> Result<()> {
    // TODO: Implement when Confidential Transfer extension is integrated
    //
    // Steps required:
    // 1. Get ElGamal public keys for both accounts
    // 2. Encrypt amount using recipient's public key
    // 3. Generate range proof for amount
    // 4. Generate ciphertext validity proof
    // 5. Call ConfidentialTransfer::Transfer instruction

    msg!("Confidential transfer not yet implemented - using standard transfer");
    Err(crate::error::HumanPayError::ConfidentialTransferNotEnabled.into())
}

/// Generate invoice PDA seeds
pub fn get_invoice_seeds<'a>(
    merchant: &'a Pubkey,
    mint: &'a Pubkey,
    created_at: &'a [u8; 8],
) -> [&'a [u8]; 4] {
    [b"invoice", merchant.as_ref(), mint.as_ref(), created_at]
}

/// Generate vault PDA seeds
pub fn get_vault_seeds<'a>(invoice: &'a Pubkey) -> [&'a [u8]; 2] {
    [b"vault", invoice.as_ref()]
}

/// Check if invoice has expired
pub fn is_expired(expires_at: i64, current_time: i64) -> bool {
    expires_at != 0 && current_time > expires_at
}
