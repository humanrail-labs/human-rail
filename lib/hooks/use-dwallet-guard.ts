"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useCluster } from "@/lib/solana/cluster-context";
import { getProgramId } from "@/lib/programs";

// ---------------------------------------------------------------------------
// Guard program status hook
// ---------------------------------------------------------------------------
export function useDwalletGuard() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const { cluster } = useCluster();

  const guardProgramId = useMemo(() => {
    try {
      return getProgramId(cluster, "dwalletGuard");
    } catch {
      return null;
    }
  }, [cluster]);

  const [isDeployed, setIsDeployed] = useState(false);
  const [isCheckingDeployment, setIsCheckingDeployment] = useState(false);
  const [deploymentError, setDeploymentError] = useState<string | null>(null);

  const isConfigured = guardProgramId !== null;

  const checkDeployment = useCallback(async () => {
    if (!guardProgramId || !connection) {
      setIsDeployed(false);
      return;
    }
    setIsCheckingDeployment(true);
    setDeploymentError(null);
    try {
      const info = await connection.getAccountInfo(guardProgramId);
      const executable = info?.executable === true;
      setIsDeployed(executable);
      if (!executable) {
        setDeploymentError("Guard program account exists but is not executable, or does not exist on " + cluster);
      }
    } catch (err) {
      console.error("Deployment check failed:", err);
      setIsDeployed(false);
      setDeploymentError(err instanceof Error ? err.message : "RPC check failed");
    } finally {
      setIsCheckingDeployment(false);
    }
  }, [guardProgramId, connection, cluster]);

  useEffect(() => {
    checkDeployment();
  }, [checkDeployment]);

  // -------------------------------------------------------------------------
  // PDA derivations
  // -------------------------------------------------------------------------
  const deriveCpiAuthority = useCallback(
    (programId?: PublicKey): [PublicKey, number] => {
      const id = programId ?? guardProgramId;
      if (!id) throw new Error("Guard program ID not configured");
      return PublicKey.findProgramAddressSync(
        [Buffer.from("__ika_cpi_authority")],
        id
      );
    },
    [guardProgramId]
  );

  const deriveGuardedDwallet = useCallback(
    (
      principal: PublicKey,
      agent: PublicKey,
      dwallet: PublicKey,
      programId?: PublicKey
    ): [PublicKey, number] => {
      const id = programId ?? guardProgramId;
      if (!id) throw new Error("Guard program ID not configured");
      return PublicKey.findProgramAddressSync(
        [
          Buffer.from("guarded_dwallet"),
          principal.toBuffer(),
          agent.toBuffer(),
          dwallet.toBuffer(),
        ],
        id
      );
    },
    [guardProgramId]
  );

  const deriveGuardSigningRequest = useCallback(
    (
      guardedDwallet: PublicKey,
      requestId: Uint8Array,
      programId?: PublicKey
    ): [PublicKey, number] => {
      const id = programId ?? guardProgramId;
      if (!id) throw new Error("Guard program ID not configured");
      return PublicKey.findProgramAddressSync(
        [
          Buffer.from("guard_signing_request"),
          guardedDwallet.toBuffer(),
          Buffer.from(requestId),
        ],
        id
      );
    },
    [guardProgramId]
  );

  // -------------------------------------------------------------------------
  // Account fetching (read-only)
  // -------------------------------------------------------------------------
  const fetchGuardedDwallet = useCallback(
    async (guardedDwalletPda: PublicKey) => {
      if (!connection) return null;
      try {
        const info = await connection.getAccountInfo(guardedDwalletPda);
        if (!info) return null;
        return parseGuardedDwallet(info.data as Buffer);
      } catch (err) {
        console.error("Failed to fetch GuardedDwallet:", err);
        return null;
      }
    },
    [connection]
  );

  const fetchGuardSigningRequest = useCallback(
    async (requestPda: PublicKey) => {
      if (!connection) return null;
      try {
        const info = await connection.getAccountInfo(requestPda);
        if (!info) return null;
        return parseGuardSigningRequest(info.data as Buffer);
      } catch (err) {
        console.error("Failed to fetch GuardSigningRequest:", err);
        return null;
      }
    },
    [connection]
  );

  return {
    guardProgramId,
    isConfigured,
    isDeployed,
    isCheckingDeployment,
    deploymentError,
    checkDeployment,
    deriveCpiAuthority,
    deriveGuardedDwallet,
    deriveGuardSigningRequest,
    fetchGuardedDwallet,
    fetchGuardSigningRequest,
    wallet: publicKey,
  };
}

// ---------------------------------------------------------------------------
// Raw account parsers (based on IDL account layouts)
// ---------------------------------------------------------------------------
export interface GuardedDwallet {
  version: number;
  principal: PublicKey;
  humanProfile: PublicKey;
  agent: PublicKey;
  humanrailCapability: PublicKey;
  dwallet: PublicKey;
  allowedChainId: number;
  allowedAssetHash: Uint8Array;
  allowedRecipientHash: Uint8Array;
  perTxLimit: bigint;
  dailyLimit: bigint;
  totalLimit: bigint;
  dailySpent: bigint;
  totalSpent: bigint;
  lastSpendDay: bigint;
  expiresAt: bigint;
  frozen: boolean;
  bump: number;
}

export interface GuardSigningRequest {
  version: number;
  requestId: Uint8Array;
  guardedDwallet: PublicKey;
  principal: PublicKey;
  agent: PublicKey;
  dwallet: PublicKey;
  messageDigest: Uint8Array;
  messageMetadataDigest: Uint8Array;
  destinationChainId: number;
  assetHash: Uint8Array;
  recipientHash: Uint8Array;
  amount: bigint;
  signatureScheme: number;
  status: number;
  rejectionCode: number;
  ikaMessageApproval: PublicKey;
  createdAt: bigint;
  bump: number;
}

function parseGuardedDwallet(data: Buffer): GuardedDwallet | null {
  try {
    if (data.length < 295) return null;
    let offset = 8; // skip discriminator

    const version = data[offset];
    offset += 1;

    const principal = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const humanProfile = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const agent = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const humanrailCapability = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const dwallet = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const allowedChainId = data.readUInt32LE(offset);
    offset += 4;

    const allowedAssetHash = new Uint8Array(data.slice(offset, offset + 32));
    offset += 32;

    const allowedRecipientHash = new Uint8Array(data.slice(offset, offset + 32));
    offset += 32;

    const perTxLimit = data.readBigUInt64LE(offset);
    offset += 8;

    const dailyLimit = data.readBigUInt64LE(offset);
    offset += 8;

    const totalLimit = data.readBigUInt64LE(offset);
    offset += 8;

    const dailySpent = data.readBigUInt64LE(offset);
    offset += 8;

    const totalSpent = data.readBigUInt64LE(offset);
    offset += 8;

    const lastSpendDay = data.readBigInt64LE(offset);
    offset += 8;

    const expiresAt = data.readBigInt64LE(offset);
    offset += 8;

    const frozen = data[offset] === 1;
    offset += 1;

    const bump = data[offset];

    return {
      version,
      principal,
      humanProfile,
      agent,
      humanrailCapability,
      dwallet,
      allowedChainId,
      allowedAssetHash,
      allowedRecipientHash,
      perTxLimit,
      dailyLimit,
      totalLimit,
      dailySpent,
      totalSpent,
      lastSpendDay,
      expiresAt,
      frozen,
      bump,
    };
  } catch (e) {
    console.error("Failed to parse GuardedDwallet:", e);
    return null;
  }
}

function parseGuardSigningRequest(data: Buffer): GuardSigningRequest | null {
  try {
    if (data.length < 387) return null;
    let offset = 8; // skip discriminator

    const version = data[offset];
    offset += 1;

    const requestId = new Uint8Array(data.slice(offset, offset + 32));
    offset += 32;

    const guardedDwallet = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const principal = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const agent = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const dwallet = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const messageDigest = new Uint8Array(data.slice(offset, offset + 32));
    offset += 32;

    const messageMetadataDigest = new Uint8Array(data.slice(offset, offset + 32));
    offset += 32;

    const destinationChainId = data.readUInt32LE(offset);
    offset += 4;

    const assetHash = new Uint8Array(data.slice(offset, offset + 32));
    offset += 32;

    const recipientHash = new Uint8Array(data.slice(offset, offset + 32));
    offset += 32;

    const amount = data.readBigUInt64LE(offset);
    offset += 8;

    const signatureScheme = data.readUInt16LE(offset);
    offset += 2;

    const status = data[offset];
    offset += 1;

    const rejectionCode = data.readUInt16LE(offset);
    offset += 2;

    const ikaMessageApproval = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const createdAt = data.readBigInt64LE(offset);
    offset += 8;

    const bump = data[offset];

    return {
      version,
      requestId,
      guardedDwallet,
      principal,
      agent,
      dwallet,
      messageDigest,
      messageMetadataDigest,
      destinationChainId,
      assetHash,
      recipientHash,
      amount,
      signatureScheme,
      status,
      rejectionCode,
      ikaMessageApproval,
      createdAt,
      bump,
    };
  } catch (e) {
    console.error("Failed to parse GuardSigningRequest:", e);
    return null;
  }
}
