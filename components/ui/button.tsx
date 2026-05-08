import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all duration-200 gap-2 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "border border-[#91e3d7]/20 bg-[#5EBDB0] text-[#0d1716] shadow-[0_0_24px_rgba(94,189,176,0.18)] hover:bg-[#73d4c7] hover:shadow-[0_0_34px_rgba(94,189,176,0.24)]",
        destructive:
          "border border-red-300/15 bg-red-500/80 text-white shadow-[0_0_24px_rgba(239,68,68,0.12)] hover:bg-red-400/90",
        outline:
          "border border-[#B2BDBA]/15 bg-[#21342F]/35 text-[#eef7f5] backdrop-blur-xl hover:border-[#5EBDB0]/35 hover:bg-[#2A3D36]/55 hover:text-white",
        secondary:
          "border border-[#B2BDBA]/10 bg-[#2A3D36]/55 text-[#eef7f5] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:bg-[#3E877E]/30",
        ghost:
          "text-[#B2BDBA] hover:bg-[#2A3D36]/45 hover:text-[#eef7f5]",
        link:
          "text-[#5EBDB0] underline-offset-4 hover:underline hover:text-[#8de7dc]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-6 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
