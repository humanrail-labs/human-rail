"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useCluster } from "@/lib/solana/cluster-context";
import { useHumanProfile } from "@/lib/hooks/use-human-profile";
import { Zap, Plus, RefreshCw, CheckCircle2, Clock, Wallet, AlertTriangle, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function HumanPayPage() {
  const { connected } = useWallet();
  const { cluster } = useCluster();
  const { hasProfile } = useHumanProfile();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [invoiceAmount, setInvoiceAmount] = useState("1");
  const [invoiceMemo, setInvoiceMemo] = useState("");

  const handleCreateInvoice = async () => {
    toast.info("Coming Soon", {
      description: "Invoice creation will be available in the next release",
    });
    setDialogOpen(false);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <Navbar />

      <main className="mx-auto max-w-4xl px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-yellow-500 to-orange-600">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">HumanPay</h1>
                  <p className="text-neutral-400">Invoice & payment rail with identity gating</p>
                </div>
              </div>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  className="bg-orange-600 hover:bg-orange-700"
                  disabled={!connected || !hasProfile}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Invoice
                </Button>
              </DialogTrigger>
              <DialogContent className="border-neutral-800 bg-neutral-900">
                <DialogHeader>
                  <DialogTitle>Create Invoice</DialogTitle>
                  <DialogDescription>Create a payment request gated by HumanRail identity</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Amount (SOL)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={invoiceAmount}
                      onChange={(e) => setInvoiceAmount(e.target.value)}
                      className="border-neutral-700 bg-neutral-800"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Memo (optional)</Label>
                    <Input
                      value={invoiceMemo}
                      onChange={(e) => setInvoiceMemo(e.target.value)}
                      placeholder="Payment for services..."
                      className="border-neutral-700 bg-neutral-800"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreateInvoice} className="bg-orange-600 hover:bg-orange-700">
                    <Zap className="mr-2 h-4 w-4" />
                    Create Invoice
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Not Connected State */}
          {!connected && (
            <Card className="border-neutral-800 bg-neutral-900/50">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Zap className="mb-4 h-16 w-16 text-neutral-600" />
                <h2 className="mb-2 text-xl font-semibold">Connect Your Wallet</h2>
                <p className="mb-6 text-neutral-400">Connect a Solana wallet to use HumanPay</p>
                <WalletMultiButton />
              </CardContent>
            </Card>
          )}

          {/* No Profile Warning */}
          {connected && !hasProfile && (
            <Card className="mb-6 border-yellow-900/50 bg-yellow-950/20">
              <CardContent className="py-4">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-yellow-500" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-500">Human Profile Required</p>
                    <p className="mt-1 text-neutral-400">
                      Create a human profile to use HumanPay.{" "}
                      <a href="/human" className="text-yellow-500 underline">Go to Human Dashboard →</a>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Features */}
          {connected && hasProfile && (
            <>
              <div className="mb-8 grid gap-4 md:grid-cols-3">
                <Card className="border-neutral-800 bg-neutral-900/50">
                  <CardContent className="p-6">
                    <CheckCircle2 className="mb-3 h-8 w-8 text-emerald-500" />
                    <h3 className="font-semibold">Identity-Gated</h3>
                    <p className="mt-1 text-sm text-neutral-400">
                      Only verified humans can create and pay invoices
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-neutral-800 bg-neutral-900/50">
                  <CardContent className="p-6">
                    <Wallet className="mb-3 h-8 w-8 text-blue-500" />
                    <h3 className="font-semibold">Agent Delegation</h3>
                    <p className="mt-1 text-sm text-neutral-400">
                      Authorized agents can pay invoices on your behalf
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-neutral-800 bg-neutral-900/50">
                  <CardContent className="p-6">
                    <Clock className="mb-3 h-8 w-8 text-purple-500" />
                    <h3 className="font-semibold">Full Audit Trail</h3>
                    <p className="mt-1 text-sm text-neutral-400">
                      All payments recorded with accountability
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Empty State */}
              <Card className="border-neutral-800 bg-neutral-900/50">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Zap className="mb-4 h-16 w-16 text-orange-500" />
                  <h2 className="mb-2 text-xl font-semibold">No Invoices Yet</h2>
                  <p className="mb-6 text-neutral-400">Create your first invoice to start accepting payments</p>
                  <Button onClick={() => setDialogOpen(true)} className="bg-orange-600 hover:bg-orange-700">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Invoice
                  </Button>
                </CardContent>
              </Card>
            </>
          )}

          {/* Info Card */}
          <Card className="mt-8 border-orange-900/50 bg-orange-950/20">
            <CardContent className="py-4">
              <div className="flex gap-3">
                <Zap className="h-5 w-5 shrink-0 text-orange-400" />
                <div className="text-sm">
                  <p className="font-medium text-orange-400">HumanPay Rail</p>
                  <p className="mt-1 text-neutral-400">
                    Create invoices, accept payments, and allow delegated agents to pay on your behalf - 
                    all gated by HumanRail identity verification with full accountability.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
