import React from 'react';
import { DetailCard, DetailRow } from '@app/modules/detail-page/DetailPageComponents';
import { ChipList } from '../widgets';
import { DASH } from '../entityViewModel';
import { useDensity, atLeast } from '../density';
import type { EntityVM } from '../facets';

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>
    {children}
  </div>
);

/** Service Scope card — services / categories / sub-categories. Lives on the
 *  Client sub-page (it describes what the client requested). */
export const ServiceScopeCard: React.FC<{ vm: EntityVM }> = ({ vm }) => {
  const { services, categories, subcategories } = vm.scope;
  return (
    <DetailCard title="Service Scope" subtitle="What was requested" icon="bi bi-diagram-3" accentColor="teal">
      <div style={{ padding: '10px 0' }}>
        <Label>Services</Label>
        <ChipList items={services} accent="#0d9488" />
      </div>
      <div style={{ padding: '10px 0', borderTop: '1px solid #EEF2F6' }}>
        <Label>Categories</Label>
        <ChipList items={categories} accent="#7c3aed" />
      </div>
      <div style={{ padding: '10px 0', borderTop: '1px solid #EEF2F6' }}>
        <Label>Sub-categories</Label>
        <ChipList items={subcategories} accent="#3b82f6" />
      </div>
    </DetailCard>
  );
};

/** Scope tab — area, building & project points (the technical specifications).
 *  Service Scope itself is shown on the Client sub-page via ServiceScopeCard. */
const ScopeSection: React.FC<{ vm: EntityVM }> = ({ vm }) => {
  const active = useDensity();
  const { areaRows, points } = vm.scope;

  return (
    <div className="row g-5">
      <div className="col-12">
        <DetailCard title="Area & Building" subtitle="Technical specifications" icon="bi bi-buildings" accentColor="primary">
          <div className="row">
            {areaRows
              .filter(r => atLeast(active, r.minLevel || 'overview') && (r.value || active === 'advanced'))
              .map((r, i, arr) => (
                <div className="col-12 col-md-6" key={r.label}>
                  <DetailRow label={r.label} value={r.value || DASH} isLast={i >= arr.length - 2} />
                </div>
              ))}
          </div>
        </DetailCard>
      </div>

      {points.length > 0 && (
        <div className="col-12">
          <DetailCard title="Project Points" subtitle="Custom configurable details" icon="bi bi-pin-map" accentColor="purple">
            <div className="row">
              {points.map((p, i) => (
                <div className="col-12 col-md-6" key={i}>
                  <DetailRow label={p.heading} value={p.description} />
                </div>
              ))}
            </div>
          </DetailCard>
        </div>
      )}
    </div>
  );
};

export default ScopeSection;
