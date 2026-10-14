import React, { useEffect, useMemo, useState } from 'react';
import { Box, Checkbox, FormControlLabel, Stack, Typography } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import { getAllProjectStatuses } from '@services/projects';
import { updateLeadSection } from '@services/leadService';
import { toDateInputValue } from '@app/modules/detail-page/EditableDetailCard';
import PlainDatePicker from '@app/modules/common/inputs/PlainDatePicker';
import { OptionPickerDialog, GlassSurface, IconBox, TRIO } from '@app/modules/common/components/ui';
import { canSection } from '@utils/can';

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
  const canWrite = canSection('projects', 'write');
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
  // Ask whether the Internal + External teams should end on the project's end date.
  const [endTeams, setEndTeams] = useState(true);

  const handleOpen = () => {
    setSelectedId(projectStatusId || null);
    setEndDateDraft(toDateInputValue(actualEndDate) || toDateInputValue(new Date()));
    // Already Completed: don't re-end the teams unless the user opts in again.
    setEndTeams(!isCompletedStatus(current));
    setShowModal(true);
  };

  const selectedStatus = useMemo(() => statuses.find((s: any) => s.id === selectedId) || null, [statuses, selectedId]);
  const showEndDate = isCompletedStatus(selectedStatus);
  // Nothing to save when the status is unchanged and the Completed options are untouched.
  const hasChanges = (id: string | null) =>
    id !== projectStatusId ||
    (showEndDate && (endDateDraft !== toDateInputValue(actualEndDate) || endTeams));

  const select = async (id: string) => {
    if (!hasChanges(id)) return;
    if (saving) return;
    setSaving(true);
    try {
      const data: any = { projectStatusId: id };
      if (showEndDate) {
        data.actualEndDate = endDateDraft || null;
        if (endTeams) data.endTeamsOnComplete = true;
      }
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
    saving || !selectedId || !hasChanges(selectedId);

  return (
    <>
      <button
        disabled={saving || !canWrite}
        onClick={handleOpen}
        onMouseEnter={() => canWrite && setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 9,
          border: `1px solid ${color}3D`,
          background: `linear-gradient(180deg, ${color}17, ${color}0A)`,
          color,
          borderRadius: 10,
          padding: '6px 8px 6px 13px',
          cursor: !canWrite ? 'default' : saving ? 'wait' : 'pointer',
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
        {canWrite && <span
          aria-hidden
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 22, height: 22, borderRadius: 7,
            background: hover ? `${color}26` : `${color}17`,
            transition: 'background 0.15s ease',
          }}
        >
          <KTIcon iconName="pencil" className="fs-8" />
        </span>}
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
            {/* Whole card is the click target (not just the tiny box), and it visibly
                reacts to the checked state so the choice is obvious at a glance. */}
            <FormControlLabel
              sx={{
                mt: 1.5, mx: 0, width: '100%', alignItems: 'flex-start', gap: 0.5,
                p: 1.25, pl: 0.75, borderRadius: 2,
                border: '1px solid',
                borderColor: endTeams ? TRIO.green.c : 'divider',
                bgcolor: endTeams ? `${TRIO.green.c}14` : 'transparent',
                transition: 'border-color 0.15s ease, background-color 0.15s ease',
                '&:hover': { borderColor: TRIO.green.c },
                '& .MuiFormControlLabel-label': { flex: 1, minWidth: 0 },
              }}
              control={
                <Checkbox
                  checked={endTeams}
                  onChange={(e) => setEndTeams(e.target.checked)}
                  sx={{
                    p: 0.5, mt: -0.25,
                    '&.Mui-checked': { color: TRIO.green.c },
                    '& .MuiSvgIcon-root': { fontSize: 22 },
                  }}
                />
              }
              label={
                <Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, lineHeight: 1.35, color: 'text.primary' }}>
                    Also end Internal &amp; External team members
                  </Typography>
                  <Typography sx={{ fontSize: 12, lineHeight: 1.4, color: 'text.secondary', mt: 0.25 }}>
                    Sets the same end date on the team rosters. Members who already have an earlier end date keep it.
                  </Typography>
                </Box>
              }
            />
          </GlassSurface>
        )}
      </OptionPickerDialog>
    </>
  );
};

export default ProjectStatusControl;
