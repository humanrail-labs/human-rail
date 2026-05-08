"use client";

import { useState, useEffect } from "react";
import { HelpCircle, X, ChevronRight, AlertTriangle, Building2, Bot, Shield, Wallet, FileKey, Activity, Webhook, FlaskConical, Code } from "lucide-react";
import { Button } from "@/components/ui/button";

const DOCUMENTATION_SECTIONS = [
  {
    id: "disclaimer",
    icon: AlertTriangle,
    title: "Disclaimer",
    content: `Mandara is a devnet beta product.

• Devnet only: current flows run against Solana devnet and local/product API environments.
• Ika pre-alpha mock signer: current Ika proof uses pre-alpha infrastructure and a mock signer.
• Not production custody: do not use Mandara for real assets today.
• Not mainnet-ready: mainnet depends on Ika readiness, HumanRail audits, production auth, rate limits, monitoring, and hardened secret management.
• Product demo: features and UI may change quickly while the product is hardened.`,
  },
  {
    id: "what-is-mandara",
    icon: Shield,
    title: "What is Mandara?",
    content: `Mandara by HumanRail is a control plane for AI agents that need signing power without unlimited wallet control.

Mandara product layer:

• Console and onboarding
• Agent registration
• Signing Wallet management
• Mandates / policy setup
• Signature Request preview, creation, and execution tracking
• Connection Keys for real agent integrations
• Webhooks and Activity Log
• SDK / REST API for AI agent builders

HumanRail provides the guardrail and audit layer. Ika provides dWallet signing infrastructure.`,
  },
  {
    id: "workspace",
    icon: Building2,
    title: "Workspace",
    content: `A Mandara workspace is the product container for a team or project.

It owns:

• Agents
• Signing Wallets
• Mandates
• Signature Requests
• Webhooks
• Activity Log entries

Start here: /mandara/app/onboarding`,
  },
  {
    id: "agents",
    icon: Bot,
    title: "Agents",
    content: `A Mandara Agent is the product identity for a real AI agent, bot, backend service, or automation.

Mandara does not run the AI model. It governs what the external agent is allowed to request.

Agents connect through:

• Connection Keys
• Mandara REST API
• Mandara TypeScript SDK

Open: /mandara/app/agents`,
  },
  {
    id: "wallets",
    icon: Wallet,
    title: "Signing Wallets",
    content: `A Signing Wallet is the wallet Mandara uses after a request passes its mandate.

For normal product users:

• No browser wallet is required.
• Use the Devnet Demo Signing Wallet for onboarding.
• Manual dWallet import is available for advanced reviewers.

Under the hood, Signing Wallets are backed by Ika dWallet infrastructure.

Open: /mandara/app/wallets`,
  },
  {
    id: "mandates",
    icon: Shield,
    title: "Mandates",
    content: `A Mandate defines what an agent is allowed to request.

Product terms:

• Chain
• Asset
• Recipient wallet address
• Per-transaction limit
• Daily limit
• Total limit

If a request is outside the mandate, Mandara rejects it before signing.

Open: /mandara/app/mandates`,
  },
  {
    id: "requests",
    icon: FileKey,
    title: "Signature Requests",
    content: `A Signature Request is an agent asking Mandara for a policy-governed signature.

Typical lifecycle:

• Preview request
• Create request
• Queue request
• Worker processes request
• Approved by mandate or rejected by mandate
• Waiting for Ika signature
• Signed or failed

Open: /mandara/app/requests`,
  },
  {
    id: "agent-api",
    icon: Code,
    title: "Agent API / SDK",
    content: `Real agents connect to Mandara through a Connection Key.

SDK shape:

const client = new MandaraClient({
  apiKey,
  baseUrl,
});

await client.previewSignatureRequest(...);
await client.requestSignature(...);
await client.waitForSignature(...);

Raw keys are shown once and should never be exposed in the browser or recordings.`,
  },
  {
    id: "webhooks-activity",
    icon: Webhook,
    title: "Webhooks & Activity",
    content: `Mandara records important product events and can notify external systems.

Activity Log:

• Organization created
• Agent created
• Signing Wallet imported
• Mandate created
• Signature Request created, queued, signed, rejected, or failed

Webhooks:

• Deliver request status changes to your backend
• Secrets are encrypted when configured
• Rotate secrets if needed

Open: /mandara/app/activity and /mandara/app/webhooks`,
  },
  {
    id: "advanced-proof",
    icon: FlaskConical,
    title: "Advanced Technical Proof",
    content: `Advanced pages preserve the underlying HumanRail Protocol and Ika devnet proof.

These pages are for developers and reviewers, not normal Mandara product onboarding.

Advanced routes include:

• /advanced
• /vault/dwallets
• /vault
• /human
• /agent
• /delegation
• /receipts
• /rails/humanpay
• /rails/datablink
• /rails/documents

Technical terms such as PDA, CPI, MessageApproval, program ID, and IDL belong in this advanced section.`,
  },
];

export function HelpButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("disclaimer");

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  const currentSection = DOCUMENTATION_SECTIONS.find((s) => s.id === activeSection);

  return (
    <>
      {/* Help Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          variant="default"
          size="icon"
          onClick={() => setIsOpen(true)}
          className="h-12 w-12 rounded-full"
          aria-label="Open documentation"
        >
          <HelpCircle className="h-6 w-6" />
        </Button>
      </div>

      {/* Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={() => setIsOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

          {/* Modal Content */}
          <div
            className="relative flex h-[85vh] w-full max-w-5xl overflow-hidden rounded-xl border border-white/[0.08] bg-neutral-900 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sidebar */}
            <div className="hidden w-64 flex-shrink-0 border-r border-white/[0.06] bg-neutral-950 md:block">
              <div className="flex h-14 items-center border-b border-white/[0.06] px-4">
                <h2 className="text-lg font-bold text-sky-400">Mandara Guide</h2>
              </div>
              <nav className="p-2">
                {DOCUMENTATION_SECTIONS.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.id;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-all ${
                        isActive
                          ? "bg-sky-500/10 text-sky-400 ring-1 ring-sky-500/20"
                          : "text-neutral-400 hover:bg-white/[0.03] hover:text-white"
                      }`}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{section.title}</span>
                      {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Main Content */}
            <div className="flex flex-1 flex-col">
              {/* Header */}
              <div className="flex h-14 items-center justify-between border-b border-white/[0.06] px-4 md:px-6">
                <div className="flex items-center gap-3">
                  {currentSection && (
                    <>
                      <currentSection.icon className="h-5 w-5 text-sky-400" />
                      <h3 className="text-lg font-bold text-white">{currentSection.title}</h3>
                    </>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-9 w-9"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Mobile Section Selector */}
              <div className="border-b border-white/[0.06] p-3 md:hidden">
                <select
                  value={activeSection}
                  onChange={(e) => setActiveSection(e.target.value)}
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30"
                >
                  {DOCUMENTATION_SECTIONS.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6">
                {currentSection && (
                  <div className="prose prose-invert max-w-none">
                    <pre className="whitespace-pre-wrap rounded-lg border border-white/[0.06] bg-neutral-950 p-4 font-sans text-sm leading-relaxed text-neutral-300">
                      {currentSection.content}
                    </pre>
                  </div>
                )}

                {/* Quick Links */}
                {currentSection?.id === "what-is-mandara" && (
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <a
                      href="/mandara/app"
                      className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.03] p-4 text-white transition-colors hover:border-sky-500/30 hover:bg-white/[0.05]"
                    >
                      <Shield className="h-5 w-5 text-emerald-400" />
                      <div>
                        <div className="font-semibold">Open Console</div>
                        <div className="text-sm text-neutral-400">Manage Mandara product workflows</div>
                      </div>
                    </a>
                    <a
                      href="/mandara/app/onboarding"
                      className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.03] p-4 text-white transition-colors hover:border-sky-500/30 hover:bg-white/[0.05]"
                    >
                      <Bot className="h-5 w-5 text-purple-400" />
                      <div>
                        <div className="font-semibold">Start Onboarding</div>
                        <div className="text-sm text-neutral-400">Create an agent and mandate</div>
                      </div>
                    </a>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-3 md:px-6">
                <div className="text-xs text-neutral-500">
                  Mandara by HumanRail · Devnet beta · Ika pre-alpha mock signer
                </div>
                <a
                  href="https://github.com/humanrail-labs/human-rail"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-emerald-400 hover:underline"
                >
                  View on GitHub →
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
