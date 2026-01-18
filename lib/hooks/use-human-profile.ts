"use client";

import { useEffect, useState, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import { useCluster } from "@/lib/solana/cluster-context";
import {
  getProgramId,
  deriveHumanProfilePda,
  parseHumanProfile,
  DISCRIMINATORS,
  HumanProfile,
} from "@/lib/programs";

export function useHumanProfile() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { cluster } = useCluster();

  const [profile, setProfile] = useState<HumanProfile | null>(null);
  const [profilePda, setProfilePda] = useState<PublicKey | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derive PDA when wallet connects
  useEffect(() => {
    if (publicKey) {
      const [pda] = deriveHumanProfilePda(publicKey, cluster);
      setProfilePda(pda);
    } else {
      setProfilePda(null);
      setProfile(null);
    }
  }, [publicKey, cluster]);

  // Fetch profile data
  const fetchProfile = useCallback(async () => {
    if (!profilePda || !connection) return;

    setLoading(true);
    setError(null);

    try {
      const accountInfo = await connection.getAccountInfo(profilePda);

      if (!accountInfo) {
        setProfile(null);
        return;
      }

      const parsed = parseHumanProfile(accountInfo.data as Buffer);
      setProfile(parsed);
    } catch (err) {
      console.error("Failed to fetch profile:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch profile");
    } finally {
      setLoading(false);
    }
  }, [profilePda, connection]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Create profile
  const createProfile = useCallback(async (): Promise<string> => {
    if (!publicKey || !connection || !profilePda) {
      throw new Error("Wallet not connected");
    }

    const programId = getProgramId(cluster, "humanRegistry");

    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: publicKey, isSigner: true, isWritable: true },
        { pubkey: profilePda, isSigner: false, isWritable: true },
        { pubkey: new PublicKey("11111111111111111111111111111111"), isSigner: false, isWritable: false },
      ],
      programId,
      data: DISCRIMINATORS.initProfile,
    });

    const transaction = new Transaction().add(instruction);
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = publicKey;
    // DEBUG: Simulate first to see detailed error
    try {
      const simResult = await connection.simulateTransaction(transaction);
      console.log("Simulation result:", simResult);
      if (simResult.value.err) {
        console.error("Simulation error:", simResult.value.err);
        console.error("Logs:", simResult.value.logs);
      }
    } catch (simErr) {
      console.error("Simulation failed:", simErr);
    }

    const signature = await sendTransaction(transaction, connection);
    await connection.confirmTransaction(signature, "confirmed");
    await fetchProfile();

    return signature;
  }, [publicKey, connection, profilePda, cluster, sendTransaction, fetchProfile]);

  return {
    profile,
    profilePda,
    loading,
    error,
    refetch: fetchProfile,
    hasProfile: profile !== null,
    createProfile,
  };
}

export type { HumanProfile };
