"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  FlaskConical,
  Wallet,
  Home,
  Bot,
  User,
  Shield,
  Receipt,
  Zap,
  FileText,
  ArrowRight,
  Radio,
} from "lucide-react";

const fadeIn = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay },
});

const proofLinks = [
  {
    title: "dWallet Proof",
    desc: "Guard program IDs, PDAs, Guard CPI approval, Ika MessageApproval, signed devnet lifecycle.",
    href: "/vault/dwallets",
    icon: Wallet,
  },
  {
    title: "Protocol Vault",
    desc: "HumanRail protocol explorer: identity, agents, capabilities, payments, receipts.",
    href: "/vault",
    icon: Home,
  },
  {
    title: "Protocol Agent Explorer",
    desc: "On-chain agent registry and profile viewer.",
    href: "/agent",
    icon: Bot,
  },
  {
    title: "Human Registry",
    desc: "On-chain human identity profiles and attestations.",
    href: "/human",
    icon: User,
  },
  {
    title: "Delegation",
    desc: "Capability delegation and permission rails.",
    href: "/delegation",
    icon: Shield,
  },
  {
    title: "Receipts",
    desc: "On-chain action receipts and audit trail.",
    href: "/receipts",
    icon: Receipt,
  },
];

const railLinks = [
  {
    title: "HumanPay",
    desc: "Payment rail demo with HumanRail identity gating.",
    href: "/rails/humanpay",
    icon: Zap,
  },
  {
    title: "DataBlink",
    desc: "Micro-task rail demo with programmable triggers.",
    href: "/rails/datablink",
    icon: FileText,
  },
  {
    title: "Documents",
    desc: "On-chain document signing with verified identity.",
    href: "/rails/documents",
    icon: FileText,
  },
];

export default function AdvancedPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <motion.div {...fadeIn(0)} className="mb-8">
          <div className="flex items-center gap-3">
            <FlaskConical className="h-6 w-6 text-amber-400" />
            <h1 className="text-2xl font-bold text-white">Advanced Technical Proof</h1>
          </div>
          <p className="mt-2 text-sm text-neutral-400">
            This area is for developers and reviewers. It contains protocol-level
            HumanRail and Ika devnet proof. Normal Mandara users should use the
            Mandara Console.
          </p>
        </motion.div>

        <motion.div
          {...fadeIn(0.1)}
          className="mb-8 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4"
        >
          <Radio className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <div className="space-y-1">
            <p className="text-xs font-medium text-red-200">Devnet beta · Ika pre-alpha mock signer · Not production custody</p>
            <p className="text-xs text-red-200/60">
              All on-chain data is on Solana devnet and may be reset. Ika uses a single mock signer,
              not real MPC.
            </p>
          </div>
        </motion.div>

        <div className="mb-6 flex flex-wrap gap-3">
          <Link href="/mandara">
            <Button variant="outline">
              Back to Mandara Home
            </Button>
          </Link>
          <Link href="/mandara/app">
            <Button className="bg-sky-600 hover:bg-sky-700">
              Open Mandara Console
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/mandara/app/onboarding">
            <Button variant="outline">
              Start Onboarding
            </Button>
          </Link>
        </div>

        <motion.div {...fadeIn(0.15)}>
          <h2 className="mb-4 text-lg font-semibold text-white">Protocol Proof</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {proofLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 transition-colors hover:bg-neutral-900/80"
              >
                <item.icon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-medium text-white">{item.title}</h3>
                  <p className="mt-1 text-xs text-neutral-400">{item.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>

        <motion.div {...fadeIn(0.2)} className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-white">Application Rails</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {railLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 transition-colors hover:bg-neutral-900/80"
              >
                <item.icon className="mt-0.5 h-5 w-5 shrink-0 text-sky-400" />
                <div>
                  <h3 className="text-sm font-medium text-white">{item.title}</h3>
                  <p className="mt-1 text-xs text-neutral-400">{item.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>

        <motion.div {...fadeIn(0.25)} className="mt-12 text-center">
          <p className="text-xs text-neutral-500">
            Mandara by HumanRail · Devnet beta · Ika pre-alpha mock signer · Not production custody
          </p>
        </motion.div>
      </div>
    </div>
  );
}
