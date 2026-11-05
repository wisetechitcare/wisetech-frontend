import { useEffect, useMemo, useRef, useState } from "react";
import { Formik, Form as FormikForm, type FormikProps } from "formik";
import { toast } from "react-toastify";
import { Box } from "@mui/material";
import { Button } from "@/ds/ui/button";
import { AppIcon, FloatingLabels, useDiscardConfirm, WtButton, WtDateField, WtField, WtTooltip } from "@app/modules/common/components/ui";
import FormSchemaManager from "@app/modules/common/components/FormSchemaManager";
import DragDropFileField from "@app/modules/common/components/DragDropFileField";
import { IFormField, IFormSection } from "@models/company";
import { uploadCompanyAsset } from "@services/uploader";
import { BRANCH_BUILTIN_SECTIONS, cloneBranchDefaults, mergeBranchSchema } from "./branchFormSchema";
import { missingCustomFields } from "@app/modules/common/components/FormSchemaManager/builtinSchema";
import { FullscreenWizardModal } from "@app/pages/employee/forms/shared/FullscreenWizardModal";
import { CrmWorkspace } from "../../forms/CrmWorkspace";
import { CrmSection } from "../../forms/CrmSection";
import { ContactAddressSection } from "../../forms/ContactAddressSection";
import * as Yup from "yup";
import PhoneNumberInput from "@app/components/PhoneNumberInput";
import TextInput from "@app/modules/common/inputs/TextInput";
import DropDownInput from "@app/modules/common/inputs/DropdownInput";
import {
  createClientBranch,
  updateClientBranch,
  getClientBranchById,
} from "@services/lead";
import {
  getAllClientCompanies,
  getClientContactsByCompanyId,
} from "@services/companies";
import {
  fetchAllCountries,
  fetchAllStates,
  fetchAllCities,
} from "@services/options";
import { errorConfirmation, successConfirmation } from "@utils/modal";
import eventBus from "@utils/EventBus";

// Default empty form values
const defaultValues = {
  companyId: "",
  name: "",
  type: "",
  contactId: "",
  phone: "",
  phone2: "",
  email: "",
  country: "",
  state: "",
  city: "",
  zipCode: "",
  area: "",
  address: "",
  latitude: "",
  longitude: "",
  gmbLink: "",
  googleMapLink: "",
};

// Validation schema
const validationSchema = Yup.object().shape({
  companyId: Yup.string().required("Company is required"),
  name: Yup.string().required("Branch name is required"),
  // Everything else is optional. Plain Yup.string() rules on those rejected the nulls a saved
  // branch comes back with ("address cannot be null"), blocking every edit of an old branch.
  email: Yup.string().nullable().email("Invalid email format"),
});

// Built-ins an admin marked required in Manage Fields: keep the field's own rule, add presence.
const schemaFor = (sections: IFormSection[]) =>
  validationSchema.shape(
    Object.fromEntries(
      sections
        .flatMap((s) => s.fields)
        .filter((f) => f.isSystem && f.required && !f.hidden && !f.essential)
        .map((f) => {
          const base = (validationSchema.fields as Record<string, unknown>)[f.id];
          return [f.id, (base instanceof Yup.StringSchema ? base : Yup.string()).trim().required(`${f.label} is required`)];
        })
    )
  );

interface CompaniesBranchFormProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  editingBranchId?: string | null;
  selectedCompanyId?: string;
}

const CompaniesBranchForm: React.FC<CompaniesBranchFormProps> = ({
  show,
  onClose,
  onSuccess,
  editingBranchId,
  selectedCompanyId,
}) => {
  const [companies, setCompanies] = useState<any[]>([]);
  const [countries, setCountries] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [initialValues, setInitialValues] = useState(defaultValues);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const formikRef = useRef<FormikProps<any>>(null);
  // X / Esc / Cancel ask before throwing away unsaved edits - same prompt as every wizard form.
  const discard = useDiscardConfirm(() => Boolean(formikRef.current?.dirty), onClose);
  const [contacts, setContacts] = useState<any[]>([]);
  const [formSections, setFormSections] = useState<IFormSection[]>(cloneBranchDefaults());
  const liveSchema = useMemo(() => schemaFor(formSections), [formSections]);
  const [showSchemaManager, setShowSchemaManager] = useState(false);
  const [customErrors, setCustomErrors] = useState<Record<string, string>>({});

  // Custom field values live inline on the schema (field.value), as on the Company form.
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

  const fetchContactsByCompany = async (companyId: string) => {
    if (!companyId) {
      setContacts([]);
      return;
    }
    try {
      const response = await getClientContactsByCompanyId(companyId);
      setContacts(response?.data?.contacts || []);
    } catch (error) {
      console.error("Failed to fetch company contacts", error);
      setContacts([]);
    }
  };

  // Handle submit
  const handleSubmit = async (values: any, { setSubmitting }: any) => {
    try {
      const errs = missingCustomFields(formSections);
      setCustomErrors(errs);
      if (Object.keys(errs).length) {
        // Say so: the inline errors sit on their own step, which may not be the one on screen.
        toast.error(Object.values(errs).join(", "));
        return;
      }
      const payload = {
        ...values,
        country: countries.find((c) => c.id === values.country)?.name,
        state: states.find((s) => s.id === values.state)?.name,
        // A typed-in city is not in `cities`; keep it rather than dropping it.
        city: cities.find((c) => c.id === values.city)?.name ?? values.city,
        sectionConfig: formSections,
      };

      const cleanPayload = Object.keys(payload).reduce((acc, key) => {
        const value = payload[key];
        if (value !== "" && value !== null && value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {} as any);
      if (editingBranchId) {
        await updateClientBranch(editingBranchId, cleanPayload);
      } else {
        await createClientBranch(cleanPayload);
      }

      successConfirmation("Branch saved.");
      eventBus.emit("branchCreated");
      onClose();
      onSuccess?.();
    } catch (error: any) {
      console.error(
        "Failed to save branch:",
        error?.response?.data || error.message || error
      );
      // Say why: a silent failure reads as "Save does nothing".
      errorConfirmation(error?.response?.data?.message || "Failed to save the branch. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Load dropdown data
  useEffect(() => {
    if (!show) return;
    const fetchData = async () => {
      try {
        const [companiesResponse, countriesResponse] =
          await Promise.all([
            getAllClientCompanies(),
            fetchAllCountries(),
          ]);
        setCompanies(companiesResponse?.data?.companies || []);
        setCountries(countriesResponse || []);
      } catch (error) {
        console.error("Failed to fetch initial dropdown data", error);
      }
    };
    fetchData();
  }, [show]);

  // Fetch contacts when companyId changes (for autofill/initial load)
  useEffect(() => {
    if (show && initialValues.companyId) {
      fetchContactsByCompany(initialValues.companyId);
    }
  }, [show, initialValues.companyId]);

  // Load branch data when editing - FIXED VERSION
  useEffect(() => {
    const fetchBranchData = async () => {
      if (editingBranchId && show && countries.length > 0) {
        setIsDataLoading(true);
        try {
          const response = await getClientBranchById(editingBranchId);
          const branchData = response.data.leadBranch;

          // console.log("branchData", branchData);
          // console.log("countries", countries);

          // Find country by multiple possible matches
          const findCountryByValue = (value: any) => {
            if (!value) return null;
            const searchVal = value.toString().trim().toLowerCase();
            return countries.find((c) => {
              return (
                c.id?.toString().toLowerCase() === searchVal ||
                c.iso2?.toLowerCase() === searchVal ||
                c.iso3?.toLowerCase() === searchVal ||
                c.name?.toLowerCase() === searchVal ||
                c.native?.toLowerCase() === searchVal
              );
            });
          };

          const selectedCountry = findCountryByValue(branchData.country);
          // console.log("selectedCountry", selectedCountry);

          let fetchedStates: any[] = [];
          let fetchedCities: any[] = [];
          let finalStateValue = "";
          let finalCityValue = "";

          if (selectedCountry) {
            // Fetch states for the country
            try {
              fetchedStates = await fetchAllStates(selectedCountry.iso2);
              // console.log("fetchedStates", fetchedStates);
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

              const selectedState = findStateByValue(branchData.state);
              // console.log("selectedState", selectedState);

              if (selectedState) {
                finalStateValue = selectedState.id;

                // Fetch cities for the state
                try {
                  fetchedCities = await fetchAllCities(
                    selectedCountry.iso2,
                    selectedState.iso2
                  );
                  // console.log("fetchedCities", fetchedCities);
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

                  const selectedCity = findCityByValue(branchData.city);

                  if (selectedCity) {
                    finalCityValue = selectedCity.id;
                  } else {
                    // If city not found, keep original value for custom entries
                    console.warn(
                      `City "${branchData.city}" not found in available cities for this state`
                    );
                    finalCityValue = branchData.city; // Keep original value
                  }
                } catch (error) {
                  console.error("Failed to fetch cities", error);
                }
              }
            } catch (error) {
              console.error("Failed to fetch states", error);
            }
          }

          // Set the final values with proper IDs
          const updatedValues = {
            ...defaultValues,
            ...branchData,
            country: selectedCountry ? selectedCountry.id : "",
            state: finalStateValue,
            city: finalCityValue,
          };

          // console.log("Final updatedValues", updatedValues);
          setInitialValues(updatedValues);
          setFormSections(mergeBranchSchema(branchData.sectionConfig));
        } catch (error) {
          console.error("Failed to fetch branch data", error);
        } finally {
          setIsDataLoading(false);
        }
      } else if (!editingBranchId) {
        // Reset for new branch or pre-fill from prop
        setInitialValues({
          ...defaultValues,
          companyId: selectedCompanyId || ""
        });
        setStates([]);
        setCities([]);
        setFormSections(cloneBranchDefaults());
      }
    };

    fetchBranchData();
  }, [editingBranchId, show, countries, selectedCompanyId]); // Added countries and selectedCompanyId as dependency

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

  const isEdit = !!editingBranchId;

  return (
    <>
      <FullscreenWizardModal show={show} onClose={discard.requestClose} closeLabel="Close branch form">
        <Formik
          innerRef={formikRef}
          initialValues={initialValues}
          validationSchema={liveSchema}
          onSubmit={handleSubmit}
          enableReinitialize={true}
          key={editingBranchId || "new"} // Force re-render when editing different branch
        >
          {({ setFieldValue, values, isSubmitting }) => {
            // Every field comes from `formSections`, so Manage Fields' label / required /
            // hidden / order / section edits reach the form. Built-ins keep their widgets.
            const colOf = (f: IFormField) => (!f.isSystem && f.type === "file" ? "col-12" : "col-12 col-lg-6");

            const renderBuiltin = (f: IFormField): React.ReactNode => {
              const label = f.label;
              const req = f.required;
              switch (f.id) {
                case "companyId":
                  return (
                    <DropDownInput
                      formikField="companyId"
                      inputLabel={label}
                      options={companies.map((company) => ({ label: company.companyName, value: company.id }))}
                      isRequired={true}
                      disabled={!!selectedCompanyId}
                      onChange={(option: any) => {
                        const companyId = option?.value || "";
                        setFieldValue("companyId", companyId);
                        setFieldValue("contactId", ""); // Reset contact when company changes
                        fetchContactsByCompany(companyId);
                      }}
                    />
                  );
                case "name":
                  return <TextInput formikField="name" label={label} isRequired />;
                case "type":
                  return (
                    <DropDownInput
                      formikField="type"
                      inputLabel={label}
                      options={[
                        { label: "Main Office", value: "main" },
                        { label: "Sub Branch", value: "sub" },
                      ]}
                      isRequired={req}
                    />
                  );
                case "contactId":
                  return (
                    <DropDownInput
                      formikField="contactId"
                      inputLabel={label}
                      options={contacts.map((contact) => ({ label: contact.fullName, value: contact.id }))}
                      isRequired={req}
                    />
                  );
                case "phone":
                case "phone2":
                  return <PhoneNumberInput formikField={f.id} label={label} isRequired={req} placeholder={`Enter ${label.toLowerCase()}`} />;
                default:
                  // email and any other plain-text built-in.
                  return <TextInput formikField={f.id} label={label} isRequired={req} />;
              }
            };

            const renderSection = (section: IFormSection) => {
              if (section.id === "address") {
                return (
                  <ContactAddressSection
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
                  />
                );
              }
              const visible = section.fields.filter((f) => !f.hidden);
              if (!visible.length) return null;
              return (
                <CrmSection title={section.title || "Custom Fields"}>
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

            // One wizard step per schema section, in Manage Fields order. A built-in section
            // keeps its step label/heading until an admin renames it; empty sections drop out
            // (the details step and the address picker always stay).
            const STEP_LOOK: Record<string, { label: string; title: string; subtitle: string; icon: string }> = {
              details: { label: "Branch", title: "Branch Details", subtitle: "Company, branch name, type and contact person", icon: "bi-diagram-3" },
              contact: { label: "Contact", title: "Contact Details", subtitle: "Phone numbers and email", icon: "bi-telephone" },
              address: { label: "Address", title: "Address", subtitle: "Where the branch is, and its map pin", icon: "bi-geo-alt" },
            };
            const steps = formSections
              .filter((sec) => sec.id === "address" || sec.id === "details" || sec.fields.some((f) => !f.hidden))
              .map((sec) => {
                const name = sec.title || "Custom Fields";
                const look = STEP_LOOK[sec.id];
                const named = look && sec.title === BRANCH_BUILTIN_SECTIONS.find((b) => b.id === sec.id)?.title ? look : undefined;
                const fields = sec.fields.filter((f) => f.isSystem && !f.hidden);
                return {
                  id: sec.id,
                  label: named?.label ?? name,
                  title: named?.title ?? name,
                  subtitle: look?.subtitle ?? "Custom fields",
                  icon: look?.icon ?? "bi-ui-checks",
                  fields: fields.map((f) => f.id),
                  requiredFields: fields.filter((f) => f.required).map((f) => f.id),
                  content: renderSection(sec),
                };
              });

            return (
              <FormikForm style={{ height: "100%" }}>
                <FloatingLabels>
                  <CrmWorkspace
                    module="branch"
                    moduleIcon="bi-diagram-3"
                    headerTitle={isEdit ? "Edit Branch" : "Add New Branch"}
                    headerSub={isEdit ? "Update the branch, its contact and address" : "Company, branch name, contact and address"}
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
                    sidebarTitle="Branch"
                    summaryTitle="Branch Summary"
                    summaryRows={(v: any) => [
                      { label: "Branch", value: v.name || "—", isStrong: true },
                      { label: "Company", value: companies.find((c) => c.id === v.companyId)?.companyName || "—" },
                      { label: "Type", value: v.type === "main" ? "Main Office" : v.type === "sub" ? "Sub Branch" : "—" },
                      { label: "Phone", value: v.phone || "—" },
                      { label: "City", value: cities.find((c) => c.id === v.city)?.name || v.city || "—" },
                    ]}
                    isEdit={isEdit}
                    isSubmitting={isSubmitting || isDataLoading}
                    onCancel={discard.requestClose}
                    submitText={isEdit ? "Save Branch" : "Create Branch"}
                    sections={steps}
                  />
                </FloatingLabels>
              </FormikForm>
            );
          }}
        </Formik>
      </FullscreenWizardModal>
      {discard.dialog}
      <FormSchemaManager
        show={showSchemaManager}
        sections={formSections}
        infoPageLabel="Branch"
        onSave={(sections) => {
          setFormSections(sections);
          setShowSchemaManager(false);
        }}
        onClose={() => setShowSchemaManager(false)}
      />
    </>
  );
};

export default CompaniesBranchForm;
