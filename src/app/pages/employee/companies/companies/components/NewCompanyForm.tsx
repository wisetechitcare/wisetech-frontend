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
import TextInput from "@app/modules/common/inputs/TextInput";
import DropDownInput from "@app/modules/common/inputs/DropdownInput";
import { useEffect, useState } from "react";
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
import { transformToOptions, createNewCompanyService } from "@app/modules/common/components/InlineCreateHelpers";
import { fetchSubCompanies } from "@services/company";

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
  companyType: string;
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
  latitude: string;
  longitude: string;
  reference?: string;
  internalReference?: string;
  externalReference?: string;
  gmbProfileUrl?: string;
  googleMapsLink?: string;
  internalReferenceEmployeeId?: string;
  externalReferenceContactId?: string;
  services: string[];
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
  companyType: Yup.string(),
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
    companyType: "",
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
    latitude: "",
    longitude: "",
    services: [],
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

  useEffect(() => {
    const fetchContacts = async () => {
      const response = await getAllClientContacts();
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
      const response = await getAllClientCompanies();
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
              companyType: company.companyTypeId || "",
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
              latitude: company.latitude || "",
              longitude: company.longitude || "",
              gmbProfileUrl: company.gmbProfileUrl || "",
              googleMapsLink: company.googleMapsLink || "",
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
              referenceType: company.references?.map((ref: any) => ({
                referenceType: ref.referenceType || "",
                internalReferenceEmployeeId: ref.internalReferenceEmployeeId || "",
                externalReferenceContactId: ref.externalReferenceContactId || "",
                externalReferenceCompanyTypeId: ref.externalReferenceCompanyTypeId || "",
                externalReferenceCompanyId: ref.externalReferenceCompanyId || "",
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
          companyType: "",
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
          latitude: "",
          longitude: "",
          services: [],
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
      let logoUrl = "";
      if (logoFile) {
        const formData = new FormData();
        formData.append("file", logoFile);
        const res = await uploadCompanyAsset(formData);
        const {
          data: { path },
        } = res;
        logoUrl = path;
      } else if (editingCompanyId && logoPreview) {
        // Keep existing logo if no new file is uploaded
        logoUrl = logoPreview;
      }

      const { addressLine1, ...rest } = values;

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
        country: countries.find((c) => c.id === values.country)?.name,
        state: states.find((s) => s.id === values.state)?.name,
        city: cities.find((c) => c.id === values.city)?.name,
        gmbProfileUrl: values.gmbProfileUrl,
        googleMapsLink: values.googleMapsLink,
        references: references,
        services: values.services,
      };

      const finalCleanPayload = Object.keys(payload).reduce((acc, key) => {
        const value = payload[key as keyof typeof payload];
        if (value !== "" && value !== null && value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {} as any);

      if (editingCompanyId) {
        await updateClientCompany(editingCompanyId, {
          ...finalCleanPayload,
          companyType: values.companyType,
          overallRating: weightedAverageRating ?? 0.0,
        });
        successConfirmation("Company updated successfully");
        onClose();
        eventBus.emit("companyCreated");
      } else {
        await createClientCompany({
          ...finalCleanPayload,
          companyType: values.companyType,
          overallRating: weightedAverageRating ?? 0.0,
        });
        successConfirmation("Company created successfully");
        onClose();
        eventBus.emit("companyCreated");
      }

      // Trigger data refresh in parent component
      // eventBus.emit('refreshCompanies');
      onClose();
    } catch (err) {
      console.error(err);
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
              {prefix && `Inquiry Id: ${prefix}`}
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
              // Auto-update Google Maps Link when latitude and longitude change
              useEffect(() => {
                const latitude = values.latitude;
                const longitude = values.longitude;
                
                if (latitude && longitude && latitude !== '' && longitude !== '') {
                  const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
                  
                  // Only update if the current googleMapsLink is different
                  // if (values.googleMapsLink !== googleMapsUrl) {
                  //   setFieldValue('googleMapsLink', googleMapsUrl);
                  // }
                }
              }, [values.latitude, values.longitude, setFieldValue, values.googleMapsLink]);

              return (
              <FormikForm placeholder={""}>
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
                      {/* Logo */}
                      <div className="mb-4">
                        <label
                          className="form-label fw-semibold"
                          style={{
                            fontSize: "17px",
                            fontFamily: "Inter",
                            color: "#9D4141",
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
                              borderTop: "1px solid #9D4141",
                              width: "30px",
                              height: "0px",
                            }}
                          ></div>
                          Logo
                          <div
                            style={{
                              borderTop: "1px solid #9D4141",
                              width: "100%",
                              height: "0px",
                            }}
                          ></div>
                        </label>
                        <div className="d-flex align-items-center ms-6">
                          <div className="me-3">
                            {logoPreview ? (
                              <label
                                htmlFor="logo"
                                style={{ cursor: "pointer" }}
                              >
                                <img
                                  src={logoPreview}
                                  alt="Logo"
                                  style={{
                                    width: 100,
                                    height: 60,
                                    objectFit: "contain",
                                    border: "1px solid #ddd",
                                  }}
                                />
                              </label>
                            ) : (
                              <label
                                htmlFor="logo"
                                style={{
                                  width: 100,
                                  height: 60,
                                  border: "1px dashed #ccc",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  cursor: "pointer",
                                  gap: "8px",
                                }}
                              >
                                Choose Logo
                              </label>
                            )}
                          </div>
                          <div>
                            <input
                              type="file"
                              id="logo"
                              accept="image/*"
                              onChange={handleLogoChange}
                              style={{ display: "none" }}
                            />
                            {/* <label htmlFor="logo" className="btn btn-outline-secondary btn-sm">Choose File</label> */}
                            <div className="text-muted small mt-1">
                              {logoFile?.name || "No file chosen"}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Basic */}
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
                          PROJECT DETAILS
                        </legend>
                        <div className="card-body card responsive-card p-md-10 p-3 ">
                          <div className="row g-3">
                            <div className="col-md-4">
                              <TextInput
                                formikField="companyName"
                                label="Company Name"
                                isRequired={true}
                              />
                            </div>
                            <div className="col-md-4">
                              <DropDownInput
                                formikField="companyType"
                                inputLabel="Company type"
                                isRequired={false}
                                options={companyTypes.map((ct) => ({
                                  label: ct.name,
                                  value: ct.id,
                                }))}
                              />
                              <small
                                className="text-primary"
                                onClick={() => setShowCompanyTypeModal(true)}
                                style={{ cursor: "pointer" }}
                              >
                                + New Company Type
                              </small>
                            </div>
                            <div className="col-md-4">
                              <MultiSelectWithInlineCreate
                                formikField="services"
                                inputLabel="Services"
                                options={(() => {
                                  const options = transformToOptions(services);
                                  return options;
                                })()}
                                placeholder="Select services..."
                                isRequired={false}
                                onCreate={createNewCompanyService}
                                onRefreshOptions={handleRefreshServices}
                                createModalTitle="Create New Service"
                                createButtonText="Add New Service"
                                createFieldLabel="Service Name"
                                createFieldPlaceholder="Enter service name..."
                              />
                            </div>
                          </div>
                        </div>
                      </fieldset>

                      {/* References */}
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
                                              color: "#9D4141",
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

                                        <div className="col-md-6">
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
                                          <div className="col-md-6">
                                            <DropDownInput
                                              formikField={`referenceType.${index}.internalReferenceEmployeeId`}
                                              inputLabel="Referral Contact"
                                              isRequired={false}
                                              options={allEmployees.map(
                                                (employee) => ({
                                                  label: `${employee.users?.firstName} ${employee.users?.lastName}`,
                                                  value: employee.id,
                                                })
                                              )}
                                            />
                                          </div>
                                        )}

                                        {reference.referenceType ===
                                          "EXTERNAL" && (
                                          <>
                                            <div className="col-md-6">
                                              <DropDownInput
                                                formikField={`referenceType.${index}.externalReferenceCompanyTypeId`}
                                                inputLabel="Referral Company Type"
                                                isRequired={false}
                                                options={companyTypes.map(
                                                  (ct) => ({
                                                    label: ct.name,
                                                    value: ct.id,
                                                  })
                                                )}
                                                onChange={(option: any) => {
                                                  setFieldValue(`referenceType.${index}.externalReferenceCompanyTypeId`, option?.value || "");
                                                  // Clear company selection when company type changes
                                                  setFieldValue(`referenceType.${index}.externalReferenceCompanyId`, "");
                                                }}
                                              />
                                            </div>

                                            <div className="col-md-6">
                                              <DropDownInput
                                                formikField={`referenceType.${index}.externalReferenceCompanyId`}
                                                inputLabel="Referral Company"
                                                isRequired={false}
                                                options={(() => {
                                                  const selectedCompanyTypeId = reference.externalReferenceCompanyTypeId;

                                                  if (!selectedCompanyTypeId) {
                                                    return allCompanies.map((company) => ({
                                                      label: company.companyName,
                                                      value: company.id,
                                                    }));
                                                  }

                                                  const filteredCompanies = allCompanies.filter((company) => {
                                                    // Check if companyTypeId is an array
                                                    if (Array.isArray(company.companyTypeId)) {
                                                      return company.companyTypeId.includes(selectedCompanyTypeId);
                                                    }
                                                    // Check if it's a direct string match
                                                    return company.companyTypeId === selectedCompanyTypeId;
                                                  });

                                                  return filteredCompanies.map((company) => ({
                                                    label: company.companyName,
                                                    value: company.id,
                                                  }));
                                                })()}
                                                placeholder={
                                                  !reference.externalReferenceCompanyTypeId
                                                    ? "Please select company type first"
                                                    : "Select Company"
                                                }
                                                onChange={(option: any) => {
                                                  setFieldValue(`referenceType.${index}.externalReferenceCompanyId`, option?.value || "");
                                                  // Clear sub company selection when company changes
                                                  setFieldValue(`referenceType.${index}.externalReferenceSubCompanyId`, "");
                                                }}
                                                value={
                                                  reference.externalReferenceCompanyId
                                                    ? {
                                                        label: allCompanies.find(
                                                          (c) => c.id === reference.externalReferenceCompanyId
                                                        )?.companyName,
                                                        value: reference.externalReferenceCompanyId,
                                                      }
                                                    : null
                                                }
                                              />
                                            </div>

                                            <div className="col-md-6">
                                              <DropDownInput
                                                formikField={`referenceType.${index}.externalReferenceSubCompanyId`}
                                                inputLabel="Referral Sub Company"
                                                isRequired={false}
                                                options={(() => {
                                                  const selectedCompanyId = reference.externalReferenceCompanyId;

                                                  if (!selectedCompanyId) {
                                                    return subCompanies.map((subCompany) => ({
                                                      label: subCompany.subCompanyName,
                                                      value: subCompany.id,
                                                    }));
                                                  }

                                                  // Find the selected company
                                                  const selectedCompany = allCompanies.find(
                                                    (company) => company.id === selectedCompanyId
                                                  );

                                                  if (!selectedCompany || !selectedCompany.subCompanies) {
                                                    return [];
                                                  }

                                                  const companySubCompanies = Array.isArray(selectedCompany.subCompanies)
                                                    ? selectedCompany.subCompanies
                                                    : [];

                                                  return companySubCompanies.map((subCompany:any) => ({
                                                    label: subCompany.subCompanyName || subCompany.name,
                                                    value: subCompany.id,
                                                  }));
                                                })()}
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
                                                    ? (() => {
                                                        const selectedCompany = allCompanies.find(
                                                          (c) => c.id === reference.externalReferenceCompanyId
                                                        );
                                                        const subCompany = selectedCompany?.subCompanies?.find(
                                                          (sc: any) => sc.id === reference.externalReferenceSubCompanyId
                                                        );
                                                        return subCompany ? {
                                                          label: subCompany.subCompanyName || subCompany.name,
                                                          value: subCompany.id,
                                                        } : null;
                                                      })()
                                                    : null
                                                }
                                              />
                                            </div>

                                            <div className="col-md-6">
                                              <DropDownInput
                                                formikField={`referenceType.${index}.externalReferenceContactId`}
                                                inputLabel="Referral Contact"
                                                isRequired={false}
                                                options={contacts.map(
                                                  (contact) => ({
                                                    label: contact.fullName,
                                                    value: contact.id,
                                                    avatar: contact.profilePhoto
                                                  })
                                                )}
                                                showColor={true}
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
                                        color: "#9D4141",
                                        border: "1px dotted #9D4141",
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
                          CONTACT DETAILS
                        </legend>
                        <div className="card-body card responsive-card p-md-10 p-3 ">
                          <div className="row g-3">
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
                                formikField="fax"
                                label="FAX"
                                isRequired={false}
                              />
                            </div>
                            <div className="col-md-6">
                              <TextInput
                                formikField="email"
                                label="Email"
                                isRequired={false}
                              />
                            </div>
                            <div className="col-md-6">
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
                          borderTop: "1px solid #9D4141",
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
                          ADDRESS
                        </legend>
                        <div className="card-body card responsive-card p-md-10 p-3 ">
                          <div className="row g-3">
                            <div className="col-md-6">
                              <TextInput
                                formikField="addressLine1"
                                label="Address"
                                isRequired={false}
                              />
                            </div>
                            <div className="col-md-6">
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
                            <div className="col-md-6">
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
                            <div className="col-md-6">
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
                                label="Zip Code"
                                isRequired={false}
                              />
                            </div>      
                              <div className="mt-5 p-3" style={{ borderRadius: '8px', backgroundColor: '#9fd491'}}>
                        <div className="mb-4" style={{fontFamily:'Inter', fontSize:'14px', fontWeight:'500', color:'#0D47A1'}}>LOCATION ON MAP</div>
                          <div className="row g-3">
                            <div className="col-md-3">
                              <TextInput
                                formikField="googleMapsLink"
                                label="Google Map Link"
                                isRequired={false}
                              />
                            </div>
                            <div className="col-md-3">
                              <TextInput
                                formikField="gmbProfileUrl"
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
                            onClick={() => viewLocation(
                              values.latitude || '', 
                              values.longitude || ''
                            )}
                            style={{
                              cursor: 'pointer',
                              color: '#0D47A1',
                            }}
                            >
                            View Location On Map
                          </div>
                          </div>
                        </div>
                        </div>
                      </fieldset>

                      {/* Other */}
                      <fieldset
                        style={{
                          borderTop: "1px solid #9D4141",
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
                            color: "#9D4141",
                            padding: "2px 2px 8px",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
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
                          <span>OTHERS</span>
                          {/* <div style={{borderTop: "1px solid #9D4141", width: "100px", height: "0px",}}></div> */}
                        </legend>
                        <div className="card-body card responsive-card p-md-10 p-3 ">
                          <div className="mb-3">
                            <label className="form-label">Status</label>
                            <div className="d-flex flex-wrap gap-4">
                              {["ACTIVE", "CLOSED"].map((val) => (
                                <label key={val} className="form-check">
                                  <Field
                                    type="radio"
                                    name="status"
                                    value={val}
                                    className="form-check-input"
                                  />
                                  <span className="form-check-label">
                                    {val.charAt(0) + val.slice(1).toLowerCase()}
                                  </span>
                                </label>
                              ))}
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
    </>
  );
};

export default NewCompanyForm;
