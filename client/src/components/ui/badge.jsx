import * as React from "react"
import { cn } from "@/lib/utils"

const Badge = React.forwardRef(({ className, variant = "default", ...props }, ref) => {
  const variants = {
    default: "border-transparent bg-primary/10 text-primary",
    secondary: "border-transparent bg-slate-100 text-slate-600",
    destructive: "border-transparent bg-red-50 text-red-600",
    outline: "text-foreground border-border",
    warning: "border-transparent bg-amber-50 text-amber-700",
    success: "border-transparent bg-emerald-50 text-emerald-700",
  }

  return (
    <div
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        variants[variant],
        className
      )}
      {...props}
    />
  )
})
Badge.displayName = "Badge"

export { Badge }
