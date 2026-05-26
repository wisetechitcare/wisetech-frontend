import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Modal } from "react-bootstrap";
import { Formik, Form as FormikForm } from "formik";
import * as Yup from "yup";
import { successConfirmation, errorConfirmation, customConfirmation } from "@utils/modal";
import eventBus from "@utils/EventBus";
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
  exportProjectDocx,
  exportProjectPdf
} from "@services/projects";
import {
  getAllClientCompanies,
  getAllClientContacts,
  getAllCompanyTypes,
  getClientContactsByCompanyId,
} from "@services/companies";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@redux/store";
import { loadAllEmployeesIfNeeded } from "@redux/slices/allEmployees";
import {
  fetchAllCountries,
  fetchAllStates,
  fetchAllCities,
} from "@services/options";
import { EVENT_KEYS } from "@constants/eventKeys";
import { useEventBus } from "@hooks/useEventBus";
import Loader from "@app/modules/common/utils/Loader";
import { fetchSubCompanies, fetchSubCompaniesByMainCompanyId } from "@services/company";
import SubCompanyForm from "@pages/employee/companies/companies/components/SubCompanryForm";
import CompanyConfigForm from "@pages/employee/companies/companyConfig/components/CompanyConfigForm";
import { fetchAllPrefixSettings } from "@services/options";
import { getAllProjectCountForPrefix } from "@services/projects";
import dayjs from "dayjs";
import { convertFiscalYearToYearFormat } from '@app/modules/common/components/PrefixSettingsForm';
import ProjectWorkspace from "@app/pages/employee/forms/project/ProjectWorkspace";
import { useDraft } from "@hooks/useDraft";
import { DraftRecoveryModal } from "@components/draft/DraftRecoveryModal";
import { UnsavedChangesModal } from "@components/draft/UnsavedChangesModal";
import { DraftAutoSave } from "@components/draft/DraftAutoSave";
import { createNewSubcategory } from "@app/modules/common/components/InlineCreateHelpers";
import Swal from "sweetalert2";


// Build employee options for dropdowns.
// Active employees are always shown. Inactive employees are shown ONLY when they
// match `currentValueId` (i.e. they are already saved on the record) so existing
// data is never lost. Inactive options are labelled "(Inactive)", visually dimmed,
// and marked `isDisabled` so they cannot be chosen for new assignments.
const buildEmployeeOptions = (
  employees: any[],
  currentValueId?: string,
): { value: string; label: string; avatar?: string; isDisabled?: boolean; isInactive?: boolean }[] => {
  const sorted = [...employees].sort((a, b) => (a.employeeName || "").localeCompare(b.employeeName || ""));
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
  const allEmployees = useSelector((state: RootState) => state.allEmployees);
  const formikRef = useRef<any>(null);

  // States
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [subCompanies, setSubCompanies] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [teams, setTeams] = useState<any[]>([]);
  const [countries, setCountries] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [projectData, setProjectData] = useState<any>(null);
  const [companyTypes, setCompanyTypes] = useState<any[]>([]);
  const [prefixSettings, setPrefixSettings] = useState<any>(null);
  const [projectCount, setProjectCount] = useState<any>(null);
  const [editablePrefix, setEditablePrefix] = useState<string>('');

  // Cascading dropdown options indexed by array index
  const [clientFilteredCompanies, setClientFilteredCompanies] = useState<Record<number, any[]>>({});
  const [clientFilteredSubCompanies, setClientFilteredSubCompanies] = useState<Record<number, any[]>>({});
  const [clientFilteredContacts, setClientFilteredContacts] = useState<Record<number, any[]>>({});

  const [relationFilteredCompanies, setRelationFilteredCompanies] = useState<Record<number, any[]>>({});
  const [relationFilteredSubCompanies, setRelationFilteredSubCompanies] = useState<Record<number, any[]>>({});
  const [relationFilteredContacts, setRelationFilteredContacts] = useState<Record<number, any[]>>({});

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

  // ── Draft system ───────────────────────────────────────────────────────────
  const draftEntityId = editingProjectId || 'new';
  const [draftCurrentStep, setDraftCurrentStep] = useState(0);
  const [resumeStep, setResumeStep] = useState<number | undefined>(undefined);
  const {
    existingDraft: projectDraft,
    showRecoveryModal: showProjectRecoveryModal,
    showUnsavedModal: showProjectUnsavedModal,
    isSaving: isProjectDraftSaving,
    saveDraft: saveProjectDraft,
    autoSaveDraft: autoSaveProjectDraft,
    discardDraft: discardProjectDraft,
    clearDraftAfterSave: clearProjectDraftAfterSave,
    isDirty: isProjectDraftDirty,
    setShowRecoveryModal: setShowProjectRecoveryModal,
    setShowUnsavedModal: setShowProjectUnsavedModal,
  } = useDraft({ entityType: 'project', entityId: draftEntityId, enabled: showBlankProjectForm, totalSteps: 6 });

  const handleResumeProjectDraft = () => {
    if (projectDraft?.formData && formikRef.current) {
      formikRef.current.setValues({ ...formikRef.current.values, ...projectDraft.formData });
    }
    if (projectDraft?.currentStep !== undefined) {
      setResumeStep(projectDraft.currentStep);
    }
    setShowProjectRecoveryModal(false);
  };

  const handleDiscardProjectDraft = async () => {
    await discardProjectDraft();
    setShowProjectRecoveryModal(false);
  };

  const handleSaveProjectDraftManual = async () => {
    if (formikRef.current) {
      await saveProjectDraft(formikRef.current.values, draftCurrentStep, {});
    }
    setShowProjectUnsavedModal(false);
  };

  const handleProjectCancelWithDirtyCheck = () => {
    if (isProjectDraftDirty) {
      setShowProjectUnsavedModal(true);
    } else {
      onHide();
    }
  };
  // ──────────────────────────────────────────────────────────────────────────

  // Loading states
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isProjectLoading, setIsProjectLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    dispatch(loadAllEmployeesIfNeeded());
  }, [dispatch]);

  const handleExport = async (type: 'docx' | 'pdf', values: any) => {
    if (!editingProjectId) return;

    // Prompt user for Preview vs Download
    const result = await Swal.fire({
      title: `Export ${type.toUpperCase()}`,
      text: `Would you like to preview the ${type.toUpperCase()} document or download it to your device?`,
      icon: "question",
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: "Preview",
      denyButtonText: "Download",
      cancelButtonText: "Cancel",
      customClass: {
        confirmButton: "btn btn-primary me-2",
        denyButton: "btn btn-success me-2",
        cancelButton: "btn btn-secondary",
      },
      buttonsStyling: false,
    });

    if (result.isDismissed || result.dismiss === Swal.DismissReason.cancel) {
      return; // User cancelled
    }

    let newTab: Window | null = null;
    if (result.isConfirmed) {
      newTab = window.open("", "_blank");
      if (newTab) {
        newTab.document.title = `Generating Preview...`;
        if (type === "docx") {
          newTab.document.open();
          newTab.document.write(`<!DOCTYPE html><html><head><title>Generating DOCX Preview...</title><style>body{margin:0;display:flex;flex-direction:column;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;background-color:#1e1e2d;color:#ffffff;}@keyframes spin{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}.spinner{border:4px solid rgba(255,255,255,0.1);border-top:4px solid #3699ff;border-radius:50%;width:50px;height:50px;animation:spin 1s linear infinite;}</style></head><body><div class="spinner"></div><p style="margin-top:20px;font-size:16px;font-weight:500;">Generating your DOCX preview, please wait...</p></body></html>`);
          newTab.document.close();
        } else {
          newTab.document.body.innerHTML = `
            <div style="display:flex;flex-direction:column;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;background-color:#1e1e2d;color:#ffffff;margin:0;padding:0;">
              <div style="border: 4px solid rgba(255,255,255,0.1); border-top: 4px solid #3699ff; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite;"></div>
              <p style="margin-top:20px;font-size:16px;font-weight:500;">Generating your PDF preview, please wait...</p>
              <style>
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              </style>
            </div>
          `;
        }
      }
    }

    setIsGenerating(true);
    try {
      const firstCompanyId = values.companies?.[0]?.company || '';
      const clientName = companies.find(c => c.id === firstCompanyId)?.companyName || 'N/A';

      const exportData = {
        project_id: editingProjectId,
        project_title: values.title || '',
        client_name: clientName,
        start_date: values.startDate || '',
        end_date: values.endDate || '',
        status_text: statuses.find(s => s.id === values.statusId)?.name || 'N/A',
        budget: values.cost || '',
        description: values.description || '',
        po_number: values.poNumber || 'N/A',
        address: values.addresses?.[0]?.address || values.addresses?.[0]?.fullAddress || 'N/A'
      };

      const data = type === 'docx' 
        ? await exportProjectDocx(editingProjectId, exportData)
        : await exportProjectPdf(editingProjectId, exportData);
      
      const blob = new Blob([data], {
        type:
          type === "docx"
            ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            : "application/pdf",
      });

      if (result.isConfirmed) {
        if (newTab) {
          if (type === "docx") {
            const checkChildReady = setInterval(() => {
              if (!newTab || newTab.closed) {
                clearInterval(checkChildReady);
                return;
              }
              if (typeof (newTab as any).renderDocx === "function") {
                clearInterval(checkChildReady);
                const filename = `Project_${values.title || editingProjectId}.docx`;
                (newTab as any).renderDocx(blob, filename);
              }
            }, 100);
            setTimeout(() => clearInterval(checkChildReady), 15000);
          } else {
            const fileURL = window.URL.createObjectURL(blob);
            newTab.location.href = fileURL;
            setTimeout(() => {
              if (newTab) {
                newTab.document.title = `Project_${values.title || editingProjectId}.${type}`;
              }
            }, 500);
          }
        }
        console.log(`✅ ${type.toUpperCase()} preview loaded in new tab`);
      } else if (result.isDenied) {
        // DOWNLOAD: Save file to device
        if ("showSaveFilePicker" in window) {
          try {
            const handle = await (window as any).showSaveFilePicker({
              suggestedName: `Project_${values.title || editingProjectId}.${type}`,
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
            return;
          } catch (err: any) {
            if (err.name === "AbortError") return;
            console.warn("Save Picker failed, falling back to standard download:", err);
          }
        }

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Project_${values.title || editingProjectId}.${type}`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error(`Error exporting ${type}:`, error);
      if (newTab) {
        newTab.document.body.innerHTML = `
          <div style="display:flex;flex-direction:column;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;background-color:#1e1e2d;color:#f64e60;padding:20px;text-align:center;">
            <span style="font-size: 48px; margin-bottom: 20px;">⚠️</span>
            <h3>Error Generating Preview</h3>
            <p style="color:#a5a5b5;max-width:500px;margin-top:10px;">An error occurred while generating the document. Please try again or contact support.</p>
          </div>
        `;
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Update editable prefix in edit / create mode
  useEffect(() => {
    if (projectData?.prefix) {
      setEditablePrefix(projectData.prefix);
      return;
    }
    if (prefixSettings?.prefix && projectCount !== undefined) {
      const generatedPrefix = `${prefixSettings.prefix}/${convertFiscalYearToYearFormat(prefixSettings.year)}/${projectCount + 1}`;
      setEditablePrefix(generatedPrefix);
    }
  }, [prefixSettings, projectCount, projectData?.prefix]);

  // Validation Schema
  const validationSchema = useMemo(
    () =>
      Yup.object({
        title: Yup.string().required("Project title is required"),
        serviceId: Yup.string().nullable(),
        projectCategoryId: Yup.string().nullable(),
        projectSubCategoryId: Yup.string().nullable(),
        serviceIds: Yup.array().of(Yup.string()).optional(),
        categoryIds: Yup.array().of(Yup.string()).optional(),
        subcategoryIds: Yup.array().of(Yup.string()).optional(),
        startDate: Yup.date()
          .required('Start date is required')
          .test('start-date-validation', function(value) {
            const { endDate } = this.parent;
            if (!value || !endDate) return true;
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
            const selectedStatus = statuses.find((s: any) => s.id === statusId);
            const isCompleted = selectedStatus?.name?.toLowerCase() === 'completed';
            if (isCompleted && !value) return false;
            return true;
          })
          .test('end-date-validation', function(value) {
            const { startDate } = this.parent;
            if (!value || !startDate) return true;
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
        teamDetails: Yup.array().of(Yup.object({ teamId: Yup.string() })),
        projectManagerId: Yup.string(),
        projectAccess: Yup.string().oneOf(["PUBLIC", "PRIVATE"]),
        description: Yup.string().max(200, "Description must be less than 200 characters"),
        fileLocation: Yup.string().max(250, "File location cannot exceed 250 characters"),
        createdById: Yup.string(),
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
      const projectPrefixObj = projectPrefix?.find((p: any) => p.identifier === "PROJECT");
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

  const fetchCompanyTypeData = useCallback(async () => {
    if (companyTypes.length > 0) return companyTypes;
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

  const fetchProjectStatuses = useCallback(async (setFieldValue?: any) => {
    if (statuses.length > 0) return statuses;
    try {
      const response = await getAllProjectStatuses();
      const data = response?.projectStatuses || [];
      setStatuses(data);
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
      const response = await getAllTeams(1, 9999);
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

  const transformToOptions = useCallback((items: any[]) => {
    return items.map((item: any) => ({
      value: item.id,
      label: item.name
    }));
  }, []);

  const createNewSubcategoryWithContext = useCallback(async (name: string) => {
    try {
      if (categories.length === 0) {
        throw new Error('Please create at least one category first before creating subcategories');
      }
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

  const forceRefreshProjectServices = useCallback(async () => {
    await fetchProjectServices(true);
  }, [fetchProjectServices]);

  const forceRefreshProjectCategories = useCallback(async () => {
    await fetchProjectCategories(true);
  }, [fetchProjectCategories]);

  const forceRefreshProjectSubcategories = useCallback(async () => {
    await fetchProjectSubcategories(true);
  }, [fetchProjectSubcategories]);

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

  const sortCompaniesByName = (list: any[]) => {
    return [...list].sort((a: any, b: any) =>
      (a.companyName || "").localeCompare(b.companyName || "")
    );
  };

  const sortContactsByName = (list: any[]) => {
    return [...list].sort((a: any, b: any) =>
      (a.fullName || "").localeCompare(b.fullName || "")
    );
  };

  // Cascading helpers (TEAM DETAILS)
  const fetchClientCompaniesByCompanyTypeId = useCallback(
    (companyTypeId: string, index: number) => {
      if (!companyTypeId) {
        setClientFilteredCompanies((prev) => ({ ...prev, [index]: [] }));
        return [];
      }
      const filtered = companies.filter(
        (c: any) => String(c.companyTypeId) === String(companyTypeId)
      );
      const sorted = sortCompaniesByName(filtered);
      setClientFilteredCompanies((prev) => ({ ...prev, [index]: sorted }));
      return sorted;
    },
    [companies],
  );

  const fetchClientSubCompaniesByCompanyId = useCallback(
    async (companyId: string, index: number) => {
      try {
        if (!companyId) {
          setClientFilteredSubCompanies((prev) => ({ ...prev, [index]: [] }));
          return [];
        }
        const response = await fetchSubCompaniesByMainCompanyId(companyId);
        const data = response?.data?.subCompanies || response?.subCompanies || [];
        setClientFilteredSubCompanies((prev) => ({ ...prev, [index]: data }));
        return data;
      } catch (error) {
        console.error("Error fetching sub-companies for client company:", error);
        setClientFilteredSubCompanies((prev) => ({ ...prev, [index]: [] }));
        return [];
      }
    },
    [],
  );

  const fetchClientContactsBySubCompanyId = useCallback(
    async (subCompanyId: string, index: number, companyId?: string) => {
      try {
        if (!subCompanyId) {
          if (companyId) {
            const response = await getClientContactsByCompanyId(companyId);
            const data = response?.data?.contacts || [];
            const sorted = sortContactsByName(data);
            setClientFilteredContacts((prev) => ({ ...prev, [index]: sorted }));
            return sorted;
          }
          setClientFilteredContacts((prev) => ({ ...prev, [index]: [] }));
          return [];
        }
        const response = await getAllClientContacts({ subCompanyId });
        const subContacts = response?.data?.contacts || response?.contacts || [];
        
        let parentContacts: any[] = [];
        if (companyId) {
          const parentResponse = await getClientContactsByCompanyId(companyId);
          parentContacts = (parentResponse?.data?.contacts || []).filter((c: any) => !c.subCompanyId);
        }
        
        const combined = [...subContacts, ...parentContacts.filter((pc: any) => !subContacts.some((sc: any) => sc.id === pc.id))];
        const sorted = sortContactsByName(combined);
        setClientFilteredContacts((prev) => ({ ...prev, [index]: sorted }));
        return sorted;
      } catch (error) {
        console.error("Error fetching contacts for client sub-company:", error);
        setClientFilteredContacts((prev) => ({ ...prev, [index]: [] }));
        return [];
      }
    },
    [],
  );

  // Cascading helpers (OTHER RELATION COMPANIES)
  const fetchRelationCompaniesByCompanyTypeId = useCallback(
    (companyTypeId: string, index: number) => {
      if (!companyTypeId) {
        setRelationFilteredCompanies((prev) => ({ ...prev, [index]: [] }));
        return [];
      }
      const filtered = companies.filter(
        (c: any) => String(c.companyTypeId) === String(companyTypeId)
      );
      const sorted = sortCompaniesByName(filtered);
      setRelationFilteredCompanies((prev) => ({ ...prev, [index]: sorted }));
      return sorted;
    },
    [companies],
  );

  const fetchRelationSubCompaniesByCompanyId = useCallback(
    async (companyId: string, index: number) => {
      try {
        if (!companyId) {
          setRelationFilteredSubCompanies((prev) => ({ ...prev, [index]: [] }));
          return [];
        }
        const response = await fetchSubCompaniesByMainCompanyId(companyId);
        const data = response?.data?.subCompanies || response?.subCompanies || [];
        setRelationFilteredSubCompanies((prev) => ({ ...prev, [index]: data }));
        return data;
      } catch (error) {
        console.error("Error fetching sub-companies for relation company:", error);
        setRelationFilteredSubCompanies((prev) => ({ ...prev, [index]: [] }));
        return [];
      }
    },
    [],
  );

  const fetchRelationContactsBySubCompanyId = useCallback(
    async (subCompanyId: string, index: number, companyId?: string) => {
      try {
        if (!subCompanyId) {
          if (companyId) {
            const response = await getClientContactsByCompanyId(companyId);
            const data = response?.data?.contacts || [];
            const sorted = sortContactsByName(data);
            setRelationFilteredContacts((prev) => ({ ...prev, [index]: sorted }));
            return sorted;
          }
          setRelationFilteredContacts((prev) => ({ ...prev, [index]: [] }));
          return [];
        }
        const response = await getAllClientContacts({ subCompanyId });
        const subContacts = response?.data?.contacts || response?.contacts || [];
        
        let parentContacts: any[] = [];
        if (companyId) {
          const parentResponse = await getClientContactsByCompanyId(companyId);
          parentContacts = (parentResponse?.data?.contacts || []).filter((c: any) => !c.subCompanyId);
        }
        
        const combined = [...subContacts, ...parentContacts.filter((pc: any) => !subContacts.some((sc: any) => sc.id === pc.id))];
        const sorted = sortContactsByName(combined);
        setRelationFilteredContacts((prev) => ({ ...prev, [index]: sorted }));
        return sorted;
      } catch (error) {
        console.error("Error fetching contacts for relation sub-company:", error);
        setRelationFilteredContacts((prev) => ({ ...prev, [index]: [] }));
        return [];
      }
    },
    [],
  );

  // Load project details when editing
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

      // Load location data for address country/state cascades
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
              break; // Only cascade for the first address on load
            }
          }
        }
      }
    } catch (error) {
      console.error("Error fetching project by ID:", error);
      setProjectData(null);
    } finally {
      setIsProjectLoading(false);
    }
  }, [editingProjectId, countries]);

  useEffect(() => {
    if (showBlankProjectForm) {
      loadAllData();
    }
  }, [showBlankProjectForm, loadAllData]);

  useEffect(() => {
    if (showBlankProjectForm && dataLoaded) {
      loadProjectData();
    }
  }, [editingProjectId, showBlankProjectForm, dataLoaded, loadProjectData]);

  useEventBus(EVENT_KEYS.projectUpdated, () => {
    if (showBlankProjectForm && editingProjectId) {
      loadProjectData();
    }
  });

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

  const normalizeString = (str: string): string => {
    if (!str) return '';
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  };

  const getMatchPriority = (option: any, inputValue: string): number => {
    if (!inputValue || !inputValue.trim()) return 999;
    const normalizedInput = normalizeString(inputValue.trim());
    const normalizedLabel = normalizeString(option.label || '');
    if (normalizedLabel.startsWith(normalizedInput)) return 1;
    const wordsInLabel = normalizedLabel.split(/\s+/);
    if (wordsInLabel.some(word => word.startsWith(normalizedInput))) return 2;
    if (normalizedLabel.includes(normalizedInput)) return 3;
    return 999;
  };

  const getFilteredAndSortedOptions = (options: any[], inputValue: string) => {
    if (!inputValue || !inputValue.trim()) return options;
    const filtered = options.filter(option => {
      const priority = getMatchPriority(option, inputValue);
      return priority < 999;
    });
    return filtered.sort((optionA, optionB) => {
      const priorityA = getMatchPriority(optionA, inputValue);
      const priorityB = getMatchPriority(optionB, inputValue);
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      return (optionA.label || '').localeCompare(optionB.label || '');
    });
  };

  // Initial values setup
  const getInitialAddresses = useCallback(() => {
    const mappings = projectData?.addresses || [];
    if (mappings.length > 0) {
      return mappings.map((a: any) => ({
        fullAddress: a.fullAddress || "",
        zipcode: a.zipcode || "",
        country: a.country ? countries.find((c) => c.name === a.country)?.id || a.country : "",
        state: a.state ? states.find((s) => s.name === a.state)?.id || a.state : "",
        city: a.city ? cities.find((c) => c.name === a.city)?.id || a.city : "",
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

  const getInitialCompanies = useCallback(() => {
    const mappings = projectData?.projectCompanyMappings || [];
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

  const getInitialRelationCompanies = useCallback(() => {
    const leadRelationCompanies: any = [];
    if (intitalDataForLeadToProjectConversion?.companies && Array.isArray(intitalDataForLeadToProjectConversion.companies)) {
      const relationTeams = intitalDataForLeadToProjectConversion.companies.filter((company: any) => 
        !company.serviceId && !company.service && (company.companyTypeId || company.companyId)
      );
      relationTeams.forEach((team: any) => {
        leadRelationCompanies.push({
          companyTypeId: (typeof team.companyTypeId === 'object' && team.companyTypeId?.id) ? team.companyTypeId.id : (team.companyTypeId || ""),
          company: (typeof team.companyId === 'object' && team.companyId?.id) ? team.companyId.id : (team.companyId || team.company || ""),
          refferingSubCompanyId: (typeof team.subCompanyId === 'object' && team.subCompanyId?.id) ? team.subCompanyId.id : (team.subCompanyId || team.branchId || ""),
          contactPerson: (typeof team.contactPersonId === 'object' && team.contactPersonId?.id) ? team.contactPersonId.id : (team.contactPersonId || team.contactPerson || ""),
        });
      });
    }
    if (intitalDataForLeadToProjectConversion?.referrals && Array.isArray(intitalDataForLeadToProjectConversion.referrals)) {
      intitalDataForLeadToProjectConversion.referrals.forEach((referral: any) => {
        if (referral.referringCompanyId || referral.referringCompany) {
          leadRelationCompanies.push({
            companyTypeId: (typeof referral.referralTypeId === 'object' && referral.referralTypeId?.id) ? referral.referralTypeId.id : (referral.referralTypeId || referral.referralType || ""),
            company: (typeof referral.referringCompanyId === 'object' && referral.referringCompanyId?.id) ? referral.referringCompanyId.id : (referral.referringCompanyId || referral.referringCompany || ""),
            refferingSubCompanyId: (typeof referral.referringSubCompanyId === 'object' && referral.referringSubCompanyId?.id) ? referral.referringSubCompanyId.id : (referral.referringSubCompanyId || ""),
            contactPerson: (typeof referral.referredByContactId === 'object' && referral.referredByContactId?.id) ? referral.referredByContactId.id : (referral.referredByContactId || referral.referringContact || ""),
          });
        }
      });
    }
    if (leadRelationCompanies.length > 0) return leadRelationCompanies;

    const mappings = projectData?.projectCompanyMappings || [];
    const projectRelationCompanies = mappings.filter((m: any) => m.companyTypeId && m.refferingSubCompanyId);
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
  }, [projectData?.projectCompanyMappings, intitalDataForLeadToProjectConversion?.companies, intitalDataForLeadToProjectConversion?.referrals]);

  const getInitialCommercials = useCallback(() => {
    const mappings = projectData?.projectCommercialMappings || [];
    if (mappings.length > 0) {
      return mappings.map((m: any) => ({
        area: m.area || "",
        label: m.label || '',
        costType: m.costType ? String(m.costType).toUpperCase() : "RATE",
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

  const getInitialTeamDetails = useCallback(() => {
    const mappings = projectData?.projectTeams || [];
    if (mappings.length > 0) {
      return mappings.map((m: any) => ({
        teamId: m.teamId || (m.team ? m.team.id : "") || "",
      }));
    }
    return [{ teamId: "" }];
  }, [projectData?.projectTeams]);

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

  const getLeadConvertedCompanies = useCallback(() => {
    if (intitalDataForLeadToProjectConversion?.companies && Array.isArray(intitalDataForLeadToProjectConversion.companies)) {
      return intitalDataForLeadToProjectConversion.companies.map((company: any) => ({
        service: (typeof company.serviceId === 'object' && company.serviceId?.id) ? company.serviceId.id : (company.serviceId || company.service || ""),
        company: (typeof company.companyId === 'object' && company.companyId?.id) ? company.companyId.id : (company.companyId || company.company || ""),
        companyTypeId: (typeof company.companyTypeId === 'object' && company.companyTypeId?.id) ? company.companyTypeId.id : (company.companyTypeId || ""),
        subCompanyId: (typeof company.subCompanyId === 'object' && company.subCompanyId?.id) ? company.subCompanyId.id : (company.subCompanyId || company.branchId || company.branch || ""),
        contactPerson: (typeof company.contactPersonId === 'object' && company.contactPersonId?.id) ? company.contactPersonId.id : (company.contactPersonId || company.contactPerson || ""),
      }));
    }
    return getInitialCompanies();
  }, [intitalDataForLeadToProjectConversion?.companies, getInitialCompanies]);

  const getLeadConvertedAddresses = useCallback(() => {
    const convertLocationToId = (name: string | undefined, list: any[]) => {
      if (!name) return "";
      const found = list.find((item: any) => item.name === name);
      return found ? found.id : name;
    };

    const getGoogleLinks = () => {
      if (intitalDataForLeadToProjectConversion?.additionalDetails) {
        return {
          gmbLink: intitalDataForLeadToProjectConversion.additionalDetails.googleMyBusinessLink || intitalDataForLeadToProjectConversion.additionalDetails.gmbLink || "",
          googleMapLink: intitalDataForLeadToProjectConversion.additionalDetails.mapLocation || intitalDataForLeadToProjectConversion.additionalDetails.googleMapLink || ""
        };
      }
      return { gmbLink: "", googleMapLink: "" };
    };

    if (intitalDataForLeadToProjectConversion?.addresses && Array.isArray(intitalDataForLeadToProjectConversion.addresses)) {
      return intitalDataForLeadToProjectConversion.addresses.map((address: any) => ({
        fullAddress: address.fullAddress || address.address || address.projectAddress || "",
        zipcode: address.zipcode || address.zipCode || "",
        country: convertLocationToId(address.country, countries),
        state: address.state,
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
  }, [intitalDataForLeadToProjectConversion?.addresses, intitalDataForLeadToProjectConversion?.additionalDetails, getInitialAddresses, countries, states]);

  const initialValues = useMemo(
    () => {
      const leadData = intitalDataForLeadToProjectConversion;
      return {
        title: leadData?.title || projectData?.title || "",
        projectTempletId: selectedProjectType ? selectedProjectType : projectType?.id || "",
        serviceId: projectData?.serviceId || "",
        projectCategoryId: projectData?.projectCategoryId || "",
        projectSubCategoryId: projectData?.projectSubCategoryId || "",
        
        serviceIds: (() => {
          if (leadData?.serviceIds && Array.isArray(leadData.serviceIds)) return leadData.serviceIds;
          if (projectData?.projectServiceMappings && Array.isArray(projectData.projectServiceMappings)) {
            return projectData.projectServiceMappings.map((psm: any) => psm.service?.id || psm.serviceId).filter(Boolean);
          }
          return projectData?.serviceId ? [projectData.serviceId] : [];
        })(),
        
        categoryIds: (() => {
          if (leadData?.categoryIds && Array.isArray(leadData.categoryIds)) return leadData.categoryIds;
          if (projectData?.projectCategoryMappings && Array.isArray(projectData.projectCategoryMappings)) {
            return projectData.projectCategoryMappings.map((pcm: any) => pcm.category?.id || pcm.categoryId).filter(Boolean);
          }
          return projectData?.projectCategoryId ? [projectData.projectCategoryId] : [];
        })(),
        
        subcategoryIds: (() => {
          if (leadData?.subcategoryIds && Array.isArray(leadData.subcategoryIds)) return leadData.subcategoryIds;
          if (leadData?.leadSubCategories && Array.isArray(leadData.leadSubCategories)) {
            return leadData.leadSubCategories.filter((subCat: any) => subCat?.subCategoryId).map((subCat: any) => subCat.subCategoryId);
          }
          if (projectData?.projectSubCategoryMappings && Array.isArray(projectData.projectSubCategoryMappings)) {
            return projectData.projectSubCategoryMappings.map((pscm: any) => pscm.subcategory?.id || pscm.subcategoryId).filter(Boolean);
          }
          return projectData?.projectSubCategoryId ? [projectData.projectSubCategoryId] : [];
        })(),
        
        startDate: leadData?.startDate || projectData?.startDate || (leadData ? dayjs().format('YYYY-MM-DD') : ""),
        endDate: leadData?.endDate || projectData?.endDate || "",
        projectManagerId: leadData?.assignedToId || projectData?.assignedToId || projectData?.projectManagerId || "",
        rate: projectData?.rate || "",
        cost: projectData?.cost || "",
        statusId: leadData?.statusId || projectData?.statusId || "",
        country: "",
        state: "",
        city: (() => {
          if (leadData?.city) return cities.find((c) => c.name === leadData.city)?.id || leadData.city;
          if (leadData?.additionalDetails?.city) return cities.find((c) => c.name === leadData.additionalDetails.city)?.id || leadData.additionalDetails.city;
          if (projectData?.city) return cities.find((c) => c.name === projectData.city)?.id || projectData.city;
          return "";
        })(),
        projectArea: leadData?.projectArea || projectData?.projectArea || "",
        locality: leadData?.locality || projectData?.locality || "",
        zipcode: leadData?.zipcode || projectData?.zipcode || "",
        projectAddress: leadData?.projectAddress || leadData?.address || projectData?.projectAddress || "",
        latitude: leadData?.latitude || projectData?.latitude || null,
        longitude: leadData?.longitude || projectData?.longitude || null,
        
        poNumber: leadData?.poNumber || leadData?.additionalDetails?.poNumber || projectData?.poNumber || "",
        poDate: (() => {
          const raw = leadData?.poDate || leadData?.additionalDetails?.poDate || projectData?.poDate;
          if (!raw) return null;
          try { return new Date(raw).toISOString().split('T')[0]; } catch { return null; }
        })(),
        poFile: leadData?.poFile || projectData?.poFile || "",
        
        handledByEntries: (() => {
          const mapEntry = (entry: any, i: number) => ({
            id: entry.id || `hb-${Date.now()}-${i}`,
            employeeId: entry.employeeId || '',
            handledDate: entry.handledDate ? new Date(entry.handledDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
            handledOutDate: entry.handledOutDate ? new Date(entry.handledOutDate).toISOString().split("T")[0] : '',
          });
          if (projectData?.handledByEntries && Array.isArray(projectData.handledByEntries) && projectData.handledByEntries.length > 0) {
            return projectData.handledByEntries.map(mapEntry);
          }
          if (leadData?.handledByEntries && Array.isArray(leadData.handledByEntries) && leadData.handledByEntries.length > 0) {
            return leadData.handledByEntries.map(mapEntry);
          }
          return [];
        })(),

        fileLocationCompanyType: leadData?.fileLocationCompanyType || projectData?.fileLocationCompanyType || "",
        fileLocationCompany: leadData?.fileLocationCompany || projectData?.fileLocationCompany || "",

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
        
        companies: getLeadConvertedCompanies(),
        projectCompanyMappings: getInitialRelationCompanies(),
        commercials: getLeadConvertedCommercials(),
        teamDetails: getInitialTeamDetails(),
        addresses: getLeadConvertedAddresses(),
        
        documents: projectData?.documents || "",
        projectAccess: "PUBLIC",
        description: leadData?.description || projectData?.description || "",
        isProjectOpen: projectData?.isProjectOpen === false ? 'false' : 'true',
        fileLocation: leadData?.fileLocation || leadData?.additionalDetails?.fileLocation || projectData?.fileLocation || "",
        createdById: userId || "",
        editedById: userId || "",
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
      userId
    ]
  );

  // Preload cascade cascading dropdowns
  useEffect(() => {
    if (!dataLoaded || companies.length === 0) return;
    const preloadCascades = async () => {
      const initialClientCompanies = getLeadConvertedCompanies();
      if (Array.isArray(initialClientCompanies)) {
        for (let i = 0; i < initialClientCompanies.length; i++) {
          const entry = initialClientCompanies[i];
          if (entry.companyTypeId) fetchClientCompaniesByCompanyTypeId(entry.companyTypeId, i);
          if (entry.company) await fetchClientSubCompaniesByCompanyId(entry.company, i);
          if (entry.company) await fetchClientContactsBySubCompanyId(entry.subCompanyId || "", i, entry.company);
        }
      }
      const initialRelationCompanies = getInitialRelationCompanies();
      if (Array.isArray(initialRelationCompanies)) {
        for (let i = 0; i < initialRelationCompanies.length; i++) {
          const entry = initialRelationCompanies[i];
          if (entry.companyTypeId) fetchRelationCompaniesByCompanyTypeId(entry.companyTypeId, i);
          if (entry.company) await fetchRelationSubCompaniesByCompanyId(entry.company, i);
          if (entry.company) await fetchRelationContactsBySubCompanyId(entry.refferingSubCompanyId || "", i, entry.company);
        }
      }
    };
    preloadCascades();
  }, [
    dataLoaded,
    companies.length,
    projectData?.id,
    intitalDataForLeadToProjectConversion?.id,
    fetchClientCompaniesByCompanyTypeId,
    fetchClientSubCompaniesByCompanyId,
    fetchClientContactsBySubCompanyId,
    fetchRelationCompaniesByCompanyTypeId,
    fetchRelationSubCompaniesByCompanyId,
    fetchRelationContactsBySubCompanyId,
    getLeadConvertedCompanies,
    getInitialRelationCompanies
  ]);

  const getFileNameFromUrl = (url: string) => {
    if (!url) return "";
    try {
      const urlParts = url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      return fileName.split('?')[0];
    } catch (error) {
      console.error("Error extracting filename:", error);
      return "Document";
    }
  };

  const uploadFile = async (event: React.ChangeEvent<HTMLInputElement>, formikProps: any, fileMaxUploadSize: number) => {
    const { target: { files } } = event;
    if (files && files[0].size > fileMaxUploadSize) {
      alert("File size should not exceed 5 MB");
      event.target.value = "";
      return;
    }
    if (files && files.length > 0) {
      const form = new FormData();
      form.append("file", files[0]);
      try {
        const { uploadUserAsset } = await import("@services/uploader");
        const { data: { path } } = await uploadUserAsset(form, userId, "projects");
        formikProps.setFieldValue("documents", path, true);
      } catch (error) {
        console.error("Failed to upload file. Please try again.");
      }
    }
  };

  // Submit Handler
  const handleSubmit = useCallback(
    async (values: any) => {
      try {
        const toNameIfLookup = (val: any, lookupArray: any[] | undefined) => {
          if (val === null || val === undefined || val === "") return "";
          if (lookupArray && (typeof val === "number" || typeof val === "string")) {
            const found = lookupArray.find((x: any) => x.id === val || String(x.id) === String(val));
            if (found) return found.name ?? String(val);
          }
          return String(val);
        };

        const extractId = (value: any): string | null => {
          if (!value) return null;
          if (typeof value === 'string') return value;
          if (typeof value === 'object' && value.id) return value.id;
          return String(value);
        };

        const companiesPayload = (values.companies || [])
          .filter((c: any) => c.company)
          .map((c: any) => ({
            company: c.company || "",
            companyType: (c.companyTypeId && c.companyTypeId !== "") ? c.companyTypeId : null,
            branch: extractId(c.branchId || c.branch || c.subCompanyId),
            subCompany: extractId(c.subCompanyId || c.subCompany),
            refferingSubCompany: extractId(c.refferingSubCompanyId || c.refferingSubCompany),
            contactPerson: extractId(c.contactPersonId || c.contactPerson),
            service: extractId(c.serviceId || c.service),
          }));

        const relationCompaniesPayload = (values.projectCompanyMappings || [])
          .filter((c: any) => c.company)
          .map((c: any) => ({
            company: c.company || "",
            companyType: (c.companyTypeId && c.companyTypeId !== "") ? c.companyTypeId : null,
            branch: extractId(c.branchId || c.branch),
            subCompany: extractId(c.subCompanyId || c.subCompany),
            refferingSubCompany: extractId(c.refferingSubCompanyId || c.refferingSubCompany),
            contactPerson: extractId(c.contactPersonId || c.contactPerson),
            service: extractId(c.serviceId || c.service),
          }));

        const allCompanies = [...companiesPayload, ...relationCompaniesPayload];

        const teamsPayload = (values.teamDetails || [])
          .filter((t: any) => t.teamId)
          .map((t: any) => ({ teamId: t.teamId || t.id || "" }));

        const commercialMappingsPayload = (values.commercials || [])
          .filter((c: any) => c.area)
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

        const addressesPayload = (values.addresses || [])
          .filter((a: any) => a.fullAddress || a.city)
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

        const payload: any = { ...values };

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

        if (payload.country) payload.country = toNameIfLookup(payload.country, countries);
        if (payload.state) payload.state = toNameIfLookup(payload.state, states);
        if (payload.city) payload.city = toNameIfLookup(payload.city, cities);

        payload.companies = allCompanies;
        payload.teams = teamsPayload;
        payload.commercialMappings = commercialMappingsPayload;
        payload.addresses = addressesPayload;

        if (payload.leadTemplateId) {
          payload.projectTempletId = payload.leadTemplateId;
          delete payload.leadTemplateId;
        }

        payload.isProjectOpen = payload.isProjectOpen === "true" || payload.isProjectOpen === true;

        if (payload.serviceIds && Array.isArray(payload.serviceIds)) {
          // keep
        } else if (payload.serviceId) {
          payload.serviceIds = [payload.serviceId];
        } else {
          payload.serviceIds = [];
        }

        if (payload.categoryIds && Array.isArray(payload.categoryIds)) {
          // keep
        } else if (payload.projectCategoryId) {
          payload.categoryIds = [payload.projectCategoryId];
        } else {
          payload.categoryIds = [];
        }

        if (payload.subcategoryIds && Array.isArray(payload.subcategoryIds)) {
          // keep
        } else if (payload.projectSubCategoryId) {
          payload.subcategoryIds = [payload.projectSubCategoryId];
        } else {
          payload.subcategoryIds = [];
        }

        const multiSelectArrays = [
          'serviceIds', 'categoryIds', 'subcategoryIds', 'handledByEntries',
          'companies', 'teams', 'commercialMappings', 'addresses'
        ];
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
          if (multiSelectArrays.includes(key)) { acc[key] = v; return acc; }
          if (clearableFields.includes(key)) { acc[key] = v; return acc; }
          if (v === undefined) return acc;
          if (v === null || v === '') return acc;
          if (Array.isArray(v) && v.length === 0) return acc;
          acc[key] = v;
          return acc;
        }, {});

        if (Array.isArray(cleanPayload.handledByEntries)) {
          cleanPayload.handledByEntries = cleanPayload.handledByEntries
            .filter((e: any) => e.employeeId && e.employeeId !== '')
            .map(({ id: _id, ...rest }: any) => rest);
        }

        if (cleanPayload.projectManagerId !== undefined) {
          cleanPayload.assignedToId   = cleanPayload.projectManagerId || null;
          cleanPayload.leadAssignedTo = cleanPayload.projectManagerId || null;
        }

        if (cleanPayload.startDate === '' || cleanPayload.startDate === undefined) {
          cleanPayload.startDate = null;
        }
        if (cleanPayload.endDate === '' || cleanPayload.endDate === undefined) {
          cleanPayload.endDate = null;
        }

        if (editablePrefix && editablePrefix.trim()) {
          cleanPayload.prefix = editablePrefix.trim();
        }

        if (!editingProjectId && intitalDataForLeadToProjectConversion?.leadId) {
          cleanPayload.leadId = intitalDataForLeadToProjectConversion.leadId;
        }

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
        await clearProjectDraftAfterSave();
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
    [editingProjectId, countries, states, cities, onHide, setRefreshData, editablePrefix, intitalDataForLeadToProjectConversion]
  );

  // Modal Closers
  const handleCategoryModalClose = useCallback(() => setShowCategoryModal(false), []);
  const handleSubcategoryModalClose = useCallback(() => setShowSubcategoryModal(false), []);
  const handleServiceModalClose = useCallback(() => setShowServiceModal(false), []);
  
  const handleCompanyModalClose = useCallback(async () => {
    setShowCompanyModal(false);
    try {
      const response = await getAllClientCompanies();
      const data = response?.data?.companies || [];
      setCompanies(data);
      if (formikRef.current?.values?.companies) {
        const companiesVal = formikRef.current.values.companies;
        for (let index = 0; index < companiesVal.length; index++) {
          const c = companiesVal[index];
          if (c.companyTypeId) fetchClientCompaniesByCompanyTypeId(c.companyTypeId, index);
        }
      }
      if (formikRef.current?.values?.projectCompanyMappings) {
        const mappings = formikRef.current.values.projectCompanyMappings;
        for (let index = 0; index < mappings.length; index++) {
          const m = mappings[index];
          if (m.companyTypeId) fetchRelationCompaniesByCompanyTypeId(m.companyTypeId, index);
        }
      }
    } catch (error) {
      console.error("Error refreshing companies on modal close:", error);
    }
  }, [fetchClientCompaniesByCompanyTypeId, fetchRelationCompaniesByCompanyTypeId]);

  const handleSubCompanyModalClose = useCallback(async () => {
    setShowSubCompanyModal(false);
    try {
      const response = await fetchSubCompanies();
      const data = response?.data?.subCompanies || [];
      setSubCompanies(data);
      if (formikRef.current?.values?.companies) {
        const companiesVal = formikRef.current.values.companies;
        for (let index = 0; index < companiesVal.length; index++) {
          const c = companiesVal[index];
          if (c.company) await fetchClientSubCompaniesByCompanyId(c.company, index);
        }
      }
      if (formikRef.current?.values?.projectCompanyMappings) {
        const mappings = formikRef.current.values.projectCompanyMappings;
        for (let index = 0; index < mappings.length; index++) {
          const m = mappings[index];
          if (m.company) await fetchRelationSubCompaniesByCompanyId(m.company, index);
        }
      }
    } catch (error) {
      console.error("Error refreshing sub-companies on modal close:", error);
    }
  }, [fetchClientSubCompaniesByCompanyId, fetchRelationSubCompaniesByCompanyId]);

  const handleContactModalClose = useCallback(async () => {
    setShowContactModal(false);
    try {
      const response = await getAllClientContacts({});
      const data = response?.data?.contacts || response?.contacts || [];
      const sorted = sortContactsByName(data);
      setContacts(sorted);
      if (formikRef.current?.values?.companies) {
        const companiesVal = formikRef.current.values.companies;
        for (let index = 0; index < companiesVal.length; index++) {
          const c = companiesVal[index];
          if (c.subCompanyId) {
            await fetchClientContactsBySubCompanyId(c.subCompanyId, index, c.company);
          } else if (c.company) {
            await fetchClientContactsBySubCompanyId("", index, c.company);
          }
        }
      }
      if (formikRef.current?.values?.projectCompanyMappings) {
        const mappings = formikRef.current.values.projectCompanyMappings;
        for (let index = 0; index < mappings.length; index++) {
          const m = mappings[index];
          if (m.refferingSubCompanyId) {
            await fetchRelationContactsBySubCompanyId(m.refferingSubCompanyId, index, m.company);
          } else if (m.company) {
            await fetchRelationContactsBySubCompanyId("", index, m.company);
          }
        }
      }
    } catch (error) {
      console.error("Error refreshing contacts on modal close:", error);
    }
  }, [fetchClientContactsBySubCompanyId, fetchRelationContactsBySubCompanyId]);

  const handleStatusModalClose = useCallback(() => setShowStatusModal(false), []);
  
  const handleCompanyTypeModalClose = useCallback(() => {
    setShowCompanyTypeModal(false);
    fetchCompanyTypeData();
  }, [fetchCompanyTypeData]);

  const shouldShowModal = showBlankProjectForm;
  const isDataReady = dataLoaded && (!editingProjectId || !isProjectLoading);

  if (!shouldShowModal) return null;

  return (
    <div>
      <Modal 
        show={shouldShowModal}
        onHide={onHide}
        fullscreen={true}
        className="lead-wizard-modal"
        dialogClassName="lead-wizard-dialog"
      >
        <Modal.Body style={{ padding: 0, overflow: "hidden", height: "100vh" }}>
          {!isDataReady ? (
            <div style={{ height: "400px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Loader />
            </div>
          ) : (
            <Formik
              innerRef={formikRef}
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

                if (Object.keys(errors).length > 0) {
                  console.error("Form validation errors:", errors);
                }

                // Default status auto-population
                useEffect(() => {
                  if (statuses.length > 0 && !values.statusId) {
                    const defaultStatus = statuses.find((s: any) => s.isDefault);
                    if (defaultStatus) {
                      setFieldValue("statusId", defaultStatus.id);
                    }
                  }
                }, [statuses, values.statusId, setFieldValue]);

                // Auto-populate address fields for MEP project conversion
                useEffect(() => {
                  const ad = intitalDataForLeadToProjectConversion?.additionalDetails;
                  if (!ad || countries.length === 0) return;
                  if (projectType?.id !== "mep" && selectedProjectType !== "mep") return;

                  const normalize = (v: any) => (typeof v === "string" ? v.trim() : v);
                  
                  const run = async () => {
                    if (values.addresses?.[0]?.country || values.addresses?.[0]?.fullAddress) return;
                    const countryName = normalize(ad?.country);
                    if (countryName) {
                      const country = countries.find((c: any) => c.name?.toLowerCase() === countryName.toLowerCase());
                      if (country) {
                        setFieldValue("addresses.0.country", country.id);
                        const stateData = await fetchAllStates(country.iso2);
                        setStates(stateData);
                        const stateName = normalize(ad.state);
                        if (stateName) {
                          const state = stateData.find((s: any) => s.name?.toLowerCase() === stateName.toLowerCase());
                          if (state) {
                            setFieldValue("addresses.0.state", state.id);
                            const cityData = await fetchAllCities(country.iso2, state.iso2);
                            setCities(cityData);
                            const cityName = normalize(ad.city);
                            if (cityName) {
                              const city = cityData.find((c: any) => c.name?.toLowerCase() === cityName.toLowerCase());
                              if (city) {
                                setFieldValue("addresses.0.city", city.id);
                              } else {
                                setFieldValue("addresses.0.city", cityName);
                              }
                            }
                          }
                        }
                      }
                    }
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

                // Auto-calculate rateCost
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

                const isDatesInvalid = () => {
                  const { startDate, endDate } = values;
                  if (!startDate || !endDate) return false;
                  return new Date(startDate) > new Date(endDate);
                };

                const getDateValidationMessage = () => {
                  if (!isDatesInvalid()) return '';
                  return 'Start date cannot be after end date';
                };

                return (
                  <FormikForm>
                    <DraftAutoSave
                      onAutoSave={(vals, step) => autoSaveProjectDraft(vals, step, {})}
                      currentStep={draftCurrentStep}
                    />
                    <ProjectWorkspace
                      categories={categories}
                      subcategories={subcategories}
                      services={services}
                      statuses={statuses}
                      employees={allEmployees?.list || []}
                      teams={teams}
                      countries={countries}
                      companies={companies}
                      contacts={contacts}
                      companyTypes={companyTypes}
                      setShowCategoryModal={setShowCategoryModal}
                      setShowSubcategoryModal={setShowSubcategoryModal}
                      setShowServiceModal={setShowServiceModal}
                      setShowCompanyModal={setShowCompanyModal}
                      setShowSubCompanyModal={setShowSubCompanyModal}
                      setShowContactModal={setShowContactModal}
                      setShowStatusModal={setShowStatusModal}
                      setShowCompanyTypeModal={setShowCompanyTypeModal}
                      fetchProjectCategories={fetchProjectCategories}
                      fetchProjectSubcategories={fetchProjectSubcategories}
                      fetchProjectServices={fetchProjectServices}
                      fetchProjectStatuses={fetchProjectStatuses}
                      states={states}
                      cities={cities}
                      handleCountryChange={handleCountryChange}
                      handleStateChange={handleStateChange}
                      getFilteredAndSortedOptions={getFilteredAndSortedOptions}
                      viewLocation={viewLocation}
                      clientFilteredCompanies={clientFilteredCompanies}
                      clientFilteredSubCompanies={clientFilteredSubCompanies}
                      clientFilteredContacts={clientFilteredContacts}
                      fetchClientCompaniesByCompanyTypeId={fetchClientCompaniesByCompanyTypeId}
                      fetchClientSubCompaniesByCompanyId={fetchClientSubCompaniesByCompanyId}
                      fetchClientContactsBySubCompanyId={fetchClientContactsBySubCompanyId}
                      setClientFilteredSubCompanies={setClientFilteredSubCompanies}
                      setClientFilteredContacts={setClientFilteredContacts}
                      relationFilteredCompanies={relationFilteredCompanies}
                      relationFilteredSubCompanies={relationFilteredSubCompanies}
                      relationFilteredContacts={relationFilteredContacts}
                      fetchRelationCompaniesByCompanyTypeId={fetchRelationCompaniesByCompanyTypeId}
                      fetchRelationSubCompaniesByCompanyId={fetchRelationSubCompaniesByCompanyId}
                      fetchRelationContactsBySubCompanyId={fetchRelationContactsBySubCompanyId}
                      setRelationFilteredSubCompanies={setRelationFilteredSubCompanies}
                      setRelationFilteredContacts={setRelationFilteredContacts}
                      sortCompaniesByName={sortCompaniesByName}
                      sortContactsByName={sortContactsByName}
                      buildEmployeeOptions={buildEmployeeOptions}
                      uploadFile={uploadFile}
                      getFileNameFromUrl={getFileNameFromUrl}
                      prefix={editablePrefix}
                      setPrefix={setEditablePrefix}
                      isEditMode={!!editingProjectId}
                      projectData={projectData}
                      onHide={handleProjectCancelWithDirtyCheck}
                      exportPdf={editingProjectId ? () => handleExport('pdf', values) : undefined}
                      exportDocx={editingProjectId ? () => handleExport('docx', values) : undefined}
                      onSaveDraft={() => saveProjectDraft(values, draftCurrentStep, {})}
                      isSavingDraft={isProjectDraftSaving}
                      onStepChange={setDraftCurrentStep}
                      initialStep={resumeStep}
                      formikProps={formikProps}
                      isDatesInvalid={isDatesInvalid}
                      getDateValidationMessage={getDateValidationMessage}
                      userId={userId}
                      editablePrefix={editablePrefix}
                      setEditablePrefix={setEditablePrefix}
                    />
                  </FormikForm>
                );
              }}
            </Formik>
          )}
        </Modal.Body>
      </Modal>

      {/* Configuration Forms */}
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

      {/* Draft modals */}
      <DraftRecoveryModal
        show={showProjectRecoveryModal}
        draft={projectDraft}
        entityName={projectDraft?.formData?.title}
        onResume={handleResumeProjectDraft}
        onDiscard={handleDiscardProjectDraft}
        onStartFresh={() => setShowProjectRecoveryModal(false)}
      />
      <UnsavedChangesModal
        show={showProjectUnsavedModal}
        isSaving={isProjectDraftSaving}
        onSaveDraft={handleSaveProjectDraftManual}
        onContinueEditing={() => setShowProjectUnsavedModal(false)}
        onDiscard={async () => { await discardProjectDraft(); onHide(); }}
      />
    </div>
  );
};

export default BlankBasicProjectForm;
