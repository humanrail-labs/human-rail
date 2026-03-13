"use client";

import { useState, useMemo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { motion } from "framer-motion";
import { useCluster } from "@/lib/solana/cluster-context";
import { useReceipts, type ActionReceipt } from "@/lib/hooks/use-receipts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Receipt, Wallet, ExternalLink, RefreshCw, User, Bot, Clock, 
  Copy, CheckCircle2, Download, Filter, Calendar, Zap, FileText, 
  Shield, ArrowRightLeft, StickyNote, X
} from "lucide-react";
import { toast } from "sonner";

const fadeUp = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.04 } } };

function CopyBtn({ text }: { text: string }) { 
  const [ok, setOk] = useState(false); 
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setOk(true); toast.success("Copied!"); setTimeout(() => setOk(false), 1200); }} className="text-neutral-600 transition-colors hover:text-neutral-400">
      {ok ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
    </button>
  ); 
}

const ACTION_ICONS: Record<number, typeof Receipt> = {
  0: ArrowRightLeft, // Transfer
  1: Zap, // Swap
  2: Shield, // Stake
  3: Shield, // Unstake
  4: Bot, // Task Response
  5: FileText, // Document Sign
  6: Receipt, // Payment
  7: StickyNote, // Custom
};

const ACTION_COLORS: Record<number, string> = {
  0: "text-sky-400 bg-sky-500/10",
  1: "text-amber-400 bg-amber-500/10",
  2: "text-violet-400 bg-violet-500/10",
  3: "text-violet-400 bg-violet-500/10",
  4: "text-emerald-400 bg-emerald-500/10",
  5: "text-rose-400 bg-rose-500/10",
  6: "text-teal-400 bg-teal-500/10",
  7: "text-neutral-400 bg-neutral-500/10",
};

function exportToCSV(receipts: ActionReceipt[], cluster: string) {
  const headers = [
    "Timestamp", "Action Type", "Principal", "Agent", "Capability", 
    "Value (SOL)", "Destination", "Slot", "Sequence", "PDA"
  ];
  
  const rows = receipts.map(r => [
    new Date(r.timestamp * 1000).toISOString(),
    r.actionType,
    r.principalId.toBase58(),
    r.agentId.toBase58(),
    r.capabilityId.toBase58(),
    (Number(r.value) / 1e9).toFixed(9),
    r.destination.toBase58(),
    r.slot.toString(),
    r.sequence.toString(),
    r.pda.toBase58(),
  ]);
  
  const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `humanrail-receipts-${cluster}-${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast.success("Receipts exported to CSV");
}

export default function ReceiptsPage() {
  const { connected } = useWallet();
  const { setVisible } = useWalletModal();
  const { cluster } = useCluster();
  const { receipts, loading, error, stats, refetch, getActionTypeName } = useReceipts();
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedActionType, setSelectedActionType] = useState<number | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Filtered receipts
  const filteredReceipts = useMemo(() => {
    return receipts.filter(r => {
      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches = 
          r.pda.toBase58().toLowerCase().includes(q) ||
          r.agentId.toBase58().toLowerCase().includes(q) ||
          r.principalId.toBase58().toLowerCase().includes(q) ||
          r.capabilityId.toBase58().toLowerCase().includes(q) ||
          getActionTypeName(r.actionType).toLowerCase().includes(q);
        if (!matches) return false;
      }
      
      // Action type filter
      if (selectedActionType !== null && r.actionType !== selectedActionType) return false;
      
      // Date range filter
      if (dateFrom && r.timestamp < new Date(dateFrom).getTime() / 1000) return false;
      if (dateTo && r.timestamp > new Date(dateTo).getTime() / 1000) return false;
      
      return true;
    });
  }, [receipts, searchQuery, selectedActionType, dateFrom, dateTo, getActionTypeName]);

  // Available action types for filter
  const availableActionTypes = useMemo(() => {
    const types = new Set(receipts.map(r => r.actionType));
    return Array.from(types).sort();
  }, [receipts]);

  // Clear filters
  const clearFilters = () => {
    setSearchQuery("");
    setSelectedActionType(null);
    setDateFrom("");
    setDateTo("");
  };

  const hasActiveFilters = searchQuery || selectedActionType !== null || dateFrom || dateTo;

  if (!connected) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-teal-500/10 ring-1 ring-teal-500/20">
          <Receipt className="h-8 w-8 text-teal-500" />
        </div>
        <h2 className="mb-2 text-xl font-bold text-white">Connect Your Wallet</h2>
        <p className="mb-6 max-w-sm text-sm text-neutral-500">Connect a wallet to view your audit trail.</p>
        <Button onClick={() => setVisible(true)} className="gap-2 bg-teal-600 hover:bg-teal-700">
          <Wallet className="h-4 w-4" /> Connect Wallet
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Receipts & Audit Trail</h2>
          <p className="text-sm text-neutral-500">Immutable on-chain record of all protocol actions</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-2 border-neutral-700 bg-neutral-900">
            <Filter className="h-4 w-4" /> Filters {hasActiveFilters && <Badge variant="secondary" className="ml-1 bg-teal-500/20 text-teal-400">On</Badge>}
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportToCSV(filteredReceipts, cluster)} disabled={filteredReceipts.length === 0} className="gap-2 border-neutral-700 bg-neutral-900">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button variant="ghost" size="sm" onClick={refetch} disabled={loading} className="text-neutral-500">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      {!loading && receipts.length > 0 && (
        <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Card className="border-white/[0.04] bg-white/[0.015]">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-500/10 ring-1 ring-teal-500/20">
                <Receipt className="h-5 w-5 text-teal-500" />
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">Total Receipts</p>
                <p className="text-lg font-bold text-white">{stats.totalReceipts}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-white/[0.04] bg-white/[0.015]">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 ring-1 ring-amber-500/20">
                <Zap className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">Total Value</p>
                <p className="text-lg font-bold text-white">{(Number(stats.totalValue) / 1e9).toFixed(3)} SOL</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-white/[0.04] bg-white/[0.015]">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 ring-1 ring-sky-500/20">
                <Bot className="h-5 w-5 text-sky-500" />
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">Unique Agents</p>
                <p className="text-lg font-bold text-white">{stats.uniqueAgents}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-white/[0.04] bg-white/[0.015]">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 ring-1 ring-violet-500/20">
                <FileText className="h-5 w-5 text-violet-500" />
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">Action Types</p>
                <p className="text-lg font-bold text-white">{Object.keys(stats.actionTypes).length}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <motion.div variants={fadeUp}>
          <Card className="border-neutral-800 bg-neutral-900/50">
            <CardContent className="space-y-4 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Filter Receipts</h3>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 gap-1 text-xs text-neutral-500">
                    <X className="h-3 w-3" /> Clear
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-neutral-500">Search</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Address, PDA, action..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white placeholder:text-neutral-700 focus:border-teal-500/50 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-neutral-500">Action Type</label>
                  <select
                    value={selectedActionType ?? ""}
                    onChange={(e) => setSelectedActionType(e.target.value ? Number(e.target.value) : null)}
                    className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white focus:border-teal-500/50 focus:outline-none"
                  >
                    <option value="">All types</option>
                    {availableActionTypes.map(type => (
                      <option key={type} value={type}>{getActionTypeName(type)}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-neutral-500">From Date</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white focus:border-teal-500/50 focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-neutral-500">To Date</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white focus:border-teal-500/50 focus:outline-none"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Results Count */}
      {hasActiveFilters && !loading && (
        <motion.div variants={fadeUp} className="flex items-center gap-2 text-sm text-neutral-500">
          <Filter className="h-4 w-4" />
          Showing {filteredReceipts.length} of {receipts.length} receipts
        </motion.div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl bg-neutral-900" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && receipts.length === 0 && (
        <motion.div variants={fadeUp}>
          <Card className="border-white/[0.04] bg-white/[0.015]">
            <CardContent className="flex flex-col items-center py-14 text-center">
              <Receipt className="mb-4 h-12 w-12 text-neutral-700" />
              <p className="text-sm font-medium text-neutral-400">No receipts found</p>
              <p className="mt-1 text-xs text-neutral-600">Receipts are generated automatically when you interact with HumanRail protocols.</p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* No Filtered Results */}
      {!loading && receipts.length > 0 && filteredReceipts.length === 0 && (
        <motion.div variants={fadeUp}>
          <Card className="border-white/[0.04] bg-white/[0.015]">
            <CardContent className="flex flex-col items-center py-14 text-center">
              <Filter className="mb-4 h-12 w-12 text-neutral-700" />
              <p className="text-sm font-medium text-neutral-400">No receipts match your filters</p>
              <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4">
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Receipts List */}
      {!loading && filteredReceipts.length > 0 && (
        <motion.div variants={fadeUp} className="space-y-3">
          {filteredReceipts.map((receipt) => {
            const principalAddr = receipt.principalId.toBase58();
            const agentAddr = receipt.agentId.toBase58();
            const capAddr = receipt.capabilityId.toBase58();
            const pdaAddr = receipt.pda.toBase58();
            const actionLabel = getActionTypeName(receipt.actionType);
            const valueSol = receipt.value ? (Number(receipt.value) / 1e9).toFixed(4) : "0";
            const ActionIcon = ACTION_ICONS[receipt.actionType] || Receipt;
            const actionColor = ACTION_COLORS[receipt.actionType] || ACTION_COLORS[7];

            return (
              <Card key={pdaAddr} className="border-white/[0.04] bg-white/[0.015] transition-all hover:border-white/[0.08]">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${actionColor}`}>
                      <ActionIcon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-white">{actionLabel}</span>
                        {receipt.value > BigInt(0) && (
                          <Badge variant="outline" className="border-amber-500/20 bg-amber-500/5 text-[10px] text-amber-400">
                            {valueSol} SOL
                          </Badge>
                        )}
                        <Badge variant="outline" className="border-neutral-700 text-[10px] text-neutral-500">
                          Seq #{receipt.sequence.toString()}
                        </Badge>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] sm:grid-cols-4">
                        <div className="flex items-center gap-1.5">
                          <User className="h-3 w-3 text-neutral-600" />
                          <span className="text-neutral-500">Principal:</span>
                          <code className="text-neutral-400">{principalAddr.slice(0, 6)}…{principalAddr.slice(-4)}</code>
                          <CopyBtn text={principalAddr} />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Bot className="h-3 w-3 text-neutral-600" />
                          <span className="text-neutral-500">Agent:</span>
                          <code className="text-neutral-400">{agentAddr.slice(0, 6)}…{agentAddr.slice(-4)}</code>
                          <CopyBtn text={agentAddr} />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Shield className="h-3 w-3 text-neutral-600" />
                          <span className="text-neutral-500">Capability:</span>
                          <code className="text-neutral-400">{capAddr.slice(0, 6)}…{capAddr.slice(-4)}</code>
                          <CopyBtn text={capAddr} />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3 text-neutral-600" />
                          <span className="text-neutral-500">Time:</span>
                          <span className="text-neutral-400">{new Date(receipt.timestamp * 1000).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="mt-1 text-[10px] text-neutral-600">
                        Slot {receipt.slot.toString()} · PDA: {pdaAddr.slice(0, 8)}…{pdaAddr.slice(-6)}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <CopyBtn text={pdaAddr} />
                      <a 
                        href={`https://explorer.solana.com/address/${pdaAddr}?cluster=${cluster}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-neutral-700 transition-colors hover:text-teal-400"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </motion.div>
      )}

      {error && (
        <Card className="border-red-500/20 bg-red-500/5">
          <CardContent className="p-4">
            <p className="text-sm text-red-400">{error}</p>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
