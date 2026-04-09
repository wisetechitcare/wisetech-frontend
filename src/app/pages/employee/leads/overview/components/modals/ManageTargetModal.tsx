import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Spinner } from "react-bootstrap";
import { getMonthlyTargets, saveMonthlyTargets } from "@services/lead";
import dayjs from "dayjs";

interface ManageTargetModalProps {
  show: boolean;
  onHide: () => void;
  onSave: () => void;
  initialYear?: number;
  targetType?: "inquiry" | "received";
}

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const ManageTargetModal: React.FC<ManageTargetModalProps> = ({ show, onHide, onSave, initialYear, targetType = "inquiry" }) => {
  const [currentYear, setCurrentYear] = useState(initialYear || dayjs().year());
  const [targetData, setTargetData] = useState<number[]>(new Array(12).fill(0));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadTargets = async (year: number) => {
    try {
      setLoading(true);
      const data = await getMonthlyTargets(year, targetType);
      const newTargets = new Array(12).fill(0);
      data.forEach((t: any) => {
          if (t.month >= 0 && t.month < 12) {
              newTargets[t.month] = Number(t.targetAmount);
          }
      });
      setTargetData(newTargets);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (show) loadTargets(currentYear);
  }, [show, currentYear, targetType]);

  const handleInputChange = (index: number, value: string) => {
    const newData = [...targetData];
    newData[index] = parseInt(value) || 0;
    setTargetData(newData);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const formattedTargets = targetData.map((val, idx) => ({
          month: idx,
          targetAmount: val
      }));
      await saveMonthlyTargets(currentYear, formattedTargets, targetType);
      onSave();
      onHide();
    } catch (err) {
      console.error(err);
      alert("Failed to save targets");
    } finally {
      setSaving(false);
    }
  };

  const targetLabel = targetType.charAt(0).toUpperCase() + targetType.slice(1);

  return (
    <Modal show={show} onHide={onHide} centered scrollable className="modal-sober">
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title>
          <h5 className="fw-bold m-0" style={{ color: '#1E293B' }}>{targetLabel} Goals Configuration</h5>
          <p className="text-muted small m-0">Set the target number of {targetType} leads per month for {currentYear}.</p>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <div className="d-flex justify-content-between align-items-center mb-4 bg-light p-2 rounded-3 border">
          <Button variant="link" className="text-dark p-0 border-0 shadow-none" onClick={() => setCurrentYear(currentYear - 1)}>
            <i className="bi bi-chevron-left"></i>
          </Button>
          <h5 className="fw-bold m-0 text-primary">{currentYear}</h5>
          <Button variant="link" className="text-dark p-0 border-0 shadow-none" onClick={() => setCurrentYear(currentYear + 1)}>
            <i className="bi bi-chevron-right"></i>
          </Button>
        </div>

        {loading ? (
           <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
           </div>
        ) : (
          <div className="row g-3">
            {months.map((month, index) => (
              <div className="col-6" key={month}>
                <Form.Group>
                  <Form.Label className="x-small fw-bold text-muted uppercase mb-1" style={{ fontSize: '10px' }}>{month}</Form.Label>
                  <Form.Control
                    type="number"
                    size="sm"
                    className="bg-light border-0 shadow-none fw-semibold"
                    value={targetData[index]}
                    onChange={(e) => handleInputChange(index, e.target.value)}
                  />
                </Form.Group>
              </div>
            ))}
          </div>
        )}
      </Modal.Body>

      <Modal.Footer className="border-0 pt-3">
        <Button variant="light" size="sm" className="px-4 fw-semibold border shadow-sm" onClick={onHide} disabled={saving}>Cancel</Button>
        <Button variant="dark" size="sm" className="px-4 shadow-sm" onClick={handleSave} disabled={saving || loading}>
          {saving ? 'Saving...' : `Sync ${targetLabel} Targets`}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ManageTargetModal;
