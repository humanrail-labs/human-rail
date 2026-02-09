/**
 * Gated Action — Human-Verified Access Control
 *
 * Demonstrates how a dApp or service can check if a wallet
 * has a valid HumanRail attestation before allowing an action.
 *
 * This is the most common integration pattern:
 *   1. Fetch the user's HumanProfile PDA
 *   2. Check their humanity_score meets your threshold
 *   3. Optionally verify a specific attestation is active and not expired
 *
 * Usage:
 *   npx tsx gated-action.ts <WALLET_PUBKEY>
 */
import { Connection, PublicKey } from '@solana/web3.js';

const HUMAN_REGISTRY = new PublicKey('GB35h1zNh8WK5c72yVXu6gk6U7eUMFiTTymrXk2dfHHo');
const RPC = process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com';

// ── Thresholds (customize per your app) ──
const MINIMUM_SCORE = 50;       // minimum humanity_score to allow action
const REQUIRE_ACTIVE = true;    // require at least one active attestation

// ── Account layout offsets (from IDL) ──
// HumanProfile: discriminator(8) + authority(32) + humanity_score(u16, offset 40)
//   + attestation_count(u16, offset 42) + ...
const PROFILE_SCORE_OFFSET = 40;
const PROFILE_ATTEST_COUNT_OFFSET = 42;

// SignedAttestation: disc(8) + profile(32) + issuer(32) + payload_hash(32)
//   + weight(u16, off 104) + status(u8, off 106) + issued_at(i64, off 107)
//   + expires_at(i64, off 115) + nonce(u64, off 123)
const ATTEST_WEIGHT_OFFSET = 104;
const ATTEST_STATUS_OFFSET = 106;
const ATTEST_ISSUED_OFFSET = 107;
const ATTEST_EXPIRES_OFFSET = 115;

function deriveProfilePda(wallet: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('human_profile'), wallet.toBuffer()],
    HUMAN_REGISTRY
  );
  return pda;
}

interface GateResult {
  allowed: boolean;
  reason: string;
  humanityScore: number;
  attestationCount: number;
  profilePda: string;
}

async function checkHumanGate(walletPubkey: string): Promise<GateResult> {
  const connection = new Connection(RPC, 'confirmed');
  const wallet = new PublicKey(walletPubkey);
  const profilePda = deriveProfilePda(wallet);

  // Step 1: Fetch profile
  const profileInfo = await connection.getAccountInfo(profilePda);
  if (!profileInfo) {
    return {
      allowed: false,
      reason: 'No HumanProfile found. User must create a profile first.',
      humanityScore: 0,
      attestationCount: 0,
      profilePda: profilePda.toBase58(),
    };
  }

  const data = profileInfo.data;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const humanityScore = view.getUint16(PROFILE_SCORE_OFFSET, true);
  const attestationCount = view.getUint16(PROFILE_ATTEST_COUNT_OFFSET, true);

  // Step 2: Check score
  if (humanityScore < MINIMUM_SCORE) {
    return {
      allowed: false,
      reason: `Humanity score ${humanityScore} is below minimum threshold ${MINIMUM_SCORE}.`,
      humanityScore,
      attestationCount,
      profilePda: profilePda.toBase58(),
    };
  }

  // Step 3: Check attestation count
  if (REQUIRE_ACTIVE && attestationCount === 0) {
    return {
      allowed: false,
      reason: 'No attestations found. User needs at least one active attestation.',
      humanityScore,
      attestationCount,
      profilePda: profilePda.toBase58(),
    };
  }

  return {
    allowed: true,
    reason: 'Human verification passed.',
    humanityScore,
    attestationCount,
    profilePda: profilePda.toBase58(),
  };
}

// ── CLI runner ──
async function main() {
  const walletArg = process.argv[2];
  if (!walletArg) {
    console.error('Usage: npx tsx gated-action.ts <WALLET_PUBKEY>');
    console.error('\nExample wallets on devnet:');
    console.error('  8yyhW3phGQo3oiMd5RFuBMEh3bSYZgDLRXYNx8wReTQ4  (has profile + attestation)');
    process.exit(1);
  }

  console.log('╔═════════════════════════════════════════╗');
  console.log('║     HumanRail — Gated Action Check      ║');
  console.log('╚═════════════════════════════════════════╝\n');
  console.log(`Checking wallet: ${walletArg}`);
  console.log(`Minimum score:   ${MINIMUM_SCORE}`);
  console.log(`Require active:  ${REQUIRE_ACTIVE}\n`);

  const result = await checkHumanGate(walletArg);

  if (result.allowed) {
    console.log('✅ ACCESS GRANTED');
  } else {
    console.log('❌ ACCESS DENIED');
  }
  console.log(`
  Reason:           ${result.reason}
  Humanity Score:   ${result.humanityScore}
  Attestations:     ${result.attestationCount}
  Profile PDA:      ${result.profilePda}
  `);

  // In a real app, you'd gate your action here:
  if (result.allowed) {
    console.log('→ Proceeding with gated action (swap, mint, transfer, etc.)...');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
