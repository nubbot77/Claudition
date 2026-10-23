import * as React from "react"
import { cn } from "cn"
import { withRef } from "@/lib/with-ref"

/** 8px radius, 1px border, barely-there shadow. `size="sm"` tightens padding from 24px to 16px. */
function CardImpl({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm" }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        "group/card flex flex-col gap-(--card-spacing) rounded-lg border border-border bg-card py-(--card-spacing) text-sm text-card-foreground shadow-xs [--card-spacing:--spacing(6)] has-data-[slot=card-footer]:pb-0 data-[size=sm]:[--card-spacing:--spacing(4)] data-[size=sm]:has-data-[slot=card-footer]:pb-0",
        className
      )}
      {...props}
    />
  )
}

function CardHeaderImpl({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

function CardTitleImpl({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-heading text-base leading-6 font-semibold tracking-tight group-data-[size=sm]/card:text-sm group-data-[size=sm]/card:leading-5",
        className
      )}
      {...props}
    />
  )
}

function CardDescriptionImpl({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardActionImpl({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContentImpl({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-(--card-spacing)", className)}
      {...props}
    />
  )
}

function CardFooterImpl({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center gap-2 rounded-b-lg border-t bg-muted/40 px-(--card-spacing) py-3",
        className
      )}
      {...props}
    />
  )
}

const Card = /* @__PURE__ */ withRef(CardImpl, "Card")
const CardHeader = /* @__PURE__ */ withRef(CardHeaderImpl, "CardHeader")
const CardTitle = /* @__PURE__ */ withRef(CardTitleImpl, "CardTitle")
const CardDescription = /* @__PURE__ */ withRef(CardDescriptionImpl, "CardDescription")
const CardAction = /* @__PURE__ */ withRef(CardActionImpl, "CardAction")
const CardContent = /* @__PURE__ */ withRef(CardContentImpl, "CardContent")
const CardFooter = /* @__PURE__ */ withRef(CardFooterImpl, "CardFooter")

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
