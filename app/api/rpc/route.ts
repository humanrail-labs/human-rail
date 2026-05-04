import { NextRequest, NextResponse } from "next/server";

/**
 * Solana RPC Proxy
 *
 * Forwards JSON-RPC requests from the browser to the configured Solana RPC.
 * This keeps any RPC credentials (e.g. Helius API key) server-side and out
 * of the client bundle.
 *
 * Env var: SOLANA_RPC_URL (server-side only — do NOT prefix with NEXT_PUBLIC_)
 * Falls back to the public devnet endpoint if not set.
 */
const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";

const ALLOWED_METHODS = new Set([
  "getAccountInfo",
  "getBalance",
  "getBlockHeight",
  "getBlockProduction",
  "getBlockCommitment",
  "getBlocks",
  "getBlocksWithLimit",
  "getBlockTime",
  "getClusterNodes",
  "getEpochInfo",
  "getEpochSchedule",
  "getFeeForMessage",
  "getFirstAvailableBlock",
  "getGenesisHash",
  "getHealth",
  "getHighestSnapshotSlot",
  "getIdentity",
  "getInflationGovernor",
  "getInflationRate",
  "getInflationReward",
  "getLargestAccounts",
  "getLatestBlockhash",
  "getLeaderSchedule",
  "getMaxRetransmitSlot",
  "getMaxShredInsertSlot",
  "getMinimumBalanceForRentExemption",
  "getMultipleAccounts",
  "getProgramAccounts",
  "getRecentPerformanceSamples",
  "getSignaturesForAddress",
  "getSignatureStatuses",
  "getSlot",
  "getSlotLeader",
  "getSlotLeaders",
  "getStakeActivation",
  "getSupply",
  "getTokenAccountBalance",
  "getTokenAccountsByDelegate",
  "getTokenAccountsByOwner",
  "getTokenLargestAccounts",
  "getTokenSupply",
  "getTransaction",
  "getTransactionCount",
  "getVersion",
  "getVoteAccounts",
  "isBlockhashValid",
  "minimumLedgerSlot",
  "requestAirdrop",
  "sendTransaction",
  "simulateTransaction",
]);

// Simple per-IP in-memory rate limiter (sufficient for a single Vercel instance)
interface RateEntry {
  count: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateEntry>();
const RPC_RATE_LIMIT = 60; // requests per minute
const RPC_WINDOW_MS = 60_000;

function checkRpcRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RPC_WINDOW_MS });
    return { allowed: true, remaining: RPC_RATE_LIMIT - 1 };
  }
  if (entry.count >= RPC_RATE_LIMIT) {
    return { allowed: false, remaining: 0 };
  }
  entry.count += 1;
  return { allowed: true, remaining: RPC_RATE_LIMIT - entry.count };
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || request.ip || "unknown";
  const rate = checkRpcRateLimit(ip);
  if (!rate.allowed) {
    return NextResponse.json(
      { jsonrpc: "2.0", error: { code: -32005, message: "Rate limit exceeded" }, id: null },
      { status: 429 }
    );
  }

  let body: { method?: string; jsonrpc?: string; id?: unknown; params?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { jsonrpc: "2.0", error: { code: -32700, message: "Parse error" }, id: null },
      { status: 400 }
    );
  }

  if (!body.method || !ALLOWED_METHODS.has(body.method)) {
    return NextResponse.json(
      { jsonrpc: "2.0", error: { code: -32601, message: `Method ${body.method ?? "unknown"} not allowed` }, id: body.id ?? null },
      { status: 405 }
    );
  }

  try {
    const rpcResponse = await fetch(RPC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await rpcResponse.json();
    const response = NextResponse.json(data, { status: rpcResponse.status });
    response.headers.set("X-RateLimit-Remaining", String(rate.remaining));
    return response;
  } catch (error) {
    console.error("[RPC Proxy] Error forwarding request:", error);
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        error: { code: -32603, message: "RPC proxy error" },
        id: body.id ?? null,
      },
      { status: 502 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Use POST for JSON-RPC requests." },
    { status: 405 }
  );
}
