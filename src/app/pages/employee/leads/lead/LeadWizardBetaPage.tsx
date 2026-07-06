import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import LeadWizardModal from "./LeadWizardModal";
import { getLeadById } from "@services/leads";
import { mapLeadToFormInitialValues } from "./utils";

/**
 * LeadWizardBetaPage — opt-in preview of the migrated EnterpriseForm wizard UI.
 *
 * PARALLEL to the classic `LeadFormModal` flow (which stays the default everywhere
 * and is untouched). `LeadWizardModal` reuses backup2's exact lead data layer
 * (initialValues, validationSchema, handleSubmit → createLead/updateLead) and only
 * swaps the rendered UI to the migrated `LeadWorkspace` wizard. Leads remain the
 * single source of truth; no Project-table logic is involved.
 *
 * Routes:
 *   /qc/leads/wizard-beta        → create a new lead in the wizard
 *   /qc/leads/wizard-beta/:id    → open an existing lead (edit mode) in the wizard
 *
 * ⚠️ BETA — pending runtime QA (cascade behaviour + a verified test create/edit
 * against the backend) before it is promoted from opt-in to a default flow.
 */
const LeadWizardBetaPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEditMode = !!id;

  // For create mode formValues is a blank shell; for edit mode it is loaded async.
  const [formValues, setFormValues] = useState<any>(isEditMode ? null : { title: "" });
  const [loading, setLoading] = useState<boolean>(isEditMode);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res: any = await getLeadById(id);
        // EntityDetailPage uses res.data.data.lead; keep fallbacks for other shapes.
        const lead =
          res?.data?.data?.lead ?? res?.data?.lead ?? res?.data?.data ?? res?.data;
        if (!cancelled) setFormValues(mapLeadToFormInitialValues(lead));
      } catch (e) {
        if (!cancelled) setError("Failed to load the lead. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center p-20">
        <span className="spinner-border text-primary" role="status" aria-hidden="true" />
        <span className="ms-3 fs-5 text-muted">Loading lead…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger m-10" role="alert">
        {error}
      </div>
    );
  }

  if (isEditMode && !formValues) return null;

  return (
    <LeadWizardModal
      key={isEditMode ? formValues?.id || id : "new-wizard-lead"}
      leadTemplateId={isEditMode ? formValues?.leadTemplateId || "" : ""}
      open={true}
      onClose={() => navigate("/qc/leads")}
      title={
        isEditMode
          ? "Edit Lead — EnterpriseForm Wizard (Beta)"
          : "Create Lead — EnterpriseForm Wizard (Beta)"
      }
      initialData={isEditMode ? { id: formValues?.leadTemplateId } : { title: "" }}
      initialFormData={isEditMode ? formValues : {}}
      isEditMode={isEditMode}
    />
  );
};

export default LeadWizardBetaPage;
