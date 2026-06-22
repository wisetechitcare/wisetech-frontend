import React, { useState } from "react";
import { Modal, Button } from "react-bootstrap";
import Select from "react-select";
import { createSubService, updateSubService } from "@services/companies";
import { sortOptionsAlphabetically } from "@utils/sortUtils";
import { successConfirmation } from "@utils/modal";
import eventBus from "@utils/EventBus";
import { EVENT_KEYS } from "@constants/eventKeys";

interface ServiceOption {
  id: string;
  name: string;
}

interface Props {
  show: boolean;
  onClose: () => void;
  services: ServiceOption[]; // company services available as parents
  defaultParentId?: string;
  // When provided, the modal edits this sub-service instead of creating a new one.
  initialData?: { id: string; name: string; parentServiceId?: string | null } | null;
  onCreated?: (subService: { id: string; name: string; parentServiceId: string }) => void;
}

// Create / edit a hierarchical sub-service (name + parent company Service).
const SubServiceModal: React.FC<Props> = ({ show, onClose, services, defaultParentId, initialData, onCreated }) => {
  const isEditing = !!initialData?.id;
  const [name, setName] = useState("");
  const [parentServiceId, setParentServiceId] = useState<string>(defaultParentId || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Reset / prefill fields whenever the modal opens.
  React.useEffect(() => {
    if (show) {
      setName(initialData?.name || "");
      setParentServiceId(initialData?.parentServiceId || defaultParentId || "");
      setError("");
    }
  }, [show, defaultParentId, initialData]);

  const handleSave = async () => {
    if (!name.trim()) { setError("Name is required"); return; }
    if (!parentServiceId) { setError("Please choose a parent service"); return; }
    setSaving(true);
    setError("");
    try {
      const payload = { name: name.trim(), parentServiceId };
      const res = isEditing
        ? await updateSubService(initialData!.id, payload)
        : await createSubService(payload);
      const saved = res?.subService ?? res?.data?.subService ?? res;
      successConfirmation(`Sub-service ${isEditing ? "updated" : "created"} successfully`);
      eventBus.emit(EVENT_KEYS.subServiceCreated, { id: saved?.id ?? initialData?.id });
      onCreated?.({ id: saved?.id ?? initialData!.id, name: saved?.name ?? name.trim(), parentServiceId });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || `Failed to ${isEditing ? "update" : "create"} sub-service`);
    } finally {
      setSaving(false);
    }
  };

  if (!show) return null;

  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton style={{ borderBottom: "none" }}>
        <Modal.Title style={{ fontWeight: 600, fontSize: 18 }}>{isEditing ? "Edit" : "New"} Sub-service</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <div className="alert alert-danger py-2">{error}</div>}
        <div className="mb-3">
          <label className="form-label">Parent Service<span className="text-danger"> *</span></label>
          <Select
            placeholder="Select parent service"
            classNamePrefix="react-select"
            options={sortOptionsAlphabetically(services.map((s) => ({ value: s.id, label: s.name })))}
            value={
              parentServiceId
                ? { value: parentServiceId, label: services.find((s) => s.id === parentServiceId)?.name || "" }
                : null
            }
            onChange={(opt: any) => setParentServiceId(opt?.value || "")}
            menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
            menuPosition="fixed"
            styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
          />
        </div>
        <div className="mb-2">
          <label className="form-label">Sub-service Name<span className="text-danger"> *</span></label>
          <input
            type="text"
            className="form-control"
            placeholder="Enter sub-service name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
      </Modal.Body>
      <Modal.Footer style={{ borderTop: "none" }}>
        <Button variant="primary" onClick={handleSave} disabled={saving} style={{ backgroundColor: "#8B4444", border: "none" }}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default SubServiceModal;
