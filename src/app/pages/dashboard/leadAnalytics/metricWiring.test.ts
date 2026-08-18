import { describe, it, expect } from "vitest";
import { applyMetric, toRanked } from "./leadAnalyticsUtils";
import { convertToChartData } from "@utils/leadsProjectCompaniesStatistics";

/**
 * The Amount toggle only works if every hop keeps the money: the API row carries
 * a budget → convertToChartData maps it to `totalCost` → applyMetric promotes it
 * to `value`. The Cancellation Reasons chart used to pass "" as the budget key,
 * so Amount silently plotted zeros — these lock that chain down.
 */
describe("count/amount metric wiring", () => {
  // Shape returned by /lead-analytics/cancellation-reason (value + budget).
  const cancellationApi = [
    { name: "High Cost", value: 539, budget: 5_000_000, color: "#333" },
    { name: "Project on Hold", value: 5, budget: 250_000, color: "#666" },
  ];

  it("carries budget from the API row through to the plotted value", () => {
    const chartData = convertToChartData(cancellationApi, "value", "name", "budget");
    expect(chartData.map((d) => d.totalCost)).toEqual([5_000_000, 250_000]);

    const amount = applyMetric(chartData, "amount");
    expect(amount.map((d) => d.value)).toEqual([5_000_000, 250_000]);
    // The count survives for the tooltip / volume sort.
    expect(amount.map((d) => d.volumeValue)).toEqual([539, 5]);
  });

  it("leaves count mode untouched", () => {
    const chartData = convertToChartData(cancellationApi, "value", "name", "budget");
    expect(applyMetric(chartData, "count")).toBe(chartData);
  });

  it("re-ranks by money, so the volume leader can lose the value lead", () => {
    // Many cheap leads vs few expensive ones — the shares must flip with the metric.
    const rows = convertToChartData(
      [
        { name: "Cheap Source", value: 100, budget: 100_000 },
        { name: "Rich Source", value: 4, budget: 900_000 },
      ],
      "value",
      "name",
      "budget"
    );

    expect(toRanked(applyMetric(rows, "count"))[0].label).toBe("Cheap Source");
    expect(toRanked(applyMetric(rows, "amount"))[0].label).toBe("Rich Source");
    expect(toRanked(applyMetric(rows, "amount"))[0].share).toBe(90);
  });

  it("keeps the drill-down id when switching to amount", () => {
    const rows = convertToChartData(
      [{ id: "company-7", name: "Acme", value: 3, budget: 42 }],
      "value",
      "name",
      "budget"
    );
    expect(applyMetric(rows, "amount")[0].id).toBe("company-7");
  });
});
