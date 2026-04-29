import { getAllClientCompanies, getAllCompanyTypes, getAllCompanyServices, createCompanyService } from "@services/companies";
import { uploadCompanyAsset } from "@services/uploader";
import {
  fetchAllCities,
  fetchAllCountries,
  fetchAllStates,
} from "@services/options";

import { Modal, Button } from "react-bootstrap";
import { Formik, Form as FormikForm, Field } from "formik";
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
import { createSubCompany, updateSubCompany, fetchSubCompanyById } from "@services/company";
import MultiSelectWithInlineCreate, { Option } from "@app/modules/common/components/MultiSelectWithInlineCreate";
import { transformToOptions, createNewCompanyService } from "@app/modules/common/components/InlineCreateHelpers";

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
  const [showClientTypeModal, setShowClientTypeModal] = useState(false);
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
            } else {
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
        successConfirmation("Sub-company updated successfully");
      } else {
        await createSubCompany(finalCleanPayload);
        successConfirmation("Sub-company created successfully");
      }

      // eventBus.emit("subCompanyCreated");
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const isEditMode = !!editingSubCompanyId;

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
            {isEditMode ? "Edit Sub-Company" : "Add New Sub-Company"}
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
                <Modal.Body style={{ maxHeight: "80vh", overflowY: "auto" }}>
                  {isDataLoading ? (
                    <div className="text-center p-4">
                      <div className="spinner-border" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Logo Section */}
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
                            <div className="text-muted small mt-1">
                              {logoFile?.name || "No file chosen"}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Sub-Company Details */}
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
                          SUB-COMPANY DETAILS
                        </legend>
                        <div className="card-body card responsive-card p-md-10 p-3">
                          <div className="row g-3">
                          <div className="col-md-4">
                              <TextInput
                                formikField="subCompanyName"
                                label="Company Name"
                                isRequired={true}
                              />
                            </div>
                            <div className="col-md-4">
                              <DropDownInput
                                formikField="subCompanyTypeId"
                                inputLabel="Company Type"
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
                                + New Sub-Company Type
                              </small>
                            </div>
                            <div className="col-md-4">
                              <DropDownInput
                                formikField="mainCompanyId"
                                inputLabel="Parent Company"
                                isRequired={true}
                                options={companies.map((c) => ({
                                  label: c.companyName,
                                  value: c.id,
                                }))}
                              />
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


                            {/* <div className="col-md-6">
                              <DropDownInput
                                formikField="subClientTypeId"
                                inputLabel="Client Type"
                                isRequired={false}
                                options={companyTypes.map((ct) => ({
                                  label: ct.name,
                                  value: ct.id,
                                }))}
                              />
                              <small
                                className="text-primary"
                                onClick={() => setShowClientTypeModal(true)}
                                style={{ cursor: "pointer" }}
                              >
                                + New Client Type
                              </small>
                            </div> */}
                          </div>
                        </div>
                      </fieldset>

                      {/* Contact Details */}
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
                        <div className="card-body card responsive-card p-md-10 p-3">
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

                      {/* Address Details */}
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
                        <div className="card-body card responsive-card p-md-10 p-3">
                          <div className="row g-3">
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
                             <div className="mt-5 p-3" style={{ borderRadius: '8px', backgroundColor: '#fafafa'}}>
                              <div className="mb-4" style={{fontFamily:'Inter', fontSize:'14px', fontWeight:'500', color:'#9D4141'}}>LOCATION ON MAP</div>
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
                              color: '#9D4141',
                            }}
                            >
                            View Location On Map
                          </div>
                          </div>
                          </div>
                        </div>
                      </fieldset>

                      {/* Additional Details */}
                      {/* <fieldset
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
                          ADDITIONAL DETAILS
                        </legend>
                        <div className="card-body card responsive-card p-md-10 p-3">
                          <div className="row g-3">
                            
                          </div>
                        </div>
                      </fieldset> */}

                      {/* Other Settings */}
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
                        </legend>
                        <div className="card-body card responsive-card p-md-10 p-3 d-flex flex-column gap-4">
                          {/* Status + Blacklisted */}
                          <div className="mb-3">
                            <label className="form-label">Status</label>
                            <div className="d-flex flex-wrap align-items-center gap-4">
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

                              {/* Blacklisted */}
                              <div className="d-flex align-items-center gap-2">
                                <span
                                  className="text-muted"
                                  style={{
                                    fontFamily: "Inter",
                                    fontWeight: 400,
                                    fontSize: "14px",
                                  }}
                                >
                                  Is Blacklisted?
                                </span>
                                <label className="form-check m-0">
                                  <Field
                                    type="checkbox"
                                    name="blacklisted"
                                    className="form-check-input"
                                  />
                                </label>
                              </div>
                            </div>
                          </div>

                          {/* Visibility */}
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

                          {/* Note */}
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

      <CompanyConfigForm
        show={showClientTypeModal}
        onClose={() => setShowClientTypeModal(false)}
        title="Client Type"
        type="company-type"
      />
    </>
  );
};

export default SubCompanyForm;
