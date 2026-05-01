// Copyright (c) dWallet Labs, Ltd. / HumanRail Labs
// SPDX-License-Identifier: BSD-3-Clause-Clear
//
// Ika dWallet DKG CLI — HumanRail Phase 5B
//
// Creates a real Ika dWallet on Solana devnet via gRPC DKG.
// Based on official Ika pre-alpha examples:
//   - chains/solana/examples/voting/e2e-rust/src/main.rs
//   - chains/solana/examples/multisig/e2e-rust/src/main.rs
//   - chains/solana/examples/protocols-e2e/src/main.rs
//
// Pre-alpha disclaimer: Ika uses a single mock signer, not real MPC.
// All data is subject to periodic wipes. Not production custody.

use std::path::PathBuf;
use std::time::Duration;

use anyhow::{Context, Result};
use clap::{Parser, Subcommand, ValueEnum};
use solana_rpc_client::rpc_client::RpcClient;
use solana_sdk::commitment_config::CommitmentConfig;
use solana_sdk::signature::Keypair;
use solana_sdk::signer::Signer;
use tokio;

mod config;
mod dkg;
mod output;

use config::CliConfig;
use dkg::create_dwallet_via_dkg;
// DwalletArtifact is used via dkg::create_dwallet_via_dkg return type

/// Ika dWallet DKG CLI — HumanRail Phase 5B
#[derive(Parser)]
#[command(name = "ika-dkg-cli")]
#[command(about = "Create real Ika dWallets on Solana devnet via gRPC DKG")]
#[command(version = "0.1.0")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Create a new dWallet via DKG
    CreateDwallet {
        /// Cryptographic curve
        #[arg(long, value_enum, default_value = "secp256k1")]
        curve: CurveArg,

        /// Path to Solana keypair JSON file
        #[arg(long, default_value = "~/.config/solana/id.json")]
        keypair: PathBuf,

        /// Solana RPC URL
        #[arg(long, default_value = "https://api.devnet.solana.com")]
        rpc_url: String,

        /// Ika gRPC endpoint
        #[arg(long, default_value = "https://pre-alpha-dev-1.ika.ika-network.net:443")]
        grpc_url: String,

        /// Output JSON file path
        #[arg(long, default_value = ".local-ika/dwallet.json")]
        output: PathBuf,

        /// Timeout in seconds for polling on-chain dWallet
        #[arg(long, default_value = "300")]
        poll_timeout_secs: u64,

        /// Skip on-chain polling and write artifact immediately after DKG attestation
        #[arg(long)]
        skip_poll: bool,
    },
}

#[derive(Clone, Copy, Debug, ValueEnum)]
enum CurveArg {
    Secp256k1,
    Secp256r1,
    Curve25519,
    Ristretto,
}

impl CurveArg {
    fn to_ika_curve(self) -> ika_dwallet_types::DWalletCurve {
        use ika_dwallet_types::DWalletCurve;
        match self {
            CurveArg::Secp256k1 => DWalletCurve::Secp256k1,
            CurveArg::Secp256r1 => DWalletCurve::Secp256r1,
            CurveArg::Curve25519 => DWalletCurve::Curve25519,
            CurveArg::Ristretto => DWalletCurve::Ristretto,
        }
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Commands::CreateDwallet {
            curve,
            keypair,
            rpc_url,
            grpc_url,
            output,
            poll_timeout_secs,
            skip_poll,
        } => {
            let config = CliConfig {
                curve: curve.to_ika_curve(),
                keypair_path: expand_tilde(&keypair),
                rpc_url,
                grpc_url,
                output_path: expand_tilde(&output),
                poll_timeout: Duration::from_secs(poll_timeout_secs),
                skip_poll,
            };
            run_create_dwallet(config).await
        }
    }
}

async fn run_create_dwallet(config: CliConfig) -> Result<()> {
    println!("═══════════════════════════════════════════════════════════");
    println!("  Ika dWallet DKG CLI — HumanRail Phase 5B");
    println!("═══════════════════════════════════════════════════════════");
    println!();

    // 1. Load keypair
    let payer = load_keypair(&config.keypair_path)
        .with_context(|| format!("Failed to load keypair from {:?}", config.keypair_path))?;
    println!("Deployer / Payer: {}", payer.pubkey());
    println!();

    // 2. Connect to Solana
    let solana_client =
        RpcClient::new_with_commitment(&config.rpc_url, CommitmentConfig::confirmed());
    let balance = solana_client.get_balance(&payer.pubkey()).unwrap_or(0);
    println!("Solana balance: {:.6} SOL", balance as f64 / 1e9);
    if balance < 5_000_000 {
        println!("WARNING: Low balance. dWallet creation may fail due to rent exemption.");
    }
    println!();

    // 3. Create dWallet via DKG
    let artifact = create_dwallet_via_dkg(&config, &payer, &solana_client).await
        .context("DKG flow failed")?;

    // 4. Write artifact
    let output_dir = config.output_path.parent().unwrap_or(std::path::Path::new("."));
    std::fs::create_dir_all(output_dir)
        .with_context(|| format!("Failed to create output directory {:?}", output_dir))?;

    let json = serde_json::to_string_pretty(&artifact)
        .context("Failed to serialize artifact")?;
    std::fs::write(&config.output_path, json)
        .with_context(|| format!("Failed to write artifact to {:?}", config.output_path))?;

    println!();
    println!("═══════════════════════════════════════════════════════════");
    println!("  DKG Complete — Artifact saved");
    println!("═══════════════════════════════════════════════════════════");
    println!("  File: {}", config.output_path.display());
    println!("  dWallet PDA:        {}", artifact.dwallet_pda);
    println!("  Public key (hex):   {}", artifact.dwallet_signing_public_key_hex);
    println!("  Curve:              {}", artifact.curve);
    println!("  Authority:          {}", artifact.authority);
    println!("  State:              {}", artifact.state);
    println!();
    println!("⚠️  This artifact is needed for Phase 5C/5D. Do not delete.");
    println!("   It is ignored by git via .gitignore.");

    Ok(())
}

fn load_keypair(path: &PathBuf) -> Result<Keypair> {
    let data = std::fs::read_to_string(path)
        .with_context(|| format!("Cannot read keypair file: {:?}", path))?;
    let bytes: Vec<u8> = {
        let s = data.trim();
        let inner = s.strip_prefix('[').and_then(|s| s.strip_suffix(']'))
            .context("Keypair file should be a JSON array of u8 values")?;
        inner.split(',').map(|v| v.trim().parse::<u8>())
            .collect::<Result<Vec<_>, _>>()
            .context("Invalid byte in keypair file")?
    };
    Keypair::try_from(&bytes[..]).context("Invalid keypair bytes")
}

fn expand_tilde(path: &PathBuf) -> PathBuf {
    let s = path.to_string_lossy();
    if s.starts_with("~/") {
        if let Ok(home) = std::env::var("HOME") {
            return PathBuf::from(home).join(&s[2..]);
        }
    }
    path.clone()
}
