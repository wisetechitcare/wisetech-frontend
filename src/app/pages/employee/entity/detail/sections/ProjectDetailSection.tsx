import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@redux/store';
import eventBus from '@utils/EventBus';
import { EVENT_KEYS } from '@constants/eventKeys';
import { DetailCard, DetailRow, DetailProfileBlock, DetailStatusBadge } from '@app/modules/detail-page/DetailPageComponents';
import {
  EditableDetailCard, FieldRow, SelectEditor, DateEditor, NumberEditor, TextEditor, ToggleEditor,
} from '@app/modules/detail-page/EditableDetailCard';
import { updateLeadSection, type LeadSectionKey } from '@services/leadService';
import { getAllProjectStatuses, getAllTeams } from '@services/projects';
import { EmptyState } from '../widgets';
import { employeeUserName, employeeNameById, fmtDate, DASH } from '../entityViewModel';
import { getTimelineProgress } from '../../entityUtils';

/**
 * Project Detail — the project extension's execution metadata (ownership,
 * financials, timeline, purchase order, custody) surfaced inside the Summary
 * page once the lead becomes a project.
 *
 * Every card is INLINE-EDITABLE: click Edit on a card to change just that
 * section and Save it directly (a section-scoped PATCH → audited revision), with
 * no form or modal. Data is read from the lead-as-master shape:
 *   - execution.*          → PM, team, status, access, live/open, rate, cost
 *   - lead.*               → start / end / received dates, PO status, assignee
 *   - additionalDetails.*  → PO number, PO date
 *   - handledByEntries[]   → custody timeline
 * (The old code read `lead.project.*`, a relation that no longer exists under
 * lead-as-master — which is why these cards previously showed only dashes.)
 */

const titleCase = (v?: string | null) =>
  v ? String(v).charAt(0).toUpperCase() + String(v).slice(1).toLowerCase() : DASH;

const fmtMoney = (v: any): React.ReactNode => {
  if (v == null || v === '') return DASH;
  const n = Number(v);
  return isNaN(n) ? DASH : `₹${n.toLocaleString('en-IN')}`;
};

const ProjectDetailSection: React.FC<{ lead: any }> = ({ lead }) => {
  const allEmployees = useSelector((s: RootState) => s.allEmployees?.list) || [];

  const ex = lead?.execution || {};
  const ad = Array.isArray(lead?.additionalDetails) ? (lead.additionalDetails[0] || {}) : (lead?.additionalDetails || {});
  const handledBy: any[] = lead?.handledByEntries || [];
  const rev: number | null = lead?.revisionCount ?? null;
  const leadId: string = lead?.id;

  const [teams, setTeams] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);
  useEffect(() => {
    getAllProjectStatuses().then((r: any) => setStatuses(r?.projectStatuses || r?.data || [])).catch(() => {});
    getAllTeams(1, 9999).then((r: any) => setTeams(r?.data?.teams || r?.teams || [])).catch(() => {});
  }, []);

  const employeeOptions = useMemo(
    () => (allEmployees || []).map((e: any) => ({
      value: e.employeeId || e.id,
      label: e.employeeName || `${e.users?.firstName || ''} ${e.users?.lastName || ''}`.trim() || e.name || 'Unknown',
    })),
    [allEmployees],
  );
  const teamOptions = useMemo(() => teams.map((t: any) => ({ value: t.id, label: t.name || t.teamName || 'Unnamed Team' })), [teams]);
  const statusOptions = useMemo(() => statuses.map((s: any) => ({ value: s.id, label: s.name })), [statuses]);
  const accessOptions = [{ value: 'PRIVATE', label: 'Private' }, { value: 'PUBLIC', label: 'Public' }];
  const poStatusOptions = [
    { value: 'Pending', label: 'Pending' },
    { value: 'Approved', label: 'Approved' },
    { value: 'Rejected', label: 'Rejected' },
  ];

  const empName = (id?: string | null) => employeeNameById(allEmployees, id);
  const teamName = ex.team?.name || (ex.teamId ? teamOptions.find(t => t.value === ex.teamId)?.label : '') || DASH;

  // After a section save, ask the detail page to refetch the lead (it listens on
  // this bus) so read-mode values reflect the change + a fresh revisionCount.
  const saveSection = (section: LeadSectionKey, data: any) =>
    updateLeadSection(leadId, section, data, rev).then(() => {
      if (leadId) eventBus.emit(EVENT_KEYS.leadUpdated, { id: leadId });
    });

  const progress = getTimelineProgress(lead?.startDate, lead?.endDate);

  return (
    <div>
      {/* ── Ownership & Timeline ─────────────────────────────────────────── */}
      <div className="row g-5 mb-2">
        <div className="col-12 col-xl-6">
          <EditableDetailCard
            title="Ownership & Status"
            subtitle="Who runs this project"
            icon="bi bi-person-workspace"
            accentColor="blue"
            values={{
              projectManagerId: ex.projectManagerId || '',
              assignedToId: lead?.assignedToId || '',
              teamId: ex.teamId || '',
              projectStatusId: ex.projectStatusId || '',
              projectAccess: ex.projectAccess || 'PRIVATE',
              isLive: !!ex.isLive,
              isProjectOpen: ex.isProjectOpen !== false,
            }}
            onSave={d => saveSection('ownership', d)}
          >
            {({ editing, draft, set }) => (
              <>
                {!editing && (
                  <div style={{ padding: '8px 0 4px' }}>
                    <DetailProfileBlock
                      name={empName(ex.projectManagerId) || DASH}
                      subtitle="Project Manager"
                      href={ex.projectManagerId ? `/employees/${ex.projectManagerId}` : undefined}
                      accentColor="blue"
                    />
                  </div>
                )}
                {editing ? (
                  <>
                    <FieldRow label="Project Manager"><SelectEditor value={draft.projectManagerId} options={employeeOptions} onChange={v => set({ projectManagerId: v })} /></FieldRow>
                    <FieldRow label="Assigned (Lead)"><SelectEditor value={draft.assignedToId} options={employeeOptions} onChange={v => set({ assignedToId: v })} /></FieldRow>
                    <FieldRow label="Execution Team"><SelectEditor value={draft.teamId} options={teamOptions} onChange={v => set({ teamId: v })} /></FieldRow>
                    <FieldRow label="Project Status"><SelectEditor value={draft.projectStatusId} options={statusOptions} onChange={v => set({ projectStatusId: v })} /></FieldRow>
                    <FieldRow label="Visibility"><SelectEditor value={draft.projectAccess} options={accessOptions} onChange={v => set({ projectAccess: v })} /></FieldRow>
                    <FieldRow label="Live"><ToggleEditor value={!!draft.isLive} onChange={v => set({ isLive: v })} onLabel="Live" offLabel="Not live" /></FieldRow>
                    <FieldRow label="Status" isLast><ToggleEditor value={draft.isProjectOpen !== false} onChange={v => set({ isProjectOpen: v })} onLabel="Open" offLabel="Closed" /></FieldRow>
                  </>
                ) : (
                  <>
                    <DetailRow label="Assigned (Lead)" value={empName(lead?.assignedToId) || employeeUserName(lead?.assignedTo) || DASH} />
                    <DetailRow label="Execution Team" value={teamName} />
                    <DetailRow label="Project Status" value={ex.projectStatus?.name ? <DetailStatusBadge status={ex.projectStatus.name} color={ex.projectStatus.color} /> : DASH} />
                    <DetailRow label="Visibility" value={titleCase(ex.projectAccess)} />
                    <DetailRow label="Live" value={<DetailStatusBadge status={ex.isLive ? 'Live' : 'Not live'} color={ex.isLive ? '#16a34a' : '#94A3B8'} />} />
                    <DetailRow label="Status" value={<DetailStatusBadge status={ex.isProjectOpen === false ? 'Closed' : 'Open'} color={ex.isProjectOpen === false ? '#f1416c' : '#16a34a'} />} isLast />
                  </>
                )}
              </>
            )}
          </EditableDetailCard>
        </div>

        <div className="col-12 col-xl-6">
          <EditableDetailCard
            title="Timeline"
            subtitle="Schedule & progress"
            icon="bi bi-calendar-range"
            accentColor="amber"
            values={{ startDate: lead?.startDate || '', endDate: lead?.endDate || '', receivedDate: lead?.receivedDate || '' }}
            onSave={d => saveSection('timeline', d)}
          >
            {({ editing, draft, set }) => (
              editing ? (
                <>
                  <FieldRow label="Project Start Date"><DateEditor value={draft.startDate} onChange={v => set({ startDate: v })} /></FieldRow>
                  <FieldRow label="Expected Completion"><DateEditor value={draft.endDate} onChange={v => set({ endDate: v })} /></FieldRow>
                  <FieldRow label="Received / PO Date" isLast><DateEditor value={draft.receivedDate} onChange={v => set({ receivedDate: v })} /></FieldRow>
                </>
              ) : (
                <>
                  <DetailRow label="Start Date" value={fmtDate(lead?.startDate)} />
                  <DetailRow label="Expected Completion" value={fmtDate(lead?.endDate)} />
                  <DetailRow label="Received / PO Date" value={fmtDate(lead?.receivedDate)} />
                  <div style={{ padding: '12px 0 4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'Inter', fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 6 }}>
                      <span>Progress</span>
                      <span style={{ color: '#1E293B' }}>{progress != null ? `${progress}%` : DASH}</span>
                    </div>
                    <div style={{ height: 8, background: '#EEF2F6', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ width: `${progress != null ? Math.min(100, Math.max(0, progress)) : 0}%`, height: '100%', background: 'linear-gradient(90deg,#f5a623,#f59e0b)', borderRadius: 999, transition: 'width .4s ease' }} />
                    </div>
                  </div>
                </>
              )
            )}
          </EditableDetailCard>
        </div>
      </div>

      {/* ── Contract Financials & Purchase Order ─────────────────────────── */}
      <div className="row g-5 mb-2">
        <div className="col-12 col-xl-6">
          <EditableDetailCard
            title="Contract Financials"
            subtitle="Rate & final cost"
            icon="bi bi-cash-stack"
            accentColor="green"
            values={{ rate: ex.rate ?? '', cost: ex.cost ?? '' }}
            onSave={d => saveSection('financials', d)}
          >
            {({ editing, draft, set }) => (
              editing ? (
                <>
                  <FieldRow label="Contract Rate"><NumberEditor value={draft.rate} prefix="₹" onChange={v => set({ rate: v })} placeholder="0" /></FieldRow>
                  <FieldRow label="Final Cost" isLast><NumberEditor value={draft.cost} prefix="₹" onChange={v => set({ cost: v })} placeholder="0" /></FieldRow>
                </>
              ) : (
                <>
                  <DetailRow label="Contract Rate" value={fmtMoney(ex.rate)} />
                  <DetailRow label="Final Cost" value={fmtMoney(ex.cost)} isLast />
                </>
              )
            )}
          </EditableDetailCard>
        </div>

        <div className="col-12 col-xl-6">
          <EditableDetailCard
            title="Purchase Order"
            subtitle="PO tracking"
            icon="bi bi-receipt"
            accentColor="green"
            values={{ poStatus: lead?.poStatus || '', poNumber: ad?.poNumber || '', poDate: ad?.poDate || '' }}
            onSave={d => saveSection('purchaseOrder', d)}
          >
            {({ editing, draft, set }) => (
              editing ? (
                <>
                  <FieldRow label="PO Status"><SelectEditor value={draft.poStatus} options={poStatusOptions} onChange={v => set({ poStatus: v })} /></FieldRow>
                  <FieldRow label="PO Number"><TextEditor value={draft.poNumber} onChange={v => set({ poNumber: v })} placeholder="PO number" /></FieldRow>
                  <FieldRow label="PO Date" isLast><DateEditor value={draft.poDate} onChange={v => set({ poDate: v })} /></FieldRow>
                </>
              ) : (
                <>
                  <DetailRow label="PO Status" value={lead?.poStatus ? <DetailStatusBadge status={String(lead.poStatus)} /> : DASH} />
                  <DetailRow label="PO Number" value={ad?.poNumber || DASH} />
                  <DetailRow label="PO Date" value={fmtDate(ad?.poDate)} isLast />
                </>
              )
            )}
          </EditableDetailCard>
        </div>
      </div>

      {/* ── Handled By (custody) ─────────────────────────────────────────── */}
      <div className="row g-5 mb-2">
        <div className="col-12">
          <EditableDetailCard
            title="Handled By"
            subtitle="Custody timeline"
            icon="bi bi-people"
            accentColor="primary"
            values={{ handledByEntries: handledBy.map(e => ({ employeeId: e.employeeId || '', handledDate: e.handledDate || '', handledOutDate: e.handledOutDate || '' })) }}
            onSave={d => saveSection('handledBy', { handledByEntries: (d.handledByEntries || []).filter((e: any) => e.employeeId) })}
          >
            {({ editing, draft, set }) => {
              const entries: any[] = draft.handledByEntries || [];
              const update = (i: number, patch: any) => { const next = [...entries]; next[i] = { ...next[i], ...patch }; set({ handledByEntries: next }); };
              const remove = (i: number) => set({ handledByEntries: entries.filter((_, idx) => idx !== i) });
              const add = () => set({ handledByEntries: [...entries, { employeeId: '', handledDate: '', handledOutDate: '' }] });

              if (!editing) {
                return handledBy.length === 0 ? (
                  <EmptyState icon="bi bi-people" title="No custody records" message="No handled-by entries have been logged for this project." />
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Inter' }}>
                      <thead>
                        <tr style={{ textAlign: 'left' }}>
                          {['Employee', 'Date In', 'Date Out'].map(h => (
                            <th key={h} style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, padding: '10px 12px', borderBottom: '1px solid #EEF2F6' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {handledBy.map((e, i) => (
                          <tr key={e.id || i}>
                            <td style={{ padding: '11px 12px', borderBottom: '1px solid #F4F6F9', fontSize: 13, fontWeight: 700, color: '#1E293B' }}>{empName(e.employeeId) || e.employeeId || DASH}</td>
                            <td style={{ padding: '11px 12px', borderBottom: '1px solid #F4F6F9', fontSize: 13, color: '#475569' }}>{fmtDate(e.handledDate)}</td>
                            <td style={{ padding: '11px 12px', borderBottom: '1px solid #F4F6F9', fontSize: 13, color: '#475569' }}>{e.handledOutDate ? fmtDate(e.handledOutDate) : DASH}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              }

              return (
                <div>
                  {entries.length === 0 && (
                    <div style={{ fontFamily: 'Inter', fontSize: 13, color: '#94A3B8', padding: '8px 0 12px' }}>No entries yet — add one below.</div>
                  )}
                  {entries.map((e, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F4F6F9' }}>
                      <div style={{ flex: 2, minWidth: 160 }}><SelectEditor value={e.employeeId} options={employeeOptions} onChange={v => update(i, { employeeId: v })} placeholder="Select employee" /></div>
                      <div style={{ flex: 1, minWidth: 130 }}><DateEditor value={e.handledDate} onChange={v => update(i, { handledDate: v })} /></div>
                      <div style={{ flex: 1, minWidth: 130 }}><DateEditor value={e.handledOutDate} onChange={v => update(i, { handledOutDate: v })} /></div>
                      <button
                        type="button"
                        onClick={() => remove(i)}
                        title="Remove"
                        style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 8, border: '1px solid #f1416c33', background: '#fff1f3', color: '#9b1c44', cursor: 'pointer' }}
                      >
                        <i className="bi bi-trash" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={add}
                    style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'Inter', fontSize: 12.5, fontWeight: 600, padding: '7px 14px', borderRadius: 8, border: '1px dashed #cbd5e1', background: '#fff', color: '#475569', cursor: 'pointer' }}
                  >
                    <i className="bi bi-plus-lg" /> Add entry
                  </button>
                </div>
              );
            }}
          </EditableDetailCard>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailSection;
