import { useEffect, useRef, useState } from "react";
import { Formik, Form as FormikForm, type FormikProps } from "formik";
import { AppIcon, FloatingLabels, WtButton, useDiscardConfirm } from "@app/modules/common/components/ui";
import { FullscreenWizardModal } from "@app/pages/employee/forms/shared/FullscreenWizardModal";
import { CrmWorkspace } from "../../forms/CrmWorkspace";
import { CrmSection } from "../../forms/CrmSection";
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
import { Box } from "@mui/material";

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
  type: Yup.string(),
  address: Yup.string(),
  country: Yup.string(),
  state: Yup.string(),
  city: Yup.string(),
  email: Yup.string().email("Invalid email format"),
  phone: Yup.string(),
});

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
      const payload = {
        ...values,
        country: countries.find((c) => c.id === values.country)?.name,
        state: states.find((s) => s.id === values.state)?.name,
        // A typed-in city is not in `cities`; keep it rather than dropping it.
        city: cities.find((c) => c.id === values.city)?.name ?? values.city,
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

  const viewLocation = (latitude: string, longitude: string) => {
    if (latitude && longitude) {
      const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
      window.open(googleMapsUrl, '_blank');
    } else {
      errorConfirmation("Please enter latitude and longitude first");
    }
  };

  const isEdit = !!editingBranchId;

  return (
    <>
      <FullscreenWizardModal show={show} onClose={discard.requestClose} closeLabel="Close branch form">
        <Formik
          innerRef={formikRef}
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
          enableReinitialize={true}
          key={editingBranchId || "new"} // Force re-render when editing different branch
        >
          {({ setFieldValue, values, isSubmitting }) => (
            <FormikForm style={{ height: "100%" }}>
              <FloatingLabels>
                <CrmWorkspace
                  module="branch"
                  moduleIcon="bi-diagram-3"
                  headerTitle={isEdit ? "Edit Branch" : "Add New Branch"}
                  headerSub={isEdit ? "Update the branch, its contact and address" : "Company, branch name, contact and address"}
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
                  sections={[
                    {
                      id: "details",
                      label: "Branch",
                      title: "Branch Details",
                      subtitle: "Company, branch name, type and contact person",
                      fields: ["companyId", "name", "type", "contactId"],
                      requiredFields: ["companyId", "name"],
                      icon: "bi-diagram-3",
                      content: (
                        <CrmSection title="Branch">
                          <div className="row g-4">
                            <div className="col-12 col-lg-6">
                              <DropDownInput
                                formikField="companyId"
                                inputLabel="Choose Company"
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
                            </div>
                            <div className="col-12 col-lg-6">
                              <TextInput formikField="name" label="Branch Name" isRequired />
                            </div>
                            <div className="col-12 col-lg-6">
                              <DropDownInput
                                formikField="type"
                                inputLabel="Type"
                                options={[
                                  { label: "Main Office", value: "main" },
                                  { label: "Sub Branch", value: "sub" },
                                ]}
                                isRequired={false}
                              />
                            </div>
                            <div className="col-12 col-lg-6">
                              <DropDownInput
                                formikField="contactId"
                                inputLabel="Contact Person"
                                options={contacts.map((contact) => ({ label: contact.fullName, value: contact.id }))}
                                isRequired={false}
                              />
                            </div>
                          </div>
                        </CrmSection>
                      ),
                    },
                    {
                      id: "contact",
                      label: "Contact",
                      title: "Contact Details",
                      subtitle: "Phone numbers and email",
                      fields: ["phone", "phone2", "email"],
                      icon: "bi-telephone",
                      content: (
                        <CrmSection title="Contact Details">
                          <div className="row g-4">
                            <div className="col-12 col-lg-6">
                              <PhoneNumberInput formikField="phone" label="Phone" isRequired={false} placeholder="Enter phone" />
                            </div>
                            <div className="col-12 col-lg-6">
                              <PhoneNumberInput formikField="phone2" label="Phone 2" isRequired={false} placeholder="Enter phone 2" />
                            </div>
                            <div className="col-12 col-lg-6">
                              <TextInput formikField="email" label="Email" isRequired={false} />
                            </div>
                          </div>
                        </CrmSection>
                      ),
                    },
                    {
                      id: "address",
                      label: "Address",
                      title: "Address",
                      subtitle: "Where the branch is, and its map pin",
                      fields: ["address", "country", "state", "city", "area", "zipCode", "googleMapLink", "gmbLink", "latitude", "longitude"],
                      icon: "bi-geo-alt",
                      content: (
                        <>
                          <CrmSection title="Address">
                            <div className="row g-4">
                              <div className="col-12">
                                <TextInput formikField="address" label="Address" isRequired={false} />
                              </div>
                              <div className="col-12 col-lg-6">
                                <DropDownInput
                                  formikField="country"
                                  inputLabel="Country"
                                  options={countries.map((c) => ({ label: c.name, value: c.id }))}
                                  isRequired={false}
                                  onChange={(option: any) => {
                                    setFieldValue("country", option?.value || "");
                                    setFieldValue("state", "");
                                    setFieldValue("city", "");
                                    if (option?.value) handleCountryChange(option.value);
                                  }}
                                  value={values.country ? { label: countries.find((c) => c.id === values.country)?.name || "", value: values.country } : null}
                                />
                              </div>
                              <div className="col-12 col-lg-6">
                                <DropDownInput
                                  formikField="state"
                                  inputLabel="State"
                                  options={values.country ? states.map((s) => ({ label: s.name, value: s.id })) : []}
                                  placeholder={!values.country ? "Please select country first" : "Select State"}
                                  isRequired={false}
                                  onChange={(option: any) => {
                                    setFieldValue("state", option?.value || "");
                                    setFieldValue("city", "");
                                    if (option?.value && values.country) handleStateChange(values.country, option.value);
                                  }}
                                  value={values.state ? { label: states.find((s) => s.id === values.state)?.name || "", value: values.state } : null}
                                />
                              </div>
                              <div className="col-12 col-lg-6">
                                <DropDownInput
                                  formikField="city"
                                  inputLabel="City"
                                  options={values.state ? [
                                    ...cities.map((c) => ({ label: c.name, value: c.id })),
                                    // Add custom city if it's not in the list
                                    ...(values.city && !cities.find((c) => c.id === values.city) ? [{ label: values.city, value: values.city }] : []),
                                  ] : []}
                                  placeholder={!values.state ? "Please select state first" : "Select City"}
                                  isRequired={false}
                                  onChange={(option: any) => setFieldValue("city", option?.value || "")}
                                  value={values.city ? { label: cities.find((c) => c.id === values.city)?.name || values.city, value: values.city } : null}
                                />
                              </div>
                              <div className="col-12 col-lg-6">
                                <TextInput formikField="area" label="Locality" isRequired={false} />
                              </div>
                              <div className="col-12 col-lg-6">
                                <TextInput formikField="zipCode" label="ZipCode" isRequired={false} />
                              </div>
                            </div>
                          </CrmSection>
                          <CrmSection title="Location on Map" className="mt-5">
                            <div className="row g-4">
                              <div className="col-12 col-lg-6">
                                <TextInput formikField="googleMapLink" label="Google Map Link" isRequired={false} />
                              </div>
                              <div className="col-12 col-lg-6">
                                <TextInput formikField="gmbLink" label="Google Business Link" isRequired={false} />
                              </div>
                              <div className="col-12 col-sm-6">
                                <TextInput formikField="latitude" label="Latitude" isRequired={false} inputValidation="signed-decimal" />
                              </div>
                              <div className="col-12 col-sm-6">
                                <TextInput formikField="longitude" label="Longitude" isRequired={false} inputValidation="signed-decimal" />
                              </div>
                            </div>
                            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
                              <WtButton ghost startIcon={<AppIcon name="bi-geo-alt" />}
                                onClick={() => viewLocation(values.latitude || "", values.longitude || "")}>
                                View location on map
                              </WtButton>
                            </Box>
                          </CrmSection>
                        </>
                      ),
                    },
                  ]}
                />
              </FloatingLabels>
            </FormikForm>
          )}
        </Formik>
      </FullscreenWizardModal>
      {discard.dialog}
    </>
  );
};

export default CompaniesBranchForm;
