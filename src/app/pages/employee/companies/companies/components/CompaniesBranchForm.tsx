import { useEffect, useState } from "react";
import { Modal, Button, Spinner } from "react-bootstrap";
import { Formik, Form as FormikForm } from "formik";
import * as Yup from "yup";
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
import ClientContactsForm from "../../contacts/components/ClientContactsForm";
import { Close } from "@mui/icons-material";
import { Box, IconButton, Typography } from "@mui/material";

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
  const [showContactModal, setShowContactModal] = useState(false);
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
        city: cities.find((c) => c.id === values.city)?.name,
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

      successConfirmation("Branch saved successfully");
      eventBus.emit("branchCreated");
      onClose();
      onSuccess?.();
    } catch (error: any) {
      console.error(
        "Failed to save branch:",
        error?.response?.data || error.message || error
      );
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

  return (
    <>
      <Modal
        show={show}
        onHide={onClose}
        size="xl"
        centered
        style={{ zIndex: 1500 }}
      >
        <Box sx={{ position: "relative", backgroundColor: "#F3F4F7", p: 3 }}>
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
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
            enableReinitialize={true}
            key={editingBranchId || "new"} // Force re-render when editing different branch
          >
            {({ setFieldValue, values, isSubmitting, handleSubmit }) => (
              <FormikForm onSubmit={handleSubmit} placeholder="">
                <Modal.Header>
                  <Typography
                    variant="h6"
                    component="h2"
                    sx={{ mb: 3, fontWeight: 600 }}
                    style={{
                      fontSize: "20px",
                      fontFamily: "Barlow",
                      fontWeight: "600",
                    }}
                  >
                    {editingBranchId ? "Edit Branch" : "Add New Branch"}
                  </Typography>
                </Modal.Header>
                <Modal.Body>
                  <fieldset
                    style={{
                      borderTop: "1px solid #9D4141",
                      padding: "14px",
                    }}
                    className=""
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
                        gap: "8px",
                      }}
                    >
                      <div
                        className="ms-5"
                        style={{
                          borderTop: "1px solid #9D4141",
                          width: "30px",
                          height: "0px",
                        }}
                      ></div>
                      IMPORTANT DETAILS
                    </legend>
                    <div className="card card-body p-10">
                      <div className="row">
                        <div className="col-md-4">
                          <DropDownInput
                            formikField="companyId"
                            inputLabel="Choose Company"
                            options={companies.map((company) => ({
                              label: company.companyName,
                              value: company.id,
                            }))}
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
                        <div className="col-md-4">
                          <TextInput
                            formikField="name"
                            label="Branch Name"
                            isRequired
                          />
                        </div>
                        <div className="col-md-4">
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
                        <div className="row mt-3">
                          <div className="col-md-12">
                            <DropDownInput
                              formikField="contactId"
                              inputLabel="Contact Person"
                              options={contacts.map((contact) => ({
                                label: contact.fullName,
                                value: contact.id,
                              }))}
                              isRequired={false}
                            />
                            {/* <div
                              className="text-danger"
                              onClick={() => setShowContactModal(true)}
                              style={{ cursor: "pointer" }}
                            >
                              + New Contact
                            </div> */}
                          </div>
                        </div>
                      </div>
                    </div>
                  </fieldset>
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
                      BRANCH CONTACT DETAILS
                    </legend>
                    <div className="card-body card responsive-card p-md-10 p-3">
                      <div className="row">
                        <div className="col-md-4">
                          <TextInput
                            formikField="phone"
                            label="Phone"
                            isRequired={false}
                            inputValidation="numbers"
                          />
                        </div>
                        <div className="col-md-4">
                          <TextInput
                            formikField="phone2"
                            label="Phone 2"
                            isRequired={false}
                            inputValidation="numbers"
                          />
                        </div>
                        <div className="col-md-4">
                          <TextInput
                            formikField="email"
                            label="Email"
                            isRequired={false}
                          />
                        </div>
                      </div>
                    </div>
                  </fieldset>

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
                    <div className="card-body card responsive-card p-md-10 p-3">
                      <div className="row mb-3">
                        <div className="col-md-6">
                          <TextInput
                            formikField="address"
                            label="Address"
                            isRequired={false}
                          />
                        </div>
                        <div className="col-md-6">
                          <DropDownInput
                            formikField="country"
                            inputLabel="Country"
                            options={countries.map((c) => ({
                              label: c.name,
                              value: c.id,
                            }))}
                            isRequired={false}
                            onChange={(option: any) => {
                              setFieldValue("country", option?.value || "");
                              setFieldValue("state", "");
                              setFieldValue("city", "");
                              if (option?.value) {
                                handleCountryChange(option.value);
                              }
                            }}
                            value={
                              values.country
                                ? {
                                    label:
                                      countries.find(
                                        (c) => c.id === values.country
                                      )?.name || "",
                                    value: values.country,
                                  }
                                : null
                            }
                          />
                        </div>
                      </div>
                      <div className="row mb-3">
                        <div className="col-md-6">
                          <DropDownInput
                            formikField="state"
                            inputLabel="State"
                            options={values.country ? states.map((s) => ({
                              label: s.name,
                              value: s.id,
                            })) : []}
                            placeholder={!values.country ? "Please select country first" : "Select State"}
                            isRequired={false}
                            onChange={(option: any) => {
                              setFieldValue("state", option?.value || "");
                              setFieldValue("city", "");
                              if (option?.value && values.country) {
                                handleStateChange(values.country, option.value);
                              }
                            }}
                            value={
                              values.state
                                ? {
                                    label:
                                      states.find((s) => s.id === values.state)
                                        ?.name || "",
                                    value: values.state,
                                  }
                                : null
                            }
                          />
                        </div>
                        <div className="col-md-6">
                          <DropDownInput
                            formikField="city"
                            inputLabel="City"
                            options={values.state ? [
                              ...cities.map((c) => ({
                                label: c.name,
                                value: c.id,
                              })),
                              // Add custom city if it's not in the list
                              ...(values.city &&
                              !cities.find((c) => c.id === values.city)
                                ? [{ label: values.city, value: values.city }]
                                : []),
                            ] : []}
                            placeholder={!values.state ? "Please select state first" : "Select City"}
                            isRequired={false}
                            onChange={(option: any) =>
                              setFieldValue("city", option?.value || "")
                            }
                            value={
                              values.city
                                ? {
                                    label:
                                      cities.find((c) => c.id === values.city)
                                        ?.name || values.city,
                                    value: values.city,
                                  }
                                : null
                            }
                          />
                        </div>
                      </div>
                      <div className="row mb-3">
                        <div className="col-md-6">
                          <TextInput
                            formikField="area"
                            label="Locality"
                            isRequired={false}
                          />
                        </div>
                        <div className="col-md-6">
                          <TextInput
                            formikField="zipCode"
                            label="ZipCode"
                            isRequired={false}
                          />
                        </div>
                      </div>

                      <div className="mt-5 p-3" style={{ borderRadius: '8px', backgroundColor: '#9fd491' }}>
                        <div className="mb-4" style={{ fontFamily: 'Inter', fontSize: '14px', fontWeight: '500', color: '#0D47A1' }}>LOCATION ON MAP</div>
                        <div className="row g-3">
                          <div className="col-md-3">
                            <TextInput
                              formikField="googleMapLink"
                              label="Google Map Link"
                              isRequired={false}
                            />
                          </div>
                          <div className="col-md-3">
                            <TextInput
                              formikField="gmbLink"
                              label="Google Business Link"
                              isRequired={false}
                            />
                          </div>
                          <div className="col-md-3">
                            <TextInput
                              formikField="latitude"
                              label="Latitude"
                              isRequired={false}
                              inputValidation="decimal"
                            />
                          </div>
                          <div className="col-md-3">
                            <TextInput
                              formikField="longitude"
                              label="Longitude"
                              isRequired={false}
                              inputValidation="decimal"
                            />
                          </div>
                        </div>
                        <div
                          className="d-flex justify-content-end mt-4"
                          onClick={() => viewLocation(values.latitude || '', values.longitude || '')}
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
                  </fieldset>
                </Modal.Body>

                <div className="d-flex justify-content-start gap-2 mt-4 mb-4 p-4">
                  {/* <Button variant="outline-secondary" onClick={onClose}>
                    Cancel
                  </Button> */}
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Saving..." : "Save"}
                  </Button>
                </div>
              </FormikForm>
            )}
          </Formik>
        </Box> 
      </Modal>
      {/* <ClientContactsForm show={showContactModal} onClose={() => setShowContactModal(false)} key="add-new"/> */}
    </>
  );
};

export default CompaniesBranchForm;
