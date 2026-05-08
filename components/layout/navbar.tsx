"use client";

import { FC } from "react";
import Link from "next/link";
import Image from "next/image";
import { WalletButton } from "@/components/wallet/wallet-button";
import { useCluster } from "@/lib/solana/cluster-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Cluster } from "@/lib/solana/providers";
import {
  ChevronDown,
  Zap,
  FlaskConical,
  Compass,
  LayoutDashboard,
  User,
  Bot,
  Shield,
  FileText,
  Receipt,
} from "lucide-react";

const MAIN_NAV_ITEMS = [
  { href: "/mandara", label: "Mandara", icon: Zap },
  { href: "/mandara/app", label: "Console", icon: LayoutDashboard },
  { href: "/mandara/app/onboarding", label: "Onboarding", icon: Compass },
  { href: "/advanced", label: "Advanced", icon: FlaskConical },
];

const ADVANCED_NAV_ITEMS = [
  { href: "/vault/dwallets", label: "Technical Proof", icon: FlaskConical },
  { href: "/human", label: "Protocol Human", icon: User },
  { href: "/agent", label: "Protocol Agent", icon: Bot },
  { href: "/delegation", label: "Delegation", icon: Shield },
  { href: "/receipts", label: "Receipts", icon: Receipt },
  { href: "/rails/humanpay", label: "HumanPay", icon: Zap },
  { href: "/rails/datablink", label: "DataBlink", icon: FileText },
  { href: "/rails/documents", label: "Documents", icon: FileText },
];

const CLUSTERS: { value: Cluster; label: string; color: string }[] = [
  { value: "devnet", label: "Devnet", color: "bg-amber-400" },
  { value: "localnet", label: "Localnet", color: "bg-sky-400" },
  { value: "mainnet-beta", label: "Mainnet", color: "bg-emerald-400" },
];

export const Navbar: FC = () => {
  const { cluster, setCluster } = useCluster();

  const currentCluster = CLUSTERS.find((c) => c.value === cluster);

  return (
    <nav className="sticky top-0 z-50 border-b border-[#B2BDBA]/10 bg-[#132020]/78 shadow-[0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur-2xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/humanrail-logo.png"
              alt="HumanRail"
              width={32}
              height={32}
              className="h-8 w-8 rounded-lg"
            />
            <span className="text-lg font-semibold text-[#eef7f5]">Mandara</span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {MAIN_NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button variant="ghost" size="sm" className="text-[#B2BDBA]/75 hover:text-white">
                  <item.icon className="mr-1.5 h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            ))}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-[#B2BDBA]/75 hover:text-white">
                  <FlaskConical className="mr-1.5 h-4 w-4" />
                  Protocol Proof
                  <ChevronDown className="ml-1 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {ADVANCED_NAV_ITEMS.map((item) => (
                  <DropdownMenuItem key={item.href} asChild className="cursor-pointer">
                    <Link href={item.href} className="flex items-center gap-2 text-[#B2BDBA]">
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm" className="gap-2">
                <span className={`h-2 w-2 rounded-full ${currentCluster?.color}`} />
                {currentCluster?.label}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {CLUSTERS.map((c) => (
                <DropdownMenuItem
                  key={c.value}
                  onClick={() => setCluster(c.value)}
                  className="gap-2"
                >
                  <span className={`h-2 w-2 rounded-full ${c.color}`} />
                  {c.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <WalletButton />
        </div>
      </div>
    </nav>
  );
};
