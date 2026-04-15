"use client";

import { useEffect, useState, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import { useCluster } from "@/lib/solana/cluster-context";
import {
  getProgramId,
  deriveFreezePda,
  deriveCapabilityPda,
  parseCapability,
  DISCRIMINATORS,
  type Capability,
} from "@/lib/programs";

export interface CapabilityWithPda extends Capability {
  pda: PublicKey;
  isFrozen: boolean;
}

export function useAgentCapabilities(agentPda: PublicKey | null) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { cluster } = useCluster();

  const [capabilities, setCapabilities] = useState<CapabilityWithPda[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCapabilities = useCallback(async () => {
    if (!agentPda || !publicKey || !connection) return;

    setLoading(true);
    setError(null);

    try {
      const programId = getProgramId(cluster, "delegation");

      const accounts = await connection.getProgramAccounts(programId, {
        filters: [
          {
            memcmp: {
              offset: 8 + 32, // principal (32) -> agent field
              bytes: agentPda.toBase58(),
            },
          },
        ],
      });

      const parsedCapabilities: CapabilityWithPda[] = [];

      for (const { pubkey, account } of accounts) {
        const parsed = parseCapability(account.data as Buffer);
        if (parsed && parsed.principal.equals(publicKey)) {
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
      console.error("Failed to fetch agent capabilities:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch capabilities");
    } finally {
      setLoading(false);
    }
  }, [agentPda, publicKey, connection, cluster]);

  useEffect(() => {
    fetchCapabilities();
  }, [fetchCapabilities]);

  // Issue a new capability for this agent
  const issueCapability = useCallback(
    async (params: {
      perTxLimit: number;
      dailyLimit: number;
      totalLimit: number;
      validitySeconds: number;
    }): Promise<string> => {
      if (!publicKey || !connection || !agentPda) {
        throw new Error("Wallet not connected or agent not selected");
      }

      const programId = getProgramId(cluster, "delegation");

      const nonce = BigInt(Date.now());
      const nonceBuffer = Buffer.alloc(8);
      nonceBuffer.writeBigUInt64LE(nonce);

      const [capabilityPda] = deriveCapabilityPda(publicKey, agentPda, nonce, cluster);

      const allowedProgramsBuf = Buffer.alloc(8);
      allowedProgramsBuf.fill(0xFF);

      const allowedAssetsBuf = Buffer.alloc(8);
      allowedAssetsBuf.fill(0xFF);

      const perTxLimitBuf = Buffer.alloc(8);
      perTxLimitBuf.writeBigUInt64LE(BigInt(params.perTxLimit));

      const dailyLimitBuf = Buffer.alloc(8);
      dailyLimitBuf.writeBigUInt64LE(BigInt(params.dailyLimit));

      const totalLimitBuf = Buffer.alloc(8);
      totalLimitBuf.writeBigUInt64LE(BigInt(params.totalLimit));

      const maxSlippageBuf = Buffer.alloc(2);
      maxSlippageBuf.writeUInt16LE(500);

      const maxFeeBuf = Buffer.alloc(8);
      maxFeeBuf.writeBigUInt64LE(BigInt(10000000));

      const validityBuf = Buffer.alloc(8);
      validityBuf.writeBigInt64LE(BigInt(params.validitySeconds));

      const cooldownBuf = Buffer.alloc(4);
      cooldownBuf.writeUInt32LE(0);

      const riskTierBuf = Buffer.from([1]);
      const enforceAllowlistBuf = Buffer.from([0]);
      const allowlistBuf = Buffer.alloc(4);

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
          { pubkey: agentPda, isSigner: false, isWritable: false },
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
    [publicKey, connection, agentPda, cluster, sendTransaction, fetchCapabilities]
  );

  // Emergency freeze agent (requires at least one capability to prove relationship)
  const emergencyFreeze = useCallback(
    async (capabilityPda: PublicKey): Promise<string> => {
      if (!publicKey || !connection || !agentPda) {
        throw new Error("Wallet not connected or agent not selected");
      }

      const programId = getProgramId(cluster, "delegation");
      const [freezePda] = deriveFreezePda(publicKey, agentPda, cluster);

      const instruction = new TransactionInstruction({
        keys: [
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: agentPda, isSigner: false, isWritable: false },
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
    [publicKey, connection, agentPda, cluster, sendTransaction, fetchCapabilities]
  );

  // Unfreeze agent
  const unfreeze = useCallback(
    async (capabilityPda: PublicKey): Promise<string> => {
      if (!publicKey || !connection || !agentPda) {
        throw new Error("Wallet not connected or agent not selected");
      }

      const programId = getProgramId(cluster, "delegation");
      const [freezePda] = deriveFreezePda(publicKey, agentPda, cluster);

      const instruction = new TransactionInstruction({
        keys: [
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: agentPda, isSigner: false, isWritable: false },
          { pubkey: capabilityPda, isSigner: false, isWritable: false },
          { pubkey: freezePda, isSigner: false, isWritable: true },
          { pubkey: new PublicKey("11111111111111111111111111111111"), isSigner: false, isWritable: false },
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
    [publicKey, connection, agentPda, cluster, sendTransaction, fetchCapabilities]
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
