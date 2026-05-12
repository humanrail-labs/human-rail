"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AgentActionProposal, SigningRequestPreviewResult } from "@/lib/mandara-api/types";
import { CheckCircle2, ChevronDown, ChevronUp, ExternalLink, FileKey, Play, XCircle } from "lucide-react";

interface AgentActionProposalCardProps {
  proposal: AgentActionProposal;
  busy?: string | null;
  executionResult?: { signingRequestId: string; status: string; enqueued: boolean } | null;
  onApprove: (enqueue: boolean) => void;
  onReject: () => void;
}

function humanReadableReason(proposal: AgentActionProposal, allowed: boolean): string {
  const structured = proposal.structuredInput ?? {};
  const policyDecision = proposal.policyDecision as SigningRequestPreviewResult | undefined;

  if (!allowed) {
    const reason = policyDecision?.reason ?? proposal.rejectionReason ?? "";
    if (reason.includes("per-transaction") || reason.includes("perTxLimit")) {
      return "This request is rejected because the amount exceeds the per-transaction limit. Try a smaller amount or update the mandate.";
    }
    if (reason.includes("daily") || reason.includes("dailyLimit")) {
      return "This request is rejected because it would exceed the daily spending limit. Wait until the next day or update the mandate.";
    }
    if (reason.includes("total") || reason.includes("totalLimit")) {
      return "This request is rejected because it would exceed the total spending limit. Update the mandate to allow more.";
    }
    if (reason.includes("asset") || reason.includes("Asset")) {
      return "This request is rejected because the asset is not allowed by the mandate. Use the approved asset or update the mandate.";
    }
    if (reason.includes("recipient") || reason.includes("Recipient")) {
      return "This request is rejected because the recipient is not allowed by the mandate. Use the approved recipient or update the mandate.";
    }
    if (reason.includes("chain") || reason.includes("Chain")) {
      return "This request is rejected because the chain is not allowed by the mandate. Use the approved chain or update the mandate.";
    }
    if (reason.includes("frozen") || reason.includes("Frozen")) {
      return "This request is rejected because the mandate is frozen. Unfreeze the mandate to continue.";
    }
    if (reason.includes("expired") || reason.includes("Expired")) {
      return "This request is rejected because the mandate has expired. Create a new mandate to continue.";
    }
    return `This request is rejected: ${reason}`;
  }

  // Allowed
  const amount = structured.amount ? String(structured.amount) : undefined;
  const asset = String(structured.asset ?? "-");
  const chainId = String(structured.destinationChainId ?? "-");
  const recipient = String(structured.recipient ?? "-");

  return `This request is allowed because the chain (${chainId}), asset (${asset}), recipient (${recipient.slice(0, 10)}…), and amount (${amount ?? "-"}) match the current mandate. You still need to approve before Mandara creates the request.`;
}

export function AgentActionProposalCard({
  proposal,
  busy,
  executionResult,
  onApprove,
  onReject,
}: AgentActionProposalCardProps) {
  const router = useRouter();
  const structured = proposal.structuredInput ?? {};
  const policyDecision = proposal.policyDecision as SigningRequestPreviewResult | undefined;
  const allowed = policyDecision?.allowed === true;
  const [showAdvanced, setShowAdvanced] = useState(false);

  const chainLabel =
    structured.destinationChainId === 84532
      ? "Base Sepolia (84532)"
      : String(structured.destinationChainId ?? "-");
  const recipientLabel =
    structured.recipient === "0x1111111111111111111111111111111111111111"
      ? "Approved demo recipient"
      : String(structured.recipient ?? "-");

  return (
    <div className="rounded-lg border border-[#5EBDB0]/18 bg-[#21342F]/50 p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FileKey className="h-4 w-4 text-[#8de7dc]" />
            <h3 className="text-sm font-semibold text-white">Signature Request Proposal</h3>
          </div>
          <p className="mt-1 text-xs text-neutral-500">No execution happens until you approve.</p>
        </div>
        <Badge
          variant="outline"
          className={
            allowed
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
              : "border-red-500/20 bg-red-500/10 text-red-300"
          }
        >
          {allowed ? "Allowed by mandate" : "Rejected by mandate"}
        </Badge>
      </div>

      <div className="space-y-3 text-xs">
        <div className="grid gap-2 sm:grid-cols-2">
          <Field label="Agent" value={proposal.agent?.name ?? proposal.agentId ?? "Unassigned"} />
          <Field label="Mandate" value={proposal.policy?.name ?? proposal.policyId ?? "Default"} />
          <Field label="Chain" value={chainLabel} />
          <Field label="Asset" value={String(structured.asset ?? "-")} />
          <Field label="Recipient" value={recipientLabel} wide />
          <Field label="Amount" value={String(structured.amount ?? "-")} />
          <Field label="Message" value={String(structured.message ?? "-")} wide />
        </div>

        <div className={`rounded-lg border px-3 py-2 text-xs leading-5 ${allowed ? "border-emerald-500/15 bg-emerald-500/5 text-emerald-100/80" : "border-red-500/15 bg-red-500/5 text-red-100/80"}`}>
          <span className="font-medium">{allowed ? "Mandate check: " : "Rejection reason: "}</span>
          {humanReadableReason(proposal, allowed)}
        </div>

        {allowed && (
          <div className="rounded-lg border border-amber-500/15 bg-amber-500/5 px-3 py-2 text-xs leading-5 text-amber-100/70">
            <span className="font-medium text-amber-200/90">What happens if approved?</span>
            <br />
            Approving creates a signature request. Enqueueing sends it to the worker. The worker still enforces policy before any on-chain action.
          </div>
        )}
      </div>

      {executionResult && (
        <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-100">
          <div className="font-medium">Request created</div>
          <div className="mt-1 text-emerald-100/75">
            ID: {executionResult.signingRequestId} · Status: {executionResult.status}
            {executionResult.enqueued ? " · Queued for worker execution" : ""}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push("/mandara/app/requests")}
              className="h-8 text-xs"
            >
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              View in Signature Requests
            </Button>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {allowed ? (
          <>
            <Button
              size="sm"
              onClick={() => onApprove(false)}
              disabled={!!busy}
              className="bg-[#3E877E] text-xs hover:bg-[#326d66]"
            >
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
              Approve & Create Request
            </Button>
            <Button
              size="sm"
              onClick={() => onApprove(true)}
              disabled={!!busy}
              className="bg-sky-600 text-xs hover:bg-sky-700"
            >
              <Play className="mr-1.5 h-3.5 w-3.5" />
              Approve, Create & Enqueue
            </Button>
            <Button size="sm" variant="outline" onClick={onReject} disabled={!!busy} className="text-xs">
              <XCircle className="mr-1.5 h-3.5 w-3.5" />
              Reject
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" variant="outline" onClick={onReject} disabled={!!busy} className="text-xs">
              <XCircle className="mr-1.5 h-3.5 w-3.5" />
              Reject Proposal
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push("/mandara/app/mandates")}
              className="text-xs"
            >
              View Mandate
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push("/mandara/app/agent-chat")}
              className="text-xs"
            >
              Edit Request
            </Button>
          </>
        )}
      </div>

      <button
        onClick={() => setShowAdvanced((v) => !v)}
        className="mt-3 flex items-center gap-1 text-[11px] text-neutral-500 hover:text-neutral-400"
      >
        {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        Advanced details
      </button>

      {showAdvanced && (
        <div className="mt-2 rounded border border-white/[0.06] bg-black/20 p-2">
          <pre className="overflow-x-auto text-[10px] text-neutral-400">
            {JSON.stringify(
              {
                proposalId: proposal.id,
                status: proposal.status,
                policyDecision,
                structuredInput: proposal.structuredInput,
              },
              null,
              2
            )}
          </pre>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <div className="text-neutral-500">{label}</div>
      <div className="mt-0.5 break-words rounded border border-white/[0.06] bg-white/[0.025] px-2 py-1.5 text-[#B2BDBA]">
        {value}
      </div>
    </div>
  );
}
