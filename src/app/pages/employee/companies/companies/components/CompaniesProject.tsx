import { useEffect, useState } from "react";
import { getProjectsByCompanyId } from "@services/projects";
import AnalyticsTab from "@app/modules/common/components/AnalyticsTab";
import Loader from "@app/modules/common/utils/Loader";
import { ProjectListTable } from "@app/pages/employee/projects/table/ProjectListTable";
import { canViewCommercial } from "@utils/can";

/**
 * How a project lands on the chart, shared with the Contact Projects tab so both
 * report the same thing.
 *
 * Charted on the RECEIVED date — the Lead Status step's Received Date, the day the
 * lead became a project, so that IS the project's start. startDate / inquiryDate /
 * createdAt only stand in for rows that never got one. `projectValue` is resolved
 * server-side (fee line items, falling back to the agreed cost) so the money here
 * matches the Lead Reference tab.
 */
export const projectRow = (p: any) => ({
  date: p?.receivedDate || p?.startDate || p?.inquiryDate || p?.createdAt,
  // 0 turns the chart's Amount toggle and ₹ figures off.
  value: canViewCommercial('projects') ? Number(p?.projectValue) || 0 : 0,
  series: p?.status?.name || "No status",
  color: p?.status?.color,
  label: p?.title,
  href: p?.id ? `/projects/${p.id}` : undefined,
});

const CompaniesProject = ({ companyId }: { companyId: string }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [allProjects, setAllProjects] = useState<any[]>([]);

  useEffect(() => {
    setLoading(true);
    getProjectsByCompanyId(companyId)
      .then((response: any) => setAllProjects(response.data?.projects || []))
      .catch((error) => console.log(error))
      .finally(() => setLoading(false));
  }, [companyId]);

  if (loading) {
    return <Loader />;
  }

  return (
    <AnalyticsTab
      items={allProjects}
      toRow={projectRow}
      title="Projects — Business"
      icon="bi-briefcase"
      noun="project"
      storageKey="companyProjectsPeriodMode"
    >
      {/* V2: new column keys — old saved prefs referenced the removed columns. */}
      {(filtered) => <ProjectListTable projects={filtered} tableName="CompanyProjectsV2" />}
    </AnalyticsTab>
  );
};

export default CompaniesProject;
