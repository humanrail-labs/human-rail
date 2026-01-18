"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCluster } from "@/lib/solana/cluster-context";
import { getProgramId } from "@/lib/programs";
import { Receipt, RefreshCw, ExternalLink, CheckCircle2, XCircle, Clock, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface TransactionRecord {
  signature: string;
  blockTime: number;
  slot: number;
  err: boolean;
  memo: string | null;
}

export default function ReceiptsDashboard() {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const { cluster } = useCluster();

  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchTransactions = useCallback(async () => {
    if (!publicKey || !connection) return;

    setLoading(true);
    try {
      // Fetch recent signatures for this wallet interacting with HumanRail programs
      const programIds = [
        getProgramId(cluster, "humanRegistry"),
        getProgramId(cluster, "agentRegistry"),
        getProgramId(cluster, "delegation"),
        getProgramId(cluster, "humanPay"),
        getProgramId(cluster, "dataBlink"),
        getProgramId(cluster, "documentRegistry"),
        getProgramId(cluster, "receipts"),
      ];

      // Get recent transactions for the wallet
      const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 50 });

      const records: TransactionRecord[] = signatures.map((sig) => ({
        signature: sig.signature,
        blockTime: sig.blockTime || 0,
        slot: sig.slot,
        err: sig.err !== null,
        memo: sig.memo,
      }));

      // Filter for HumanRail program interactions (if needed, fetch tx details)
      setTransactions(records);
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
    } finally {
      setLoading(false);
    }
  }, [publicKey, connection, cluster]);

  useEffect(() => {
    if (connected) {
      fetchTransactions();
    }
  }, [connected, fetchTransactions]);

  const filteredTransactions = transactions.filter(
    (tx) => !searchQuery || tx.signature.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (ts: number) => {
    if (!ts) return "Unknown";
    return new Date(ts * 1000).toLocaleString();
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
              <h1 className="text-3xl font-bold">Receipts & Audit Trail</h1>
              <p className="mt-1 text-neutral-400">Complete transaction history for accountability</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchTransactions} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {/* Not Connected State */}
          {!connected && (
            <Card className="border-neutral-800 bg-neutral-900/50">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Receipt className="mb-4 h-16 w-16 text-neutral-600" />
                <h2 className="mb-2 text-xl font-semibold">Connect Your Wallet</h2>
                <p className="mb-6 text-neutral-400">Connect a Solana wallet to view your transaction history</p>
                <WalletMultiButton />
              </CardContent>
            </Card>
          )}

          {/* Connected State */}
          {connected && (
            <>
              {/* Search */}
              <div className="mb-6 relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                <Input
                  placeholder="Search by signature..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-neutral-700 bg-neutral-900 pl-10"
                />
              </div>

              {/* Loading State */}
              {loading && (
                <div className="space-y-4">
                  <Skeleton className="h-20 w-full bg-neutral-800" />
                  <Skeleton className="h-20 w-full bg-neutral-800" />
                  <Skeleton className="h-20 w-full bg-neutral-800" />
                </div>
              )}

              {/* No Transactions */}
              {!loading && filteredTransactions.length === 0 && (
                <Card className="border-neutral-800 bg-neutral-900/50">
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <Receipt className="mb-4 h-16 w-16 text-orange-500" />
                    <h2 className="mb-2 text-xl font-semibold">No Transactions Found</h2>
                    <p className="text-neutral-400">
                      {searchQuery ? "No transactions match your search" : "Your transaction history will appear here"}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Transactions List */}
              {!loading && filteredTransactions.length > 0 && (
                <div className="space-y-3">
                  {filteredTransactions.map((tx) => (
                    <Card key={tx.signature} className="border-neutral-800 bg-neutral-900/50">
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-4">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-full ${
                              tx.err ? "bg-red-950" : "bg-emerald-950"
                            }`}
                          >
                            {tx.err ? (
                              <XCircle className="h-5 w-5 text-red-500" />
                            ) : (
                              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            )}
                          </div>
                          <div>
                            <p className="font-mono text-sm">
                              {tx.signature.slice(0, 16)}...{tx.signature.slice(-8)}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-neutral-500">
                              <Clock className="h-3 w-3" />
                              {formatDate(tx.blockTime)}
                              <span>•</span>
                              <span>Slot {tx.slot.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={tx.err ? "destructive" : "default"} className={tx.err ? "" : "bg-emerald-600"}>
                            {tx.err ? "Failed" : "Success"}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              window.open(`https://explorer.solana.com/tx/${tx.signature}?cluster=${cluster}`, "_blank")
                            }
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Stats Card */}
              <Card className="mt-8 border-neutral-800 bg-neutral-900/50">
                <CardHeader>
                  <CardTitle className="text-lg">Transaction Summary</CardTitle>
                  <CardDescription>Overview of your HumanRail activity</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="rounded-lg bg-neutral-800/50 p-4 text-center">
                      <p className="text-2xl font-bold text-emerald-500">{transactions.filter((t) => !t.err).length}</p>
                      <p className="text-xs text-neutral-400">Successful</p>
                    </div>
                    <div className="rounded-lg bg-neutral-800/50 p-4 text-center">
                      <p className="text-2xl font-bold text-red-500">{transactions.filter((t) => t.err).length}</p>
                      <p className="text-xs text-neutral-400">Failed</p>
                    </div>
                    <div className="rounded-lg bg-neutral-800/50 p-4 text-center">
                      <p className="text-2xl font-bold">{transactions.length}</p>
                      <p className="text-xs text-neutral-400">Total</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </motion.div>
      </main>
    </div>
  );
}
