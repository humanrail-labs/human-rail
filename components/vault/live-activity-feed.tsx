"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useReceipts, getActionTypeName } from "@/lib/hooks/use-receipts";
import { useAgents } from "@/lib/hooks/use-agents";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCluster } from "@/lib/solana/cluster-context";
import {
  Wallet, Zap, Shield, Bot, FileText, Receipt, Activity, ArrowRight, ExternalLink, Copy, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

const ACTION_ICONS: Record<number, typeof Activity> = {
  0: Wallet, 1: Zap, 2: Shield, 3: Shield, 4: Bot, 5: FileText, 6: Receipt, 7: Activity,
};

const ACTION_COLORS: Record<number, string> = {
  0: "text-sky-400",
  1: "text-amber-400",
  2: "text-violet-400",
  3: "text-violet-400",
  4: "text-emerald-400",
  5: "text-rose-400",
  6: "text-teal-400",
  7: "text-neutral-400",
};

function formatRelativeTime(timestampSec: number): string {
  const diff = Math.floor((Date.now() - timestampSec * 1000) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setOk(true); toast.success("Copied!"); setTimeout(() => setOk(false), 1200); }}
      className="text-neutral-600 transition-colors hover:text-neutral-400">
      {ok ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

export function LiveActivityFeed() {
  const { receipts, loading, refetch } = useReceipts();
  const { agents } = useAgents();
  const { cluster } = useCluster();
  const [lastCount, setLastCount] = useState(0);

  // Poll every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 10000);
    return () => clearInterval(interval);
  }, [refetch]);

  // Detect new entries and animate them in
  useEffect(() => {
    if (receipts.length > lastCount && lastCount > 0) {
      // New entries arrived
    }
    setLastCount(receipts.length);
  }, [receipts.length, lastCount]);

  const agentNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const agent of agents) {
      map.set(agent.pda.toBase58(), agent.name || "Unnamed Agent");
    }
    return map;
  }, [agents]);

  const recentReceipts = useMemo(() => receipts.slice(0, 20), [receipts]);

  if (loading && receipts.length === 0) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl bg-neutral-900" />
        ))}
      </div>
    );
  }

  if (recentReceipts.length === 0) {
    return (
      <Card className="border-white/[0.04] bg-white/[0.015]">
        <CardContent className="flex flex-col items-center py-10 text-center">
          <Receipt className="mb-3 h-10 w-10 text-neutral-700" />
          <p className="text-sm text-neutral-500">No activity yet</p>
          <p className="mt-1 text-xs text-neutral-600">Receipts will appear here once your agents start transacting.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <AnimatePresence initial={false}>
        {recentReceipts.map((receipt, index) => {
          const agentName = agentNameMap.get(receipt.agentId.toBase58()) || "Unknown Agent";
          const actionLabel = getActionTypeName(receipt.actionType);
          const ActionIcon = ACTION_ICONS[receipt.actionType] || Activity;
          const actionColor = ACTION_COLORS[receipt.actionType] || ACTION_COLORS[7];
          const valueSol = receipt.value ? (Number(receipt.value) / 1e9).toFixed(4) : "0";
          const pdaAddr = receipt.pda.toBase58();
          const isNew = index === 0 && receipts.length > lastCount;

          return (
            <motion.div
              key={pdaAddr}
              initial={isNew ? { opacity: 0, y: -16, scale: 0.98 } : { opacity: 1, y: 0 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              <Card className="border-white/[0.04] bg-white/[0.015] transition-all hover:border-white/[0.08]">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-900 ring-1 ring-white/[0.04]`}>
                    <ActionIcon className={`h-5 w-5 ${actionColor}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-white">{actionLabel}</span>
                      <span className="text-xs text-sky-400">{agentName}</span>
                      {receipt.value > BigInt(0) && (
                        <Badge variant="outline" className="border-amber-500/20 bg-amber-500/5 text-[10px] text-amber-400">
                          {valueSol} SOL
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-500">
                      {formatRelativeTime(receipt.timestamp)} · Seq #{receipt.sequence.toString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <CopyBtn text={pdaAddr} />
                    <a
                      href={`https://explorer.solana.com/address/${pdaAddr}?cluster=${cluster}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neutral-700 transition-colors hover:text-emerald-500"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>

      <div className="flex justify-center">
        <Link href="/vault/activity">
          <Button variant="ghost" size="sm" className="gap-1 text-neutral-400 hover:text-white">
            View all activity <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
