"use client";

import { FC } from "react";
import { Shield, ShieldCheck, ShieldPlus, Loader2 } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const trustTierVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1",
  {
    variants: {
      tier: {
        0: "bg-neutral-500/10 text-neutral-400 ring-neutral-500/20",
        1: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
        2: "bg-violet-500/10 text-violet-400 ring-violet-500/20",
      },
    },
    defaultVariants: {
      tier: 0,
    },
  }
);

const trustTierIcons = {
  0: Shield,
  1: ShieldCheck,
  2: ShieldPlus,
};

const trustTierLabels = {
  0: "Basic",
  1: "Verified",
  2: "Trusted",
};

const trustTierDescriptions = {
  0: "Basic profile with wallet connection",
  1: "Identity verified through KYC or attestations",
  2: "Highly trusted identity with multiple verifications",
};

export interface TrustTierBadgeProps extends VariantProps<typeof trustTierVariants> {
  tier: 0 | 1 | 2;
  showLabel?: boolean;
  className?: string;
  loading?: boolean;
}

export const TrustTierBadge: FC<TrustTierBadgeProps> = ({
  tier,
  showLabel = true,
  className,
  loading = false,
}) => {
  const Icon = trustTierIcons[tier];

  if (loading) {
    return (
      <span className={cn(trustTierVariants({ tier: 0 }), "opacity-50", className)}>
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {showLabel && <span>Loading...</span>}
      </span>
    );
  }

  return (
    <span className={cn(trustTierVariants({ tier }), className)} title={trustTierDescriptions[tier]}>
      <Icon className="h-3.5 w-3.5" />
      {showLabel && <span>{trustTierLabels[tier]}</span>}
    </span>
  );
};

export default TrustTierBadge;

// ============================================================================
// TRUST TIER PROGRESS COMPONENT
// ============================================================================

export interface TrustTierProgressProps {
  progress: {
    hasProfile: boolean;
    hasKyc: boolean;
    attestationCount: number;
    uniqueIssuers: number;
  };
  currentTier: 0 | 1 | 2;
  className?: string;
}

export const TrustTierProgress: FC<TrustTierProgressProps> = ({
  progress,
  currentTier,
  className,
}) => {
  const requirements = [
    { label: "Profile Created", met: progress.hasProfile },
    { label: "KYC Verification", met: progress.hasKyc },
    { label: "2+ Attestations", met: progress.attestationCount >= 2 },
    { label: "3+ Unique Issuers", met: progress.uniqueIssuers >= 3 },
  ];

  // Calculate next tier requirements
  const getNextTierRequirements = () => {
    if (currentTier === 0) {
      if (progress.hasKyc) return [requirements[2]];
      if (progress.attestationCount >= 2) return [requirements[1]];
      return [requirements[1], requirements[2]];
    }
    if (currentTier === 1) {
      return [requirements[1], requirements[3]].filter(r => !r.met);
    }
    return [];
  };

  const nextRequirements = getNextTierRequirements();

  return (
    <div className={cn("space-y-4", className)}>
      {/* Current Tier */}
      <div className="flex items-center gap-3">
        <TrustTierBadge tier={currentTier} />
        <span className="text-sm text-neutral-500">
          {trustTierDescriptions[currentTier]}
        </span>
      </div>

      {/* Progress Checklist */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium uppercase tracking-wider text-neutral-500">
          Requirements
        </h4>
        <div className="space-y-1.5">
          {requirements.map((req) => (
            <div
              key={req.label}
              className={cn(
                "flex items-center gap-2 text-sm",
                req.met ? "text-emerald-400" : "text-neutral-500"
              )}
            >
              <span
                className={cn(
                  "flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold",
                  req.met
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-neutral-800 text-neutral-600"
                )}
              >
                {req.met ? "✓" : "○"}
              </span>
              {req.label}
            </div>
          ))}
        </div>
      </div>

      {/* Next Tier */}
      {nextRequirements.length > 0 && currentTier < 2 && (
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-3">
          <p className="text-xs text-neutral-500">
            To reach <span className="font-medium text-white">{trustTierLabels[(currentTier + 1) as 1 | 2]}</span>:
          </p>
          <ul className="mt-2 space-y-1">
            {nextRequirements.map((req) => (
              <li key={req.label} className="text-xs text-neutral-400">
                • Complete {req.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-2 gap-2 pt-2">
        <div className="rounded-lg bg-neutral-900/50 p-2 text-center">
          <p className="text-lg font-bold text-white">{progress.attestationCount}</p>
          <p className="text-[10px] uppercase tracking-wider text-neutral-500">Attestations</p>
        </div>
        <div className="rounded-lg bg-neutral-900/50 p-2 text-center">
          <p className="text-lg font-bold text-white">{progress.uniqueIssuers}</p>
          <p className="text-[10px] uppercase tracking-wider text-neutral-500">Unique Issuers</p>
        </div>
      </div>
    </div>
  );
};
