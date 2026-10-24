import { lazy, Suspense } from "react";
import { PenTool } from "@/lib/icons";
import { Skeleton } from "@/components/ui/skeleton";
import type { BoardProps } from "./ExcalidrawBoard";

const ExcalidrawBoard = lazy(() => import("./ExcalidrawBoard"));

interface Props extends BoardProps {
  /** true when the board has changes the interviewer hasn't seen yet */
  pending: boolean;
}

export function Whiteboard({ pending, ...board }: Props) {
  return (
    <section aria-labelledby="whiteboard-title" className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <h2 id="whiteboard-title" className="inline-flex items-center gap-2 text-sm leading-5 font-semibold">
          <PenTool aria-hidden="true" className="size-4 text-muted-foreground" />
          Whiteboard
        </h2>
        <p className="text-xs leading-4 text-muted-foreground">
          {pending ? "Changes will be sent with your next answer" : "Draw boxes, label them, connect with arrows"}
        </p>
      </div>
      <div className="h-[28rem] overflow-hidden rounded-lg border border-border lg:h-[34rem]">
        <Suspense fallback={<Skeleton className="size-full rounded-none" />}>
          <ExcalidrawBoard {...board} />
        </Suspense>
      </div>
    </section>
  );
}
