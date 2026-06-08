import { useEffect, useState } from "react";
import {
  getAllProjectCategories,
  getProjectsByCompanyId,
  getAllProjectStatuses,
  getAllProjectSubcategories,
  getAllTeams,
} from "@services/projects";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import {
  getAllClientCompanies,
  getAllClientContacts,
} from "@services/companies";
import { fetchAllEmployees } from "@services/employee";
import {
  fetchAllCountries,
} from "@services/options";
import { getAllClientBranches } from "@services/lead";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import dayjs from "dayjs";
import { formatNumber } from "@utils/statistics";
import { getAllCompanyTypes } from "@services/companies";
import Loader from "@app/modules/common/utils/Loader";
import { useNavigate } from "react-router-dom";

const CompaniesProject = ({ companyId }: { companyId: string }) => {
  const employeeId = useSelector(
    (state: RootState) => state.auth?.currentUser?.id
  );

  const allEmployees = useSelector(
    (state: RootState) => state?.allEmployees
  );

  

  const [loading, setLoading] = useState<boolean>(false);
  const [allProjects, setAllProjects] = useState<any>([]);
  const [allProjectCategories, setAllProjectCategories] = useState<any>([]);
  const [allProjectSubcategories, setAllProjectSubcategories] = useState<any>(
    []
  );
  const [allProjectStatuses, setAllProjectStatuses] = useState<any>([]);
  const [allClientCompanies, setAllClientCompanies] = useState<any>([]);
  const [allClientContacts, setAllClientContacts] = useState<any>([]);
  const [allClientBranches, setAllClientBranches] = useState<any>([]);
  const [allCountries, setAllCountries] = useState<any>([]);
  const [allCompanyTypes, setAllCompanyTypes] = useState<any>([]);
  const [allTeams, setAllTeams] = useState<any>([]);
  const [rowColors, setRowColors] = useState<any>([]);

  const navigate = useNavigate();

  const getAllProjectsData = async () => {
    try {
      setLoading(true);
      const response = await getProjectsByCompanyId(companyId);
      const response2 = await getAllProjectCategories();
      const response3 = await getAllProjectSubcategories();
      const response4 = await getAllProjectStatuses();
      const response5 = await getAllClientCompanies();
      const response6 = await getAllClientContacts();
      const response7 = await getAllClientBranches();
      const response9 = await fetchAllCountries();
      const response10 = await getAllCompanyTypes();
      const response11 = await getAllTeams();
      setAllProjects(response.data?.projects);
      setAllProjectCategories(response2?.projectCategories);
      setAllProjectSubcategories(response3?.projectSubCategories);
      setAllProjectStatuses(response4?.projectStatuses);
      setAllClientCompanies(response5.data?.companies);
      setAllClientContacts(response6.data?.contacts);
      setAllClientBranches(response7.data?.leadBranches);
      setAllCountries(response9.data?.countries);
      setAllCompanyTypes(response10?.companyTypes);
      setAllTeams(response11?.data?.teams);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    getAllProjectsData();
  }, []);

  useEffect(() => {
    const colors = allProjects.map((project: any) => {
      const projectStatus = allProjectStatuses.find(
        (status: any) => status.id === project.statusId
      );
      return {
        color: projectStatus?.color,
        statusId: project.statusId,
      };
    });
    setRowColors(colors);
  }, [allProjects]);

  const findClientCompanyName = (companyId: string | undefined) => {
    if (!companyId) return null;
    const company = allClientCompanies.find(
      (c: any) => c.id === companyId
    );
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
    const branch = allClientBranches.find(
      (b: any) => b.id === branchId
    );
    return branch?.name || null;
  };

  // set background color based on project status of each row
  const columns = [
    {
      accessorKey: "title",
      header: "Project Name",
      Cell: ({ row }: any) => (
        <button
          className="btn btn-link p-0 text-start text-decoration-none"
          style={{
            color: "inherit",
            fontWeight: "600",
            fontSize: "14px",
          }}
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
    
        const companyNames = companies.map((mapping: any) => findClientCompanyName(mapping.companyId)).filter(Boolean);
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
        const branchId = row?.original?.projectCompanyMappings;
    
        const branchName = branchId.map((mapping: any) => findClientBranchName(mapping.branchId)).filter(Boolean);
        return branchName.length ? branchName.join(", ") : "-";
      },
    },
    {
      accessorKey: "statusId",
      header: "Status Name",
      Cell: ({ renderedCellValue }: any) => {
        const statusData = allProjectStatuses.find((status: any) => status.id === renderedCellValue)
        return (
          <div
            className="badge badge-light"
            style={{ backgroundColor: statusData?.color, color:"white" }}
          >
            {statusData?.name}
          </div>
        );
      },
    },
    {
      accessorKey: "startDate",
      header: "Start Date",
      Cell: ({ renderedCellValue }: any) => {
        const startDate = new Date(renderedCellValue);
        return dayjs(startDate).format("DD-MM-YYYY");
      },
    },
    {
      accessorKey: "endDate",
      header: "End Date",
      Cell: ({ renderedCellValue }: any) => {
        const endDate = new Date(renderedCellValue);
        return dayjs(endDate).format("DD-MM-YYYY");
      },
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
      accessorKey: "projectAccess",
      header: "Project Access",
      Cell: ({ renderedCellValue }: any) => renderedCellValue,
    },
    {
      accessorKey: "description",
      header: "Description",
      Cell: ({ renderedCellValue }: any) => renderedCellValue,
    },
    {
      accessorKey: "createdById",
      header: "Created By Name",
      Cell: ({ renderedCellValue }: any) => {
        const employee = allEmployees?.list?.find(
          (employee: any) => employee.employeeId === renderedCellValue
        );

        return employee?.employeeName;
      },
    },
    {
      accessorKey: "editedById",
      header: "Edited By Name",
      Cell: ({ renderedCellValue }: any) => {
        if (renderedCellValue != null) {
          const employee = allEmployees?.list?.find(
            (employee: any) => employee.employeeId === renderedCellValue
          );
          return employee?.employeeName;
        } else {
          return "N/A";
        }
      },
    },
    {
      accessorKey: "createdAt",
      header: "Created At",
      Cell: ({ renderedCellValue }: any) =>
        dayjs(renderedCellValue).format("DD-MM-YYYY"),
    },
    {
      accessorKey: "updatedAt",
      header: "Updated At",
      Cell: ({ renderedCellValue }: any) =>
        dayjs(renderedCellValue).format("DD-MM-YYYY"),
    },
    {
      accessorKey: "inquiryDate",
      header: "Inquiry Date",
      Cell: ({ renderedCellValue }: any) =>
        renderedCellValue
          ? dayjs(renderedCellValue).format("DD-MM-YYYY")
          : "N/A",
    },
    {
      accessorKey: "contactPersonNames", 
      header: "Contact Person Name",
      Cell: ({ row }: any) =>{
        const contactPersonId = row?.original?.projectCompanyMappings;

        const contactPersonName = contactPersonId.map((mapping: any) => findClientContactPersonName(mapping.contactPersonId)).filter(Boolean);
        return contactPersonName.join(", ");
      }
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
      accessorKey: "leadInquiryDate",
      header: "Lead Inquiry Date",
      Cell: ({ renderedCellValue }: any) =>
        renderedCellValue
          ? dayjs(renderedCellValue).format("DD-MM-YYYY")
          : "N/A",
    },
    {
      accessorKey: "leadContactId",
      header: "Lead Contact Name",
      Cell: ({ renderedCellValue }: any) =>
        renderedCellValue
          ? allClientContacts.find(
              (contact: any) => contact.id === renderedCellValue
            )?.fullName
          : "N/A",
    },
    {
      accessorKey: "projectArea",
      header: "Project Area",
      Cell: ({ renderedCellValue }: any) =>
        renderedCellValue ? renderedCellValue : "N/A",
    },
    {
      accessorKey: "projectAddress",
      header: "Project Address",
      Cell: ({ renderedCellValue }: any) =>
        renderedCellValue ? renderedCellValue : "N/A",
    },
    {
      accessorKey: "zipcode",
      header: "Zip Code",
      Cell: ({ renderedCellValue }: any) =>
        renderedCellValue ? renderedCellValue : "N/A",
    },
    {
      accessorKey: "mapLocation",
      header: "Map Location",
      Cell: ({ renderedCellValue }: any) =>
        renderedCellValue ? renderedCellValue : "N/A",
    },
    {
      accessorKey: "country",
      header: "Country",
      Cell: ({ renderedCellValue }: any) =>
        renderedCellValue ? renderedCellValue : "N/A",
    },
    {
      accessorKey: "state",
      header: "State",
      Cell: ({ renderedCellValue }: any) =>
        renderedCellValue ? renderedCellValue : "N/A",
    },
    {
      accessorKey: "city",
      header: "City",
      Cell: ({ renderedCellValue }: any) =>
        renderedCellValue ? renderedCellValue : "N/A",
    },
    {
      accessorKey: "locality",
      header: "Locality",
      Cell: ({ renderedCellValue }: any) =>
        renderedCellValue ? renderedCellValue : "N/A",
    },
    {
      accessorKey: "poNumber",
      header: "PO Number",
      Cell: ({ renderedCellValue }: any) =>
        renderedCellValue ? renderedCellValue : "N/A",
    },
    {
      accessorKey: "poDate",
      header: "PO Date",
      Cell: ({ renderedCellValue }: any) =>
        renderedCellValue
          ? dayjs(renderedCellValue).format("DD-MM-YYYY")
          : "N/A",
    },
    {
      accessorKey: "leadDirectSourceId",
      header: "Lead Direct Source Name",
      Cell: ({ renderedCellValue }: any) =>
        renderedCellValue ? renderedCellValue : "N/A",
    },
]

  if (loading) {
    return <Loader />;
  }

  return (
    <div>
      <MaterialTable
        data={allProjects}
        columns={columns}
        tableName="Projects"
        employeeId={employeeId}
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

export default CompaniesProject; 
