// src/components/ui/separator.jsx
"use client"

import * as React from "react"

const Separator = React.forwardRef(
  ({ className = "", orientation = "horizontal", decorative = true, ...props }, ref) => (
    <div
      ref={ref}
      decorative={decorative ? "true" : undefined}
      role={decorative ? undefined : "separator"}
      aria-orientation={orientation}
      className={`shrink-0 bg-border ${
        orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]"
      } ${className}`}
      {...props}
    />
  )
)
Separator.displayName = "Separator"

export { Separator }