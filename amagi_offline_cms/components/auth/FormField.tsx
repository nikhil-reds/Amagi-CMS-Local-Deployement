import type { LucideIcon } from "lucide-react"

import { Label } from "@/components/ui/label"

type FormFieldProps = {
  id: string
  label: string
  icon?: LucideIcon
  error?: string
  // Rendered on the right of the label row, e.g. a "Forgot password?" link.
  labelAction?: React.ReactNode
  children: React.ReactNode
}

// Label + input slot + error message. When `icon` is set, give the input `pl-9`.
export default function FormField({ id, label, icon: Icon, error, labelAction, children }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        {labelAction}
      </div>
      <div className="relative">
        {Icon ? (
          <Icon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-sky-600/70" />
        ) : null}
        {children}
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}

