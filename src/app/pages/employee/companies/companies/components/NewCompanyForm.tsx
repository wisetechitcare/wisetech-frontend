import {
  createClientCompany,
  getAllCompanyTypes,
  updateClientCompany,
  getClientCompanyById,
  getAllClientContacts,
  getAllClientCompanies,
  getClientContactsByCompanyId,
  getAllCompanyServices,
  createCompanyService,
} from "@services/companies";
import { uploadCompanyAsset } from "@services/uploader";
import {
  fetchAllCities,
  fetchAllCountries,
  fetchAllStates,
} from "@services/options";

import { Formik, Form as FormikForm, Field, FieldArray, type FormikProps } from "formik";
import * as Yup from "yup";
import PhoneNumberInput from "@app/components/PhoneNumberInput";
import TextInput from "@app/modules/common/inputs/TextInput";
import DropDownInput from "@app/modules/common/inputs/DropdownInput";
import { WtDateField, AppIcon, useDiscardConfirm, WtButton, WtSwitch, WtField, WtFieldFormik, FloatingLabels, FloatingLabelFrame } from "@app/modules/common/components/ui";
import { Box } from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";
import Select from "react-select";
import { errorConfirmation, successConfirmation } from "@utils/modal";
import eventBus from "@utils/EventBus";
import CompanyConfigForm from "../../companyConfig/components/CompanyConfigForm";
import { useEventBus } from "@hooks/useEventBus";
import { EVENT_KEYS } from "@constants/eventKeys";
import { getRatingByCompanyId } from "@services/projects";
import SubCompanyForm from "./SubCompanryForm";
import { fetchAllEmployees } from "@services/employee";
import MultiSelectWithInlineCreate, { Option } from "@app/modules/common/components/MultiSelectWithInlineCreate";
import { transformToOptions, createNewCompanyService, createNewCompanyType, createNewServiceUnderType } from "@app/modules/common/components/InlineCreateHelpers";
import { fetchSubCompanies } from "@services/company";
import FormSchemaManager from "@app/modules/common/components/FormSchemaManager";
import DragDropFileField from "@app/modules/common/components/DragDropFileField";
import { IFormField, IFormSection } from "@models/company";
import { cloneCompanyDefaults, mergeCompanySchema } from "./companyFormSchema";
import { sortOptionsAlphabetically } from "@utils/sortUtils";
import { FullscreenWizardModal } from "@app/pages/employee/forms/shared/FullscreenWizardModal";
import { CompanyWorkspace } from "../../forms/CompanyWorkspace";
import { CrmSection } from "../../forms/CrmSection";
import { ContactAddressSection } from "../../forms/ContactAddressSection";
import {
  CRM_ACTIVE_COLOR,
  CRM_INACTIVE_COLOR,
} from "../../crmListRowSx";

const COMPANY_STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active", color: CRM_ACTIVE_COLOR },
  { value: "CLOSED", label: "Inactive", color: CRM_INACTIVE_COLOR },
];


// Type definitions
interface CompanyType {
  id: string;
  name: string;
}
interface Country {
  id: string;
  name: string;
  iso2: string;
}
interface State {
  id: string;
  name: string;
  iso2: string;
}
interface City {
  id: string;
  name: string;
}
interface FormValues {
  companyName: string;
  companyTypes: string[];
  subTypes: string[];
  status: string;
  phone: string;
  phone2: string;
  fax: string;
  email: string;
  website: string;
  addressLine1: string;
  zipCode: string;
  area: string;
  country: string;
  state: string;
  city: string;
  visibility: string;
  note: string;
  blacklisted: boolean;
  latitude: string;
  longitude: string;
  reference?: string;
  internalReference?: string;
  externalReference?: string;
  gmbProfileUrl?: string;
  googleMapsLink?: string;
  internalReferenceEmployeeId?: string;
  externalReferenceContactId?: string;
  gstNumber?: string;
  panNumber?: string;
  gstAddress?: string;
  gstDocument?: string;
  panDocument?: string;
  services: string[];
  subServiceIds: string[];
  referenceType: Array<{
    referenceType: string;
    internalReferenceEmployeeId?: string;
    externalReferenceCompanyTypeId?: string;
    externalReferenceCompanyId?: string;
    externalReferenceContactId?: string;
    externalReferenceSubCompanyId?: string;
  }>;
}

interface Props {
  show: boolean;
  onClose: () => void;
  editingCompanyId?: string | null;
}

// Validation
const validationSchema = Yup.object().shape({
  companyName: Yup.string().required("Company name is required"),
  companyTypes: Yup.array().of(Yup.string()),
  subTypes: Yup.array().of(Yup.string()),
  status: Yup.string(),
  email: Yup.string().email("Invalid email format"),
  phone: Yup.string(),
  country: Yup.string(),
  state: Yup.string(),
  city: Yup.string(),
  addressLine1: Yup.string(),
  zipCode: Yup.string(),
  area: Yup.string(),
  latitude: Yup.string(),
  longitude: Yup.string(),
  services: Yup.array().of(Yup.string()),
});

// Built-ins an admin marked required in Manage Fields. Multi-selects need a pick, text
// needs content; the blacklist toggle and the references list have no "empty" to reject.
const ARRAY_FIELDS = new Set(["companyTypes", "subTypes", "services"]);
const UNREQUIRABLE = new Set(["blacklisted", "references", "companyName"]);
const schemaFor = (sections: IFormSection[]) =>
  validationSchema.shape(
    Object.fromEntries(
      sections
        .flatMap((s) => s.fields)
        .filter((f) => f.isSystem && f.required && !f.hidden && !UNREQUIRABLE.has(f.id))
        .map((f) => {
          const msg = `${f.label} is required`;
          const base = (validationSchema.fields as Record<string, unknown>)[f.id];
          if (ARRAY_FIELDS.has(f.id)) return [f.id, Yup.array().of(Yup.string()).min(1, msg)];
          // Keep the field's own rule (email format…) and add presence on top.
          return [f.id, (base instanceof Yup.StringSchema ? base : Yup.string()).trim().required(msg)];
        })
    )
  );

const NewCompanyForm: React.FC<Props> = ({
  show,
  onClose,
  editingCompanyId,
}) => {
  const [companyTypes, setCompanyTypes] = useState<CompanyType[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  // X / Esc / footer Cancel ask before throwing away unsaved edits (the ONE kit prompt).
  const formikRef = useRef<FormikProps<FormValues>>(null);
  const discard = useDiscardConfirm(() => Boolean(formikRef.current?.dirty), onClose);

  // Split the flat type list into MAIN types and SUB-types (one level deep, with the same
  // orphan-promotion as the chart/tree so nothing ever disappears). Drives the cascading
  // Company Type → Sub-type → Service selectors.
  const { mainTypes, subTypesByParent } = useMemo(() => {
    const typeById = new Map((companyTypes as any[]).map((t) => [t.id, t]));
    const parentIsTopLevel = (pid: any) => {
      const p = typeById.get(pid);
      return !!p && (!p.parentTypeId || !typeById.has(p.parentTypeId));
    };
    const isSub = (t: any) => !!(t.parentTypeId && typeById.has(t.parentTypeId) && parentIsTopLevel(t.parentTypeId));
    const mains = (companyTypes as any[]).filter((t) => !isSub(t));
    const byParent = new Map<string, any[]>();
    (companyTypes as any[]).filter(isSub).forEach((t) => {
      const arr = byParent.get(t.parentTypeId) || [];
      arr.push(t);
      byParent.set(t.parentTypeId, arr);
    });
    return { mainTypes: mains, subTypesByParent: byParent };
  }, [companyTypes]);
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [showCompanyTypeModal, setShowCompanyTypeModal] = useState(false);
  const [ratingFactors, setRatingFactors] = useState<any[]>([]);
  const [showSubCompanyForm, setShowSubCompanyForm] = useState(false);
  const [prefix, setPrefix] = useState("");
  const [contacts, setContacts] = useState<any[]>([]);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [allCompanies, setAllCompanies] = useState<any[]>([]);
  const [clientContacts, setClientContacts] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [subCompanies, setSubCompanies] = useState<any[]>([]);
  const [initialValues, setInitialValues] = useState<FormValues>({
    companyName: "",
    companyTypes: [],
    subTypes: [],
    status: "ACTIVE",
    phone: "",
    phone2: "",
    fax: "",
    email: "",
    website: "",
    addressLine1: "",
    zipCode: "",
    area: "",
    country: "",
    state: "",
    city: "",
    visibility: "EVERYONE",
    note: "",
    blacklisted: false,
    latitude: "",
    longitude: "",
    gstNumber: "",
    panNumber: "",
    gstAddress: "",
    gstDocument: "",
    panDocument: "",
    services: [],
    subServiceIds: [],
    referenceType: [
      {
        referenceType: "",
        internalReferenceEmployeeId: "",
        externalReferenceCompanyTypeId: "",
        externalReferenceCompanyId: "",
        externalReferenceContactId: "",
        externalReferenceSubCompanyId: "",
      },
    ],
  });
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [servicesLoaded, setServicesLoaded] = useState(false);
  // Per-company admin-defined custom sections/fields (mirrors the Organisation edit form).
  // Seeded with the built-in section anchors so they appear in the schema manager.
  const [formSections, setFormSections] = useState<IFormSection[]>(cloneCompanyDefaults());
  const liveSchema = useMemo(() => schemaFor(formSections), [formSections]);
  const [showSchemaManager, setShowSchemaManager] = useState(false);
  const [customErrors, setCustomErrors] = useState<Record<string, string>>({});

  // ── Memoized dropdown options & lookup maps ──────────────────────────────────
  // The References section renders cascading company → sub-company selects inside a
  // FieldArray. Previously each select rebuilt its option list inline by mapping the
  // full company list on every render/keystroke — the main cause of the lag. Build
  // them once and reuse via O(1) lookups.
  const companyTypeOptions = useMemo(
    () => companyTypes.map((ct) => ({ label: ct.name, value: ct.id })),
    [companyTypes],
  );
  const contactOptions = useMemo(
    () => contacts.map((c: any) => ({ label: c.fullName, value: c.id, avatar: c.profilePhoto })),
    [contacts],
  );
  // companyId → its contact options (for the "filter Referral Contact by Referral
  // Company" cascade — previously this dropdown always showed every contact).
  const contactsByCompanyId = useMemo(() => {
    const m = new Map<string, { label: string; value: string; avatar?: string }[]>();
    contacts.forEach((c: any) => {
      const cid = c.companyId;
      if (!cid) return;
      const arr = m.get(cid) || [];
      arr.push({ label: c.fullName, value: c.id, avatar: c.profilePhoto });
      m.set(cid, arr);
    });
    return m;
  }, [contacts]);
  const contactById = useMemo(
    () => new Map<string, any>(contacts.map((c: any) => [c.id, c])),
    [contacts],
  );
  const employeeOptions = useMemo(
    () =>
      allEmployees.map((e: any) => ({
        label: `${e.users?.firstName} ${e.users?.lastName}`,
        value: e.id,
      })),
    [allEmployees],
  );
  const companyOptions = useMemo(
    () => allCompanies.map((c: any) => ({ label: c.companyName, value: c.id, avatar: c.logo })),
    [allCompanies],
  );
  const companyById = useMemo(
    () => new Map<string, any>(allCompanies.map((c: any) => [c.id, c])),
    [allCompanies],
  );
  // companyTypeId → company options (for the "filter companies by type" cascade).
  const companiesByTypeId = useMemo(() => {
    const m = new Map<string, { label: string; value: string; avatar?: string }[]>();
    allCompanies.forEach((c: any) => {
      const tid = c.companyTypeId;
      if (!tid) return;
      const arr = m.get(tid) || [];
      arr.push({ label: c.companyName, value: c.id, avatar: c.logo });
      m.set(tid, arr);
    });
    return m;
  }, [allCompanies]);
  const subCompanyOptionsAll = useMemo(
    () => subCompanies.map((s: any) => ({ label: s.subCompanyName, value: s.id })),
    [subCompanies],
  );
  // companyId → its sub-company options.
  const subCompaniesByCompanyId = useMemo(() => {
    const m = new Map<string, { label: string; value: string }[]>();
    allCompanies.forEach((c: any) => {
      const subs = Array.isArray(c.subCompanies) ? c.subCompanies : [];
      if (subs.length) {
        m.set(
          c.id,
          subs.map((s: any) => ({ label: s.subCompanyName || s.name, value: s.id })),
        );
      }
    });
    return m;
  }, [allCompanies]);

  useEffect(() => {
    const fetchContacts = async () => {
      const response = await getAllClientContacts({}, true);
      setContacts(response.data.contacts);
    };
    fetchContacts();
  }, []);

  useEffect(() => {
    const allEmployeesDropdown = async () => {
      const { data } = await fetchAllEmployees();
      setAllEmployees(data.employees);
    };
    allEmployeesDropdown();
  }, []);

  useEffect(() => {
    const fetchAllSubcompanies = async () => {
      const response = await fetchSubCompanies();
      setSubCompanies(response.data.subCompanies || []);
    };
    fetchAllSubcompanies();
  }, []);

  // Fetch company types and countries
  useEffect(() => {
    const fetchData = async () => {
      const [types, countries] = await Promise.all([
        getAllCompanyTypes(),
        fetchAllCountries(),
      ]);
      setCompanyTypes(types.companyTypes || []);
      setCountries(countries);
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchCompanies = async () => {
      // Light payload: the form only needs id, companyName, companyTypeId and the
      // nested subCompanies for the References cascade — not the heavy nested
      // references/mappings the full payload carries.
      const response = await getAllClientCompanies(true);
      setAllCompanies(response.data.companies);
    };
    fetchCompanies();
  }, []);

  // useEffect(() => {
  //   const fetchClientContacts = async () => {
  //     const response = await getClientContactsByCompanyId(values.companyId);
  //     setClientContacts(response.data.contacts);
  //   };
  //   fetchClientContacts();
  // }, [values.companyId]);

  const fetchData = async () => {
    const [types, countries] = await Promise.all([
      getAllCompanyTypes(),
      fetchAllCountries(),
    ]);
    setCompanyTypes(types.companyTypes || []);
    setCountries(countries);
  };

  useEventBus(EVENT_KEYS.companyTypeCreated, () => {
    fetchData();
  });

  useEventBus(EVENT_KEYS.companyServiceCreated, () => {
    handleRefreshServices();
  });

  // Fetch company data for editing
  useEffect(() => {
    const fetchCompanyData = async () => {
      if (editingCompanyId && show && countries.length > 0 && servicesLoaded) {
        setIsDataLoading(true);
        try {
          const response = await getClientCompanyById(editingCompanyId);
          const company = response.data.company;

          if (company) {
            // Set logo preview if exists

            setPrefix(company?.prefix || "");
            if (company.logo) {
              setLogoPreview(company.logo);
            }

            // Find country by multiple possible matches
            const findCountryByValue = (value: any) => {
              if (!value) return null;
              const searchVal = value.toString().trim().toLowerCase();
              return countries.find((c) => {
                return (
                  c.id?.toString().toLowerCase() === searchVal ||
                  c.iso2?.toLowerCase() === searchVal ||
                  c.name?.toLowerCase() === searchVal
                );
              });
            };

            const selectedCountry = findCountryByValue(company.country);

            let fetchedStates: any[] = [];
            let fetchedCities: any[] = [];
            let finalStateValue = "";
            let finalCityValue = "";

            if (selectedCountry) {
              // Fetch states for the country
              try {
                fetchedStates = await fetchAllStates(selectedCountry.iso2);
                setStates(fetchedStates);

                // Find state by multiple possible matches
                const findStateByValue = (value: any) => {
                  if (!value) return null;
                  const searchVal = value.toString().trim().toLowerCase();
                  return fetchedStates.find((s: any) => {
                    return (
                      s.id?.toString().toLowerCase() === searchVal ||
                      s.iso2?.toLowerCase() === searchVal ||
                      s.name?.toLowerCase() === searchVal
                    );
                  });
                };

                const selectedState = findStateByValue(company.state);

                if (selectedState) {
                  finalStateValue = selectedState.id;

                  // Fetch cities for the state
                  try {
                    fetchedCities = await fetchAllCities(
                      selectedCountry.iso2,
                      selectedState.iso2
                    );
                    setCities(fetchedCities);

                    // Find city by multiple possible matches
                    const findCityByValue = (value: any) => {
                      if (!value) return null;
                      const searchVal = value.toString().trim().toLowerCase();
                      return fetchedCities.find((c: any) => {
                        return (
                          c.id?.toString().toLowerCase() === searchVal ||
                          c.name?.toLowerCase() === searchVal
                        );
                      });
                    };

                    const selectedCity = findCityByValue(company.city);

                    if (selectedCity) {
                      finalCityValue = selectedCity.id;
                    } else {
                      finalCityValue = company.city;
                    }
                  } catch (error) {
                    console.error("Failed to fetch cities", error);
                  }
                } else {
                  console.warn(
                    "State not found in fetchedStates",
                    company.state
                  );
                }
              } catch (error) {
                console.error("Failed to fetch states", error);
              }
            } else {
              console.warn(
                "Country not found in countries list",
                company.country
              );
            }

            // Set initial values with proper mapping
            setInitialValues({
              companyName: company.companyName || "",
              // Main types only — sub-types go into `subTypes` (cascading selectors).
              companyTypes: (() => {
                if (Array.isArray(company.companyTypeMappings) && company.companyTypeMappings.length > 0) {
                  return company.companyTypeMappings
                    .filter((m: any) => !m.companyType?.parentTypeId)
                    .map((m: any) => m.companyTypeId || m.companyType?.id)
                    .filter((id: any) => id);
                }
                return company.companyTypeId ? [company.companyTypeId] : [];
              })(),
              // Sub-types (mappings whose type has a parent).
              subTypes: (() => {
                if (Array.isArray(company.companyTypeMappings) && company.companyTypeMappings.length > 0) {
                  return company.companyTypeMappings
                    .filter((m: any) => m.companyType?.parentTypeId)
                    .map((m: any) => m.companyTypeId || m.companyType?.id)
                    .filter((id: any) => id);
                }
                return [];
              })(),
              status: company.status || "ACTIVE",
              phone: company.phone || "",
              phone2: company.phone2 || "",
              fax: company.fax || "",
              email: company.email || "",
              website: company.website || "",
              addressLine1: company.address || "",
              zipCode: company.zipCode || "",
              area: company.area || "",
              country: selectedCountry ? selectedCountry.id : "",
              state: finalStateValue,
              city: finalCityValue,
              visibility: company.visibility || "EVERYONE",
              note: company.note || "",
              blacklisted: company.blacklisted || false,
              latitude: company.latitude || "",
              longitude: company.longitude || "",
              gmbProfileUrl: company.gmbProfileUrl || "",
              googleMapsLink: company.googleMapsLink || "",
              gstNumber: company.gstNumber || "",
              panNumber: company.panNumber || "",
              gstAddress: company.gstAddress || "",
              gstDocument: company.gstDocument || "",
              panDocument: company.panDocument || "",
              services: (() => {
                // Extract service IDs from companyServicesMapping
                let serviceIds = [];

                if (company.companyServicesMapping && Array.isArray(company.companyServicesMapping)) {
                  serviceIds = company.companyServicesMapping.map((mapping: any) => mapping.serviceId || mapping.service?.id);
                } else if (company.services && Array.isArray(company.services)) {
                  serviceIds = company.services.map((service: any) => service.id || service);
                } else if (company.serviceIds && Array.isArray(company.serviceIds)) {
                  serviceIds = company.serviceIds;
                } else if (company.services && typeof company.services === 'string') {
                  try {
                    const parsed = JSON.parse(company.services);
                    serviceIds = Array.isArray(parsed) ? parsed : [];
                  } catch (e) {
                    serviceIds = [];
                  }
                }

                // Filter out any undefined/null values
                serviceIds = serviceIds.filter((id  : any )=> id);

                return serviceIds;
              })(),
              subServiceIds: [],
              referenceType: company.references?.map((ref: any) => ({
                referenceType: ref.referenceType || "",
                internalReferenceEmployeeId: ref.internalReferenceEmployeeId || "",
                externalReferenceContactId: ref.externalReferenceContactId || "",
                externalReferenceCompanyTypeId: ref.externalReferenceCompanyTypeId || "",
                // The referral company is stored in `referralCompanyId` (the
                // `company_id`/externalReferenceCompanyId is the owning company).
                externalReferenceCompanyId: ref.referralCompanyId || "",
                externalReferenceSubCompanyId: ref.externalReferenceSubCompanyId || "",
              })) || [{
                referenceType: "",
                internalReferenceEmployeeId: "",
                externalReferenceContactId: "",
                externalReferenceCompanyTypeId: "",
                externalReferenceCompanyId: "",
                externalReferenceSubCompanyId: "",
              }],
            });

            // Load this company's saved custom sections/fields layout (per-company schema),
            // merged onto the built-in section anchors so they always appear in the manager.
            setFormSections(
              mergeCompanySchema(company.sectionConfig ?? company.customSections)
            );
          }
        } catch (error) {
          console.error("Failed to fetch company data", error);
        } finally {
          setIsDataLoading(false);
        }
      } else if (!editingCompanyId) {
        // Reset form for new company
        setInitialValues({
          companyName: "",
          companyTypes: [],
          subTypes: [],
          status: "ACTIVE",
          phone: "",
          phone2: "",
          fax: "",
          email: "",
          website: "",
          addressLine1: "",
          zipCode: "",
          area: "",
          country: "",
          state: "",
          city: "",
          visibility: "EVERYONE",
          note: "",
          blacklisted: false,
          latitude: "",
          longitude: "",
          gstNumber: "",
          panNumber: "",
          gstAddress: "",
          gstDocument: "",
          services: [],
          subServiceIds: [],
          referenceType: [
            {
              referenceType: "",
              internalReferenceEmployeeId: "",
              externalReferenceCompanyTypeId: "",
              externalReferenceCompanyId: "",
              externalReferenceContactId: "",
              externalReferenceSubCompanyId: "",
            },
          ],
        });
        setLogoPreview(null);
        setLogoFile(null);
        setStates([]);
        setCities([]);
        setFormSections(cloneCompanyDefaults());
      }
    };

    fetchCompanyData();
  }, [editingCompanyId, show, countries, servicesLoaded]);

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


  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  // ── Per-company custom sections/fields ────────────────────────────────────────
  // Custom field values live inline on the schema (field.value), exactly like the
  // Organisation edit form. File fields upload immediately and store the returned URL.
  const updateCustomValue = (sectionId: string, fieldId: string, value: string) => {
    setFormSections((prev) =>
      prev.map((sec) =>
        sec.id === sectionId
          ? { ...sec, fields: sec.fields.map((f) => (f.id === fieldId ? { ...f, value } : f)) }
          : sec
      )
    );
    setCustomErrors((p) => {
      const n = { ...p };
      delete n[fieldId];
      return n;
    });
  };

  const validateCustomFields = (): boolean => {
    const errs: Record<string, string> = {};
    formSections.forEach((sec) =>
      sec.fields.forEach((f) => {
        if (f.required && !String(f.value ?? "").trim()) {
          errs[f.id] = `${f.label} is required`;
        }
      })
    );
    setCustomErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Renders a single admin-defined custom field (text / number / date / file).
  const renderCustomField = (field: IFormField, sectionId: string) => {
    const reqMark = field.required ? <span style={{ color: "#dc3545" }}> *</span> : null;
    if (field.type === "file") {
      return (
        <DragDropFileField
          label={field.label}
          required={field.required}
          currentFileUrl={field.value}
          currentFileName={field.value ? field.value.split("/").pop() : ""}
          uploadFn={uploadCompanyAsset}
          onChange={(url) => updateCustomValue(sectionId, field.id, url)}
        />
      );
    }
    // Kit fields, so custom fields float their labels like the built-ins around them.
    if (field.type === "date") {
      return (
        <WtDateField
          label={field.label}
          required={field.required}
          value={field.value ?? ""}
          onChange={(v) => updateCustomValue(sectionId, field.id, v)}
          error={!!customErrors[field.id]}
          helperText={customErrors[field.id]}
          fullWidth
        />
      );
    }
    const isNumber = field.type === "number";
    return (
      <WtField
        label={field.label}
        required={field.required}
        inputMode={isNumber ? "decimal" : undefined}
        value={field.value ?? ""}
        onChange={(v) => {
          const raw = String(v ?? "");
          updateCustomValue(sectionId, field.id, isNumber ? raw.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1") : raw);
        }}
        error={customErrors[field.id]}
      />
    );
  };

  const fetchRatingFactors = async () => {
    try {
      const response = await getRatingByCompanyId(editingCompanyId!);
      if (response?.data?.companyRating) {
        setRatingFactors(response.data.companyRating);
      }
    } catch (error) {
      console.error("Error fetching rating factors:", error);
    }
  };

  useEffect(() => {
    fetchRatingFactors();
  }, [editingCompanyId]);

  // Fetch services
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await getAllCompanyServices();
        const initialServices = response.data?.services || response.services || [];
        setServices(initialServices);
        setServicesLoaded(true);
      } catch (error) {
        console.error('Error fetching services:', error);
        setServicesLoaded(true); // Still mark as loaded even if error
      }
    };
    fetchServices();
  }, []);

  const handleRefreshServices = async () => {
    try {
      const response = await getAllCompanyServices();
      const newServices = response.data?.services || response.services || [];
      setServices(newServices);
    } catch (error) {
      console.error('Error refreshing services:', error);
    }
  };

  const handleRefreshCompanyTypes = async () => {
    try {
      const types = await getAllCompanyTypes();
      setCompanyTypes(types.companyTypes || []);
    } catch (error) {
      console.error('Error refreshing company types:', error);
    }
  };

  const totalWeightedRating = ratingFactors.reduce((total, factor) => {
    return total + (factor.rating || 0) * Number(factor.weight || 0);
  }, 0);

  const totalWeight = ratingFactors.reduce((total, factor) => {
    return total + Number(factor.weight || 0);
  }, 0);

  const weightedAverageRating =
    totalWeight > 0 ? totalWeightedRating / totalWeight : 0;

  // instead of country code in payload, use country name
  const handleSubmit = async (values: FormValues, { setSubmitting }: any) => {
    try {
      // Enforce required admin-defined custom fields before saving.
      if (!validateCustomFields()) {
        setSubmitting(false);
        return;
      }

      let logoUrl = "";
      if (logoFile) {
        try {
          const formData = new FormData();
          formData.append("file", logoFile);
          const res = await uploadCompanyAsset(formData);
          const {
            data: { path },
          } = res;
          logoUrl = path;
        } catch (uploadError) {
          console.error("Error uploading company logo:", uploadError);
          errorConfirmation("Logo upload failed, but company will still be saved.");
        }
      } else if (editingCompanyId && logoPreview) {
        // Keep existing logo if no new file is uploaded
        logoUrl = logoPreview;
      }

      // Pull companyTypes/subTypes out so they aren't spread into the payload as unknown
      // fields — they're merged and sent explicitly as `companyTypeIds` below.
      const { addressLine1, companyTypes, subTypes, ...rest } = values;
      // Storage is unchanged: a company is tagged with its main type(s) AND sub-type(s).
      const companyTypeIdsMerged = Array.from(new Set([...(companyTypes || []), ...(subTypes || [])]));

      // Process references
      const references = values.referenceType
        .filter((ref) => ref.referenceType)
        .map((ref) => {
          const reference: any = {
            referenceType: ref.referenceType,
          };
    
          if (ref.referenceType === "INTERNAL" && ref.internalReferenceEmployeeId) {
            reference.internalReferenceEmployeeId = ref.internalReferenceEmployeeId;
          } else if (ref.referenceType === "EXTERNAL") {
            if (ref.externalReferenceContactId) {
              reference.externalReferenceContactId = ref.externalReferenceContactId;
            }
            if (ref.externalReferenceCompanyId) {
              reference.externalReferenceCompanyId = ref.externalReferenceCompanyId;
            }
            if (ref.externalReferenceCompanyTypeId) {
              reference.externalReferenceCompanyTypeId = ref.externalReferenceCompanyTypeId;
            }
            if (ref.externalReferenceSubCompanyId) {
              reference.externalReferenceSubCompanyId = ref.externalReferenceSubCompanyId;
            }
          }

          return reference;
        });

      const payload = {
        ...rest,
        address: addressLine1,
        logo: logoUrl,
        status: values.status.toUpperCase(),
        // Status is the single source of truth for active/inactive: ACTIVE = active, CLOSED = inactive.
        isActive: values.status.toUpperCase() === "ACTIVE",
        country: countries.find((c) => c.id === values.country)?.name,
        state: states.find((s) => s.id === values.state)?.name,
        city: cities.find((c) => c.id === values.city)?.name,
        gmbProfileUrl: values.gmbProfileUrl,
        googleMapsLink: values.googleMapsLink,
        // Backend expects numbers; the form holds these as strings. Coerce, and drop
        // invalid/empty values (finalCleanPayload strips undefined).
        latitude:
          values.latitude !== "" && Number.isFinite(Number(values.latitude))
            ? Number(values.latitude)
            : undefined,
        longitude:
          values.longitude !== "" && Number.isFinite(Number(values.longitude))
            ? Number(values.longitude)
            : undefined,
        references: references,
        services: values.services,
        // Per-company custom form layout + inline values.
        sectionConfig: formSections,
        customSections: formSections,
      };

      const finalCleanPayload = Object.keys(payload).reduce((acc, key) => {
        const value = payload[key as keyof typeof payload];
        if (value !== "" && value !== null && value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {} as any);

      // Case-insensitive duplicate name check — excludes the company currently being edited
      const newName = values.companyName?.trim().toLowerCase();
      const duplicate = allCompanies.find(
        (c: any) => c.companyName?.trim().toLowerCase() === newName && c.id !== editingCompanyId
      );
      if (duplicate) {
        errorConfirmation("A company with this name already exists.");
        setSubmitting(false);
        return;
      }

      if (editingCompanyId) {
        await updateClientCompany(editingCompanyId, {
          ...finalCleanPayload,
          companyTypeIds: companyTypeIdsMerged,
          overallRating: weightedAverageRating ?? 0.0,
        });
        successConfirmation("Company updated.");
        onClose();
        eventBus.emit("companyCreated");
      } else {
        await createClientCompany({
          ...finalCleanPayload,
          companyTypeIds: companyTypeIdsMerged,
          overallRating: weightedAverageRating ?? 0.0,
        });
        successConfirmation("Company created.");
        onClose();
        eventBus.emit("companyCreated");
      }
    } catch (err: any) {
      console.error(err);
      // Surface the real reason instead of failing silently (which looked like
      // "Save does nothing"). Handles both raw axios errors and unwrapped bodies.
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.detail ||
        err?.data?.message ||
        err?.data?.detail ||
        err?.message ||
        "Failed to save the company. Please review the form and try again.";
      errorConfirmation(message);
    } finally {
      setSubmitting(false);
    }
  };

  const isEditMode = !!editingCompanyId;

  return (
    <>
      <FullscreenWizardModal
        show={show}
        onClose={discard.requestClose}
        closeLabel="Close company form"
      >
        <Formik
          innerRef={formikRef}
          initialValues={initialValues}
          onSubmit={handleSubmit}
          validationSchema={liveSchema}
          enableReinitialize={true}
        >
          {({ setFieldValue, values, isSubmitting }) => {
            // ── Schema-driven rendering ────────────────────────────────────────────
            // Every field — built-in or custom — comes from `formSections`, so the
            // Manage Fields dialog's label / required / hidden / order / section edits
            // all reach the form. Built-ins keep their bespoke widgets; only the
            // label and required flag are the admin's.
            const COLS: Record<string, string> = {
              companyName: "col-12", references: "col-12", gstAddress: "col-12", note: "col-12",
              companyTypes: "col-lg-4", subTypes: "col-lg-4", services: "col-lg-4",
              email: "col-lg-4", website: "col-lg-4", fax: "col-lg-4",
            };
            const colOf = (f: IFormField) =>
              COLS[f.id] ?? (!f.isSystem && f.type === "file" ? "col-12" : "col-lg-6");

            const renderBuiltin = (f: IFormField): React.ReactNode => {
              const label = f.label;
              const req = f.required;
              switch (f.id) {
                case "companyName":
                  return <TextInput formikField="companyName" label={label} isRequired />;
                case "companyTypes":
                  return (
                    // Company Type — MAIN types only (sub-types live in the next field).
                    <MultiSelectWithInlineCreate
                      formikField="companyTypes"
                      inputLabel={label}
                      options={transformToOptions(mainTypes)}
                      placeholder="Select company type(s)..."
                      isRequired={req}
                      onCreate={createNewCompanyType}
                      onRefreshOptions={handleRefreshCompanyTypes}
                      createModalTitle="Create New Company Type"
                      createButtonText="Add New Company Type"
                      createFieldLabel="Company Type Name"
                      createFieldPlaceholder="Enter company type name..."
                    />
                  );
                case "subTypes":
                  return (
                    // Services — children of the selected company type(s).
                    <MultiSelectWithInlineCreate
                      formikField="subTypes"
                      inputLabel={label}
                      placeholder={
                        (values.companyTypes || []).length === 0
                          ? "Select a company type first…"
                          : "Select service(s)..."
                      }
                                options={(() => {
                                  // Show sub-types whose parent is among the selected main types, grouped by parent.
                                  const selectedMains = (values.companyTypes || []) as string[];
                                  return selectedMains
                                    .map((mainId) => {
                                      const parent = (mainTypes as any[]).find((t) => t.id === mainId);
                                      const kids = (subTypesByParent.get(mainId) || []);
                                      if (!kids.length) return null;
                                      return {
                                        label: parent?.name || "Sub-types",
                                        options: sortOptionsAlphabetically(kids.map((k: any) => ({ value: k.id, label: k.name }))),
                                      };
                                    })
                                    .filter(Boolean) as any[];
                                })() as any}
                      isRequired={req}
                      onCreate={createNewServiceUnderType}
                      onRefreshOptions={handleRefreshCompanyTypes}
                      createModalTitle="Create New Service"
                      createButtonText="Add New Service"
                      createFieldLabel="Service Name"
                      createFieldPlaceholder="Enter service name..."
                      // A Service is filed under a Company Type — let the user pick which.
                      parentSelectLabel="Company Type"
                      parentPlaceholder="Select company type..."
                      parentOptions={(values.companyTypes || []).map((id: string) => {
                        const t = (companyTypes as any[]).find((x) => x.id === id);
                        return { value: id, label: t?.name || id };
                      })}
                      defaultParentId={
                        (values.companyTypes || []).length === 1 ? values.companyTypes[0] : undefined
                      }
                      requireParent
                      parentEmptyHint="Select a company type first to add a service under it."
                    />
                  );
                case "services":
                  return (
                    <>
                      <MultiSelectWithInlineCreate
                        formikField="services"
                        inputLabel={label}
                                options={(() => {
                                  // Strict cascade: when a type/sub-type is chosen, show ONLY services
                                  // filed under it. No type chosen → show all. Broken-link (filed under a
                                  // deleted type) and already-selected services are always retained.
                                  const selectedTypes = new Set([...(values.companyTypes || []), ...(values.subTypes || [])]);
                                  const typeIds = new Set((companyTypes || []).map((t: any) => t.id));
                                  const selectedServiceIds = new Set(values.services || []);
                                  const visible = (services || []).filter((s: any) =>
                                    selectedTypes.size === 0 ||
                                    selectedServiceIds.has(s.id) ||
                                    (s.companyTypeId && selectedTypes.has(s.companyTypeId)) ||
                                    (s.companyTypeId && !typeIds.has(s.companyTypeId))
                                  );
                                  return transformToOptions(visible);
                                })()}
                        placeholder="Select sub-services..."
                        isRequired={req}
                        onCreate={createNewCompanyService}
                        onRefreshOptions={handleRefreshServices}
                        createModalTitle="Create New Sub-service"
                        createButtonText="Add New Sub-service"
                        createFieldLabel="Sub-service Name"
                        createFieldPlaceholder="Enter sub-service name..."
                        // A Sub-service is filed under a Service — let the user pick which.
                        parentSelectLabel="Service"
                        parentPlaceholder="Select service..."
                        parentOptions={(values.subTypes || []).map((id: string) => {
                          const t = (companyTypes as any[]).find((x) => x.id === id);
                          return { value: id, label: t?.name || id };
                        })}
                        defaultParentId={
                          (values.subTypes || []).length === 1 ? values.subTypes[0] : undefined
                        }
                        requireParent
                        parentEmptyHint="Select a service first to add a sub-service under it."
                      />
                      {((values.companyTypes || []).length > 0 || (values.subTypes || []).length > 0) && (
                        <small className="text-muted d-block mt-1">
                          Showing sub-services filed under the selected service(s). Manage these in <b>Configure → Company Type &amp; Services</b>.
                        </small>
                      )}
                    </>
                  );
                case "references":
                  return (
                    <div className="row g-3">
                      <FieldArray name="referenceType">
                              {({ push, remove }) => (
                                <>
                                  {values.referenceType.map(
                                    (reference, index) => (
                                      <div key={index} className="row g-3 mb-3" style={{ position: "relative" }}>
                                        {/* Remove button for items after the first one - positioned at top right */}
                                        {index > 0 && (
                                          <div
                                            onClick={() => remove(index)}
                                            style={{
                                              position: "absolute",
                                              top: "-8px",
                                              right: "8px",
                                              cursor: "pointer",
                                              color: "#1E3A8A",
                                              fontSize: "20px",
                                              fontWeight: "bold",
                                              width: "24px",
                                              height: "24px",
                                              display: "flex",
                                              alignItems: "center",
                                              justifyContent: "center",
                                              backgroundColor: "transparent",
                                              // transition: "all 0.2s ease",
                                              zIndex: 10
                                            }}
                                          >
                                            ×
                                          </div>
                                        )}

                                        <div className="col-lg-6">
                                          <DropDownInput
                                            formikField={`referenceType.${index}.referenceType`}
                                            inputLabel="Referral Type"
                                            isRequired={false}
                                            options={[
                                              {
                                                label: "External",
                                                value: "EXTERNAL",
                                              },
                                              {
                                                label: "Internal",
                                                value: "INTERNAL",
                                              },
                                            ]}
                                          />
                                        </div>

                                        {reference.referenceType ===
                                          "INTERNAL" && (
                                          <div className="col-lg-6">
                                            <DropDownInput
                                              formikField={`referenceType.${index}.internalReferenceEmployeeId`}
                                              inputLabel="Referral Contact"
                                              isRequired={false}
                                              options={employeeOptions}
                                            />
                                          </div>
                                        )}

                                        {reference.referenceType ===
                                          "EXTERNAL" && (
                                          <>
                                            <div className="col-lg-6">
                                              <DropDownInput
                                                formikField={`referenceType.${index}.externalReferenceCompanyTypeId`}
                                                inputLabel="Referral Company Type"
                                                isRequired={false}
                                                options={companyTypeOptions}
                                                onChange={(option: any) => {
                                                  setFieldValue(`referenceType.${index}.externalReferenceCompanyTypeId`, option?.value || "");
                                                  // Clear company (and its dependents) when company type changes
                                                  setFieldValue(`referenceType.${index}.externalReferenceCompanyId`, "");
                                                  setFieldValue(`referenceType.${index}.externalReferenceSubCompanyId`, "");
                                                  setFieldValue(`referenceType.${index}.externalReferenceContactId`, "");
                                                }}
                                              />
                                            </div>

                                            <div className="col-lg-6">
                                              <DropDownInput
                                                formikField={`referenceType.${index}.externalReferenceCompanyId`}
                                                inputLabel="Referral Company"
                                                isRequired={false}
                                                options={
                                                  reference.externalReferenceCompanyTypeId
                                                    ? (companiesByTypeId.get(reference.externalReferenceCompanyTypeId) || [])
                                                    : companyOptions
                                                }
                                                placeholder={
                                                  !reference.externalReferenceCompanyTypeId
                                                    ? "Please select company type first"
                                                    : "Select Company"
                                                }
                                                onChange={(option: any) => {
                                                  setFieldValue(`referenceType.${index}.externalReferenceCompanyId`, option?.value || "");
                                                  // Clear sub company AND contact — the contact list is scoped to this
                                                  // company, so a previously picked contact from a different company
                                                  // is no longer valid.
                                                  setFieldValue(`referenceType.${index}.externalReferenceSubCompanyId`, "");
                                                  setFieldValue(`referenceType.${index}.externalReferenceContactId`, "");
                                                }}
                                                value={
                                                  reference.externalReferenceCompanyId
                                                    ? {
                                                        label: companyById.get(reference.externalReferenceCompanyId)?.companyName,
                                                        value: reference.externalReferenceCompanyId,
                                                        avatar: companyById.get(reference.externalReferenceCompanyId)?.logo,
                                                      }
                                                    : null
                                                }
                                                showAvatar={true}
                                              />
                                            </div>

                                            <div className="col-lg-6">
                                              <DropDownInput
                                                formikField={`referenceType.${index}.externalReferenceSubCompanyId`}
                                                inputLabel="Referral Sub Company"
                                                isRequired={false}
                                                options={
                                                  reference.externalReferenceCompanyId
                                                    ? (subCompaniesByCompanyId.get(reference.externalReferenceCompanyId) || [])
                                                    : subCompanyOptionsAll
                                                }
                                                placeholder={
                                                  !reference.externalReferenceCompanyId
                                                    ? "Please select company first"
                                                    : "Select Sub Company"
                                                }
                                                onChange={(option: any) => {
                                                  setFieldValue(`referenceType.${index}.externalReferenceSubCompanyId`, option?.value || "");
                                                }}
                                                value={
                                                  reference.externalReferenceSubCompanyId
                                                    ? (subCompaniesByCompanyId
                                                        .get(reference.externalReferenceCompanyId || "")
                                                        ?.find((o) => o.value === reference.externalReferenceSubCompanyId) || null)
                                                    : null
                                                }
                                              />
                                            </div>

                                            <div className="col-lg-6">
                                              <DropDownInput
                                                formikField={`referenceType.${index}.externalReferenceContactId`}
                                                inputLabel="Referral Contact"
                                                isRequired={false}
                                                options={(() => {
                                                  if (!reference.externalReferenceCompanyId) return contactOptions;
                                                  const scoped = contactsByCompanyId.get(reference.externalReferenceCompanyId) || [];
                                                  // Safety net (same pattern as the lead File Location fix): if a
                                                  // previously-saved contact doesn't fall inside the scoped list
                                                  // (legacy data, contact later reassigned, etc.), still surface it
                                                  // so editing an existing reference never shows an empty dropdown.
                                                  const savedId = reference.externalReferenceContactId;
                                                  if (savedId && !scoped.some((o) => o.value === savedId)) {
                                                    const saved = contactById.get(savedId);
                                                    if (saved) {
                                                      return [{ label: saved.fullName, value: saved.id, avatar: saved.profilePhoto }, ...scoped];
                                                    }
                                                  }
                                                  return scoped;
                                                })()}
                                                placeholder={
                                                  !reference.externalReferenceCompanyId
                                                    ? "Please select company first"
                                                    : "Select Contact"
                                                }
                                                showAvatar={true}
                                              />
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    )
                                  )}

                                  {/* Add More button - placed outside the map */}
                                  <div className="col-12">
                                    <div
                                      onClick={() =>
                                        push({
                                          referenceType: "",
                                          internalReferenceEmployeeId: "",
                                          externalReferenceCompanyTypeId: "",
                                          externalReferenceCompanyId: "",
                                          externalReferenceContactId: "",
                                          externalReferenceSubCompanyId: "",
                                        })
                                      }
                                      style={{
                                        cursor: "pointer",
                                        color: "#1E3A8A",
                                        border: "1px dotted #1E3A8A",
                                        borderRadius: "5px",
                                        padding: "8px 10px",
                                        marginTop: "15px",
                                        textAlign: "center",
                                        display: "flex",
                                        justifyContent: "center",
                                        alignItems: "center",
                                      }}
                                    >
                                      + Add More Reference
                                    </div>
                                  </div>
                                </>
                              )}
                            </FieldArray>
                    </div>
                  );
                case "phone":
                case "phone2":
                  return <PhoneNumberInput formikField={f.id} label={label} placeholder={`Enter ${label.toLowerCase()}`} isRequired={req} />;
                case "email":
                  return <TextInput formikField="email" label={label} placeholder="name@company.com" isRequired={req} />;
                case "website":
                  return <TextInput formikField="website" label={label} placeholder="https://" isRequired={req} />;
                case "gstDocument":
                case "panDocument": {
                  const url = values[f.id as "gstDocument" | "panDocument"];
                  return (
                    <DragDropFileField
                      label={label}
                      required={req}
                      compact
                      labelClassName="fs-6 form-label mb-2"
                      currentFileUrl={url}
                      currentFileName={url ? url.split("/").pop() : ""}
                      uploadFn={uploadCompanyAsset}
                      onChange={(next) => setFieldValue(f.id, next)}
                    />
                  );
                }
                case "status":
                  return (
                    <DropDownInput
                      inputLabel={label}
                      placeholder="Select status"
                      isRequired={req}
                      formikField="status"
                      options={COMPANY_STATUS_OPTIONS}
                      showColor
                      disableAlphabeticalSort
                      onChange={(value) => {
                        const next =
                          value && typeof value === "object" && "value" in value
                            ? value.value
                            : value;
                        setFieldValue("status", next || "ACTIVE");
                      }}
                      value={
                        COMPANY_STATUS_OPTIONS.find((o) => o.value === values.status) ||
                        COMPANY_STATUS_OPTIONS[0]
                      }
                    />
                  );
                case "blacklisted":
                  // A toggle always has a value, so its label sits in the border like the
                  // filled Status dropdown beside it. A blacklisted company is highlighted in the list.
                  return (
                    <FloatingLabelFrame label={label} filled>
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5, minHeight: 42, px: 1.5, border: 1, borderColor: "divider", borderRadius: "8px", bgcolor: "background.paper" }}>
                        <Box component="span" sx={{ fontSize: 13.5, fontWeight: 600, color: values.blacklisted ? "error.main" : "text.secondary" }}>
                          {values.blacklisted ? "Yes — blacklisted" : "No"}
                        </Box>
                        <WtSwitch
                          size="sm"
                          tone="#DC2626"
                          aria-label={label}
                          checked={!!values.blacklisted}
                          onChange={(_, checked) => setFieldValue("blacklisted", checked)}
                        />
                      </Box>
                    </FloatingLabelFrame>
                  );
                case "note":
                  return (
                    <WtFieldFormik name="note" label={label} required={req} multiline minRows={3} placeholder="Enter note" />
                  );
                default:
                  // gstNumber, panNumber, gstAddress, fax — plain text built-ins.
                  return <TextInput formikField={f.id} label={label} isRequired={req} />;
              }
            };

            const renderSection = (section?: IFormSection) => {
              if (!section) return null;
              if (section.id === "address") {
                return (
                  <ContactAddressSection
                    key={section.id}
                    title={section.title}
                    schema={section.fields}
                    countries={countries}
                    states={states}
                    cities={cities}
                    selectedCountry={values.country}
                    selectedState={values.state}
                    // Company keeps country/state in Formik only; the section already writes them there.
                    setSelectedCountry={() => {}}
                    setSelectedState={() => {}}
                    handleCountryChange={handleCountryChange}
                    handleStateChange={handleStateChange}
                    fields={{ address: "addressLine1", googleMapLink: "googleMapsLink", gmbLink: "gmbProfileUrl" }}
                  />
                );
              }
              const visible = section.fields.filter((f) => !f.hidden);
              if (!visible.length) return null;
              return (
                <CrmSection key={section.id} title={section.title || "Custom Fields"}>
                  <div className="row g-3">
                    {visible.map((f) => (
                      <div key={f.id} className={colOf(f)}>
                        {f.isSystem ? renderBuiltin(f) : renderCustomField(f, section.id)}
                      </div>
                    ))}
                  </div>
                </CrmSection>
              );
            };

            // One wizard step per schema section, in the dialog's order and under its title,
            // so the sidebar always mirrors Manage Fields. Built-ins keep a hint and icon;
            // a section with nothing visible drops out (the address picker always stays).
            const STEP_LOOK: Record<string, { subtitle: string; icon: string }> = {
              project_details: { subtitle: "Logo, name, types and services", icon: "bi-building" },
              references: { subtitle: "Related contacts and companies", icon: "bi-people" },
              contact_details: { subtitle: "Phone, email and website", icon: "bi-telephone" },
              address: { subtitle: "Search address, drop a pin, and fine-tune location details", icon: "bi-geo-alt" },
              gst: { subtitle: "GST, PAN and their documents", icon: "bi-file-earmark-text" },
              others: { subtitle: "Status, blacklist and notes", icon: "bi-journal-text" },
            };
            const stepPlan = formSections
              .filter((sec) => sec.id === "address" || sec.id === "project_details" || sec.fields.some((f) => !f.hidden))
              .map((sec) => ({
                id: sec.id,
                label: sec.title || "Custom Fields",
                title: sec.title || "Custom Fields",
                ...(STEP_LOOK[sec.id] ?? { subtitle: "Custom fields", icon: "bi-ui-checks" }),
                sections: [sec],
              }));
            // Formik names behind each step, so validation errors light up the right step.
            const formikName = (f: IFormField) => (f.id === "references" ? "referenceType" : f.id);
            const steps = stepPlan.map(({ sections, ...step }) => {
              const fields = sections.flatMap((sec) => (sec?.fields || []).filter((f) => f.isSystem && !f.hidden));
              return {
                ...step,
                fields: fields.map(formikName),
                requiredFields: fields.filter((f) => f.required).map(formikName),
                content: (
                  <>
                    {step.id === "project_details" && (
                      <CrmSection title="Company Logo">
                        <div className="crm-avatar-wrap">
                          <label
                            htmlFor="logo"
                            className={`crm-avatar-circle${logoPreview ? " has-image" : ""}`}
                            title="Upload company logo"
                          >
                            {logoPreview ? (
                              <img src={logoPreview} alt="Logo preview" />
                            ) : (
                              <span className="crm-avatar-placeholder">
                                <AppIcon name="bi-building" />
                                <span>Add logo</span>
                              </span>
                            )}
                          </label>
                          <div className="crm-avatar-actions">
                            <button
                              type="button"
                              className="wt-btn wt-btn-outline-primary"
                              style={{ fontSize: 13, fontWeight: 600 }}
                              onClick={() => document.getElementById("logo")?.click()}
                            >
                              {logoPreview ? "Change logo" : "Upload logo"}
                            </button>
                            <span className="crm-avatar-hint">
                              {logoFile?.name || "PNG or JPG · shown on company lists"}
                            </span>
                          </div>
                          <input
                            type="file"
                            id="logo"
                            accept="image/*"
                            onChange={handleLogoChange}
                            style={{ display: "none" }}
                          />
                        </div>
                      </CrmSection>
                    )}
                    {sections.map(renderSection)}
                  </>
                ),
              };
            });

            return (
              <FormikForm style={{ height: "100%" }}>
                {/* Every field in the wizard: label rests in the empty box, floats up on focus/value. */}
                <FloatingLabels>
                <CompanyWorkspace
                  isEdit={isEditMode}
                  onCancel={discard.requestClose}
                  isSubmitting={isSubmitting || isDataLoading}
                  headerMeta={
                    prefix ? (
                      <span className="wizard-meta-chip">
                        <AppIcon name="bi-hash" /> {prefix}
                      </span>
                    ) : undefined
                  }
                  headerActions={
                    <WtButton inverted size="small" onClick={() => setShowSchemaManager(true)} startIcon={<AppIcon name="bi-gear" className="fs-6" />}>
                      Manage fields
                    </WtButton>
                  }
                
                  sections={
                    isDataLoading
                      ? [
                          {
                            id: "loading",
                            label: "Loading",
                            title: "Loading",
                            fields: [],
                            icon: "bi-hourglass-split",
                            content: (<div className="text-center p-4">
                      <div className="spinner-border" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    </div>),
                          },
                        ]
                      : [
                          ...steps,
                        ]
                  }
                />
                </FloatingLabels>
              </FormikForm>
            );
          }}
        </Formik>
      </FullscreenWizardModal>
      {discard.dialog}

      <CompanyConfigForm
        show={showCompanyTypeModal}
        onClose={() => setShowCompanyTypeModal(false)}
        title="Company Type"
        type="company-type"
      />
      <SubCompanyForm
        show={showSubCompanyForm}
        onClose={() => setShowSubCompanyForm(false)}
      />
      <FormSchemaManager
        show={showSchemaManager}
        sections={formSections}
        infoPageLabel="Company"
        onSave={(sections) => {
          setFormSections(sections);
          setShowSchemaManager(false);
        }}
        onClose={() => setShowSchemaManager(false)}
      />
    </>
  );
};

export default NewCompanyForm;
