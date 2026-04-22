import { useEffect, useMemo, useState } from "react";
import {
  deleteProjectById,
  getAllProjectCategories,
  getAllProjects,
  getAllProjectStatuses,
  getAllProjectSubcategories,
  getAllTeams,
} from "@services/projects";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import {
  getAllClientCompanies,
  getAllClientContacts,
} from "@services/companies";
import { fetchAllCountries } from "@services/options";
import { getAllClientBranches } from "@services/lead";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import dayjs, { Dayjs } from "dayjs";
import { formatNumber } from "@utils/statistics";
import { getAllCompanyTypes } from "@services/companies";
import Loader from "@app/modules/common/utils/Loader";
import { useNavigate } from "react-router-dom";
import ChooseProjectTypeModal from "../overview/components/chooseProjectTypeModal";
import { KTIcon } from "@metronic/helpers";
import BlankBasicProjectForm from "../overview/components/BlankBasicProjectForm";
import { deleteConfirmation, successConfirmation } from "@utils/modal";
import { useEventBus } from "@hooks/useEventBus";
import { EVENT_KEYS } from "@constants/eventKeys";
import { BorderRight } from "@mui/icons-material";
import { Button } from "@mui/material";
import { SHOW_PROJECT_BUTTONS } from "@constants/configurations-key";
import { fetchConfiguration } from "@services/company";
import { parseConfig } from "../configure/ProjectButtonSettingUI";

type ProjectDialogModalProps = {
  statusId?: any;
  serviceId?: any;
  categoryId?: any;
  referralId?: any;
  sourceId?: any;
  subCategoryId?: any;
  companyTypeId?: any;
  topLeadsId?: any;
  locationId?: any;
  monthlyStatusName?: any;
  monthlyStatusId?: any;
  teamId?: any;
  startDate?: Dayjs;
  endDate?: Dayjs;
  monthlyCompanyTypeId?: any;
  projectCompanyTypeId?:any;
  projectCompanyTypeName?:any
};

const ProjectsMainTable = ({
  statusId,
  serviceId,
  categoryId,
  referralId,
  sourceId,
  subCategoryId,
  companyTypeId,
  topLeadsId,
  locationId,
  monthlyStatusName,
  monthlyStatusId,
  teamId,
  startDate,
  endDate,
  monthlyCompanyTypeId,
  projectCompanyTypeId,
  projectCompanyTypeName
}: ProjectDialogModalProps) => {
  
  const navigate = useNavigate();

  const employeeId = useSelector(
    (state: RootState) => state?.employee?.currentEmployee?.id
  );

  const allEmployees = useSelector((state: RootState) => state.allEmployees);

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
  const [chooseProjectTypeModal, setChooseProjectTypeModal] = useState(false);
  const [editProjectModal, setEditProjectModal] = useState(false);
  const [editProject, setEditProject] = useState<any>(null);
  const [editProjectTempletId, setEditProjectTempletId] = useState<any>(null);
  const [deleteProjectModal, setDeleteProjectModal] = useState(false);
  const [deleteProject, setDeleteProject] = useState<any>(null);
  const [projectCanAddFromLeads, setProjectCanAddFromLeads] = useState(true);

  const getAllProjectsData = async () => {
    try {
      setLoading(true);
      const response = await getAllProjects();
      const response2 = await getAllProjectCategories();
      const response3 = await getAllProjectSubcategories();
      const response4 = await getAllProjectStatuses();
      const response5 = await getAllClientCompanies();
      const response6 = await getAllClientContacts();
      const response7 = await getAllClientBranches();
      const response9 = await fetchAllCountries();
      const response10 = await getAllCompanyTypes();
      const response11 = await getAllTeams(1, 9999); // Get all teams for dropdown
      setAllProjects(
        (response.data?.projects || []).filter(
          (project: any) => project.isProjectOpen === true
        )
      );      
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
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    getAllProjectsData();
  }, []);

  useEventBus(EVENT_KEYS.projectCreated, () => {
    getAllProjectsData();
  });

  useEventBus(EVENT_KEYS.projectUpdated, () => {
    getAllProjectsData();
  });

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

  const handleChooseProjectTypeModal = () => {
    setChooseProjectTypeModal(true);
  };

  const handleEditProject = (project: any, projectTempletId: any) => {
    setEditProject(project);
    setEditProjectTempletId(projectTempletId);
    setEditProjectModal(true);
  };

  const handleDeleteProject = async (project: any) => {
    try {
      const confirm = await deleteConfirmation("Project deleted successfully!");
      if (!confirm) return;
      await deleteProjectById(project.id);
      getAllProjectsData();
    } catch (error) {
      console.error(error, "An unexpected error occurred. Please try again.");
    }
  };

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

      const fetchSettings = async () => {
        try {
              const response = await fetchConfiguration(SHOW_PROJECT_BUTTONS);
                // Parse JSON string
                if (response?.data?.configuration) {
                  const parsedConfig = parseConfig(
                    response.data.configuration.configuration
                  );
          
                  setProjectCanAddFromLeads(parsedConfig.projectCanAddFromLeads || false);
              } else {
                setProjectCanAddFromLeads(false);
              }
            } catch (error) {
              setProjectCanAddFromLeads(false);
            }
          };
      useEffect(() => {
        fetchSettings();
      }, []);

  const hideNewProjectButton =
    statusId ||
    serviceId ||
    categoryId ||
    referralId ||
    sourceId ||
    subCategoryId ||
    companyTypeId ||
    topLeadsId?.topLeadsId ||
    locationId ||
    monthlyStatusId ||
    monthlyCompanyTypeId ||
    projectCompanyTypeId ||
    projectCompanyTypeName ||
    projectCanAddFromLeads ||
    teamId;

  // set background color based on project status of each row
  const columns = [
    // {
    //   accessorKey: "prefix",
    //   header: "Inquiry Id",
    //   size: 80,
    //   enableEditing: false,
    //   Cell: ({ row }: { row: any }) => {
    //     return (
    //       <span
    //         className="cursor-pointer "
    //         style={{
    //           color: "inherit",
    //           fontWeight: "600",
    //           fontSize: "14px",
    //         }}
    //         onClick={() => {
    //           navigate(`/projects/${row.original.id}`);
    //         }}
    //       >
    //         {row?.original?.prefix || "N/A"}
    //       </span>
    //     );
    //   },
    // },
    {
      accessorKey: "title",
      header: "Project Name",
      Cell: ({ row }: any) => (
        <span
          className="cursor-pointer "
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
        </span>
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
        return companyNames.length ? companyNames.join(", ") : "-NA-";
      },
    },
    {
      accessorKey: "branchNames",
      header: "Branch Name",
      Cell: ({ row }: any) => {
        const branches = row.original.projectCompanyMappings || [];
        const branchNames = branches
          .map((mapping: any) => findClientBranchName(mapping.branchId))
          .filter(Boolean);
        return branchNames.length ? branchNames.join(", ") : "-NA-";
      },
    },
    {
      accessorKey: "projectCategoryId",
      header: "Category",
      Cell: ({ renderedCellValue }: any) => {
        const projectCategory = allProjectCategories.find(
          (category: any) => category.id === renderedCellValue
        );
        return projectCategory?.name || "-NA-";
      },
    },
    {
      accessorKey: "projectSubCategoryId",
      header: "Sub Category",
      Cell: ({ renderedCellValue }: any) => {
        const projectSubCategory = allProjectSubcategories.find(
          (category: any) => category.id === renderedCellValue
        );
        return projectSubCategory?.name || "-NA-";
      },
    },
    {
      accessorKey: "status",
      header: "Status Name",
      Cell: ({ row }: any) => {
        const status = row?.original?.status;
        const statusName = status?.name;
        const statusColor = status?.color;
        return (
          <div
            className="badge badge-light"
            style={{ backgroundColor: statusColor, color: "white" }}
          >
            {statusName ? statusName : "-NA-"}
          </div>
        );
      },
    },
    {
      accessorKey: "startDate",
      header: "Start Date",
      Cell: ({ renderedCellValue }: any) => {
        const startDate = new Date(renderedCellValue);
        return dayjs(startDate).format("DD-MM-YYYY") || "-NA-";
      },
    },
    {
      accessorKey: "endDate",
      header: "End Date",
      Cell: ({ renderedCellValue }: any) => {
        const endDate = new Date(renderedCellValue);
        return dayjs(endDate).format("DD-MM-YYYY") || "-NA-";
      },
    },
    {
      accessorKey: "rate",
      header: "Rate",
      Cell: ({ renderedCellValue }: any) =>
        formatNumber(renderedCellValue) || "-NA-",
    },
    {
      accessorKey: "cost",
      header: "Cost",
      Cell: ({ renderedCellValue }: any) =>
        formatNumber(renderedCellValue) || "-NA-",
    },
    {
      accessorKey: "teamId",
      header: "Team Name",
      Cell: ({ renderedCellValue }: any) =>
        renderedCellValue
          ? allTeams.find((team: any) => team.id === renderedCellValue)?.name
          : "-NA-",
    },
    {
      accessorKey: "projectManagerId",
      header: "Project Manager",
      Cell: ({ renderedCellValue }: any) =>
        renderedCellValue
          ? allEmployees?.list?.find(
              (employee: any) => employee.employeeId === renderedCellValue
            )?.employeeName
          : "-NA-",
    },
    {
      accessorKey: "contactPersonNames",
      header: "Contact Person Name",
      Cell: ({ row }: any) => {
        const contacts = row.original.projectCompanyMappings || [];
        const contactNames = contacts
          .map((mapping: any) =>
            findClientContactPersonName(mapping.contactPersonId)
          )
          .filter(Boolean);
        return contactNames.length ? contactNames.join(", ") : "-";
      },
    },
    {
      accessorKey: "leadAssignedTo",
      header: "Lead Assigned",
      Cell: ({ renderedCellValue }: any) =>
        renderedCellValue
          ? allEmployees?.list?.find(
              (employee: any) => employee.employeeId === renderedCellValue
            )?.employeeName
          : "-NA-",
    },
    {
      accessorKey: "projectAccess",
      header: "Project Access",
      Cell: ({ renderedCellValue }: any) => renderedCellValue || "-NA-",
    },
    {
      accessorKey: "description",
      header: "Description",
      Cell: ({ renderedCellValue }: any) => renderedCellValue || "-NA-",
    },
    {
      accessorKey: "createdById",
      header: "Created By Name",
      Cell: ({ renderedCellValue }: any) => {
        const employee = allEmployees?.list?.find(
          (employee: any) => employee.employeeId === renderedCellValue
        );
        return employee?.employeeName || "-NA-";
      },
    },
    {
      accessorKey: "editedById",
      header: "Edited By",
      Cell: ({ renderedCellValue }: any) => {
        if (renderedCellValue != null) {
          const employee = allEmployees?.list?.find(
            (employee: any) => employee.employeeId === renderedCellValue
          );
          return employee?.employeeName || "-NA-";
        } else {
          return "-NA-";
        }
      },
    },
    {
      accessorKey: "createdAt",
      header: "Created At",
      Cell: ({ renderedCellValue }: any) =>
        dayjs(renderedCellValue).format("DD-MM-YYYY") || "-NA-",
    },
    {
      accessorKey: "updatedAt",
      header: "Updated At",
      Cell: ({ renderedCellValue }: any) =>
        dayjs(renderedCellValue).format("DD-MM-YYYY") || "-NA-",
    },
    {
      accessorKey: "inquiryDate",
      header: "Inquiry Date",
      Cell: ({ renderedCellValue }: any) =>
        renderedCellValue
          ? dayjs(renderedCellValue).format("DD-MM-YYYY")
          : "-NA-",
    },
    {
      accessorKey: "leadInquiryDate",
      header: "Lead Inquiry Date",
      Cell: ({ renderedCellValue }: any) =>
        renderedCellValue
          ? dayjs(renderedCellValue).format("DD-MM-YYYY")
          : "-NA-",
    },
    {
      accessorKey: "leadContactId",
      header: "Lead Contact Name",
      Cell: ({ renderedCellValue }: any) =>
        renderedCellValue
          ? allClientContacts.find(
              (contact: any) => contact.id === renderedCellValue
            )?.fullName
          : "-NA-",
    },
    {
      accessorKey: "projectArea",
      header: "Project Area",
      Cell: ({ renderedCellValue }: any) =>
        renderedCellValue ? renderedCellValue : "-NA-",
    },
    {
      accessorKey: "projectAddress",
      header: "Project Address",
      Cell: ({ row }: any) => {
        const addresses = row.original.addresses || [];
        const fullAddresses = addresses
          .map((address: any) => address.fullAddress)
          .filter(Boolean);
        return fullAddresses.length ? fullAddresses.join(", ") : "-NA-";
      },
    },
    {
      accessorKey: "zipcode",
      header: "Zip Code",
      Cell: ({ row }: any) => {
        const addresses = row.original.addresses || [];
        const zipcodes = addresses
          .map((address: any) => address.zipcode)
          .filter(Boolean);
        const uniqueZipcodes = [...new Set(zipcodes)];
        return uniqueZipcodes.length ? uniqueZipcodes.join(", ") : "-NA-";
      },
    },
    {
      accessorKey: "mapLocation",
      header: "Map Location",
      Cell: ({ renderedCellValue }: any) =>
        renderedCellValue ? renderedCellValue : "-NA-",
    },
    {
      accessorKey: "country",
      header: "Country",
      Cell: ({ row }: any) => {
        const addresses = row.original.addresses || [];
        const countries = addresses
          .map((address: any) => address.country)
          .filter(Boolean);
        const uniqueCountries = [...new Set(countries)];
        return uniqueCountries.length ? uniqueCountries.join(", ") : "-NA-";
      },
    },
    {
      accessorKey: "state",
      header: "State",
      Cell: ({ row }: any) => {
        const addresses = row.original.addresses || [];
        const states = addresses
          .map((address: any) => address.state)
          .filter(Boolean);
        const uniqueStates = [...new Set(states)];
        return uniqueStates.length ? uniqueStates.join(", ") : "-NA-";
      },
    },
    {
      accessorKey: "city",
      header: "City",
      Cell: ({ row }: any) => {
        const addresses = row.original.addresses || [];
        const cities = addresses
          .map((address: any) => address.city)
          .filter(Boolean);
        const uniqueCities = [...new Set(cities)];
        return uniqueCities.length ? uniqueCities.join(", ") : "-NA-";
      },
    },
    {
      accessorKey: "locality",
      header: "Locality",
      Cell: ({ row }: any) => {
        const addresses = row.original.addresses || [];
        const localities = addresses
          .map((address: any) => address.locality)
          .filter(Boolean);
        const uniqueLocalities = [...new Set(localities)];
        return uniqueLocalities.length ? uniqueLocalities.join(", ") : "-NA-";
      },
    },
    {
      accessorKey: "poNumber",
      header: "PO Number",
      Cell: ({ renderedCellValue }: any) =>
        renderedCellValue ? renderedCellValue : "-NA-",
    },
    {
      accessorKey: "poDate",
      header: "PO Date",
      Cell: ({ renderedCellValue }: any) =>
        renderedCellValue
          ? dayjs(renderedCellValue).format("DD-MM-YYYY")
          : "-NA-",
    },
    {
      accessorKey: "leadDirectSourceId",
      header: "Lead Direct Source",
      Cell: ({ renderedCellValue }: any) =>
        renderedCellValue ? renderedCellValue : "-NA-",
    },
    // {
    //   accessorKey:'projectTempletId',
    //   header:'Project Templet Name',
    //   Cell: ({ renderedCellValue }: any) =>
    //     renderedCellValue ? renderedCellValue : "N/A",
    // },
    ...(!hideNewProjectButton
      ? [
          {
            accessorKey: "action",
            header: "Actions",
            Cell: ({ row }: any) => {
              return (
                <div className="d-flex gap-2">
                  <button
                    className="btn btn-icon btn-bg-light btn-active-color-primary btn-sm"
                    onClick={() =>
                      handleEditProject(
                        row?.original,
                        row?.original?.projectTempletId
                      )
                    }
                  >
                    <KTIcon iconName="pencil" className="fs-2" />
                  </button>
                  <button
                    className="btn btn-icon btn-bg-light btn-active-color-primary btn-sm"
                    onClick={() => handleDeleteProject(row?.original)}
                  >
                    <KTIcon iconName="trash" className="fs-2" />
                  </button>
                </div>
              );
            },
          },
        ]
      : []),
  ];

  if (loading) {
    return <Loader />;
  }


  const startDates = startDate ? dayjs(startDate) : null;
  const endDates = endDate ? dayjs(endDate) : null;
  const dateFilteredData = allProjects?.filter((item: any) => {
    const createdAt = dayjs(item.createdAt);

    if (startDates && createdAt.isBefore(dayjs(startDates).startOf("day")))
      return false;
    if (endDates && createdAt.isAfter(dayjs(endDates).endOf("day")))
      return false;

    return true;
  });

  const filteredData = dateFilteredData?.filter((item: any) => {
    if (statusId && item.status?.id !== statusId) return false;
  
    if (serviceId && item.serviceId !== serviceId) return false;
  
    if (categoryId && item.projectCategoryId !== categoryId) return false;
  
    if (
      referralId &&
      !item.referrals?.some((ref: any) => ref.referralTypeId === referralId)
    ) {
      return false;
    }
  
    if (sourceId && item.leadSource?.toLowerCase() !== sourceId.toLowerCase())
      return false;
  
    if (subCategoryId && item.projectSubCategoryId !== subCategoryId)
      return false;
  
    if (companyTypeId && item.companyType !== companyTypeId) return false;
  
    if (topLeadsId?.length && !topLeadsId.includes(item.id)) return false;
  
    if (teamId && !item.projectTeams?.some((team: any) => team.teamId === teamId)) 
      return false;
  
    if (monthlyCompanyTypeId && 
        !item.projectCompanyMappings?.some((mapping: any) => 
          mapping.companyTypeId === monthlyCompanyTypeId)) 
      return false;
  
    if (locationId) {
      if (locationId.toLowerCase() !== "unknown") {
        const hasMatchingLocation = item.addresses?.some((address: any) => 
          address.countryId?.toString() === locationId ||
          address.stateId?.toString() === locationId ||
          address.cityId?.toString() === locationId ||
          address.country?.toLowerCase() === locationId.toLowerCase() ||
          address.state?.toLowerCase() === locationId.toLowerCase() ||
          address.city?.toLowerCase() === locationId.toLowerCase()
        );
        
        if (!hasMatchingLocation) return false;
      } else {
        const hasLocationData = item.addresses?.some((address: any) => 
          address.countryId || address.stateId || address.cityId ||
          address.country || address.state || address.city
        );
        
        if (hasLocationData) return false;
      }
    }
  
    if (monthlyStatusName && monthlyStatusId) {
      const monthName = dayjs(item.createdAt).format("MMMM");
      if (
        !(
          monthName === monthlyStatusName &&
          item.status?.name === monthlyStatusId
        )
      ) {
        return false;
      }
    }
  
    if(projectCompanyTypeId && projectCompanyTypeName){
      const monthName = dayjs(item.createdAt).format("MMMM");
      const hasMatchingCompanyType = item.projectCompanyMappings?.some((mapping: any) => 
        mapping.companyTypeId === projectCompanyTypeId
      );
      
      if(
        !(
          monthName === projectCompanyTypeName &&
          hasMatchingCompanyType
        )
      ){
        return false;
      }
    }
  
    return true;
  });


  return (
    <div>
      {/* <div className="d-flex justify-content-between align-items-center">
        <span className="text-start" style={{ fontSize: "24px", fontWeight: "600", fontFamily: "Barlow" }}>Projects</span>
        <button className="btn btn-primary float-end" onClick={() => handleChooseProjectTypeModal()}>New Project</button>
      </div> */}
      <div className="d-flex align-items-center justify-content-between mb-4 mt-4">
        <div
          // className="mb-4"
          style={{
            fontFamily: "Barlow",
            fontSize: "24px",
            fontWeight: "600",
          }}
        >
          Project
        </div>
        {(!hideNewProjectButton) && (
          <div className="d-flex align-items-center gap-3">
            {/* <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M10.5 6H20.25M10.5 6C10.5 6.39782 10.342 6.77936 10.0607 7.06066C9.77936 7.34196 9.39782 7.5 9 7.5C8.60218 7.5 8.22064 7.34196 7.93934 7.06066C7.65804 6.77936 7.5 6.39782 7.5 6M10.5 6C10.5 5.60218 10.342 5.22064 10.0607 4.93934C9.77936 4.65804 9.39782 4.5 9 4.5C8.60218 4.5 8.22064 4.65804 7.93934 4.93934C7.65804 5.22064 7.5 5.60218 7.5 6M7.5 6H3.75M10.5 18H20.25M10.5 18C10.5 18.3978 10.342 18.7794 10.0607 19.0607C9.77936 19.342 9.39782 19.5 9 19.5C8.60218 19.5 8.22064 19.342 7.93934 19.0607C7.65804 18.7794 7.5 18.3978 7.5 18M10.5 18C10.5 17.6022 10.342 17.2206 10.0607 16.9393C9.77936 16.658 9.39782 16.5 9 16.5C8.60218 16.5 8.22064 16.658 7.93934 16.9393C7.65804 17.2206 7.5 17.6022 7.5 18M7.5 18H3.75M16.5 12H20.25M16.5 12C16.5 12.3978 16.342 12.7794 16.0607 13.0607C15.7794 13.342 15.3978 13.5 15 13.5C14.6022 13.5 14.2206 13.342 13.9393 13.0607C13.658 12.7794 13.5 12.3978 13.5 12M16.5 12C16.5 11.6022 16.342 11.2206 16.0607 10.9393C15.7794 10.658 15.3978 10.5 15 10.5C14.6022 10.5 14.2206 10.658 13.9393 10.9393C13.658 11.2206 13.5 11.6022 13.5 12M13.5 12H3.75" stroke="#7A2626" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg> */}
            <Button
              variant="contained"
              onClick={() => handleChooseProjectTypeModal()}
              sx={{
                backgroundColor: "#9D4141",
                "&:hover": {
                  backgroundColor: "#7e3434",
                },
                textTransform: "none",
                px: 3,
                py: 1,
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              New Project
            </Button>
          </div>
        )}
      </div>
      <MaterialTable
        data={filteredData}
        columns={columns}
        tableName="Projects"
        employeeId={employeeId}
        // muiTableProps={{
        //   muiTableBodyRowProps: ({ row }) => {
        //     const status = row.original?.status ?? "";
        //     return {
        //       sx: {
        //         backgroundColor: `${status.color}40`,
        //         color: "#333",
        //       },
        //     };
        //   },
        // }}
        muiTableProps={{
          sx: {
            borderCollapse: "separate",
            borderSpacing: "0 8px !important", // 20px vertical spacing between rows
          },

          muiTableBodyRowProps: ({ row }) => ({
            // sx: {
            //     cursor: 'pointer',
            //     backgroundColor: `${row.original?.status?.color}`,
            //     // borderRadius: '8px',
            //     // margin:"20px !important"
            // },
            sx: {
              cursor: "pointer",
              backgroundColor: `${row.original?.status?.color}20`,
              // borderBottom:"5px solid red !important",
              padding: "10px !important",

              "& .MuiTableCell-root": {
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                fontSize: "14px",
                fontFamily: "Inter",
                fontWeight: "400",
                padding: "8px 16px !important",
                borderBottom: "2px solid white",
                borderTop: "2px solid white",
                // borderLeft:"5px solid white"
                // margin:"20px !important"
              },
              "& .MuiTableCell-root:first-of-type": {
                borderTopLeftRadius: "12px",
                borderBottomLeftRadius: "12px",
                // marginTop:"40px !important"
                borderLeft: "3px solid white",
              },
              "& .MuiTableCell-root:last-of-type": {
                borderTopRightRadius: "12px",
                borderBottomRightRadius: "12px",
                borderRight: "3px solid white",
              },
              "&:hover": {
                backgroundColor: `${row.original?.status?.color}99`,
                "& td": {
                  color: "black",
                },
              },
            },
          }),
        }}
      />
      <ChooseProjectTypeModal
        show={chooseProjectTypeModal}
        onHide={() => setChooseProjectTypeModal(false)}
      />
      <BlankBasicProjectForm
        showBlankProjectForm={editProjectModal}
        onHide={() => setEditProjectModal(false)}
        editingProjectId={editProject?.id}
        selectedProjectType={editProjectTempletId}
      />
    </div>
  );
};

export default ProjectsMainTable;
