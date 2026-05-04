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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const rpcResponse = await fetch(RPC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await rpcResponse.json();
    return NextResponse.json(data, { status: rpcResponse.status });
  } catch (error) {
    console.error("[RPC Proxy] Error forwarding request:", error);
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        error: { code: -32603, message: "RPC proxy error" },
        id: null,
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
