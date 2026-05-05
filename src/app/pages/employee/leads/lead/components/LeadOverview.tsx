import { leadAndProjectTemplateTypeId } from "@constants/statistics";
import { projectOverviewIcons } from "@metronic/assets/sidepanelicons";
import { getClientCompanyById, getClientContactById, getAllCompanyTypes, getAllClientCompanies } from "@services/companies";
import { fetchAllCities, fetchAllCountries, fetchAllStates } from "@services/options";
import { getAllProjectServices, getPorjectById } from "@services/projects";
import { getAvatar } from "@utils/avatar";
import dayjs from "dayjs";
import { useCallback, useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
//new
import { getAllLeadCancellationReasons } from "@services/lead";
import { useSelector, useDispatch } from "react-redux";
import { loadAllEmployeesIfNeeded } from "@redux/slices/allEmployees";
import type { AppDispatch, RootState } from "@redux/store";

interface ProjectData {
  currentStatus: string;
  receivedDate: string;
  //new
  handledBy: string;
  cancellationReasonId: string;
  fileLocationCompanyType: string;
  fileLocationCompany: string;
  projectName: string;
  service: string;
  projectCategory: string;
  projectSubCategory: string;
  startDate: string;
  endDate: string;
  duration: string;
  poNumber: string;
  poDate: string;
  rate: string;
  totalCost: string;
  area: string;
  projectAddress: string;
  city: string;
  state: string;
  country: string;
  zip: string;
  leadNumber: string;
  inquiryDate: string;
  leadAssignedTo: string;
  leadSource: string;
  referredBy: string;
  referredTo: string;
  companyType: string;
  company: string;
  branch: string;
  location: string;
  visibility: string;
  createdBy: string;
  createdDate: string;
  lastEditedBy: string;
  lastEdited: string;
  notes: string;
  type?: string;
  latitude?: string;
  longitude?: string;
  numberOfPages?: string;
  // Project Detail fields
  plotArea?: string;
  plotAreaUnit?: string;
  builtUpArea?: string;
  builtUpAreaUnit?: string;
  buildingDetail?: string;
  otherPoint1Heading?: string;
  otherPoint1Description?: string;
  otherPoint2Heading?: string;
  otherPoint2Description?: string;
  otherPoint3Heading?: string;
  otherPoint3Description?: string;
}

const LeadOverview = ({ lead }: { lead: any }) => {
  let finalMappedData;
  if(lead){
    finalMappedData = mapLeadToProjectData(lead);
  }
  const [countries, setCountries] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [allLocationData, setAllLocationData] = useState<any>({})
  const [contactData, setContactData] = useState(lead?.leadTeams?.[0]?.contact || {})
  const [leadServices, setLeadServices] = useState<any[]>([]);
  const [cancellationReasons, setCancellationReasons] = useState<any[]>([]);
  const [allCompanyTypes, setAllCompanyTypes] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const leadTemplateId = lead?.leadTemplateId;

  //new
  const dispatch = useDispatch<AppDispatch>();

  // Redux: allEmployees list shape: { employeeId, employeeName, avatar, gender, roles }
  const allEmployeesList = useSelector((state: RootState) => state.allEmployees?.list) || [];
  
  function mapLeadToProjectData(lead: any): ProjectData {
    const start = lead?.startDate ? new Date(lead.startDate) : null;
    const end = lead?.endDate ? new Date(lead.endDate) : null;
    const poDate = lead?.additionalDetails?.poDate ? dayjs(lead.additionalDetails.poDate).format("DD/MM/YYYY") : null;

    const computeDuration = (s: Date | null, e: Date | null) => {
      if (!s || !e) return '-';
      // Normalize to local midnight to avoid DST/timezone partial-day issues
      const sDate = new Date(s.getFullYear(), s.getMonth(), s.getDate());
      const eDate = new Date(e.getFullYear(), e.getMonth(), e.getDate());
      if (eDate < sDate) return '-';

      // Calendar-aware months and remaining days
      let months = (eDate.getFullYear() - sDate.getFullYear()) * 12 + (eDate.getMonth() - sDate.getMonth());
      const anchor = new Date(sDate.getFullYear(), sDate.getMonth() + months, sDate.getDate());
      if (anchor > eDate) {
        months -= 1;
      }
      const afterMonths = new Date(sDate.getFullYear(), sDate.getMonth() + months, sDate.getDate());
      const msPerDay = 1000 * 60 * 60 * 24;
      const days = Math.round((eDate.getTime() - afterMonths.getTime()) / msPerDay);

      const parts: string[] = [];
      if (months > 0) parts.push(`${months} month${months !== 1 ? 's' : ''}`);
      parts.push(`${days} day${days !== 1 ? 's' : ''}`);
      return parts.join(', ');
    };

    // Get primary company and contact from leadTeams
    const primaryTeam = lead?.leadTeams?.[0];
    const company = primaryTeam?.company;
    const contact = primaryTeam?.contact;

    // Prefer company location (City, State, Country)
    const companyLocation = company ?
      [company?.address, company?.city, company?.state, company?.country]
        .filter(Boolean)
        .join(', ') : '-';

    // Get category and subcategory names
    const categoryName = lead?.leadCategories?.[0]?.category?.name || '-';
    const subCategoryName = lead?.leadSubCategories?.[0]?.subcategory?.name || '-';

    // Calculate total cost from commercials
    const totalCost = lead?.commercials?.reduce((sum: number, commercial: any) => {
      return sum + parseFloat(commercial.cost || 0);
    }, 0) || 0;

    // //new
    // // Resolve handledBy - it's stored as an employee ID string
    // let handledByName = '-';
    // if (lead.handledBy) {
    //   // If handledBy is a relation object with users (future-proof)
    //   if (lead.handledBy?.users) {
    //     handledByName = `${lead.handledBy.users.firstName || ''} ${lead.handledBy.users.lastName || ''}`.trim();
    //   } else {
    //     // handledBy is a plain string (employee ID) - will be resolved later via allEmployees
    //     handledByName = lead.handledBy; // Store the ID for now, will be resolved in render
    //   }
    // }

    return {
      currentStatus: lead.status?.name || '-',
      receivedDate: lead.receivedDate ? dayjs(lead.receivedDate).format('DD/MM/YYYY') : '-',
      //new
      handledBy: lead.handledBy || '-', // Store the raw employee ID — resolved to a name in the component via Redux allEmployees.list
      cancellationReasonId: lead.cancellationReasonId || '-',  // Store the raw reason ID — resolved to a name in the component via cancellationReasons state
      fileLocationCompanyType: lead.fileLocationCompanyType || '-',  // Store the raw type ID (e.g. '1', '2', '3')
      fileLocationCompany: lead.fileLocationCompany || '-',  // Store the raw company ID (e.g. 'arch_1', 'builder_2')
      projectName: lead.title || '-',
      service: lead?.services?.[0]?.serviceId || '-', // You'll need to map this to actual service names
      location: companyLocation,
      projectCategory: categoryName,
      projectSubCategory: subCategoryName,
      startDate: lead?.startDate ? dayjs(lead.startDate).format("DD/MM/YYYY") : '-',
      endDate: lead?.endDate ? dayjs(lead.endDate).format("DD/MM/YYYY") : '-',
      duration: computeDuration(start, end),
      rate: '-', // Not directly available in new structure
      totalCost: totalCost > 0 ? `₹${totalCost}` : '-',
      area: lead?.additionalDetails?.projectArea || '-',
      leadNumber: lead.prefix || lead.id || '-',
      inquiryDate: lead.inquiryDate ? dayjs(lead.inquiryDate).format("DD/MM/YYYY") : '-',
      leadAssignedTo: lead.assignedTo?.users ?
        `${lead.assignedTo.users.firstName || ''} ${lead.assignedTo.users.lastName || ''}`.trim() : '-',
      leadSource: lead.leadDirectSource?.name || lead.leadSource || '-',
      referredBy: lead.referrals && lead.referrals.length > 0 ?
        lead.referrals.map((data: any) => {
          // Internal referral: show employee name
          if (data?.referredByEmployee) {
            const emp = data.referredByEmployee;
            return emp?.users
              ? `${emp.users.firstName || ''} ${emp.users.lastName || ''}`.trim()
              : null;
          }
          // External referral: show contact name
          return data?.referredByContact?.fullName || null;
        }).filter(Boolean).join(', ') || '-' : '-',
      referredTo: '-',
      companyType: primaryTeam?.companyType?.name || '-',
      company: company?.companyName || '-',
      branch: lead.branchMappings?.[0]?.branch?.name || '-',
      visibility: company?.visibility || '-',
      createdBy: lead.createdBy?.users?.firstName+" "+lead.createdBy?.users?.lastName || '-',
      createdDate: lead.createdAt ? dayjs(lead.createdAt).format("DD/M/YYYY, h:mmA") : '-',
      lastEditedBy: lead.updatedBy?.users?.firstName+" "+lead.updatedBy?.users?.lastName || '-',
      lastEdited: lead.updatedAt ? dayjs(lead.updatedAt).format("DD/M/YYYY, h:mmA") : '-',
      type: lead?.additionalDetails?.type || "-",
      numberOfPages: lead?.additionalDetails?.numberOfPages || "-",
      projectAddress: lead?.additionalDetails?.projectAddress || '-',
      city: lead?.additionalDetails?.city || '-',
      state: lead?.additionalDetails?.state || '-',
      country: lead?.additionalDetails?.country || '-',
      zip: lead?.additionalDetails?.zipCode || '-',
      poNumber: lead?.additionalDetails?.poNumber || '-',
      poDate: poDate || '-',
      latitude: lead?.additionalDetails?.latitude || '',
      longitude: lead?.additionalDetails?.longitude || '',
      notes: lead.notes || '-',
      // Project Detail fields (from additionalDetails)
      plotArea: lead?.additionalDetails?.plotArea || '',
      plotAreaUnit: lead?.additionalDetails?.plotAreaUnit || 'sqft',
      builtUpArea: lead?.additionalDetails?.builtUpArea || '',
      builtUpAreaUnit: lead?.additionalDetails?.builtUpAreaUnit || 'sqft',
      buildingDetail: lead?.additionalDetails?.buildingDetail || '',
      otherPoint1Heading: lead?.additionalDetails?.otherPoint1Heading || '',
      otherPoint1Description: lead?.additionalDetails?.otherPoint1Description || '',
      otherPoint2Heading: lead?.additionalDetails?.otherPoint2Heading || '',
      otherPoint2Description: lead?.additionalDetails?.otherPoint2Description || '',
      otherPoint3Heading: lead?.additionalDetails?.otherPoint3Heading || '',
      otherPoint3Description: lead?.additionalDetails?.otherPoint3Description || '',
    };
  }
    
  const [projectData] = useState<ProjectData>({
    currentStatus: '-',
    receivedDate: '-',
    //new
    handledBy: '-',
    cancellationReasonId: '-',
    fileLocationCompanyType: '-',
    fileLocationCompany: '-',
    projectName: '-',
    service: '-',
    projectCategory: '-',
    projectSubCategory: '-',
    startDate: '-',
    endDate: '-',
    duration: '-',
    poNumber: '-',
    poDate: '-',
    rate: '-',
    totalCost: '-',
    area: '-',
    projectAddress: '-',
    city: '-',
    state: '-',
    country: '-',
    zip: '-',
    leadNumber: '-',
    inquiryDate: '-',
    leadAssignedTo: '-',
    leadSource: '-',
    referredBy: '-',
    referredTo: '-',
    companyType: '-',
    company: '-',
    branch: '-',
    location: '-',
    visibility: '-',
    createdBy: '-',
    createdDate: '-',
    lastEditedBy: '-',
    lastEdited: '-',
    latitude: '',
    longitude: '',
    notes: '-',
    // ...(leadTemplateId && leadTemplateId == leadAndProjectTemplateTypeId.webDev && {
      type: "-",
      numberOfPages: "-",
    // }),
    // Project Detail fields
    plotArea: '',
    plotAreaUnit: 'sqft',
    builtUpArea: '',
    builtUpAreaUnit: 'sqft',
    buildingDetail: '',
    otherPoint1Heading: '',
    otherPoint1Description: '',
    otherPoint2Heading: '',
    otherPoint2Description: '',
    otherPoint3Heading: '',
    otherPoint3Description: '',
    ...finalMappedData
  });

  //new
  // ===== Helper: Resolve handledBy employee ID → actual employee name =====
  // Redux allEmployees.list items have shape: { employeeId, employeeName, avatar, gender, roles }
  const getHandledByName = (): string => {
  const handledById = projectData.handledBy;
  if (!handledById || handledById === '-') return '-';

  if (Array.isArray(allEmployeesList) && allEmployeesList.length > 0) {
    const employee = allEmployeesList.find((emp: any) => emp.employeeId === handledById);
    if (employee?.employeeName) {
      return employee.employeeName;  // e.g. "John Doe"
    }
  }
  return handledById; // fallback while loading
};

  // ===== Helper: Resolve cancellation reason ID → reason name =====
  const getCancellationReasonName = (): string => {
    const reasonId = projectData.cancellationReasonId;
    if (!reasonId || reasonId === '-') return '-';
    const reason = cancellationReasons.find((r: any) => r.id === reasonId);
    return reason?.reason || reason?.name || reasonId;
  };

  // ===== Helper: Resolve file location IDs → "CompanyTypeName - CompanyName" =====
  const getFileLocationLabel = (): string => {
    const typeId = projectData.fileLocationCompanyType;
    const companyId = projectData.fileLocationCompany;
    if (!typeId || typeId === '-') return '-';

    const typeName = allCompanyTypes.find((t: any) => t.id === typeId)?.name || typeId;

    if (!companyId || companyId === '-') return typeName;

    const companyName = companies.find((c: any) => c.id === companyId)?.companyName || companyId;

    return `${typeName} - ${companyName}`;
  };

  // ===== Determine status for conditional rendering =====
  const currentStatusLower = projectData.currentStatus?.toLowerCase()?.trim() || '';
  const isStatusReceived = currentStatusLower === 'received';
  const isStatusNotReceived = currentStatusLower === 'not received';

  const [newNote, setNewNote] = useState<string>('');
  const [first, setfirst] = useState(false);
  const [commercialScrollTop, setCommercialScrollTop] = useState(0);
  const commercialScrollRef = useRef<HTMLDivElement>(null);

  const handleAddNote = () => {
    if (newNote.trim()) {
      alert(`Note added: ${newNote}`);
      setNewNote('');
    }
  };

  const handleCommercialScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    setCommercialScrollTop(target.scrollTop);
  };

  {/* Data Fetching */}
  const fetchCountries = useCallback(async () => {
    // if (countries.length > 0) return countries;
    try {
      const response = await fetchAllCountries();
      const data = response || [];
      setCountries(data);
      return data;
    } catch (error) {
      console.error("Error fetching countries:", error);
      return [];
    }
  }, [countries.length]);

  const fetchServices = useCallback(async () => {
    try {
      const response = await getAllProjectServices();
      const data = response || [];
      setLeadServices(data?.services || []);
      return data;
    } catch (error) {
      console.error("Error fetching services:", error);
      return [];
    }
  }, []);

  //new
  const fetchCancellationReasons = useCallback(async () => {
    try {
      const response = await getAllLeadCancellationReasons();
      const data = response?.data?.leadCancellationReasons || response?.leadCancellationReasons || response?.data || [];
      setCancellationReasons(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching cancellation reasons:", error);
    }
  }, []);

  const fetchAllCompanyTypes = useCallback(async () => {
    try {
      const { companyTypes } = await getAllCompanyTypes();
      setAllCompanyTypes(companyTypes || []);
    } catch (error) {
      console.error('Error fetching company types:', error);
    }
  }, []);

  const fetchCompanies = useCallback(async () => {
    try {
      const response = await getAllClientCompanies();
      const data = response?.data?.companies || [];
      setCompanies(data);
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  }, []);

  useEffect(() => {
    fetchCountries();
    fetchServices();
    fetchCancellationReasons(); //new
    fetchAllCompanyTypes();
    fetchCompanies();
    dispatch(loadAllEmployeesIfNeeded()); //new
  }, []);

      useEffect(() => {
        const loadLocationData = async () => {
          if (projectData?.country && countries.length > 0) {
            
            const country = countries.find((c:any) => c.id == projectData.country || String(c.id) === projectData.country);
            
            if (country) {
              // Set the country in formik with the proper format for the dropdown
              const stateData = await fetchAllStates(country.iso2);
              setStates(stateData);
              
              if (projectData?.state) {
                const state = stateData.find((s:any) => s.id == projectData.state || String(s.id) === projectData.state);
                if (state) {
                  // Set the state in formik with the proper format for the dropdown
                  // if (formikRef.current) {
                  //   formikRef.current.setFieldValue('state', state.id);
                  // }
                  
                  const cityData = await fetchAllCities(country.iso2, state.iso2);
                  setCities(cityData);
                  
                  if (projectData?.city) {
                    const city = cityData.find((c:any) => c.id == projectData.city || String(c.id) === projectData.city);
                    // if (city && formikRef.current) {
                    //   formikRef.current.setFieldValue('city', city.id);
                    // }
                    setAllLocationData({
                      country: country?.name,
                      state: state?.name,
                      city: city?.name
                    });
                  }
                  
                  
                }
              }
            }
          }
        };
        
        loadLocationData();
      }, [countries, projectData]);

  // const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  //   const badgeClass = status === 'Ongoing' ? 'bg-[#F9F4D7] text-dark' : 'bg-[#F9F4D9]';
  //   return <span className={`badge ${badgeClass} px-3 py-2 font-inter`}>{status}</span>;
  // };
  const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const bgColor = status === 'Ongoing' ? '#F9F4D7' : '#F9F4D9';
    return (
      <span
        className="badge px-8 py-3 font-inter rounded-pill"
        style={{ backgroundColor: bgColor, color: "#B1821F" }}
      >
        <span style={{
          fontFamily: 'Inter, sans-serif',
          fontWeight: 400,
          fontStyle: 'normal',
          fontSize: '18px',
          lineHeight: '100%',
          letterSpacing: '0',
        }}>•</span>
        <span className="ms-4" style={{
          fontFamily: 'Inter, sans-serif',
          fontWeight: 400,
          fontStyle: 'normal',
          fontSize: '14px',
          lineHeight: '100%',
          letterSpacing: '0',
        }}>{status}</span>
      </span>
    );
  };


  const InfoCard: React.FC<{ title: string; icon?: string; customImage?: string; children: React.ReactNode }> = ({ title, icon, customImage, children }) => (
    <div
      className="card h-100 border-0"
      style={{
        backgroundColor: "white",
        borderRadius: "12px",
        boxShadow: "8px 8px 16px 0px rgba(0,0,0,0.04)"
      }}
    >
      <div
        className="card-body d-flex flex-column"
        style={{
          height: "100%",
          padding: "20px 20px 16px 20px",
          gap: "16px"
        }}
      >
        <div className="d-flex align-items-center" style={{ gap: "10px", flexShrink: 0 }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              backgroundColor: "#e6eaf1",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden"
            }}
          >
            {/* {customImage ? (
              <img src={customImage} alt="" style={{ width: "24px", height: "24px" }} />
            ) : ( */}
              <i className={icon} style={{ fontSize: "24px", color: "#1E1E1E" }}></i>
            {/* )} */}
          </div>
          <span
            style={{
              fontFamily: "Barlow",
              fontSize: "19px",
              fontWeight: "600",
              color: "black",
              letterSpacing: "0.19px"
            }}
          >
            {title}
          </span>
          {title === 'Notes' && (
            <button className="btn btn-outline-primary btn-sm px-3 py-2 ms-auto">
              Add Note
            </button>
          )}
        </div>
        <div className="d-flex flex-column" style={{ gap: "8px", width: "100%" }}>
          {children}
        </div>
      </div>
    </div>
  );

  const InfoRow: React.FC<{ label: string; value: string; className?: string, url?: string, avatar?: string, gender?: number }> = ({ label, value, className = '', url='#', avatar, gender }) => (
    <div
      className={`d-flex align-items-center justify-content-between ${className}`}
      style={{
        fontFamily: "Inter",
        fontSize: "14px",
        color: "black",
      }}
    >
      <div style={{ fontWeight: "500" }}>{label}</div>
      <div style={{ fontWeight: "400" }}>
        {label.toLowerCase().includes('status') ? (
          <div
            className="d-flex align-items-center justify-content-center"
            style={{
              backgroundColor: "#f9f4d7",
              color: "#b1821f",
              padding: "7px 12px",
              borderRadius: "24px",
              height: "32px",
              gap: "10px",
              fontFamily: "Inter",
              fontSize: "14px",
              fontWeight: "400",
              display: "flex",
              alignItems: "center"
            }}
          >
            <div
              style={{
                width: "7px",
                height: "7px",
                backgroundColor: "#b1821f",
                borderRadius: "7px"
              }}
            />
            {value}
          </div>
        ) : (label.toLowerCase() === 'company' || label.toLowerCase() === 'contact') ? (
          <div className="d-flex align-items-center" style={{ gap: "4px" }}>
            {label.toLowerCase() === 'contact' && getAvatar(contactData?.avatar, contactData?.gender == "MALE"? 0 : contactData?.gender == "FEMALE"? 1 : 2) &&
              <img
                src={getAvatar(contactData?.avatar, contactData?.gender == "MALE"? 0 : contactData?.gender == "FEMALE"? 1 : 2)}
                alt=""
                className="rounded-circle"
                style={{ width: "24px", height: "24px" }}
              />
            }
            <Link
              to={url}
              style={{
                color: '#9d4141',
                textDecoration: 'none',
                fontWeight: "400"
              }}
            >
              {value || '-'}
            </Link>
          </div>
        ) : label.toLowerCase() === 'location' && value !== '-' ? (
          value
        ) : label.toLowerCase() === 'branch location' && lead?.branchMappings?.[0]?.branch?.latitude && lead?.branchMappings?.[0]?.branch?.longitude ? (
          <div className="d-flex align-items-center" style={{ gap: "4px" }}>
            <i className="bi bi-geo-alt" style={{ width: "20px", height: "20px", color: "#9d4141" }}></i>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${lead.branchMappings[0].branch.latitude},${lead.branchMappings[0].branch.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "#9d4141",
                textDecoration: "none",
                fontWeight: "400"
              }}
            >
              View on map
            </a>
          </div>
        ) : (
          value || '-'
        )}
      </div>
    </div>
  );

  return (
    <>
      <style>
        {`
          .commercial-scroll::-webkit-scrollbar {
            display: none;
          }
          .commercial-scroll {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}
      </style>
      <div className=" min-vh-100 w-100">
      <div className="row g-6">
        {/* First Row - Project Details & Client Details */}
        <div className="col-12 col-md-6">
          <InfoCard title="Project Details" icon="bi bi-briefcase">
            <InfoRow label="Current Status" value={projectData.currentStatus} />
            {/* Received Date: show ONLY when status is "Received" */}
            {isStatusReceived && (
              <InfoRow label="Received Date" value={projectData.receivedDate} />
            )}
            {/* new */}
            {/* Handled By: show ONLY when status is "Received" - resolved to actual employee name */}
            {isStatusReceived && (() => {
              // Show new multi-entry handledByEntries if available
              const handledByEntries = lead?.handledByEntries;
              if (handledByEntries && Array.isArray(handledByEntries) && handledByEntries.length > 0) {
                return (
                  <>
                    {handledByEntries.map((entry: any, idx: number) => {
                      // Resolve employee name from allEmployeesList
                      const employee = Array.isArray(allEmployeesList)
                        ? allEmployeesList.find((emp: any) => emp.employeeId === entry.employeeId)
                        : null;
                      const employeeName = employee?.employeeName || entry.employeeId || '-';
                      const handledDate = entry.handledDate
                        ? new Date(entry.handledDate).toISOString().split('T')[0]
                        : '-';
                      const handledOutDate = entry.handledOutDate
                        ? new Date(entry.handledOutDate).toISOString().split('T')[0]
                        : '-';
                      return (
                        <div key={entry.id || idx}>
                          <InfoRow label={idx === 0 ? "Handle By" : ""} value={`${employeeName}`} />
                          <InfoRow label={idx === 0 ? "Date In" : ""} value={handledDate} />
                          <InfoRow label={idx === 0 ? "Date Out" : ""} value={handledOutDate} />
                        </div>
                      );
                    })}
                  </>
                );
              }
              // No handledByEntries: show empty rows (do NOT fall back to legacy handledBy or assignedTo)
              return (
                <>
                  <InfoRow label="Handle By" value="-" />
                  <InfoRow label="Date In" value="-" />
                  <InfoRow label="Date Out" value="-" />
                </>
              );
            })()}

            {/* Cancellation Reason: show ONLY when status is "Not Received" - resolved to reason name */}
            {isStatusNotReceived && (
              <InfoRow label="Cancellation Reason" value={getCancellationReasonName()} />
            )}

            <InfoRow label="File Location in Computer" value={getFileLocationLabel()} />
            {/* <div className="row mb-2 ">
              <div className="col-sm-5"></div>
              <div className="col-sm-7 d-flex align-items-center justify-content-end">
                <StatusBadge status={projectData.currentStatus} />
              </div>
            </div> */}
            <InfoRow label="Project Name" value={projectData.projectName} />
            <InfoRow label="Service" value={leadServices.find((service) => service.id === projectData.service)?.name} />
            <InfoRow label="Project Category" value={projectData.projectCategory} />
            <InfoRow label="Project Sub Category" value={projectData.projectSubCategory} />
            {/* <InfoRow label="Start Date" value={projectData.startDate} /> */}
            {/* <InfoRow label="End Date" value={projectData.endDate} />
            <InfoRow label="Duration" value={projectData.duration} />
            {leadTemplateId==leadAndProjectTemplateTypeId.mep && <>
              <InfoRow label="PO Number" value={projectData.poNumber} />
              <InfoRow label="PO Date" value={projectData.poDate} />
            </>} */}
            {leadTemplateId==leadAndProjectTemplateTypeId.webDev && <>
              <InfoRow label="Type" value={projectData?.type || "-"} />
              <InfoRow label="Number Of Pages" value={projectData?.numberOfPages || "-"} />
            </>}
          </InfoCard>
        </div>

        <div className="col-12 col-md-6">
          <InfoCard title="Team Details" icon="bi bi-people">
            <InfoRow label="Company Type" value={projectData.companyType} />
            <InfoRow label="Company" value={projectData.company} url={ lead?.leadTeams?.[0]?.company?.id ? "/companies/" + lead?.leadTeams?.[0]?.company?.id : "#"}/>
            <InfoRow label="Branch" value={projectData.branch} />
            <InfoRow label="Location" value={projectData.location} />
            {lead?.branchMappings?.[0]?.branch && (
              <InfoRow label="Branch Location" value={lead.branchMappings[0].branch.name || "-"} />
            )}
            {/* <div className="row mb-2">
              <div className="col-sm-5"></div>
              <div className="col-sm-7 d-flex align-items-center justify-content-end">
                <div className="bg-success rounded-circle me-2" style={{ width: '8px', height: '8px' }}></div>
                <small className="fw-semibold">{projectData.contact}</small>
              </div>
            </div> */}
          </InfoCard>
        </div>

        {/* Project Detail Card - always visible */}
        <div className="col-12 col-md-6">
          <InfoCard title="Project Details 1" icon="bi bi-building">
            {/* Plot Area row */}
            <div className="d-flex align-items-center justify-content-between" style={{ fontFamily: 'Inter', fontSize: '14px', color: 'black' }}>
              <div style={{ fontWeight: 500 }}>Plot Area</div>
              <div style={{ fontWeight: 400 }}>
                {projectData.plotArea
                  ? `${projectData.plotArea}${projectData.plotAreaUnit ? ' ' + projectData.plotAreaUnit : ''}`
                  : '-'}
              </div>
            </div>
            {/* Built-Up Area row */}
            <div className="d-flex align-items-center justify-content-between" style={{ fontFamily: 'Inter', fontSize: '14px', color: 'black' }}>
              <div style={{ fontWeight: 500 }}>Built-Up Area</div>
              <div style={{ fontWeight: 400 }}>
                {projectData.builtUpArea
                  ? `${projectData.builtUpArea}${projectData.builtUpAreaUnit ? ' ' + projectData.builtUpAreaUnit : ''}`
                  : '-'}
              </div>
            </div>
            {/* Building Detail row */}
            <div className="d-flex align-items-center justify-content-between" style={{ fontFamily: 'Inter', fontSize: '14px', color: 'black' }}>
              <div style={{ fontWeight: 500 }}>Building Details</div>
              <div style={{ fontWeight: 400 }}>{projectData.buildingDetail || '-'}</div>
            </div>
            {/* Other Points — only show when they have data; same row style as above: label left, "heading : description" right */}
            {(projectData.otherPoint1Heading || projectData.otherPoint1Description) && (
              <div className="d-flex align-items-center justify-content-between" style={{ fontFamily: 'Inter', fontSize: '14px', color: 'black' }}>
                <div style={{ fontWeight: 500 }}>Other Point - 1</div>
                <div style={{ fontWeight: 400 }}>
                  {[projectData.otherPoint1Heading, projectData.otherPoint1Description].filter(Boolean).join(' : ')}
                </div>
              </div>
            )}
            {(projectData.otherPoint2Heading || projectData.otherPoint2Description) && (
              <div className="d-flex align-items-center justify-content-between" style={{ fontFamily: 'Inter', fontSize: '14px', color: 'black' }}>
                <div style={{ fontWeight: 500 }}>Other Point - 2</div>
                <div style={{ fontWeight: 400 }}>
                  {[projectData.otherPoint2Heading, projectData.otherPoint2Description].filter(Boolean).join(' : ')}
                </div>
              </div>
            )}
            {(projectData.otherPoint3Heading || projectData.otherPoint3Description) && (
              <div className="d-flex align-items-center justify-content-between" style={{ fontFamily: 'Inter', fontSize: '14px', color: 'black' }}>
                <div style={{ fontWeight: 500 }}>Other Point - 3</div>
                <div style={{ fontWeight: 400 }}>
                  {[projectData.otherPoint3Heading, projectData.otherPoint3Description].filter(Boolean).join(' : ')}
                </div>
              </div>
            )}
          </InfoCard>
        </div>

        {/* Commercial Details Card */}
        <div className="col-12 col-md-6">
          <div
            className="card border-0"
            style={{
              height: "500px",
              backgroundColor: "white",
              borderRadius: "12px",
              boxShadow: "8px 8px 16px 0px rgba(0,0,0,0.04)"
            }}
          >
            <div
              className="card-body d-flex"
              style={{
                height: "100%",
                padding: "20px",
                gap: "12px"
              }}
            >
              <div className="flex-grow-1 d-flex flex-column" style={{ gap: "16px", height: "100%" }}>
                <div className="d-flex align-items-center justify-content-between" style={{ flexShrink: 0 }}>
                  <div className="d-flex align-items-center" style={{ gap: "10px" }}>
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        backgroundColor: "#e6eaf1",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden"
                      }}
                    >
                      <i className="bi bi-currency-rupee" style={{ fontSize: "24px", color: "#1E1E1E" }}></i>
                    </div>
                    <span
                      style={{
                        fontFamily: "Barlow",
                        fontSize: "19px",
                        fontWeight: "600",
                        color: "black",
                        letterSpacing: "0.19px"
                      }}
                    >
                      Commercials
                    </span>
                  </div>
                  <div className="d-flex align-items-center" style={{ gap: "16px" }}>
                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontFamily: "Inter",
                          fontSize: "14px",
                          fontWeight: "400",
                          color: "black"
                        }}
                      >
                        Total Cost:
                      </div>
                    </div>
                    <div
                      style={{
                        fontFamily: "Inter",
                        fontSize: "16px",
                        fontWeight: "600",
                        color: "black",
                      }}
                    >
                      ₹{lead?.commercials?.reduce((sum: number, commercial: any) => {
                        return sum + parseFloat(commercial.cost || 0);
                      }, 0) || 0}
                    </div>
                  </div>
                </div>

                <div
                  ref={commercialScrollRef}
                  className="d-flex flex-column commercial-scroll"
                  style={{
                    gap: "16px",
                    width: "100%",
                    flex: 1,
                    overflowY: "auto",
                    minHeight: 0
                  }}
                  onScroll={handleCommercialScroll}
                >
                  {lead?.commercials && lead.commercials.length > 0 ? (
                    lead.commercials.map((commercial: any, index: number) => (
                      <div key={commercial.id || index} className="d-flex flex-column" style={{ gap: "8px", width: "100%" }}>
                        <div
                          style={{
                            fontFamily: "Inter",
                            fontSize: "14px",
                            fontWeight: "500",
                            color: "#798db3",
                            textTransform: "uppercase",
                          }}
                        >
                          AREA {index + 1}
                        </div>

                        <div className="d-flex flex-column" style={{ gap: "8px", width: "100%" }}>
                          <div
                            className="d-flex align-items-center justify-content-between"
                            style={{
                              fontFamily: "Inter",
                              fontSize: "14px",
                              color: "black",
                            }}
                          >
                            <div style={{ fontWeight: "500" }}>Label</div>
                            <div style={{ fontWeight: "400" }}>{commercial.label || "-"}</div>
                          </div>

                          <div
                            className="d-flex align-items-center justify-content-between"
                            style={{
                              fontFamily: "Inter",
                              fontSize: "14px",
                              color: "black",
                            }}
                          >
                            <div style={{ fontWeight: "500" }}>Area (sqft)</div>
                            <div style={{ fontWeight: "400" }}>{commercial.area || "-"}</div>
                          </div>

                          {commercial.costType === "RATE" && (
                            <>
                              <div
                                className="d-flex align-items-center justify-content-between"
                                style={{
                                  fontFamily: "Inter",
                                  fontSize: "14px",
                                  color: "black",
                                }}
                              >
                                <div style={{ fontWeight: "500" }}>Rate</div>
                                <div style={{ fontWeight: "400" }}>{commercial.rate || "-"}</div>
                              </div>

                              <div
                                className="d-flex align-items-center justify-content-between"
                                style={{
                                  fontFamily: "Inter",
                                  fontSize: "14px",
                                  color: "black",
                                }}
                              >
                                <div style={{ fontWeight: "500" }}>Cost</div>
                                <div style={{ fontWeight: "400" }}>₹{commercial.cost || "-"}</div>
                              </div>
                            </>
                          )}

                          {commercial.costType === "LUMPSUM" && (
                            <>
                              <div
                                className="d-flex align-items-center justify-content-between"
                                style={{
                                  fontFamily: "Inter",
                                  fontSize: "14px",
                                  color: "black",
                                }}
                              >
                                <div style={{ fontWeight: "500" }}>Lumpsum</div>
                                <div style={{ fontWeight: "400" }}>{commercial.cost || "-"}</div>
                              </div>

                              <div
                                className="d-flex align-items-center justify-content-between"
                                style={{
                                  fontFamily: "Inter",
                                  fontSize: "14px",
                                  color: "black",
                                }}
                              >
                                <div style={{ fontWeight: "500" }}>Cost</div>
                                <div style={{ fontWeight: "400" }}>₹{commercial.cost || "-"}</div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div
                      style={{
                        fontFamily: "Inter",
                        fontSize: "14px",
                        fontWeight: "400",
                        color: "#6c757d",
                      }}
                    >
                      No commercial details available
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Bar Indicator */}
              <div
                style={{
                  width: "4px",
                  height: "100%",
                  backgroundColor: "#edeff2",
                  borderRadius: "323px",
                  position: "relative",
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    width: "4px",
                    height: "147px",
                    backgroundColor: "#9d4141",
                    top: `${50 + (commercialScrollRef.current ? (commercialScrollTop / (commercialScrollRef.current.scrollHeight - commercialScrollRef.current.clientHeight)) * 100 : 0)}px`,
                    left: "0.24px",
                    transition: "top 0.1s ease-out"
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Second Row - Additional Details & Portal */}
        {leadTemplateId==leadAndProjectTemplateTypeId.mep &&  <div className="col-12 col-md-6">
          <InfoCard title="Project Address" icon="bi bi-gear">
            <InfoRow label="Project Address" value={lead?.additionalDetails?.projectAddress || "-"} />
            <InfoRow label="Locality" value={lead?.additionalDetails?.locality || "-"} />
            <InfoRow label="City" value={lead?.additionalDetails?.city || "-"} />
            <InfoRow label="State" value={lead?.additionalDetails?.state || "-"} />
            <InfoRow label="Zip Code" value={lead?.additionalDetails?.zipCode || "-"} />
            <InfoRow label="Country" value={lead?.additionalDetails?.country || "-"} />
            {lead?.additionalDetails?.latitude && lead?.additionalDetails?.longitude && (
              <div
                className="d-flex align-items-center justify-content-between"
                style={{
                  fontFamily: "Inter",
                  fontSize: "14px",
                  color: "black",
                }}
              >
                <div style={{ fontWeight: "500" }}>Location</div>
                <div className="d-flex align-items-center" style={{ gap: "4px" }}>
                  <i className="bi bi-geo-alt" style={{ width: "20px", height: "20px", color: "#9d4141" }}></i>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${lead.additionalDetails.latitude},${lead.additionalDetails.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: "#9d4141",
                      textDecoration: "none",
                      fontWeight: "400"
                    }}
                  >
                    View on map
                  </a>
                </div>
              </div>
            )}
          </InfoCard>
        </div>}
       

        <div className="col-12 col-md-6">
          <InfoCard title="Portal" icon="bi bi-camera">
            {/* <InfoRow label="Visibility" value={projectData.visibility} /> */}
            <InfoRow label="Created by" value={projectData.createdBy} />
            <InfoRow label="Created Date" value={projectData.createdDate} />
            <InfoRow label="Last Edited by" value={projectData.lastEditedBy} />
            <InfoRow label="Last Edited" value={projectData.lastEdited} />
          </InfoCard>
        </div>

        {/* Third Row - Lead Info & Notes */}
        <div className="col-12 col-md-6">
          <InfoCard title="Lead Info" icon="bi bi-person-badge">
            {/* <InfoRow label="Lead Number" value={projectData.leadNumber} /> */}
            <InfoRow label="Inquiry Date" value={projectData.inquiryDate} />
            <InfoRow label="Lead Assigned to" value={projectData.leadAssignedTo?.trim()?.length==0 ? '-' : projectData.leadAssignedTo} />
            <InfoRow label="Lead Source" value={projectData.leadSource} />
            <InfoRow label="Referred by" value={projectData.referredBy} />
            {/* <InfoRow label="Referred to" value={projectData.referredTo} /> */}
          </InfoCard>
        </div>

        {/* <div className="col-6">
              <InfoCard title="Notes" icon="bi bi-journal-text">
                <h1>one</h1>
              </InfoCard>
            </div> */}
      </div>
      </div>
    </>
  );
};

export default LeadOverview;

// Helper function to format date
// const formatDate = (dateString?: string) => {
//     if (!dateString) return 'N/A';
//     try {
//         return new Date(dateString).toLocaleDateString();
//     } catch (e) {
//         return 'Invalid date';
//     }
// };
// export default LeadOverview;