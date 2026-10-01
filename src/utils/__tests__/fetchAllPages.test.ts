import { describe, it, expect, vi } from "vitest";
import { fetchAllPages, MAX_EXPORT_ROWS } from "../fetchAllPages";

/** A fake list endpoint over `total` numbered rows. */
const endpoint = (total: number) =>
  vi.fn(async (page: number, pageSize: number) => ({
    rows: Array.from({ length: Math.max(0, Math.min(pageSize, total - (page - 1) * pageSize)) }, (_, i) => (page - 1) * pageSize + i),
    total,
  }));

describe("fetchAllPages", () => {
  it("returns every row, in order, across pages", async () => {
    const fetchPage = endpoint(2500);
    const rows = await fetchAllPages(fetchPage, 1000);
    expect(rows).toHaveLength(2500);
    expect(rows[0]).toBe(0);
    expect(rows[2499]).toBe(2499);
    expect(fetchPage).toHaveBeenCalledTimes(3);
  });

  it("an empty result is one request and no rows", async () => {
    const fetchPage = endpoint(0);
    expect(await fetchAllPages(fetchPage)).toEqual([]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it("refuses an over-limit export after the first page, with a message for the reader", async () => {
    const fetchPage = endpoint(MAX_EXPORT_ROWS + 1);
    await expect(fetchAllPages(fetchPage)).rejects.toMatchObject({ userMessage: expect.stringMatching(/Narrow the filters/) });
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });
});
