import { useEffect, useState } from "react";
import { getProjectsByEmployeeId } from "@services/projects";
import Loader from "@app/modules/common/utils/Loader";
import { ProjectListTable } from "@app/pages/employee/projects/table/ProjectListTable";

/**
 * EmployeeProject — the "Projects" tab on the employee detail page: the Received leads
 * (projects) the employee is involved in, as assignee, project manager, execution-team
 * member or internal roster member (resolved backend side in getProjectsByEmployeeId).
 *
 * Rendered with the SAME table as the Projects page and the Company / Contact tabs, so
 * columns, status pills and row colours match everywhere.
 *
 * `reloadKey` — bump it to refetch (the tab bar's "Add to projects" does).
 */
const EmployeeProject = ({ employeeId, reloadKey = 0 }: { employeeId: string; reloadKey?: number }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [allProjects, setAllProjects] = useState<any[]>([]);

  useEffect(() => {
    setLoading(true);
    getProjectsByEmployeeId(employeeId)
      .then((response: any) => setAllProjects(response.data?.projects || []))
      .catch((error) => console.log(error))
      .finally(() => setLoading(false));
  }, [employeeId, reloadKey]);

  if (loading) {
    return <Loader />;
  }

  return <ProjectListTable projects={allProjects} tableName="EmployeeProjectsV2" />;
};

export default EmployeeProject;
