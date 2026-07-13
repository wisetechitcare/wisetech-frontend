import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from 'react-bootstrap';
import { getAllProjectStatuses } from '@services/projects';
import { updateLeadSection } from '@services/leadService';
import { toDateInputValue } from '@app/modules/detail-page/EditableDetailCard';
import PlainDatePicker from '@app/modules/common/inputs/PlainDatePicker';

const isCompletedStatus = (s?: { name?: string } | null) =>
  (s?.name || '').trim().toLowerCase() === 'completed';

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
  actualEndDate?: string | null;
  onChanged?: () => void;
  prefix?: string;
}> = ({ leadId, projectStatusId, projectStatus, actualEndDate, onChanged, prefix = '' }) => {
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
  const [endDateDraft, setEndDateDraft] = useState('');

  const handleOpen = () => {
    setSelectedId(projectStatusId || null);
    setEndDateDraft(toDateInputValue(actualEndDate) || toDateInputValue(new Date()));
    setShowModal(true);
  };

  const selectedStatus = useMemo(() => statuses.find((s: any) => s.id === selectedId) || null, [statuses, selectedId]);
  const showEndDate = isCompletedStatus(selectedStatus);

  const select = async (id: string) => {
    if (id === projectStatusId && !(showEndDate && endDateDraft !== toDateInputValue(actualEndDate))) return;
    if (saving) return;
    setSaving(true);
    try {
      const data: any = { projectStatusId: id };
      if (showEndDate) data.actualEndDate = endDateDraft || null;
      await updateLeadSection(leadId, 'projectStatus', data, null);
      onChanged?.();
      setShowModal(false);
    } catch {
      /* keep current on failure */
    } finally {
      setSaving(false);
    }
  };

  const [hover, setHover] = useState(false);

  return (
    <>
      <button
        disabled={saving}
        onClick={handleOpen}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 9,
          border: `1px solid ${color}3D`,
          background: `linear-gradient(180deg, ${color}17, ${color}0A)`,
          color,
          borderRadius: 10,
          padding: '6px 8px 6px 13px',
          cursor: saving ? 'wait' : 'pointer',
          fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 700,
          letterSpacing: '-0.1px',
          boxShadow: hover ? `0 2px 8px ${color}26` : `0 1px 2px ${color}14`,
          transform: hover ? 'translateY(-1px)' : 'none',
          transition: 'box-shadow 0.15s ease, transform 0.15s ease, background 0.15s ease',
        }}
      >
        <span
          style={{
            width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block',
            boxShadow: `0 0 0 3px ${color}22`,
          }}
        />
        <span>{saving ? 'Saving…' : `${prefix}${name}`}</span>
        <span
          aria-hidden
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 22, height: 22, borderRadius: 7,
            background: hover ? `${color}26` : `${color}17`,
            transition: 'background 0.15s ease',
          }}
        >
          <i className="bi bi-pencil-fill" style={{ fontSize: 10, opacity: 0.9 }} />
        </span>
      </button>

      <Modal
        show={showModal}
        onHide={() => !saving && setShowModal(false)}
        centered
        contentClassName="rounded-4 border-0 shadow-lg"
      >
        <Modal.Header closeButton style={{ border: 'none', padding: '20px 20px 4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <div
              style={{
                width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg, #AA393D17, #AA393D0A)',
                color: '#AA393D',
              }}
            >
              <i className="bi bi-flag-fill" style={{ fontSize: 15 }} />
            </div>
            <div>
              <Modal.Title style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.2px' }}>
                Project Status
              </Modal.Title>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 1 }}>Choose how this project is progressing</div>
            </div>
          </div>
        </Modal.Header>
        <Modal.Body style={{ padding: '14px 20px 4px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {statuses.map((s: any) => {
              const active = s.id === selectedId;
              const sColor = s.color || '#64748B';
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedId(s.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 11, width: '100%',
                    border: active ? `1px solid ${sColor}55` : '1px solid transparent',
                    background: active ? `${sColor}0F` : '#F8FAFC',
                    borderRadius: 10, padding: '10px 12px', cursor: 'pointer', textAlign: 'left',
                    transition: 'background 0.12s ease, border-color 0.12s ease',
                  }}
                >
                  <span
                    style={{
                      width: 10, height: 10, borderRadius: '50%', background: sColor, display: 'inline-block', flexShrink: 0,
                      boxShadow: active ? `0 0 0 3px ${sColor}22` : 'none',
                    }}
                  />
                  <span style={{ fontSize: 13.5, fontWeight: active ? 700 : 500, color: '#1E293B' }}>{s.name}</span>
                  {active && (
                    <span
                      style={{
                        marginLeft: 'auto', width: 18, height: 18, borderRadius: '50%',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        background: sColor, flexShrink: 0,
                      }}
                    >
                      <i className="bi bi-check2" style={{ fontSize: 11, color: '#fff' }} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {showEndDate && (
            <div
              style={{
                marginTop: 12, padding: '12px', borderRadius: 10,
                background: 'linear-gradient(180deg, #16a34a0F, #16a34a05)',
                border: '1px solid #16a34a2A',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: '#16a34a1A', color: '#16a34a',
                  }}
                >
                  <i className="bi bi-calendar-check-fill" style={{ fontSize: 13 }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#0a5c2a', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                    End Date
                  </div>
                  <div style={{ fontSize: 11.5, color: '#3f6b52', marginTop: 1 }}>Auto-filled with today — adjust if needed</div>
                </div>
              </div>

              <div style={{ marginTop: 9 }}>
                <PlainDatePicker value={endDateDraft} onChange={setEndDateDraft} placeholder="Select date" />
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer style={{ padding: '16px 20px 20px', border: 'none', gap: 8 }}>
          <button
            type="button"
            className="btn btn-light btn-sm"
            onClick={() => setShowModal(false)}
            disabled={saving}
            style={{ fontWeight: 600, borderRadius: 8, padding: '7px 16px' }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => {
              if (selectedId) select(selectedId);
            }}
            disabled={saving || !selectedId || (selectedId === projectStatusId && !(showEndDate && endDateDraft !== toDateInputValue(actualEndDate)))}
            style={{ backgroundColor: '#AA393D', borderColor: '#AA393D', color: '#fff', fontWeight: 700, borderRadius: 8, padding: '7px 18px' }}
          >
            {saving ? 'Saving…' : 'Confirm'}
          </button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default ProjectStatusControl;
