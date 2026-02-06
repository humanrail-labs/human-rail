"use client";

import { FC, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { useCluster } from "@/lib/solana/cluster-context";
import { Cluster } from "@/lib/solana/providers";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Fingerprint,
  Bot,
  Shield,
  Zap,
  FileText,
  Receipt,
  ChevronLeft,
  ChevronRight,
  Globe,
  Github,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/identity", label: "Human ID", icon: Fingerprint },
  { href: "/dashboard/agents", label: "Agents", icon: Bot },
  { href: "/dashboard/delegation", label: "Delegation", icon: Shield },
  { href: "/dashboard/payments", label: "HumanPay", icon: Zap },
  { href: "/dashboard/documents", label: "Documents", icon: FileText },
  { href: "/dashboard/receipts", label: "Receipts", icon: Receipt },
];

const CLUSTER_META: Record<Cluster, { label: string; dot: string }> = {
  devnet: { label: "Devnet", dot: "bg-amber-400" },
  localnet: { label: "Local", dot: "bg-sky-400" },
  "mainnet-beta": { label: "Mainnet", dot: "bg-emerald-400" },
};

export const Sidebar: FC = () => {
  const pathname = usePathname();
  const { connected, publicKey } = useWallet();
  const { cluster, setCluster } = useCluster();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (item: (typeof NAV_ITEMS)[number]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen flex-col border-r border-white/[0.06] bg-neutral-950 transition-all duration-300",
        collapsed ? "w-[68px]" : "w-[240px]"
      )}
    >
      <div className="flex h-16 items-center gap-3 border-b border-white/[0.06] px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/20">
          <svg width="18" height="18" viewBox="0 0 40 40" fill="none">
            <rect x="6" y="8" width="7" height="2" fill="#10b981" />
            <rect x="6" y="14" width="7" height="2" fill="#10b981" />
            <rect x="6" y="20" width="7" height="2" fill="#10b981" />
            <rect x="6" y="26" width="7" height="2" fill="#10b981" />
            <rect x="6" y="32" width="7" height="2" fill="#10b981" />
            <rect x="27" y="8" width="7" height="2" fill="#10b981" />
            <rect x="27" y="14" width="7" height="2" fill="#10b981" />
            <rect x="27" y="20" width="7" height="2" fill="#10b981" />
            <rect x="27" y="26" width="7" height="2" fill="#10b981" />
            <rect x="27" y="32" width="7" height="2" fill="#10b981" />
            <circle cx="20" cy="20" r="7" stroke="#10b981" strokeWidth="2.5" fill="none" />
            <path d="M17 20l2 2 4-4" stroke="#10b981" strokeWidth="2" fill="none" />
          </svg>
        </div>
        {!collapsed && (
          <span className="text-[15px] font-semibold tracking-tight text-white">
            HumanRail
          </span>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all",
                active
                  ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20"
                  : "text-neutral-500 hover:bg-white/[0.04] hover:text-neutral-300"
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon
                className={cn(
                  "h-[18px] w-[18px] shrink-0 transition-colors",
                  active ? "text-emerald-400" : "text-neutral-600 group-hover:text-neutral-400"
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
                  "flex w-full items-center gap-2.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition-all",
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
          className={cn("flex items-center gap-3 rounded-md px-3 py-1.5 text-[12px] font-medium text-neutral-600 transition-all hover:text-neutral-400", collapsed && "justify-center")}>
          <Github className="h-4 w-4 shrink-0" />
          {!collapsed && <span>GitHub</span>}
        </a>
        <a href="https://humanrail.org" target="_blank" rel="noopener noreferrer"
          className={cn("flex items-center gap-3 rounded-md px-3 py-1.5 text-[12px] font-medium text-neutral-600 transition-all hover:text-neutral-400", collapsed && "justify-center")}>
          <Globe className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Website</span>}
        </a>
      </div>

      <div className="border-t border-white/[0.06] p-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex h-8 w-full items-center justify-center rounded-md text-neutral-600 transition-all hover:bg-white/[0.04] hover:text-neutral-400"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  );
};
