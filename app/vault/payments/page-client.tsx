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
import { getProgramId } from "@/lib/programs";
import Link from "next/link";
import { 
  Zap, Wallet, ExternalLink, FileText, Clock, Shield, 
  Plus, ArrowRight, Receipt, CheckCircle2, Loader2, 
  TrendingUp, AlertCircle
} from "lucide-react";

const fadeUp = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };

// Invoice discriminator
const INVOICE_DISCRIMINATOR = Buffer.from([173, 58, 222, 166, 125, 132, 62, 52]);

interface Invoice {
  pda: PublicKey;
  merchant: PublicKey;
  amount: bigint;
  paidAmount: bigint;
  status: "pending" | "paid" | "cancelled" | "withdrawn";
  createdAt: number;
  memo: string;
}

function parseInvoice(data: Buffer, pda: PublicKey): Invoice | null {
  try {
    if (!data.slice(0, 8).equals(INVOICE_DISCRIMINATOR)) return null;
    let offset = 8;
    
    const merchant = new PublicKey(data.slice(offset, offset + 32));
    offset += 32 + 32; // Skip merchant + mint
    const amount = data.readBigUInt64LE(offset);
    offset += 8;
    const paidAmount = data.readBigUInt64LE(offset);
    offset += 8 + 2; // Skip paidAmount + humanRequirements
    const createdAt = Number(data.readBigInt64LE(offset));
    offset += 8 + 8 + 8 + 1; // Skip timestamps + status
    
    // Parse memo
    const memoBytes = data.slice(offset, offset + 32);
    const nullIndex = memoBytes.indexOf(0);
    const memo = Buffer.from(memoBytes.slice(0, nullIndex === -1 ? 32 : nullIndex)).toString("utf-8");
    
    const statusByte = data[offset - 1];
    const status = statusByte === 0 ? "pending" : statusByte === 1 ? "paid" : statusByte === 2 ? "cancelled" : "withdrawn";
    
    return { pda, merchant, amount, paidAmount, status, createdAt, memo };
  } catch {
    return null;
  }
}

function formatAmount(amount: bigint): string {
  return (Number(amount) / 1e9).toFixed(4);
}

export default function PaymentsPage() {
  const { connected, publicKey } = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();
  const { cluster } = useCluster();
  
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    paid: 0,
    totalValue: BigInt(0),
    myInvoices: 0,
  });

  const fetchInvoices = useCallback(async () => {
    if (!connection) return;
    setLoading(true);
    
    try {
      const programId = getProgramId(cluster, "humanPay");
      const accounts = await connection.getProgramAccounts(programId);
      
      const allInvoices: Invoice[] = [];
      let totalValue = BigInt(0);
      let myCount = 0;
      
      for (const { pubkey, account } of accounts) {
        const invoice = parseInvoice(account.data as Buffer, pubkey);
        if (invoice) {
          allInvoices.push(invoice);
          totalValue += invoice.amount;
          if (publicKey && invoice.merchant.equals(publicKey)) {
            myCount++;
          }
        }
      }
      
      allInvoices.sort((a, b) => b.createdAt - a.createdAt);
      
      setInvoices(allInvoices.slice(0, 5)); // Last 5
      setStats({
        total: allInvoices.length,
        pending: allInvoices.filter(i => i.status === "pending").length,
        paid: allInvoices.filter(i => i.status === "paid").length,
        totalValue,
        myInvoices: myCount,
      });
    } catch (err) {
      console.error("Failed to fetch invoices:", err);
    } finally {
      setLoading(false);
    }
  }, [connection, publicKey, cluster]);

  useEffect(() => {
    if (connected) fetchInvoices();
  }, [connected, fetchInvoices]);

  if (!connected) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-500/10 ring-1 ring-amber-500/20">
          <Zap className="h-8 w-8 text-amber-500" />
        </div>
        <h2 className="mb-2 text-xl font-bold text-white">Connect Your Wallet</h2>
        <p className="mb-6 max-w-sm text-sm text-neutral-500">Connect a wallet to use HumanPay escrow invoices.</p>
        <Button onClick={() => setVisible(true)} className="gap-2 bg-amber-600 hover:bg-amber-700">
          <Wallet className="h-4 w-4" /> Connect Wallet
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">HumanPay</h2>
          <p className="text-sm text-neutral-500">Escrow-based invoices and agent payment processing</p>
        </div>
        <Link href="/rails/humanpay">
          <Button variant="outline" size="sm" className="gap-2 border-amber-500/20 bg-amber-500/5 text-amber-400 hover:bg-amber-500/10">
            Open Full HumanPay <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </motion.div>

      {/* Stats */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="border-white/[0.04] bg-white/[0.015]">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 ring-1 ring-amber-500/20">
              <Receipt className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">Total Invoices</p>
              {loading ? <Skeleton className="mt-1 h-5 w-10 bg-neutral-800" /> :
                <p className="text-lg font-bold text-white">{stats.total}</p>}
            </div>
          </CardContent>
        </Card>
        <Card className="border-white/[0.04] bg-white/[0.015]">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-yellow-500/10 ring-1 ring-yellow-500/20">
              <Clock className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">Pending</p>
              {loading ? <Skeleton className="mt-1 h-5 w-10 bg-neutral-800" /> :
                <p className="text-lg font-bold text-white">{stats.pending}</p>}
            </div>
          </CardContent>
        </Card>
        <Card className="border-white/[0.04] bg-white/[0.015]">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/20">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">Paid</p>
              {loading ? <Skeleton className="mt-1 h-5 w-10 bg-neutral-800" /> :
                <p className="text-lg font-bold text-white">{stats.paid}</p>}
            </div>
          </CardContent>
        </Card>
        <Card className="border-white/[0.04] bg-white/[0.015]">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 ring-1 ring-violet-500/20">
              <TrendingUp className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">Total Value</p>
              {loading ? <Skeleton className="mt-1 h-5 w-16 bg-neutral-800" /> :
                <p className="text-lg font-bold text-white">{formatAmount(stats.totalValue)} <span className="text-xs text-neutral-500">tokens</span></p>}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={fadeUp}>
        <Card className="border-amber-500/10 bg-amber-500/[0.02]">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 ring-1 ring-amber-500/20">
                  <Zap className="h-7 w-7 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Payment Rails</h3>
                  <p className="text-sm text-neutral-500">Create invoices, process payments, and manage escrow</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href="/rails/humanpay">
                  <Button size="sm" className="gap-2 bg-amber-600 hover:bg-amber-700">
                    <Plus className="h-4 w-4" /> Create Invoice
                  </Button>
                </Link>
                <Link href="/rails/humanpay">
                  <Button variant="outline" size="sm" className="gap-2 border-neutral-700">
                    <Shield className="h-4 w-4" /> Pay Invoice
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Invoices */}
      <motion.div variants={fadeUp}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Recent Invoices</h3>
          {stats.myInvoices > 0 && (
            <Badge variant="outline" className="border-amber-500/20 text-amber-400 text-[10px]">
              {stats.myInvoices} from you
            </Badge>
          )}
        </div>
        
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl bg-neutral-900" />
            ))}
          </div>
        ) : invoices.length === 0 ? (
          <Card className="border-white/[0.04] bg-white/[0.015]">
            <CardContent className="flex flex-col items-center py-10 text-center">
              <Receipt className="mb-3 h-10 w-10 text-neutral-700" />
              <p className="text-sm text-neutral-500">No invoices yet</p>
              <p className="mt-1 text-xs text-neutral-600">Create your first invoice in the full HumanPay interface</p>
              <Link href="/rails/humanpay" className="mt-4">
                <Button variant="outline" size="sm" className="gap-2">
                  Go to HumanPay <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {invoices.map((invoice) => (
              <Card key={invoice.pda.toBase58()} className="border-white/[0.04] bg-white/[0.015] transition-all hover:border-white/[0.08]">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    invoice.status === "pending" ? "bg-yellow-500/10 text-yellow-500" :
                    invoice.status === "paid" ? "bg-emerald-500/10 text-emerald-500" :
                    "bg-neutral-800 text-neutral-500"
                  }`}>
                    {invoice.status === "pending" ? <Clock className="h-5 w-5" /> :
                     invoice.status === "paid" ? <CheckCircle2 className="h-5 w-5" /> :
                     <AlertCircle className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{formatAmount(invoice.amount)} tokens</span>
                      <Badge variant="outline" className={`text-[10px] ${
                        invoice.status === "pending" ? "border-yellow-500/20 text-yellow-400" :
                        invoice.status === "paid" ? "border-emerald-500/20 text-emerald-400" :
                        "border-neutral-700 text-neutral-500"
                      }`}>
                        {invoice.status}
                      </Badge>
                      {publicKey && invoice.merchant.equals(publicKey) && (
                        <Badge variant="outline" className="border-amber-500/20 text-amber-400 text-[10px]">Yours</Badge>
                      )}
                    </div>
                    <p className="truncate text-xs text-neutral-500">{invoice.memo || "No memo"}</p>
                    <p className="text-[10px] text-neutral-600">
                      {new Date(invoice.createdAt * 1000).toLocaleDateString()}
                    </p>
                  </div>
                  <Link href={`/rails/humanpay`}>
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
          { icon: FileText, title: "Create Invoice", desc: "Generate escrow-backed invoices with PDA authority", bg: "bg-amber-500/10 ring-amber-500/20", color: "text-amber-500" },
          { icon: Shield, title: "Pay Invoice", desc: "Agent payments with capability-checked authorization", bg: "bg-emerald-500/10 ring-emerald-500/20", color: "text-emerald-500" },
          { icon: Clock, title: "Manage Escrow", desc: "Built-in dispute resolution and withdrawal", bg: "bg-rose-500/10 ring-rose-500/20", color: "text-rose-500" },
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
