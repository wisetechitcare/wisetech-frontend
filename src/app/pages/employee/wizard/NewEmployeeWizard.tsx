import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Modal } from "react-bootstrap";
import { Form, Formik, FormikValues } from "formik";
import * as Yup from 'yup';
import { StepperComponent } from "@metronic/assets/ts/components";
import { KTIcon } from "@metronic/helpers";
import { PageLink, PageTitle } from "@metronic/layout/core";
import { uploadUserAsset } from "@services/uploader";
// import Step1 from "./steps/Step1"; // Commented out - wizard now starts at Personal Details
import Step2 from "./steps/Step2";
import Step3 from "./steps/Step3";
import Step4 from "./steps/Step4";
import { createNewUser, updateUser, archiveUser } from "@services/users";
import { createAddressDetails, createBankDetails, createDocumentsDetails, createEducationalDetails, createEmergencyContacts, createEmergencyDetails, createNewEmployee, createPreviousExperienceDetails, createRejoinHistoryDetails, fetchWizardData, updateAddressDetails, updateBankDetails, updateDocumentDetails, updateEducationalDetails, updateEmergencyContact, updateEmergencyDetails, updateEmployee, updateEmployeeRolesById, updateOnboardingDocumentDetailsById, updatePreviousExpDetails, updateRejoinHistoryDetails, deleteAllRejoinHistoryByEmployeeId } from "@services/employee";
import { fetchCompanyOverview } from "@services/company";
import { successConfirmation, errorConfirmation } from "@utils/modal";
import { employeeOnBardingFormRegexes } from "@constants/regex";

const newEmployeeWizardSchema = [
  // Step 1 commented out - wizard now starts at Personal Details
  // Yup.object({
  //   method: Yup.string().required().label('Method'),
  // }),
  Yup.object({
    avatar: Yup.string(),
    firstName: Yup.string().required('First name is required')
      .min(4, 'First name must be at least 4 characters')
      .max(20, 'First name must be at most 20 characters')
      .matches(employeeOnBardingFormRegexes["firstName"], 'First name can only contain alphabetic characters'),
    lastName: Yup.string().required().label('Last Name')
      .min(4, 'Last name must be at least 4 characters')
      .max(20, 'Last name must be at most 20 characters')
      .matches(employeeOnBardingFormRegexes["lastName"], 'Last name can only contain alphabetic characters'),
    nickName: Yup.string(),
    gender: Yup.string().required().label('Gender'),
    maritalStatus: Yup.string().label('Marital Status'),
    dateOfBirth: Yup.string().required().label('Date Of Birth'),
    anniversary: Yup.string().label('Anniversary Date'),
    bloodGroup: Yup.string().label('Blood Group'),
    personalEmailId: Yup.string().email().required().label('Personal Email Address')
      .matches(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Invalid email address'),
    personalPhoneNumber: Yup.string().required().label('Personal Phone Number')
      .min(10, 'Phone Number must be at least 10 characters')
      .max(20, 'Phone Number must be at most 20 characters')
      .matches(employeeOnBardingFormRegexes["personalPhoneNumber"], 'Phone Number can only contain numeric characters'),
    personalPhoneNumberExtension: Yup.string().label('Personal Phone Number Extension'),
    alternatePhoneNumber: Yup.string().label('Alternate Phone Number')
      .min(10, 'Phone Number must be at least 10 characters')
      .max(20, 'Phone Number must be at most 20 characters')
      .matches(employeeOnBardingFormRegexes["alternatePhoneNumber"], 'Phone Number can only contain numeric characters'),
    meal: Yup.string().label('Meal'),
    educationalInfo: Yup.array().of(Yup.object({
      instituteName: Yup.string().label('Institute Name')
        .min(4, 'Institute Name must be at least 4 characters')
        .max(20, 'Institute Name must be at most 20 characters'),
      degree: Yup.string().label('Degree')
        .min(2, 'Degree Name must be at least 2 characters')
        .max(20, 'Degree Name must be at most 20 characters'),
      specialization: Yup.string().label('Specialization'),
      fromDate: Yup.string().required().label('Date Started'),
      toDate: Yup.string().required().label('Date Ended'),
      filePath: Yup.string().label('Upload Certificate'),
    })).required(),
    familyInfo: Yup.array().of(Yup.object({
      name: Yup.string().label('Family Member Name')
        .min(4, 'Family Member name must be at least 4 characters')
        .max(20, 'Family Member name must be at most 20 characters')
        .matches(employeeOnBardingFormRegexes['familyInfo.name'], 'Family Member name can only contain alphabetic characters'),
      relationship: Yup.string().label('Member Relationship')
        .min(3, 'Member Relationship name must be at least 3 characters')
        .max(20, 'Member Relationship name must be at most 20 characters')
        .matches(employeeOnBardingFormRegexes['familyInfo.relationship'], 'Member Relationship name can only contain alphabetic characters'),
      mobileNumber: Yup.string().label('Member Phone Number')
        .min(10, 'Phone Number must be at least 10 characters')
        .max(20, 'Phone Number must be at most 20 characters')
        .matches(employeeOnBardingFormRegexes['familyInfo.mobileNumber'], 'Phone Number can only contain numeric characters'),
      dateOfBirth: Yup.string().label('Date of Birth'),
    })).required().label('Family info'),
    emergencyDetails: Yup.object({
      bloodGroup: Yup.string().label('Blood Group'),
      allergies: Yup.string().label('Allergies')
        .max(100, 'Allergies must be at most 100 characters'),
      emergencyContactName: Yup.string().label('Emergency Contact Name')
        .min(4, 'Emergency Contact name must be at least 4 characters')
        .max(100, 'Emergency Contact name must be at most 100 characters')
        .matches(employeeOnBardingFormRegexes['emergencyDetails.emergencyContactName'], 'Emergency Contact name can only contain alphabetic characters'),
      emergencyContactNumber: Yup.string().label('Emergency Contact Number')
        .min(10, 'Phone Number must be at least 10 characters')
        .max(20, 'Phone Number must be at most 20 characters')
        .matches(employeeOnBardingFormRegexes['emergencyDetails.emergencyContactNumber'], 'Phone Number can only contain numeric characters'),
    }).required(),
    bankInfo: Yup.object({
      accountName: Yup.string().label('Account Holder Name')
        .min(4, 'Account Holder name must be at least 4 characters')
        .max(20, 'Account Holder name must be at most 20 characters')
        .matches(employeeOnBardingFormRegexes['bankInfo.accountName'], 'Account Holder name can only contain alphabetic characters'),
      accountNumber: Yup.string().label('Account Number')
        .min(8, 'Account Number must be at least 8 characters')
        .max(20, 'Account Number must be at most 20 characters')
        .matches(employeeOnBardingFormRegexes['bankInfo.accountNumber'], 'Account Number can only contain numeric characters'),
      ifscCode: Yup.string().label('IFSC Code'),
      filePath: Yup.string().label('Upload Bank Proof'),
    }).required(),
    addressInfo: Yup.object({
      permanentAddressLine1: Yup.string().label('Address Line 1')
        .min(8, 'Address Line must be at least 8 characters'),
      permanentAddressLine2: Yup.string().label('Address Line 2')
        .min(8, 'Address Line must be at least 8 characters'),
      permanentCountry: Yup.string().label('Country'),
      permanentState: Yup.string().label('State'),
      permanentCity: Yup.string().label('City'),
      permanentPostalCode: Yup.string().label('Postal Code')
        .min(4, 'Postal Code must be at least 4 characters')
        .max(16, 'Postal Code must be at most 16 characters')
        .matches(employeeOnBardingFormRegexes['addressInfo.permanentPostalCode'], 'Postal Code can only contain numeric characters'),
      presentAddressLine1: Yup.string(),
      presentAddressLine2: Yup.string(),
      presentCountry: Yup.string(),
      presentState: Yup.string(),
      presentCity: Yup.string(),
      presentPostalCode: Yup.string(),
    }).required(),
  }),
  Yup.object({
    designationId: Yup.string().required().label('Job Profile'),
    departmentId: Yup.string().required().label('Department'),
    branchId: Yup.string().required().label('Branch'),
    employeeTypeId: Yup.string().label('Employee Type (Old)'),
    employeeTypeConfigId: Yup.string().optional().label('Employee Type'),
    workingMethodId: Yup.string().required().label('Working Method'),
    companyEmailId: Yup.string().required().label('Company Email Address')
      .matches(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Invalid email address'),
    companyPhoneNumber: Yup.string().required().label('Company Phone Number')
      .min(10, 'Phone Number must be at least 10 characters')
      .max(20, 'Phone Number must be at most 20 characters')
      .matches(employeeOnBardingFormRegexes['companyPhoneNumber'], 'Phone Number can only contain numeric characters'),
    companyPhoneExtension: Yup.string().required().label('Company Phone Extension'),
    sourceOfHireId: Yup.string().required().label('Source Of Hire'),
    referredById: Yup.string(),
    dateOfJoining: Yup.string().required().label('Date Of Joining'),
    dateOfExit: Yup.string(),
    rejoinHistory: Yup.array().of(Yup.object({
      dateOfReJoining: Yup.string(),
      dateOfReExit: Yup.string(),
      reason: Yup.string(),
    })),
    employeeStatusId: Yup.string().label('Employee Status (Old)'),
    employeeStatusConfigId: Yup.string().label('Employee Status'),
    ctcInLpa: Yup.string().required().label('CTC In LPA'),
    workExpInfo: Yup.array().of(Yup.object({
      companyName: Yup.string().required().label('Company Name'),
      jobTitle: Yup.string().required().label('Job Title'),
      fromDate: Yup.string().required().label('From Date'),
      toDate: Yup.string().required().label('To Date')
    })),
    appRole: Yup.string().required().label('App Role'),
  }),
  Yup.object({
    obj: Yup.string(),
    documentInfo: Yup.array().of(Yup.object({
      fileName: Yup.string(),
      identityNumber: Yup.string(),
      path: Yup.string(),
      documentId: Yup.string(),
      employeeId: Yup.string(),
    }))
  })
];

const initialState = {
  method: "0", // Default method set to "0" since Step1 is now skipped
  avatar: "",
  firstName: "",
  isAdmin: "0",
  isEmployeeActive: "1",
  lastName: "",
  nickName: "",
  gender: "",
  maritalStatus: "",
  reportsToId: "",
  dateOfBirth: "",
  bloodGroup: "",
  personalEmailId: "",
  personalPhoneNumber: "",
  alternatePhoneNumber: "",
  personalPhoneNumberExtension: "",
  linkedInProfileUrl: "",
  instagramProfileUrl: "",
  facebookProfileUrl: "",
  hobbies: "",
  notes: "",
  meal: "",
  educationalInfo: [{
    instituteName: "",
    degree: "",
    specialization: "",
    fromDate: "",
    toDate: "",
    filePath: "",
  }],
  familyInfo: [{
    name: "",
    relationship: "",
    mobileNumber: "",
    dateOfBirth: "",
  }],
  emergencyDetails: {
    bloodGroup: "",
    allergies: "",
    emergencyContactName: "",
    emergencyContactNumber: "",
  },
  bankInfo: {
    accountName: "",
    accountNumber: "",
    ifscCode: "",
    filePath: "",
  },
  addressInfo: {
    permanentAddressLine1: "",
    permanentAddressLine2: "",
    permanentCountry: "",
    permanentState: "",
    permanentCity: "",
    permanentPostalCode: "",
    presentAddressLine1: "",
    presentAddressLine2: "",
    presentCountry: "",
    presentState: "",
    presentCity: "",
    presentPostalCode: "",
  },
  designationId: "",
  departmentId: "",
  branchId: "",
  teamId: "",
  roomOrBlock: "",
  employeeTypeId: "",
  employeeTypeConfigId: "",
  workingMethodId: "",
  shift: "",
  experienceLevel: "",
  employeeLevelId: "",
  companyEmailId: "",
  companyPhoneNumber: "",
  companyPhoneExtension: "",
  sourceOfHire: "",
  referredBy: "",
  dateOfJoining: "",
  dateOfExit: "",
  rejoinHistory: [{
    dateOfReJoining: "",
    dateOfReExit: "",
    reason: "",
  }],
  employeeStatusId: "",
  employeeStatusConfigId: "",
  ctcInLpa: "",
  appRole: "",
  attendanceRequestRaiseLimit: "",
  allowedPerMonth: 1,
  allowOverTime: "0",
  discretionaryLeaveBoolean: "false",
  discretionaryLeaveBalance: 0,
  leaveAllocations: [] as any[],
  workExpInfo: [{
    companyName: "",
    jobTitle: "",
    fromDate: "",
    toDate: ""
  }],
  documentInfo: [{
    identityNumber: "",
    employeeId: "",
    documentId: "",
    path: "",
    fileName: "",
  }],
  roles: [] as any[]
}

const newEmployeeWizardBreadcrumb: Array<PageLink> = [
  {
    title: 'Employee Management',
    path: '/employees',
    isSeparator: false,
    isActive: false,
  },
  {
    title: '',
    path: '',
    isSeparator: true,
    isActive: false,
  },
]

const saveNewUser = async (values: any) => {
  const { firstName, lastName, dateOfBirth, appRole, personalPhoneNumber, personalEmailId, alternatePhoneNumber, personalPhoneNumberExtension, isEmployeeActive, bloodGroup, hobbies, notes, linkedInProfileUrl, instagramProfileUrl, facebookProfileUrl } = values;
  const user = {
    firstName,
    lastName,
    isActive: isEmployeeActive === "1" ? true : false,
    isAdmin: false,
    // isAdmin: appRole.toLowerCase() === "admin" ? true : false,
    dateOfBirth,
    ...(personalPhoneNumber && { personalPhoneNumber }),
    ...(personalEmailId && { personalEmailId }),
    ...(personalPhoneNumberExtension && { personalPhoneNumberExtension }),
    ...(alternatePhoneNumber && { alternatePhoneNumber }),
    ...(bloodGroup && { bloodGroup }),
    ...(notes && { notes }),
    ...(hobbies && { hobbies: values.hobbies }),
    ...(linkedInProfileUrl && { linkedInProfileUrl }),
    ...(instagramProfileUrl && { instagramProfileUrl }),
    ...(facebookProfileUrl && { facebookProfileUrl }),
  };
  console.log("appRole:: ", appRole);
  if(!appRole){
    errorConfirmation("Please select a user role");
    return false;
  }
  const { data: { id: savedUserId } } = await createNewUser(user);

  return savedUserId;
};

const saveNewEmployee = async (values: any, userId: string) => {  
  const { data: { companyOverview } } = await fetchCompanyOverview();
  const companyId = companyOverview[0].id;
  let vegMealPreference = undefined;
  let nonVegMealPreference = undefined;
  let veganMealPreference = undefined;

  const { dateOfJoining, ctcInLpa, gender, designationId, branchId, dateOfExit, employeeTypeId, employeeTypeConfigId, maritalStatus, sourceOfHireId,
    workingMethodId, departmentId, companyEmailId, referredById, method, nickName, employeeCode, companyPhoneNumber,
    companyPhoneExtension, employeeStatusId, employeeStatusConfigId, avatar, meal, reportsToId, anniversary, documentFields, documentInfo, appRole, isAdmin, rejoinHistory,
    teamId, roomOrBlock, shift, experienceLevel, employeeLevelId, discretionaryLeaveBoolean, discretionaryLeaveBalance, attendanceRequestRaiseLimit, allowedPerMonth, allowOverTime
  } = values;

  let { aadharCardPath, panCardPath, aadharNumber, panNumber } = values;
    
  const aadharCardDocument = values?.documentFields?.filter((doc: any) => doc?.fieldName?.toLowerCase().trim().replace(' ', '') === "aadharcard");
  const aadharDocumentId = aadharCardDocument?.[0]?.id;
  const panCardDocument = values?.documentFields?.filter((doc: any) => doc?.fieldName?.toLowerCase().trim().replace(' ', '') === "pancard");
  const panDocumentId = panCardDocument?.[0]?.id;
  
  if(documentInfo && documentInfo?.findIndex((doc: any) => doc?.documentId === aadharDocumentId) !== -1){
    const mostRecentAadharDoc = documentInfo?.filter((doc: any) => doc?.documentId === aadharDocumentId)?.sort((doc1: any, doc2: any) => new Date(doc2.createdAt).getTime() - new Date(doc1.createdAt).getTime())[0];
    aadharCardPath = mostRecentAadharDoc?.path;
    aadharNumber = mostRecentAadharDoc?.identityNumber;
  }
  if(documentInfo && documentInfo?.findIndex((doc: any) => doc?.documentId === panDocumentId) !== -1){
    const mostRecentPanDoc = documentInfo?.filter((doc: any) => doc?.documentId === panDocumentId)?.sort((doc1: any, doc2: any) => new Date(doc2.createdAt).getTime() - new Date(doc1.createdAt).getTime())[0];
    panCardPath = mostRecentPanDoc?.path;
    panNumber = mostRecentPanDoc?.identityNumber;
  }

  if (meal === "0") vegMealPreference = true;
  if (meal === "1") nonVegMealPreference = true;
  if (meal === "2") veganMealPreference = true;

  const employee = {
    ...(avatar && { avatar }),
    userId,
    isActive: true,
    ...(employeeTypeId && { employeeTypeId }), // Old field (optional for backward compatibility)
    ...(employeeTypeConfigId && { employeeTypeConfigId }), // New field for employee_configurations
    sourceOfHireId,
    ...(employeeStatusId && { employeeStatusId }), // Old field (optional for backward compatibility)
    ...(employeeStatusConfigId && { employeeStatusConfigId }), // New field for employee_configurations
    companyId,
    method: parseInt(method),
    dateOfJoining,
    gender: parseInt(gender),
    ...(isAdmin && { isAdmin: isAdmin == "1" ? true : false }),
    ...(branchId && { branchId}),
    ...(anniversary && { anniversary }),
    reportsToId,
    ...(aadharNumber && { aadharNumber }),
    ...(aadharCardPath && { aadharCardPath }),
    ...(panNumber && { panNumber }),
    ...(panCardPath && { panCardPath }),
    ...(workingMethodId && { workingMethodId }),
    ...(departmentId && { departmentId }),
    ...(ctcInLpa && { ctcInLpa }),
    ...(designationId && { designationId }),
    ...(maritalStatus && { maritalStatus: parseInt(maritalStatus) }),
    ...(companyEmailId && { companyEmailId }),
    ...(referredById && { referredById }),
    ...(companyPhoneNumber && { companyPhoneNumber }),
    ...(companyPhoneExtension && { companyPhoneExtension }),
    ...(employeeCode && { employeeCode }),
    ...(nickName && { nickName }),
    ...(dateOfExit && { dateOfExit }),
    ...(vegMealPreference && { vegMealPreference }),
    ...(nonVegMealPreference && { nonVegMealPreference }),
    ...(veganMealPreference && { veganMealPreference }),
    ...(teamId && { teamId }),
    ...(roomOrBlock && { roomOrBlock }),
    ...(shift && { shift }),
    ...(experienceLevel && { experienceLevel }),
    ...(employeeLevelId && { employeeLevelId }),
    ...(attendanceRequestRaiseLimit && { attendanceRequestRaiseLimit }),
    ...(allowedPerMonth && { allowedPerMonth }),
    ...(allowOverTime && { allowOverTime }),
    // Discretionary leave: always send boolean, only send balance if true
    discretionaryLeaveBoolean: discretionaryLeaveBoolean === "true" || discretionaryLeaveBoolean === true,
    ...((discretionaryLeaveBoolean === "true" || discretionaryLeaveBoolean === true) && discretionaryLeaveBalance && {
      discretionaryLeaveBalance: parseInt(discretionaryLeaveBalance) || 0
    }),
    // Always send leaveAllocations so the backend can replace-all (including resets to default).
    ...(Array.isArray(values.leaveAllocations) && {
      leaveAllocations: values.leaveAllocations
    })
  };
  // Clean up empty values but preserve gender, maritalStatus, and discretionaryLeaveBoolean (even if 0 or false)
  Object.keys(employee).forEach((key) => {
    if (key === 'gender' || key === 'maritalStatus' || key === 'discretionaryLeaveBoolean') return;
    if (!employee[key] && employee[key] !== 0 && employee[key] !== false) {
      delete employee[key];
    }
  });

  // IMPORTANT: Remove config fields to prevent foreign key errors if empty
  if (!employee.employeeTypeConfigId) {
    delete employee.employeeTypeConfigId;
  }
  if (!employee.employeeStatusConfigId) {
    delete employee.employeeStatusConfigId;
  }

  const { data: { id: savedEmployeeId } } = await createNewEmployee(employee);

  return savedEmployeeId;
};

const saveEmployeeData = async (values: any, employeeId: string) => {
  const { workExpInfo, addressInfo, bankInfo, familyInfo, documentInfo: documents, educationalInfo, rejoinHistory, emergencyDetails } = values;

  try {
    const isSameAddress = addressInfo.permanentAddressLine1 === addressInfo.presentAddressLine1;
    const reqPromises = [
      () => createPreviousExperienceDetails(workExpInfo.map((el: any) => ({
        ...(el.companyName && { companyName: el.companyName }),
        ...(el.jobTitle && { jobTitle: el.jobTitle }),
        ...(el.fromDate && { fromDate: el.fromDate }),
        ...(el.toDate && { toDate: el.toDate }),
        employeeId
      }))),
      () => createRejoinHistoryDetails(rejoinHistory.filter((el: any) => el.dateOfReJoining || el.dateOfReExit || el.reason).map((el: any) => ({
        ...(el.dateOfReJoining && { dateOfReJoining: el.dateOfReJoining }),
        ...(el.dateOfReExit && { dateOfReExit: el.dateOfReExit }),
        ...(el.reason && { reason: el.reason }),
        employeeId
      }))),
      () => createEmergencyContacts(familyInfo.map((el: any) => ({
        ...(el.name && { name: el.name }),
        ...(el.mobileNumber && { mobileNumber: el.mobileNumber }),
        ...(el.dateOfBirth && { dateOfBirth: el.dateOfBirth }),
        ...(el.relationship && { relation: el.relationship }),
        employeeId
      }))),
      () => createEducationalDetails(educationalInfo.map((el: any) => ({
        ...(el.instituteName && { instituteName: el.instituteName }),
        ...(el.degree && { degree: el.degree }),
        ...(el.specialization && { specialization: el.specialization }),
        ...(el.filePath && { filePath: el.filePath }),
        ...(el.fromDate && { fromDate: el.fromDate }),
        ...(el.toDate && { toDate: el.toDate }),
        employeeId
      }))),
      () => createAddressDetails({
        ...addressInfo, employeeId, ...(isSameAddress && {
          presentAddressLine1: undefined,
          presentAddressLine2: undefined,
          presentCountry: undefined,
          presentState: undefined,
          presentCity: undefined,
          presentPostalCode: undefined,
        })
      }),
      () => createBankDetails({
        ...(bankInfo.accountNumber && { accountNumber: bankInfo.accountNumber }),
        ...(bankInfo.accountName && { accountName: bankInfo.accountName }),
        ...(bankInfo.ifscCode && { ifscCode: bankInfo.ifscCode }),
        ...(bankInfo.filePath && { filePath: bankInfo.filePath }),
        employeeId
      }),
      () => createEmergencyDetails({
        ...(emergencyDetails.bloodGroup && { bloodGroup: emergencyDetails.bloodGroup }),
        ...(emergencyDetails.allergies && { allergies: emergencyDetails.allergies }),
        ...(emergencyDetails.emergencyContactName && { emergencyContactName: emergencyDetails.emergencyContactName }),
        ...(emergencyDetails.emergencyContactNumber && { emergencyContactNumber: emergencyDetails.emergencyContactNumber }),
        employeeId
      }),
      () => createDocumentsDetails(documents.map((el: any) => ({ ...el, employeeId })))
    ];
    
    const responses = await Promise.all(reqPromises.map(fn => fn()));
    const allSuccessful = responses.every(response => response?.statusCode === 200);
    // debugger;
    if (!allSuccessful) {
      throw new Error('Some operations failed to complete successfully');
    }
    return true;
  }
  catch (err) {
    console.log(err);
  }
}

function NewEmployeeWizard({ editMode, openModal }: any) {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const stepperRef = useRef<HTMLDivElement | null>(null);
  const [stepper, setStepper] = useState<StepperComponent | null>(null);
  const [currentSchema, setCurrentSchema] = useState(newEmployeeWizardSchema[0]);
  const [show, setShow] = useState(openModal);
  const [files, setFiles] = useState<{ [key: string]: File }>({});
  const [defaultState, setDefaultState] = useState(initialState);


  const addFileToState = (documentId: string, file: File) => {
    setFiles((prevFiles: any) => ({
      ...prevFiles,
      [documentId]: file
    }));
  };

  const loadStepper = () => {
    setStepper(StepperComponent.createInsance(stepperRef.current as HTMLDivElement));
  };

  const prevStep = () => {
    if (!stepper) {
      return
    }

    stepper.goPrev();

    setCurrentSchema(newEmployeeWizardSchema[stepper.currentStepIndex - 1]);
  };

  const updateWizardData = async (values: any) => {
    const { data: { companyOverview } } = await fetchCompanyOverview();
    const companyId = companyOverview[0].id;
    const { userId, firstName, lastName, dateOfBirth, appRole, personalPhoneNumber, personalEmailId, alternatePhoneNumber, personalPhoneNumberExtension, isEmployeeActive, bloodGroup, hobbies, notes, linkedInProfileUrl, instagramProfileUrl, facebookProfileUrl } = values;

    // console.log("approle::", appRole);

    const documentPromise = Object.keys(files).map(async (docId) => {
      const fileData = files[docId];
      const formData = new FormData();
      formData.append('file', fileData);

      // Get field name from documentFields and convert to dash-separated format
      const docField = values.documentFields?.find((field: any) => field.id === docId);
      const fieldName = docField?.fieldName || docId;
      // Convert "Aadhar Card" to "aadhar-card"
      const baseName = fieldName.toLowerCase().replace(/\s+/g, '-');
      // Get file extension from uploaded file (e.g., .pdf, .jpg)
      const extension = fileData.name.split('.').pop();
      const fileName = extension ? `${baseName}.${extension}` : baseName;

      // All onboarding files (including profile picture) go to onboarding-docs folder
      const category = 'onboarding-docs';
      const response = await uploadUserAsset(formData, userId, fileName, category);
      return {
        documentId: docId,
        path: response.data.path,
        fileName: fileName, // Use renamed fileName instead of original fileData.name
      };
    });

    const documentInfo = values.documentInfo;
    const documentUploaded = await Promise.all(documentPromise);

    const filteredDocs = documentUploaded.filter((doc: any) => doc.documentId !== 'userProfilePicture');
    documentUploaded.forEach((doc: any) => (doc.documentId === 'userProfilePicture' ? values.avatar = doc.path : null));

    // Update existing documentInfo with file paths from uploads (edit mode)
    const doc = documentInfo.map((docInfo: any) => {
      // Find the corresponding uploaded file by documentId
      const uploadedFile = filteredDocs.find((uploadedDoc: any) => uploadedDoc.documentId === docInfo.documentId);
      return {
        ...docInfo, // Keep original data including identityNumber
        ...(uploadedFile && { 
          path: uploadedFile.path,
          fileName: uploadedFile.fileName 
        }) // Add file info only if file was uploaded
      };
    });
    
    values.documentInfo = doc;

    let vegMealPreference = undefined;
    let nonVegMealPreference = undefined;
    let veganMealPreference = undefined;

    const userPayload = {
      firstName,
      lastName,
      isActive: isEmployeeActive === "1" ? true : false,
      ...(dateOfBirth && { dateOfBirth }),
      ...(personalPhoneNumber && { personalPhoneNumber }),
      ...(personalEmailId && { personalEmailId }),
      ...(personalPhoneNumberExtension && { personalPhoneNumberExtension }),
      ...(alternatePhoneNumber && { alternatePhoneNumber }),
      ...(bloodGroup && { bloodGroup }),
      ...(hobbies && { hobbies: values.hobbies }),
      ...(notes && { notes: values.notes }),
      ...(linkedInProfileUrl && { linkedInProfileUrl }),
      ...(instagramProfileUrl && { instagramProfileUrl }),
      ...(facebookProfileUrl && { facebookProfileUrl }),
    };

    const { employeeId, dateOfJoining, ctcInLpa, gender, designationId, branchId, dateOfExit, employeeTypeId, employeeTypeConfigId, maritalStatus, sourceOfHireId,
      workingMethodId, departmentId, companyEmailId, referredById, method, nickName, employeeCode, companyPhoneNumber,
      companyPhoneExtension, employeeStatusId, employeeStatusConfigId, avatar, meal, anniversary, reportsToId, documentFields, attendanceRequestRaiseLimit, allowedPerMonth, allowOverTime, isAdmin, rejoinHistory,
      teamId, roomOrBlock, shift, experienceLevel, employeeLevelId, discretionaryLeaveBoolean, discretionaryLeaveBalance
    } = values;

    let { aadharCardPath, panCardPath, aadharNumber, panNumber, } = values;
    if(!appRole){
      errorConfirmation("Please select a user role");
      return;
    }
    try {
      const res = await updateEmployeeRolesById(employeeId, { roleIds: [appRole]})
      // console.log("resFromUpdateEmployeeRolesById", res);
    } catch (error) {
      console.log("Error while updating employee roles", error)
    }
    const aadharCardDocument = values?.documentFields?.filter((doc: any) => doc?.fieldName?.toLowerCase().trim().replace(' ', '') === "aadharcard");
    const aadharDocumentId = aadharCardDocument?.[0]?.id;
    const panCardDocument = values?.documentFields?.filter((doc: any) => doc?.fieldName?.toLowerCase().trim().replace(' ', '') === "pancard");
    const panDocumentId = panCardDocument?.[0]?.id;
    if(documentInfo && documentInfo?.findIndex((doc: any) => doc?.documentId === aadharDocumentId) !== -1){
      const mostRecentAadharDoc = documentInfo?.filter((doc: any) => doc?.documentId === aadharDocumentId)?.sort((doc1: any, doc2: any) => new Date(doc2.createdAt).getTime() - new Date(doc1.createdAt).getTime())[0];
      aadharCardPath = mostRecentAadharDoc?.path;
      aadharNumber = mostRecentAadharDoc?.identityNumber;
      if(mostRecentAadharDoc?.id && mostRecentAadharDoc?.identityNumber && mostRecentAadharDoc?.path){
        await updateDocumentDetails(mostRecentAadharDoc.id, { ...mostRecentAadharDoc, identityNumber: aadharNumber });
      }
    }

    if(documentInfo && documentInfo?.findIndex((doc: any) => doc?.documentId === panDocumentId) !== -1){
      const mostRecentPanDoc = documentInfo?.filter((doc: any) => doc?.documentId === panDocumentId)?.sort((doc1: any, doc2: any) => new Date(doc2.createdAt).getTime() - new Date(doc1.createdAt).getTime())[0];
      panCardPath = mostRecentPanDoc?.path;
      panNumber = mostRecentPanDoc?.identityNumber;
      if(mostRecentPanDoc?.id && mostRecentPanDoc?.identityNumber && mostRecentPanDoc?.path){
        await updateDocumentDetails(mostRecentPanDoc.id, { ...mostRecentPanDoc, identityNumber: panNumber });
      }
    }

    if (meal === "0") vegMealPreference = true;
    if (meal === "1") nonVegMealPreference = true;
    if (meal === "2") veganMealPreference = true;

    const employeePayload = {
      ...(avatar && { avatar }),
      id: employeeId,
      userId,
      dateOfJoining,
      ctcInLpa,
      gender: parseInt(gender),
      designationId,
      branchId,
      isActive: isEmployeeActive === "1" ? true : false,
      ...(employeeTypeId && { employeeTypeId }), // Old field (optional for backward compatibility)
      ...(employeeTypeConfigId && { employeeTypeConfigId }), // New field for employee_configurations
      maritalStatus: parseInt(maritalStatus),
      reportsToId,
      sourceOfHireId,
      workingMethodId,
      departmentId,
      companyEmailId,
      ...(employeeStatusId && { employeeStatusId }), // Old field (optional for backward compatibility)
      ...(employeeStatusConfigId && { employeeStatusConfigId }), // New field for employee_configurations
      companyId,
      method: parseInt(method),
      companyPhoneNumber,
      companyPhoneExtension,
      employeeCode,
      ...(isAdmin && { isAdmin: isAdmin === "1" ? true : false }),
      ...(attendanceRequestRaiseLimit && { attendanceRequestRaiseLimit }),
      ...(allowedPerMonth && { allowedPerMonth }),
      ...(allowOverTime && { allowOverTime }),
      ...(aadharNumber && { aadharNumber }),
      ...(aadharCardPath && { aadharCardPath }),
      ...(panNumber && { panNumber }),
      ...(panCardPath && { panCardPath }),
      ...(anniversary && { anniversary }),
      ...(referredById && { referredById }),
      ...(nickName && { nickName }),
      ...(dateOfExit && { dateOfExit }),
      ...(vegMealPreference && { vegMealPreference }),
      ...(nonVegMealPreference && { nonVegMealPreference }),
      ...(veganMealPreference && { veganMealPreference }),
      ...(teamId && { teamId }),
      ...(roomOrBlock && { roomOrBlock }),
      ...(shift && { shift }),
      ...(experienceLevel && { experienceLevel }),
      ...(employeeLevelId && { employeeLevelId }),
      // Discretionary leave: always send boolean, only send balance if true
      discretionaryLeaveBoolean: discretionaryLeaveBoolean === "true" || discretionaryLeaveBoolean === true,
      ...((discretionaryLeaveBoolean === "true" || discretionaryLeaveBoolean === true) && discretionaryLeaveBalance && {
        discretionaryLeaveBalance: parseInt(discretionaryLeaveBalance) || 0
      }),
      // Always send leaveAllocations (replace-all on backend).
      ...(Array.isArray(values.leaveAllocations) && {
        leaveAllocations: values.leaveAllocations
      })
    };
    // Clean up empty values but preserve gender, maritalStatus, and discretionaryLeaveBoolean (even if 0 or false)
    Object.keys(employeePayload).forEach((key) => {
      if (key === 'gender' || key === 'maritalStatus' || key === 'discretionaryLeaveBoolean') return;
      if (!employeePayload[key] && employeePayload[key] !== 0 && employeePayload[key] !== false) {
        delete employeePayload[key];
      }
    });

    // IMPORTANT: Remove config fields to prevent foreign key errors if empty
    if (!employeePayload.employeeTypeConfigId) {
      delete employeePayload.employeeTypeConfigId;
    }
    if (!employeePayload.employeeStatusConfigId) {
      delete employeePayload.employeeStatusConfigId;
    }
    const reqPromise = [
      () => updateUser(userId, userPayload),
      () => updateEmployee(employeeId, employeePayload),
    ];

    const { workExpInfo, bankInfo, educationalInfo, familyInfo, addressInfo, emergencyDetails } = values;

    if (addressInfo.permanentAddressLine1 == addressInfo.presentAddressLine1) {
      const newAddressInfo = {
        ...addressInfo,
        presentAddressLine1: undefined,
        presentAddressLine2: undefined,
        presentCountry: undefined,
        presentState: undefined,
        presentCity: undefined,
        presentPostalCode: undefined,
      }
      reqPromise.push(() => (addressInfo?.id) ? updateAddressDetails(addressInfo.id, newAddressInfo) : createAddressDetails({ ...newAddressInfo, employeeId }));
    }
    else {
      reqPromise.push(() => (addressInfo?.id) ? updateAddressDetails(addressInfo.id, addressInfo) : createAddressDetails({ ...addressInfo, employeeId }));
    }

    workExpInfo.forEach((workExp: any) => (reqPromise.push(() => (workExp?.id) ? updatePreviousExpDetails(workExp.id, workExp) : createPreviousExperienceDetails([{
      ...(workExp.companyName && { companyName: workExp.companyName }),
      ...(workExp.jobTitle && { jobTitle: workExp.jobTitle }),
      ...(workExp.fromDate && { fromDate: workExp.fromDate }),
      ...(workExp.toDate && { toDate: workExp.toDate }),
      employeeId
    }]))));
    educationalInfo.forEach((edInfo: any) => (reqPromise.push(() => (edInfo?.id) ? updateEducationalDetails(edInfo.id, edInfo) : createEducationalDetails([{
      ...(edInfo.instituteName && { instituteName: edInfo.instituteName }),
      ...(edInfo.degree && { degree: edInfo.degree }),
      ...(edInfo.specialization && { specialization: edInfo.specialization }),
      ...(edInfo.filePath && { filePath: edInfo.filePath }),
      ...(edInfo.fromDate && { fromDate: edInfo.fromDate }),
      ...(edInfo.toDate && { toDate: edInfo.toDate }),
      employeeId
    }]))));
    familyInfo.forEach((famInfo: any) => (reqPromise.push(() => (famInfo?.id) ? updateEmergencyContact(famInfo.id, famInfo) : createEmergencyContacts([{
      ...(famInfo.name && { name: famInfo.name }),
      ...(famInfo.mobileNumber && { mobileNumber: famInfo.mobileNumber }),
      ...(famInfo.dateOfBirth && { dateOfBirth: famInfo.dateOfBirth }),
      ...(famInfo.relationship && { relation: famInfo.relationship }),
      employeeId
    }]))));


    // Handle rejoin history separately to ensure proper order (delete before create)
    const filteredRejoinHistory = rejoinHistory?.filter((rejoinInfo: any) => 
      rejoinInfo.dateOfReJoining || rejoinInfo.dateOfReExit || rejoinInfo.reason
    );

    
    // Execute rejoin history operations sequentially
    await deleteAllRejoinHistoryByEmployeeId(employeeId);
    
    if (filteredRejoinHistory.length > 0) {
      // Create new rejoin history entries only after delete completes
      await createRejoinHistoryDetails(filteredRejoinHistory.map((rejoinInfo: any) => ({
        ...(rejoinInfo.dateOfReJoining && { dateOfReJoining: rejoinInfo.dateOfReJoining }),
        ...(rejoinInfo.dateOfReExit && { dateOfReExit: rejoinInfo.dateOfReExit }),
        ...(rejoinInfo.reason && { reason: rejoinInfo.reason }),
        employeeId
      })));
    }

    reqPromise.push(() => bankInfo?.id ? updateBankDetails(bankInfo.id, bankInfo) : createBankDetails({
      ...(bankInfo.accountNumber && { accountNumber: bankInfo.accountNumber }),
      ...(bankInfo.accountName && { accountName: bankInfo.accountName }),
      ...(bankInfo.ifscCode && { ifscCode: bankInfo.ifscCode }),
      ...(bankInfo.filePath && { filePath: bankInfo.filePath }),
      employeeId
    }));
    reqPromise.push(() => emergencyDetails?.id ? updateEmergencyDetails(emergencyDetails.id, emergencyDetails) : createEmergencyDetails({
      ...(emergencyDetails.bloodGroup && { bloodGroup: emergencyDetails.bloodGroup }),
      ...(emergencyDetails.allergies && { allergies: emergencyDetails.allergies }),
      ...(emergencyDetails.emergencyContactName && { emergencyContactName: emergencyDetails.emergencyContactName }),
      ...(emergencyDetails.emergencyContactNumber && { emergencyContactNumber: emergencyDetails.emergencyContactNumber }),
      employeeId
    }));
    values.documentInfo.forEach((docInfo: any) => {
      (reqPromise.push(() => docInfo?.id ?  updateDocumentDetails(docInfo?.id, { ...docInfo, employeeId }) : createDocumentsDetails([{ ...docInfo, employeeId }])));
    });
    // debugger;
    try {
      await Promise.all(reqPromise.map(fn => fn()));
      await successConfirmation("Employee data updated successfully.");
      navigate("/employees")
  } catch (error: any) {
      let errMessage = "Something went wrong. Please try again with required fields filled with correct values.";
  
      // Check if the error response exists and extract the backend error message
      if (error.response && error.response.data) {
          const { status, data } = error.response;
  
          if (status === 400 && data.detail) {
              errMessage = data.detail; 
          } else if (status === 400 && data.message) {
              errMessage = data.message;
          }
          else if (data.error) {
              errMessage = data.error; 
          }
          else if (status === 500 && data.detail?.includes("users_alternate_phone_number_key")) {
              errMessage = "AlternatePhoneNumber already exists.";
          }
          else if (status === 500 && data.detail?.includes("employees_company_email_id_key")) {
            errMessage = "Company Emial Id already exists.";
          }
          else if (status === 500 && data.detail?.includes("users_personal_phone_number_key")) {
          errMessage = "PersonalPhoneNumber already exists.";
          }
      }
      if ((error as any).response?.status === 422) {
        const validationErrors = (error as any).response?.data?.validationError || [];
        const formattedErrors = validationErrors.map((err: any) => {
        return `• ${err.errors.join(', ')}`;
          }).join('<br>');
        if (formattedErrors.length > 0) {
          errorConfirmation(`Please fill are required fields:<br><br>${formattedErrors}`);
        return;
        }
      }

      // Show error message to the user
      errorConfirmation(errMessage);
      console.error("API Error:", error.response ? error.response.data : error);
  }
  
  }

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Enhanced submitStep function with proper loading states and error handling
  const submitStep = async (values: any, actions: FormikValues) => {
    if (!stepper) {
      return;
    }
  
    // Handle edit mode for final step
    if (stepper.currentStepIndex === stepper.totalStepsNumber && editMode) {
      try {
        setIsSubmitting(true);
        await updateWizardData(values);
      } catch (error) {
        console.error('Update wizard error:', error);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }  


    // Navigate to next step if not on final step
    if (stepper.currentStepIndex !== stepper.totalStepsNumber) {
      stepper.goNext();
      actions.setTouched({});
    } else {
      // Handle final step submission
      let savedUserId: string | null = null;
  
      try {
        setIsSubmitting(true);
  
        // Step 1: Save new user
        savedUserId = await saveNewUser(values);
  
        if (!savedUserId) {
          if (typeof savedUserId === 'boolean') {
            return;
          }
          throw new Error('Failed to save user, user ID is missing');
        }
  
        // Step 2: Upload documents
        const documentPromises = Object.keys(files).map(async (docId) => {
          const fileData = files[docId];
          const formData = new FormData();
          formData.append('file', fileData);

          try {
            // Get field name from documentFields and convert to dash-separated format
            const docField = values.documentFields?.find((field: any) => field.id === docId);
            const fieldName = docField?.fieldName || docId;
            // Convert "Aadhar Card" to "aadhar-card"
            const baseName = fieldName.toLowerCase().replace(/\s+/g, '-');
            // Get file extension from uploaded file (e.g., .pdf, .jpg)
            const extension = fileData.name.split('.').pop();
            const fileName = extension ? `${baseName}.${extension}` : baseName;

            // All onboarding files (including profile picture) go to onboarding-docs folder
            const category = 'onboarding-docs';
            const response = await uploadUserAsset(formData, savedUserId!, fileName, category);
            return {
              documentId: docId,
              path: response.data.path,
              fileName: fileName, // Use renamed fileName instead of original fileData.name
            };
          } catch (uploadError) {
            console.error(`Failed to upload document ${docId}:`, uploadError);
            throw new Error(`Failed to upload document: ${fileData.name}`);
          }
        });
  
        const documentUploaded = await Promise.all(documentPromises);
  
        // Step 3: Process uploaded documents
        const filteredDocs = documentUploaded.filter(
          (doc) => doc.documentId !== 'userProfilePicture'
        );
  
        // Set avatar from profile picture
        const profilePicture = documentUploaded.find(
          (doc) => doc.documentId === 'userProfilePicture'
        );
        if (profilePicture) {
          values.avatar = profilePicture.path;
        }
  
        // Map document info with identity numbers and uploaded files
        const documentInfo = values.documentInfo || [];
        console.log("Original documentInfo before processing uploads:: ", documentInfo);
        console.log("filteredDocs (uploaded files):: ", filteredDocs);
        
        // Update existing documentInfo with file paths from uploads
        const updatedDocs = documentInfo.map((docInfo: any) => {
          // Find the corresponding uploaded file by documentId
          const uploadedFile = filteredDocs.find((doc) => doc.documentId === docInfo.documentId);
          return {
            ...docInfo, // Keep original data including identityNumber
            ...(uploadedFile && { 
              path: uploadedFile.path,
              fileName: uploadedFile.fileName 
            }) // Add file info only if file was uploaded
          };
        });
        
        console.log("Updated documentInfo after processing uploads:: ", updatedDocs);
        values.documentInfo = updatedDocs;
  
        // Step 4: Save employee data
        const savedEmployeeId = await saveNewEmployee(values, savedUserId);
        
        if (!savedEmployeeId) {
          throw new Error('Failed to save employee data');
        }
  
        // Step 5: Update employee roles
        const appRole = values.appRole;
        if (appRole) {
          try {
            await updateEmployeeRolesById(savedEmployeeId, { 
              roleIds: [appRole] 
            });
          } catch (roleError) {
            console.error('Error while updating employee roles:', roleError);
            // Don't throw here as this might not be critical
          }
        }

        // Step 6: Save additional employee data
        await saveEmployeeData(values, savedEmployeeId);
        // debugger;
        // Success handling
        successConfirmation('Successfully onboarded an employee');
        stepper.goto(1);
        actions.resetForm();
  
      } catch (error) {
        console.error('Submission error:', error);
  
        // Cleanup: Archive user if it was created but process failed
        if (savedUserId) {
          try {
            await archiveUser(savedUserId, { status: 'archived' });
          } catch (archiveError) {
            console.error('Failed to archive user during cleanup:', archiveError);
          }
        }
  
        // Handle different types of errors
        await handleSubmissionError(error);
  
      } finally {
        setIsSubmitting(false);
      }
    }
  
    // Update schema for current step
    setCurrentSchema(newEmployeeWizardSchema[stepper.currentStepIndex - 1]);
  };
  
  // Separate error handling function for better organization
  const handleSubmissionError = async (error: any) => {
    try {
      // Handle validation errors (422 status)
      if (error?.response?.status === 422) {
        const validationErrors = error.response?.data?.validationError || [];
        const importantFields = [
          'firstName',
          'lastName', 
          'personalEmailId',
          'personalPhoneNumber',
          'dateOfBirth',
          'gender',
          'dateOfJoining',
          'departmentId',
          'branchId',
          'employeeTypeId',
          'companyEmailId'
        ];
  
        // Filter and format validation errors
        const filteredErrors = validationErrors
          .filter((err: any) => importantFields.includes(err.field))
          .map((err: any) => `• ${err.errors.join(' ')}`)
          .join('\n\n');
  
        if (filteredErrors.length > 0) {
          errorConfirmation(filteredErrors.replace(/\n/g, '<br>'));
          return;
        } else {
          errorConfirmation(
            'No specific validation errors found, but the request failed. Please try again.'
          );
          return;
        }
      }
  
      // Handle other API errors
      const responseData = error?.response?.data || {};
      const errorMessage = 
        responseData.detail ||
        responseData.message ||
        responseData.error ||
        responseData.errors?.map((err: string) => `• ${err}`).join('\n') ||
        error?.response?.statusText ||
        'An unknown error occurred.';
  
      errorConfirmation(errorMessage.replace(/\n/g, '<br>'));
  
    } catch (parseError) {
      // Handle errors in error parsing
      const fallbackMessage = error instanceof Error
        ? `Error during submission: ${error.message}`
        : typeof error === 'string'
        ? `Error during submission: ${error}`
        : 'An unexpected error occurred during submission.';
      
      errorConfirmation(fallbackMessage);
    }
  
    // Handle network errors
    if (!error?.response) {
      errorConfirmation(
        'A network error occurred. Please check your internet connection and try again.'
      );
    }
  };


  useEffect(() => {
    if (!stepperRef.current) {
      return
    }
    loadStepper()
  }, [stepperRef]);

  useEffect(() => {
    if (!editMode) return;

    async function wizard() {
      if (!employeeId) return;
      const { data: { wizardData } } = await fetchWizardData(employeeId, false);
      let presentAddress = {};
      const { attendanceRequestRaiseLimit, allowedPerMonth, allowOverTime } = wizardData;
      const isSameAddress = wizardData.addressInfo?.presentAddressLine1 === null;
      if (isSameAddress) {
        const { permanentAddressLine1, permanentAddressLine2, permanentCountry, permanentState, permanentCity, permanentPostalCode } = wizardData.addressInfo;
        presentAddress = {
          presentAddressLine1: permanentAddressLine1,
          presentAddressLine2: permanentAddressLine2,
          presentCountry: permanentCountry,
          presentState: permanentState,
          presentCity: permanentCity,
          presentPostalCode: permanentPostalCode,
        }
      }
     
      const newState = {
        ...initialState,
        ...wizardData,
        method: "0",
        addressInfo: { ...wizardData.addressInfo, ...presentAddress },
        emergencyDetails: wizardData?.emergencyDetails || {
          bloodGroup: "",
          allergies: "",
          emergencyContactName: "",
          emergencyContactNumber: "",
        },
        appRole: wizardData?.roles[0]?.id,
        isEmployeeActive: wizardData?.isActive ? "1" : "0",
        isAdmin: wizardData?.isAdmin ? "1" : "0",
        attendanceRequestRaiseLimit: attendanceRequestRaiseLimit || 0,
        allowedPerMonth: allowedPerMonth || 1,
        allowOverTime: allowOverTime,
        bloodGroup: wizardData?.users?.bloodGroup || wizardData?.bloodGroup || "",
        // Map employee type and status config IDs - only if they exist
        ...(wizardData?.employeeTypeConfigId && { employeeTypeConfigId: wizardData.employeeTypeConfigId }),
        ...(wizardData?.employeeStatusConfigId && { employeeStatusConfigId: wizardData.employeeStatusConfigId }),
        // Newly added fields
        teamId: wizardData?.teamId || "",
        roomOrBlock: wizardData?.roomOrBlock || "",
        shift: wizardData?.shift || "",
        experienceLevel: wizardData?.experienceLevel || "",
        employeeLevelId: wizardData?.employeeLevelId || "",
        // Social media fields from users object
        linkedInProfileUrl: wizardData?.users?.linkedInProfileUrl || "",
        instagramProfileUrl: wizardData?.users?.instagramProfileUrl || "",
        facebookProfileUrl: wizardData?.users?.facebookProfileUrl || "",
        // Other user fields
        hobbies: wizardData?.users?.hobbies || "",
        notes: wizardData?.users?.notes || "",
        // Discretionary leave fields
        discretionaryLeaveBoolean: wizardData?.discretionaryLeaveBoolean ? "true" : "false",
        discretionaryLeaveBalance: wizardData?.discretionaryLeaveBalance || 0
      };
      setDefaultState(newState);
    }

    wizard();

  }, [employeeId, defaultState.method]);

  const handleClose = () => {
    setShow(false);
    navigate('/employees');
  }

  const [windowWidth, setWindowWidth] = useState(window.innerWidth);  // for responsive design previously it was breaking when resizing the window
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <>
      <Modal show={show} onHide={handleClose} dialogClassName="full-width-modal" className="full-width-modal">
        <Modal.Header closeButton>
          {editMode && defaultState.firstName && (
            <div className="d-flex align-items-center gap-3">
              <div className="symbol symbol-40px">
                {defaultState.avatar ? (
                  <img src={defaultState.avatar} alt={`${defaultState.firstName} ${defaultState.lastName}`} />
                ) : (
                  <div className="symbol-label fs-2 fw-bold text-primary bg-light-primary">
                    {defaultState.firstName.charAt(0).toUpperCase()}{defaultState.lastName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="d-flex flex-column">
                <h4 className="mb-0">{defaultState.firstName} {defaultState.lastName}</h4>
                <span className="text-muted fs-7">
                  {defaultState.appRole && defaultState.roles?.[0]?.name ? defaultState.roles[0].name : 'No role assigned'}
                </span>
              </div>
            </div>
          )}
        </Modal.Header>
        <Modal.Body className="employee__form_wizard__modal_body">
          <div
            ref={stepperRef}
            className='stepper stepper-pills stepper-column d-flex flex-column flex-xl-row flex-row-fluid'
            id='kt_create_account_stepper'
          >
            {/* begin::Aside*/}
            <div 
                className='d-flex justify-content-center justify-content-xl-start flex-row-auto w-100 w-xl-300px w-xxl-400px me-9'
                style={{
                position: windowWidth >= 1200 ? 'sticky' : 'relative', 
                top: windowWidth >= 1200 ? '0' : 'unset',
                alignSelf: 'flex-start',
            }}
            >
              {/* begin::Wrapper*/}
              <div className='card-body px-6 px-lg-10 px-xxl-15 py-20'>
                {/* begin::Nav*/}
                <div className='stepper-nav'>
                  {/* <h3 className="mb-10 text-uppercase">Add new employee</h3> */}
                  {/* Step 1 (Choose Method) commented out - wizard now starts at Personal Details */}
                  {/* <div className='stepper-item current' data-kt-stepper-element='nav'>
                    <div className='stepper-wrapper'>
                      <div className='stepper-icon w-40px h-40px'>
                        <i className='stepper-check fas fa-check'></i>
                        <span className='stepper-number'>1</span>
                      </div>
                      <div className='stepper-label'>
                        <h3 className='stepper-title'>Choose Method</h3>
                        <div className='stepper-desc fw-semibold'>Select onboarding method</div>
                      </div>
                    </div>
                    <div className='stepper-line h-20px'></div>
                  </div> */}

                  {/* begin::Step 1 (Previously Step 2)*/}
                  <div className='stepper-item current' data-kt-stepper-element='nav'>
                    {/* begin::Wrapper*/}
                    <div className='stepper-wrapper'>
                      {/* begin::Icon*/}
                      <div className='stepper-icon w-40px h-40px'>
                        <i className='stepper-check fas fa-check'></i>
                        <span className='stepper-number'>1</span>
                      </div>
                      {/* end::Icon*/}

                      {/* begin::Label*/}
                      <div className='stepper-label'>
                        <h3 className='stepper-title'>Personal Details</h3>
                        <div className='stepper-desc fw-semibold'>Fill in personal details</div>
                      </div>
                      {/* end::Label*/}
                    </div>
                    {/* end::Wrapper*/}

                    {/* begin::Line*/}
                    <div className='stepper-line h-20px'></div>
                    {/* end::Line*/}
                  </div>
                  {/* end::Step 1*/}

                  {/* begin::Step 2 (Previously Step 3)*/}
                  <div className='stepper-item' data-kt-stepper-element='nav'>
                    {/* begin::Wrapper*/}
                    <div className='stepper-wrapper'>
                      {/* begin::Icon*/}
                      <div className='stepper-icon w-40px h-40px'>
                        <i className='stepper-check fas fa-check'></i>
                        <span className='stepper-number'>2</span>
                      </div>
                      {/* end::Icon*/}

                      {/* begin::Label*/}
                      <div className='stepper-label'>
                        <h3 className='stepper-title'>Company details</h3>
                        <div className='stepper-desc fw-semibold'>Fill in company details</div>
                      </div>
                      {/* end::Label*/}
                    </div>
                    {/* end::Wrapper*/}

                    {/* begin::Line*/}
                    <div className='stepper-line h-20px'></div>
                    {/* end::Line*/}
                  </div>
                  {/* end::Step 2*/}

                  {/* begin::Step 3 (Previously Step 4)*/}
                  <div className='stepper-item' data-kt-stepper-element='nav'>
                    {/* begin::Wrapper*/}
                    <div className='stepper-wrapper'>
                      {/* begin::Icon*/}
                      <div className='stepper-icon w-40px h-40px'>
                        <i className='stepper-check fas fa-check'></i>
                        <span className='stepper-number'>3</span>
                      </div>
                      {/* end::Icon*/}

                      {/* begin::Label*/}
                      <div className='stepper-label'>
                        <h3 className='stepper-title'>Documents</h3>
                        <div className='stepper-desc fw-semibold'>Upload employee documents</div>
                      </div>
                      {/* end::Label*/}
                    </div>
                    {/* end::Wrapper*/}
                  </div>
                  {/* end::Step 3*/}
                </div>
                {/* end::Nav*/}
              </div>
              {/* end::Wrapper*/}
            </div>
            {/* begin::Aside*/}

            <div className='d-flex flex-column flex-row-fluid align-items-start  rounded'>
              <Formik initialValues={defaultState} onSubmit={submitStep} enableReinitialize={true}>
                {(formikProps) => {
                  useEffect(() => {
                    formikProps.validateForm();
                  }, [stepper?.currentStepIndex, defaultState]);

                  return (
                    <Form className='d-flex flex-column flex-grow-1 py-5 w-100 px-8' noValidate id='employee_onboarding_form' placeholder={undefined}>
                      <div className='flex-grow-1'>
                        {/* Step1 (Choose Method) is now commented out - wizard starts at Personal Details */}
                        {/* <div className='current' data-kt-stepper-element='content'>
                          {stepper?.currentStepIndex === 1 ? <Step1 /> : null}
                        </div> */}

                        <div className='current' data-kt-stepper-element='content'>
                          {stepper?.currentStepIndex === 1 ? <Step2 formikProps={formikProps} setFile={addFileToState} /> : null}
                        </div>

                        <div data-kt-stepper-element='content'>
                          {stepper?.currentStepIndex === 2 ? <Step3 formikProps={formikProps} editMode={editMode} /> : null}
                        </div>

                        <div data-kt-stepper-element='content'>
                          {stepper?.currentStepIndex === 3 ? <Step4 formikProps={formikProps} setFile={addFileToState} /> : null}
                        </div>
                      </div>

                      <div className='d-flex flex-stack pt-20'>
                        <div className='mr-2'>
                          <button
                            onClick={prevStep}
                            type='button'
                            className='btn btn-lg btn-light-primary me-3'
                            data-kt-stepper-action='previous'
                          >
                            <KTIcon iconName='arrow-left' className='fs-4 me-1' />
                            Back
                          </button>
                        </div>
                        <div>
                          <button type='submit' className='btn btn-lg btn-primary me-3' disabled={!formikProps.isValid || isSubmitting}>
                            <span className='indicator-label'>
                              {stepper?.currentStepIndex !== stepper?.totalStepsNumber && 'Continue'}
                              {stepper?.currentStepIndex === stepper?.totalStepsNumber && (isSubmitting ? <span className='indicator-progress' style={{ display: 'block' }}>
                              Please wait...
                              <span className='spinner-border spinner-border-sm align-middle ms-2'></span>
                            </span> : 'Submit')}
                              {/* <KTIcon iconName='arrow-right' className='fs-3 ms-2 me-0' /> */}
                            </span>
                          </button>
                        </div>
                      </div>
                    </Form>
                  )
                }}
              </Formik>
            </div>
          </div>
        </Modal.Body>
      </Modal>
    </>
  );
}

export default NewEmployeeWizard;
