// HumanRail Ika Artifact Reader — Phase 6
//
// Reads `.local-ika/` artifacts in server-side environments and returns
// a fully sanitized public object. No secrets, no paths, no raw attestation.
//
// In browser environments, returns a graceful error.

export interface SanitizedArtifactState {
  exists: boolean;
  dWalletPda?: string;
  dWalletPublicKeyHex?: string;
  dWalletCurve?: string;
  dWalletAuthority?: string;
  dWalletState?: string;
  guardedDwalletPda?: string;
  guardSigningRequestPda?: string;
  ikaMessageApprovalPda?: string;
  messageDigestHex?: string;
  messageMetadataDigestHex?: string;
  signatureScheme?: string;
  approveGuardedMessageSignature?: string;
  messageApprovalStatus?: string;
  signatureLen?: number;
  signatureHex?: string;
  signatureBase64?: string;
  presignSessionIdentifierHex?: string;
  signedAt?: string;
  error?: string;
  notes?: string;
}

function isNodeEnv(): boolean {
  return typeof process !== "undefined" && process.versions?.node != null;
}

export async function readSanitizedArtifacts(): Promise<SanitizedArtifactState> {
  if (!isNodeEnv()) {
    return {
      exists: false,
      error:
        "Ika artifacts are only available in server-side environments. " +
        "Run the agent in a Node.js context (e.g., test script or server endpoint) to access devnet artifact state.",
    };
  }

  try {
    const fs = await import("fs");
    const path = await import("path");

    const baseDir = path.resolve(".local-ika");

    // Try to read signing-request.json (most complete artifact)
    const srPath = path.join(baseDir, "signing-request.json");
    let signingRequest: Record<string, unknown> | null = null;
    try {
      const raw = fs.readFileSync(srPath, "utf-8");
      signingRequest = JSON.parse(raw);
    } catch {
      // missing
    }

    // Try to read dwallet.json
    const dwPath = path.join(baseDir, "dwallet.json");
    let dwallet: Record<string, unknown> | null = null;
    try {
      const raw = fs.readFileSync(dwPath, "utf-8");
      dwallet = JSON.parse(raw);
    } catch {
      // missing
    }

    // Try to read guarded-dwallet.json
    const gdPath = path.join(baseDir, "guarded-dwallet.json");
    let guarded: Record<string, unknown> | null = null;
    try {
      const raw = fs.readFileSync(gdPath, "utf-8");
      guarded = JSON.parse(raw);
    } catch {
      // missing
    }

    if (!signingRequest && !dwallet && !guarded) {
      return {
        exists: false,
        error:
          "No Ika artifacts found in .local-ika/. " +
          "Run: npm run ika:approve-message && npm run ika:sign-approved-message",
      };
    }

    const result: SanitizedArtifactState = {
      exists: true,
      notes: "Ika pre-alpha mock signer; not production custody.",
    };

    if (dwallet) {
      result.dWalletPda = typeof dwallet.dwallet_pda === "string" ? dwallet.dwallet_pda : undefined;
      result.dWalletPublicKeyHex = typeof dwallet.dwallet_signing_public_key_hex === "string" ? dwallet.dwallet_signing_public_key_hex : undefined;
      result.dWalletCurve = typeof dwallet.curve === "string" ? dwallet.curve : undefined;
      result.dWalletAuthority = typeof dwallet.authority === "string" ? dwallet.authority : undefined;
      result.dWalletState = typeof dwallet.state === "string" ? dwallet.state : undefined;
    }

    if (guarded) {
      result.guardedDwalletPda = typeof guarded.guardedDwalletPda === "string" ? guarded.guardedDwalletPda : undefined;
    }

    if (signingRequest) {
      result.guardSigningRequestPda = typeof signingRequest.guardSigningRequestPda === "string" ? signingRequest.guardSigningRequestPda : undefined;
      result.ikaMessageApprovalPda = typeof signingRequest.ikaMessageApprovalPda === "string" ? signingRequest.ikaMessageApprovalPda : undefined;
      result.messageDigestHex = typeof signingRequest.messageDigestHex === "string" ? signingRequest.messageDigestHex : undefined;
      result.messageMetadataDigestHex = typeof signingRequest.messageMetadataDigestHex === "string" ? signingRequest.messageMetadataDigestHex : undefined;
      result.signatureScheme = typeof signingRequest.signatureScheme === "string" ? signingRequest.signatureScheme : undefined;
      result.approveGuardedMessageSignature = typeof signingRequest.approveGuardedMessageSignature === "string" ? signingRequest.approveGuardedMessageSignature : undefined;
      result.messageApprovalStatus = typeof signingRequest.messageApprovalStatus === "string" ? signingRequest.messageApprovalStatus : undefined;
      result.signatureLen = typeof signingRequest.signatureLen === "number" ? signingRequest.signatureLen : undefined;
      result.signatureHex = typeof signingRequest.onChainSignatureHex === "string" ? signingRequest.onChainSignatureHex : undefined;
      result.signatureBase64 = typeof signingRequest.ikaSignatureBase64 === "string" ? signingRequest.ikaSignatureBase64 : undefined;
      result.presignSessionIdentifierHex = typeof signingRequest.presignSessionIdentifierHex === "string" ? signingRequest.presignSessionIdentifierHex : undefined;
      result.signedAt = typeof signingRequest.signedAt === "string" ? signingRequest.signedAt : undefined;
    }

    return result;
  } catch (err) {
    return {
      exists: false,
      error: `Failed to read artifacts: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
