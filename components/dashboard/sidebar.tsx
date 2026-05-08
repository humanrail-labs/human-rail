"use client";

import { FC, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCluster } from "@/lib/solana/cluster-context";
import { Cluster } from "@/lib/solana/providers";
import { cn } from "@/lib/utils";
import Image from "next/image";
import {
  Home,
  Fingerprint,
  Bot,
  Shield,
  Zap,
  Receipt,
  Wallet,
  ChevronLeft,
  ChevronRight,
  Globe,
  Github,
  FlaskConical,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/vault", label: "Protocol Home", icon: Home, exact: true },
  { href: "/vault/identity", label: "Protocol Identity", icon: Fingerprint },
  { href: "/vault/agents", label: "Protocol Agents", icon: Bot },
  { href: "/vault/capabilities", label: "Protocol Capabilities", icon: Shield },
  { href: "/vault/dwallets", label: "Advanced dWallet Proof", icon: Wallet },
  { href: "/vault/payments", label: "HumanPay Demo", icon: Zap },
  { href: "/vault/activity", label: "Protocol Receipts", icon: Receipt },
];

const CLUSTER_META: Record<Cluster, { label: string; dot: string }> = {
  devnet: { label: "Devnet", dot: "bg-amber-400" },
  localnet: { label: "Local", dot: "bg-sky-400" },
  "mainnet-beta": { label: "Mainnet", dot: "bg-emerald-400" },
};

export const Sidebar: FC = () => {
  const pathname = usePathname();
  const { cluster, setCluster } = useCluster();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (item: (typeof NAV_ITEMS)[number]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen flex-col border-r border-white/[0.06] bg-neutral-950 transition-all duration-300 md:flex",
          collapsed ? "w-[72px]" : "w-[260px]"
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b border-white/[0.06] px-4">
          <Image
            src="/humanrail-logo.png"
            alt="HumanRail"
            width={36}
            height={36}
            className="h-9 w-9 shrink-0 rounded-lg"
          />
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-base font-semibold tracking-tight text-white leading-tight">
                HumanRail
              </span>
              <span className="text-xs text-neutral-500 leading-tight">
                Protocol Explorer
              </span>
            </div>
          )}
        </div>

        {/* Advanced notice */}
        {!collapsed && (
          <div className="mx-3 mt-3 rounded-lg border border-amber-500/15 bg-amber-500/5 px-3 py-2.5">
            <div className="flex items-center gap-1.5">
              <FlaskConical className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-xs font-medium text-amber-300">Protocol Explorer</span>
            </div>
            <p className="mt-1 text-[11px] text-amber-300/50 leading-snug">
              Wallet-required devnet pages. For product UI, use the Mandara Console.
            </p>
          </div>
        )}

        {/* Mandara Console link */}
        <div className="space-y-2 px-2 py-2">
          <Link
            href="/mandara/app"
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              "bg-sky-500/10 text-sky-400 ring-1 ring-sky-500/15 hover:bg-sky-500/15"
            )}
          >
            <Globe className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && <span>Mandara Console</span>}
          </Link>
          <Link
            href="/advanced"
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              "text-amber-300 hover:bg-amber-500/10"
            )}
          >
            <FlaskConical className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && <span>Advanced Hub</span>}
          </Link>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-2">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-white/[0.05] text-white"
                    : "text-neutral-500 hover:bg-white/[0.03] hover:text-neutral-300"
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon
                  className={cn(
                    "h-[18px] w-[18px] shrink-0 transition-colors",
                    active ? "text-sky-400" : "text-neutral-600 group-hover:text-neutral-400"
                  )}
                />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/[0.06] px-2 py-3">
          {!collapsed ? (
            <div className="space-y-1">
              {(Object.keys(CLUSTER_META) as Cluster[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setCluster(c)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    cluster === c
                      ? "bg-white/[0.06] text-white"
                      : "text-neutral-600 hover:text-neutral-400"
                  )}
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full", CLUSTER_META[c].dot)} />
                  {CLUSTER_META[c].label}
                </button>
              ))}
            </div>
          ) : (
            <button
              onClick={() =>
                setCluster(
                  cluster === "devnet" ? "localnet" : cluster === "localnet" ? "mainnet-beta" : "devnet"
                )
              }
              className="mx-auto flex h-8 w-8 items-center justify-center rounded-md hover:bg-white/[0.04]"
              title={CLUSTER_META[cluster].label}
            >
              <span className={cn("h-2 w-2 rounded-full", CLUSTER_META[cluster].dot)} />
            </button>
          )}
        </div>

        <div className="border-t border-white/[0.06] px-2 py-3">
          <a href="https://github.com/humanrail-labs/human-rail" target="_blank" rel="noopener noreferrer"
            className={cn("flex items-center gap-3 rounded-md px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:text-neutral-400", collapsed && "justify-center")}>
            <Github className="h-4 w-4 shrink-0" />
            {!collapsed && <span>GitHub</span>}
          </a>
          <a href="https://humanrail.org" target="_blank" rel="noopener noreferrer"
            className={cn("flex items-center gap-3 rounded-md px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:text-neutral-400", collapsed && "justify-center")}>
            <Globe className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Website</span>}
          </a>
        </div>

        <div className="border-t border-white/[0.06] p-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex h-8 w-full items-center justify-center rounded-md text-neutral-600 transition-colors hover:bg-white/[0.04] hover:text-neutral-400"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-white/[0.06] bg-neutral-950/95 backdrop-blur-sm md:hidden">
        {NAV_ITEMS.slice(0, 5).map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium transition-colors",
                active ? "text-sky-400" : "text-neutral-500"
              )}
            >
              <item.icon className="h-[18px] w-[18px]" />
              <span className="truncate max-w-[64px]">{item.label.split(' ').pop()}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
};
