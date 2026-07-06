import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from 'react-bootstrap';
import { getAllProjectStatuses } from '@services/projects';
import { updateLeadSection } from '@services/leadService';

/**
 * Inline Project Status control shown in the entity detail HEADER (top). Editing
 * project status happens here only — the field was removed from the Project tab's
 * Ownership card. Saves via the dedicated `projectStatus` section (partial execution
 * update, so PM/team are untouched), then asks the page to refetch.
 */
const ProjectStatusControl: React.FC<{
  leadId: string;
  projectStatusId?: string | null;
  projectStatus?: { name?: string; color?: string } | null;
  onChanged?: () => void;
  prefix?: string;
}> = ({ leadId, projectStatusId, projectStatus, onChanged, prefix = '' }) => {
  const [statuses, setStatuses] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getAllProjectStatuses()
      .then((r: any) => setStatuses(r?.projectStatuses || r?.data || []))
      .catch(() => {});
  }, []);

  const current = useMemo(
    () => statuses.find((s: any) => s.id === projectStatusId) || projectStatus || null,
    [statuses, projectStatusId, projectStatus],
  );
  const name = current?.name || 'Set status';
  const color = current?.color || '#64748B';

  const [showModal, setShowModal] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(projectStatusId || null);

  const handleOpen = () => {
    setSelectedId(projectStatusId || null);
    setShowModal(true);
  };

  const select = async (id: string) => {
    if (id === projectStatusId || saving) return;
    setSaving(true);
    try {
      await updateLeadSection(leadId, 'projectStatus', { projectStatusId: id }, null);
      onChanged?.();
      setShowModal(false);
    } catch {
      /* keep current on failure */
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        disabled={saving}
        onClick={handleOpen}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          border: `1px solid ${color}44`, background: `${color}12`, color,
          borderRadius: 999, padding: '7px 14px', cursor: 'pointer',
          fontFamily: 'Inter, sans-serif', fontSize: 12.5, fontWeight: 700,
        }}
      >
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block' }} />
        {saving ? 'Saving…' : `${prefix}${name}`}
        <i className="bi bi-pencil-fill" style={{ fontSize: 10, opacity: 0.7, marginLeft: '2px' }} />
      </button>

      <Modal show={showModal} onHide={() => !saving && setShowModal(false)} centered size="sm">
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: '14px', fontWeight: 600 }}>Select Project Status</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '12px' }}>
        {statuses.map((s: any) => {
          const active = s.id === selectedId;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelectedId(s.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 9, width: '100%',
                border: 'none', background: active ? '#f8fafc' : 'transparent',
                borderRadius: 8, padding: '8px 10px', cursor: 'pointer', textAlign: 'left',
                fontWeight: active ? 700 : 500, color: '#1E293B',
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color || '#64748B', display: 'inline-block', flexShrink: 0 }} />
              {s.name}
              {active && <i className="bi bi-check2 ms-auto" style={{ color: '#16a34a' }} />}
            </button>
          );
        })}
        </Modal.Body>
        <Modal.Footer style={{ padding: '12px', borderTop: '1px solid #EEF2F6' }}>
          <button 
            type="button" 
            className="btn btn-light btn-sm" 
            onClick={() => setShowModal(false)}
            disabled={saving}
          >
            Cancel
          </button>
          <button 
            type="button" 
            className="btn btn-primary btn-sm" 
            onClick={() => {
              if (selectedId) select(selectedId);
            }}
            disabled={saving || !selectedId || selectedId === projectStatusId}
            style={{ backgroundColor: '#AA393D', borderColor: '#AA393D' }}
          >
            {saving ? 'Saving...' : 'Confirm'}
          </button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default ProjectStatusControl;
