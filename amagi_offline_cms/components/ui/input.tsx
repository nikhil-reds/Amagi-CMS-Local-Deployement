import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-white/90 px-3 text-sm text-zinc-950 shadow-xs transition outline-none placeholder:text-zinc-400 focus-visible:border-sky-500 focus-visible:ring-3 focus-visible:ring-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/15",
        className
      )}
      {...props}
    />
  )
}

export { Input }
