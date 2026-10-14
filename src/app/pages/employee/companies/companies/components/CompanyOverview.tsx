import { Company } from "@models/companies";
import { useEffect, useState } from "react";
import { Link, Typography } from "@mui/material";
import NoteModal from "./NoteModal";
import { getClientBranchesByCompanyId } from "@services/lead";
import { getAllCompanyTypes } from "@services/companies";
import dayjs from "dayjs";
import { getTimeTokens } from '@utils/timeFormat';
import { canSection } from '@utils/can';
import { DetailCard, DetailRow, DetailMapLink } from "@app/modules/detail-page/DetailPageComponents";
import { CardGrid } from "@app/pages/employee/entity/detail/sections/SummarySection";
import { DASH } from "@app/pages/employee/entity/detail/entityViewModel";
import { AppIcon, ToneChip, WtButton } from "@app/modules/common/components/ui";

// Resolve an audit relation (createdBy/updatedBy) — loaded via getById — into a display name.
const auditName = (rel: any): string =>
  [rel?.users?.firstName, rel?.users?.lastName].filter(Boolean).join(" ").trim() || DASH;

const stamp = (v?: string | null) => (v ? dayjs(v).format(`DD MMM YYYY, ${getTimeTokens().TIME}`) : DASH);

/** Valid, non-zero coordinates — a 0,0 pin is "never set", not the Gulf of Guinea. */
export const coordsOf = (lat: any, lng: any) => {
  const la = parseFloat(String(lat));
  const ln = parseFloat(String(lng));
  return !isNaN(la) && !isNaN(ln) && la !== 0 && ln !== 0 ? { lat: la, lng: ln } : null;
};

export const telLink = (v?: string | null) =>
  v ? <Link href={`tel:${v.replace(/[^\d+]/g, "")}`} underline="hover" color="inherit" sx={{ fontSize: "inherit" }}>{v}</Link> : DASH;

export const mailLink = (v?: string | null) =>
  v ? <Link href={`mailto:${v}`} underline="hover" sx={{ fontSize: "inherit" }}>{v}</Link> : DASH;

export const webLink = (v?: string | null) =>
  v ? <Link href={/^https?:\/\//i.test(v) ? v : `https://${v}`} target="_blank" rel="noopener noreferrer" underline="hover" sx={{ fontSize: "inherit" }}>{v}</Link> : DASH;

/** ACTIVE / CLOSED as the kit's status chip. */
export const companyStatusChip = (status?: string | null) =>
  status ? (
    <ToneChip
      dense
      tone={status === "ACTIVE" ? "success" : "danger"}
      label={status === "ACTIVE" ? "Active" : status === "CLOSED" ? "Inactive" : status}
    />
  ) : DASH;

interface OverviewProps {
  company: Company;
}

/** Company → Overview tab, on the same DetailCard kit as the lead / employee detail pages. */
const Overview = ({ company }: OverviewProps) => {
  const canWrite = canSection('crm.companies', 'write');
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);
  const [companyTypes, setCompanyTypes] = useState<any[]>([]);
  const c = company as any;

  useEffect(() => {
    Promise.all([getClientBranchesByCompanyId(company.id), getAllCompanyTypes()])
      .then(([b, t]: any[]) => {
        setBranches(b?.leadBranches || []);
        setCompanyTypes(t?.companyTypes || []);
      })
      .catch((error) => console.error("Failed to fetch branches", error));
  }, [company.id]);

  const coords = coordsOf(company.latitude, company.longitude);

  return (
    <>
      <CardGrid>
        <DetailCard title="Company Info" subtitle="Status and classification" icon="bi bi-building" accentColor="primary">
          <DetailRow label="Status" value={companyStatusChip(company.status)} />
          <DetailRow label="Blacklisted" value={company.blacklisted ? <ToneChip dense tone="danger" label="Yes" /> : "No"} />
          <DetailRow label="Company" value={company.companyName || DASH} />
          <DetailRow label="Company Type" value={companyTypes.find((t) => t.id === company.companyTypeId)?.name || DASH} />
          <DetailRow label="Branches" value={branches.length} />
          <DetailRow label="Visibility" value={company.visibility || DASH} />
          <DetailRow label="Created By" value={auditName(c.createdBy)} />
          <DetailRow label="Created" value={stamp(c.createdAt)} />
          <DetailRow label="Last Edited By" value={auditName(c.updatedBy)} />
          <DetailRow label="Last Edited" value={stamp(c.updatedAt)} isLast />
        </DetailCard>

        <DetailCard title="Contact Information" subtitle="How to reach the company" icon="bi bi-telephone" accentColor="blue">
          <DetailRow label="Phone" value={telLink(company.phone)} />
          <DetailRow label="Phone 2" value={telLink(company.phone2)} />
          <DetailRow label="Email" value={mailLink(company.email)} />
          <DetailRow label="Fax" value={company.fax || DASH} />
          <DetailRow label="Website" value={webLink(company.website)} isLast />
        </DetailCard>

        <DetailCard title="Address" subtitle="Registered location" icon="bi bi-geo-alt" accentColor="teal">
          <DetailRow label="Address" value={company.address || DASH} />
          <DetailRow label="Area" value={company.area || DASH} />
          <DetailRow label="City" value={company.city || DASH} />
          <DetailRow label="State" value={company.state || DASH} />
          <DetailRow label="Country" value={company.country || DASH} />
          <DetailRow label="ZIP Code" value={company.zipCode || DASH} isLast={!coords} />
          {coords && <DetailRow label="Location" value={<DetailMapLink lat={coords.lat} lng={coords.lng} />} isLast />}
        </DetailCard>

        <DetailCard
          title="Notes"
          subtitle="Internal remarks"
          icon="bi bi-journal-text"
          accentColor="amber"
          actions={canWrite ? (
            <WtButton inverted size="small" onClick={() => setShowNoteModal(true)} startIcon={<AppIcon name="pencil" className="fs-6" />}>
              Edit notes
            </WtButton>
          ) : undefined}
        >
          <Typography sx={{ fontSize: 13.5, lineHeight: 1.6, whiteSpace: "pre-wrap", py: 1.5, color: company.note ? "text.primary" : "text.disabled" }}>
            {company.note || "No notes yet."}
          </Typography>
        </DetailCard>
      </CardGrid>

      <NoteModal show={showNoteModal} onClose={() => setShowNoteModal(false)} companyId={company.id} />
    </>
  );
};

export default Overview;
