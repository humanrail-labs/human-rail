"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { useCluster } from "@/lib/solana/cluster-context";
import { getProgramId, getDataBlinkProgram } from "@/lib/programs";

// Token-2022 Program ID
const TOKEN_2022_PROGRAM_ID = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");

const TASK_DISCRIMINATOR = Buffer.from([79, 34, 229, 55, 88, 90, 55, 84]);
const TASK_RESPONSE_DISCRIMINATOR = Buffer.from([15, 27, 78, 96, 131, 56, 101, 227]);
const WORKER_STATS_DISCRIMINATOR = Buffer.from([168, 235, 115, 241, 230, 13, 222, 22]);

export interface Task {
  creator: PublicKey;
  rewardMint: PublicKey;
  rewardPerResponse: bigint;
  totalBudget: bigint;
  consumedBudget: bigint;
  humanRequirements: number;
  metadataUri: string;
  isOpen: boolean;
  responseCount: number;
  maxResponses: number;
  allowMultipleResponses: boolean;
  createdAt: number;
  closedAt: number;
  vault: PublicKey;
  bump: number;
  vaultBump: number;
  nonce: bigint;
  pda: PublicKey;
}

export interface TaskResponse {
  task: PublicKey;
  worker: PublicKey;
  choice: number;
  responseData: Uint8Array;
  humanScoreAtSubmission: number;
  rewardAmount: bigint;
  isClaimed: boolean;
  submittedAt: number;
  claimedAt: number;
  bump: number;
  pda: PublicKey;
}

export interface WorkerStats {
  worker: PublicKey;
  tasksCompleted: number;
  totalRewardsEarned: bigint;
  qualityScore: number;
  firstParticipation: number;
  lastActivity: number;
  bump: number;
  pda: PublicKey;
}

export interface CreateTaskParams {
  rewardMint: PublicKey;
  rewardPerResponse: number;
  totalBudget: number;
  humanRequirements: number;
  metadataUri: string;
  maxResponses: number;
  allowMultipleResponses: boolean;
}

// Helper: derive associated token address (replaces @solana/spl-token dependency)
function getAssociatedTokenAddressSync(
  mint: PublicKey,
  owner: PublicKey,
  allowOwnerOffCurve: boolean = false,
  programId: PublicKey = TOKEN_2022_PROGRAM_ID,
  associatedTokenProgramId: PublicKey = ASSOCIATED_TOKEN_PROGRAM_ID
): PublicKey {
  const [address] = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), programId.toBuffer(), mint.toBuffer()],
    associatedTokenProgramId
  );
  return address;
}

function parseTask(data: Buffer, pda: PublicKey): Task | null {
  try {
    if (!data.slice(0, 8).equals(TASK_DISCRIMINATOR)) return null;
    let offset = 8;
    const creator = new PublicKey(data.slice(offset, offset + 32)); offset += 32;
    const rewardMint = new PublicKey(data.slice(offset, offset + 32)); offset += 32;
    const rewardPerResponse = data.readBigUInt64LE(offset); offset += 8;
    const totalBudget = data.readBigUInt64LE(offset); offset += 8;
    const consumedBudget = data.readBigUInt64LE(offset); offset += 8;
    const humanRequirements = data.readUInt16LE(offset); offset += 2;
    const uriLength = data.readUInt32LE(offset); offset += 4;
    const metadataUri = data.slice(offset, offset + uriLength).toString("utf-8"); offset += uriLength;
    const isOpen = data[offset] === 1; offset += 1;
    const responseCount = data.readUInt32LE(offset); offset += 4;
    const maxResponses = data.readUInt32LE(offset); offset += 4;
    const allowMultipleResponses = data[offset] === 1; offset += 1;
    const createdAt = Number(data.readBigInt64LE(offset)); offset += 8;
    const closedAt = Number(data.readBigInt64LE(offset)); offset += 8;
    const vault = new PublicKey(data.slice(offset, offset + 32)); offset += 32;
    const bump = data[offset]; offset += 1;
    const vaultBump = data[offset]; offset += 1;
    const nonce = data.readBigUInt64LE(offset);
    return { creator, rewardMint, rewardPerResponse, totalBudget, consumedBudget, humanRequirements, metadataUri, isOpen, responseCount, maxResponses, allowMultipleResponses, createdAt, closedAt, vault, bump, vaultBump, nonce, pda };
  } catch (err) { return null; }
}

function parseTaskResponse(data: Buffer, pda: PublicKey): TaskResponse | null {
  try {
    if (!data.slice(0, 8).equals(TASK_RESPONSE_DISCRIMINATOR)) return null;
    let offset = 8;
    const task = new PublicKey(data.slice(offset, offset + 32)); offset += 32;
    const worker = new PublicKey(data.slice(offset, offset + 32)); offset += 32;
    const choice = data[offset]; offset += 1;
    const responseData = new Uint8Array(data.slice(offset, offset + 32)); offset += 32;
    const humanScoreAtSubmission = data.readUInt16LE(offset); offset += 2;
    const rewardAmount = data.readBigUInt64LE(offset); offset += 8;
    const isClaimed = data[offset] === 1; offset += 1;
    const submittedAt = Number(data.readBigInt64LE(offset)); offset += 8;
    const claimedAt = Number(data.readBigInt64LE(offset)); offset += 8;
    const bump = data[offset];
    return { task, worker, choice, responseData, humanScoreAtSubmission, rewardAmount, isClaimed, submittedAt, claimedAt, bump, pda };
  } catch (err) { return null; }
}

function parseWorkerStats(data: Buffer, pda: PublicKey): WorkerStats | null {
  try {
    if (!data.slice(0, 8).equals(WORKER_STATS_DISCRIMINATOR)) return null;
    let offset = 8;
    const worker = new PublicKey(data.slice(offset, offset + 32)); offset += 32;
    const tasksCompleted = data.readUInt32LE(offset); offset += 4;
    const totalRewardsEarned = data.readBigUInt64LE(offset); offset += 8;
    const qualityScore = data.readUInt16LE(offset); offset += 2;
    const firstParticipation = Number(data.readBigInt64LE(offset)); offset += 8;
    const lastActivity = Number(data.readBigInt64LE(offset)); offset += 8;
    const bump = data[offset];
    return { worker, tasksCompleted, totalRewardsEarned, qualityScore, firstParticipation, lastActivity, bump, pda };
  } catch (err) { return null; }
}

// Helper to write BigInt to buffer (browser compatible)
function writeBigUint64LE(buffer: Buffer, value: bigint, offset: number): void {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  view.setBigUint64(offset, value, true);
}

export function useDataBlink() {
  const { connection } = useConnection();
  const { publicKey, wallet, signTransaction } = useWallet();
  const { cluster } = useCluster();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [myResponses, setMyResponses] = useState<TaskResponse[]>([]);
  const [workerStats, setWorkerStats] = useState<WorkerStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track the current wallet to detect changes
  const prevPublicKeyRef = useRef<string | null>(null);

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
    return new AnchorProvider(connection, anchorWallet as any, { commitment: "confirmed" });
  }, [connection, publicKey, wallet, signTransaction]);

  const fetchTasks = useCallback(async (currentPublicKey: PublicKey | null) => {
    if (!connection) return;
    setLoading(true);
    setError(null);

    try {
      const programId = getProgramId(cluster, "dataBlink");
      const allAccounts = await connection.getProgramAccounts(programId);

      const allTasks: Task[] = [];
      const creatorTasks: Task[] = [];
      const responses: TaskResponse[] = [];

      for (const { pubkey, account } of allAccounts) {
        const taskParsed = parseTask(account.data as Buffer, pubkey);
        if (taskParsed) {
          allTasks.push(taskParsed);
          // Use the passed publicKey, not the one from hook (may be stale)
          if (currentPublicKey && taskParsed.creator.equals(currentPublicKey)) {
            creatorTasks.push(taskParsed);
          }
          continue;
        }
        if (currentPublicKey) {
          const responseParsed = parseTaskResponse(account.data as Buffer, pubkey);
          if (responseParsed && responseParsed.worker.equals(currentPublicKey)) {
            responses.push(responseParsed);
          }
        }
      }

      allTasks.sort((a, b) => b.createdAt - a.createdAt);
      setTasks(allTasks.filter((t) => t.isOpen));
      setMyTasks(creatorTasks);
      setMyResponses(responses);

      if (currentPublicKey) {
        const [workerStatsPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("worker_stats"), currentPublicKey.toBuffer()],
          programId
        );
        try {
          const statsAccount = await connection.getAccountInfo(workerStatsPda);
          if (statsAccount) {
            setWorkerStats(parseWorkerStats(statsAccount.data as Buffer, workerStatsPda));
          } else {
            setWorkerStats(null);
          }
        } catch {
          setWorkerStats(null);
        }
      } else {
        setWorkerStats(null);
      }
    } catch (err) {
      console.error("Error fetching tasks:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch tasks");
    } finally {
      setLoading(false);
    }
  }, [connection, cluster]);

  // Clear state and refetch when wallet changes
  useEffect(() => {
    const currentKey = publicKey?.toBase58() || null;
    const prevKey = prevPublicKeyRef.current;

    // Wallet changed (including disconnect)
    if (currentKey !== prevKey) {
      // Clear all user-specific data immediately
      setMyTasks([]);
      setMyResponses([]);
      setWorkerStats(null);
      setError(null);

      // Update ref
      prevPublicKeyRef.current = currentKey;

      // Refetch with new wallet
      if (connection) {
        fetchTasks(publicKey);
      }
    }
  }, [publicKey, connection, fetchTasks]);

  // Initial fetch on mount
  useEffect(() => {
    if (connection) {
      fetchTasks(publicKey);
    }
  }, [connection, cluster]); // Only on connection/cluster change, not publicKey (handled above)

  // Public refetch function
  const refetch = useCallback(() => {
    fetchTasks(publicKey);
  }, [fetchTasks, publicKey]);

  /**
   * Create a new task
   */
  const createTask = useCallback(
    async (params: CreateTaskParams): Promise<string> => {
      if (!publicKey || !connection) throw new Error("Wallet not connected");
      const provider = getProvider();
      if (!provider) throw new Error("Could not create Anchor provider");

      const program = getDataBlinkProgram(provider, cluster);
      const programId = getProgramId(cluster, "dataBlink");

      // Generate unique nonce
      const nonce = new BN(Date.now());
      const nonceBuffer = Buffer.alloc(8);
      writeBigUint64LE(nonceBuffer, BigInt(nonce.toString()), 0);

      // Derive PDAs
      const [taskPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("task"), publicKey.toBuffer(), nonceBuffer],
        programId
      );
      const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("task_vault"), taskPda.toBuffer()],
        programId
      );

      // Get creator's token account
      const creatorTokenAccount = getAssociatedTokenAddressSync(
        params.rewardMint,
        publicKey,
        false,
        TOKEN_2022_PROGRAM_ID
      );

      const createTaskParams = {
        rewardPerResponse: new BN(params.rewardPerResponse),
        totalBudget: new BN(params.totalBudget),
        humanRequirements: params.humanRequirements,
        metadataUri: params.metadataUri,
        maxResponses: params.maxResponses,
        allowMultipleResponses: params.allowMultipleResponses,
        nonce: nonce,
      };

      console.log("Creating task with params:", {
        ...createTaskParams,
        taskPda: taskPda.toBase58(),
        vaultPda: vaultPda.toBase58(),
        rewardMint: params.rewardMint.toBase58(),
        creatorTokenAccount: creatorTokenAccount.toBase58(),
      });

      const signature = await program.methods
        .createTask(createTaskParams)
        .accounts({
          task: taskPda,
          vault: vaultPda,
          rewardMint: params.rewardMint,
          creatorTokenAccount: creatorTokenAccount,
          creator: publicKey,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("Task created:", signature);
      await fetchTasks(publicKey);
      return signature;
    },
    [publicKey, connection, cluster, getProvider, fetchTasks]
  );

  /**
   * Submit a response to a task
   */
  const submitResponse = useCallback(
    async (taskPda: PublicKey, choice: number, responseData: Uint8Array): Promise<string> => {
      if (!publicKey || !connection) throw new Error("Wallet not connected");
      const provider = getProvider();
      if (!provider) throw new Error("Could not create Anchor provider");

      const program = getDataBlinkProgram(provider, cluster);
      const programId = getProgramId(cluster, "dataBlink");
      const humanRegistryProgramId = getProgramId(cluster, "humanRegistry");

      const responseNonce = new BN(Date.now());
      const nonceBuffer = Buffer.alloc(8);
      writeBigUint64LE(nonceBuffer, BigInt(responseNonce.toString()), 0);

      const [responsePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("response"), taskPda.toBuffer(), publicKey.toBuffer(), nonceBuffer],
        programId
      );
      const [workerProfilePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("human_profile"), publicKey.toBuffer()],
        humanRegistryProgramId
      );
      const [workerStatsPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("worker_stats"), publicKey.toBuffer()],
        programId
      );

      const responseDataArray = Array.from(responseData.slice(0, 32));
      while (responseDataArray.length < 32) responseDataArray.push(0);

      const signature = await program.methods
        .submitResponse(choice, responseDataArray, responseNonce)
        .accounts({
          task: taskPda,
          response: responsePda,
          workerProfile: workerProfilePda,
          workerStats: workerStatsPda,
          worker: publicKey,
          humanRegistryProgram: humanRegistryProgramId,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      await fetchTasks(publicKey);
      return signature;
    },
    [publicKey, connection, cluster, getProvider, fetchTasks]
  );

  /**
   * Close a task and reclaim remaining funds
   */
  const closeTask = useCallback(
    async (taskPda: PublicKey): Promise<string> => {
      if (!publicKey || !connection) throw new Error("Wallet not connected");
      const provider = getProvider();
      if (!provider) throw new Error("Could not create Anchor provider");

      const program = getDataBlinkProgram(provider, cluster);
      const programId = getProgramId(cluster, "dataBlink");

      // Fetch task to get vault and reward mint
      const taskAccount = await connection.getAccountInfo(taskPda);
      if (!taskAccount) throw new Error("Task not found");
      const task = parseTask(taskAccount.data as Buffer, taskPda);
      if (!task) throw new Error("Failed to parse task");

      // Derive vault PDA
      const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("task_vault"), taskPda.toBuffer()],
        programId
      );

      // Get creator's token account
      const creatorTokenAccount = getAssociatedTokenAddressSync(
        task.rewardMint,
        publicKey,
        false,
        TOKEN_2022_PROGRAM_ID
      );

      const signature = await program.methods
        .closeTask()
        .accounts({
          task: taskPda,
          vault: vaultPda,
          rewardMint: task.rewardMint,
          creatorTokenAccount: creatorTokenAccount,
          creator: publicKey,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .rpc();

      await fetchTasks(publicKey);
      return signature;
    },
    [publicKey, connection, cluster, getProvider, fetchTasks]
  );

  /**
   * Claim rewards for a completed response
   */
  const claimRewards = useCallback(
    async (responsePda: PublicKey): Promise<string> => {
      if (!publicKey || !connection) throw new Error("Wallet not connected");
      const provider = getProvider();
      if (!provider) throw new Error("Could not create Anchor provider");

      const program = getDataBlinkProgram(provider, cluster);
      const programId = getProgramId(cluster, "dataBlink");

      // Fetch response to get task
      const responseAccount = await connection.getAccountInfo(responsePda);
      if (!responseAccount) throw new Error("Response not found");
      const response = parseTaskResponse(responseAccount.data as Buffer, responsePda);
      if (!response) throw new Error("Failed to parse response");

      // Fetch task to get reward mint
      const taskAccount = await connection.getAccountInfo(response.task);
      if (!taskAccount) throw new Error("Task not found");
      const task = parseTask(taskAccount.data as Buffer, response.task);
      if (!task) throw new Error("Failed to parse task");

      // Derive vault PDA
      const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("task_vault"), response.task.toBuffer()],
        programId
      );

      // Get worker's token account
      const workerTokenAccount = getAssociatedTokenAddressSync(
        task.rewardMint,
        publicKey,
        false,
        TOKEN_2022_PROGRAM_ID
      );

      const signature = await program.methods
        .claimRewards()
        .accounts({
          task: response.task,
          response: responsePda,
          vault: vaultPda,
          rewardMint: task.rewardMint,
          workerTokenAccount: workerTokenAccount,
          worker: publicKey,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .rpc();

      await fetchTasks(publicKey);
      return signature;
    },
    [publicKey, connection, cluster, getProvider, fetchTasks]
  );

  const stats = {
    totalOpenTasks: tasks.length,
    myTaskCount: myTasks.length,
    myResponseCount: myResponses.length,
    totalRewardsEarned: workerStats?.totalRewardsEarned || BigInt(0),
    tasksCompleted: workerStats?.tasksCompleted || 0,
  };

  return {
    tasks,
    myTasks,
    myResponses,
    workerStats,
    loading,
    error,
    stats,
    refetch,
    createTask,
    submitResponse,
    closeTask,
    claimRewards,
  };
}