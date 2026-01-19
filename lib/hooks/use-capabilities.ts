"use client";

import { useEffect, useState, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import { useCluster } from "@/lib/solana/cluster-context";
import {
  getProgramId,
  deriveCapabilityPda,
  deriveFreezePda,
  parseCapability,
  DISCRIMINATORS,
  type Capability,
} from "@/lib/programs";

export type { Capability };

export interface CapabilityWithPda extends Capability {
  pda: PublicKey;
  isFrozen: boolean;
}

export function useCapabilities() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { cluster } = useCluster();

  const [capabilities, setCapabilities] = useState<CapabilityWithPda[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all capabilities where user is principal
  const fetchCapabilities = useCallback(async () => {
    if (!publicKey || !connection) return;

    setLoading(true);
    setError(null);

    try {
      const programId = getProgramId(cluster, "delegation");

      // Get capabilities by principal
      const accounts = await connection.getProgramAccounts(programId, {
        filters: [
          {
            memcmp: {
              offset: 8,
              bytes: publicKey.toBase58(),
            },
          },
        ],
      });

      const parsedCapabilities: CapabilityWithPda[] = [];

      for (const { pubkey, account } of accounts) {
        const parsed = parseCapability(account.data as Buffer);
        if (parsed) {
          // Check if frozen
          const [freezePda] = deriveFreezePda(parsed.principal, parsed.agent, cluster);
          let isFrozen = false;
          try {
            const freezeAccount = await connection.getAccountInfo(freezePda);
            isFrozen = freezeAccount !== null;
          } catch {
            isFrozen = false;
          }
          parsedCapabilities.push({ ...parsed, pda: pubkey, isFrozen });
        }
      }

      parsedCapabilities.sort((a, b) => b.issuedAt - a.issuedAt);
      setCapabilities(parsedCapabilities);
    } catch (err) {
      console.error("Failed to fetch capabilities:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch capabilities");
    } finally {
      setLoading(false);
    }
  }, [publicKey, connection, cluster]);

  useEffect(() => {
    fetchCapabilities();
  }, [fetchCapabilities]);

  // Issue a new capability
  const issueCapability = useCallback(
    async (params: {
      agent: PublicKey;
      perTxLimit: number;
      dailyLimit: number;
      totalLimit: number;
      validitySeconds: number;
    }): Promise<string> => {
      if (!publicKey || !connection) {
        throw new Error("Wallet not connected");
      }

      const programId = getProgramId(cluster, "delegation");

      // Generate nonce
      const nonce = BigInt(Date.now());
      const nonceBuffer = Buffer.alloc(8);
      nonceBuffer.writeBigUInt64LE(nonce);

      // Derive capability PDA
      const [capabilityPda] = deriveCapabilityPda(publicKey, params.agent, nonce, cluster);

      // Build IssueCapabilityParams
      const allowedProgramsBuf = Buffer.alloc(8);
      allowedProgramsBuf.fill(0xFF); // All programs allowed (0xFFFFFFFFFFFFFFFFn)

      const allowedAssetsBuf = Buffer.alloc(8);
      allowedAssetsBuf.fill(0xFF); // All assets allowed (0xFFFFFFFFFFFFFFFFn)

      const perTxLimitBuf = Buffer.alloc(8);
      perTxLimitBuf.writeBigUInt64LE(BigInt(params.perTxLimit));

      const dailyLimitBuf = Buffer.alloc(8);
      dailyLimitBuf.writeBigUInt64LE(BigInt(params.dailyLimit));

      const totalLimitBuf = Buffer.alloc(8);
      totalLimitBuf.writeBigUInt64LE(BigInt(params.totalLimit));

      const maxSlippageBuf = Buffer.alloc(2);
      maxSlippageBuf.writeUInt16LE(500); // 5% max slippage

      const maxFeeBuf = Buffer.alloc(8);
      maxFeeBuf.writeBigUInt64LE(BigInt(10000000)); // 0.01 SOL max fee

      const validityBuf = Buffer.alloc(8);
      validityBuf.writeBigInt64LE(BigInt(params.validitySeconds));

      const cooldownBuf = Buffer.alloc(4);
      cooldownBuf.writeUInt32LE(0); // No cooldown

      const riskTierBuf = Buffer.from([1]); // Risk tier 1

      const enforceAllowlistBuf = Buffer.from([0]); // Don't enforce

      // Empty allowlist
      const allowlistBuf = Buffer.alloc(4); // vec length = 0

      const paramsData = Buffer.concat([
        allowedProgramsBuf,
        allowedAssetsBuf,
        perTxLimitBuf,
        dailyLimitBuf,
        totalLimitBuf,
        maxSlippageBuf,
        maxFeeBuf,
        validityBuf,
        cooldownBuf,
        riskTierBuf,
        enforceAllowlistBuf,
        allowlistBuf,
        nonceBuffer,
      ]);

      const instruction = new TransactionInstruction({
        keys: [
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: params.agent, isSigner: false, isWritable: false },
          { pubkey: capabilityPda, isSigner: false, isWritable: true },
          { pubkey: new PublicKey("11111111111111111111111111111111"), isSigner: false, isWritable: false },
        ],
        programId,
        data: Buffer.concat([DISCRIMINATORS.issueCapability, paramsData]),
      });

      const transaction = new Transaction().add(instruction);
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, "confirmed");
      await fetchCapabilities();

      return signature;
    },
    [publicKey, connection, cluster, sendTransaction, fetchCapabilities]
  );

  // Emergency freeze
  const emergencyFreeze = useCallback(
    async (capabilityPda: PublicKey, agent: PublicKey): Promise<string> => {
      if (!publicKey || !connection) {
        throw new Error("Wallet not connected");
      }

      const programId = getProgramId(cluster, "delegation");
      const [freezePda] = deriveFreezePda(publicKey, agent, cluster);

      const instruction = new TransactionInstruction({
        keys: [
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: agent, isSigner: false, isWritable: false },
          { pubkey: capabilityPda, isSigner: false, isWritable: false },
          { pubkey: freezePda, isSigner: false, isWritable: true },
          { pubkey: new PublicKey("11111111111111111111111111111111"), isSigner: false, isWritable: false },
        ],
        programId,
        data: DISCRIMINATORS.emergencyFreeze,
      });

      const transaction = new Transaction().add(instruction);
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, "confirmed");
      await fetchCapabilities();

      return signature;
    },
    [publicKey, connection, cluster, sendTransaction, fetchCapabilities]
  );

  // Unfreeze
  const unfreeze = useCallback(
    async (agent: PublicKey): Promise<string> => {
      if (!publicKey || !connection) {
        throw new Error("Wallet not connected");
      }

      const programId = getProgramId(cluster, "delegation");
      const [freezePda] = deriveFreezePda(publicKey, agent, cluster);

      const instruction = new TransactionInstruction({
        keys: [
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: freezePda, isSigner: false, isWritable: true },
        ],
        programId,
        data: DISCRIMINATORS.unfreeze,
      });

      const transaction = new Transaction().add(instruction);
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, "confirmed");
      await fetchCapabilities();

      return signature;
    },
    [publicKey, connection, cluster, sendTransaction, fetchCapabilities]
  );

  // Revoke capability
  const revokeCapability = useCallback(
    async (capabilityPda: PublicKey): Promise<string> => {
      if (!publicKey || !connection) {
        throw new Error("Wallet not connected");
      }

      const programId = getProgramId(cluster, "delegation");

      const instruction = new TransactionInstruction({
        keys: [
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: capabilityPda, isSigner: false, isWritable: true },
        ],
        programId,
        data: DISCRIMINATORS.revokeCapability,
      });

      const transaction = new Transaction().add(instruction);
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, "confirmed");
      await fetchCapabilities();

      return signature;
    },
    [publicKey, connection, cluster, sendTransaction, fetchCapabilities]
  );

  return {
    capabilities,
    loading,
    error,
    refetch: fetchCapabilities,
    issueCapability,
    emergencyFreeze,
    unfreeze,
    revokeCapability,
  };
}
