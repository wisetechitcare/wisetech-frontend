import React, { useEffect, useMemo, useState } from "react";
import { useFormikContext } from "formik";
import { KTIcon } from "@metronic/helpers";
import { getAllPaymentPlans } from "@services/paymentPlan";
import type { PaymentPlan } from "@models/leads";
import { filterPlansForLead } from "./paymentPlanScope";
import { getCurrencySymbol, getCurrencyLocale } from '@utils/currency';
import PaymentPlanStagesTree from "@app/pages/employee/leads/configuration/components/PaymentPlanStagesTree";
import { pct, toPlanStage, type PlanStage } from "@app/pages/employee/leads/configuration/components/paymentPlanStages";
import { WtButton } from "@app/modules/common/components/ui";

/**
 * Lead commercial step — payment stage break-up.
 *
 * The user picks a Payment Plan (configured under Lead Configuration → Payment Plans); its
 * stages are COPIED into `values.paymentStages`, which this lead then edits freely — add,
 * delete, rename, re-split — with the same editor the plan uses. The plan is only a starting
 * point: editing the plan later never reaches this lead. Amounts are derived live as
 * (percentage / 100) * total commercial cost, the last stage absorbing the rounding remainder.
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

  // Only the plans for the project types this lead is. See `filterPlansForLead` for why an
  // un-typed plan and a lead with no categories both widen the list rather than emptying it.
  const scopedPlans = useMemo(
    () => filterPlansForLead(plans, values.categoryIds, values.subcategoryIds),
    [plans, values.categoryIds, values.subcategoryIds],
  );

  // Merge the lead's currently-selected plan (carried on edit) into the options so a
  // plan that was archived — or scoped to a type this lead is no longer — still renders
  // instead of vanishing and silently blanking a saved selection.
  const options = useMemo(() => {
    const merged = [...scopedPlans];
    const carried: PaymentPlan | null = values.paymentPlan || null;
    if (carried?.id && !merged.some((p) => p.id === carried.id)) {
      merged.unshift(carried);
    }
    return merged;
  }, [scopedPlans, values.paymentPlan]);

  const selectedPlan = useMemo(
    () => options.find((p) => p.id === values.paymentPlanId) || null,
    [options, values.paymentPlanId],
  );

  // Two decimals, no symbol — the column beside it carries the symbol. Named for the
  // amount because `formatCurrency` is the shared formatter's name in @utils/currency, and
  // a local shadow of a global helper is how one screen ends up with two answers.
  const formatAmount = (val: number) =>
    val.toLocaleString(getCurrencyLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const planStages = (plan: PaymentPlan | null): PlanStage[] =>
    [...(plan?.stages || [])]
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((s) => toPlanStage(s.name, s.percentage, s.id));

  const stages: PlanStage[] = values.paymentStages || [];
  const setStages = (next: PlanStage[] | null) => setFieldValue("paymentStages", next);

  // A lead saved before per-lead stages existed has a plan but no copy: seed it from the plan
  // so it opens editable showing exactly what it showed before.
  useEffect(() => {
    if (selectedPlan && values.paymentStages == null) setStages(planStages(selectedPlan));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlan, values.paymentStages]);

  // Compute each stage's amount, letting the final stage take the rounding remainder
  // so the amounts add up to totalCost to the paisa.
  const computed = useMemo(() => {
    let allocated = 0;
    return stages.map((s, i) => {
      const percentage = pct(s.percentage);
      let amount: number;
      if (i === stages.length - 1) {
        amount = Math.round((totalCost - allocated) * 100) / 100;
      } else {
        amount = Math.round((percentage / 100) * totalCost * 100) / 100;
        allocated += amount;
      }
      return { uid: s.uid, name: s.name, percentage, amount };
    });
  }, [stages, totalCost]);

  // Reset only means something once the lead has drifted from its plan.
  const isEdited = useMemo(() => {
    if (!selectedPlan) return false;
    const plan = planStages(selectedPlan);
    return (
      plan.length !== stages.length ||
      plan.some((p, i) => p.name !== stages[i].name || pct(p.percentage) !== pct(stages[i].percentage))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlan, stages]);

  const handleSelect = (id: string) => {
    setFieldValue("paymentPlanId", id);
    const plan = options.find((p) => p.id === id) || null;
    // Carry the full plan so the breakdown renders immediately and survives archival.
    setFieldValue("paymentPlan", plan);
    // A new plan replaces the lead's stages with its own; no plan clears them.
    setStages(plan ? planStages(plan) : null);
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
            <span className="text-primary fs-5 fw-bolder">{getCurrencySymbol()} {formatAmount(totalCost)}</span>
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
        <div className="mt-4">
          {/* The plan editor's own tree, minus deliverables (those are project config). No
              numbering picker: the Sr No follows the plan's format (or the default). */}
          <PaymentPlanStagesTree
            stages={stages}
            onChange={setStages}
            showDeliverables={false}
            stageNumberingFormatId={selectedPlan.stageNumberingFormatId ?? ""}
            amounts={totalCost > 0 ? computed.map((r) => `${getCurrencySymbol()} ${formatAmount(r.amount)}`) : undefined}
            headerAction={
              isEdited && (
                <WtButton
                  tone="primary" size="small" ghost
                  onClick={() => setStages(planStages(selectedPlan))}
                  startIcon={<KTIcon iconName="arrows-circle" className="fs-6" />}
                  sx={{ flexShrink: 0, minHeight: 32, fontSize: 12.5, borderRadius: "9px" }}
                >
                  Reset to plan
                </WtButton>
              )
            }
          />
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
