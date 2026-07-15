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

import { Modal, Button } from "react-bootstrap";
import { Formik, Form as FormikForm, Field, FieldArray } from "formik";
import * as Yup from "yup";
import PhoneNumberInput from "@app/components/PhoneNumberInput";
import TextInput from "@app/modules/common/inputs/TextInput";
import DropDownInput from "@app/modules/common/inputs/DropdownInput";
import { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import { errorConfirmation, successConfirmation } from "@utils/modal";
import eventBus from "@utils/EventBus";
import { Close } from "@mui/icons-material";
import { Box, IconButton, Typography } from "@mui/material";
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

const NewCompanyForm: React.FC<Props> = ({
  show,
  onClose,
  editingCompanyId,
}) => {
  const [companyTypes, setCompanyTypes] = useState<CompanyType[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);

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

  const viewLocation = (latitude: string, longitude: string) => {
    if (latitude && longitude) {
      const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
      window.open(googleMapsUrl, '_blank');
    } else {
      errorConfirmation('Please enter latitude and longitude first');
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
    if (field.type === "date") {
      return (
        <>
          <label className="form-label">{field.label}{reqMark}</label>
          <input
            type="date"
            className="form-control"
            value={field.value ?? ""}
            onChange={(e) => updateCustomValue(sectionId, field.id, e.target.value)}
          />
          {customErrors[field.id] && <div className="text-danger small mt-1">{customErrors[field.id]}</div>}
        </>
      );
    }
    const isNumber = field.type === "number";
    return (
      <>
        <label className="form-label">{field.label}{reqMark}</label>
        <input
          type="text"
          inputMode={isNumber ? "decimal" : undefined}
          className="form-control"
          placeholder={field.label}
          value={field.value ?? ""}
          onChange={(e) => {
            const next = isNumber
              ? e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1")
              : e.target.value;
            updateCustomValue(sectionId, field.id, next);
          }}
        />
        {customErrors[field.id] && <div className="text-danger small mt-1">{customErrors[field.id]}</div>}
      </>
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
        successConfirmation("Company updated successfully");
        onClose();
        eventBus.emit("companyCreated");
      } else {
        await createClientCompany({
          ...finalCleanPayload,
          companyTypeIds: companyTypeIdsMerged,
          overallRating: weightedAverageRating ?? 0.0,
        });
        successConfirmation("Company created successfully");
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
      <Modal
        show={show}
        onHide={onClose}
        size="xl"
        centered
        aria-labelledby="responsive-modal"
        dialogClassName="responsive-modal"
      >
        <Box
          sx={{
            position: "relative",
            backgroundColor: "#F3F4F7",
            p: { xs: 0, md: 3 },
          }}
        >
          <Typography
            variant="h6"
            component="h2"
            sx={{ fontWeight: 600, pl: { xs: 2, md: 0 }, pt: { xs: 1, md: 0 } }}
            style={{
              fontSize: "20px",
              fontFamily: "Barlow",
              fontWeight: "600",
            }}
          >
            {isEditMode ? "Edit Company" : "Add New Company"}
            {/* <button
              className="btn btn-primary ms-9"
              onClick={() => {
                setShowSubCompanyForm(true);
                onClose();
              }}
            >
              Add Sub Company
            </button> */}
            <p style={{ marginBottom: "10px", fontSize: "15px" }}>
              {prefix && `Company Id: ${prefix}`}
            </p>
          </Typography>
          <IconButton
            onClick={onClose}
            sx={{
              position: "absolute",
              right: 8,
              top: 8,
              color: "text.secondary",
            }}
          >
            <Close />
          </IconButton>
          <Formik
            initialValues={initialValues}
            onSubmit={handleSubmit}
            validationSchema={validationSchema}
            enableReinitialize={true}
          >
            {({ setFieldValue, values, isSubmitting }) => {
              return (
              <FormikForm>
                {/* <Modal.Header>

              </Modal.Header> */}
                <Modal.Body style={{ maxHeight: "80vh", overflowY: "auto" }}>
                  {isDataLoading ? (
                    <div className="text-center p-4">
                      <div className="spinner-border" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Manage custom sections & fields (per-company schema) */}
                      <div className="d-flex justify-content-end mb-2">
                        <button
                          type="button"
                          onClick={() => setShowSchemaManager(true)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "8px",
                            background: "#fff",
                            border: "1.5px solid #1E3A8A",
                            borderRadius: "8px",
                            padding: "6px 16px",
                            color: "#1E3A8A",
                            fontWeight: 700,
                            fontSize: "13px",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <i className="bi bi-gear-fill" style={{ fontSize: "15px", lineHeight: 1 }} />
                          Manage Sections &amp; Fields
                        </button>
                      </div>

                      {/* Logo */}
                      <div className="mb-4">
                        <label
                          className="form-label fw-semibold"
                          style={{
                            fontSize: "17px",
                            fontFamily: "Inter",
                            color: "#1E3A8A",
                            padding: "2px 2px 8px 2px",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            fontWeight: "600",
                          }}
                        >
                          <div
                            className="ms-5"
                            style={{
                              borderTop: "1px solid #1E3A8A",
                              width: "30px",
                              height: "0px",
                            }}
                          ></div>
                          Logo
                          <div
                            style={{
                              borderTop: "1px solid #1E3A8A",
                              width: "100%",
                              height: "0px",
                            }}
                          ></div>
                        </label>
                        <div className="d-flex align-items-center ms-6" style={{ gap: 16 }}>
                          {/* Circular logo preview — matches how the logo appears in SmartAvatar */}
                          <label htmlFor="logo" style={{ cursor: "pointer", flexShrink: 0 }}>
                            <div
                              style={{
                                width: 80,
                                height: 80,
                                borderRadius: "50%",
                                border: logoPreview ? "2.5px solid #1E3A8A" : "2px dashed #ccc",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                overflow: "hidden",
                                background: "#f8f9fa",
                                boxShadow: logoPreview ? "0 2px 10px rgba(30, 58, 138,0.15)" : "none",
                                transition: "border-color .2s, box-shadow .2s",
                              }}
                            >
                              {logoPreview ? (
                                <img
                                  src={logoPreview}
                                  alt="Logo"
                                  style={{ width: "82%", height: "82%", objectFit: "contain" }}
                                />
                              ) : (
                                <span style={{ fontSize: 11, color: "#aab2bd", textAlign: "center", lineHeight: 1.4, padding: "0 6px" }}>
                                  Choose<br />Logo
                                </span>
                              )}
                            </div>
                          </label>
                          <div>
                            <input
                              type="file"
                              id="logo"
                              accept="image/*"
                              onChange={handleLogoChange}
                              style={{ display: "none" }}
                            />
                            <div className="text-muted small">{logoFile?.name || "No file chosen"}</div>
                            <div style={{ fontSize: 11, color: "#aab2bd", marginTop: 3 }}>Click the circle to change</div>
                          </div>
                        </div>
                      </div>

                      {/* Basic */}
                      <fieldset
                        style={{
                          borderTop: "1px solid #1E3A8A",
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
                            color: "#1E3A8A",
                            padding: "2px 2px 8px",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <div
                            className="ms-5"
                            style={{
                              borderTop: "1px solid #1E3A8A",
                              width: "30px",
                              height: "0px",
                            }}
                          ></div>
                          PROJECT DETAILS
                        </legend>
                        <div className="card-body card responsive-card p-md-10 p-3 ">
                          <div className="row g-3">
                            <div className="col-md-12">
                              <TextInput
                                formikField="companyName"
                                label="Company Name"
                                isRequired={true}
                              />
                            </div>
                            <div className="col-lg-4">
                              {/* Company Type — MAIN types only (sub-types live in the next field). */}
                              <MultiSelectWithInlineCreate
                                formikField="companyTypes"
                                inputLabel="Company type"
                                options={transformToOptions(mainTypes)}
                                placeholder="Select company type(s)..."
                                isRequired={false}
                                onCreate={createNewCompanyType}
                                onRefreshOptions={handleRefreshCompanyTypes}
                                createModalTitle="Create New Company Type"
                                createButtonText="Add New Company Type"
                                createFieldLabel="Company Type Name"
                                createFieldPlaceholder="Enter company type name..."
                              />
                            </div>
                            <div className="col-lg-4">
                              {/* Services — children of the selected company type(s). */}
                              <MultiSelectWithInlineCreate
                                formikField="subTypes"
                                inputLabel="Services"
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
                                isRequired={false}
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
                            </div>
                            <div className="col-lg-4">
                              <MultiSelectWithInlineCreate
                                formikField="services"
                                inputLabel="Sub-services"
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
                                isRequired={false}
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
                            </div>
                          </div>
                        </div>
                      </fieldset>

                      {/* References */}
                      <fieldset
                        style={{
                          borderTop: "1px solid #1E3A8A",
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
                            color: "#1E3A8A",
                            padding: "2px 2px 8px",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <div
                            className="ms-5"
                            style={{
                              borderTop: "1px solid #1E3A8A",
                              width: "30px",
                              height: "0px",
                            }}
                          ></div>
                          REFERENCES
                        </legend>
                        <div className="card-body card responsive-card p-md-10 p-3 ">
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
                        </div>
                      </fieldset>

                      {/* Contact */}
                      <fieldset
                        style={{
                          borderTop: "1px solid #1E3A8A",
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
                            color: "#1E3A8A",
                            padding: "2px 2px 8px",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <div
                            className="ms-5"
                            style={{
                              borderTop: "1px solid #1E3A8A",
                              width: "30px",
                              height: "0px",
                            }}
                          ></div>
                          CONTACT DETAILS
                        </legend>
                        <div className="card-body card responsive-card p-md-10 p-3 ">
                          <div className="row g-3">
                            <div className="col-lg-4">
                              <PhoneNumberInput
                                formikField="phone"
                                label="Phone"
                                isRequired={false}
                                placeholder="Enter phone"
                              />
                            </div>
                            <div className="col-lg-4">
                              <PhoneNumberInput
                                formikField="phone2"
                                label="Phone 2"
                                isRequired={false}
                                placeholder="Enter phone 2"
                              />
                            </div>
                            <div className="col-lg-4">
                              <TextInput
                                formikField="fax"
                                label="FAX"
                                isRequired={false}
                              />
                            </div>
                            <div className="col-lg-6">
                              <TextInput
                                formikField="email"
                                label="Email"
                                isRequired={false}
                              />
                            </div>
                            <div className="col-lg-6">
                              <TextInput
                                formikField="website"
                                label="Website"
                                isRequired={false}
                              />
                            </div>
                          </div>
                        </div>
                      </fieldset>

                      {/* Address */}
                      <fieldset
                        style={{
                          borderTop: "1px solid #1E3A8A",
                          padding: "clamp(14px, 2vw, 14px)",
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
                            color: "#1E3A8A",
                            padding: "2px 2px 8px",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <div
                            className="ms-5"
                            style={{
                              borderTop: "1px solid #1E3A8A",
                              width: "30px",
                              height: "0px",
                            }}
                          ></div>
                          ADDRESS
                        </legend>
                        <div className="card-body card responsive-card p-md-10 p-3 ">
                          <div className="row g-3">
                            <div className="col-lg-6">
                              <TextInput
                                formikField="addressLine1"
                                label="Address"
                                isRequired={false}
                              />
                            </div>
                            <div className="col-lg-6">
                              <DropDownInput
                                formikField="country"
                                inputLabel="Country"
                                isRequired={false}
                                options={countries.map((c) => ({
                                  label: c.name,
                                  value: c.id,
                                }))}
                                onChange={(option: any) => {
                                  setFieldValue("country", option?.value || "");
                                  setFieldValue("state", "");
                                  setFieldValue("city", "");
                                  if (option?.value) {
                                    handleCountryChange(option.value);
                                  } else {
                                    setStates([]);
                                    setCities([]);
                                  }
                                }}
                                value={
                                  values.country
                                    ? {
                                        label: countries.find(
                                          (c) => c.id === values.country
                                        )?.name,
                                        value: values.country,
                                      }
                                    : null
                                }
                              />
                            </div>
                            <div className="col-lg-6">
                              <DropDownInput
                                formikField="state"
                                inputLabel="State"
                                isRequired={false}
                                options={values.country ? states.map((s) => ({
                                  label: s.name,
                                  value: s.id,
                                })) : []}
                                placeholder={!values.country ? "Please select country first" : "Select State"}
                                onChange={(option: any) => {
                                  setFieldValue("state", option?.value || "");
                                  setFieldValue("city", "");
                                  if (option?.value) {
                                    handleStateChange(
                                      values.country,
                                      option.value
                                    );
                                  } else {
                                    setCities([]);
                                  }
                                }}
                                value={
                                  values.state
                                    ? {
                                        label: states.find(
                                          (s) => s.id === values.state
                                        )?.name,
                                        value: values.state,
                                      }
                                    : null
                                }
                                disabled={!values.country}
                              />
                            </div>
                            <div className="col-lg-6">
                              <DropDownInput
                                formikField="city"
                                inputLabel="City"
                                isRequired={false}
                                options={values.state ? cities.map((ci) => ({
                                  label: ci.name,
                                  value: ci.id,
                                })) : []}
                                placeholder={!values.state ? "Please select state first" : "Select City"}
                                onChange={(option: any) => {
                                  setFieldValue("city", option?.value || "");
                                }}
                                value={
                                  values.city
                                    ? {
                                        label: cities.find(
                                          (c) => c.id === values.city
                                        )?.name,
                                        value: values.city,
                                      }
                                    : null
                                }
                                disabled={!values.state}
                              />
                            </div>
                            <div className="col-lg-6">
                              <TextInput
                                formikField="area"
                                label="Locality"
                                isRequired={false}
                              />
                            </div>
                            <div className="col-lg-6">
                              <TextInput
                                formikField="zipCode"
                                label="Zip Code"
                                isRequired={false}
                              />
                            </div>                                     <div className="mt-5 p-3" style={{ borderRadius: '8px', backgroundColor: '#9fd491' }}>
                                <div className="mb-4" style={{ fontFamily: 'Inter', fontSize: '14px', fontWeight: '500', color: '#0D47A1' }}>LOCATION ON MAP</div>
                                <div className="row g-3">
                                  <div className="col-lg-3">
                                    <TextInput
                                      formikField="googleMapsLink"
                                      label="Google Map Link"
                                      isRequired={false}
                                    />
                                  </div>
                                  <div className="col-lg-3">
                                    <TextInput
                                      formikField="gmbProfileUrl"
                                      label="Google Business Link"
                                      isRequired={false}
                                    />
                                  </div>
                                  <div className="col-lg-3">
                                    <TextInput
                                      formikField="latitude"
                                      label="Latitude"
                                      isRequired={false}
                                      inputValidation="signed-decimal"
                                    />
                                  </div>
                                  <div className="col-lg-3">
                                    <TextInput
                                      formikField="longitude"
                                      label="Longitude"
                                      isRequired={false}
                                      inputValidation="signed-decimal"
                                    />
                                  </div>
                                </div>
                                <div 
                                  className="d-flex justify-content-end mt-4" 
                                  onClick={() => viewLocation(
                                    values.latitude || '', 
                                    values.longitude || ''
                                  )}
                                  style={{
                                    cursor: 'pointer',
                                    color: '#0D47A1',
                                    fontWeight: '600',
                                    fontSize: '13px'
                                  }}
                                >
                                  View Location On Map
                                </div>
                              </div>


                        </div>
                        </div>
                      </fieldset>

                      {/* GST & Statutory */}
                      <fieldset
                        style={{
                          borderTop: "1px solid #1E3A8A",
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
                            color: "#1E3A8A",
                            padding: "2px 2px 8px",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <div
                            className="ms-5"
                            style={{
                              borderTop: "1px solid #1E3A8A",
                              width: "30px",
                              height: "0px",
                            }}
                          ></div>
                          GST &amp; STATUTORY DETAILS
                        </legend>
                        <div className="card-body card responsive-card p-md-10 p-3 ">
                          <div className="row g-3">
                            {/* GST: number + its own compact attachment */}
                            <div className="col-lg-6">
                              <TextInput
                                formikField="gstNumber"
                                label="GST Number"
                                isRequired={false}
                              />
                            </div>
                            <div className="col-lg-6">
                              <DragDropFileField
                                label="GST Document"
                                compact
                                labelClassName="fs-6 form-label mb-2"
                                currentFileUrl={values.gstDocument}
                                currentFileName={
                                  values.gstDocument ? values.gstDocument.split("/").pop() : ""
                                }
                                uploadFn={uploadCompanyAsset}
                                onChange={(url) => setFieldValue("gstDocument", url)}
                              />
                            </div>
                            {/* PAN: number + its own compact attachment */}
                            <div className="col-lg-6">
                              <TextInput
                                formikField="panNumber"
                                label="PAN Number"
                                isRequired={false}
                              />
                            </div>
                            <div className="col-lg-6">
                              <DragDropFileField
                                label="PAN Document"
                                compact
                                labelClassName="fs-6 form-label mb-2"
                                currentFileUrl={values.panDocument}
                                currentFileName={
                                  values.panDocument ? values.panDocument.split("/").pop() : ""
                                }
                                uploadFn={uploadCompanyAsset}
                                onChange={(url) => setFieldValue("panDocument", url)}
                              />
                            </div>
                            <div className="col-md-12">
                              <TextInput
                                formikField="gstAddress"
                                label="GST Address"
                                isRequired={false}
                              />
                            </div>
                          </div>
                        </div>
                      </fieldset>

                      {/* Admin-defined custom fields (per-company schema). Built-in fields are
                          rendered by the form above; only custom fields appear here, grouped
                          under their section title. */}
                      {formSections.map((section) => {
                        const visibleFields = section.fields.filter((f) => !f.isSystem && !f.hidden);
                        if (visibleFields.length === 0) return null;
                        return (
                          <fieldset
                            key={section.id}
                            style={{
                              borderTop: "1px solid #1E3A8A",
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
                                color: "#1E3A8A",
                                padding: "2px 2px 8px",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                              }}
                            >
                              <div
                                className="ms-5"
                                style={{
                                  borderTop: "1px solid #1E3A8A",
                                  width: "30px",
                                  height: "0px",
                                }}
                              ></div>
                              {section.title || "CUSTOM SECTION"}
                            </legend>
                            <div className="card-body card responsive-card p-md-10 p-3 ">
                              <div className="row g-3">
                                {visibleFields.map((field) => (
                                  <div
                                    key={field.id}
                                    className={field.type === "file" ? "col-md-12" : "col-lg-6"}
                                  >
                                    {renderCustomField(field, section.id)}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </fieldset>
                        );
                      })}

                      {/* Other */}
                      <fieldset
                        style={{
                          borderTop: "1px solid #1E3A8A",
                          padding: "clamp(14px, 2vw, 14px)",
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
                            color: "#1E3A8A",
                            padding: "2px 2px 8px",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <div
                            className="ms-5"
                            style={{
                              borderTop: "1px solid #1E3A8A",
                              width: "30px",
                              height: "0px",
                            }}
                          ></div>
                          <span>OTHERS</span>
                          {/* <div style={{borderTop: "1px solid #1E3A8A", width: "100px", height: "0px",}}></div> */}
                        </legend>
                        <div className="card-body card responsive-card p-md-10 p-3 ">
                          <div className="mb-3">
                            {/* Status drives the company's active/inactive state: ACTIVE = active,
                                CLOSED = inactive. Styled like the contact form's status dropdown
                                (colour dots) since both convey the same active/inactive meaning. */}
                            <DropDownInput
                              inputLabel="Status"
                              placeholder="Select status"
                              isRequired={false}
                              formikField="status"
                              showColor={true}
                              options={[
                                { value: "ACTIVE", label: "Active", color: "#50cd89" },
                                { value: "CLOSED", label: "Inactive", color: "#f1416c" },
                              ]}
                            />
                          </div>
                          {/* Blacklist toggle — a blacklisted company is highlighted in the list. */}
                          <div className="mb-3 d-flex align-items-center gap-3">
                            <label className="form-label mb-0" htmlFor="blacklistedToggle">
                              Is Blacklisted
                            </label>
                            <div className="form-check form-switch m-0">
                              <Field
                                type="checkbox"
                                name="blacklisted"
                                id="blacklistedToggle"
                                className="form-check-input"
                                role="switch"
                              />
                            </div>
                          </div>
                          {/* <div className="mb-3">
                            <label className="form-label">Visibility</label>
                            <div className="d-flex flex-wrap gap-4">
                              {[
                                "ONLY_ME",
                                "EVERYONE",
                                "SUPER_ADMIN",
                                "ADMIN",
                                "TEMPORARY",
                              ].map((val) => (
                                <label key={val} className="form-check">
                                  <Field
                                    type="radio"
                                    name="visibility"
                                    value={val}
                                    className="form-check-input"
                                  />
                                  <span className="form-check-label">
                                    {val
                                      .split("_")
                                      .map(
                                        (word) =>
                                          word.charAt(0) +
                                          word.slice(1).toLowerCase()
                                      )
                                      .join(" ")}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div> */}
                          <div className="mb-3">
                            <label className="form-label">Note</label>
                            <Field
                              as="textarea"
                              name="note"
                              className="form-control"
                              rows={3}
                              placeholder="Enter note"
                            />
                          </div>
                        </div>
                      </fieldset>
                    </>
                  )}
                </Modal.Body>
                <div className="d-flex justify-content-start gap-2 mt-4 mb-4 p-4">
                  {/* <Button variant="outline-secondary" onClick={onClose}>
                  Cancel
                </Button> */}
                  <Button
                    variant="primary"
                    type="submit"
                    disabled={isSubmitting || isDataLoading}
                  >
                    {isSubmitting
                      ? "Saving..."
                      : isEditMode
                      ? "Update"
                      : "Submit"}
                  </Button>
                </div>
              </FormikForm>
              );
            }}
          </Formik>
        </Box>
      </Modal>

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
        lockBuiltinFields
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
