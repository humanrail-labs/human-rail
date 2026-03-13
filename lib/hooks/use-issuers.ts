"use client";

import { useCallback, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useCluster } from "@/lib/solana/cluster-context";
import { getProgramId } from "@/lib/programs";

// ============================================================================
// TYPES
// ============================================================================
export type AttestationType = 
  | { type: 0; name: "KYC"; icon: "shield" }
  | { type: 1; name: "Biometric"; icon: "fingerprint" }
  | { type: 2; name: "Social"; icon: "users" }
  | { type: 3; name: "Government ID"; icon: "file-badge" }
  | { type: 4; name: "Custom"; icon: "settings" };

export interface Issuer {
  pda: PublicKey;
  authority: PublicKey;
  name: string;
  description: string;
  attestationTypes: number[];
  defaultWeight: number;
  isActive: boolean;
  createdAt: number;
  attestationCount: number;
  bump: number;
}

// Known issuers (hardcoded for now - in production would be fetched from chain)
const KNOWN_ISSUERS: Partial<Issuer>[] = [
  {
    name: "HumanRail KYC",
    description: "Official KYC verification through Veriff integration",
    attestationTypes: [0], // KYC
    defaultWeight: 50,
  },
  {
    name: "Community Trust",
    description: "Community-driven identity attestations",
    attestationTypes: [2], // Social
    defaultWeight: 10,
  },
  {
    name: "GovID Verify",
    description: "Government ID verification partner",
    attestationTypes: [3], // Government ID
    defaultWeight: 40,
  },
];

// Attestation type metadata
export const ATTESTATION_TYPE_META: Record<number, { name: string; color: string; icon: string }> = {
  0: { name: "KYC", color: "emerald", icon: "shield" },
  1: { name: "Biometric", color: "sky", icon: "fingerprint" },
  2: { name: "Social", color: "violet", icon: "users" },
  3: { name: "Government ID", color: "amber", icon: "file-badge" },
  4: { name: "Custom", color: "neutral", icon: "settings" },
};

// ============================================================================
// HOOK: USE ISSUERS
// ============================================================================
export function useIssuers() {
  const { connection } = useConnection();
  const { cluster } = useCluster();
  
  const [issuers, setIssuers] = useState<Issuer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchIssuers = useCallback(async () => {
    if (!connection) return;
    setLoading(true);
    setError(null);

    try {
      // In production, this would fetch from the on-chain issuer registry
      // For now, we return mock data with proper types
      const programId = getProgramId(cluster, "humanRegistry");
      
      // Derive issuer registry PDA
      const [registryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("issuer_registry")],
        programId
      );

      // Try to fetch registry (may not exist yet on devnet)
      const accountInfo = await connection.getAccountInfo(registryPda);
      
      if (!accountInfo) {
        // Return mock issuers for demo
        const mockIssuers: Issuer[] = KNOWN_ISSUERS.map((issuer, index) => ({
          pda: new PublicKey(`Issuerr${index.toString().padStart(31, "0")}`),
          authority: new PublicKey("GB35h1zNh8WK5c72yVXu6gk6U7eUMFiTTymrXk2dfHHo"),
          name: issuer.name || "Unknown",
          description: issuer.description || "",
          attestationTypes: issuer.attestationTypes || [],
          defaultWeight: issuer.defaultWeight || 10,
          isActive: true,
          createdAt: Date.now() / 1000 - 86400 * 30, // 30 days ago
          attestationCount: Math.floor(Math.random() * 1000),
          bump: 0,
        }));
        
        setIssuers(mockIssuers);
        return;
      }

      // Parse actual issuer registry data
      // This is a placeholder - actual parsing would depend on the IDL
      setIssuers([]);
    } catch (err) {
      console.error("Failed to fetch issuers:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch issuers");
      
      // Return mock data on error for demo
      const mockIssuers: Issuer[] = KNOWN_ISSUERS.map((issuer, index) => ({
        pda: new PublicKey(`Issuerr${index.toString().padStart(31, "0")}`),
        authority: new PublicKey("GB35h1zNh8WK5c72yVXu6gk6U7eUMFiTTymrXk2dfHHo"),
        name: issuer.name || "Unknown",
        description: issuer.description || "",
        attestationTypes: issuer.attestationTypes || [],
        defaultWeight: issuer.defaultWeight || 10,
        isActive: true,
        createdAt: Date.now() / 1000 - 86400 * 30,
        attestationCount: Math.floor(Math.random() * 1000),
        bump: 0,
      }));
      
      setIssuers(mockIssuers);
    } finally {
      setLoading(false);
    }
  }, [connection, cluster]);

  useEffect(() => {
    fetchIssuers();
  }, [fetchIssuers]);

  return { issuers, loading, error, refetch: fetchIssuers };
}

// ============================================================================
// HOOK: USE ISSUER ATTESTATIONS
// ============================================================================
export function useIssuerAttestations(issuerPda: PublicKey | null) {
  const { connection } = useConnection();
  const { cluster } = useCluster();
  
  const [attestations, setAttestations] = useState<Array<{
    pda: PublicKey;
    profile: PublicKey;
    attestationType: number;
    issuedAt: number;
    isActive: boolean;
  }>>([]);
  const [loading, setLoading] = useState(false);

  const fetchAttestations = useCallback(async () => {
    if (!connection || !issuerPda) return;
    setLoading(true);

    try {
      const programId = getProgramId(cluster, "humanRegistry");
      
      // Fetch attestations for this issuer
      // Filter by issuer pubkey at specific offset
      const accounts = await connection.getProgramAccounts(programId, {
        filters: [
          {
            memcmp: {
              offset: 8 + 32, // After discriminator + profile
              bytes: issuerPda.toBase58(),
            },
          },
        ],
      });

      // Parse attestations (simplified)
      const parsed = accounts.map(({ pubkey, account }) => {
        // Simplified parsing - actual would parse full attestation data
        return {
          pda: pubkey,
          profile: new PublicKey(account.data.slice(8, 40)),
          attestationType: account.data[73],
          issuedAt: Number(account.data.readBigInt64LE(74)),
          isActive: account.data[90] === 1,
        };
      });

      setAttestations(parsed.sort((a, b) => b.issuedAt - a.issuedAt));
    } catch (err) {
      console.error("Failed to fetch issuer attestations:", err);
    } finally {
      setLoading(false);
    }
  }, [connection, issuerPda, cluster]);

  useEffect(() => {
    if (issuerPda) fetchAttestations();
  }, [fetchAttestations, issuerPda]);

  return { attestations, loading, refetch: fetchAttestations };
}

// ============================================================================
// HOOK: USE MY ATTESTATIONS BY ISSUER
// ============================================================================
export function useMyAttestationsByIssuer(issuerPda: PublicKey | null) {
  const { publicKey } = useWallet();
  const { attestations } = useIssuerAttestations(issuerPda);
  
  const myAttestations = attestations.filter(att => 
    publicKey && att.profile.equals(publicKey)
  );
  
  const hasActiveAttestation = myAttestations.some(att => att.isActive);
  
  return { myAttestations, hasActiveAttestation };
}

// ============================================================================
// UTILS
// ============================================================================
export function getAttestationTypeName(type: number): string {
  return ATTESTATION_TYPE_META[type]?.name || `Type ${type}`;
}

export function getAttestationTypeColor(type: number): string {
  const color = ATTESTATION_TYPE_META[type]?.color || "neutral";
  const colorMap: Record<string, string> = {
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    sky: "text-sky-400 bg-sky-500/10 border-sky-500/20",
    violet: "text-violet-400 bg-violet-500/10 border-violet-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    neutral: "text-neutral-400 bg-neutral-500/10 border-neutral-500/20",
  };
  return colorMap[color] || colorMap.neutral;
}

export default useIssuers;
