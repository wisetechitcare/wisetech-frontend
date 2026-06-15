import React from 'react';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import type { RootState } from '@redux/store';
import {
  DetailCard,
  DetailRow,
  DetailStatusBadge,
  DetailSummaryBar,
  DetailMapLink,
  DetailProfileBlock,
  DetailSectionLabel,
} from '@app/modules/detail-page/DetailPageComponents';
import { formatCompactCurrency, getTimelineProgress, isDelayedProject } from './entityUtils';

const fmtDate = (v?: string | Date | null) => (v ? dayjs(v).format('DD MMM YYYY') : '—');
const fmtMoney = (v?: any) => {
  const n = parseFloat(v);
  return isFinite(n) && n !== 0 ? `₹${n.toLocaleString('en-IN')}` : '—';
};

/**
 * Project Section of the unified Entity detail page.
 * Rendered ONLY when the lead's status has isProjectTrigger (or a legacy
 * projectId link exists) — "lead evolved into project", not a separate page.
 *
 * `project` is the lead.project relation from the enriched GET /leads/:id.
 */
const EntityProjectSection: React.FC<{ lead: any; project: any }> = ({ lead, project }) => {
  const allEmployees = useSelector((state: RootState) => state.allEmployees?.list) || [];

  if (!project) {
    // Trigger status set but the sync engine hasn't materialised the project
    // row yet (it does so within the same request normally). Show an honest
    // pending state instead of empty cards.
    return (
      <div className="mt-6">
        <DetailSectionLabel accentColor="primary">Project</DetailSectionLabel>
        <div
          style={{
            padding: '18px 20px',
            borderRadius: '12px',
            border: '1px dashed #CBD5E1',
            background: '#F8FAFC',
            fontFamily: 'Inter, sans-serif',
            fontSize: '13px',
            color: '#64748B',
          }}
        >
          This lead has a project-trigger status, but its project record is still being prepared.
          Refresh in a moment.
        </div>
      </div>
    );
  }

  const employeeName = (id?: string | null) =>
    allEmployees.find((e: any) => e.employeeId === id)?.employeeName || null;

  const pmUser = project?.projectManager?.users;
  const pmName =
    (pmUser ? `${pmUser.firstName || ''} ${pmUser.lastName || ''}`.trim() : '') ||
    employeeName(project?.projectManagerId) ||
    '—';

  const progress = getTimelineProgress(project?.startDate, project?.endDate);
  const delayed = isDelayedProject(lead);
  const cost = parseFloat(project?.cost) || 0;
  const rate = parseFloat(project?.rate) || 0;

  const teamNames: string[] = [
    ...(project?.team?.name ? [project.team.name] : []),
    ...((project?.projectTeams || [])
      .map((pt: any) => pt?.team?.name)
      .filter((n: string) => !!n)),
  ].filter((n, i, a) => a.indexOf(n) === i);

  const locationParts = [project?.locality, project?.city, project?.state, project?.country].filter(Boolean);

  return (
    <div className="mt-8">
      <div className="d-flex align-items-center gap-3 mb-4">
        <DetailSectionLabel accentColor="primary">Project</DetailSectionLabel>
        {delayed && (
          <span
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '11px',
              fontWeight: 700,
              color: '#9B1C44',
              background: '#FFF1F3',
              border: '1px solid #F1416C33',
              padding: '3px 10px',
              borderRadius: '999px',
            }}
          >
            ⚠ Past expected closure
          </span>
        )}
      </div>

      <DetailSummaryBar
        items={[
          { label: 'Project Number', value: project?.prefix || '—', icon: 'bi bi-hash', accentColor: 'primary' },
          {
            label: 'Project Status',
            value: <DetailStatusBadge status={project?.status?.name || '—'} color={project?.status?.color} />,
            icon: 'bi bi-activity',
            accentColor: 'blue',
          },
          { label: 'Start Date', value: fmtDate(project?.startDate), icon: 'bi bi-calendar-event', accentColor: 'green' },
          { label: 'Expected Closure', value: fmtDate(project?.endDate), icon: 'bi bi-calendar-check', accentColor: 'orange' },
          { label: 'Project Value', value: cost ? formatCompactCurrency(cost) : '—', icon: 'bi bi-currency-rupee', accentColor: 'purple' },
        ]}
      />

      <div className="row g-5">
        {/* ── Project Overview ── */}
        <div className="col-12 col-xl-4">
          <DetailCard title="Project Overview" subtitle="Execution identity" icon="bi bi-kanban" accentColor="primary">
            <DetailRow label="Project Number" value={project?.prefix || '—'} />
            <DetailRow
              label="Project Status"
              value={<DetailStatusBadge status={project?.status?.name || '—'} color={project?.status?.color} />}
            />
            <DetailRow label="Start Date" value={fmtDate(project?.startDate)} />
            <DetailRow label="Expected Closure" value={fmtDate(project?.endDate)} />
            <DetailRow label="Live" value={project?.isLive ? 'Yes' : 'No'} />
            <DetailRow label="Open" value={project?.isProjectOpen === false ? 'Closed' : 'Open'} isLast />
          </DetailCard>
        </div>

        {/* ── Financials ── */}
        <div className="col-12 col-xl-4">
          <DetailCard title="Financials" subtitle="Commercial summary" icon="bi bi-cash-stack" accentColor="green">
            <DetailRow label="Cost" value={fmtMoney(cost)} />
            <DetailRow label="Rate" value={fmtMoney(rate)} />
            <DetailRow label="PO Number" value={project?.poNumber || '—'} />
            <DetailRow label="PO Date" value={fmtDate(project?.poDate)} isLast />
          </DetailCard>
        </div>

        {/* ── Execution & Timeline ── */}
        <div className="col-12 col-xl-4">
          <DetailCard title="Execution" subtitle="Timeline progress" icon="bi bi-bar-chart-steps" accentColor="orange">
            {progress !== null ? (
              <div style={{ padding: '12px 0' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#475569',
                    marginBottom: '6px',
                  }}
                >
                  <span>Timeline elapsed</span>
                  <span style={{ color: delayed ? '#9B1C44' : '#0A5C2A' }}>{progress}%</span>
                </div>
                <div style={{ height: '8px', borderRadius: '999px', background: '#F1F5F9', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${progress}%`,
                      height: '100%',
                      borderRadius: '999px',
                      background: delayed ? '#F1416C' : '#17C964',
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>
            ) : (
              <div style={{ padding: '12px 0', fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#94A3B8' }}>
                Set start and expected-closure dates to track timeline progress.
              </div>
            )}
            <DetailRow label="Revisions" value={project?.revisionCount ?? 0} />
            <DetailRow label="Inquiry Date" value={fmtDate(project?.inquiryDate || lead?.inquiryDate)} isLast />
          </DetailCard>
        </div>

        {/* ── Team & Stakeholders ── */}
        <div className="col-12 col-xl-4">
          <DetailCard title="Team" subtitle="Delivery ownership" icon="bi bi-people" accentColor="blue">
            <div style={{ padding: '12px 0' }}>
              <DetailProfileBlock
                name={pmName}
                subtitle="Project Manager"
                href={project?.projectManagerId ? `/employees/${project.projectManagerId}` : undefined}
                accentColor="blue"
              />
            </div>
            <DetailRow label="Team" value={teamNames.length ? teamNames.join(', ') : '—'} />
            <DetailRow label="Stakeholder Service" value={project?.stakeholderService?.name || '—'} />
            <DetailRow label="Lead Owner" value={employeeName(lead?.assignedToId) || '—'} isLast />
          </DetailCard>
        </div>

        {/* ── Location ── */}
        <div className="col-12 col-xl-4">
          <DetailCard title="Location" subtitle="Site & map" icon="bi bi-geo-alt" accentColor="purple">
            <DetailRow label="Address" value={project?.projectAddress || '—'} />
            <DetailRow label="Area" value={locationParts.length ? locationParts.join(', ') : '—'} />
            <DetailRow label="Zip Code" value={project?.zipcode || '—'} />
            <DetailRow
              label="Map"
              value={
                project?.latitude && project?.longitude ? (
                  <DetailMapLink lat={project.latitude} lng={project.longitude} />
                ) : (
                  '—'
                )
              }
              isLast
            />
          </DetailCard>
        </div>

        {/* ── Internal ── */}
        <div className="col-12 col-xl-4">
          <DetailCard title="Internal" subtitle="Notes & flags" icon="bi bi-journal-text" accentColor="orange">
            <DetailRow
              label="Description"
              value={
                project?.description ? (
                  <span style={{ whiteSpace: 'pre-wrap', textAlign: 'left', display: 'block' }}>{project.description}</span>
                ) : (
                  '—'
                )
              }
            />
            {[1, 2, 3].map(i =>
              project?.[`otherPoint${i}Heading`] ? (
                <DetailRow
                  key={i}
                  label={project[`otherPoint${i}Heading`]}
                  value={project[`otherPoint${i}Description`] || '—'}
                />
              ) : null,
            )}
            <DetailRow
              label="Location Flag"
              value={
                project?.isLocationIncorrect ? (
                  <span style={{ color: '#9B1C44', fontWeight: 600 }}>Marked incorrect{project?.locationRemark ? ` — ${project.locationRemark}` : ''}</span>
                ) : (
                  'OK'
                )
              }
              isLast
            />
          </DetailCard>
        </div>
      </div>
    </div>
  );
};

export default EntityProjectSection;
