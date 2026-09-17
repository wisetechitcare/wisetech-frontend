import React, { useMemo, useState } from "react";
import {
  Box, MenuItem, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TablePagination, TableRow, TableSortLabel, TextField,
} from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import { GlassCard } from "@app/modules/common/components/ui";
import { BillingEmptyState, BillingLoadingState } from "./BillingPrimitives";

/**
 * The Billing module's one table.
 *
 * Every Billing list (requests, accounts queue, and later proformas/payments/invoices)
 * renders through this, so they share search, filtering, sorting, pagination, empty and
 * loading states rather than each reimplementing them slightly differently.
 *
 * Built on MUI's `Table` primitives — real `<table>` semantics, so screen readers get
 * proper row/column association and the header can stick while the body scrolls.
 *
 * Rows are paginated client-side. Billing lists are per-project or per-queue and small.
 * ponytail: client-side paging + sorting; move to a server cursor when a list first
 * exceeds a few hundred rows, which none of these do today.
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
  /** Return a comparable value to make the column sortable. Omit to disable sorting. */
  sortValue?: (row: T) => string | number | null | undefined;
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
  /** Rendered in a trailing actions cell. */
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
  /** Minimum table width before the container scrolls horizontally. */
  minWidth?: number;
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
  <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 1.5 }}>
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
        sx={{ minWidth: { xs: "100%", sm: 180 } }}
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
  emptyTitle = "Nothing here yet", emptyDescription, pageSize = 15, minWidth = 980,
}: BillingTableProps<T>) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(pageSize);
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      columns.some((c) => (c.searchValue?.(row) ?? "").toString().toLowerCase().includes(q)),
    );
  }, [rows, columns, search]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const column = columns.find((c) => c.key === sort.key);
    if (!column?.sortValue) return filtered;
    // Copy before sorting — mutating the query cache's array in place would make React
    // Query hand out a differently-ordered list on the next render for no reason.
    return [...filtered].sort((a, b) => {
      const av = column.sortValue!(a);
      const bv = column.sortValue!(b);
      // Nulls sort last regardless of direction: "no value" is not "smallest value".
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av).localeCompare(String(bv));
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [filtered, columns, sort]);

  // Clamp rather than reset: a filter that shrinks the list shouldn't throw the user back
  // to page 1 when their current page still has rows.
  const pageCount = Math.max(1, Math.ceil(sorted.length / rowsPerPage));
  const safePage = Math.min(page, pageCount - 1);
  const visible = sorted.slice(safePage * rowsPerPage, safePage * rowsPerPage + rowsPerPage);

  const toggleSort = (key: string) =>
    setSort((prev) =>
      prev?.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );

  return (
    <Box>
      <BillingFilters
        search={search}
        onSearch={(v) => { setSearch(v); setPage(0); }}
        searchPlaceholder={searchPlaceholder}
        filters={filters}
        filterValues={filterValues}
        onFilterChange={onFilterChange}
      />

      {loading ? (
        <BillingLoadingState rows={5} />
      ) : sorted.length === 0 ? (
        <BillingEmptyState
          title={search ? "No matches" : emptyTitle}
          description={search ? "Try a different search term." : emptyDescription}
        />
      ) : (
        <GlassCard preset="section" sx={{ p: 0, overflow: "hidden" }}>
          {/* The table scrolls inside its own container so the page never scrolls
              horizontally on a narrow screen. */}
          <TableContainer sx={{ maxHeight: 640 }}>
            <Table stickyHeader size="small" sx={{ minWidth }}>
              <TableHead>
                <TableRow>
                  {columns.map((c) => (
                    <TableCell
                      key={c.key}
                      align={c.align ?? "left"}
                      sortDirection={sort?.key === c.key ? sort.dir : false}
                      sx={{
                        width: c.width, minWidth: c.width,
                        bgcolor: "background.paper",
                        fontSize: 11, fontWeight: 700, letterSpacing: 0.4,
                        textTransform: "uppercase", color: "text.secondary",
                        borderBottom: "1px solid", borderColor: "divider",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {c.sortValue ? (
                        <TableSortLabel
                          active={sort?.key === c.key}
                          direction={sort?.key === c.key ? sort.dir : "asc"}
                          onClick={() => toggleSort(c.key)}
                        >
                          {c.header}
                        </TableSortLabel>
                      ) : (
                        c.header
                      )}
                    </TableCell>
                  ))}
                  {actions && (
                    <TableCell
                      align="right"
                      sx={{
                        width: 150, bgcolor: "background.paper",
                        fontSize: 11, fontWeight: 700, letterSpacing: 0.4,
                        textTransform: "uppercase", color: "text.secondary",
                        borderBottom: "1px solid", borderColor: "divider",
                      }}
                    >
                      Actions
                    </TableCell>
                  )}
                </TableRow>
              </TableHead>

              <TableBody>
                {visible.map((row) => (
                  <TableRow
                    key={getRowId(row)}
                    hover={!!onRowClick}
                    onClick={() => onRowClick?.(row)}
                    sx={{
                      cursor: onRowClick ? "pointer" : "default",
                      "&:last-of-type td": { borderBottom: "none" },
                    }}
                  >
                    {columns.map((c) => (
                      <TableCell
                        key={c.key}
                        align={c.align ?? "left"}
                        sx={{
                          fontSize: 13, py: 1.1,
                          borderBottom: "1px solid", borderColor: "divider",
                        }}
                      >
                        {c.render(row)}
                      </TableCell>
                    ))}
                    {actions && (
                      // Stop propagation so an action never also triggers the row click.
                      <TableCell
                        align="right"
                        onClick={(e) => e.stopPropagation()}
                        sx={{ py: 0.75, borderBottom: "1px solid", borderColor: "divider" }}
                      >
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                          {actions(row)}
                        </Stack>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={sorted.length}
            page={safePage}
            onPageChange={(_e, next) => setPage(next)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0); }}
            rowsPerPageOptions={[10, 15, 25, 50]}
            sx={{ borderTop: "1px solid", borderColor: "divider" }}
          />
        </GlassCard>
      )}
    </Box>
  );
}

export default BillingTable;
