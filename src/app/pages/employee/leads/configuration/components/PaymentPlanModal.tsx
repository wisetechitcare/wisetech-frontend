import React, { useState, useEffect } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import PaymentPlanStagesTree from "./PaymentPlanStagesTree";
import PlanScopePicker from "./PlanScopePicker";
import { settlePercentages, toPlanStage, type PlanStage } from "./paymentPlanStages";
import { createPaymentPlan, updatePaymentPlan } from "@services/paymentPlan";
import { showSuccess, showError } from "@utils/modal";
import { EVENT_KEYS } from "@constants/eventKeys";
import eventBus from "@utils/EventBus";
import type { PaymentPlan, PaymentPlanStage } from "@models/leads";
import {
  CategoryLike,
  SubCategoryLike,
  buildCategoryNodes,
  scopeFromNodeId,
} from "@utils/categoryScope";
import { getPresetPath, PATH_SEPARATOR } from "@utils/presetTaskHierarchy";

interface PaymentPlanModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: PaymentPlan | null;
  isEditing?: boolean;
  // The project-category tree, supplied by the page that already loaded it so the picker
  // opens populated instead of racing its own fetch.
  categories?: CategoryLike[];
  subCategories?: SubCategoryLike[];
  /**
   * Every plan, so the picker can grey out a project type another plan already bills and say
   * which plan holds it. The plan being edited is ignored when working that out.
   */
  plans?: PaymentPlan[];
  /**
   * Whether a stage can be opened to add, edit or remove its deliverables. Deliverables are
   * task configuration, so only Tasks → Configure turns this on; the Leads and Projects
   * configure pages edit the fee split and nothing more.
   */
  deliverablesEditable?: boolean;
}

// A sensible starter matching the common "stage-wise break-up of fee" (sums to 100).
const DEFAULT_STAGES: { name: string; percentage: number }[] = [
  { name: "Design Concept", percentage: 20 },
  { name: "Design Detailing", percentage: 20 },
  { name: "Tendering", percentage: 20 },
  { name: "Procurement, Installation & Commissioning (Part-1)", percentage: 5 },
  { name: "Procurement, Installation & Commissioning (Part-2)", percentage: 5 },
];

const PaymentPlanModal: React.FC<PaymentPlanModalProps> = ({
  show,
  onClose,
  onSuccess,
  initialData,
  isEditing = false,
  categories = [],
  subCategories = [],
  plans = [],
  deliverablesEditable = false,
}) => {
  const [description, setDescription] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  // The picked project types: each a category id (the whole category) or a subcategory id. Split
  // back into (categoryId, subCategoryId) pairs on save.
  const [scopeNodeIds, setScopeNodeIds] = useState<string[]>([]);
  const [rows, setRows] = useState<PlanStage[]>([]);
  /** How this plan's stages print their Sr No. "" = the default format. */
  const [stageNumberingFormatId, setStageNumberingFormatId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset the form whenever the modal opens (new vs edit).
  useEffect(() => {
    if (!show) return;
    setError(null);
    if (isEditing && initialData) {
      setDescription(initialData.description || "");
      setIsDefault(!!initialData.isDefault);
      setScopeNodeIds((initialData.scopes ?? []).map((s) => s.subCategoryId || s.categoryId));
      setStageNumberingFormatId(initialData.stageNumberingFormatId ?? "");
      setRows(
        (initialData.stages || [])
          .slice()
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
          .map((s) => toPlanStage(s.name, s.percentage, s.id, s._count?.deliverables)),
      );
    } else {
      setDescription("");
      setIsDefault(false);
      setScopeNodeIds([]);
      setStageNumberingFormatId("");
      setRows(DEFAULT_STAGES.map((s) => toPlanStage(s.name, s.percentage)));
    }
  }, [show, isEditing, initialData]);

  const categoryNodes = React.useMemo(
    () => buildCategoryNodes(categories, subCategories),
    [categories, subCategories],
  );
  /** "Bungalow & Duplex → Bungalow (SINGLE)" — so the type being billed is unambiguous. */
  const pathOf = (nodeId: string) => getPresetPath(categoryNodes, nodeId).join(PATH_SEPARATOR);

  /**
   * Project type → the plan that already bills it. A type can belong to only one plan, so these
   * are greyed out in the picker. The plan being edited does not count against itself.
   */
  const takenBy = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const plan of plans) {
      if (!plan.id || plan.id === initialData?.id || plan.isActive === false) continue;
      for (const s of plan.scopes ?? []) map.set(s.subCategoryId || s.categoryId, plan.name || "another plan");
    }
    return map;
  }, [plans, initialData?.id]);
  const claimedIds = scopeNodeIds.filter((id) => takenBy.has(id));

  const hasEmptyName = rows.some((r) => !r.name.trim());
  const canSave = scopeNodeIds.length > 0 && claimedIds.length === 0 && rows.length > 0 && !hasEmptyName;

  const handleSave = async () => {
    setError(null);

    if (scopeNodeIds.length === 0) {
      setError("Pick the project category this plan bills.");
      return;
    }
    // The picker already blocks these; this covers a plan saved elsewhere since it opened.
    if (claimedIds.length) {
      const lines = claimedIds.map((id) => `${pathOf(id)} is already in “${takenBy.get(id)}”`);
      setError(`${lines.join("; ")}. A project type can belong to only one payment plan — remove ${claimedIds.length === 1 ? "it" : "them"} to save.`);
      return;
    }
    if (rows.length === 0) {
      setError("Add at least one payment stage.");
      return;
    }
    if (hasEmptyName) {
      setError("Every stage needs a name.");
      return;
    }

    // Percentages are no longer entered, but billing still splits by them — see settlePercentages.
    const split = settlePercentages(rows);
    const stages: PaymentPlanStage[] = rows.map((r, idx) => ({
      ...(r.id ? { id: r.id } : {}),
      name: r.name.trim(),
      percentage: split[idx],
      sortOrder: idx,
    }));

    // Each picked node → the pair the API stores. The server re-checks that every subcategory
    // belongs to its category, so a stale tree here cannot file a plan under two branches.
    const scopes = scopeNodeIds
      .map((id) => scopeFromNodeId(id, subCategories))
      .filter((s): s is NonNullable<typeof s> => !!s)
      .map((s) => ({ categoryId: s.categoryId, subCategoryId: s.subCategoryId }));

    const payload: PaymentPlan = {
      // No `name`: a plan IS the fee split for a project type, so the server names it from
      // the category. Sending one here would be a second source for the same label.
      description: description.trim() || null,
      isDefault,
      isActive: true,
      stages,
      scopes,
      // Explicit null clears it; the server treats absent as "leave alone", so always send.
      stageNumberingFormatId: stageNumberingFormatId || null,
    };

    setIsSubmitting(true);
    try {
      if (isEditing && initialData?.id) {
        await updatePaymentPlan(initialData.id, payload);
        showSuccess("Success", "Payment plan updated successfully.");
        eventBus.emit(EVENT_KEYS.paymentPlanUpdated, { id: initialData.id });
      } else {
        const res = await createPaymentPlan(payload);
        showSuccess("Success", "Payment plan created successfully.");
        eventBus.emit(EVENT_KEYS.paymentPlanCreated, { id: res?.paymentPlan?.id || "created" });
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          `Failed to ${isEditing ? "update" : "create"} the payment plan.`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!show) return null;

  return (
    // enforceFocus={false}: the deliverable editor opens a MUI dialog, which portals to
    // document.body — outside this modal's DOM. Bootstrap's focus trap would otherwise
    // steal focus back on every click/keystroke, making those inputs untypable.
    <Modal show={show} onHide={onClose} centered size="lg" scrollable enforceFocus={false}>
      <Modal.Header closeButton style={{ borderBottom: "none", paddingBottom: 8 }}>
        <Modal.Title style={{ fontWeight: 600, fontSize: 18, color: "#1a1a1a" }}>
          {isEditing ? "Edit" : "New"} Payment Plan
        </Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ paddingTop: 16 }}>
        {error && <div className="alert alert-danger mb-4">{error}</div>}

        <div className="row g-4 mb-2">
          {/* The project type this plan bills. A lead already declares its category, so before
              this the two were unrelated and plans were named after types by hand ("Bungalow",
              "Interior Project") with nothing stopping the wrong one being chosen.
              The whole category and any single subcategory are both selectable — a grouped
              select cannot select its own group heading. */}
          <div className="col-12">
            <Form.Label className="fw-semibold text-gray-800 fs-7 mb-2">
              Project Categories <span className="text-danger">*</span>
            </Form.Label>
            <div className="d-flex flex-column flex-md-row align-items-md-center gap-4">
              <div className="flex-grow-1">
                <PlanScopePicker
                  categories={categories}
                  subCategories={subCategories}
                  value={scopeNodeIds}
                  onChange={setScopeNodeIds}
                  takenBy={takenBy}
                  hasError={claimedIds.length > 0}
                />
              </div>
              <div className="d-flex align-items-center">
                <Form.Check
                  type="checkbox"
                  id="paymentPlanIsDefault"
                  label="Set as default plan"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="fw-semibold text-gray-700 mb-0"
                />
              </div>
            </div>
            <div className="text-muted mt-2" style={{ fontSize: 12 }}>
              {scopeNodeIds.length
                ? `This is the fee split for ${scopeNodeIds.map(pathOf).join("; ")}.`
                : "Pick one or more categories — a whole category, or just a subcategory. A project type can be in only one plan."}
            </div>
          </div>
          <div className="col-12">
            <Form.Label className="fw-semibold text-gray-800 fs-7 mb-2">
              Description
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              className="form-control-solid"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional — a short note about when to use this plan"
            />
          </div>
        </div>

        <div className="separator separator-dashed my-5" />

        {/* One tree: a stage row IS the branch its deliverables hang off. Stage edits are
            form state and save with this modal; deliverables save on every action, because
            they belong to a stage row that already exists on the server. */}
        <PaymentPlanStagesTree
          stages={rows}
          onChange={setRows}
          showDeliverables={deliverablesEditable}
          stageNumberingFormatId={stageNumberingFormatId}
          onStageNumberingFormatChange={setStageNumberingFormatId}
        />
      </Modal.Body>

      <Modal.Footer style={{ borderTop: "none" }}>
        <Button variant="light" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={isSubmitting || !canSave}
          style={{ backgroundColor: "#1E3A8A", border: "none" }}
        >
          {isSubmitting ? "Saving..." : isEditing ? "Update Plan" : "Save Plan"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default PaymentPlanModal;
