import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white shadow-none transition-colors outline-none placeholder:text-neutral-500",
        "file:text-white file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "focus-visible:border-sky-500/50 focus-visible:ring-1 focus-visible:ring-sky-500/30",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-red-500/50 aria-invalid:ring-1 aria-invalid:ring-red-500/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
