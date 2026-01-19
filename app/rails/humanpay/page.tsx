"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { AnchorProvider, BN } from "@coral-xyz/anchor";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { getHumanPayProgram, getProgramId } from "@/lib/programs";
import {
  Zap,
  Plus,
  RefreshCw,
  CheckCircle2,
  Clock,
  Wallet,
  AlertTriangle,
  ExternalLink,
  XCircle,
  Download,
  Send,
  Loader2,
  Receipt,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";

const TOKEN_2022_PROGRAM_ID = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");

// Invoice discriminator for parsing
const INVOICE_DISCRIMINATOR = Buffer.from([173, 58, 222, 166, 125, 132, 62, 52]);

interface Invoice {
  merchant: PublicKey;
  mint: PublicKey;
  amount: bigint;
  paidAmount: bigint;
  humanRequirements: number;
  createdAt: number;
  expiresAt: number;
  paidAt: number;
  status: "pending" | "paid" | "cancelled" | "withdrawn";
  memo: string;
  vault: PublicKey;
  bump: number;
  vaultBump: number;
  nonce: bigint;
  pda: PublicKey;
}

/**
 * Generate unique nonce using crypto random
 */
function generateUniqueNonce(): BN {
  const randomBytes = new Uint8Array(8);
  crypto.getRandomValues(randomBytes);
  let value = BigInt(0);
  for (let i = 0; i < 8; i++) {
    value += BigInt(randomBytes[i]) << BigInt(i * 8);
  }
  return new BN(value.toString());
}

/**
 * Convert BN to 8-byte LE buffer
 */
function bnToBuffer8LE(bn: BN): Buffer {
  const buffer = Buffer.alloc(8);
  const bytes = bn.toArray("le", 8);
  for (let i = 0; i < 8; i++) {
    buffer[i] = bytes[i] || 0;
  }
  return buffer;
}

/**
 * Format token amount
 */
function formatTokenAmount(amount: bigint, decimals: number = 9): string {
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
 * Format timestamp
 */
function formatDate(timestamp: number): string {
  if (timestamp === 0) return "Never";
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Convert string to 32-byte memo array
 */
function stringToMemo(str: string): number[] {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str.slice(0, 32));
  const memo = new Array(32).fill(0);
  for (let i = 0; i < bytes.length && i < 32; i++) {
    memo[i] = bytes[i];
  }
  return memo;
}

/**
 * Parse memo from bytes
 */
function parseMemo(bytes: Uint8Array): string {
  const decoder = new TextDecoder();
  const nullIndex = bytes.indexOf(0);
  return decoder.decode(bytes.slice(0, nullIndex === -1 ? bytes.length : nullIndex));
}

/**
 * Parse invoice status from byte
 */
function parseStatus(statusByte: number): Invoice["status"] {
  switch (statusByte) {
    case 0:
      return "pending";
    case 1:
      return "paid";
    case 2:
      return "cancelled";
    case 3:
      return "withdrawn";
    default:
      return "pending";
  }
}

/**
 * Parse invoice account data
 */
function parseInvoice(data: Buffer, pda: PublicKey): Invoice | null {
  try {
    if (!data.slice(0, 8).equals(INVOICE_DISCRIMINATOR)) return null;
    let offset = 8;

    const merchant = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;
    const mint = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;
    const amount = data.readBigUInt64LE(offset);
    offset += 8;
    const paidAmount = data.readBigUInt64LE(offset);
    offset += 8;
    const humanRequirements = data.readUInt16LE(offset);
    offset += 2;
    const createdAt = Number(data.readBigInt64LE(offset));
    offset += 8;
    const expiresAt = Number(data.readBigInt64LE(offset));
    offset += 8;
    const paidAt = Number(data.readBigInt64LE(offset));
    offset += 8;
    const statusByte = data[offset];
    offset += 1;
    const memo = parseMemo(data.slice(offset, offset + 32));
    offset += 32;
    const vault = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;
    const bump = data[offset];
    offset += 1;
    const vaultBump = data[offset];
    offset += 1;
    const nonce = data.readBigUInt64LE(offset);

    return {
      merchant,
      mint,
      amount,
      paidAmount,
      humanRequirements,
      createdAt,
      expiresAt,
      paidAt,
      status: parseStatus(statusByte),
      memo,
      vault,
      bump,
      vaultBump,
      nonce,
      pda,
    };
  } catch (err) {
    console.error("Failed to parse invoice:", err);
    return null;
  }
}

/**
 * Invoice Card Component
 */
function InvoiceCard({
  invoice,
  isOwner,
  onPay,
  onWithdraw,
  onCancel,
  cluster,
  paying,
  withdrawing,
  cancelling,
}: {
  invoice: Invoice;
  isOwner: boolean;
  onPay?: (invoice: Invoice) => void;
  onWithdraw?: (invoice: Invoice) => void;
  onCancel?: (invoice: Invoice) => void;
  cluster: string;
  paying?: boolean;
  withdrawing?: boolean;
  cancelling?: boolean;
}) {
  const isExpired = invoice.expiresAt > 0 && invoice.expiresAt < Date.now() / 1000;

  const statusColors = {
    pending: "bg-yellow-500/20 text-yellow-400",
    paid: "bg-emerald-500/20 text-emerald-400",
    cancelled: "bg-red-500/20 text-red-400",
    withdrawn: "bg-blue-500/20 text-blue-400",
  };

  return (
    <Card className="border-neutral-800 bg-neutral-900/50 transition-all hover:border-neutral-700">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-white">
              {formatTokenAmount(invoice.amount)} tokens
            </CardTitle>
            {invoice.memo && <p className="mt-1 text-sm text-neutral-400">{invoice.memo}</p>}
          </div>
          <div className="flex items-center gap-2">
            <Badge className={statusColors[invoice.status]}>
              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
            </Badge>
            {isOwner && <Badge className="bg-orange-500/20 text-orange-400">My Invoice</Badge>}
            {isExpired && invoice.status === "pending" && (
              <Badge className="bg-red-500/20 text-red-400">Expired</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-neutral-500">Amount</p>
            <p className="font-medium text-white">{formatTokenAmount(invoice.amount)} tokens</p>
          </div>
          <div>
            <p className="text-neutral-500">Paid</p>
            <p className="font-medium text-white">{formatTokenAmount(invoice.paidAmount)} tokens</p>
          </div>
          <div>
            <p className="text-neutral-500">Min Human Score</p>
            <p className="font-medium text-white">{invoice.humanRequirements}</p>
          </div>
          <div>
            <p className="text-neutral-500">Expires</p>
            <p className="font-medium text-white">
              {invoice.expiresAt === 0 ? "Never" : formatDate(invoice.expiresAt)}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-neutral-800 pt-3">
          <div className="flex items-center gap-1 text-xs text-neutral-500">
            <Clock className="h-3 w-3" />
            <span>Created {formatDate(invoice.createdAt)}</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() =>
                window.open(`https://explorer.solana.com/address/${invoice.pda.toBase58()}?cluster=${cluster}`, "_blank")
              }
            >
              <ExternalLink className="mr-1 h-3 w-3" />
              Explorer
            </Button>

            {/* Pay button - for non-owners on pending invoices */}
            {!isOwner && invoice.status === "pending" && !isExpired && onPay && (
              <Button
                size="sm"
                className="h-8 bg-emerald-600 text-xs hover:bg-emerald-700"
                onClick={() => onPay(invoice)}
                disabled={paying}
              >
                {paying ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Send className="mr-1 h-3 w-3" />}
                Pay
              </Button>
            )}

            {/* Withdraw button - for owners on paid invoices */}
            {isOwner && invoice.status === "paid" && onWithdraw && (
              <Button
                size="sm"
                className="h-8 bg-blue-600 text-xs hover:bg-blue-700"
                onClick={() => onWithdraw(invoice)}
                disabled={withdrawing}
              >
                {withdrawing ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : (
                  <Download className="mr-1 h-3 w-3" />
                )}
                Withdraw
              </Button>
            )}

            {/* Cancel button - for owners on pending invoices */}
            {isOwner && invoice.status === "pending" && onCancel && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300"
                onClick={() => onCancel(invoice)}
                disabled={cancelling}
              >
                {cancelling ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <XCircle className="mr-1 h-3 w-3" />}
                Cancel
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function HumanPayPage() {
  const { connection } = useConnection();
  const { connected, publicKey, wallet, signTransaction, sendTransaction } = useWallet();
  const { cluster } = useCluster();
  const { hasProfile } = useHumanProfile();

  const isSubmitting = useRef(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [myInvoices, setMyInvoices] = useState<Invoice[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "my">("all");

  // Form state
  const [invoiceAmount, setInvoiceAmount] = useState("1000000000");
  const [invoiceMemo, setInvoiceMemo] = useState("");
  const [invoiceMint, setInvoiceMint] = useState("BDVRmn2yQsgL8Kf27LfR2qNsdqHY5aHrSKyNja5kDdAC");
  const [humanRequirements, setHumanRequirements] = useState("0");
  const [expiresInHours, setExpiresInHours] = useState("0");

  const getProvider = useCallback(() => {
    if (!publicKey || !wallet || !signTransaction) return null;
    const anchorWallet = {
      publicKey,
      signTransaction,
      signAllTransactions: async (txs: any[]) => {
        const signed = [];
        for (const tx of txs) signed.push(await signTransaction(tx));
        return signed;
      },
    };
    return new AnchorProvider(connection, anchorWallet as any, {
      commitment: "confirmed",
      preflightCommitment: "confirmed",
    });
  }, [connection, publicKey, wallet, signTransaction]);

  /**
   * Fetch all invoices from the program
   */
  const fetchInvoices = useCallback(async () => {
    if (!connection) return;
    setLoading(true);

    try {
      const programId = getProgramId(cluster, "humanPay");
      const accounts = await connection.getProgramAccounts(programId);

      const allInvoices: Invoice[] = [];
      const merchantInvoices: Invoice[] = [];

      for (const { pubkey, account } of accounts) {
        const invoice = parseInvoice(account.data as Buffer, pubkey);
        if (invoice) {
          allInvoices.push(invoice);
          if (publicKey && invoice.merchant.equals(publicKey)) {
            merchantInvoices.push(invoice);
          }
        }
      }

      // Sort by created date descending
      allInvoices.sort((a, b) => b.createdAt - a.createdAt);
      merchantInvoices.sort((a, b) => b.createdAt - a.createdAt);

      setInvoices(allInvoices.filter((i) => i.status === "pending"));
      setMyInvoices(merchantInvoices);
    } catch (err) {
      console.error("Failed to fetch invoices:", err);
      toast.error("Failed to fetch invoices");
    } finally {
      setLoading(false);
    }
  }, [connection, publicKey, cluster]);

  useEffect(() => {
    if (connected) {
      fetchInvoices();
    }
  }, [connected, fetchInvoices]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchInvoices();
    setRefreshing(false);
    toast.success("Invoices refreshed");
  };

  /**
   * Create a new invoice
   */
  const handleCreateInvoice = async () => {
    if (isSubmitting.current) return;
    if (!publicKey || !sendTransaction) {
      toast.error("Wallet not connected");
      return;
    }

    let mintPubkey: PublicKey;
    try {
      mintPubkey = new PublicKey(invoiceMint);
    } catch {
      toast.error("Invalid mint address");
      return;
    }

    const provider = getProvider();
    if (!provider) {
      toast.error("Could not create provider");
      return;
    }

    isSubmitting.current = true;
    setCreating(true);

    try {
      const program = getHumanPayProgram(provider, cluster);
      const programId = getProgramId(cluster, "humanPay");

      const nonce = generateUniqueNonce();
      const nonceBuffer = bnToBuffer8LE(nonce);

      // Derive invoice PDA: ["invoice", merchant, mint, nonce]
      const [invoicePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("invoice"), publicKey.toBuffer(), mintPubkey.toBuffer(), nonceBuffer],
        programId
      );

      // Derive vault PDA: ["vault", invoice]
      const [vaultPda] = PublicKey.findProgramAddressSync([Buffer.from("vault"), invoicePda.toBuffer()], programId);

      // Calculate expiry
      const expiresAt =
        parseInt(expiresInHours) > 0 ? new BN(Math.floor(Date.now() / 1000) + parseInt(expiresInHours) * 3600) : new BN(0);

      const params = {
        amount: new BN(parseInt(invoiceAmount) || 1000000000),
        humanRequirements: parseInt(humanRequirements) || 0,
        expiresAt,
        memo: stringToMemo(invoiceMemo),
        nonce,
      };

      console.log("Creating invoice:", {
        invoicePda: invoicePda.toBase58(),
        vaultPda: vaultPda.toBase58(),
        mint: mintPubkey.toBase58(),
        amount: params.amount.toString(),
      });

      const instruction = await program.methods
        .createConfidentialInvoice(params)
        .accounts({
          invoice: invoicePda,
          vault: vaultPda,
          mint: mintPubkey,
          merchant: publicKey,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");

      const transaction = new Transaction({
        feePayer: publicKey,
        blockhash,
        lastValidBlockHeight,
      }).add(instruction);

      toast.info("Please approve the transaction...");

      // Try to simulate first to get detailed error
      try {
        const simResult = await connection.simulateTransaction(transaction);
        if (simResult.value.err) {
          console.error("Simulation error:", simResult.value.err);
          console.error("Simulation logs:", simResult.value.logs);
          throw new Error(`Simulation failed: ${JSON.stringify(simResult.value.err)}\nLogs: ${simResult.value.logs?.join('\n')}`);
        }
      } catch (simErr: any) {
        console.error("Simulation failed:", simErr);
        // Continue anyway to try sending
      }

      const signature = await sendTransaction(transaction, connection, {
        skipPreflight: true, // Skip preflight to see actual on-chain error
        preflightCommitment: "confirmed",
      });

      toast.info("Confirming transaction...");
      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");

      toast.success("Invoice created!", {
        description: `TX: ${signature.slice(0, 8)}...`,
        action: {
          label: "View",
          onClick: () => window.open(`https://explorer.solana.com/tx/${signature}?cluster=${cluster}`, "_blank"),
        },
      });

      setDialogOpen(false);
      setInvoiceMemo("");
      setTimeout(() => fetchInvoices(), 2000);
    } catch (err: any) {
      console.error("Create invoice error:", err);
      toast.error("Failed to create invoice", { description: err.message });
    } finally {
      setCreating(false);
      isSubmitting.current = false;
    }
  };

  /**
   * Pay an invoice
   */
  const handlePayInvoice = async (invoice: Invoice) => {
    if (!publicKey || !sendTransaction) {
      toast.error("Wallet not connected");
      return;
    }

    const provider = getProvider();
    if (!provider) {
      toast.error("Could not create provider");
      return;
    }

    setPaying(invoice.pda.toBase58());

    try {
      const program = getHumanPayProgram(provider, cluster);
      const humanRegistryProgramId = getProgramId(cluster, "humanRegistry");

      // Get payer's token account
      const [payerTokenAccount] = PublicKey.findProgramAddressSync(
        [publicKey.toBuffer(), TOKEN_2022_PROGRAM_ID.toBuffer(), invoice.mint.toBuffer()],
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      // Get payer's human profile
      const [payerProfile] = PublicKey.findProgramAddressSync(
        [Buffer.from("human_profile"), publicKey.toBuffer()],
        humanRegistryProgramId
      );

      console.log("Paying invoice:", {
        invoice: invoice.pda.toBase58(),
        vault: invoice.vault.toBase58(),
        amount: invoice.amount.toString(),
      });

      const instruction = await program.methods
        .payConfidentialInvoice()
        .accounts({
          invoice: invoice.pda,
          vault: invoice.vault,
          mint: invoice.mint,
          payerProfile,
          payerTokenAccount,
          payer: publicKey,
          humanRegistryProgram: humanRegistryProgramId,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .instruction();

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");

      const transaction = new Transaction({
        feePayer: publicKey,
        blockhash,
        lastValidBlockHeight,
      }).add(instruction);

      toast.info("Please approve the payment...");

      const signature = await sendTransaction(transaction, connection, {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      });

      toast.info("Confirming payment...");
      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");

      toast.success("Invoice paid!", {
        description: `TX: ${signature.slice(0, 8)}...`,
        action: {
          label: "View",
          onClick: () => window.open(`https://explorer.solana.com/tx/${signature}?cluster=${cluster}`, "_blank"),
        },
      });

      setTimeout(() => fetchInvoices(), 2000);
    } catch (err: any) {
      console.error("Pay invoice error:", err);
      toast.error("Failed to pay invoice", { description: err.message });
    } finally {
      setPaying(null);
    }
  };

  /**
   * Withdraw funds from a paid invoice
   */
  const handleWithdrawInvoice = async (invoice: Invoice) => {
    if (!publicKey || !sendTransaction) {
      toast.error("Wallet not connected");
      return;
    }

    const provider = getProvider();
    if (!provider) {
      toast.error("Could not create provider");
      return;
    }

    setWithdrawing(invoice.pda.toBase58());

    try {
      const program = getHumanPayProgram(provider, cluster);

      // Get merchant's token account
      const [merchantTokenAccount] = PublicKey.findProgramAddressSync(
        [publicKey.toBuffer(), TOKEN_2022_PROGRAM_ID.toBuffer(), invoice.mint.toBuffer()],
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      const instruction = await program.methods
        .withdrawInvoice()
        .accounts({
          invoice: invoice.pda,
          vault: invoice.vault,
          mint: invoice.mint,
          merchantTokenAccount,
          merchant: publicKey,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .instruction();

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");

      const transaction = new Transaction({
        feePayer: publicKey,
        blockhash,
        lastValidBlockHeight,
      }).add(instruction);

      toast.info("Please approve the withdrawal...");

      const signature = await sendTransaction(transaction, connection, {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      });

      toast.info("Confirming withdrawal...");
      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");

      toast.success("Funds withdrawn!", {
        description: `TX: ${signature.slice(0, 8)}...`,
        action: {
          label: "View",
          onClick: () => window.open(`https://explorer.solana.com/tx/${signature}?cluster=${cluster}`, "_blank"),
        },
      });

      setTimeout(() => fetchInvoices(), 2000);
    } catch (err: any) {
      console.error("Withdraw invoice error:", err);
      toast.error("Failed to withdraw", { description: err.message });
    } finally {
      setWithdrawing(null);
    }
  };

  /**
   * Cancel an invoice
   */
  const handleCancelInvoice = async (invoice: Invoice) => {
    if (!publicKey || !sendTransaction) {
      toast.error("Wallet not connected");
      return;
    }

    const provider = getProvider();
    if (!provider) {
      toast.error("Could not create provider");
      return;
    }

    setCancelling(invoice.pda.toBase58());

    try {
      const program = getHumanPayProgram(provider, cluster);

      const instruction = await program.methods
        .cancelInvoice()
        .accounts({
          invoice: invoice.pda,
          merchant: publicKey,
        })
        .instruction();

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");

      const transaction = new Transaction({
        feePayer: publicKey,
        blockhash,
        lastValidBlockHeight,
      }).add(instruction);

      toast.info("Please approve cancellation...");

      const signature = await sendTransaction(transaction, connection, {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      });

      toast.info("Confirming cancellation...");
      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");

      toast.success("Invoice cancelled!", {
        description: `TX: ${signature.slice(0, 8)}...`,
      });

      setTimeout(() => fetchInvoices(), 2000);
    } catch (err: any) {
      console.error("Cancel invoice error:", err);
      toast.error("Failed to cancel invoice", { description: err.message });
    } finally {
      setCancelling(null);
    }
  };

  const displayInvoices = activeTab === "all" ? invoices : myInvoices;

  const stats = {
    totalPending: invoices.length,
    myInvoices: myInvoices.length,
    myPaid: myInvoices.filter((i) => i.status === "paid").length,
    myWithdrawn: myInvoices.filter((i) => i.status === "withdrawn").length,
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-yellow-500 to-orange-600">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">HumanPay</h1>
                <p className="text-neutral-400">Invoice & payment rail with identity gating</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="border-neutral-700 bg-neutral-800 hover:bg-neutral-700"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-orange-600 hover:bg-orange-700" disabled={!connected || !hasProfile}>
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
                      <Label>Token Mint (Token-2022) *</Label>
                      <Input
                        value={invoiceMint}
                        onChange={(e) => setInvoiceMint(e.target.value)}
                        className="border-neutral-700 bg-neutral-800 font-mono text-xs"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Amount (in smallest units) *</Label>
                      <Input
                        type="number"
                        value={invoiceAmount}
                        onChange={(e) => setInvoiceAmount(e.target.value)}
                        className="border-neutral-700 bg-neutral-800"
                      />
                      <p className="text-xs text-neutral-500">e.g., 1000000000 = 1 token with 9 decimals</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Min Human Score</Label>
                        <Input
                          type="number"
                          value={humanRequirements}
                          onChange={(e) => setHumanRequirements(e.target.value)}
                          className="border-neutral-700 bg-neutral-800"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Expires In (hours)</Label>
                        <Input
                          type="number"
                          value={expiresInHours}
                          onChange={(e) => setExpiresInHours(e.target.value)}
                          placeholder="0 = never"
                          className="border-neutral-700 bg-neutral-800"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Memo (optional, max 32 chars)</Label>
                      <Input
                        value={invoiceMemo}
                        onChange={(e) => setInvoiceMemo(e.target.value.slice(0, 32))}
                        placeholder="Payment for services..."
                        className="border-neutral-700 bg-neutral-800"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={creating}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateInvoice} className="bg-orange-600 hover:bg-orange-700" disabled={creating}>
                      {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                      {creating ? "Creating..." : "Create Invoice"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Not Connected */}
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
                      <a href="/human" className="text-yellow-500 underline">
                        Go to Human Dashboard →
                      </a>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Main Content */}
          {connected && hasProfile && (
            <>
              {/* Stats */}
              <div className="mb-8 grid gap-4 md:grid-cols-4">
                <Card className="border-neutral-800 bg-neutral-900/50">
                  <CardContent className="p-6">
                    <Receipt className="mb-2 h-8 w-8 text-yellow-500" />
                    <p className="text-sm text-neutral-400">Pending Invoices</p>
                    <p className="text-2xl font-bold">{stats.totalPending}</p>
                  </CardContent>
                </Card>
                <Card className="border-neutral-800 bg-neutral-900/50">
                  <CardContent className="p-6">
                    <CreditCard className="mb-2 h-8 w-8 text-orange-500" />
                    <p className="text-sm text-neutral-400">My Invoices</p>
                    <p className="text-2xl font-bold">{stats.myInvoices}</p>
                  </CardContent>
                </Card>
                <Card className="border-neutral-800 bg-neutral-900/50">
                  <CardContent className="p-6">
                    <CheckCircle2 className="mb-2 h-8 w-8 text-emerald-500" />
                    <p className="text-sm text-neutral-400">Paid</p>
                    <p className="text-2xl font-bold">{stats.myPaid}</p>
                  </CardContent>
                </Card>
                <Card className="border-neutral-800 bg-neutral-900/50">
                  <CardContent className="p-6">
                    <Download className="mb-2 h-8 w-8 text-blue-500" />
                    <p className="text-sm text-neutral-400">Withdrawn</p>
                    <p className="text-2xl font-bold">{stats.myWithdrawn}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Tabs */}
              <div className="mb-6 flex gap-2">
                <Button
                  variant={activeTab === "all" ? "default" : "outline"}
                  className={activeTab === "all" ? "bg-orange-600" : "border-neutral-700 bg-neutral-800"}
                  onClick={() => setActiveTab("all")}
                >
                  <Receipt className="mr-2 h-4 w-4" />
                  Pending Invoices ({invoices.length})
                </Button>
                <Button
                  variant={activeTab === "my" ? "default" : "outline"}
                  className={activeTab === "my" ? "bg-orange-600" : "border-neutral-700 bg-neutral-800"}
                  onClick={() => setActiveTab("my")}
                >
                  <Wallet className="mr-2 h-4 w-4" />
                  My Invoices ({myInvoices.length})
                </Button>
              </div>

              {/* Loading */}
              {loading && (
                <Card className="border-neutral-800 bg-neutral-900/50">
                  <CardContent className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                    <span className="ml-3 text-neutral-400">Loading invoices...</span>
                  </CardContent>
                </Card>
              )}

              {/* Invoice List */}
              {!loading && displayInvoices.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2">
                  {displayInvoices.map((invoice) => (
                    <InvoiceCard
                      key={invoice.pda.toBase58()}
                      invoice={invoice}
                      isOwner={publicKey ? invoice.merchant.equals(publicKey) : false}
                      onPay={handlePayInvoice}
                      onWithdraw={handleWithdrawInvoice}
                      onCancel={handleCancelInvoice}
                      cluster={cluster}
                      paying={paying === invoice.pda.toBase58()}
                      withdrawing={withdrawing === invoice.pda.toBase58()}
                      cancelling={cancelling === invoice.pda.toBase58()}
                    />
                  ))}
                </div>
              )}

              {/* Empty State */}
              {!loading && displayInvoices.length === 0 && (
                <Card className="border-neutral-800 bg-neutral-900/50">
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <Zap className="mb-4 h-16 w-16 text-orange-500" />
                    <h2 className="mb-2 text-xl font-semibold">
                      {activeTab === "all" ? "No Pending Invoices" : "No Invoices Created"}
                    </h2>
                    <p className="mb-6 text-neutral-400">
                      {activeTab === "all"
                        ? "Create an invoice to start accepting payments"
                        : "Create your first invoice to get started"}
                    </p>
                    <Button onClick={() => setDialogOpen(true)} className="bg-orange-600 hover:bg-orange-700">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Invoice
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Features */}
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                <Card className="border-neutral-800 bg-neutral-900/50">
                  <CardContent className="p-6">
                    <CheckCircle2 className="mb-3 h-8 w-8 text-emerald-500" />
                    <h3 className="font-semibold">Identity-Gated</h3>
                    <p className="mt-1 text-sm text-neutral-400">Only verified humans can create and pay invoices</p>
                  </CardContent>
                </Card>
                <Card className="border-neutral-800 bg-neutral-900/50">
                  <CardContent className="p-6">
                    <Wallet className="mb-3 h-8 w-8 text-blue-500" />
                    <h3 className="font-semibold">Agent Delegation</h3>
                    <p className="mt-1 text-sm text-neutral-400">Authorized agents can pay invoices on your behalf</p>
                  </CardContent>
                </Card>
                <Card className="border-neutral-800 bg-neutral-900/50">
                  <CardContent className="p-6">
                    <Clock className="mb-3 h-8 w-8 text-purple-500" />
                    <h3 className="font-semibold">Full Audit Trail</h3>
                    <p className="mt-1 text-sm text-neutral-400">All payments recorded with accountability</p>
                  </CardContent>
                </Card>
              </div>
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
                    Create invoices, accept payments, and allow delegated agents to pay on your behalf - all gated by
                    HumanRail identity verification with full accountability.
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