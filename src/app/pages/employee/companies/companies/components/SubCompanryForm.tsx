import { missingCustomFields } from "@app/modules/common/components/FormSchemaManager/builtinSchema";
import { toast } from "react-toastify";
import {
  AppIcon, FloatingLabelFrame, FloatingLabels, WtButton, WtDateField, WtField, WtFieldFormik, WtSwitch, WtTooltip, useDiscardConfirm,
} from '@app/modules/common/components/ui';
import { Button } from "@/ds/ui/button";
import { FullscreenWizardModal } from "@app/pages/employee/forms/shared/FullscreenWizardModal";
import { CrmWorkspace } from "../../forms/CrmWorkspace";
import { CrmSection } from "../../forms/CrmSection";
import { ContactAddressSection } from "../../forms/ContactAddressSection";
import { COMPANY_STATUS_OPTIONS } from "../../crmListRowSx";
import { getAllClientCompanies, getAllCompanyTypes, getAllCompanyServices, createCompanyService } from "@services/companies";
import { uploadCompanyAsset } from "@services/uploader";
import {
  fetchAllCities,
  fetchAllCountries,
  fetchAllStates,
} from "@services/options";

import { Formik, Form as FormikForm, type FormikProps } from "formik";
import * as Yup from "yup";
import PhoneNumberInput from "@app/components/PhoneNumberInput";
import TextInput from "@app/modules/common/inputs/TextInput";
import DropDownInput from "@app/modules/common/inputs/DropdownInput";
import { useEffect, useMemo, useRef, useState } from "react";
import { errorConfirmation, successConfirmation } from "@utils/modal";
import eventBus from "@utils/EventBus";
import { Box } from "@mui/material";
import CompanyConfigForm from "../../companyConfig/components/CompanyConfigForm";
import { useEventBus } from "@hooks/useEventBus";
import { EVENT_KEYS } from "@constants/eventKeys";
import { createSubCompany, updateSubCompany, fetchSubCompanyById } from "@services/company";
import MultiSelectWithInlineCreate, { Option } from "@app/modules/common/components/MultiSelectWithInlineCreate";
import { transformToOptions, createNewCompanyService } from "@app/modules/common/components/InlineCreateHelpers";
import FormSchemaManager from "@app/modules/common/components/FormSchemaManager";
import DragDropFileField from "@app/modules/common/components/DragDropFileField";
import { IFormField, IFormSection } from "@models/company";
import { cloneSubCompanyDefaults, mergeSubCompanySchema } from "./subCompanyFormSchema";

// Type definitions
interface CompanyType {
  id: string;
  name: string;
}

interface ClientType {
  id: string;
  name: string;
}

interface Company {
  id: string;
  companyName: string;
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
  mainCompanyId: string;
  subCompanyName: string;
  subCompanyTypeId: string;
  // subClientTypeId: string;
  status: string;
  phone: string;
  phone2: string;
  fax: string;
  email: string;
  website: string;
  country: string;
  zipCode: string;
  area: string;
  city: string;
  state: string;
  address: string;
  longitude: string;
  latitude: string;
  gmbProfileUrl: string;
  googleMapsLink: string;
  blacklisted: boolean;
  visibility: string;
  note: string;
  services: string[];
}

interface Props {
  show: boolean;
  onClose: () => void;
  editingSubCompanyId?: string | null;
  mainCompanyId?: string;
  companyTypeId?: string;
}

// Validation schema
const validationSchema = Yup.object().shape({
  mainCompanyId: Yup.string().required("Main company is required"),
  subCompanyName: Yup.string().required("Sub-company name is required"),
  subCompanyTypeId: Yup.string(),
  email: Yup.string().email("Invalid email format"),
  phone: Yup.string(),
  country: Yup.string(),
  state: Yup.string(),
  city: Yup.string(),
  address: Yup.string(),
  zipCode: Yup.string(),
  area: Yup.string(),
  latitude: Yup.string(),
  longitude: Yup.string(),
  services: Yup.array().of(Yup.string()),
});

// Built-ins an admin marked required in Manage Fields. Multi-selects need a pick, text
// needs content; the blacklist toggle has no "empty" to reject.
const ARRAY_FIELDS = new Set(["services"]);
const UNREQUIRABLE = new Set(["blacklisted", "subCompanyName", "mainCompanyId"]);
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

// Required CUSTOM fields left empty, as { fieldId: message }. Built-ins live in Formik and
// are enforced by `schemaFor`; hidden fields cannot be filled in, so they never block.

const SubCompanyForm: React.FC<Props> = ({
  show,
  onClose,
  editingSubCompanyId,
  mainCompanyId,
  companyTypeId,
}) => {
  const [companyTypes, setCompanyTypes] = useState<CompanyType[]>([]);
  const [clientTypes, setClientTypes] = useState<ClientType[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [showCompanyTypeModal, setShowCompanyTypeModal] = useState(false);
  const formikRef = useRef<FormikProps<FormValues>>(null);
  // X / Esc / Cancel ask before throwing away unsaved edits - same prompt as every wizard form.
  const discard = useDiscardConfirm(() => Boolean(formikRef.current?.dirty), onClose);
  const [services, setServices] = useState<any[]>([]);
  const [servicesLoaded, setServicesLoaded] = useState(false);
  const [initialValues, setInitialValues] = useState<FormValues>({
    mainCompanyId: mainCompanyId || "",
    subCompanyName: "",
    subCompanyTypeId: companyTypeId || "",
    // subClientTypeId: "",
    status: "ACTIVE",
    phone: "",
    phone2: "",
    fax: "",
    email: "",
    website: "",
    country: "",
    zipCode: "",
    area: "",
    city: "",
    state: "",
    address: "",
    longitude: "",
    latitude: "",
    gmbProfileUrl: "",
    googleMapsLink: "",
    blacklisted: false,
    visibility: "EVERYONE",
    note: "",
    services: [],
  });
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [formSections, setFormSections] = useState<IFormSection[]>(cloneSubCompanyDefaults());
  const liveSchema = useMemo(() => schemaFor(formSections), [formSections]);
  const [showSchemaManager, setShowSchemaManager] = useState(false);
  const [customErrors, setCustomErrors] = useState<Record<string, string>>({});

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [types, companies, countriesData] = await Promise.all([
          getAllCompanyTypes(),
          getAllClientCompanies(),
          fetchAllCountries(),
        ]);
        setCompanyTypes(types.companyTypes || []);
        setCompanies(companies?.data?.companies || []);
        setCountries(Array.isArray(countriesData) ? countriesData : []);
      } catch (error) {
        console.error("Error fetching data:", error);
        setCountries([]);
      }
    };

    if (show) {
      fetchData();
    }
  }, [show]);

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

  const fetchData = async () => {
    try {
      const [types, countriesData] = await Promise.all([
        getAllCompanyTypes(),
        fetchAllCountries(),
      ]);
      const companiesResponse = await getAllClientCompanies();
      const companiesData = companiesResponse?.data?.companies || [];
      setCompanyTypes(types.companyTypes || []);
      setCompanies(companiesData);
      setCountries(Array.isArray(countriesData) ? countriesData : []);
    } catch (error) {
      console.error("Error fetching data:", error);
      setCountries([]);
    }
  };

  useEventBus(EVENT_KEYS.companyTypeCreated, () => {
    fetchData();
  });

  useEventBus(EVENT_KEYS.companyServiceCreated, () => {
    handleRefreshServices();
  });

  const handleRefreshServices = async () => {
    try {
      const response = await getAllCompanyServices();
      const newServices = response.data?.services || response.services || [];
      setServices(newServices);
    } catch (error) {
      console.error('Error refreshing services:', error);
    }
  };

  // Fetch sub-company data for editing or reset form for new sub-company
  useEffect(() => {
    const fetchSubCompanyData = async () => {
      if (editingSubCompanyId && show && countries.length > 0 && servicesLoaded) {
        setIsDataLoading(true);
        try {
          const response = await fetchSubCompanyById(editingSubCompanyId);
          const subCompany = response.data?.subCompany || response.subCompany || response.data;

          if (subCompany) {
            // Set logo preview if exists
            if (subCompany.logo) {
              setLogoPreview(subCompany.logo);
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

            const selectedCountry = findCountryByValue(subCompany.country);

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

                const selectedState = findStateByValue(subCompany.state);

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

                    const selectedCity = findCityByValue(subCompany.city);

                    if (selectedCity) {
                      finalCityValue = selectedCity.id;
                    } else {
                      finalCityValue = subCompany.city;
                    }
                  } catch (error) {
                    console.error("Failed to fetch cities", error);
                  }
                } else {
                  console.warn("State not found in fetchedStates", subCompany.state);
                }
              } catch (error) {
                console.error("Failed to fetch states", error);
              }
            } else if (subCompany.country) {
              console.warn("Country not found in countries list", subCompany.country);
            }

            // Set initial values with proper mapping
            setInitialValues({
              mainCompanyId: subCompany.mainCompanyId || "",
              subCompanyName: subCompany.subCompanyName || "",
              subCompanyTypeId: subCompany.subCompanyTypeId || "",
              status: subCompany.status || "ACTIVE",
              phone: subCompany.phone || "",
              phone2: subCompany.phone2 || "",
              fax: subCompany.fax || "",
              email: subCompany.email || "",
              website: subCompany.website || "",
              country: selectedCountry ? selectedCountry.id : (subCompany.country || ""),
              state: finalStateValue || (subCompany.state || ""),
              city: finalCityValue || (subCompany.city || ""),
              address: subCompany.address || "",
              zipCode: subCompany.zipCode || "",
              area: subCompany.area || "",
              latitude: subCompany.latitude?.toString() || "",
              longitude: subCompany.longitude?.toString() || "",
              gmbProfileUrl: subCompany.gmbProfileUrl || "",
              googleMapsLink: subCompany.googleMapsLink || "",
              blacklisted: subCompany.blacklisted || false,
              visibility: subCompany.visibility || "EVERYONE",
              note: subCompany.note || "",
              services: (() => {
                let extractedServices = [];

                // Handle different possible service data structures
                if (subCompany.services && Array.isArray(subCompany.services)) {
                  extractedServices = subCompany.services.map((service: any) => {
                    if (typeof service === 'string') {
                      return service; // Service ID as string
                    } else if (service && service.id) {
                      return service.id; // Service object with id
                    } else if (service && service.serviceId) {
                      return service.serviceId; // Service mapping with serviceId
                    }
                    return service;
                  });
                } else if (subCompany.subcompanyServicesMapping && Array.isArray(subCompany.subcompanyServicesMapping)) {
                  // Handle service mappings
                  extractedServices = subCompany.subcompanyServicesMapping.map((mapping: any) =>
                    mapping.serviceId || mapping.service?.id
                  );
                } else if (subCompany.serviceIds && Array.isArray(subCompany.serviceIds)) {
                  extractedServices = subCompany.serviceIds;
                } else if (typeof subCompany.services === 'string') {
                  // Handle JSON string
                  try {
                    const parsed = JSON.parse(subCompany.services);
                    extractedServices = Array.isArray(parsed) ? parsed : [];
                  } catch (e) {
                    console.error('Error parsing services JSON:', e);
                    extractedServices = [];
                  }
                }

                // Filter out any undefined/null values
                extractedServices = extractedServices.filter((id: any) => id);

                return extractedServices;
              })(),
            });
            setFormSections(mergeSubCompanySchema(subCompany.sectionConfig));
          }
        } catch (error) {
          console.error("Failed to fetch sub-company data", error);
        } finally {
          setIsDataLoading(false);
        }
      } else if (!editingSubCompanyId && show) {
        // Reset form for new sub-company
        setInitialValues({
          mainCompanyId: mainCompanyId || "",
          subCompanyName: "",
          subCompanyTypeId: companyTypeId || "",
          status: "ACTIVE",
          phone: "",
          phone2: "",
          fax: "",
          email: "",
          website: "",
          country: "",
          zipCode: "",
          area: "",
          city: "",
          state: "",
          address: "",
          longitude: "",
          latitude: "",
          gmbProfileUrl: "",
          googleMapsLink: "",
          blacklisted: false,
          visibility: "EVERYONE",
          note: "",
          services: [],
        });
        setLogoPreview(null);
        setLogoFile(null);
        setFormSections(cloneSubCompanyDefaults());
        setCustomErrors({});
        setStates([]);
        setCities([]);
      }
    };

    fetchSubCompanyData();
  }, [editingSubCompanyId, show, countries, servicesLoaded, mainCompanyId, companyTypeId]);

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

  // Custom field values live inline on the schema (field.value), like the Company form.
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
    const errs = missingCustomFields(formSections);
    setCustomErrors(errs);
    const missing = Object.values(errs);
    // Say so: the inline errors sit on their own step, which may not be the one on screen.
    if (missing.length) toast.error(missing.join(", "));
    return missing.length === 0;
  };

  // Renders a single admin-defined custom field (text / number / date / file).
  const renderCustomField = (field: IFormField, sectionId: string) => {
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

  const handleSubmit = async (values: FormValues, { setSubmitting }: any) => {
    try {
      if (!validateCustomFields()) {
        setSubmitting(false);
        return;
      }

      let logoUrl = "";
      if (logoFile) {
        const formData = new FormData();
        formData.append("file", logoFile);
        const res = await uploadCompanyAsset(formData);
        const {
          data: { path },
        } = res;
        logoUrl = path;
      } else if (editingSubCompanyId && logoPreview) {
        logoUrl = logoPreview;
      }

      // Create different payloads for create vs update
      let payload: any;

      if (editingSubCompanyId) {
        // Update payload - use relation objects
        payload = {
          subCompanyName: values.subCompanyName,
          status: values.status.toUpperCase(),
          phone: values.phone || null,
          phone2: values.phone2 || null,
          fax: values.fax || null,
          email: values.email || null,
          website: values.website || null,
          country: countries.find((c) => c.id === values.country)?.name || null,
          state: states.find((s) => s.id === values.state)?.name || null,
          city: cities.find((c) => c.id === values.city)?.name || null,
          address: values.address || null,
          zipCode: values.zipCode || null,
          area: values.area || null,
          latitude: values.latitude ? parseFloat(values.latitude) : null,
          longitude: values.longitude ? parseFloat(values.longitude) : null,
          gmbProfileUrl: values.gmbProfileUrl || null,
          googleMapsLink: values.googleMapsLink || null,
          blacklisted: values.blacklisted,
          visibility: values.visibility,
          note: values.note || null,
          logo: logoUrl || null,
          overallRating: 0.0,
          services: values.services || [],
          sectionConfig: formSections,
          // Use relation objects for update
          ...(values.mainCompanyId && {
            mainCompany: {
              connect: { id: values.mainCompanyId }
            }
          }),
          ...(values.subCompanyTypeId && {
            subCompanyType: {
              connect: { id: values.subCompanyTypeId }
            }
          }),
        };
      } else {
        // Create payload - use direct IDs
        payload = {
          ...values,
          logo: logoUrl,
          status: values.status.toUpperCase(),
          country: countries.find((c) => c.id === values.country)?.name,
          state: states.find((s) => s.id === values.state)?.name,
          city: cities.find((c) => c.id === values.city)?.name,
          latitude: values.latitude ? parseFloat(values.latitude) : null,
          longitude: values.longitude ? parseFloat(values.longitude) : null,
          overallRating: 0.0,
          services: values.services,
          sectionConfig: formSections,
        };
      }

      // For update operations, don't filter out empty strings as null is explicitly set
      // Also preserve empty arrays for services
      const finalCleanPayload = editingSubCompanyId
        ? payload
        : Object.keys(payload).reduce((acc, key) => {
            const value = payload[key as keyof typeof payload];
            // Keep services even if it's an empty array
            if (key === 'services' || (value !== "" && value !== null && value !== undefined)) {
              acc[key] = value;
            }
            return acc;
          }, {} as any);


      if (editingSubCompanyId) {
        await updateSubCompany(editingSubCompanyId, finalCleanPayload);
        successConfirmation("Sub-company updated.");
      } else {
        await createSubCompany(finalCleanPayload);
        successConfirmation("Sub-company created.");
      }

      // eventBus.emit("subCompanyCreated");
      onClose();
    } catch (err: any) {
      console.error(err);
      // Say why: a silent failure reads as "Save does nothing".
      errorConfirmation(err?.response?.data?.message || "Failed to save the sub-company. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const isEditMode = !!editingSubCompanyId;

  return (
    <>
      <FullscreenWizardModal show={show} onClose={discard.requestClose} closeLabel="Close sub-company form">
        <Formik
          innerRef={formikRef}
          initialValues={initialValues}
          onSubmit={handleSubmit}
          validationSchema={liveSchema}
          enableReinitialize={true}
        >
          {({ setFieldValue, values, isSubmitting }) => {
            // Every field — built-in or custom — comes from `formSections`, so the Manage
            // Fields dialog's label / required / hidden / order / section edits reach the form.
            // Built-ins keep their bespoke widgets; only the label and required flag are the admin's.
            const colOf = (f: IFormField) =>
              f.id === "note" || (!f.isSystem && f.type === "file") ? "col-12" : "col-12 col-lg-6";

            const renderBuiltin = (f: IFormField): React.ReactNode => {
              const label = f.label;
              const req = f.required;
              switch (f.id) {
                case "subCompanyName":
                  return <TextInput formikField="subCompanyName" label={label} isRequired={true} />;
                case "mainCompanyId":
                  return (
                    <DropDownInput
                      formikField="mainCompanyId"
                      inputLabel={label}
                      isRequired={true}
                      options={companies.map((c) => ({ label: c.companyName, value: c.id }))}
                    />
                  );
                case "subCompanyTypeId":
                  return (
                    <>
                      <DropDownInput
                        formikField="subCompanyTypeId"
                        inputLabel={label}
                        isRequired={req}
                        options={companyTypes.map((ct) => ({ label: ct.name, value: ct.id }))}
                      />
                      <WtButton ghost size="small" sx={{ mt: 0.5 }} onClick={() => setShowCompanyTypeModal(true)}
                        startIcon={<AppIcon name="bi-plus-lg" />}>
                        New sub-company type
                      </WtButton>
                    </>
                  );
                case "services":
                  return (
                    <MultiSelectWithInlineCreate
                      formikField="services"
                      inputLabel={label}
                      options={transformToOptions(services)}
                      placeholder="Select sub-services..."
                      isRequired={req}
                      onCreate={createNewCompanyService}
                      onRefreshOptions={handleRefreshServices}
                      createModalTitle="Create New Sub-service"
                      createButtonText="Add New Service"
                      createFieldLabel="Service Name"
                      createFieldPlaceholder="Enter service name..."
                    />
                  );
                case "phone":
                case "phone2":
                  return <PhoneNumberInput formikField={f.id} label={label} isRequired={req} placeholder={`Enter ${label.toLowerCase()}`} />;
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
                      onChange={(value: any) => setFieldValue("status", (value && typeof value === "object" ? value.value : value) || "ACTIVE")}
                      value={COMPANY_STATUS_OPTIONS.find((o) => o.value === values.status) || COMPANY_STATUS_OPTIONS[0]}
                    />
                  );
                case "blacklisted":
                  // Same toggle as the company form's Blacklisted field.
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
                  return <WtFieldFormik name="note" label={label} required={req} multiline minRows={3} placeholder="Enter note" />;
                default:
                  // email, website, fax — plain text built-ins.
                  return <TextInput formikField={f.id} label={label} isRequired={req} />;
              }
            };

            const renderSection = (section: IFormSection) => {
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
                    setSelectedCountry={() => {}}
                    setSelectedState={() => {}}
                    handleCountryChange={handleCountryChange}
                    handleStateChange={handleStateChange}
                    fields={{googleMapLink: "googleMapsLink", gmbLink: "gmbProfileUrl"}}
                  />
                );
              }
              const visible = section.fields.filter((f) => !f.hidden);
              if (!visible.length) return null;
              return (
                <CrmSection key={section.id} title={section.title || "Custom Fields"} className={section.id === "details" ? "mt-5" : undefined}>
                  <div className="row g-4">
                    {visible.map((f) => (
                      <div key={f.id} className={colOf(f)}>
                        {f.isSystem ? renderBuiltin(f) : renderCustomField(f, section.id)}
                      </div>
                    ))}
                  </div>
                </CrmSection>
              );
            };

            // One wizard step per schema section, in the dialog's order and under its title.
            // A section with nothing visible drops out (the details step and address picker always stay).
            const STEP_LOOK: Record<string, { subtitle: string; icon: string }> = {
              details: { subtitle: "Logo, name, type, parent company and sub-services", icon: "bi-buildings" },
              contact: { subtitle: "Phone, fax, email and website", icon: "bi-telephone" },
              address: { subtitle: "Where it is, and its map pin", icon: "bi-geo-alt" },
              others: { subtitle: "Status, blacklist and notes", icon: "bi-sliders" },
            };
            const steps = formSections
              .filter((sec) => sec.id === "address" || sec.id === "details" || sec.fields.some((f) => !f.hidden))
              .map((sec) => {
                const fields = sec.fields.filter((f) => f.isSystem && !f.hidden);
                return {
                  id: sec.id,
                  label: sec.title || "Custom Fields",
                  title: sec.title || "Custom Fields",
                  ...(STEP_LOOK[sec.id] ?? { subtitle: "Custom fields", icon: "bi-ui-checks" }),
                  fields: fields.map((f) => f.id),
                  requiredFields: fields.filter((f) => f.required).map((f) => f.id),
                  content: (
                    <>
                      {sec.id === "details" && (
                        <CrmSection title="Logo">
                          <div className="crm-avatar-wrap">
                            <label
                              htmlFor="subcompany-logo"
                              className={`crm-avatar-circle${logoPreview ? " has-image" : ""}`}
                            >
                              {logoPreview ? (
                                <img src={logoPreview} alt="Logo preview" />
                              ) : (
                                <span className="crm-avatar-placeholder">
                                  <AppIcon name="bi-buildings" />
                                  <span>Add logo</span>
                                </span>
                              )}
                            </label>
                            <div className="crm-avatar-actions">
                              <WtButton inverted onClick={() => document.getElementById("subcompany-logo")?.click()}>
                                {logoPreview ? "Change logo" : "Upload logo"}
                              </WtButton>
                              <span className="crm-avatar-hint">{logoFile?.name || "PNG or JPG · shown on company lists"}</span>
                            </div>
                            {/* Own id: this form opens on top of the company form, which has its own "logo" input. */}
                            <input type="file" id="subcompany-logo" accept="image/*" onChange={handleLogoChange} hidden />
                          </div>
                        </CrmSection>
                      )}
                      {renderSection(sec)}
                    </>
                  ),
                };
              });

            return (
              <FormikForm style={{ height: "100%" }}>
                <FloatingLabels>
                  <CrmWorkspace
                    module="sub-company"
                    moduleIcon="bi-buildings"
                    headerTitle={isEditMode ? "Edit Sub-Company" : "Add New Sub-Company"}
                    headerSub={isEditMode ? "Update the sub-company, its contact and address" : "Parent company, name, contact details and address"}
                    headerActions={
                      <>
                        <WtButton inverted size="small" onClick={() => setShowSchemaManager(true)}
                          startIcon={<AppIcon name="bi-gear" className="fs-6" />} sx={{ display: { xs: "none", sm: "inline-flex" } }}>
                          Manage fields
                        </WtButton>
                        {/* Phones: icon only, the same 32px translucent square as the close button beside it. */}
                        <Box sx={{ display: { xs: "inline-flex", sm: "none" } }}>
                          <WtTooltip title="Manage fields" wrap>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              type="button"
                              aria-label="Manage fields"
                              onClick={() => setShowSchemaManager(true)}
                              className="rounded-[10px] border border-white/25 bg-white/12 text-white hover:border-white/40 hover:bg-white/22 hover:text-white"
                            >
                              <AppIcon name="bi-gear" />
                            </Button>
                          </WtTooltip>
                        </Box>
                      </>
                    }
                    sidebarTitle="Sub-Company"
                    summaryTitle="Sub-Company Summary"
                    summaryRows={(v: any) => [
                      { label: "Sub-company", value: v.subCompanyName || "—", isStrong: true },
                      { label: "Parent", value: companies.find((c) => c.id === v.mainCompanyId)?.companyName || "—" },
                      { label: "Status", value: v.status === "CLOSED" ? "Inactive" : "Active" },
                      { label: "Phone", value: v.phone || "—" },
                      { label: "City", value: cities.find((c) => c.id === v.city)?.name || "—" },
                    ]}
                    isEdit={isEditMode}
                    isSubmitting={isSubmitting || isDataLoading}
                    onCancel={discard.requestClose}
                    submitText={isEditMode ? "Save Sub-Company" : "Create Sub-Company"}
                    sections={steps}
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
      <FormSchemaManager
        show={showSchemaManager}
        sections={formSections}
        infoPageLabel="Sub-company"
        onSave={(sections) => {
          setFormSections(sections);
          setShowSchemaManager(false);
        }}
        onClose={() => setShowSchemaManager(false)}
      />
    </>
  );
};

export default SubCompanyForm;
