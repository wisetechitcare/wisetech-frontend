import React from "react";
import { Skeleton } from "@/ds/ui/skeleton";
import { Spinner } from "@/ds/ui/spinner";
import { GlassCard, IconBox, TRIO, type Trio } from "@app/modules/common/components/ui";

export interface BillingStatsCardProps {
  label: string;
  value: React.ReactNode;
  /** A keenicon name, or a node — pass `<CurrencySymbol />` for a money tile. */
  icon: React.ReactNode;
  trio?: Trio;
  /** Small muted line under the value — a period, a comparison, a hint. */
  hint?: string;
  loading?: boolean;
  onClick?: () => void;
  /** The tile is the filter currently applied: outlined in its own colour. */
  active?: boolean;
}

export const BillingStatsCard: React.FC<BillingStatsCardProps> = ({
  label, value, icon, trio = TRIO.blue, hint, loading, onClick, active,
}) => (
  <GlassCard
    preset="section"
    onClick={onClick}
    sx={{
      p: { xs: 1.5, sm: 1.75 },
      height: "100%",
      cursor: onClick ? "pointer" : "default",
      transition: "border-color .15s, transform .15s, box-shadow .15s",
      ...(active ? { borderColor: trio.c, boxShadow: `0 0 0 1.5px ${trio.c}` } : {}),
      ...(onClick ? { "&:hover": { transform: "translateY(-2px)" } } : {}),
    }}
  >
    <div className="flex flex-row items-start gap-2.5">
      <IconBox icon={icon} trio={trio} size={38} fs="fs-3" />
      <div className="min-w-0 flex-1">
        {/* The stat caption is a structural heading, so it takes `heading-case` — which is also what
            carried the MUI `textTransform: uppercase`. */}
        <p className="heading-case text-[11.5px] font-bold tracking-[0.4px] text-muted-foreground">
          {label}
        </p>
        {loading ? (
          <Skeleton className="h-[30px] w-[90px]" />
        ) : (
          <p className="mt-0.5 text-[19px] leading-tight font-bold break-words sm:text-[21px]">
            {value}
          </p>
        )}
        {hint && <p className="mt-0.5 text-[11.5px] text-muted-foreground">{hint}</p>}
      </div>
    </div>
  </GlassCard>
);

/** Row skeletons keep the page's shape while loading, so content does not jump when it arrives. */
export const BillingLoadingState: React.FC<{ rows?: number; variant?: "spinner" | "rows" }> = ({
  rows = 4, variant = "rows",
}) => {
  if (variant === "spinner") {
    // Spinner is sized by `size-*` and takes the text colour; size-7 is the old CircularProgress 28px.
    return <div className="flex flex-col items-center py-12"><Spinner className="size-7" /></div>;
  }
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-[62px] rounded-xl" />
      ))}
    </div>
  );
};
