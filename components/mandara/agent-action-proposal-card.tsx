"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AgentActionProposal, SigningRequestPreviewResult } from "@/lib/mandara-api/types";
import { CheckCircle2, ExternalLink, FileKey, Play, XCircle } from "lucide-react";

interface AgentActionProposalCardProps {
  proposal: AgentActionProposal;
  busy?: string | null;
  executionResult?: { signingRequestId: string; status: string; enqueued: boolean } | null;
  onApprove: (enqueue: boolean) => void;
  onReject: () => void;
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
          {allowed ? "Allowed" : "Rejected by mandate"}
        </Badge>
      </div>

      <div className="grid gap-2 text-xs sm:grid-cols-2">
        <Field label="Agent" value={proposal.agent?.name ?? proposal.agentId ?? "Unassigned"} />
        <Field label="Mandate" value={proposal.policy?.name ?? proposal.policyId ?? "Default"} />
        <Field label="Chain" value={String(structured.destinationChainId ?? "-")} />
        <Field label="Asset" value={String(structured.asset ?? "-")} />
        <Field label="Recipient" value={String(structured.recipient ?? "-")} wide />
        <Field label="Amount" value={String(structured.amount ?? "-")} />
        <Field label="Message" value={String(structured.message ?? "-")} wide />
        <Field label="Reason" value={policyDecision?.reason ?? proposal.rejectionReason ?? "-"} wide />
      </div>

      {executionResult && (
        <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-100">
          <div className="font-medium">Signature request created</div>
          <div className="mt-1 text-emerald-100/75">
            ID: {executionResult.signingRequestId} · Status: {executionResult.status} · Enqueued:{" "}
            {executionResult.enqueued ? "yes" : "no"}
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
            {executionResult.enqueued && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push("/mandara/app/requests")}
                className="h-8 text-xs"
              >
                Check execution status
              </Button>
            )}
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
              Reject
            </Button>
            <Button size="sm" variant="outline" disabled className="text-xs">
              Edit request
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push("/mandara/app/mandates")}
              className="text-xs"
            >
              View mandate
            </Button>
          </>
        )}
      </div>
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
