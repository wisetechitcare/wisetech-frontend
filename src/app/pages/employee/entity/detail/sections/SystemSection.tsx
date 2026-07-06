import React from 'react';
import { DetailCard, DetailRow } from '@app/modules/detail-page/DetailPageComponents';
import { DASH } from '../entityViewModel';
import { useDensity, atLeast } from '../density';
import type { EntityVM, KV } from '../facets';

const MetaCard: React.FC<{ title: string; icon: string; accent: any; rows: KV[] }> = ({ title, icon, accent, rows }) => {
  const active = useDensity();
  const visible = rows.filter(r => atLeast(active, r.minLevel || 'detailed') && (r.value != null || active === 'advanced'));
  return (
    <DetailCard title={title} subtitle="Ownership & technical fields" icon={icon} accentColor={accent}>
      {active === 'overview' ? (
        <div style={{ padding: '14px 0', fontFamily: 'Inter', fontSize: 13, color: '#94A3B8' }}>
          Switch to <strong>Detailed</strong> or <strong>Advanced</strong> mode to view system &amp; technical fields.
        </div>
      ) : (
        <div className="row">
          {visible.map((r, i) => (
            <div className="col-12 col-md-6" key={r.label}>
              <DetailRow label={r.label} value={r.value ?? DASH} isLast={i >= visible.length - 2} />
            </div>
          ))}
        </div>
      )}
    </DetailCard>
  );
};

/**
 * System tab — created/updated trail, IDs, metadata, technical flags for the
 * Lead (master) and, when present, the Project extension. Replaces the old
 * History tab; full field-level audit needs an audit-log table (future).
 */
const SystemSection: React.FC<{ vm: EntityVM }> = ({ vm }) => (
  <div className="row g-5">
    <div className={vm.projectSystemRows ? 'col-12 col-xl-6' : 'col-12'}>
      <MetaCard title="Lead Record" icon="bi bi-gear" accent="primary" rows={vm.systemRows} />
    </div>
    {vm.projectSystemRows && (
      <div className="col-12 col-xl-6">
        <MetaCard title="Project Record" icon="bi bi-kanban" accent="green" rows={vm.projectSystemRows} />
      </div>
    )}
  </div>
);

export default SystemSection;
