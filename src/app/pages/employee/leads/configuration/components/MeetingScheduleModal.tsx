import React, { useState, useEffect } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import { KTIcon } from "@metronic/helpers";
import { createMeetingSchedule, updateMeetingSchedule } from "@services/meetingSchedule";
import { showSuccess } from "@utils/modal";
import { EVENT_KEYS } from "@constants/eventKeys";
import eventBus from "@utils/EventBus";
import type {
  MeetingScheduleType,
  MeetingScheduleBracket,
  MeetingScheduleItem,
} from "@models/leads";

interface MeetingScheduleModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: MeetingScheduleType | null;
  isEditing?: boolean;
}

// Editable draft shapes (numbers-as-strings while typing).
interface DraftItem {
  name: string;
  value: string;
}
interface DraftBracket {
  minArea: string;
  maxArea: string;
  completionYear: string;
  completionMonth: string;
  items: DraftItem[];
}

// A helpful starting set matching the common meeting schedule.
const DEFAULT_MEETINGS = [
  "RCC Slab Checking for MEP up to Typical Floor",
  "RCC Slab Checking after Typical Floor",
  "Installation Site Co-ordination",
  "Testing and Commissioning",
  "Handover",
];

const newBracket = (): DraftBracket => ({
  minArea: "0",
  maxArea: "",
  completionYear: "",
  completionMonth: "",
  items: DEFAULT_MEETINGS.map((name) => ({ name, value: "" })),
});

const toDraftBracket = (b: MeetingScheduleBracket): DraftBracket => ({
  minArea: String(b.minArea ?? ""),
  maxArea: String(b.maxArea ?? ""),
  completionYear: b.completionYear === undefined || b.completionYear === null ? "" : String(b.completionYear),
  completionMonth: b.completionMonth === undefined || b.completionMonth === null ? "" : String(b.completionMonth),
  items: (b.items || [])
    .slice()
    .sort((a, c) => (a.sortOrder ?? 0) - (c.sortOrder ?? 0))
    .map((it: MeetingScheduleItem) => ({
      name: it.name || "",
      value: it.value === undefined || it.value === null ? "" : String(it.value),
    })),
});

const MeetingScheduleModal: React.FC<MeetingScheduleModalProps> = ({
  show,
  onClose,
  onSuccess,
  initialData,
  isEditing = false,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [brackets, setBrackets] = useState<DraftBracket[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!show) return;
    setError(null);
    if (isEditing && initialData) {
      setName(initialData.name || "");
      setDescription(initialData.description || "");
      setIsDefault(!!initialData.isDefault);
      const bs = (initialData.brackets || [])
        .slice()
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map(toDraftBracket);
      setBrackets(bs.length > 0 ? bs : [newBracket()]);
    } else {
      setName("");
      setDescription("");
      setIsDefault(false);
      setBrackets([newBracket()]);
    }
  }, [show, isEditing, initialData]);

  // ── bracket / item mutations ────────────────────────────────────────────────
  const updateBracket = (bi: number, patch: Partial<DraftBracket>) => {
    setBrackets((prev) => prev.map((b, i) => (i === bi ? { ...b, ...patch } : b)));
  };
  const addBracket = () => setBrackets((prev) => [...prev, newBracket()]);
  const removeBracket = (bi: number) => setBrackets((prev) => prev.filter((_, i) => i !== bi));

  const updateItem = (bi: number, ii: number, patch: Partial<DraftItem>) => {
    setBrackets((prev) =>
      prev.map((b, i) =>
        i === bi ? { ...b, items: b.items.map((it, j) => (j === ii ? { ...it, ...patch } : it)) } : b,
      ),
    );
  };
  const addItem = (bi: number) =>
    setBrackets((prev) =>
      prev.map((b, i) => (i === bi ? { ...b, items: [...b.items, { name: "", value: "" }] } : b)),
    );
  const removeItem = (bi: number, ii: number) =>
    setBrackets((prev) =>
      prev.map((b, i) => (i === bi ? { ...b, items: b.items.filter((_, j) => j !== ii) } : b)),
    );

  // ── validation ──────────────────────────────────────────────────────────────
  const validate = (): string | null => {
    if (!name.trim()) return "Meeting schedule name is required.";
    if (brackets.length === 0) return "Add at least one area bracket.";
    for (let i = 0; i < brackets.length; i++) {
      const b = brackets[i];
      const min = parseFloat(b.minArea);
      const max = parseFloat(b.maxArea);
      if (isNaN(min) || min < 0) return `Bracket #${i + 1}: enter a valid non-negative Min Area.`;
      if (isNaN(max) || max < 0) return `Bracket #${i + 1}: enter a valid non-negative Max Area.`;
      if (max < min) return `Bracket #${i + 1}: Max Area cannot be less than Min Area.`;
      if (b.items.some((it) => !it.name.trim())) return `Bracket #${i + 1}: every meeting needs a name.`;
    }
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError(null);

    const payload: MeetingScheduleType = {
      name: name.trim(),
      description: description.trim() || null,
      isDefault,
      isActive: true,
      brackets: brackets.map((b, bi) => ({
        minArea: parseFloat(b.minArea) || 0,
        maxArea: parseFloat(b.maxArea) || 0,
        completionYear: parseInt(b.completionYear, 10) || 0,
        completionMonth: parseInt(b.completionMonth, 10) || 0,
        sortOrder: bi,
        items: b.items.map((it, ii) => ({
          name: it.name.trim(),
          value: it.value.trim(),
          sortOrder: ii,
        })),
      })),
    };

    setIsSubmitting(true);
    try {
      if (isEditing && initialData?.id) {
        await updateMeetingSchedule(initialData.id, payload);
        showSuccess("Success", "Meeting schedule updated successfully.");
        eventBus.emit(EVENT_KEYS.meetingScheduleUpdated, { id: initialData.id });
      } else {
        const res = await createMeetingSchedule(payload);
        showSuccess("Success", "Meeting schedule created successfully.");
        eventBus.emit(EVENT_KEYS.meetingScheduleCreated, { id: res?.meetingSchedule?.id || "created" });
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (e: any) {
      setError(
        e?.response?.data?.message ||
          `Failed to ${isEditing ? "update" : "create"} the meeting schedule.`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!show) return null;

  return (
    <Modal show={show} onHide={onClose} centered size="xl" scrollable>
      <Modal.Header closeButton style={{ borderBottom: "none", paddingBottom: 8 }}>
        <Modal.Title style={{ fontWeight: 600, fontSize: 18, color: "#1a1a1a" }}>
          {isEditing ? "Edit" : "New"} Meeting Schedule
        </Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ paddingTop: 16 }}>
        {error && <div className="alert alert-danger mb-4">{error}</div>}

        <div className="row g-4 mb-2">
          <div className="col-md-7">
            <Form.Label className="fw-semibold text-gray-800 fs-7 mb-2">
              Project Type / Name <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              type="text"
              className="form-control-solid"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Residential / Commercial"
            />
          </div>
          <div className="col-md-5 d-flex align-items-end">
            <Form.Check
              type="checkbox"
              id="meetingScheduleIsDefault"
              label="Set as default"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="fw-semibold text-gray-700"
            />
          </div>
          <div className="col-12">
            <Form.Label className="fw-semibold text-gray-800 fs-7 mb-2">Description</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              className="form-control-solid"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional note about this project type"
            />
          </div>
        </div>

        <div className="separator separator-dashed my-4" />

        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="fw-bolder mb-0">
            <KTIcon iconName="chart-simple" className="text-primary me-2 fs-3" />
            Area Brackets
          </h6>
          <Button variant="light-primary" size="sm" className="fw-bold" onClick={addBracket}>
            <KTIcon iconName="plus" className="fs-3 me-1" /> Add Bracket
          </Button>
        </div>

        <div className="d-flex flex-column gap-5">
          {brackets.map((b, bi) => (
            <div key={bi} className="border border-gray-300 border-dashed rounded-3 p-5 bg-light-primary bg-opacity-25 position-relative">
              {brackets.length > 1 && (
                <Button
                  variant="light-danger"
                  size="sm"
                  className="btn-icon w-30px h-30px position-absolute top-0 end-0 mt-3 me-3"
                  onClick={() => removeBracket(bi)}
                >
                  <KTIcon iconName="trash" className="fs-4" />
                </Button>
              )}

              <div className="row g-3 mb-4 pe-10">
                <div className="col-6 col-md-3">
                  <Form.Label className="fs-8 fw-bold text-uppercase text-muted mb-1">Min Area (Sqft)</Form.Label>
                  <Form.Control
                    type="number"
                    size="sm"
                    className="form-control-solid"
                    value={b.minArea}
                    onChange={(e) => updateBracket(bi, { minArea: e.target.value })}
                  />
                </div>
                <div className="col-6 col-md-3">
                  <Form.Label className="fs-8 fw-bold text-uppercase text-muted mb-1">Max Area (Sqft)</Form.Label>
                  <Form.Control
                    type="number"
                    size="sm"
                    className="form-control-solid"
                    value={b.maxArea}
                    onChange={(e) => updateBracket(bi, { maxArea: e.target.value })}
                    placeholder="e.g. 100000"
                  />
                </div>
                <div className="col-6 col-md-3">
                  <Form.Label className="fs-8 fw-bold text-uppercase text-muted mb-1">Completion (Years)</Form.Label>
                  <Form.Control
                    type="number"
                    size="sm"
                    className="form-control-solid"
                    value={b.completionYear}
                    onChange={(e) => updateBracket(bi, { completionYear: e.target.value })}
                    placeholder="e.g. 4"
                  />
                </div>
                <div className="col-6 col-md-3">
                  <Form.Label className="fs-8 fw-bold text-uppercase text-muted mb-1">Completion (Months)</Form.Label>
                  <Form.Control
                    type="number"
                    size="sm"
                    className="form-control-solid"
                    value={b.completionMonth}
                    onChange={(e) => updateBracket(bi, { completionMonth: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="bg-white rounded p-3 shadow-sm">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="fw-bold fs-8 text-uppercase text-gray-600">Meetings</span>
                  <Button variant="light-primary" size="sm" className="btn-icon w-25px h-25px" onClick={() => addItem(bi)}>
                    <KTIcon iconName="plus" className="fs-4" />
                  </Button>
                </div>
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead>
                      <tr className="fw-bold fs-8 text-muted text-uppercase border-bottom">
                        <th style={{ minWidth: 200 }}>Meeting</th>
                        <th style={{ width: 160 }}>Value / Count</th>
                        <th style={{ width: 40 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {b.items.map((it, ii) => (
                        <tr key={ii}>
                          <td>
                            <Form.Control
                              type="text"
                              size="sm"
                              className="form-control-solid"
                              value={it.name}
                              onChange={(e) => updateItem(bi, ii, { name: e.target.value })}
                              placeholder="e.g. Handover"
                            />
                          </td>
                          <td>
                            <Form.Control
                              type="text"
                              size="sm"
                              className="form-control-solid"
                              value={it.value}
                              onChange={(e) => updateItem(bi, ii, { value: e.target.value })}
                              placeholder='e.g. 3 or "NA"'
                            />
                          </td>
                          <td className="text-end">
                            <Button
                              variant="icon"
                              className="btn btn-icon btn-light-danger btn-sm w-25px h-25px"
                              onClick={() => removeItem(bi, ii)}
                            >
                              <KTIcon iconName="cross" className="fs-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {b.items.length === 0 && (
                        <tr>
                          <td colSpan={3} className="text-center text-muted fs-8 py-3">
                            No meetings — click + to add.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Modal.Body>

      <Modal.Footer style={{ borderTop: "none" }}>
        <Button variant="light" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={isSubmitting || !name.trim() || brackets.length === 0}
          style={{ backgroundColor: "#1E3A8A", border: "none" }}
        >
          {isSubmitting ? "Saving..." : isEditing ? "Update Schedule" : "Save Schedule"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default MeetingScheduleModal;
