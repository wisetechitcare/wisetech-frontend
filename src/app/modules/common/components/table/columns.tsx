/**
 * Shared column factories for kit `DataTable` — the only table in the app.
 *
 * Without these, pages reintroduce the same defects:
 *   1. Dates pre-formatted into the row sorted alphanumerically.
 *   2. Action columns exposing sort over a non-field id.
 *   3. Rival employee-identity cells.
 *
 * Build columns from these factories instead of by hand. Each takes the raw row
 * value — never pre-format a date into the row data.
 */

import { Link } from "react-router-dom";
import { formatDate, formatDateTime } from "@utils/dateFormats";
import EmployeeIdentityCell from "@app/modules/common/components/EmployeeIdentityCell";
import { dateSortingFn, toSortableTime } from "./dateSort";

export { dateSortingFn, toSortableTime } from "./dateSort";

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
 */
export const dateColumn = ({
  accessorKey,
  header,
  withTime = false,
  fallback = "N/A",
  ...rest
}: DateColumnOptions) => {
  const render = ({ cell }: any) => {
    const time = toSortableTime(cell.getValue());
    if (!time) return fallback;
    return withTime ? formatDateTime(time) : formatDate(time);
  };
  return {
    accessorKey,
    header,
    sortFn: dateSortingFn,
    cell: render,
    ...rest,
  };
};

interface ActionsColumnOptions {
  /** Row action buttons (`cell` for kit DataTable). */
  cell?: (props: any) => React.ReactNode;
  header?: string;
  size?: number;
  [key: string]: unknown;
}

/**
 * A row-actions column. Sorting and hiding are off — there is no row field behind it.
 * Id stays `"actions"` so export/search skip it and preference keys stay stable.
 */
export const actionsColumn = ({
  cell,
  header = "Actions",
  size = 120,
  ...rest
}: ActionsColumnOptions) => {
  return {
    id: "actions",
    header,
    size,
    enableSorting: false,
    enableHiding: false,
    ...rest,
    meta: {
      label: header,
      pin: "end" as const,
      ...(typeof rest.meta === "object" && rest.meta ? rest.meta : {}),
    },
    ...(cell ? { cell } : {}),
  };
};

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
 * The employee identity column — one presentation of "who this row is".
 * Uses `id` + `accessorFn` so search, sort and export see the composed text.
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
}: EmployeeColumnOptions<T>) => {
  const render = ({ row }: any) => {
    const data = row.original as T;
    const identity = (
      <EmployeeIdentityCell
        name={name(data)}
        code={code?.(data)}
        avatarUrl={avatarUrl?.(data)}
        subtitle={subtitle?.(data)}
        status={status?.(data)}
        dense={dense}
      />
    );
    return href ? (
      <Link to={href(data)} className="text-inherit no-underline">
        {identity}
      </Link>
    ) : (
      identity
    );
  };
  return {
    id,
    header,
    size,
    accessorFn: (row: T) =>
      [name(row), code?.(row), subtitle?.(row)].filter(Boolean).join(" "),
    cell: render,
    ...rest,
    meta: {
      label: typeof header === "string" ? header : "Employee",
      pin: "start" as const,
      ...(typeof rest.meta === "object" && rest.meta ? rest.meta : {}),
    },
  };
};
