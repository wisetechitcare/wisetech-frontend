import React, { useMemo, useState, useEffect } from 'react';
import { Modal } from 'react-bootstrap';
import Swal from 'sweetalert2';
import { useSelector } from 'react-redux';
import type { RootState } from '@redux/store';
import eventBus from '@utils/EventBus';
import { EVENT_KEYS } from '@constants/eventKeys';
import { DetailStatusBadge } from '@app/modules/detail-page/DetailPageComponents';
import {
  EditableDetailCard, SelectEditor, SearchableSelectEditor, DateEditor, ToggleEditor, toDateInputValue,
} from '@app/modules/detail-page/EditableDetailCard';
import { updateLeadSection } from '@services/leadService';
import { getAllCompanyTypes, getAllClientCompanies, getAllClientContacts, getAllSubCompanies } from '@services/companies';
import { getAllTeams, getAllTeamsMember } from '@services/projects';
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
  ...addBtn, borderStyle: 'solid', borderColor: '#1E3A8A33', color: '#1E3A8A', marginLeft: 8,
};

// Roster ordering: active members first, inactive below (stable within each group).
// Used for the read-mode table and the Change-Team review list so the split is visible.
const sortByActive = (arr: any[]) =>
  [...arr].sort((a, b) => (a.isActive !== false ? 0 : 1) - (b.isActive !== false ? 0 : 1));

const TeamsSection: React.FC<{ lead: any }> = ({ lead }) => {
  const allEmployees = useSelector((s: RootState) => s.allEmployees?.list) || [];

  const leadId: string = lead?.id;
  const rev: number | null = lead?.revisionCount ?? null;
  const ex = lead?.execution || {};
  const team = ex.team || null;
  const teamMembers: any[] = team?.members || [];
  const internal: any[] = lead?.internalMembers || [];
  // External Team roster is DECOUPLED from the lead form's Address To (lead.leadTeams).
  // It reads its own project_external_teams rows — the lead's single Address To is
  // mirrored in one-way as a `syncedFromLead` row, and anything edited/added here
  // never flows back to the lead form.
  const projectExternalTeams: any[] = lead?.projectExternalTeams || [];

  const empName = (id?: string | null) => employeeNameById(allEmployees, id) || id || DASH;

  const empAvatar = (id?: string | null) => {
    if (!id || !allEmployees) return null;
    const emp: any = allEmployees.find((e: any) => String(e.employeeId || e.id) === String(id));
    return emp?.profilePhoto || emp?.avatar || emp?.users?.avatar || null;
  };

  // Employees explicitly marked inactive (offboarded/deactivated) in the master
  // list. We track the *inactive* set rather than the active one so that if the
  // employee list hasn't loaded yet we don't accidentally hide every member.
  const inactiveEmployeeIds = useMemo(
    () => new Set(
      (allEmployees || [])
        .filter((e: any) => e.isActive === false)
        .map((e: any) => String(e.employeeId || e.id)),
    ),
    [allEmployees],
  );
  const isEmployeeActive = (id?: string | null) => !!id && !inactiveEmployeeIds.has(String(id));

  const employeeOptions = useMemo(
    () => (allEmployees || [])
      .map((e: any) => ({
        value: e.employeeId || e.id,
        label: e.employeeName || `${e.users?.firstName || ''} ${e.users?.lastName || ''}`.trim() || e.name || 'Unknown',
        image: e?.profilePhoto || e?.avatar || e?.users?.avatar || null,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })),
    [allEmployees],
  );

  const formatEmployeeOption = (option: any) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {option.image ? (
        <img src={option.image} alt={option.label} style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
      ) : (
        <div style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: '#64748B' }}>
          {option.label.charAt(0).toUpperCase()}
        </div>
      )}
      <span>{option.label}</span>
    </div>
  );

  // After a save, ask the detail page to refetch the lead (it listens on this bus)
  // so read-mode values + a fresh revisionCount reflect the change.
  const saveSection = (section: 'internalTeam' | 'externalTeam' | 'executionTeam' | 'projectManager', data: any) =>
    updateLeadSection(leadId, section, data, rev).then(() => {
      if (leadId) eventBus.emit(EVENT_KEYS.leadUpdated, { id: leadId });
    });

  // ── Execution team picker (also settable from Summary → Ownership). A button
  //    opens a two-step dialog with its own explicit Save — nothing is written
  //    until the user confirms.
  //
  //    Step 1 picks the team; Step 2 reviews the MERGED roster. "Change Team" no
  //    longer re-seeds (which dropped the old members) — instead it KEEPS every
  //    current member and ADDS the new team's members, then lets the user mark
  //    each active/inactive with start/end dates. Save writes teamId + the merged
  //    roster together via the `executionTeam` section, so the switch and the
  //    roster persist in ONE revision (no 409 from two writes). ─────────────────
  const [teams, setTeams] = useState<any[]>([]);
  // employeeIds grouped by teamId — sourced from getAllTeamsMember() since the
  // paginated teams list doesn't embed members. Powers the merge in step 1→2.
  const [membersByTeamId, setMembersByTeamId] = useState<Map<string, string[]>>(new Map());
  const [savingTeam, setSavingTeam] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [teamStep, setTeamStep] = useState<1 | 2>(1);
  const [draftTeamId, setDraftTeamId] = useState<string>(ex.teamId || '');
  const [rosterDraft, setRosterDraft] = useState<any[]>([]);

  useEffect(() => {
    getAllTeams(1, 9999).then((r: any) => setTeams(r?.data?.teams || r?.teams || [])).catch(() => {});
    getAllTeamsMember().then((r: any) => {
      const list = r?.data?.teamMembers || r?.teamMembers || [];
      const map = new Map<string, string[]>();
      list.forEach((tm: any) => {
        const tId = String(tm.teamId || tm.team?.id || '');
        const eId = tm.employeeId || tm.employee?.id;
        if (!tId || !eId) return;
        if (!map.has(tId)) map.set(tId, []);
        map.get(tId)!.push(String(eId));
      });
      setMembersByTeamId(map);
    }).catch(() => {});
  }, []);

  const teamOptions = useMemo(
    () => (teams || []).map((t: any) => ({ value: t.id, label: t.name || t.teamName || 'Unnamed Team' })),
    [teams],
  );
  const selectedTeamName = useMemo(
    () => teamOptions.find(o => String(o.value) === String(draftTeamId))?.label || 'the selected team',
    [teamOptions, draftTeamId],
  );

  const openTeamModal = () => {
    setDraftTeamId(ex.teamId || '');
    setRosterDraft([]);
    setTeamStep(1);
    setShowTeamModal(true);
  };

  // Step 1 → 2: merge the picked team's members INTO the current roster. Existing
  // members keep their status/dates/source; brand-new members come in Active with
  // their start date defaulted to today (they're joining now — editable before Save).
  // Deactivated employees are never auto-added.
  const continueToRoster = () => {
    if (!draftTeamId) return;
    const today = toDateInputValue(new Date());
    const base = displayMembers
      .map((m: any) => ({
        id: m.id,
        employeeId: m.employeeId || '',
        startDate: m.startDate || '',
        endDate: m.endDate || '',
        isActive: m.isActive !== false,
        source: m.source || 'team',
      }))
      .filter((m: any) => m.employeeId);
    const present = new Set(base.map((m: any) => String(m.employeeId)));
    const additions = (membersByTeamId.get(String(draftTeamId)) || [])
      .filter((id: string) => id && !present.has(String(id)) && isEmployeeActive(id))
      .map((employeeId: string) => ({ employeeId, startDate: today, endDate: '', isActive: true, source: 'team', _added: true }));
    setRosterDraft([...base, ...additions]);
    setTeamStep(2);
  };

  const updateRosterRow = (i: number, patch: any) =>
    setRosterDraft(prev => prev.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  const markAllActive = (active: boolean) =>
    setRosterDraft(prev =>
      prev.map(m => ({
        ...m,
        isActive: active,
        // Inactive → stamp today's end date (keep an existing one); Active → clear it.
        endDate: active ? '' : (m.endDate || toDateInputValue(new Date())),
      }))
    );

  /**
   * Status toggle with end-date safety. Inactive stamps today's End date; Active
   * clears it. When the row ALREADY has an End date, we don't silently overwrite —
   * we confirm first, then let the user pick the new (today / cleared) value or keep
   * the existing one. `apply` writes the resolved patch back to the right row.
   */
  const applyStatusToggle = async (
    newActive: boolean,
    row: any,
    apply: (patch: { isActive: boolean; endDate: string }) => void,
  ) => {
    const today = toDateInputValue(new Date());
    const autoEnd = newActive ? '' : today; // reactivating clears; inactivating stamps today

    // No existing End date → apply the auto behaviour instantly, no prompt.
    if (!row?.endDate) {
      apply({ isActive: newActive, endDate: autoEnd });
      return;
    }

    // There's an existing End date — confirm before touching it.
    const confirm = await Swal.fire({
      title: 'This will change the End date',
      html: `This member already has an End date of <b>${fmtDate(row.endDate)}</b>. ${
        newActive ? 'Reactivating' : 'Marking inactive'
      } will affect it. Do you want to continue?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Continue',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#1E3A8A',
    });
    if (!confirm.isConfirmed) return; // leave status + end date untouched

    // Let the user choose which End date to keep.
    const choice = await Swal.fire({
      title: 'Which End date should apply?',
      icon: 'question',
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: newActive ? 'Clear end date' : `Use today (${fmtDate(today)})`,
      denyButtonText: `Keep existing (${fmtDate(row.endDate)})`,
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#1E3A8A',
    });
    if (choice.isDismissed) return; // cancelled → no change at all

    // Confirm = new/auto value; Deny = keep the existing date.
    const endDate = choice.isConfirmed ? autoEnd : row.endDate;
    apply({ isActive: newActive, endDate });
  };

  const confirmTeamChange = () => {
    if (savingTeam || !draftTeamId) return;
    setSavingTeam(true);
    // Persist active-first so the saved order matches how the roster reads back.
    const members = sortByActive(rosterDraft)
      .filter((m: any) => m.employeeId)
      .map((m: any) => ({
        employeeId: m.employeeId,
        startDate: m.startDate || '',
        endDate: m.endDate || '',
        isActive: m.isActive !== false,
        source: m.source === 'adhoc' ? 'adhoc' : 'team',
      }));
    saveSection('executionTeam', { teamId: draftTeamId || null, internalMembers: members })
      .then(() => setShowTeamModal(false))
      .catch((e: any) => {
        // eslint-disable-next-line no-alert
        alert(e?.response?.data?.message || 'Could not update the execution team. Please try again.');
      })
      .finally(() => setSavingTeam(false));
  };

  // ── Project Manager picker — same pattern as the Execution Team picker above:
  //    a button opens a dialog with its own explicit Save, writing ONLY
  //    leadExecution.projectManagerId via the dedicated `projectManager` section
  //    (team/status/access/flags stay untouched). ─────────────────────────────
  const [savingPm, setSavingPm] = useState(false);
  const [showPmModal, setShowPmModal] = useState(false);
  const [draftPmId, setDraftPmId] = useState<string>(ex.projectManagerId || '');

  const openPmModal = () => {
    setDraftPmId(ex.projectManagerId || '');
    setShowPmModal(true);
  };

  const confirmPmChange = () => {
    if (draftPmId === (ex.projectManagerId || '') || savingPm) return;
    setSavingPm(true);
    saveSection('projectManager', { projectManagerId: draftPmId || null })
      .then(() => setShowPmModal(false))
      .catch((e: any) => {
        // eslint-disable-next-line no-alert
        alert(e?.response?.data?.message || 'Could not update the project manager. Please try again.');
      })
      .finally(() => setSavingPm(false));
  };

  // ── Internal roster: persisted members win; otherwise fall back to the live
  //    execution-team roster so the team's employees show up automatically the
  //    moment a team is selected (before anything is saved). ────────────────────
  const teamRoster = useMemo(
    () => teamMembers
      .map((tm: any) => ({ employeeId: tm.employeeId, startDate: '', endDate: '', isActive: true, source: 'team' }))
      // Skip employees who have been deactivated — they shouldn't seed onto a
      // project roster just because they still belong to the execution team.
      .filter((m: any) => m.employeeId && isEmployeeActive(m.employeeId)),
    [teamMembers, inactiveEmployeeIds],
  );
  const persisted = internal.length > 0;
  const displayMembers: any[] = persisted ? internal : teamRoster;

  // ── External roster = the project's OWN stakeholders (projectExternalTeams),
  //    editable here with the SAME cascading dropdowns the lead form uses:
  //    Company Type → Company → Sub Company → Contact Person. FKs are scalar, so
  //    display names are resolved from the loaded masters (stakeholders memo,
  //    defined below the resolver maps). ───────────────────────────────────────

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
  const companyTypeById = useMemo(() => new Map(companyTypes.map((t: any) => [String(t.id), t])), [companyTypes]);

  // External roster view model — resolves scalar FKs (companyTypeId/companyId/
  // subCompanyId/contactId) against the loaded masters. `syncedFromLead` marks the
  // row mirrored one-way from the lead's Address To.
  const stakeholders = useMemo(
    () =>
      projectExternalTeams
        .map((t: any) => {
          const company = companyById.get(String(t.companyId));
          const subCompany = subCompanyById.get(String(t.subCompanyId));
          const contact = contactById.get(String(t.contactId));
          const companyType = companyTypeById.get(String(t.companyTypeId));
          return {
            name: company?.companyName || subCompany?.subCompanyName || subCompany?.name || DASH,
            companyAvatar: company?.companyLogo || company?.logo || null,
            type: companyType?.name || '',
            subCompany: subCompany?.subCompanyName || subCompany?.name || '',
            contact: contact?.fullName || contact?.name || '',
            contactAvatar: contact?.profilePhoto || contact?.avatar || contact?.users?.avatar || null,
            designation: contact?.roleInCompany || '',
            phone: contact?.phone || company?.phone || '',
            startDate: t?.startDate || '',
            endDate: t?.endDate || '',
            isActive: t?.isActive !== false,
            syncedFromLead: t?.syncedFromLead === true,
          };
        })
        // Active before Inactive, then company/client name A→Z within each group.
        .sort((a, b) => {
          const aActive = a.isActive ? 0 : 1;
          const bActive = b.isActive ? 0 : 1;
          if (aActive !== bActive) return aActive - bActive;
          return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
        }),
    [projectExternalTeams, companyById, subCompanyById, contactById, companyTypeById],
  );

  const byLabel = (a: { label: string }, b: { label: string }) =>
    a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });

  // Company Type dropdown — TOP-LEVEL (main) types only, matching the Company
  // form. A type is a sub-type/service when its parentTypeId points to a valid
  // top-level parent; those are excluded. Orphans (missing/invalid parent) are
  // kept so nothing silently disappears.
  const companyTypeOptions = useMemo(() => {
    const typeById = new Map(companyTypes.map((t: any) => [t.id, t]));
    const parentIsTopLevel = (pid: any) => {
      const p = typeById.get(pid);
      return !!p && (!p.parentTypeId || !typeById.has(p.parentTypeId));
    };
    const isSub = (t: any) =>
      !!(t.parentTypeId && typeById.has(t.parentTypeId) && parentIsTopLevel(t.parentTypeId));
    return companyTypes
      .filter((t: any) => !isSub(t))
      .map((t: any) => ({ value: t.id, label: t.name }))
      .sort(byLabel);
  }, [companyTypes]);
  const companyOptionsFor = (typeId?: string) => companies
    .filter((c: any) => !typeId || c.companyTypeId === typeId)
    .map((c: any) => ({ 
      value: c.id, 
      label: c.companyName,
      avatar: c.companyLogo || c.logo || null 
    }))
    .sort(byLabel);
  // Sub-companies/contacts are filtered to the chosen company when one is set,
  // but list EVERYTHING when it isn't — so the user can pick one first and let
  // it back-fill the company (sub-companies stay tagged with their company).
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
    .map((c: any) => ({
      value: c.id,
      label: c.fullName || c.name || 'Unnamed Contact',
      avatar: c.profilePhoto || c.avatar || c.users?.avatar || null,
    }))
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
              // Active first, inactive below (matches the read table + roster save order).
              internalMembers: sortByActive(displayMembers).map(m => ({
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
              // New rows default their start date to today (member joining now);
              // the date stays editable before Save.
              const add = () => set({ internalMembers: [...rows, { employeeId: '', startDate: toDateInputValue(new Date()), endDate: '', isActive: true, source: 'adhoc' }] });
              const seedFromTeam = () => {
                const today = toDateInputValue(new Date());
                const present = new Set(rows.map(r => r.employeeId).filter(Boolean));
                const toAdd = teamMembers
                  .map((tm: any) => tm.employeeId)
                  // Don't seed deactivated employees onto the roster.
                  .filter((id: string) => id && !present.has(id) && isEmployeeActive(id))
                  .map((employeeId: string) => ({ employeeId, startDate: today, endDate: '', isActive: true, source: 'team' }));
                if (toAdd.length) set({ internalMembers: [...rows, ...toAdd] });
              };

              // Execution-team / Project-manager controls — each a button that opens
              // its own dialog with its own explicit Save (same targets as Summary →
              // Ownership). Shown in read mode above the roster; nothing is written
              // until Save is clicked.
              const teamPicker = (
                <div style={{ flex: 1, minWidth: 260, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10 }}>
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
              const pmName = empName(ex.projectManagerId);
              const pmPicker = (
                <div style={{ flex: 1, minWidth: 260, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: '#7c3aed14', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className="bi bi-person-workspace" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Project Manager</div>
                    <div style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 700, color: '#1E293B', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ex.projectManagerId ? pmName : 'No manager selected'}</div>
                  </div>
                  <button type="button" onClick={openPmModal} style={{ ...addBtn, marginTop: 0, flexShrink: 0, whiteSpace: 'nowrap' }}>
                    <i className="bi bi-arrow-left-right" /> {ex.projectManagerId ? 'Change Manager' : 'Assign Manager'}
                  </button>
                </div>
              );
              const ownershipPickers = (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
                  {teamPicker}
                  {pmPicker}
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
                          {[...displayMembers]
                            .sort((a, b) => {
                              // Active before Inactive, then employee name A→Z within each group.
                              const aActive = a.isActive !== false ? 0 : 1;
                              const bActive = b.isActive !== false ? 0 : 1;
                              if (aActive !== bActive) return aActive - bActive;
                              return empName(a.employeeId).localeCompare(
                                empName(b.employeeId),
                                undefined,
                                { sensitivity: 'base' }
                              );
                            })
                            .map((m, i) => (
                            <tr key={m.id || m.employeeId || i}>
                              <td style={tdName}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <img 
                                    src={empAvatar(m.employeeId) || `https://ui-avatars.com/api/?name=${encodeURIComponent(empName(m.employeeId) === DASH ? '?' : empName(m.employeeId))}&background=eeeeee&color=888888&size=20&rounded=true`}
                                    alt=""
                                    style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }}
                                  />
                                  {empName(m.employeeId)}
                                </div>
                              </td>
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
                return <div>{ownershipPickers}{readBody}</div>;
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
                        <div style={{ flex: 2, minWidth: 160 }}><SearchableSelectEditor value={m.employeeId} options={employeeOptions} onChange={v => update(i, { employeeId: v })} placeholder="Select employee" formatOptionLabel={formatEmployeeOption} /></div>
                        <div style={{ flex: 1, minWidth: 130 }}><DateEditor value={m.startDate} onChange={v => update(i, { startDate: v })} /></div>
                        <div style={{ flex: 1, minWidth: 130 }}><DateEditor value={m.endDate} onChange={v => update(i, { endDate: v })} /></div>
                        <div style={{ flex: 1, minWidth: 120 }}><ToggleEditor value={m.isActive !== false} onChange={v => applyStatusToggle(v, m, patch => update(i, patch))} onLabel="Active" offLabel="Inactive" /></div>
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
          Two steps — (1) pick the team, (2) review the merged roster & set each
          member active/inactive. Nothing is written until Save on step 2. */}
      <Modal show={showTeamModal} onHide={() => !savingTeam && setShowTeamModal(false)} centered scrollable size={teamStep === 2 ? 'lg' : undefined}>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: 14, fontWeight: 600 }}>
            {teamStep === 1 ? (team?.name ? 'Change Execution Team' : 'Assign Execution Team') : 'Review Team Members'}
            <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, color: '#94A3B8' }}>Step {teamStep} of 2</span>
          </Modal.Title>
        </Modal.Header>

        {teamStep === 1 ? (
          <>
            <Modal.Body style={{ padding: 16 }}>
              <div style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                Execution Team
              </div>
              <SearchableSelectEditor value={draftTeamId} options={teamOptions} onChange={setDraftTeamId} placeholder="Select execution team" />
              <div style={{ display: 'flex', gap: 8, marginTop: 12, padding: '10px 12px', borderRadius: 8, background: '#eff6ff', border: '1px solid #bfdbfe', fontFamily: 'Inter', fontSize: 12.5, color: '#1e40af' }}>
                <i className="bi bi-info-circle" style={{ marginTop: 1 }} />
                <span>
                  Members already on this project are <strong>kept</strong>. The selected team's members are <strong>added</strong> to the roster.
                  On the next step you can mark anyone active or inactive. Project Manager and Status are unaffected.
                </span>
              </div>
            </Modal.Body>
            <Modal.Footer style={{ padding: 12, borderTop: '1px solid #EEF2F6' }}>
              <button type="button" className="btn btn-light btn-sm" onClick={() => setShowTeamModal(false)} disabled={savingTeam}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={continueToRoster}
                disabled={!draftTeamId}
                style={{ backgroundColor: '#1E3A8A', borderColor: '#1E3A8A' }}
              >
                Continue <i className="bi bi-arrow-right" />
              </button>
            </Modal.Footer>
          </>
        ) : (
          <>
            <Modal.Body style={{ padding: 16 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
                <div style={{ fontFamily: 'Inter', fontSize: 13, color: '#475569' }}>
                  Roster for <strong style={{ color: '#1E293B' }}>{selectedTeamName}</strong> — mark everyone as active, or inactivate specific members below.
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={() => markAllActive(true)} style={{ ...addBtn, marginTop: 0, borderColor: '#16a34a55', color: '#15803d' }}>
                    <i className="bi bi-check-all" /> Mark all active
                  </button>
                  <button type="button" onClick={() => markAllActive(false)} style={{ ...addBtn, marginTop: 0 }}>
                    <i className="bi bi-slash-circle" /> Mark all inactive
                  </button>
                </div>
              </div>

              {rosterDraft.length === 0 ? (
                <div style={{ fontFamily: 'Inter', fontSize: 13, color: '#94A3B8', padding: '16px 0' }}>
                  {selectedTeamName} has no members to add, and this project has no members yet.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <div style={{ display: 'flex', gap: 8, padding: '0 0 6px', fontFamily: 'Inter', fontSize: 10.5, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    <div style={{ flex: 2, minWidth: 180 }}>Employee</div>
                    <div style={{ flex: 1, minWidth: 120 }}>Start</div>
                    <div style={{ flex: 1, minWidth: 120 }}>End</div>
                    <div style={{ flex: 1, minWidth: 120 }}>Status</div>
                  </div>
                  {(() => {
                    const sorted = rosterDraft
                      .map((m, i) => ({ m, i }))
                      .sort((a, b) => (a.m.isActive !== false ? 0 : 1) - (b.m.isActive !== false ? 0 : 1));
                    const firstInactive = sorted.findIndex(x => x.m.isActive === false);
                    return sorted.map((x, pos) => (
                      <React.Fragment key={x.m.employeeId || x.i}>
                        {pos === firstInactive && firstInactive > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '10px 0 4px', fontFamily: 'Inter', fontSize: 10.5, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            <span>Inactive</span>
                            <span style={{ flex: 1, height: 1, background: '#EEF2F6' }} />
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F4F6F9', opacity: x.m.isActive === false ? 0.75 : 1 }}>
                          <div style={{ flex: 2, minWidth: 180, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <img
                              src={empAvatar(x.m.employeeId) || `https://ui-avatars.com/api/?name=${encodeURIComponent(empName(x.m.employeeId) === DASH ? '?' : empName(x.m.employeeId))}&background=eeeeee&color=888888&size=20&rounded=true`}
                              alt=""
                              style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                            />
                            <span style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: 700, color: '#1E293B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{empName(x.m.employeeId)}</span>
                            <span style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 6, whiteSpace: 'nowrap', ...(x.m._added ? { background: '#dbeafe', color: '#1e40af' } : { background: '#F1F5F9', color: '#64748B' }) }}>
                              {x.m._added ? 'New' : 'Existing'}
                            </span>
                          </div>
                          <div style={{ flex: 1, minWidth: 120 }}><DateEditor value={x.m.startDate} onChange={v => updateRosterRow(x.i, { startDate: v })} /></div>
                          <div style={{ flex: 1, minWidth: 120 }}><DateEditor value={x.m.endDate} onChange={v => updateRosterRow(x.i, { endDate: v })} /></div>
                          <div style={{ flex: 1, minWidth: 120 }}><ToggleEditor value={x.m.isActive !== false} onChange={v => applyStatusToggle(v, x.m, patch => updateRosterRow(x.i, patch))} onLabel="Active" offLabel="Inactive" /></div>
                        </div>
                      </React.Fragment>
                    ));
                  })()}
                </div>
              )}
            </Modal.Body>
            <Modal.Footer style={{ padding: 12, borderTop: '1px solid #EEF2F6', justifyContent: 'space-between' }}>
              <button type="button" className="btn btn-light btn-sm" onClick={() => setTeamStep(1)} disabled={savingTeam}>
                <i className="bi bi-arrow-left" /> Back
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn btn-light btn-sm" onClick={() => setShowTeamModal(false)} disabled={savingTeam}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={confirmTeamChange}
                  disabled={savingTeam || !draftTeamId}
                  style={{ backgroundColor: '#1E3A8A', borderColor: '#1E3A8A' }}
                >
                  {savingTeam ? 'Saving...' : 'Save'}
                </button>
              </div>
            </Modal.Footer>
          </>
        )}
      </Modal>

      {/* Project-manager dialog: opened by the "Assign/Change Manager" button above.
          Nothing is written until Save is clicked. */}
      <Modal show={showPmModal} onHide={() => !savingPm && setShowPmModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: 14, fontWeight: 600 }}>Assign Project Manager</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: 16 }}>
          <div style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
            Project Manager
          </div>
          <SearchableSelectEditor value={draftPmId} options={employeeOptions} onChange={setDraftPmId} placeholder="Select project manager" formatOptionLabel={formatEmployeeOption} />
          <div style={{ fontFamily: 'Inter', fontSize: 12, color: '#94A3B8', marginTop: 10 }}>
            Execution Team and Status are unaffected.
          </div>
        </Modal.Body>
        <Modal.Footer style={{ padding: 12, borderTop: '1px solid #EEF2F6' }}>
          <button type="button" className="btn btn-light btn-sm" onClick={() => setShowPmModal(false)} disabled={savingPm}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={confirmPmChange}
            disabled={savingPm || draftPmId === (ex.projectManagerId || '')}
            style={{ backgroundColor: '#1E3A8A', borderColor: '#1E3A8A' }}
          >
            {savingPm ? 'Saving...' : 'Save'}
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
              // Active first, inactive below — same ordering as the read table.
              // Sourced from the project's own rows (scalar FKs), NOT the lead form.
              leadTeams: sortByActive(projectExternalTeams).map((t: any) => ({
                id: t.id,
                companyTypeId: t?.companyTypeId || '',
                companyId: t?.companyId || '',
                subCompanyId: t?.subCompanyId || '',
                contactId: t?.contactId || '',
                startDate: t?.startDate || '',
                endDate: t?.endDate || '',
                isActive: t?.isActive !== false,
                syncedFromLead: t?.syncedFromLead === true,
              })),
            }}
            onSave={d => saveSection('externalTeam', {
              leadTeams: (d.leadTeams || [])
                .filter((t: any) => t.companyTypeId || t.companyId || t.subCompanyId || t.contactId)
                .map((t: any) => ({
                  ...t,
                  startDate: t.startDate || '',
                  endDate: t.endDate || '',
                  isActive: t.isActive !== false,
                  syncedFromLead: t.syncedFromLead === true,
                })),
            })}
          >
            {({ editing, draft, set }) => {
              const rows: any[] = draft.leadTeams || [];
              const update = (i: number, patch: any) => { const next = [...rows]; next[i] = { ...next[i], ...patch }; set({ leadTeams: next }); };
              const remove = (i: number) => set({ leadTeams: rows.filter((_, idx) => idx !== i) });
              const add = () => set({ leadTeams: [...rows, { companyTypeId: '', companyId: '', subCompanyId: '', contactId: '', startDate: '', endDate: '', isActive: true, syncedFromLead: false }] });
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
                      <thead><tr>{['Company / Client', 'Type', 'Sub Company', 'Contact', 'Designation', 'Phone', 'Start Date', 'End Date', 'Status'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
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
                                {s.syncedFromLead && (
                                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 6, background: '#ede9fe', color: '#6d28d9', whiteSpace: 'nowrap' }}>
                                    From Lead
                                  </span>
                                )}
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
                            <td style={td}>{s.designation || DASH}</td>
                            <td style={td}>{s.phone || DASH}</td>
                            <td style={td}>{s.startDate ? fmtDate(s.startDate) : DASH}</td>
                            <td style={td}>{s.endDate ? fmtDate(s.endDate) : DASH}</td>
                            <td style={td}><DetailStatusBadge status={s.isActive ? 'Active' : 'Inactive'} color={s.isActive ? '#16a34a' : '#94A3B8'} /></td>
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
                        <div style={{ flex: 1, minWidth: 130 }}>Designation</div>
                        <div style={{ flex: 1, minWidth: 120 }}>Start</div>
                        <div style={{ flex: 1, minWidth: 120 }}>End</div>
                        <div style={{ flex: 1, minWidth: 110 }}>Status</div>
                        <div style={{ width: 32 }} />
                      </div>
                    )}
                    {rows.length === 0 && (
                      <div style={{ fontFamily: 'Inter', fontSize: 13, color: '#94A3B8', padding: '8px 0 12px' }}>No client company linked yet — add one below.</div>
                    )}
                    {rows.map((t, i) => (
                      <div key={i} style={{ borderBottom: '1px solid #F4F6F9', padding: '4px 0 8px' }}>
                        {t.syncedFromLead && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0 4px' }}>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 6, background: '#ede9fe', color: '#6d28d9' }}>From Lead</span>
                            <span style={{ fontFamily: 'Inter', fontSize: 11, color: '#94A3B8' }}>Synced from the lead's Address To · edits here won't change the lead</span>
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <div style={{ flex: 1, minWidth: 140 }}><SearchableSelectEditor value={t.companyTypeId} options={companyTypeOptions} onChange={v => update(i, { companyTypeId: v })} placeholder="Select type" /></div>
                          <div style={{ flex: 1, minWidth: 150 }}><SearchableSelectEditor value={t.companyId} options={companyOptionsFor(t.companyTypeId)} onChange={v => onCompanyChange(i, v)} placeholder="Select company" showColor /></div>
                          <div style={{ flex: 1, minWidth: 150 }}><SearchableSelectEditor value={t.subCompanyId} options={subCompanyOptionsFor(t.companyId)} onChange={v => onSubCompanyChange(i, v)} placeholder="Select sub company" /></div>
                          <div style={{ flex: 1, minWidth: 150 }}><SearchableSelectEditor value={t.contactId} options={contactOptionsFor(t.companyId)} onChange={v => onContactChange(i, v)} placeholder="Select contact" showColor /></div>
                          <div style={{ flex: 1, minWidth: 130 }}>
                            {/* Auto-fetched from the selected contact's Role in Company. */}
                            <div
                              title="Auto-filled from the selected contact"
                              style={{
                                minHeight: 38,
                                display: 'flex',
                                alignItems: 'center',
                                padding: '6px 12px',
                                borderRadius: 8,
                                border: '1px solid #EDF1F7',
                                background: '#F8FAFC',
                                fontFamily: 'Inter',
                                fontSize: 13,
                                color: contactById.get(String(t.contactId))?.roleInCompany ? '#334155' : '#94A3B8',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {contactById.get(String(t.contactId))?.roleInCompany || 'Select a contact'}
                            </div>
                          </div>
                          <div style={{ flex: 1, minWidth: 120 }}><DateEditor value={t.startDate} onChange={v => update(i, { startDate: v })} /></div>
                          <div style={{ flex: 1, minWidth: 120 }}><DateEditor value={t.endDate} onChange={v => update(i, { endDate: v })} /></div>
                          <div style={{ flex: 1, minWidth: 110 }}><ToggleEditor value={t.isActive !== false} onChange={v => applyStatusToggle(v, t, patch => update(i, patch))} onLabel="Active" offLabel="Inactive" /></div>
                          <button type="button" onClick={() => remove(i)} title="Remove" style={removeBtn}><i className="bi bi-trash" /></button>
                        </div>
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
