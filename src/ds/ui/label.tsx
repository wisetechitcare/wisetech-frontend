import * as React from "react"
import { titleCaseChildren } from "@/ds/lib/text"
import { cn } from "cn"

function Label({ className, children, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
      children={titleCaseChildren(children)}
    />
  )
}

export { Label }
