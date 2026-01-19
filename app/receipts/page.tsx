"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey } from "@solana/web3.js";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useCluster } from "@/lib/solana/cluster-context";
import { getProgramId } from "@/lib/programs";
import {
  Receipt,
  RefreshCw,
  ExternalLink,
  Clock,
  Search,
  User,
  Bot,
  Key,
  ArrowRight,
  Hash,
  Coins,
  Loader2,
  FileText,
  Shield,
} from "lucide-react";

// ActionReceipt discriminator from IDL
const ACTION_RECEIPT_DISCRIMINATOR = Buffer.from([52, 35, 16, 111, 195, 40, 16, 69]);

// Action types (customize based on your protocol)
const ACTION_TYPES: Record<number, { name: string; color: string }> = {
  0: { name: "Unknown", color: "bg-neutral-500" },
  1: { name: "Payment", color: "bg-emerald-500" },
  2: { name: "Invoice", color: "bg-orange-500" },
  3: { name: "Task Submit", color: "bg-cyan-500" },
  4: { name: "Task Create", color: "bg-purple-500" },
  5: { name: "Delegation", color: "bg-blue-500" },
  6: { name: "Document", color: "bg-pink-500" },
  7: { name: "Profile Update", color: "bg-yellow-500" },
};

interface ActionReceipt {
  principalId: PublicKey;
  agentId: PublicKey;
  capabilityId: PublicKey;
  actionHash: Uint8Array;
  resultHash: Uint8Array;
  actionType: number;
  value: bigint;
  destination: PublicKey;
  timestamp: number;
  pda: PublicKey;
}

/**
 * Parse ActionReceipt from account data
 */
function parseActionReceipt(data: Buffer, pda: PublicKey): ActionReceipt | null {
  try {
    // Check discriminator
    if (!data.slice(0, 8).equals(ACTION_RECEIPT_DISCRIMINATOR)) {
      return null;
    }

    let offset = 8;

    const principalId = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const agentId = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const capabilityId = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const actionHash = new Uint8Array(data.slice(offset, offset + 32));
    offset += 32;

    const resultHash = new Uint8Array(data.slice(offset, offset + 32));
    offset += 32;

    const actionType = data[offset];
    offset += 1;

    const value = data.readBigUInt64LE(offset);
    offset += 8;

    const destination = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    const timestamp = Number(data.readBigInt64LE(offset));

    return {
      principalId,
      agentId,
      capabilityId,
      actionHash,
      resultHash,
      actionType,
      value,
      destination,
      timestamp,
      pda,
    };
  } catch (err) {
    console.error("Failed to parse ActionReceipt:", err);
    return null;
  }
}

/**
 * Format timestamp to readable date
 */
function formatDate(timestamp: number): string {
  if (timestamp === 0) return "Unknown";
  return new Date(timestamp * 1000).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format token amount
 */
function formatAmount(amount: bigint, decimals: number = 9): string {
  if (amount === BigInt(0)) return "0";
  const divisor = BigInt(10 ** decimals);
  const integerPart = amount / divisor;
  const fractionalPart = amount % divisor;
  if (fractionalPart === BigInt(0)) {
    return integerPart.toLocaleString();
  }
  const fracStr = fractionalPart.toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${integerPart.toLocaleString()}.${fracStr.slice(0, 4)}`;
}

/**
 * Convert bytes to hex string
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes.slice(0, 8))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Truncate public key for display
 */
function truncateKey(key: PublicKey): string {
  const str = key.toBase58();
  return `${str.slice(0, 4)}...${str.slice(-4)}`;
}

/**
 * Receipt Card Component
 */
function ReceiptCard({ receipt, cluster }: { receipt: ActionReceipt; cluster: string }) {
  const actionInfo = ACTION_TYPES[receipt.actionType] || ACTION_TYPES[0];
  const isAgentAction = !receipt.agentId.equals(receipt.principalId);

  return (
    <Card className="border-neutral-800 bg-neutral-900/50 transition-all hover:border-neutral-700">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${actionInfo.color}/20`}>
              <Receipt className={`h-5 w-5 text-${actionInfo.color.replace("bg-", "")}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{actionInfo.name}</span>
                <Badge className={`${actionInfo.color}/20 text-white text-xs`}>Type {receipt.actionType}</Badge>
                {isAgentAction && (
                  <Badge className="bg-purple-500/20 text-purple-400 text-xs">
                    <Bot className="mr-1 h-3 w-3" />
                    Agent
                  </Badge>
                )}
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-neutral-500">
                <Clock className="h-3 w-3" />
                {formatDate(receipt.timestamp)}
              </div>
            </div>
          </div>
          {receipt.value > BigInt(0) && (
            <div className="text-right">
              <p className="font-semibold text-emerald-400">{formatAmount(receipt.value)}</p>
              <p className="text-xs text-neutral-500">tokens</p>
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
          <div className="rounded bg-neutral-800/50 p-2">
            <div className="flex items-center gap-1 text-neutral-500">
              <User className="h-3 w-3" />
              Principal
            </div>
            <p className="mt-1 font-mono text-neutral-300">{truncateKey(receipt.principalId)}</p>
          </div>

          <div className="rounded bg-neutral-800/50 p-2">
            <div className="flex items-center gap-1 text-neutral-500">
              <Bot className="h-3 w-3" />
              Agent
            </div>
            <p className="mt-1 font-mono text-neutral-300">
              {receipt.agentId.equals(receipt.principalId) ? "Self" : truncateKey(receipt.agentId)}
            </p>
          </div>

          <div className="rounded bg-neutral-800/50 p-2">
            <div className="flex items-center gap-1 text-neutral-500">
              <ArrowRight className="h-3 w-3" />
              Destination
            </div>
            <p className="mt-1 font-mono text-neutral-300">{truncateKey(receipt.destination)}</p>
          </div>

          <div className="rounded bg-neutral-800/50 p-2">
            <div className="flex items-center gap-1 text-neutral-500">
              <Hash className="h-3 w-3" />
              Action Hash
            </div>
            <p className="mt-1 font-mono text-neutral-300">{bytesToHex(receipt.actionHash)}...</p>
          </div>
        </div>

        <div className="mt-3 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() =>
              window.open(`https://explorer.solana.com/address/${receipt.pda.toBase58()}?cluster=${cluster}`, "_blank")
            }
          >
            <ExternalLink className="mr-1 h-3 w-3" />
            View on Explorer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ReceiptsDashboard() {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const { cluster } = useCluster();

  const [receipts, setReceipts] = useState<ActionReceipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "principal" | "agent">("all");

  /**
   * Fetch all ActionReceipt accounts from the receipts program
   */
  const fetchReceipts = useCallback(async () => {
    if (!connection) return;

    setLoading(true);
    setError(null);

    try {
      const programId = getProgramId(cluster, "receipts");
      const accounts = await connection.getProgramAccounts(programId);

      const allReceipts: ActionReceipt[] = [];

      for (const { pubkey, account } of accounts) {
        const receipt = parseActionReceipt(account.data as Buffer, pubkey);
        if (receipt) {
          allReceipts.push(receipt);
        }
      }

      // Sort by timestamp descending (newest first)
      allReceipts.sort((a, b) => b.timestamp - a.timestamp);

      setReceipts(allReceipts);
    } catch (err) {
      console.error("Failed to fetch receipts:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch receipts");
    } finally {
      setLoading(false);
    }
  }, [connection, cluster]);

  useEffect(() => {
    if (connected) {
      fetchReceipts();
    }
  }, [connected, fetchReceipts]);

  // Filter receipts based on search and filter type
  const filteredReceipts = receipts.filter((receipt) => {
    // Filter by connected wallet
    if (filterType === "principal" && publicKey) {
      if (!receipt.principalId.equals(publicKey)) return false;
    } else if (filterType === "agent" && publicKey) {
      if (!receipt.agentId.equals(publicKey)) return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        receipt.pda.toBase58().toLowerCase().includes(query) ||
        receipt.principalId.toBase58().toLowerCase().includes(query) ||
        receipt.agentId.toBase58().toLowerCase().includes(query) ||
        receipt.destination.toBase58().toLowerCase().includes(query)
      );
    }

    return true;
  });

  // Calculate stats
  const stats = {
    total: receipts.length,
    myPrincipal: publicKey ? receipts.filter((r) => r.principalId.equals(publicKey)).length : 0,
    myAgent: publicKey ? receipts.filter((r) => r.agentId.equals(publicKey)).length : 0,
    totalValue: receipts.reduce((sum, r) => sum + r.value, BigInt(0)),
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-red-600">
                <Receipt className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Receipts & Audit Trail</h1>
                <p className="text-neutral-400">Complete action history for accountability (KYA)</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="border-neutral-700 bg-neutral-800 hover:bg-neutral-700"
              onClick={fetchReceipts}
              disabled={loading}
            >
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
                <p className="mb-6 text-neutral-400">Connect a Solana wallet to view action receipts</p>
                <WalletMultiButton />
              </CardContent>
            </Card>
          )}

          {/* Connected State */}
          {connected && (
            <>
              {/* Stats Cards */}
              <div className="mb-8 grid gap-4 md:grid-cols-4">
                <Card className="border-neutral-800 bg-neutral-900/50">
                  <CardContent className="p-6">
                    <FileText className="mb-2 h-8 w-8 text-orange-500" />
                    <p className="text-sm text-neutral-400">Total Receipts</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </CardContent>
                </Card>
                <Card className="border-neutral-800 bg-neutral-900/50">
                  <CardContent className="p-6">
                    <User className="mb-2 h-8 w-8 text-blue-500" />
                    <p className="text-sm text-neutral-400">As Principal</p>
                    <p className="text-2xl font-bold">{stats.myPrincipal}</p>
                  </CardContent>
                </Card>
                <Card className="border-neutral-800 bg-neutral-900/50">
                  <CardContent className="p-6">
                    <Bot className="mb-2 h-8 w-8 text-purple-500" />
                    <p className="text-sm text-neutral-400">As Agent</p>
                    <p className="text-2xl font-bold">{stats.myAgent}</p>
                  </CardContent>
                </Card>
                <Card className="border-neutral-800 bg-neutral-900/50">
                  <CardContent className="p-6">
                    <Coins className="mb-2 h-8 w-8 text-emerald-500" />
                    <p className="text-sm text-neutral-400">Total Value</p>
                    <p className="text-2xl font-bold">{formatAmount(stats.totalValue)}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Filters */}
              <div className="mb-6 flex flex-col gap-4 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                  <Input
                    placeholder="Search by address..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="border-neutral-700 bg-neutral-900 pl-10"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={filterType === "all" ? "default" : "outline"}
                    className={filterType === "all" ? "bg-orange-600" : "border-neutral-700 bg-neutral-800"}
                    onClick={() => setFilterType("all")}
                  >
                    All
                  </Button>
                  <Button
                    variant={filterType === "principal" ? "default" : "outline"}
                    className={filterType === "principal" ? "bg-orange-600" : "border-neutral-700 bg-neutral-800"}
                    onClick={() => setFilterType("principal")}
                  >
                    <User className="mr-2 h-4 w-4" />
                    My Principal
                  </Button>
                  <Button
                    variant={filterType === "agent" ? "default" : "outline"}
                    className={filterType === "agent" ? "bg-orange-600" : "border-neutral-700 bg-neutral-800"}
                    onClick={() => setFilterType("agent")}
                  >
                    <Bot className="mr-2 h-4 w-4" />
                    My Agent
                  </Button>
                </div>
              </div>

              {/* Loading State */}
              {loading && (
                <Card className="border-neutral-800 bg-neutral-900/50">
                  <CardContent className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                    <span className="ml-3 text-neutral-400">Loading receipts...</span>
                  </CardContent>
                </Card>
              )}

              {/* Error State */}
              {error && (
                <Card className="mb-6 border-red-900/50 bg-red-950/20">
                  <CardContent className="py-4">
                    <p className="text-red-400">{error}</p>
                  </CardContent>
                </Card>
              )}

              {/* No Receipts */}
              {!loading && !error && filteredReceipts.length === 0 && (
                <Card className="border-neutral-800 bg-neutral-900/50">
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <Receipt className="mb-4 h-16 w-16 text-orange-500" />
                    <h2 className="mb-2 text-xl font-semibold">No Receipts Found</h2>
                    <p className="text-neutral-400">
                      {searchQuery || filterType !== "all"
                        ? "No receipts match your filters"
                        : "Action receipts will appear here as agents perform actions"}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Receipts List */}
              {!loading && !error && filteredReceipts.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2">
                  {filteredReceipts.map((receipt) => (
                    <ReceiptCard key={receipt.pda.toBase58()} receipt={receipt} cluster={cluster} />
                  ))}
                </div>
              )}

              {/* Info Card */}
              <Card className="mt-8 border-orange-900/50 bg-orange-950/20">
                <CardContent className="py-4">
                  <div className="flex gap-3">
                    <Shield className="h-5 w-5 shrink-0 text-orange-400" />
                    <div className="text-sm">
                      <p className="font-medium text-orange-400">Know Your Agent (KYA)</p>
                      <p className="mt-1 text-neutral-400">
                        Every agent action is recorded as an immutable receipt on-chain, providing complete
                        accountability and audit trails for AI agent operations.
                      </p>
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