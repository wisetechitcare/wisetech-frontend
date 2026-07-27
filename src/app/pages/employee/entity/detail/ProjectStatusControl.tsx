import React, { useEffect, useMemo, useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { getAllProjectStatuses } from '@services/projects';
import { updateLeadSection } from '@services/leadService';
import { toDateInputValue } from '@app/modules/detail-page/EditableDetailCard';
import PlainDatePicker from '@app/modules/common/inputs/PlainDatePicker';
import { OptionPickerDialog, GlassSurface, IconBox, TRIO } from '@app/modules/common/components/ui';

const isCompletedStatus = (s?: { name?: string } | null) =>
  (s?.name || '').trim().toLowerCase() === 'completed';

/**
 * Inline Project Status control shown in the entity detail HEADER (top). Editing
 * project status happens here only — the field was removed from the Project tab's
 * Ownership card. Saves via the dedicated `projectStatus` section (partial execution
 * update, so PM/team are untouched), then asks the page to refetch.
 *
 * The picker is built entirely on the MUI + Tailwind glass kit (GlassDialog / GlassHeader /
 * GlassSurface / WtButton / IconBox) so it is theme-aware and reads correctly in dark mode —
 * no react-bootstrap, no hand-rolled light-only inline colors.
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
      .then((r: any) => {
        const list = r?.projectStatuses || r?.data || [];
        // API already orders by the configured flow (sortOrder, then name) —
        // re-sort defensively here too so this picker never regresses to
        // insertion order if a caller/cache ever hands back an unsorted list.
        const sorted = [...list].sort((a: any, b: any) => {
          const byOrder = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
          return byOrder !== 0 ? byOrder : (a.name || '').localeCompare(b.name || '');
        });
        setStatuses(sorted);
      })
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

  const confirmDisabled =
    saving || !selectedId ||
    (selectedId === projectStatusId && !(showEndDate && endDateDraft !== toDateInputValue(actualEndDate)));

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
          <KTIcon iconName="pencil" className="fs-8" />
        </span>
      </button>

      <OptionPickerDialog
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Project Status"
        subtitle="Choose how this project is progressing"
        icon={<KTIcon iconName="flag" className="fs-1 text-white" />}
        options={statuses.map((s: any) => ({ id: s.id, name: s.name, color: s.color || '#64748B' }))}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onConfirm={() => { if (selectedId) select(selectedId); }}
        confirmDisabled={confirmDisabled}
        confirmLabel={saving ? 'Saving…' : 'Confirm'}
        loading={saving}
      >
        {showEndDate && (
          <GlassSurface variant="thin" sx={{ p: 1.75, borderRadius: 2.5, borderTop: `3px solid ${TRIO.green.c}` }}>
            <Stack direction="row" spacing={1.25} alignItems="center">
              <IconBox icon="calendar-tick" trio={TRIO.green} size={32} fs="fs-4" />
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: TRIO.green.c }}>
                  End Date
                </Typography>
                <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.25 }}>
                  Auto-filled with today — adjust if needed
                </Typography>
              </Box>
            </Stack>
            <Box sx={{ mt: 1.25 }}>
              <PlainDatePicker value={endDateDraft} onChange={setEndDateDraft} placeholder="Select date" />
            </Box>
          </GlassSurface>
        )}
      </OptionPickerDialog>
    </>
  );
};

export default ProjectStatusControl;
