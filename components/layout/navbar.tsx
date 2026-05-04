"use client";

import { FC } from "react";
import Link from "next/link";
import Image from "next/image";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletButton } from "@/components/wallet/wallet-button";
import { useCluster } from "@/lib/solana/cluster-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
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
  { value: "devnet", label: "Devnet", color: "bg-yellow-500" },
  { value: "localnet", label: "Localnet", color: "bg-blue-500" },
  { value: "mainnet-beta", label: "Mainnet", color: "bg-green-500" },
];

export const Navbar: FC = () => {
  const { connected } = useWallet();
  const { cluster, setCluster } = useCluster();

  const currentCluster = CLUSTERS.find((c) => c.value === cluster);

  return (
    <nav className="sticky top-0 z-50 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Mandara"
              width={32}
              height={32}
              className="h-8 w-8"
            />
            <span className="text-lg font-semibold text-white">Mandara</span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {MAIN_NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button variant="ghost" size="sm" className="text-neutral-400 hover:text-white">
                  <item.icon className="mr-1.5 h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            ))}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-neutral-400 hover:text-white">
                  <FlaskConical className="mr-1.5 h-4 w-4" />
                  Advanced
                  <ChevronDown className="ml-1 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="bg-neutral-900 border-neutral-700">
                {ADVANCED_NAV_ITEMS.map((item) => (
                  <DropdownMenuItem key={item.href} asChild className="cursor-pointer">
                    <Link href={item.href} className="flex items-center gap-2 text-neutral-300">
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
              <Button variant="outline" size="sm" className="gap-2">
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
                  {cluster === c.value && (
                    <Badge variant="secondary" className="ml-auto text-xs">
                      Active
                    </Badge>
                  )}
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
