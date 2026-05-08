"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMandaraProduct } from "@/lib/hooks/use-mandara-product";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Lock, RefreshCw } from "lucide-react";

export default function MandaraMandatesPage() {
  const router = useRouter();
  const { loading, error, organizations, agents, wallets, policies, createPolicy } = useMandaraProduct();
  const [recipient, setRecipient] = useState("0x1111111111111111111111111111111111111111");
  const [perTxLimit, setPerTxLimit] = useState("100000000");
  const [dailyLimit, setDailyLimit] = useState("500000000");
  const [totalLimit, setTotalLimit] = useState("1000000000");
  const [busy, setBusy] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const organizationId = organizations[0]?.id;
  const agent = agents[0];
  const wallet = wallets[0];

  const createMandate = async () => {
    if (!agent || !wallet) return;
    setBusy(true);
    setPageError(null);
    try {
      await createPolicy({
        organizationId,
        agentId: agent.id,
        ikaDwalletId: wallet.id,
        name: "Base Sepolia USDC mandate",
        chainId: 84532,
        asset: "USDC:BASE_SEPOLIA",
        recipient,
        perTxLimit,
        dailyLimit,
        totalLimit,
      });
    } catch (err) {
      setPageError(err instanceof Error ? err.message : "Failed to create mandate");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-neutral-400"><RefreshCw className="mr-2 inline h-5 w-5 animate-spin" />Loading mandates…</div>;
  }

  const missingSetup = !organizationId || !agent || !wallet;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Mandates</h1>
        <p className="text-sm text-neutral-500">Define what an agent can request: chain, asset, recipient, and limits.</p>
      </div>

      {(error || pageError || missingSetup) && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <div className="space-y-2">
            <p className="text-xs text-amber-200/80">
              {pageError ?? error ?? "Create an organization, agent, and signing wallet before adding a mandate."}
            </p>
            {missingSetup && (
              <Button size="sm" className="bg-sky-600 text-xs hover:bg-sky-700" onClick={() => router.push("/mandara/app/onboarding")}>
                Start Onboarding
              </Button>
            )}
          </div>
        </div>
      )}

      <Card className="border-white/[0.06] bg-white/[0.03]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <Lock className="h-4 w-4 text-amber-400" />
            Create Base Sepolia USDC Mandate
          </CardTitle>
          <CardDescription className="text-neutral-500">No hashes or protocol internals are needed for the product flow.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-neutral-400">Chain</Label>
              <Input value="Base Sepolia" disabled className="border-white/[0.06] bg-white/[0.02] text-sm text-neutral-300" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-neutral-400">Asset</Label>
              <Input value="USDC" disabled className="border-white/[0.06] bg-white/[0.02] text-sm text-neutral-300" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-neutral-400">Recipient wallet address</Label>
            <Input value={recipient} onChange={(e) => setRecipient(e.target.value)} className="border-white/[0.06] bg-white/[0.02] text-sm text-neutral-300" />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-neutral-400">Per-transaction limit</Label>
              <Input value={perTxLimit} onChange={(e) => setPerTxLimit(e.target.value)} className="border-white/[0.06] bg-white/[0.02] text-sm text-neutral-300" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-neutral-400">Daily limit</Label>
              <Input value={dailyLimit} onChange={(e) => setDailyLimit(e.target.value)} className="border-white/[0.06] bg-white/[0.02] text-sm text-neutral-300" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-neutral-400">Total limit</Label>
              <Input value={totalLimit} onChange={(e) => setTotalLimit(e.target.value)} className="border-white/[0.06] bg-white/[0.02] text-sm text-neutral-300" />
            </div>
          </div>
          <Button disabled={busy || missingSetup} onClick={createMandate} className="bg-sky-600 hover:bg-sky-700">
            {busy ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create Mandate
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {policies.map((policy) => (
          <Card key={policy.id} className="border-white/[0.06] bg-white/[0.03]">
            <CardContent className="grid gap-2 p-4 text-sm md:grid-cols-4">
              <div className="font-medium text-white">{policy.name ?? "Mandate"}</div>
              <div className="text-neutral-400">Chain: {policy.allowedChainId}</div>
              <div className="text-neutral-400">Asset: {policy.allowedAsset ?? "Any"}</div>
              <div className="text-neutral-400">Per tx: {policy.perTxLimit}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
