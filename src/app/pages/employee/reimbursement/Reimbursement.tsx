import React from "react";
import { KTCard, KTCardBody } from "@metronic/helpers";
import { PageLink, PageTitle } from "@metronic/layout/core";
import { Route, Routes, Outlet, Navigate } from "react-router-dom";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import { errorConfirmation, successConfirmation } from "@utils/modal";
import { useFormik } from "formik";
import { useEffect, useState } from "react";
import * as Yup from "yup";
import dayjs, { Dayjs } from "dayjs";
import { useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@redux/store";
import { MRT_ColumnDef } from "material-react-table";
import MaterialToggleReimbursement, {
  ToggleItemsCallBackFunctions,
} from "./MaterialToggleReimbursement";
import { UsersListWrapper } from "@app/modules/apps/user-management/users-list/UsersList";
import {
  fetchAllReimbursementTypesFromDb,
  fetchEmpAlltimeReimbursements,
  fetchEmpMonthlyReimbursements,
  fetchEmpYearlyReimbursements,
} from "@utils/statistics";
import { IReimbursementsCreate, IReimbursementsFetch, IReimbursementsUpdate } from "@models/employee";
import { Modal } from "react-bootstrap";
import { Form, Formik, FormikValues, useField } from "formik";
import { Option } from "@models/dropdown";
import TextInput from "app/modules/common/inputs/TextInput";
import DropDownInput from "app/modules/common/inputs/DropdownInput";
import DateInput from "@app/modules/common/inputs/DateInput";
import { createNewTowns, fetchAllReimbursementTypes, fetchAllTowns } from "@services/options";
import ReimbursementDropdown from "@app/modules/common/inputs/ReimbursementDropdown";
import { uploadUserAsset } from "@services/uploader";
import { createEmployeeReimbursement, updateReimbursementById } from "@services/employee";
import Overview from "./views/common/Overview";
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from "@constants/statistics";
import { fetchRolesAndPermissions } from "@redux/slices/rolesAndPermissions";
import { hasPermission } from "@utils/authAbac";
import eventBus from "@utils/EventBus";
import { Select } from "@mui/material";

const getReimbursementSchema = (currentReimbursement:IReimbursementsCreate) => {
  // console.log("currentReimbursement from schema: ",currentReimbursement);
  
  return Yup.object({
    reimbursementTypeId: currentReimbursement
      ? Yup.string().label("Reimbursement For")
      : Yup.string().required().label("Reimbursement For"),
    expenseDate: currentReimbursement
      ? Yup.string().label("Date")
      : Yup.string().required().label("Date"),
    amount: currentReimbursement
      ? Yup.number().required().label("Amount").min(1, "Amount must be greater than 0").max(1000, "Amount must be less than 1000")
      : Yup.number().required().label("Amount").min(1, "Amount must be greater than 0").max(1000, "Amount must be less than 1000"),
    description: currentReimbursement
      ? Yup.string().label("Note")
      : Yup.string().required().label("Note"),
    document: currentReimbursement 
      ? Yup.string().label("Reference Document") 
      : Yup.string().label("Reference Document"),
    fromLocation: Yup.string().label("From Location"),
    toLocation: Yup.string().label("To Location"),
    connectionType: Yup.string().label("Connection Type"),
    connectedPerson: Yup.string().label("Connected Person"),
  });

}

let initialState = {
  reimbursementTypeId: "",
  expenseDate: "",
  fromLocation: "",
  toLocation: "",
  connectionType: "",
  connectedPerson: "",
  amount: undefined,
  document: "",
  description: "",
};

function Reimbursement() {
  const [totalRequestedAmount, setTotalRequestedAmount] = useState(0);
  const dispatch = useDispatch();
  const [totalRequests, setTotalRequests] = useState(0);
  const [approvedRequests, setApprovedRequests] = useState(0);
  const [rejectedRequests, setRejectedRequests] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [reimbursementData, setReimbursementData] = useState<
    IReimbursementsFetch[]
  >([]);
  const [showEditDeleteOption, setShowEditDeleteOption] = useState(true)
  const [refreshFlag, setRefreshFlag] = useState(false);
  const [show, setShow] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [reimbursementOptions, setReimbursementOptions] = useState<any>([]);
  const [selectedReimbursementFor, setSelectedReimbursementFor] =
    useState<Option | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentReimbursement, setCurrentReimbursement] = useState<any>(null);
  const employeeId = useSelector(
    (state: RootState) => state.employee.currentEmployee.id
  );
  const userId = useSelector((state: RootState) => state.auth.currentUser.id);
  const [townsOptions, setTownsOptions] = useState<Option[]>([]);


  const toggleItemsActions: ToggleItemsCallBackFunctions = {
    monthly: function (month: Dayjs): void {
      fetchEmpMonthlyReimbursements(month); // create custom
    },
    yearly: function (year: Dayjs): void {
      fetchEmpYearlyReimbursements(year); // create custom
    },
    allTime: function (year: Dayjs): void {
      fetchEmpAlltimeReimbursements(); // create custom and pass empId if required
    },
  };

  useEffect(() => {
    const currentYear = dayjs().startOf("year");
    fetchEmpYearlyReimbursements(currentYear).then((data) => {
      let totalAmount = 0,
        totalRequest = 0,
        approvedCount = 0,
        rejectedCount = 0,
        pendingCount = 0;
      data.forEach((ele) => {
        if (ele.id && ele.employeeId==employeeId) {
          totalAmount += parseInt(ele.amount ? ele.amount : "0");
          totalRequest += 1;
          if (ele.status == "Pending") {
            pendingCount += 1;
          } else if (ele.status == "Rejected") {
            rejectedCount += 1;
          } else {
            approvedCount += 1;
          }
        }
      });
      setApprovedRequests(approvedCount);
      setPendingRequests(pendingCount);
      setRejectedRequests(rejectedCount);
      setTotalRequests(totalRequest);
      setTotalRequestedAmount(totalAmount);
      setReimbursementData(data);
    });
  }, [show, employeeId]);

  const handleNew = () => {
    setSelectedReimbursementFor(null);

    initialState = {
      reimbursementTypeId: "",
      expenseDate: "",
      fromLocation: "",
      toLocation: "",
      connectionType: "",
      connectedPerson: "",
      amount: undefined,
      document: "",
      description: "",
    };

    setShow(true);
    setEditMode(false);
    setCurrentReimbursement(null);
  };

  const handleEdit = (reimbursement : IReimbursementsUpdate) => {
    setCurrentReimbursement(reimbursement);
    setShow(true);
    setEditMode(true);
    
    // Set selected reimbursement type for the dropdown
    setSelectedReimbursementFor({
      value: reimbursement?.reimbursementTypeId || "",
      label: reimbursement?.reimbursementType?.type || "",
    });
  };

  const handleSubmit = async (values: any, actions: FormikValues) => {

    try {
      setLoading(true);
      if (editMode) {
        if(values.employee) delete values.employee;
        if(values.employeeId) delete values.employeeId;
        if(values.reimbursementType) delete values.reimbursementType;
        if(values.type) delete values.type;
        if(values.day) delete values.day;
        if(values.isActive) delete values.isActive;
        if(values.status) delete values.status;
        
        const filteredValues = Object.fromEntries(
          Object.entries(values).filter(
            ([key, value]) => key === "amount" || value !== ""
          )
        );
        
        // const payload: IReimbursementsUpdate = {
        //   ...filteredValues,
        // } as IReimbursementsUpdate;
        await updateReimbursementById(currentReimbursement.id, filteredValues);
        setLoading(false);
        successConfirmation("Reimbursement updated successfully");
        eventBus.emit("reimbursementRecords", { records: [] });
        setShow(false);
        setEditMode(false);
        return;
      }

      values.employeeId = employeeId;
      // Filter out properties with empty string values, except for "amount"
      const filteredValues = Object.fromEntries(
        Object.entries(values).filter(
          ([key, value]) => key === "amount" || value !== ""
        )
      );

      const payload: IReimbursementsCreate = {
        ...filteredValues,
        reimbursementTypeId: filteredValues.reimbursementTypeId,
        expenseDate: filteredValues.expenseDate,
        amount: filteredValues.amount ?? 0,
        description: filteredValues.description,
      } as IReimbursementsCreate;

      await createEmployeeReimbursement(payload);
      setLoading(false);
      successConfirmation("Reimbursement created successfully");
      eventBus.emit("reimbursementRecords", { records: [] });
      setShow(false);
    } catch (err) {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setShow(false);
    setEditMode(false);
    setCurrentReimbursement(null);
  };

  const handleChange = (
    selectedOption: any,
    formikField: string,
    setSelectedOptionState: React.Dispatch<React.SetStateAction<any>>,
    setFieldValue: (field: string, value: any) => void
  ) => {
    setFieldValue(formikField, selectedOption ? selectedOption.value : "");
    setSelectedOptionState(selectedOption);
  };

  const fetchAllReimbursementsTypesData = async () => {
    const reimbursementResponse = await fetchAllReimbursementTypesFromDb();
    const reimbursementOptions = reimbursementResponse.map((country: any) => ({
      value: country.id,
      label: country.type,
      icon: country.icon,
    }));
    setReimbursementOptions(reimbursementOptions);
  };

  useEffect(()=>{
    fetchAllReimbursementsTypesData();
  },[])

  const uploadFile = async (
    event: React.ChangeEvent<HTMLInputElement>,
    formikProps: any,
    fileMaxUploadSize: number
  ) => {
    const {
      target: { files },
    } = event;
    if (files && files[0].size > fileMaxUploadSize) {
      alert("File size should not exceed 5 MB");
      // Optionally, set Formik error:
      // formikProps.setFieldError('document', 'File size should not exceed 2 MB');
      event.target.value = ""; // Clear the input
      return;
    }

    if (files && files.length > 0) {
      const form = new FormData();
      form.append("file", files[0]);
      try {
        const {
          data: { path },
        } = await uploadUserAsset(form, userId, undefined, 'reimbursement-docs');
        formikProps.setFieldValue("document", path, true);
        console.log("File uploaded successfully!");
      } catch (error) {
        console.error("Failed to upload file. Please try again.");
      }
    }
  };

  //  const fetchTowns = async () => {
  //     const townsResponse = await fetchAllTowns()
  //     const townsOptions = townsResponse.data.towns.map((town: any) => ({
  //       value: town.id,
  //       label: town.name,
  //     }))
  //     setTownsOptions(townsOptions)
  //   }

  //   useEffect(()=>{
  //     fetchTowns();
  //   },[])

  return (
    <>
      {/* <UsersListWrapper /> */}
      <Overview totalRequestedAmount={totalRequestedAmount} totalRequests={totalRequests} approvedRequests={approvedRequests} rejectedRequests={rejectedRequests} pendingRequests = {pendingRequests} />
      
      <div
        className="py-1 rounded-3 my-4 d-flex justify-content-end align-items-center"
        style={{ paddingRight: "1.25rem" }}
      >

        { hasPermission(resourceNameMapWithCamelCase.reimbursement, permissionConstToUseWithHasPermission.create) && <button
          className="d-flex justify-content-between align-items-center bg-primary  btn btn-lg btn-primary fs-5 w-auto"
          onClick={() => handleNew()}
        >
          <div className="d-flex justify-content-center invisible"></div>
          <div>Request Reimbursement</div>
        </button>}
      </div>
      <div className="my-6">
        <h2>My Reimbursement Records</h2>
      </div>
      <MaterialToggleReimbursement toggleItemsActions={toggleItemsActions} onEdit={handleEdit} showEditDeleteOption={showEditDeleteOption} resource={resourceNameMapWithCamelCase.reimbursement} viewOwn={true} viewOthers={false} />

      {/* modal code starts here */}
      {/* 1. show.hide, 2. handleClose, 3. Title, 4. initialState, 5. reimbursemenetSchema, 6. handleSubmit */}
      <Modal show={show} onHide={handleClose} centered>
        <Modal.Header closeButton>
          <Modal.Title>{editMode ? "Edit" : "New"} Reimbursement Request</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Formik
             initialValues={{
              ...initialState,
              ...(editMode && currentReimbursement && {
                ...currentReimbursement,
                expenseDate: currentReimbursement.expenseDate
                  ? dayjs(currentReimbursement.expenseDate).format('YYYY-MM-DD')
                  : '',
              }),
            }}
            onSubmit={handleSubmit}
            validationSchema={getReimbursementSchema(currentReimbursement)}
          >
            {(formikProps) => {
              useEffect(() => {}, []); // fetch any data if required in future in useEffect
              return (
                <Form
                  className="d-flex flex-column"
                  noValidate
                  id="employee_reimbursement_form"
                  placeholder={undefined}
                >
                  <div className="row">
                    <div
                      className="col-lg-6 mb-7"
                      // onClick={fetchAllReimbursementsTypesData}
                    >
                      <ReimbursementDropdown
                        isRequired={currentReimbursement?false:true}
                        // value={selectedReimbursementFor}
                        handleChange={(option: any) => {
                          handleChange(
                            option,
                            "reimbursementTypeId",
                            setSelectedReimbursementFor,
                            formikProps.setFieldValue
                          );
                        }}
                        formikField="reimbursementTypeId"
                        inputLabel="Reimbursement For"
                        options={reimbursementOptions}
                        value={selectedReimbursementFor}
                      />
                    </div>

                    <div className="col-lg-6">
                      <DateInput
                        isRequired={currentReimbursement?false:true}
                        inputLabel={"Select Date"}
                        formikProps={formikProps}
                        formikField="expenseDate"
                        placeHolder={"Select Date"}
                        maxDate={true}
                      />
                    </div>
                  </div>
                  {/* <div className='col-lg-6 mb-sm-7 mb-md-7 mb-7'>
                                        <DropDownInput
                                          isRequired={true}
                                          formikField='townId'
                                          inputLabel='Town'
                                          options={townsOptions}
                                          // showAddBtn={true}
                                          // functionToCallOnModalSubmit={createNewTowns}
                                          fieldName="towns"
                                          // functionToSetFieldOptions={handleTownsRefresh}
                                        />
                                      </div> */}
                  <div className="row">
                    <div className="col-lg-6">
                      <TextInput
                        isRequired={false}
                        label="From Location"
                        margin="mb-7"
                        formikField="fromLocation"
                      />
                    </div>

                    <div className="col-lg-6 ">
                      <TextInput
                        isRequired={false}
                        label="To Location"
                        margin="mb-7"
                        formikField="toLocation"
                      />
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-lg-6">
                      <TextInput
                        isRequired={false}
                        label="Connection Type"
                        margin="mb-7"
                        formikField="connectionType"
                      />
                    </div>

                    <div className="col-lg-6">
                      <TextInput
                        isRequired={false}
                        label="Connected Person"
                        margin="mb-7"
                        formikField="connectedPerson"
                      />
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-lg-6">
                      <TextInput
                        isRequired={true}
                        label="Enter Amount"
                        margin="mb-7"
                        formikField="amount"
                      />
                    </div>

                    <div className="col-lg-6">
                      <label className="mb-3 fw-bold">
                        Upload Document File
                      </label>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="form-control form-control-lg form-control-solid"
                        required={false}
                        onChange={(event) => uploadFile(event, formikProps, 5 * 1024 * 1024)}
                      />
                      {!reimbursementData && formikProps.touched.document &&
                        formikProps.errors.document && (
                          <div className="fv-plugins-message-container">
                            <div className="fv-help-block">
                            {typeof formikProps.errors.document === "string" && formikProps.errors.document}
                            </div>
                          </div>
                        )}
                    </div>
                  </div>

                  <div className="col-lg">
                    <TextInput
                      isRequired={true}
                      label="Note"
                      margin="mb-7"
                      formikField="description"
                    />
                  </div>
                   
                  <div className="col-lg" style={{ opacity: 0.6 }}>
                    <DropDownInput
                      isRequired={false}
                      formikField="project"
                      inputLabel="Choose Project (Coming Soon)"
                      options={[{value:"", label:"Select Project..."}]}
                      disabled={true}
                    />
                  </div>

                  <div className="d-flex justify-content-end mt-5">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={loading || !formikProps.isValid || formikProps.isSubmitting}
                    >
                      {!loading && "Save Changes"}
                      {loading && (
                        <span
                          className="indicator-progress"
                          style={{ display: "block" }}
                        >
                          Please wait...{" "}
                          <span className="spinner-border spinner-border-sm align-middle ms-2"></span>
                        </span>
                      )}
                    </button>
                  </div>
                </Form>
              );
            }}
          </Formik>
        </Modal.Body>
      </Modal>
    </>
  );
}

export default Reimbursement;
