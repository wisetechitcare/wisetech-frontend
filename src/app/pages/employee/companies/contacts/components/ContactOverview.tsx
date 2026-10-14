import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { Box } from "@mui/material";
import { DetailCard, DetailRow, DetailMapLink, DetailLink } from "@app/modules/detail-page/DetailPageComponents";
import { CardGrid } from "@app/pages/employee/entity/detail/sections/SummarySection";
import { DASH } from "@app/pages/employee/entity/detail/entityViewModel";
import SmartAvatar from "@app/modules/common/components/SmartAvatar";
import { AppIcon, ToneChip, WhatsAppIcon, WtButton } from "@app/modules/common/components/ui";
import { coordsOf, telLink, mailLink, webLink, companyStatusChip } from "../../companies/components/CompanyOverview";

const fmt = (v?: string | null) => (v ? dayjs(v).format("DD MMM YYYY") : DASH);
const joinAddress = (o: any) =>
  [o?.address, o?.area, o?.city, o?.state, o?.country, o?.zipCode].filter(Boolean).join(", ");

/** Contact → Overview tab, on the same DetailCard kit as the lead / employee detail pages. */
const ContactOverview = ({ contact }: { contact: any }) => {
  const navigate = useNavigate();
  const company = contact?.company;
  const contactCoords = coordsOf(contact?.latitude, contact?.longitude);
  const companyCoords = coordsOf(company?.latitude, company?.longitude);

  // The admin-configured status owns label and colour (same rule as the header).
  const statusName: string =
    contact?.ClientContactStatus?.name || (contact?.isContactActive === false ? "Inactive" : "Active");
  const statusColor: string | undefined = contact?.ClientContactStatus?.color || undefined;

  const handleWhatsAppShare = () => {
    const message = `📋 Contact Information:

👤 PERSONAL DETAILS:
• Name: ${contact?.fullName || 'N/A'}
• Email: ${contact?.email || 'N/A'}
• Phone: ${contact?.phone || 'N/A'}
${contact?.phone2 ? `• Phone 2: ${contact.phone2}` : ''}
• Gender: ${contact?.gender || 'N/A'}
• Date of Birth: ${fmt(contact?.dateOfBirth)}
• Role: ${contact?.roleInCompany || 'N/A'}
• Anniversary: ${fmt(contact?.anniversary)}
• Address: ${joinAddress(contact) || 'N/A'}
• Status: ${statusName}
• Primary Contact: ${contact?.isPrimaryContact ? 'Yes' : 'No'}

🏢 COMPANY DETAILS:
• Company: ${company?.companyName || 'N/A'}
• Status: ${company?.status === 'ACTIVE' ? 'Active' : company?.status === 'CLOSED' ? 'Inactive' : (company?.status || 'N/A')}
• Rating: ${company?.overallRating ? `${company.overallRating} / 10` : 'N/A'}
• Phone: ${company?.phone || 'N/A'}
${company?.phone2 ? `• Phone 2: ${company.phone2}` : ''}
• Email: ${company?.email || 'N/A'}
• Website: ${company?.website || 'N/A'}
• Fax: ${company?.fax || 'N/A'}
• Address: ${joinAddress(company) || 'N/A'}
• Blacklisted: ${company?.blacklisted ? 'Yes' : 'No'}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <CardGrid>
      <DetailCard
        title="Personal Details"
        subtitle="Who they are"
        icon="bi bi-person"
        accentColor="primary"
        actions={
          <WtButton inverted size="small" onClick={handleWhatsAppShare} startIcon={<WhatsAppIcon size={15} />}>
            Share
          </WtButton>
        }
      >
        <DetailRow label="Full Name" value={contact?.fullName || DASH} />
        <DetailRow label="Gender" value={contact?.gender || DASH} />
        <DetailRow label="Date of Birth" value={fmt(contact?.dateOfBirth)} />
        <DetailRow label="Anniversary" value={fmt(contact?.anniversary)} />
        <DetailRow label="Role in Company" value={contact?.roleInCompany || DASH} />
        <DetailRow label="Primary Contact" value={contact?.isPrimaryContact ? <ToneChip dense tone="warning" label="Primary" /> : "No"} />
        <DetailRow label="Status" value={<ToneChip dense tone="success" color={statusColor} label={statusName} />} />
        <DetailRow label="Visibility" value={contact?.visibility || DASH} isLast />
      </DetailCard>

      <DetailCard title="Contact & Address" subtitle="How to reach them" icon="bi bi-telephone" accentColor="blue">
        <DetailRow label="Email" value={mailLink(contact?.email)} />
        <DetailRow label="Phone" value={telLink(contact?.phone)} />
        <DetailRow label="Phone 2" value={telLink(contact?.phone2)} />
        <DetailRow label="Address" value={joinAddress(contact) || DASH} isLast={!contactCoords} />
        {contactCoords && <DetailRow label="Location" value={<DetailMapLink lat={contactCoords.lat} lng={contactCoords.lng} />} isLast />}
      </DetailCard>

      <DetailCard
        title="Company"
        subtitle="Where they work"
        icon="bi bi-buildings"
        accentColor="purple"
        actions={company?.id ? (
          <WtButton inverted size="small" onClick={() => navigate(`/companies/${company.id}`)} startIcon={<AppIcon name="exit-right-corner" className="fs-6" />}>
            View company
          </WtButton>
        ) : undefined}
      >
        <DetailRow
          label="Company"
          value={company?.id ? (
            <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
              <SmartAvatar name={company.companyName} id={company.id} imageUrl={company.logo} size={24} shape="rounded" />
              <DetailLink href={`/companies/${company.id}`}>{company.companyName}</DetailLink>
            </Box>
          ) : DASH}
        />
        <DetailRow label="Status" value={companyStatusChip(company?.status)} />
        <DetailRow label="Overall Rating" value={company?.overallRating ? `${company.overallRating} / 10` : DASH} />
        <DetailRow label="Blacklisted" value={company?.blacklisted ? <ToneChip dense tone="danger" label="Yes" /> : company ? "No" : DASH} />
        <DetailRow label="Visibility" value={company?.visibility || DASH} isLast />
      </DetailCard>

      <DetailCard title="Company Contact" subtitle="The company's own details" icon="bi bi-geo-alt" accentColor="teal">
        <DetailRow label="Phone" value={telLink(company?.phone)} />
        <DetailRow label="Phone 2" value={telLink(company?.phone2)} />
        <DetailRow label="Email" value={mailLink(company?.email)} />
        <DetailRow label="Fax" value={company?.fax || DASH} />
        <DetailRow label="Website" value={webLink(company?.website)} />
        <DetailRow label="Address" value={joinAddress(company) || DASH} isLast={!companyCoords} />
        {companyCoords && <DetailRow label="Location" value={<DetailMapLink lat={companyCoords.lat} lng={companyCoords.lng} />} isLast />}
      </DetailCard>
    </CardGrid>
  );
};

export default ContactOverview;
