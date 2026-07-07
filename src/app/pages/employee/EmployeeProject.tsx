import { useEffect, useState } from "react";
import {
  getAllProjectCategories,
  getProjectsByEmployeeId,
  getAllProjectSubcategories,
  getAllTeams,
} from "@services/projects";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import {
  getAllClientCompanies,
  getAllClientContacts,
} from "@services/companies";
import { getAllClientBranches } from "@services/lead";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import dayjs from "dayjs";
import { formatNumber } from "@utils/statistics";
import Loader from "@app/modules/common/utils/Loader";
import { useNavigate } from "react-router-dom";

/**
 * EmployeeProject — the "Projects" tab on the employee detail page. Mirrors the
 * Company/Contact Projects tabs, but lists the Received leads (projects) the
 * employee is involved in: as the assignee, the project manager, an execution-
 * team member, or an explicit per-lead internal roster member (resolved backend
 * side in getProjectsByEmployeeId).
 */
const EmployeeProject = ({ employeeId }: { employeeId: string }) => {
  const currentUserId = useSelector(
    (state: RootState) => state.auth?.currentUser?.id
  );

  const allEmployees = useSelector((state: RootState) => state?.allEmployees);

  const [loading, setLoading] = useState<boolean>(false);
  const [allProjects, setAllProjects] = useState<any>([]);
  const [allProjectCategories, setAllProjectCategories] = useState<any>([]);
  const [allProjectSubcategories, setAllProjectSubcategories] = useState<any>(
    []
  );
  const [allClientCompanies, setAllClientCompanies] = useState<any>([]);
  const [allClientContacts, setAllClientContacts] = useState<any>([]);
  const [allClientBranches, setAllClientBranches] = useState<any>([]);
  const [allTeams, setAllTeams] = useState<any>([]);

  const navigate = useNavigate();

  const getAllProjectsData = async () => {
    try {
      setLoading(true);
      const response = await getProjectsByEmployeeId(employeeId);
      const response2 = await getAllProjectCategories();
      const response3 = await getAllProjectSubcategories();
      const response5 = await getAllClientCompanies();
      const response6 = await getAllClientContacts({}, true);
      const response7 = await getAllClientBranches();
      const response11 = await getAllTeams();
      setAllProjects(response.data?.projects || []);
      setAllProjectCategories(response2?.projectCategories);
      setAllProjectSubcategories(response3?.projectSubCategories);
      setAllClientCompanies(response5.data?.companies);
      setAllClientContacts(response6.data?.contacts);
      setAllClientBranches(response7.data?.leadBranches);
      setAllTeams(response11?.data?.teams);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    getAllProjectsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  const findClientCompanyName = (companyId: string | undefined) => {
    if (!companyId) return null;
    const company = allClientCompanies.find((c: any) => c.id === companyId);
    return company?.companyName || null;
  };

  const findClientContactPersonName = (contactPersonId: string | undefined) => {
    if (!contactPersonId) return null;
    const contactPerson = allClientContacts.find(
      (c: any) => c.id === contactPersonId
    );
    return contactPerson?.fullName || null;
  };

  const findClientBranchName = (branchId: string | undefined) => {
    if (!branchId) return null;
    const branch = allClientBranches.find((b: any) => b.id === branchId);
    return branch?.name || null;
  };

  const columns = [
    {
      accessorKey: "title",
      header: "Project Name",
      Cell: ({ row }: any) => (
        <button
          className="btn btn-link p-0 text-start text-decoration-none"
          style={{ color: "inherit", fontWeight: "600", fontSize: "14px" }}
          onClick={() => {
            navigate(`/projects/${row.original.id}`);
          }}
        >
          {row.original.title}
        </button>
      ),
    },
    {
      accessorKey: "clientCompanies",
      header: "Client Companies",
      Cell: ({ row }: any) => {
        const companies = row.original.projectCompanyMappings || [];
        const companyNames = companies
          .map((mapping: any) => findClientCompanyName(mapping.companyId))
          .filter(Boolean);
        return companyNames.length ? companyNames.join(", ") : "-";
      },
    },
    {
      accessorKey: "projectCategoryId",
      header: "Project Category Name",
      Cell: ({ renderedCellValue }: any) => {
        const projectCategory = allProjectCategories.find(
          (category: any) => category.id === renderedCellValue
        );
        return projectCategory?.name;
      },
    },
    {
      accessorKey: "projectSubCategoryId",
      header: "Project Sub Category",
      Cell: ({ renderedCellValue }: any) => {
        const projectSubCategory = allProjectSubcategories.find(
          (category: any) => category.id === renderedCellValue
        );
        return projectSubCategory?.name;
      },
    },
    {
      accessorKey: "branchNames",
      header: "Branch Name",
      Cell: ({ row }: any) => {
        const mappings = row?.original?.projectCompanyMappings || [];
        const branchName = mappings
          .map((mapping: any) => findClientBranchName(mapping.branchId))
          .filter(Boolean);
        return branchName.length ? branchName.join(", ") : "-";
      },
    },
    {
      accessorKey: "statusId",
      header: "Status Name",
      Cell: ({ row }: any) => {
        const statusData = row?.original?.status;
        return statusData?.name ? (
          <div
            className="badge badge-light"
            style={{ backgroundColor: statusData?.color, color: "white" }}
          >
            {statusData?.name}
          </div>
        ) : (
          "-"
        );
      },
    },
    {
      accessorKey: "startDate",
      header: "Start Date",
      Cell: ({ renderedCellValue }: any) =>
        renderedCellValue
          ? dayjs(new Date(renderedCellValue)).format("DD-MM-YYYY")
          : "N/A",
    },
    {
      accessorKey: "endDate",
      header: "End Date",
      Cell: ({ renderedCellValue }: any) =>
        renderedCellValue
          ? dayjs(new Date(renderedCellValue)).format("DD-MM-YYYY")
          : "N/A",
    },
    {
      accessorKey: "rate",
      header: "Rate",
      Cell: ({ renderedCellValue }: any) => formatNumber(renderedCellValue),
    },
    {
      accessorKey: "cost",
      header: "Cost",
      Cell: ({ renderedCellValue }: any) => formatNumber(renderedCellValue),
    },
    {
      accessorKey: "teamId",
      header: "Team Name",
      Cell: ({ renderedCellValue }: any) =>
        renderedCellValue
          ? allTeams.find((team: any) => team.id === renderedCellValue)?.name
          : "N/A",
    },
    {
      accessorKey: "projectManagerId",
      header: "Project Manager Name",
      Cell: ({ renderedCellValue }: any) =>
        renderedCellValue
          ? allEmployees?.list?.find(
              (employee: any) => employee.employeeId === renderedCellValue
            )?.employeeName
          : "N/A",
    },
    {
      accessorKey: "contactPersonNames",
      header: "Contact Person Name",
      Cell: ({ row }: any) => {
        const mappings = row?.original?.projectCompanyMappings || [];
        const contactPersonName = mappings
          .map((mapping: any) =>
            findClientContactPersonName(mapping.contactPersonId)
          )
          .filter(Boolean);
        return contactPersonName.length ? contactPersonName.join(", ") : "-";
      },
    },
    {
      accessorKey: "leadAssignedTo",
      header: "Lead Assigned To Name",
      Cell: ({ renderedCellValue }: any) =>
        renderedCellValue
          ? allEmployees?.list?.find(
              (employee: any) => employee.employeeId === renderedCellValue
            )?.employeeName
          : "N/A",
    },
    {
      accessorKey: "createdAt",
      header: "Created At",
      Cell: ({ renderedCellValue }: any) =>
        renderedCellValue
          ? dayjs(renderedCellValue).format("DD-MM-YYYY")
          : "N/A",
    },
    {
      accessorKey: "inquiryDate",
      header: "Inquiry Date",
      Cell: ({ renderedCellValue }: any) =>
        renderedCellValue
          ? dayjs(renderedCellValue).format("DD-MM-YYYY")
          : "N/A",
    },
  ];

  if (loading) {
    return <Loader />;
  }

  return (
    <div>
      <MaterialTable
        data={allProjects}
        columns={columns}
        tableName="Projects"
        employeeId={currentUserId}
        defaultSorting={[{ id: "title", desc: false }]}
        muiTableProps={{
          muiTableBodyRowProps: ({ row }) => {
            const status = row.original?.status ?? "";
            return {
              sx: {
                backgroundColor: `${status.color}40`,
                color: "#333",
              },
            };
          },
        }}
      />
    </div>
  );
};

export default EmployeeProject;
