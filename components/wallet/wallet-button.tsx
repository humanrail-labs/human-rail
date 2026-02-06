"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Wallet, LogOut, Copy, ExternalLink, LayoutDashboard } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export function WalletButton() {
  const { publicKey, disconnect, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const router = useRouter();

  const handleCopyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toBase58());
      toast.success("Address copied!");
    }
  };

  if (!connected || !publicKey) {
    return (
      <Button onClick={() => setVisible(true)} variant="default" size="sm">
        <Wallet className="h-4 w-4" />
        Connect Wallet
      </Button>
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
          onClick={() => router.push("/dashboard")}
          className="cursor-pointer"
        >
          <LayoutDashboard className="mr-2 h-4 w-4" />
          Dashboard
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
