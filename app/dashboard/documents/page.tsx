"use client";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCluster } from "@/lib/solana/cluster-context";
import { getProgramId } from "@/lib/programs";
import { FileText, Wallet, ExternalLink, Pen, Search, Shield } from "lucide-react";

const fadeUp = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };

export default function DocumentsPage() {
  const { connected } = useWallet();
  const { setVisible } = useWalletModal();
  const { cluster } = useCluster();
  let docAddr = ""; try { docAddr = getProgramId(cluster, "documentRegistry").toBase58(); } catch {}

  if (!connected) {
    return (<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-rose-500/10 ring-1 ring-rose-500/20"><FileText className="h-8 w-8 text-rose-500" /></div>
      <h2 className="mb-2 text-xl font-bold text-white">Connect Your Wallet</h2>
      <p className="mb-6 max-w-sm text-sm text-neutral-500">Connect a wallet to sign and verify documents on-chain.</p>
      <Button onClick={() => setVisible(true)} className="gap-2 bg-rose-600 hover:bg-rose-700"><Wallet className="h-4 w-4" /> Connect Wallet</Button>
    </motion.div>);
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={fadeUp}><h2 className="text-xl font-bold text-white">Document Registry</h2><p className="text-sm text-neutral-500">On-chain document signing, verification, and attestation</p></motion.div>
      <motion.div variants={fadeUp}>
        <Card className="border-rose-500/10 bg-rose-500/[0.02]"><CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 ring-1 ring-rose-500/20"><FileText className="h-7 w-7 text-rose-500" /></div>
            <div className="flex-1"><h3 className="text-lg font-semibold text-white">Document Registry</h3><p className="text-sm text-neutral-500">Sign documents on-chain with your wallet. Every signature creates an immutable record tied to your human profile.</p></div>
            <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/5 text-emerald-400"><span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" /> Live</Badge>
          </div>
        </CardContent></Card>
      </motion.div>
      <motion.div variants={fadeUp} className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { icon: Pen, title: "Sign Document", desc: "Create a document hash and sign on-chain", bg: "bg-rose-500/10 ring-rose-500/20", color: "text-rose-500" },
          { icon: Search, title: "Verify Signature", desc: "Look up any document hash and verify signer", bg: "bg-sky-500/10 ring-sky-500/20", color: "text-sky-500" },
          { icon: Shield, title: "Multi-Sig Support", desc: "Multiple signers can attest to the same document", bg: "bg-violet-500/10 ring-violet-500/20", color: "text-violet-500" },
        ].map((f) => (
          <Card key={f.title} className="border-white/[0.04] bg-white/[0.015]"><CardContent className="p-5">
            <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ring-1 ${f.bg}`}><f.icon className={`h-5 w-5 ${f.color}`} /></div>
            <h4 className="text-sm font-semibold text-white">{f.title}</h4><p className="mt-1 text-xs text-neutral-500">{f.desc}</p>
          </CardContent></Card>
        ))}
      </motion.div>
      {docAddr && <motion.div variants={fadeUp} className="flex justify-center">
        <Button variant="ghost" size="sm" className="gap-2 text-neutral-600 hover:text-neutral-300" onClick={() => window.open(`https://explorer.solana.com/address/${docAddr}?cluster=${cluster}`, "_blank")}><ExternalLink className="h-3.5 w-3.5" /> View Document Registry on Explorer</Button>
      </motion.div>}
    </motion.div>
  );
}
