import * as React from "react"
import { cn } from "cn"
import { Label as LabelPrimitive } from "radix-ui"
import { withRef } from "@/lib/with-ref"

/** 13px medium labels. */
function LabelImpl({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-[13px] leading-4 font-medium text-foreground select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

const Label = /* @__PURE__ */ withRef(LabelImpl, "Label")

export { Label }
