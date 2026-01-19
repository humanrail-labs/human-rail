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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { useDataBlink, Task } from "@/lib/hooks/use-datablink";
import { getDataBlinkProgram, getProgramId } from "@/lib/programs";
import {
  Cpu,
  Plus,
  Users,
  Coins,
  AlertTriangle,
  List,
  Target,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ExternalLink,
  Clock,
  Award,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

const TOKEN_2022_PROGRAM_ID = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");

/**
 * Generate a unique nonce using crypto.getRandomValues for true randomness
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
 * Convert BN to 8-byte little-endian buffer for PDA derivation
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
 * Format token amount with decimals
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
 * Format timestamp to readable date
 */
function formatDate(timestamp: number): string {
  if (timestamp === 0) return "N/A";
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Parse metadata from URI
 */
function parseMetadata(uri: string): { title: string; description: string } {
  try {
    if (uri.startsWith("data:application/json;base64,")) {
      const base64 = uri.replace("data:application/json;base64,", "");
      const json = JSON.parse(atob(base64));
      return {
        title: json.title || "Untitled Task",
        description: json.description || "",
      };
    }
    return { title: "Untitled Task", description: "" };
  } catch {
    return { title: "Untitled Task", description: "" };
  }
}

/**
 * Task Card Component
 */
function TaskCard({
  task,
  isOwner,
  onClose,
  cluster,
}: {
  task: Task;
  isOwner: boolean;
  onClose?: (task: Task) => void;
  cluster: string;
}) {
  const metadata = parseMetadata(task.metadataUri);
  const remainingBudget = task.totalBudget - task.consumedBudget;
  const progress = task.maxResponses > 0 ? (task.responseCount / task.maxResponses) * 100 : 0;

  return (
    <Card className="border-neutral-800 bg-neutral-900/50 transition-all hover:border-neutral-700">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-white">{metadata.title}</CardTitle>
            {metadata.description && (
              <p className="mt-1 text-sm text-neutral-400 line-clamp-2">{metadata.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {task.isOpen ? (
              <Badge className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30">Open</Badge>
            ) : (
              <Badge className="bg-neutral-500/20 text-neutral-400 hover:bg-neutral-500/30">Closed</Badge>
            )}
            {isOwner && <Badge className="bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30">My Task</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-neutral-500">Reward per Response</p>
            <p className="font-medium text-white">{formatTokenAmount(task.rewardPerResponse)} tokens</p>
          </div>
          <div>
            <p className="text-neutral-500">Remaining Budget</p>
            <p className="font-medium text-white">{formatTokenAmount(remainingBudget)} tokens</p>
          </div>
          <div>
            <p className="text-neutral-500">Responses</p>
            <p className="font-medium text-white">
              {task.responseCount}
              {task.maxResponses > 0 ? ` / ${task.maxResponses}` : ""}
            </p>
          </div>
          <div>
            <p className="text-neutral-500">Min Human Score</p>
            <p className="font-medium text-white">{task.humanRequirements}</p>
          </div>
        </div>

        {task.maxResponses > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-neutral-500">
              <span>Progress</span>
              <span>{progress.toFixed(0)}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-neutral-800">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-neutral-800 pt-3">
          <div className="flex items-center gap-1 text-xs text-neutral-500">
            <Clock className="h-3 w-3" />
            <span>{formatDate(task.createdAt)}</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() =>
                window.open(`https://explorer.solana.com/address/${task.pda.toBase58()}?cluster=${cluster}`, "_blank")
              }
            >
              <ExternalLink className="mr-1 h-3 w-3" />
              Explorer
            </Button>
            {isOwner && task.isOpen && onClose && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300"
                onClick={() => onClose(task)}
              >
                <XCircle className="mr-1 h-3 w-3" />
                Close
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DataBlinkPage() {
  const { connection } = useConnection();
  const { connected, publicKey, wallet, signTransaction, sendTransaction } = useWallet();
  const { cluster } = useCluster();
  const { hasProfile } = useHumanProfile();

  // Use the DataBlink hook for fetching tasks
  const {
    tasks,
    myTasks,
    myResponses,
    workerStats,
    loading: tasksLoading,
    error: tasksError,
    stats,
    refetch,
    closeTask,
  } = useDataBlink();

  // Prevent double submission
  const isSubmitting = useRef(false);

  // Track previous wallet to detect changes
  const prevWalletRef = useRef<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [closingTask, setClosingTask] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [rewardMint, setRewardMint] = useState("BDVRmn2yQsgL8Kf27LfR2qNsdqHY5aHrSKyNja5kDdAC");
  const [rewardPerResponse, setRewardPerResponse] = useState("1000000000");
  const [totalBudget, setTotalBudget] = useState("10000000000");
  const [maxResponses, setMaxResponses] = useState("100");

  // Tab state for task view
  const [activeTab, setActiveTab] = useState<"all" | "my">("all");

  // Reset tab to "all" when wallet changes
  useEffect(() => {
    const currentWallet = publicKey?.toBase58() || null;
    if (currentWallet !== prevWalletRef.current) {
      // Wallet changed - reset to "all" tab
      setActiveTab("all");
      prevWalletRef.current = currentWallet;
    }
  }, [publicKey]);

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

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
      toast.success("Tasks refreshed");
    } catch (err) {
      toast.error("Failed to refresh tasks");
    } finally {
      setRefreshing(false);
    }
  };

  const handleCloseTask = async (task: Task) => {
    if (!publicKey) return;
    setClosingTask(task.pda.toBase58());
    try {
      const signature = await closeTask(task.pda);
      toast.success("Task closed!", {
        description: `Remaining funds returned. TX: ${signature.slice(0, 8)}...`,
        action: {
          label: "View",
          onClick: () => window.open(`https://explorer.solana.com/tx/${signature}?cluster=${cluster}`, "_blank"),
        },
      });
    } catch (err: any) {
      console.error("Close task error:", err);
      toast.error("Failed to close task", { description: err.message });
    } finally {
      setClosingTask(null);
    }
  };

  const handleCreateTask = async () => {
    if (isSubmitting.current) {
      console.log("Already submitting, ignoring duplicate call");
      return;
    }

    if (!rewardMint || !taskTitle.trim()) {
      toast.error("Please fill in required fields");
      return;
    }
    if (!publicKey || !sendTransaction) {
      toast.error("Wallet not connected");
      return;
    }

    let mintPubkey: PublicKey;
    try {
      mintPubkey = new PublicKey(rewardMint);
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
      const program = getDataBlinkProgram(provider, cluster);
      const programId = getProgramId(cluster, "dataBlink");

      // Derive creator's ATA for Token-2022
      const [creatorTokenAccount] = PublicKey.findProgramAddressSync(
        [publicKey.toBuffer(), TOKEN_2022_PROGRAM_ID.toBuffer(), mintPubkey.toBuffer()],
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      // Verify creator has token account
      const ataInfo = await connection.getAccountInfo(creatorTokenAccount);
      if (!ataInfo) {
        toast.error("You don't have a token account for this mint. Please create one first.");
        return;
      }

      // Generate truly unique nonce
      const nonce = generateUniqueNonce();
      const nonceBuffer = bnToBuffer8LE(nonce);

      // Derive PDAs
      const [taskPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("task"), publicKey.toBuffer(), nonceBuffer],
        programId
      );
      const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("task_vault"), taskPda.toBuffer()],
        programId
      );

      // Build metadata URI
      const metadata = {
        title: taskTitle,
        description: taskDescription,
        createdAt: Date.now(),
        creator: publicKey.toBase58(),
      };
      const metadataUri = `data:application/json;base64,${Buffer.from(JSON.stringify(metadata)).toString("base64")}`;

      // Build params
      const createTaskParams = {
        rewardPerResponse: new BN(parseInt(rewardPerResponse) || 1000000000),
        totalBudget: new BN(parseInt(totalBudget) || 10000000000),
        humanRequirements: 0,
        metadataUri,
        maxResponses: parseInt(maxResponses) || 100,
        allowMultipleResponses: false,
        nonce,
      };

      console.log("Creating task with params:", {
        nonce: nonce.toString(),
        taskPda: taskPda.toBase58(),
        vaultPda: vaultPda.toBase58(),
        rewardMint: mintPubkey.toBase58(),
        creatorTokenAccount: creatorTokenAccount.toBase58(),
        rewardPerResponse: createTaskParams.rewardPerResponse.toString(),
        totalBudget: createTaskParams.totalBudget.toString(),
      });

      // Build the instruction
      const instruction = await program.methods
        .createTask(createTaskParams)
        .accounts({
          task: taskPda,
          vault: vaultPda,
          rewardMint: mintPubkey,
          creatorTokenAccount: creatorTokenAccount,
          creator: publicKey,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      // Get fresh blockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");

      // Build transaction
      const transaction = new Transaction({
        feePayer: publicKey,
        blockhash,
        lastValidBlockHeight,
      }).add(instruction);

      toast.info("Please approve the transaction in your wallet...");

      // Send transaction
      const signature = await sendTransaction(transaction, connection, {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      });

      console.log("Transaction sent:", signature);

      // Wait for confirmation
      toast.info("Confirming transaction...");
      const confirmation = await connection.confirmTransaction(
        { signature, blockhash, lastValidBlockHeight },
        "confirmed"
      );

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      toast.success("Task created successfully!", {
        description: `TX: ${signature.slice(0, 8)}...${signature.slice(-8)}`,
        action: {
          label: "View",
          onClick: () => window.open(`https://explorer.solana.com/tx/${signature}?cluster=${cluster}`, "_blank"),
        },
      });

      // Reset form and close dialog
      setDialogOpen(false);
      setTaskTitle("");
      setTaskDescription("");

      // Refresh task list
      setTimeout(() => refetch(), 2000);
    } catch (err: any) {
      console.error("Create task error:", err);

      let errorMessage = err.message || "Unknown error";

      if (errorMessage.includes("already been processed")) {
        errorMessage = "Transaction was already processed. This might mean the task was created - check explorer.";
      } else if (errorMessage.includes("insufficient funds") || errorMessage.includes("0x1")) {
        errorMessage = "Insufficient balance for transaction.";
      } else if (errorMessage.includes("AccountNotFound")) {
        errorMessage = "Token account not found. Make sure you have the reward token.";
      } else if (errorMessage.includes("User rejected")) {
        errorMessage = "Transaction was rejected by wallet.";
      } else if (err.logs) {
        const programError = err.logs.find((log: string) => log.includes("Error") || log.includes("error"));
        if (programError) {
          errorMessage = programError;
        }
      }

      toast.error("Failed to create task", { description: errorMessage });
    } finally {
      setCreating(false);
      isSubmitting.current = false;
    }
  };

  // Combine all tasks and my tasks for display
  const displayTasks = activeTab === "all" ? tasks : myTasks;

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600">
                <Cpu className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">DataBlink</h1>
                <p className="text-neutral-400">Micro-tasks for RLHF & data labeling</p>
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
                  <Button className="bg-cyan-600 hover:bg-cyan-700" disabled={!connected || !hasProfile}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Task
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg border-neutral-800 bg-neutral-900">
                  <DialogHeader>
                    <DialogTitle>Create Data Task</DialogTitle>
                    <DialogDescription>Create a micro-task for verified humans to complete</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Task Title *</Label>
                      <Input
                        value={taskTitle}
                        onChange={(e) => setTaskTitle(e.target.value)}
                        placeholder="Label these images..."
                        className="border-neutral-700 bg-neutral-800"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input
                        value={taskDescription}
                        onChange={(e) => setTaskDescription(e.target.value)}
                        placeholder="Detailed instructions for workers..."
                        className="border-neutral-700 bg-neutral-800"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Reward Token Mint (Token-2022) *</Label>
                      <Input
                        value={rewardMint}
                        onChange={(e) => setRewardMint(e.target.value)}
                        className="border-neutral-700 bg-neutral-800 font-mono text-xs"
                      />
                      <p className="text-xs text-neutral-500">Default: Test Token-2022 mint on devnet</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Reward per Response</Label>
                        <Input
                          type="number"
                          value={rewardPerResponse}
                          onChange={(e) => setRewardPerResponse(e.target.value)}
                          className="border-neutral-700 bg-neutral-800"
                        />
                        <p className="text-xs text-neutral-500">In smallest units</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Total Budget</Label>
                        <Input
                          type="number"
                          value={totalBudget}
                          onChange={(e) => setTotalBudget(e.target.value)}
                          className="border-neutral-700 bg-neutral-800"
                        />
                        <p className="text-xs text-neutral-500">Max tokens to escrow</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Max Responses</Label>
                      <Input
                        type="number"
                        value={maxResponses}
                        onChange={(e) => setMaxResponses(e.target.value)}
                        className="border-neutral-700 bg-neutral-800"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={creating}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateTask} className="bg-cyan-600 hover:bg-cyan-700" disabled={creating}>
                      {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Cpu className="mr-2 h-4 w-4" />}
                      {creating ? "Creating..." : "Create Task"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Not Connected State */}
          {!connected && (
            <Card className="border-neutral-800 bg-neutral-900/50">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Cpu className="mb-4 h-16 w-16 text-neutral-600" />
                <h2 className="mb-2 text-xl font-semibold">Connect Your Wallet</h2>
                <p className="mb-6 text-neutral-400">Connect a Solana wallet to use DataBlink</p>
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
                      You need a verified Human Profile to create tasks.{" "}
                      <a href="/human" className="text-yellow-500 underline">
                        Go to Human Dashboard →
                      </a>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Main Content - Connected with Profile */}
          {connected && hasProfile && (
            <>
              {/* Stats Cards */}
              <div className="mb-8 grid gap-4 md:grid-cols-4">
                <Card className="border-neutral-800 bg-neutral-900/50">
                  <CardContent className="p-6">
                    <Target className="mb-2 h-8 w-8 text-cyan-500" />
                    <p className="text-sm text-neutral-400">Open Tasks</p>
                    <p className="text-2xl font-bold">{stats.totalOpenTasks}</p>
                  </CardContent>
                </Card>
                <Card className="border-neutral-800 bg-neutral-900/50">
                  <CardContent className="p-6">
                    <List className="mb-2 h-8 w-8 text-purple-500" />
                    <p className="text-sm text-neutral-400">My Tasks</p>
                    <p className="text-2xl font-bold">{stats.myTaskCount}</p>
                  </CardContent>
                </Card>
                <Card className="border-neutral-800 bg-neutral-900/50">
                  <CardContent className="p-6">
                    <CheckCircle2 className="mb-2 h-8 w-8 text-emerald-500" />
                    <p className="text-sm text-neutral-400">My Responses</p>
                    <p className="text-2xl font-bold">{stats.myResponseCount}</p>
                  </CardContent>
                </Card>
                <Card className="border-neutral-800 bg-neutral-900/50">
                  <CardContent className="p-6">
                    <Coins className="mb-2 h-8 w-8 text-yellow-500" />
                    <p className="text-sm text-neutral-400">Tasks Completed</p>
                    <p className="text-2xl font-bold">{stats.tasksCompleted}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Task Tabs */}
              <div className="mb-6 flex gap-2">
                <Button
                  variant={activeTab === "all" ? "default" : "outline"}
                  className={activeTab === "all" ? "bg-cyan-600" : "border-neutral-700 bg-neutral-800"}
                  onClick={() => setActiveTab("all")}
                >
                  <Target className="mr-2 h-4 w-4" />
                  All Open Tasks ({tasks.length})
                </Button>
                <Button
                  variant={activeTab === "my" ? "default" : "outline"}
                  className={activeTab === "my" ? "bg-cyan-600" : "border-neutral-700 bg-neutral-800"}
                  onClick={() => setActiveTab("my")}
                >
                  <Award className="mr-2 h-4 w-4" />
                  My Tasks ({myTasks.length})
                </Button>
              </div>

              {/* Loading State */}
              {tasksLoading && (
                <Card className="border-neutral-800 bg-neutral-900/50">
                  <CardContent className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
                    <span className="ml-3 text-neutral-400">Loading tasks...</span>
                  </CardContent>
                </Card>
              )}

              {/* Error State */}
              {tasksError && (
                <Card className="border-red-900/50 bg-red-950/20">
                  <CardContent className="py-4">
                    <div className="flex gap-3">
                      <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
                      <div className="text-sm">
                        <p className="font-medium text-red-500">Error Loading Tasks</p>
                        <p className="mt-1 text-neutral-400">{tasksError}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Task List */}
              {!tasksLoading && !tasksError && displayTasks.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2">
                  {displayTasks.map((task) => (
                    <TaskCard
                      key={task.pda.toBase58()}
                      task={task}
                      isOwner={publicKey ? task.creator.equals(publicKey) : false}
                      onClose={handleCloseTask}
                      cluster={cluster}
                    />
                  ))}
                </div>
              )}

              {/* Empty State */}
              {!tasksLoading && !tasksError && displayTasks.length === 0 && (
                <Card className="border-neutral-800 bg-neutral-900/50">
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <Cpu className="mb-4 h-16 w-16 text-cyan-500" />
                    <h2 className="mb-2 text-xl font-semibold">
                      {activeTab === "all" ? "No Open Tasks" : "No Tasks Created"}
                    </h2>
                    <p className="mb-6 text-neutral-400">
                      {activeTab === "all"
                        ? "Be the first to create a task for verified humans!"
                        : "Create your first task to get started"}
                    </p>
                    <Button onClick={() => setDialogOpen(true)} className="bg-cyan-600 hover:bg-cyan-700">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Task
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Feature Cards */}
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                <Card className="border-neutral-800 bg-neutral-900/50">
                  <CardContent className="p-6">
                    <Users className="mb-3 h-8 w-8 text-emerald-500" />
                    <h3 className="font-semibold">Verified Humans</h3>
                    <p className="mt-1 text-sm text-neutral-400">Only verified humans can complete tasks</p>
                  </CardContent>
                </Card>
                <Card className="border-neutral-800 bg-neutral-900/50">
                  <CardContent className="p-6">
                    <Coins className="mb-3 h-8 w-8 text-yellow-500" />
                    <h3 className="font-semibold">Instant Rewards</h3>
                    <p className="mt-1 text-sm text-neutral-400">Get paid immediately upon completion</p>
                  </CardContent>
                </Card>
                <Card className="border-neutral-800 bg-neutral-900/50">
                  <CardContent className="p-6">
                    <List className="mb-3 h-8 w-8 text-purple-500" />
                    <h3 className="font-semibold">Quality Data</h3>
                    <p className="mt-1 text-sm text-neutral-400">Accountable humans produce better labels</p>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {/* Info Card */}
          <Card className="mt-8 border-cyan-900/50 bg-cyan-950/20">
            <CardContent className="py-4">
              <div className="flex gap-3">
                <Cpu className="h-5 w-5 shrink-0 text-cyan-400" />
                <div className="text-sm">
                  <p className="font-medium text-cyan-400">DataBlink Rail</p>
                  <p className="mt-1 text-neutral-400">
                    Micro-task platform for RLHF data labeling. Tasks are escrowed on-chain with Token-2022.
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