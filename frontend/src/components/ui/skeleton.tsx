import { cn } from "cn"
import { withRef } from "@/lib/with-ref"

function SkeletonImpl({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

const Skeleton = /* @__PURE__ */ withRef(SkeletonImpl, "Skeleton")

export { Skeleton }
