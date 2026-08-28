import React from "react";
import ProjectBillingWorkspace from "./billing/ProjectBillingWorkspace";

/**
 * Project → Billing.
 *
 * A thin adapter: the tab receives the whole `lead` entity, the workspace needs
 * only its id. Everything else lives in `./billing/`, which is a CONSUMER of the
 * Billing module — it reads one aggregated payload from `/billing/projects/:id/
 * workspace` and navigates into Billing for every write.
 */
const BillingSection: React.FC<{ lead?: any }> = ({ lead }) => (
    <ProjectBillingWorkspace projectId={lead?.id} />
);

export default BillingSection;
