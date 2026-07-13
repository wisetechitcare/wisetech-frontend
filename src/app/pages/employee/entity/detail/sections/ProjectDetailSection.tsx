import React from 'react';
import eventBus from '@utils/EventBus';
import { EVENT_KEYS } from '@constants/eventKeys';
import { DetailRow } from '@app/modules/detail-page/DetailPageComponents';
import { EditableDetailCard, FieldRow, DateEditor } from '@app/modules/detail-page/EditableDetailCard';
import { updateLeadSection, type LeadSectionKey } from '@services/leadService';
import { fmtDate } from '../entityViewModel';

/**
 * Project Detail — the project's schedule, surfaced inside the Summary page
 * once the lead becomes a project. Ownership/Status and Handled By (custody)
 * now live entirely on the Teams tab (TeamsSection) — no duplicate cards here.
 *
 * The Timeline card is INLINE-EDITABLE: click Edit to change it and Save
 * directly (a section-scoped PATCH → audited revision), with no form or modal.
 */

const ProjectDetailSection: React.FC<{ lead: any }> = ({ lead }) => {
  const rev: number | null = lead?.revisionCount ?? null;
  const leadId: string = lead?.id;

  // After a section save, ask the detail page to refetch the lead (it listens on
  // this bus) so read-mode values reflect the change + a fresh revisionCount.
  const saveSection = (section: LeadSectionKey, data: any) =>
    updateLeadSection(leadId, section, data, rev).then(() => {
      if (leadId) eventBus.emit(EVENT_KEYS.leadUpdated, { id: leadId });
    });

  return (
    <div>
      <div className="row g-5 mb-2">
        <div className="col-12">
          <EditableDetailCard
            title="Timeline"
            subtitle="Schedule & progress"
            icon="bi bi-calendar-range"
            accentColor="amber"
            values={{ startDate: lead?.startDate || '', endDate: lead?.endDate || '', actualEndDate: lead?.actualEndDate || '', receivedDate: lead?.receivedDate || '' }}
            onSave={d => saveSection('timeline', d)}
          >
            {({ editing, draft, set }) => (
              editing ? (
                <>
                  <FieldRow label="Project Start Date"><DateEditor value={draft.startDate} onChange={v => set({ startDate: v })} /></FieldRow>
                  <FieldRow label="Expected Completion"><DateEditor value={draft.endDate} onChange={v => set({ endDate: v })} /></FieldRow>
                  <FieldRow label="End Date" isLast><DateEditor value={draft.actualEndDate} onChange={v => set({ actualEndDate: v })} /></FieldRow>
                </>
              ) : (
                <>
                  <DetailRow label="Start Date" value={fmtDate(lead?.startDate)} />
                  <DetailRow label="Expected Completion" value={fmtDate(lead?.endDate)} />
                  <DetailRow label="End Date" value={fmtDate(lead?.actualEndDate)} isLast />
                </>
              )
            )}
          </EditableDetailCard>
        </div>
      </div>

      {/* Contract Financials & Purchase Order live on the Commercial tab now
          (CommercialsSection) — money belongs in one place, not split across
          Projects and Commercial. */}
    </div>
  );
};

export default ProjectDetailSection;
