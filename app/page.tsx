"use client";

import { FC } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useCluster } from "@/lib/solana/cluster-context";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Shield,
  Bot,
  Zap,
  ArrowRight,
  Globe,
  Lock,
  FileCheck,
  Receipt,
  Users,
  Cpu,
} from "lucide-react";
import { useEffect, useState } from "react";

const PILLARS = [
  {
    icon: Users,
    title: "Verify Humans",
    description: "Identity attestations with trust scores. Sybil-resistant verification for DeFi, governance, and data tasks.",
    color: "from-emerald-500 to-emerald-600",
  },
  {
    icon: Bot,
    title: "Register Agents",
    description: "KYA (Know Your Agent) profiles. Key rotation, lifecycle management, and accountability linking.",
    color: "from-blue-500 to-blue-600",
  },
  {
    icon: Shield,
    title: "Delegate Capabilities",
    description: "Scoped permissions with limits. Per-tx, daily, and total budgets. Emergency freeze controls.",
    color: "from-purple-500 to-purple-600",
  },
];

const RAILS = [
  {
    icon: Zap,
    title: "HumanPay",
    description: "Invoice & payment rail gated by identity and delegation",
    href: "/rails/humanpay",
  },
  {
    icon: Cpu,
    title: "DataBlink",
    description: "Micro-task platform for RLHF & data labeling by verified humans",
    href: "/rails/datablink",
  },
  {
    icon: FileCheck,
    title: "Document Registry",
    description: "Document signing by verified humans or authorized agents",
    href: "/rails/documents",
  },
  {
    icon: Receipt,
    title: "Receipts",
    description: "Complete audit trail for compliance and accountability",
    href: "/receipts",
  },
];

const NetworkStatus: FC = () => {
  const { connection } = useConnection();
  const { cluster } = useCluster();
  const { connected, publicKey } = useWallet();
  const [blockHeight, setBlockHeight] = useState<number | null>(null);

  useEffect(() => {
    const fetchBlock = async () => {
      try {
        const slot = await connection.getSlot();
        setBlockHeight(slot);
      } catch (e) {
        console.error("Failed to fetch block:", e);
      }
    };
    fetchBlock();
    const interval = setInterval(fetchBlock, 5000);
    return () => clearInterval(interval);
  }, [connection]);

  return (
    <Card className="border-neutral-800 bg-neutral-900/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Globe className="h-4 w-4 text-emerald-500" />
          Network Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-neutral-400">Cluster</span>
          <Badge variant="outline" className="font-mono text-xs">
            {cluster}
          </Badge>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-400">Block Height</span>
          <span className="font-mono text-emerald-500">
            {blockHeight?.toLocaleString() ?? "..."}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-400">Wallet</span>
          <span className={connected ? "text-emerald-500" : "text-neutral-500"}>
            {connected
              ? `${publicKey?.toBase58().slice(0, 4)}...${publicKey?.toBase58().slice(-4)}`
              : "Not connected"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default function Home() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-transparent to-transparent" />

        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <Badge className="mb-6 bg-emerald-950 text-emerald-400 hover:bg-emerald-950">
              <Lock className="mr-1 h-3 w-3" />
              Identity Infrastructure for Solana
            </Badge>

            <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-6xl">
              Human-verified payments
              <br />
              <span className="bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
                & tasks on Solana
              </span>
            </h1>

            <p className="mx-auto mb-10 max-w-2xl text-lg text-neutral-400">
              HumanRail provides the identity and accountability layer for Solana.
              Verify humans, register agents, delegate capabilities — then build
              payment rails, data tasks, and document signing on top.
            </p>

            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link href="/human">
                <Button size="lg" className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                  <CheckCircle2 className="h-5 w-5" />
                  Get Verified
                </Button>
              </Link>
              <Link href="#demo">
                <Button size="lg" variant="outline" className="gap-2">
                  Demo in 60 Seconds
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pillars Section */}
      <section className="mx-auto max-w-7xl px-4 py-20">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-12 text-center"
        >
          <h2 className="mb-4 text-3xl font-bold">Three Pillars of Trust</h2>
          <p className="text-neutral-400">
            The foundation for secure, accountable on-chain interactions
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-3">
          {PILLARS.map((pillar, index) => (
            <motion.div
              key={pillar.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <Card className="group h-full border-neutral-800 bg-neutral-900/50 transition-colors hover:border-neutral-700">
                <CardHeader>
                  <div
                    className={`mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br ${pillar.color}`}
                  >
                    <pillar.icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-xl">{pillar.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base text-neutral-400">
                    {pillar.description}
                  </CardDescription>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Rails Section */}
      <section className="border-y border-neutral-800 bg-neutral-900/30 py-20">
        <div className="mx-auto max-w-7xl px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-12 text-center"
          >
            <h2 className="mb-4 text-3xl font-bold">Built-in Rails</h2>
            <p className="text-neutral-400">
              Production-ready applications powered by HumanRail primitives
            </p>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {RAILS.map((rail, index) => (
              <motion.div
                key={rail.title}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <Link href={rail.href}>
                  <Card className="group h-full cursor-pointer border-neutral-800 bg-neutral-950 transition-all hover:border-emerald-800 hover:bg-neutral-900">
                    <CardHeader className="pb-2">
                      <rail.icon className="mb-2 h-8 w-8 text-emerald-500 transition-transform group-hover:scale-110" />
                      <CardTitle className="text-lg">{rail.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm text-neutral-500">
                        {rail.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Network Status + CTA Section */}
      <section id="demo" className="mx-auto max-w-7xl px-4 py-20">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="mb-4 text-3xl font-bold">Ready to explore?</h2>
              <p className="mb-8 text-neutral-400">
                Connect your wallet and explore the HumanRail protocol. Create a
                human profile, register an agent, set up delegations, and test the
                payment and task rails.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <Link href="/human">
                  <Card className="group cursor-pointer border-neutral-800 bg-neutral-900/50 transition-all hover:border-emerald-700">
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-950">
                        <Users className="h-5 w-5 text-emerald-500" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Human Dashboard</h3>
                        <p className="text-sm text-neutral-500">Create profile & attestations</p>
                      </div>
                      <ArrowRight className="ml-auto h-5 w-5 text-neutral-600 transition-transform group-hover:translate-x-1 group-hover:text-emerald-500" />
                    </CardContent>
                  </Card>
                </Link>

                <Link href="/agent">
                  <Card className="group cursor-pointer border-neutral-800 bg-neutral-900/50 transition-all hover:border-blue-700">
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-950">
                        <Bot className="h-5 w-5 text-blue-500" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Agent Dashboard</h3>
                        <p className="text-sm text-neutral-500">Register & manage agents</p>
                      </div>
                      <ArrowRight className="ml-auto h-5 w-5 text-neutral-600 transition-transform group-hover:translate-x-1 group-hover:text-blue-500" />
                    </CardContent>
                  </Card>
                </Link>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <NetworkStatus />
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-800 py-8">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <Image src="/logo.png" alt="HumanRail" width={24} height={24} />
              <span className="text-sm text-neutral-500">
                HumanRail Protocol © {new Date().getFullYear()}
              </span>
            </div>
            <div className="flex gap-6 text-sm text-neutral-500">
              <a href="#" className="hover:text-white">Documentation</a>
              <a href="#" className="hover:text-white">GitHub</a>
              <a href="#" className="hover:text-white">Twitter</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}