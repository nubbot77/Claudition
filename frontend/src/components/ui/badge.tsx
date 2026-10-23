import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"
import { withRef } from "@/lib/with-ref"

/**
 * Square-cornered status chips. Soft variants (accent, success, warning, destructive) carry verdicts,
 * difficulty, confidence and test results; `default` is navy, `secondary`/`outline` are neutral.
 */
const badgeVariants = cva(
  "group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-sm border border-transparent font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 [&>svg]:pointer-events-none",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/90",
        secondary: "bg-secondary text-secondary-foreground [a]:hover:bg-muted",
        outline: "border-border bg-card text-foreground [a]:hover:bg-muted dark:bg-transparent",
        accent: "border-accent/20 bg-accent-soft text-accent-soft-foreground",
        success: "border-success/25 bg-success-soft text-success-soft-foreground",
        warning: "border-warning/30 bg-warning-soft text-warning-soft-foreground",
        destructive: "border-destructive/25 bg-destructive-soft text-destructive-soft-foreground",
        ghost: "text-muted-foreground [a]:hover:bg-muted",
        link: "text-accent underline-offset-4 hover:underline",
      },
      size: {
        default: "h-5 px-1.5 text-xs [&>svg]:size-3",
        lg: "h-6 px-2 text-[13px] [&>svg]:size-3.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function BadgeImpl({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  )
}

const Badge = /* @__PURE__ */ withRef(BadgeImpl, "Badge")

export { Badge, badgeVariants }
