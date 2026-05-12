"use client";

import { useState } from "react";
import { HelpCircle, X } from "lucide-react";

interface HelpTipProps {
  title?: string;
  children: React.ReactNode;
}

export function HelpTip({ title, children }: HelpTipProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center text-neutral-500 hover:text-neutral-300"
        aria-label={title ?? "Help"}
      >
        <HelpCircle className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute z-50 mt-2 w-64 rounded-lg border border-white/[0.08] bg-neutral-900 p-3 text-xs leading-5 text-neutral-300 shadow-lg">
          <div className="flex items-start justify-between gap-2">
            {title && <span className="font-medium text-white">{title}</span>}
            <button onClick={() => setOpen(false)} className="text-neutral-500 hover:text-white">
              <X className="h-3 w-3" />
            </button>
          </div>
          <div className="mt-1">{children}</div>
        </div>
      )}
    </div>
  );
}
