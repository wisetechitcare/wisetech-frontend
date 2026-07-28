import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@redux/store";
import dayjs from "dayjs";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import Loader from "@app/modules/common/utils/Loader";
import { formatNumber } from "@utils/statistics";
import { getProjectsByEmployeeId } from "@services/projects";

/**
 * MyProjects — the employee-facing Projects view. Lists ONLY the projects the
 * current employee is involved in (assignee / project manager / execution-team
 * member / internal roster member), resolved server-side by getProjectsByEmployeeId.
 * Deliberately calls no CRM/company lookups (those require crm.leads.view and would
 * 403 for a plain employee), so it renders the essentials straight off the project.
 */
const MyProjects = () => {
  const employeeId = useSelector((s: RootState) => s.employee?.currentEmployee?.id);
  const currentUserId = useSelector((s: RootState) => s.auth?.currentUser?.id);

  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    if (!employeeId) return;
    let alive = true;
    setLoading(true);
    getProjectsByEmployeeId(employeeId)
      .then((res) => { if (alive) setProjects(res?.data?.projects || []); })
      .catch(() => { if (alive) setProjects([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [employeeId]);

  const columns = [
    { accessorKey: "title", header: "Project Name" },
    {
      accessorKey: "statusId",
      header: "Status",
      Cell: ({ row }: any) => {
        const status = row?.original?.status;
        return status?.name ? (
          <div className="badge badge-light" style={{ backgroundColor: status?.color, color: "white" }}>
            {status.name}
          </div>
        ) : "-";
      },
    },
    {
      accessorKey: "startDate",
      header: "Start Date",
      Cell: ({ renderedCellValue }: any) => (renderedCellValue ? dayjs(new Date(renderedCellValue)).format("DD-MM-YYYY") : "N/A"),
    },
    {
      accessorKey: "endDate",
      header: "End Date",
      Cell: ({ renderedCellValue }: any) => (renderedCellValue ? dayjs(new Date(renderedCellValue)).format("DD-MM-YYYY") : "N/A"),
    },
    { accessorKey: "rate", header: "Rate", Cell: ({ renderedCellValue }: any) => formatNumber(renderedCellValue) },
    { accessorKey: "cost", header: "Cost", Cell: ({ renderedCellValue }: any) => formatNumber(renderedCellValue) },
  ];

  if (loading) return <Loader />;

  return (
    <div>
      <MaterialTable
        data={projects}
        columns={columns}
        tableName="MyProjects"
        employeeId={currentUserId}
        defaultSorting={[{ id: "title", desc: false }]}
      />
    </div>
  );
};

export default MyProjects;
