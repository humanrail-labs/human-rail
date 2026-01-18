use anchor_lang::prelude::*;

pub mod error;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("GLrs6qS2LLwKXZZuZXLFCaVyxkjBovbS2hM9PA4ezdhQ");

#[program]
pub mod agent_registry {
    use super::*;

    /// Register a new agent owned by a principal (human or organization).
    /// The principal must have a valid HumanProfile in human_registry.
    pub fn register_agent(
        ctx: Context<RegisterAgent>,
        params: RegisterAgentParams,
    ) -> Result<()> {
        instructions::register_agent::handler(ctx, params)
    }

    /// Update agent metadata commitment (e.g., new code version, model update).
    pub fn update_agent_metadata(
        ctx: Context<UpdateAgentMetadata>,
        new_metadata_hash: [u8; 32],
    ) -> Result<()> {
        instructions::update_agent_metadata::handler(ctx, new_metadata_hash)
    }

    /// Rotate agent signing keys. Old key remains valid until rotation_grace_period expires.
    pub fn rotate_agent_key(
        ctx: Context<RotateAgentKey>,
        new_signing_key: Pubkey,
    ) -> Result<()> {
        instructions::rotate_agent_key::handler(ctx, new_signing_key)
    }

    /// Suspend an agent temporarily. Can be reactivated by principal.
    pub fn suspend_agent(ctx: Context<SuspendAgent>) -> Result<()> {
        instructions::suspend_agent::handler(ctx)
    }

    /// Reactivate a suspended agent.
    pub fn reactivate_agent(ctx: Context<ReactivateAgent>) -> Result<()> {
        instructions::reactivate_agent::handler(ctx)
    }

    /// Permanently revoke an agent. Cannot be undone.
    pub fn revoke_agent(ctx: Context<RevokeAgent>) -> Result<()> {
        instructions::revoke_agent::handler(ctx)
    }

    /// Verify an agent is active and valid. Designed for CPI calls.
    pub fn verify_agent(ctx: Context<VerifyAgent>) -> Result<()> {
        instructions::verify_agent::handler(ctx)
    }
}

/// Parameters for registering a new agent
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct RegisterAgentParams {
    /// Human-readable name for the agent (max 32 bytes)
    pub name: [u8; 32],
    /// Hash of agent metadata (code version, model/provider, policies)
    pub metadata_hash: [u8; 32],
    /// Agent's signing public key
    pub signing_key: Pubkey,
    /// Optional TEE measurement hash for hardware attestation
    pub tee_measurement: Option<[u8; 32]>,
    /// Unique nonce for PDA derivation
    pub nonce: u64,
}
