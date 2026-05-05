"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletName } from "@solana/wallet-adapter-base";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Wallet, LogOut, Copy, ExternalLink, LayoutDashboard, FlaskConical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

type InjectedWallet = {
  name: string;
  icon: string;
  detect: () => any | undefined;
  adapterName: WalletName;
};

const INJECTED_WALLETS: InjectedWallet[] = [
  {
    name: "Phantom",
    icon: "👻",
    detect: () => (window as any).phantom?.solana,
    adapterName: "Phantom" as WalletName,
  },
  {
    name: "Solflare",
    icon: "🔥",
    detect: () => (window as any).solflare?.solana,
    adapterName: "Solflare" as WalletName,
  },
];

export function WalletButton() {
  const [mounted, setMounted] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  const {
    publicKey,
    disconnect,
    connected,
    select,
    connect,
    wallets,
  } = useWallet();
  const { setVisible } = useWalletModal();
  const router = useRouter();

  const handleConnectWallet = async (wallet: InjectedWallet) => {
    try {
      const injected = wallet.detect();
      if (!injected) {
        toast.error(`${wallet.name} extension not detected`);
        return;
      }

      // Try adapter path first (select + connect)
      const adapterWallet = wallets.find(
        (w) => w.adapter.name === wallet.adapterName
      );
      if (adapterWallet) {
        select(wallet.adapterName);
        // Small delay so select propagates before connect
        await new Promise((r) => setTimeout(r, 50));
        await connect();
        return;
      }

      // Fallback: direct injected connect
      const resp = await injected.connect();
      if (resp?.publicKey) {
        toast.success(`Connected to ${wallet.name}`);
      }
    } catch (err: any) {
      // User rejection is normal — don't toast it
      if (
        err?.message?.includes("rejected") ||
        err?.message?.includes("cancelled") ||
        err?.message?.includes("User")
      ) {
        return;
      }
      console.error(`[WalletButton] ${wallet.name} connect error:`, err);
      toast.error(err?.message || `${wallet.name} connection failed`);
    }
  };

  if (!mounted) {
    return (
      <Button variant="default" size="sm" disabled className="gap-2">
        <Wallet className="h-4 w-4" />
        Connect Wallet
      </Button>
    );
  }

  const handleCopyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toBase58());
      toast.success("Address copied!");
    }
  };

  if (!connected || !publicKey) {
    return (
      <DropdownMenu open={connectOpen} onOpenChange={setConnectOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="default" size="sm" className="gap-2">
            <Wallet className="h-4 w-4" />
            Connect Wallet
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="bg-neutral-900 border-neutral-700 min-w-[200px]"
        >
          {INJECTED_WALLETS.map((w) => {
            const available = !!w.detect();
            return (
              <DropdownMenuItem
                key={w.name}
                onClick={() => handleConnectWallet(w)}
                className={`cursor-pointer ${
                  available ? "text-white" : "text-neutral-500"
                }`}
                disabled={!available}
              >
                <span className="mr-2">{w.icon}</span>
                <span>{w.name}</span>
                {!available && (
                  <span className="ml-auto text-[10px] text-neutral-500">
                    Not installed
                  </span>
                )}
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator className="bg-neutral-700" />
          <DropdownMenuItem
            onClick={() => {
              setConnectOpen(false);
              setVisible(true);
            }}
            className="cursor-pointer text-neutral-400"
          >
            <Wallet className="mr-2 h-4 w-4" />
            More wallets (adapter modal)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Wallet className="h-4 w-4" />
          {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-neutral-900 border-neutral-700">
        <DropdownMenuItem
          onClick={() => router.push("/mandara/app")}
          className="cursor-pointer"
        >
          <LayoutDashboard className="mr-2 h-4 w-4" />
          Mandara Console
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => router.push("/vault")}
          className="cursor-pointer"
        >
          <FlaskConical className="mr-2 h-4 w-4" />
          Advanced Protocol Vault
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-neutral-700" />
        <DropdownMenuItem onClick={handleCopyAddress} className="cursor-pointer">
          <Copy className="mr-2 h-4 w-4" />
          Copy Address
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            window.open(
              `https://explorer.solana.com/address/${publicKey.toBase58()}?cluster=devnet`,
              "_blank"
            )
          }
          className="cursor-pointer"
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          View on Explorer
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-neutral-700" />
        <DropdownMenuItem
          onClick={disconnect}
          className="cursor-pointer text-red-400 focus:text-red-400"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
