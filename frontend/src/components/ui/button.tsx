import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"
import { withRef } from "@/lib/with-ref"

/**
 * Variants:
 * - default: the action (blue-600). One per view, for the step that moves the candidate forward.
 * - brand: navy, for rare brand-weighted actions.
 * - outline / secondary / ghost: supporting actions.
 * - destructive: confirm a destructive step (solid rose). destructive-outline: "End interview" style triggers.
 * - link: inline text action in accent blue.
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-transparent text-sm font-medium whitespace-nowrap transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-out outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-accent text-accent-foreground shadow-xs hover:bg-accent-hover",
        brand: "bg-brand-navy text-brand-navy-foreground shadow-xs hover:bg-brand-navy/90",
        outline:
          "border-input bg-card text-foreground shadow-xs hover:bg-muted aria-expanded:bg-muted dark:bg-transparent dark:hover:bg-muted",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklab,var(--secondary),var(--foreground)_6%)] aria-expanded:bg-[color-mix(in_oklab,var(--secondary),var(--foreground)_6%)]",
        ghost: "text-foreground hover:bg-muted aria-expanded:bg-muted",
        destructive:
          "bg-destructive text-destructive-foreground shadow-xs hover:bg-[color-mix(in_oklab,var(--destructive),black_10%)] focus-visible:ring-destructive",
        "destructive-outline":
          "border-destructive/40 bg-card text-destructive hover:border-destructive/60 hover:bg-destructive-soft focus-visible:ring-destructive dark:bg-transparent",
        link: "text-accent underline-offset-4 hover:text-accent-hover hover:underline",
      },
      size: {
        default:
          "h-9 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-7 gap-1 px-2.5 text-xs has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-8 gap-1 px-3 text-[13px] has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-10 px-5 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        icon: "size-9",
        "icon-xs": "size-7 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function ButtonImpl({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

const Button = /* @__PURE__ */ withRef(ButtonImpl, "Button")

export { Button, buttonVariants }
