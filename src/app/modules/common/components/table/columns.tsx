/**
 * Table column factories — the single source of truth for column definitions.
 *
 * `MaterialTable` is already the one table engine (88 consumers). What had no
 * SSOT was the *column defs*: every page hand-rolled its own date / actions /
 * employee columns, and each rebuild reintroduced the same three defects —
 *
 *   1. Dates pre-formatted into the row sorted alphanumerically. MRT's default
 *      `sortingFn: 'auto'` chunks "30/07/2024" into [30, 7, 2024] and orders by
 *      DAY OF MONTH first. "DD MMM YYYY" is worse — the month sorts
 *      alphabetically (Apr, Aug, Dec…).
 *   2. Action columns exposed ⇅ Sort / Group by / Filter over an accessorKey
 *      with no backing row field (42 of 68 instances app-wide).
 *   3. Five rival employee-identity cells, so a11y and dark-mode fixes had to be
 *      made five times.
 *
 * Build columns from these factories instead of by hand. Each takes the raw row
 * value — never pre-format a date into the row data.
 */

import { Link } from "react-router-dom";
import { formatDate, formatDateTime } from "@utils/dateFormats";
import EmployeeIdentityCell from "@app/modules/common/components/EmployeeIdentityCell";
import { dateSortingFn, toSortableTime } from "./dateSort";

export { dateSortingFn, toSortableTime } from "./dateSort";

// ─── Factories ────────────────────────────────────────────────────────────────

interface DateColumnOptions {
  accessorKey: string;
  header: string;
  /** Render time alongside the date. */
  withTime?: boolean;
  /** Shown when the value is missing or unparseable. */
  fallback?: string;
  [key: string]: unknown;
}

/**
 * A date column that sorts chronologically and renders through the company date
 * SSOT (`formatDate` → `YYYY.MM.DD`).
 *
 * Display is derived from the parsed timestamp, not the raw string, so a page
 * that still pre-formats its rows renders correctly either way — but prefer
 * putting the raw wire value in the row and letting this format it.
 */
export const dateColumn = ({
  accessorKey,
  header,
  withTime = false,
  fallback = "N/A",
  ...rest
}: DateColumnOptions) => ({
  accessorKey,
  header,
  sortingFn: dateSortingFn,
  Cell: ({ cell }: any) => {
    const time = toSortableTime(cell.getValue());
    if (!time) return fallback;
    return withTime ? formatDateTime(time) : formatDate(time);
  },
  ...rest,
});

interface ActionsColumnOptions {
  /** Row action buttons. */
  Cell: (props: any) => React.ReactNode;
  header?: string;
  size?: number;
  [key: string]: unknown;
}

/**
 * A row-actions column. Sorting, the column-actions menu and hiding are all off
 * — there is no row field behind it, so every one of those controls was a no-op
 * that still rendered a ⇅ affordance in the header.
 *
 * Keeps the id "actions": `MaterialTable` already excludes that id from search
 * and from CSV/Excel export, and it matches the preference key pages already
 * persist, so saved layouts carry over.
 */
export const actionsColumn = ({
  Cell,
  header = "Actions",
  size = 120,
  ...rest
}: ActionsColumnOptions) => ({
  id: "actions",
  header,
  size,
  enableSorting: false,
  enableColumnActions: false,
  enableHiding: false,
  ...rest,
  Cell,
});

interface EmployeeColumnOptions<T = any> {
  /** Display name. Required — everything else is optional. */
  name: (row: T) => string;
  code?: (row: T) => string | null | undefined;
  avatarUrl?: (row: T) => string | null | undefined;
  /** Second line, e.g. designation · department. */
  subtitle?: (row: T) => string | null | undefined;
  status?: (row: T) => "active" | "inactive" | null | undefined;
  /** Makes the cell a real link (keyboard-focusable, middle-clickable). */
  href?: (row: T) => string;
  id?: string;
  header?: string;
  size?: number;
  dense?: boolean;
  [key: string]: unknown;
}

/**
 * The employee identity column — one presentation of "who this row is",
 * everywhere. Wraps `EmployeeIdentityCell`, which owns the visual treatment.
 *
 * Defined with `id` + `accessorFn` (not accessorKey) because the displayed
 * identity is composed from several fields. `MaterialTable` resolves id-only
 * columns for the search dropdown, the "All Columns" row text and exports, so
 * the composed text stays searchable and exportable.
 */
export const employeeColumn = <T,>({
  name,
  code,
  avatarUrl,
  subtitle,
  status,
  href,
  id = "employee",
  header = "Employee",
  size = 240,
  dense = false,
  ...rest
}: EmployeeColumnOptions<T>) => ({
  id,
  header,
  size,
  // Drives sorting, search and export — keep it to the text a user would type.
  accessorFn: (row: T) =>
    [name(row), code?.(row), subtitle?.(row)].filter(Boolean).join(" "),
  Cell: ({ row }: any) => {
    const data = row.original as T;
    const cell = (
      <EmployeeIdentityCell
        name={name(data)}
        code={code?.(data)}
        avatarUrl={avatarUrl?.(data)}
        subtitle={subtitle?.(data)}
        status={status?.(data)}
        dense={dense}
      />
    );
    // A real anchor, not a click handler on a div/button — focusable, and
    // open-in-new-tab works.
    return href ? (
      <Link to={href(data)} className="text-inherit no-underline">
        {cell}
      </Link>
    ) : (
      cell
    );
  },
  ...rest,
});
