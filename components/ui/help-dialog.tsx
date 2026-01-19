"use client";

import { useState } from "react";
import { HelpCircle, X, Book, Shield, Cpu, FileText, AlertTriangle, CheckCircle, Terminal } from "lucide-react";

export function HelpButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25 transition-all hover:scale-110 hover:shadow-emerald-500/40"
        aria-label="Help"
      >
        <HelpCircle className="h-7 w-7" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-gradient-to-b from-neutral-900 to-neutral-950 border border-neutral-800 shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-800 bg-neutral-900/95 backdrop-blur px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                  <Book className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Documentation</h2>
                  <p className="text-xs text-neutral-500">HumanRail Protocol Guide</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-800 text-neutral-400 transition-colors hover:bg-neutral-700 hover:text-white"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto p-6 space-y-6" style={{ maxHeight: "calc(90vh - 80px)" }}>
              
              {/* Disclaimer */}
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-amber-400 mb-2">Disclaimer</h3>
                    <ul className="space-y-1 text-sm text-amber-200/80">
                      <li>• <strong>Demo-grade software</strong>: Built for product demonstration</li>
                      <li>• <strong>Not audited</strong>: Treat as experimental. Do not use with significant funds</li>
                      <li>• <strong>Devnet only</strong>: Use Solana devnet for testing</li>
                      <li>• <strong>No financial advice</strong>: Nothing here is an offer or promise</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* What is HumanRail */}
              <Section icon={<Shield className="h-5 w-5 text-emerald-400" />} title="What is HumanRail?">
                <p className="text-neutral-400 mb-3">
                  Identity + accountability infrastructure on Solana that answers:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <InfoCard text="Who is behind this action?" />
                  <InfoCard text="Was this agent authorized?" />
                  <InfoCard text="What limits applied?" />
                  <InfoCard text="Can we prove human involvement?" />
                </div>
              </Section>

              {/* Architecture */}
              <Section icon={<Cpu className="h-5 w-5 text-blue-400" />} title="Architecture">
                <div className="grid grid-cols-2 gap-3">
                  <ProgramCard name="human_registry" desc="Human profile + attestations" />
                  <ProgramCard name="agent_registry" desc="Agent identity + lifecycle" />
                  <ProgramCard name="delegation" desc="Capabilities + limits" />
                  <ProgramCard name="data_blink" desc="Micro-tasks + rewards" />
                  <ProgramCard name="document_registry" desc="Documents + signatures" />
                  <ProgramCard name="receipts" desc="Audit trail" />
                </div>
              </Section>

              {/* User Guide */}
              <Section icon={<FileText className="h-5 w-5 text-purple-400" />} title="Demo Flow">
                <div className="space-y-3">
                  <Step num="1" title="Connect Wallet" desc="Connect Phantom on devnet" />
                  <Step num="2" title="Register Human Profile" desc="Create your on-chain identity" />
                  <Step num="3" title="Register Agent" desc="Link an AI agent to your profile" />
                  <Step num="4" title="Use DataBlink" desc="Create tasks, submit responses, claim rewards" />
                  <Step num="5" title="Sign Documents" desc="Normal or verified signing flow" />
                </div>
              </Section>

              {/* Troubleshooting */}
              <Section icon={<Terminal className="h-5 w-5 text-red-400" />} title="Troubleshooting">
                <div className="space-y-3">
                  <ErrorCard 
                    code="InvalidProgramId (3008)" 
                    cause="Account order mismatch" 
                    fix="Ensure SystemProgram.programId is in correct position"
                  />
                  <ErrorCard 
                    code="AccountDiscriminatorMismatch (3002)" 
                    cause="Wrong PDA or mixed cluster IDs" 
                    fix="Confirm cluster matches program IDs"
                  />
                  <ErrorCard 
                    code="InvalidHumanProfile (6043)" 
                    cause="Wrong program id for profile PDA" 
                    fix="Validate human_profile owner is human_registry"
                  />
                  <ErrorCard 
                    code="Account already in use" 
                    cause="Deterministic seeds reused" 
                    fix="Add timestamp/nonce to PDA seeds"
                  />
                </div>
              </Section>

              {/* Checklist */}
              <Section icon={<CheckCircle className="h-5 w-5 text-emerald-400" />} title="Pre-Demo Checklist">
                <div className="space-y-2">
                  <CheckItem text="Confirm cluster in website (devnet)" />
                  <CheckItem text="Confirm program IDs match Anchor.toml" />
                  <CheckItem text="Register human profile and refresh UI" />
                  <CheckItem text="Run one happy path flow end-to-end" />
                  <CheckItem text="Keep backup wallet with existing profile" />
                </div>
              </Section>

            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-neutral-800/50 border border-neutral-700/50 p-5">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h3 className="font-semibold text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function InfoCard({ text }: { text: string }) {
  return (
    <div className="rounded-lg bg-neutral-700/30 px-3 py-2 text-sm text-neutral-300">
      {text}
    </div>
  );
}

function ProgramCard({ name, desc }: { name: string; desc: string }) {
  return (
    <div className="rounded-lg bg-neutral-700/30 p-3">
      <code className="text-xs text-emerald-400">{name}</code>
      <p className="text-xs text-neutral-500 mt-1">{desc}</p>
    </div>
  );
}

function Step({ num, title, desc }: { num: string; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-xs font-bold text-purple-400">
        {num}
      </div>
      <div>
        <p className="font-medium text-white">{title}</p>
        <p className="text-sm text-neutral-500">{desc}</p>
      </div>
    </div>
  );
}

function ErrorCard({ code, cause, fix }: { code: string; cause: string; fix: string }) {
  return (
    <div className="rounded-lg bg-red-500/5 border border-red-500/20 p-3">
      <code className="text-xs text-red-400">{code}</code>
      <p className="text-xs text-neutral-400 mt-1"><strong>Cause:</strong> {cause}</p>
      <p className="text-xs text-neutral-400"><strong>Fix:</strong> {fix}</p>
    </div>
  );
}

function CheckItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
      <p className="text-sm text-neutral-400">{text}</p>
    </div>
  );
}
