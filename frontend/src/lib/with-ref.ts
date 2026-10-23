import * as React from "react";

/**
 * React 18 shim for shadcn's React 19-style components, which read `ref` from props. React 18 strips `ref` from
 * function-component props, so `asChild` triggers (tooltip/popover anchors), Radix Presence (dialog overlays) and
 * consumer refs would never reach the DOM node. This wraps a component in forwardRef and hands the ref back in
 * as a prop. Remove it (and its call sites) after moving to React 19.
 */
export function withRef<P extends object>(
  render: (props: P) => React.ReactNode,
  displayName: string,
): (props: P) => React.ReactNode {
  const Forwarded = React.forwardRef<unknown, P>((props, ref) =>
    render(ref ? ({ ...props, ref } as P) : (props as P)),
  );
  Forwarded.displayName = displayName;
  return Forwarded as unknown as (props: P) => React.ReactNode;
}
