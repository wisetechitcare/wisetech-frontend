import MaterialTable from "@app/modules/common/components/MaterialTable";
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { BorderBottom, BorderLeft, BorderTop, EditNotifications } from "@mui/icons-material";
import { Box, Button, Chip, IconButton, Typography } from "@mui/material";
import { deleteLead, getAllLeads } from "@services/leads";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import DetailsModal from './DetailsModal'; // Import the DetailsModal component
import { useNavigate } from 'react-router-dom';
import { getAllLeadStatus } from "@services/lead";
import Loader from "@app/modules/common/utils/Loader";
import { leadAndProjectTemplateTypeId } from "@constants/statistics";
import { deleteConfirmation, errorConfirmation, successConfirmation } from "@utils/modal";
import LeadFormModal from "./LeadFormModal";
import dayjs from "dayjs";
import { getAllProjectServices, getAllProjectSubcategories, getAllProjectCategories } from "@services/projects";
import { fetchAllCountries, fetchAllStates, fetchAllCities } from "@services/options";
import { AppDispatch, RootState } from "@redux/store";
import { useDispatch, useSelector } from "react-redux";
import eventBus from "@utils/EventBus";
import { useEventBus } from "@hooks/useEventBus";
import { EVENT_KEYS } from "@constants/eventKeys";
import { mapLeadToFormInitialValues } from "./utils";
import { fetchAllEmployeesAsync, loadAllEmployeesIfNeeded } from "@redux/slices/allEmployees";
import LeadsProjectCompanyChartSettings from "@pages/company/settings/LeadsProjectCompanyChartSettings";
import { PROJECT_CHART_SETTINGS_MODAL_TYPE } from "@constants/configurations-key";
import { Modal } from "react-bootstrap";
import { KTIcon } from "@metronic/helpers";

type LeadNewLeadProps = {
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
  startDate?: dayjs.Dayjs;
  endDate?: dayjs.Dayjs;
};

const LeadNewLead: React.FC<LeadNewLeadProps> = ({
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
  startDate,
  endDate,
}) => {
    const navigate = useNavigate();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedLead, setSelectedLead] = useState<any>(null);
    const [tableData, setTableData] = useState([]);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [leadStatuses, setLeadStatuses] = useState<any>([]);
    const [loading, setLoading] = useState(false);
    const [formValues, setFormValues] = useState<any>(null);
    const [projectServices, setProjectServices] = useState<any>([]);
    const [projectSubcategories, setProjectSubcategories] = useState<any>([]);
    const [projectCategories, setProjectCategories] = useState<any>([]);
    const [rawLeadsDatas, setRawLeadsDatas] = useState<any>([]);
    const [countries, setCountries] = useState<any>([]);
    const [states, setStates] = useState<any>([]);
    const [cities, setCities] = useState<any>([]);
    const [showChartSettingsModal, setShowChartSettingsModal] = useState(false);
    const dispatch = useDispatch<AppDispatch>();
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 10,
    });
    const [rowCount, setRowCount] = useState(0);
    const employeeId = useSelector((state: RootState) => state.employee?.currentEmployee?.id);

    const allemployees = useSelector((state: RootState) => state.allEmployees?.list);
    const currentEmployeeId = useSelector((state:RootState)=>state.employee?.currentEmployee?.id)

    let rawLeadsData = rawLeadsDatas;

    const fetchAllData = useCallback(async () => {
          try {
            setLoading(true);
      
            // Fetch leads data first
            const leadsResponse = await getAllLeads();
        
            const leadsData = leadsResponse?.data?.data?.leads || [];
            const total = leadsResponse?.data?.data?.total || 0;
            
            setRawLeadsDatas(leadsData);
            setRowCount(total);
      
            // Fetch services
            const servicesResponse = await getAllProjectServices();
            setProjectServices(servicesResponse?.services || []);
      
            // Fetch subcategories
            const subcategoriesResponse = await getAllProjectSubcategories();
            setProjectSubcategories(subcategoriesResponse?.projectSubCategories || []);
      
            // Fetch categories
            const categoriesResponse = await getAllProjectCategories();
            setProjectCategories(categoriesResponse?.projectCategories || []);
      
            // Fetch lead statuses
            const statusResponse = await getAllLeadStatus();
            setLeadStatuses(statusResponse?.leadStatuses || []);
            
            // Fetch countries
            const countriesData = await fetchAllCountries();
            setCountries(countriesData || []);
      
            
            if (leadsData.length > 0) {
              // Collect unique country, state, and city IDs to fetch their data
              const uniqueCountryIds = new Set();
              const uniqueStateIds = new Map(); // Map of countryId -> stateIds
              const uniqueCityIds = new Map(); // Map of stateId -> cityIds
              
              leadsData.forEach((lead: any) => {
                if (lead?.additionalDetails?.country) {
                  uniqueCountryIds.add(lead.additionalDetails.country);
                  
                  // Track state IDs by country
                  if (lead?.additionalDetails?.state) {
                    if (!uniqueStateIds.has(lead.additionalDetails.country)) {
                      uniqueStateIds.set(lead.additionalDetails.country, new Set());
                    }
                    uniqueStateIds.get(lead.additionalDetails.country).add(lead.additionalDetails.state);
                    
                    // Track city IDs by state
                    if (lead?.additionalDetails?.city) {
                      if (!uniqueCityIds.has(lead.additionalDetails.state)) {
                        uniqueCityIds.set(lead.additionalDetails.state, new Set());
                      }
                      uniqueCityIds.get(lead.additionalDetails.state).add(lead.additionalDetails.city);
                    }
                  }
                }
              });
              
              // Create maps for countries, states, and cities
              const countriesMap = new Map(); // Map of countryId -> country object
              const statesMap = new Map(); // Map of stateId -> state object
              const citiesMap = new Map(); // Map of cityId -> city object
              
              // Create a map of country ID to country object
              countriesData.forEach((country: any) => {
                countriesMap.set(country.id.toString(), country);
              });
              
              // Fetch states for countries that have leads
              const statesPromises = [];
              for (const countryId of uniqueCountryIds) {
                const country = countriesMap.get(String(countryId));
                if (country && country.iso2) {
                  statesPromises.push(fetchAllStates(country.iso2));
                }
              }
              
              // Wait for all states to be fetched
              const statesResults = await Promise.all(statesPromises);
              let allStates: any[] = [];
              statesResults.forEach(stateResult => {
                if (stateResult && Array.isArray(stateResult)) {
                  allStates = [...allStates, ...stateResult];
                }
              });
              
              // Set states in state variable and create map
              setStates(allStates);
              allStates.forEach(state => {
                statesMap.set(state.id.toString(), state);
              });
              
              // Fetch cities for states that have leads
              const citiesPromises = [];
              
              // First, create a reverse lookup map from state ID to country ID
              // This is based on the uniqueStateIds map we created earlier
              const stateToCountryMap = new Map();
              for (const [countryId, stateIds] of uniqueStateIds.entries()) {
                for (const stateId of stateIds) {
                  stateToCountryMap.set(String(stateId), String(countryId));
                }
              }
              
              for (const [stateId, _] of uniqueCityIds) {
                const state = statesMap.get(String(stateId));
                if (state && state.iso2) {
                  const countryId = stateToCountryMap.get(String(stateId));
                  
                  if (countryId) {
                    const country = countriesMap.get(countryId);
                    if (country && country.iso2) {
                      citiesPromises.push(fetchAllCities(country.iso2, state.iso2));
                    }
                  }
                }
              }
               
              // Wait for all cities to be fetched
              const citiesResults = await Promise.all(citiesPromises);
              let allCities: any[] = [];
              citiesResults.forEach(cityResult => {
                if (cityResult && Array.isArray(cityResult)) {
                  allCities = [...allCities, ...cityResult];
                }
              });
              
              // Set cities in state variable and create map
              setCities(allCities);
              allCities.forEach(city => {
                citiesMap.set(city.id.toString(), city);
              });
              
              // Transform leads
              const transformedLeads = leadsData.map((lead: any) => {
                const start = lead?.project?.startDate ? new Date(lead.project.startDate) : null;
                const end = lead?.project?.endDate ? new Date(lead.project.endDate) : null;
                const duration =
                  start && end
                    ? `${Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))} days`
                    : "N/A";
                
                // Get country name from ID
                const countryId = lead?.additionalDetails?.country || "";
                const country = countriesMap.get(String(countryId));
                const countryName = country ? country.name : String(countryId);
                
                // Get state name from ID
                const stateId = lead?.additionalDetails?.state || "";
                const state = statesMap.get(String(stateId));
                const stateName = state ? state.name : String(stateId);
                
                // Get city name from ID
                const cityId = lead?.additionalDetails?.city || "";
                const city = citiesMap.get(String(cityId));
                const cityName = city ? city.name : String(cityId);
                
                
                return {
                  id: lead.id,
                  prefix: lead?.prefix || "",
                  projectName: lead.title || "",
                  totalCost: Array.isArray(lead.commercials) && lead.commercials.length > 0
                    ? lead.commercials.reduce((sum: number, c: any) => sum + (parseFloat(c.cost) || 0), 0)
                    : (lead.budget || 0),
                  client: lead?.company?.companyName || lead?.leadTeams?.[0]?.company?.companyName || "",
                  service: lead?.projectServiceId || lead?.services?.[0]?.serviceId || "",
                  category: lead?.projectCategoryId || lead?.leadCategories?.[0]?.category?.id || "",
                  subCategory: lead?.projectSubCategoryId || lead?.leadSubCategories?.[0]?.subcategory?.id || "",
                  status: lead?.status || null,
                  poStatus: lead?.poStatus || null,
                  assignedTo: lead?.assignedToId || "",
                  inquiryDate: lead.inquiryDate || "",
                  startDate: lead?.startDate || lead?.project?.startDate || "",
                  endDate: lead?.endDate || "",
                  duration,
                  contact: lead?.contact?.fullName || lead?.leadTeams?.[0]?.contact?.fullName || "",
                  createdAt: lead?.createdAt || "",
                  createdBy: lead?.createdById || "",
                  updatedBy: lead?.updatedById || "",
                  country: countryName,
                  countryId: countryId,
                  city: cityName,
                  cityId: cityId,
                  state: stateName,
                  stateId: stateId,
                  area: (Array.isArray(lead.commercials) && lead.commercials.length > 0
                    ? lead.commercials[0]?.area
                    : null) || lead?.additionalDetails?.projectArea || lead?.addresses?.[0]?.projectArea || "",
                  // cost: lead?.project?.cost || 0, //old
                  cost: Array.isArray(lead.commercials) && lead.commercials.length > 0 ? lead.commercials.reduce((sum: number, c: any) => sum + (parseFloat(c.cost) || 0), 0) : 0, //new
                  companyId: lead.companyId || "",
                  branchId: lead.branchId || "",
                  description: lead.description || "",
                  priority: lead.priority || "",
                  estimatedHours: lead.estimatedHours || "",
                  budget: Array.isArray(lead.commercials) && lead.commercials.length > 0
                    ? lead.commercials.reduce((sum: number, c: any) => sum + (parseFloat(c.cost) || 0), 0)
                    : (lead.budget || ""),
                  rate: lead.rate || "",
                  leadSource: lead.source?.name || lead.sourceId || lead?.leadSource || "",
                  referrals: lead.referrals || [],
                  companyType: lead.company?.companyTypeId || "",
                  receivedDate: lead?.receivedDate || "",
                };
              });
              
              setTableData(transformedLeads);
            }
          } catch (error) {
            console.error("Error fetching data:", error);
          } finally {
            setLoading(false);
          }
        }, []);
      
        // Fetch when mounted
        useEffect(() => {
          fetchAllData();
        }, [fetchAllData, pagination]);

        useEffect(() => {
            dispatch(fetchAllEmployeesAsync())
        }, []);

    // Event bus subscriptions
    useEventBus(EVENT_KEYS.leadCreated, fetchAllData);
    useEventBus(EVENT_KEYS.leadUpdated, fetchAllData);
    useEventBus(EVENT_KEYS.chartSettingsUpdated, fetchAllData);
    useEventBus(EVENT_KEYS.closeChartDialogModal, handleCloseChartSettingsModal);
    const hideNewLeadButton = statusId || serviceId || categoryId || referralId || sourceId || subCategoryId || companyTypeId || topLeadsId  || locationId || monthlyStatusId;

    
    const columns = [
            {
                accessorKey: 'id',
                header: 'ID',
                size: 80,
                enableEditing: false,
                Cell: ({ row }: { row: any }) => {
                    return row.index + 1;
                }
            },
            { 
                accessorKey: 'prefix',
                header: 'Inquiry Id',
<<<<<<< HEAD
                size: 80,
                enableEditing: false,
                Cell: ({ row }: { row: any }) => {
                  return <span className="cursor-pointer "
                      style={{
                        color: "inherit",
                        fontWeight: "600",
                        fontSize: "14px",
=======
                size: 250, 
                minSize: 250, // Force minimum width
                enableEditing: false,
                Cell: ({ row }: { row: any }) => {
                  return <span className="cursor-pointer"
                      style={{
                        color: "inherit",
                        fontWeight: "600",
                        fontSize: "14.5px",
                        whiteSpace: "nowrap", // Force single line
>>>>>>> d6042feca22c37f2095dd47272be0da0226f612d
                      }}
                    >
                      {row?.original?.prefix || "N/A" }
                    </span>
              }
            },
            {
                accessorKey: 'projectName',
                header: 'Project Name',
<<<<<<< HEAD
                size: 200,
                Cell: ({ cell }: { cell: any }) => {
                    const value = cell.getValue();
                    return typeof value === 'object' ? JSON.stringify(value) : value || 'N/A' ;
=======
                size: 400, 
                minSize: 400, // Force minimum width
                Cell: ({ cell }: { cell: any }) => {
                    const value = cell.getValue();
                    return (
                        <span style={{ whiteSpace: "nowrap" }}>
                            {typeof value === 'object' ? JSON.stringify(value) : value || 'N/A'}
                        </span>
                    );
>>>>>>> d6042feca22c37f2095dd47272be0da0226f612d
                } 
            },
            {
                accessorKey: 'totalCost',
                header: 'Total Cost',
                size: 120,
                Cell: ({ cell }: { cell: any }) => {
                    const value = cell.getValue();
                    return value !== undefined ? `₹${Number(value).toLocaleString()}` : ' ₹0';
                }
            },
            {
                accessorKey: 'client',
                header: 'Client',
                size: 150,
                Cell: ({ cell }: { cell: any }) => {
                    const value = cell.getValue();
                    return typeof value === 'object' ? value.name || 'N/A' : value || 'N/A';
                }
            },
            {
                accessorKey: 'service',
                header: 'Service',
                size: 150,
                Cell: ({ cell }: { cell: any }) => {
                    const value = cell.getValue();
                    const serviceObj = projectServices?.find((service: any) => service.id === value);
                    return serviceObj ? serviceObj.name : 'N/A';
                }
            },
            {
                accessorKey: 'category',
                header: 'Category',
                size: 150,
                Cell: ({ cell }: { cell: any }) => {
                    const value = cell.getValue();
                    const categoryObj = projectCategories?.find((category: any) => category.id === value);
                    return categoryObj ? categoryObj.name : 'N/A';
                }
            },
            {
                accessorKey: 'subCategory',
                header: 'Sub Category',
                size: 150,
                Cell: ({ cell }: { cell: any }) => {
                    const value = cell.getValue();
                    const subcategoryObj = projectSubcategories?.find((subcategory: any) => subcategory.id === value);
                    return subcategoryObj ? subcategoryObj.name : 'N/A';
                }
            },
            {
                accessorKey: 'status',
                header: 'Lead Status',
                size: 130,
                Cell: ({ row }: any) => {

                    const status = row?.original?.status;
                    const statusName = status?.name;
                    const statusColor = status?.color;
                    return (
                        statusName ? <div
                            className="badge badge-light"
                            style={{ backgroundColor: statusColor, color: "white" }}
                        >
                            {statusName}
                        </div> : "N/A"
                    );
                },
            },
            {
                accessorKey: 'receivedDate',
                header: 'Received Date',
                size: 150,
                Cell: ({ cell }: { cell: any }) => {
                    const value = cell.getValue();
                    return value ? dayjs(value).format('DD-MM-YYYY') : 'N/A';
                }
            },
            {
                accessorKey: 'poStatus',
                header: 'PO Status',
                size: 130,
                Cell: ({ row }: any) => {
                    const poStatus = row?.original?.poStatus;
                    const leadStatusName = row?.original?.status?.name;
                    if (leadStatusName !== 'Received' || !poStatus) return <span>N/A</span>;
                    const color = poStatus === 'Received' ? '#28A745' : '#FFC107';
                    return (
                        <div
                            className="badge badge-light"
                            style={{ backgroundColor: color, color: poStatus === 'Received' ? 'white' : '#333' }}
                        >
                            {poStatus}
                        </div>
                    );
                },
            },
            {
                accessorKey: 'assignedTo',
                header: 'Assigned To',
                size: 150,
                Cell: ({ cell }: { cell: any }) => {
                    const value = cell.getValue();
                    return allemployees?.find((employee: any) => employee.employeeId === value)?.employeeName || 'N/A';
                }
            },
            {
                accessorKey: 'inquiryDate',
                header: 'Inquiry Date',
                size: 150,
                Cell: ({ cell }: { cell: any }) => {
                    const value = cell.getValue();
                    return value ? dayjs(value).format('DD-MM-YYYY') : 'N/A';
                }
            },
            {
                accessorKey: 'startDate',
                header: 'Date',
                size: 150,
                Cell: ({ cell }: { cell: any }) => {
                    const value = cell.getValue();
                    return value ? dayjs(value).format('DD-MM-YYYY') : 'N/A';
                }
            },
            // {
            //     accessorKey: 'endDate',
            //     header: 'End Date',
            //     size: 150,
            //     Cell: ({ cell }: { cell: any }) => {
            //         const value = cell.getValue();
            //         return value ? dayjs(value).format('DD-MM-YYYY') : 'N/A';
            //     }
            // },
            {
                accessorKey: 'duration',
                header: 'Duration',
                size: 120,
                Cell: ({ cell }: { cell: any }) => {
                    const value = cell.getValue();
                    return value || 'N/A';
                }
            },
            {
                accessorKey: 'contact',
                header: 'Contact',
                size: 150,
                Cell: ({ cell }: { cell: any }) => {
                    const value = cell.getValue();
                    return typeof value === 'object' ? value.name || value.email || 'N/A' : value || 'N/A';
                }
            },
            {
                accessorKey: 'createdAt',
                header: 'Created Date',
                size: 150,
                Cell: ({ cell }: { cell: any }) =>
                    cell.getValue() ? dayjs(cell.getValue()).format('DD-MM-YYYY') : 'N/A'
            },
            {
                accessorKey: 'createdBy',
                header: 'Created By',
                size: 150,
                Cell: ({ cell }: { cell: any }) => {
                    const value = cell.getValue();
                    return allemployees?.find((employee: any) => employee.employeeId === value)?.employeeName || 'N/A';
                }
            },
            {
                accessorKey: 'updatedBy',
                header: 'Edited By',
                size: 150,
                Cell: ({ cell }: { cell: any }) => {
                    const value = cell.getValue();
                    return allemployees?.find((employee: any) => employee.employeeId === value)?.employeeName || 'N/A';
                }
            },
            {
                accessorKey: 'country',
                header: 'Country',
                size: 120,
                Cell: ({ cell }: { cell: any }) => cell.getValue() || 'N/A'
            },
            {
                accessorKey: 'city',
                header: 'City',
                size: 120,
                Cell: ({ row }: { row: any }) => {
                    return row.original.city || 'N/A';
                }
            },
            {
                accessorKey: 'state',
                header: 'State',
                size: 120,
                Cell: ({ row }: { row: any }) => {
                    return row.original.state || 'N/A';
                }
            },
            {
                accessorKey: 'area',
                header: 'Area',
                size: 120,
                Cell: ({ cell }: { cell: any }) => cell.getValue() || 'N/A'
            },
            {
                accessorKey: 'cost',
                header: 'Cost',
                size: 120,
                Cell: ({ cell }: { cell: any }) =>
                    cell.getValue() ? `₹${Number(cell.getValue()).toLocaleString()}` : '₹0'
            },
            ...(hideNewLeadButton
              ? []
              : [
                  {
                    accessorKey: "actions",
                    header: "Actions",
                    size: 120,
                    enableEditing: false,
                    Cell: ({ row }: { row: any }) => (
                      <Box sx={{ display: "flex", gap: "8px" }}>
                        <button
                    className="btn btn-icon btn-bg-light btn-active-color-primary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            const currLead = rawLeadsData.find(
                              (lead: any) => lead.id === row.original.id
                            );
                            const formLeadDataFinal = mapLeadToFormInitialValues(currLead);
                            setFormValues(formLeadDataFinal);
                            setSelectedLead(row.original);
                            setIsEditModalOpen(true);
                          }}
                          // sx={{ color: "#9D4141" }}
                        >
                          <KTIcon iconName="pencil" className="fs-2" />
                        </button>
            
                         <button
                    className="btn btn-icon btn-bg-light btn-active-color-primary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteLead(row.original.id);
                          }}
                        >
                          <KTIcon iconName="trash" className="fs-2" />
                        </button>
                      </Box>
                    ),
                  },
                ])
            ]            

 
    // function mapLeadToFormInitialValues(
    //     lead: any) {
    //     const additional = lead?.additionalDetails || {};
    //     // Determine template type
    //     const leadTemplateId = lead?.leadTemplateId;
    //     // Map referrals if present
    //     const referrals = Array.isArray(lead?.referrals) && lead.referrals.length
    //         ? lead.referrals.map((r: any) => ({
    //             ...r,
    //             referralType: r?.referralTypeId || "",
    //             referringCompany: r?.referringCompanyId || '',
    //             referringContact: r?.referredByContactId || '',
    //             referredByContactId: r?.referredByContactId || ''
    //             // Add any mapping for referral fields if needed
    //         }))
    //         : [];

    //     // Compose the result object
    //     const formValues: any = {
    //       id: lead.id,
    //       leadTemplateId: leadTemplateId,
    //       projectName: lead.title || "",
    //       service: lead.projectServiceId || "",
    //       category: lead.projectCategoryId || "",
    //       subCategory: lead.projectSubCategoryId || "",
    //       startDate: lead.startDate || "",
    //       endDate: lead.endDate || "",
    //       rate: lead.rate || "",
    //       description: lead.description || "",
    //       companyId: lead.companyId || "",
    //       branchId: (lead.branchMappings && lead.branchMappings[0]?.branchId) || "",
    //       company: lead.company?.companyName || "",
    //       contactPersonId: lead?.contactId || "",
    //       contactRoleId: lead.contactRoleId || lead.contact?.contactRoleId || "",
    //       leadInquiryDate: lead.inquiryDate || "",
    //       leadAssignedTo: lead.assignedToId || "",
    //       leadSource: lead.leadSource || "",
    //       referrals: referrals,
    //       source: lead.source || "",
    //       cost: lead.budget || "",
    //       // Additional fields for web-dev
    //       ...(leadTemplateId == leadAndProjectTemplateTypeId.webDev && {
    //         type: additional.type || "",
    //         numberOfPages: additional.numberOfPages || "",
    //         latitude: additional.latitude || "",
    //         longitude: additional.longitude || "",
    //         mapLocation: additional.mapLocation || "",
    //         country: additional.country || "",
    //         state: additional.state || "",
    //         city: additional.city || "",
    //         locality: additional.locality || "",
    //         zipCode: additional.zipCode || "",
    //         poNumber: additional.poNumber || "",
    //         poDate: additional.poDate || "",
    //       }),
    //       // Additional fields for mep
    //       ...(leadTemplateId == leadAndProjectTemplateTypeId.mep && {
    //         projectArea: additional.projectArea || "",
    //         projectAddress: additional.projectAddress || "",
    //         zipCode: additional.zipCode || "",
    //         mapLocation: additional.mapLocation || "",
    //         country: additional.country || "",
    //         state: additional.state || "",
    //         city: additional.city || "",
    //         locality: additional.locality || "",
    //         poNumber: additional.poNumber || "",
    //         poDate: dayjs(additional.poDate).format("YYYY-MM-DD") || "",
    //         latitude: additional.latitude || "",
    //         longitude: additional.longitude || "",
    //       })
    //     };
    //     return formValues;
    // }



    const handleDeleteLead = async (id: string) => {
        try {
            const confirm = await deleteConfirmation('Lead deleted successfully!');
            if (confirm) {
                setDeletingId(id);
                await deleteLead(id);

                // Update the UI by removing the deleted lead
                setTableData(prev => prev.filter((lead: any) => lead.id !== id));

                // Show success message (you can replace this with a toast/snackbar)
                // successConfirmation('Lead deleted successfully!');
            }
        } catch (error) {
            console.error('Error deleting lead:', error);
            errorConfirmation('Failed to delete lead. Please try again.');
        } finally {
            setDeletingId(null);
        }
    };

    const handleOpenModal = () => {
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    const handleCreateProject = (templateId: string) => {
        // Handle project creation with the selected template
        // TODO: Implement actual project creation logic
        handleCloseModal();
    };

    const handleOpenChartSettingsModal = () => {
        setShowChartSettingsModal(true);
    };

   function handleCloseChartSettingsModal(){
        setShowChartSettingsModal(false);
    };

    // Template data for the modal
    const templateData = [
        {
            id: leadAndProjectTemplateTypeId.newLead,
            title: 'Blank Lead',
            description: ""
        },
        {
            id: leadAndProjectTemplateTypeId.mep,
            title: 'MEP Lead',
            description: 'Template',
        },
        {
            id: leadAndProjectTemplateTypeId.webDev,
            title: 'Web Development Template Lead',
            description: 'Template',
        }
    ];

    if (loading) {
        return <Loader />
    }

  
  
  const startDates = startDate ? dayjs(startDate) : null;
  const endDates = endDate ? dayjs(endDate) : null;

  
  const dateFilteredData = tableData?.filter((item: any) => {
    const createdAt = dayjs(item.createdAt);
  
    if (startDates && createdAt.isBefore(dayjs(startDates).startOf('day'))) return false;
    if (endDates && createdAt.isAfter(dayjs(endDates).endOf('day'))) return false;
  
    return true;
  });
  

    
const filteredData = (() => {
  if (statusId) {
    return dateFilteredData?.filter(
      (item: any) => item.status?.id === statusId
    );
  }

  if (serviceId) {
    return dateFilteredData?.filter(
      (item: any) => item.service === serviceId
    );
  }

  if (categoryId) {
    return dateFilteredData?.filter(
      (item: any) => item.category === categoryId
    );
  }

  if (referralId) {
    return dateFilteredData?.filter((item: any) =>
      item.referrals?.some((ref: any) => ref.referralTypeId === referralId)
    );
  }

  if (sourceId) {
    return dateFilteredData?.filter(
      (item: any) =>
        item.leadSource?.toLowerCase() === sourceId?.toLowerCase()
    );
  }

  if (subCategoryId) {
    return dateFilteredData?.filter(
      (item: any) => item.subCategory === subCategoryId
    );
  }

  if (companyTypeId) {
    return dateFilteredData?.filter(
      (item: any) => item.companyType === companyTypeId
    );
  }

  if (topLeadsId?.length) {
    return tableData?.filter((item: any) =>
      topLeadsId?.includes(item.id.trim())
    );
  }

  if (locationId) {
    return dateFilteredData?.filter((item: any) => {
      if (locationId.toLowerCase() !== "unknown") {
        return (
          item.countryId?.toString() === locationId ||
          item.stateId?.toString() === locationId ||
          item.cityId?.toString() === locationId ||
          item.country?.toLowerCase() === locationId.toLowerCase() ||
          item.state?.toLowerCase() === locationId.toLowerCase() ||
          item.city?.toLowerCase() === locationId.toLowerCase()
        );
      } else {
        return !(
          item.countryId ||
          item.stateId ||
          item.cityId ||
          item.country ||
          item.state ||
          item.city
        );
      }
    });
  }

  if (monthlyStatusName && monthlyStatusId) {
    return dateFilteredData?.filter((item: any) => {
      const monthName = dayjs(item.createdAt).format("MMMM");
      const monthMatches = monthName === monthlyStatusName;
      const statusMatches = item.status?.name === monthlyStatusId;
      return monthMatches && statusMatches;
    });
  }

  return dateFilteredData;
})();




    return (
        <>
            <Box sx={{}}>
                {/* <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h4" component="h1" sx={{ fontWeight: 600, color: '#333' }}>
                        Leads
                    </Typography>
                    <Button
                        variant="contained"
                        onClick={handleOpenModal}
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
                        }}
                    >
                        + New Lead 
                    </Button>
                </Box> */}
                <div className="d-flex align-items-center justify-content-between pt-5 mt-1">
                    <div
                        // className="mb-4"
                        style={{
                            fontFamily: "Barlow",
                            fontSize: "24px",
                            fontWeight: "600",
                        }}
                    >
                        Leads
                    </div>
                    {!hideNewLeadButton &&(
                    <div className="d-flex align-items-center gap-3">
                        {/* <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            width="24" 
                            height="24" 
                            viewBox="0 0 24 24" 
                            fill="none"
                            onClick={handleOpenChartSettingsModal}
                            style={{ cursor: 'pointer' }}
                        >
                            <path d="M10.5 6H20.25M10.5 6C10.5 6.39782 10.342 6.77936 10.0607 7.06066C9.77936 7.34196 9.39782 7.5 9 7.5C8.60218 7.5 8.22064 7.34196 7.93934 7.06066C7.65804 6.77936 7.5 6.39782 7.5 6M10.5 6C10.5 5.60218 10.342 5.22064 10.0607 4.93934C9.77936 4.65804 9.39782 4.5 9 4.5C8.60218 4.5 8.22064 4.65804 7.93934 4.93934C7.65804 5.22064 7.5 5.60218 7.5 6M7.5 6H3.75M10.5 18H20.25M10.5 18C10.5 18.3978 10.342 18.7794 10.0607 19.0607C9.77936 19.342 9.39782 19.5 9 19.5C8.60218 19.5 8.22064 19.342 7.93934 19.0607C7.65804 18.7794 7.5 18.3978 7.5 18M10.5 18C10.5 17.6022 10.342 17.2206 10.0607 16.9393C9.77936 16.658 9.39782 16.5 9 16.5C8.60218 16.5 8.22064 16.658 7.93934 16.9393C7.65804 17.2206 7.5 17.6022 7.5 18M7.5 18H3.75M16.5 12H20.25M16.5 12C16.5 12.3978 16.342 12.7794 16.0607 13.0607C15.7794 13.342 15.3978 13.5 15 13.5C14.6022 13.5 14.2206 13.342 13.9393 13.0607C13.658 12.7794 13.5 12.3978 13.5 12M16.5 12C16.5 11.6022 16.342 11.2206 16.0607 10.9393C15.7794 10.658 15.3978 10.5 15 10.5C14.6022 10.5 14.2206 10.658 13.9393 10.9393C13.658 11.2206 13.5 11.6022 13.5 12M13.5 12H3.75" stroke="#7A2626" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg> */}
                        <Button variant="contained"
                            onClick={handleOpenModal}
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
                            }}>Old Lead</Button>
                            <Button variant="contained"
                            onClick={handleOpenModal}
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
                            }}>New Lead</Button>
                    </div>
                    )}
                </div>

                <MaterialTable
                    columns={columns}
                    data={filteredData}
                    tableName="LeadsTablesMain"
                    employeeId={currentEmployeeId}
                    resource="LEADS"
                    viewOwn={true}
                    viewOthers={true}
                    checkOwnWithOthers={true}
<<<<<<< HEAD
=======
                    enableColumnResizing={true}
                    layoutMode="grid"
                    muiTableContainerProps={{
                        sx: {
                            maxHeight: '700px',
                            overflowX: 'auto',
                        },
                    }}
>>>>>>> d6042feca22c37f2095dd47272be0da0226f612d
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
<<<<<<< HEAD
                                backgroundColor: `${row.original?.status?.color}30`,
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
=======
                                backgroundColor: `${row.original?.status?.color}20`, // Subtler background
                                transition: 'all 0.2s ease',
                  
                                '& .MuiTableCell-root': {
                                  fontSize: '15.5px', // Larger, more visible font
                                  fontFamily: 'Inter',
                                  fontWeight: '500',
                                  padding: '16px 20px !important', // Increased padding for better spacing
                                  border: 'none', // Removed white lines
                                  color: '#333',
>>>>>>> d6042feca22c37f2095dd47272be0da0226f612d
                                },
                                '& .MuiTableCell-root:first-of-type': {
                                  borderTopLeftRadius: '12px',
                                  borderBottomLeftRadius: '12px',
<<<<<<< HEAD
                                  // marginTop:"40px !important"
                                  borderLeft: "3px solid white"
                  
=======
>>>>>>> d6042feca22c37f2095dd47272be0da0226f612d
                                },
                                '& .MuiTableCell-root:last-of-type': {
                                  borderTopRightRadius: '12px',
                                  borderBottomRightRadius: '12px',
<<<<<<< HEAD
                                  borderRight: "3px solid white"
                                },
                                '&:hover': {
                                  backgroundColor: `${row.original?.status?.color}99`,
                                  '& td': {
                                    color: 'black',
                                  },
=======
                                },
                                '&:hover': {
                                  backgroundColor: `${row.original?.status?.color}40`,
                                  transform: 'translateY(-2px)',
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
>>>>>>> d6042feca22c37f2095dd47272be0da0226f612d
                                },
                              },

                            onClick: () => {
                                navigate(`/employee/lead/${row.original.id}`, {
                                    state: { leadData: row.original.id },
                                });
                            },
                        }),
                    }}

                />


                <DetailsModal
                    open={isModalOpen}
                    onClose={handleCloseModal}
                    Datas={templateData}
                />


            </Box>
            {formValues &&
                <LeadFormModal
                    leadTemplateId={formValues?.leadTemplateId}
                    open={true}
                    onClose={() => setFormValues(null)}
                    title={`Edit ${formValues.title || formValues?.projectName} Lead`}
                    initialData={{ id: formValues?.leadTemplateId }}
                    initialFormData={formValues}
                    isEditMode={true}
                />}

            {/* Chart Settings Modal */}
            <Modal
                show={showChartSettingsModal}
                onHide={handleCloseChartSettingsModal}
                size="xl"
                centered
                className="responsive-modal"
            >
                {/* <Modal.Header closeButton style={{ backgroundColor: '#F3F4F7', borderBottom: '1px solid #e0e0e0' }}>
                    
                </Modal.Header> */}
                <Modal.Body style={{ 
                    backgroundColor: 'white', 
                    padding: '20px', 
                    borderRadius: '8px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                    <div style={{ 
                        backgroundColor: 'white', 
                        padding: '20px', 
                        borderRadius: '8px',
                    }}>
                      <Typography
                          style={{ 
                          fontFamily: 'Inter', 
                          fontWeight: 600, 
                          fontSize: '18px', 
                          color: '#333' 
                      }}
                      >
                        Customize Cards Visibility
                      </Typography>
                      <LeadsProjectCompanyChartSettings type={PROJECT_CHART_SETTINGS_MODAL_TYPE.LEAD} />
                    </div>
                </Modal.Body>
            </Modal>
        </>

    );
};
export default LeadNewLead;