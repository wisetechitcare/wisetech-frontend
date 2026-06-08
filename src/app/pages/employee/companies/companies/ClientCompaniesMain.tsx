import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
// import { Button } from "react-bootstrap";
import { Button } from "@mui/material";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import {
  getAllClientCompanies,
  getAllCompanyTypes,
  deleteClientCompany,
  getAllClientContacts,
} from "@services/companies";
import NewCompanyForm from "./components/NewCompanyForm";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import { MRT_ColumnDef } from "material-react-table";
import { KTIcon } from "@metronic/helpers";
import eventBus from "@utils/EventBus";
import { deleteConfirmation } from "@utils/modal";
import { Company } from "@models/companies";
import dayjs, { Dayjs } from "dayjs";
import { companyLogoIcons } from "@metronic/assets/sidepanelicons";

interface ProcessedCompany extends Company {
  companyTypeName: string;
  referenceType?: string;
  internalReferenceEmployeeId?: string;
  externalReferenceContactId?: string;
  totalBudget?: number;
}

interface Props {
  statusId?: string;
  companyTypeId?: string;
  locationId?: string;
  startDate?: Dayjs;
  endDate?: Dayjs;
  isOthersView?: boolean;
  top10Ids?: string[];
}

const ClientCompaniesMain = ( {statusId, companyTypeId, locationId, startDate, endDate, isOthersView, top10Ids}: Props ) => {
  
  const navigate = useNavigate();
  const employeeIdCurrent = useSelector(
    (state: RootState) => state.employee.currentEmployee.id
  );
  const allEmployees = useSelector((state: RootState) => state.allEmployees?.list);

  const [showNewCompanyForm, setShowNewCompanyForm] = useState(false);
  const [companies, setCompanies] = useState<ProcessedCompany[]>([]);
  const [companyTypesMap, setCompanyTypesMap] = useState<
    Record<string, string>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // First fetch company types
      const typesResponse = await getAllCompanyTypes();
      const typesMap: Record<string, string> = {};
      typesResponse?.companyTypes?.forEach((type: any) => {
        typesMap[type.id] = type.name;
      });
      setCompanyTypesMap(typesMap);

      // Then fetch companies and map the types
      const companiesResponse = await getAllClientCompanies();
      const contactsResponse = await getAllClientContacts();
      const companiesData = companiesResponse?.data?.companies || [];
      const contactsData = contactsResponse?.data?.contacts || [];
      const processedCompanies = companiesData.map((company: Company) => {
        // Process references to handle multiple entries
        const referenceTypes = company.references?.map(ref => ref.referenceType).join(', ') || 'N/A';
        const internalRefs = company.references?.filter(ref => ref.internalReferenceEmployeeId)
          .map(ref => ref.internalReferenceEmployee?.fullName || ref.internalReferenceEmployeeId)
          .join(', ') || 'N/A';
        const externalRefs = company.references?.filter(ref => ref.externalReferenceContactId)
          .map(ref => ref.externalReferenceContact?.fullName || ref.externalReferenceContactId)
          .join(', ') || 'N/A';
          
        const totalBudget = company.projectCompanyMappings?.reduce((acc, mapping) => {
          return acc + Number(mapping.project?.cost || 0);
        }, 0) || 0;

        return {
          ...company,
          companyTypeName:
            company.companyTypeId && typesMap[company.companyTypeId]
              ? typesMap[company.companyTypeId]
              : company.companyTypeId || "N/A",
          referenceType: referenceTypes,
          internalReferenceEmployeeId: internalRefs,
          externalReferenceContactId: externalRefs,
          totalBudget: totalBudget,
        };
      });

      setCompanies(processedCompanies);
      setContacts(contactsData);
    } catch (error) {
      console.error("Failed to fetch data", error);
      setCompanies([]);
      setContacts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Add event listener for data refresh
  useEffect(() => {
    const handleRefresh = () => {
      fetchData();
    };
    eventBus.on("companyCreated", handleRefresh);
    return () => {
      eventBus.off("companyCreated", handleRefresh);
    };
  }, []);


  const hideNewCompanyButton = statusId || companyTypeId || locationId
  const columns = useMemo<MRT_ColumnDef<ProcessedCompany, any>[]>(
    () => [
      { 
        accessorKey: 'prefix',
        header: 'Inquiry Id',
        size: 80,
        enableEditing: false,
        Cell: ({ row }: { row: any }) => {
          return <span className="cursor-pointer "
          style={{
            color: "inherit",
            fontWeight: "600",
            fontSize: "14px",
          }}
          onClick={() => {
            navigate(`/companies/${row.original.id}`);
          }}
        >
          {row?.original?.prefix || "N/A" }
        </span>
        }
      },
      {
        accessorKey: "logo",
        header: "Logo",
        Cell: ({ cell }) => (
          <img
            src={cell.getValue() ?? companyLogoIcons.companyLogoIcon.default}
            alt="logo"
            style={{ width: 33, height: 33, objectFit: "contain" }}
          />
        ),
      },
      {
        accessorKey: "companyName",
        header: "Company Name",
        Cell: ({ row }) => (
          <button
            className="btn btn-link p-0 text-start text-decoration-none"
            style={{
              color: "inherit",
              fontWeight: "600",
              fontSize: "14px",
            }}
            onClick={() => {
              navigate(`/companies/${row.original.id}`);
            }}
          >
            {row.original.companyName || "N/A"}
          </button>
        ),
      },
      { accessorKey: "companyTypeName", header: "Company Type" ,Cell: ({ cell }) => cell.getValue() || "N/A"},
      { accessorKey: "referenceType",
         header: "Reference Type" ,
         Cell: ({ cell } : { cell: any }) => {
          const reference = cell.getValue();

          //  const referenceType = cell.getValue();
           return   reference || "N/A";
         }},
      { accessorKey: "internalReferenceEmployeeId",
        header: "Internal Referred By" ,
        Cell: ({ cell }) => {
          return allEmployees?.find(emp => emp.employeeId === cell.getValue())?.employeeName || cell.getValue() || "N/A";
        }
      },
      { accessorKey: "externalReferenceContactId",
        header: "External Referred By" ,
        Cell: ({ cell }) => {
          return cell.getValue() || "N/A";
        }
      },
      { accessorKey: "status", header: "Status" ,Cell: ({ cell }) => cell.getValue() || "N/A"},
      { 
        accessorKey: "overallRating",
        header: "Rating ⭐" ,
        Cell: ({ cell }) => {
          const rating = cell.getValue();
          return rating ? <span className="text-warning">⭐ {rating}</span> : "N/A";
        }
      },
      { 
        accessorKey: "totalBudget", 
        header: "Budget",
        Cell: ({ cell }) => {
          const budget = cell.getValue() as number;
          return `₹${budget.toLocaleString("en-IN")}`;
        }
      },
      { accessorKey: "phone", header: "Phone" ,Cell: ({ cell }) => cell.getValue() || "N/A"},
      { accessorKey: "phone2", header: "Phone 2" ,Cell: ({ cell }) => cell.getValue() || "N/A"},
      { accessorKey: "fax", header: "Fax" ,Cell: ({ cell }) => cell.getValue() || "N/A"},
      { accessorKey: "email", header: "Email" ,Cell: ({ cell }) => cell.getValue() || "N/A"},
      { accessorKey: "website", header: "Website" ,Cell: ({ cell }) => cell.getValue() || "N/A"},
      { accessorKey: "address", header: "Address" ,Cell: ({ cell }) => cell.getValue() || "N/A"},
      { accessorKey: "area", header: "Area" ,Cell: ({ cell }) => cell.getValue() || "N/A"},
      { accessorKey: "city", header: "City" ,Cell: ({ cell }) => cell.getValue() || "N/A"},
      { accessorKey: "state", header: "State" ,Cell: ({ cell }) => cell.getValue() || "N/A"},
      { accessorKey: "country", header: "Country" ,Cell: ({ cell }) => cell.getValue() || "N/A"},
      { accessorKey: "zipCode", header: "ZIP Code" ,Cell: ({ cell }) => cell.getValue() || "N/A"},
      {
        accessorKey: "blacklisted",
        header: "Blacklisted",
        Cell: ({ cell }) => (cell.getValue() ? "Yes" : "No"),
      },
      { accessorKey: "visibility", header: "Visibility",Cell: ({ cell }) => cell.getValue() || "N/A" },
      { accessorKey: "note", header: "Note",Cell: ({ cell }) => cell.getValue() || "N/A" },
      {
        accessorKey: "isActive",
        header: "Active",
        Cell: ({ cell }) => (cell.getValue() ? "Yes" : "No"),
      },
      ...(!hideNewCompanyButton
        ? [
            {
              accessorKey: "actions",
              header: "Actions",
              Cell: ({ row }: any) => (
                <div className="d-flex align-items-center gap-2">
                  <button
                    className="btn btn-icon btn-bg-light btn-active-color-primary btn-sm"
                    onClick={() => handleEditClick(row.original.id)}
                  >
                    <KTIcon iconName="pencil" className="fs-3" />
                  </button>
                  <button
                    className="btn btn-icon btn-bg-light btn-active-color-primary btn-sm"
                    onClick={() => handleDelete(row.original)}
                  >
                    <KTIcon iconName="trash" className="fs-3" />
                  </button>
                </div>
              ),
            },
          ]
        : []),
    ],
    [navigate]
  );

  const handleEditClick = (companyId: string) => {
    setEditingCompanyId(companyId);
    setShowNewCompanyForm(true);
  };

  const handleDelete = (company: Company) => {
    const deleteCompany = async () => {
      try {
        const sure = await deleteConfirmation("Company deleted successfully");
        if (!sure) return;
        console.warn("companyId", company.id);

        await deleteClientCompany(company.id);
        eventBus.emit("companyCreated");
      } catch (error) {
        console.error("Failed to delete company", error);
      }
    };
    deleteCompany();
  };

  const handleCloseForm = () => {
    setShowNewCompanyForm(false);
    setEditingCompanyId(null);
  };

  
  const startDates = startDate ? dayjs(startDate).startOf("day") : null;
  const endDates = endDate ? dayjs(endDate).endOf("day") : null;
  
  const dateFilteredData = companies?.filter((item: any) => {
    const createdAt = dayjs(item.createdAt);
  
    if (startDates && createdAt.isBefore(dayjs(startDates).startOf('day'))) return false;
    if (endDates && createdAt.isAfter(dayjs(endDates).endOf('day'))) return false;
  
    return true;
  });
  
  
  const filteredData = dateFilteredData?.filter((item: any) => {
    if (isOthersView && top10Ids) {
      if (top10Ids.includes(item.companyTypeId)) return false;
    } else {
      if (companyTypeId && item.companyTypeId !== companyTypeId) return false;
    }
    
    if (statusId && item.status !== statusId) return false;
  
    if (locationId) {
      if (locationId.toLowerCase() !== "unknown") {
        if (
          item.countryId?.toString() !== locationId &&
          item.stateId?.toString() !== locationId &&
          item.cityId?.toString() !== locationId &&
          item.country?.toLowerCase() !== locationId.toLowerCase() &&
          item.state?.toLowerCase() !== locationId.toLowerCase() &&
          item.city?.toLowerCase() !== locationId.toLowerCase()
        ) {
          return false;
        }
      } else {
        if (
          item.countryId || item.stateId || item.cityId ||
          item.country || item.state || item.city
        ) {
          return false;
        }
      }
    }
  
    return true;
  });

  
  

  return (
    <div className="row ">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div
          // className="mb-4"
          style={{
            fontFamily: "Barlow",
            fontSize: "24px",
            fontWeight: "600",
          }}
        >
          Companies
        </div>
        {!hideNewCompanyButton &&
        <div className="d-flex align-items-center gap-3">
          {/* <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M10.5 6H20.25M10.5 6C10.5 6.39782 10.342 6.77936 10.0607 7.06066C9.77936 7.34196 9.39782 7.5 9 7.5C8.60218 7.5 8.22064 7.34196 7.93934 7.06066C7.65804 6.77936 7.5 6.39782 7.5 6M10.5 6C10.5 5.60218 10.342 5.22064 10.0607 4.93934C9.77936 4.65804 9.39782 4.5 9 4.5C8.60218 4.5 8.22064 4.65804 7.93934 4.93934C7.65804 5.22064 7.5 5.60218 7.5 6M7.5 6H3.75M10.5 18H20.25M10.5 18C10.5 18.3978 10.342 18.7794 10.0607 19.0607C9.77936 19.342 9.39782 19.5 9 19.5C8.60218 19.5 8.22064 19.342 7.93934 19.0607C7.65804 18.7794 7.5 18.3978 7.5 18M10.5 18C10.5 17.6022 10.342 17.2206 10.0607 16.9393C9.77936 16.658 9.39782 16.5 9 16.5C8.60218 16.5 8.22064 16.658 7.93934 16.9393C7.65804 17.2206 7.5 17.6022 7.5 18M7.5 18H3.75M16.5 12H20.25M16.5 12C16.5 12.3978 16.342 12.7794 16.0607 13.0607C15.7794 13.342 15.3978 13.5 15 13.5C14.6022 13.5 14.2206 13.342 13.9393 13.0607C13.658 12.7794 13.5 12.3978 13.5 12M16.5 12C16.5 11.6022 16.342 11.2206 16.0607 10.9393C15.7794 10.658 15.3978 10.5 15 10.5C14.6022 10.5 14.2206 10.658 13.9393 10.9393C13.658 11.2206 13.5 11.6022 13.5 12M13.5 12H3.75" stroke="#7A2626" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg> */}
          <Button variant="contained"
            onClick={() => setShowNewCompanyForm(true)}
            sx={{
              backgroundColor: '#9D4141',
              '&:hover': {
                backgroundColor: '#7e3434'
              },
              textTransform: 'none',
              px: 3,
              py: 1,
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500
            }}>New Company</Button>
        </div>
      }
      </div>
      <MaterialTable
        columns={columns}
        data={filteredData}
        tableName="Client-Companies"
        employeeId={employeeIdCurrent}
        resource="COMPANIES"
        viewOwn={true}
        viewOthers={true}
        checkOwnWithOthers={true}
        muiTableProps={{
          sx: {
            borderCollapse: 'separate',
            borderSpacing: '0 20px !important', // 20px vertical spacing between rows

          },

          muiTableBodyRowProps: ({ row }) => ({
            // sx: {
            //     cursor: 'pointer',
            //     backgroundColor: `${row.original?.status?.color}`,
            //     // borderRadius: '8px',
            //     // margin:"20px !important"
            // },
            sx: {
              cursor: 'pointer',
              backgroundColor: `${row.original?.companyTypeName?.color}30`,
              // borderBottom:"5px solid red !important",
              padding: '10px !important',

              '& .MuiTableCell-root': {
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontSize: '14px',
                fontFamily: 'Inter',
                fontWeight: '400',
                padding: '8px 16px !important',
                borderBottom: "2px solid white",
                borderTop: "2px solid white",
                // borderLeft:"5px solid white"
                // margin:"20px !important"
              },
              '& .MuiTableCell-root:first-of-type': {
                borderTopLeftRadius: '12px',
                borderBottomLeftRadius: '12px',
                // marginTop:"40px !important"
                borderLeft: "3px solid white"

              },
              '& .MuiTableCell-root:last-of-type': {
                borderTopRightRadius: '12px',
                borderBottomRightRadius: '12px',
                borderRight: "3px solid white"
              },
              '&:hover': {
                backgroundColor: `${row.original?.status?.color}99`,
                '& td': {
                  color: 'black',
                },
              },
            },

            // onClick: () => {
            //     navigate(`/employee/lead/${row.original.id}`, {
            //         state: { leadData: row.original.id },
            //     });
            // },
          }),
        }}
      />
      <NewCompanyForm
        show={showNewCompanyForm}
        onClose={handleCloseForm}
        editingCompanyId={editingCompanyId}
      />
    </div>
  );
};

export default ClientCompaniesMain;
