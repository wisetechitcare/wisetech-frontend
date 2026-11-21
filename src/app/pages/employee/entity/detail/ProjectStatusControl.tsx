import React, { useEffect, useMemo, useState } from 'react';
import { parseDate, type CalendarDate } from '@internationalized/date';
import { Flag } from 'lucide-react';
import { getAllProjectStatuses } from '@services/projects';
import { updateLeadSection } from '@services/leadService';
import { toDateInputValue } from '@app/modules/detail-page/EditableDetailCard';
import { Checkbox } from '@/ds/ui/checkbox';
import { DateField } from '@/ds/ui/date-field';
import { OptionPickerDialog, OptionPickerTrigger } from '@/ds/patterns/option-picker-dialog';
import { canSection } from '@utils/can';

/** 'YYYY-MM-DD' (what the API and `toDateInputValue` use) → the kit date field's value; anything else is empty. */
const asCalendarDate = (value: string): CalendarDate | null => {
  try { return value ? parseDate(value) : null; } catch { return null; }
};

// The built-in COMPLETED status — by code, so renaming it in Project Configure is safe.
const isCompletedStatus = (s?: { code?: string | null } | null) => s?.code === 'COMPLETED';

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
  projectStatus?: { code?: string | null; name?: string; color?: string } | null;
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

  const confirmDisabled =
    saving || !selectedId || !hasChanges(selectedId);

  return (
    <>
      {/* "Project - " → caption "Project", so the status name stands on its own in its colour. */}
      <OptionPickerTrigger
        label={prefix.replace(/[\s\-–:]+$/, '') || undefined}
        value={name}
        color={color}
        busy={saving}
        onClick={canWrite ? handleOpen : undefined}
      />

      <OptionPickerDialog
        open={showModal}
        onOpenChange={setShowModal}
        title="Project Status"
        description="Choose how this project is progressing"
        icon={<Flag />}
        options={statuses.map((s: any) => ({ id: s.id, name: s.name, color: s.color || '#64748B' }))}
        value={selectedId}
        currentId={projectStatusId}
        onValueChange={setSelectedId}
        onConfirm={() => { if (selectedId) select(selectedId); }}
        confirmDisabled={confirmDisabled}
        confirmLabel={saving ? 'Saving…' : 'Confirm'}
        loading={saving}
      >
        {showEndDate && (
          <div className="grid gap-3 rounded-xl border border-border bg-muted/40 p-3.5">
            <DateField
              label="End date"
              description="Filled with today — change it if needed."
              value={asCalendarDate(endDateDraft)}
              onChange={(d: CalendarDate | null) => setEndDateDraft(d ? d.toString() : '')}
            />
            {/* The whole row is the label, so the click target is the row, not the 22px box. */}
            <label className="flex cursor-pointer items-start gap-3">
              <Checkbox checked={endTeams} onCheckedChange={(c) => setEndTeams(!!c)} className="mt-0.5" />
              <span className="min-w-0">
                <span className="block text-sm font-medium">Also end the team members</span>
                <span className="block text-xs text-muted-foreground">
                  Gives the Internal and External team the same end date. Anyone with an earlier end date keeps it.
                </span>
              </span>
            </label>
          </div>
        )}
      </OptionPickerDialog>
    </>
  );
};

export default ProjectStatusControl;
