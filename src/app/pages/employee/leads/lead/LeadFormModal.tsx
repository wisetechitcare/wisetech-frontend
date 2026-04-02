import { IconButton, Box, Typography, Grid, Tooltip } from '@mui/material';
import { Close, Add, Delete } from '@mui/icons-material';
import React, { useCallback, useEffect, useState, useRef, Fragment, useMemo } from 'react';
import { Formik, Form as FormikForm, Field, FieldArray, useFormikContext } from "formik";
import HighlightErrors from "@app/modules/errors/components/HighlightErrors";
import * as Yup from "yup";
import DropDownInput from "@app/modules/common/inputs/DropdownInput";
import TextInput from "@app/modules/common/inputs/TextInput";
import TextAreaInput from '@app/modules/common/inputs/TextAreaInput';
import { leadAndProjectTemplateTypeId, prefixIdentifier } from '@constants/statistics';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@redux/store';
import { getAllProjectCategories, getAllProjectServices, getAllProjectStatuses, getAllProjectSubcategories, getAllTeams } from '@services/projects';
import { getAllClientCompanies, getAllClientContacts, getAllCompanyTypes, getClientContactsByCompanyId } from '@services/companies';
import { fetchSubCompaniesByMainCompanyId, fetchCompanyOverview } from '@services/company'; // Added: fetchCompanyOverview for internal referrals
import { fetchAllEmployees } from '@services/employee'; // Added: fetchAllEmployees for internal referrals
import { getAllClientBranches, getAllLeadReferralType, getAllLeadsCountIncludingDeleted, getAllLeadStatus, getAllLeadDirectSource } from '@services/lead';
import { fetchAllCities, fetchAllCountries, fetchAllPrefixSettings, fetchAllStates } from '@services/options';
import { convertFiscalYearToYearFormat } from '@app/modules/common/components/PrefixSettingsForm';
import PrefixInlineEdit from '@app/modules/common/components/PrefixInlineEdit';
import { loadAllEmployeesIfNeeded } from '@redux/slices/allEmployees';
import DateInput from '@app/modules/common/inputs/DateInput';
import { createLead, getLeadById, updateLead } from '@services/leads';
import { uploadUserAsset } from '@services/uploader';
import { customConfirmation, errorConfirmation, successConfirmation } from '@utils/modal';
import ProjectConfigForm from '@pages/employee/projects/configure/components/ProjectConfigForm';
import CompaniesBranchForm from '@pages/employee/companies/companies/components/CompaniesBranchForm';
import NewCompanyForm from '@pages/employee/companies/companies/components/NewCompanyForm';
import ClientContactsForm from '@pages/employee/companies/contacts/components/ClientContactsForm';
import { Modal, Form, Row, Col, Button, Dropdown } from "react-bootstrap";
import LeadsConfigForm from '../configuration/components/LeadsConfigForm';
import eventBus from '@utils/EventBus';
import { EVENT_KEYS } from '@constants/eventKeys';
import CompanyConfigForm from '@pages/employee/companies/companyConfig/components/CompanyConfigForm';
import FormikDropdownInput from '@app/modules/common/inputs/FormikDropdownInput';
import SubCompanyForm from '@pages/employee/companies/companies/components/SubCompanryForm';
import MultiSelectWithInlineCreate, { Option } from '@app/modules/common/components/MultiSelectWithInlineCreate';
import {
  createNewService,
  createNewCategory,
  createNewSubcategory,
  transformToOptions
} from '@app/modules/common/components/InlineCreateHelpers';
import DropdownInput from '@app/modules/common/inputs/DropdownInput';
import { getAllLeadCancellationReasons } from "@services/lead"; //new

interface LeadFormModalProps {
  leadTemplateId: string;
  open: boolean;
  onClose?: () => void;
  onSubmit?: (data: any) => void;
  title: string;
  initialData?: any;
  initialFormData?: any;
  isEditMode?: boolean;
  services?: Array<{ id: string; name: string }>;
  categories?: Array<{ id: string; name: string }>;
  subcategories?: Array<{ id: string; name: string }>;
  companies?: Array<{ id: string; companyName: string }>;
  branches?: Array<{ id: string; name: string }>;
  contacts?: Array<{ id: string; fullName: string }>;
  employees?: Array<{ id: string; users: { firstName: string; lastName: string } }>;
  leadSources?: Array<{ id: string; name: string }>;
  // referralTypes?: Array<{ id: string; name: string }>;
}

// Helper component for company name field with tooltip
const CompanyNameFieldWithTooltip: React.FC<{ index: number }> = ({ index }) => {
  const { values } = useFormikContext<any>();
  const companyName = values?.referrals?.[index]?.companyName || '';
  return (
    <Tooltip title={companyName || ''} arrow placement="top">
      <Box>
        <TextInput
          label="Company Name"
          placeholder="Company name (auto-filled)"
          isRequired={false}
          formikField={`referrals[${index}].companyName`}
          readonly={true}
        />
      </Box>
    </Tooltip>
  );
};

const LeadFormModal = ({
  leadTemplateId,
  open,
  onClose,
  onSubmit,
  title,
  initialData = {},
  initialFormData = {},
  isEditMode = false,
  // employees = [], // rm - removed to avoid conflict with state variable
  leadSources = [], // rm
  // referralTypes = [] // rm
}: LeadFormModalProps) => {

  const [selectedCompany, setSelectedCompany] = useState<boolean>(false);
  const [referrals, setReferrals] = useState([{
    id: Date.now().toString(),
    referralType: '',
    referringCompanyType: '', // Added: For external referrals - company type filter
    referringCompany: '',
    referringSubCompany: '',
    referringContact: '',
    referredByEmployeeId: '', // Added: For internal referrals
    companyName: '' // Added: For internal referrals
  }]);
  const formikRef = useRef<any>(null);
  const dispatch = useDispatch<AppDispatch>();
  const createdById = useSelector((state: RootState) => state.employee?.currentEmployee?.id);
  const allEmployees = useSelector((state: RootState) => state.allEmployees);

  //new
  const [leadCancellationReasons, setLeadCancellationReasons] = useState<Array<{ id: string, reason: string, color: string }>>([]);
  const fetchLeadCancellationReasons = useCallback(async () => {
    try {
      const response = await getAllLeadCancellationReasons();
      // Check the actual response structure
      console.log('Cancellation Reasons Response:', response);

      // Adjust based on your API response structure:
      const data = response?.data?.leadCancellationReasons || response?.leadCancellationReasons || response?.data || [];

      setLeadCancellationReasons(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching cancellation reasons:', error);
      setLeadCancellationReasons([]); // Set empty array on error
    }
  }, []);

  // Loading states
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [isProjectLoading, setIsProjectLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [refetchData, setRefetchData] = useState(false);
  // State for dropdown options
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [countries, setCountries] = useState<any[]>([]);
  const [referralTypes, setReferralTypes] = useState<any[]>([])
  const [leadDirectSources, setLeadDirectSources] = useState<any[]>([]);
  const [subCompanies, setSubCompanies] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [projectData, setProjectData] = useState<any>(null);
  const [useCalculatedAmount, setUseCalculatedAmount] = useState<boolean>(true);
  const [allCompanyTypes, setAllCompanyTypes] = useState([]);
  const [currCompanyTypeId, setCurrCompanyTypeId] = useState('')
  // Modal states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSubcategoryModal, setShowSubcategoryModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showSubCompanyModal, setShowSubCompanyModal] = useState(false);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [editingContactId, setEditingContactId] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showCompanyTypeModal, setShowCompanyTypeModal] = useState(false)
  const [showLeadSourceModal, setShowLeadSourceModal] = useState(false);
  const [showDirectSourceModal, setShowDirectSourceModal] = useState(false);
  const [showReferralTypeModal, setShowReferralTypeModal] = useState(false);
  const [leadStatuses, setLeadStatuses] = useState<any[]>([]);
  const employeeId = useSelector((state: RootState) => state.employee?.currentEmployee?.id);
  const [prefix, setPrefix] = useState('');
  const userId = useSelector((state: RootState) => state.auth.currentUser.id);
  const [currLeadData, setCurrLeadData] = useState<any>();
  const [filteredSubCompanies, setFilteredSubCompanies] = useState<any[]>([])
  const [referralSubCompanies, setReferralSubCompanies] = useState<{ [key: number]: any[] }>({})
  // Added: State for filtered contacts per team
  const [teamFilteredContacts, setTeamFilteredContacts] = useState<{ [key: number]: any[] }>({})
  // Added: State for filtered contacts per referral (for external referrals only)
  const [referralFilteredContacts, setReferralFilteredContacts] = useState<{ [key: number]: any[] }>({})
  // Added: State for internal referrals feature
  const [internalEmployees, setInternalEmployees] = useState<any[]>([]); // For internal reference dropdown
  const [companyOverview, setCompanyOverview] = useState<any[]>([]); // For company name readonly field
  // console.log("type:: ", leadTemplateId);

  // Smart search helper functions for address dropdowns (country, state, city)
  // These functions provide better search experience by prioritizing matches that start with user input
  // and handling case-insensitive search with special character support
  const normalizeString = (str: string): string => {
    if (!str) return '';
    // Convert to lowercase and remove diacritics/accents for better matching
    // This handles names like "São Paulo", "México", etc.
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .trim();
  };

  // Helper function to get match priority for sorting
  const getMatchPriority = (option: any, inputValue: string): number => {
    if (!inputValue || !inputValue.trim()) return 999; // No input, maintain original order

    const normalizedInput = normalizeString(inputValue.trim());
    const normalizedLabel = normalizeString(option.label || '');

    if (!normalizedLabel || !normalizedInput) return 999;

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

  // Smart filter function that works with react-select
  const createSmartFilter = (option: any, filterData: any) => {
    // Extract inputValue from the filter data object
    const inputValue = filterData?.inputValue || '';

    // Show all options if no input is provided
    if (!inputValue || !inputValue.trim()) return true;

    const priority = getMatchPriority(option, inputValue);
    return priority < 999; // Show only options that have a match
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

  // Smart sort function to maintain priority order
  const createSmartSort = (inputValue: string) => {
    return (optionA: any, optionB: any) => {
      if (!inputValue || !inputValue.trim()) {
        // No input - maintain alphabetical order
        return (optionA.label || '').localeCompare(optionB.label || '');
      }

      const priorityA = getMatchPriority(optionA, inputValue);
      const priorityB = getMatchPriority(optionB, inputValue);

      // First sort by priority (lower number = higher priority)
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      // Same priority - sort alphabetically within the same priority group
      return (optionA.label || '').localeCompare(optionB.label || '');
    };
  };

  // Enhanced decimal validation functions for COMMERCIALS section
  const validateDecimalInput = (value: string, maxValue: number = 10000000000): { isValid: boolean; errorMessage: string } => {
    if (!value || value === '') {
      return { isValid: true, errorMessage: '' };
    }

    // Allow empty string, just numbers, or valid decimal format
    const trimmedValue = value.trim();
    if (trimmedValue === '') {
      return { isValid: true, errorMessage: '' };
    }

    // Check if value is a valid number format (allows leading zeros, decimals, etc.)
    const numericValue = parseFloat(trimmedValue);
    if (isNaN(numericValue)) {
      return { isValid: false, errorMessage: 'Please enter a valid number' };
    }

    // Check if value exceeds maximum (100 Crores = 1,00,00,00,000)
    if (numericValue > maxValue) {
      return { isValid: false, errorMessage: 'Value cannot exceed 100 Crores' };
    }

    // Check decimal places (max 4) - improved regex to handle various formats
    const decimalRegex = /^(\d+\.?\d{0,4}|\.\d{1,4})$/;
    if (!decimalRegex.test(trimmedValue)) {
      return { isValid: false, errorMessage: 'Maximum 4 decimal places allowed' };
    }

    return { isValid: true, errorMessage: '' };
  };

  // Custom validation that works with TextInput component's validation mechanism
  const createValidationFunction = (maxValue: number = 10000000000) => {
    return (value: string): string => {
      const validation = validateDecimalInput(value, maxValue);
      return validation.isValid ? '' : validation.errorMessage;
    };
  };

  // Helper to validate calculated values and show warnings
  const validateCalculatedCost = (cost: number, setFieldError: Function, fieldPath: string): boolean => {
    if (cost > 10000000000) { // 100 Crores
      setFieldError(fieldPath, 'Calculated cost exceeds 100 Crores limit');
      return false;
    }
    setFieldError(fieldPath, '');
    return true;
  };

  // Enhanced TextInput component with decimal validation
  const EnhancedDecimalInput = ({
    formikField,
    label,
    isReadonly = false,
    onCalculatedCost = null
  }: {
    formikField: string,
    label: string,
    isReadonly?: boolean,
    onCalculatedCost?: ((value: number) => void) | null
  }) => {
    const [validationError, setValidationError] = useState<string>('');
    return (
      <div className="d-flex flex-column fv-row">
        <label className='d-flex align-items-center fs-6 form-label mb-2'>
          <span>{label}</span>
        </label>
        <Field name={formikField}>
          {({ field, form }: { field: any, form: any }) => {
            const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
              const inputValue = e.target.value;

              // Enhanced validation for decimal input with max 4 decimals and 100 Crore limit
              if (!isReadonly) {
                const validation = validateDecimalInput(inputValue, 10000000000);

                if (!validation.isValid) {
                  setValidationError(validation.errorMessage);
                  return; // Don't update field if validation fails
                } else {
                  setValidationError('');
                }
              }

              form.setFieldValue(field.name, inputValue);

              // Call callback if provided (for calculated cost)
              if (onCalculatedCost && !isReadonly) {
                const numericValue = parseFloat(inputValue) || 0;
                onCalculatedCost(numericValue);
              }
            };

            return (
              <>
                <input
                  {...field}
                  type="text"
                  className={`employee__form_wizard__input form-control ${validationError ? "is-invalid" : ""}`}
                  placeholder={label}
                  readOnly={isReadonly}
                  onChange={handleChange}
                />
                {validationError && (
                  <div className="text-danger mt-1 fs-7">
                    {validationError}
                  </div>
                )}
              </>
            );
          }}
        </Field>
        <HighlightErrors isRequired={false} formikField={formikField} />
      </div>
    );
  };

  // Helper function to build initial values for edit mode
  const buildInitialValues = (leadData: any) => {
    if (!leadData || !isEditMode) {
      // Return default values for new leads
      return {
        leadTemplateId,
        projectName: initialData.title || '',
        // Store available states and cities for each address row
        addressStatesOptions: {},  // Format: { rowIndex: [state objects] }
        addressCitiesOptions: {},  // Format: { rowIndex: [city objects] }
        // Store selected values
        addressStateSelections: {}, // Format: { rowIndex: { id, name, iso2 } }
        addressCitySelections: {}, // Format: { rowIndex: { id, name } }

        poNumber: '',
        poDate: '',
        poStatus: 'Pending',
        poFile: '',
        service: '',
        category: '',
        statusId: '', // Will be set to default status after statuses are loaded
        subCategory: '',
        // Multi-select arrays for new functionality
        serviceIds: [],
        categoryIds: [],
        subcategoryIds: [],
        startDate: '',
        endDate: '',
        rate: '',
        cost: '',
        description: '', // Empty by default
        // client details (single - keeping for backward compatibility):
        companyTypeId: '',
        subCompanyId: '',
        companyId: '',
        branchId: '',
        company: '',
        contactPerson: '',
        contactRoleId: '',
        cancellationReasonId: '', //new
        handledBy: '', //new
        handledByEntries: [], // new: array of {id, employeeId, handledDate}
        fileLocationCompanyType: '', //new
        fileLocationCompany: '', //new

        // client teams (multiple teams support):
        leadTeams: [{
          id: Date.now().toString(),
          companyTypeId: '',
          companyId: '',
          subCompanyId: '',
          contactId: ''
        }],
        // lead details:
        // Fixed: Respect initialFormData.leadInquiryDate if provided, otherwise auto-fill with today's date
        leadInquiryDate: initialFormData?.leadInquiryDate || new Date().toISOString().split('T')[0],
        leadAssignedTo: '',
        leadSourceType: 'DIRECT',
        leadDirectSource: '',
        referrals: [...referrals],
        source: '',
        fileLocation: '', // Added: File location field for lead documents/attachments
        documents: '', // Added: Field for uploaded document file paths

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

        // additional details
        // Additional fields for web-dev type
        ...(leadTemplateId?.toString() === leadAndProjectTemplateTypeId.webDev?.toString() && {
          type: '', // web-dev specific type
          numberOfPages: ''
        }),

        // Additional fields for mep type
        ...(leadTemplateId?.toString() === leadAndProjectTemplateTypeId.mep?.toString() && {
          projectAreas: [{
            label: '',
            projectArea: '',
            costType: '',
            rate: '',
            cost: ''
          }],
          addresses: [{
            projectAddress: initialData.projectAddress || '',
            zipCode: initialData.zipCode || '',
            mapLocation: initialData.mapLocation || '',
            latitude: initialData.latitude || '',
            longitude: initialData.longitude || '',
            country: initialData.country || '',
            state: initialData.state || '',
            city: initialData.city || '',
            locality: initialData.locality || '',
            googleMapLink: initialData.googleMapLink || '',
            googleMyBusinessLink: initialData.googleMyBusinessLink || '',
            isDefault: initialData.isDefault || false
          }],
          poNumber: '',
          poDate: '',
          useCalculatedAmount: true
        }),

        // status: 'new',
        budget: '',
        ...(initialData?.id && { leadTemplateId: initialData.id }),
        ...initialFormData
      };
    }

    // Build initial values from lead data for edit mode

    // Extract additional details - handle both array and single object formats
    const additionalDetailsArray = Array.isArray(leadData.additionalDetails)
      ? leadData.additionalDetails
      : leadData.additionalDetails
        ? [leadData.additionalDetails]
        : [];

    // For MEP projects, extract project areas from commercials array (new structure)
    const projectAreas = leadData.commercials
      ? leadData.commercials.map((commercial: any) => ({
        id: commercial.id, // Include ID for edit mode
        label: commercial.label || '',
        projectArea: commercial.area || '',
        costType: commercial.costType === "RATE" ? "1" : commercial.costType === "LUMPSUM" ? "2" : '',
        rate: commercial.rate || '',
        cost: commercial.cost || ''
      }))
      : additionalDetailsArray.map((detail: any) => ({
        // Fallback for legacy data that still has projectAreas in additionalDetails
        projectArea: detail.projectArea || '',
        costType: detail.costType || '',
        rate: detail.rate || '',
        cost: detail.cost || '',
        label: '' // Default empty label for legacy data
      }));

    // Handle addresses from single additionalDetails object (one-to-one relationship)
    const addresses = leadData.additionalDetails && !Array.isArray(leadData.additionalDetails)
      ? [{
        projectAddress: leadData.additionalDetails.projectAddress || '',
        zipCode: leadData.additionalDetails.zipCode || '',
        mapLocation: leadData.additionalDetails.mapLocation || '',
        latitude: leadData.additionalDetails.latitude || '',
        longitude: leadData.additionalDetails.longitude || '',
        // Store country/state/city names - will be converted to IDs in useEffect
        country: leadData.additionalDetails.country || '',
        state: leadData.additionalDetails.state || '',
        city: leadData.additionalDetails.city || '',
        locality: leadData.additionalDetails.locality || '',
        googleMapLink: leadData.additionalDetails.googleMapLink || '',
        googleMyBusinessLink: leadData.additionalDetails.googleMyBusinessLink || '',
        isDefault: false
      }]
      : additionalDetailsArray.length > 0
        ? additionalDetailsArray.map((detail: any) => ({
          projectAddress: detail.projectAddress || '',
          zipCode: detail.zipCode || '',
          mapLocation: detail.mapLocation || '',
          latitude: detail.latitude || '',
          longitude: detail.longitude || '',
          // Convert country name back to ID for form dropdown
          country: (() => {
            const countryName = detail.country;
            const foundCountry = countries.find(c => c.name === countryName);
            return foundCountry ? foundCountry.id : countryName;
          })(),
          // Convert state name back to ID for form dropdown  
          state: (() => {
            const stateName = detail.state;
            const foundState = states.find(s => s.name === stateName);
            return foundState ? foundState.id : stateName;
          })(),
          // Convert city name back to ID for form dropdown
          city: (() => {
            const cityName = detail.city;
            const foundCity = cities.find(c => c.name === cityName);
            return foundCity ? foundCity.id : cityName;
          })(),
          locality: detail.locality || '',
          googleMapLink: detail.googleMapLink || '',
          googleMyBusinessLink: detail.googleMyBusinessLink || '',
          isDefault: detail.isDefault || false
        }))
        : [{
          projectAddress: '',
          zipCode: '',
          mapLocation: '',
          latitude: '',
          longitude: '',
          country: '',
          state: '',
          city: '',
          locality: '',
          googleMapLink: '',
          googleMyBusinessLink: '',
          isDefault: false
        }];

    // Process referrals for edit mode
    const processedReferrals = leadData.referrals && leadData.referrals.length > 0
      ? leadData.referrals.map((ref: any) => {
        const companyId = ref.referringCompany?.id || ref.companyId || '';
        // Derive companyTypeId from the full Company object returned by backend (includes companyTypeId)
        const companyTypeId = ref.referringCompany?.companyTypeId || ref.referringCompanyTypeId || '';
        // For internal referrals, referredByEmployee.id is the employee's primary key (same as allEmployees.list[].employeeId)
        const referredByEmployeeId = ref.referredByEmployee?.id || ref.referredByEmployeeId || '';
        return {
          id: ref.id || Date.now().toString(),
          referralType: ref.referralType?.id || ref.leadReferralTypeId || '',
          referringCompanyType: companyTypeId,
          referringCompany: companyId,
          referringSubCompany: ref.referringSubCompany?.id || ref.subCompanyId || '',
          referringContact: ref.referredByContact?.id || ref.contactId || '',
          referredByEmployeeId: referredByEmployeeId,
          companyName: ref.companyName || ''
        };
      })
      : [{
        id: Date.now().toString(),
        referralType: '',
        referringCompanyType: '',
        referringCompany: '',
        referringSubCompany: '',
        referringContact: '',
        referredByEmployeeId: '',
        companyName: ''
      }];

    return {
      leadTemplateId: leadData.leadTemplateId || leadTemplateId,
      projectName: leadData.title || '',


      // Store available states and cities for each address row
      addressStatesOptions: {},
      addressCitiesOptions: {},
      addressStateSelections: {},
      addressCitySelections: {},
      // Map lead data fields to form fields
      service: leadData.projectService?.id || leadData.projectServiceId || '',
      category: leadData.projectCategory?.id || leadData.projectCategoryId || '',
      statusId: leadData.status?.id || leadData.statusId || '',
      cancellationReasonId: leadData?.cancellationReasonId || '', //new
      handledBy: leadData?.handledBy || '', //new
      handledByEntries: (() => {
        // Map from backend handledByEntries array
        if (leadData?.handledByEntries && Array.isArray(leadData.handledByEntries) && leadData.handledByEntries.length > 0) {
          return leadData.handledByEntries.map((entry: any) => ({
            id: entry.id || Date.now().toString(),
            employeeId: entry.employeeId || '',
            handledDate: entry.handledDate
              ? new Date(entry.handledDate).toISOString().split('T')[0]
              : new Date().toISOString().split('T')[0],
            handledOutDate: entry.handledOutDate
              ? new Date(entry.handledOutDate).toISOString().split('T')[0]
              : '',
          }));
        }
        return [];
      })(), //new
      fileLocationCompanyType: leadData.fileLocationCompanyType || '', //new
      fileLocationCompany: leadData.fileLocationCompany || '', //new
      subCategory: leadData.projectSubCategory?.id || leadData.projectSubCategoryId || '',

      // Multi-select arrays for new functionality
      serviceIds: (() => {
        // Handle multiple services from leadData.services array
        if (leadData.services && Array.isArray(leadData.services)) {
          return leadData.services.map((s: any) => s.service?.id || s.serviceId).filter(Boolean);
        }
        // Fallback to single service for backward compatibility
        const singleServiceId = leadData.projectService?.id || leadData.projectServiceId;
        return singleServiceId ? [singleServiceId] : [];
      })(),
      categoryIds: (() => {
        // Handle multi-select categories from junction table
        if (leadData.leadCategories && Array.isArray(leadData.leadCategories)) {
          return leadData.leadCategories.map((lc: any) => lc.category?.id || lc.categoryId).filter(Boolean);
        }
        // Fallback to single category for backward compatibility
        const categoryId = leadData.projectCategory?.id || leadData.projectCategoryId;
        return categoryId ? [categoryId] : [];
      })(),
      subcategoryIds: (() => {
        // Handle multi-select subcategories from junction table
        if (leadData.leadSubCategories && Array.isArray(leadData.leadSubCategories)) {
          return leadData.leadSubCategories.map((lsc: any) => lsc.subcategory?.id || lsc.subcategoryId).filter(Boolean);
        }
        // Fallback to single subcategory for backward compatibility
        const subcategoryId = leadData.projectSubCategory?.id || leadData.projectSubCategoryId;
        return subcategoryId ? [subcategoryId] : [];
      })(),
      startDate: leadData.startDate || '',
      endDate: leadData.endDate || '',
      rate: leadData.rate || '',
      cost: leadData.cost || '',
      description: leadData.description || '',
      budget: leadData.budget || '',
      // Client details (single - keeping for backward compatibility)
      companyTypeId: leadData.company?.companyType?.id || leadData.companyTypeId || '',
      subCompanyId: leadData.subCompany?.id || leadData.subCompanyId || '',
      companyId: leadData.company?.id || leadData.companyId || '',
      branchId: leadData.leadBranchMapping?.branch?.id || leadData.branchId || '',
      company: leadData.company?.companyName || '',
      contactPerson: leadData.contact?.fullName || '',
      contactPersonId: leadData.contact?.id || leadData.contactId || '',
      contactRoleId: leadData.contactRole?.id || leadData.contactRoleId || '',
      // Client teams (multiple teams support) - robust backward compatibility
      leadTeams: (() => {
        if (leadData.leadTeams && Array.isArray(leadData.leadTeams) && leadData.leadTeams.length > 0) {
          // If leadTeams exist in database, map them exactly as they are
          return leadData.leadTeams.map((team: any) => ({
            id: team.id || Date.now().toString(),
            companyTypeId: team.companyType?.id || team.companyTypeId || '',
            companyId: team.company?.id || team.companyId || '',
            subCompanyId: team.subCompany?.id || team.subCompanyId || '',
            contactId: team.contact?.id || team.contactId || ''
          }));
        } else {
          // For backward compatibility: if no leadTeams exist, create one based on legacy fields
          const legacyTeam = {
            id: Date.now().toString(),
            companyTypeId: leadData.company?.companyType?.id || leadData.companyTypeId || '',
            companyId: leadData.company?.id || leadData.companyId || '',
            subCompanyId: leadData.subCompany?.id || leadData.subCompanyId || '',
            contactId: leadData.contact?.id || leadData.contactId || ''
          };

          // If all fields are empty, provide a clean empty row
          if (!legacyTeam.companyTypeId && !legacyTeam.companyId && !legacyTeam.subCompanyId && !legacyTeam.contactId) {
            return [{
              id: Date.now().toString(),
              companyTypeId: '',
              companyId: '',
              subCompanyId: '',
              contactId: ''
            }];
          }

          return [legacyTeam];
        }
      })(),

      // Lead details
      // Fixed: Respect initialFormData.leadInquiryDate if provided, then leadData.inquiryDate, then default to today
      leadInquiryDate: initialFormData?.leadInquiryDate ||
        (leadData.inquiryDate ? new Date(leadData.inquiryDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
      leadAssignedTo: leadData.assignedTo?.id || leadData.assignedToId || '',
      leadSourceType: leadData.leadSourceType || 'DIRECT',
      leadDirectSource: leadData.leadDirectSource?.id || leadData.leadDirectSourceId || '',
      referrals: processedReferrals,
      source: leadData.source?.id || leadData.sourceId || '',
      fileLocation: leadData.fileLocation || '', // Added: File location field for edit mode
      documents: leadData.documents || '', // Added: Field for uploaded document file paths in edit mode

      // Project Detail fields (from additionalDetails)
      plotArea: leadData.additionalDetails?.plotArea || '',
      plotAreaUnit: leadData.additionalDetails?.plotAreaUnit || 'sqft',
      builtUpArea: leadData.additionalDetails?.builtUpArea || '',
      builtUpAreaUnit: leadData.additionalDetails?.builtUpAreaUnit || 'sqft',
      buildingDetail: leadData.additionalDetails?.buildingDetail || '',
      otherPoint1Heading: leadData.additionalDetails?.otherPoint1Heading || '',
      otherPoint1Description: leadData.additionalDetails?.otherPoint1Description || '',
      otherPoint2Heading: leadData.additionalDetails?.otherPoint2Heading || '',
      otherPoint2Description: leadData.additionalDetails?.otherPoint2Description || '',
      otherPoint3Heading: leadData.additionalDetails?.otherPoint3Heading || '',
      otherPoint3Description: leadData.additionalDetails?.otherPoint3Description || '',

      // Additional fields for web-dev type
      ...(leadTemplateId?.toString() === leadAndProjectTemplateTypeId.webDev?.toString() && {
        type: additionalDetailsArray[0]?.type || '',
        numberOfPages: additionalDetailsArray[0]?.numberOfPages || ''
      }),

      // Additional fields for mep type
      ...(leadTemplateId?.toString() === leadAndProjectTemplateTypeId.mep?.toString() && {
        projectAreas: projectAreas.length > 0 ? projectAreas : [{
          label: '',
          projectArea: '',
          costType: '',
          rate: '',
          cost: ''
        }],
        addresses: addresses.length > 0 ? addresses : [{
          projectAddress: '',
          zipCode: '',
          mapLocation: '',
          latitude: '',
          longitude: '',
          country: '',
          state: '',
          city: '',
          locality: '',
          googleMapLink: '',
          googleMyBusinessLink: '',
          isDefault: false
        }],
        poNumber: additionalDetailsArray[0]?.poNumber || '',
        poDate: additionalDetailsArray[0]?.poDate ? new Date(additionalDetailsArray[0].poDate).toISOString().split('T')[0] : '',
        useCalculatedAmount: true
      }),

      ...initialFormData,
      // PO fields: always use fresh data from currLeadData (API) — overrides stale initialFormData
      poNumber: additionalDetailsArray[0]?.poNumber || initialFormData?.poNumber || '',
      poDate: additionalDetailsArray[0]?.poDate
        ? new Date(additionalDetailsArray[0].poDate).toISOString().split('T')[0]
        : (initialFormData?.poDate || ''),
      poStatus: leadData?.poStatus || initialFormData?.poStatus || 'Pending',
      poFile: leadData?.poFile || initialFormData?.poFile || '',
    };
  };

  // Form initial values - memoized, rebuilds whenever lead data is fetched
  const initialValues = useMemo(() => {
    return buildInitialValues(currLeadData);
  }, [currLeadData, initialFormData?.id, isEditMode]);

  // console.log("Form initial values:", initialValues);

  // const formData = {
  //   // Project Details
  //   leadTemplateId: leadTemplateId, // or 'mep' or 'web-dev' based on the form type
  //   projectName: '',
  //   description: '',
  //   statusId: '',
  //   source: '',
  //   budget: '',
  //   company: '',
  //   contactPerson: '',
  //   leadSource: '',
  //   service: '',
  //   category: '',
  //   subCategory: '',
  //   startDate: '',
  //   endDate: '',
  //   rate: '',
  //   cost: '',
  //   companyId: '',
  //   branchId: '',
  //   contactRoleId: '',
  //   leadInquiryDate: '',
  //   leadAssignedTo: '',

  //   // Referrals (for blank type)
  //   referrals: [
  //     {
  //       id: '',
  //       referralType: '',
  //       referringCompany: '',
  //       referringContact: '',
  //       referredByContactId: ''
  //     }
  //   ],

  //   // Additional fields for web-dev type
  //   ...(leadTemplateId === leadAndProjectTemplateTypeId.webDev && {
  //     type: '', // web-dev specific type
  //     numberOfPages: ''
  //   }),

  //   // Additional fields for mep type
  //   ...(leadTemplateId === leadAndProjectTemplateTypeId.mep && {
  //     projectArea: '',
  //     projectAddress: '',
  //     zipCode: '',
  //     mapLocation: '',
  //     latitude: '',
  //     longitude: '',
  //     country: '',
  //     state: '',
  //     city: '',
  //     locality: '',
  //     poNumber: '',
  //     poDate: ''
  //   }),
  //   // Common additional fields
  //   // description: '' // Additional description field
  // };

  useEffect(() => {
    if (initialFormData?.id) {
      async function fetchLeadById() {
        const { data: { data } } = await getLeadById(initialFormData?.id);
        const leadData = data?.lead || {};
        setCurrLeadData(leadData);
        setPrefix(leadData?.prefix || '')

        // Force re-render to update initial values when lead data is loaded
        setRefetchData(prev => !prev);
      }
      fetchLeadById();
    }
    else {
      async function fetchPrefixSettings() {
        const { data: { prefixSettings } } = await fetchAllPrefixSettings();
        const currentPrefix = prefixSettings.find((prefix: any) => prefix.identifier == prefixIdentifier.LEAD);
        if (Object.keys(currentPrefix)?.length) {
          // Get current leads count
          const { data: { count } } = await getAllLeadsCountIncludingDeleted();
          // Generate prefix: prefix/year/count format
          const formattedYear = convertFiscalYearToYearFormat(currentPrefix.year);
          const generatedPrefix = `${currentPrefix.prefix}/${formattedYear}/${count + 1}`;
          // data.prefix = generatedPrefix;
          setPrefix(generatedPrefix);
        }
      }
      fetchPrefixSettings();
    }
  }, [initialFormData?.id])
  // Validation schema - Only project name and status are required
  const validationSchema = Yup.object().shape({
    projectName: Yup.string().required("Lead name is required"),
    statusId: Yup.string().required("Status is required"),
    description: Yup.string(),
    fileLocation: Yup.string().max(250, "File location cannot exceed 250 characters"), // Added: File location validation
    // Multi-select arrays validation
    serviceIds: Yup.array().of(Yup.string().uuid("Invalid service ID")).optional(),
    categoryIds: Yup.array().of(Yup.string().uuid("Invalid category ID")).optional(),
    subcategoryIds: Yup.array().of(Yup.string().uuid("Invalid subcategory ID")).optional(),
    // All other fields are optional
    ...(leadTemplateId?.toString() === leadAndProjectTemplateTypeId.mep?.toString() && {
      projectAreas: Yup.array().of(
        Yup.object().shape({
          label: Yup.string().optional(), // Label is optional
          projectArea: Yup.string(),
          costType: Yup.string(),
          rate: Yup.string(),
          cost: Yup.string()
        })
      ),
      addresses: Yup.array().of(
        Yup.object().shape({
          // projectAddress: Yup.string().required("Address is required"),
          projectAddress: Yup.string(),
          country: Yup.string(),
          state: Yup.string(),
          city: Yup.string(),
          zipCode: Yup.string(),
          locality: Yup.string(),
          googleMapLink: Yup.string(),
          googleMyBusinessLink: Yup.string(),
          latitude: Yup.string(),
          longitude: Yup.string(),
        })
      ),
    }),
  });
  // fetching all the details:
  // Fetch functionsadd an add new button 
  const fetchProjectCategories = useCallback(async () => {
    // if (categories.length > 0) return categories;
    try {
      const response = await getAllProjectCategories();
      const data = response?.projectCategories || [];
      setCategories(data);
      return data;
    } catch (error) {
      console.error("Error fetching categories:", error);
      return [];
    }
  }, []);

  const fetchAllLeadReferralTypes = useCallback(async () => {
    // if (referralTypes.length > 0) return referralTypes;
    try {
      const response = await getAllLeadReferralType();
      // console.log("responsegetAllLeadReferralType:: ", response);
      const data = response?.leadReferralTypes || [];
      setReferralTypes(data);
      return data;
    } catch (error) {
      console.error("Error fetching referral types:", error);
      return [];
    }
  }, []);

  const fetchAllLeadDirectSources = useCallback(async () => {
    try {
      const response = await getAllLeadDirectSource();
      const data = response?.leadDirectSources || [];
      setLeadDirectSources(data);
      return data;
    } catch (error) {
      console.error("Error fetching lead direct sources:", error);
      return [];
    }
  }, []);

  const fetchProjectSubcategories = useCallback(async () => {
    // if (subcategories.length > 0) return subcategories;
    try {
      const response = await getAllProjectSubcategories();
      const data = response?.projectSubCategories || [];
      setSubcategories(data);
      return data;
    } catch (error) {
      console.error("Error fetching subcategories:", error);
      return [];
    }
  }, []);

  const fetchProjectServices = useCallback(async () => {
    // if (services.length > 0) return services;
    try {
      const response = await getAllProjectServices();
      const data = response?.services || [];
      // console.log("Services data with colors:", data.map(s => ({id: s.id, name: s.name, color: s.color})));
      setServices(data);
      return data;
    } catch (error) {
      console.error("Error fetching services:", error);
      return [];
    }
  }, []);

  const fetchCompanies = useCallback(async () => {
    // if (companies.length > 0) return companies;
    try {
      const response = await getAllClientCompanies();
      const data = response?.data?.companies || [];
      setCompanies(data);
      setFilteredCompanies(data)
      return data;
    } catch (error) {
      // console.error("❌ Error fetching companies:", error);
      return [];
    }
  }, []);

  const fetchBranches = useCallback(async () => {
    // if (branches.length > 0) return branches;
    try {
      const response = await getAllClientBranches();
      const data = response?.data?.leadBranches || [];
      setBranches(data);
      return data;
    } catch (error) {
      console.error("Error fetching branches:", error);
      return [];
    }
  }, []);

  const fetchContacts = useCallback(async () => {
    // if (contacts.length > 0) return contacts;
    try {
      const response = await getAllClientContacts();
      const data = response?.data?.contacts || [];
      setContacts(data);
      return data;
    } catch (error) {
      console.error("Error fetching contacts:", error);
      return [];
    }
  }, []);

  const fetchProjectStatuses = useCallback(async () => {
    // if (statuses.length > 0) return statuses;
    try {
      const response = await getAllProjectStatuses();
      const data = response?.projectStatuses || [];
      setStatuses(data);
      return data;
    } catch (error) {
      console.error("Error fetching project statuses:", error);
      return [];
    }
  }, []);

  const fetchTeams = useCallback(async () => {
    // if (teams.length > 0) return teams;
    try {
      const response = await getAllTeams(1, 9999); // Get all teams for dropdown
      const data = response?.data?.teams || [];
      setTeams(data);
      return data;
    } catch (error) {
      console.error("Error fetching teams:", error);
      return [];
    }
  }, []);

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
  }, []);

  const fetchLeadStatuses = useCallback(async () => {
    try {
      const response = await getAllLeadStatus();
      const data = response?.leadStatuses || [];

      setLeadStatuses(data);

      // Set default status if form doesn't have a status value
      if (formikRef.current && data.length > 0) {
        const currentStatusValue = formikRef.current.values.statusId;

        // Only set default if no status is currently selected
        if (!currentStatusValue) {
          const defaultStatus = data.find((status: any) => status.isDefault === true);
          if (defaultStatus) {
            formikRef.current.setFieldValue('statusId', defaultStatus.id);
          }
        }
      }
      return data;
    } catch (error) {
      console.error("Error fetching lead statuses:", error);
      return [];
    }
  }, []);

  // Added: Fetch functions for internal referrals feature
  const fetchEmployees = useCallback(async () => {
    try {
      const response = await fetchAllEmployees();
      const data = response?.data?.employees || [];
      setInternalEmployees(data);
      return data;
    } catch (error) {
      console.error("Error fetching employees:", error);
      return [];
    }
  }, []);

  const fetchCompanyOverviewData = useCallback(async () => {
    try {
      const response = await fetchCompanyOverview();
      const data = response?.data?.companyOverview || [];
      setCompanyOverview(data);
      return data;
    } catch (error) {
      console.error("Error fetching company overview:", error);
      return [];
    }
  }, []);

  // Added: Fetch contacts by company ID for team filtering
  const fetchContactsByCompanyId = useCallback(async (companyId: string, teamIndex: number) => {
    try {
      if (!companyId) {
        // Clear contacts for this team if no company selected
        setTeamFilteredContacts(prev => ({ ...prev, [teamIndex]: [] }));
        return [];
      }

      const response = await getClientContactsByCompanyId(companyId);
      const data = response?.data?.contacts || [];

      // Update contacts for this specific team
      setTeamFilteredContacts(prev => ({ ...prev, [teamIndex]: data }));
      return data;
    } catch (error) {
      console.error("Error fetching contacts for company:", error);
      // Set empty array on error
      setTeamFilteredContacts(prev => ({ ...prev, [teamIndex]: [] }));
      return [];
    }
  }, []);

  // Added: Fetch contacts by company ID for referral filtering (external referrals only)
  const fetchContactsByCompanyIdForReferral = useCallback(async (companyId: string, referralIndex: number) => {
    try {
      if (!companyId) {
        // Clear contacts for this referral if no company selected
        setReferralFilteredContacts(prev => ({ ...prev, [referralIndex]: [] }));
        return [];
      }

      const response = await getClientContactsByCompanyId(companyId);
      const data = response?.data?.contacts || [];

      // Update contacts for this specific referral
      setReferralFilteredContacts(prev => ({ ...prev, [referralIndex]: data }));
      return data;
    } catch (error) {
      console.error("Error fetching contacts for referral company:", error);
      // Set empty array on error
      setReferralFilteredContacts(prev => ({ ...prev, [referralIndex]: [] }));
      return [];
    }
  }, []);

  // Added: Helper function to check if referral type is internal
  const isInternalReferralType = useCallback((referralTypeId: string): boolean => {
    const referralType = referralTypes.find(type => type.id === referralTypeId);
    // Check by isInternal flag OR by name (case-insensitive) as fallback
    return referralType?.isInternal === true || referralType?.name?.toLowerCase().trim() === 'internal';
  }, [referralTypes]);

  // Added: Helper function to check if there's a default status
  const hasDefaultStatus = (): boolean => {
    if (!leadStatuses || leadStatuses.length === 0) {
      return false;
    }
    return leadStatuses.some((status: any) => status.isDefault === true);
  };

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
      // formikProps.setFieldError('documents', 'File size should not exceed 5 MB');
      event.target.value = ""; // Clear the input
      return;
    }

    if (files && files.length > 0) {
      const form = new FormData();
      form.append("file", files[0]);
      try {
        const {
          data: { path },
        } = await uploadUserAsset(form, userId, "leads");
        formikProps.setFieldValue("documents", path, true);
      } catch (error) {
        console.error("Failed to upload file. Please try again.");
      }
    }
  };

  // Address location management functions
  const handleAddressCountryChange = useCallback(async (index: number, countryId: string, setFieldValue: Function) => {
    try {
      const selectedCountry = countries.find((c) => c.id === countryId);
      if (!selectedCountry) {
        console.error('Selected country not found:', countryId);
        return;
      }

      // Update the country in addresses
      setFieldValue('addresses.0.country', countryId);

      // Clear dependent fields
      setFieldValue('addresses.0.state', '');
      setFieldValue('addresses.0.city', '');
      setFieldValue('addressStateSelections.0', null);
      setFieldValue('addressCitySelections.0', null);
      // Clear city options for this row
      setFieldValue(`addressCitiesOptions.${index}`, []);

      // Fetch and set states for this country
      const states = await fetchAllStates(selectedCountry.iso2);
      setFieldValue('addressStatesOptions.0', states);

    } catch (error) {
      console.error('Error in handleAddressCountryChange:', error);
      setFieldValue(`addressStatesOptions.${index}`, []);
      setFieldValue(`addressCitiesOptions.${index}`, []);
    }
  }, [countries]);

  const handleAddressStateChange = useCallback(async (index: number, stateId: string, countryId: string, setFieldValue: Function) => {
    try {
      const selectedCountry = countries.find((c) => c.id === countryId);
      const states = formikRef.current?.values.addressStatesOptions?.[index] || [];
      const selectedState = states.find((s: any) => s.id === stateId);

      if (!selectedCountry || !selectedState) {
        console.error('Country or state not found:', { countryId, stateId });
        return;
      }

      // Update the state in addresses and selections
      setFieldValue('addresses.0.state', stateId);
      setFieldValue('addressStateSelections.0', selectedState);

      // Clear city values
      setFieldValue('addresses.0.city', '');
      setFieldValue('addressCitySelections.0', null);

      // Fetch and set cities for this state
      const cities = await fetchAllCities(selectedCountry.iso2, selectedState.iso2);
      setFieldValue(`addressCitiesOptions.${index}`, cities);

    } catch (error) {
      console.error('Error in handleAddressStateChange:', error);
      setFieldValue(`addressCitiesOptions.${index}`, []);
    }
  }, [countries]);

  const viewLocation = useCallback((latitude: string, longitude: string) => {
    if (latitude && longitude) {
      const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
      window.open(googleMapsUrl, '_blank');
    } else {
      errorConfirmation("Please enter latitude and longitude first");
    }
  }, []);

  // Modal close handlers - placed after fetch functions to avoid hoisting issues
  const handleCategoryModalClose = useCallback(async () => {
    setShowCategoryModal(false);
    await fetchProjectCategories();
  }, [fetchProjectCategories]);

  const handleSubcategoryModalClose = useCallback(async () => {
    setShowSubcategoryModal(false);
    await fetchProjectSubcategories();
  }, [fetchProjectSubcategories]);

  const handleServiceModalClose = useCallback(async () => {
    setShowServiceModal(false);
    await fetchProjectServices();
  }, [fetchProjectServices]);

  const handleCompanyModalClose = useCallback(async () => {
    setShowCompanyModal(false);
    await fetchCompanies();
  }, [fetchCompanies]);

  const handleSubCompanyModalClose = useCallback(async () => {
    setShowSubCompanyModal(false);
    await fetchCompanies();
  }, [fetchCompanies]);

  const handleBranchModalClose = useCallback(async () => {
    setShowBranchModal(false);
    await fetchBranches();
  }, [fetchBranches]);

  const handleContactModalClose = useCallback(async () => {
    setShowContactModal(false);
    await fetchContacts();
    // Added: Refresh team-specific filtered contacts for all teams that have a company selected
    if (formikRef.current?.values?.leadTeams) {
      const leadTeams = formikRef.current.values.leadTeams;
      for (let index = 0; index < leadTeams.length; index++) {
        const team = leadTeams[index];
        if (team.companyId) {
          // Refresh contacts for this team
          await fetchContactsByCompanyId(team.companyId, index);
        }
      }
    }
    // Added: Refresh referral-specific filtered contacts for all referrals that have a company selected (external referrals only)
    if (formikRef.current?.values?.referrals) {
      const referrals = formikRef.current.values.referrals;
      for (let index = 0; index < referrals.length; index++) {
        const referral = referrals[index];
        const referralTypeId = referral.referralType;
        // Only refresh for external referrals (same condition as in the main logic)
        if (!isInternalReferralType(referralTypeId) && referral.referringCompany) {
          // Refresh contacts for this referral
          await fetchContactsByCompanyIdForReferral(referral.referringCompany, index);
        }
      }
    }
  }, [fetchContacts, fetchContactsByCompanyId, fetchContactsByCompanyIdForReferral, isInternalReferralType]);

  const handleDirectSourceModalClose = useCallback(async () => {
    setShowDirectSourceModal(false);
    await fetchAllLeadReferralTypes();
  }, [fetchAllLeadReferralTypes]);

  const handleStatusModalClose = useCallback(async () => {
    setShowStatusModal(false);
    await fetchLeadStatuses();
    await fetchLeadCancellationReasons(); //new
  }, [fetchLeadStatuses, fetchLeadCancellationReasons]);

  const handleReferralTypeModalClose = useCallback(async () => {
    setShowReferralTypeModal(false);
    await fetchAllLeadReferralTypes();
  }, [fetchAllLeadReferralTypes]);

  // Load all initial data
  const loadAllData = useCallback(async () => {


    setIsInitialLoading(true);
    try {
      await Promise.all([
        fetchProjectCategories(),
        fetchProjectSubcategories(),
        fetchProjectServices(),
        fetchCompanies(),
        fetchBranches(),
        fetchContacts(),
        fetchProjectStatuses(),
        fetchTeams(),
        fetchCountries(),
        fetchAllLeadReferralTypes(),
        fetchAllLeadDirectSources(),
        fetchLeadStatuses(),
        fetchEmployees(), // Added: For internal referrals
        fetchCompanyOverviewData(), // Added: For internal referrals
        fetchLeadCancellationReasons() //new
      ]);

      setDataLoaded(true);
    } catch (error) {
      console.error("Error loading initial data:", error);
    } finally {
      setIsInitialLoading(false);
    }
  }, [
    fetchProjectCategories,
    fetchProjectSubcategories,
    fetchProjectServices,
    fetchCompanies,
    fetchBranches,
    fetchContacts,
    fetchProjectStatuses,
    fetchTeams,
    fetchCountries,
    fetchAllLeadReferralTypes,
    fetchAllLeadDirectSources,
    fetchLeadStatuses,
    fetchLeadCancellationReasons //new
  ]);

  //new
  useEffect(() => {
    fetchLeadCancellationReasons();
  }, [showStatusModal]); // Or, [open]

  useEffect(() => {
    const loadInitialData = async () => {
      await loadAllData();
      dispatch(loadAllEmployeesIfNeeded());
    };

    loadInitialData();
  }, [refetchData]);

  useEffect(() => {
    async function fetchAndSetCompanyType() {
      const { companyTypes } = await getAllCompanyTypes()

      setAllCompanyTypes(companyTypes)
    }
    fetchAndSetCompanyType()
  }, [showCompanyTypeModal])

  // This effect runs when countries array is populated and we have initialFormData
  // to load states and cities for edit mode
  useEffect(() => {
    const loadLocationData = async () => {
      if (initialFormData?.country && countries.length > 0) {
        console.log("Loading country/state/city data for IDs:", {
          country: initialFormData.country,
          state: initialFormData.state,
          city: initialFormData.city
        });

        const country = countries.find((c: any) => c.id == initialFormData.country || String(c.id) === initialFormData.country);

        if (country) {
          // Set the country in formik with the proper format for the dropdown
          if (formikRef.current) {
            formikRef.current.setFieldValue('country', country.id);
          }

          const stateData = await fetchAllStates(country.iso2);
          setStates(stateData);

          if (initialFormData?.state) {
            const state = stateData.find((s: any) => s.id == initialFormData.state || String(s.id) === initialFormData.state);
            if (state) {
              // Set the state in formik with the proper format for the dropdown
              if (formikRef.current) {
                formikRef.current.setFieldValue('state', state.id);
              }

              const cityData = await fetchAllCities(country.iso2, state.iso2);
              setCities(cityData);

              if (initialFormData?.city) {
                const city = cityData.find((c: any) => c.id == initialFormData.city || String(c.id) === initialFormData.city);
                if (city && formikRef.current) {
                  formikRef.current.setFieldValue('city', city.id);
                }
              }

            }
          }
        }
      }
    };

    loadLocationData();
  }, [countries, initialFormData]);

  // Note: Referral population for edit mode is now handled in buildInitialValues function
  // Added: Effect to populate filtered companies and sub-companies for edit mode
  useEffect(() => {
    if (isEditMode && currLeadData && companies.length > 0 && allCompanyTypes.length > 0) {
      const companyTypeId = currLeadData.company?.companyType?.id || currLeadData.companyTypeId;
      const companyId = currLeadData.company?.id || currLeadData.companyId;
      if (companyTypeId) {
        setCurrCompanyTypeId(companyTypeId);
        const filteredCompanies = companies?.filter(ele => ele?.companyTypeId == companyTypeId);
        setFilteredCompanies(filteredCompanies);
        if (companyId) {
          setSelectedCompany(true); // Enable dependent dropdowns
          const companyData = filteredCompanies?.find(ele => ele?.id == companyId);
          if (companyData?.subCompanies) {
            setFilteredSubCompanies(companyData.subCompanies);
          }
        }
      }
    }
  }, [isEditMode, currLeadData, companies, allCompanyTypes]);
  // Added: Effect to populate referral sub-companies for edit mode
  useEffect(() => {
    if (isEditMode && currLeadData?.referrals && companies.length > 0) {
      currLeadData.referrals.forEach(async (ref: any, index: number) => {
        const referringCompanyId = ref.referringCompany?.id || ref.companyId;
        if (referringCompanyId) {
          try {
            const response = await fetchSubCompaniesByMainCompanyId(referringCompanyId);
            const subCompanyData = response?.data?.subCompanies || response?.subCompanies || [];
            setReferralSubCompanies(prev => ({ ...prev, [index]: subCompanyData }));
          } catch (error) {
            console.error('Error fetching sub companies for referral:', error);
          }
        }
      });
    }
  }, [isEditMode, currLeadData?.referrals, companies]);

  // Added: Effect to restore referringCompanyType from company data for external referrals in edit mode
  useEffect(() => {
    if (isEditMode && currLeadData?.referrals && companies.length > 0 && formikRef.current) {
      currLeadData.referrals.forEach((ref: any, index: number) => {
        const companyTypeId = ref.referringCompany?.companyTypeId || '';
        if (companyTypeId) {
          // Set the referringCompanyType in formik so the company type dropdown shows the correct value
          formikRef.current.setFieldValue(`referrals[${index}].referringCompanyType`, companyTypeId);
        }
      });
    }
  }, [isEditMode, currLeadData?.referrals, companies.length, formikRef.current?.values?.referrals?.length]);

  // Added: Effect to populate address location data for edit mode
  useEffect(() => {
    const loadAddressLocationData = async () => {
      if (isEditMode && currLeadData && countries.length > 0 && formikRef.current && leadTemplateId === leadAndProjectTemplateTypeId.mep) {

        // Get the address data from additionalDetails
        const additionalDetails = currLeadData.additionalDetails;
        if (!additionalDetails) return;

        const addressIndex = 0; // Since we're using single address object now

        // Load country data
        const countryName = additionalDetails.country;
        if (countryName) {
          const foundCountry = countries.find(c => c.name === countryName);
          if (foundCountry) {

            // Set country in addresses array
            formikRef.current.setFieldValue(`addresses.${addressIndex}.country`, foundCountry.id);

            // Load states for this country
            try {
              const statesData = await fetchAllStates(foundCountry.iso2);
              formikRef.current.setFieldValue(`addressStatesOptions.${addressIndex}`, statesData);

              // Load state data
              const stateName = additionalDetails.state;
              if (stateName) {
                const foundState = statesData.find((s: any) => s.name === stateName);
                if (foundState) {

                  // Set state in addresses array and selections
                  formikRef.current.setFieldValue(`addresses.${addressIndex}.state`, foundState.id);
                  formikRef.current.setFieldValue(`addressStateSelections.${addressIndex}`, foundState);

                  // Load cities for this state
                  try {
                    const citiesData = await fetchAllCities(foundCountry.iso2, foundState.iso2);
                    formikRef.current.setFieldValue(`addressCitiesOptions.${addressIndex}`, citiesData);

                    // Load city data
                    const cityName = additionalDetails.city;
                    if (cityName) {
                      const foundCity = citiesData.find((c: any) => c.name === cityName);
                      if (foundCity) {

                        // Set city in addresses array and selections
                        formikRef.current.setFieldValue(`addresses.${addressIndex}.city`, foundCity.id);
                        formikRef.current.setFieldValue(`addressCitySelections.${addressIndex}`, foundCity);
                      }
                    }
                  } catch (error) {
                    console.error('Error loading cities for address:', error);
                  }
                }
              }
            } catch (error) {
              console.error('Error loading states for address:', error);
            }
          }
        }
      }
    };

    loadAddressLocationData();
  }, [isEditMode, currLeadData, countries, leadTemplateId]);

  // Added: Effect to populate filtered contacts for each team in edit mode
  useEffect(() => {
    if (isEditMode && currLeadData?.leadTeams && companies.length > 0) {
      currLeadData.leadTeams.forEach(async (team: any, index: number) => {
        const companyId = team.company?.id || team.companyId;
        if (companyId) {
          try {
            // Fetch contacts for this company and populate the team's filtered contacts
            const response = await getClientContactsByCompanyId(companyId);
            const data = response?.data?.contacts || [];
            setTeamFilteredContacts(prev => ({ ...prev, [index]: data }));
          } catch (error) {
            console.error(`Error fetching contacts for team ${index}:`, error);
            setTeamFilteredContacts(prev => ({ ...prev, [index]: [] }));
          }
        }
      });
    }
  }, [isEditMode, currLeadData?.leadTeams, companies.length]);

  // Added: Effect to populate filtered contacts for each referral in edit mode (external referrals only)
  useEffect(() => {
    if (isEditMode && currLeadData?.referrals && companies.length > 0 && referralTypes.length > 0) {
      currLeadData.referrals.forEach(async (referral: any, index: number) => {
        // Only fetch contacts for external referrals
        const referralTypeId = referral.referralType?.id || referral.leadReferralTypeId;
        const referralType = referralTypes.find(type => type.id === referralTypeId);
        const isInternal = referralType?.isInternal === true || referralType?.name?.toLowerCase().trim() === 'internal';

        if (!isInternal) {
          const companyId = referral.referringCompany?.id || referral.companyId;
          if (companyId) {
            try {
              // Fetch contacts for this company and populate the referral's filtered contacts
              const response = await getClientContactsByCompanyId(companyId);
              const data = response?.data?.contacts || [];
              setReferralFilteredContacts(prev => ({ ...prev, [index]: data }));
            } catch (error) {
              console.error(`Error fetching contacts for referral ${index}:`, error);
              setReferralFilteredContacts(prev => ({ ...prev, [index]: [] }));
            }
          }
        }
      });
    }
  }, [isEditMode, currLeadData?.referrals, companies.length, referralTypes.length]);

  // const handleSubmit = (values: any) => {

  //   onSubmit(values);
  // };

  const handleSubmit = async (formData: any) => {

    const values = formData;
    // Handle addresses from both form structure and direct payload
    let allAddressDetails = formData?.addresses || formData?.additionalDetails?.addresses || [];

    // No need to clean up address fields - Google links are now valid and handled by backend

    // console.log("createdById:: ", createdById);

    if (!createdById) {
      return;
    };
    const additionalDetailsFields = [
      ...(leadTemplateId === leadAndProjectTemplateTypeId.mep ? [
        "projectArea",
        "addresses"] :
        [
          "type",
          "numberOfPages"
        ])
    ];

    const selectedCountryData = countries.find(
      (c) => c.id === formData.country
    );
    const selectedStateData = states.find((s) => s.id === formData.state);
    const selectedCityData = cities.find((c) => c.id === formData.city);

    // Extract additionalDetails from formData
    const additionalDetails: Record<string, any> = {};

    // Add other additional details
    additionalDetailsFields.forEach(field => {
      if (formData[field] !== undefined && formData[field] !== "") {
        if (field === "poDate") {
          const dateValue = new Date(formData[field]);
          if (!isNaN(dateValue.getTime())) {
            additionalDetails[field] = dateValue.toISOString();
          }
        } else if (field === "projectArea") {
          // Project areas will be handled separately
          return;
        } else if (field !== "addresses") { // Skip addresses as we handled them above
          additionalDetails[field] = formData[field];
        }
        delete formData[field];
      }
      else if (formData[field] == undefined || formData[field] == "" || formData[field] == null) {
        delete formData[field];
      }
    });

    const mappedReferrals = formData?.referrals?.map((ref: any) => {
      // For internal referrals, don't send a fake companyId - only send referredByEmployeeId
      const isInternal = ref.referredByEmployeeId && ref.referredByEmployeeId !== '';
      // Only send companyId if it looks like a real UUID (not the fake 'wisetech-mep' display string)
      const companyId = ref.referringCompany && ref.referringCompany !== 'wisetech-mep' ? ref.referringCompany : undefined;
      return {
        leadReferralTypeId: ref.referralType,
        companyId: isInternal ? undefined : companyId,
        subCompanyId: isInternal ? undefined : (ref.referringSubCompany || undefined),
        contactId: isInternal ? undefined : (ref.referringContact || undefined),
        referredByEmployeeId: ref.referredByEmployeeId || undefined,
        companyName: ref.companyName || undefined,
      };
    }) || [];

    // Added: Map leadTeams for multiple team entries
    const mappedLeadTeams = formData?.leadTeams?.map((team: any) => ({
      companyTypeId: team.companyTypeId,
      companyId: team.companyId,
      subCompanyId: team.subCompanyId,
      contactId: team.contactId,
    }))?.filter((team: any) => team.companyTypeId || team.companyId || team.subCompanyId || team.contactId) || [];

    // Map and clean addresses - handle both IDs and string values
    const mappedAddresses = allAddressDetails?.map((address: any, index: number) => {
      let countryName = address.country || "";
      let stateName = address.state || "";
      let cityName = address.city || "";

      // If country is an ID, convert to name, otherwise use as string
      if (address.country) {
        const selectedCountry = countries.find((c) => c.id === address.country);
        if (selectedCountry) {
          countryName = selectedCountry.name;
        } else {
          // If not found by ID, assume it's already a string name
          countryName = address.country;
        }
      }

      // If state is an ID, convert to name, otherwise use as string
      if (address.state) {
        const addressIndex = allAddressDetails.indexOf(address);
        const statesOptions = values.addressStatesOptions?.[addressIndex] || [];
        const selectedState = statesOptions.find((s: any) => s.id === address.state);
        if (selectedState) {
          stateName = selectedState.name;
        } else {
          // If not found by ID, assume it's already a string name
          stateName = address.state;
        }
      }

      // If city is an ID, convert to name, otherwise use as string
      if (address.city) {
        const addressIndex = allAddressDetails.indexOf(address);
        const citiesOptions = values.addressCitiesOptions?.[addressIndex] || [];
        const selectedCity = citiesOptions.find((c: any) => c.id === address.city);
        if (selectedCity) {
          cityName = selectedCity.name;
        } else {
          // If not found by ID, assume it's already a string name
          cityName = address.city;
        }
      }

      // Include additional details ID for upsert operations in edit mode
      const additionalDetailsId = isEditMode && currLeadData?.additionalDetails?.[index]?.id
        ? currLeadData.additionalDetails[index].id
        : undefined;

      return {
        ...(additionalDetailsId && { id: additionalDetailsId }),
        projectAddress: address.projectAddress || "",
        country: countryName,
        state: stateName,
        city: cityName,
        zipCode: address.zipCode || "",
        mapLocation: address.mapLocation || "",
        latitude: address.latitude || "",
        longitude: address.longitude || "",
        locality: address.locality || "",
        googleMapLink: address.googleMapLink || "", // Added: Google Map Link
        googleMyBusinessLink: address.googleMyBusinessLink || "", // Added: Google My Business Link
        isDefault: !!address.isDefault
      };
    }) || [];


    const finalData = {
      ...formData,
      ...(isEditMode ? {} : { createdById: createdById }),
      leadTemplateId: formData.leadTemplateId,
      title: formData.title || formData.projectName,
      statusId: formData.statusId,
      // Comment: Removed projectAreas from additionalDetails - moved to separate commercials array
      // projectAreas: (formData.projectAreas || formData.additionalDetails?.projectAreas || [])?.map((area: any, index: number) => {
      //     // Include additional details ID for upsert operations in edit mode
      //     const additionalDetailsId = isEditMode && currLeadData?.additionalDetails?.[index]?.id 
      //       ? currLeadData.additionalDetails[index].id 
      //       : undefined;
      //     
      //     return {
      //         ...(additionalDetailsId && { id: additionalDetailsId }),
      //         projectArea: Number(area.projectArea),
      //         costType: area.costType,
      //         rate: Number(area.rate),
      //         cost: area.cost
      //     };
      // }) || [],

      // Added: Commercials array for new LeadCommercial table
      commercials: (formData.projectAreas || [])?.filter((area: any) =>
        // Include areas that have meaningful data (area, rate, or cost) or an explicit label
        area.projectArea || area.rate || area.cost || (area.label && area.label.trim())
      ).map((area: any) => ({
        ...(isEditMode && area.id && { id: area.id }), // Include ID for edit mode
        label: area.label ? area.label.trim() : '', // Allow empty labels
        area: area.projectArea ? Number(area.projectArea) : null,
        costType: area.costType === "1" ? "RATE" : area.costType === "2" ? "LUMPSUM" : area.costType || "RATE",
        rate: area.rate ? Number(area.rate) : null,
        cost: area.cost ? Number(area.cost) : null
      })) || [],
      // Handle multi-select arrays (always include arrays, even if empty, to ensure proper clearing)
      ...(formData?.serviceIds && Array.isArray(formData.serviceIds)
        ? { serviceIds: formData.serviceIds }
        : formData?.service
          ? { projectServiceId: formData?.service }
          : {}),
      ...(formData?.categoryIds && Array.isArray(formData.categoryIds)
        ? { categoryIds: formData.categoryIds }
        : formData?.category
          ? { projectCategoryId: formData?.category }
          : {}),
      ...(formData?.subcategoryIds && Array.isArray(formData.subcategoryIds)
        ? { subcategoryIds: formData.subcategoryIds }
        : formData?.subCategory
          ? { projectSubCategoryId: formData?.subCategory }
          : {}),
      ...(formData?.cancellationReasonId && { cancellationReasonId: formData?.cancellationReasonId }), //new
      ...(formData?.handledBy && { handledBy: formData?.handledBy }), //new
      // handledByEntries: map and include all entries
      handledByEntries: (formData?.handledByEntries || [])
        .filter((entry: any) => entry.employeeId)
        .map((entry: any) => ({
          employeeId: entry.employeeId,
          handledDate: entry.handledDate || new Date().toISOString().split('T')[0],
          handledOutDate: entry.handledOutDate || null,
        })),

      // Keep existing fields for backward compatibility
      ...(formData?.contactPersonId && { contactId: formData?.contactPersonId }),
      ...(formData?.startDate && { startDate: formData?.startDate }),
      ...(formData?.endDate && { endDate: formData?.endDate }),
      ...(formData?.leadInquiryDate && { inquiryDate: formData?.leadInquiryDate }),
      ...(formData?.subCompanyId && { subCompanyId: formData?.subCompanyId }),
      ...(formData?.branchId && { leadBranchMapping: { branchId: formData?.branchId } }),
      ...(formData?.leadDirectSource && { leadDirectSourceId: formData?.leadDirectSource }),
      additionalDetails: {
        ...additionalDetails,
        // Always carry flat Formik values into additionalDetails for backend persistence
        poNumber: formData.poNumber || null,
        poDate: (() => {
          const d = formData.poDate;
          if (!d) return null;
          const parsed = new Date(d);
          return isNaN(parsed.getTime()) ? null : parsed.toISOString();
        })(),
        // Comment: Removed projectAreas - now handled by separate commercials array
        // projectAreas: formData?.projectAreas || [],
        ...(mappedAddresses && mappedAddresses.length > 0 ? mappedAddresses[0] : {}), // Single address object for one-to-one relationship
        // Project Detail fields
        ...(formData.plotArea !== undefined && { plotArea: formData.plotArea }),
        ...(formData.plotAreaUnit !== undefined && { plotAreaUnit: formData.plotAreaUnit }),
        ...(formData.builtUpArea !== undefined && { builtUpArea: formData.builtUpArea }),
        ...(formData.builtUpAreaUnit !== undefined && { builtUpAreaUnit: formData.builtUpAreaUnit }),
        ...(formData.buildingDetail !== undefined && { buildingDetail: formData.buildingDetail }),
        ...(formData.otherPoint1Heading !== undefined && { otherPoint1Heading: formData.otherPoint1Heading }),
        ...(formData.otherPoint1Description !== undefined && { otherPoint1Description: formData.otherPoint1Description }),
        ...(formData.otherPoint2Heading !== undefined && { otherPoint2Heading: formData.otherPoint2Heading }),
        ...(formData.otherPoint2Description !== undefined && { otherPoint2Description: formData.otherPoint2Description }),
        ...(formData.otherPoint3Heading !== undefined && { otherPoint3Heading: formData.otherPoint3Heading }),
        ...(formData.otherPoint3Description !== undefined && { otherPoint3Description: formData.otherPoint3Description }),
      },
      // Also include addresses array for backend compatibility
      addresses: mappedAddresses || [],
      referrals: mappedReferrals?.filter((ref: any) =>
        ref.leadReferralTypeId || ref.companyId || ref.contactId || ref.referredByEmployeeId
      ) || [],
      // Added: Include leadTeams in the payload
      leadTeams: mappedLeadTeams || []
    }
    // Remove unnecessary fields
    delete finalData.category;
    delete finalData.subCategory;
    delete finalData.service;
    delete finalData.type;
    delete finalData.projectName;
    delete finalData.cost; // Cost is now handled by LeadCommercial table via commercials array
    delete finalData.budget; // Budget field removed from Lead model, now in LeadCommercial table
    delete finalData.branchId;
    delete finalData.contactPersonId;
    delete finalData.status;
    delete finalData.contactPerson;
    delete finalData.contactRoleId;
    delete finalData.leadInquiryDate;
    delete finalData.source;
    delete finalData.leadDirectSource;
    delete finalData.addressStatesOptions;
    delete finalData.addressCitiesOptions;
    delete finalData.addressStateSelections;
    delete finalData.addressCitySelections;
    delete finalData.addresses;
    // poNumber/poDate are now inside additionalDetails — remove from root to avoid confusion
    delete finalData.poNumber;
    delete finalData.poDate;
    delete finalData?.projectArea;
    delete finalData?.companyTypeId;
    delete finalData?.companyId;
    delete finalData.googleMapLink;
    delete finalData.googleMyBusinessLink;
    // delete finalData.cancellationReasonId; //new
    // delete finalData.handledBy; // This will be handled before the delete //new
    // delete finalData.fileLocationCompanyType;//new
    // delete finalData.fileLocationCompany; //new

    if (finalData?.useCalculatedAmount === false || finalData?.useCalculatedAmount === true) {
      delete finalData.useCalculatedAmount;
    }
    // console.log('Form data:', finalData);
    const finalCleanPayload = Object.keys(finalData).reduce((acc, key) => {
      const value = finalData[key];

      // Special handling for fields that should be included even if empty to allow clearing
      if (key === "documents" || key === "description" || key === "fileLocation"
        || key === "cancellationReasonId" || key === "handledBy"
        || key === "fileLocationCompanyType" || key === "fileLocationCompany"
        || key === "handledByEntries" || key === "poStatus" || key === "poFile") {
        acc[key] = value !== undefined ? value : (key === "handledByEntries" ? [] : ""); // Ensure it's included
      } else if (value !== "" && value !== null && value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as any);

    if (finalCleanPayload?.projectAreas) {
      delete finalCleanPayload?.projectAreas;
    }

    // Add prefix to payload for backend to use
    if (prefix && prefix.trim()) {
      finalCleanPayload.prefix = prefix.trim();
    }
    try {
      if (isEditMode) {
        finalCleanPayload.id = initialFormData.id;
        if (employeeId) {
          finalCleanPayload.updatedById = employeeId;
        }
        const result = await customConfirmation()

        if (result) {
          finalCleanPayload.revisionCount = Number(currLeadData?.revisionCount || 0) + 1;
        }

        const res = await updateLead(finalCleanPayload.id, finalCleanPayload)
        if (res?.hasError) {
          errorConfirmation("Failed to update lead. Please try again.")
        } else {
          successConfirmation("Lead Updated successfully!")
          eventBus.emit(EVENT_KEYS.leadUpdated, { id: res.id });
          if (onClose) onClose();
        }
      }
      else {
        const res = await createLead(finalCleanPayload)
        if (res?.hasError) {
          errorConfirmation("Failed to create lead. Please try again.")
        } else {
          eventBus.emit(EVENT_KEYS.leadCreated, { id: res.id });
          successConfirmation("Lead created successfully!")
          if (onClose) onClose();
        }
      }
    } catch (error) {
      console.error('Error creating lead:', error);
      // errorConfirmation('Failed to create lead. Please try again.');
    }
    // Here you can access all form data in one object
    // You can then send it to your API or process it as needed
  };
  const addReferral = () => {
    setReferrals([...referrals, {
      id: Date.now().toString(),
      referralType: '',
      referringCompanyType: '',
      referringCompany: '',
      referringSubCompany: '',
      referringContact: '',
      referredByEmployeeId: '', // Added: For internal referrals
      companyName: '' // Added: For internal referrals
    }]);
  };


  const handleCountryChange = async (countryId: string) => {
    const country = countries.find((c) => c.id === countryId);
    if (country) {
      const stateData = await fetchAllStates(country.iso2);
      setStates(stateData);
      setCities([]);
    }
  };

  const handleStateChange = async (countryId: string, stateId: string) => {
    const country = countries.find((c) => c.id === countryId);
    const state = states.find((s) => s.id === stateId);
    if (country && state) {
      const cityData = await fetchAllCities(country.iso2, state.iso2);
      setCities(cityData);
    }
  };

  // Main component return
  // Wrap everything in a fragment to fix JSX parent element error
  return (
    <div>
      {/* Main Modal */}
      <Modal
        show={open}
        onHide={onClose}
        size='xl'
        className='responsive-modal'
        centered
        dialogClassName="responsive-modal"
      >
        <Box sx={{ position: 'relative', backgroundColor: '#F3F4F7', p: { xs: 1, md: 3 }, }}>
          <IconButton
            onClick={onClose}
            sx={{
              position: 'absolute',
              right: { xs: 4, md: 8 },
              top: { xs: 4, md: 8 },
              color: 'text.secondary',
            }}
          >
            <Close />
          </IconButton>
          <div className='d-flex flex-row align-items-center justify-content-between mx-3'>
            <Typography
              variant="h6"
              component="h2"
              sx={{ fontWeight: 600, fontSize: { xs: '18px', md: '20px' }, fontFamily: 'Barlow' }}
            >
              {title}
            </Typography>
            <div className='d-flex flex-row align-items-center justify-content-between mx-5'>
              {/* <PrefixInlineEdit
                value={prefix}
                label="INQUIRY NO."
                onChange={setPrefix}
                disabled={false}
              /> */}
              {isEditMode && currLeadData?.revisionCount !== undefined && (
                <div className='d-flex flex-column align-items-end mx-5'>
                  <span style={{ fontSize: "14px", fontFamily: "Inter", color: "#798DB3" }}>{prefix && `Rev No.`}</span>
                  <span style={{ fontSize: "14px", fontFamily: "Inter", color: "#00000" }}>{prefix && `${currLeadData?.revisionCount || 0}`}</span>
                </div>
              )}
            </div>
          </div>
          {isEditMode && initialValues?.prefix}
          <Modal.Body className='responsive-modal' style={{ maxHeight: "80vh", overflowY: "auto", }}>
            <Formik
              initialValues={initialValues}
              validationSchema={validationSchema}
              onSubmit={handleSubmit}
              enableReinitialize={true}
              innerRef={formikRef}
            >
              {(formikProps) => {
                const { values, setFieldValue, errors, touched, isSubmitting, validateForm } = formikProps;
                useEffect(() => {
                  if (leadTemplateId === leadAndProjectTemplateTypeId.mep && useCalculatedAmount) {
                    const cost = Number(values.rate || 0) * Number(values.projectArea || 0);
                    setFieldValue('cost', cost);
                  }
                }, [values.rate, values.projectArea, useCalculatedAmount]);

                // Set default direct source when leadSource is DIRECT
                useEffect(() => {
                  if (values.leadSourceType === 'DIRECT' && leadDirectSources.length > 0 && !values.leadDirectSource) {
                    const defaultDirectSource = leadDirectSources.find(source =>
                      source.name?.toLowerCase() === 'direct'
                    );
                    if (defaultDirectSource && defaultDirectSource.id !== values.leadDirectSource) {
                      setFieldValue('leadDirectSource', defaultDirectSource.id);
                    } else if (leadDirectSources.length > 0 && leadDirectSources[0].id !== values.leadDirectSource) {
                      setFieldValue('leadDirectSource', leadDirectSources[0].id);
                    }
                  }
                }, [values.leadSourceType, leadDirectSources, values.leadDirectSource, setFieldValue]);

                // Set default status when statuses are loaded and no status is selected
                useEffect(() => {
                  if (leadStatuses.length > 0 && !values.statusId) {
                    const defaultStatus = leadStatuses.find((status: any) => status.isDefault === true);
                    if (defaultStatus && defaultStatus.id !== values.statusId) {
                      setFieldValue('statusId', defaultStatus.id);
                    }
                  }
                }, [leadStatuses, values.statusId, setFieldValue]);

                // Auto-add a default handledBy entry when status becomes "Received"
                useEffect(() => {
                  if (!values.statusId) return;
                  const selectedStatus = leadStatuses.find((s: any) => s.id === values.statusId);
                  const isReceived = selectedStatus?.name?.toLowerCase().trim() === 'received';
                  if (isReceived && (!values.handledByEntries || values.handledByEntries.length === 0)) {
                    const today = values.leadInquiryDate || new Date().toISOString().split('T')[0];
                    setFieldValue('handledByEntries', [{
                      id: Date.now().toString(),
                      employeeId: '',
                      handledDate: today,
                      handledOutDate: '',
                    }]);
                  }
                  // Clear handledByEntries when status is no longer Received
                  if (!isReceived && values.handledByEntries && values.handledByEntries.length > 0) {
                    setFieldValue('handledByEntries', []);
                  }
                  // Clear poStatus, poNumber, poDate, poFile when status is no longer Received
                  if (!isReceived && values.poStatus) {
                    setFieldValue('poStatus', 'Pending');
                    setFieldValue('poNumber', '');
                    setFieldValue('poDate', '');
                    setFieldValue('poFile', '');
                  }
                }, [values.statusId, leadStatuses]);

                return (
                  <FormikForm placeholder={""}>
                    {/* Project Details Section */}
                    <Box sx={{ mb: 4 }} >
                      {/* Lead Details Section */}
                      <fieldset style={{ borderTop: '1px solid #9D4141', padding: '16px' }} className='mt-7' >
                        <legend style={{
                          fontSize: '17px',
                          fontWeight: 600,
                          fontFamily: 'Inter',
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
                        }}>
                          <div className="ms-5" style={{ borderTop: "1px solid #9D4141", width: "30px", height: "0px" }}></div>
                          LEAD DETAILS
                        </legend>

                        <Grid container spacing={1} className='card-body  p-md-10' sx={{ backgroundColor: { xs: 'transparent', md: 'white', borderRadius: '8px' } }}>
                          <Grid item xs={12} md={6}>
                            {/* Top Label (same pattern as Lead Inquiry Date) */}
                            <Typography
                              sx={{
                                mb: 0.8,
                                fontSize: "14px",
                                fontFamily: "Inter",
                                fontWeight: 500,
                                color: "black",
                              }}
                            >
                              Inquiry No.
                            </Typography>

                            {/* Input Box */}
                            <Box
                              sx={{
                                border: "1px solid #D0D5DD",
                                borderRadius: "5px",
                                px: 2,
                                py: 1.6,
                                height: "45px", // match MUI input height
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                "&:hover": {
                                  borderColor: "black",
                                },
                              }}
                            >
                              <PrefixInlineEdit
                                value={prefix}
                                label="" // remove internal label
                                onChange={setPrefix}
                                disabled={false}
                              />

                              {isEditMode && currLeadData?.revisionCount !== undefined && (
                                <Box className="d-flex flex-column align-items-end">
                                  {/* <Typography
          sx={{
            fontSize: "12px",
            color: "#798DB3",
            lineHeight: 1,
          }}
        >
          Rev No.
        </Typography>

        <Typography
          sx={{
            fontSize: "14px",
            fontWeight: 500,
            lineHeight: 1.4,
          }}
        >
          {currLeadData?.revisionCount || 0}
        </Typography> */}
                                </Box>
                              )}
                            </Box>
                          </Grid>
                          <Grid item xs={12} md={6}>
                            {/* <TextInput
                            formikField='leadInquiryDate'
                            label='Lead Inquiry Date'
                            isRequired={false}
                          /> */}
                            <DateInput
                              formikField="leadInquiryDate"
                              inputLabel="Lead Inquiry Date"
                              formikProps={formikProps}
                              placeHolder="1/3/2025"
                              isRequired={false}
                            />
                          </Grid>

                          {/* Row 1: Lead Inquiry Date, Assigned To, Lead Source */}
                          <Grid item xs={12} md={15}>
                            <TextInput formikField='projectName' label='Lead Name' isRequired={true} />
                          </Grid>

                          {/* <Grid item xs={12} md={6}>
                            <FormikDropdownInput
                              formikField="statusId"
                              inputLabel="Status"
                              isRequired={true}
                              options={leadStatuses.map((s: any) => ({ value: s.id, label: s.name, color: s.color }))}
                              placeholder="Select status"
                            />
                          </Grid> */}

                          <Grid item xs={12} md={4}>
                            <MultiSelectWithInlineCreate
                              formikField="serviceIds"
                              inputLabel="Services"
                              options={transformToOptions(services)}
                              placeholder="Select services..."
                              isRequired={false}
                              onCreate={createNewService}
                              onRefreshOptions={fetchProjectServices}
                              createModalTitle="Create New Service"
                              createButtonText="Add New Service"
                              createFieldLabel="Service Name"
                              createFieldPlaceholder="Enter service name..."
                            />
                          </Grid>

                          <Grid item xs={12} md={4}>
                            <MultiSelectWithInlineCreate
                              formikField="categoryIds"
                              inputLabel="Lead Categories"
                              options={transformToOptions(categories)}
                              placeholder="Select categories..."
                              isRequired={false}
                              onCreate={createNewCategory}
                              onRefreshOptions={fetchProjectCategories}
                              createModalTitle="Create New Category"
                              createButtonText="Add New Category"
                              createFieldLabel="Category Name"
                              createFieldPlaceholder="Enter category name..."
                            />
                          </Grid>

                          <Grid item xs={12} md={4}>
                            <MultiSelectWithInlineCreate
                              formikField="subcategoryIds"
                              inputLabel="Lead Sub Categories"
                              options={transformToOptions(subcategories)}
                              placeholder="Select subcategories..."
                              isRequired={false}
                              onCreate={(name) => {
                                // For subcategories, we need to pass the first selected category
                                const categoryIds = values.categoryIds || [];
                                const firstCategoryId = categoryIds.length > 0 ? categoryIds[0] : undefined;

                                if (!firstCategoryId) {
                                  throw new Error('Please select a category first before creating a subcategory');
                                }

                                return createNewSubcategory(name, firstCategoryId);
                              }}
                              onRefreshOptions={fetchProjectSubcategories}
                              createModalTitle="Create New Sub Category"
                              createButtonText="Add New Sub Category"
                              createFieldLabel="Sub Category Name"
                              createFieldPlaceholder="Enter subcategory name..."
                            />
                          </Grid>
                          <h5 style={{ color: "#9D4141", marginTop: "8px" }}>
                            Note: You can add more then one categories
                          </h5>
                        </Grid>
                        {/* Warning message for missing default status */}

                      </fieldset>

                      <fieldset style={{ borderTop: '1px solid #9D4141', padding: '16px' }} className='mt-7' >
                        <legend style={{
                          fontSize: '17px',
                          fontWeight: 600,
                          fontFamily: 'Inter',
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
                        }}>
                          <div className="ms-5" style={{ borderTop: "1px solid #9D4141", width: "30px", height: "0px" }}></div>
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
                              <HighlightErrors isRequired={false} formikField="plotArea" />
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
                              <HighlightErrors isRequired={false} formikField="builtUpArea" />
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

                      <fieldset style={{ borderTop: '1px solid #9D4141', padding: '16px' }} className='mt-7' >
                        <legend style={{
                          fontSize: '17px',
                          fontWeight: 600,
                          fontFamily: 'Inter',
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
                        }}>
                          <div className="ms-5" style={{ borderTop: "1px solid #9D4141", width: "30px", height: "0px" }}></div>
                          LEAD ASSIGNED
                        </legend>

                        <Grid container spacing={1} className='card-body p-md-10' sx={{ backgroundColor: { xs: 'transparent', md: 'white', borderRadius: '8px' } }}>
                          <Grid item xs={12} md={6}>
                            <DropDownInput
                              formikField='leadAssignedTo'
                              inputLabel='Lead Assigned To'
                              isRequired={false}
                              options={allEmployees?.list?.map((item: any) => ({
                                value: item.employeeId,
                                label: item.employeeName,
                                avatar: item.avatar,
                              })) || []}
                              showColor={true}
                              // value={values.leadAssignedTo}
                              placeholder='Select employee'
                            />
                          </Grid>
                        </Grid>
                      </fieldset>

                      <fieldset style={{ borderTop: '1px solid #9D4141', padding: '16px' }} className='mt-7' >
                        <legend style={{
                          fontSize: '17px',
                          fontWeight: 600,
                          fontFamily: 'Inter',
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
                        }}>
                          <div className="ms-5" style={{ borderTop: "1px solid #9D4141", width: "30px", height: "0px" }}></div>
                          FILE LOCATION IN COMPUTER
                        </legend>

                        <Grid container spacing={1} className='card-body p-md-10' sx={{ backgroundColor: { xs: 'transparent', md: 'white', borderRadius: '8px' } }}>
                          <Grid item xs={12} md={6}>
                            <DropDownInput
                              formikField='fileLocationCompanyType'
                              inputLabel='Company Type'
                              isRequired={false}
                              onChange={(val: any) => {
                                const newCompanyType = val?.value || "";
                                setFieldValue('fileLocationCompanyType', newCompanyType);

                                // Clear company when type changes
                                if (values.fileLocationCompanyType !== newCompanyType) {
                                  setFieldValue('fileLocationCompany', "");
                                }
                              }}
                              options={allCompanyTypes.map((type: any) => ({
                                value: type.id,
                                label: type.name
                              }))}
                              placeholder='Select company type'
                            />
                            <small
                              className="text-primary"
                              onClick={() => setShowCompanyTypeModal(true)}
                              style={{ cursor: "pointer" }}
                            >
                              + New
                            </small>
                          </Grid>

                          <Grid item xs={12} md={6}>
                            <DropDownInput
                              formikField='fileLocationCompany'
                              inputLabel='Company'
                              isRequired={false}
                              disabled={!values.fileLocationCompanyType}
                              options={companies
                                ?.filter((c: any) => c.companyTypeId === values.fileLocationCompanyType)
                                ?.map((c: any) => ({ value: c.id, label: c.companyName })) || []}
                              placeholder={!values.fileLocationCompanyType ? "Select company type first" : "Select company"}
                            />
                            <small
                              className="text-primary"
                              onClick={() => setShowCompanyModal(true)}
                              style={{ cursor: "pointer" }}
                            >
                              + New
                            </small>
                          </Grid>
                        </Grid>
                      </fieldset>

                      <fieldset style={{ borderTop: '1px solid #9D4141', padding: '16px' }} className='mt-7' >
                        <legend style={{
                          fontSize: '17px',
                          fontWeight: 600,
                          fontFamily: 'Inter',
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
                        }}>
                          <div className="ms-5" style={{ borderTop: "1px solid #9D4141", width: "30px", height: "0px" }}></div>
                          REFERRAL DETAILS
                        </legend>
                        <Grid container spacing={1} className='card-body  p-md-10' sx={{ backgroundColor: { xs: 'transparent', md: 'white', borderRadius: '8px' } }}>
                          {/* Lead Source dropdown - conditional sizing based on source type */}
                          <Grid item xs={12} md={values.leadSourceType === 'DIRECT' ? 6 : 12}>
                            <DropDownInput
                              formikField="leadSourceType"
                              inputLabel="Lead Source"
                              isRequired={false}
                              options={[{ value: 'DIRECT', label: 'Direct' }, { value: 'REFERRAL', label: 'External' }]}
                              // value={values.leadSourceType}
                              placeholder="Select lead source"
                            />
                          </Grid>

                          {/* Conditional Rendering Based on Lead Source */}
                          {values.leadSourceType === 'DIRECT' && (
                            <Grid item xs={12} md={6}>
                              <DropDownInput
                                formikField="leadDirectSource"
                                inputLabel="Lead Direct Sources"
                                isRequired={false}
                                options={leadDirectSources.map(source => ({
                                  value: source.id,
                                  label: source.name || 'Uncategorized Direct Source'
                                }))}
                                placeholder="Select direct source"
                              />
                            </Grid>
                          )}

                          {values.leadSourceType === 'REFERRAL' && (
                            <>
                              {/* Show message when no referrals exist */}
                              {(!values.referrals || values.referrals.length === 0) && (
                                <Grid item xs={12}>
                                  <Box sx={{
                                    textAlign: 'center',
                                    py: 3,
                                    color: '#666',
                                    fontStyle: 'italic'
                                  }}>
                                    No referrals added yet. Click "Add another Referral" to get started.
                                  </Box>
                                </Grid>
                              )}
                              {/* Dynamic Referral Rows */}
                              {(values.referrals || []).map((referral: any, index: any) => (
                                <Grid container spacing={1} sx={{ margin: "auto", position: 'relative', mb: 2 }} key={referral.id}>
                                  {/* Add header with cross button for each referral */}
                                  <Box sx={{
                                    width: '100%',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    mb: 2,
                                    px: 2
                                  }}>
                                    <Typography style={{
                                      color: "#798DB3",
                                      fontSize: "14px",
                                      fontFamily: "Inter"
                                    }}>Referral {index + 1}</Typography>
                                    {(values.referrals || []).length > 1 && (
                                      <IconButton
                                        onClick={() => {
                                          const currentReferrals = values.referrals || [];
                                          const newReferrals = currentReferrals.filter((_: any, i: number) => i !== index);
                                          setFieldValue('referrals', newReferrals);
                                        }}
                                        sx={{ color: '#d32f2f' }}
                                        title="Remove this referral"
                                      >
                                        <Close />
                                      </IconButton>
                                    )}
                                    {(values.referrals || []).length === 1 && (
                                      <IconButton
                                        onClick={() => {
                                          // Allow removing the last referral - set to empty array
                                          setFieldValue('referrals', []);
                                        }}
                                        sx={{ color: '#d32f2f' }}
                                        title="Remove all referrals"
                                      >
                                        <Close />
                                      </IconButton>
                                    )}
                                  </Box>
                                  <Grid item xs={12} md={3}>
                                    <Box sx={{ display: 'flex', flexDirection: "column", gap: 1 }}>
                                      <DropDownInput
                                        formikField={`referrals[${index}].referralType`}
                                        inputLabel='Referral Type'
                                        isRequired={false}
                                        options={referralTypes.map(type => ({
                                          value: type.id,
                                          label: type.name || 'Uncategorized Referral Type'
                                        }))}
                                        placeholder='Select referral type'
                                        onChange={(val: any) => {
                                          const newReferralTypeId = val?.value || "";
                                          setFieldValue(`referrals[${index}].referralType`, newReferralTypeId);
                                          // Only clear dependent fields if the referral type actually changed
                                          if (values.referrals[index]?.referralType !== newReferralTypeId) {
                                            // Clear all referral fields when type changes
                                            setFieldValue(`referrals[${index}].referringCompany`, "");
                                            setFieldValue(`referrals[${index}].referringSubCompany`, "");
                                            setFieldValue(`referrals[${index}].referringContact`, "");
                                            setFieldValue(`referrals[${index}].referredByEmployeeId`, "");
                                            setFieldValue(`referrals[${index}].companyName`, "");
                                          }
                                        }}
                                      />
                                      <small
                                        className="text-primary"
                                        onClick={() => setShowReferralTypeModal(true)}
                                        style={{ cursor: "pointer" }}
                                      >
                                        + New Referral Type
                                      </small>
                                    </Box>
                                  </Grid>
                                  {/* Conditional rendering based on referral type */}
                                  {isInternalReferralType(values.referrals?.[index]?.referralType) ? (
                                    <>
                                      {/* Internal Referral Fields */}
                                      {/* Referring Company - fixed to Wisetech MEP */}
                                      <Grid item xs={12} md={3}>
                                        <Box sx={{ display: 'flex', flexDirection: "column", gap: 1 }}>
                                          <DropDownInput
                                            inputLabel="Referring Company"
                                            placeholder="Wisetech MEP"
                                            isRequired={false}
                                            formikField={`referrals[${index}].referringCompany`}
                                            disabled={true}
                                            options={[{ value: 'wisetech-mep', label: 'Wisetech MEP' }]}
                                            value={{ value: 'wisetech-mep', label: 'Wisetech MEP' }}
                                          />
                                        </Box>
                                      </Grid>
                                      {/* Referring Contact - all employees (same as Lead Assigned To) */}
                                      <Grid item xs={12} md={6}>
                                        <Box sx={{ display: 'flex', flexDirection: "column", gap: 1 }}>
                                          <DropDownInput
                                            inputLabel="Referring Contact"
                                            placeholder="Select employee"
                                            isRequired={false}
                                            formikField={`referrals[${index}].referredByEmployeeId`}
                                            options={allEmployees?.list?.map((item: any) => ({
                                              value: item.employeeId,
                                              label: item.employeeName,
                                              avatar: item.avatar,
                                            })) || []}
                                            showColor={true}
                                            onChange={(value: any) => {
                                              const employeeId = value?.value || value;
                                              setFieldValue(`referrals[${index}].referredByEmployeeId`, employeeId);
                                              // Auto-fill company name
                                              if (employeeId && companyOverview.length > 0) {
                                                const companyName = companyOverview[0]?.name || 'Wisetech MEP';
                                                setFieldValue(`referrals[${index}].companyName`, companyName);
                                              }
                                            }}
                                            value={
                                              values.referrals[index]?.referredByEmployeeId
                                                ? {
                                                  value: values.referrals[index].referredByEmployeeId,
                                                  label: allEmployees?.list?.find((item: any) => item.employeeId === values.referrals[index].referredByEmployeeId)?.employeeName || "",
                                                  avatar: allEmployees?.list?.find((item: any) => item.employeeId === values.referrals[index].referredByEmployeeId)?.avatar,
                                                }
                                                : null
                                            }
                                          />
                                        </Box>
                                      </Grid>
                                    </>
                                  ) : (
                                    <>
                                      {/* External Referral Fields */}
                                      {/* Referring Company Type - new field */}
                                      <Grid item xs={12} md={3}>
                                        <Box sx={{ display: 'flex', flexDirection: "column", gap: 1 }}>
                                          <DropDownInput
                                            formikField={`referrals[${index}].referringCompanyType`}
                                            inputLabel="Referring Company Type"
                                            isRequired={false}
                                            onChange={(val: any) => {
                                              const newTypeId = val?.value || "";
                                              setFieldValue(`referrals[${index}].referringCompanyType`, newTypeId);
                                              // Clear company, sub-company and contact when type changes
                                              if (values.referrals[index]?.referringCompanyType !== newTypeId) {
                                                setFieldValue(`referrals[${index}].referringCompany`, "");
                                                setFieldValue(`referrals[${index}].referringSubCompany`, "");
                                                setFieldValue(`referrals[${index}].referringContact`, "");
                                                setReferralSubCompanies(prev => ({ ...prev, [index]: [] }));
                                                setReferralFilteredContacts(prev => ({ ...prev, [index]: [] }));
                                              }
                                            }}
                                            options={allCompanyTypes.map((type: any) => ({
                                              value: type.id,
                                              label: type.name
                                            }))}
                                            placeholder="Select company type"
                                          />
                                          <small
                                            className="text-primary"
                                            onClick={() => setShowCompanyTypeModal(true)}
                                            style={{ cursor: "pointer" }}
                                          >
                                            + New Company Type
                                          </small>
                                        </Box>
                                      </Grid>
                                      {/* Referring Company - filtered by company type */}
                                      <Grid item xs={12} md={3}>
                                        <Box sx={{ display: 'flex', flexDirection: "column", gap: 1 }}>
                                          <DropDownInput
                                            inputLabel="Referring Company"
                                            placeholder={!values.referrals[index]?.referringCompanyType ? "Select company type first" : "Select company"}
                                            isRequired={false}
                                            disabled={!values.referrals[index]?.referringCompanyType}
                                            formikField={`referrals[${index}].referringCompany`}
                                            options={companies
                                              .filter((c: any) => !values.referrals[index]?.referringCompanyType || c.companyTypeId === values.referrals[index]?.referringCompanyType)
                                              .map((c) => ({
                                                value: c.id,
                                                label: c.companyName,
                                              }))}
                                            onChange={async (value: any) => {
                                              const companyValue = value?.value || value;
                                              setFieldValue(`referrals[${index}].referringCompany`, companyValue);

                                              // Only clear sub company and contact when company actually changes
                                              if (values.referrals[index]?.referringCompany !== companyValue) {
                                                setFieldValue(`referrals[${index}].referringSubCompany`, '');
                                                setFieldValue(`referrals[${index}].referringContact`, '');
                                              }

                                              if (companyValue) {
                                                try {
                                                  const response = await fetchSubCompaniesByMainCompanyId(companyValue);
                                                  const subCompanyData = response?.data?.subCompanies || response?.subCompanies || [];
                                                  setReferralSubCompanies(prev => ({ ...prev, [index]: subCompanyData }));
                                                  await fetchContactsByCompanyIdForReferral(companyValue, index);
                                                } catch (error) {
                                                  console.error('Error fetching sub companies or contacts:', error);
                                                  setReferralSubCompanies(prev => ({ ...prev, [index]: [] }));
                                                  setReferralFilteredContacts(prev => ({ ...prev, [index]: [] }));
                                                }
                                              } else {
                                                setReferralSubCompanies(prev => ({ ...prev, [index]: [] }));
                                                setReferralFilteredContacts(prev => ({ ...prev, [index]: [] }));
                                              }
                                            }}
                                            value={
                                              values.referrals[index]?.referringCompany
                                                ? {
                                                  value: values.referrals[index].referringCompany,
                                                  label: companies.find((c) => c.id === values.referrals[index].referringCompany)?.companyName || "",
                                                }
                                                : null
                                            }
                                          />
                                          <div>
                                            {index === 0 && (
                                              <div
                                                onClick={() => { setShowCompanyModal(true) }}
                                                style={{ whiteSpace: 'nowrap', color: "#9D4141", cursor: "pointer" }}
                                              >
                                                + New Company
                                              </div>
                                            )}
                                          </div>
                                        </Box>
                                      </Grid>
                                      <Grid item xs={12} md={3}>
                                        <Box sx={{ display: 'flex', flexDirection: "column", gap: 1 }}>
                                          <DropDownInput
                                            inputLabel="Referring Sub Company"
                                            placeholder="Select sub company"
                                            isRequired={false}
                                            formikField={`referrals[${index}].referringSubCompany`}
                                            options={(referralSubCompanies[index] || []).map((sc: any) => ({
                                              value: sc.id,
                                              label: sc.subCompanyName,
                                            }))}
                                            onChange={(value: any) => {
                                              const subCompanyValue = value?.value || value;
                                              setFieldValue(`referrals[${index}].referringSubCompany`, subCompanyValue);
                                            }}
                                            value={
                                              values.referrals[index]?.referringSubCompany
                                                ? {
                                                  value: values.referrals[index].referringSubCompany,
                                                  label: (referralSubCompanies[index] || []).find((sc: any) => sc.id === values.referrals[index].referringSubCompany)?.subCompanyName || "",
                                                }
                                                : null
                                            }
                                          />
                                          <div>
                                            {index === 0 && (
                                              <div
                                                onClick={() => { setShowSubCompanyModal(true) }}
                                                style={{ whiteSpace: 'nowrap', color: "#9D4141", cursor: "pointer" }}
                                              >
                                                + New Sub Company
                                              </div>
                                            )}
                                          </div>
                                        </Box>
                                      </Grid>
                                      <Grid item xs={12} md={3}>
                                        <Box sx={{ display: 'flex', flexDirection: "column", gap: 1 }}>
                                          <DropDownInput
                                            inputLabel="Referring Contact"
                                            placeholder={!values.referrals[index]?.referringCompany ? "Please select company first" : "Select contact person"}
                                            isRequired={false}
                                            disabled={!values.referrals[index]?.referringCompany}
                                            formikField={`referrals[${index}].referringContact`}
                                            options={(referralFilteredContacts[index] || []).map((contact) => ({
                                              value: contact.id,
                                              label: contact.fullName || 'Unnamed Contact',
                                              avatar: contact.profilePhoto
                                            }))}
                                            showColor={true}
                                            onChange={(value: any) => {
                                              const contactId = value?.value || value;
                                              setFieldValue(`referrals[${index}].referringContact`, contactId);
                                            }}
                                            value={
                                              values.referrals[index]?.referringContact
                                                ? {
                                                  value: values.referrals[index].referringContact,
                                                  label: (referralFilteredContacts[index] || []).find((c) => c.id === values.referrals[index].referringContact)?.fullName || "",
                                                  avatar: (referralFilteredContacts[index] || []).find((c) => c.id === values.referrals[index].referringContact)?.profilePhoto
                                                }
                                                : null
                                            }
                                          />
                                          <div>
                                            {index === 0 && (
                                              <div
                                                onClick={() => { setShowContactModal(true) }}
                                                style={{ whiteSpace: 'nowrap', color: "#9D4141", cursor: "pointer" }}
                                              >
                                                + New Contact
                                              </div>
                                            )}
                                          </div>
                                        </Box>
                                      </Grid>
                                    </>
                                  )}
                                </Grid>
                              ))}

                              {/* Add Another Referral Button */}
                              <Grid item xs={12}>
                                <div
                                  onClick={() => {
                                    const newReferral = {
                                      id: Date.now().toString(),
                                      referralType: '',
                                      referringCompanyType: '',
                                      referringCompany: '',
                                      referringSubCompany: '',
                                      referringContact: '',
                                      referredByEmployeeId: '', // Added: For internal referrals
                                      companyName: '' // Added: For internal referrals
                                    };
                                    // Handle case where referrals array might be empty or undefined
                                    const currentReferrals = values.referrals || [];
                                    setFieldValue('referrals', [...currentReferrals, newReferral]);
                                  }}
                                  style={{
                                    marginTop: "10px", width: "100%", padding: "10px 0px", borderStyle: 'dotted',
                                    borderColor: '#DBB3B3',
                                    borderWidth: '1px',
                                    borderRadius: '12px',
                                    color: "#9D4141",
                                    cursor: "pointer"
                                  }}
                                  className='justify-content-center align-items-center d-flex text-center'
                                >
                                  Add another Referral
                                </div>
                              </Grid>
                            </>
                          )}
                        </Grid>
                      </fieldset>

                      {leadTemplateId === leadAndProjectTemplateTypeId.mep && (
                        <fieldset style={{ borderTop: '1px solid #9D4141', padding: '14px' }} className='mt-7'>
                          <legend style={{
                            fontSize: '17px',
                            fontWeight: 600,
                            fontFamily: 'Inter',
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
                          }}>
                            <div className="ms-5" style={{ borderTop: "1px solid #9D4141", width: "30px", height: "0px" }}></div>
                            COMMERCIALS
                          </legend>
                          <Grid container spacing={1} className='card-body p-md-10' sx={{ backgroundColor: { xs: 'transparent', md: 'white', borderRadius: '8px' } }}>
                            {/* Show message when no project areas exist */}
                            {(!values.projectAreas || values.projectAreas.length === 0) && (
                              <Grid item xs={12}>
                                <Box sx={{
                                  textAlign: 'center',
                                  py: 3,
                                  color: '#666',
                                  fontStyle: 'italic'
                                }}>
                                  No project areas added yet. Click "Add New Project Area" to get started.
                                </Box>
                              </Grid>
                            )}

                            {(values.projectAreas || []).map((area: any, index: number) => (
                              <Grid container spacing={1} key={area.id || index} sx={{ position: 'relative', mb: 4 }}>
                                <Box sx={{
                                  width: '100%',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  mb: 2,
                                  px: 2
                                }}>
                                  <Typography style={{
                                    color: "#798DB3",
                                    fontSize: "14px",
                                    fontFamily: "Inter"
                                  }}>Project Area {index + 1}</Typography>
                                  {(values.projectAreas || []).length > 1 && (
                                    <IconButton
                                      onClick={() => {
                                        const newAreas = values.projectAreas.filter((_: any, i: number) => i !== index);
                                        // Note: Removed address manipulation - addresses should remain independent
                                        setFieldValue('projectAreas', newAreas);
                                      }}
                                      sx={{ color: '#d32f2f' }}
                                      title="Remove this project area"
                                    >
                                      <Close />
                                    </IconButton>
                                  )}
                                  {(values.projectAreas || []).length === 1 && (
                                    <IconButton
                                      onClick={() => {
                                        // Allow removing the last project area - but keep addresses intact
                                        setFieldValue('projectAreas', []);
                                        // Note: Addresses remain untouched as they are independent of project areas
                                      }}
                                      sx={{ color: '#d32f2f' }}
                                      title="Remove all project areas"
                                    >
                                      <Close />
                                    </IconButton>
                                  )}
                                </Box>

                                <Grid item xs={12} md={3}>
                                  <TextInput
                                    formikField={`projectAreas.${index}.label`}
                                    label="Label"
                                    isRequired={false}
                                  />
                                </Grid>

                                <Grid item xs={12} md={values.projectAreas[index].costType === "2" ? 3 : 2}>
                                  <EnhancedDecimalInput
                                    formikField={`projectAreas.${index}.projectArea`}
                                    label="Area (sqft)"
                                    onCalculatedCost={(area) => {
                                      // If cost type is Rate, calculate total cost and validate it
                                      if (values.projectAreas[index].costType === "1") {
                                        const rate = parseFloat(values.projectAreas[index].rate) || 0;
                                        const totalCost = area * rate;
                                        const roundedCost = parseFloat(totalCost.toFixed(4));
                                        setFieldValue(`projectAreas.${index}.cost`, roundedCost.toString());

                                        // Validate calculated cost using Formik's setFieldError
                                        if (roundedCost > 10000000000) {
                                          formikProps.setFieldError(`projectAreas.${index}.cost`, 'Calculated cost exceeds 100 Crores limit');
                                        } else {
                                          formikProps.setFieldError(`projectAreas.${index}.cost`, '');
                                        }
                                      }
                                    }}
                                  />
                                </Grid>
                                <Grid item xs={12} md={values.projectAreas[index].costType === "2" ? 3 : 2}>
                                  <DropDownInput
                                    formikField={`projectAreas.${index}.costType`}
                                    inputLabel="Cost Type"
                                    isRequired={false}
                                    options={[{ value: "1", label: "Rate" }, { value: "2", label: "Lumpsum" }]}
                                    onChange={(val: any) => {
                                      setFieldValue(`projectAreas.${index}.costType`, val?.value);

                                      if (val?.value === "1") {
                                        // If switching to Rate, calculate cost based on current area and rate
                                        const area = parseFloat(values.projectAreas[index].projectArea) || 0;
                                        const rate = parseFloat(values.projectAreas[index].rate) || 0;
                                        const totalCost = area * rate;
                                        const roundedCost = parseFloat(totalCost.toFixed(4));
                                        setFieldValue(`projectAreas.${index}.cost`, roundedCost.toString());
                                      } else if (val?.value === "2") {
                                        // If switching to Lumpsum, set rate to 0 (hidden field) and clear cost
                                        setFieldValue(`projectAreas.${index}.rate`, 0);
                                        setFieldValue(`projectAreas.${index}.cost`, '');
                                      }
                                    }}
                                  />
                                </Grid>

                                {values.projectAreas[index].costType !== "2" && (
                                  <Grid item xs={12} md={2}>
                                    <EnhancedDecimalInput
                                      formikField={`projectAreas.${index}.rate`}
                                      label="Rate"
                                      onCalculatedCost={(rate) => {
                                        // If cost type is Rate, calculate total cost and validate it
                                        if (values.projectAreas[index].costType === "1") {
                                          const area = parseFloat(values.projectAreas[index].projectArea) || 0;
                                          const totalCost = area * rate;
                                          const roundedCost = parseFloat(totalCost.toFixed(4));
                                          setFieldValue(`projectAreas.${index}.cost`, roundedCost.toString());

                                          // Validate calculated cost using Formik's setFieldError
                                          if (roundedCost > 10000000000) {
                                            formikProps.setFieldError(`projectAreas.${index}.cost`, 'Calculated cost exceeds 100 Crores limit');
                                          } else {
                                            formikProps.setFieldError(`projectAreas.${index}.cost`, '');
                                          }
                                        }
                                      }}
                                    />
                                  </Grid>
                                )}

                                <Grid item xs={12} md={values.projectAreas[index].costType === "2" ? 3 : 2}>
                                  <EnhancedDecimalInput
                                    formikField={`projectAreas.${index}.cost`}
                                    label="Cost"
                                    isReadonly={values.projectAreas[index].costType === "1"}
                                  />
                                </Grid>
                              </Grid>
                            ))}

                            {/* Total Cost Display */}
                            {values.projectAreas && values.projectAreas.length > 0 && (
                              <Grid item xs={12}>
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
                                    ₹ {(values.projectAreas || [])
                                      .reduce((total: any, area: any) => {
                                        const cost = parseFloat(area.cost) || 0;
                                        return total + cost;
                                      }, 0)
                                      .toLocaleString('en-IN', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 4
                                      })
                                    }
                                  </span>
                                </div>
                              </Grid>
                            )}

                            {/* Add New Project Area Button */}
                            <Grid item xs={12}>
                              <div
                                onClick={() => {
                                  const projectAreas = values.projectAreas || [];
                                  const addresses = values.addresses || [];

                                  // Add new project area with unique ID for tracking
                                  const newProjectArea = {
                                    id: Date.now().toString() + Math.random().toString(36).substr(2, 9), // Unique ID for new items
                                    label: '',
                                    projectArea: '',
                                    costType: '1', // Default to Rate type
                                    rate: '',
                                    cost: ''
                                  };

                                  const newAddress = {
                                    projectAddress: '',
                                    zipCode: '',
                                    mapLocation: '',
                                    latitude: '',
                                    longitude: '',
                                    country: '',
                                    state: '',
                                    city: '',
                                    locality: '',
                                    googleMapLink: '',
                                    googleMyBusinessLink: '',
                                    isDefault: false
                                  };

                                  setFieldValue('projectAreas', [...projectAreas, newProjectArea]);
                                  setFieldValue('addresses', [...addresses, newAddress]);
                                }}
                                style={{
                                  marginTop: "10px",
                                  width: "100%",
                                  padding: "10px 0px",
                                  borderStyle: 'dotted',
                                  borderColor: '#DBB3B3',
                                  borderWidth: '1px',
                                  borderRadius: '12px',
                                  color: "#9D4141",
                                  cursor: "pointer"
                                }}
                                className='justify-content-center align-items-center d-flex text-center'
                              >
                                Add New Project Area
                              </div>
                            </Grid>
                          </Grid>
                        </fieldset>
                      )}

                      {/* Client Details Section - Multiple Teams */}
                      <fieldset style={{ borderTop: '1px solid #9D4141', padding: '14px' }} className='mt-7'>
                        <legend style={{
                          fontSize: '17px',
                          fontWeight: 500,
                          fontFamily: 'Inter',
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
                        }}>
                          <div className="ms-5" style={{ borderTop: "1px solid #9D4141", width: "30px", height: "0px" }}></div>
                          TEAM DETAILS
                        </legend>
                        <Grid container spacing={1} className='card-body p-md-10' sx={{ backgroundColor: { xs: 'transparent', md: 'white', borderRadius: '8px' } }}>

                          <FieldArray name="leadTeams">
                            {({ push, remove }) => (
                              <>
                                {/* Show message when no teams exist */}
                                {(!values.leadTeams || values.leadTeams.length === 0) && (
                                  <Grid item xs={12}>
                                    <Box sx={{
                                      textAlign: 'center',
                                      py: 3,
                                      color: '#666',
                                      fontStyle: 'italic'
                                    }}>
                                      No teams added yet. Click "Add Another Team" to get started.
                                    </Box>
                                  </Grid>
                                )}

                                {values.leadTeams && values.leadTeams.map((team: any, index: number) => (
                                  <Grid container spacing={1} key={team.id || index} sx={{ position: 'relative', mb: 3 }}>
                                    <Box sx={{
                                      width: '100%',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      mb: 2,
                                      px: 2
                                    }}>
                                      <Typography style={{
                                        color: "#798DB3",
                                        fontSize: "14px",
                                        fontFamily: "Inter"
                                      }}>Team {index + 1}</Typography>
                                      {(values.leadTeams || []).length > 1 && (
                                        <IconButton
                                          onClick={() => remove(index)}
                                          sx={{ color: '#d32f2f' }}
                                          title="Remove this team"
                                        >
                                          <Close />
                                        </IconButton>
                                      )}
                                      {(values.leadTeams || []).length === 1 && (
                                        <IconButton
                                          onClick={() => {
                                            // Allow removing the last team - set to empty array
                                            setFieldValue('leadTeams', []);
                                          }}
                                          sx={{ color: '#d32f2f' }}
                                          title="Remove all teams"
                                        >
                                          <Close />
                                        </IconButton>
                                      )}
                                    </Box>

                                    <Grid item xs={12} md={6} lg={3}>
                                      <DropDownInput
                                        formikField={`leadTeams.${index}.companyTypeId`}
                                        inputLabel="Company Type"
                                        isRequired={false}
                                        onChange={(val: any) => {
                                          const newCompanyTypeId = val?.value || "";
                                          setFieldValue(`leadTeams.${index}.companyTypeId`, newCompanyTypeId);

                                          // Only clear dependent fields if the company type actually changed
                                          if (team.companyTypeId !== newCompanyTypeId) {
                                            setFieldValue(`leadTeams.${index}.companyId`, "");
                                            setFieldValue(`leadTeams.${index}.subCompanyId`, "");
                                            setFieldValue(`leadTeams.${index}.contactId`, "");
                                          }
                                        }}
                                        options={allCompanyTypes.map((c: any) => ({ value: c.id, label: c.name }))}
                                      />
                                      <small
                                        className="text-primary"
                                        onClick={() => setShowCompanyTypeModal(true)}
                                        style={{ cursor: "pointer" }}
                                      >
                                        + New
                                      </small>
                                    </Grid>

                                    <Grid item xs={12} md={6} lg={3}>
                                      <DropDownInput
                                        formikField={`leadTeams.${index}.companyId`}
                                        inputLabel="Company"
                                        isRequired={false}
                                        disabled={!team.companyTypeId}
                                        options={companies
                                          ?.filter(c => c.companyTypeId === team.companyTypeId)
                                          ?.map(c => ({ value: c.id, label: c.companyName })) || []}
                                        onChange={(val: any) => {
                                          const companyId = val?.value || "";
                                          setFieldValue(`leadTeams.${index}.companyId`, companyId);

                                          // Only clear dependent fields if the company actually changed
                                          if (team.companyId !== companyId) {
                                            setFieldValue(`leadTeams.${index}.subCompanyId`, "");
                                            setFieldValue(`leadTeams.${index}.contactId`, "");
                                          }

                                          // Fetch contacts for the selected company
                                          if (companyId) {
                                            fetchContactsByCompanyId(companyId, index);
                                          } else {
                                            // Clear contacts if no company selected
                                            setTeamFilteredContacts(prev => ({ ...prev, [index]: [] }));
                                          }
                                        }}
                                      />
                                      <small
                                        className="text-primary"
                                        onClick={() => setShowCompanyModal(true)}
                                        style={{ cursor: "pointer" }}
                                      >
                                        + New
                                      </small>
                                    </Grid>

                                    <Grid item xs={12} md={6} lg={3}>
                                      <DropDownInput
                                        formikField={`leadTeams.${index}.subCompanyId`}
                                        inputLabel="Sub Company"
                                        isRequired={false}
                                        disabled={!team.companyId}
                                        options={(() => {
                                          const selectedCompany = companies?.find(c => c.id === team.companyId);
                                          return selectedCompany?.subCompanies?.map((c: any) => ({
                                            value: c.id,
                                            label: c.subCompanyName
                                          })) || [];
                                        })()}
                                        onChange={(val: any) => {
                                          setFieldValue(`leadTeams.${index}.subCompanyId`, val?.value || "");
                                        }}
                                      />
                                      <small
                                        className="text-primary"
                                        onClick={() => setShowSubCompanyModal(true)}
                                        style={{ cursor: "pointer" }}
                                      >
                                        + New
                                      </small>
                                    </Grid>

                                    <Grid item xs={12} md={6} lg={3}>
                                      <DropDownInput
                                        formikField={`leadTeams.${index}.contactId`}
                                        inputLabel="Contact Person"
                                        isRequired={false}
                                        disabled={!team.companyId}
                                        options={(teamFilteredContacts[index] || []).map((contact) => ({
                                          value: contact.id,
                                          label: contact.fullName,
                                          avatar: contact.profilePhoto
                                        }))}
                                        showColor={true}
                                        onChange={(val: any) => {
                                          setFieldValue(`leadTeams.${index}.contactId`, val?.value || "");
                                        }}
                                      />
                                      <small
                                        className="text-primary"
                                        onClick={() => setShowContactModal(true)}
                                        style={{ cursor: "pointer" }}
                                      >
                                        + New
                                      </small>
                                    </Grid>
                                  </Grid>
                                ))}

                                {/* Add Another Team Button */}
                                <Grid item xs={12}>
                                  <div
                                    onClick={() => push({
                                      id: Date.now().toString(),
                                      companyTypeId: '',
                                      companyId: '',
                                      subCompanyId: '',
                                      contactId: ''
                                    })}
                                    style={{
                                      marginTop: "10px",
                                      width: "100%",
                                      padding: "10px 0px",
                                      borderStyle: 'dotted',
                                      borderColor: '#DBB3B3',
                                      borderWidth: '1px',
                                      borderRadius: '12px',
                                      color: "#9D4141",
                                      cursor: "pointer"
                                    }}
                                    className='justify-content-center align-items-center d-flex text-center'
                                  >
                                    Add Another Team
                                  </div>
                                </Grid>
                              </>
                            )}
                          </FieldArray>

                        </Grid>

                        {/* Single Team (Legacy - Commented for backward compatibility) */}
                        {/* 
                        <Grid container spacing={1} className='card-body p-md-10' sx={{ backgroundColor: { xs: 'transparent', md: 'white', borderRadius: '8px' } }}>
                          <Grid item xs={12} md={4} lg={3}>
                            <DropDownInput
                              formikField="companyTypeId"
                              inputLabel="Company Type"
                              isRequired={false}
                              options={allCompanyTypes.map((c:any) => ({ value: c.id, label: c.name }))}
                            />
                          </Grid>
                          <Grid item xs={12} md={4} lg={3}>
                            <DropDownInput
                              formikField="companyId"
                              inputLabel="Company"
                              isRequired={false}
                              options={filteredCompanies.map(c => ({ value: c.id, label: c.companyName }))}
                            />
                          </Grid>
                          <Grid item xs={12} md={4} lg={3}>
                            <DropDownInput
                              formikField="subCompanyId"
                              inputLabel="Sub Company"
                              isRequired={false}
                              options={(filteredSubCompanies || [])?.map((c:any) => ({ value: c.id, label: c.subCompanyName }))}
                            />
                          </Grid>
                          <Grid item xs={12} md={4} lg={3}>
                            <DropDownInput
                              formikField="contactPersonId"
                              inputLabel="Contact Person"
                              isRequired={false}
                              options={contacts.map((contact) => ({ value: contact.id, label: contact.fullName }))}
                            />
                          </Grid>
                        </Grid>
                        */}

                      </fieldset>



                      {/* Address Details Section */}
                      {leadTemplateId === leadAndProjectTemplateTypeId.mep && (
                        <>
                          <fieldset style={{ borderTop: '1px solid #9D4141', padding: '16px' }} className='mt-7' >
                            <legend style={{
                              fontSize: '17px',
                              fontWeight: 600,
                              fontFamily: 'Inter',
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
                            }}>
                              <div className="ms-5" style={{ borderTop: "1px solid #9D4141", width: "30px", height: "0px" }}></div>
                              ADDRESS DETAILS
                            </legend>
                            <Grid container spacing={1} className='card-body p-md-10' sx={{ backgroundColor: { xs: 'transparent', md: 'white', borderRadius: '8px' } }}>
                              {/* Direct rendering of single address - no mapping/filtering needed */}
                              <Grid container spacing={1} className='card-body p-md-10 mb-4'
                                sx={{
                                  backgroundColor: { xs: 'transparent', md: 'white' },
                                  borderRadius: '8px',
                                  position: 'relative'
                                }}
                              >
                                {/* <Box sx={{ 
                              width: '100%', 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              mb: 2,
                              px: 2
                            }}>
                              <Typography variant="h6">Project Address</Typography>
                            </Box> */}

                                <Grid item xs={12} md={6}>
                                  <TextInput
                                    formikField="addresses.0.projectAddress"
                                    label="Address"
                                    isRequired={false}
                                  />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                  <DropDownInput
                                    formikField="addresses.0.country"
                                    inputLabel="Country"
                                    options={countries.map((c) => ({
                                      label: c.name,
                                      value: c.id,
                                    }))}
                                    isRequired={false}
                                    enableSmartSort={true} // Added: Enable smart priority-based sorting
                                    smartFilterFunction={getFilteredAndSortedOptions} // Added: Smart filter and sort function
                                    onChange={(option: any) => {
                                      if (option?.value) {
                                        // Set the country value in addresses array
                                        setFieldValue("addresses.0.country", option.value);

                                        // Update the state options
                                        handleAddressCountryChange(0, option.value, setFieldValue);

                                        // Clear dependent fields
                                        setFieldValue("addresses.0.state", '');
                                        setFieldValue("addresses.0.city", '');
                                      } else {
                                        // Handle clearing the country selection
                                        setFieldValue("addresses.0.country", '');
                                        setFieldValue("addresses.0.state", '');
                                        setFieldValue("addresses.0.city", '');

                                        // Clear dependent options
                                        setFieldValue('addressStatesOptions.0', []);
                                        setFieldValue('addressCitiesOptions.0', []);
                                        setFieldValue('addressStateSelections.0', null);
                                        setFieldValue('addressCitySelections.0', null);
                                      }
                                    }}
                                    value={
                                      values.addresses?.[0]?.country
                                        ? {
                                          label:
                                            countries.find(
                                              (c) => c.id === values.addresses[0].country
                                            )?.name || values.addresses[0].country,
                                          value: values.addresses[0].country,
                                        }
                                        : null
                                    }
                                  />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                  <DropDownInput
                                    formikField="addresses.0.state"
                                    inputLabel="State"
                                    options={(values.addressStatesOptions?.[0] || []).map((s: any) => ({
                                      label: s.name,
                                      value: s.id
                                    }))}
                                    isRequired={false}
                                    disabled={!values.addresses?.[0]?.country}
                                    enableSmartSort={true} // Added: Enable smart priority-based sorting
                                    smartFilterFunction={getFilteredAndSortedOptions} // Added: Smart filter and sort function
                                    onChange={(option: any) => {
                                      if (option?.value) {
                                        // Set the state value in addresses array
                                        setFieldValue("addresses.0.state", option.value);

                                        // Update city options
                                        handleAddressStateChange(
                                          0,
                                          option.value,
                                          values.addresses[0].country,
                                          setFieldValue
                                        );

                                        // Clear city
                                        setFieldValue("addresses.0.city", '');
                                      } else {
                                        // Clear state and city values
                                        setFieldValue("addresses.0.state", '');
                                        setFieldValue("addresses.0.city", '');
                                        setFieldValue("addressStateSelections.0", null);
                                        setFieldValue("addressCitySelections.0", null);
                                        setFieldValue("addressCitiesOptions.0", []);
                                      }
                                    }}
                                    value={values.addressStateSelections?.[0] ? {
                                      label: values.addressStateSelections[0].name,
                                      value: values.addressStateSelections[0].id
                                    } : null}
                                    placeholder={values.addresses?.[0]?.country ? "Select state" : "Select country first"}
                                  />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                  <DropDownInput
                                    formikField="addresses.0.city"
                                    inputLabel="City"
                                    options={(values.addressCitiesOptions?.[0] || []).map((c: any) => ({
                                      label: c.name,
                                      value: c.id
                                    }))}
                                    isRequired={false}
                                    disabled={!values.addresses?.[0]?.state}
                                    enableSmartSort={true} // Added: Enable smart priority-based sorting
                                    smartFilterFunction={getFilteredAndSortedOptions} // Added: Smart filter and sort function
                                    onChange={(option: any) => {
                                      setFieldValue("addresses.0.city", option?.value || "");
                                      if (option?.value) {
                                        const selectedCity = values.addressCitiesOptions[0].find(
                                          (c: any) => c.id === option.value
                                        );
                                        setFieldValue("addressCitySelections.0", selectedCity);
                                      } else {
                                        setFieldValue("addressCitySelections.0", null);
                                      }
                                    }}
                                    value={values.addressCitySelections?.[0] ? {
                                      label: values.addressCitySelections[0].name,
                                      value: values.addressCitySelections[0].id
                                    } : null}
                                    placeholder={values.addresses?.[0]?.state ? "Select city" : "Select state first"}
                                  />
                                </Grid>

                                <Grid item xs={12} md={6}>
                                  <TextInput
                                    formikField="addresses.0.locality"
                                    label="Locality"
                                    isRequired={false}
                                  />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                  <TextInput
                                    formikField="addresses.0.zipCode"
                                    label="Zip Code"
                                    isRequired={false}
                                  />
                                </Grid>
                                {/* Location on Map Card */}
                                <div className="mt-5 p-3" style={{ borderRadius: '8px', backgroundColor: '#fafafa' }}>
                                  <div className="mb-4" style={{ fontFamily: 'Inter', fontSize: '14px', fontWeight: '500', color: '#9D4141' }}>LOCATION ON MAP</div>
                                  <Row className="mb-3">
                                    <Col md={3}>
                                      <TextInput
                                        formikField="addresses.0.googleMapLink"
                                        label="Google Map Link"
                                        isRequired={false}
                                      />
                                    </Col>
                                    <Col md={3}>
                                      <TextInput
                                        formikField="addresses.0.googleMyBusinessLink"
                                        label="Google Business Link"
                                        isRequired={false}
                                      />
                                    </Col>
                                    <Col md={3}>
                                      <TextInput
                                        formikField="addresses.0.latitude"
                                        label="Latitude"
                                        isRequired={false}
                                        inputValidation='decimal'
                                      />
                                    </Col>
                                    <Col md={3}>
                                      <TextInput
                                        formikField="addresses.0.longitude"
                                        label="Longitude"
                                        isRequired={false}
                                        inputValidation='decimal'
                                      />
                                    </Col>
                                    <div
                                      className="d-flex justify-content-end mt-4"
                                      onClick={() => viewLocation(
                                        values.addresses[0]?.latitude || '',
                                        values.addresses[0]?.longitude || ''
                                      )}
                                      style={{
                                        cursor: 'pointer',
                                        color: '#9D4141',
                                        // textDecoration: 'underline'
                                      }}
                                    >
                                      View Location On Map
                                    </div>
                                  </Row>
                                </div>

                                {/* <div
                              onClick={() => {
                                const newReferral = {
                                  id: Date.now().toString(),
                                  referralType: '',
                                  referringCompany: '',
                                  referringContact: ''
                                };
                                setFieldValue('referrals', [...values.referrals, newReferral]);
                              }}
                              style={{
                                marginTop: "10px", width: "100%", padding: "10px 0px", borderStyle: 'dotted',
                                borderColor: '#DBB3B3',
                                borderWidth: '1px',
                                borderRadius: '12px',
                                color: "#9D4141",
                                cursor: "pointer"
                              }}
                              className='justify-content-center align-items-center d-flex text-center'
                            >
                              
                            
                            ADDRESS DETAILS
                            <IconButton
                              onClick={() => {
                                const addresses = values.addresses || [];
                                setFieldValue('addresses', [
                                ...addresses,
                                {
                                  projectAddress: '',
                                  zipCode: '',
                                  mapLocation: '',
                                  latitude: '',
                                  longitude: '',
                                  country: '',
                                  state: '',
                                  city: '',
                                  locality: '',
                                  googleMapLink: '',
                                  googleMyBusinessLink: '',
                                  isDefault: false
                                }
                              ]);
                            }}
                            style={{ marginLeft: '8px' }}
                          >
                            <Add />
                          </IconButton>
                          </div>
                           */}
                              </Grid>
                            </Grid>
                          </fieldset>
                        </>
                      )}

                      {/* {(leadTemplateId === leadAndProjectTemplateTypeId.mep || leadTemplateId === leadAndProjectTemplateTypeId.webDev) && ( */}
                      <>
                        {/* Floating Title with Line */}
                        <fieldset style={{ borderTop: '1px solid #9D4141', padding: '16px' }} className='mt-7' >
                          <legend style={{
                            fontSize: '17px',
                            fontWeight: 600,
                            fontFamily: 'Inter',
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
                          }}>
                            <div className="ms-5" style={{ borderTop: "1px solid #9D4141", width: "30px", height: "0px" }}></div>
                            ADDITIONAL INFO
                          </legend>
                        </fieldset>

                        {/* Card content below the title */}
                        {/* <div className="card">
                            <div className="card-body"> */}
                        <Grid container spacing={1} className='card-body p-8  p-md-16' sx={{ backgroundColor: { xs: 'transparent', md: 'white', borderRadius: '8px' } }}>

                          <Row>
                            <Col>
                              <div className="col-lg-12">
                                <label className="mb-3 fw-bold">
                                  Upload Document File
                                </label>
                                {/* Show existing document if available */}
                                {values.documents && (
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
                                )}
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
                          {leadTemplateId === leadAndProjectTemplateTypeId.webDev && (
                            <Grid container spacing={1}>
                              <Grid item xs={12} md={6}>
                                <TextInput
                                  formikField="type"
                                  label="Type"
                                  isRequired={false}
                                />
                              </Grid>
                              <Grid item xs={12} md={6}>
                                <TextInput
                                  formikField="numberOfPages"
                                  label="Number of Page"
                                  isRequired={false}
                                  inputTypeNumber={true}
                                  inputValidation="numbers"
                                />
                              </Grid>
                            </Grid>
                          )}

                          {/* {leadTemplateId === leadAndProjectTemplateTypeId.mep && ( */}
                          <>
                            {/* <Grid container spacing={1}>                                                               */}

                            {/* <Grid item xs={12} md={6}>
                                    <DropDownInput
                                      formikField="locality"
                                      inputLabel="Locality"
                                      isRequired={false}
                                      options={[
                                        { value: 'india', label: 'India' },
                                        { value: 'usa', label: 'USA' },
                                        { value: 'uk', label: 'UK' },
                                      ]}
                                    />
                                  </Grid> */}
                            {/* </Grid> */}

                            {/* <Grid container spacing={1} className="mt-2">
                                  <Grid item xs={12} md={6}>
                                    <TextInput formikField="poNumber" label="PO Number" isRequired={false} inputValidation="numbers-space" />
                                  </Grid>
                                  <Grid item xs={12} md={6}>
                                    <DateInput
                                      formikField="poDate"
                                      inputLabel="PO Date"
                                      formikProps={formikProps}
                                      placeHolder="1/3/2025"
                                      isRequired={false}
                                    />
                                  </Grid>
                                </Grid> */}

                            <div className="form-section mb-4 mt-2 w-100">
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
                                        setFieldValue("description", e.target.value)
                                      }
                                    // style={{
                                    //   backgroundColor: "#F3F4F7",
                                    // }}
                                    />
                                    <Form.Text className="text-muted">
                                      {(values.description || '').length}/200 characters
                                    </Form.Text>
                                  </Form.Group>
                                </Col>
                              </Row>
                            </div>
                          </>
                          {/* )} */}
                        </Grid>
                      </>
                      {/* )} */}

                      {/* Status Section */}
                      <fieldset style={{ borderTop: '1px solid #9D4141', padding: 'clamp(14px, 2vw, 15px)' }} className='mt-7'>
                        <legend style={{
                          fontSize: '17px',
                          fontWeight: 600,
                          fontFamily: 'Inter',
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
                        }}>
                          <div className="ms-5" style={{ borderTop: "1px solid #9D4141", width: "30px", height: "0px" }}></div>
                          STATUS
                        </legend>
                        <div className="card-body card responsive-card p-md-10 p-3">
                          <Row>
                            <Col md={6}>
                              <DropdownInput
                                formikField="statusId"
                                inputLabel="Status"
                                isRequired={false}
                                options={leadStatuses.map(s => ({
                                  value: s.id, label: s.name, color: s.color
                                }))}
                                placeholder="Select status"
                                showColor={true}
                              />
                              <div
                                onClick={() => { setShowStatusModal(true) }}
                                style={{ whiteSpace: 'nowrap', color: "#9D4141", cursor: "pointer", marginTop: "8px" }}
                              >
                                + New Status
                              </div>


                              {/* Render handled by for "Received" status */}
                              {values.statusId && (() => {
                                const selectedStatus = leadStatuses.find(s => s.id === values.statusId);
                                const statusName = selectedStatus?.name?.toLowerCase().trim();

                                return statusName === "received" ? null : null;
                              })()}

                            </Col>
                          </Row>
                        </div>
                      </fieldset>

                      {/* CANCELLATION REASON Card - only visible when lead Status is "Not Received" */}
                      {(() => {
                        const selectedStatus = leadStatuses.find((s: any) => s.id === values.statusId);
                        const isStatusNotReceived = selectedStatus?.name?.toLowerCase().trim() === 'not received';
                        if (!isStatusNotReceived) return null;
                        return (
                          <fieldset style={{ borderTop: '1px solid #9D4141', padding: 'clamp(14px, 2vw, 15px)' }} className='mt-7'>
                            <legend style={{
                              fontSize: '17px',
                              fontWeight: 600,
                              fontFamily: 'Inter',
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
                            }}>
                              <div className="ms-5" style={{ borderTop: "1px solid #9D4141", width: "30px", height: "0px" }}></div>
                              CANCELLATION REASON
                            </legend>
                            <div className="card-body card responsive-card p-md-10 p-3">
                              <Row>
                                <Col md={6}>
                                  <DropdownInput
                                    formikField="cancellationReasonId"
                                    inputLabel="Cancellation Reason"
                                    isRequired={true}
                                    options={(leadCancellationReasons || []).map(reason => ({
                                      value: reason.id,
                                      label: reason.reason,
                                      color: reason.color
                                    }))}
                                    placeholder="Select cancellation reason"
                                    showColor={true}
                                  />
                                </Col>
                              </Row>
                            </div>
                          </fieldset>
                        );
                      })()}

                      {/* HANDLE BY Card - only visible when lead Status is "Received" */}
                      {(() => {
                        const selectedStatus = leadStatuses.find((s: any) => s.id === values.statusId);
                        const isStatusReceived = selectedStatus?.name?.toLowerCase().trim() === 'received';
                        if (!isStatusReceived) return null;
                        return (
                          <fieldset style={{ borderTop: '1px solid #9D4141', padding: 'clamp(14px, 2vw, 15px)' }} className='mt-7'>
                            <legend style={{
                              fontSize: '17px',
                              fontWeight: 600,
                              fontFamily: 'Inter',
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
                            }}>
                              <div className="ms-5" style={{ borderTop: "1px solid #9D4141", width: "30px", height: "0px" }}></div>
                              HANDLE BY
                            </legend>
                            <div className="card-body card responsive-card p-md-10 p-3">
                              {/* Column headers */}
                              {(values.handledByEntries || []).length > 0 && (
                                <Row className="mb-1">
                                  <Col md={4}>
                                    <label className="d-flex align-items-center fs-6 form-label mb-1">
                                      Handle By
                                    </label>
                                  </Col>
                                  <Col md={4}>
                                    <label className="d-flex align-items-center fs-6 form-label mb-1">
                                      Date In
                                    </label>
                                  </Col>
                                  <Col md={4}>
                                    <label className="d-flex align-items-center fs-6 form-label mb-1">
                                      Date Out
                                    </label>
                                  </Col>
                                </Row>
                              )}

                              {/* Empty state */}
                              {(!values.handledByEntries || values.handledByEntries.length === 0) && (
                                <Box sx={{
                                  textAlign: 'center',
                                  py: 3,
                                  color: '#666',
                                  fontStyle: 'italic',
                                  fontSize: '14px',
                                  fontFamily: 'Inter',
                                }}>
                                  No handled by added yet. Click "+ Add Handle By" to get started.
                                </Box>
                              )}

                              {/* Dynamic Handled By entries */}
                              {(values.handledByEntries || []).map((entry: any, idx: number) => (
                                <Row key={entry.id || idx} className="mb-2 align-items-center">
                                  <Col md={4}>
                                    <DropdownInput
                                      formikField={`handledByEntries[${idx}].employeeId`}
                                      inputLabel=""
                                      isRequired={false}
                                      options={allEmployees?.list?.map((item: any) => ({
                                        value: item.employeeId,
                                        label: item.employeeName,
                                        avatar: item.avatar,
                                      })) || []}
                                      placeholder="Select employee"
                                      showColor={true}
                                    />
                                  </Col>
                                  <Col md={4}>
                                    <DateInput
                                      formikField={`handledByEntries[${idx}].handledDate`}
                                      inputLabel=""
                                      formikProps={formikProps}
                                      placeHolder="DD-MM-YYYY"
                                      isRequired={false}
                                    />
                                  </Col>
                                  <Col md={3}>
                                    <DateInput
                                      formikField={`handledByEntries[${idx}].handledOutDate`}
                                      inputLabel=""
                                      formikProps={formikProps}
                                      placeHolder="DD-MM-YYYY"
                                      isRequired={false}
                                    />
                                  </Col>
                                  <Col md={1} className="d-flex justify-content-center">
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
                                  </Col>
                                </Row>
                              ))}

                              {/* + Add Handle By button */}
                              <div
                                onClick={() => {
                                  const today = values.leadInquiryDate || new Date().toISOString().split('T')[0];
                                  const newEntry = {
                                    id: Date.now().toString(),
                                    employeeId: '',
                                    handledDate: today,
                                    handledOutDate: '',
                                  };
                                  setFieldValue('handledByEntries', [...(values.handledByEntries || []), newEntry]);
                                }}
                                style={{
                                  marginTop: '8px',
                                  padding: '8px 12px',
                                  borderStyle: 'dotted',
                                  borderColor: '#DBB3B3',
                                  borderWidth: '1px',
                                  borderRadius: '8px',
                                  color: '#9D4141',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  fontSize: '13px',
                                  fontFamily: 'Inter',
                                  width: '100%',
                                  justifyContent: 'center',
                                }}
                              >
                                <Add fontSize="small" />
                                Add Handle By
                              </div>
                            </div>
                          </fieldset>
                        );
                      })()}

                      {/* PO STATUS Card - only visible when lead Status is "Received" */}
                      {(() => {
                        const selectedStatus = leadStatuses.find((s: any) => s.id === values.statusId);
                        const isStatusReceived = selectedStatus?.name?.toLowerCase().trim() === 'received';
                        if (!isStatusReceived) return null;
                        return (
                          <fieldset style={{ borderTop: '1px solid #9D4141', padding: 'clamp(14px, 2vw, 15px)' }} className='mt-7'>
                            <legend style={{
                              fontSize: '17px', fontWeight: 600, fontFamily: 'Inter',
                              marginTop: "-25px", marginLeft: "-17px", backgroundColor: "#F3F4F7",
                              width: "auto", lineHeight: "1", letterSpacing: 0, color: "#9D4141",
                              padding: "2px 2px 8px", display: "flex", alignItems: "center", gap: "8px"
                            }}>
                              <div className="ms-5" style={{ borderTop: "1px solid #9D4141", width: "30px", height: "0px" }}></div>
                              PO STATUS
                            </legend>
                            <div className="card-body card responsive-card p-md-10 p-3">
                              <Row>
                                <Col md={6}>
                                  <DropdownInput
                                    formikField="poStatus"
                                    inputLabel="PO Status"
                                    isRequired={false}
                                    options={[
                                      { value: 'Pending', label: 'Pending', color: '#FFC107' },
                                      { value: 'Received', label: 'Received', color: '#28A745' },
                                    ]}
                                    placeholder="Select PO status"
                                    showColor={true}
                                  />
                                </Col>
                              </Row>
                            </div>
                          </fieldset>
                        );
                      })()}

                      {/* PO DETAILS Card - only visible when lead Status is "Received" AND PO Status is "Received" */}
                      {(() => {
                        const selectedStatus = leadStatuses.find((s: any) => s.id === values.statusId);
                        const isStatusReceived = selectedStatus?.name?.toLowerCase().trim() === 'received';
                        if (!isStatusReceived || values.poStatus !== 'Received') return null;
                        return (
                          <fieldset style={{ borderTop: '1px solid #9D4141', padding: 'clamp(14px, 2vw, 15px)' }} className='mt-7'>
                            <legend style={{
                              fontSize: '17px', fontWeight: 600, fontFamily: 'Inter',
                              marginTop: "-25px", marginLeft: "-17px", backgroundColor: "#F3F4F7",
                              width: "auto", lineHeight: "1", letterSpacing: 0, color: "#9D4141",
                              padding: "2px 2px 8px", display: "flex", alignItems: "center", gap: "8px"
                            }}>
                              <div className="ms-5" style={{ borderTop: "1px solid #9D4141", width: "30px", height: "0px" }}></div>
                              PO DETAILS
                            </legend>
                            <div className="card-body card responsive-card p-md-10 p-3">
                              <Row>
                                <Col md={6}>
                                  <TextInput formikField="poNumber" label="PO Number" isRequired={false} inputValidation="numbers-space" />
                                </Col>
                                <Col md={6}>
                                  <DateInput
                                    formikField="poDate"
                                    inputLabel="PO Date"
                                    formikProps={formikProps}
                                    placeHolder="1/3/2025"
                                    isRequired={false}
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
                                          const { data: { path } } = await uploadUserAsset(form, userId, "leads/po");
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
                        );
                      })()}

                      {/* Upload Document File Section */}
                      {/* <fieldset style={{ borderTop: '1px solid #9D4141', padding: 'clamp(14px, 2vw, 15px)' }} className='mt-7'>
                        <legend style={{
                          fontSize: '17px',
                          fontWeight: 600,
                          fontFamily: 'Inter',
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
                        }}>
                          <div className="ms-5" style={{borderTop: "1px solid #9D4141", width: "30px", height: "0px"}}></div>
                          ADDITIONAL DETAILS
                        </legend>

                        
                      </fieldset> */}

                      <div>
                        {!hasDefaultStatus() && (
                          <Box sx={{
                            mt: 2,
                            p: 2,
                            backgroundColor: '#fff3cd',
                            border: '1px solid #ffeaa7',
                            borderRadius: '8px',
                            color: '#856404'
                          }}>
                            <Typography sx={{
                              fontSize: '14px',
                              fontFamily: 'Inter',
                              fontWeight: '500',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1
                            }}>
                              ⚠️ Warning: There should be a Status present that is marked as default. Please configure a default status in Lead Configuration before creating leads.
                            </Typography>
                          </Box>
                        )}
                      </div>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-start', gap: 2, mt: 3, mb: 2 }}>
                        <Button
                          type="submit"
                          variant="primary"
                          disabled={isSubmitting || !hasDefaultStatus()}
                          style={{
                            opacity: (!hasDefaultStatus()) ? 0.6 : 1,
                            cursor: (!hasDefaultStatus()) ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {isSubmitting
                            ? (isEditMode ? 'Updating...' : 'Submitting...')
                            : (isEditMode ? 'Update' : 'Submit')
                          }
                        </Button>
                      </Box>
                    </Box>
                  </FormikForm>
                )
              }}
            </Formik>
          </Modal.Body>
        </Box>

      </Modal>

      {/* Configuration Forms */}
      <div>
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

        <NewCompanyForm
          show={showCompanyModal}
          onClose={handleCompanyModalClose}
        />

        <SubCompanyForm
          show={showSubCompanyModal}
          onClose={handleSubCompanyModalClose}
        />

        <CompaniesBranchForm
          show={showBranchModal}
          onClose={handleBranchModalClose}
        />

        {/* Client Contacts Form */}
        <ClientContactsForm
          show={showContactModal}
          onClose={handleContactModalClose}
          contactId={editingContactId}
        />

        <LeadsConfigForm
          show={showDirectSourceModal}
          onClose={handleDirectSourceModalClose}
          type="direct-source"
          title="Direct Source"
        />

        <LeadsConfigForm
          show={showStatusModal}
          onClose={handleStatusModalClose}
          type="status"
          title="Status"
        />

        <LeadsConfigForm
          show={showReferralTypeModal}
          onClose={handleReferralTypeModalClose}
          type="referral"
          title="Referral Type"
        />

        <CompanyConfigForm
          show={showCompanyTypeModal}
          onClose={() => setShowCompanyTypeModal(false)}
          title="Company Type"
          type="company-type"
        />
      </div>
    </div>
  );
};

export default LeadFormModal;