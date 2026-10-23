"use client"

import * as React from "react"
import { cn } from "cn"
import { withRef } from "@/lib/with-ref"

function TableImpl({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto"
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
}

function TableHeaderImpl({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b", className)}
      {...props}
    />
  )
}

function TableBodyImpl({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooterImpl({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t bg-muted/40 font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRowImpl({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b transition-colors hover:bg-muted/40 has-aria-expanded:bg-muted/40 data-[state=selected]:bg-muted",
        className
      )}
      {...props}
    />
  )
}

function TableHeadImpl({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-9 px-3 text-left align-middle text-[13px] font-medium whitespace-nowrap text-muted-foreground [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCellImpl({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "px-3 py-2.5 align-top [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCaptionImpl({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

const Table = /* @__PURE__ */ withRef(TableImpl, "Table")
const TableHeader = /* @__PURE__ */ withRef(TableHeaderImpl, "TableHeader")
const TableBody = /* @__PURE__ */ withRef(TableBodyImpl, "TableBody")
const TableFooter = /* @__PURE__ */ withRef(TableFooterImpl, "TableFooter")
const TableRow = /* @__PURE__ */ withRef(TableRowImpl, "TableRow")
const TableHead = /* @__PURE__ */ withRef(TableHeadImpl, "TableHead")
const TableCell = /* @__PURE__ */ withRef(TableCellImpl, "TableCell")
const TableCaption = /* @__PURE__ */ withRef(TableCaptionImpl, "TableCaption")

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
