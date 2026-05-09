"use client";

import { usePathname, useRouter } from "next/navigation";
import { ReactNode } from "react";
import {
  LayoutDashboard,
  Compass,
  Bot,
  FileKey,
  Activity,
  FlaskConical,
  Radio,
  Menu,
  X,
  Home,
  Wallet,
  ShieldCheck,
  Webhook,
  MessageSquareText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useState } from "react";

const navItems = [
  { label: "Overview", href: "/mandara/app", icon: LayoutDashboard },
  { label: "Onboarding", href: "/mandara/app/onboarding", icon: Compass },
  { label: "Agents", href: "/mandara/app/agents", icon: Bot },
  { label: "Agent Chat", href: "/mandara/app/agent-chat", icon: MessageSquareText },
  { label: "Signing Wallets", href: "/mandara/app/wallets", icon: Wallet },
  { label: "Mandates", href: "/mandara/app/mandates", icon: ShieldCheck },
  { label: "Signature Requests", href: "/mandara/app/requests", icon: FileKey },
  { label: "Activity", href: "/mandara/app/activity", icon: Activity },
  { label: "Webhooks", href: "/mandara/app/webhooks", icon: Webhook },
];

export default function MandaraAppShell({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="mandara-page flex min-h-screen text-[#B2BDBA]">
      {/* Desktop sidebar */}
      <aside className="mandara-glass hidden w-60 flex-col rounded-none border-y-0 border-l-0 md:flex">
        <div className="flex items-center gap-3 border-b border-[#B2BDBA]/10 px-4 py-4">
          <Image
            src="/mandara-icon.png"
            alt="Mandara"
            width={36}
            height={36}
            className="h-9 w-9 rounded-lg"
          />
          <div>
            <p className="text-sm font-semibold text-white">Mandara</p>
            <p className="text-xs text-[#53706A]">Devnet Console</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          <button
            onClick={() => router.push("/mandara")}
            className="mb-3 flex w-full items-center gap-2.5 rounded-xl border border-[#B2BDBA]/10 bg-[#21342F]/35 px-3 py-2 text-sm text-[#B2BDBA] transition-colors hover:border-[#5EBDB0]/25 hover:bg-[#3E877E]/18 hover:text-white"
          >
            <Home className="h-4 w-4" />
            Mandara Home
          </button>
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? "border border-[#5EBDB0]/20 bg-[#3E877E]/18 text-[#8de7dc] shadow-[0_0_24px_rgba(94,189,176,0.08)]"
                    : "text-[#B2BDBA]/70 hover:bg-[#2A3D36]/45 hover:text-[#eef7f5]"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-[#B2BDBA]/10 p-3">
          <button
            onClick={() => router.push("/advanced")}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-[#53706A] transition-colors hover:bg-[#2A3D36]/45 hover:text-[#B2BDBA]"
          >
            <FlaskConical className="h-4 w-4" />
            Advanced Proof
          </button>
          <div className="mt-3 flex items-center gap-1.5 rounded-xl border border-[#5EBDB0]/15 bg-[#21342F]/45 px-3 py-2 text-xs text-[#B2BDBA]/70">
            <Radio className="h-3 w-3 text-red-400" />
            Not production custody
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex flex-1 flex-col">
        <header className="mandara-glass flex items-center justify-between rounded-none border-x-0 border-t-0 px-4 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <Image
              src="/mandara-icon.png"
              alt="Mandara"
              width={32}
              height={32}
              className="h-8 w-8 rounded-lg"
            />
            <span className="text-sm font-semibold text-white">Mandara</span>
            <span className="rounded border border-amber-500/30 px-1.5 py-0.5 text-xs text-amber-300">
              Devnet beta
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="text-neutral-400"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </header>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="mandara-glass rounded-none border-x-0 border-t-0 p-3 md:hidden">
            <nav className="space-y-1">
              <button
                onClick={() => {
                  router.push("/mandara");
                  setMobileOpen(false);
                }}
                className="mb-2 flex w-full items-center gap-2.5 rounded-lg border border-white/[0.06] px-3 py-2 text-sm text-neutral-300 hover:bg-white/[0.04]"
              >
                <Home className="h-4 w-4" />
                Mandara Home
              </button>
              {navItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <button
                    key={item.href}
                    onClick={() => {
                      router.push(item.href);
                      setMobileOpen(false);
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm ${
                      active
                        ? "bg-sky-500/10 text-sky-300"
                        : "text-neutral-400 hover:bg-white/[0.04]"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
              <button
                onClick={() => {
                  router.push("/advanced");
                  setMobileOpen(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-neutral-500 hover:bg-white/[0.04]"
              >
                <FlaskConical className="h-4 w-4" />
                Advanced Proof
              </button>
            </nav>
          </div>
        )}

        {/* Desktop header */}
        <header className="mandara-glass hidden items-center justify-between rounded-none border-x-0 border-t-0 px-6 py-3 md:flex">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold text-white">
              {navItems.find((n) => n.href === pathname)?.label ?? "Mandara"}
            </h1>
            <button
              onClick={() => router.push("/mandara")}
              className="rounded-lg border border-[#B2BDBA]/10 bg-[#21342F]/35 px-2 py-1 text-xs text-[#B2BDBA] hover:border-[#5EBDB0]/25 hover:bg-[#3E877E]/18 hover:text-white"
            >
              Mandara Home
            </button>
            <span className="rounded border border-amber-500/30 px-1.5 py-0.5 text-xs text-amber-300">
              Devnet beta
            </span>
          </div>
          <div className="text-xs text-neutral-500">
            Ika pre-alpha mock signer · Not production custody
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
