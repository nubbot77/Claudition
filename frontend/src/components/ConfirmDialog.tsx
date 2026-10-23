import type { ReactNode } from "react";
import { CircleHelp, LoaderCircle, TriangleAlert } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { InlineError } from "./InlineError";

interface Props {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "primary" | "danger";
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmation built on shadcn AlertDialog. The confirm button does not auto-close: the caller closes the dialog
 * (open=false) once the action succeeds, so errors can show inline.
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "primary",
  busy = false,
  error,
  onConfirm,
  onCancel,
}: Props) {
  const danger = tone === "danger";
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia
            className={cn(danger ? "bg-destructive-soft text-destructive" : "bg-accent-soft text-accent")}
          >
            {danger ? <TriangleAlert className="size-5" /> : <CircleHelp className="size-5" />}
          </AlertDialogMedia>
          <AlertDialogTitle className="text-base font-semibold text-foreground">{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="flex flex-col gap-2 text-sm leading-6 text-muted-foreground">{children}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        {open && error && <InlineError message={error} />}
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <Button type="button" variant={danger ? "destructive" : "default"} onClick={onConfirm} disabled={busy}>
            {busy && <LoaderCircle className="animate-spin" />}
            {busy ? "Working…" : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
