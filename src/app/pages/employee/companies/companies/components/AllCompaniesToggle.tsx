import { useState, useEffect } from "react";
import { useParams, useNavigate,  } from "react-router-dom";
import { useTabKeyRoute } from "@app/hooks/useTabRoute";
import { Box, Menu, MenuItem, Rating, Stack, Typography } from "@mui/material";
import { getClientCompanyById } from "@services/companies";
import Overview from "./CompanyOverview";
import NewCompanyForm from "./NewCompanyForm";
import { Company } from "@models/companies";
import { useEventBus } from "@hooks/useEventBus";
import CompaniesBranchForm from "./CompaniesBranch";
import ClientContacts from "./ClientContacts";
import ClientContactsForm from "../../contacts/components/ClientContactsForm";
import CompaniesRating, { ratingBand, weightedRating } from "./CompaniesRating";
import CompaniesProject from "./CompaniesProject";
import CompaniesLeads from "./CompaniesLeads";

import DetailsModal from "@pages/employee/leads/lead/DetailsModal";
import { leadAndProjectTemplateTypeId } from "@constants/statistics";
import Loader from "@app/modules/common/utils/Loader";
import { getRatingByCompanyId } from "@services/projects";
import SubCompanies from "./SubCompanies";
import CompanyReferences from "./CompanyReferences";
import { AppIcon, GlassSurface, ToneChip, UnderlineTabs, WtButton, WtIconButton } from "@app/modules/common/components/ui";
import LeadReferenceTab from "./LeadReferenceTab";
import SmartAvatar from "@app/modules/common/components/SmartAvatar";
import { canSection } from "@utils/can";


type TabType =
  | "overview"
  | "leads"
  | "projects"
  | "contacts"
  | "subcompanies"
  | "branches"
  | "rating"
  | "references"
  | "lead-reference";

// The section whose records a tab shows, where that isn't Companies itself.
const TAB_SECTION: Partial<Record<TabType, string>> = {
  "lead-reference": "crm.leads",
  leads: "crm.leads",
  projects: "projects",
  contacts: "crm.contacts",
};

/** Tab keys in render order — they ARE the path segment (/companies/<id>/branches). */
const COMPANY_TAB_KEYS: TabType[] = [
  "overview", "lead-reference", "references", "projects", "contacts", "subcompanies", "branches", "rating",
];

const CompanyDetails = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const canWrite = canSection("crm.companies", "write");
  // The tab is a path segment (/companies/<id>/contacts) — shareable, survives a refresh,
  // and survives the remount the header does at the mobile breakpoint. Old ?tab= links
  // are rewritten to the path form once. Tabs that show another section's records are only
  // in the list with Read on that section, so a hidden one — even typed into the address —
  // falls back to Overview.
  const visibleTabKeys = COMPANY_TAB_KEYS.filter((k) => !TAB_SECTION[k] || canSection(TAB_SECTION[k]!));
  const { activeKey, setActiveKey } = useTabKeyRoute(undefined, visibleTabKeys);
  const activeTab = activeKey as TabType;
  const setActiveTab = (tab: TabType) => setActiveKey(tab);
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewCompanyModal, setShowNewCompanyModal] = useState(false);
  const [showEditCompanyModal, setShowEditCompanyModal] = useState(false);
  const [showNewContactModal, setShowNewContactModal] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);
  // Weighted factor score, 0–10. Nothing server-side writes company.overallRating, so it is
  // computed from the factors here and kept fresh by the Rating tab after an edit.
  const [rating, setRating] = useState(0);
  const [addMenuAnchor, setAddMenuAnchor] = useState<HTMLElement | null>(null);

  const handleNewCompanyClick = () => {
    setShowNewCompanyModal(true);
  };

  const handleCloseNewCompanyModal = () => {
    setShowNewCompanyModal(false);
  };

  const fetchCompanyDetails = async () => {
    if (!companyId) return;

    setIsLoading(true);
    try {
      const response = await getClientCompanyById(companyId);
      setCompany(response?.data?.company || null);
    } catch (error) {
      console.error("Failed to fetch company details", error);
      setCompany(null);
    } finally {
      setIsLoading(false);
    }
  };


  useEffect(() => {
    fetchCompanyDetails();
    if (companyId) {
      getRatingByCompanyId(companyId)
        .then((r: any) => setRating(weightedRating(r?.data?.companyRating || [])))
        .catch(() => setRating(0));
    }
  }, [companyId]);
  useEventBus("companyCreated", () => fetchCompanyDetails());

  const handleBackClick = () => {
    navigate(-1);
  };

  const handleEditClick = () => {
    setShowEditCompanyModal(true);
  };

  const handleCloseEditCompanyModal = () => {
    setShowEditCompanyModal(false);
  };

  const handleNewContactClick = () => {
    setShowNewContactModal(true);
  };

  const handleCloseNewContactModal = () => {
    setShowNewContactModal(false);
  };

  const handleNewProjectClick = () => {
    setShowNewProjectModal(true);
  };

  const handleCloseNewProjectModal = () => {
    setShowNewProjectModal(false);
  };

  const handleNewLeadClick = () => {
    setShowNewLeadModal(true);
  };

  const handleCloseModal = () => {
    setShowNewLeadModal(false);
  };

  /**
   * Tabs whose content owns a "create" flow surface their button HERE, in the page's
   * action row beside Add New — not floating over their own table, which left a stranded
   * button and a band of empty space above the grid.
   */
  const TAB_ADD_LABEL: Partial<Record<TabType, string>> = {
    subcompanies: "Add New Sub-Company",
    branches: "Add New Branch",
  };
  // Raised by the button above, lowered by the tab once it has opened its form.
  const [addRequested, setAddRequested] = useState(false);
  const addLabel = TAB_ADD_LABEL[activeTab];

  const tabs: Array<{ key: TabType; label: string; icon: string }> = [
    { key: "overview", label: "Overview", icon: "bi bi-building" },
    { key: "lead-reference", label: "Lead Reference", icon: "bi bi-signpost-split" },
    { key: "references", label: "Company References", icon: "bi bi-buildings" },
    { key: "projects", label: "Projects", icon: "bi bi-kanban" },
    { key: "contacts", label: "Contacts", icon: "bi bi-person-lines-fill" },
    { key: "subcompanies", label: "Subcompanies", icon: "bi bi-diagram-3" },
    { key: "branches", label: "Branches", icon: "bi bi-geo-alt" },
    { key: "rating", label: "Rating", icon: "bi bi-star" },
  ].filter((t) => !TAB_SECTION[t.key as TabType] || canSection(TAB_SECTION[t.key as TabType]!)) as Array<{ key: TabType; label: string; icon: string }>;

  const templateDataForLeads = [
    {
      id: leadAndProjectTemplateTypeId.newLead,
      title: 'Blank Lead',
      description: ""
    },
    {
      id: leadAndProjectTemplateTypeId.mep,
      title: 'MEP Lead',
      description: 'Template',
    }
  ];

  const renderTabContent = () => {
    if (!company) return null;

    switch (activeTab) {
      case "overview":
        return <Overview company={company} />;
      case "leads":
        return <CompaniesLeads companyId={company.id} />;
      case "projects":
        return <CompaniesProject companyId={company.id} />;
      case "contacts":
        return <ClientContacts companyId={company.id} />;
      case "branches":
        return <CompaniesBranchForm companyId={company.id} addRequested={addRequested} onAddHandled={() => setAddRequested(false)} />;
      case "subcompanies":
        return <SubCompanies companyId={company.id} companyTypeId={company.companyTypeId} addRequested={addRequested} onAddHandled={() => setAddRequested(false)} />;
      case "rating":
        return <CompaniesRating companyId={company.id} companyName={company.companyName} onRatingChange={setRating} />
      case "references":
        // Companies this company referred (it is their referral company).
        return <CompanyReferences referredCompanies={(company as any).referredCompanyReferences} />;
      case "lead-reference":
        // Leads this company referred (it is the referring company): analytics chart
        // (stacked by status, with value) + period filter driving the table below.
        return <LeadReferenceTab referredLeads={(company as any).referredLeads} />;
      default:
        return <Overview company={company} />;
    }
  };

  if (isLoading) {
    return <Loader/>
  }

  if (!company) {
    return (
      <div className="p-2 p-md-4">
        <div className="alert alert-warning">
          Company not found or failed to load.
        </div>
      </div>
    );
  }

  

  return (
    <div className="p-2 p-md-4">
      {/* Identity header — the contact page's shape: back, avatar (status ring), name with the
          live rating, and every page action in one row that wraps on small screens. */}
      <GlassSurface
        variant="thin"
        radius={16}
        sx={{
          p: { xs: 2, md: 2.5 },
          mb: { xs: 2, md: 3 },
          display: "flex",
          alignItems: "flex-start",
          gap: { xs: 1.5, md: 2.5 },
          flexWrap: { xs: "wrap", lg: "nowrap" },
        }}
      >
        <WtIconButton
          onClick={handleBackClick}
          title="Back"
          sx={{
            mt: 0.25, flexShrink: 0, width: 32, height: 32, borderRadius: "10px",
            bgcolor: "transparent", borderColor: "transparent", "& .fs-3": { fontSize: "1.05rem" },
          }}
        >
          <AppIcon name="arrow-left" className="fs-3" />
        </WtIconButton>

        <Box sx={{ flexShrink: 0 }}>
          <SmartAvatar
            name={company?.companyName}
            id={company?.id}
            imageUrl={company?.logo}
            size={84}
            shape="rounded"
            imageFit="cover"
            status={company?.status === "ACTIVE" ? "active" : "inactive"}
            enablePreview
          />
        </Box>

        <Stack spacing={0.75} sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
            #{company?.prefix || "N/A"}
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            {company.companyName}
          </Typography>
          {/* The score is a door to the Rating tab, not just a number. */}
          <Box
            component="button"
            type="button"
            onClick={() => setActiveTab("rating")}
            title="Open the Rating tab"
            sx={{
              alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 0.75,
              border: 0, bgcolor: "transparent", p: 0, cursor: "pointer", color: "text.primary",
              "&:hover .rating-score": { textDecoration: "underline" },
            }}
          >
            <Rating value={rating / 2} precision={0.1} readOnly size="small" sx={{ color: "#F5A623" }} />
            <Typography className="rating-score" component="span" sx={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
              {rating > 0 ? `${rating.toFixed(1)} / 10` : "Not rated"}
            </Typography>
            {rating > 0 && <ToneChip dense tone={ratingBand(rating).tone} label={ratingBand(rating).label} />}
          </Box>
        </Stack>

        {canWrite && (
          <Stack direction="row" gap={1} flexWrap="wrap"
            sx={{ flexShrink: 0, width: { xs: "100%", lg: "auto" }, justifyContent: { lg: "flex-end" } }}>
            <WtButton
              inverted
              size="small"
              onClick={(e) => setAddMenuAnchor(e.currentTarget)}
              startIcon={<AppIcon name="plus" className="fs-5" />}
              endIcon={<AppIcon name="down" className="fs-7" />}
              sx={{ whiteSpace: "nowrap" }}
            >
              Add new
            </WtButton>
            <Menu
              anchorEl={addMenuAnchor}
              open={!!addMenuAnchor}
              onClose={() => setAddMenuAnchor(null)}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
            >
              {[
                canSection("crm.leads", "write") && { label: "Lead", onClick: handleNewLeadClick },
                canSection("projects", "write") && { label: "Project", onClick: handleNewProjectClick },
                canSection("crm.contacts", "write") && { label: "Contact", onClick: handleNewContactClick },
                canSection("crm.companies", "write") && { label: "Company", onClick: handleNewCompanyClick },
              ].filter(Boolean).map((item: any) => (
                <MenuItem key={item.label} onClick={() => { setAddMenuAnchor(null); item.onClick(); }} sx={{ fontSize: 13.5 }}>
                  {item.label}
                </MenuItem>
              ))}
            </Menu>
            <WtButton size="small" onClick={handleEditClick} startIcon={<AppIcon name="pencil" className="fs-5" />} sx={{ whiteSpace: "nowrap" }}>
              Edit details
            </WtButton>
          </Stack>
        )}
      </GlassSurface>

      {/* A tab's own "create" action rides the tab bar's action slot, on the tabs' rule. */}
      <UnderlineTabs
        tabs={tabs}
        value={activeTab}
        onChange={setActiveTab}
        ariaLabel="Company sections"
        actions={canWrite && addLabel ? (
          <WtButton size="small" onClick={() => setAddRequested(true)} startIcon={<AppIcon name="plus" className="fs-5" />} sx={{ whiteSpace: "nowrap" }}>
            {addLabel}
          </WtButton>
        ) : undefined}
      />

      {/* Tab Content */}
      <div className="tab-content">{renderTabContent()}</div>

      {/* New Company Modal */}
      <NewCompanyForm
        show={showNewCompanyModal}
        onClose={handleCloseNewCompanyModal}
      />
      {/* Edit Company Modal */}
      <NewCompanyForm
        show={showEditCompanyModal}
        onClose={handleCloseEditCompanyModal}
        editingCompanyId={company.id}
      />
      {/* New Contact Modal */}
      <ClientContactsForm
        show={showNewContactModal}
        onClose={handleCloseNewContactModal}
      />

      {/* New Project Modal */}
      <DetailsModal
        open={showNewProjectModal}
        onClose={handleCloseNewProjectModal}
        Datas={templateDataForLeads}
      />

      {/* Add New Lead */}
      <DetailsModal
        open={showNewLeadModal}
        onClose={handleCloseModal}
        Datas={templateDataForLeads}
      />
    </div>
  );
};

export default CompanyDetails;
