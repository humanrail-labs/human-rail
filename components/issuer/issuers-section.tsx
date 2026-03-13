"use client";

import { FC, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { IssuerCard } from "./issuer-card";
import { useIssuers, Issuer } from "@/lib/hooks/use-issuers";
import { useHumanProfile } from "@/lib/hooks/use-human-profile";
import { 
  Award, RefreshCw, Shield, Info, ExternalLink, 
  PlusCircle, Building2
} from "lucide-react";
import { toast } from "sonner";

const fadeUp = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

interface IssuersSectionProps {
  variant?: "full" | "compact";
}

export const IssuersSection: FC<IssuersSectionProps> = ({ variant = "full" }) => {
  const { connected, publicKey } = useWallet();
  const { issuers, loading, refetch } = useIssuers();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleRequestAttestation = (issuer: Issuer) => {
    // In production, this would initiate the attestation flow
    toast.info("Attestation Request", {
      description: `Request sent to ${issuer.name}. You'll be redirected to complete verification.`,
    });
  };

  // Check which issuers have attested this profile
  // For demo, treat active issuers with high attestation count as "attesting"
  const attestingIssuers = issuers.filter(issuer => issuer.isActive && issuer.attestationCount > 5);

  // Issuers that haven't attested yet
  const attestingPdas = new Set(attestingIssuers.map(i => i.pda.toBase58()));
  const availableIssuers = issuers.filter(issuer => 
    !attestingPdas.has(issuer.pda.toBase58())
  );

  if (!connected) {
    return (
      <Card className="border-white/[0.04] bg-white/[0.015]">
        <CardContent className="flex flex-col items-center py-10 text-center">
          <Shield className="mb-3 h-10 w-10 text-neutral-700" />
          <p className="text-sm text-neutral-500">Connect wallet to view trusted issuers</p>
        </CardContent>
      </Card>
    );
  }

  if (variant === "compact") {
    return (
      <motion.div variants={fadeUp}>
        <Card className="border-white/[0.04] bg-white/[0.015]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Award className="h-4 w-4 text-sky-500" />
                Trusted Issuers
              </CardTitle>
              {attestingIssuers.length > 0 && (
                <Badge variant="outline" className="border-sky-500/20 text-sky-400 text-[10px]">
                  {attestingIssuers.length} attested you
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 rounded-lg bg-neutral-900" />
                <Skeleton className="h-12 rounded-lg bg-neutral-900" />
              </div>
            ) : issuers.length === 0 ? (
              <p className="text-center text-sm text-neutral-500">No issuers registered</p>
            ) : (
              <div className="space-y-2">
                {issuers.slice(0, 3).map((issuer) => (
                  <IssuerCard
                    key={issuer.pda.toBase58()}
                    issuer={issuer}
                    hasAttestation={attestingPdas.has(issuer.pda.toBase58())}
                    isConnected={connected}
                    compact
                  />
                ))}
                {issuers.length > 3 && (
                  <p className="text-center text-xs text-neutral-500">
                    +{issuers.length - 3} more issuers
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div variants={fadeUp}>
      <Card className="border-white/[0.06] bg-white/[0.02]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Award className="h-5 w-5 text-sky-500" />
                Trusted Issuers
              </CardTitle>
              <CardDescription className="text-xs">
                Identity verification providers that can issue on-chain attestations
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={loading || refreshing} className="text-neutral-500">
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Issuers that have attested this profile */}
          {attestingIssuers.length > 0 && (
            <div>
              <h4 className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-emerald-500">
                <Shield className="h-3.5 w-3.5" />
                Attested Your Profile
              </h4>
              <div className="space-y-3">
                {attestingIssuers.map((issuer) => (
                  <IssuerCard
                    key={issuer.pda.toBase58()}
                    issuer={issuer}
                    hasAttestation={true}
                    isConnected={connected}
                    onRequestAttestation={handleRequestAttestation}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Available issuers */}
          {availableIssuers.length > 0 && (
            <div>
              <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-neutral-500">
                Available Issuers
              </h4>
              <div className="space-y-3">
                {availableIssuers.map((issuer) => (
                  <IssuerCard
                    key={issuer.pda.toBase58()}
                    issuer={issuer}
                    hasAttestation={false}
                    isConnected={connected}
                    onRequestAttestation={handleRequestAttestation}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="space-y-3">
              <Skeleton className="h-40 rounded-xl bg-neutral-900" />
              <Skeleton className="h-40 rounded-xl bg-neutral-900" />
            </div>
          )}

          {/* Empty state */}
          {!loading && issuers.length === 0 && (
            <div className="flex flex-col items-center py-8 text-center">
              <Building2 className="mb-3 h-10 w-10 text-neutral-700" />
              <p className="text-sm text-neutral-500">No issuers registered yet</p>
              <p className="mt-1 text-xs text-neutral-600">
                Issuers will appear here once the issuer registry is deployed
              </p>
            </div>
          )}

          {/* Info footer */}
          <div className="rounded-lg bg-sky-500/5 p-4 ring-1 ring-sky-500/10">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" />
              <div>
                <p className="text-sm font-medium text-sky-200">About Issuers</p>
                <p className="mt-1 text-xs text-sky-400/60">
                  Issuers are trusted entities that can verify your identity and issue attestations 
                  on-chain. Each attestation increases your human score and trust tier. 
                  Multiple attestations from different issuers provide stronger verification.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default IssuersSection;
