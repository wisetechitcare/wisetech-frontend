import * as React from "react";
import { titleCaseChildren } from "@/ds/lib/text"
import { Dialog as SheetPrimitive } from "@animate-ui/react/primitives/base-ui/dialog";
import { cn } from "cn";

import { Button } from "@/ds/ui/button";
import { XIcon } from "lucide-react";
import { useSettledRef } from "@/ds/lib/motion"
import { modalScrimClassName } from "@/ds/ui/dialog";

function Sheet({ ...props }: SheetPrimitive.Root.Props) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger({ ...props }: SheetPrimitive.Trigger.Props) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({ ...props }: SheetPrimitive.Close.Props) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetPortal({ ...props }: SheetPrimitive.Portal.Props) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

function SheetOverlay({ className, ...props }: SheetPrimitive.Backdrop.Props) {
  return (
    <SheetPrimitive.Backdrop
      data-slot="sheet-overlay"
      className={cn(
        modalScrimClassName,
        "z-(--z-modal)",
        className,
      )}
      {...props}
    />
  );
}

function SheetContent({
  className,
  children,
  side = "right",
  fit = "content",
  size = "default",
  showCloseButton = true,
  ...props
}: SheetPrimitive.Popup.Props & {
  side?: "top" | "right" | "bottom" | "left";
  /**
   * Side panels only. `content` (default): the drawer is as tall as what it holds and grows with it, up to the
   * viewport (8px off each edge) — then its body scrolls. A two-field form no longer floats in a screen-tall slab.
   * `full`: always viewport-tall — navigation (the mobile sidebar) and anything whose height must not jump.
   */
  fit?: "content" | "full";
  /**
   * Side panels only — the width from `sm` up (phones: 75% of the screen). In PIXELS, not rem: the live app's
   * root font is 13px (Metronic), so `max-w-sm` (24rem) shrank to 312px there and wrapped every footer.
   * `default` 384px — filters, short forms. `lg` 480px — a record's details (figures, two-column facts).
   */
  size?: "default" | "lg";
  showCloseButton?: boolean;
}) {
  // Crisp at rest: see useSettledWhenOpen (src/ds/lib/motion.ts).
  const settledRef = useSettledRef();
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Popup
        ref={settledRef}
        data-slot="sheet-content"
        data-side={side}
        data-fit={fit}
        data-size={size}
        className={cn(
          // The shadcn Drawer look (ui.shadcn.com/docs/components/base/drawer, the kit's drawer.tsx): a panel floating
          // 8px off the viewport edges (`--drawer-inset`), rounded-4xl all round, bordered — not a square slab glued to
          // one edge. Side panels are 75% wide, 24rem from `sm` (the drawer's x-axis sizing).
          "fixed z-(--z-modal) flex flex-col overflow-hidden rounded-4xl border border-border bg-popover bg-clip-padding text-sm text-popover-foreground shadow-2xl",
          "data-[side=bottom]:inset-x-2 data-[side=bottom]:bottom-2 data-[side=bottom]:h-auto data-[side=bottom]:max-h-[calc(100dvh-6rem)]",
          "data-[side=top]:inset-x-2 data-[side=top]:top-2 data-[side=top]:h-auto data-[side=top]:max-h-[calc(100dvh-6rem)]",
          "data-[side=left]:left-2 data-[side=right]:right-2",
          "data-[side=left]:w-[calc(75%-16px)] data-[side=right]:w-[calc(75%-16px)]",
          "data-[size=default]:data-[side=left]:sm:max-w-[384px] data-[size=default]:data-[side=right]:sm:max-w-[384px]",
          "data-[size=lg]:data-[side=left]:sm:max-w-[480px] data-[size=lg]:data-[side=right]:sm:max-w-[480px]",
          // Height (side panels): grow with the content, capped at the viewport; or always full.
          "data-[fit=content]:data-[side=left]:top-2 data-[fit=content]:data-[side=left]:max-h-[calc(100dvh-1rem)]",
          "data-[fit=content]:data-[side=right]:top-2 data-[fit=content]:data-[side=right]:max-h-[calc(100dvh-1rem)]",
          "data-[fit=full]:data-[side=left]:inset-y-2 data-[fit=full]:data-[side=right]:inset-y-2",
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close
            data-slot="sheet-close"
            render={
              // The Button story's "Tinted" Close: the neutral tint, same family as the other row/card actions.
              <Button
                variant="tinted"
                className="absolute top-4 right-4 [--tint:var(--muted-foreground)]"
                size="icon-sm"
              />
            }
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Popup>
    </SheetPortal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1.5 p-6", className)}
      {...props}
    />
  );
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      // A footer laid out as a row (`flex-row`) centres its items on one line, like every other kit action row.
      className={cn("mt-auto flex flex-col gap-2 p-6 [&.flex-row]:items-center", className)}
      {...props}
    />
  );
}

function SheetTitle({ className, children, ...props }: SheetPrimitive.Title.Props) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn(
        "heading-case font-heading text-base font-medium text-foreground",
        className,
      )}
      {...props}
      children={titleCaseChildren(children)}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: SheetPrimitive.Description.Props) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
