"use client";

import { useEffect, useState, useCallback } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { parseAgentProfile, AgentProfile } from "@/lib/programs";

export interface AgentWithPda extends AgentProfile {
  pda: PublicKey;
}

export function useAgent(agentPda: PublicKey | null) {
  const { connection } = useConnection();

  const [agent, setAgent] = useState<AgentWithPda | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAgent = useCallback(async () => {
    if (!agentPda || !connection) return;

    setLoading(true);
    setError(null);

    try {
      const accountInfo = await connection.getAccountInfo(agentPda);
      if (!accountInfo) {
        setAgent(null);
        return;
      }

      const parsed = parseAgentProfile(accountInfo.data as Buffer);
      if (parsed) {
        setAgent({ ...parsed, pda: agentPda });
      } else {
        setAgent(null);
      }
    } catch (err) {
      console.error("Failed to fetch agent:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch agent");
    } finally {
      setLoading(false);
    }
  }, [agentPda, connection]);

  useEffect(() => {
    fetchAgent();
  }, [fetchAgent]);

  return { agent, loading, error, refetch: fetchAgent };
}
