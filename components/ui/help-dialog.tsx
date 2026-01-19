"use client";

import { useState, useEffect } from "react";
import { HelpCircle, X, ChevronRight, AlertTriangle, Users, Bot, Shield, Wallet, FileText, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";

const DOCUMENTATION_SECTIONS = [
  {
    id: "disclaimer",
    icon: AlertTriangle,
    title: "Disclaimer",
    content: `• Demo-grade software: Built for product demonstration. Features may change quickly.
• Not audited / no warranties: Treat all on-chain programs as experimental.
• Devnet only: Use Solana devnet for testing. Tokens have no real value.
• No financial advice: Nothing here is an offer or promise of performance.
• Identity verification is modular: "Verified" status depends on attestations from trusted issuers.`,
  },
  {
    id: "what-is",
    icon: Shield,
    title: "What is HumanRail?",
    content: `HumanRail is identity + accountability infrastructure on Solana:

• Human identity as a profile (on-chain account) that collects attestations from issuers
• Agent registration (AI or automation) linked to a human principal
• Delegation: scoped capabilities with limits (time bounds, spend limits, allowlists)
• Application rails: payments, micro-tasks, document signing, receipts/audit trails

The goal is to answer: "Who is behind this action?" and "Was this agent authorized?"`,
  },
  {
    id: "human-profile",
    icon: Users,
    title: "Human Profile",
    content: `Your on-chain identity anchored to your wallet:

• One profile per wallet (PDA derived from your pubkey)
• Collects attestations from issuers (KYC, social proofs, credentials)
• Required before registering agents or creating delegations
• Profile data is minimal: display name + verification status

Navigate to /human to create or view your profile.`,
  },
  {
    id: "agents",
    icon: Bot,
    title: "Agent Registry",
    content: `Register AI agents or automation scripts linked to your human profile:

• Each agent has a unique keypair
• Agents are always linked to a human principal (you)
• Agents cannot act without delegated capabilities
• You can register multiple agents under one profile

Navigate to /agent to manage your registered agents.`,
  },
  {
    id: "delegation",
    icon: Shield,
    title: "Delegation & Capabilities",
    content: `Grant scoped permissions to your agents:

• Spending limits (max amount per transaction or time period)
• Time bounds (expiration date)
• Destination allowlists (which addresses can receive funds)
• Action types (payments, document signing, etc.)

Capabilities are enforced on-chain. Agents cannot exceed their granted permissions.`,
  },
  {
    id: "payments",
    icon: Wallet,
    title: "HumanPay",
    content: `PDA-controlled escrow for agent payments:

• Agents pay invoices on your behalf within their capability limits
• Funds are held in escrow until payment is confirmed
• All transactions are auditable via receipts
• Spending limits are enforced before execution

Navigate to /rails/humanpay to view payment history.`,
  },
  {
    id: "documents",
    icon: FileText,
    title: "Document Signing",
    content: `On-chain document verification and signing:

• Upload document hashes (not full documents)
• Sign documents with your wallet or delegated agent
• Verify signatures on-chain
• Track document status and signers

Navigate to /rails/documents to manage documents.`,
  },
  {
    id: "receipts",
    icon: Receipt,
    title: "Receipts & Audit",
    content: `Full transaction audit trail:

• Every agent action emits a receipt
• Receipts include: who, what, when, and authorization proof
• DataBlink integration for structured data logging
• Query receipts by agent, human, or time range

Navigate to /receipts to view audit logs.`,
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
            className="relative flex h-[85vh] w-full max-w-5xl overflow-hidden rounded-base border-2 border-emerald-400 bg-neutral-900 shadow-shadow"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sidebar */}
            <div className="hidden w-64 flex-shrink-0 border-r-2 border-neutral-700 bg-neutral-950 md:block">
              <div className="flex h-14 items-center border-b-2 border-neutral-700 px-4">
                <h2 className="text-lg font-bold text-emerald-400">Documentation</h2>
              </div>
              <nav className="p-2">
                {DOCUMENTATION_SECTIONS.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.id;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`mb-1 flex w-full items-center gap-3 rounded-base px-3 py-2.5 text-left text-sm transition-all ${
                        isActive
                          ? "border-2 border-emerald-400 bg-emerald-600/20 text-emerald-400"
                          : "border-2 border-transparent text-neutral-400 hover:bg-neutral-800 hover:text-white"
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
              <div className="flex h-14 items-center justify-between border-b-2 border-neutral-700 px-4 md:px-6">
                <div className="flex items-center gap-3">
                  {currentSection && (
                    <>
                      <currentSection.icon className="h-5 w-5 text-emerald-400" />
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
              <div className="border-b-2 border-neutral-700 p-3 md:hidden">
                <select
                  value={activeSection}
                  onChange={(e) => setActiveSection(e.target.value)}
                  className="w-full rounded-base border-2 border-neutral-600 bg-neutral-800 px-3 py-2 text-white focus:border-emerald-400 focus:outline-none"
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
                    <pre className="whitespace-pre-wrap rounded-base border-2 border-neutral-700 bg-neutral-950 p-4 font-sans text-sm leading-relaxed text-neutral-300">
                      {currentSection.content}
                    </pre>
                  </div>
                )}

                {/* Quick Links */}
                {currentSection?.id === "what-is" && (
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <a
                      href="/human"
                      className="flex items-center gap-3 rounded-base border-2 border-neutral-600 bg-neutral-800 p-4 text-white transition-all hover:border-emerald-400 hover:bg-neutral-700"
                    >
                      <Users className="h-5 w-5 text-emerald-400" />
                      <div>
                        <div className="font-semibold">Create Profile</div>
                        <div className="text-sm text-neutral-400">Start with your identity</div>
                      </div>
                    </a>
                    <a
                      href="/agent"
                      className="flex items-center gap-3 rounded-base border-2 border-neutral-600 bg-neutral-800 p-4 text-white transition-all hover:border-emerald-400 hover:bg-neutral-700"
                    >
                      <Bot className="h-5 w-5 text-purple-400" />
                      <div>
                        <div className="font-semibold">Register Agent</div>
                        <div className="text-sm text-neutral-400">Link AI to your profile</div>
                      </div>
                    </a>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t-2 border-neutral-700 px-4 py-3 md:px-6">
                <div className="text-xs text-neutral-500">
                  HumanRail Protocol • Devnet Demo
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