import * as React from "react"
import { cn } from "@/lib/utils"

interface DataFieldProps extends React.ComponentProps<"div"> {
  label?: string
  value: React.ReactNode
  mono?: boolean
  truncate?: boolean
  copyable?: boolean
}

function DataField({
  label,
  value,
  mono = true,
  truncate = true,
  className,
  ...props
}: DataFieldProps) {
  return (
    <div className={cn("space-y-1", className)} {...props}>
      {label && (
        <span className="text-xs text-neutral-500">{label}</span>
      )}
      <div
        className={cn(
          "rounded-lg bg-black/30 px-3 py-2 text-xs text-neutral-300",
          mono && "font-mono",
          truncate && "truncate"
        )}
      >
        {value}
      </div>
    </div>
  )
}

export { DataField }
