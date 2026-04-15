"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function VaultError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-red-500/10 ring-1 ring-red-500/20">
        <AlertTriangle className="h-8 w-8 text-red-500" />
      </div>
      <h2 className="mb-2 text-xl font-bold text-white">Something went wrong</h2>
      <p className="mb-6 max-w-sm text-sm text-neutral-500">
        {error.message || "We couldn’t load this page. Please try again."}
      </p>
      <div className="flex items-center gap-3">
        <Button onClick={() => reset()} className="bg-emerald-600 hover:bg-emerald-700">
          Try again
        </Button>
        <Button variant="outline" onClick={() => (window.location.href = "/vault")}>
          Back to Vault
        </Button>
      </div>
    </div>
  );
}
