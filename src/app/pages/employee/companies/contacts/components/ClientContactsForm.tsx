import React, { useState, useEffect, useMemo, useRef } from "react";
import { Row, Col } from "react-bootstrap";
import { Formik, Form as FormikForm, type FormikProps } from "formik";
import * as Yup from "yup";
import PhoneNumberInput from "@app/components/PhoneNumberInput";
import TextInput from "@app/modules/common/inputs/TextInput";
import DropDownInput from "@app/modules/common/inputs/DropdownInput";
import Select from "react-select";
import { sortOptionsAlphabetically } from "@utils/sortUtils";
import { FullscreenWizardModal } from "@app/pages/employee/forms/shared/FullscreenWizardModal";
import { ContactWorkspace } from "../../forms/ContactWorkspace";
import { CrmSection } from "../../forms/CrmSection";
import { ContactAddressSection } from "../../forms/ContactAddressSection";
import {
  getAllClientCompanies,
  createClientContact,
  updateClientContact,
  getAllContactRoleTypes,
  getClientContactById,
  getAllContactStatuses,
  getAllClientContacts,
  getAllCompanyServices,
} from "@services/companies";
import {
  getAllClientBranches,
  getClientBranchesByCompanyId,
} from "@services/lead";
import { errorConfirmation, successConfirmation } from "@utils/modal";
import eventBus from "@utils/EventBus";
import {
  fetchAllCountries,
  fetchAllStates,
  fetchAllCities,
} from "@services/options";
import { uploadCompanyAsset } from "@services/uploader";
import DateInput from "@app/modules/common/inputs/DateInput";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import { ContactFormValues, Branch, ContactRoleType, ContactChannel, ContactCompanyStint } from "@models/companies";
import { ContactChannelFields, toChannelRows, toChannelPayload } from "./ContactChannelFields";
import { CompanyMoveFields } from "./CompanyMoveFields";
import CompanyConfigForm from "../../companyConfig/components/CompanyConfigForm";
import CompaniesBranchForm from "../../companies/components/CompaniesBranchForm";
import NewCompanyForm from "../../companies/components/NewCompanyForm";
import { useEventBus } from "@hooks/useEventBus";
import dayjs from "dayjs";
import { FLOATING_MENU_BEHAVIOUR } from "@app/modules/common/inputs/selectMenuProps";
import { AppIcon, useDiscardConfirm, FloatingLabels, FloatingLabelFrame, WtFieldFormik } from "@app/modules/common/components/ui";
import { Box } from "@mui/material";
import {
  CRM_ACTIVE_COLOR,
  CRM_INACTIVE_COLOR,
} from "../../crmListRowSx";
import { Button } from '@/ds/ui/button';

/** Prefer CRM active/inactive palette when the status name matches. */
function contactStatusColor(name?: string, fallback?: string) {
  const n = String(name || "")
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
  if (n === "active") return CRM_ACTIVE_COLOR;
  if (n.includes("inactive") || n === "closed") return CRM_INACTIVE_COLOR;
  return fallback || CRM_INACTIVE_COLOR;
}


interface Company {
  id: string;
  companyName: string;
  value: string;
}

interface ClientContactsFormProps {
  show: boolean;
  onClose: () => void;
  contactId?: string | null;
  initialData?: Partial<ContactFormValues>
  key?: string
  clearContactId?: () => void;
  selectedCompanyId?: string;
}


const ClientContactsForm: React.FC<ClientContactsFormProps> = ({
  show,
  onClose,
  contactId,
  initialData,
  clearContactId,
  selectedCompanyId,
  key
}) => {
  // X / Esc / footer Cancel ask before throwing away unsaved edits (the ONE kit prompt).
  const formikRef = useRef<FormikProps<ContactFormValues>>(null);
  const discard = useDiscardConfirm(() => Boolean(formikRef.current?.dirty), onClose);

  // Dynamic validation: address fields not required on Add New Contact
  const validationSchema = useMemo(() => {
    const isAdd = !contactId;
    return Yup.object().shape({
      roleInCompany: Yup.string(),
      fullName: Yup.string().required("Full name is required"),
      phones: Yup.array().of(Yup.object({ value: Yup.string().max(20, "Phone is too long") })),
      emails: Yup.array().of(Yup.object({ value: Yup.string().trim().email("Invalid email format").max(100, "Email is too long") })),
      country: isAdd ? Yup.string() : Yup.string(),
      state: isAdd ? Yup.string() : Yup.string(),
      city: isAdd ? Yup.string() : Yup.string(),
      visibility: Yup.string(),
      dob: Yup.string(),
      gender: Yup.string(),
      gmbLink: Yup.string().url("Invalid URL format"),
      googleMapLink: Yup.string().url("Invalid URL format"),
    });
  }, [contactId]);

  // State for photo preview
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(
    null
  );
  // State for dropdown options
  const [companies, setCompanies] = useState<Company[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [contactRoleTypes, setContactRoleTypes] = useState<ContactRoleType[]>(
    []
  );
  const [contactStatuses, setContactStatuses] = useState<any[]>([]);
  // Contacts share the company-service catalog (the same list companies use).
  const [companyServices, setCompanyServices] = useState<any[]>([]);
  const [selectedRole, setSelectedRole] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [countries, setCountries] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<any>("");
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [selectedState, setSelectedState] = useState<string>("");
  const [dataLoaded, setDataLoaded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showContactStatusModal, setShowContactStatusModal] = useState(false);
  const [showCompanyServiceModal, setShowCompanyServiceModal] = useState(false);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [branchWarning, setBranchWarning] = useState('');
  const [existingContacts, setExistingContacts] = useState<any[]>([]);
  const [hasSelectedCompany, setHasSelectedCompany] = useState(false);
  const employeeIdCurrent = useSelector(
    (state: RootState) => state.employee.currentEmployee.id
  );

  // Format date for display (dd/mm/yyyy)
  // const formatDateForDisplay = (dateString: string) => {
  //   if (!dateString) return "";
  //   return dayjs(dateString).format("DD/MM/YYYY");
  // };

  // Format date for DateInput component (yyyy-mm-dd)
  const formatDateForInput = (dateString: string) => {
    if (!dateString) return "";
    return dayjs(dateString).format("YYYY-MM-DD");
  };


  /*
   * Saving REPLACES the contact's phone / email lists with the ones on screen. If the contact
   * was handed in without its `channels` (a caller whose row lacks them), the screen would only
   * show the primary ones and saving would drop the rest — so fetch them first.
   */
  const [fetchedChannels, setFetchedChannels] = useState<ContactChannel[] | null>(null);
  // Company history is display-only (never a form value), so it lives outside initialValues
  // and arriving late cannot reinitialize what the user has typed.
  const [fetchedHistory, setFetchedHistory] = useState<ContactCompanyStint[] | null>(null);
  useEffect(() => {
    setFetchedChannels(null);
    setFetchedHistory(null);
    if (!contactId || !initialData) return;
    const needChannels = !Array.isArray(initialData.channels);
    if (!needChannels && Array.isArray(initialData.companyHistory)) return;
    let cancelled = false;
    getClientContactById(contactId)
      .then((res: any) => {
        if (cancelled) return;
        const contact = res?.data?.contact;
        if (needChannels) setFetchedChannels(contact?.channels ?? []);
        setFetchedHistory(contact?.companyHistory ?? []);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [contactId, initialData]);
  const companyHistory = initialData?.companyHistory ?? fetchedHistory ?? [];

  // Create a clean initial values object for new contacts
  const emptyInitialValues: ContactFormValues = {
    companyId: "",
    branchId: "",
    roleInCompany: "",
    contactRoleId: "",
    statusId: "",
    serviceIds: [],
    subServiceIds: [],
    isPrimaryContact: false,
    companyMovedOn: "",
    fullName: "",
    dob: "",
    anniversary: "",
    gender: "",
    phones: toChannelRows("phones", undefined, []),
    emails: toChannelRows("emails", undefined, []),
    country: "",
    zipCode: "",
    area: "",
    city: "",
    state: "",
    address: "",
    locationOnMap: "",
    latitude: "",
    longitude: "",
    visibility: "Only Me",
    note: "",
    profilePhoto: null,
    isContactActive: true,
    gmbLink: "",
    googleMapLink: "",
  };

  // Use initialData if provided, otherwise use empty values
  const initialValues: ContactFormValues = useMemo(() => {
    const values = key === "add-new" ? { ...emptyInitialValues, companyId: selectedCompanyId || "" } : initialData ? {
      companyId: selectedCompanyId || initialData.companyId || "",
      branchId: (initialData.branchId) ?? (initialData.branch || ""),
      roleInCompany: initialData.roleInCompany || "",
      contactRoleId: initialData.contactRoleId || "",
      statusId: initialData.statusId || "",
      serviceIds: initialData.serviceMappings?.map((m: any) => m.serviceId) || [],
      subServiceIds: [],
      isPrimaryContact: initialData.isPrimaryContact || false,
      companyMovedOn: "",
      fullName: initialData.fullName || "",
      dob: initialData.dateOfBirth ? formatDateForInput(initialData.dateOfBirth) : "",
      anniversary: initialData.anniversary ? formatDateForInput(initialData.anniversary) : "",
      gender: initialData.gender || "",
      phones: toChannelRows("phones", initialData.channels ?? fetchedChannels ?? undefined, [initialData.phone, initialData.phone2]),
      emails: toChannelRows("emails", initialData.channels ?? fetchedChannels ?? undefined, [initialData.email]),
      country: initialData.country || "",
      zipCode: initialData.zipCode || "",
      area: initialData.area || "",
      city: initialData.city || "",
      state: initialData.state || "",
      address: initialData.address || "",
      locationOnMap: initialData.locationOnMap || "",
      latitude: initialData.latitude || "",
      longitude: initialData.longitude || "",
      visibility: initialData.visibility || "Only Me",
      note: initialData.note || "",
      profilePhoto: null,
      isContactActive: initialData.isContactActive ?? true,
      gmbLink: initialData.gmbLink || "",
      googleMapLink: initialData.googleMapLink || "",
    } : { ...emptyInitialValues };

    // Default status to 'Active' for new contacts if available
    if (!contactId && contactStatuses.length > 0 && !values.statusId) {
      const activeStatus = contactStatuses.find(s => s.name?.toLowerCase() === 'active');
      if (activeStatus) {
        values.statusId = activeStatus.id;
      }
    }

    return values;
  }, [key, initialData, contactId, contactStatuses, selectedCompanyId, fetchedChannels]);

  // Seed the photo preview with the contact's existing image when editing, so it
  // shows in the upload box instead of the empty placeholder. (The form field
  // stays null until a NEW file is picked — save preserves the existing URL.)
  useEffect(() => {
    // `googlePhotoUrl` is the Google-hosted address a fresh import carries; `profilePhoto` is
    // an asset we already host, on a contact being edited. Either is worth showing in the box —
    // what the preview answers is "this is the picture this contact will have".
    const existing = (initialData as any)?.profilePhoto || (initialData as any)?.googlePhotoUrl;
    setProfilePhotoPreview(key !== "add-new" && typeof existing === "string" && existing ? existing : null);
  }, [key, contactId, (initialData as any)?.profilePhoto, (initialData as any)?.googlePhotoUrl]);

  useEffect(() => {
    loadInitialData();
  }, []);

  // Load initial data
  useEffect(() => {
    if (contactId) {
      loadInitialData();
    } else {
      // Reset form when modal is closed
      setSelectedCompany("");
      setSelectedCountry("");
      setSelectedState("");
      setSelectedRole(null);
      setStates([]);
      setCities([]);
      setDataLoaded(false);
    }
  }, [contactId]);


  // Set initial values and handle auto-fill when data is loaded
  useEffect(() => {
    if (dataLoaded) {
      const companyToAutoFill = selectedCompanyId || initialData?.companyId;

      if (companyToAutoFill) {
        setSelectedCompany(companyToAutoFill);
        // Load branches silently (no warning) for auto-fill/initial load
        loadBranches(companyToAutoFill, false);
      }

      // Handle other fields from initialData (Edit mode)
      if (initialData) {
        // Set role
        if (initialData.contactRoleId) {
          const role = contactRoleTypes.find(
            (r) => r.id === initialData.contactRoleId
          );
          if (role) {
            setSelectedRole({ id: role.id, name: role.name });
          }
        }

        // Set country
        if (initialData.country) {
          const country = countries.find((c) => c.name === initialData.country || c.id === initialData.country);
          if (country) {
            setSelectedCountry(country.id);
          }
        }
      }
    }
  }, [dataLoaded, initialData, selectedCompanyId, contactRoleTypes, countries]);

  // Set branch after branches are loaded and company is set
  useEffect(() => {
    if (branches.length > 0 && initialData && contactId) {
      const branchId = initialData.branchId || initialData.branch;
      if (branchId) {
        // Check if the branch exists in the loaded branches
        const branchExists = branches.find((b) => b.id === branchId);
        if (branchExists) {
          // Branch is already set in initialValues, this just ensures it's valid
        } else {
          console.warn("Branch not found in branches list:", branchId);
        }
      }
    }
  }, [branches, initialData, contactId]);


  // Load states when country changes
  useEffect(() => {
    if (selectedCountry) {
      const country = countries.find((c) => c.id === selectedCountry);
      if (country) {
        handleCountryChange(country.id);
      }
    } else {
      setStates([]);
      setCities([]);
    }
  }, [selectedCountry, countries]);

  // Load cities when state changes
  useEffect(() => {
    if (selectedState && selectedCountry) {
      const country = countries.find((c) => c.id === selectedCountry);
      const state = states.find(
        (s) => s.name === selectedState || s.id === selectedState
      );
      if (country && state) {
        handleStateChange(country.id, state.id);
      }
    } else {
      setCities([]);
    }
  }, [selectedState, selectedCountry, states, countries]);

  // Set state after states are loaded
  useEffect(() => {
    if (states.length > 0 && initialData?.state && !selectedState) {
      const state = states.find((s) => s.name === initialData.state);
      if (state) {
        setSelectedState(state.id);
      }
    }
  }, [states, initialData?.state, selectedState]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [companiesData, roleTypesData, countriesData, branchesData, contactStatusesData, companyServicesData] = await Promise.all([
        getAllClientCompanies(),
        getAllContactRoleTypes(),
        fetchAllCountries(),
        getAllClientBranches(),
        getAllContactStatuses(),
        getAllCompanyServices(),
      ]);
      setCompanies(companiesData?.data?.companies || []);
      setContactRoleTypes(roleTypesData?.contactRoleTypes || []);
      setCountries(countriesData);
      setBranches(branchesData?.leadBranches || []);
      setContactStatuses(contactStatusesData?.data?.contactConfigs || []);
      setCompanyServices(companyServicesData?.data?.services || companyServicesData?.services || []);
      const contactsData = await getAllClientContacts({}, true);
      setExistingContacts(contactsData?.contacts || contactsData?.clients || contactsData?.data?.contacts || contactsData?.data?.clients || []);
      setDataLoaded(true);
    } catch (error) {
      console.error("Error loading initial data:", error);
    } finally {
      setLoading(false);
    }
  };
  useEventBus("contactRoleTypeCreated", () => {
    loadInitialData();
  });
  useEventBus("contactStatusCreated", () => {
    loadInitialData();
  });
  useEventBus("companyServiceCreated", () => {
    loadInitialData();
  });
  useEventBus("companyCreated", () => {
    loadInitialData();
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadBranches = async (companyId?: string, showWarning: boolean = false) => {
    try {
      const targetCompanyId =
        companyId ||
        (typeof selectedCompany === "object"
          ? selectedCompany?.value
          : selectedCompany);

      // 🚨 CRITICAL FIX
      if (!targetCompanyId || targetCompanyId === "" || targetCompanyId === "undefined") {
        console.warn("Skipping branch load - invalid companyId:", targetCompanyId);
        setBranches([]);
        setBranchWarning("");
        return;
      }

      const branchesData = await getClientBranchesByCompanyId(targetCompanyId);

      setBranches(branchesData?.leadBranches || []);

      if (showWarning && branchesData?.leadBranches?.length === 0) {
        setBranchWarning("No branches found for this company");
      } else if (showWarning) {
        setBranchWarning("");
      }
    } catch (error: any) {
      console.error("Error loading branches:", error);

      if (showWarning) {
        if (error?.response?.status === 404) {
          setBranchWarning("No branches found for this company");
        } else {
          setBranchWarning("Error loading branches");
        }
      }
    }
  };
  useEventBus("branchCreated", () => {
    loadBranches();
  });

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

  const handleSubmit = async (formValues: ContactFormValues) => {
    try {
      setLoading(true);

      let profilePhotoUrl: string | null = null;
      if (formValues.profilePhoto && formValues.profilePhoto instanceof File) {
        try {
          const formData = new FormData();
          formData.append("file", formValues.profilePhoto);
          const uploadResult = await uploadCompanyAsset(formData);
          const {
            data: { path },
          } = uploadResult;
          profilePhotoUrl = path;
        } catch (uploadError) {
          console.error("Error uploading profile photo:", uploadError);
          errorConfirmation("Image upload failed, but contact will still be saved.");
        }
      }

      // Get country, state, city names from their IDs
      const selectedCountryData = countries.find(
        (c) => c.id === formValues.country
      );
      const selectedStateData = states.find((s) => s.id === formValues.state);
      const selectedCityData = cities.find((c) => c.id === formValues.city);

      // Parse date from various formats to ISO format for Prisma
      const parseDateFromDisplay = (dateString: string) => {
        if (!dateString) return null;

        try {
          let date;

          // Try different date formats
          if (dateString.includes('/')) {
            // DD/MM/YYYY format
            date = dayjs(dateString, "DD/MM/YYYY");
          } else if (dateString.includes('-')) {
            // YYYY-MM-DD format (ISO format)
            date = dayjs(dateString, "YYYY-MM-DD");
          } else {
            // Let dayjs try to parse automatically
            date = dayjs(dateString);
          }

          // Check if the date is valid before converting to ISO
          if (date.isValid()) {
            return date.toISOString();
          } else {
            console.error("Invalid date format:", dateString);
            return null;
          }
        } catch (error) {
          console.error("Error parsing date:", error);
          return null;
        }
      };

      const contactData: Record<string, any> = {
        companyId: formValues.companyId,
        branch: formValues.branchId,
        roleInCompany: formValues.roleInCompany,
        contactRoleId: formValues.contactRoleId,
        statusId: formValues.statusId,
        serviceIds: formValues.serviceIds || [],
        isPrimaryContact: formValues.isPrimaryContact === true ? 'true' : 'false',
        // Only on a move: the server closes the old company's stint on this day (default today).
        companyMovedOn: contactId && initialData?.companyId && formValues.companyId !== initialData.companyId
          ? parseDateFromDisplay(formValues.companyMovedOn || "") ?? undefined
          : undefined,

        fullName: formValues.fullName,
        dateOfBirth: parseDateFromDisplay(formValues?.dob || ""),
        anniversary: parseDateFromDisplay(formValues?.anniversary || ""),
        gender: formValues.gender ? formValues.gender.toUpperCase() : null,

        // The server stores these and writes the primary ones back to phone / phone2 / email.
        phones: toChannelPayload(formValues.phones),
        emails: toChannelPayload(formValues.emails),

        country: selectedCountryData?.name || formValues.country,
        state: selectedStateData?.name || formValues.state,
        city: selectedCityData?.name || formValues.city,
        zipCode: formValues.zipCode,
        area: formValues.area,
        address: formValues.address,
        gmbLink: formValues.gmbLink,
        googleMapLink: formValues.googleMapLink,

        latitude: formValues.latitude ? parseFloat(formValues.latitude) : null,
        longitude: formValues.longitude
          ? parseFloat(formValues.longitude)
          : null,

        visibility: formValues.visibility
          ? formValues.visibility.toUpperCase().replace(/ /g, "_")
          : "ONLY_ME",
        note: formValues.note,
        // The Contact Status dropdown is the single source of truth for active/inactive:
        // a status named "In Active"/"Inactive" makes the contact inactive; anything else is active.
        isContactActive: (() => {
          const s = contactStatuses.find((x) => x.id === formValues.statusId);
          const name = (s?.name || "").toLowerCase();
          return !/in\s*active|inactive/.test(name);
        })(),
      };

      if (profilePhotoUrl !== null) {
        contactData.profilePhoto = profilePhotoUrl;
      }

      /*
       * Google import extras, passed straight through.
       *
       * They live on `initialData` rather than in the form's own values because neither is a
       * field anybody types: `googleResourceId` records where the contact came from, and
       * `googlePhotoUrl` is an address the SERVER fetches the picture from and swaps for a path
       * in our own storage. Both were being dropped here — `contactData` is built key by key,
       * so anything not named simply never left the browser, and an imported contact was saved
       * with no provenance and no photo.
       *
       * The photo only when the admin has not chosen their own: an uploaded file is a
       * deliberate choice and must beat whatever Google had.
       */
      const googleResourceId = (initialData as any)?.googleResourceId;
      if (googleResourceId) contactData.googleResourceId = googleResourceId;

      const googlePhotoUrl = (initialData as any)?.googlePhotoUrl;
      if (googlePhotoUrl && profilePhotoUrl === null) contactData.googlePhotoUrl = googlePhotoUrl;

      Object.keys(contactData).forEach((key) => {
        if (contactData[key] === undefined) {
          delete contactData[key];
        }
      });

      if (contactId) {
        await updateClientContact(contactId, contactData);
        successConfirmation("Contact updated.");
      } else {
        await createClientContact(contactData);
        successConfirmation("Contact created.");
      }

      eventBus.emit("clientContactUpdated");
      onClose();
    } catch (error: any) {
      console.error("Error saving contact:", error);
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.detail ||
        error?.data?.message ||
        error?.data?.detail ||
        error?.message ||
        "Failed to save the contact. Please try again.";
      errorConfirmation(message);
    } finally {
      setLoading(false);
      clearContactId?.();
    }
  };

  const visibilityOptions = [
    { value: "ONLY_ME", label: "Only Me" },
    { value: "EVERYONE", label: "Everyone" },
    { value: "SUPER_ADMIN", label: "Super Admins" },
    { value: "ADMIN", label: "Admins" },
    { value: "TEMPORARY", label: "Temporary" },
  ];

  const genderOptions = [
    { value: "MALE", label: "Male" },
    { value: "FEMALE", label: "Female" },
    { value: "OTHER", label: "Other" },
  ];

  return (
    <>
      <FullscreenWizardModal
        show={show}
        onClose={discard.requestClose}
        closeLabel="Close contact form"
      >
        <Formik
          key={contactId ? `edit-${contactId}` : "add-new"}
          innerRef={formikRef}
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
          enableReinitialize={true}
        >
          {(formikProps) => {
            const { values, setFieldValue, errors, touched, isSubmitting } = formikProps;

            return (
              <FormikForm style={{ height: "100%" }}>
                {/* Every field in the wizard: label rests in the empty box, floats up on focus/value. */}
                <FloatingLabels>
                <ContactWorkspace
                  isEdit={!!contactId}
                  onCancel={discard.requestClose}
                  isSubmitting={loading || isSubmitting}
                  sections={[
                    {
                      id: "profile",
                      label: "Profile",
                      title: "Profile",
                      subtitle: "Photo, name, dates and gender",
                      fields: ["fullName","dob","gender","anniversary","profilePhoto"],
                      requiredFields: ["fullName"],
                      icon: "bi-person",
                      content: (
                        <CrmSection title="Profile">
                          <div className="crm-profile-layout">
                            <aside className="crm-profile-photo" aria-label="Profile photo">
                              <label
                                htmlFor="profilePhotoInput"
                                className={`crm-avatar-circle crm-avatar-circle--lg${profilePhotoPreview ? " has-image" : ""}`}
                                title="Upload profile photo"
                              >
                                {profilePhotoPreview ? (
                                  <img src={profilePhotoPreview} alt="Profile preview" />
                                ) : (
                                  <span className="crm-avatar-placeholder">
                                    <AppIcon name="bi-person-fill" />
                                    <span>Add photo</span>
                                  </span>
                                )}
                              </label>
                              <div className="crm-avatar-actions crm-avatar-actions--stack">
                                <Button variant="outline" size="sm"
                                  type="button"
                                  onClick={() => document.getElementById("profilePhotoInput")?.click()}
                                >
                                  {profilePhotoPreview ? "Change photo" : "Upload photo"}
                                </Button>
                                {profilePhotoPreview && (
                                  <Button variant="ghost" size="sm"
                                    type="button"
                                    onClick={() => {
                                      setFieldValue("profilePhoto", null);
                                      setProfilePhotoPreview(null);
                                    }}
                                  >
                                    Remove
                                  </Button>
                                )}
                                <span className="crm-avatar-hint">
                                  JPG or PNG · shown on contact lists
                                </span>
                              </div>
                              <input
                                type="file"
                                id="profilePhotoInput"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    setFieldValue("profilePhoto", file);
                                    setProfilePhotoPreview(URL.createObjectURL(file));
                                  }
                                }}
                                style={{ display: "none" }}
                              />
                            </aside>

                            <div className="crm-profile-fields">
                              <Row className="g-3">
                                <Col md={6}>
                                  <TextInput
                                    label="Full Name"
                                    placeholder="Enter full name"
                                    isRequired={true}
                                    formikField="fullName"
                                  />
                                </Col>
                                <Col md={6} className="crm-date-field">
                                  <DateInput
                                    formikField="dob"
                                    isRequired={false}
                                    formikProps={formikProps}
                                    inputLabel="Date of birth"
                                    placeHolder="1/3/2025"
                                  />
                                </Col>
                                <Col md={6}>
                                  {/* Pills in a box the date beside it's height, "Gender" in its border. */}
                                  <FloatingLabelFrame label="Gender" filled controlHeight={44}>
                                    <Box sx={{ display: "flex", alignItems: "center", minHeight: 44, px: 1, border: 1, borderColor: "divider", borderRadius: "8px", bgcolor: "background.paper", "& .crm-pill-group label": { padding: "4px 12px !important" } }}>
                                      <div className="crm-pill-group" role="group" aria-label="Gender">
                                        {genderOptions.map((option) => (
                                          <label key={option.value}>
                                            <input
                                              type="radio"
                                              name="gender"
                                              checked={values.gender === option.value}
                                              onChange={() => setFieldValue("gender", option.value)}
                                            />
                                            {option.label}
                                          </label>
                                        ))}
                                      </div>
                                    </Box>
                                  </FloatingLabelFrame>
                                </Col>
                                <Col md={6} className="crm-date-field">
                                  <DateInput
                                    formikField="anniversary"
                                    isRequired={false}
                                    formikProps={formikProps}
                                    inputLabel="Anniversary date"
                                    placeHolder="1/3/2025"
                                  />
                                </Col>
                              </Row>
                            </div>
                          </div>
                        </CrmSection>
                      ),
                    },
                    {
                      id: "company",
                      label: "Company",
                      title: "Company",
                      subtitle: "Link company, branch, role and services",
                      fields: ["companyId","branchId","contactRoleId","statusId","serviceIds","roleInCompany","isPrimaryContact"],
                      requiredFields: [],
                      icon: "bi-building",
                      content: (
                        <CrmSection title="Company">

                          <Row>
                            <Col md={12}>
                              <DropDownInput
                                inputLabel="Choose Company"
                                placeholder="Select company"
                                isRequired={false}
                                formikField="companyId"
                                disabled={false} // Temporarily false for testing
                                value={
                                  values.companyId
                                    ? {
                                      value: values.companyId,
                                      label:
                                        companies.find((c) => c.id == values.companyId)?.companyName || "Loading...",
                                    }
                                    : null
                                }
                                options={companies.map((c) => ({
                                  value: c.id,
                                  label: c.companyName,
                                }))}
                                onChange={(val: any) => {
                                  const companyId = val?.value || val || "";
                                  setFieldValue("companyId", companyId);
                                  setSelectedCompany(companyId);
                                  setFieldValue("branchId", ""); // Reset branch when company changes
                                  setFieldValue("serviceIds", []); // Sub-services are company-scoped — reset on company change
                                  if (companyId) {
                                    loadBranches(companyId, true); // Show warnings for manual change
                                    setHasSelectedCompany(true);
                                  } else {
                                    setBranches([]);
                                    setBranchWarning("");
                                  }
                                }}
                              />
                              {branchWarning && (
                                <small className="text-danger">
                                  {branchWarning}
                                </small>
                              )}
                              <small
                                className="text-primary"
                                onClick={() => setShowCompanyModal(true)}
                                style={{ cursor: "pointer" }}
                              >
                                + New Company
                              </small>
                            </Col>
                            <Col md={6} className="mt-2">
                              <DropDownInput
                                inputLabel="Choose Branch"
                                placeholder="Select branch"
                                isRequired={false}
                                formikField="branchId"
                                options={branches.map((b) => ({
                                  value: b.id,
                                  label: b.name,
                                }))}
                                onChange={(value) => {
                                  let branchValue = value;
                                  if (
                                    value &&
                                    typeof value === "object" &&
                                    "value" in value
                                  ) {
                                    branchValue = value.value;
                                  }
                                  branchValue = String(branchValue).replace(
                                    /^\"|\"$/g,
                                    ""
                                  );
                                  setFieldValue("branchId", branchValue);

                                }}
                                value={
                                  values.branchId
                                    ? {
                                      value: values.branchId,
                                      label:
                                        branches.find(
                                          (b) => b.id === values.branchId
                                        )?.name || "",
                                    }
                                    : null
                                }
                              />
                              <small
                                className="text-primary"
                                onClick={() => setShowBranchModal(true)}
                                style={{ cursor: "pointer" }}
                              >
                                + New Branch
                              </small>
                            </Col>
                            <Col md={6} className="mt-2">
                              <DropDownInput
                                inputLabel="Designation in Company"
                                placeholder="Select Designation"
                                isRequired={false}
                                formikField="roleInCompany"
                                options={contactRoleTypes.map((r) => ({
                                  value: r.id,
                                  label: r.name,
                                }))}
                                onChange={(value) => {
                                  let roleId = value;
                                  if (
                                    value &&
                                    typeof value === "object" &&
                                    "value" in value
                                  ) {
                                    roleId = value.value;
                                  }
                                  roleId = String(roleId).replace(
                                    /^\"|\"$/g,
                                    ""
                                  );
                                  const selected = contactRoleTypes.find(
                                    (r) => r.id === roleId
                                  );
                                  if (selected) {
                                    setSelectedRole({
                                      id: selected.id,
                                      name: selected.name,
                                    });
                                    setFieldValue(
                                      "roleInCompany",
                                      selected.name
                                    );
                                    setFieldValue("contactRoleId", selected.id);
                                  }
                                }}
                                value={
                                  values.contactRoleId
                                    ? {
                                      value: values.contactRoleId,
                                      label:
                                        contactRoleTypes.find(
                                          (r) => r.id === values.contactRoleId
                                        )?.name || "",
                                    }
                                    : null
                                }
                              />
                              <small
                                className="text-primary"
                                onClick={() => setShowModal(true)}
                                style={{ cursor: "pointer" }}
                              >
                                + New Designation
                              </small>
                            </Col>
                            <Col md={6} className="mt-2">
                              <DropDownInput
                                inputLabel="Contact Status"
                                placeholder="Select Contact Status"
                                isRequired={false}
                                formikField="statusId"
                                options={contactStatuses.map((s) => ({
                                  value: s.id,
                                  label: s.name,
                                  color: contactStatusColor(s.name, s.color),
                                }))}
                                showColor={true}
                                disableAlphabeticalSort
                                onChange={(value) => {
                                  let statusId = value;
                                  if (
                                    value &&
                                    typeof value === "object" &&
                                    "value" in value
                                  ) {
                                    statusId = value.value;
                                  }
                                  statusId = String(statusId).replace(
                                    /^"|"$/g,
                                    ""
                                  );
                                  setFieldValue("statusId", statusId);
                                }}
                                value={
                                  values.statusId
                                    ? (() => {
                                        const s = contactStatuses.find(
                                          (x) => x.id === values.statusId
                                        );
                                        return {
                                          value: values.statusId,
                                          label: s?.name || "",
                                          color: contactStatusColor(
                                            s?.name,
                                            s?.color
                                          ),
                                        };
                                      })()
                                    : null
                                }
                              />
                              <small
                                className="text-primary"
                                onClick={() => setShowContactStatusModal(true)}
                                style={{ cursor: "pointer" }}
                              >
                                + New Status
                              </small>
                            </Col>
                            <Col md={6} className="mt-2">
                              <FloatingLabelFrame label="Sub-services" filled={(values.serviceIds || []).length > 0} controlHeight={38}>
                              <Select
                                aria-label="Sub-services"
{...FLOATING_MENU_BEHAVIOUR}
                                isMulti
                                placeholder={
                                  values.companyId
                                    ? "Select sub-services"
                                    : "Select a company first"
                                }
                                classNamePrefix="react-select"
                                className="react-select-styled"
                                options={sortOptionsAlphabetically(
                                  (() => {
                                    // Strict cascade (mirrors the 3-layer company form): a contact's
                                    // sub-services are scoped to its COMPANY's tagged services. No company
                                    // selected → show nothing. Already-selected services are always kept
                                    // (edit mode) so a saved value is never silently dropped.
                                    const selCompany: any = companies.find((c: any) => c.id === values.companyId);
                                    const companyServiceIds = new Set<string>();
                                    if (selCompany && Array.isArray(selCompany.companyServicesMapping)) {
                                      selCompany.companyServicesMapping.forEach((m: any) => {
                                        const id = m.serviceId || m.service?.id; if (id) companyServiceIds.add(id);
                                      });
                                    }
                                    const selectedServiceIds = new Set(values.serviceIds || []);
                                    return companyServices
                                      .filter((s: any) =>
                                        companyServiceIds.has(s.id) ||
                                        selectedServiceIds.has(s.id)
                                      )
                                      .map((s) => ({ value: s.id, label: s.name }));
                                  })()
                                )}
                                value={companyServices
                                  .filter((s) => (values.serviceIds || []).includes(s.id))
                                  .map((s) => ({ value: s.id, label: s.name }))}
                                onChange={(selected: any) =>
                                  setFieldValue(
                                    "serviceIds",
                                    (selected || []).map((o: any) => o.value)
                                  )
                                }
                                menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
                                menuPosition="fixed"
                                styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
                              />
                              </FloatingLabelFrame>
                              <small
                                className="text-primary"
                                onClick={() => setShowCompanyServiceModal(true)}
                                style={{ cursor: "pointer" }}
                              >
                                + New Sub-service
                              </small>
                            </Col>
                          </Row>
                          <div className="d-flex gap-5 mt-6">
                            <div className="d-flex align-items-center gap-2">
                              <label
                                className="form-check-label"
                                htmlFor="primaryContactToggle"
                              >
                                Primary Contact in company
                              </label>
                              <div className="form-check form-switch m-0">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  role="switch"
                                  id="primaryContactToggle"
                                  checked={values.isPrimaryContact}
                                  onChange={(e) =>
                                    setFieldValue("isPrimaryContact", e.target.checked)
                                  }
                                />
                              </div>
                            </div>
                          </div>
                          <CompanyMoveFields
                            originalCompanyId={contactId ? initialData?.companyId || "" : ""}
                            originalCompanyName={
                              (initialData as any)?.company?.companyName ||
                              companies.find((c) => c.id == initialData?.companyId)?.companyName ||
                              "their current company"
                            }
                            newCompanyName={companies.find((c) => c.id == values.companyId)?.companyName}
                            history={companyHistory}
                            onMove={() => {
                              // A new employer: nothing from the old one carries over.
                              formikProps.setValues({
                                ...values,
                                companyId: "",
                                branchId: "",
                                roleInCompany: "",
                                contactRoleId: "",
                                serviceIds: [],
                                isPrimaryContact: false,
                                companyMovedOn: dayjs().format("YYYY-MM-DD"),
                              });
                              setSelectedCompany("");
                              setBranches([]);
                              setBranchWarning("");
                            }}
                            onUndo={() => {
                              const original = initialValues;
                              formikProps.setValues({
                                ...values,
                                companyId: original.companyId,
                                branchId: original.branchId,
                                roleInCompany: original.roleInCompany,
                                contactRoleId: original.contactRoleId,
                                serviceIds: original.serviceIds,
                                isPrimaryContact: original.isPrimaryContact,
                                companyMovedOn: "",
                              });
                              setSelectedCompany(original.companyId);
                              if (original.companyId) loadBranches(original.companyId);
                            }}
                          />
                        </CrmSection>
                      ),
                    },
                    {
                      id: "contact",
                      label: "Contact",
                      title: "Contact Details",
                      subtitle: "Phone numbers and email",
                      fields: ["phones","emails"],
                      requiredFields: [],
                      icon: "bi-telephone",
                      content: (
                        <CrmSection title="Contact Details">
                          <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <ContactChannelFields kind="phones" />
                            <ContactChannelFields
                              kind="emails"
                              hint="Birthday greetings and meeting invites go to the primary email. A personal address keeps working if they change jobs."
                            />
                          </Box>
                        </CrmSection>
                      ),
                    },
                    {
                      id: "address",
                      label: "Address",
                      title: "Address, Location & Docs",
                      subtitle: "Search address, drop a pin, and fine-tune location details",
                      fields: ["address","country","state","city","area","zipCode","latitude","longitude","gmbLink","googleMapLink"],
                      requiredFields: [],
                      icon: "bi-geo-alt",
                      content: (
                        <ContactAddressSection
                          countries={countries}
                          states={states}
                          cities={cities}
                          selectedCountry={selectedCountry}
                          selectedState={selectedState}
                          setSelectedCountry={setSelectedCountry}
                          setSelectedState={setSelectedState}
                          handleCountryChange={handleCountryChange}
                          handleStateChange={handleStateChange}
                        />
                      ),
                    },
                    {
                      id: "notes",
                      label: "Notes",
                      title: "Notes",
                      subtitle: "Extra notes for this contact",
                      fields: ["note","visibility"],
                      requiredFields: [],
                      icon: "bi-journal-text",
                      content: (
                        <CrmSection title="Notes">

                          <Row>
                            {/* <Col md={12}>
                              <div className="form-group">
                                <label className="form-label">Visibility</label>
                                <div className="d-flex flex-column flex-md-row gap-2">
                                  {visibilityOptions.map((option) => (
                                    <div
                                      key={option.value}
                                      className="form-check form-check-inline"
                                    >
                                      <input
                                        type="radio"
                                        id={`visibility-${option.value}`}
                                        name="visibility"
                                        className="form-check-input"
                                        checked={
                                          values.visibility === option.value
                                        }
                                        onChange={() =>
                                          setFieldValue(
                                            "visibility",
                                            option.value
                                          )
                                        }
                                      />
                                      <label
                                        className="form-check-label"
                                        htmlFor={`visibility-${option.value}`}
                                      >
                                        {option.label}
                                      </label>
                                    </div>
                                  ))}
                                </div>
                                {errors.visibility && touched.visibility && (
                                  <div className="text-danger">
                                    {errors.visibility}
                                  </div>
                                )}
                              </div>
                            </Col> */}
                            <div className="mb-3 mt-3">
                              <WtFieldFormik name="note" label="Note" multiline minRows={3} placeholder="Enter note" />
                            </div>
                          </Row>
                    
                        </CrmSection>
                      ),
                    }
                  ]}
                />
                </FloatingLabels>
              </FormikForm>
            );
          }}
        </Formik>
      </FullscreenWizardModal>
      {discard.dialog}
      <CompanyConfigForm
        show={showModal}
        onClose={() => setShowModal(false)}
        type="contact-role-type"
        title="Designation"
      />
      <CompanyConfigForm
        show={showContactStatusModal}
        onClose={() => setShowContactStatusModal(false)}
        type="contact-status"
        title="Contact Status"
      />
      <CompanyConfigForm
        show={showCompanyServiceModal}
        onClose={() => setShowCompanyServiceModal(false)}
        type="company-services"
        title="Service"
      />
      <CompaniesBranchForm
        show={showBranchModal}
        onClose={() => setShowBranchModal(false)}
      />
      <NewCompanyForm
        show={showCompanyModal}
        onClose={() => setShowCompanyModal(false)}
      />
    </>
  );
};

export default ClientContactsForm;
