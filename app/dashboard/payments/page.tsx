"use client";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCluster } from "@/lib/solana/cluster-context";
import { getProgramId } from "@/lib/programs";
import { Zap, Wallet, ExternalLink, FileText, Clock, Shield } from "lucide-react";

const fadeUp = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };

export default function PaymentsPage() {
  const { connected } = useWallet();
  const { setVisible } = useWalletModal();
  const { cluster } = useCluster();
  let humanPayAddr = ""; try { humanPayAddr = getProgramId(cluster, "humanPay").toBase58(); } catch {}

  if (!connected) {
    return (<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-500/10 ring-1 ring-amber-500/20"><Zap className="h-8 w-8 text-amber-500" /></div>
      <h2 className="mb-2 text-xl font-bold text-white">Connect Your Wallet</h2>
      <p className="mb-6 max-w-sm text-sm text-neutral-500">Connect a wallet to use HumanPay escrow invoices.</p>
      <Button onClick={() => setVisible(true)} className="gap-2 bg-amber-600 hover:bg-amber-700"><Wallet className="h-4 w-4" /> Connect Wallet</Button>
    </motion.div>);
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={fadeUp}><h2 className="text-xl font-bold text-white">HumanPay</h2><p className="text-sm text-neutral-500">Escrow-based invoices and agent payment processing</p></motion.div>
      <motion.div variants={fadeUp}>
        <Card className="border-amber-500/10 bg-amber-500/[0.02]"><CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 ring-1 ring-amber-500/20"><Zap className="h-7 w-7 text-amber-500" /></div>
            <div className="flex-1"><h3 className="text-lg font-semibold text-white">Payment Rails</h3><p className="text-sm text-neutral-500">Create invoices, process agent payments through PDA-controlled escrow, and manage payment flows.</p></div>
            <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/5 text-emerald-400"><span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" /> Live</Badge>
          </div>
        </CardContent></Card>
      </motion.div>
      <motion.div variants={fadeUp} className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { icon: FileText, title: "Create Invoice", desc: "Generate escrow-backed invoices with PDA authority", bg: "bg-amber-500/10 ring-amber-500/20", color: "text-amber-500" },
          { icon: Shield, title: "Pay Invoice", desc: "Agent payments with capability-checked authorization", bg: "bg-emerald-500/10 ring-emerald-500/20", color: "text-emerald-500" },
          { icon: Clock, title: "Dispute & Refund", desc: "Built-in dispute resolution and refund mechanism", bg: "bg-rose-500/10 ring-rose-500/20", color: "text-rose-500" },
        ].map((f) => (
          <Card key={f.title} className="border-white/[0.04] bg-white/[0.015]"><CardContent className="p-5">
            <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ring-1 ${f.bg}`}><f.icon className={`h-5 w-5 ${f.color}`} /></div>
            <h4 className="text-sm font-semibold text-white">{f.title}</h4><p className="mt-1 text-xs text-neutral-500">{f.desc}</p>
          </CardContent></Card>
        ))}
      </motion.div>
      {humanPayAddr && <motion.div variants={fadeUp} className="flex justify-center">
        <Button variant="ghost" size="sm" className="gap-2 text-neutral-600 hover:text-neutral-300" onClick={() => window.open(`https://explorer.solana.com/address/${humanPayAddr}?cluster=${cluster}`, "_blank")}><ExternalLink className="h-3.5 w-3.5" /> View HumanPay Program on Explorer</Button>
      </motion.div>}
    </motion.div>
  );
}
