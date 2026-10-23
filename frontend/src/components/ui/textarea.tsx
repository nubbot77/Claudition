import * as React from "react"
import { cn } from "cn"
import { withRef } from "@/lib/with-ref"

function TextareaImpl({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-20 w-full rounded-md border border-input bg-card px-3 py-2 text-base leading-6 shadow-xs transition-[color,border-color,box-shadow] duration-150 outline-none placeholder:text-muted-foreground/80 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/15 md:text-sm dark:bg-background/40",
        className
      )}
      {...props}
    />
  )
}

const Textarea = /* @__PURE__ */ withRef(TextareaImpl, "Textarea")

export { Textarea }
