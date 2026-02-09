use anchor_lang::prelude::*;

use crate::state_v2::{HumanProfile, IssuerType};

// =============================================================================
// ATTESTATION INDEX - Pagination-Ready Design
// =============================================================================

/// Maximum attestation references in the index before requiring pagination
pub const INDEX_PAGE_SIZE: usize = 16;

/// Maximum total pages per profile (16 * 16 = 256 attestations max)
pub const MAX_INDEX_PAGES: u8 = 16;

/// Lightweight attestation pointer stored in index pages
/// Full attestation data lives in separate PDAs
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq, Default)]
pub struct AttestationPointer {
    /// Attestation account pubkey
    pub attestation: Pubkey,
    /// Quick-access fields for scoring without loading full attestation
    pub weight: u16,
    pub expires_at: i64,
    pub issuer_type: IssuerType,
    /// Whether this slot is active (false = tombstone, can be reused)
    pub is_active: bool,
}

impl AttestationPointer {
    pub const LEN: usize = 32 + 2 + 8 + 1 + 1;

    pub fn is_valid(&self, current_time: i64) -> bool {
        self.is_active && (self.expires_at == 0 || current_time < self.expires_at)
    }

    pub fn effective_weight(&self, current_time: i64) -> u16 {
        if self.is_valid(current_time) {
            self.weight
        } else {
            0
        }
    }
}

/// Attestation index page - one profile can have multiple pages
#[account]
pub struct AttestationIndexPage {
    /// The profile this page belongs to
    pub profile: Pubkey,
    /// Page number (0-indexed)
    pub page_number: u8,
    /// Number of active attestations in this page
    pub active_count: u8,
    /// Attestation pointers
    pub attestations: [AttestationPointer; INDEX_PAGE_SIZE],
    /// Cached score contribution from this page
    pub cached_score: u16,
    /// When cache was last updated
    pub cache_updated_at: i64,
    /// PDA bump
    pub bump: u8,
}

impl AttestationIndexPage {
    pub const LEN: usize = 8 + // discriminator
        32 + // profile
        1 +  // page_number
        1 +  // active_count
        (INDEX_PAGE_SIZE * AttestationPointer::LEN) + // attestations
        2 +  // cached_score
        8 +  // cache_updated_at
        1; // bump

    /// Find first empty slot (inactive pointer)
    pub fn find_empty_slot(&self) -> Option<usize> {
        self.attestations.iter().position(|p| !p.is_active)
    }

    /// Add attestation pointer, returns index if successful
    pub fn add_pointer(&mut self, pointer: AttestationPointer) -> Option<usize> {
        if let Some(idx) = self.find_empty_slot() {
            self.attestations[idx] = pointer;
            self.active_count = self.active_count.saturating_add(1);
            Some(idx)
        } else {
            None
        }
    }

    /// Remove attestation pointer by pubkey
    pub fn remove_pointer(&mut self, attestation: &Pubkey) -> bool {
        for pointer in self.attestations.iter_mut() {
            if pointer.attestation == *attestation && pointer.is_active {
                pointer.is_active = false;
                self.active_count = self.active_count.saturating_sub(1);
                return true;
            }
        }
        false
    }

    /// Recompute cached score from valid attestations
    pub fn recompute_cache(&mut self, current_time: i64) {
        let mut score: u16 = 0;
        for pointer in &self.attestations {
            score = score.saturating_add(pointer.effective_weight(current_time));
        }
        self.cached_score = score;
        self.cache_updated_at = current_time;
    }

    /// Check if page is full
    pub fn is_full(&self) -> bool {
        self.active_count as usize >= INDEX_PAGE_SIZE
    }
}

/// Profile attestation metadata - tracks pagination info
#[account]
pub struct ProfileAttestationMeta {
    /// The profile this metadata belongs to
    pub profile: Pubkey,
    /// Total number of index pages allocated
    pub page_count: u8,
    /// Total active attestations across all pages
    pub total_active: u32,
    /// Total attestations ever issued (for historical tracking)
    pub total_issued: u32,
    /// Aggregated human score (sum of all page caches)
    pub aggregated_score: u16,
    /// Whether profile has uniqueness-qualifying attestation
    pub has_uniqueness_attestation: bool,
    /// When aggregated score was last computed
    pub score_computed_at: i64,
    /// PDA bump
    pub bump: u8,
}

impl ProfileAttestationMeta {
    pub const LEN: usize = 8 + // discriminator
        32 + // profile
        1 +  // page_count
        4 +  // total_active
        4 +  // total_issued
        2 +  // aggregated_score
        1 +  // has_uniqueness_attestation
        8 +  // score_computed_at
        1; // bump

    /// Check if can add more pages
    pub fn can_add_page(&self) -> bool {
        self.page_count < MAX_INDEX_PAGES
    }
}

// =============================================================================
// INSTRUCTIONS
// =============================================================================

/// Initialize attestation index for a profile
pub fn initialize_index(ctx: Context<InitializeAttestationIndex>) -> Result<()> {
    let meta = &mut ctx.accounts.meta;
    meta.profile = ctx.accounts.profile.key();
    meta.page_count = 1; // Start with one page
    meta.total_active = 0;
    meta.total_issued = 0;
    meta.aggregated_score = 0;
    meta.has_uniqueness_attestation = false;
    meta.score_computed_at = Clock::get()?.unix_timestamp;
    meta.bump = ctx.bumps.meta;

    // Initialize first page
    let page = &mut ctx.accounts.first_page;
    page.profile = ctx.accounts.profile.key();
    page.page_number = 0;
    page.active_count = 0;
    page.attestations = [AttestationPointer {
        attestation: Pubkey::default(),
        weight: 0,
        expires_at: 0,
        issuer_type: IssuerType::Custom,
        is_active: false,
    }; INDEX_PAGE_SIZE];
    page.cached_score = 0;
    page.cache_updated_at = Clock::get()?.unix_timestamp;
    page.bump = ctx.bumps.first_page;

    Ok(())
}

/// Allocate additional index page when current pages are full
pub fn allocate_page(ctx: Context<AllocateIndexPage>) -> Result<()> {
    let meta = &mut ctx.accounts.meta;

    require!(meta.can_add_page(), IndexError::MaxPagesReached);

    let new_page = &mut ctx.accounts.new_page;
    new_page.profile = ctx.accounts.profile.key();
    new_page.page_number = meta.page_count;
    new_page.active_count = 0;
    new_page.attestations = [AttestationPointer {
        attestation: Pubkey::default(),
        weight: 0,
        expires_at: 0,
        issuer_type: IssuerType::Custom,
        is_active: false,
    }; INDEX_PAGE_SIZE];
    new_page.cached_score = 0;
    new_page.cache_updated_at = Clock::get()?.unix_timestamp;
    new_page.bump = ctx.bumps.new_page;

    meta.page_count = meta.page_count.saturating_add(1);

    Ok(())
}

/// Recompute aggregated score across all pages
/// Should be called periodically or after attestation changes
pub fn recompute_aggregated_score(ctx: Context<RecomputeScore>) -> Result<()> {
    let clock = Clock::get()?;
    let meta = &mut ctx.accounts.meta;

    // Score will be accumulated from remaining_accounts (all pages)
    let mut total_score: u16 = 0;
    let mut has_pop = false;

    for account in ctx.remaining_accounts.iter() {
        // Deserialize each page
        let page_data = account.try_borrow_data()?;
        if page_data.len() >= AttestationIndexPage::LEN {
            // Skip discriminator and parse
            let page: AttestationIndexPage = AnchorDeserialize::deserialize(&mut &page_data[8..])?;

            // Verify page belongs to this profile
            if page.profile == meta.profile {
                for pointer in &page.attestations {
                    let weight = pointer.effective_weight(clock.unix_timestamp);
                    total_score = total_score.saturating_add(weight);

                    if weight > 0 && pointer.issuer_type == IssuerType::ProofOfPersonhood {
                        has_pop = true;
                    }
                }
            }
        }
    }

    meta.aggregated_score = total_score;
    meta.has_uniqueness_attestation = has_pop;
    meta.score_computed_at = clock.unix_timestamp;

    Ok(())
}

#[derive(Accounts)]
pub struct InitializeAttestationIndex<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// C-09 FIX: Profile must be valid HumanProfile PDA
    #[account(
        seeds = [b"human_profile", profile.wallet.as_ref()],
        bump = profile.bump
    )]
    pub profile: Account<'info, HumanProfile>,
    #[account(
        init,
        payer = payer,
        space = ProfileAttestationMeta::LEN,
        seeds = [b"attestation_meta", profile.key().as_ref()],
        bump
    )]
    pub meta: Account<'info, ProfileAttestationMeta>,

    #[account(
        init,
        payer = payer,
        space = AttestationIndexPage::LEN,
        seeds = [b"attestation_page", profile.key().as_ref(), &[0u8]],
        bump
    )]
    pub first_page: Account<'info, AttestationIndexPage>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AllocateIndexPage<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// C-09 FIX: Profile must be valid HumanProfile PDA
    #[account(
        seeds = [b"human_profile", profile.wallet.as_ref()],
        bump = profile.bump
    )]
    pub profile: Account<'info, HumanProfile>,

    #[account(
        mut,
        seeds = [b"attestation_meta", profile.key().as_ref()],
        bump = meta.bump
    )]
    pub meta: Account<'info, ProfileAttestationMeta>,

    #[account(
        init,
        payer = payer,
        space = AttestationIndexPage::LEN,
        seeds = [b"attestation_page", profile.key().as_ref(), &[meta.page_count]],
        bump
    )]
    pub new_page: Account<'info, AttestationIndexPage>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RecomputeScore<'info> {
    /// C-09 FIX: Profile must be valid HumanProfile PDA
    #[account(
        seeds = [b"human_profile", profile.wallet.as_ref()],
        bump = profile.bump
    )]
    pub profile: Account<'info, HumanProfile>,

    #[account(
        mut,
        seeds = [b"attestation_meta", profile.key().as_ref()],
        bump = meta.bump
    )]
    pub meta: Account<'info, ProfileAttestationMeta>,
    // Remaining accounts: all AttestationIndexPage accounts for this profile
}

#[error_code]
pub enum IndexError {
    #[msg("Maximum attestation pages reached")]
    MaxPagesReached,

    #[msg("No empty slots in page")]
    PageFull,

    #[msg("Attestation not found in index")]
    AttestationNotFound,
}
