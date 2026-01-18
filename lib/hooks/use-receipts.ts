"use client";

import { useEffect, useState, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useCluster } from "@/lib/solana/cluster-context";
import { getProgramId } from "@/lib/programs";

const ACTION_RECEIPT_DISCRIMINATOR = Buffer.from([52, 35, 16, 111, 195, 40, 16, 69]);

export interface ActionReceipt {
  principalId: PublicKey;
  agentId: PublicKey;
  capabilityId: PublicKey;
  actionHash: Uint8Array;
  resultHash: Uint8Array;
  actionType: number;
  value: bigint;
  destination: PublicKey;
  timestamp: number;
  slot: bigint;
  blockHash: Uint8Array;
  offchainRef: Uint8Array;
  hasOffchainRef: boolean;
  sequence: bigint;
  nonce: bigint;
  bump: number;
  pda: PublicKey;
}

function parseActionReceipt(data: Buffer, pda: PublicKey): ActionReceipt | null {
  try {
    const discriminator = data.slice(0, 8);
    if (!discriminator.equals(ACTION_RECEIPT_DISCRIMINATOR)) return null;

    let offset = 8;
    const principalId = new PublicKey(data.slice(offset, offset + 32)); offset += 32;
    const agentId = new PublicKey(data.slice(offset, offset + 32)); offset += 32;
    const capabilityId = new PublicKey(data.slice(offset, offset + 32)); offset += 32;
    const actionHash = new Uint8Array(data.slice(offset, offset + 32)); offset += 32;
    const resultHash = new Uint8Array(data.slice(offset, offset + 32)); offset += 32;
    const actionType = data[offset]; offset += 1;
    const value = data.readBigUInt64LE(offset); offset += 8;
    const destination = new PublicKey(data.slice(offset, offset + 32)); offset += 32;
    const timestamp = Number(data.readBigInt64LE(offset)); offset += 8;
    const slot = data.readBigUInt64LE(offset); offset += 8;
    const blockHash = new Uint8Array(data.slice(offset, offset + 32)); offset += 32;
    const offchainRef = new Uint8Array(data.slice(offset, offset + 64)); offset += 64;
    const hasOffchainRef = data[offset] === 1; offset += 1;
    const sequence = data.readBigUInt64LE(offset); offset += 8;
    const nonce = data.readBigUInt64LE(offset); offset += 8;
    const bump = data[offset];

    return { principalId, agentId, capabilityId, actionHash, resultHash, actionType, value, destination, timestamp, slot, blockHash, offchainRef, hasOffchainRef, sequence, nonce, bump, pda };
  } catch (err) {
    console.error("Failed to parse ActionReceipt:", err);
    return null;
  }
}

const ACTION_TYPE_NAMES: Record<number, string> = {
  0: "Transfer", 1: "Swap", 2: "Stake", 3: "Unstake", 4: "Task Response", 5: "Document Sign", 6: "Payment", 7: "Custom",
};

export function getActionTypeName(actionType: number): string {
  return ACTION_TYPE_NAMES[actionType] || `Action #${actionType}`;
}

export function useReceipts() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const { cluster } = useCluster();

  const [receipts, setReceipts] = useState<ActionReceipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReceipts = useCallback(async () => {
    if (!publicKey || !connection) return;

    setLoading(true);
    setError(null);

    try {
      const programId = getProgramId(cluster, "receipts");

      const receiptAccounts = await connection.getProgramAccounts(programId, {
        filters: [{ memcmp: { offset: 8, bytes: publicKey.toBase58() } }],
      });

      const parsedReceipts: ActionReceipt[] = [];
      for (const { pubkey, account } of receiptAccounts) {
        const parsed = parseActionReceipt(account.data as Buffer, pubkey);
        if (parsed) parsedReceipts.push(parsed);
      }

      parsedReceipts.sort((a, b) => b.timestamp - a.timestamp);
      setReceipts(parsedReceipts);
    } catch (err) {
      console.error("Failed to fetch receipts:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch receipts");
    } finally {
      setLoading(false);
    }
  }, [publicKey, connection, cluster]);

  useEffect(() => { fetchReceipts(); }, [fetchReceipts]);

  const stats = {
    totalReceipts: receipts.length,
    totalValue: receipts.reduce((sum, r) => sum + r.value, BigInt(0)),
    uniqueAgents: new Set(receipts.map((r) => r.agentId.toBase58())).size,
    actionTypes: receipts.reduce((acc, r) => {
      const name = getActionTypeName(r.actionType);
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };

  return { receipts, loading, error, stats, refetch: fetchReceipts, getActionTypeName };
}
