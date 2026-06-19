import React from 'react';
import {
  DetailCard,
  DetailRow,
  DetailLink,
  DetailMapLink,
  DetailProfileBlock,
} from '@app/modules/detail-page/DetailPageComponents';
import { EmptyState } from '../widgets';
import { DASH } from '../entityViewModel';
import type { EntityVM } from '../facets';

/**
 * Client tab — the single home for company / contact / branch / address /
 * referral information. Lead is master; project branches & addresses are already
 * merged into the VM, so this never duplicates client data elsewhere.
 */
const ClientSection: React.FC<{ vm: EntityVM }> = ({ vm }) => {
  const { companies, referrals, branches, addresses } = vm.client;

  return (
    <div className="row g-5">
      <div className="col-12">
        <DetailCard title="Companies & Contacts" subtitle={`${companies.length} linked`} icon="bi bi-buildings" accentColor="blue">
          {companies.length === 0 ? (
            <EmptyState icon="bi bi-buildings" title="No companies linked" message="No client companies are attached to this record." />
          ) : (
            <div className="row g-4">
              {companies.map((c, i) => (
                <div className="col-12 col-md-6 col-xl-4" key={i}>
                  <div style={{ border: '1px solid #EEF2F6', borderRadius: 12, padding: 14, height: '100%' }}>
                    <DetailProfileBlock name={c.name} subtitle={c.type || 'Company'} href={c.href} accentColor="blue" />
                    <div style={{ marginTop: 8 }}>
                      {c.subCompany && <DetailRow label="Sub-company" value={c.subCompany} />}
                      <DetailRow label="Contact" value={c.contact ? <DetailLink href={c.contactId ? `/contacts/${c.contactId}` : '#'}>{c.contact}</DetailLink> : DASH} />
                      <DetailRow label="Phone" value={c.phone || DASH} />
                      <DetailRow label="Email" value={c.email || DASH} isLast />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DetailCard>
      </div>

      <div className="col-12 col-xl-6">
        <DetailCard title="Source & Referrals" subtitle="How this lead arrived" icon="bi bi-signpost-split" accentColor="purple">
          {referrals.length === 0 ? (
            <DetailRow label="Referrals" value={DASH} isLast />
          ) : (
            referrals.map((r, i) => (
              <div key={i} style={{ borderTop: i ? '1px solid #EEF2F6' : 'none', paddingTop: i ? 6 : 0 }}>
                <DetailRow label={`Referral ${i + 1}`} value={r.type} />
                <DetailRow label="Referred By" value={r.by} />
                {r.notes && <DetailRow label="Notes" value={r.notes} isLast={i === referrals.length - 1} />}
              </div>
            ))
          )}
        </DetailCard>
      </div>

      <div className="col-12 col-xl-6">
        <DetailCard title="Branches & Addresses" subtitle={`${branches.length + addresses.length} locations`} icon="bi bi-geo-alt" accentColor="teal">
          {branches.length === 0 && addresses.length === 0 ? (
            <EmptyState icon="bi bi-geo" title="No locations" message="No branches or addresses are linked to this record." />
          ) : (
            <div className="d-flex flex-column gap-3">
              {addresses.map((a, i) => (
                <div key={`a${i}`} style={{ border: '1px solid #EEF2F6', borderRadius: 12, padding: 14 }}>
                  <div style={{ fontFamily: 'Barlow', fontWeight: 700, fontSize: 14, color: '#1E293B', marginBottom: 6 }}>{a.title || 'Address'}</div>
                  <DetailRow label="Address" value={a.full || DASH} />
                  <DetailRow label="Area" value={a.area || DASH} />
                  <DetailRow label="Zip" value={a.zip || DASH} />
                  <DetailRow label="Map" value={a.lat && a.lng ? <DetailMapLink lat={a.lat} lng={a.lng} /> : DASH} isLast />
                </div>
              ))}
              {branches.map((b, i) => (
                <div key={`b${i}`} style={{ border: '1px solid #EEF2F6', borderRadius: 12, padding: 14 }}>
                  <div style={{ fontFamily: 'Barlow', fontWeight: 700, fontSize: 14, color: '#1E293B', marginBottom: 6 }}>
                    {b.name} <span style={{ fontSize: 11, fontWeight: 500, color: '#94A3B8' }}>· Branch</span>
                  </div>
                  <DetailRow label="Phone" value={b.phone || DASH} />
                  <DetailRow label="Email" value={b.email || DASH} />
                  <DetailRow label="Address" value={b.address || DASH} />
                  <DetailRow label="Map" value={b.lat && b.lng ? <DetailMapLink lat={b.lat} lng={b.lng} /> : DASH} isLast />
                </div>
              ))}
            </div>
          )}
        </DetailCard>
      </div>
    </div>
  );
};

export default ClientSection;
