"use client";

import { useEffect, useState, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction, TransactionInstruction, Keypair } from "@solana/web3.js";
import { useCluster } from "@/lib/solana/cluster-context";
import {
  getProgramId,
  deriveHumanProfilePda,
  parseAgentProfile,
  DISCRIMINATORS,
  AgentProfile,
} from "@/lib/programs";

export interface AgentWithPda extends AgentProfile {
  pda: PublicKey;
}

export function useAgents() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { cluster } = useCluster();

  const [agents, setAgents] = useState<AgentWithPda[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all agents owned by the connected wallet
  const fetchAgents = useCallback(async () => {
    if (!publicKey || !connection) return;

    setLoading(true);
    setError(null);

    try {
      const programId = getProgramId(cluster, "agentRegistry");

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

      const parsedAgents: AgentWithPda[] = [];

      for (const { pubkey, account } of accounts) {
        const parsed = parseAgentProfile(account.data as Buffer);
        if (parsed) {
          parsedAgents.push({
            ...parsed,
            pda: pubkey,
          });
        }
      }

      parsedAgents.sort((a, b) => b.createdAt - a.createdAt);
      setAgents(parsedAgents);
    } catch (err) {
      console.error("Failed to fetch agents:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch agents");
    } finally {
      setLoading(false);
    }
  }, [publicKey, connection, cluster]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  // Register a new agent
  const registerAgent = useCallback(
    async (name: string, signingKey?: PublicKey): Promise<string> => {
      if (!publicKey || !connection) {
        throw new Error("Wallet not connected");
      }

      const programId = getProgramId(cluster, "agentRegistry");
      const humanRegistryId = getProgramId(cluster, "humanRegistry");

      // Generate nonce
      const nonce = BigInt(Date.now());
      const nonceBuffer = Buffer.alloc(8);
      const view = new DataView(nonceBuffer.buffer);
      view.setBigUint64(0, nonce, true);

      // Derive human profile PDA
      const [humanProfilePda] = deriveHumanProfilePda(publicKey, cluster);

      // Derive agent PDA: seeds = ["agent", principal, nonce]
      const [agentPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("agent"), publicKey.toBuffer(), nonceBuffer],
        programId
      );

      // Derive operator_stats PDA: seeds = ["agent_stats", agent]
      const [operatorStatsPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("agent_stats"), agentPda.toBuffer()],
        programId
      );

      // Use provided signing key or generate new one
      const agentSigningKey = signingKey || Keypair.generate().publicKey;

      // Encode name (32 bytes, padded with zeros)
      const nameBuffer = Buffer.alloc(32);
      const nameBytes = Buffer.from(name.slice(0, 32), "utf-8");
      nameBytes.copy(nameBuffer);

      // Encode metadata_hash (32 bytes of zeros)
      const metadataHash = Buffer.alloc(32);

      // Build RegisterAgentParams struct:
      // name: [u8; 32]
      // metadata_hash: [u8; 32]
      // signing_key: Pubkey (32 bytes)
      // tee_measurement: Option<[u8; 32]> = None (1 byte = 0)
      // nonce: u64 (8 bytes)
      const paramsData = Buffer.concat([
        nameBuffer,
        metadataHash,
        agentSigningKey.toBuffer(),
        Buffer.from([0]),
        nonceBuffer,
      ]);

      const instructionData = Buffer.concat([DISCRIMINATORS.registerAgent, paramsData]);

      // Account order from IDL:
      // 1. principal (signer, writable)
      // 2. human_profile (PDA)
      // 3. human_registry_program
      // 4. agent (PDA, writable)
      // 5. operator_stats (PDA, writable)
      // 6. system_program
      const instruction = new TransactionInstruction({
        keys: [
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: humanProfilePda, isSigner: false, isWritable: false },
          { pubkey: humanRegistryId, isSigner: false, isWritable: false },
          { pubkey: agentPda, isSigner: false, isWritable: true },
          { pubkey: operatorStatsPda, isSigner: false, isWritable: true },
          { pubkey: new PublicKey("11111111111111111111111111111111"), isSigner: false, isWritable: false },
        ],
        programId,
        data: instructionData,
      });

      const transaction = new Transaction().add(instruction);
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // Simulate first to get detailed error
      const simulation = await connection.simulateTransaction(transaction);
      console.log("Simulation result:", simulation);
      if (simulation.value.err) {
        console.error("Simulation error:", simulation.value.err);
        console.error("Logs:", simulation.value.logs);
        throw new Error(`Simulation failed: ${JSON.stringify(simulation.value.err)}\nLogs: ${simulation.value.logs?.join('\n')}`);
      }

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, "confirmed");

      await fetchAgents();
      return signature;
    },
    [publicKey, connection, cluster, sendTransaction, fetchAgents]
  );

  // Suspend an agent
  const suspendAgent = useCallback(
    async (agentPda: PublicKey): Promise<string> => {
      if (!publicKey || !connection) {
        throw new Error("Wallet not connected");
      }

      const programId = getProgramId(cluster, "agentRegistry");

      const instruction = new TransactionInstruction({
        keys: [
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: agentPda, isSigner: false, isWritable: true },
        ],
        programId,
        data: DISCRIMINATORS.suspendAgent,
      });

      const transaction = new Transaction().add(instruction);
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, "confirmed");
      await fetchAgents();

      return signature;
    },
    [publicKey, connection, cluster, sendTransaction, fetchAgents]
  );

  // Reactivate an agent
  const reactivateAgent = useCallback(
    async (agentPda: PublicKey): Promise<string> => {
      if (!publicKey || !connection) {
        throw new Error("Wallet not connected");
      }

      const programId = getProgramId(cluster, "agentRegistry");

      const instruction = new TransactionInstruction({
        keys: [
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: agentPda, isSigner: false, isWritable: true },
        ],
        programId,
        data: DISCRIMINATORS.reactivateAgent,
      });

      const transaction = new Transaction().add(instruction);
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, "confirmed");
      await fetchAgents();

      return signature;
    },
    [publicKey, connection, cluster, sendTransaction, fetchAgents]
  );

  // Revoke an agent
  const revokeAgent = useCallback(
    async (agentPda: PublicKey): Promise<string> => {
      if (!publicKey || !connection) {
        throw new Error("Wallet not connected");
      }

      const programId = getProgramId(cluster, "agentRegistry");

      const instruction = new TransactionInstruction({
        keys: [
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: agentPda, isSigner: false, isWritable: true },
        ],
        programId,
        data: DISCRIMINATORS.revokeAgent,
      });

      const transaction = new Transaction().add(instruction);
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, "confirmed");
      await fetchAgents();

      return signature;
    },
    [publicKey, connection, cluster, sendTransaction, fetchAgents]
  );

  return {
    agents,
    loading,
    error,
    refetch: fetchAgents,
    registerAgent,
    suspendAgent,
    reactivateAgent,
    revokeAgent,
  };
}
