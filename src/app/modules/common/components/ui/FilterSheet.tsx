import { useEffect, useState, type ReactNode } from "react";
import { Badge, Stack, Tooltip } from "@mui/material";
import { Button } from "@/ds/ui/button";
import { AppIcon } from "./AppIcon";
import { WtButton } from "./buttons";
import { WtSheet } from "./WtSheet";
import { TRIO } from "./patterns";

/** Count of fields that differ from their reset value. */
export function countActiveFilters<T extends object>(value: T, empty: T): number {
  return (Object.keys(empty) as (keyof T)[]).filter((k) => value[k] !== empty[k]).length;
}

/**
 * Filter trigger for a table's right-side icon group — pass it through MaterialTable's
 * `renderToolbarIconActions`. Applied filters show as a count badge and tint the button
 * (kit `tinted`), like the table's own tools while they are ON.
 */
export function FilterSheetButton({ count, onClick }: { count: number; onClick: () => void }) {
  const label = count ? `Filters (${count} applied)` : "Filters";
  return (
    <Tooltip title={label}>
      <Button
        variant={count > 0 ? "tinted" : "ghost"}
        size="icon-sm"
        aria-label={label}
        onClick={onClick}
        data-active={count > 0}
      >
        <Badge
          badgeContent={count}
          color="primary"
          sx={{
            "& .MuiBadge-badge": {
              height: 16,
              minWidth: 16,
              px: 0.5,
              fontSize: 10,
              fontWeight: 700,
              top: -2,
              right: -4,
            },
          }}
        >
          <AppIcon name="bi-funnel" />
        </Badge>
      </Button>
    </Tooltip>
  );
}

export interface FilterSheetProps<T extends object> {
  open: boolean;
  /** Applied filters. The sheet edits a draft copy until Apply. */
  value: T;
  /** Reset target. A field counts as active when it differs from this. */
  empty: T;
  title: string;
  description?: ReactNode;
  onClose: () => void;
  onApply: (next: T) => void;
  /** Fields, usually `FormSection`s of `WtField`s bound to `draft` / `set`. */
  children: (draft: T, set: <K extends keyof T>(key: K, next: T[K]) => void) => ReactNode;
}

/**
 * The standard table filter workspace: a `WtSheet` with Reset (clears AND applies in one
 * click) and Apply. Pair with `FilterSheetButton`.
 */
export function FilterSheet<T extends object>({
  open,
  value,
  empty,
  title,
  description,
  onClose,
  onApply,
  children,
}: FilterSheetProps<T>) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  const draftCount = countActiveFilters(draft, empty);
  const set = <K extends keyof T>(key: K, next: T[K]) =>
    setDraft((current) => ({ ...current, [key]: next }));

  return (
    <WtSheet
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      icon="filter"
      tone={TRIO.amber}
      footer={
        <Stack direction="row" spacing={1.25}>
          <WtButton
            ghost
            fullWidth
            size="medium"
            disabled={draftCount === 0 && countActiveFilters(value, empty) === 0}
            onClick={() => onApply(empty)}
          >
            Reset filters
          </WtButton>
          <WtButton fullWidth size="medium" flat={false} onClick={() => onApply(draft)}>
            {draftCount ? `Apply filters (${draftCount})` : "Apply"}
          </WtButton>
        </Stack>
      }
    >
      <Stack spacing={1.5}>{children(draft, set)}</Stack>
    </WtSheet>
  );
}
