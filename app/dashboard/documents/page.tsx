"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { motion } from "framer-motion";
import { PublicKey } from "@solana/web3.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCluster } from "@/lib/solana/cluster-context";
import { useDocumentRegistry } from "@/lib/hooks/use-document-registry";
import Link from "next/link";
import { 
  FileText, Wallet, ExternalLink, Pen, Search, Shield, 
  Plus, ArrowRight, FileCheck, Clock, Hash, Loader2,
  Users, AlertCircle
} from "lucide-react";

const fadeUp = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };

interface DocumentSummary {
  total: number;
  myDocuments: number;
  signatures: number;
  mySignatures: number;
}

export default function DocumentsPage() {
  const { connected, publicKey } = useWallet();
  const { setVisible } = useWalletModal();
  const { cluster } = useCluster();
  const { documents, signatures, loading: dataLoading } = useDocumentRegistry();
  
  const [stats, setStats] = useState<DocumentSummary>({
    total: 0,
    myDocuments: 0,
    signatures: 0,
    mySignatures: 0,
  });

  useEffect(() => {
    if (documents && signatures && publicKey) {
      const myDocs = documents.filter(d => d.creator.equals(publicKey));
      const mySigs = signatures.filter(s => s.signerPubkey.equals(publicKey));
      
      setStats({
        total: documents.length,
        myDocuments: myDocs.length,
        signatures: signatures.length,
        mySignatures: mySigs.length,
      });
    }
  }, [documents, signatures, publicKey]);

  if (!connected) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-rose-500/10 ring-1 ring-rose-500/20">
          <FileText className="h-8 w-8 text-rose-500" />
        </div>
        <h2 className="mb-2 text-xl font-bold text-white">Connect Your Wallet</h2>
        <p className="mb-6 max-w-sm text-sm text-neutral-500">Connect a wallet to sign and verify documents on-chain.</p>
        <Button onClick={() => setVisible(true)} className="gap-2 bg-rose-600 hover:bg-rose-700">
          <Wallet className="h-4 w-4" /> Connect Wallet
        </Button>
      </motion.div>
    );
  }

  const loading = dataLoading;

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Document Registry</h2>
          <p className="text-sm text-neutral-500">On-chain document signing, verification, and attestation</p>
        </div>
        <Link href="/rails/documents">
          <Button variant="outline" size="sm" className="gap-2 border-rose-500/20 bg-rose-500/5 text-rose-400 hover:bg-rose-500/10">
            Open Full Registry <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </motion.div>

      {/* Stats */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="border-white/[0.04] bg-white/[0.015]">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 ring-1 ring-rose-500/20">
              <FileText className="h-5 w-5 text-rose-500" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">Documents</p>
              {loading ? <Skeleton className="mt-1 h-5 w-10 bg-neutral-800" /> :
                <p className="text-lg font-bold text-white">{stats.total}</p>}
            </div>
          </CardContent>
        </Card>
        <Card className="border-white/[0.04] bg-white/[0.015]">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 ring-1 ring-sky-500/20">
              <FileCheck className="h-5 w-5 text-sky-500" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">Your Docs</p>
              {loading ? <Skeleton className="mt-1 h-5 w-10 bg-neutral-800" /> :
                <p className="text-lg font-bold text-white">{stats.myDocuments}</p>}
            </div>
          </CardContent>
        </Card>
        <Card className="border-white/[0.04] bg-white/[0.015]">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 ring-1 ring-violet-500/20">
              <Pen className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">Signatures</p>
              {loading ? <Skeleton className="mt-1 h-5 w-10 bg-neutral-800" /> :
                <p className="text-lg font-bold text-white">{stats.signatures}</p>}
            </div>
          </CardContent>
        </Card>
        <Card className="border-white/[0.04] bg-white/[0.015]">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/20">
              <Users className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">Your Sigs</p>
              {loading ? <Skeleton className="mt-1 h-5 w-10 bg-neutral-800" /> :
                <p className="text-lg font-bold text-white">{stats.mySignatures}</p>}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={fadeUp}>
        <Card className="border-rose-500/10 bg-rose-500/[0.02]">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 ring-1 ring-rose-500/20">
                  <FileText className="h-7 w-7 text-rose-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Document Registry</h3>
                  <p className="text-sm text-neutral-500">Sign documents on-chain with immutable records</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href="/rails/documents">
                  <Button size="sm" className="gap-2 bg-rose-600 hover:bg-rose-700">
                    <Plus className="h-4 w-4" /> Sign Document
                  </Button>
                </Link>
                <Link href="/rails/documents">
                  <Button variant="outline" size="sm" className="gap-2 border-neutral-700">
                    <Search className="h-4 w-4" /> Verify
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Documents */}
      <motion.div variants={fadeUp}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Recent Documents</h3>
          {stats.myDocuments > 0 && (
            <Badge variant="outline" className="border-rose-500/20 text-rose-400 text-[10px]">
              {stats.myDocuments} created by you
            </Badge>
          )}
        </div>
        
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl bg-neutral-900" />
            ))}
          </div>
        ) : !documents || documents.length === 0 ? (
          <Card className="border-white/[0.04] bg-white/[0.015]">
            <CardContent className="flex flex-col items-center py-10 text-center">
              <FileText className="mb-3 h-10 w-10 text-neutral-700" />
              <p className="text-sm text-neutral-500">No documents yet</p>
              <p className="mt-1 text-xs text-neutral-600">Sign your first document in the full Document Registry</p>
              <Link href="/rails/documents" className="mt-4">
                <Button variant="outline" size="sm" className="gap-2">
                  Go to Document Registry <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {documents.slice(0, 5).map((doc) => (
              <Card key={doc.pubkey.toBase58()} className="border-white/[0.04] bg-white/[0.015] transition-all hover:border-white/[0.08]">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500">
                    <Hash className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white truncate">{doc.docHashHex.slice(0, 16)}...</span>
                      <Badge variant="outline" className={`text-[10px] ${
                        doc.status === "Active" ? "border-emerald-500/20 text-emerald-400" :
                        doc.status === "Draft" ? "border-yellow-500/20 text-yellow-400" :
                        "border-neutral-700 text-neutral-500"
                      }`}>
                        {doc.status}
                      </Badge>
                      {publicKey && doc.creator.equals(publicKey) && (
                        <Badge variant="outline" className="border-rose-500/20 text-rose-400 text-[10px]">Yours</Badge>
                      )}
                    </div>
                    <p className="text-xs text-neutral-500">Schema: {doc.schema}</p>
                    <p className="text-[10px] text-neutral-600">
                      {doc.signatureCount} signature{doc.signatureCount !== 1 ? 's' : ''} • Created {new Date(doc.createdAt * 1000).toLocaleDateString()}
                    </p>
                  </div>
                  <Link href={`/rails/documents`}>
                    <Button variant="ghost" size="sm" className="gap-1 text-neutral-500 hover:text-white">
                      View <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </motion.div>

      {/* Features */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { icon: Pen, title: "Sign Document", desc: "Create a document hash and sign on-chain", bg: "bg-rose-500/10 ring-rose-500/20", color: "text-rose-500" },
          { icon: Search, title: "Verify Signature", desc: "Look up any document hash and verify signer", bg: "bg-sky-500/10 ring-sky-500/20", color: "text-sky-500" },
          { icon: Shield, title: "Multi-Sig Support", desc: "Multiple signers can attest to the same document", bg: "bg-violet-500/10 ring-violet-500/20", color: "text-violet-500" },
        ].map((f) => (
          <Card key={f.title} className="border-white/[0.04] bg-white/[0.015]">
            <CardContent className="p-5">
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ring-1 ${f.bg}`}>
                <f.icon className={`h-5 w-5 ${f.color}`} />
              </div>
              <h4 className="text-sm font-semibold text-white">{f.title}</h4>
              <p className="mt-1 text-xs text-neutral-500">{f.desc}</p>
            </CardContent>
          </Card>
        ))}
      </motion.div>
    </motion.div>
  );
}
