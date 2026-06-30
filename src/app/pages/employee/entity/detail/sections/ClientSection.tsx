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

/** Addresses card — lead & project-site locations with map links. Surfaced on the
 *  Overview sub-page (the lead address belongs with the at-a-glance summary). */
export const AddressesCard: React.FC<{ vm: EntityVM }> = ({ vm }) => {
  const { addresses } = vm.client;
  return (
    <DetailCard title="Address & Location" subtitle={`${addresses.length} location${addresses.length === 1 ? '' : 's'}`} icon="bi bi-geo-alt" accentColor="teal">
      {addresses.length === 0 ? (
        <EmptyState icon="bi bi-geo" title="No address" message="No lead or project-site address is linked to this record." />
      ) : (
        <div className="row g-3">
          {addresses.map((a, i) => (
            <div className={addresses.length === 1 ? 'col-12' : 'col-12 col-md-6'} key={`a${i}`}>
              <div style={{ border: '1px solid #EEF2F6', borderRadius: 12, padding: 14, height: '100%' }}>
                <div style={{ fontFamily: 'Barlow', fontWeight: 700, fontSize: 14, color: '#1E293B', marginBottom: 6 }}>{a.title || 'Address'}</div>
                <DetailRow label="Address" value={a.full || DASH} />
                <DetailRow label="Area" value={a.area || DASH} />
                <DetailRow label="Zip" value={a.zip || DASH} />
                <DetailRow label="Map" value={a.lat && a.lng ? <DetailMapLink lat={a.lat} lng={a.lng} /> : DASH} isLast />
              </div>
            </div>
          ))}
        </div>
      )}
    </DetailCard>
  );
};

const CompaniesCard: React.FC<{ companies: EntityVM['client']['companies'] }> = ({ companies }) => {
  // Dynamic grid layout based on number of companies
  const getGridClass = () => {
    if (companies.length === 1) return 'col-12';
    if (companies.length === 2) return 'col-12 col-md-6';
    if (companies.length === 3) return 'col-12 col-md-6 col-lg-4';
    if (companies.length >= 4 && companies.length <= 6) return 'col-12 col-sm-6 col-md-4 col-lg-4';
    return 'col-12 col-sm-6 col-md-4 col-lg-3';
  };

  return (
  <DetailCard title="Companies & Contacts" subtitle={`${companies.length} linked`} icon="bi bi-buildings" accentColor="blue">
    <div className="row g-4">
      {companies.map((c, i) => (
        <div className={getGridClass()} key={i}>
          <div style={{
            background: '#FAFBFC',
            border: '1px solid #E2E8F0',
            borderRadius: 14,
            padding: '18px',
            height: '100%',
            transition: 'all 200ms ease',
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)'
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.borderColor = '#3B82F6';
            el.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.1)';
            el.style.background = '#FAFBFC';
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.borderColor = '#E2E8F0';
            el.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.04)';
            el.style.background = '#FAFBFC';
          }}>
            {/* Company Header */}
            <div style={{ marginBottom: 14 }}>
              <DetailProfileBlock name={c.name} subtitle={c.type || 'Company'} href={c.href} accentColor="blue" />
            </div>

            {/* Divider */}
            <div style={{ height: '1px', background: '#E2E8F0', margin: '12px 0' }}></div>

            {/* Contact Details */}
            <div style={{ marginTop: 12 }}>
              {c.subCompany && (
                <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <i className="bi bi-diagram-3" style={{ color: '#64748B', fontSize: 14 }}></i>
                  <div>
                    <div style={{ fontSize: 12, color: '#64748B', fontWeight: 500, marginBottom: 2 }}>Sub-company</div>
                    <div style={{ fontSize: 14, color: '#1E293B', fontWeight: 500 }}>{c.subCompany}</div>
                  </div>
                </div>
              )}

              {c.contact && (
                <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <i className="bi bi-person-circle" style={{ color: '#64748B', fontSize: 14 }}></i>
                  <div>
                    <div style={{ fontSize: 12, color: '#64748B', fontWeight: 500, marginBottom: 2 }}>Contact Person</div>
                    <DetailLink href={c.contactId ? `/contacts/${c.contactId}` : '#'} style={{ fontSize: 14, fontWeight: 500 }}>
                      {c.contact}
                    </DetailLink>
                  </div>
                </div>
              )}

              {c.phone && (
                <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <i className="bi bi-telephone-fill" style={{ color: '#64748B', fontSize: 14 }}></i>
                  <div>
                    <div style={{ fontSize: 12, color: '#64748B', fontWeight: 500, marginBottom: 2 }}>Phone</div>
                    <a href={`tel:${c.phone}`} style={{ fontSize: 14, color: '#3B82F6', fontWeight: 500, textDecoration: 'none' }}>
                      {c.phone}
                    </a>
                  </div>
                </div>
              )}

              {c.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <i className="bi bi-envelope-fill" style={{ color: '#64748B', fontSize: 14 }}></i>
                  <div>
                    <div style={{ fontSize: 12, color: '#64748B', fontWeight: 500, marginBottom: 2 }}>Email</div>
                    <a href={`mailto:${c.email}`} style={{ fontSize: 14, color: '#3B82F6', fontWeight: 500, textDecoration: 'none', wordBreak: 'break-all' }}>
                      {c.email}
                    </a>
                  </div>
                </div>
              )}

              {!c.subCompany && !c.contact && !c.phone && !c.email && (
                <div style={{ fontSize: 13, color: '#94A3B8', fontStyle: 'italic' }}>No contact details available</div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  </DetailCard>
  );
};

const ReferralsCard: React.FC<{ referrals: EntityVM['client']['referrals'] }> = ({ referrals }) => (
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
);

/**
 * Flat list of the secondary client cards (linked companies + referral sources),
 * for composing into the shared Client card grid. The primary company already
 * shown as a rich card is excluded so it isn't repeated.
 */
export const clientExtraCards = (vm: EntityVM, excludeCompanyId?: string): React.ReactNode[] => {
  const { referrals } = vm.client;
  const companies = excludeCompanyId
    ? vm.client.companies.filter(c => !c.href || !c.href.endsWith(`/companies/${excludeCompanyId}`))
    : vm.client.companies;

  const cards: React.ReactNode[] = [];
  if (companies.length > 0) cards.push(<CompaniesCard key="companies" companies={companies} />);
  cards.push(<ReferralsCard key="referrals" referrals={referrals} />);
  return cards;
};

/**
 * Client sub-page — linked companies (beyond the primary rich card), referral
 * sources, and branches. The primary company/contact rich cards and the Service
 * Scope card are composed alongside this on the Client sub-page; lead/site
 * addresses live on Overview (see AddressesCard).
 */
const ClientSection: React.FC<{ vm: EntityVM; excludeCompanyId?: string }> = ({ vm, excludeCompanyId }) => (
  <div className="row g-5">
    {clientExtraCards(vm, excludeCompanyId).map((card, i) => (
      <div className="col-12" key={i}>
        {card}
      </div>
    ))}
  </div>
);

export default ClientSection;
