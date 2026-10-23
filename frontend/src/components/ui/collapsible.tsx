"use client"

import { Collapsible as CollapsiblePrimitive } from "radix-ui"
import { withRef } from "@/lib/with-ref"

function CollapsibleImpl({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Root>) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />
}

function CollapsibleTriggerImpl({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleTrigger>) {
  return (
    <CollapsiblePrimitive.CollapsibleTrigger
      data-slot="collapsible-trigger"
      {...props}
    />
  )
}

function CollapsibleContentImpl({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleContent>) {
  return (
    <CollapsiblePrimitive.CollapsibleContent
      data-slot="collapsible-content"
      {...props}
    />
  )
}

const Collapsible = /* @__PURE__ */ withRef(CollapsibleImpl, "Collapsible")
const CollapsibleTrigger = /* @__PURE__ */ withRef(CollapsibleTriggerImpl, "CollapsibleTrigger")
const CollapsibleContent = /* @__PURE__ */ withRef(CollapsibleContentImpl, "CollapsibleContent")

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
