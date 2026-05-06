import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Form, Row, Col, Button, Modal, Dropdown } from "react-bootstrap";
import { Formik, Form as FormikForm, Field, FieldArray } from "formik";
import * as Yup from "yup";
import TextInput from "@app/modules/common/inputs/TextInput";
import DropDownInput from "@app/modules/common/inputs/DropdownInput";
import MultiSelectWithInlineCreate from "@app/modules/common/components/MultiSelectWithInlineCreate";
import { createNewService, createNewCategory, createNewSubcategory } from "@app/modules/common/components/InlineCreateHelpers";
import { successConfirmation, errorConfirmation, customConfirmation } from "@utils/modal";
import eventBus from "@utils/EventBus";
import DateInput from "@app/modules/common/inputs/DateInput";
import CompaniesBranchForm from "@pages/employee/companies/companies/components/CompaniesBranchForm";
import NewCompanyForm from "@pages/employee/companies/companies/components/NewCompanyForm";
import ClientContactsForm from "@pages/employee/companies/contacts/components/ClientContactsForm";
import ProjectConfigForm from "../../configure/components/ProjectConfigForm";
import {
  getAllProjectCategories,
  getAllProjectServices,
  getAllProjectSubcategories,
  createProject,
  updateProjectById,
  getProjectById,
  getAllProjectStatuses,
  getAllTeams,
} from "@services/projects";
import {
  getAllClientCompanies,
  getAllClientContacts,
  getAllCompanyTypes,
} from "@services/companies";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@redux/store";
import { loadAllEmployeesIfNeeded } from "@redux/slices/allEmployees";
import {
  fetchAllCountries,
  fetchAllStates,
  fetchAllCities,
} from "@services/options";
import { Close, Add, Delete } from "@mui/icons-material";
import { Dialog, Box, IconButton, Typography, Grid } from "@mui/material";
import { EVENT_KEYS } from "@constants/eventKeys";
import { useEventBus } from "@hooks/useEventBus";
import Loader from "@app/modules/common/utils/Loader";
import RadioInput from "@app/modules/common/inputs/RadioInput";
import { fetchSubCompanies } from "@services/company";
import { uploadUserAsset } from "@services/uploader";
import SubCompanyForm from "@pages/employee/companies/companies/components/SubCompanryForm";
import CompanyConfigForm from "@pages/employee/companies/companyConfig/components/CompanyConfigForm";
import { fetchAllPrefixSettings } from "@services/options";
import { getAllProjectCountForPrefix } from "@services/projects";
import dayjs from "dayjs";
import { convertFiscalYearToYearFormat } from '@app/modules/common/components/PrefixSettingsForm';
import PrefixInlineEdit from '@app/modules/common/components/PrefixInlineEdit';
interface ProjectType {
  id: string;
  title: string;
  subtitle: string;
  icon?: string;
}

interface BlankBasicProjectFormProps {
  showBlankProjectForm: boolean;
  onHide: () => void;
  projectType?: ProjectType | null;
  editingProjectId?: string | null;
  selectedProjectType?: string;
  intitalDataForLeadToProjectConversion?: any;
  setRefreshData?: any;
}

interface CompanyEntry {
  service: string;
  company: string;
  branch: string;
  contactPerson: string;
}

interface TeamMember {
  name: string;
  role: string;
}

// Build employee options for dropdowns.
// Active employees are always shown. Inactive employees are shown ONLY when they
// match `currentValueId` (i.e. they are already saved on the record) so existing
// data is never lost. Inactive options are labelled "(Inactive)", visually dimmed,
// and marked `isDisabled` so they cannot be chosen for new assignments.
const buildEmployeeOptions = (
  employees: any[],
  currentValueId?: string,
): { value: string; label: string; avatar?: string; isDisabled?: boolean; isInactive?: boolean }[] => {
  const sorted = [...employees].sort((a, b) => a.employeeName.localeCompare(b.employeeName));
  const options: { value: string; label: string; avatar?: string; isDisabled?: boolean; isInactive?: boolean }[] = [];
  for (const emp of sorted) {
    const isInactive = emp.isActive === false;
    if (isInactive && emp.employeeId !== currentValueId) continue;
    options.push({
      value: emp.employeeId,
      label: isInactive ? `${emp.employeeName} (Inactive)` : emp.employeeName,
      avatar: emp.avatar,
      isDisabled: isInactive,
      isInactive,
    });
  }
  return options;
};

const BlankBasicProjectForm: React.FC<BlankBasicProjectFormProps> = ({
  showBlankProjectForm,
  onHide,
  projectType,
  editingProjectId,
  selectedProjectType,
  intitalDataForLeadToProjectConversion,
  setRefreshData,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const createdById = useSelector(
    (state: RootState) => state.employee?.currentEmployee?.id
  );
  const allEmployees = useSelector((state: RootState) => state.allEmployees);

  // Fetch employees if not already loaded
  useEffect(() => {
    dispatch(loadAllEmployeesIfNeeded());
  }, [dispatch]);

  
  
  // Loading states
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [isProjectLoading, setIsProjectLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // State for dropdown options
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [subCompanies, setSubCompanies] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [countries, setCountries] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [projectData, setProjectData] = useState<any>(null);
  const [companyTypes, setCompanyTypes] = useState<any[]>([]);
  const [prefixSettings, setPrefixSettings] = useState<any>(null);
  const [projectCount, setProjectCount] = useState<any>(null);
  const [editablePrefix, setEditablePrefix] = useState<string>('');

  // Update editable prefix when prefix settings or count changes.
  // Only auto-generate during creation — never overwrite an existing project's saved number.
  useEffect(() => {
    if (projectData?.prefix) {
      // Edit mode: always display the saved project number, never regenerate it.
      setEditablePrefix(projectData.prefix);
      return;
    }
    if (prefixSettings?.prefix && projectCount !== undefined) {
      const generatedPrefix = `${prefixSettings.prefix}/${convertFiscalYearToYearFormat(prefixSettings.year)}/${projectCount + 1}`;
      setEditablePrefix(generatedPrefix);
    }
  }, [prefixSettings, projectCount, projectData?.prefix]);

  // Modal states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSubcategoryModal, setShowSubcategoryModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showSubCompanyModal, setShowSubCompanyModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [editingContactId, setEditingContactId] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showCompanyTypeModal, setShowCompanyTypeModal] = useState(false);
  const userId = useSelector((state: RootState) => state.auth.currentUser.id);
  // Memoized validation schema
  const validationSchema = useMemo(
    () =>
      Yup.object({
        title: Yup.string().required("Project title is required"),
        // Legacy single-select fields (for backward compatibility)
        serviceId: Yup.string().nullable(),
        projectCategoryId: Yup.string().nullable(),
        projectSubCategoryId: Yup.string().nullable(),
        // Multi-select arrays (optional)
        serviceIds: Yup.array().of(Yup.string()).optional(),
        categoryIds: Yup.array().of(Yup.string()).optional(),
        subcategoryIds: Yup.array().of(Yup.string()).optional(),
        startDate: Yup.date()
          .required('Start date is required')
          .test('start-date-validation', function(value) {
            const { endDate } = this.parent;
            if (!value || !endDate) return true; // Skip validation if either date is missing
            if (new Date(value) > new Date(endDate)) {
              return this.createError({ message: 'Start date cannot be after end date' });
            }
            return true;
          }),
        statusId: Yup.string(),
        endDate: Yup.date()
          .nullable()
          .test('end-date-required-when-completed', 'End date is required when status is Completed', function(value) {
            const { statusId } = this.parent;
            // Find the status to check if it's "Completed"
            const selectedStatus = statuses.find((s: any) => s.id === statusId);
            const isCompleted = selectedStatus?.name?.toLowerCase() === 'completed';
            
            // If status is Completed, end date is required
            if (isCompleted && !value) {
              return false;
            }
            return true;
          })
          .test('end-date-validation', function(value) {
            const { startDate } = this.parent;
            if (!value || !startDate) return true; // Skip validation if either date is missing
            if (new Date(value) < new Date(startDate)) {
              return this.createError({ message: 'End date cannot be before start date' });
            }
            return true;
          }),
        companies: Yup.array().of(
          Yup.object({
            service: Yup.string().nullable(),
            company: Yup.string().nullable(),
            companyTypeId: Yup.string().nullable(),
            subCompanyId: Yup.string().nullable(),
            contactPerson: Yup.string().nullable(),
          })
        ),
        projectCompanyMappings: Yup.array().of(
          Yup.object({
            companyTypeId: Yup.string().nullable(),
            company: Yup.string().nullable(),
            refferingSubCompanyId: Yup.string().nullable(),
            contactPerson: Yup.string().nullable(),
          })
        ),
        addresses: (projectType?.id === "mep" || selectedProjectType === "mep")
          ? Yup.array().of(
              Yup.object({
                fullAddress: Yup.string(),
                country: Yup.string(),
                state: Yup.string(),
                city: Yup.string(),
                locality: Yup.string(),
                zipcode: Yup.string(),
                latitude: Yup.string(),
                longitude: Yup.string(),
                gmbLink: Yup.string(),
                googleMapLink: Yup.string(),
              })
            )
          : Yup.array(),
          // REPLACE commercials validation block with:
          commercials: Yup.array().of(
            Yup.object({
            area: Yup.string(),
            label: Yup.string(),
            costType: Yup.string(),
            rate: Yup.number()
              .transform((value) => (isNaN(value) || value === "" ? undefined : value))
              .min(0, "Rate must be positive")
              .nullable(),
            lumpsum: Yup.number()
              .transform((value) => (isNaN(value) || value === "" ? undefined : value))
              .min(0, "Lumpsum must be positive")
              .nullable(),
            rateCost: Yup.number().transform((v) => (isNaN(v) || v === "" ? undefined : v)).nullable(),
            lumpsumCost: Yup.number().transform((v) => (isNaN(v) || v === "" ? undefined : v)).nullable(),
            })
        ),


        teamDetails: Yup.array().of(
          Yup.object({
            teamId: Yup.string(),
          })
        ),
        projectManagerId: Yup.string(),
        projectAccess: Yup.string().oneOf(["PUBLIC", "PRIVATE"]),
        description: Yup.string().max(
          200,
          "Description must be less than 200 characters"
        ),
        fileLocation: Yup.string().max(250, "File location cannot exceed 250 characters"),
        createdById: Yup.string(),

        // MEP Project Type Fields
        // projectArea: (projectType?.id === "mep" || selectedProjectType === "mep") 
        //   ? Yup.string().required("Project area is required for MEP projects")
        //   : Yup.string(),
        // country: (projectType?.id === "mep" || selectedProjectType === "mep")
        //   ? Yup.string().required("Country is required for MEP projects") 
        //   : Yup.string(),
        // state: (projectType?.id === "mep" || selectedProjectType === "mep") ? Yup.string().required("State is required for MEP projects") : Yup.string(),
        // city: (projectType?.id === "mep" || selectedProjectType === "mep") ? Yup.string().required("City is required for MEP projects") : Yup.string(),
        plotArea: Yup.string(),
        plotAreaUnit: Yup.string(),
        builtUpArea: Yup.string(),
        builtUpAreaUnit: Yup.string(),
        buildingDetail: Yup.string(),
        otherPoint1Heading: Yup.string(),
        otherPoint1Description: Yup.string(),
        otherPoint2Heading: Yup.string(),
        otherPoint2Description: Yup.string(),
        otherPoint3Heading: Yup.string(),
        otherPoint3Description: Yup.string(),
        zipcode: Yup.string(),
        projectAddress: Yup.string(),
        poNumber: Yup.string(),
        poDate: Yup.mixed().nullable(),
        teamId: Yup.string(),
        isProjectOpen: Yup.string().oneOf(['true', 'false']).default('true'),
      }),
    [projectType, selectedProjectType, statuses]
  );

  const fetchPrefixAllSettings = useCallback(async () => {
    if (prefixSettings) return prefixSettings;
    try {
      const prefix = await fetchAllPrefixSettings();
  
      const projectPrefix = prefix?.data?.prefixSettings;
  
      const projectPrefixObj = projectPrefix?.find(
        (p: any) => p.identifier === "PROJECT"
      );
  
  
      if (projectPrefixObj) {
        setPrefixSettings(projectPrefixObj);
      }
    } catch (error) {
      console.error("error fetching prefix", error);
    }
  }, [prefixSettings]);

  useEffect(() => {
    const fetchProjectCount = async () => {
    try {
      const response = await getAllProjectCountForPrefix();
      const data = response?.data?.count || 0;
      setProjectCount(data);
    } catch (error) {
      console.error("Error fetching project count:", error);
    }
    };
    fetchProjectCount();
  }, []);
  

  // Fetch functions
  const fetchProjectCategories = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && categories.length > 0) return categories;
    try {
      const response = await getAllProjectCategories();
      const data = response?.projectCategories || [];
      setCategories(data);
      return data;
    } catch (error) {
      console.error("Error fetching categories:", error);
      return [];
    }
  }, [categories.length]);

  const fetchProjectSubcategories = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && subcategories.length > 0) return subcategories;
    try {
      const response = await getAllProjectSubcategories();
      const data = response?.projectSubCategories || [];
      setSubcategories(data);
      return data;
    } catch (error) {
      console.error("Error fetching subcategories:", error);
      return [];
    }
  }, [subcategories.length]);

  const fetchCompanyTypeData = useCallback(async ()=>{
    if(companyTypes.length > 0) return companyTypes;
    try {
      const response = await getAllCompanyTypes();
      const data = response?.companyTypes || [];
      setCompanyTypes(data);
      return data;
    } catch (error) {
      console.error("Error fetching company types:", error);
      return [];
    }
  }, [companyTypes.length]);

  const fetchProjectServices = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && services.length > 0) return services;
    try {
      const response = await getAllProjectServices();
      const data = response?.services || [];
      setServices(data);
      return data;
    } catch (error) {
      console.error("Error fetching services:", error);
      return [];
    }
  }, [services.length]);

  const fetchCompanies = useCallback(async () => {
    if (companies.length > 0) return companies;
    try {
      const response = await getAllClientCompanies();
      const data = response?.data?.companies || [];
      setCompanies(data);
      return data;
    } catch (error) {
      console.error("Error fetching companies:", error);
      return [];
    }
  }, [companies.length]);

  const fetchAllSubCompaniess = useCallback(async () => {
    if (subCompanies.length > 0) return subCompanies;
    try {
      const response = await fetchSubCompanies();
      const data = response?.data?.subCompanies || [];
      setSubCompanies(data);
      return data;
    } catch (error) {
      console.error("Error fetching sub companies:", error);
      return [];
    }
  }, [subCompanies.length]);

  const fetchContacts = useCallback(async () => {
    if (contacts.length > 0) return contacts;
    try {
      const response = await getAllClientContacts();
      const data = response?.data?.contacts || [];
      setContacts(data);
      return data;
    } catch (error) {
      console.error("Error fetching contacts:", error);
      return [];
    }
  }, [contacts.length]);

  // no default status for project
//   const fetchProjectStatuses = useCallback(async () => {
//   if (statuses.length > 0) return statuses;
//   try {
//     const response = await getAllProjectStatuses();
//     const data = response?.projectStatuses || [];    
        
//     setStatuses(data);
//     return data;
//   } catch (error) {
//     console.error("Error fetching project statuses:", error);
//     return [];
//   }
// }, [statuses.length]);

  const fetchProjectStatuses = useCallback(async (setFieldValue?: any) => {
  if (statuses.length > 0) return statuses;

  try {
    const response = await getAllProjectStatuses();
    const data = response?.projectStatuses || [];

    setStatuses(data);

    // ✅ NEW: Auto-select default status (same as LeadForm behavior)
    const defaultStatus = data.find((s: any) => s.isDefault);

    if (defaultStatus && setFieldValue) {
      setFieldValue("statusId", defaultStatus.id);
    }

    return data;
  } catch (error) {
    console.error("Error fetching project statuses:", error);
    return [];
  }
}, [statuses.length]);

  const fetchTeams = useCallback(async () => {
    if (teams.length > 0) return teams;
    try {
      const response = await getAllTeams(1, 9999); // Get all teams for dropdown
      const data = response?.data?.teams || [];
      setTeams(data);
      return data;
    } catch (error) {
      console.error("Error fetching teams:", error);
      return [];
    }
  }, [teams.length]);

  const fetchCountries = useCallback(async () => {
    if (countries.length > 0) return countries;
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

  // Helper function to transform arrays to react-select options
  const transformToOptions = useCallback((items: any[]) => {
    return items.map((item: any) => ({
      value: item.id,
      label: item.name
    }));
  }, []);

  // Custom onCreate handler for subcategories that handles categoryId requirement
  const createNewSubcategoryWithContext = useCallback(async (name: string) => {
    try {
      // Check if there are any selected categories in the form
      // We'll use the first selected category, or require user to select one
      
      // For now, we'll create subcategory with a default/first available category
      // This is a temporary solution - ideally we'd show a category selector in the modal
      if (categories.length === 0) {
        throw new Error('Please create at least one category first before creating subcategories');
      }
      
      // Use the first available category as default
      const defaultCategoryId = categories[0]?.id;
      if (!defaultCategoryId) {
        throw new Error('No categories available. Please create a category first.');
      }
      
      const response = await createNewSubcategory(name.trim(), defaultCategoryId);
      return response;
    } catch (error) {
      console.error('Error creating subcategory:', error);
      throw error;
    }
  }, [categories]);

  // Force refresh functions for onRefreshOptions (bypasses cache)
  const forceRefreshProjectServices = useCallback(async () => {
    await fetchProjectServices(true);
  }, [fetchProjectServices]);

  const forceRefreshProjectCategories = useCallback(async () => {
    await fetchProjectCategories(true);
  }, [fetchProjectCategories]);

  const forceRefreshProjectSubcategories = useCallback(async () => {
    await fetchProjectSubcategories(true);
  }, [fetchProjectSubcategories]);

  // Load all initial data
  const loadAllData = useCallback(async () => {
    if (dataLoaded) return;

    setIsInitialLoading(true);
    try {
      await Promise.all([
        fetchProjectCategories(),
        fetchProjectSubcategories(),
        fetchProjectServices(),
        fetchCompanies(),
        fetchAllSubCompaniess(),
        fetchContacts(),
        fetchProjectStatuses(),
        fetchTeams(),
        fetchCountries(),
        fetchCompanyTypeData(),
        fetchPrefixAllSettings()
      ]);
      setDataLoaded(true);
    } catch (error) {
      console.error("Error loading initial data:", error);
    } finally {
      setIsInitialLoading(false);
    }
  }, [
    dataLoaded,
    fetchProjectCategories,
    fetchProjectSubcategories,
    fetchProjectServices,
    fetchCompanyTypeData,
    fetchCompanies,
    fetchAllSubCompaniess,
    fetchContacts,
    fetchProjectStatuses,
    fetchTeams,
    fetchCountries,
    fetchPrefixAllSettings
  ]);

  // Load project data when editing
  const loadProjectData = useCallback(async () => {
    if (!editingProjectId) {
      setProjectData(null);
      return;
    }

    setIsProjectLoading(true);
    try {
      const res = await getProjectById(editingProjectId);
      const project = res?.data?.project || {};
      
      setProjectData(project);

      // Load location data for addresses
      if (project.addresses && project.addresses.length > 0) {
        for (const address of project.addresses) {
          if (address.country) {
            const country = countries.find((c: any) => c.name === address.country);
            if (country) {
              const stateData = await fetchAllStates(country.iso2);
              setStates(stateData);

              if (address.state) {
                const state = stateData.find((s: any) => s.name === address.state);
                if (state) {
                  const cityData = await fetchAllCities(country.iso2, state.iso2);
                  setCities(cityData);
                }
              }
              break; // Load for first address only to avoid multiple API calls
            }
          }
        }
      }
      
      // Also load location data for legacy single address fields (if MEP project)
      if (
        project.country &&
        (projectType?.id === "mep" || selectedProjectType === "mep")
      ) {
        const country = countries.find((c: any) => c.name === project.country);
        if (country && project.state) {
          const stateData = await fetchAllStates(country.iso2);
          setStates(stateData);

          const state = stateData.find((s: any) => s.name === project.state);
          if (state && project.city) {
            const cityData = await fetchAllCities(country.iso2, state.iso2);
            setCities(cityData);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching project by ID:", error);
      setProjectData(null);
    } finally {
      setIsProjectLoading(false);
    }
  }, [editingProjectId, projectType?.id, selectedProjectType, countries]);

  // Load data when modal opens
  useEffect(() => {
    if (showBlankProjectForm) {
      loadAllData();
    }
  }, [showBlankProjectForm, loadAllData]);

  // Load project data when editing ID changes
  useEffect(() => {
    if (showBlankProjectForm && dataLoaded) {
      loadProjectData();
    }
  }, [editingProjectId, showBlankProjectForm, dataLoaded, loadProjectData]);

  // Refresh project data in realtime when the linked lead syncs its "Assigned To"
  // (or any other field) into this project while the Edit Project form is open.
  useEventBus(EVENT_KEYS.projectUpdated, () => {
    if (showBlankProjectForm && editingProjectId) {
      loadProjectData();
    }
  });

  // Load states for lead data addresses (separate from initialValues calculation)
  useEffect(() => {
    const loadStatesForLeadData = async () => {
      const firstAddress = intitalDataForLeadToProjectConversion?.addresses?.[0];
      if (firstAddress?.country && countries.length > 0) {
        const country = countries.find(c => c.name === firstAddress.country);
        if (country) {
          try {
            const stateData = await fetchAllStates(country.iso2);
            setStates(stateData);
          } catch (error) {
            console.error("Error loading states for lead address:", error);
          }
        }
      }
    };

    if (intitalDataForLeadToProjectConversion?.addresses && !editingProjectId) {
      loadStatesForLeadData();
    }
  }, [intitalDataForLeadToProjectConversion?.addresses, countries.length, editingProjectId]);

  // Handle country/state changes
  const handleCountryChange = useCallback(
    async (countryId: string) => {
      const country = countries.find((c: any) => c.id === countryId);
      if (country) {
        const stateData = await fetchAllStates(country.iso2);
        setStates(stateData);
        setCities([]);
      }
    },
    [countries]
  );

  const handleStateChange = useCallback(
    async (countryId: string, stateId: string) => {
      const country = countries.find((c) => c.id === countryId);
      const state = states.find((s) => s.id === stateId);
      if (country && state) {
        const cityData = await fetchAllCities(country.iso2, state.iso2);
        setCities(cityData);
      }
    },
    [countries, states]
  );

  const viewLocation = useCallback((latitude: string, longitude: string) => {
    if (latitude && longitude) {
      const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
      window.open(googleMapsUrl, '_blank');
    } else {
      errorConfirmation("Please enter latitude and longitude first");
    }
  }, []);

  // Smart search helper functions for address dropdowns (country, state, city)
  const normalizeString = (str: string): string => {
    if (!str) return '';
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .trim();
  };

  const getMatchPriority = (option: any, inputValue: string): number => {
    if (!inputValue || !inputValue.trim()) return 999;
    
    const normalizedInput = normalizeString(inputValue.trim());
    const normalizedLabel = normalizeString(option.label || '');
    
    // Priority 1: Exact match at the beginning (highest priority)
    if (normalizedLabel.startsWith(normalizedInput)) return 1;
    
    // Priority 2: Any word starts with input (second priority)
    const wordsInLabel = normalizedLabel.split(/\s+/);
    if (wordsInLabel.some(word => word.startsWith(normalizedInput))) return 2;
    
    // Priority 3: Contains input anywhere (lowest priority)
    if (normalizedLabel.includes(normalizedInput)) return 3;
    
    // No match
    return 999;
  };

  // Enhanced filtering that returns sorted options
  const getFilteredAndSortedOptions = (options: any[], inputValue: string) => {
    if (!inputValue || !inputValue.trim()) return options;
    
    // Filter and sort options by priority
    const filtered = options.filter(option => {
      const priority = getMatchPriority(option, inputValue);
      return priority < 999;
    });
    
    return filtered.sort((optionA, optionB) => {
      const priorityA = getMatchPriority(optionA, inputValue);
      const priorityB = getMatchPriority(optionB, inputValue);
      
      // First sort by priority (lower number = higher priority)
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // Same priority - sort alphabetically within the same priority group
      return (optionA.label || '').localeCompare(optionB.label || '');
    });
  };

// Get initial addresses for edit mode
const getInitialAddresses = useCallback(() => {
  const mappings = projectData?.addresses || [];
  if (mappings.length > 0) {
    return mappings.map((a: any) => ({
      fullAddress: a.fullAddress || "",
      zipcode: a.zipcode || "",
      country: a.country 
        ? countries.find((c) => c.name === a.country)?.id || a.country
        : "",
      state: a.state 
        ? states.find((s) => s.name === a.state)?.id || a.state
        : "",
      city: a.city 
        ? cities.find((c) => c.name === a.city)?.id || a.city
        : "",
      locality: a.locality || "",
      gmbLink: a.gmbLink || "",
      googleMapLink: a.googleMapLink || "",
      latitude: a.latitude != null ? String(a.latitude) : "",
      longitude: a.longitude != null ? String(a.longitude) : "",
      isActive: a.isActive == null ? true : !!a.isActive,
      isPrimary: a.isPrimary == null ? false : !!a.isPrimary,
    }));
  }
  return [{
    fullAddress: "",
    zipcode: "",
    country: "",
    state: "",
    city: "",
    locality: "",
    gmbLink: "",
    googleMapLink: "",
    latitude: "",
    longitude: "",
    isActive: true,
    isPrimary: false,
  }];
}, [projectData?.addresses, countries, states, cities]);

// Get initial companies for main client details section
const getInitialCompanies = useCallback(() => {
  const mappings = projectData?.projectCompanyMappings || [];
  // TEAM DETAILS rows never have refferingSubCompanyId; relation companies always do.
  const clientCompanies = mappings.filter((m: any) => !m.refferingSubCompanyId);
  
  if (clientCompanies.length > 0) {
    return clientCompanies.map((m: any) => ({
      company: m.companyId || "",
      companyTypeId: m.companyTypeId || "",
      subCompanyId: m.subCompanyId || "",
      contactPerson: m.contactPersonId || "",
      service: m.serviceId || "",
    }));
  }
  return [{
    company: "",
    companyTypeId: "",
    subCompanyId: "",
    contactPerson: "",
    service: "",
  }];
}, [projectData?.projectCompanyMappings]);

// Get initial relation companies for relation companies section
const getInitialRelationCompanies = useCallback(() => {
  const leadRelationCompanies: any = [];
  
  // For lead conversion, check if leadTeams exist in lead data
  if (intitalDataForLeadToProjectConversion?.companies && Array.isArray(intitalDataForLeadToProjectConversion.companies)) {
    // Filter out main companies (those with serviceId) and map remaining to relation companies
    const relationTeams = intitalDataForLeadToProjectConversion.companies.filter((company: any) => 
      !company.serviceId && !company.service && (company.companyTypeId || company.companyId)
    );
    
    relationTeams.forEach((team: any) => {
      leadRelationCompanies.push({
        companyTypeId: (() => {
          const value = team.companyTypeId || "";
          // Extract ID if it's an object, otherwise return the value
          return (typeof value === 'object' && value?.id) ? value.id : value;
        })(),
        company: (() => {
          const value = team.companyId || team.company || "";
          // Extract ID if it's an object, otherwise return the value
          return (typeof value === 'object' && value?.id) ? value.id : value;
        })(),
        refferingSubCompanyId: (() => {
          const value = team.subCompanyId || team.branchId || "";
          // Extract ID if it's an object, otherwise return the value
          return (typeof value === 'object' && value?.id) ? value.id : value;
        })(),
        contactPerson: (() => {
          const value = team.contactPersonId || team.contactPerson || "";
          // Extract ID if it's an object, otherwise return the value
          return (typeof value === 'object' && value?.id) ? value.id : value;
        })(),
        // Fixed: Only store IDs, not full objects to avoid Prisma errors
        // subCompany: team.subCompany || null,
        // companyType: team.companyType || null,
        // contact: team.contact || null,
      });
    });
  }
  
  // Also check for referrals in lead data
  if (intitalDataForLeadToProjectConversion?.referrals && Array.isArray(intitalDataForLeadToProjectConversion.referrals)) {
    intitalDataForLeadToProjectConversion.referrals.forEach((referral: any) => {
      if (referral.referringCompanyId || referral.referringCompany) {
        leadRelationCompanies.push({
          companyTypeId: (() => {
            const value = referral.referralTypeId || referral.referralType || "";
            // Extract ID if it's an object, otherwise return the value
            return (typeof value === 'object' && value?.id) ? value.id : value;
          })(),
          company: (() => {
            const value = referral.referringCompanyId || referral.referringCompany || "";
            // Extract ID if it's an object, otherwise return the value
            return (typeof value === 'object' && value?.id) ? value.id : value;
          })(),
          refferingSubCompanyId: (() => {
            const value = referral.referringSubCompanyId || "";
            // Extract ID if it's an object, otherwise return the value
            return (typeof value === 'object' && value?.id) ? value.id : value;
          })(),
          contactPerson: (() => {
            const value = referral.referredByContactId || referral.referringContact || "";
            // Extract ID if it's an object, otherwise return the value
            return (typeof value === 'object' && value?.id) ? value.id : value;
          })(),
        });
      }
    });
  }
  if (leadRelationCompanies.length > 0) {
    return leadRelationCompanies;
  }

  // For regular project editing
  const mappings = projectData?.projectCompanyMappings || [];
  // Filter for relation companies (those with companyTypeId and refferingSubCompanyId)
  const projectRelationCompanies = mappings.filter((m: any) => 
    m.companyTypeId && m.refferingSubCompanyId
  );
  
  if (projectRelationCompanies.length > 0) {
    return projectRelationCompanies.map((m: any) => ({
      companyTypeId: m.companyTypeId || "",
      company: m.companyId || "",
      refferingSubCompanyId: m.refferingSubCompanyId || "",
      contactPerson: m.contactPersonId || "",
    }));
  }
  return [{
    companyTypeId: "",
    company: "",
    refferingSubCompanyId: "",
    contactPerson: "",
  }];
}, [projectData?.projectCompanyMappings, intitalDataForLeadToProjectConversion?.companies]);


// Get initial commercials for edit mode
const getInitialCommercials = useCallback(() => {
  const mappings = projectData?.projectCommercialMappings || [];
  if (mappings.length > 0) {
    return mappings.map((m: any) => ({
      area: m.area || "",
      label:m.label || '',
      costType: m.costType ? String(m.costType).toUpperCase() : "RATE", // Ensure uppercase
      rate: m.rate != null ? String(m.rate) : "",
      rateCost: m.rateCost != null ? String(m.rateCost) : "",
      lumpsum: m.lumpsum != null ? String(m.lumpsum) : "",
      lumpsumCost: m.lumpsumCost != null ? String(m.lumpsumCost) : "",
    }));
  }
  return [{
    area: "",
    label: "",
    costType: "RATE",
    rate: "",
    rateCost: "",
    lumpsum: "",
    lumpsumCost: "",
  }];
}, [projectData?.projectCommercialMappings]);



// Get initial team details for edit mode
const getInitialTeamDetails = useCallback(() => {
  const mappings = projectData?.projectTeams || [];
  if (mappings.length > 0) {
    return mappings.map((m: any) => ({
      teamId: m.teamId || (m.team ? m.team.id : "") || "",
    }));
  }
  return [{ teamId: "" }];
}, [projectData?.projectTeams]);



  
  // Helper function to get lead-converted commercials
  const getLeadConvertedCommercials = useCallback(() => {
    if (intitalDataForLeadToProjectConversion?.commercials && Array.isArray(intitalDataForLeadToProjectConversion.commercials)) {
      return intitalDataForLeadToProjectConversion.commercials.map((commercial: any) => ({
        area: commercial.area || "",
        label: commercial.label || "",
        costType: commercial.costType || "RATE",
        rate: commercial.rate || "",
        rateCost: commercial.rate && commercial.area ? (parseFloat(commercial.rate) * parseFloat(commercial.area)).toString() : "",
        lumpsum: commercial.cost || "",
        lumpsumCost: commercial.cost || "",
      }));
    }
    return getInitialCommercials();
  }, [intitalDataForLeadToProjectConversion?.commercials, getInitialCommercials]);

  // Helper function to get lead-converted companies
  const getLeadConvertedCompanies = useCallback(() => {
    if (intitalDataForLeadToProjectConversion?.companies && Array.isArray(intitalDataForLeadToProjectConversion.companies)) {
      return intitalDataForLeadToProjectConversion.companies.map((company: any) => ({
        service: (() => {
          const value = company.serviceId || company.service || "";
          // Extract ID if it's an object, otherwise return the value
          return (typeof value === 'object' && value?.id) ? value.id : value;
        })(),
        company: (() => {
          const value = company.companyId || company.company || "";
          // Extract ID if it's an object, otherwise return the value
          return (typeof value === 'object' && value?.id) ? value.id : value;
        })(),
        companyTypeId: (() => {
          const value = company.companyTypeId || "";
          // Extract ID if it's an object, otherwise return the value
          return (typeof value === 'object' && value?.id) ? value.id : value;
        })(),
        subCompanyId: (() => {
          const value = company.subCompanyId || company.branchId || company.branch || "";
          // Extract ID if it's an object, otherwise return the value
          return (typeof value === 'object' && value?.id) ? value.id : value;
        })(),
        contactPerson: (() => {
          const value = company.contactPersonId || company.contactPerson || "";
          // Extract ID if it's an object, otherwise return the value
          return (typeof value === 'object' && value?.id) ? value.id : value;
        })(),
        // Fixed: Only store IDs, not full objects to avoid Prisma errors
        // subCompany: company.subCompany || null,
        // companyType: company.companyType || null,
        // contact: company.contact || null,
      }));
    }
    return getInitialCompanies();
  }, [intitalDataForLeadToProjectConversion?.companies, getInitialCompanies]);

  // Helper function to get lead-converted addresses
  const getLeadConvertedAddresses = useCallback(() => {
    const convertLocationToId = (name: string | undefined, list: any[]) => {
      if (!name) return "";
      const found = list.find((item: any) => item.name === name);
      return found ? found.id : name; // Return name as fallback
    };

    const getGoogleLinks = () => {
      if (intitalDataForLeadToProjectConversion?.additionalDetails) {
        return {
          gmbLink: intitalDataForLeadToProjectConversion.additionalDetails.googleMyBusinessLink || 
                  intitalDataForLeadToProjectConversion.additionalDetails.gmbLink || "",
          googleMapLink: intitalDataForLeadToProjectConversion.additionalDetails.mapLocation || 
                       intitalDataForLeadToProjectConversion.additionalDetails.googleMapLink || ""
        };
      }
      return {
        gmbLink: "",
        googleMapLink: ""
      };
    };

    if (intitalDataForLeadToProjectConversion?.addresses && Array.isArray(intitalDataForLeadToProjectConversion.addresses)) {
      return intitalDataForLeadToProjectConversion.addresses.map((address: any) => ({
        fullAddress: address.fullAddress || address.address || address.projectAddress || "",
        zipcode: address.zipcode || address.zipCode || "",
        country: convertLocationToId(address.country, countries),
        state: address.state, // Store original state name/id for now
        city: address.city || "",
        locality: address.locality || "",
        gmbLink: address.gmbLink || address.googleMyBusinessLink || getGoogleLinks().gmbLink || "",
        googleMapLink: address.googleMapLink || address.mapLocation || getGoogleLinks().googleMapLink || "",
        latitude: address.latitude || "",
        longitude: address.longitude || "",
        isActive: address.isActive !== undefined ? address.isActive : true,
        isPrimary: address.isPrimary !== undefined ? address.isPrimary : false,
      }));
    }
    
    // If no addresses but we have additionalDetails, create an address from it
    const leadData = intitalDataForLeadToProjectConversion;
    const googleLinks = getGoogleLinks();
    if (leadData?.additionalDetails) {
      return [{
        fullAddress: leadData.additionalDetails.address || leadData.projectAddress || "",
        zipcode: leadData.additionalDetails.zipCode || leadData.zipcode || "",
        country: convertLocationToId(leadData.additionalDetails.country || leadData.country, countries),
        state: convertLocationToId(leadData.additionalDetails.state || leadData.state, states),
        city: leadData.additionalDetails.city || leadData.city || "",
        locality: leadData.additionalDetails.locality || leadData.locality || "",
        gmbLink: leadData.additionalDetails.googleMyBusinessLink || "",
        googleMapLink: leadData.additionalDetails.googleMapLink || "",
        latitude: leadData.additionalDetails.latitude || leadData.latitude || "",
        longitude: leadData.additionalDetails.longitude || leadData.longitude || "",
        isActive: true,
        isPrimary: false,
      }];
    }
    
    return getInitialAddresses();
  }, [intitalDataForLeadToProjectConversion?.addresses, intitalDataForLeadToProjectConversion?.additionalDetails, getInitialAddresses]);

  // Memoized initial values
  const initialValues = useMemo(
    () => {
      const leadData = intitalDataForLeadToProjectConversion;
      
      return {
        // Basic project details - use lead data if available
        title: leadData?.title || projectData?.title || "",
        projectTempletId: selectedProjectType
          ? selectedProjectType
          : projectType?.id || "",
        serviceId: projectData?.serviceId || "",
        projectCategoryId: projectData?.projectCategoryId || "",
        projectSubCategoryId: projectData?.projectSubCategoryId || "",
        
        // Multi-select arrays - prioritize lead data
        serviceIds: (() => {
          if (leadData?.serviceIds && Array.isArray(leadData.serviceIds)) {
            return leadData.serviceIds;
          }
          if (projectData?.projectServiceMappings && Array.isArray(projectData.projectServiceMappings)) {
            return projectData.projectServiceMappings.map((psm: any) => psm.service?.id || psm.serviceId).filter(Boolean);
          }
          // Fallback to single service for backward compatibility
          const serviceId = projectData?.serviceId;
          return serviceId ? [serviceId] : [];
        })(),
        
        categoryIds: (() => {
          if (leadData?.categoryIds && Array.isArray(leadData.categoryIds)) {
            return leadData.categoryIds;
          }
          if (projectData?.projectCategoryMappings && Array.isArray(projectData.projectCategoryMappings)) {
            return projectData.projectCategoryMappings.map((pcm: any) => pcm.category?.id || pcm.categoryId).filter(Boolean);
          }
          // Fallback to single category for backward compatibility
          const categoryId = projectData?.projectCategoryId;
          return categoryId ? [categoryId] : [];
        })(),
        
        subcategoryIds: (() => {
          if (leadData?.subcategoryIds && Array.isArray(leadData.subcategoryIds)) {
            return leadData.subcategoryIds;
          }
          // Handle direct leadSubCategories from lead data
          if (leadData?.leadSubCategories && Array.isArray(leadData.leadSubCategories)) {
            return leadData.leadSubCategories
              .filter((subCat: any) => subCat && subCat.subCategoryId)
              .map((subCat: any) => subCat.subCategoryId);
          }
          if (projectData?.projectSubCategoryMappings && Array.isArray(projectData.projectSubCategoryMappings)) {
            return projectData.projectSubCategoryMappings.map((pscm: any) => pscm.subcategory?.id || pscm.subcategoryId).filter(Boolean);
          }
          // Fallback to single subcategory for backward compatibility
          const subcategoryId = projectData?.projectSubCategoryId;
          return subcategoryId ? [subcategoryId] : [];
        })(),
        
        // Dates - set default start date to today if converting from lead
        startDate: leadData?.startDate || projectData?.startDate || (leadData ? dayjs().format('YYYY-MM-DD') : ""),
        endDate: leadData?.endDate || projectData?.endDate || "",
        
        // Project manager (assigned to)
        // FIX: "Lead Assigned" maps to project.assignedToId, NOT project.projectManagerId.
        // projectManagerId is a separate "Project Manager" field. The sync engine writes
        // lead.assignedToId ↔ project.assignedToId, so the form must use assignedToId here.
        projectManagerId: leadData?.assignedToId || projectData?.assignedToId || projectData?.projectManagerId || "",
        
        rate: projectData?.rate || "",
        cost: projectData?.cost || "",
        statusId: leadData?.statusId || projectData?.statusId || "",
        
        // Location fields - prioritize lead data, check additionalDetails too
        country: "",  // Will be handled by addresses array
        state: "",    // Will be handled by addresses array
        city: (() => {
          if (leadData?.city) {
            return cities.find((c) => c.name === leadData.city)?.id || leadData.city;
          }
          if (leadData?.additionalDetails?.city) {
            return cities.find((c) => c.name === leadData.additionalDetails.city)?.id || leadData.additionalDetails.city;
          }
          if (projectData?.city) {
            return cities.find((c) => c.name === projectData.city)?.id || projectData.city;
          }
          return "";
        })(),
        projectArea: leadData?.projectArea || projectData?.projectArea || "",
        locality: leadData?.locality || projectData?.locality || "",
        zipcode: leadData?.zipcode || projectData?.zipcode || "",
        projectAddress: leadData?.projectAddress || leadData?.address || projectData?.projectAddress || "",
        latitude: leadData?.latitude || projectData?.latitude || null,
        longitude: leadData?.longitude || projectData?.longitude || null,
        
        // PO details
        poNumber: leadData?.poNumber || leadData?.additionalDetails?.poNumber || projectData?.poNumber || "",
        poDate: (() => {
          const raw = leadData?.poDate || leadData?.additionalDetails?.poDate || projectData?.poDate;
          if (!raw) return null;
          try { return new Date(raw).toISOString().split('T')[0]; } catch { return null; }
        })(),
        poFile: leadData?.poFile || projectData?.poFile || "",
        
        // Handle By entries
        // FIX: Always read from projectData when editing an existing project first,
        // then fall back to leadData, then default to one empty entry.
        handledByEntries: (() => {
          const mapEntry = (entry: any, i: number) => ({
            id: entry.id || `hb-${Date.now()}-${i}`,
            employeeId: entry.employeeId || '',
            handledDate: entry.handledDate
              ? new Date(entry.handledDate).toISOString().split('T')[0]
              : new Date().toISOString().split('T')[0],
            handledOutDate: entry.handledOutDate
              ? new Date(entry.handledOutDate).toISOString().split('T')[0]
              : '',
          });
          // 1. Project being edited — use its saved handledByEntries
          if (projectData?.handledByEntries && Array.isArray(projectData.handledByEntries) && projectData.handledByEntries.length > 0) {
            return projectData.handledByEntries.map(mapEntry);
          }
          // 2. Lead-to-project conversion — use lead's handledByEntries
          if (leadData?.handledByEntries && Array.isArray(leadData.handledByEntries) && leadData.handledByEntries.length > 0) {
            return leadData.handledByEntries.map(mapEntry);
          }
          // 3. Default: start with one empty row (user can fill it in or delete it)
          return [];
        })(),

        // File location with company type/company
        fileLocationCompanyType: leadData?.fileLocationCompanyType || projectData?.fileLocationCompanyType || "",
        fileLocationCompany: leadData?.fileLocationCompany || projectData?.fileLocationCompany || "",

        // Project Details 1 fields
        plotArea: leadData?.additionalDetails?.plotArea || projectData?.plotArea || "",
        plotAreaUnit: leadData?.additionalDetails?.plotAreaUnit || projectData?.plotAreaUnit || "sqft",
        builtUpArea: leadData?.additionalDetails?.builtUpArea || projectData?.builtUpArea || "",
        builtUpAreaUnit: leadData?.additionalDetails?.builtUpAreaUnit || projectData?.builtUpAreaUnit || "sqft",
        buildingDetail: leadData?.additionalDetails?.buildingDetail || projectData?.buildingDetail || "",
        otherPoint1Heading: leadData?.additionalDetails?.otherPoint1Heading || projectData?.otherPoint1Heading || "",
        otherPoint1Description: leadData?.additionalDetails?.otherPoint1Description || projectData?.otherPoint1Description || "",
        otherPoint2Heading: leadData?.additionalDetails?.otherPoint2Heading || projectData?.otherPoint2Heading || "",
        otherPoint2Description: leadData?.additionalDetails?.otherPoint2Description || projectData?.otherPoint2Description || "",
        otherPoint3Heading: leadData?.additionalDetails?.otherPoint3Heading || projectData?.otherPoint3Heading || "",
        otherPoint3Description: leadData?.additionalDetails?.otherPoint3Description || projectData?.otherPoint3Description || "",
        
        // Arrays with lead data priority
        companies: getLeadConvertedCompanies(),
        projectCompanyMappings: getInitialRelationCompanies(),
        commercials: getLeadConvertedCommercials(),
        teamDetails: getInitialTeamDetails(),
        addresses: getLeadConvertedAddresses(),
        
        // Additional fields
        documents: projectData?.documents || "",
        projectAccess: "PUBLIC",
        description: leadData?.description || projectData?.description || "",
        isProjectOpen: projectData?.isProjectOpen === false ? 'false' : 'true',
        fileLocation: leadData?.fileLocation || leadData?.additionalDetails?.fileLocation || projectData?.fileLocation || "",
        createdById: createdById || "",
        editedById: createdById || "",
        
        // Spread additional details from lead conversion
        // ...(leadData?.additionalDetails || {}),
      };
    },
    [
      projectData,
      selectedProjectType,
      countries,
      states,
      cities,
      getInitialCompanies,
      getInitialRelationCompanies,
      getLeadConvertedCommercials,
      getLeadConvertedCompanies,
      getLeadConvertedAddresses,
      getInitialTeamDetails,
      intitalDataForLeadToProjectConversion,
      createdById
    ]
  );

  
    // Helper function to extract filename from AWS URL
    const getFileNameFromUrl = (url: string) => {
      if (!url) return "";
      try {
        // Extract filename from URL path
        const urlParts = url.split('/');
        const fileName = urlParts[urlParts.length - 1];
        // Remove any query parameters
        return fileName.split('?')[0];
      } catch (error) {
        console.error("Error extracting filename:", error);
        return "Document";
      }
    };

    const uploadFile = async (
      event: React.ChangeEvent<HTMLInputElement>,
      formikProps: any,
      fileMaxUploadSize: number
    ) => {
      const {
        target: { files },
      } = event;
      if (files && files[0].size > fileMaxUploadSize) {
        alert("File size should not exceed 5 MB");
        // Optionally, set Formik error:
        // formikProps.setFieldError('document', 'File size should not exceed 2 MB');
        event.target.value = ""; // Clear the input
        return;
      }
  
      if (files && files.length > 0) {
        const form = new FormData();
        form.append("file", files[0]);
        try {
          const {
            data: { path },
          } = await uploadUserAsset(form, userId, "projects");
          formikProps.setFieldValue("documents", path, true);
        } catch (error) {
          console.error("Failed to upload file. Please try again.");
        }
      }
    };

  // Form submission
const handleSubmit = useCallback(
  async (values: any) => {
    try {

      // Helper function to convert ID to name for location fields
      const toNameIfLookup = (val: any, lookupArray: any[] | undefined) => {
        if (val === null || val === undefined || val === "") return "";
        if (lookupArray && (typeof val === "number" || typeof val === "string")) {
          const found = lookupArray.find((x: any) => x.id === val || String(x.id) === String(val));
          if (found) return found.name ?? String(val);
        }
        return String(val);
      };

      // Helper function to extract ID from object or return the value if it's already an ID
      const extractId = (value: any): string | null => {
        if (!value) return null;
        if (typeof value === 'string') return value;
        if (typeof value === 'object' && value.id) return value.id;
        return String(value);
      };

      // Build companies payload for projectCompanyMappings
      const companiesPayload = (values.companies || [])
        .filter((c: any) => c.company) // Only include companies with actual company selected
        .map((c: any) => ({
          company: c.company || "",
          companyType: (c.companyTypeId && c.companyTypeId !== "") ? c.companyTypeId : null,
          branch: extractId(c.branchId || c.branch || c.subCompanyId),
          subCompany: extractId(c.subCompanyId || c.subCompany),
          refferingSubCompany: extractId(c.refferingSubCompanyId || c.refferingSubCompany),
          contactPerson: extractId(c.contactPersonId || c.contactPerson),
          service: extractId(c.serviceId || c.service),
        }));

      // Build relation companies payload for projectCompanyMappings
      const relationCompaniesPayload = (values.projectCompanyMappings || [])
        .filter((c: any) => c.company) // Only include companies with actual company selected
        .map((c: any) => ({
          company: c.company || "",
          companyType: (c.companyTypeId && c.companyTypeId !== "") ? c.companyTypeId : null,
          branch: extractId(c.branchId || c.branch),
          subCompany: extractId(c.subCompanyId || c.subCompany),
          refferingSubCompany: extractId(c.refferingSubCompanyId || c.refferingSubCompany),
          contactPerson: extractId(c.contactPersonId || c.contactPerson),
          service: extractId(c.serviceId || c.service),
        }));

      // Combine both company arrays
      const allCompanies = [...companiesPayload, ...relationCompaniesPayload];

      // Build teams payload
      const teamsPayload = (values.teamDetails || [])
        .filter((t: any) => t.teamId)
        .map((t: any) => ({
          teamId: t.teamId || t.id || "",
        }));

      // Build commercial mappings payload
      const commercialMappingsPayload = (values.commercials || [])
        .filter((c: any) => c.area) // Only include commercials with area
        .map((c: any) => {
          const costType = String(c.costType || "Rate").toUpperCase();
          return {
            area: c.area || "",
            label: c.label || "",
            costType: costType === "LUMPSUM" ? "LUMPSUM" : "RATE",
            rate: c.rate !== "" && c.rate != null ? Number(c.rate) : null,
            rateCost: c.rateCost !== "" && c.rateCost != null ? Number(c.rateCost) : null,
            lumpsum: c.lumpsum !== "" && c.lumpsum != null ? Number(c.lumpsum) : null,
            lumpsumCost: c.lumpsumCost !== "" && c.lumpsumCost != null ? Number(c.lumpsumCost) : null,
            totalCost: c.totalCost !== "" && c.totalCost != null ? Number(c.totalCost) : null,
          };
        });

      // Build addresses payload
      const addressesPayload = (values.addresses || [])
        .filter((a: any) => a.fullAddress || a.city) // Only include addresses with some data
        .map((a: any) => ({
          fullAddress: a.fullAddress || "",
          zipcode: a.zipcode || "",
          country: toNameIfLookup(a.country, countries),
          state: toNameIfLookup(a.state, states),
          city: toNameIfLookup(a.city, cities),
          locality: a.locality || "",
          gmbLink: a.gmbLink || "",
          googleMapLink: a.googleMapLink || "",
          latitude: a.latitude != null && a.latitude !== "" ? Number(a.latitude) : null,
          longitude: a.longitude != null && a.longitude !== "" ? Number(a.longitude) : null,
          isActive: a.isActive == null ? true : !!a.isActive,
          isPrimary: a.isPrimary == null ? false : !!a.isPrimary,
        }));

      // Build the main payload
      const payload: any = { ...values };

      // Remove form-specific fields that shouldn't go to backend
      [
        "companies",
        "projectCompanyMappings", 
        "commercials",
        "teamDetails",
        "addresses",
        "id",
        "createdAt",
        "updatedAt",
      ].forEach((k) => delete payload[k]);

      // Convert location fields to names if they exist at top level
      if (payload.country) payload.country = toNameIfLookup(payload.country, countries);
      if (payload.state) payload.state = toNameIfLookup(payload.state, states);
      if (payload.city) payload.city = toNameIfLookup(payload.city, cities);

      // Add structured data expected by backend
      if (allCompanies.length > 0) payload.companies = allCompanies;
      if (teamsPayload.length > 0) payload.teams = teamsPayload;
      if (commercialMappingsPayload.length > 0) payload.commercialMappings = commercialMappingsPayload;
      if (addressesPayload.length > 0) payload.addresses = addressesPayload;

      // Handle project template ID
      if (payload.leadTemplateId) {
        payload.projectTempletId = payload.leadTemplateId;
        delete payload.leadTemplateId;
      }

      // Convert boolean project status
      payload.isProjectOpen = payload.isProjectOpen === "true" || payload.isProjectOpen === true;

      // Handle multi-select arrays (always include arrays, even if empty, to ensure proper clearing)
      if (payload.serviceIds && Array.isArray(payload.serviceIds)) {
        // Keep serviceIds array as is
      } else if (payload.serviceId) {
        // Backward compatibility: convert single service to array
        payload.serviceIds = [payload.serviceId];
      } else {
        payload.serviceIds = [];
      }

      if (payload.categoryIds && Array.isArray(payload.categoryIds)) {
        // Keep categoryIds array as is
      } else if (payload.projectCategoryId) {
        // Backward compatibility: convert single category to array
        payload.categoryIds = [payload.projectCategoryId];
      } else {
        payload.categoryIds = [];
      }

      if (payload.subcategoryIds && Array.isArray(payload.subcategoryIds)) {
        // Keep subcategoryIds array as is
      } else if (payload.projectSubCategoryId) {
        // Backward compatibility: convert single subcategory to array
        payload.subcategoryIds = [payload.projectSubCategoryId];
      } else {
        payload.subcategoryIds = [];
      }

      // Build cleanPayload:
      // - Always include multi-select arrays (even []) so clearing propagates
      // - Always include clearable scalar fields as-is (empty string = user cleared it;
      //   the backend scalarFields loop converts '' → null)
      // - Skip only undefined values (field was never in the form)
      const multiSelectArrays = ['serviceIds', 'categoryIds', 'subcategoryIds', 'handledByEntries'];
      // Fields that should be sent even when empty so the backend can clear them
      const clearableFields = [
        'plotArea', 'plotAreaUnit', 'builtUpArea', 'builtUpAreaUnit', 'buildingDetail',
        'otherPoint1Heading', 'otherPoint1Description',
        'otherPoint2Heading', 'otherPoint2Description',
        'otherPoint3Heading', 'otherPoint3Description',
        'poNumber', 'poDate', 'poFile', 'description', 'title',
        'country', 'state', 'city', 'locality', 'zipcode', 'projectAddress',
        'mapLocation', 'latitude', 'longitude',
        'fileLocation', 'fileLocationCompanyType', 'fileLocationCompany',
        'assignedToId', 'projectManagerId', 'inquiryDate', 'startDate', 'endDate',
      ];
      const cleanPayload = Object.keys(payload).reduce((acc: any, key: string) => {
        const v = payload[key];
        // Always include multi-select arrays
        if (multiSelectArrays.includes(key)) { acc[key] = v; return acc; }
        // Always include clearable fields (even if empty string or null)
        if (clearableFields.includes(key)) { acc[key] = v; return acc; }
        // Skip undefined
        if (v === undefined) return acc;
        // Skip null and empty string for non-clearable fields
        if (v === null || v === '') return acc;
        // Skip empty non-multiselect arrays
        if (Array.isArray(v) && v.length === 0) return acc;
        acc[key] = v;
        return acc;
      }, {});

      // FIX: Clean handledByEntries before sending:
      // - Remove entries that have no employeeId selected (user added a row but left it blank)
      // - Strip the client-side temp `id` field (backend generates its own DB id)
      if (Array.isArray(cleanPayload.handledByEntries)) {
        cleanPayload.handledByEntries = cleanPayload.handledByEntries
          .filter((e: any) => e.employeeId && e.employeeId !== '')
          .map(({ id: _id, ...rest }: any) => rest);
      }

      // FIX: "Lead Assigned" field uses projectManagerId in Formik for backward compat,
      // but the sync engine uses assignedToId ↔ lead.assignedToId.
      // Map projectManagerId → assignedToId so the sync always works correctly.
      // Also keep leadAssignedTo in sync (project has both columns).
      if (cleanPayload.projectManagerId !== undefined) {
        cleanPayload.assignedToId   = cleanPayload.projectManagerId || null;
        cleanPayload.leadAssignedTo = cleanPayload.projectManagerId || null;
      }

      // Handle date fields - convert empty strings to null
      if (cleanPayload.startDate === '' || cleanPayload.startDate === undefined) {
        cleanPayload.startDate = null;
      }
      if (cleanPayload.endDate === '' || cleanPayload.endDate === undefined) {
        cleanPayload.endDate = null;
      }
      // if (cleanPayload.poDate === '' || cleanPayload.poDate === undefined) {
      //   cleanPayload.poDate = null;
      // }
      // if (cleanPayload.inquiryDate === '' || cleanPayload.inquiryDate === undefined) {
      //   cleanPayload.inquiryDate = null;
      // }

      // Add prefix to payload for backend to use
      if (editablePrefix && editablePrefix.trim()) {
        cleanPayload.prefix = editablePrefix.trim();
      }

      // Add leadId to payload if this is a lead-to-project conversion (only for new projects)
      if (!editingProjectId && intitalDataForLeadToProjectConversion?.leadId) {
        cleanPayload.leadId = intitalDataForLeadToProjectConversion.leadId;
      }


      // Call create or update
      if (editingProjectId) {
        const result = await customConfirmation();
        if (result) {
          cleanPayload.countAsRevision = true;
        }
        await updateProjectById(editingProjectId, cleanPayload);
        eventBus.emit(EVENT_KEYS.projectUpdated, { id: editingProjectId });
        successConfirmation("Project updated successfully!");
      } else {
        await createProject(cleanPayload);
        eventBus.emit(EVENT_KEYS.projectCreated);
        successConfirmation("Project created successfully!");
      }

      onHide();
    } catch (error: any) {
      console.error("Error saving project:", error);
      errorConfirmation(
        error.response?.data?.message ||
        error.message ||
        "An unexpected error occurred. Please try again."
      );
    } finally {
      if (setRefreshData) {
        setRefreshData((prev: any) => !prev);
      }
    }
  },
  [editingProjectId, countries, states, cities, onHide, setRefreshData]
);



  // Modal handlers
  const handleCategoryModalClose = useCallback(
    () => setShowCategoryModal(false),
    []
  );
  const handleSubcategoryModalClose = useCallback(
    () => setShowSubcategoryModal(false),
    []
  );
  const handleServiceModalClose = useCallback(
    () => setShowServiceModal(false),
    []
  );
  const handleCompanyModalClose = useCallback(
    () => setShowCompanyModal(false),
    []
  );
  const handleSubCompanyModalClose = useCallback(
    () => setShowSubCompanyModal(false),
    []
  );
  const handleContactModalClose = useCallback(
    () => setShowContactModal(false),
    []
  );
  const handleStatusModalClose = useCallback(
    () => setShowStatusModal(false),
    []
  );
  const handleCompanyTypeModalClose = useCallback(
    () => {
      setShowCompanyTypeModal(false);
      fetchCompanyTypeData();
    },
    [fetchCompanyTypeData]
  );

  // Show modal when requested, but show loading state if data isn't ready
  const shouldShowModal = showBlankProjectForm;
  const isLoading = isInitialLoading || isProjectLoading || !dataLoaded;
  const isDataReady = dataLoaded && (!editingProjectId || !isProjectLoading);

  if (!shouldShowModal) return null;
  return (
    <div>
      <Modal 
      show={shouldShowModal}
      onHide={onHide}
      centered
      size="xl"
      aria-labelledby="responsive-modal"
      dialogClassName="responsive-modal"
      >
        <Box sx={{ position: "relative", backgroundColor: "#F3F4F7", p: { xs: 0, md: 3 } }}>
          <IconButton
            onClick={onHide}
            sx={{
              position: "absolute",
              right: 8,
              top: 8,
              color: "text.secondary",
              pr: { xs: 2, md: 0 },
            }}
          >
            <Close />
          </IconButton>
          <div className="d-flex justify-content-between align-items-start" style={{ padding: "16px 0" }}>
            <Typography
              variant="h6"
              component="h2"
              sx={{ fontWeight: 600 }}
              style={{
                fontSize: "20px",
                fontFamily: "Barlow",
                fontWeight: "600",
                margin: 0
              }}
            >
              {editingProjectId
                ? "Edit Project"
                : intitalDataForLeadToProjectConversion
                ? "Convert to Client Project"
                : "Create Project"}
            </Typography>
            
            <div className="d-flex flex-row align-items-center justify-content-between mx-5">
              {/* <PrefixInlineEdit
                value={editablePrefix}
                label="PROJECT NO"
                onChange={setEditablePrefix}
                disabled={false}
              /> */}
              {editingProjectId && projectData?.revisionCount !== undefined && (
                <div className="d-flex flex-column align-items-end mx-5">
                  <span style={{fontSize: "14px", fontFamily:"Inter",color:"#798DB3"}}>{editablePrefix && `Rev No.`}</span>
                  <span style={{fontSize: "14px", fontFamily:"Inter",color:"#000000"}}>{editablePrefix && `${projectData?.revisionCount || 0}`}</span>
                </div>
              )}
            </div>
          </div>

          <Box sx={{ maxHeight: "80vh", overflowY: "auto", p: 2 }}>
            {!isDataReady ? (
              <Loader />
            ) : (
            <Formik
              initialValues={initialValues}
              validationSchema={validationSchema}
              onSubmit={handleSubmit}
              validateOnChange={false}
              validateOnBlur={false}
              enableReinitialize={true}
            >
              {(formikProps) => {
                const {
                  values,
                  setFieldValue,
                  errors,
                  touched,
                  handleSubmit,
                  isSubmitting,
                  validateForm,
                } = formikProps;
                // Log validation errors
                if (Object.keys(errors).length > 0) {
                  console.error("Form validation errors:", errors);
                }

                // added for default status
                useEffect(() => {
  if (statuses.length > 0 && !values.statusId) {
    const defaultStatus = statuses.find((s: any) => s.isDefault);
    if (defaultStatus) {
      setFieldValue("statusId", defaultStatus.id);
    }
  }
}, [statuses, values.statusId, setFieldValue]);

                // Auto-populate address fields for MEP projects from additionalDetails
                useEffect(() => {
                  const ad = intitalDataForLeadToProjectConversion?.additionalDetails;
                  if (!ad || countries.length === 0) return;
                  if (projectType?.id !== "mep" && selectedProjectType !== "mep") return;

                  const normalize = (v: any) => (typeof v === "string" ? v.trim() : v);
                  
                  const run = async () => {
                    // Skip if address already has country set OR if we've already populated it
                    if (values.addresses?.[0]?.country || values.addresses?.[0]?.fullAddress) return;

                    // Find country ID by name
                    const countryName = normalize(ad?.country);
                    if (countryName) {
                      const country = countries.find((c: any) => c.name?.toLowerCase() === countryName.toLowerCase());
                      if (country) {
                        setFieldValue("addresses.0.country", country.id);
                        
                        // Load states for this country
                        const stateData = await fetchAllStates(country.iso2);
                        setStates(stateData);

                        // Find state ID by name
                        const stateName = normalize(ad.state);
                        if (stateName) {
                          const state = stateData.find((s: any) => s.name?.toLowerCase() === stateName.toLowerCase());
                          if (state) {
                            setFieldValue("addresses.0.state", state.id);
                            
                            // Load cities for this state
                            const cityData = await fetchAllCities(country.iso2, state.iso2);
                            setCities(cityData);
                            
                            // Find city ID by name
                            const cityName = normalize(ad.city);
                            if (cityName) {
                              const city = cityData.find((c: any) => c.name?.toLowerCase() === cityName.toLowerCase());
                              if (city) {
                                setFieldValue("addresses.0.city", city.id);
                              } else {
                                // Keep city name if not found in list
                                setFieldValue("addresses.0.city", cityName);
                              }
                            }
                          }
                        }
                      }
                    }

                    // Set other address fields
                    if (ad.zipCode) setFieldValue("addresses.0.zipcode", ad.zipCode);
                    if (ad.latitude) setFieldValue("addresses.0.latitude", ad.latitude);
                    if (ad.longitude) setFieldValue("addresses.0.longitude", ad.longitude);
                    if (ad.locality) setFieldValue("addresses.0.locality", ad.locality);
                    if (ad.address || ad.projectAddress) {
                      setFieldValue("addresses.0.fullAddress", ad.address || ad.projectAddress);
                    }
                  };

                  run();
                }, [intitalDataForLeadToProjectConversion?.additionalDetails, countries.length, projectType?.id, selectedProjectType]);

                // Auto-calculate rateCost for RATE type only
                useEffect(() => {
                  values.commercials?.forEach((commercial: any, index: number) => {
                    if (commercial.costType === 'RATE') {
                      const area = parseFloat(commercial.area || '0');
                      const rate = parseFloat(commercial.rate || '0');
                      const calculatedCost = area * rate;

                      if (calculatedCost !== parseFloat(commercial.rateCost || '0')) {
                        setFieldValue(`commercials.${index}.rateCost`, calculatedCost.toString());
                      }
                    }
                  });
                }, [values.commercials, setFieldValue]);

                // Auto-update Google Map Link when latitude and longitude change
                useEffect(() => {
                  values.addresses?.forEach((address: any, index: number) => {
                    const latitude = address.latitude;
                    const longitude = address.longitude;
                    
                    if (latitude && longitude && latitude !== '' && longitude !== '') {
                      const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
                      
                      // Only update if the current googleMapLink is different
                      // if (address.googleMapLink !== googleMapsUrl) {
                      //   setFieldValue(`addresses.${index}.googleMapLink`, googleMapsUrl);
                      // }
                    }
                  });
                }, [values.addresses, setFieldValue]);

                // Check if dates are invalid (only when both dates are present)
                const isDatesInvalid = () => {
                  const { startDate, endDate } = values;
                  if (!startDate || !endDate) return false; // Only validate when both dates are present
                  return new Date(startDate) > new Date(endDate);
                };

                // Get date validation warning message
                const getDateValidationMessage = () => {
                  if (!isDatesInvalid()) return '';
                  return 'Start date cannot be after end date';
                };

                return (
                  <FormikForm placeholder={""} onSubmit={handleSubmit}>
                    {/* Project Details Section */}
                    <div className="form-section mb-4">
                      <Box sx={{ mb: 4 }}>
                        <fieldset
                          style={{
                            borderTop: "1px solid #9D4141",
                            padding: "clamp(14px, 2vw, 15px)",
                          }}
                          className="mt-7"
                        >
                          <legend
                            style={{
                              fontSize: "17px",
                              fontWeight: 600,
                              fontFamily: "Inter",
                              marginTop: "-25px",
                              marginLeft: "-17px",
                              backgroundColor: "#F3F4F7",
                              width: "auto",
                              lineHeight: "1",
                              letterSpacing: 0,
                              color: "#9D4141",
                              padding: "2px 2px 8px",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px"
                            }}
                          >
                            <div className="ms-5" style={{borderTop: "1px solid #9D4141", width: "30px", height: "0px"}}></div>
                            PROJECT DETAILS
                          </legend>
                          <div className="card-body card responsive-card p-md-10 p-3 ">
                            {/* Project No */}
                            <Row className="mb-3">
                              <Col md={4}>
                                <div className="d-flex flex-column fv-row">
                                  <label className="d-flex align-items-center fs-6 form-label mb-2">
                                    <span>Project No.</span>
                                  </label>
                                  <Box
                                    sx={{
                                      border: "1px solid #D0D5DD",
                                      borderRadius: "5px",
                                      px: 2,
                                      py: 1.6,
                                      height: "45px",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      "&:hover": { borderColor: "black" },
                                    }}
                                  >
                                    <PrefixInlineEdit
                                      value={editablePrefix}
                                      label=""
                                      onChange={setEditablePrefix}
                                      disabled={false}
                                    />
                                    {editingProjectId && projectData?.revisionCount !== undefined && (
                                      <Box className="d-flex flex-column align-items-end">
                                        {/* <Typography sx={{ fontSize: "12px", color: "#798DB3", lineHeight: 1 }}>Rev No.</Typography>
                                        <Typography sx={{ fontSize: "14px", fontWeight: 500, lineHeight: 1.4 }}>{projectData?.revisionCount || 0}</Typography> */}
                                      </Box>
                                    )}
                                  </Box>
                                </div>
                              </Col>
                              <Col md={4}>
                                <DateInput
                                  formikField="startDate"
                                  inputLabel="Start Date"
                                  formikProps={formikProps}
                                  placeHolder="1/3/2025"
                                  isRequired={true}
                                />
                              </Col>
                              <Col md={4}>
                                <DateInput
                                  formikField="endDate"
                                  inputLabel="End Date"
                                  formikProps={formikProps}
                                  placeHolder="1/3/2025"
                                  isRequired={true}
                                />
                              </Col>
                              {/* Date Validation Warning */}
                              {isDatesInvalid() && (
                                <Col md={12} className="mt-3">
                                  <div
                                    className="alert alert-warning d-flex align-items-center"
                                    style={{
                                      backgroundColor: "#fff3cd", borderColor: "#ffeaa7",
                                      color: "#856404", padding: "8px 12px",
                                      borderRadius: "4px", fontSize: "14px", marginBottom: "10px"
                                    }}
                                  >
                                    <i className="fas fa-exclamation-triangle me-2" style={{color: "#856404"}}></i>
                                    {getDateValidationMessage()}
                                  </div>
                                </Col>
                              )}
                            </Row>
                            <Row className="">
                              <Col md={12}>
                                <TextInput
                                  formikField="title"
                                  label="Project Name"
                                  placeholder="GYM React bangUou"
                                  isRequired={true}
                                />
                              </Col>
                              </Row>
                              <Row className="mt-5">
                              <Col md={4}>
                                <MultiSelectWithInlineCreate
                                  formikField="serviceIds"
                                  inputLabel="Services"
                                  options={transformToOptions(services)}
                                  onCreate={createNewService}
                                  onRefreshOptions={forceRefreshProjectServices}
                                  placeholder="Select Services"
                                  isRequired={false}
                                />
                              </Col>
                              <Col md={4}>
                                <MultiSelectWithInlineCreate
                                  formikField="categoryIds"
                                  inputLabel="Project Categories"
                                  options={transformToOptions(categories)}
                                  onCreate={createNewCategory}
                                  onRefreshOptions={forceRefreshProjectCategories}
                                  placeholder="Select Categories"
                                  isRequired={false}
                                />
                              </Col>
                              <Col md={4}>
                                <MultiSelectWithInlineCreate
                                  formikField="subcategoryIds"
                                  inputLabel="Project Sub Categories"
                                  options={transformToOptions(subcategories)}
                                  onCreate={createNewSubcategoryWithContext}
                                  onRefreshOptions={forceRefreshProjectSubcategories}
                                  placeholder="Select Sub Categories"
                                  isRequired={false}
                                />
                              </Col>
                            </Row>
                          </div>
                        </fieldset>
                      </Box>
                    </div>

                    

                    {/* Project Details 1 Section - Plot Area, Built-Up Area, etc. */}
                    <div className="form-section mb-4">
                      <fieldset style={{ borderTop: "1px solid #9D4141", padding: "clamp(14px, 2vw, 15px)" }} className="mt-7">
                        <legend style={{
                          fontSize: "17px", fontWeight: 600, fontFamily: "Inter",
                          marginTop: "-25px", marginLeft: "-17px", backgroundColor: "#F3F4F7",
                          width: "auto", lineHeight: "1", letterSpacing: 0, color: "#9D4141",
                          padding: "2px 2px 8px", display: "flex", alignItems: "center", gap: "8px"
                        }}>
                          <div className="ms-5" style={{borderTop: "1px solid #9D4141", width: "30px", height: "0px"}}></div>
                          PROJECT DETAILS 1
                        </legend>
                        <Grid container spacing={2} className='card-body p-md-10' sx={{ backgroundColor: { xs: 'transparent', md: 'white', borderRadius: '8px' } }}>
                          {/* Row 1: Plot Area + Unit | Built-Up Area + Unit */}
                          <Grid item xs={12} md={6}>
                            <div className="d-flex flex-column fv-row">
                              <div className="d-flex" style={{ gap: '8px', marginBottom: '8px' }}>
                                <label className='d-flex align-items-center fs-6 form-label mb-0' style={{ flex: 1 }}>
                                  <span>Plot Area</span>
                                </label>
                                <label className='d-flex align-items-center fs-6 form-label mb-0' style={{ width: '140px' }}>
                                  <span>Unit</span>
                                </label>
                              </div>
                              <div className="d-flex" style={{ gap: '8px', alignItems: 'flex-end' }}>
                                <div style={{ flex: 1 }}>
                                  <Field name="plotArea">
                                    {({ field }: { field: any }) => (
                                      <input
                                        {...field}
                                        type="text"
                                        className="employee__form_wizard__input form-control"
                                        placeholder="Enter Plot Area"
                                      />
                                    )}
                                  </Field>
                                </div>
                                <div style={{ width: '140px' }}>
                                  <DropDownInput
                                    formikField="plotAreaUnit"
                                    inputLabel=""
                                    isRequired={false}
                                    options={[
                                      { value: 'sqft', label: 'sqft' },
                                      { value: 'sqm', label: 'sqm' },
                                      { value: 'acre', label: 'acre' },
                                    ]}
                                    placeholder="Unit"
                                  />
                                </div>
                              </div>
                            </div>
                          </Grid>

                          <Grid item xs={12} md={6}>
                            <div className="d-flex flex-column fv-row">
                              <div className="d-flex" style={{ gap: '8px', marginBottom: '8px' }}>
                                <label className='d-flex align-items-center fs-6 form-label mb-0' style={{ flex: 1 }}>
                                  <span>Built-Up Area</span>
                                </label>
                                <label className='d-flex align-items-center fs-6 form-label mb-0' style={{ width: '140px' }}>
                                  <span>Unit</span>
                                </label>
                              </div>
                              <div className="d-flex" style={{ gap: '8px', alignItems: 'flex-end' }}>
                                <div style={{ flex: 1 }}>
                                  <Field name="builtUpArea">
                                    {({ field }: { field: any }) => (
                                      <input
                                        {...field}
                                        type="text"
                                        className="employee__form_wizard__input form-control"
                                        placeholder="Enter Built-Up Area"
                                      />
                                    )}
                                  </Field>
                                </div>
                                <div style={{ width: '140px' }}>
                                  <DropDownInput
                                    formikField="builtUpAreaUnit"
                                    inputLabel=""
                                    isRequired={false}
                                    options={[
                                      { value: 'sqft', label: 'sqft' },
                                      { value: 'sqm', label: 'sqm' },
                                      { value: 'acre', label: 'acre' },
                                    ]}
                                    placeholder="Unit"
                                  />
                                </div>
                              </div>
                            </div>
                          </Grid>

                          {/* Row 2: Building Detail (full width) */}
                          <Grid item xs={12}>
                            <TextInput formikField='buildingDetail' label='Building Detail' isRequired={false} />
                          </Grid>

                          {/* Other Points header */}
                          <Grid item xs={12}>
                            <div className="d-flex align-items-center" style={{ gap: '8px', marginBottom: '4px' }}>
                              <div style={{ width: '110px', fontWeight: 500, fontSize: '13px', color: '#555', fontFamily: 'Inter' }}></div>
                              <div style={{ flex: 1, fontWeight: 600, fontSize: '13px', color: '#444', fontFamily: 'Inter' }}>Heading</div>
                              <div style={{ flex: 2, fontWeight: 600, fontSize: '13px', color: '#444', fontFamily: 'Inter' }}>Description</div>
                            </div>
                          </Grid>

                          {/* Other Point 1 */}
                          <Grid item xs={12}>
                            <div className="d-flex align-items-start" style={{ gap: '8px' }}>
                              <div style={{ width: '110px', paddingTop: '10px', fontWeight: 500, fontSize: '14px', color: '#333', fontFamily: 'Inter', flexShrink: 0 }}>
                                Other Point - 1
                              </div>
                              <div style={{ flex: 1 }}>
                                <Field name="otherPoint1Heading">
                                  {({ field }: { field: any }) => (
                                    <input
                                      {...field}
                                      type="text"
                                      className="employee__form_wizard__input form-control"
                                      placeholder="Heading"
                                    />
                                  )}
                                </Field>
                              </div>
                              <div style={{ flex: 2 }}>
                                <Field name="otherPoint1Description">
                                  {({ field }: { field: any }) => (
                                    <input
                                      {...field}
                                      type="text"
                                      className="employee__form_wizard__input form-control"
                                      placeholder="Description"
                                    />
                                  )}
                                </Field>
                              </div>
                            </div>
                          </Grid>

                          {/* Other Point 2 */}
                          <Grid item xs={12}>
                            <div className="d-flex align-items-start" style={{ gap: '8px' }}>
                              <div style={{ width: '110px', paddingTop: '10px', fontWeight: 500, fontSize: '14px', color: '#333', fontFamily: 'Inter', flexShrink: 0 }}>
                                Other Point - 2
                              </div>
                              <div style={{ flex: 1 }}>
                                <Field name="otherPoint2Heading">
                                  {({ field }: { field: any }) => (
                                    <input
                                      {...field}
                                      type="text"
                                      className="employee__form_wizard__input form-control"
                                      placeholder="Heading"
                                    />
                                  )}
                                </Field>
                              </div>
                              <div style={{ flex: 2 }}>
                                <Field name="otherPoint2Description">
                                  {({ field }: { field: any }) => (
                                    <input
                                      {...field}
                                      type="text"
                                      className="employee__form_wizard__input form-control"
                                      placeholder="Description"
                                    />
                                  )}
                                </Field>
                              </div>
                            </div>
                          </Grid>

                          {/* Other Point 3 */}
                          <Grid item xs={12}>
                            <div className="d-flex align-items-start" style={{ gap: '8px' }}>
                              <div style={{ width: '110px', paddingTop: '10px', fontWeight: 500, fontSize: '14px', color: '#333', fontFamily: 'Inter', flexShrink: 0 }}>
                                Other Point - 3
                              </div>
                              <div style={{ flex: 1 }}>
                                <Field name="otherPoint3Heading">
                                  {({ field }: { field: any }) => (
                                    <input
                                      {...field}
                                      type="text"
                                      className="employee__form_wizard__input form-control"
                                      placeholder="Heading"
                                    />
                                  )}
                                </Field>
                              </div>
                              <div style={{ flex: 2 }}>
                                <Field name="otherPoint3Description">
                                  {({ field }: { field: any }) => (
                                    <input
                                      {...field}
                                      type="text"
                                      className="employee__form_wizard__input form-control"
                                      placeholder="Description"
                                    />
                                  )}
                                </Field>
                              </div>
                            </div>
                          </Grid>
                        </Grid>
                      </fieldset>
                    </div>

                    {/* Lead Assigned Section */}
                    <div className="form-section mb-4">
                      <fieldset style={{ borderTop: "1px solid #9D4141", padding: "clamp(14px, 2vw, 15px)" }} className="mt-7">
                        <legend style={{
                          fontSize: "17px", fontWeight: 600, fontFamily: "Inter",
                          marginTop: "-25px", marginLeft: "-17px", backgroundColor: "#F3F4F7",
                          width: "auto", lineHeight: "1", letterSpacing: 0, color: "#9D4141",
                          padding: "2px 2px 8px", display: "flex", alignItems: "center", gap: "8px"
                        }}>
                          <div className="ms-5" style={{borderTop: "1px solid #9D4141", width: "30px", height: "0px"}}></div>
                          LEAD ASSIGNED
                        </legend>
                        <div className="card-body card responsive-card p-md-10 p-3">
                          <Row>
                            <Col md={6}>
                              <DropDownInput
                                formikField="projectManagerId"
                                inputLabel="Assigned To"
                                options={buildEmployeeOptions(
                                  allEmployees?.list || [],
                                  values.projectManagerId || undefined,
                                )}
                                onChange={(option: any) => {
                                  setFieldValue("projectManagerId", option?.value || "");
                                }}
                                value={(() => {
                                  if (!values.projectManagerId) return null;
                                  const emp = (allEmployees?.list || []).find((e: any) => e.employeeId === values.projectManagerId);
                                  if (emp) {
                                    const isInactive = emp.isActive === false;
                                    return {
                                      value: values.projectManagerId,
                                      label: isInactive ? `${emp.employeeName} (Inactive)` : emp.employeeName,
                                      avatar: emp.avatar || "",
                                      isDisabled: isInactive,
                                    };
                                  }
                                  return { value: values.projectManagerId, label: "Employee Not Found", avatar: "" };
                                })()}
                                isRequired={false}
                                showColor={true}
                              />
                            </Col>
                          </Row>
                        </div>
                      </fieldset>
                    </div>

                    {/* File Location In Computer Section */}
                    <div className="form-section mb-4">
                      <fieldset style={{ borderTop: "1px solid #9D4141", padding: "clamp(14px, 2vw, 15px)" }} className="mt-7">
                        <legend style={{
                          fontSize: "17px", fontWeight: 600, fontFamily: "Inter",
                          marginTop: "-25px", marginLeft: "-17px", backgroundColor: "#F3F4F7",
                          width: "auto", lineHeight: "1", letterSpacing: 0, color: "#9D4141",
                          padding: "2px 2px 8px", display: "flex", alignItems: "center", gap: "8px"
                        }}>
                          <div className="ms-5" style={{borderTop: "1px solid #9D4141", width: "30px", height: "0px"}}></div>
                          FILE LOCATION IN COMPUTER
                        </legend>
                        <div className="card-body card responsive-card p-md-10 p-3">
                          <Row>
                            <Col md={6}>
                              <DropDownInput
                                formikField="fileLocationCompanyType"
                                inputLabel="Company Type"
                                isRequired={false}
                                onChange={(val: any) => {
                                  const newType = val?.value || "";
                                  setFieldValue('fileLocationCompanyType', newType);
                                  if (values.fileLocationCompanyType !== newType) {
                                    setFieldValue('fileLocationCompany', "");
                                  }
                                }}
                                options={companyTypes.map((type: any) => ({ value: type.id, label: type.name }))}
                                placeholder="Select company type"
                              />
                            </Col>
                            <Col md={6}>
                              <DropDownInput
                                formikField="fileLocationCompany"
                                inputLabel="Company"
                                isRequired={false}
                                disabled={!values.fileLocationCompanyType}
                                options={companies
                                  ?.filter((c: any) => c.companyTypeId === values.fileLocationCompanyType)
                                  ?.map((c: any) => ({ value: c.id, label: c.companyName })) || []}
                                placeholder={!values.fileLocationCompanyType ? "Select company type first" : "Select company"}
                              />
                            </Col>
                            {/* <Col md={4}>
                              <Form.Group>
                                <Form.Label>File Path</Form.Label>
                                <Form.Control
                                  type="text"
                                  name="fileLocation"
                                  value={values.fileLocation}
                                  onChange={(e) => setFieldValue("fileLocation", e.target.value)}
                                  placeholder="Enter file location or path (max 250 characters)"
                                />
                                <Form.Text className="text-muted">
                                  {values.fileLocation.length}/250 characters
                                </Form.Text>
                              </Form.Group>
                            </Col> */}
                          </Row>
                        </div>
                      </fieldset>
                    </div>

                    {/* Commercial  Section, Area(Sqft), costType(Rate or Lumpsum), cost(Rate or Lumpsum), totalCost */}
                    
                    <div className="form-section mb-4">
                      <fieldset
                      style={{
                        borderTop: "1px solid #9D4141",
                        padding: "clamp(14px, 2vw, 15px)",
                      }}
                      className="mt-7"
                      >
                        <legend 
                        style={{
                          fontSize: "17px",
                            fontWeight: 600,
                            fontFamily: "Inter",
                            marginTop: "-25px",
                            marginLeft: "-17px",
                            backgroundColor: "#F3F4F7",
                            width: "auto",
                            lineHeight: "1",
                            letterSpacing: 0,
                            color: "#9D4141",
                            padding: "2px 2px 8px",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px"
                        }}
                        >
                          <div className="ms-5" style={{borderTop: "1px solid #9D4141", width: "30px", height: "0px"}}></div>
                          COMMERCIALS
                        </legend>

                        <FieldArray name='commercials'>
                          {({push, remove}) => (
                            <div className="card-body card responsive-card p-md-10 p-3">
                              {values.commercials?.map((commercial: any, index: any) => (
                                <div key={index} className={index > 0 ? "mt-4 pt-4" : ""}>
                                  <div className="d-flex justify-content-between align-items-center mb-3">
                                    <div style={{fontFamily:'Inter',fontWeight:'500',fontSize:'14px',color:'#798DB3'}}>
                                      Area {index + 1}
                                    </div>
                                    {values.commercials.length > 1 && (
                                      <div
                                        onClick={() => remove(index)}
                                        style={{
                                          cursor: "pointer",
                                          color: "#9D4141",
                                          fontSize: "20px",
                                          padding: "5px",
                                        }}
                                      >
                                        ×
                                      </div>
                                    )}
                                  </div>
                                  <Row>
                                    <Col md={3} lg={3} xl={3}>
                                      <TextInput
                                        formikField={`commercials.${index}.label`}
                                        label="Label"
                                        placeholder="Enter label"
                                        isRequired={false}
                                      />
                                    </Col>
                                    <Col md={2} lg={2} xl={2}>
                                      <TextInput
                                        formikField={`commercials.${index}.area`}
                                        label="Area (sqft)"
                                        placeholder="Enter area"
                                        isRequired={false}
                                        inputValidation="decimal"
                                      />
                                    </Col>
                                    <Col md={2} lg={2} xl={2}>
                                      <DropDownInput
                                        formikField={`commercials.${index}.costType`}
                                        inputLabel="Cost Type"
                                        options={[
                                          { value: "RATE", label: "Rate" },
                                          { value: "LUMPSUM", label: "Lumpsum" },
                                        ]}
                                        isRequired={false}
                                      />
                                    </Col>
                                    {values.commercials[index]?.costType === 'RATE' ? (
                                      <>
                                        <Col md={2} lg={2} xl={2}>
                                          <TextInput
                                            formikField={`commercials.${index}.rate`}
                                            label="Rate"
                                            placeholder="Rate"
                                            isRequired={false}
                                            inputValidation="decimal"
                                            type="number"
                                          />
                                        </Col>
                                        <Col md={3} lg={3} xl={3}>
                                          <TextInput
                                            formikField={`commercials.${index}.rateCost`}
                                            label="Cost"
                                            placeholder="Cost"
                                            isRequired={false}
                                            inputValidation="decimal"
                                            type="number"
                                            readonly={true}
                                          />
                                        </Col>
                                      </>
                                    ) : (
                                      <Col md={3} lg={3} xl={3}>
                                        <TextInput
                                          formikField={`commercials.${index}.lumpsumCost`}
                                          label="Cost"
                                          placeholder="Cost"
                                          isRequired={false}
                                          inputValidation="decimal"
                                          type="number"
                                        />
                                      </Col>
                                    )}
                                  </Row>
                                </div>
                              ))}

                              {/* Total Cost Display */}
                              <div className="d-flex justify-content-end align-items-center mt-4 mb-3">
                                <span style={{
                                  fontFamily: 'Inter',
                                  fontSize: '14px',
                                  fontWeight: '400',
                                  color: '#666666',
                                  marginRight: '8px'
                                }}>
                                  Total Cost:
                                </span>
                                <span style={{
                                  fontFamily: 'Inter',
                                  fontSize: '16px',
                                  fontWeight: '600',
                                  color: 'black'
                                }}>
                                  ₹ {values.commercials?.reduce((total: number, commercial: any) => {
                                    let commercialTotal = 0;
                                    if (commercial.costType === 'RATE') {
                                      commercialTotal = parseFloat(commercial.rateCost || '0');
                                    } else if (commercial.costType === 'LUMPSUM') {
                                      commercialTotal = parseFloat(commercial.lumpsumCost || '0');
                                    }
                                    return total + commercialTotal;
                                  }, 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>

                              {/* Add More Button */}
                              <div
                                onClick={() =>
                                  push({
                                    area: "",
                                    label: "",
                                    costType: "RATE",
                                    rate: "",
                                    rateCost: "",
                                    lumpsum: "",
                                    lumpsumCost: "",
                                  })
                                }
                                style={{
                                  cursor: "pointer",
                                  color: "#9D4141",
                                  border: "1px dotted #9D4141",
                                  borderRadius: "5px",
                                  padding: "8px 10px",
                                  marginTop: "15px",
                                  textAlign: "center",
                                }}
                                className="justify-content-center align-items-center"
                              >
                                + Add More Commercial
                              </div>
                            </div>
                          )}
                        </FieldArray>
                      </fieldset>
                    </div>

                    {/* If Project Type is MEP then, area(sqft), add country, state, city, town, Zipcode, address, PoNumber, PoDate, latitude, longitude */}
                    {/* {(projectType?.id === "mep" ||
                      selectedProjectType === "mep") && ( */}
                      <div className="form-section mb-4">
                        <fieldset
                          style={{
                            borderTop: "1px solid #9D4141",
                            padding: "clamp(14px, 2vw, 15px)",
                          }}
                          className="mt-7"
                        >
                          <legend
                            style={{
                              fontSize: "17px",
                              fontWeight: 600,
                              fontFamily: "Inter",
                              marginTop: "-25px",
                              marginLeft: "-17px",
                              backgroundColor: "#F3F4F7",
                              width: "auto",
                              lineHeight: "1",
                              letterSpacing: 0,
                              color: "#9D4141",
                              padding: "2px 2px 8px",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px"
                            }}
                          >
                            <div className="ms-5" style={{borderTop: "1px solid #9D4141", width: "30px", height: "0px"}}></div>
                            ADDRESS DETAILS
                          </legend>
                          <FieldArray name="addresses">
                            {({ push, remove }) => (
                              <>
                                {values.addresses?.map((address: any, index: any) => (
                                  <div key={index} className="card-body card responsive-card p-md-10 p-3">
                                    <Row className="mb-3">
                                      <Col md={6}>
                                        <TextInput
                                          formikField={`addresses.${index}.fullAddress`}
                                          label="Address"
                                          isRequired={false}
                                        />
                                      </Col>
                                      <Col md={6}>
                                        <DropDownInput
                                          formikField={`addresses.${index}.country`}
                                          inputLabel="Country"
                                          options={countries.map((c) => ({
                                            label: c.name,
                                            value: c.id,
                                          }))}
                                          isRequired={false}
                                          enableSmartSort={true}
                                          smartFilterFunction={getFilteredAndSortedOptions}
                                          onChange={(option: any) => {
                                            setFieldValue(
                                              `addresses.${index}.country`,
                                              option?.value || ""
                                            );
                                            setFieldValue(`addresses.${index}.state`, "");
                                            setFieldValue(`addresses.${index}.city`, "");
                                            if (option?.value) {
                                              handleCountryChange(option.value);
                                            }
                                          }}
                                          value={
                                            values.addresses[index]?.country
                                              ? {
                                                  label:
                                                    countries.find(
                                                      (c) => c.id === values.addresses[index].country
                                                    )?.name || "",
                                                  value: values.addresses[index].country,
                                                }
                                              : null
                                          }
                                        />
                                      </Col>
                                    </Row>
                                    <Row className="mb-3">
                                      <Col md={6}>
                                        <DropDownInput
                                          formikField={`addresses.${index}.state`}
                                          inputLabel="State"
                                          options={values.addresses[index]?.country ? states.map((s) => ({
                                            label: s.name,
                                            value: s.id,
                                          })) : []}
                                          placeholder={!values.addresses[index]?.country ? "Please select country first" : "Select State"}
                                          disabled={!values.addresses[index]?.country}
                                          isRequired={false}
                                          enableSmartSort={true}
                                          smartFilterFunction={getFilteredAndSortedOptions}
                                          onChange={(option: any) => {
                                            setFieldValue(`addresses.${index}.state`, option?.value || "");
                                            setFieldValue(`addresses.${index}.city`, "");
                                            if (option?.value && values.addresses[index]?.country) {
                                              handleStateChange(
                                                values.addresses[index].country,
                                                option.value
                                              );
                                            }
                                          }}
                                          value={
                                            values.addresses[index]?.state
                                              ? {
                                                  label:
                                                    states.find(
                                                      (s) => s.id === values.addresses[index].state || s.name === values.addresses[index].state
                                                    )?.name || values.addresses[index].state,
                                                  value: values.addresses[index].state,
                                                }
                                              : null
                                          }
                                        />
                                      </Col>
                                      <Col md={6}>
                                        <DropDownInput
                                          formikField={`addresses.${index}.city`}
                                          inputLabel="City"
                                          options={values.addresses[index]?.state ? [
                                            ...cities.map((c) => ({
                                              label: c.name,
                                              value: c.id,
                                            })),
                                            ...(values.addresses[index]?.city &&
                                            !cities.find((c) => c.id === values.addresses[index].city)
                                              ? [
                                                  {
                                                    label: values.addresses[index].city,
                                                    value: values.addresses[index].city,
                                                  },
                                                ]
                                              : []),
                                          ] : []}
                                          placeholder={!values.addresses[index]?.state ? "Please select state first" : "Select City"}
                                          disabled={!values.addresses[index]?.state}
                                          isRequired={false}
                                          enableSmartSort={true}
                                          smartFilterFunction={getFilteredAndSortedOptions}
                                          onChange={(option: any) =>
                                            setFieldValue(`addresses.${index}.city`, option?.value || "")
                                          }
                                          value={
                                            values.addresses[index]?.city
                                              ? {
                                                  label:
                                                    cities.find(
                                                      (c) => c.id === values.addresses[index].city
                                                    )?.name || values.addresses[index].city,
                                                  value: values.addresses[index].city,
                                                }
                                              : null
                                          }
                                        />
                                      </Col>
                                    </Row>
                                    <Row className="mb-3">
                                      <Col md={6}>
                                        <TextInput
                                          formikField={`addresses.${index}.locality`}
                                          label="Locality"
                                          isRequired={false}
                                        />
                                      </Col>
                                      <Col md={6}>
                                        <TextInput
                                          formikField={`addresses.${index}.zipcode`}
                                          label="Zip Code"
                                          isRequired={false}
                                        />
                                      </Col>
                                    </Row>

                                    {/* Location on Map Card */}
                                    <div className="mt-5 p-3" style={{ borderRadius: '8px', backgroundColor: '#9fd491'}}>
                                      <div className="mb-4" style={{fontFamily:'Inter', fontSize:'14px', fontWeight:'500', color:'#0D47A1'}}>LOCATION ON MAP</div>
                                      <Row className="mb-3">
                                    <Col md={3}>
                                        <TextInput
                                          formikField={`addresses.${index}.googleMapLink`}
                                          label="Google Map Link"
                                          isRequired={false}
                                        />
                                      </Col>
                                      <Col md={3}>
                                        <TextInput
                                          formikField={`addresses.${index}.gmbLink`}
                                          label="Google Business Link"
                                          isRequired={false}
                                        />
                                      </Col>
                                      <Col md={3}>
                                        <TextInput
                                          formikField={`addresses.${index}.latitude`}
                                          label="Latitude"
                                          isRequired={false}
                                        />
                                      </Col>
                                      <Col md={3}>
                                        <TextInput
                                          formikField={`addresses.${index}.longitude`}
                                          label="Longitude"
                                          isRequired={false}
                                        />
                                      </Col>
                                      <div 
                                        className="d-flex justify-content-end mt-4" 
                                        onClick={() => viewLocation(
                                          values.addresses[index]?.latitude || '', 
                                          values.addresses[index]?.longitude || ''
                                        )}
                                        style={{
                                          cursor: 'pointer',
                                          color: '#0D47A1',
                                          // textDecoration: 'underline'
                                        }}
                                      >
                                        View Location On Map
                                      </div>
                                    </Row>
                                    </div>
                                    <Row>
                                      <Col md={12}>
                                        {values.addresses.length > 1 && (
                                          <div
                                            onClick={() => remove(index)}
                                            style={{
                                              cursor: "pointer",
                                              color: "#9D4141",
                                              fontSize: "20px",
                                              textAlign: "right",
                                              position: "absolute",
                                              right: "10px",
                                              top: "10px",
                                              padding: "10px",
                                            }}
                                          >
                                            ×
                                          </div>
                                        )}
                                      </Col>
                                    </Row>

                                    {/* Add More Button Inside the Last Card */}
                                    {/* Commented out to limit users to one address only */}
                                    {/* {index === values.addresses.length - 1 && (
                                      <div
                                        onClick={() =>
                                          push({
                                            fullAddress: "",
                                            country: "",
                                            state: "",
                                            city: "",
                                            locality: "",
                                            zipcode: "",
                                            latitude: "",
                                            longitude: "",
                                            gmbLink: "",
                                            googleMapLink: "",
                                          })
                                        }
                                        style={{
                                          cursor: "pointer",
                                          color: "#9D4141",
                                          border: "1px dotted #9D4141",
                                          borderRadius: "5px",
                                          padding: "8px 10px",
                                          marginTop: "15px",
                                          textAlign: "center",
                                        }}
                                        className="justify-content-center align-items-center"
                                      >
                                        + Add More Address
                                      </div>
                                    )} */}
                                  </div>
                                ))}
                              </>
                            )}
                          </FieldArray>
                        </fieldset>
                      </div>
                    {/* )} */}

                    {/* Handle By Section */}
                    <div className="form-section mb-4">
                      <fieldset style={{ borderTop: "1px solid #9D4141", padding: "clamp(14px, 2vw, 15px)" }} className="mt-7">
                        <legend style={{
                          fontSize: "17px", fontWeight: 600, fontFamily: "Inter",
                          marginTop: "-25px", marginLeft: "-17px", backgroundColor: "#F3F4F7",
                          width: "auto", lineHeight: "1", letterSpacing: 0, color: "#9D4141",
                          padding: "2px 2px 8px", display: "flex", alignItems: "center", gap: "8px"
                        }}>
                          <div className="ms-5" style={{borderTop: "1px solid #9D4141", width: "30px", height: "0px"}}></div>
                          HANDLE BY
                        </legend>
                        <div className="card-body card responsive-card p-md-10 p-3">
                          {(!values.handledByEntries || values.handledByEntries.length === 0) && (
                            <Box sx={{ textAlign: 'center', py: 3, color: '#666' }}>
                              No entries yet. Click "Add Handle By" to get started.
                            </Box>
                          )}
                          {(values.handledByEntries || []).map((entry: any, idx: number) => (
                            <div key={entry.id || idx} className="d-flex align-items-end gap-2 mb-2" style={{ gap: '8px' }}>
                              <div style={{ flex: 1 }}>
                                <DropDownInput
                                  formikField={`handledByEntries[${idx}].employeeId`}
                                  inputLabel={idx === 0 ? "Handle By" : ""}
                                  isRequired={false}
                                  options={buildEmployeeOptions(
                                    allEmployees?.list || [],
                                    entry.employeeId || undefined,
                                  )}
                                  placeholder="Select employee"
                                  showColor={true}
                                />
                              </div>
                              <div style={{ flex: 1 }}>
                                <DateInput
                                  formikField={`handledByEntries[${idx}].handledDate`}
                                  inputLabel={idx === 0 ? "Date In" : ""}
                                  formikProps={formikProps}
                                  placeHolder="DD-MM-YYYY"
                                  isRequired={false}
                                />
                              </div>
                              <div style={{ flex: 1 }}>
                                <DateInput
                                  formikField={`handledByEntries[${idx}].handledOutDate`}
                                  inputLabel={idx === 0 ? "Date Out" : ""}
                                  formikProps={formikProps}
                                  placeHolder="DD-MM-YYYY"
                                  isRequired={false}
                                />
                              </div>
                              <div style={{ paddingBottom: '4px' }}>
                                <IconButton
                                  onClick={() => {
                                    const updated = (values.handledByEntries || []).filter((_: any, i: number) => i !== idx);
                                    setFieldValue('handledByEntries', updated);
                                  }}
                                  sx={{ color: '#d32f2f', padding: '6px' }}
                                  title="Remove"
                                >
                                  <Delete fontSize="small" />
                                </IconButton>
                              </div>
                            </div>
                          ))}
                          <div
                            onClick={() => {
                              const today = new Date().toISOString().split('T')[0];
                              const newEntry = { id: Date.now().toString(), employeeId: '', handledDate: today, handledOutDate: '' };
                              setFieldValue('handledByEntries', [...(values.handledByEntries || []), newEntry]);
                            }}
                            style={{
                              marginTop: '8px', padding: '8px 12px', borderStyle: 'dotted',
                              borderColor: '#DBB3B3', borderWidth: '1px', borderRadius: '8px',
                              color: '#9D4141', cursor: 'pointer', display: 'inline-flex',
                              alignItems: 'center', gap: '6px', fontSize: '13px', fontFamily: 'Inter',
                            }}
                          >
                            <Add fontSize="small" />
                            Add Handle By
                          </div>
                        </div>
                      </fieldset>
                    </div>

                    {/* PO Details Section */}
                    <div className="form-section mb-4">
                      <fieldset
                        style={{
                          borderTop: "1px solid #9D4141",
                          padding: "clamp(14px, 2vw, 15px)",
                        }}
                        className="mt-7"
                      >
                        <legend
                          style={{
                            fontSize: "17px",
                            fontWeight: 600,
                            fontFamily: "Inter",
                            marginTop: "-25px",
                            marginLeft: "-17px",
                            backgroundColor: "#F3F4F7",
                            width: "auto",
                            lineHeight: "1",
                            letterSpacing: 0,
                            color: "#9D4141",
                            padding: "2px 2px 8px",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px"
                          }}
                        >
                          <div className="ms-5" style={{borderTop: "1px solid #9D4141", width: "30px", height: "0px"}}></div>
                          PO DETAILS
                        </legend>
                        <div className="card-body card responsive-card p-md-10 p-3">
                          <Row>
                            <Col md={6}>
                              <TextInput
                                formikField="poNumber"
                                label="PO Number"
                                placeholder="0"
                                isRequired={false}
                                inputValidation="numbers-space"
                              />
                            </Col>
                            <Col md={6}>
                              <DateInput
                                formikField="poDate"
                                inputLabel="PO Date"
                                isRequired={false}
                                formikProps={formikProps}
                                placeHolder="1/3/2025"
                              />
                            </Col>
                          </Row>
                          <Row className="mt-3">
                            <Col md={12}>
                              <label className="mb-2 fw-bold" style={{ fontSize: '14px', fontFamily: 'Inter' }}>
                                Attach PO File
                              </label>
                              {values.poFile && (
                                <div className="mb-3 p-3 bg-light rounded">
                                  <div className="d-flex align-items-center justify-content-between">
                                    <div>
                                      <small className="text-muted">Current PO file:</small>
                                      <div className="fw-bold text-primary">
                                        📎 {getFileNameFromUrl(values.poFile)}
                                      </div>
                                    </div>
                                    <div>
                                      <a href={values.poFile} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-primary me-2">View</a>
                                      <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setFieldValue("poFile", "")}>Remove</button>
                                    </div>
                                  </div>
                                </div>
                              )}
                              <input
                                type="file"
                                accept=".doc,.docx,.pdf,.jpg,.jpeg,.png,.xls,.xlsx"
                                className="form-control form-control-lg form-control-solid"
                                onChange={async (event) => {
                                  const files = event.target.files;
                                  if (files && files[0]) {
                                    if (files[0].size > 5 * 1024 * 1024) {
                                      alert("File size should not exceed 5 MB");
                                      event.target.value = "";
                                      return;
                                    }
                                    const form = new FormData();
                                    form.append("file", files[0]);
                                    try {
                                      const { data: { path } } = await uploadUserAsset(form, userId, "projects/po");
                                      setFieldValue("poFile", path, true);
                                    } catch (error) {
                                      console.error("Failed to upload PO file. Please try again.");
                                    }
                                  }
                                }}
                              />
                              <small className="text-muted">
                                {values.poFile ? "Upload a new file to replace the current PO document" : "Select a PO document to upload"}
                              </small>
                            </Col>
                          </Row>
                        </div>
                      </fieldset>
                    </div>

                    

                    {/* Client Details Section */}
                    <div className="form-section mb-4">
                      <fieldset
                        style={{
                          borderTop: "1px solid #9D4141",
                          padding: "clamp(14px, 2vw, 15px)",
                        }}
                        className="mt-7"
                      >
                        <legend
                          style={{
                            fontSize: "17px",
                            fontWeight: 600,
                            fontFamily: "Inter",
                            marginTop: "-25px",
                            marginLeft: "-17px",
                            backgroundColor: "#F3F4F7",
                            width: "auto",
                            lineHeight: "1",
                            letterSpacing: 0,
                            color: "#9D4141",
                            padding: "2px 2px 8px",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px"
                          }}
                        >
                          <div className="ms-5" style={{borderTop: "1px solid #9D4141", width: "30px", height: "0px"}}></div>
                          TEAM DETAILS
                        </legend>

                        <FieldArray name="companies">
                          {({ push, remove }) => (
                            <>
                              {values.companies.map(
                                (company: any, index: any) => {
                                  // Filter companies based on selected service
                                  const selectedServiceId = values.companies[index]?.service;

                                  // Based on actual data structure - companies don't filter by service
                                  // All companies are shown regardless of service selection
                                  const filteredCompanies = companies;

                                  // Filter sub-companies based on selected company
                                  const selectedCompanyId = values.companies[index]?.company;
                                  const selectedCompany = companies.find((comp: any) => comp.id === selectedCompanyId);

                                  // Sub-companies come from the selected company's subCompanies array
                                  const filteredSubCompanies = selectedCompanyId && selectedCompany?.subCompanies
                                    ? selectedCompany.subCompanies
                                    : [];

                                  // Filter contacts based on selected company
                                  const filteredContacts = selectedCompanyId
                                    ? contacts.filter((contact: any) =>
                                        contact.companyId === selectedCompanyId
                                      )
                                    : contacts;

                                  return (
                                    <div
                                      key={index}
                                      className="card-body card responsive-card p-md-10 p-3"
                                    >
                                      <Row>
                                        <Col md={3}>
                                          <DropDownInput
                                            formikField={`companies.${index}.companyTypeId`}
                                            inputLabel="Company Type"
                                            options={companyTypes.map((type: any) => ({
                                              value: type.id,
                                              label: type.name,
                                            }))}
                                            isRequired={false}
                                            onChange={(option: any) => {
                                              setFieldValue(`companies.${index}.companyTypeId`, option?.value || "");
                                              // Reset dependent fields when company type changes
                                              setFieldValue(`companies.${index}.company`, "");
                                              setFieldValue(`companies.${index}.subCompanyId`, "");
                                              setFieldValue(`companies.${index}.contactPerson`, "");
                                            }}
                                          />
                                          <div
                                            onClick={() =>
                                              setShowCompanyTypeModal(true)
                                            }
                                            style={{
                                              cursor: "pointer",
                                              color: "#9D4141",
                                            }}
                                            className="ms-2"
                                          >
                                            + New Company Type
                                          </div>
                                        </Col>

                                        <Col md={3}>
                                          <DropDownInput
                                            formikField={`companies.${index}.company`}
                                            inputLabel="Company"
                                            options={filteredCompanies.map((company) => ({
                                              value: company.id,
                                              label: company.companyName,
                                            }))}
                                            // placeholder={!selectedServiceId ? "Please select service first" : "Select Company"}
                                            isRequired={false}
                                            onChange={(option: any) => {
                                              setFieldValue(`companies.${index}.company`, option?.value || "");
                                              // Reset dependent fields when company changes
                                              setFieldValue(`companies.${index}.subCompanyId`, "");
                                              setFieldValue(`companies.${index}.contactPerson`, "");
                                            }}
                                          />
                                          <div
                                            onClick={() =>
                                              setShowCompanyModal(true)
                                            }
                                            style={{
                                              cursor: "pointer",
                                              color: "#9D4141",
                                            }}
                                            className="ms-2"
                                          >
                                            + New Company
                                          </div>
                                        </Col>

                                        <Col md={3}>
                                          <DropDownInput
                                            formikField={`companies.${index}.subCompanyId`}
                                            inputLabel="Sub Company"
                                            options={filteredSubCompanies.map((subCompany:any) => ({
                                              value: subCompany.id,
                                              label: subCompany.subCompanyName,
                                            }))}
                                            // placeholder={!selectedCompanyId ? "Please select company first" : "Select Sub Company"}
                                            isRequired={false}
                                          />
                                          <div
                                            onClick={() =>
                                              setShowSubCompanyModal(true)
                                            }
                                            style={{
                                              cursor: "pointer",
                                              color: "#9D4141",
                                            }}
                                            className="ms-2"
                                          >
                                            + New Sub Company
                                          </div>
                                        </Col>

                                        <Col md={3}>
                                          <DropDownInput
                                            formikField={`companies.${index}.contactPerson`}
                                            inputLabel="Contact Person"
                                            options={contacts.map((contact) => ({
                                              value: contact.id,
                                              label: contact.fullName,
                                              avatar: contact.profilePhoto
                                            }))}
                                            showColor={true}
                                            // placeholder={!selectedCompanyId ? "Please select company first" : "Select Contact Person"}
                                            isRequired={false}
                                          />
                                          <div
                                            onClick={() =>
                                              setShowContactModal(true)
                                            }
                                            style={{
                                              cursor: "pointer",
                                              color: "#9D4141",
                                            }}
                                            className="ms-2"
                                          >
                                            + New Contact
                                          </div>
                                        </Col>

                                        <Col md={1}>
                                          {values.companies.length > 1 && (
                                            <div
                                              onClick={() => remove(index)}
                                              style={{
                                                cursor: "pointer",
                                                color: "#9D4141",
                                                fontSize: "20px",
                                                textAlign: "right",
                                              }}
                                            >
                                              ×
                                            </div>
                                          )}
                                        </Col>
                                      </Row>
                                    </div>
                                  );
                                }
                              )}

                              {/* Add More Button */}
                              {/* <div className="card-body card responsive-card p-md-10 p-3">
                                <div
                                  onClick={() =>
                                    push({
                                      service: "",
                                      company: "",
                                      subCompanyId: "",
                                      contactPerson: "",
                                    })
                                  }
                                  style={{
                                    cursor: "pointer",
                                    color: "#9D4141",
                                    border: "1px dotted #9D4141",
                                    borderRadius: "5px",
                                    padding: "8px 10px",
                                    textAlign: "center",
                                  }}
                                  className="justify-content-center align-items-center"
                                >
                                  + Add More Companies
                                </div>
                              </div> */}
                            </>
                          )}
                        </FieldArray>
                      </fieldset>
                    </div>

                    {/* Add Other relation companies,  */}
                    <div className="form-section mb-4">
                      <fieldset
                        style={{
                          borderTop: "1px solid #9D4141",
                          padding: "clamp(14px, 2vw, 15px)",
                        }}
                        className="mt-7"
                      >
                        <legend
                          style={{
                            fontSize: "17px",
                            fontWeight: 600,
                            fontFamily: "Inter",
                            marginTop: "-25px",
                            marginLeft: "-17px",
                            backgroundColor: "#F3F4F7",
                            width: "auto",
                            lineHeight: "1",
                            letterSpacing: 0,
                            color: "#9D4141",
                            padding: "2px 2px 8px",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px"
                          }}
                        >
                          <div className="ms-5" style={{borderTop: "1px solid #9D4141", width: "30px", height: "0px"}}></div>
                          ADD OTHER RELATION COMPANIES
                        </legend>

                        <FieldArray name="projectCompanyMappings">
                          {({ push, remove }) => (
                            <div className="card-body card responsive-card p-md-10 p-3">
                              {values.projectCompanyMappings.map(
                                (company: any, index: any) => (
                                  <div key={index} className={index > 0 ? "mt-4 pt-4" : ""}>
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                      <div style={{fontFamily:'Inter',fontWeight:'500',fontSize:'14px',color:'#798DB3'}}>
                                        Relation Company {index + 1}
                                      </div>
                                      {values.projectCompanyMappings.length > 1 && (
                                        <div
                                          onClick={() => remove(index)}
                                          style={{
                                            cursor: "pointer",
                                            color: "#9D4141",
                                            fontSize: "20px",
                                            padding: "5px",
                                          }}
                                        >
                                          ×
                                        </div>
                                      )}
                                    </div>
                                    <Row>
                                      <Col md={3}>
                                        <DropDownInput
                                          formikField={`projectCompanyMappings.${index}.companyTypeId`}
                                          inputLabel="Company Type"
                                          options={companyTypes.map((companyType) => ({
                                            value: companyType.id,
                                            label: companyType.name,
                                          }))}
                                          isRequired={false}
                                        />
                                        <div
                                          onClick={() =>
                                            setShowServiceModal(true)
                                          }
                                          style={{
                                            cursor: "pointer",
                                            color: "#9D4141",
                                          }}
                                          className="ms-2"
                                        >
                                          {/* + New Company Type */}
                                        </div>
                                      </Col>

                                      <Col md={3}>
                                        <DropDownInput
                                          formikField={`projectCompanyMappings.${index}.company`}
                                          inputLabel="Company"
                                          options={companies.map((company) => ({
                                            value: company.id,
                                            label: company.companyName,
                                          }))}
                                          isRequired={false}
                                        />
                                        <div
                                          onClick={() =>
                                            setShowCompanyModal(true)
                                          }
                                          style={{
                                            cursor: "pointer",
                                            color: "#9D4141",
                                          }}
                                          className="ms-2"
                                        >
                                          + New Company
                                        </div>
                                      </Col>

                                      <Col md={3}>
                                        <DropDownInput
                                          formikField={`projectCompanyMappings.${index}.refferingSubCompanyId`}
                                          inputLabel="Reffering Sub Company"
                                          options={subCompanies.map((subCompany) => ({
                                            value: subCompany.id,
                                            label: subCompany.subCompanyName,
                                          }))}
                                          isRequired={false}
                                        />
                                        <div
                                          onClick={() =>
                                            setShowSubCompanyModal(true)
                                          }
                                          style={{
                                            cursor: "pointer",
                                            color: "#9D4141",
                                          }}
                                          className="ms-2"
                                        >
                                          + New Sub Company
                                        </div>
                                      </Col>

                                      <Col md={3}>
                                        <DropDownInput
                                          formikField={`projectCompanyMappings.${index}.contactPerson`}
                                          inputLabel="Contact Person"
                                          options={contacts.map((contact) => ({
                                            value: contact.id,
                                            label: contact.fullName,
                                            avatar: contact.profilePhoto
                                          }))}
                                          showColor={true}
                                          isRequired={false}
                                        />
                                        <div
                                          onClick={() =>
                                            setShowContactModal(true)
                                          }
                                          style={{
                                            cursor: "pointer",
                                            color: "#9D4141",
                                          }}
                                          className="ms-2"
                                        >
                                          + New Contact
                                        </div>
                                      </Col>
                                    </Row>
                                  </div>
                                )
                              )}

                              {/* Add More Button */}
                              <div
                                onClick={() =>
                                  push({
                                    companyTypeId: "",
                                    company: "",
                                    refferingSubCompanyId: "",
                                    contactPerson: "",
                                  })
                                }
                                style={{
                                  cursor: "pointer",
                                  color: "#9D4141",
                                  border: "1px dotted #9D4141",
                                  borderRadius: "5px",
                                  padding: "8px 10px",
                                  marginTop: "15px",
                                  textAlign: "center",
                                }}
                                className="justify-content-center align-items-center"
                              >
                                + Add More Relation Companies
                              </div>
                            </div>
                          )}
                        </FieldArray>
                      </fieldset>
                    </div>

                        {/* Team Details Section */}
                        <div className="form-section mb-4">
                      <fieldset
                        style={{
                          borderTop: "1px solid #9D4141",
                          padding: "clamp(14px, 2vw, 15px)",
                        }}
                        className="mt-7"
                      >
                        <legend
                          style={{
                            fontSize: "17px",
                            fontWeight: 600,
                            fontFamily: "Inter",
                            marginTop: "-25px",
                            marginLeft: "-17px",
                            backgroundColor: "#F3F4F7",
                            width: "auto",
                            lineHeight: "1",
                            letterSpacing: 0,
                            color: "#9D4141",
                            padding: "2px 2px 8px",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px"
                          }}
                        >
                          <div className="ms-5" style={{borderTop: "1px solid #9D4141", width: "30px", height: "0px"}}></div>
                          INTERNAL TEAM DETAILS
                        </legend>

                        <FieldArray name="teamDetails"> 
                          {({ push, remove }) => (
                            <div className="card-body card responsive-card p-md-10 p-3">
                              <Row>
                                {values.teamDetails?.map((team: any, index: any) => (
                                  <Col md={4} key={index} className="mb-3" style={{ position: 'relative' }}>
                                    <DropDownInput
                                      formikField={`teamDetails.${index}.teamId`}
                                      inputLabel="Choose Team"
                                      options={
                                        teams?.map((item: any) => ({
                                          value: item.id,
                                          label: item.name,
                                        })) || []
                                      }
                                      isRequired={false}
                                    />
                                    {values.teamDetails.length > 1 && (
                                      <div
                                        onClick={() => remove(index)}
                                        style={{
                                          cursor: "pointer",
                                          color: "#9D4141",
                                          fontSize: "18px",
                                          position: "absolute",
                                          right: "5px",
                                          top: "1px",
                                          backgroundColor: "white",
                                          borderRadius: "50%",
                                          width: "25px",
                                          height: "25px",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          // border: "1px solid #9D4141"
                                        }}
                                      >
                                        ×
                                      </div>
                                    )}
                                  </Col>
                                ))}
                                
                                {/* Add More Team Button */}
                                <Col md={4} className="mb-3">
                                  <div
                                    onClick={() =>
                                      push({
                                        teamId: "",
                                      })
                                    }
                                    style={{
                                      cursor: "pointer",
                                        color: "#9D4141",
                                        border: "1px dotted #9D4141",
                                        borderRadius: "5px",
                                        padding: "8px 1px",
                                        marginTop: "28px",
                                        textAlign: "center",
                                    }}
                                    className="justify-content-center align-items-center"
                                  >
                                    + Add More Team
                                  </div>
                                </Col>
                              </Row>
                            </div>
                          )}
                        </FieldArray>
                      </fieldset>
                    </div>

                    

                

                    {/* Portal Settings Section */}
                    <div className="form-section mb-4">
                      <fieldset
                        style={{
                          borderTop: "1px solid #9D4141",
                          padding: "clamp(14px, 2vw, 15px)",
                        }}
                        className="mt-7"
                      >
                        <legend
                          style={{
                            fontSize: "17px",
                            fontWeight: 600,
                            fontFamily: "Inter",
                            marginTop: "-25px",
                            marginLeft: "-17px",
                            backgroundColor: "#F3F4F7",
                            width: "auto",
                            lineHeight: "1",
                            letterSpacing: 0,
                            color: "#9D4141",
                            padding: "2px 2px 8px",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px"
                          }}
                        >
                          <div className="ms-5" style={{borderTop: "1px solid #9D4141", width: "30px", height: "0px"}}></div>
                          ADDITIONAL DETAILS
                        </legend>

                        <div className="card-body card responsive-card p-md-10 p-3 ">
                          <Row>
                            <Col>
                            <div className="col-lg-12">
                      <label className="mb-3 fw-bold">
                        Upload Document File
                      </label>
                      
                      {/* Show existing document if available */}
                      {/* {values.documents && (
                        <div className="mb-3 p-3 bg-light rounded">
                          <div className="d-flex align-items-center justify-content-between">
                            <div>
                              <small className="text-muted">Current document:</small>
                              <div className="fw-bold text-primary">
                                📎 {getFileNameFromUrl(values.documents)}
                              </div>
                            </div>
                            <div>
                              <a 
                                href={values.documents} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="btn btn-sm btn-outline-primary me-2"
                              >
                                View
                              </a>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => setFieldValue("documents", "")}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      )} */}
                      
                      <input
                        type="file"
                        accept=".doc,.docx,.pdf,.jpg,.jpeg,.png,.xls,.xlsx"
                        className="form-control form-control-lg form-control-solid"
                        required={false}
                        onChange={(event) => uploadFile(event, formikProps, 5 * 1024 * 1024)}
                      />
                      <small className="text-muted">
                        {values.documents ? "Upload a new file to replace the current document" : "Select a document to upload"}
                      </small>
                    </div>
                            </Col>
                          </Row>

                          {/* Is Project Open or Closed */}
                          {/* <Row className="mt-4">
                            <Col md={6}>
                              <RadioInput
                                formikField="isProjectOpen"
                                inputLabel="Project Phase"
                                radioBtns={[
                                  { value: "true", label: "Ongoing" },
                                  { value: "false", label: "Completed" },
                                ]}
                                isRequired={false}
                              />
                            </Col>
                          </Row> */}

                          {/* Description Section */}
                          <div className="form-section mb-4">
                            <Row>
                              <Col md={12}>
                                <Form.Group>
                                  <Form.Label>Description</Form.Label>
                                  <Form.Control
                                    as="textarea"
                                    rows={4}
                                    name="description"
                                    value={values.description}
                                    onChange={(e) =>
                                      setFieldValue(
                                        "description",
                                        e.target.value
                                      )
                                    }
                                    // style={{
                                    //   backgroundColor: "#F3F4F7",
                                    // }}
                                  />
                                  <Form.Text className="text-muted">
                                    {values.description.length}/200 characters
                                  </Form.Text>
                                </Form.Group>
                              </Col>
                            </Row>
                          </div>

                          {/* Optional Tabs Section - Uncomment if needed */}
                          {/* <div className="mt-3">
                            <label className="form-label">Choose Tabs</label>
                            <div className="d-flex gap-3">
                              {Object.entries(values.tabs).map(([key, value]) => (
                                <Form.Check
                                  key={key}
                                  type="checkbox"
                                  id={key}
                                  label={key.charAt(0).toUpperCase() + key.slice(1)}
                                  checked={value}
                                  onChange={(e) =>
                                    setFieldValue(`tabs.${key}`, e.target.checked)
                                  }
                                />
                              ))}
                            </div>
                          </div> */}
                        </div>
                      </fieldset>
                    </div>

                    {/* Status Section */}
                    <div className="form-section mb-4">
                      <fieldset
                        style={{
                          borderTop: "1px solid #9D4141",
                          padding: "clamp(14px, 2vw, 15px)",
                        }}
                        className="mt-7"
                      >
                        <legend
                          style={{
                            fontSize: "17px",
                            fontWeight: 600,
                            fontFamily: "Inter",
                            marginTop: "-25px",
                            marginLeft: "-17px",
                            backgroundColor: "#F3F4F7",
                            width: "auto",
                            lineHeight: "1",
                            letterSpacing: 0,
                            color: "#9D4141",
                            padding: "2px 2px 8px",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px"
                          }}
                        >
                          <div className="ms-5" style={{borderTop: "1px solid #9D4141", width: "30px", height: "0px"}}></div>
                          STATUS
                        </legend>

                        <div className="card-body card responsive-card p-md-10 p-3">
                          <Row>
                            <Col md={6}>
                              <DropDownInput
                                formikField="statusId"
                                inputLabel="Status"
                                options={
                                  statuses?.map((status: any) => ({
                                    value: status.id,
                                    label: status.name,
                                    color: status.color,
                                  })) || []
                                }
                                showColor={true}
                                isRequired={false}
                              />
                              <div
                                onClick={() => setShowStatusModal(true)}
                                style={{ cursor: "pointer", color: "#9D4141" }}
                                className="ms-2"
                              >
                                + New Status
                              </div>
                            </Col>
                          </Row>
                        </div>
                      </fieldset>
                    </div>


                    {/* Form Actions */}
                    <div className="form-actions d-flex justify-content-start gap-2">
                      {/* <Button variant="secondary" onClick={onHide}>
                        Cancel
                      </Button> */}
                      <Button
                        variant="primary"
                        type="submit"
                        disabled={isSubmitting}
                      >
                        {isSubmitting
                          ? editingProjectId
                            ? "Updating..."
                            : "Adding..."
                          : editingProjectId
                          ? "Update Project"
                          : "Add Project"}
                      </Button>
                    </div>
                  </FormikForm>
                );
              }}
            </Formik>
            )}
          </Box>
        </Box>
      </Modal>
      {/* Configuration Modals */}
      <ProjectConfigForm
        show={showCategoryModal}
        onClose={handleCategoryModalClose}
        onSuccess={fetchProjectCategories}
        type="category"
        title="Category"
      />

      <ProjectConfigForm
        show={showSubcategoryModal}
        onClose={handleSubcategoryModalClose}
        onSuccess={fetchProjectSubcategories}
        type="subcategory"
        title="Subcategory"
      />

      <ProjectConfigForm
        show={showServiceModal}
        onClose={handleServiceModalClose}
        onSuccess={fetchProjectServices}
        type="service"
        title="Service"
      />
      <ProjectConfigForm
        show={showStatusModal}
        onClose={handleStatusModalClose}
        onSuccess={fetchProjectStatuses}
        type="status"
        title="Status"
      />

      {/* Company/Branch/Contact Modals */}
      <NewCompanyForm
        show={showCompanyModal}
        onClose={handleCompanyModalClose}
      />

      <SubCompanyForm
        show={showSubCompanyModal}
        onClose={handleSubCompanyModalClose}
      />

      <ClientContactsForm
        show={showContactModal}
        onClose={handleContactModalClose}
        contactId={editingContactId}
      />

      <CompanyConfigForm
          show={showCompanyTypeModal}
          onClose={() => setShowCompanyTypeModal(false)}
          title="Company Type"
          type="company-type"
        />
    </div>
  );
};

export default BlankBasicProjectForm;
