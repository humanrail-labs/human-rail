"use client";

import { useState } from "react";
import { useMandaraProduct } from "@/lib/hooks/use-mandara-product";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, RefreshCw, Wallet } from "lucide-react";

const DEMO_WALLET = {
  name: "Mandara Devnet Demo Signing Wallet",
  dwalletPda: "A6hbi4jAnjYLiHK6hGJ3U6X2H6KGWZY2FypxGrijmqWp",
  signingPublicKey: "02e2d5f53b1abc0451dfcbfc5a32421fa6cdfb7c6cbfbf7f84a3e6bb177cb0aa5d",
  curve: "Secp256k1",
};

export default function MandaraWalletsPage() {
  const { loading, error, wallets, organizations, importWallet } = useMandaraProduct();
  const [dwalletPda, setDwalletPda] = useState("");
  const [signingPublicKey, setSigningPublicKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const organizationId = organizations[0]?.id;

  const submitWallet = async (demo = false) => {
    setBusy(true);
    setPageError(null);
    try {
      await importWallet(
        demo
          ? { organizationId, ...DEMO_WALLET, state: "Active", metadata: { source: "mandara-devnet-demo" } }
          : {
            organizationId,
            name: "Imported Signing Wallet",
            dwalletPda: dwalletPda.trim(),
            signingPublicKey: signingPublicKey.trim() || undefined,
            curve: "Secp256k1",
          }
      );
      setDwalletPda("");
      setSigningPublicKey("");
    } catch (err) {
      setPageError(err instanceof Error ? err.message : "Failed to import signing wallet");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-neutral-400"><RefreshCw className="mr-2 inline h-5 w-5 animate-spin" />Loading signing wallets…</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Signing Wallets</h1>
        <p className="text-sm text-neutral-500">Manage the Ika dWallets Mandara can use after mandate approval. No browser wallet is required here.</p>
      </div>

      {(error || pageError || !organizationId) && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <p className="text-xs text-amber-200/80">{pageError ?? error ?? "Create an organization in onboarding before importing signing wallets."}</p>
        </div>
      )}

      <Card className="border-white/[0.06] bg-white/[0.03]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <Wallet className="h-4 w-4 text-sky-400" />
            Use Demo Signing Wallet
          </CardTitle>
          <CardDescription className="text-neutral-500">Fastest path for non-technical devnet onboarding.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button disabled={busy || !organizationId} onClick={() => submitWallet(true)} className="bg-sky-600 hover:bg-sky-700">
            {busy ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
            Use Devnet Demo Signing Wallet
          </Button>
        </CardContent>
      </Card>

      <Card className="border-white/[0.06] bg-white/[0.03]">
        <CardHeader>
          <CardTitle className="text-base text-white">Advanced Import</CardTitle>
          <CardDescription className="text-neutral-500">For reviewers who already have an Ika dWallet PDA.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-neutral-400">dWallet PDA</Label>
            <Input value={dwalletPda} onChange={(e) => setDwalletPda(e.target.value)} className="border-white/[0.06] bg-white/[0.02] text-sm text-neutral-300" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-neutral-400">Signing public key</Label>
            <Input value={signingPublicKey} onChange={(e) => setSigningPublicKey(e.target.value)} className="border-white/[0.06] bg-white/[0.02] text-sm text-neutral-300" />
          </div>
          <Button disabled={busy || !organizationId || !dwalletPda.trim()} onClick={() => submitWallet(false)} variant="outline">
            Import Signing Wallet
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        {wallets.map((wallet) => (
          <Card key={wallet.id} className="border-white/[0.06] bg-white/[0.03]">
            <CardContent className="space-y-2 p-4 text-sm">
              <div className="font-medium text-white">{wallet.name ?? "Signing Wallet"}</div>
              <div className="break-all text-xs text-neutral-500">{wallet.onChainPda}</div>
              <div className="text-xs text-neutral-400">State: {wallet.state}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
