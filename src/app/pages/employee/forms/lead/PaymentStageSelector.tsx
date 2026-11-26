import React, { useEffect, useMemo, useState } from "react";
import { useFormikContext } from "formik";
import { RotateCcw } from "lucide-react";
import { getAllPaymentPlans } from "@services/paymentPlan";
import type { PaymentPlan } from "@models/leads";
import { filterPlansForLead } from "./paymentPlanScope";
import { getCurrencySymbol, getCurrencyLocale } from '@utils/currency';
import PaymentPlanStagesTree from "@app/pages/employee/leads/configuration/components/PaymentPlanStagesTree";
import { pct, toPlanStage, type PlanStage } from "@app/pages/employee/leads/configuration/components/paymentPlanStages";
import { Button } from "@/ds/ui/button";
import { EmptyState } from "@/ds/patterns/empty-state";
import { Field, FieldLabel } from "@/ds/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ds/ui/select";

/** Select has no empty value, so "no plan" is this sentinel. */
const NONE = "__none__";

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

  const handleSelect = (picked: string) => {
    const id = picked === NONE ? "" : picked;
    setFieldValue("paymentPlanId", id);
    const plan = options.find((p) => p.id === id) || null;
    // Carry the full plan so the breakdown renders immediately and survives archival.
    setFieldValue("paymentPlan", plan);
    // A new plan replaces the lead's stages with its own; no plan clears them.
    setStages(plan ? planStages(plan) : null);
  };

  const planItems = [
    { value: NONE, label: "— No payment plan —" },
    ...options.map((p) => ({ value: p.id, label: `${p.name}${p.isDefault ? " (Default)" : ""}` })),
  ];

  return (
    <div data-slot="payment-stage-selector" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <Field className="min-w-60 flex-1 md:max-w-xl">
          <FieldLabel>Payment Plan</FieldLabel>
          <Select
            items={planItems}
            value={values.paymentPlanId || NONE}
            onValueChange={(v) => handleSelect(String(v))}
            disabled={loading && plans.length === 0}
          >
            <SelectTrigger className="w-full" aria-label="Payment Plan">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {planItems.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <dl className="m-0 flex flex-col items-end">
          <dt className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">Total Commercial Cost</dt>
          <dd className="m-0 text-lg font-bold text-primary tabular-nums">{getCurrencySymbol()} {formatAmount(totalCost)}</dd>
        </dl>
      </div>

      {plans.length === 0 && !loading && (
        <EmptyState
          size="sm"
          title="No payment plans yet"
          description="Create one under Lead Configuration → Payment Plans."
        />
      )}

      {selectedPlan && (
        <div>
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
                <Button type="button" variant="outline" size="sm" onClick={() => setStages(planStages(selectedPlan))}>
                  <RotateCcw data-icon="inline-start" />
                  Reset to plan
                </Button>
              )
            }
          />
          {totalCost === 0 && (
            <p className="m-0 mt-2 text-xs text-muted-foreground">
              Add work-area rows above to see the amounts split across the stages.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default PaymentStageSelector;
