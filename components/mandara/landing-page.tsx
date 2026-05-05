"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Bot,
  Wallet,
  FileCheck,
  Activity,
  Radio,
  ArrowRight,
  Lock,
  Code,
  Zap,
  Users,
  AlertTriangle,
} from "lucide-react";

export default function MandaraLandingPage() {
  const router = useRouter();

  const fadeIn = (delay = 0) => ({
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay },
  });

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="mx-auto max-w-5xl px-6 py-20 md:py-28">
          <motion.div {...fadeIn(0)} className="flex flex-col items-center text-center">
            <Badge
              variant="outline"
              className="mb-6 border-amber-500/30 text-amber-300"
            >
              <Radio className="mr-1.5 h-3 w-3" />
              Devnet beta
            </Badge>
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-6xl">
              Give AI agents signing power{" "}
              <span className="text-sky-400">without</span> giving them unlimited
              wallet control
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-neutral-400">
              Mandara is a devnet beta control plane for policy-governed AI agent
              wallets, powered by HumanRail guardrails and Ika dWallet signing.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button
                size="lg"
                onClick={() => router.push("/mandara/app")}
                className="bg-sky-600 hover:bg-sky-700"
              >
                Open Devnet Console
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => router.push("/vault/dwallets")}
                className="border-white/10"
              >
                View Technical Proof
              </Button>
            </div>
            <div className="mt-6 flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs text-red-200/80">
              <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
              Devnet beta · Ika pre-alpha mock signer · Not production custody
            </div>
          </motion.div>
        </div>
      </section>

      {/* Problem */}
      <section className="border-b border-white/[0.06]">
        <div className="mx-auto max-w-5xl px-6 py-16 md:py-20">
          <motion.div {...fadeIn(0.1)}>
            <h2 className="text-2xl font-bold text-white md:text-3xl">
              The problem
            </h2>
            <div className="mt-6 grid gap-6 md:grid-cols-3">
              {[
                {
                  icon: Bot,
                  title: "Agents need autonomy",
                  desc: "AI agents that trade, pay, or bridge need to sign transactions. But handing them raw private keys is dangerous.",
                },
                {
                  icon: Lock,
                  title: "Keys are all-or-nothing",
                  desc: "A compromised API key or leaked private key gives attackers full wallet access with no spending limits.",
                },
                {
                  icon: Users,
                  title: "Multisig breaks automation",
                  desc: "Requiring human signers for every transaction defeats the purpose of an autonomous agent.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-5"
                >
                  <item.icon className="mb-3 h-6 w-6 text-sky-400" />
                  <h3 className="text-sm font-semibold text-white">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm text-neutral-400">{item.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-b border-white/[0.06]">
        <div className="mx-auto max-w-5xl px-6 py-16 md:py-20">
          <motion.div {...fadeIn(0.1)}>
            <h2 className="text-2xl font-bold text-white md:text-3xl">
              How Mandara works
            </h2>
            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  step: "1",
                  icon: Bot,
                  title: "Register agent",
                  desc: "Create an agent identity in Mandara. This is your AI agent's control-plane profile.",
                },
                {
                  step: "2",
                  icon: Shield,
                  title: "Set mandate",
                  desc: "Define what the agent can request: which chains, assets, recipients, and spending limits.",
                },
                {
                  step: "3",
                  icon: Wallet,
                  title: "Connect signing wallet",
                  desc: "Link an Ika dWallet that Mandara uses to sign after policy approval.",
                },
                {
                  step: "4",
                  icon: Zap,
                  title: "Agent requests signature",
                  desc: "Your real AI agent sends a signature request via the Mandara API or SDK.",
                },
                {
                  step: "5",
                  icon: FileCheck,
                  title: "Mandara approves or rejects",
                  desc: "Every request is checked against the mandate. Approved requests are signed. Rejected ones are blocked.",
                },
                {
                  step: "6",
                  icon: Activity,
                  title: "Audit trail + webhooks",
                  desc: "Every action is logged. Webhooks notify your systems in real time.",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="relative rounded-xl border border-white/[0.06] bg-white/[0.03] p-5"
                >
                  <div className="absolute -top-3 left-4 rounded-full bg-sky-600 px-2 py-0.5 text-xs font-bold text-white">
                    {item.step}
                  </div>
                  <item.icon className="mb-3 mt-2 h-5 w-5 text-sky-400" />
                  <h3 className="text-sm font-semibold text-white">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm text-neutral-400">{item.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Who it is for */}
      <section className="border-b border-white/[0.06]">
        <div className="mx-auto max-w-5xl px-6 py-16 md:py-20">
          <motion.div {...fadeIn(0.1)}>
            <h2 className="text-2xl font-bold text-white md:text-3xl">
              Who it is for
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {[
                {
                  title: "AI agent builders",
                  desc: "Give your trading bots, payment agents, and bridge operators controlled signing power.",
                },
                {
                  title: "Treasury teams",
                  desc: "Set daily limits and recipient allowlists for automated treasury operations.",
                },
                {
                  title: "Stablecoin / payment apps",
                  desc: "Let agents disburse payments within strict per-transaction and daily boundaries.",
                },
                {
                  title: "DeFi automation teams",
                  desc: "Run yield strategies and rebalancers with guardrails that prevent runaway losses.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-5"
                >
                  <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-sky-400" />
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-sm text-neutral-400">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* What works today */}
      <section className="border-b border-white/[0.06]">
        <div className="mx-auto max-w-5xl px-6 py-16 md:py-20">
          <motion.div {...fadeIn(0.1)}>
            <h2 className="text-2xl font-bold text-white md:text-3xl">
              What works today
            </h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                "Devnet API with REST endpoints",
                "Product dashboard + console",
                "TypeScript SDK",
                "Webhook delivery system",
                "Audit exports (JSON / CSV)",
                "Live signing worker proof",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200/80"
                >
                  <FileCheck className="h-4 w-4 shrink-0 text-emerald-400" />
                  {item}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* What is not production-ready */}
      <section className="border-b border-white/[0.06]">
        <div className="mx-auto max-w-5xl px-6 py-16 md:py-20">
          <motion.div {...fadeIn(0.1)}>
            <h2 className="text-2xl font-bold text-white md:text-3xl">
              What is not production-ready
            </h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                "Devnet only — no mainnet support yet",
                "Ika uses a pre-alpha mock signer, not real MPC",
                "Dev auth only — no Clerk/Supabase integration yet",
                "Webhook secrets are stored plaintext pending encryption",
                "Rate limits and billing are not implemented",
                "No production custody audit or insurance",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200/80"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  {item}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section>
        <div className="mx-auto max-w-5xl px-6 py-16 md:py-20">
          <motion.div
            {...fadeIn(0.1)}
            className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-8 text-center md:p-12"
          >
            <h2 className="text-2xl font-bold text-white md:text-3xl">
              Start building with Mandara
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-neutral-400">
              Try the devnet console, run through the onboarding wizard, and send
              your first policy-governed signature request in minutes.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button
                size="lg"
                onClick={() => router.push("/mandara/app/onboarding")}
                className="bg-sky-600 hover:bg-sky-700"
              >
                Start Devnet Onboarding
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => router.push("/mandara/app")}
                className="border-white/10"
              >
                Open Console
              </Button>
            </div>
            <div className="mt-6 flex items-center justify-center gap-4 text-xs text-neutral-500">
              <span className="flex items-center gap-1">
                <Code className="h-3 w-3" />
                TypeScript SDK
              </span>
              <span className="flex items-center gap-1">
                <Activity className="h-3 w-3" />
                REST API
              </span>
              <span className="flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Policy Engine
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06]">
        <div className="mx-auto max-w-5xl px-6 py-8 text-center text-xs text-neutral-500">
          Mandara by HumanRail · Devnet beta · Ika pre-alpha mock signer · Not
          production custody
        </div>
      </footer>
    </div>
  );
}
