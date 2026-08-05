import React, { useMemo, useState } from "react";
import {
  Box, MenuItem, Pagination, Stack, TextField, Typography,
} from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import { GlassCard } from "@app/modules/common/components/ui";
import { BillingEmptyState, BillingLoadingState } from "./BillingPrimitives";

/**
 * The Billing module's one table.
 *
 * Every Billing list (requests, queue, proformas, payments, invoices) renders through
 * this so they share search, filtering, pagination, empty and loading states rather than
 * each reimplementing them slightly differently.
 *
 * Deliberately simple: it takes rows already in memory and paginates client-side. Billing
 * lists are per-project or per-queue and small.
 * ponytail: client-side paging; move to a server cursor when a list first exceeds a few
 * hundred rows, which none of these do today.
 */

export interface BillingColumn<T> {
  key: string;
  header: string;
  /** Fixed width in px; omit to let the column flex. */
  width?: number;
  align?: "left" | "right";
  render: (row: T) => React.ReactNode;
  /** Text pulled from the row for the search box. Omit to exclude from search. */
  searchValue?: (row: T) => string | null | undefined;
}

export interface BillingFilterDef {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

export interface BillingTableProps<T> {
  rows: T[];
  columns: BillingColumn<T>[];
  getRowId: (row: T) => string;
  loading?: boolean;
  /** Rendered at the far right of each row. */
  actions?: (row: T) => React.ReactNode;
  onRowClick?: (row: T) => void;
  searchPlaceholder?: string;
  filters?: BillingFilterDef[];
  /** Current filter values, keyed by filter key. "" means "all". */
  filterValues?: Record<string, string>;
  onFilterChange?: (key: string, value: string) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  pageSize?: number;
}

/** Search + dropdown filters. Exported separately so a page can hoist the controls
 *  above its own layout when it needs to. */
export const BillingFilters: React.FC<{
  search: string;
  onSearch: (v: string) => void;
  searchPlaceholder?: string;
  filters?: BillingFilterDef[];
  filterValues?: Record<string, string>;
  onFilterChange?: (key: string, value: string) => void;
}> = ({ search, onSearch, searchPlaceholder, filters = [], filterValues = {}, onFilterChange }) => (
  <Stack
    direction={{ xs: "column", sm: "row" }}
    spacing={1}
    sx={{ mb: 1.5 }}
  >
    <TextField
      size="small"
      value={search}
      onChange={(e) => onSearch(e.target.value)}
      placeholder={searchPlaceholder ?? "Search…"}
      InputProps={{ startAdornment: <KTIcon iconName="magnifier" className="fs-5 me-2" /> }}
      sx={{ flex: 1, minWidth: 0 }}
    />
    {filters.map((f) => (
      <TextField
        key={f.key}
        select
        size="small"
        label={f.label}
        value={filterValues[f.key] ?? ""}
        onChange={(e) => onFilterChange?.(f.key, e.target.value)}
        sx={{ minWidth: { xs: "100%", sm: 190 } }}
      >
        <MenuItem value="" sx={{ fontSize: 13 }}>All</MenuItem>
        {f.options.map((o) => (
          <MenuItem key={o.value} value={o.value} sx={{ fontSize: 13 }}>{o.label}</MenuItem>
        ))}
      </TextField>
    ))}
  </Stack>
);

export function BillingTable<T>({
  rows, columns, getRowId, loading, actions, onRowClick,
  searchPlaceholder, filters, filterValues, onFilterChange,
  emptyTitle = "Nothing here yet", emptyDescription, pageSize = 15,
}: BillingTableProps<T>) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      columns.some((c) => (c.searchValue?.(row) ?? "").toString().toLowerCase().includes(q)),
    );
  }, [rows, columns, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  // Clamp rather than reset: a filter that shrinks the list shouldn't throw the user
  // back to page 1 when their current page still has rows.
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <Box>
      <BillingFilters
        search={search}
        onSearch={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder={searchPlaceholder}
        filters={filters}
        filterValues={filterValues}
        onFilterChange={onFilterChange}
      />

      {loading ? (
        <BillingLoadingState rows={5} />
      ) : filtered.length === 0 ? (
        <BillingEmptyState
          title={search ? "No matches" : emptyTitle}
          description={search ? "Try a different search term." : emptyDescription}
        />
      ) : (
        <GlassCard preset="section" sx={{ p: 0, overflow: "hidden" }}>
          {/* Wide tables scroll inside their own container so the page never does. */}
          <Box sx={{ overflowX: "auto" }}>
            <Box sx={{ minWidth: 760 }}>
              <Stack
                direction="row"
                sx={{
                  px: 1.5, py: 1, borderBottom: "1px solid", borderColor: "divider",
                  bgcolor: "action.hover",
                  fontSize: 11, fontWeight: 700, color: "text.secondary",
                  textTransform: "uppercase", letterSpacing: 0.4,
                }}
              >
                {columns.map((c) => (
                  <Box
                    key={c.key}
                    sx={{
                      ...(c.width ? { width: c.width, flexShrink: 0 } : { flex: 1, minWidth: 0 }),
                      textAlign: c.align ?? "left",
                      pr: 1,
                    }}
                  >
                    {c.header}
                  </Box>
                ))}
                {actions && <Box sx={{ width: 118, flexShrink: 0, textAlign: "right" }}>Actions</Box>}
              </Stack>

              {visible.map((row) => (
                <Stack
                  key={getRowId(row)}
                  direction="row"
                  alignItems="center"
                  onClick={() => onRowClick?.(row)}
                  sx={{
                    px: 1.5, py: 1.1, borderBottom: "1px solid", borderColor: "divider",
                    cursor: onRowClick ? "pointer" : "default",
                    transition: "background-color .12s",
                    "&:hover": { bgcolor: "action.hover" },
                    "&:last-of-type": { borderBottom: "none" },
                  }}
                >
                  {columns.map((c) => (
                    <Box
                      key={c.key}
                      sx={{
                        ...(c.width ? { width: c.width, flexShrink: 0 } : { flex: 1, minWidth: 0 }),
                        textAlign: c.align ?? "left",
                        pr: 1, fontSize: 13,
                      }}
                    >
                      {c.render(row)}
                    </Box>
                  ))}
                  {actions && (
                    <Box
                      sx={{ width: 118, flexShrink: 0, display: "flex", justifyContent: "flex-end", gap: 0.5 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {actions(row)}
                    </Box>
                  )}
                </Stack>
              ))}
            </Box>
          </Box>
        </GlassCard>
      )}

      {!loading && filtered.length > 0 && (
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems="center"
          justifyContent="space-between"
          spacing={1}
          sx={{ mt: 1.5 }}
        >
          <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>
            {filtered.length} record{filtered.length === 1 ? "" : "s"}
            {filtered.length !== rows.length ? ` (of ${rows.length})` : ""}
          </Typography>
          {pageCount > 1 && (
            <Pagination
              size="small"
              count={pageCount}
              page={safePage}
              onChange={(_e, p) => setPage(p)}
              shape="rounded"
            />
          )}
        </Stack>
      )}
    </Box>
  );
}

export default BillingTable;
