import { useEffect, useState } from "react";
import AnalyticsTab from "@app/modules/common/components/AnalyticsTab";
import { projectRow } from "../../companies/components/CompaniesProject";
import { getProjectsByContactId } from "@services/companies";
import Loader from "@app/modules/common/utils/Loader";
import { ProjectListTable } from "@app/pages/employee/projects/table/ProjectListTable";

const ContactProject = ({ contact }: { contact: any }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [allProjects, setAllProjects] = useState<any[]>([]);

  useEffect(() => {
    // Contact-scoped endpoint: projects where this contact is on the Teams page
    // external roster, instead of client-side filtering all projects.
    setLoading(true);
    getProjectsByContactId(contact?.id)
      .then((response: any) => setAllProjects(response.data?.projects || []))
      .catch((error) => console.log(error))
      .finally(() => setLoading(false));
  }, [contact]);

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
      storageKey="contactProjectsPeriodMode"
    >
      {/* V2: new column keys — old saved prefs referenced the removed columns. */}
      {(filtered) => <ProjectListTable projects={filtered} tableName="ContactProjectsV2" />}
    </AnalyticsTab>
  );
};

export default ContactProject;
