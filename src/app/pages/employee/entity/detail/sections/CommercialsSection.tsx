import React, { useState } from 'react';
import { DetailCard, DetailSummaryBar, DetailRow, DetailStatusBadge } from '@app/modules/detail-page/DetailPageComponents';
import { EditableDetailCard, FieldRow, SelectEditor, DateEditor, NumberEditor, TextEditor } from '@app/modules/detail-page/EditableDetailCard';
import { updateLeadSection, type LeadSectionKey } from '@services/leadService';
import eventBus from '@utils/EventBus';
import { EVENT_KEYS } from '@constants/eventKeys';
import { usePoStatusOptions } from '@hooks/usePoStatusOptions';
import { EmptyState } from '../widgets';
import { fmtMoney, fmtDate, DASH, type CommercialTotals } from '../entityViewModel';
import type { CommercialLineVM, EntityVM } from '../facets';
import { getCurrencySymbol } from '@utils/currency';
import { IconButton, Tooltip } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

/** Wrapper for monetary values - blur only the text, not the container */
const BlurredAmount: React.FC<{ value: string; isBlurred: boolean }> = ({ value, isBlurred }) => (
  <span style={isBlurred ? { filter: 'blur(5px)', userSelect: 'none', display: 'inline-block' } : {}}>
    {value}
  </span>
);

const Td: React.FC<{ children?: React.ReactNode; strong?: boolean }> = ({ children, strong }) => (
  <td style={{ padding: '11px 12px', borderBottom: '1px solid #F4F6F9', fontSize: 13, color: strong ? '#1E293B' : '#475569', fontWeight: strong ? 700 : 500, whiteSpace: 'nowrap' }}>
    {children}
  </td>
);

const Breakdown: React.FC<{ title: string; subtitle: string; icon: string; accent: any; lines: CommercialLineVM[]; totals: CommercialTotals; isBlurred: boolean }> = ({
  title,
  subtitle,
  icon,
  accent,
  lines,
  totals,
  isBlurred,
}) => (
  <DetailCard title={title} subtitle={subtitle} icon={icon} accentColor={accent}>
    {lines.length === 0 ? (
      <EmptyState icon="bi bi-cash-stack" title="No commercials" message="No work areas, rates or costs have been added." />
    ) : (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Inter' }}>
          <thead>
            <tr style={{ textAlign: 'left' }}>
              {['#', 'Label', 'Area (sqft)', 'Cost Type', 'Rate', 'Cost'].map(h => (
                <th key={h} style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, padding: '10px 12px', borderBottom: '1px solid #EEF2F6', whiteSpace: 'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map((c, i) => (
              <tr key={i}>
                <Td>{i + 1}</Td>
                <Td strong>{c.label}</Td>
                <Td>{c.area}</Td>
                <Td>{c.costType}</Td>
                <Td>{c.costType === 'RATE' ? <BlurredAmount value={fmtMoney(c.rate)} isBlurred={isBlurred} /> : DASH}</Td>
                <Td strong><BlurredAmount value={fmtMoney(c.cost)} isBlurred={isBlurred} /></Td>
              </tr>
            ))}
            <tr>
              <Td />
              <Td strong>Total</Td>
              <Td strong>{totals.totalArea ? totals.totalArea.toLocaleString('en-IN') : DASH}</Td>
              <Td />
              <Td />
              <Td strong><BlurredAmount value={fmtMoney(totals.totalCost)} isBlurred={isBlurred} /></Td>
            </tr>
          </tbody>
        </table>
      </div>
    )}
  </DetailCard>
);

/**
 * Commercials tab — the single home for all money. Lead commercials (the quote)
 * and, once the lead is a project, project commercials (the contracted
 * breakdown) both live here. No separate Financials tab; no duplicate cards.
 */
const CommercialsSection: React.FC<{ vm: EntityVM; rawLead: any }> = ({ vm, rawLead }) => {
  const poStatusOptions = usePoStatusOptions();
  const [isBlurred, setIsBlurred] = useState(true);

  const lead = vm.commercials.lead;
  const project = vm.commercials.project;
  const contractValue = project?.totals.totalCost || lead.totals.totalCost;
  const contractArea = project?.totals.totalArea || lead.totals.totalArea;

  const isProject = vm.isProject;
  const ex = rawLead?.execution || {};
  const ad = Array.isArray(rawLead?.additionalDetails) ? (rawLead.additionalDetails[0] || {}) : (rawLead?.additionalDetails || {});
  const revisionCount: number | null = rawLead?.revisionCount ?? null;
  const leadId: string = rawLead?.id;

  const saveSection = (section: LeadSectionKey, data: any) =>
    updateLeadSection(leadId, section, data, revisionCount).then(() => {
      if (leadId) eventBus.emit(EVENT_KEYS.leadUpdated, { id: leadId });
    });

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', top: 0, right: 0, zIndex: 10 }}>
        <Tooltip title={isBlurred ? 'Click to reveal amounts' : 'Click to hide amounts'}>
          <IconButton
            size="small"
            onClick={() => setIsBlurred(!isBlurred)}
            sx={{ color: isBlurred ? 'text.secondary' : 'primary.main' }}
          >
            {isBlurred ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </div>

      <DetailSummaryBar
        items={[
          { label: project ? 'Contract Value' : 'Estimated Value', value: isBlurred ? '●●●●●' : fmtMoney(contractValue), icon: 'bi bi-currency-rupee', accentColor: 'green' },
          { label: 'Total Area', value: contractArea ? `${contractArea.toLocaleString('en-IN')} sqft` : DASH, icon: 'bi bi-rulers', accentColor: 'teal' },
          { label: 'Quoted (Lead)', value: isBlurred ? '●●●●●' : fmtMoney(lead.totals.totalCost), icon: 'bi bi-tag', accentColor: 'blue' },
          // Rounding to the rupee hid the real rate: 22,50,000 over 23,399 sqft read
          // as 96, not 96.16. Two decimals; a whole number renders without any.
          { label: 'Avg / sqft', value: contractArea ? (isBlurred ? '●●●●●' : fmtMoney(+(contractValue / contractArea).toFixed(2))) : DASH, icon: 'bi bi-graph-up', accentColor: 'purple' },
        ]}
      />

      <div className="d-flex flex-column gap-5">
        <Breakdown
          title="Lead Commercials"
          subtitle={`Quote · ${lead.totals.lines} area${lead.totals.lines === 1 ? '' : 's'}`}
          icon="bi bi-tag"
          accent="blue"
          lines={lead.lines}
          totals={lead.totals}
          isBlurred={isBlurred}
        />
        {project && (
          <Breakdown
            title="Project Commercials"
            subtitle={`Contracted · ${project.totals.lines} area${project.totals.lines === 1 ? '' : 's'}`}
            icon="bi bi-cash-stack"
            accent="green"
            lines={project.lines}
            totals={project.totals}
            isBlurred={isBlurred}
          />
        )}

        {isProject && (
          <div className="row g-5">
            <div className="col-12 col-xl-6">
              <EditableDetailCard
                title="Contract Financials"
                subtitle="Rate & final cost — set from the lead's Lead Status step on receipt"
                icon="bi bi-cash-stack"
                accentColor="green"
                canEdit={false}
                values={{ rate: ex.rate ?? '', cost: ex.cost ?? '' }}
                onSave={d => saveSection('financials', d)}
              >
                {({ editing, draft, set }) => (
                  editing ? (
                    <>
                      <FieldRow label="Contract Rate"><NumberEditor value={draft.rate} prefix={getCurrencySymbol()} onChange={v => set({ rate: v })} placeholder="0" /></FieldRow>
                      <FieldRow label="Final Cost" isLast><NumberEditor value={draft.cost} prefix={getCurrencySymbol()} onChange={v => set({ cost: v })} placeholder="0" /></FieldRow>
                    </>
                  ) : (
                    <>
                      <DetailRow label="Contract Rate" value={<BlurredAmount value={fmtMoney(ex.rate)} isBlurred={isBlurred} />} />
                      <DetailRow label="Final Cost" isLast value={<BlurredAmount value={fmtMoney(ex.cost)} isBlurred={isBlurred} />} />
                    </>
                  )
                )}
              </EditableDetailCard>
            </div>

            <div className="col-12 col-xl-6">
              <EditableDetailCard
                title="Purchase Order"
                subtitle="PO tracking — set from the lead's Lead Status step on receipt"
                icon="bi bi-receipt"
                accentColor="green"
                canEdit={false}
                values={{ poStatus: rawLead?.poStatus || '', poNumber: ad?.poNumber || '', poDate: ad?.poDate || '' }}
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
                      <DetailRow label="PO Status" value={rawLead?.poStatus ? <DetailStatusBadge status={String(rawLead.poStatus)} /> : DASH} />
                      <DetailRow label="PO Number" value={ad?.poNumber || DASH} />
                      <DetailRow label="PO Date" value={fmtDate(ad?.poDate)} isLast />
                    </>
                  )
                )}
              </EditableDetailCard>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommercialsSection;
