import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-xl border border-[#B2BDBA]/12 bg-[#132020]/45 px-3 py-2 text-sm text-[#eef7f5] shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] transition-colors outline-none placeholder:text-[#53706A]",
        "file:text-white file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "focus-visible:border-[#5EBDB0]/55 focus-visible:ring-1 focus-visible:ring-[#5EBDB0]/35",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-red-500/50 aria-invalid:ring-1 aria-invalid:ring-red-500/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
