/**
 * The most rows an export will fetch into the browser. Past this the request count, the memory
 * and the spreadsheet build all stop being reasonable for a tab — and nobody reads a 200k-row
 * sheet; they narrow the filters first.
 *
 * ponytail: a hard ceiling, not a solution — beyond it the export belongs on the server,
 * streamed to a file, which no screen needs yet.
 */
export const MAX_EXPORT_ROWS = 50_000;

/**
 * Every row of a server-paginated list, fetched page by page — for an export, which has to
 * hold every row matching the current filters while the table holds one page.
 *
 * The first page reports the total; the rest are fetched together. 1000 is the largest page
 * the CRM list endpoints serve. Refuses, before fetching anything more, a result larger than
 * MAX_EXPORT_ROWS — with a `userMessage` the export button shows as is.
 */
export const fetchAllPages = async <T>(
  fetchPage: (page: number, pageSize: number) => Promise<{ rows: T[]; total: number }>,
  pageSize = 1000,
): Promise<T[]> => {
  const first = await fetchPage(1, pageSize);
  if (first.total > MAX_EXPORT_ROWS) {
    const userMessage =
      `${first.total.toLocaleString("en-IN")} rows match — exports are limited to ` +
      `${MAX_EXPORT_ROWS.toLocaleString("en-IN")}. Narrow the filters or search, then export again.`;
    throw Object.assign(new Error(userMessage), { userMessage });
  }
  const pages = Math.ceil(first.total / pageSize);
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, pages - 1) }, (_, i) => fetchPage(i + 2, pageSize)),
  );
  return [first, ...rest].flatMap((p) => p.rows);
};
