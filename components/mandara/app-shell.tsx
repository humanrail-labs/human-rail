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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useState } from "react";

const navItems = [
  { label: "Overview", href: "/mandara/app", icon: LayoutDashboard },
  { label: "Onboarding", href: "/mandara/app/onboarding", icon: Compass },
  { label: "Agents", href: "/mandara/app/agents", icon: Bot },
  { label: "Requests", href: "/mandara/app/requests", icon: FileKey },
  { label: "Activity", href: "/mandara/app/activity", icon: Activity },
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
    <div className="flex min-h-screen bg-neutral-950 text-neutral-100">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 flex-col border-r border-white/[0.06] bg-neutral-900/50 md:flex">
        <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-4">
          <Image
            src="/mandara-icon.png"
            alt="Mandara"
            width={36}
            height={36}
            className="h-9 w-9 rounded-lg"
          />
          <div>
            <p className="text-sm font-semibold text-white">Mandara</p>
            <p className="text-[10px] text-neutral-500">Devnet Console</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-sky-500/10 text-sky-300"
                    : "text-neutral-400 hover:bg-white/[0.04] hover:text-neutral-200"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-white/[0.06] p-3">
          <button
            onClick={() => router.push("/advanced")}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-neutral-500 transition-colors hover:bg-white/[0.04] hover:text-neutral-300"
          >
            <FlaskConical className="h-4 w-4" />
            Advanced Proof
          </button>
          <div className="mt-3 flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-[10px] text-red-200/70">
            <Radio className="h-3 w-3 text-red-400" />
            Not production custody
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-white/[0.06] bg-neutral-900/50 px-4 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <Image
              src="/mandara-icon.png"
              alt="Mandara"
              width={32}
              height={32}
              className="h-8 w-8 rounded-lg"
            />
            <span className="text-sm font-semibold text-white">Mandara</span>
            <span className="rounded border border-amber-500/30 px-1.5 py-0.5 text-[10px] text-amber-300">
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
          <div className="border-b border-white/[0.06] bg-neutral-900/90 p-3 md:hidden">
            <nav className="space-y-1">
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
        <header className="hidden items-center justify-between border-b border-white/[0.06] bg-neutral-900/30 px-6 py-3 md:flex">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold text-white">
              {navItems.find((n) => n.href === pathname)?.label ?? "Mandara"}
            </h1>
            <span className="rounded border border-amber-500/30 px-1.5 py-0.5 text-[10px] text-amber-300">
              Devnet beta
            </span>
          </div>
          <div className="text-[10px] text-neutral-500">
            Ika pre-alpha mock signer · Not production custody
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
