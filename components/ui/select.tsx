import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface SelectProps extends React.ComponentProps<"select"> {
  label?: string
  options: { value: string; label: string }[]
}

function Select({ label, options, className, children, ...props }: SelectProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-xs text-neutral-400">{label}</label>
      )}
      <div className="relative">
        <select
          className={cn(
            "h-10 w-full appearance-none rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 pr-8 text-sm text-white outline-none transition-colors",
            "focus-visible:border-sky-500/50 focus-visible:ring-1 focus-visible:ring-sky-500/30",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          {...props}
        >
          {children}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-neutral-900 text-white">
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
      </div>
    </div>
  )
}

export { Select }
