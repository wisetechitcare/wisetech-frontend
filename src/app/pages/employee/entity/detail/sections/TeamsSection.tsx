import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@redux/store';
import eventBus from '@utils/EventBus';
import { EVENT_KEYS } from '@constants/eventKeys';
import { DetailStatusBadge } from '@app/modules/detail-page/DetailPageComponents';
import {
  EditableDetailCard, SelectEditor, DateEditor, ToggleEditor,
} from '@app/modules/detail-page/EditableDetailCard';
import { updateLeadSection } from '@services/leadService';
import { getAllCompanyTypes, getAllClientCompanies, getClientContactsByCompanyId } from '@services/companies';
import { fetchSubCompaniesByMainCompanyId } from '@services/company';
import { EmptyState } from '../widgets';
import { employeeNameById, fmtDate, DASH } from '../entityViewModel';

/**
 * Teams — the collaboration roster for a lead/project, split in two:
 *
 *   INTERNAL  — the execution-team employees working this record. Seeded from the
 *               selected execution team but per-lead editable: each member has a
 *               start/end window and an active toggle, so we can see who worked on
 *               it, when and for how long. Ad-hoc members (outside the team) can be
 *               added independently.
 *   EXTERNAL  — the company/client stakeholders captured on the lead form (shown
 *               read-only) plus any additional external people added here.
 *
 * Both rosters feed the future MOM (minutes-of-meeting) participant picker. Data
 * is persisted through the same section-scoped PATCH the Project cards use
 * (`internalTeam` / `externalTeam`), so every change is an audited revision.
 */

// ── small shared bits ─────────────────────────────────────────────────────────

const th: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase',
  letterSpacing: 0.5, padding: '10px 12px', borderBottom: '1px solid #EEF2F6', textAlign: 'left',
};
const td: React.CSSProperties = { padding: '11px 12px', borderBottom: '1px solid #F4F6F9', fontSize: 13, color: '#475569' };
const tdName: React.CSSProperties = { ...td, fontWeight: 700, color: '#1E293B' };

const removeBtn: React.CSSProperties = {
  flexShrink: 0, width: 32, height: 32, borderRadius: 8,
  border: '1px solid #f1416c33', background: '#fff1f3', color: '#9b1c44', cursor: 'pointer',
};
const addBtn: React.CSSProperties = {
  marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'Inter',
  fontSize: 12.5, fontWeight: 600, padding: '7px 14px', borderRadius: 8,
  border: '1px dashed #cbd5e1', background: '#fff', color: '#475569', cursor: 'pointer',
};
const seedBtn: React.CSSProperties = {
  ...addBtn, borderStyle: 'solid', borderColor: '#AA393D33', color: '#AA393D', marginLeft: 8,
};

const TeamsSection: React.FC<{ lead: any }> = ({ lead }) => {
  const allEmployees = useSelector((s: RootState) => s.allEmployees?.list) || [];

  const leadId: string = lead?.id;
  const rev: number | null = lead?.revisionCount ?? null;
  const ex = lead?.execution || {};
  const team = ex.team || null;
  const teamMembers: any[] = team?.members || [];
  const internal: any[] = lead?.internalMembers || [];
  const leadTeams: any[] = lead?.leadTeams || [];

  const empName = (id?: string | null) => employeeNameById(allEmployees, id) || id || DASH;
  const employeeOptions = useMemo(
    () => (allEmployees || [])
      .map((e: any) => ({
        value: e.employeeId || e.id,
        label: e.employeeName || `${e.users?.firstName || ''} ${e.users?.lastName || ''}`.trim() || e.name || 'Unknown',
      }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })),
    [allEmployees],
  );

  // After a save, ask the detail page to refetch the lead (it listens on this bus)
  // so read-mode values + a fresh revisionCount reflect the change.
  const saveSection = (section: 'internalTeam' | 'externalTeam', data: any) =>
    updateLeadSection(leadId, section, data, rev).then(() => {
      if (leadId) eventBus.emit(EVENT_KEYS.leadUpdated, { id: leadId });
    });

  // ── Internal roster: persisted members win; otherwise fall back to the live
  //    execution-team roster so the team's employees show up automatically the
  //    moment a team is selected (before anything is saved). ────────────────────
  const teamRoster = useMemo(
    () => teamMembers
      .map((tm: any) => ({ employeeId: tm.employeeId, startDate: '', endDate: '', isActive: true, source: 'team' }))
      .filter((m: any) => m.employeeId),
    [teamMembers],
  );
  const persisted = internal.length > 0;
  const displayMembers: any[] = persisted ? internal : teamRoster;

  // ── External roster = the lead-form company/client connections (leadTeams),
  //    editable here with the SAME cascading dropdowns the lead form uses:
  //    Company Type → Company → Sub Company → Contact Person. ──────────────────
  const stakeholders = useMemo(
    () => leadTeams.map((t: any) => ({
      name: t?.company?.companyName || t?.subCompany?.subCompanyName || DASH,
      type: t?.companyType?.name || '',
      subCompany: t?.subCompany?.subCompanyName || '',
      contact: t?.contact?.fullName || '',
      phone: t?.contact?.phone || t?.company?.phone || '',
    })),
    [leadTeams],
  );

  // Cascade option sources (mirrors the lead form's Address To widget).
  const [companyTypes, setCompanyTypes] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [subCompaniesByCompany, setSubCompaniesByCompany] = useState<Record<string, any[]>>({});
  const [contactsByCompany, setContactsByCompany] = useState<Record<string, any[]>>({});

  useEffect(() => {
    getAllCompanyTypes().then((r: any) => setCompanyTypes(r?.companyTypes || [])).catch(() => {});
    getAllClientCompanies(true).then((r: any) => setCompanies(r?.data?.companies || [])).catch(() => {});
  }, []);

  // Lazily load a company's sub-companies + contacts (cached per company id).
  const ensureCompanyDeps = useCallback((companyId?: string) => {
    if (!companyId) return;
    setSubCompaniesByCompany(prev => {
      if (prev[companyId]) return prev;
      fetchSubCompaniesByMainCompanyId(companyId)
        .then((r: any) => setSubCompaniesByCompany(p => ({ ...p, [companyId]: r?.data?.subCompanies || r?.subCompanies || [] })))
        .catch(() => setSubCompaniesByCompany(p => ({ ...p, [companyId]: [] })));
      return { ...prev, [companyId]: [] };
    });
    setContactsByCompany(prev => {
      if (prev[companyId]) return prev;
      getClientContactsByCompanyId(companyId)
        .then((r: any) => setContactsByCompany(p => ({ ...p, [companyId]: r?.data?.contacts || [] })))
        .catch(() => setContactsByCompany(p => ({ ...p, [companyId]: [] })));
      return { ...prev, [companyId]: [] };
    });
  }, []);

  // Preload deps for companies already on the lead so the edit dropdowns are ready.
  useEffect(() => {
    leadTeams.forEach((t: any) => ensureCompanyDeps(t?.company?.id || t?.companyId));
  }, [leadTeams, ensureCompanyDeps]);

  const companyTypeOptions = useMemo(() => companyTypes.map((t: any) => ({ value: t.id, label: t.name })), [companyTypes]);
  const companyOptionsFor = (typeId?: string) => companies
    .filter((c: any) => !typeId || c.companyTypeId === typeId)
    .map((c: any) => ({ value: c.id, label: c.companyName }));
  const subCompanyOptionsFor = (companyId?: string) => (subCompaniesByCompany[companyId || ''] || [])
    .map((s: any) => ({ value: s.id, label: s.subCompanyName || s.name }));
  const contactOptionsFor = (companyId?: string) => (contactsByCompany[companyId || ''] || [])
    .map((c: any) => ({ value: c.id, label: c.fullName || c.name }));

  return (
    <div>
      {/* ── Roster summary strip ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Internal members', value: displayMembers.length, icon: 'bi bi-person-badge', color: '#2563eb' },
          { label: 'Active now', value: displayMembers.filter(m => m.isActive !== false).length, icon: 'bi bi-check-circle', color: '#16a34a' },
          { label: 'External stakeholders', value: stakeholders.length, icon: 'bi bi-buildings', color: '#7c3aed' },
        ].map(k => (
          <div key={k.label} style={{ flex: '1 1 160px', minWidth: 160, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#fff', border: '1px solid #EEF2F6', borderRadius: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: `${k.color}14`, color: k.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className={k.icon} style={{ fontSize: 17 }} />
            </div>
            <div>
              <div style={{ fontFamily: 'Inter', fontSize: 20, fontWeight: 800, color: '#1E293B', lineHeight: 1 }}>{k.value}</div>
              <div style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 4 }}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Internal Team ─────────────────────────────────────────────────── */}
      <div className="row g-5 mb-2">
        <div className="col-12">
          <EditableDetailCard
            title="Internal Team"
            subtitle={team?.name ? `Execution team · ${team.name}` : 'No execution team selected'}
            icon="bi bi-person-workspace"
            accentColor="blue"
            values={{
              // Seed the edit draft from persisted members, or the live team roster
              // when nothing's saved yet — so the first Edit already lists the team.
              internalMembers: displayMembers.map(m => ({
                id: m.id,
                employeeId: m.employeeId || '',
                startDate: m.startDate || '',
                endDate: m.endDate || '',
                isActive: m.isActive !== false,
                source: m.source || 'team',
              })),
            }}
            onSave={d => saveSection('internalTeam', { internalMembers: (d.internalMembers || []).filter((m: any) => m.employeeId) })}
          >
            {({ editing, draft, set }) => {
              const rows: any[] = draft.internalMembers || [];
              const update = (i: number, patch: any) => { const next = [...rows]; next[i] = { ...next[i], ...patch }; set({ internalMembers: next }); };
              const remove = (i: number) => set({ internalMembers: rows.filter((_, idx) => idx !== i) });
              const add = () => set({ internalMembers: [...rows, { employeeId: '', startDate: '', endDate: '', isActive: true, source: 'adhoc' }] });
              const seedFromTeam = () => {
                const present = new Set(rows.map(r => r.employeeId).filter(Boolean));
                const toAdd = teamMembers
                  .map((tm: any) => tm.employeeId)
                  .filter((id: string) => id && !present.has(id))
                  .map((employeeId: string) => ({ employeeId, startDate: '', endDate: '', isActive: true, source: 'team' }));
                if (toAdd.length) set({ internalMembers: [...rows, ...toAdd] });
              };

              if (!editing) {
                if (displayMembers.length === 0) {
                  return (
                    <EmptyState
                      icon="bi bi-people"
                      title="No internal members yet"
                      message={team?.name
                        ? `The ${team.name} team has no members. Click Edit to add people individually.`
                        : 'No execution team is selected. Pick one in Summary → Project → Ownership, or click Edit to add members individually.'}
                    />
                  );
                }
                return (
                  <div>
                    {!persisted && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', marginBottom: 10, borderRadius: 8, background: '#eff6ff', border: '1px solid #bfdbfe', fontFamily: 'Inter', fontSize: 12.5, color: '#1e40af' }}>
                        <i className="bi bi-info-circle" />
                        <span>Showing the <strong>{team?.name}</strong>. Click <strong>Edit</strong> to set each member's start/end dates &amp; status, then Save to start tracking.</span>
                      </div>
                    )}
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Inter' }}>
                        <thead>
                          <tr>{['Employee', 'Start Date', 'End Date', 'Status', 'Source'].map(h => <th key={h} style={th}>{h}</th>)}</tr>
                        </thead>
                        <tbody>
                          {displayMembers.map((m, i) => (
                            <tr key={m.id || m.employeeId || i}>
                              <td style={tdName}>{empName(m.employeeId)}</td>
                              <td style={td}>{m.startDate ? fmtDate(m.startDate) : DASH}</td>
                              <td style={td}>{m.endDate ? fmtDate(m.endDate) : DASH}</td>
                              <td style={td}><DetailStatusBadge status={m.isActive !== false ? 'Active' : 'Inactive'} color={m.isActive !== false ? '#16a34a' : '#94A3B8'} /></td>
                              <td style={td}>{m.source === 'adhoc' ? 'Added' : 'Team'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              }

              return (
                <div>
                  {/* column captions for the edit grid */}
                  {rows.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, padding: '0 0 6px', fontFamily: 'Inter', fontSize: 10.5, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      <div style={{ flex: 2, minWidth: 160 }}>Employee</div>
                      <div style={{ flex: 1, minWidth: 130 }}>Start</div>
                      <div style={{ flex: 1, minWidth: 130 }}>End</div>
                      <div style={{ flex: 1, minWidth: 120 }}>Status</div>
                      <div style={{ width: 32 }} />
                    </div>
                  )}
                  {rows.length === 0 && (
                    <div style={{ fontFamily: 'Inter', fontSize: 13, color: '#94A3B8', padding: '8px 0 12px' }}>No members yet — add one below{team?.name ? ` or seed the whole ${team.name} team` : ''}.</div>
                  )}
                  {rows.map((m, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F4F6F9' }}>
                      <div style={{ flex: 2, minWidth: 160 }}><SelectEditor value={m.employeeId} options={employeeOptions} onChange={v => update(i, { employeeId: v })} placeholder="Select employee" /></div>
                      <div style={{ flex: 1, minWidth: 130 }}><DateEditor value={m.startDate} onChange={v => update(i, { startDate: v })} /></div>
                      <div style={{ flex: 1, minWidth: 130 }}><DateEditor value={m.endDate} onChange={v => update(i, { endDate: v })} /></div>
                      <div style={{ flex: 1, minWidth: 120 }}><ToggleEditor value={m.isActive !== false} onChange={v => update(i, { isActive: v })} onLabel="Active" offLabel="Inactive" /></div>
                      <button type="button" onClick={() => remove(i)} title="Remove" style={removeBtn}><i className="bi bi-trash" /></button>
                    </div>
                  ))}
                  <button type="button" onClick={add} style={addBtn}><i className="bi bi-plus-lg" /> Add member</button>
                  {teamMembers.length > 0 && (
                    <button type="button" onClick={seedFromTeam} style={seedBtn}>
                      <i className="bi bi-people-fill" /> Seed from {team?.name || 'team'}
                    </button>
                  )}
                </div>
              );
            }}
          </EditableDetailCard>
        </div>
      </div>

      {/* ── External Team ─────────────────────────────────────────────────── */}
      <div className="row g-5 mb-2">
        <div className="col-12">
          <EditableDetailCard
            title="External Team"
            subtitle="Client & external stakeholders"
            icon="bi bi-buildings"
            accentColor="purple"
            values={{
              leadTeams: leadTeams.map((t: any) => ({
                id: t.id,
                companyTypeId: t?.companyType?.id || t?.companyTypeId || '',
                companyId: t?.company?.id || t?.companyId || '',
                subCompanyId: t?.subCompany?.id || t?.subCompanyId || '',
                contactId: t?.contact?.id || t?.contactId || '',
              })),
            }}
            onSave={d => saveSection('externalTeam', {
              leadTeams: (d.leadTeams || []).filter((t: any) => t.companyTypeId || t.companyId || t.subCompanyId || t.contactId),
            })}
          >
            {({ editing, draft, set }) => {
              const rows: any[] = draft.leadTeams || [];
              const update = (i: number, patch: any) => { const next = [...rows]; next[i] = { ...next[i], ...patch }; set({ leadTeams: next }); };
              const remove = (i: number) => set({ leadTeams: rows.filter((_, idx) => idx !== i) });
              const add = () => set({ leadTeams: [...rows, { companyTypeId: '', companyId: '', subCompanyId: '', contactId: '' }] });
              // Changing a company resets its dependent selects and lazy-loads options.
              const onCompanyChange = (i: number, companyId: string) => { update(i, { companyId, subCompanyId: '', contactId: '' }); ensureCompanyDeps(companyId); };

              if (!editing) {
                return stakeholders.length === 0 ? (
                  <EmptyState icon="bi bi-buildings" title="No external stakeholders" message="Click Edit to link the client — Company Type, Company, Sub Company and Contact Person — just like the lead form." />
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Inter' }}>
                      <thead><tr>{['Company / Client', 'Type', 'Sub Company', 'Contact', 'Phone'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
                      <tbody>
                        {stakeholders.map((s, i) => (
                          <tr key={i}>
                            <td style={tdName}>{s.name}</td>
                            <td style={td}>{s.type || DASH}</td>
                            <td style={td}>{s.subCompany || DASH}</td>
                            <td style={td}>{s.contact || DASH}</td>
                            <td style={td}>{s.phone || DASH}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              }

              return (
                <div>
                  {rows.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, padding: '0 0 6px', fontFamily: 'Inter', fontSize: 10.5, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      <div style={{ flex: 1, minWidth: 140 }}>Company Type</div>
                      <div style={{ flex: 1, minWidth: 150 }}>Company</div>
                      <div style={{ flex: 1, minWidth: 150 }}>Sub Company</div>
                      <div style={{ flex: 1, minWidth: 150 }}>Contact Person</div>
                      <div style={{ width: 32 }} />
                    </div>
                  )}
                  {rows.length === 0 && (
                    <div style={{ fontFamily: 'Inter', fontSize: 13, color: '#94A3B8', padding: '8px 0 12px' }}>No client company linked yet — add one below.</div>
                  )}
                  {rows.map((t, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F4F6F9' }}>
                      <div style={{ flex: 1, minWidth: 140 }}><SelectEditor value={t.companyTypeId} options={companyTypeOptions} onChange={v => update(i, { companyTypeId: v })} placeholder="Select type" /></div>
                      <div style={{ flex: 1, minWidth: 150 }}><SelectEditor value={t.companyId} options={companyOptionsFor(t.companyTypeId)} onChange={v => onCompanyChange(i, v)} placeholder="Select company" /></div>
                      <div style={{ flex: 1, minWidth: 150 }}><SelectEditor value={t.subCompanyId} options={subCompanyOptionsFor(t.companyId)} onChange={v => update(i, { subCompanyId: v })} placeholder={t.companyId ? 'Sub company' : '—'} /></div>
                      <div style={{ flex: 1, minWidth: 150 }}><SelectEditor value={t.contactId} options={contactOptionsFor(t.companyId)} onChange={v => update(i, { contactId: v })} placeholder={t.companyId ? 'Contact' : '—'} /></div>
                      <button type="button" onClick={() => remove(i)} title="Remove" style={removeBtn}><i className="bi bi-trash" /></button>
                    </div>
                  ))}
                  <button type="button" onClick={add} style={addBtn}><i className="bi bi-plus-lg" /> Add client company connection</button>
                </div>
              );
            }}
          </EditableDetailCard>
        </div>
      </div>
    </div>
  );
};

export default TeamsSection;
