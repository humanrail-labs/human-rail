"use client";

import { FC } from "react";
import { PublicKey } from "@solana/web3.js";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Shield, Fingerprint, Users, FileBadge, Settings, 
  CheckCircle2, ExternalLink, Award, Clock, Hash
} from "lucide-react";
import { Issuer, getAttestationTypeName, getAttestationTypeColor } from "@/lib/hooks/use-issuers";
import { useCluster } from "@/lib/solana/cluster-context";

interface IssuerCardProps {
  issuer: Issuer;
  hasAttestation?: boolean;
  isConnected?: boolean;
  onRequestAttestation?: (issuer: Issuer) => void;
  compact?: boolean;
}

const TYPE_ICONS: Record<number, typeof Shield> = {
  0: Shield,
  1: Fingerprint,
  2: Users,
  3: FileBadge,
  4: Settings,
};

export const IssuerCard: FC<IssuerCardProps> = ({
  issuer,
  hasAttestation = false,
  isConnected = false,
  onRequestAttestation,
  compact = false,
}) => {
  const { cluster } = useCluster();

  if (compact) {
    return (
      <Card className={`border-white/[0.04] bg-white/[0.015] transition-all hover:border-white/[0.08] ${
        hasAttestation ? "ring-1 ring-emerald-500/20" : ""
      }`}>
        <CardContent className="flex items-center gap-3 p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 ring-1 ring-sky-500/20">
            <Award className="h-4 w-4 text-sky-500" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium text-white">{issuer.name}</span>
              {hasAttestation && (
                <Badge variant="outline" className="shrink-0 border-emerald-500/20 bg-emerald-500/5 text-[10px] text-emerald-400">
                  <CheckCircle2 className="mr-1 h-3 w-3" /> Active
                </Badge>
              )}
            </div>
            <p className="truncate text-xs text-neutral-500">{issuer.description}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-white/[0.06] bg-white/[0.02] transition-all hover:border-white/[0.1] ${
      hasAttestation ? "ring-1 ring-emerald-500/20" : ""
    }`}>
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/10 ring-1 ring-sky-500/20">
              <Award className="h-5 w-5 text-sky-500" />
            </div>
            <div>
              <h3 className="font-semibold text-white">{issuer.name}</h3>
              <p className="text-xs text-neutral-500">{issuer.authority.toBase58().slice(0, 8)}...{issuer.authority.toBase58().slice(-6)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {issuer.isActive ? (
              <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-[10px]">
                <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" /> Active
              </Badge>
            ) : (
              <Badge variant="outline" className="border-red-500/20 bg-red-500/5 text-red-400 text-[10px]">
                Inactive
              </Badge>
            )}
            {hasAttestation && (
              <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-[10px]">
                <CheckCircle2 className="mr-1 h-3 w-3" /> Attested You
              </Badge>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="mt-3 text-sm text-neutral-400">{issuer.description}</p>

        {/* Attestation Types */}
        <div className="mt-4">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-neutral-500">Issues</p>
          <div className="flex flex-wrap gap-2">
            {issuer.attestationTypes.map((type) => {
              const Icon = TYPE_ICONS[type] || Shield;
              const style = getAttestationTypeColor(type);
              return (
                <Badge 
                  key={type} 
                  variant="outline" 
                  className={`gap-1 ${style} text-[10px]`}
                >
                  <Icon className="h-3 w-3" />
                  {getAttestationTypeName(type)}
                </Badge>
              );
            })}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-neutral-900/50 p-2.5 ring-1 ring-white/[0.04]">
            <p className="text-[10px] text-neutral-500">Default Weight</p>
            <p className="text-sm font-semibold text-white">+{issuer.defaultWeight} pts</p>
          </div>
          <div className="rounded-lg bg-neutral-900/50 p-2.5 ring-1 ring-white/[0.04]">
            <p className="text-[10px] text-neutral-500">Attestations</p>
            <p className="text-sm font-semibold text-white">{issuer.attestationCount.toLocaleString()}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center justify-between border-t border-white/[0.04] pt-4">
          <div className="flex items-center gap-1 text-[11px] text-neutral-600">
            <Clock className="h-3 w-3" />
            <span>Registered {new Date(issuer.createdAt * 1000).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-xs text-neutral-500 hover:text-white"
              onClick={() => window.open(`https://explorer.solana.com/address/${issuer.pda.toBase58()}?cluster=${cluster}`, "_blank")}
            >
              <ExternalLink className="h-3 w-3" /> Explorer
            </Button>
            {isConnected && !hasAttestation && onRequestAttestation && (
              <Button
                size="sm"
                className="h-8 gap-1 bg-sky-600 text-xs hover:bg-sky-700"
                onClick={() => onRequestAttestation(issuer)}
              >
                <Shield className="h-3 w-3" /> Get Attestation
              </Button>
            )}
            {hasAttestation && (
              <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-[10px]">
                <CheckCircle2 className="mr-1 h-3 w-3" /> Attested
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default IssuerCard;
