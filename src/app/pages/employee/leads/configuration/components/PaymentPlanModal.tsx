import React, { useState, useEffect } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import PaymentPlanStagesTree from "./PaymentPlanStagesTree";
import { pct, stageTotal, toPlanStage, type PlanStage } from "./paymentPlanStages";
import { createPaymentPlan, updatePaymentPlan } from "@services/paymentPlan";
import { showSuccess, showError } from "@utils/modal";
import { EVENT_KEYS } from "@constants/eventKeys";
import eventBus from "@utils/EventBus";
import type { PaymentPlan, PaymentPlanStage } from "@models/leads";
import { HierarchicalTaskPicker, buildTaskOptions } from "@app/pages/employee/tasks/components/HierarchicalTaskSelect";
import {
  CategoryLike,
  SubCategoryLike,
  buildCategoryNodes,
  nodeIdFromScope,
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
}

// A sensible starter matching the common "stage-wise break-up of fee" (sums to 100).
const DEFAULT_STAGES: { name: string; percentage: number }[] = [
  { name: "Advance (To be paid along with the Work Order)", percentage: 30 },
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
}) => {
  const [description, setDescription] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  // The picked category OR subcategory node. One field, because the picker returns one id;
  // it is split back into the (categoryId, subCategoryId) pair on save.
  const [scopeNodeId, setScopeNodeId] = useState("");
  const [rows, setRows] = useState<PlanStage[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset the form whenever the modal opens (new vs edit).
  useEffect(() => {
    if (!show) return;
    setError(null);
    if (isEditing && initialData) {
      setDescription(initialData.description || "");
      setIsDefault(!!initialData.isDefault);
      setScopeNodeId(nodeIdFromScope(initialData));
      setRows(
        (initialData.stages || [])
          .slice()
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
          .map((s) => toPlanStage(s.name, s.percentage, s.id)),
      );
    } else {
      setDescription("");
      setIsDefault(false);
      setScopeNodeId("");
      setRows(DEFAULT_STAGES.map((s) => toPlanStage(s.name, s.percentage)));
    }
  }, [show, isEditing, initialData]);

  const categoryNodes = React.useMemo(
    () => buildCategoryNodes(categories, subCategories),
    [categories, subCategories],
  );
  const categoryOptions = React.useMemo(() => buildTaskOptions(categoryNodes), [categoryNodes]);
  /** "Bungalow & Duplex → Bungalow (SINGLE)" — so the type being billed is unambiguous. */
  const scopePath = scopeNodeId ? getPresetPath(categoryNodes, scopeNodeId).join(PATH_SEPARATOR) : "";

  const roundedTotal = stageTotal(rows);
  const hasNegative = rows.some((r) => pct(r.percentage) < 0);
  const hasEmptyName = rows.some((r) => !r.name.trim());
  const isTotalValid = roundedTotal === 100;
  const canSave =
    !!scopeNodeId && rows.length > 0 && isTotalValid && !hasNegative && !hasEmptyName;

  const handleSave = async () => {
    setError(null);

    if (!scopeNodeId) {
      setError("Pick the project category this plan bills.");
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
    if (hasNegative) {
      setError("Stage percentages cannot be negative.");
      return;
    }
    if (!isTotalValid) {
      setError(`Stage percentages must total exactly 100% (currently ${roundedTotal}%).`);
      return;
    }

    const stages: PaymentPlanStage[] = rows.map((r, idx) => ({
      ...(r.id ? { id: r.id } : {}),
      name: r.name.trim(),
      percentage: pct(r.percentage),
      sortOrder: idx,
    }));

    // One picked node → the pair the API stores. The server re-checks that the subcategory
    // belongs to the category, so a stale tree here cannot file a plan under two branches.
    const scope = scopeFromNodeId(scopeNodeId, subCategories);

    const payload: PaymentPlan = {
      // No `name`: a plan IS the fee split for a project type, so the server names it from
      // the category. Sending one here would be a second source for the same label.
      description: description.trim() || null,
      isDefault,
      isActive: true,
      stages,
      categoryId: scope?.categoryId,
      subCategoryId: scope?.subCategoryId ?? null,
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
          <div className="col-md-7">
            <Form.Label className="fw-semibold text-gray-800 fs-7 mb-2">
              Project Category <span className="text-danger">*</span>
            </Form.Label>
            <HierarchicalTaskPicker
              value={scopeNodeId}
              onChange={(option) => setScopeNodeId(option?.value || "")}
              options={categoryOptions}
              placeholder="Search categories & subcategories…"
            />
            <div className="text-muted mt-1" style={{ fontSize: 12 }}>
              {scopePath
                ? `This is the fee split for ${scopePath}.`
                : "Pick a category for the whole type, or a subcategory for just that one."}
            </div>
          </div>
          <div className="col-md-5 d-flex align-items-end pb-4">
            <Form.Check
              type="checkbox"
              id="paymentPlanIsDefault"
              label="Set as default plan"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="fw-semibold text-gray-700"
            />
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
        <PaymentPlanStagesTree stages={rows} onChange={setRows} showDeliverables />
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
