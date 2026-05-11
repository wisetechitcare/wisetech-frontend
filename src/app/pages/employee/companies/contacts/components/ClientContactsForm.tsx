import React, { useState, useEffect, useMemo } from "react";
import { Modal, Form, Row, Col, Button } from "react-bootstrap";
import { Formik, Form as FormikForm, Field } from "formik";
import * as Yup from "yup";
import TextInput from "@app/modules/common/inputs/TextInput";
import DropDownInput from "@app/modules/common/inputs/DropdownInput";
import {
  getAllClientCompanies,
  createClientContact,
  updateClientContact,
  getAllContactRoleTypes,
  getClientContactById,
  getAllContactStatuses,
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
import { ContactFormValues, Branch, ContactRoleType } from "@models/companies";
import CompanyConfigMain from "../../companyConfig/CompanyConfigMain";
import CompanyConfigForm from "../../companyConfig/components/CompanyConfigForm";
import CompaniesBranchForm from "../../companies/components/CompaniesBranchForm";
import NewCompanyForm from "../../companies/components/NewCompanyForm";
import { useEventBus } from "@hooks/useEventBus";
import { Close } from "@mui/icons-material";
import { Box, IconButton, Typography } from "@mui/material";
import dayjs from "dayjs";

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
  // Dynamic validation: address fields not required on Add New Contact
  const validationSchema = useMemo(() => {
    const isAdd = !contactId;
    return Yup.object().shape({
      roleInCompany: Yup.string(),
      fullName: Yup.string().required("Full name is required"),
      phone: Yup.string(),
      email: Yup.string().email("Invalid email format"),
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
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [branchWarning, setBranchWarning] = useState('');
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


  // Create a clean initial values object for new contacts
  const emptyInitialValues: ContactFormValues = {
    companyId: "",
    branchId: "",
    roleInCompany: "",
    contactRoleId: "",
    statusId: "",
    isPrimaryContact: false,
    fullName: "",
    dob: "",
    anniversary: "",
    gender: "",
    phone: "",
    phone2: "",
    email: "",
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
    let values = key === "add-new" ? { ...emptyInitialValues, companyId: selectedCompanyId || "" } : initialData ? {
      companyId: selectedCompanyId || initialData.companyId || "",
      branchId: (initialData.branchId) ?? (initialData.branch || ""),
      roleInCompany: initialData.roleInCompany || "",
      contactRoleId: initialData.contactRoleId || "",
      statusId: initialData.statusId || "",
      isPrimaryContact: initialData.isPrimaryContact || false,
      fullName: initialData.fullName || "",
      dob: initialData.dateOfBirth ? formatDateForInput(initialData.dateOfBirth) : "",
      anniversary: initialData.anniversary ? formatDateForInput(initialData.anniversary) : "",
      gender: initialData.gender || "",
      phone: initialData.phone || "",
      phone2: initialData.phone2 || "",
      email: initialData.email || "",
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
  }, [key, initialData, contactId, contactStatuses, selectedCompanyId]);
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
      const [companiesData, roleTypesData, countriesData, branchesData, contactStatusesData] = await Promise.all([
        getAllClientCompanies(),
        getAllContactRoleTypes(),
        fetchAllCountries(),
        getAllClientBranches(),
        getAllContactStatuses(),
      ]);
      setCompanies(companiesData?.data?.companies || []);
      setContactRoleTypes(roleTypesData?.contactRoleTypes || []);
      setCountries(countriesData);
      setBranches(branchesData?.leadBranches || []);
      setContactStatuses(contactStatusesData?.data?.contactConfigs || []);
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

  const viewLocation = (latitude: string, longitude: string) => {
    if (latitude && longitude) {
      const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
      window.open(googleMapsUrl, '_blank');
    } else {
      errorConfirmation('Please enter latitude and longitude first');
    }
  };

  const handleSubmit = async (formValues: ContactFormValues) => {
    try {
      setLoading(true);

      let profilePhotoUrl: string | null = null;
      if (formValues.profilePhoto && formValues.profilePhoto instanceof File) {
        const formData = new FormData();
        formData.append("file", formValues.profilePhoto);
        const uploadResult = await uploadCompanyAsset(formData);
        const {
          data: { path },
        } = uploadResult;
        profilePhotoUrl = path;
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
        isPrimaryContact: formValues.isPrimaryContact === true ? 'true' : 'false',

        fullName: formValues.fullName,
        dateOfBirth: parseDateFromDisplay(formValues?.dob || ""),
        anniversary: parseDateFromDisplay(formValues?.anniversary || ""),
        gender: formValues.gender ? formValues.gender.toUpperCase() : null,

        phone: formValues.phone,
        phone2: formValues.phone2,
        email: formValues.email,

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
        isContactActive: formValues.isContactActive,
      };

      if (profilePhotoUrl !== null) {
        contactData.profilePhoto = profilePhotoUrl;
      }

      Object.keys(contactData).forEach((key) => {
        if (contactData[key] === undefined) {
          delete contactData[key];
        }
      });

      if (contactId) {
        await updateClientContact(contactId, contactData);
        successConfirmation("Contact updated successfully!");
      } else {
        await createClientContact(contactData);
        successConfirmation("Contact created successfully!");
      }

      eventBus.emit("clientContactUpdated");
      onClose();
    } catch (error) {
      console.error("Error saving contact:", error);
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
      <Modal
        show={show}
        onHide={onClose}
        size="xl"
        centered
        aria-labelledby="responsive-modal"
        dialogClassName="responsive-modal"
      >
        <Box sx={{ position: "relative", backgroundColor: "#F3F4F7", p: { xs: 0, md: 3 } }}>
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
          <Typography
            variant="h6"
            component="h2"
            // sx={{ mb: 3, fontWeight: 600 }}
            sx={{ fontWeight: 600, pl: { xs: 2, md: 0 }, pt: { xs: 1, md: 0 } }}
            style={{
              fontSize: "20px",
              fontFamily: "Barlow",
              fontWeight: "600",
            }}
          >
            {contactId ? "Edit Contact" : "Add New Contact"}
          </Typography>
          <Modal.Header>
          </Modal.Header>
          <Modal.Body>
            <Formik
              key={contactId ? `edit-${contactId}` : 'add-new'}
              initialValues={initialValues}
              validationSchema={validationSchema}
              onSubmit={handleSubmit}
              enableReinitialize={true}
            >
              {(formikProps) => {
                const { values, setFieldValue, errors, touched } = formikProps;

                // Sync Formik companyId when companies load
                useEffect(() => {
                  if (selectedCompanyId && companies.length > 0) {
                    setFieldValue("companyId", selectedCompanyId);
                    console.log("Auto-filling companyId:", selectedCompanyId);
                  }
                }, [selectedCompanyId, companies]);

                useEffect(() => {
                  console.log("Current Formik companyId:", values.companyId);
                  console.log("Is companies loaded:", companies.length > 0);
                }, [values.companyId, companies]);

                return (
                  <FormikForm placeholder="">
                    {/* Profile Photo */}
                    <div className="mb-3 text-start">
                      <div className="d-flex align-items-start justify-content-start">
                        <label
                          htmlFor="profilePhotoInput"
                          style={{ cursor: "pointer" }}
                        >
                          <div
                            className="rounded-circle bg-light d-flex align-items-center justify-content-center"
                            style={{
                              width: "100px",
                              height: "100px",
                              overflow: "hidden",
                            }}
                          >
                            {profilePhotoPreview ? (
                              <img
                                src={profilePhotoPreview}
                                alt="Preview"
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                }}
                              />
                            ) : (
                              <i className="fas fa-user text-muted fs-1"></i>
                            )}
                          </div>
                        </label>
                      </div>
                      <small className="text-muted ms-5">Profile Photo</small>
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
                        style={{ display: "none" }} // hide the input box
                      />
                    </div>

                    {/* Company Details */}
                    <div className="mb-4">
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
                          COMPANY DETAILS
                        </legend>
                        <div className="card-body card responsive-card p-md-10 p-3 ">
                          <Row>
                            <Col md={6}>
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
                            <Col md={6}>
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
                                  color: s.color,
                                }))}
                                showColor={true}
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
                                    ? {
                                      value: values.statusId,
                                      label:
                                        contactStatuses.find(
                                          (s) => s.id === values.statusId
                                        )?.name || "",
                                      color:
                                        contactStatuses.find(
                                          (s) => s.id === values.statusId
                                        )?.color || "",
                                    }
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
                            <div className="d-flex align-items-center gap-2">
                              <label
                                className="form-check-label"
                                htmlFor="activeContactToggle"
                              >
                                Is Contact Active
                              </label>
                              <div className="form-check form-switch m-0">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  role="switch"
                                  id="activeContactToggle"
                                  checked={values.isContactActive}
                                  onChange={(e) =>
                                    setFieldValue("isContactActive", e.target.checked)
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </fieldset>
                    </div>

                    {/* Personal Details */}
                    <div className="mb-4">
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
                          PERSONAL DETAILS
                        </legend>
                        <div className="card-body card responsive-card p-md-10 p-3 ">
                          <Row>
                            <Col md={6}>
                              <TextInput
                                label="Full Name"
                                placeholder="Enter full name"
                                isRequired={true}
                                formikField="fullName"
                              />
                            </Col>
                            <Col md={6}>
                              <DateInput
                                formikField="dob"
                                isRequired={false}
                                formikProps={formikProps}
                                inputLabel="Date Of Birth"
                                placeHolder="1/3/2025"
                              />
                            </Col>
                            <Col md={6}>
                              <DropDownInput
                                inputLabel="Gender"
                                placeholder="Select gender"
                                formikField="gender"
                                options={genderOptions}
                                onChange={(value) => {
                                  const genderValue =
                                    value &&
                                      typeof value === "object" &&
                                      "value" in value
                                      ? value.value
                                      : value;
                                  setFieldValue("gender", genderValue);
                                }}
                                value={
                                  values.gender
                                    ? {
                                      value: values.gender,
                                      label:
                                        genderOptions.find(
                                          (g) => g.value === values.gender
                                        )?.label || "",
                                    }
                                    : null
                                }
                                isRequired={false}
                              />
                            </Col>
                            <Col md={6}>
                              <DateInput
                                formikField="anniversary"
                                isRequired={false}
                                formikProps={formikProps}
                                inputLabel="Anniversary Date"
                                placeHolder="1/3/2025"
                              />
                            </Col>
                          </Row>
                        </div>
                      </fieldset>
                    </div>

                    <div className="mb-4">
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
                            color: "#b82525ff",
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
                          <Row className="">
                            <Col md={4}>
                              <TextInput
                                label="Phone"
                                placeholder="Enter phone"
                                isRequired={false}
                                formikField="phone"
                                inputValidation="numbers"
                              />
                            </Col>
                            <Col md={4}>
                              <TextInput
                                label="Phone 2"
                                placeholder="Enter phone 2"
                                formikField="phone2"
                                isRequired={false}
                                inputValidation="numbers"
                              />
                            </Col>
                            <Col md={4}>
                              <TextInput
                                label="Email"
                                placeholder="Enter email"
                                isRequired={false}
                                formikField="email"
                              />
                            </Col>
                          </Row>
                        </div>
                      </fieldset>
                    </div>

                    {/* Address */}
                    <div className="mb-4">
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
                          ADDRESS
                        </legend>
                        <div className="card-body card responsive-card p-md-10 p-3 ">
                          <Row className="">
                            <Col md={6}>
                              <TextInput
                                label="Address"
                                placeholder="address"
                                formikField="address"
                                isRequired={false}
                              />
                            </Col>
                            <Col md={6}>
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
                                  setSelectedCountry(option?.value || "");
                                  setSelectedState("");
                                  if (option?.value) {
                                    handleCountryChange(option.value);
                                  }
                                }}
                                value={
                                  selectedCountry
                                    ? {
                                      label:
                                        countries.find(
                                          (c) => c.id === selectedCountry
                                        )?.name || "",
                                      value: selectedCountry,
                                    }
                                    : null
                                }
                              />
                            </Col>
                            <Col md={6}>
                              <DropDownInput
                                formikField="state"
                                inputLabel="State"
                                options={selectedCountry ? states.map((s) => ({
                                  label: s.name,
                                  value: s.id,
                                })) : []}
                                placeholder={!selectedCountry ? "Please select country first" : "Select State"}
                                isRequired={false}
                                onChange={(option: any) => {
                                  setFieldValue("state", option?.value || "");
                                  setFieldValue("city", "");
                                  setSelectedState(option?.value || "");
                                  if (option?.value && selectedCountry) {
                                    handleStateChange(
                                      selectedCountry,
                                      option.value
                                    );
                                  }
                                }}
                                value={
                                  selectedState
                                    ? {
                                      label:
                                        states.find(
                                          (s) => s.id === selectedState
                                        )?.name || "",
                                      value: selectedState,
                                    }
                                    : null
                                }
                              />
                            </Col>
                            <Col md={6}>
                              <DropDownInput
                                formikField="city"
                                inputLabel="City"
                                options={selectedState ? [
                                  ...cities.map((c) => ({
                                    label: c.name,
                                    value: c.id,
                                  })),
                                  // Add custom city if it's not in the list
                                  ...(values.city &&
                                    !cities.find((c) => c.id === values.city)
                                    ? [
                                      {
                                        label: values.city,
                                        value: values.city,
                                      },
                                    ]
                                    : []),
                                ] : []}
                                placeholder={!selectedState ? "Please select state first" : "Select City"}
                                isRequired={false}
                                onChange={(option: any) =>
                                  setFieldValue("city", option?.value || "")
                                }
                                value={
                                  values.city
                                    ? {
                                      label:
                                        cities.find(
                                          (c) => c.id === values.city
                                        )?.name || values.city,
                                      value: values.city,
                                    }
                                    : null
                                }
                              />
                            </Col>
                          </Row>
                          <Row>
                            <Col md={6} className="mt-3">
                              <TextInput
                                label="Locality"
                                placeholder="Enter locality"
                                formikField="area"
                                isRequired={false}
                              />
                            </Col>
                            <Col md={6} className="mt-3">
                              <TextInput
                                label="Zip Code"
                                placeholder="Enter zip code"
                                formikField="zipCode"
                                isRequired={false}
                              />
                            </Col>
                          </Row>
                          <div className="mt-5 p-3" style={{ borderRadius: '8px', backgroundColor: '#9fd491' }}>
                            <div className="mb-4" style={{ fontFamily: 'Inter', fontSize: '14px', fontWeight: '500', color: '#0D47A1' }}>LOCATION ON MAP</div>
                            <Row>
                              <Col md={3}>
                                <TextInput
                                  label="Google Map Link"
                                  placeholder="Enter google map link"
                                  formikField="googleMapLink"
                                  isRequired={false}
                                />
                              </Col>
                              <Col md={3}>
                                <TextInput
                                  label="Google Business Link"
                                  placeholder="Enter google Business link"
                                  formikField="gmbLink"
                                  isRequired={false}
                                />
                              </Col>
                              <Col md={3}>
                                <TextInput
                                  label="Latitude"
                                  placeholder="Enter latitude"
                                  formikField="latitude"
                                  isRequired={false}
                                  inputValidation="decimal"
                                />
                              </Col>
                              <Col md={3}>
                                <TextInput
                                  label="Longitude"
                                  placeholder="Enter longitude"
                                  formikField="longitude"
                                  isRequired={false}
                                  inputValidation="decimal"
                                />
                              </Col>
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
                            </Row>
                          </div>
                        </div>
                      </fieldset>
                    </div>

                    {/* Portal */}
                    <div className="mb-4">
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
                          PORTAL
                        </legend>
                        <div className="card-body card responsive-card p-md-10 p-3 ">
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
                              <label className="form-label">Note</label>
                              <Field
                                as="textarea"
                                name="note"
                                className="form-control"
                                rows={3}
                                placeholder="Enter note"
                              />
                            </div>
                          </Row>
                        </div>
                      </fieldset>
                    </div>

                    {/* Submit Buttons */}
                    <div className="d-flex justify-content-start gap-2">
                      <Button
                        type="submit"
                        variant="primary"
                        disabled={loading}
                      >
                        {loading ? "Saving..." : "Submit"}
                      </Button>
                    </div>
                  </FormikForm>
                );
              }}
            </Formik>
          </Modal.Body>
        </Box>
      </Modal>
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
