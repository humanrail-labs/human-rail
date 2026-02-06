"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { motion } from "framer-motion";
import { useCluster } from "@/lib/solana/cluster-context";
import { useReceipts } from "@/lib/hooks/use-receipts";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Receipt, Wallet, ExternalLink, RefreshCw, User, Bot, Clock, Copy, CheckCircle2 } from "lucide-react";

const fadeUp = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.04 } } };
function CopyBtn({ text }: { text: string }) { const [ok, setOk] = useState(false); return (<button onClick={() => { navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1200); }} className="text-neutral-600 transition-colors hover:text-neutral-400">{ok ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}</button>); }

const ACTION_LABELS: Record<number, string> = {
  0: "Payment", 1: "Transfer", 2: "Invoice", 3: "Delegation", 4: "Document", 5: "Attestation",
};

export default function ReceiptsPage() {
  const { connected } = useWallet();
  const { setVisible } = useWalletModal();
  const { cluster } = useCluster();
  const { receipts, loading, error, refetch } = useReceipts();

  if (!connected) {
    return (<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-teal-500/10 ring-1 ring-teal-500/20"><Receipt className="h-8 w-8 text-teal-500" /></div>
      <h2 className="mb-2 text-xl font-bold text-white">Connect Your Wallet</h2>
      <p className="mb-6 max-w-sm text-sm text-neutral-500">Connect a wallet to view your audit trail.</p>
      <Button onClick={() => setVisible(true)} className="gap-2 bg-teal-600 hover:bg-teal-700"><Wallet className="h-4 w-4" /> Connect Wallet</Button>
    </motion.div>);
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-white">Receipts & Audit Trail</h2><p className="text-sm text-neutral-500">Immutable on-chain record of all protocol actions</p></div>
        <Button variant="ghost" size="sm" onClick={refetch} disabled={loading} className="text-neutral-500"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></Button>
      </motion.div>

      {loading && <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl bg-neutral-900" />)}</div>}

      {!loading && receipts.length === 0 && (
        <motion.div variants={fadeUp}><Card className="border-white/[0.04] bg-white/[0.015]"><CardContent className="flex flex-col items-center py-14 text-center">
          <Receipt className="mb-4 h-12 w-12 text-neutral-700" /><p className="text-sm font-medium text-neutral-400">No receipts found</p>
          <p className="mt-1 text-xs text-neutral-600">Receipts are generated automatically when you interact with HumanRail protocols.</p>
        </CardContent></Card></motion.div>
      )}

      {!loading && receipts.length > 0 && (
        <motion.div variants={fadeUp}>
          <Card className="border-white/[0.04] bg-white/[0.015]">
            <CardContent className="divide-y divide-white/[0.04] p-0">
              {receipts.map((receipt, idx) => {
                const principalAddr = receipt.principalId?.toBase58() ?? "";
                const agentAddr = receipt.agentId?.toBase58() ?? "";
                const pdaAddr = receipt.pda?.toBase58() ?? `receipt-${idx}`;
                const actionLabel = ACTION_LABELS[receipt.actionType] ?? `Action #${receipt.actionType}`;
                const valueSol = receipt.value ? (Number(receipt.value) / 1e9).toFixed(4) : "0";

                return (
                  <div key={pdaAddr} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.02]">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-500/10">
                      <Receipt className="h-4 w-4 text-teal-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-neutral-300">{actionLabel}</span>
                        {receipt.value > BigInt(0) && (
                          <Badge variant="outline" className="border-white/[0.06] text-[10px] text-neutral-500">
                            {valueSol} SOL
                          </Badge>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-3 text-[11px]">
                        <span className="flex items-center gap-1 text-neutral-600">
                          <User className="h-3 w-3" /> {principalAddr.slice(0, 6)}…{principalAddr.slice(-4)}
                        </span>
                        <span className="flex items-center gap-1 text-neutral-600">
                          <Bot className="h-3 w-3" /> {agentAddr.slice(0, 6)}…{agentAddr.slice(-4)}
                        </span>
                        {receipt.timestamp > 0 && (
                          <span className="flex items-center gap-1 text-neutral-700">
                            <Clock className="h-3 w-3" /> {new Date(receipt.timestamp * 1000).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <CopyBtn text={pdaAddr} />
                      <a href={`https://explorer.solana.com/address/${pdaAddr}?cluster=${cluster}`} target="_blank" rel="noopener noreferrer"
                        className="text-neutral-700 transition-colors hover:text-teal-400">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </motion.div>
      )}
      {error && <Card className="border-red-500/20 bg-red-500/5"><CardContent className="p-4"><p className="text-sm text-red-400">{error}</p></CardContent></Card>}
    </motion.div>
  );
}
