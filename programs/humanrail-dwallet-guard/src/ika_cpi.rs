use anchor_lang::prelude::*;
use anchor_lang::solana_program::{instruction::Instruction, program::invoke_signed};

/// Ika devnet program ID.
/// https://pre-alpha-dev-1.ika.ika-network.net:443
pub const IKA_PROGRAM_ID: Pubkey = pubkey!("87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY");

/// CPI into Ika's `approve_message` instruction.
///
/// ⚠️  PLACEHOLDER IMPLEMENTATION ⚠️
/// This uses a hand-rolled instruction layout because the official
/// `ika-dwallet-*` crate is not available in this workspace yet.
///
/// When the crate is added, replace this function with the crate's
/// `DWalletContext::approve_message` CPI helper.
///
/// See docs/IKA_TECHNICAL_NOTES.md for the documented account layout
/// and why hand-rolled bytes are discouraged for production.
///
/// Expected accounts (pre-alpha, subject to change):
/// 1. dWallet                (writable)
/// 2. message_approval       (writable — created by Ika inside CPI)
/// 3. cpi_authority          (signer — PDA of this program)
/// 4. ika_config             (readonly)
/// 5. ika_coordinator        (readonly)
/// 6. system_program         (readonly)
pub fn approve_message<'a>(
    dwallet: &AccountInfo<'a>,
    message_approval: &AccountInfo<'a>,
    cpi_authority: &AccountInfo<'a>,
    ika_config: &AccountInfo<'a>,
    ika_coordinator: &AccountInfo<'a>,
    system_program: &AccountInfo<'a>,
    message_digest: [u8; 32],
    signature_scheme: u16,
    message_metadata_digest: [u8; 32],
    cpi_authority_seeds: &[&[&[u8]]],
) -> Result<()> {
    // Anchor-style discriminator for "global:approve_message".
    // If Ika does not use Anchor, this discriminator will be wrong
    // and the CPI will fail. This is expected for a skeleton.
    let discriminator = &anchor_lang::solana_program::hash::hash(b"global:approve_message")
        .to_bytes()[..8];

    let mut data = Vec::with_capacity(8 + 32 + 2 + 32);
    data.extend_from_slice(discriminator);
    data.extend_from_slice(&message_digest);
    data.extend_from_slice(&signature_scheme.to_le_bytes());
    data.extend_from_slice(&message_metadata_digest);

    let accounts = vec![
        AccountMeta::new(*dwallet.key, false),
        AccountMeta::new(*message_approval.key, false),
        AccountMeta::new_readonly(*cpi_authority.key, true),
        AccountMeta::new_readonly(*ika_config.key, false),
        AccountMeta::new_readonly(*ika_coordinator.key, false),
        AccountMeta::new_readonly(*system_program.key, false),
    ];

    let ix = Instruction {
        program_id: IKA_PROGRAM_ID,
        accounts,
        data,
    };

    invoke_signed(
        &ix,
        &[
            dwallet.clone(),
            message_approval.clone(),
            cpi_authority.clone(),
            ika_config.clone(),
            ika_coordinator.clone(),
            system_program.clone(),
        ],
        cpi_authority_seeds,
    )
    .map_err(|e| {
        msg!("Ika approve_message CPI failed: {:?}", e);
        error!(crate::error::GuardError::IkaCpiFailed)
    })
}
