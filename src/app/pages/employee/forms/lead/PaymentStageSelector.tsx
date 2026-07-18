import React, { useEffect, useMemo, useState } from "react";
import { useFormikContext } from "formik";
import { Table } from "react-bootstrap";
import { getAllPaymentPlans } from "@services/paymentPlan";
import type { PaymentPlan } from "@models/leads";

/**
 * Lead commercial step — payment stage break-up.
 *
 * The user picks a Payment Plan (configured under Lead Configuration → Payment Plans).
 * Each stage's amount is derived live as (percentage / 100) * total commercial cost.
 * Amounts are read-only; the last stage absorbs any rounding remainder so the column
 * always sums to exactly the commercial total. Only the selected `paymentPlanId` is
 * persisted on the lead — the breakdown is recomputed on load, never stored stale.
 */
export const PaymentStageSelector: React.FC = () => {
  const { values, setFieldValue } = useFormikContext<any>();
  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await getAllPaymentPlans();
        if (!cancelled && res?.paymentPlans) setPlans(res.paymentPlans);
      } catch {
        /* non-blocking: the section just shows the empty/hint state */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Total commercial cost = sum of the work-area rows' cost (same basis as the grid's
  // Grand Total; `cost` holds the value for both Rate and Lumpsum rows).
  const totalCost = useMemo(
    () =>
      (values.projectAreas || []).reduce(
        (sum: number, a: any) => sum + (parseFloat(a?.cost) || 0),
        0,
      ),
    [values.projectAreas],
  );

  // Merge the lead's currently-selected plan (carried on edit) into the options so a
  // plan that was archived after selection still renders instead of vanishing.
  const options = useMemo(() => {
    const merged = [...plans];
    const carried: PaymentPlan | null = values.paymentPlan || null;
    if (carried?.id && !merged.some((p) => p.id === carried.id)) {
      merged.unshift(carried);
    }
    return merged;
  }, [plans, values.paymentPlan]);

  const selectedPlan = useMemo(
    () => options.find((p) => p.id === values.paymentPlanId) || null,
    [options, values.paymentPlanId],
  );

  const formatCurrency = (val: number) =>
    val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Compute each stage's amount, letting the final stage take the rounding remainder
  // so the amounts add up to totalCost to the paisa.
  const computed = useMemo(() => {
    if (!selectedPlan) return [] as { name: string; percentage: number; amount: number }[];
    const stages = [...(selectedPlan.stages || [])].sort(
      (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
    );
    let allocated = 0;
    return stages.map((s, i) => {
      const pct = parseFloat(String(s.percentage)) || 0;
      let amount: number;
      if (i === stages.length - 1) {
        amount = Math.round((totalCost - allocated) * 100) / 100;
      } else {
        amount = Math.round((pct / 100) * totalCost * 100) / 100;
        allocated += amount;
      }
      return { name: s.name, percentage: pct, amount };
    });
  }, [selectedPlan, totalCost]);

  const totalPct = computed.reduce((s, r) => s + r.percentage, 0);
  const roundedPct = Math.round(totalPct * 1000) / 1000;

  const handleSelect = (id: string) => {
    setFieldValue("paymentPlanId", id);
    const plan = options.find((p) => p.id === id) || null;
    // Carry the full plan so the breakdown renders immediately and survives archival.
    setFieldValue("paymentPlan", plan);
  };

  return (
    <div>
      <div className="row g-3 align-items-end mb-2">
        <div className="col-md-7">
          <label className="form-label fw-semibold text-gray-800 fs-7 mb-2">
            Payment Plan
          </label>
          <select
            className="form-select form-select-solid"
            value={values.paymentPlanId || ""}
            onChange={(e) => handleSelect(e.target.value)}
            disabled={loading && plans.length === 0}
          >
            <option value="">— No payment plan —</option>
            {options.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.isDefault ? " (Default)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-5">
          <div className="d-flex flex-column align-items-md-end">
            <span className="text-gray-600 fs-8 fw-bold text-uppercase">Total Commercial Cost</span>
            <span className="text-primary fs-5 fw-bolder">₹ {formatCurrency(totalCost)}</span>
          </div>
        </div>
      </div>

      {plans.length === 0 && !loading && (
        <div className="text-muted fs-7 text-center py-4 border border-dashed rounded mt-3">
          No payment plans configured yet. Create one under{" "}
          <span className="fw-semibold">Lead Configuration → Payment Plans</span>.
        </div>
      )}

      {selectedPlan && (
        <div className="table-responsive mt-3">
          <Table bordered size="sm" className="bg-white align-middle gs-0 gy-2 mb-0">
            <thead className="bg-light">
              <tr className="fw-bolder text-muted fs-8 text-uppercase border-bottom border-gray-200">
                <th className="ps-3 w-40px">Sr</th>
                <th className="min-w-150px">Stage / Particulars</th>
                <th className="w-90px text-center">%</th>
                <th className="min-w-120px text-end pe-3">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {computed.map((row, idx) => (
                <tr key={idx}>
                  <td className="ps-3 fw-bold text-gray-600">{idx + 1}</td>
                  <td className="fw-semibold text-gray-800">{row.name}</td>
                  <td className="text-center fw-bold text-gray-700">{row.percentage}%</td>
                  <td className="text-end pe-3 fw-bolder text-dark">{formatCurrency(row.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-light-primary fw-bolder border-top border-gray-300">
                <td colSpan={2} className="text-end pe-3 text-gray-800">Total</td>
                <td className="text-center text-primary">{roundedPct}%</td>
                <td className="text-end pe-3 text-primary">₹ {formatCurrency(totalCost)}</td>
              </tr>
            </tfoot>
          </Table>
          {totalCost === 0 && (
            <div className="text-muted fs-8 mt-2">
              Add work-area rows above to see the amounts split across the stages.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PaymentStageSelector;
