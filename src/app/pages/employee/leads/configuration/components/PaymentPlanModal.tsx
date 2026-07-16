import React, { useState, useEffect } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import PercentageConfigurationTable from "../../lead/components/PercentageConfigurationTable";
import { createPaymentPlan, updatePaymentPlan } from "@services/paymentPlan";
import { showSuccess, showError } from "@utils/modal";
import { EVENT_KEYS } from "@constants/eventKeys";
import eventBus from "@utils/EventBus";
import type { PaymentPlan, PaymentPlanStage } from "@models/leads";

interface PaymentPlanModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: PaymentPlan | null;
  isEditing?: boolean;
}

// Shape expected by PercentageConfigurationTable (it reads `config_key` for the label
// and `value` for the percentage). We adapt to/from our PaymentPlanStage model here so
// the polished table (drag-reorder, auto-fix, live total badge) can be reused as-is.
interface StageRow {
  config_key: string;
  configKey: string;
  config_type: string;
  configType: string;
  value: number | string;
  config_value: number | string;
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

const toRow = (name: string, percentage: number | string): StageRow => ({
  config_key: name,
  configKey: name,
  config_type: "percentage",
  configType: "percentage",
  value: percentage,
  config_value: percentage,
});

const PaymentPlanModal: React.FC<PaymentPlanModalProps> = ({
  show,
  onClose,
  onSuccess,
  initialData,
  isEditing = false,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [rows, setRows] = useState<StageRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset the form whenever the modal opens (new vs edit).
  useEffect(() => {
    if (!show) return;
    setError(null);
    if (isEditing && initialData) {
      setName(initialData.name || "");
      setDescription(initialData.description || "");
      setIsDefault(!!initialData.isDefault);
      setRows(
        (initialData.stages || [])
          .slice()
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
          .map((s) => toRow(s.name, s.percentage)),
      );
    } else {
      setName("");
      setDescription("");
      setIsDefault(false);
      setRows(DEFAULT_STAGES.map((s) => toRow(s.name, s.percentage)));
    }
  }, [show, isEditing, initialData]);

  const total = rows.reduce((sum, r) => sum + (parseFloat(String(r.value)) || 0), 0);
  // Round to 3dp to match the backend Decimal(6,3) and avoid float-noise mismatches.
  const roundedTotal = Math.round(total * 1000) / 1000;
  const hasNegative = rows.some((r) => (parseFloat(String(r.value)) || 0) < 0);
  const hasEmptyName = rows.some((r) => !String(r.config_key || "").trim());
  const isTotalValid = roundedTotal === 100;
  const canSave =
    !!name.trim() && rows.length > 0 && isTotalValid && !hasNegative && !hasEmptyName;

  const handleSave = async () => {
    setError(null);

    if (!name.trim()) {
      setError("Plan name is required.");
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
      name: String(r.config_key || "").trim(),
      percentage: parseFloat(String(r.value)) || 0,
      sortOrder: idx,
    }));

    const payload: PaymentPlan = {
      name: name.trim(),
      description: description.trim() || null,
      isDefault,
      isActive: true,
      stages,
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
    <Modal show={show} onHide={onClose} centered size="lg" scrollable>
      <Modal.Header closeButton style={{ borderBottom: "none", paddingBottom: 8 }}>
        <Modal.Title style={{ fontWeight: 600, fontSize: 18, color: "#1a1a1a" }}>
          {isEditing ? "Edit" : "New"} Payment Plan
        </Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ paddingTop: 16 }}>
        {error && <div className="alert alert-danger mb-4">{error}</div>}

        <div className="row g-4 mb-2">
          <div className="col-md-7">
            <Form.Label className="fw-semibold text-gray-800 fs-7 mb-2">
              Plan Name <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              type="text"
              className="form-control-solid"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Standard Interior Fee Plan"
            />
          </div>
          <div className="col-md-5 d-flex align-items-end">
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

        {/* Reused stage editor: add / remove / drag-reorder / auto-fix / live total. */}
        <PercentageConfigurationTable
          percentages={rows}
          setPercentages={(data) => setRows(data as StageRow[])}
          title="Payment Stages"
          description="Each stage is a % of the total commercial cost — they must total 100%."
        />

        <div
          className={`d-flex justify-content-between align-items-center mt-2 px-3 py-2 rounded ${
            isTotalValid ? "bg-light-success" : "bg-light-danger"
          }`}
        >
          <span className="fw-bold fs-7 text-gray-700">Total</span>
          <span className={`fw-bolder fs-6 ${isTotalValid ? "text-success" : "text-danger"}`}>
            {roundedTotal}% {isTotalValid ? "✓" : "(must equal 100%)"}
          </span>
        </div>
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
