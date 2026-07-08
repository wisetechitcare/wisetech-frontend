import React, { useMemo, useState, useEffect } from 'react';
import { Modal } from 'react-bootstrap';
import { useSelector } from 'react-redux';
import type { RootState } from '@redux/store';
import eventBus from '@utils/EventBus';
import { EVENT_KEYS } from '@constants/eventKeys';
import { DetailStatusBadge } from '@app/modules/detail-page/DetailPageComponents';
import {
  EditableDetailCard, SelectEditor, SearchableSelectEditor, DateEditor, ToggleEditor,
} from '@app/modules/detail-page/EditableDetailCard';
import { updateLeadSection } from '@services/leadService';
import { getAllCompanyTypes, getAllClientCompanies, getAllClientContacts, getAllSubCompanies } from '@services/companies';
import { getAllTeams } from '@services/projects';
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
  letterSpacing: 0.5, padding: '10px 12px', borderBottom: '1px solid #EEF2F6', textAlign: 'left', whiteSpace: 'nowrap',
};
const td: React.CSSProperties = { padding: '11px 12px', borderBottom: '1px solid #F4F6F9', fontSize: 13, color: '#475569', whiteSpace: 'nowrap' };
const tdName: React.CSSProperties = { ...td, fontWeight: 700, color: '#1E293B', whiteSpace: 'nowrap' };

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
  const saveSection = (section: 'internalTeam' | 'externalTeam' | 'executionTeam', data: any) =>
    updateLeadSection(leadId, section, data, rev).then(() => {
      if (leadId) eventBus.emit(EVENT_KEYS.leadUpdated, { id: leadId });
    });

  // ── Execution team picker (also settable from Summary → Ownership). A button
  //    opens a dialog with its own explicit Save — nothing is written until the
  //    user confirms. Writes ONLY leadExecution.teamId via the dedicated
  //    `executionTeam` section (so PM/status are untouched); the refetch then
  //    re-seeds the roster from the new team's members. ──────────────────────────
  const [teams, setTeams] = useState<any[]>([]);
  const [savingTeam, setSavingTeam] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [draftTeamId, setDraftTeamId] = useState<string>(ex.teamId || '');

  useEffect(() => {
    getAllTeams(1, 9999).then((r: any) => setTeams(r?.data?.teams || r?.teams || [])).catch(() => {});
  }, []);

  const teamOptions = useMemo(
    () => (teams || []).map((t: any) => ({ value: t.id, label: t.name || t.teamName || 'Unnamed Team' })),
    [teams],
  );

  const openTeamModal = () => {
    setDraftTeamId(ex.teamId || '');
    setShowTeamModal(true);
  };

  const confirmTeamChange = () => {
    if (draftTeamId === (ex.teamId || '') || savingTeam) return;
    setSavingTeam(true);
    saveSection('executionTeam', { teamId: draftTeamId || null })
      .then(() => setShowTeamModal(false))
      .catch((e: any) => {
        // eslint-disable-next-line no-alert
        alert(e?.response?.data?.message || 'Could not update the execution team. Please try again.');
      })
      .finally(() => setSavingTeam(false));
  };

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
      companyAvatar: t?.company?.companyLogo || t?.company?.logo || null,
      type: t?.companyType?.name || '',
      subCompany: t?.subCompany?.subCompanyName || '',
      contact: t?.contact?.fullName || '',
      contactAvatar: t?.contact?.avatar || t?.contact?.users?.avatar || null,
      phone: t?.contact?.phone || t?.company?.phone || '',
    })),
    [leadTeams],
  );

  // Cascade option sources (mirrors the lead form's Address To widget). We load
  // the FULL contact + sub-company masters up front (like the lead form) so any
  // field can drive the others *in reverse*: pick a Contact — or a Sub Company —
  // and its Company + Company Type back-fill automatically. Each carries the FK
  // (contact.companyId/subCompanyId, subCompany.mainCompanyId, company.companyTypeId)
  // that makes the reverse lookup possible.
  const [companyTypes, setCompanyTypes] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [allSubCompanies, setAllSubCompanies] = useState<any[]>([]);
  const [allContacts, setAllContacts] = useState<any[]>([]);

  useEffect(() => {
    getAllCompanyTypes().then((r: any) => setCompanyTypes(r?.companyTypes || [])).catch(() => {});
    getAllClientCompanies(true).then((r: any) => setCompanies(r?.data?.companies || [])).catch(() => {});
    getAllSubCompanies().then((r: any) => setAllSubCompanies(r?.data?.subCompanies || r?.subCompanies || [])).catch(() => {});
    getAllClientContacts({}, true).then((r: any) => setAllContacts(r?.data?.contacts || [])).catch(() => {});
  }, []);

  // Reverse-lookup maps (id → record) that power the auto-fill handlers below.
  const companyById = useMemo(() => new Map(companies.map((c: any) => [String(c.id), c])), [companies]);
  const subCompanyById = useMemo(() => new Map(allSubCompanies.map((s: any) => [String(s.id), s])), [allSubCompanies]);
  const contactById = useMemo(() => new Map(allContacts.map((c: any) => [String(c.id), c])), [allContacts]);
  const companyNameById = useMemo(() => new Map(companies.map((c: any) => [String(c.id), c.companyName])), [companies]);

  const byLabel = (a: { label: string }, b: { label: string }) =>
    a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });

  const companyTypeOptions = useMemo(
    () => companyTypes.map((t: any) => ({ value: t.id, label: t.name })).sort(byLabel),
    [companyTypes],
  );
  const companyOptionsFor = (typeId?: string) => companies
    .filter((c: any) => !typeId || c.companyTypeId === typeId)
    .map((c: any) => ({ 
      value: c.id, 
      label: c.companyName,
      avatar: c.companyLogo || c.logo || null 
    }))
    .sort(byLabel);
  // Sub-companies/contacts are filtered to the chosen company when one is set,
  // but list EVERYTHING (tagged with its company name) when it isn't — so the
  // user can pick one first and let it back-fill the company.
  const subCompanyOptionsFor = (companyId?: string) => (companyId
    ? allSubCompanies.filter((s: any) => String(s.mainCompanyId) === String(companyId))
    : allSubCompanies)
    .map((s: any) => {
      const base = s.subCompanyName || s.name;
      const cn = companyNameById.get(String(s.mainCompanyId));
      return { value: s.id, label: (!companyId && cn) ? `${base} — ${cn}` : base };
    })
    .sort(byLabel);
  const contactOptionsFor = (companyId?: string) => (companyId
    ? allContacts.filter((c: any) => String(c.companyId) === String(companyId))
    : allContacts)
    .map((c: any) => {
      const base = c.fullName || c.name || 'Unnamed Contact';
      const cn = companyNameById.get(String(c.companyId));
      return { 
        value: c.id, 
        label: cn ? `${base} — ${cn}` : base,
        avatar: c.avatar || c.users?.avatar || null 
      };
    })
    .sort(byLabel);

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
      <div className="row mb-4">
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

              // Execution-team control — a button that opens a dialog with its own
              // explicit Save (same target as Summary → Ownership). Shown in read
              // mode above the roster; nothing is written until Save is clicked.
              const teamPicker = (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', marginBottom: 14, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: '#2563eb14', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className="bi bi-diagram-3" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Execution Team</div>
                    <div style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 700, color: '#1E293B', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{team?.name || 'No team selected'}</div>
                  </div>
                  <button type="button" onClick={openTeamModal} style={{ ...addBtn, marginTop: 0, flexShrink: 0, whiteSpace: 'nowrap' }}>
                    <i className="bi bi-arrow-left-right" /> {team?.name ? 'Change Team' : 'Assign Team'}
                  </button>
                </div>
              );

              if (!editing) {
                const readBody = displayMembers.length === 0 ? (
                  <EmptyState
                    icon="bi bi-people"
                    title="No internal members yet"
                    message={team?.name
                      ? `The ${team.name} team has no members. Click Edit to add people individually.`
                      : 'No execution team is selected. Pick one above, or click Edit to add members individually.'}
                  />
                ) : (
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
                return <div>{teamPicker}{readBody}</div>;
              }

              return (
                <div>
                  <div style={{ overflowX: 'auto' }}>
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
                  </div>
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

      {/* Execution-team dialog: opened by the "Assign/Change Team" button above.
          Nothing is written until Save is clicked. */}
      <Modal show={showTeamModal} onHide={() => !savingTeam && setShowTeamModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: 14, fontWeight: 600 }}>Assign Execution Team</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: 16 }}>
          <div style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
            Execution Team
          </div>
          <SearchableSelectEditor value={draftTeamId} options={teamOptions} onChange={setDraftTeamId} placeholder="Select execution team" />
          <div style={{ fontFamily: 'Inter', fontSize: 12, color: '#94A3B8', marginTop: 10 }}>
            Changing the team re-seeds the Internal Team roster from the new team's members. Project Manager and Status are unaffected.
          </div>
        </Modal.Body>
        <Modal.Footer style={{ padding: 12, borderTop: '1px solid #EEF2F6' }}>
          <button type="button" className="btn btn-light btn-sm" onClick={() => setShowTeamModal(false)} disabled={savingTeam}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={confirmTeamChange}
            disabled={savingTeam || draftTeamId === (ex.teamId || '')}
            style={{ backgroundColor: '#AA393D', borderColor: '#AA393D' }}
          >
            {savingTeam ? 'Saving...' : 'Save'}
          </button>
        </Modal.Footer>
      </Modal>

      {/* ── External Team ─────────────────────────────────────────────────── */}
      <div className="row mb-4">
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
              // Forward cascade: picking a company back-fills its type and resets dependents.
              const onCompanyChange = (i: number, companyId: string) => {
                const company = companyById.get(String(companyId));
                update(i, {
                  companyId,
                  subCompanyId: '',
                  contactId: '',
                  ...(company?.companyTypeId ? { companyTypeId: String(company.companyTypeId) } : {}),
                });
              };
              // Reverse cascade: picking a sub company back-fills its company (+ type).
              const onSubCompanyChange = (i: number, subCompanyId: string) => {
                const sc = subCompanyById.get(String(subCompanyId));
                const companyId = sc?.mainCompanyId ? String(sc.mainCompanyId) : rows[i]?.companyId;
                const company = companyById.get(String(companyId));
                update(i, {
                  subCompanyId,
                  ...(companyId ? { companyId } : {}),
                  ...(company?.companyTypeId ? { companyTypeId: String(company.companyTypeId) } : {}),
                });
              };
              // Reverse cascade: picking a contact back-fills company, sub company & type.
              const onContactChange = (i: number, contactId: string) => {
                const contact = contactById.get(String(contactId));
                if (!contact) { update(i, { contactId }); return; }
                const companyId = contact.companyId ? String(contact.companyId) : rows[i]?.companyId;
                const company = companyById.get(String(companyId));
                update(i, {
                  contactId,
                  ...(companyId ? { companyId } : {}),
                  subCompanyId: contact.subCompanyId ? String(contact.subCompanyId) : (rows[i]?.subCompanyId || ''),
                  ...(company?.companyTypeId ? { companyTypeId: String(company.companyTypeId) } : {}),
                });
              };

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
                            <td style={tdName}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <img 
                                  src={s.companyAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name === DASH ? 'C' : s.name)}&background=eeeeee&color=888888&size=20&rounded=true`}
                                  alt=""
                                  style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }}
                                />
                                {s.name}
                              </div>
                            </td>
                            <td style={td}>{s.type || DASH}</td>
                            <td style={td}>{s.subCompany || DASH}</td>
                            <td style={td}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {s.contact !== DASH && s.contact !== '' && (
                                  <img 
                                    src={s.contactAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.contact)}&background=eeeeee&color=888888&size=20&rounded=true`}
                                    alt=""
                                    style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }}
                                  />
                                )}
                                {s.contact || DASH}
                              </div>
                            </td>
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
                  <div style={{ overflowX: 'auto' }}>
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
                        <div style={{ flex: 1, minWidth: 140 }}><SearchableSelectEditor value={t.companyTypeId} options={companyTypeOptions} onChange={v => update(i, { companyTypeId: v })} placeholder="Select type" /></div>
                        <div style={{ flex: 1, minWidth: 150 }}><SearchableSelectEditor value={t.companyId} options={companyOptionsFor(t.companyTypeId)} onChange={v => onCompanyChange(i, v)} placeholder="Select company" showColor /></div>
                        <div style={{ flex: 1, minWidth: 150 }}><SearchableSelectEditor value={t.subCompanyId} options={subCompanyOptionsFor(t.companyId)} onChange={v => onSubCompanyChange(i, v)} placeholder="Select sub company" /></div>
                        <div style={{ flex: 1, minWidth: 150 }}><SearchableSelectEditor value={t.contactId} options={contactOptionsFor(t.companyId)} onChange={v => onContactChange(i, v)} placeholder="Select contact" showColor /></div>
                        <button type="button" onClick={() => remove(i)} title="Remove" style={removeBtn}><i className="bi bi-trash" /></button>
                      </div>
                    ))}
                  </div>
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
