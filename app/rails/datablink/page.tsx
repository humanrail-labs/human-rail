"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Navbar } from "@/components/layout/navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DataBlinkPage() {
  const { connected, publicKey } = useWallet();
  const [status, setStatus] = useState("Loading...");

  useEffect(() => {
    setStatus("Page loaded successfully!");
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-3xl font-bold mb-4">DataBlink Debug</h1>
        <Card className="border-neutral-800 bg-neutral-900/50">
          <CardContent className="p-6">
            <p>Status: {status}</p>
            <p>Connected: {connected ? "Yes" : "No"}</p>
            <p>Wallet: {publicKey?.toBase58().slice(0, 8) || "None"}...</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
