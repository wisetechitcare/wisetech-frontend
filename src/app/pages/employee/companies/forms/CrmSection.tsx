import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/ds/ui/card";
import { cn } from "@/ds/lib/utils";

type Props = {
  title?: React.ReactNode;
  children: React.ReactNode;
  /** `danger` / `brand` tint the card's edge and title (cancellation, PO details…). */
  tone?: "danger" | "brand";
  className?: string;
};

const TONE = {
  danger: { card: "ring-destructive/40", title: "text-destructive" },
  brand: { card: "ring-primary/40", title: "text-primary" },
};

/** The one wizard section card (Lead, Company, Sub-company, Branch, Contact), on the kit Card. */
export function CrmSection({ title, children, tone, className }: Props) {
  return (
    // panel: the kit's plain surface, without the tile's corner glow and hover lift. overflow-visible:
    // inline dropdown menus must not be clipped by the card.
    <Card variant="panel" className={cn("gap-5 overflow-visible rounded-2xl shadow-[0_1px_3px_rgb(0_0_0/0.06)]", tone && TONE[tone].card, className)}>
      {title && (
        <CardHeader className="border-b border-border/70 pb-3!">
          <CardTitle className={cn("text-xs font-bold tracking-wider text-foreground uppercase", tone && TONE[tone].title)}>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default CrmSection;
