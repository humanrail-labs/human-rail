"use client";

import { FC } from "react";
import Link from "next/link";
import Image from "next/image";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
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
import { ChevronDown, User, Bot, Shield, Zap, FileText, Receipt } from "lucide-react";

const NAV_ITEMS = [
  { href: "/human", label: "Human", icon: User },
  { href: "/agent", label: "Agent", icon: Bot },
  { href: "/delegation", label: "Delegation", icon: Shield },
  { href: "/rails/humanpay", label: "HumanPay", icon: Zap },
  { href: "/rails/datablink", label: "DataBlink", icon: FileText },
  { href: "/rails/documents", label: "Documents", icon: FileText },
  { href: "/receipts", label: "Receipts", icon: Receipt },
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
              alt="HumanRail"
              width={32}
              height={32}
              className="h-8 w-8"
            />
            <span className="text-lg font-semibold text-white">HumanRail</span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button variant="ghost" size="sm" className="text-neutral-400 hover:text-white">
                  <item.icon className="mr-1.5 h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            ))}
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

          <WalletMultiButton />
        </div>
      </div>
    </nav>
  );
};