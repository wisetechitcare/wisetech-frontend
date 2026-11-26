"use client"

import { CircleCheckIcon, InfoIcon, LoaderCircleIcon, OctagonXIcon, TriangleAlertIcon, XIcon } from "lucide-react"
import { Toaster as Sonner, toast, type ToasterProps } from "sonner"

import { buttonVariants } from "./button"

import { useThemeMode } from "@/ds/hooks/use-theme-mode"
import { cn } from "cn"

const DEFAULT_DURATION_MS = 4000
const ICON_CLASS = "m-0! size-5"

/**
 * The one toast for the app: mount `<Toaster />` once, call `toast.success | error | warning | info()` anywhere.
 * Sonner's CSS is unlayered and beats Tailwind's utilities, so `!` marks the properties it also sets.
 */
const Toaster = ({ toastOptions, duration = DEFAULT_DURATION_MS, style, ...props }: ToasterProps) => {
  const theme = useThemeMode()

  return (
    <Sonner
      theme={theme}
      position="top-right"
      className="toaster group"
      duration={duration}
      style={{ "--toast-duration": `${duration}ms`, ...style } as React.CSSProperties}
      icons={{
        success: <CircleCheckIcon className={ICON_CLASS} />,
        info: <InfoIcon className={ICON_CLASS} />,
        warning: <TriangleAlertIcon className={ICON_CLASS} />,
        error: <OctagonXIcon className={ICON_CLASS} />,
        loading: <LoaderCircleIcon className={cn(ICON_CLASS, "animate-spin")} />,
        close: <XIcon className="size-4" />,
      }}
      toastOptions={{
        unstyled: true,
        ...toastOptions,
        classNames: {
          toast: cn(
            "group/toast flex w-full items-center gap-3 overflow-hidden rounded-lg border border-primary/20 bg-popover bg-linear-to-r from-accent to-transparent to-75% px-4 pt-3.5 pb-4.5 font-sans text-primary shadow-lg has-data-close-button:pr-10",
            "data-[type=success]:border-success/30 data-[type=success]:from-success-soft data-[type=success]:text-success",
            "data-[type=info]:border-info/30 data-[type=info]:from-info-soft data-[type=info]:text-info",
            "data-[type=warning]:border-warning/40 data-[type=warning]:from-warning-soft data-[type=warning]:text-warning",
            "data-[type=error]:border-destructive/30 data-[type=error]:from-destructive-soft data-[type=error]:text-destructive"
          ),
          content: "flex min-w-0 flex-1 flex-col gap-0.5",
          title: "text-sm leading-5! font-medium! text-foreground!",
          description: "text-sm leading-5! text-muted-foreground!",
          icon: "m-0! size-5! shrink-0 justify-center!",
          actionButton: cn(buttonVariants({ size: "xs" }), "shrink-0"),
          cancelButton: cn(buttonVariants({ variant: "ghost", size: "xs" }), "shrink-0"),
          closeButton: cn(
            "absolute top-2! right-2! left-auto! flex size-6! transform-none! items-center justify-center rounded-full! border-0! transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
            "bg-transparent! text-muted-foreground/70! hover:bg-muted! hover:text-foreground!"
          ),
          ...toastOptions?.classNames,
        },
      }}
      {...props}
    />
  )
}

export { Toaster, toast }
