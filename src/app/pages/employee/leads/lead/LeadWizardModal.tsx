import { resolveActiveOrg } from '@utils/activeOrg';
import { IconButton, Box, Typography, Grid, Tooltip } from "@mui/material";
import { Close, Add, Delete } from "@mui/icons-material";
import React, {
  useCallback,
  useEffect,
  useState,
  useRef,
  Fragment,
  useMemo,
} from "react";
import {
  Formik,
  Form as FormikForm,
  Field,
  FieldArray,
  useFormikContext,
} from "formik";
import HighlightErrors from "@app/modules/errors/components/HighlightErrors";
import * as Yup from "yup";
import dayjs from "dayjs";
import DropDownInput from "@app/modules/common/inputs/DropdownInput";
import TextInput from "@app/modules/common/inputs/TextInput";
import TextAreaInput from "@app/modules/common/inputs/TextAreaInput";
import {
  leadAndProjectTemplateTypeId,
  prefixIdentifier,
} from "@constants/statistics";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@redux/store";
import {
  getAllProjectCategories,
  getAllProjectServices,
  getAllProjectStatuses,
  getAllProjectSubcategories,
  getAllTeams,
} from "@services/projects";
import {
  getAllClientCompanies,
  getAllClientContacts,
  getAllCompanyTypes,
  getClientContactsByCompanyId,
} from "@services/companies";
import {
  fetchSubCompaniesByMainCompanyId,
  fetchCompanyOverview,
} from "@services/company"; // Added: fetchCompanyOverview for internal referrals
import { fetchAllEmployees } from "@services/employee"; // Added: fetchAllEmployees for internal referrals
import {
  getAllClientBranches,
  getAllLeadReferralType,
  getAllLeadsCountIncludingDeleted,
  getLeadsCountByFiscalYear,
  getAllLeadStatus,
  getAllLeadDirectSource,
} from "@services/lead";
import {
  fetchAllCities,
  fetchAllCountries,
  fetchAllPrefixSettings,
  fetchAllStates,
} from "@services/options";
import { convertFiscalYearToYearFormat } from "@app/modules/common/components/PrefixSettingsForm";
import PrefixInlineEdit from "@app/modules/common/components/PrefixInlineEdit";
import { loadAllEmployeesIfNeeded } from "@redux/slices/allEmployees";
import DateInput from "@app/modules/common/inputs/DateInput";
import {
  createLead,
  getAllLeads,
  getLeadById,
  updateLead,
  exportLeadDocx,
  exportLeadPdf,
} from "@services/leads";
import { uploadUserAsset } from "@services/uploader";
import {
  customConfirmation,
  errorConfirmation,
  successConfirmation,
} from "@utils/modal";
import ProjectConfigForm from "@pages/employee/projects/configure/components/ProjectConfigForm";
import CompaniesBranchForm from "@pages/employee/companies/companies/components/CompaniesBranchForm";
import NewCompanyForm from "@pages/employee/companies/companies/components/NewCompanyForm";
import ClientContactsForm from "@pages/employee/companies/contacts/components/ClientContactsForm";
import { Modal, Form, Row, Col, Button, Dropdown } from "react-bootstrap";
import LeadsConfigForm from "../configuration/components/LeadsConfigForm";
import eventBus from "@utils/EventBus";
import { EVENT_KEYS } from "@constants/eventKeys";
import CompanyConfigForm from "@pages/employee/companies/companyConfig/components/CompanyConfigForm";
import FormikDropdownInput from "@app/modules/common/inputs/FormikDropdownInput";
import SubCompanyForm from "@pages/employee/companies/companies/components/SubCompanryForm";
import MultiSelectWithInlineCreate, {
  Option,
} from "@app/modules/common/components/MultiSelectWithInlineCreate";
import {
  createNewService,
  createNewCategory,
  createNewSubcategory,
  transformToOptions,
} from "@app/modules/common/components/InlineCreateHelpers";
import DropdownInput from "@app/modules/common/inputs/DropdownInput";
import { getAllLeadCancellationReasons } from "@services/lead";

import { LeadWorkspace } from "@app/pages/employee/forms/lead/LeadWorkspace";
import { useCompanyHierarchy } from "@/shared/form-engine";

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
  employees?: Array<{
    id: string;
    users: { firstName: string; lastName: string };
  }>;
  leadSources?: Array<{ id: string; name: string }>;
  // referralTypes?: Array<{ id: string; name: string }>;
}

// Helper component for company name field with tooltip
const CompanyNameFieldWithTooltip: React.FC<{ index: number }> = ({
  index,
}) => {
  const { values } = useFormikContext<any>();
  const companyName = values?.referrals?.[index]?.companyName || "";

  return (
    <Tooltip title={companyName || ""} arrow placement="top">
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

// Helper function to sort items alphabetically
const sortItemsAlphabetically = <T extends { name: string }>(
  items: T[],
): T[] => {
  return [...items].sort((a, b) => a.name.localeCompare(b.name));
};

// Helper function to sort companies alphabetically by companyName
const sortCompaniesByName = <T extends { companyName: string }>(
  items: T[],
): T[] => {
  return [...items].sort((a, b) => a.companyName.localeCompare(b.companyName));
};

// Helper function to sort contacts alphabetically by fullName
const sortContactsByName = <T extends { fullName: string }>(
  items: T[],
): T[] => {
  return [...items].sort((a, b) => a.fullName.localeCompare(b.fullName));
};

// Helper function to sort employees alphabetically by full name (firstName + lastName)
const sortEmployeesByName = <
  T extends { users: { firstName: string; lastName: string } },
>(
  items: T[],
): T[] => {
  return [...items].sort((a, b) => {
    const nameA = `${a.users.firstName} ${a.users.lastName}`.toLowerCase();
    const nameB = `${b.users.firstName} ${b.users.lastName}`.toLowerCase();
    return nameA.localeCompare(nameB);
  });
};

// Helper function to sort allEmployees list (from Redux) by employeeName
const sortAllEmployeesByName = <T extends { employeeName: string }>(
  items: T[],
): T[] => {
  return [...items].sort((a, b) =>
    a.employeeName.localeCompare(b.employeeName),
  );
};

// Build options for employee dropdowns in lead forms.
// Active employees are always shown. Inactive employees are shown ONLY when they
// match `currentValueId` (i.e. they are already saved on the record) so existing
// data is never lost. Inactive options are labelled "(Inactive)", visually dimmed,
// and marked `isDisabled` so they cannot be chosen for new assignments.
const buildEmployeeOptions = (
  employees: any[],
  currentValueId?: string,
): {
  value: string;
  label: string;
  avatar?: string;
  isDisabled?: boolean;
  isInactive?: boolean;
}[] => {
  const sorted = sortAllEmployeesByName(employees);
  const options: {
    value: string;
    label: string;
    avatar?: string;
    isDisabled?: boolean;
    isInactive?: boolean;
  }[] = [];
  for (const emp of sorted) {
    const isInactive = emp.isActive === false;
    // Include inactive employees only if they are the currently-saved value
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

const LeadWizardModal = ({
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
  const [referrals, setReferrals] = useState([
    {
      id: Date.now().toString(),
      referralType: "",
      referringCompanyType: "", // Added: For external referrals - company type filter
      referringCompany: "",
      referringSubCompany: "",
      referringContact: "",
      referredByEmployeeId: "", // Added: For internal referrals
      companyName: "", // Added: For internal referrals
    },
    {
      id: (Date.now() + 1).toString(),
      referralType: "",
      referringCompanyType: "", // Added: For external referrals - company type filter
      referringCompany: "",
      referringSubCompany: "",
      referringContact: "",
      referredByEmployeeId: "", // Added: For internal referrals
      companyName: "", // Added: For internal referrals
    },
  ]);
  const formikRef = useRef<any>(null);
  const dispatch = useDispatch<AppDispatch>();
  const createdById = useSelector(
    (state: RootState) => state.employee?.currentEmployee?.id,
  );
  const allEmployees = useSelector((state: RootState) => state.allEmployees);

  //new
  const [leadCancellationReasons, setLeadCancellationReasons] = useState<
    Array<{ id: string; reason: string; color: string }>
  >([]);
  const fetchLeadCancellationReasons = useCallback(async () => {
    try {
      const response = await getAllLeadCancellationReasons();
      // Check the actual response structure
      console.log("Cancellation Reasons Response:", response);

      // Adjust based on your API response structure:
      const data =
        response?.data?.leadCancellationReasons ||
        response?.leadCancellationReasons ||
        response?.data ||
        [];

      setLeadCancellationReasons(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching cancellation reasons:", error);
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
  const [filteredCompanies, setFilteredCompanies] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [countries, setCountries] = useState<any[]>([]);
  const [referralTypes, setReferralTypes] = useState<any[]>([]);
  const [leadDirectSources, setLeadDirectSources] = useState<any[]>([]);
  const [subCompanies, setSubCompanies] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [projectData, setProjectData] = useState<any>(null);
  const [useCalculatedAmount, setUseCalculatedAmount] = useState<boolean>(true);
  const [allCompanyTypes, setAllCompanyTypes] = useState<
    { id: string | number; name: string; parentTypeId?: string | null }[]
  >([]); //new update of alpabetical order
  const [currCompanyTypeId, setCurrCompanyTypeId] = useState("");
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
  const [showCompanyTypeModal, setShowCompanyTypeModal] = useState(false);
  const [showLeadSourceModal, setShowLeadSourceModal] = useState(false);
  const [showDirectSourceModal, setShowDirectSourceModal] = useState(false);
  const [showReferralTypeModal, setShowReferralTypeModal] = useState(false);
  const [leadStatuses, setLeadStatuses] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [existingLeads, setExistingLeads] = useState<any[]>([]);

  useEffect(() => {
    getAllLeads()
      .then((res: any) => setExistingLeads(res?.data?.leads || res?.data?.data?.leads || res?.leads || res?.data || res || []))
      .catch(() => { });
  }, []);

  const handleExport = async (type: "docx" | "pdf", values: any) => {
    if (!values.id) return;
    setIsGenerating(true);
    try {
      // Resolve Company Names for File Location
      const selectedCompanyType =
        allCompanyTypes.find(
          (t) => String(t.id) == String(values.fileLocationCompanyType),
        )?.name || "";
      const selectedCompany =
        companies.find(
          (c) => String(c.id) == String(values.fileLocationCompany),
        )?.companyName || "";

      // Resolve Address Names (picking from first row)
      const firstAddr = values.addresses?.[0] || {};

      // Use selections from Formik state first (if user interacted)
      const stateSelection = values.addressStateSelections?.[0];
      const citySelection = values.addressCitySelections?.[0];

      const resolvedCountry =
        countries.find((c) => String(c.id) == String(firstAddr.country))
          ?.name ||
        firstAddr.country ||
        "";

      // Try to resolve State and City from selection, then from the full list, then from the options array in Formik values
      const stateOptions = values.addressStatesOptions?.[0] || [];
      const cityOptions = values.addressCitiesOptions?.[0] || [];

      const resolvedState =
        stateSelection?.name ||
        states.find((s) => String(s.id) == String(firstAddr.state))?.name ||
        stateOptions.find((s: any) => String(s.id) == String(firstAddr.state))
          ?.name ||
        firstAddr.state ||
        "";

      const resolvedCity =
        citySelection?.name ||
        cities.find((c) => String(c.id) == String(firstAddr.city))?.name ||
        cityOptions.find((c: any) => String(c.id) == String(firstAddr.city))
          ?.name ||
        firstAddr.city ||
        "";

      // Resolve Multiple Services and Categories
      const resolvedServices = (values.serviceIds || []).map(
        (id: string) =>
          services.find((s) => String(s.id) == String(id))?.name || id,
      );
      const resolvedCategories = (values.categoryIds || []).map(
        (id: string) =>
          categories.find((c) => String(c.id) == String(id))?.name || id,
      );

      const exportData = {
        ...values,
        fileLocationCompanyType:
          selectedCompanyType || values.fileLocationCompanyType,
        fileLocationCompany: selectedCompany || values.fileLocationCompany,
        // Override service/category lists with names
        service_names: resolvedServices,
        category_names: resolvedCategories,
        // Override address fields with names
        addresses: values.addresses?.map((addr: any, index: number) =>
          index === 0
            ? {
              ...addr,
              country: resolvedCountry,
              state: resolvedState,
              city: resolvedCity,
            }
            : addr,
        ),
        address:
          values.addresses?.[0]?.projectAddress || values.projectAddress || "",
        // Use selected template or default to placeholder.docx
        templateName:
          values.selected_template ||
          values.exportTemplate ||
          "placeholder.docx",
      };

      const data =
        type === "docx"
          ? await exportLeadDocx(values.id, exportData)
          : await exportLeadPdf(values.id, exportData);

      const blob = new Blob([data], {
        type:
          type === "docx"
            ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            : "application/pdf",
      });

      // PREMIUM: Use File System Access API if available (shows "Save As" dialog)
      if ("showSaveFilePicker" in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: `Lead_${values.projectName || values.id}.${type}`,
            types: [
              {
                description: type === "docx" ? "Word Document" : "PDF Document",
                accept: { [blob.type]: [`.${type}`] },
              },
            ],
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          console.log("✅ File saved successfully via Save Picker");
          return; // Exit if successful
        } catch (err: any) {
          if (err.name === "AbortError") return; // User cancelled
          console.warn(
            "Save Picker failed, falling back to standard download:",
            err,
          );
        }
      }

      // FALLBACK: Standard download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `Lead_${values.projectName || values.id}.${type}`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(`Error exporting ${type}:`, error);
    } finally {
      setIsGenerating(false);
    }
  };
  const employeeId = useSelector(
    (state: RootState) => state.employee?.currentEmployee?.id,
  );
  const [prefix, setPrefix] = useState("");
  const userId = useSelector((state: RootState) => state.auth.currentUser.id);
  const [currLeadData, setCurrLeadData] = useState<any>();
  const [filteredSubCompanies, setFilteredSubCompanies] = useState<any[]>([]);
  const [referralSubCompanies, setReferralSubCompanies] = useState<{
    [key: number]: any[];
  }>({});
  // Added: State for filtered contacts per team
  const [teamFilteredContacts, setTeamFilteredContacts] = useState<{
    [key: number]: any[];
  }>({});
  // Added: State for filtered contacts per referral (for external referrals only)
  const [referralFilteredContacts, setReferralFilteredContacts] = useState<{
    [key: number]: any[];
  }>({});
  // Added: State for internal referrals feature
  const [internalEmployees, setInternalEmployees] = useState<any[]>([]); // For internal reference dropdown
  const [companyOverview, setCompanyOverview] = useState<any[]>([]); // For company name readonly field
  // console.log("type:: ", leadTemplateId);

  // Smart search helper functions for address dropdowns (country, state, city)
  // These functions provide better search experience by prioritizing matches that start with user input
  // and handling case-insensitive search with special character support
  const normalizeString = (str: string): string => {
    if (!str) return "";
    // Convert to lowercase and remove diacritics/accents for better matching
    // This handles names like "São Paulo", "México", etc.
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
      .trim();
  };

  // Helper function to get match priority for sorting
  const getMatchPriority = (option: any, inputValue: string): number => {
    if (!inputValue || !inputValue.trim()) return 999; // No input, maintain original order

    const normalizedInput = normalizeString(inputValue.trim());
    const normalizedLabel = normalizeString(option.label || "");

    if (!normalizedLabel || !normalizedInput) return 999;

    // Priority 1: Exact match at the beginning (highest priority)
    if (normalizedLabel.startsWith(normalizedInput)) return 1;

    // Priority 2: Any word starts with input (second priority)
    const wordsInLabel = normalizedLabel.split(/\s+/);
    if (wordsInLabel.some((word) => word.startsWith(normalizedInput))) return 2;

    // Priority 3: Contains input anywhere (lowest priority)
    if (normalizedLabel.includes(normalizedInput)) return 3;

    // No match
    return 999;
  };

  // Smart filter function that works with react-select
  const createSmartFilter = (option: any, filterData: any) => {
    // Extract inputValue from the filter data object
    const inputValue = filterData?.inputValue || "";

    // Show all options if no input is provided
    if (!inputValue || !inputValue.trim()) return true;

    const priority = getMatchPriority(option, inputValue);
    return priority < 999; // Show only options that have a match
  };

  // Enhanced filtering that returns sorted options
  const getFilteredAndSortedOptions = (options: any[], inputValue: string) => {
    if (!inputValue || !inputValue.trim()) return options;

    // Filter and sort options by priority
    const filtered = options.filter((option) => {
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
      return (optionA.label || "").localeCompare(optionB.label || "");
    });
  };

  // Smart sort function to maintain priority order
  const createSmartSort = (inputValue: string) => {
    return (optionA: any, optionB: any) => {
      if (!inputValue || !inputValue.trim()) {
        // No input - maintain alphabetical order
        return (optionA.label || "").localeCompare(optionB.label || "");
      }

      const priorityA = getMatchPriority(optionA, inputValue);
      const priorityB = getMatchPriority(optionB, inputValue);

      // First sort by priority (lower number = higher priority)
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // Same priority - sort alphabetically within the same priority group
      return (optionA.label || "").localeCompare(optionB.label || "");
    };
  };

  // Enhanced decimal validation functions for COMMERCIALS section
  const validateDecimalInput = (
    value: string,
    maxValue: number = 10000000000,
  ): { isValid: boolean; errorMessage: string } => {
    if (!value || value === "") {
      return { isValid: true, errorMessage: "" };
    }

    // Allow empty string, just numbers, or valid decimal format
    const trimmedValue = value.trim();
    if (trimmedValue === "") {
      return { isValid: true, errorMessage: "" };
    }

    // Check if value is a valid number format (allows leading zeros, decimals, etc.)
    const numericValue = parseFloat(trimmedValue);
    if (isNaN(numericValue)) {
      return { isValid: false, errorMessage: "Please enter a valid number" };
    }

    // Check if value exceeds maximum (100 Crores = 1,00,00,00,000)
    if (numericValue > maxValue) {
      return { isValid: false, errorMessage: "Value cannot exceed 100 Crores" };
    }

    // Check decimal places (max 4) - improved regex to handle various formats
    const decimalRegex = /^(\d+\.?\d{0,4}|\.\d{1,4})$/;
    if (!decimalRegex.test(trimmedValue)) {
      return {
        isValid: false,
        errorMessage: "Maximum 4 decimal places allowed",
      };
    }

    return { isValid: true, errorMessage: "" };
  };

  // Custom validation that works with TextInput component's validation mechanism
  const createValidationFunction = (maxValue: number = 10000000000) => {
    return (value: string): string => {
      const validation = validateDecimalInput(value, maxValue);
      return validation.isValid ? "" : validation.errorMessage;
    };
  };

  // Helper to validate calculated values and show warnings
  const validateCalculatedCost = (
    cost: number,
    setFieldError: Function,
    fieldPath: string,
  ): boolean => {
    if (cost > 10000000000) {
      // 100 Crores
      setFieldError(fieldPath, "Calculated cost exceeds 100 Crores limit");
      return false;
    }
    setFieldError(fieldPath, "");
    return true;
  };

  // Enhanced TextInput component with decimal validation
  const EnhancedDecimalInput = ({
    formikField,
    label,
    isReadonly = false,
    onCalculatedCost = null,
  }: {
    formikField: string;
    label: string;
    isReadonly?: boolean;
    onCalculatedCost?: ((value: number) => void) | null;
  }) => {
    const [validationError, setValidationError] = useState<string>("");

    return (
      <div className="d-flex flex-column fv-row">
        <label className="d-flex align-items-center fs-6 form-label mb-2">
          <span>{label}</span>
        </label>
        <Field name={formikField}>
          {({ field, form }: { field: any; form: any }) => {
            const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
              const inputValue = e.target.value;

              // Enhanced validation for decimal input with max 4 decimals and 100 Crore limit
              if (!isReadonly) {
                const validation = validateDecimalInput(
                  inputValue,
                  10000000000,
                );

                if (!validation.isValid) {
                  setValidationError(validation.errorMessage);
                  return; // Don't update field if validation fails
                } else {
                  setValidationError("");
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
                  <div className="text-danger mt-1 fs-7">{validationError}</div>
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
        projectName: initialData.title || "",

        // Store available states and cities for each address row
        addressStatesOptions: {}, // Format: { rowIndex: [state objects] }
        addressCitiesOptions: {}, // Format: { rowIndex: [city objects] }
        // Store selected values
        addressStateSelections: {}, // Format: { rowIndex: { id, name, iso2 } }
        addressCitySelections: {}, // Format: { rowIndex: { id, name } }

        poNumber: "",
        poDate: "",
        poStatus: "Pending",
        poFile: "",
        service: "",
        category: "",
        statusId: "", // Will be set to default status after statuses are loaded
        subCategory: "",
        // Multi-select arrays for new functionality
        serviceIds: [],
        categoryIds: [],
        subcategoryIds: [],
        startDate: "",
        endDate: "",
        rate: "",
        cost: "",
        description: "", // Empty by default
        // client details (single - keeping for backward compatibility):
        companyTypeId: "",
        subCompanyId: "",
        companyId: "",
        branchId: "",
        company: "",
        contactPerson: "",
        contactRoleId: "",
        cancellationReasonId: "", //new
        cancellationNote: "", // closure note for Canceled / Lost outcomes
        handledBy: "", //new
        handledByEntries: [], // new: array of {id, employeeId, handledDate}
        fileLocationCompanyType: "", //new
        fileLocationCompany: "", //new

        // client teams (multiple teams support):
        leadTeams: [
          {
            id: Date.now().toString(),
            companyTypeId: "",
            companyId: "",
            subCompanyId: "",
            contactId: "",
          },
        ],
        // lead details:
        // Fixed: Respect initialFormData.leadInquiryDate if provided, otherwise auto-fill with today's date
        leadInquiryDate:
          initialFormData?.leadInquiryDate ||
          new Date().toISOString().split("T")[0],
        leadAssignedTo: "",
        leadSourceType: "DIRECT",
        leadDirectSource: "",
        referrals: [...referrals],
        source: "",
        fileLocation: "", // Added: File location field for lead documents/attachments
        documents: "", // Added: Field for uploaded document file paths

        // Project Detail fields
        plotArea: "",
        plotAreaUnit: "sqft",
        builtUpArea: "",
        builtUpAreaUnit: "sqft",
        buildingDetail: "",
        projectPoints: [], // Dynamic project points (replaces otherPoint1/2/3)
        otherPoint1Heading: "",
        otherPoint1Description: "",
        otherPoint2Heading: "",
        otherPoint2Description: "",
        otherPoint3Heading: "",
        otherPoint3Description: "",
        exportTemplate: "placeholder.docx", // Default template
        revision_number: "01",

        // ─── Project fields (empty for new leads, populated on edit if project exists) ───
        projectStatusId: "",
        projectManagerId: "",
        projectTeams: [{ id: Date.now().toString(), teamId: "" }],
        projectHandledByEntries: [],
        projectPrefix: "",

        // additional details
        // Additional fields for web-dev type
        ...(leadTemplateId?.toString() ===
          leadAndProjectTemplateTypeId.webDev?.toString() && {
          type: "", // web-dev specific type
          numberOfPages: "",
        }),

        // Always include addresses for all forms
        addresses: [
          {
            projectAddress: initialData.projectAddress || "",
            zipCode: initialData.zipCode || "",
            mapLocation: initialData.mapLocation || "",
            latitude: initialData.latitude || "",
            longitude: initialData.longitude || "",
            country: initialData.country || "",
            state: initialData.state || "",
            city: initialData.city || "",
            locality: initialData.locality || "",
            googleMapLink: initialData.googleMapLink || "",
            googleMyBusinessLink: initialData.googleMyBusinessLink || "",
            isDefault: initialData.isDefault || false,
          },
        ],
        projectAreas: [
          {
            label: "",
            projectArea: "",
            costType: "",
            rate: "",
            cost: "",
          },
        ],
        // Payment plan (stage-wise fee break-up) selection for the commercial step.
        paymentPlanId: "",
        paymentPlan: null,
        // Meeting schedule type selection for the meeting-schedule step.
        meetingScheduleTypeId: "",
        meetingScheduleType: null,
        useCalculatedAmount: true,

        // status: 'new',
        budget: "",
        ...(initialData?.id && { leadTemplateId: initialData.id }),
        ...initialFormData,
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
        label: commercial.label || "",
        projectArea: commercial.area || "",
        costType:
          commercial.costType === "RATE"
            ? "1"
            : commercial.costType === "LUMPSUM"
              ? "2"
              : "",
        rate: commercial.rate || "",
        cost: commercial.cost || "",
      }))
      : additionalDetailsArray.map((detail: any) => ({
        // Fallback for legacy data that still has projectAreas in additionalDetails
        projectArea: detail.projectArea || "",
        costType: detail.costType || "",
        rate: detail.rate || "",
        cost: detail.cost || "",
        label: "", // Default empty label for legacy data
      }));

    // Handle addresses from single additionalDetails object (one-to-one relationship)
    const addresses =
      leadData.additionalDetails && !Array.isArray(leadData.additionalDetails)
        ? [
          {
            projectAddress: leadData.additionalDetails.projectAddress || "",
            zipCode: leadData.additionalDetails.zipCode || "",
            mapLocation: leadData.additionalDetails.mapLocation || "",
            latitude: leadData.additionalDetails.latitude || "",
            longitude: leadData.additionalDetails.longitude || "",
            // Store country/state/city names - will be converted to IDs in useEffect
            country: leadData.additionalDetails.country || "",
            state: leadData.additionalDetails.state || "",
            city: leadData.additionalDetails.city || "",
            locality: leadData.additionalDetails.locality || "",
            googleMapLink: leadData.additionalDetails.googleMapLink || "",
            googleMyBusinessLink:
              leadData.additionalDetails.googleMyBusinessLink || "",
            isDefault: false,
          },
        ]
        : additionalDetailsArray.length > 0
          ? additionalDetailsArray.map((detail: any) => ({
            projectAddress: detail.projectAddress || "",
            zipCode: detail.zipCode || "",
            mapLocation: detail.mapLocation || "",
            latitude: detail.latitude || "",
            longitude: detail.longitude || "",
            // Convert country name back to ID for form dropdown
            country: (() => {
              const countryName = detail.country;
              const foundCountry = countries.find(
                (c) => c.name === countryName,
              );
              return foundCountry ? foundCountry.id : countryName;
            })(),
            // Convert state name back to ID for form dropdown
            state: (() => {
              const stateName = detail.state;
              const foundState = states.find((s) => s.name === stateName);
              return foundState ? foundState.id : stateName;
            })(),
            // Convert city name back to ID for form dropdown
            city: (() => {
              const cityName = detail.city;
              const foundCity = cities.find((c) => c.name === cityName);
              return foundCity ? foundCity.id : cityName;
            })(),
            locality: detail.locality || "",
            googleMapLink: detail.googleMapLink || "",
            googleMyBusinessLink: detail.googleMyBusinessLink || "",
            isDefault: detail.isDefault || false,
          }))
          : [
            {
              projectAddress: "",
              zipCode: "",
              mapLocation: "",
              latitude: "",
              longitude: "",
              country: "",
              state: "",
              city: "",
              locality: "",
              googleMapLink: "",
              googleMyBusinessLink: "",
              isDefault: false,
            },
          ];

    // Process referrals for edit mode
    const processedReferrals =
      leadData.referrals && leadData.referrals.length > 0
        ? leadData.referrals.map((ref: any) => {
          const companyId = ref.referringCompany?.id || ref.companyId || "";
          // Derive companyTypeId from the full Company object returned by backend (includes companyTypeId)
          const companyTypeId =
            ref.referringCompany?.companyTypeId ||
            ref.referringCompanyTypeId ||
            "";
          // For internal referrals, referredByEmployee.id is the employee's primary key (same as allEmployees.list[].employeeId)
          const referredByEmployeeId =
            ref.referredByEmployee?.id || ref.referredByEmployeeId || "";
          return {
            id: ref.id || Date.now().toString(),
            referralType:
              ref.referralType?.id || ref.leadReferralTypeId || "",
            referringCompanyType: companyTypeId,
            referringCompany: companyId,
            referringSubCompany:
              ref.referringSubCompany?.id || ref.subCompanyId || "",
            referringContact:
              ref.referredByContact?.id || ref.contactId || "",
            referredByEmployeeId: referredByEmployeeId,
            companyName: ref.companyName || "",
          };
        })
        : [
          {
            id: Date.now().toString(),
            referralType: "",
            referringCompanyType: "",
            referringCompany: "",
            referringSubCompany: "",
            referringContact: "",
            referredByEmployeeId: "",
            companyName: "",
          },
        ];

    return {
      leadTemplateId: leadData.leadTemplateId || leadTemplateId,
      projectName: leadData.title || "",

      // Store available states and cities for each address row
      addressStatesOptions: {},
      addressCitiesOptions: {},
      addressStateSelections: {},
      addressCitySelections: {},

      // Map lead data fields to form fields
      service: leadData.projectService?.id || leadData.projectServiceId || "",
      category:
        leadData.projectCategory?.id || leadData.projectCategoryId || "",
      statusId: leadData.status?.id || leadData.statusId || "",
      cancellationReasonId: leadData?.cancellationReasonId || "", //new
      cancellationNote: leadData?.cancellationNote || "", // closure note for Canceled / Lost
      handledBy: leadData?.handledBy || "", //new
      handledByEntries: (() => {
        // Map from backend handledByEntries array
        if (
          leadData?.handledByEntries &&
          Array.isArray(leadData.handledByEntries) &&
          leadData.handledByEntries.length > 0
        ) {
          return leadData.handledByEntries.map((entry: any) => ({
            id: entry.id || Date.now().toString(),
            employeeId: entry.employeeId || "",
            handledDate: entry.handledDate
              ? new Date(entry.handledDate).toISOString().split("T")[0]
              : new Date().toISOString().split("T")[0],
            handledOutDate: entry.handledOutDate
              ? new Date(entry.handledOutDate).toISOString().split("T")[0]
              : "",
          }));
        }
        return [];
      })(), //new
      fileLocationCompanyType: leadData.fileLocationCompanyType || "", //new
      fileLocationCompany: leadData.fileLocationCompany || "", //new
      subCategory:
        leadData.projectSubCategory?.id || leadData.projectSubCategoryId || "",

      // Multi-select arrays for new functionality
      serviceIds: (() => {
        // Handle multiple services from leadData.services array
        if (leadData.services && Array.isArray(leadData.services)) {
          return leadData.services
            .map((s: any) => s.service?.id || s.serviceId)
            .filter(Boolean);
        }
        // Fallback to single service for backward compatibility
        const singleServiceId =
          leadData.projectService?.id || leadData.projectServiceId;
        return singleServiceId ? [singleServiceId] : [];
      })(),

      categoryIds: (() => {
        // Handle multi-select categories from junction table
        if (leadData.leadCategories && Array.isArray(leadData.leadCategories)) {
          return leadData.leadCategories
            .map((lc: any) => lc.category?.id || lc.categoryId)
            .filter(Boolean);
        }
        // Fallback to single category for backward compatibility
        const categoryId =
          leadData.projectCategory?.id || leadData.projectCategoryId;
        return categoryId ? [categoryId] : [];
      })(),

      subcategoryIds: (() => {
        // Handle multi-select subcategories from junction table
        if (
          leadData.leadSubCategories &&
          Array.isArray(leadData.leadSubCategories)
        ) {
          return leadData.leadSubCategories
            .map((lsc: any) => lsc.subcategory?.id || lsc.subcategoryId)
            .filter(Boolean);
        }
        // Fallback to single subcategory for backward compatibility
        const subcategoryId =
          leadData.projectSubCategory?.id || leadData.projectSubCategoryId;
        return subcategoryId ? [subcategoryId] : [];
      })(),
      startDate:
        (leadData.project?.startDate
          ? new Date(leadData.project.startDate).toISOString().split("T")[0]
          : leadData.startDate) || "",
      endDate:
        (leadData.project?.endDate
          ? new Date(leadData.project.endDate).toISOString().split("T")[0]
          : leadData.endDate) || "",
      rate: leadData.rate || "",
      cost: leadData.cost || "",
      description: leadData.description || "",
      budget: leadData.budget || "",

      // Client details (single - keeping for backward compatibility)
      companyTypeId:
        leadData.company?.companyType?.id || leadData.companyTypeId || "",
      subCompanyId: leadData.subCompany?.id || leadData.subCompanyId || "",
      companyId: leadData.company?.id || leadData.companyId || "",
      branchId:
        leadData.leadBranchMapping?.branch?.id || leadData.branchId || "",
      company: leadData.company?.companyName || "",
      contactPerson: leadData.contact?.fullName || "",
      contactPersonId: leadData.contact?.id || leadData.contactId || "",
      contactRoleId: leadData.contactRole?.id || leadData.contactRoleId || "",

      // Client teams (multiple teams support) - robust backward compatibility
      leadTeams: (() => {
        if (
          leadData.leadTeams &&
          Array.isArray(leadData.leadTeams) &&
          leadData.leadTeams.length > 0
        ) {
          // If leadTeams exist in database, map them exactly as they are
          return leadData.leadTeams.map((team: any) => ({
            id: team.id || Date.now().toString(),
            companyTypeId: team.companyType?.id || team.companyTypeId || "",
            companyId: team.company?.id || team.companyId || "",
            subCompanyId: team.subCompany?.id || team.subCompanyId || "",
            contactId: team.contact?.id || team.contactId || "",
          }));
        } else {
          // For backward compatibility: if no leadTeams exist, create one based on legacy fields
          const legacyTeam = {
            id: Date.now().toString(),
            companyTypeId:
              leadData.company?.companyType?.id || leadData.companyTypeId || "",
            companyId: leadData.company?.id || leadData.companyId || "",
            subCompanyId:
              leadData.subCompany?.id || leadData.subCompanyId || "",
            contactId: leadData.contact?.id || leadData.contactId || "",
          };

          // If all fields are empty, provide a clean empty row
          if (
            !legacyTeam.companyTypeId &&
            !legacyTeam.companyId &&
            !legacyTeam.subCompanyId &&
            !legacyTeam.contactId
          ) {
            return [
              {
                id: Date.now().toString(),
                companyTypeId: "",
                companyId: "",
                subCompanyId: "",
                contactId: "",
              },
            ];
          }

          return [legacyTeam];
        }
      })(),

      // Lead details
      revision_number:
        leadData.revisionCount !== undefined
          ? String(leadData.revisionCount).padStart(2, "0")
          : "01",
      // Fixed: Respect initialFormData.leadInquiryDate if provided, then leadData.inquiryDate, then default to today
      leadInquiryDate:
        initialFormData?.leadInquiryDate ||
        (leadData.inquiryDate
          ? new Date(leadData.inquiryDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0]),
      leadAssignedTo: leadData.assignedTo?.id || leadData.assignedToId || "",
      leadSourceType: leadData.leadSourceType || "DIRECT",
      leadDirectSource:
        leadData.leadDirectSource?.id || leadData.leadDirectSourceId || "",
      referrals: processedReferrals,
      source: leadData.source?.id || leadData.sourceId || "",
      fileLocation: leadData.fileLocation || "", // Added: File location field for edit mode
      documents: leadData.documents || "", // Added: Field for uploaded document file paths in edit mode

      // Project Detail fields (from additionalDetails)
      plotArea: leadData.additionalDetails?.plotArea || "",
      plotAreaUnit: leadData.additionalDetails?.plotAreaUnit || "sqft",
      builtUpArea: leadData.additionalDetails?.builtUpArea || "",
      builtUpAreaUnit: leadData.additionalDetails?.builtUpAreaUnit || "sqft",
      buildingDetail: leadData.additionalDetails?.buildingDetail || "",
      projectPoints: leadData.projectPoints || [], // Dynamic project points
      otherPoint1Heading: leadData.additionalDetails?.otherPoint1Heading || "",
      otherPoint1Description:
        leadData.additionalDetails?.otherPoint1Description || "",
      otherPoint2Heading: leadData.additionalDetails?.otherPoint2Heading || "",
      otherPoint2Description:
        leadData.additionalDetails?.otherPoint2Description || "",
      otherPoint3Heading: leadData.additionalDetails?.otherPoint3Heading || "",
      otherPoint3Description:
        leadData.additionalDetails?.otherPoint3Description || "",

      // Additional fields for web-dev type
      ...(leadTemplateId?.toString() ===
        leadAndProjectTemplateTypeId.webDev?.toString() && {
        type: additionalDetailsArray[0]?.type || "",
        numberOfPages: additionalDetailsArray[0]?.numberOfPages || "",
      }),

      // Always include addresses for all forms
      addresses:
        addresses.length > 0
          ? addresses
          : [
            {
              projectAddress: "",
              zipCode: "",
              mapLocation: "",
              latitude: "",
              longitude: "",
              country: "",
              state: "",
              city: "",
              locality: "",
              googleMapLink: "",
              googleMyBusinessLink: "",
              isDefault: false,
            },
          ],
      projectAreas:
        projectAreas.length > 0
          ? projectAreas
          : [
            {
              label: "",
              projectArea: "",
              costType: "",
              rate: "",
              cost: "",
            },
          ],
      // Payment plan selection — prefill from the saved lead so the commercial step
      // re-renders the computed stage break-up on edit.
      paymentPlanId: leadData.paymentPlanId || leadData.paymentPlan?.id || "",
      paymentPlan: leadData.paymentPlan || null,
      // Meeting schedule type selection — prefill so the meeting-schedule step
      // re-resolves the matching bracket + completion year on edit.
      meetingScheduleTypeId: leadData.meetingScheduleTypeId || leadData.meetingScheduleType?.id || "",
      meetingScheduleType: leadData.meetingScheduleType || null,
      poNumber: additionalDetailsArray[0]?.poNumber || "",
      poDate: additionalDetailsArray[0]?.poDate
        ? new Date(additionalDetailsArray[0].poDate)
          .toISOString()
          .split("T")[0]
        : "",
      useCalculatedAmount: true,

      ...initialFormData,

      poStatus: leadData?.poStatus || initialFormData?.poStatus || "Pending",
      poFile: leadData?.poFile || initialFormData?.poFile || "",

      // ─── Project Execution fields ─────────────────────────────────────────────
      // LEAD-AS-MASTER: these now live on the 1:1 lead_executions extension
      // (leadData.execution). The legacy leadData.project shape is kept only as a
      // fallback for un-migrated records. Reading project.* first was why a saved
      // Project Execution step came back EMPTY on reload (data was on .execution).
      projectStatusId: leadData.execution?.projectStatusId || leadData.project?.statusId || "",
      projectManagerId: leadData.execution?.projectManagerId || leadData.project?.assignedToId || leadData.project?.projectManagerId || "",
      projectTeams: (() => {
        if (leadData.project?.projectTeams && Array.isArray(leadData.project.projectTeams)) {
          return leadData.project.projectTeams.map((pt: any) => ({
            id: pt.id || Date.now().toString(),
            teamId: pt.team?.id || pt.teamId || "",
          }));
        }
        return [{ id: Date.now().toString(), teamId: "" }];
      })(),
      projectHandledByEntries: (() => {
        if (leadData.project?.handledByEntries && Array.isArray(leadData.project.handledByEntries)) {
          return leadData.project.handledByEntries.map((entry: any) => ({
            id: entry.id || `phb-${Date.now()}`,
            employeeId: entry.employeeId || "",
            handledDate: entry.handledDate
              ? new Date(entry.handledDate).toISOString().split("T")[0]
              : new Date().toISOString().split("T")[0],
            handledOutDate: entry.handledOutDate
              ? new Date(entry.handledOutDate).toISOString().split("T")[0]
              : "",
          }));
        }
        return [];
      })(),
      projectPrefix: leadData.project?.prefix || "", // read-only display

      // ─── Project Execution (wizard) — pre-fill from the linked project ────────
      // The wizard's ProjectExecutionSection binds to projectMeta.* + the date fields
      // below. Mapped back to Project columns in handleSubmit's projectDelta.
      receivedDate: leadData.project?.poDate
        ? new Date(leadData.project.poDate).toISOString().split("T")[0]
        : leadData.receivedDate || "",
      projectMeta: {
        projectManagerId:
          leadData.execution?.projectManagerId || leadData.project?.projectManagerId || leadData.project?.assignedToId || "",
        teamId: leadData.execution?.teamId || leadData.project?.teamId || "",
        projectAccess: leadData.execution?.projectAccess || leadData.project?.projectAccess || "PRIVATE",
        isLive: leadData.execution?.isLive ?? leadData.project?.isLive ?? false,
        isProjectOpen: leadData.execution?.isProjectOpen ?? leadData.project?.isProjectOpen ?? true,
        contractRate:
          leadData.execution?.rate !== undefined && leadData.execution?.rate !== null
            ? String(leadData.execution.rate)
            : leadData.project?.rate !== undefined && leadData.project?.rate !== null
            ? String(leadData.project.rate)
            : "",
        finalCost:
          leadData.execution?.cost !== undefined && leadData.execution?.cost !== null
            ? String(leadData.execution.cost)
            : leadData.project?.cost !== undefined && leadData.project?.cost !== null
            ? String(leadData.project.cost)
            : "",
        poNumber: leadData.project?.poNumber || "",
        isLocationIncorrect: leadData.project?.isLocationIncorrect ?? false,
        locationRemark: leadData.project?.locationRemark || "",
      },
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
        const {
          data: { data },
        } = await getLeadById(initialFormData?.id);
        const leadData = data?.lead || {};
        setCurrLeadData(leadData);
        setPrefix(leadData?.prefix || "");

        // Force re-render to update initial values when lead data is loaded
        setRefetchData((prev) => !prev);
      }
      fetchLeadById();
    } else {
      async function fetchPrefixSettings() {
        const {
          data: { prefixSettings },
        } = await fetchAllPrefixSettings();
        const currentPrefix = prefixSettings.find(
          (prefix: any) => prefix.identifier == prefixIdentifier.LEAD,
        );
        if (currentPrefix && Object.keys(currentPrefix)?.length) {
          // Convert stored fiscal year to display format (e.g. "2026-04-01 to 2027-03-31" → "2026-27")
          const formattedYear = convertFiscalYearToYearFormat(
            currentPrefix.year,
          );
          // Count only leads in THIS fiscal year so the counter resets each new fiscal year
          const {
            data: { count },
          } = await getLeadsCountByFiscalYear(formattedYear, currentPrefix.prefix);
          // Generate prefix: prefix/year/count format
          const generatedPrefix = `${currentPrefix.prefix}/${formattedYear}/${String(count + 1).padStart(3, "0")}`;
          setPrefix(generatedPrefix);
        }
      }
      fetchPrefixSettings();
    }
  }, [initialFormData?.id]);
  // Validation schema - Only project name and status are required
  const validationSchema = Yup.object().shape({
    projectName: Yup.string().required("Lead name is required"),
    statusId: Yup.string().required("Status is required"),
    description: Yup.string(),
    fileLocation: Yup.string().max(
      250,
      "File location cannot exceed 250 characters",
    ), // Added: File location validation
    // Multi-select arrays validation
    serviceIds: Yup.array()
      .of(Yup.string().uuid("Invalid service ID"))
      .optional(),
    categoryIds: Yup.array()
      .of(Yup.string().uuid("Invalid category ID"))
      .optional(),
    subcategoryIds: Yup.array()
      .of(Yup.string().uuid("Invalid subcategory ID"))
      .optional(),
    // All other fields are optional
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
      }),
    ),
    projectAreas: Yup.array().of(
      Yup.object().shape({
        label: Yup.string().optional(), // Label is optional
        projectArea: Yup.string(),
        costType: Yup.string(),
        rate: Yup.string(),
        cost: Yup.string(),
      }),
    ),
  });

  // fetching all the details:
  // Fetch functionsadd an add new button
  const fetchProjectCategories = useCallback(async () => {
    // if (categories.length > 0) return categories;
    try {
      const response = await getAllProjectCategories();
      const data = response?.projectCategories || [];
      const sortedData = sortItemsAlphabetically(data);
      setCategories(sortedData);
      return sortedData;
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
      const sortedData = sortItemsAlphabetically(data);
      setReferralTypes(sortedData);
      return sortedData;
    } catch (error) {
      console.error("Error fetching referral types:", error);
      return [];
    }
  }, []);

  const fetchAllLeadDirectSources = useCallback(async () => {
    try {
      const response = await getAllLeadDirectSource();
      const data = response?.leadDirectSources || [];
      const sortedData = sortItemsAlphabetically(data);
      setLeadDirectSources(sortedData);
      return sortedData;
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
      const sortedData = sortItemsAlphabetically(data);
      setSubcategories(sortedData);
      return sortedData;
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

      const sortedData = sortItemsAlphabetically(data);
      setServices(sortedData);
      return sortedData;
    } catch (error) {
      console.error("Error fetching services:", error);
      return [];
    }
  }, []);

  const fetchCompanies = useCallback(async () => {
    // if (companies.length > 0) return companies;
    try {
      const response = await getAllClientCompanies(true);
      const data = response?.data?.companies || [];
      const sortedData = sortCompaniesByName(data);
      setCompanies(sortedData);
      setFilteredCompanies(sortedData);
      return sortedData;
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
      const response = await getAllClientContacts({}, true);
      const data = response?.data?.contacts || [];
      const sortedData = sortContactsByName(data);
      setContacts(sortedData);
      return sortedData;
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
          const defaultStatus = data.find(
            (status: any) => status.isDefault === true,
          );
          if (defaultStatus) {
            formikRef.current.setFieldValue("statusId", defaultStatus.id);
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
      const sortedData = sortEmployeesByName(data);
      setInternalEmployees(sortedData);
      return sortedData;
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
  const fetchContactsByCompanyId = useCallback(
    async (companyId: string, teamIndex: number) => {
      try {
        if (!companyId) {
          // Clear contacts for this team if no company selected
          setTeamFilteredContacts((prev) => ({ ...prev, [teamIndex]: [] }));
          return [];
        }

        const response = await getClientContactsByCompanyId(companyId);
        const data = response?.data?.contacts || [];
        const sortedData = sortContactsByName(data);

        // Update contacts for this specific team
        setTeamFilteredContacts((prev) => ({
          ...prev,
          [teamIndex]: sortedData,
        }));
        return sortedData;
      } catch (error) {
        console.error("Error fetching contacts for company:", error);
        // Set empty array on error
        setTeamFilteredContacts((prev) => ({ ...prev, [teamIndex]: [] }));
        return [];
      }
    },
    [],
  );

  // Added: Fetch contacts by company ID for referral filtering (external referrals only)
  const fetchContactsByCompanyIdForReferral = useCallback(
    async (companyId: string, referralIndex: number) => {
      try {
        if (!companyId) {
          // Clear contacts for this referral if no company selected
          setReferralFilteredContacts((prev) => ({
            ...prev,
            [referralIndex]: [],
          }));
          return [];
        }

        const response = await getClientContactsByCompanyId(companyId);
        const data = response?.data?.contacts || [];
        const sortedData = sortContactsByName(data);

        // Update contacts for this specific referral
        setReferralFilteredContacts((prev) => ({
          ...prev,
          [referralIndex]: sortedData,
        }));
        return sortedData;
      } catch (error) {
        console.error("Error fetching contacts for referral company:", error);
        // Set empty array on error
        setReferralFilteredContacts((prev) => ({
          ...prev,
          [referralIndex]: [],
        }));
        return [];
      }
    },
    [],
  );

  // Added: Helper function to check if referral type is internal
  const isInternalReferralType = useCallback(
    (referralTypeId: string): boolean => {
      const referralType = referralTypes.find(
        (type) => type.id === referralTypeId,
      );
      // Check by isInternal flag OR by name (case-insensitive) as fallback
      return (
        referralType?.isInternal === true ||
        referralType?.name?.toLowerCase().trim() === "internal"
      );
    },
    [referralTypes],
  );

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
      const urlParts = url.split("/");
      const fileName = urlParts[urlParts.length - 1];
      // Remove any query parameters
      return fileName.split("?")[0];
    } catch (error) {
      console.error("Error extracting filename:", error);
      return "Document";
    }
  };

  const uploadFile = async (
    event: React.ChangeEvent<HTMLInputElement>,
    formikProps: any,
    fileMaxUploadSize: number,
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
  const handleAddressCountryChange = useCallback(
    async (index: number, countryId: string, setFieldValue: Function) => {
      try {
        const selectedCountry = countries.find((c) => c.id === countryId);
        if (!selectedCountry) {
          console.error("Selected country not found:", countryId);
          return;
        }

        // Update the country in addresses (per-row index — wizard supports multiple)
        setFieldValue(`addresses.${index}.country`, countryId);

        // Clear dependent fields
        setFieldValue(`addresses.${index}.state`, "");
        setFieldValue(`addresses.${index}.city`, "");
        setFieldValue(`addressStateSelections.${index}`, null);
        setFieldValue(`addressCitySelections.${index}`, null);

        // Clear city options for this row
        setFieldValue(`addressCitiesOptions.${index}`, []);

        // Fetch and set states for this country
        const states = await fetchAllStates(selectedCountry.iso2);
        setFieldValue(`addressStatesOptions.${index}`, states);
      } catch (error) {
        console.error("Error in handleAddressCountryChange:", error);
        setFieldValue(`addressStatesOptions.${index}`, []);
        setFieldValue(`addressCitiesOptions.${index}`, []);
      }
    },
    [countries],
  );

  const handleAddressStateChange = useCallback(
    async (
      index: number,
      stateId: string,
      countryId: string,
      setFieldValue: Function,
    ) => {
      try {
        const selectedCountry = countries.find((c) => c.id === countryId);
        const states =
          formikRef.current?.values.addressStatesOptions?.[index] || [];
        const selectedState = states.find((s: any) => s.id === stateId);

        if (!selectedCountry || !selectedState) {
          console.error("Country or state not found:", { countryId, stateId });
          return;
        }

        // Update the state in addresses and selections (per-row index)
        setFieldValue(`addresses.${index}.state`, stateId);
        setFieldValue(`addressStateSelections.${index}`, selectedState);

        // Clear city values
        setFieldValue(`addresses.${index}.city`, "");
        setFieldValue(`addressCitySelections.${index}`, null);

        // Fetch and set cities for this state
        const cities = await fetchAllCities(
          selectedCountry.iso2,
          selectedState.iso2,
        );
        setFieldValue(`addressCitiesOptions.${index}`, cities);
      } catch (error) {
        console.error("Error in handleAddressStateChange:", error);
        setFieldValue(`addressCitiesOptions.${index}`, []);
      }
    },
    [countries],
  );

  const viewLocation = useCallback((latitude: string, longitude: string) => {
    if (latitude && longitude) {
      const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
      window.open(googleMapsUrl, "_blank");
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
        if (
          !isInternalReferralType(referralTypeId) &&
          referral.referringCompany
        ) {
          // Refresh contacts for this referral
          await fetchContactsByCompanyIdForReferral(
            referral.referringCompany,
            index,
          );
        }
      }
    }
  }, [
    fetchContacts,
    fetchContactsByCompanyId,
    fetchContactsByCompanyIdForReferral,
    isInternalReferralType,
  ]);

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
        fetchLeadCancellationReasons(), //new
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
    fetchLeadCancellationReasons, //new
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
      const { companyTypes } = await getAllCompanyTypes();

      //new update of alpabetical order
      // Keep parentTypeId so downstream dropdowns can show only top-level
      // (main) company types, matching the Company form's behaviour.
      const typesWithIds = companyTypes.map((ct: any, index: number) => ({
        id: ct.id ?? index,
        name: ct.name,
        parentTypeId: ct.parentTypeId ?? null,
      }));
      const sortedCompanyTypes = sortItemsAlphabetically(typesWithIds);
      setAllCompanyTypes(sortedCompanyTypes);
    }
    fetchAndSetCompanyType();
  }, [showCompanyTypeModal]);

  // This effect runs when countries array is populated and we have initialFormData
  // to load states and cities for edit mode
  useEffect(() => {
    const loadLocationData = async () => {
      if (initialFormData?.country && countries.length > 0) {
        console.log("Loading country/state/city data for IDs:", {
          country: initialFormData.country,
          state: initialFormData.state,
          city: initialFormData.city,
        });

        const country = countries.find(
          (c: any) =>
            c.id == initialFormData.country ||
            String(c.id) === initialFormData.country,
        );

        if (country) {
          // Set the country in formik with the proper format for the dropdown
          if (formikRef.current) {
            formikRef.current.setFieldValue("country", country.id);
          }

          const stateData = await fetchAllStates(country.iso2);
          setStates(stateData);

          if (initialFormData?.state) {
            const state = stateData.find(
              (s: any) =>
                s.id == initialFormData.state ||
                String(s.id) === initialFormData.state,
            );
            if (state) {
              // Set the state in formik with the proper format for the dropdown
              if (formikRef.current) {
                formikRef.current.setFieldValue("state", state.id);
              }

              const cityData = await fetchAllCities(country.iso2, state.iso2);
              setCities(cityData);

              if (initialFormData?.city) {
                const city = cityData.find(
                  (c: any) =>
                    c.id == initialFormData.city ||
                    String(c.id) === initialFormData.city,
                );
                if (city && formikRef.current) {
                  formikRef.current.setFieldValue("city", city.id);
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
    if (
      isEditMode &&
      currLeadData &&
      companies.length > 0 &&
      allCompanyTypes.length > 0
    ) {
      const companyTypeId =
        currLeadData.company?.companyType?.id || currLeadData.companyTypeId;
      const companyId = currLeadData.company?.id || currLeadData.companyId;

      if (companyTypeId) {
        setCurrCompanyTypeId(companyTypeId);
        const filteredCompanies = companies?.filter(
          (ele) => ele?.companyTypeId == companyTypeId,
        );
        setFilteredCompanies(filteredCompanies);

        if (companyId) {
          setSelectedCompany(true); // Enable dependent dropdowns
          const companyData = filteredCompanies?.find(
            (ele) => ele?.id == companyId,
          );
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
            const response =
              await fetchSubCompaniesByMainCompanyId(referringCompanyId);
            const subCompanyData =
              response?.data?.subCompanies || response?.subCompanies || [];
            setReferralSubCompanies((prev) => ({
              ...prev,
              [index]: subCompanyData,
            }));
          } catch (error) {
            console.error("Error fetching sub companies for referral:", error);
          }
        }
      });
    }
  }, [isEditMode, currLeadData?.referrals, companies]);

  // Added: Effect to restore referringCompanyType from company data for external referrals in edit mode
  useEffect(() => {
    if (
      isEditMode &&
      currLeadData?.referrals &&
      companies.length > 0 &&
      formikRef.current
    ) {
      currLeadData.referrals.forEach((ref: any, index: number) => {
        const companyTypeId = ref.referringCompany?.companyTypeId || "";
        if (companyTypeId) {
          // Set the referringCompanyType in formik so the company type dropdown shows the correct value
          formikRef.current.setFieldValue(
            `referrals[${index}].referringCompanyType`,
            companyTypeId,
          );
        }
      });
    }
  }, [
    isEditMode,
    currLeadData?.referrals,
    companies.length,
    formikRef.current?.values?.referrals?.length,
  ]);

  // Added: Effect to populate address location data for edit mode
  useEffect(() => {
    const loadAddressLocationData = async () => {
      if (
        isEditMode &&
        currLeadData &&
        countries.length > 0 &&
        formikRef.current
      ) {
        // Get the address data from additionalDetails
        const additionalDetails = currLeadData.additionalDetails;
        if (!additionalDetails) return;

        const addressIndex = 0; // Since we're using single address object now

        // Load country data
        const countryName = additionalDetails.country;
        if (countryName) {
          const foundCountry = countries.find((c) => c.name === countryName);
          if (foundCountry) {
            // Set country in addresses array
            formikRef.current.setFieldValue(
              `addresses.${addressIndex}.country`,
              foundCountry.id,
            );

            // Load states for this country
            try {
              const statesData = await fetchAllStates(foundCountry.iso2);
              formikRef.current.setFieldValue(
                `addressStatesOptions.${addressIndex}`,
                statesData,
              );

              // Load state data
              const stateName = additionalDetails.state;
              if (stateName) {
                const foundState = statesData.find(
                  (s: any) => s.name === stateName,
                );
                if (foundState) {
                  // Set state in addresses array and selections
                  formikRef.current.setFieldValue(
                    `addresses.${addressIndex}.state`,
                    foundState.id,
                  );
                  formikRef.current.setFieldValue(
                    `addressStateSelections.${addressIndex}`,
                    foundState,
                  );

                  // Load cities for this state
                  try {
                    const citiesData = await fetchAllCities(
                      foundCountry.iso2,
                      foundState.iso2,
                    );
                    formikRef.current.setFieldValue(
                      `addressCitiesOptions.${addressIndex}`,
                      citiesData,
                    );

                    // Load city data
                    const cityName = additionalDetails.city;
                    if (cityName) {
                      const foundCity = citiesData.find(
                        (c: any) => c.name === cityName,
                      );
                      if (foundCity) {
                        // Set city in addresses array and selections
                        formikRef.current.setFieldValue(
                          `addresses.${addressIndex}.city`,
                          foundCity.id,
                        );
                        formikRef.current.setFieldValue(
                          `addressCitySelections.${addressIndex}`,
                          foundCity,
                        );
                      }
                    }
                  } catch (error) {
                    console.error("Error loading cities for address:", error);
                  }
                }
              }
            } catch (error) {
              console.error("Error loading states for address:", error);
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
            setTeamFilteredContacts((prev) => ({ ...prev, [index]: data }));
          } catch (error) {
            console.error(`Error fetching contacts for team ${index}:`, error);
            setTeamFilteredContacts((prev) => ({ ...prev, [index]: [] }));
          }
        }
      });
    }
  }, [isEditMode, currLeadData?.leadTeams, companies.length]);

  // Added: Effect to populate filtered contacts for each referral in edit mode (external referrals only)
  useEffect(() => {
    if (
      isEditMode &&
      currLeadData?.referrals &&
      companies.length > 0 &&
      referralTypes.length > 0
    ) {
      currLeadData.referrals.forEach(async (referral: any, index: number) => {
        // Only fetch contacts for external referrals
        const referralTypeId =
          referral.referralType?.id || referral.leadReferralTypeId;
        const referralType = referralTypes.find(
          (type) => type.id === referralTypeId,
        );
        const isInternal =
          referralType?.isInternal === true ||
          referralType?.name?.toLowerCase().trim() === "internal";

        if (!isInternal) {
          const companyId = referral.referringCompany?.id || referral.companyId;
          if (companyId) {
            try {
              // Fetch contacts for this company and populate the referral's filtered contacts
              const response = await getClientContactsByCompanyId(companyId);
              const data = response?.data?.contacts || [];
              setReferralFilteredContacts((prev) => ({
                ...prev,
                [index]: data,
              }));
            } catch (error) {
              console.error(
                `Error fetching contacts for referral ${index}:`,
                error,
              );
              setReferralFilteredContacts((prev) => ({ ...prev, [index]: [] }));
            }
          }
        }
      });
    }
  }, [
    isEditMode,
    currLeadData?.referrals,
    companies.length,
    referralTypes.length,
  ]);

  // const handleSubmit = (values: any) => {

  //   onSubmit(values);
  // };

  const handleSubmit = async (formData: any) => {
    const values = formData;
    // Handle addresses from both form structure and direct payload
    const allAddressDetails =
      formData?.addresses || formData?.additionalDetails?.addresses || [];

    // No need to clean up address fields - Google links are now valid and handled by backend

    // console.log("createdById:: ", createdById);

    if (!createdById) {
      return;
    }

    if (!prefix || !prefix.trim()) {
      errorConfirmation("Inquiry No. is required");
      return;
    }
    const additionalDetailsFields = [
      "projectArea", "addresses",
      ...((leadTemplateId === leadAndProjectTemplateTypeId.webDev) ? ["type", "numberOfPages"] : [])
    ];

    const selectedCountryData = countries.find(
      (c) => c.id === formData.country,
    );
    const selectedStateData = states.find((s) => s.id === formData.state);
    const selectedCityData = cities.find((c) => c.id === formData.city);

    // Extract additionalDetails from formData
    const additionalDetails: Record<string, any> = {};

    // Add other additional details
    additionalDetailsFields.forEach((field) => {
      if (formData[field] !== undefined && formData[field] !== "") {
        if (field === "poDate") {
          const dateValue = new Date(formData[field]);
          if (!isNaN(dateValue.getTime())) {
            additionalDetails[field] = dateValue.toISOString();
          }
        } else if (field === "projectArea") {
          // Project areas will be handled separately
          return;
        } else if (field !== "addresses") {
          // Skip addresses as we handled them above
          additionalDetails[field] = formData[field];
        }
        delete formData[field];
      } else if (
        formData[field] == undefined ||
        formData[field] == "" ||
        formData[field] == null
      ) {
        delete formData[field];
      }
    });

    // A referral row cannot be persisted without a Referral Type — referralTypeId
    // is a required (non-nullable) FK on lead_referrals, and the backend schema
    // 422s the ENTIRE save when a row arrives without it. If the user filled
    // anything on a row but left the type blank, stop with a clear message
    // instead of failing the whole submit with an opaque "Unprocessable Entity".
    const hasTypelessReferral = (formData?.referrals || []).some(
      (ref: any) =>
        !ref.referralType &&
        (ref.referringCompany || ref.referringSubCompany || ref.referringContact || ref.referredByEmployeeId),
    );
    if (hasTypelessReferral) {
      errorConfirmation(
        "One of your referral rows is missing a Referral Type. Please select a type for it (or remove the row) and save again.",
      );
      return;
    }

    const mappedReferrals =
      formData?.referrals?.map((ref: any) => {
        // For internal referrals, don't send a fake companyId - only send referredByEmployeeId
        const isInternal =
          ref.referredByEmployeeId && ref.referredByEmployeeId !== "";
        // Only send companyId if it looks like a real UUID (not the fake 'wisetech-mep' display string)
        const companyId =
          ref.referringCompany && ref.referringCompany !== "wisetech-mep"
            ? ref.referringCompany
            : undefined;
        return {
          leadReferralTypeId: ref.referralType,
          companyId: isInternal ? undefined : companyId,
          subCompanyId: isInternal
            ? undefined
            : ref.referringSubCompany || undefined,
          contactId: isInternal ? undefined : ref.referringContact || undefined,
          referredByEmployeeId: ref.referredByEmployeeId || undefined,
          companyName: ref.companyName || undefined,
        };
      }) || [];

    // Added: Map leadTeams for multiple team entries
    const mappedLeadTeams =
      formData?.leadTeams
        ?.map((team: any) => ({
          companyTypeId: team.companyTypeId,
          companyId: team.companyId,
          subCompanyId: team.subCompanyId,
          contactId: team.contactId,
        }))
        ?.filter(
          (team: any) =>
            team.companyTypeId ||
            team.companyId ||
            team.subCompanyId ||
            team.contactId,
        ) || [];

    // Map and clean addresses - handle both IDs and string values
    const mappedAddresses =
      allAddressDetails?.map((address: any, index: number) => {
        let countryName = address.country || "";
        let stateName = address.state || "";
        let cityName = address.city || "";

        // If country is an ID, convert to name, otherwise use as string
        if (address.country) {
          const selectedCountry = countries.find(
            (c) => c.id === address.country,
          );
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
          const statesOptions =
            values.addressStatesOptions?.[addressIndex] || [];
          const selectedState = statesOptions.find(
            (s: any) => s.id === address.state,
          );
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
          const citiesOptions =
            values.addressCitiesOptions?.[addressIndex] || [];
          const selectedCity = citiesOptions.find(
            (c: any) => c.id === address.city,
          );
          if (selectedCity) {
            cityName = selectedCity.name;
          } else {
            // If not found by ID, assume it's already a string name
            cityName = address.city;
          }
        }

        // Include additional details ID for upsert operations in edit mode
        const additionalDetailsId =
          isEditMode && currLeadData?.additionalDetails?.[index]?.id
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
          isDefault: !!address.isDefault,
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
      commercials:
        (formData.projectAreas || [])
          ?.filter(
            (area: any) =>
              // Include areas that have meaningful data (area, rate, or cost) or an explicit label
              area.projectArea ||
              area.rate ||
              area.cost ||
              (area.label && area.label.trim()),
          )
          .map((area: any) => ({
            ...(isEditMode && area.id && { id: area.id }), // Include ID for edit mode
            label: area.label ? area.label.trim() : "", // Allow empty labels
            area: area.projectArea ? Number(area.projectArea) : null,
            costType:
              area.costType === "1"
                ? "RATE"
                : area.costType === "2"
                  ? "LUMPSUM"
                  : area.costType || "RATE",
            rate: area.rate ? Number(area.rate) : null,
            cost: area.cost ? Number(area.cost) : null,
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
      ...(formData?.cancellationReasonId && {
        cancellationReasonId: formData?.cancellationReasonId,
      }), //new
      ...(formData?.handledBy && { handledBy: formData?.handledBy }), //new
      // handledByEntries: map and include all entries
      handledByEntries: (formData?.handledByEntries || [])
        .filter((entry: any) => entry.employeeId)
        .map((entry: any) => ({
          employeeId: entry.employeeId,
          handledDate:
            entry.handledDate || new Date().toISOString().split("T")[0],
          handledOutDate: entry.handledOutDate || null,
        })),

      // Keep existing fields for backward compatibility
      ...(formData?.contactPersonId && {
        contactId: formData?.contactPersonId,
      }),
      ...(formData?.startDate && { startDate: formData?.startDate }),
      ...(formData?.endDate && { endDate: formData?.endDate }),
      ...(formData?.leadInquiryDate && {
        inquiryDate: formData?.leadInquiryDate,
      }),
      ...(formData?.subCompanyId && { subCompanyId: formData?.subCompanyId }),
      ...(formData?.branchId && {
        leadBranchMapping: { branchId: formData?.branchId },
      }),
      // Always send leadDirectSourceId (even when cleared) so the backend can
      // disconnect it on removal — without this an empty value is omitted from the
      // payload and the removal is never persisted or audited.
      leadDirectSourceId: formData?.leadDirectSource || "",
      additionalDetails: {
        ...additionalDetails,
        // Calculate and include total project area for persistence
        projectArea: (formData.projectAreas || [])
          .reduce((total: any, area: any) => {
            return total + (parseFloat(area.projectArea) || 0);
          }, 0)
          .toString(),
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
        ...(mappedAddresses && mappedAddresses.length > 0
          ? mappedAddresses[0]
          : {}), // Single address object for one-to-one relationship
        // Project Detail fields
        ...(formData.plotArea !== undefined && { plotArea: formData.plotArea }),
        ...(formData.plotAreaUnit !== undefined && {
          plotAreaUnit: formData.plotAreaUnit,
        }),
        ...(formData.builtUpArea !== undefined && {
          builtUpArea: formData.builtUpArea,
        }),
        ...(formData.builtUpAreaUnit !== undefined && {
          builtUpAreaUnit: formData.builtUpAreaUnit,
        }),
        ...(formData.buildingDetail !== undefined && {
          buildingDetail: formData.buildingDetail,
        }),
        ...(formData.otherPoint1Heading !== undefined && {
          otherPoint1Heading: formData.otherPoint1Heading,
        }),
        ...(formData.otherPoint1Description !== undefined && {
          otherPoint1Description: formData.otherPoint1Description,
        }),
        ...(formData.otherPoint2Heading !== undefined && {
          otherPoint2Heading: formData.otherPoint2Heading,
        }),
        ...(formData.otherPoint2Description !== undefined && {
          otherPoint2Description: formData.otherPoint2Description,
        }),
        ...(formData.otherPoint3Heading !== undefined && {
          otherPoint3Heading: formData.otherPoint3Heading,
        }),
        ...(formData.otherPoint3Description !== undefined && {
          otherPoint3Description: formData.otherPoint3Description,
        }),
      },
      // Also include addresses array for backend compatibility
      addresses: mappedAddresses || [],
      referrals:
        // Only rows WITH a Referral Type are sendable — referralTypeId is a
        // required FK on lead_referrals and the backend schema 422s the whole
        // save otherwise. Rows with data but no type are blocked with a message
        // before we get here; fully blank placeholder rows just drop out.
        mappedReferrals?.filter((ref: any) => ref.leadReferralTypeId) || [],
      // Added: Include leadTeams in the payload
      leadTeams: mappedLeadTeams || [],
    };
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
    // paymentPlan is a client-only convenience object (full plan + stages for live
    // rendering). Only the scalar paymentPlanId is persisted; drop the object.
    delete finalData.paymentPlan;
    // Likewise, meetingScheduleType is a client-only object; only the id is persisted.
    delete finalData.meetingScheduleType;
    // delete finalData.cancellationReasonId; //new
    // delete finalData.handledBy; // This will be handled before the delete //new
    // delete finalData.fileLocationCompanyType;//new
    // delete finalData.fileLocationCompany; //new
    delete finalData.exportTemplate;

    // ── Derive closure (Canceled / Lost) state from the selected status ──────────
    // A status flagged isLostOutcome (or the legacy "Canceled") marks the lead as a
    // terminal negative outcome. We stamp isCancelled + a cancellation date and keep
    // the human-readable reason text in sync; reopening the lead clears it all.
    const selectedStatusObj = (leadStatuses || []).find((s: any) => s.id === finalData.statusId);
    const isClosureOutcome =
      !!selectedStatusObj &&
      (selectedStatusObj.isLostOutcome === true || selectedStatusObj.name === "Canceled");
    // "Not Received" is NOT a closure/lost outcome, but the form still captures an
    // optional cancellation reason for it (why the lead was not received). It must be
    // preserved here — the legacy else-branch wiped it, so the reason never persisted
    // and never appeared in the audit trail.
    const isNotReceivedOutcome =
      !!selectedStatusObj && selectedStatusObj.name === "Not Received";
    if (isClosureOutcome) {
      finalData.isCancelled = true;
      finalData.cancellationDate =
        finalData.cancellationDate || currLeadData?.cancellationDate || new Date().toISOString();
      const reasonObj = (leadCancellationReasons || []).find(
        (r: any) => r.id === finalData.cancellationReasonId,
      );
      if (reasonObj?.reason) finalData.reasonForCancellation = reasonObj.reason;
    } else if (isNotReceivedOutcome) {
      // Keep the captured reason; Not Received is not a cancellation, so isCancelled
      // stays false and no cancellation date/note is stamped.
      finalData.isCancelled = false;
      finalData.cancellationDate = null;
      finalData.cancellationNote = "";
      const reasonObj = (leadCancellationReasons || []).find(
        (r: any) => r.id === finalData.cancellationReasonId,
      );
      finalData.reasonForCancellation = reasonObj?.reason || "";
    } else {
      finalData.isCancelled = false;
      finalData.cancellationDate = null;
      finalData.cancellationReasonId = "";
      finalData.cancellationNote = "";
      finalData.reasonForCancellation = "";
    }

    if (
      finalData?.useCalculatedAmount === false ||
      finalData?.useCalculatedAmount === true
    ) {
      delete finalData.useCalculatedAmount;
    }
    // console.log('Form data:', finalData);
    const finalCleanPayload = Object.keys(finalData).reduce((acc, key) => {
      const value = finalData[key];

      // Special handling for fields that should be included even if empty to allow clearing
      if (key === "documents" || key === "description" || key === "fileLocation"
        || key === "cancellationReasonId" || key === "handledBy"
        || key === "cancellationNote" || key === "cancellationDate"
        || key === "reasonForCancellation" || key === "isCancelled"
        || key === "fileLocationCompanyType" || key === "fileLocationCompany"
        || key === "handledByEntries" || key === "poStatus" || key === "poFile"
        || key === "leadAssignedTo" || key === "leadDirectSourceId"
        || key === "paymentPlanId" || key === "meetingScheduleTypeId") {
        acc[key] = value !== undefined ? value : (key === "handledByEntries" ? [] : ""); // Ensure it's included
      } else if (value !== "" && value !== null && value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as any);

    if (finalCleanPayload?.projectAreas) {
      delete finalCleanPayload?.projectAreas;
    }

    // ─── Extract project-only fields (don't send to lead API) ───
    // LEAD-AS-MASTER: execution-only fields (project status/manager/team/access/flags/
    // financials) are written onto the lead's 1:1 execution extension (lead_executions)
    // via the lead payload — no separate project update. (locationRemark /
    // isLocationIncorrect / startDate / endDate / poNumber / poDate already persist on
    // the lead + additionalDetails.)
    const pm = formData.projectMeta || {};
    const toNum = (v: any) =>
      v === "" || v === null || v === undefined || isNaN(Number(v)) ? undefined : Number(v);
    finalCleanPayload.execution = {
      projectStatusId: formData.projectStatusId || null,
      projectManagerId: pm.projectManagerId || null,
      teamId: pm.teamId || null,
      ...(pm.projectAccess ? { projectAccess: pm.projectAccess } : {}),
      isLive: !!pm.isLive,
      isProjectOpen: pm.isProjectOpen !== false,
      rate: toNum(pm.contractRate) ?? null,
      cost: toNum(pm.finalCost) ?? null,
    };

    // Remove the flat project-only fields from the lead payload — they're now carried
    // by finalCleanPayload.execution (lead_executions), not as top-level lead columns.
    delete finalCleanPayload.projectStatusId;
    delete finalCleanPayload.projectManagerId;
    delete finalCleanPayload.projectTeams;
    delete finalCleanPayload.projectHandledByEntries;
    delete finalCleanPayload.projectPrefix;
    delete finalCleanPayload.projectMeta;

    // Add prefix to payload for backend to use
    if (prefix && prefix.trim()) {
      finalCleanPayload.prefix = prefix.trim();
    }

    // Case-insensitive duplicate lead name check — excludes the lead currently being edited
    const newLeadName = (formData.projectName || "").trim().toLowerCase();
    const duplicateLead = existingLeads.find(
      (l: any) => (l.title || l.projectName || "").trim().toLowerCase() === newLeadName &&
        l.id !== (isEditMode ? initialFormData?.id : null)
    );
    if (duplicateLead) {
      errorConfirmation("A lead with this name already exists.");
      return;
    }

    try {
      if (isEditMode) {
        finalCleanPayload.id = initialFormData.id;
        if (employeeId) {
          finalCleanPayload.updatedById = employeeId;
        }
        const updateMode = await customConfirmation();
        if (updateMode === 'cancelled') {
          return;
        }
        // revisionCount is owned by the audit system (single source of truth) and is
        // assigned server-side by the capture worker. The client must NOT send or
        // increment it — doing so previously caused the header to diverge from the
        // audit timeline. Any client-supplied revisionCount is ignored by the backend.
        delete finalCleanPayload.revisionCount;
        finalCleanPayload.skipAudit = updateMode === 'updateOnly';

        const res = await updateLead(finalCleanPayload.id, finalCleanPayload);
        if (res?.hasError) {
          errorConfirmation("Failed to update lead. Please try again.");
        } else {
          // LEAD-AS-MASTER: execution fields were persisted on the lead (execution
          // extension) as part of the lead update — no separate project write.
          successConfirmation("Lead Updated successfully!");
          eventBus.emit(EVENT_KEYS.leadUpdated, { id: res.id });
          if (onClose) onClose();
        }
      } else {
        const res = await createLead(finalCleanPayload);
        if (res?.hasError) {
          errorConfirmation("Failed to create lead. Please try again.");
        } else {
          eventBus.emit(EVENT_KEYS.leadCreated, { id: res.id });
          successConfirmation("Lead created successfully!");
          if (onClose) onClose();
        }
      }
    } catch (error: any) {
      console.error('Error creating lead:', error);
      alert(`Backend Error: ${error?.message || error?.error || JSON.stringify(error)}`);
      // Refetch so the list reflects any partial save that succeeded before the error
      eventBus.emit(EVENT_KEYS.leadUpdated, { id: finalCleanPayload?.id ?? '' });
    }
    // Here you can access all form data in one object
    // You can then send it to your API or process it as needed
  };
  const addReferral = () => {
    setReferrals([
      ...referrals,
      {
        id: Date.now().toString(),
        referralType: "",
        referringCompanyType: "",
        referringCompany: "",
        referringSubCompany: "",
        referringContact: "",
        referredByEmployeeId: "", // Added: For internal referrals
        companyName: "", // Added: For internal referrals
      },
    ]);
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

  // ──────────────────────────────────────────────────────────────────────────
  // EnterpriseForm wizard cascade wiring (migrated reusable form-engine hooks).
  // Per-row company hierarchy comes from useCompanyHierarchy; wrappers also clear
  // dependent Formik fields (parity with the classic form). Execution (project)
  // statuses reuse backup2's `statuses` state — leads remain the source of truth.
  // ──────────────────────────────────────────────────────────────────────────
  const companyCascade = useCompanyHierarchy(companies);

  // Edit mode: preload each leadTeam row's cascade options (sub-companies +
  // contacts) so the saved Sub Company / Contact Person values can render their
  // labels on reopen. Without this the dropdowns have no options and display
  // "Select..." even though the IDs are present in form state. Runs once the
  // company list is available; preloadCascades is keyed by row index to match
  // the FieldArray ordering produced by buildInitialValues.
  const cascadesPreloadedRef = useRef(false);
  useEffect(() => {
    if (
      isEditMode &&
      companies.length > 0 &&
      Array.isArray(currLeadData?.leadTeams) &&
      currLeadData.leadTeams.length > 0 &&
      !cascadesPreloadedRef.current
    ) {
      cascadesPreloadedRef.current = true;
      companyCascade.preloadCascades(
        currLeadData.leadTeams.map((team: any) => ({
          companyTypeId: team.companyType?.id || team.companyTypeId || "",
          companyId: team.company?.id || team.companyId || "",
          subCompanyId: team.subCompany?.id || team.subCompanyId || "",
        })),
      );
    }
  }, [isEditMode, currLeadData?.leadTeams, companies.length, companyCascade]);

  const leadProjectStatuses = statuses;
  // DropDownInput delegates the whole update to onChange — so these wrappers MUST
  // set the changed field themselves, then run the cascade + clear dependents.
  const handleWizardCompanyTypeChange = (index: number, typeId: string, setFieldValue: any) => {
    setFieldValue(`leadTeams.${index}.companyTypeId`, typeId || "");
    companyCascade.handleCompanyTypeChange(index, typeId);
    setFieldValue(`leadTeams.${index}.companyId`, "");
    setFieldValue(`leadTeams.${index}.subCompanyId`, "");
    setFieldValue(`leadTeams.${index}.contactId`, "");
  };
  const handleWizardCompanyChange = (index: number, companyId: string, setFieldValue: any) => {
    setFieldValue(`leadTeams.${index}.companyId`, companyId || "");
    companyCascade.handleCompanyChange(index, companyId);
    setFieldValue(`leadTeams.${index}.subCompanyId`, "");
    setFieldValue(`leadTeams.${index}.contactId`, "");
  };
  const handleWizardSubCompanyChange = (index: number, subCompanyId: string, companyId: string, setFieldValue: any) => {
    setFieldValue(`leadTeams.${index}.subCompanyId`, subCompanyId || "");
    companyCascade.handleSubCompanyChange(index, subCompanyId, companyId);
    setFieldValue(`leadTeams.${index}.contactId`, "");
  };
  // Reverse cascade: picking a Contact Person back-fills Company Type / Company /
  // Sub Company from the contact's own linkage, then repopulates the cascade option
  // lists so those upstream dropdowns render their labels. Lets the user find a
  // person without remembering which company they belong to.
  const handleWizardContactChange = (index: number, contactId: string, setFieldValue: any) => {
    setFieldValue(`leadTeams.${index}.contactId`, contactId || "");
    if (!contactId) return;
    const contact = (contacts || []).find((c: any) => String(c.id) === String(contactId));
    if (!contact) return;
    const companyId = contact.companyId ? String(contact.companyId) : "";
    const subCompanyId = contact.subCompanyId ? String(contact.subCompanyId) : "";
    const company = (companies || []).find((c: any) => String(c.id) === String(companyId));
    const companyTypeId = company?.companyTypeId ? String(company.companyTypeId) : "";

    if (companyTypeId) setFieldValue(`leadTeams.${index}.companyTypeId`, companyTypeId);
    if (companyId) setFieldValue(`leadTeams.${index}.companyId`, companyId);
    setFieldValue(`leadTeams.${index}.subCompanyId`, subCompanyId);

    if (companyTypeId) companyCascade.handleCompanyTypeChange(index, companyTypeId);
    if (companyId) {
      Promise.resolve(companyCascade.handleCompanyChange(index, companyId)).then(() => {
        if (subCompanyId) companyCascade.handleSubCompanyChange(index, subCompanyId, companyId);
      });
    }
  };

  return (
    <div>
      {/* Main Modal — full screen for the wizard layout */}
      <Modal
        show={open}
        onHide={onClose}
        fullscreen
        className="responsive-modal lead-wizard-modal"
        dialogClassName="responsive-modal"
      >
        <Box
          sx={{
            position: "relative",
            backgroundColor: "#F3F4F7",
            height: "100%",
            overflow: "hidden",
          }}
        >
          {/* Close — absolute so it never consumes the wizard's height.
              The wizard renders its own header (title) and footer (Cancel/Save). */}
          <IconButton
            onClick={onClose}
            sx={{
              position: "absolute",
              right: { xs: 8, md: 16 },
              top: { xs: 8, md: 12 },
              zIndex: 1300,
              color: "text.secondary",
            }}
          >
            <Close />
          </IconButton>
          <Modal.Body
            className="responsive-modal"
            style={{ padding: 0, height: "100%", overflow: "hidden" }}
          >
            <Formik
              initialValues={initialValues}
              validationSchema={validationSchema}
              onSubmit={handleSubmit}
              enableReinitialize={true}
              innerRef={formikRef}
            >
              {/* Named (capitalized) function, not an anonymous arrow, so
                  react-hooks/rules-of-hooks recognizes this as a component
                  and allows the useEffect calls below it. */}
              {function FormikBody(formikProps) {
                const {
                  values,
                  setFieldValue,
                  errors,
                  touched,
                  isSubmitting,
                  validateForm,
                } = formikProps;

                useEffect(() => {
                  if (
                    useCalculatedAmount
                  ) {
                    const cost =
                      Number(values.rate || 0) *
                      Number(values.projectArea || 0);
                    setFieldValue("cost", cost);
                  }
                }, [values.rate, values.projectArea, useCalculatedAmount]);

                // Set default direct source when leadSource is DIRECT
                useEffect(() => {
                  if (
                    values.leadSourceType === "DIRECT" &&
                    leadDirectSources.length > 0 &&
                    !values.leadDirectSource
                  ) {
                    const defaultDirectSource = leadDirectSources.find(
                      (source) => source.name?.toLowerCase() === "direct",
                    );
                    if (
                      defaultDirectSource &&
                      defaultDirectSource.id !== values.leadDirectSource
                    ) {
                      setFieldValue("leadDirectSource", defaultDirectSource.id);
                    } else if (
                      leadDirectSources.length > 0 &&
                      leadDirectSources[0].id !== values.leadDirectSource
                    ) {
                      setFieldValue(
                        "leadDirectSource",
                        leadDirectSources[0].id,
                      );
                    }
                  }
                }, [
                  values.leadSourceType,
                  leadDirectSources,
                  values.leadDirectSource,
                  setFieldValue,
                ]);

                // Set default status when statuses are loaded and no status is selected
                useEffect(() => {
                  if (leadStatuses.length > 0 && !values.statusId) {
                    const defaultStatus = leadStatuses.find(
                      (status: any) => status.isDefault === true,
                    );
                    if (defaultStatus && defaultStatus.id !== values.statusId) {
                      setFieldValue("statusId", defaultStatus.id);
                    }
                  }
                }, [leadStatuses, values.statusId, setFieldValue]);

                // Auto-add a default handledBy entry when status becomes "Received"
                useEffect(() => {
                  if (!values.statusId) return;
                  const selectedStatus = leadStatuses.find(
                    (s: any) => s.id === values.statusId,
                  );
                  const isReceived =
                    selectedStatus?.name?.toLowerCase().trim() === "received";
                  if (
                    isReceived &&
                    (!values.handledByEntries ||
                      values.handledByEntries.length === 0)
                  ) {
                    const today =
                      values.leadInquiryDate ||
                      new Date().toISOString().split("T")[0];
                    setFieldValue("handledByEntries", [
                      {
                        id: Date.now().toString(),
                        employeeId: "",
                        handledDate: today,
                        handledOutDate: "",
                      },
                    ]);
                  }
                  // Clear handledByEntries when status is no longer Received
                  if (
                    !isReceived &&
                    values.handledByEntries &&
                    values.handledByEntries.length > 0
                  ) {
                    setFieldValue("handledByEntries", []);
                  }
                  // Clear poStatus, poNumber, poDate, poFile when status is no longer Received
                  if (!isReceived && values.poStatus) {
                    setFieldValue("poStatus", "Pending");
                    setFieldValue("poNumber", "");
                    setFieldValue("poDate", "");
                    setFieldValue("poFile", "");
                  }
                  // Auto-fill Received Date with today's date the moment the status
                  // becomes Received — only if it isn't already set, so it never
                  // overwrites a value the user has since edited. Fully editable after.
                  if (isReceived && !values.receivedDate) {
                    setFieldValue(
                      "receivedDate",
                      new Date().toISOString().split("T")[0],
                    );
                  }
                  // Clear receivedDate when status is no longer Received
                  if (!isReceived && values.receivedDate) {
                    setFieldValue("receivedDate", "");
                  }
                }, [values.statusId, leadStatuses]);

                // Received Date IS the project's Start Date — whenever it's set or
                // changed (auto-filled on receipt, or edited later), mirror it into
                // Start Date so the two never drift apart.
                useEffect(() => {
                  if (values.receivedDate && values.receivedDate !== values.startDate) {
                    setFieldValue("startDate", values.receivedDate);
                  }
                }, [values.receivedDate]);

                return (
                  <FormikForm>
                    {/* ── Migrated EnterpriseForm wizard UI (opt-in beta) ──────────── */}
                    <LeadWorkspace
                      categories={categories}
                      subcategories={subcategories}
                      services={services}
                      leadStatuses={leadStatuses}
                      leadProjectStatuses={leadProjectStatuses}
                      cancellationReasons={leadCancellationReasons}
                      employees={allEmployees?.list || []}
                      teams={teams}
                      countries={countries}
                      leadDirectSources={leadDirectSources}
                      referralTypes={referralTypes}
                      companies={companies}
                      contacts={contacts}
                      companyTypes={allCompanyTypes}
                      setShowCategoryModal={setShowCategoryModal}
                      setShowSubcategoryModal={setShowSubcategoryModal}
                      setShowServiceModal={setShowServiceModal}
                      setShowCompanyModal={setShowCompanyModal}
                      setShowSubCompanyModal={setShowSubCompanyModal}
                      setShowBranchModal={setShowBranchModal}
                      setShowContactModal={setShowContactModal}
                      setShowDirectSourceModal={setShowDirectSourceModal}
                      setShowReferralTypeModal={setShowReferralTypeModal}
                      setShowCompanyTypeModal={setShowCompanyTypeModal}
                      fetchProjectCategories={fetchProjectCategories}
                      fetchProjectSubcategories={fetchProjectSubcategories}
                      fetchProjectServices={fetchProjectServices}
                      addressStatesOptions={formikProps.values.addressStatesOptions || {}}
                      addressCitiesOptions={formikProps.values.addressCitiesOptions || {}}
                      handleAddressCountryChange={handleAddressCountryChange}
                      handleAddressStateChange={handleAddressStateChange}
                      teamFilteredCompanies={companyCascade.filteredCompanies}
                      teamFilteredSubCompanies={companyCascade.filteredSubCompanies}
                      teamFilteredContacts={companyCascade.filteredContacts}
                      handleCompanyTypeChange={handleWizardCompanyTypeChange}
                      handleCompanyChange={handleWizardCompanyChange}
                      handleSubCompanyChange={handleWizardSubCompanyChange}
                      handleContactChange={handleWizardContactChange}
                      prefix={prefix}
                      setPrefix={setPrefix}
                      isEditMode={isEditMode}
                      currLeadData={currLeadData}
                      hasDefaultStatus={hasDefaultStatus}
                      onHide={onClose || (() => {})}
                      onFinalSave={() => formikRef.current?.submitForm()}
                      formikProps={formikProps}
                    />
                  </FormikForm>
                );
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

export default LeadWizardModal;
