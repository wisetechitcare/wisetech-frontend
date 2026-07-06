import React from 'react';
import dayjs from 'dayjs';
import { DetailCard, DetailRow, DetailLink, DetailMapLink, DetailStatusBadge } from '@app/modules/detail-page/DetailPageComponents';
import { EmptyState } from '../widgets';
import { DASH } from '../entityViewModel';

/**
 * Company & Contact — the rich, deeply-fetched client cards. Pulls the FULL
 * Company and Contact records (fetched once on the detail page) and surfaces only
 * the fields that exist — phone/email/website, ratings, full address with a map
 * link, GMB, role, etc. Falls back to the company/contact embedded on the lead
 * when the full fetch is unavailable. No empty rows.
 */

const fmtDate = (d?: any) => (d ? dayjs(d).format('DD MMM YYYY') : undefined);
const joinAddr = (o: any) =>
  [o?.address, o?.area, o?.city, o?.state, o?.country, o?.zipCode || o?.zipcode]
    .filter(Boolean)
    .join(', ') || undefined;

/** Avatar / logo block at the head of each card. */
const Identity: React.FC<{ img?: string; name: string; sub?: string; accent: string; badge?: React.ReactNode }> = ({ img, name, sub, accent, badge }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '4px 0 14px', borderBottom: '1px solid #EEF2F6', marginBottom: 10 }}>
    {img ? (
      <img src={img} alt={name} style={{ width: 52, height: 52, borderRadius: 12, objectFit: 'cover', flexShrink: 0, border: '1px solid #EEF2F6' }} />
    ) : (
      <div style={{ width: 52, height: 52, borderRadius: 12, background: `${accent}18`, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Barlow', fontWeight: 800, fontSize: 20, flexShrink: 0 }}>
        {(name || '?').charAt(0).toUpperCase()}
      </div>
    )}
    <div style={{ minWidth: 0 }}>
      <div style={{ fontFamily: 'Barlow', fontWeight: 700, fontSize: 17, color: '#1E293B', lineHeight: 1.2 }}>{name || DASH}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
        {sub && <span style={{ fontFamily: 'Inter', fontSize: 12, color: '#64748B', fontWeight: 600 }}>{sub}</span>}
        {badge}
      </div>
    </div>
  </div>
);

/** Render a DetailRow only when the value is present. */
const Row: React.FC<{ label: string; value?: React.ReactNode; isLast?: boolean }> = ({ label, value, isLast }) =>
  value ? <DetailRow label={label} value={value} isLast={isLast} /> : null;

const CompanyCard: React.FC<{ company: any; fallback?: any }> = ({ company, fallback }) => {
  const c = company || fallback;
  if (!c) return null;
  const addr = joinAddr(c);
  const lat = c?.latitude;
  const lng = c?.longitude;
  const rating = c?.overallRating != null && Number(c.overallRating) > 0 ? `★ ${Number(c.overallRating).toFixed(1)}` : undefined;
  const gmb = c?.gmbProfileUrl || c?.googleMapsLink;
  return (
    <DetailCard title="Company" subtitle="Client company on record" icon="bi bi-buildings" accentColor="blue">
      <Identity
        img={c?.logo}
        name={c?.companyName || c?.name}
        sub={c?.companyType?.name || c?.companyTypeName || c?.clientType?.name}
        accent="#3b82f6"
        badge={
          <>
            {rating && <span style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: 700, color: '#f59e0b' }}>{rating}</span>}
            {c?.status && <DetailStatusBadge status={String(c.status)} />}
          </>
        }
      />
      <Row label="Phone" value={c?.phone} />
      <Row label="Alt. Phone" value={c?.phone2} />
      <Row label="Fax" value={c?.fax} />
      <Row label="Email" value={c?.email && <DetailLink href={`mailto:${c.email}`}>{c.email}</DetailLink>} />
      <Row label="Website" value={c?.website && <DetailLink href={c.website} external>{c.website}</DetailLink>} />
      <Row label="Address" value={addr} />
      <Row label="GMB Profile" value={gmb && <DetailLink href={gmb} external>View profile</DetailLink>} />
      <Row label="Location" value={lat && lng ? <DetailMapLink lat={lat} lng={lng} /> : undefined} />
      <Row label="Note" value={c?.note} isLast />
      {!addr && !c?.phone && !c?.email && !c?.website && (
        <DetailRow label="Details" value={DASH} isLast />
      )}
    </DetailCard>
  );
};

const ContactCard: React.FC<{ contact: any; fallback?: any }> = ({ contact, fallback }) => {
  const c = contact || fallback;
  if (!c) return null;
  const addr = joinAddr(c);
  const lat = c?.latitude;
  const lng = c?.longitude;
  const gmb = c?.gmbLink || c?.googleMapLink;
  return (
    <DetailCard title="Contact" subtitle="Primary point of contact" icon="bi bi-person-vcard" accentColor="purple">
      <Identity
        img={c?.profilePhoto}
        name={c?.fullName || c?.name}
        sub={c?.roleInCompany || c?.contactRole?.name}
        accent="#7c3aed"
        badge={c?.isPrimaryContact ? <DetailStatusBadge status="Primary" color="#16a34a" /> : undefined}
      />
      <Row label="Company" value={c?.company?.companyName} />
      <Row label="Branch" value={c?.branch} />
      <Row label="Phone" value={c?.phone} />
      <Row label="Alt. Phone" value={c?.phone2} />
      <Row label="Email" value={c?.email && <DetailLink href={`mailto:${c.email}`}>{c.email}</DetailLink>} />
      <Row label="Date of Birth" value={fmtDate(c?.dateOfBirth)} />
      <Row label="Anniversary" value={fmtDate(c?.anniversary)} />
      <Row label="Address" value={addr} />
      <Row label="GMB" value={gmb && <DetailLink href={gmb} external>View</DetailLink>} />
      <Row label="Location" value={lat && lng ? <DetailMapLink lat={lat} lng={lng} /> : undefined} />
      <Row label="Note" value={c?.note} isLast />
      {!c?.phone && !c?.email && !addr && <DetailRow label="Details" value={DASH} isLast />}
    </DetailCard>
  );
};

/**
 * Flat list of the company & contact cards, for composing into a shared card grid
 * on the Client sub-page. Returns a single empty-state card when neither exists.
 */
export const companyContactCards = (company: any, contact: any, lead: any): React.ReactNode[] => {
  const hasCompany = !!(company || lead?.company);
  const hasContact = !!(contact || lead?.contact);

  if (!hasCompany && !hasContact) {
    return [
      <EmptyState
        key="cc-empty"
        icon="bi bi-buildings"
        title="No company or contact linked"
        message="This record has no client company or contact attached. Add one from the edit form."
      />,
    ];
  }

  const cards: React.ReactNode[] = [];
  if (hasCompany) cards.push(<CompanyCard key="company" company={company} fallback={lead?.company} />);
  if (hasContact) cards.push(<ContactCard key="contact" contact={contact} fallback={lead?.contact} />);
  return cards;
};

const CompanyContactSection: React.FC<{ company: any; contact: any; lead: any }> = ({ company, contact, lead }) => (
  <div className="row g-5">
    {companyContactCards(company, contact, lead).map((card, i) => (
      <div className="col-12 col-xl-6" key={i}>
        {card}
      </div>
    ))}
  </div>
);

export default CompanyContactSection;
