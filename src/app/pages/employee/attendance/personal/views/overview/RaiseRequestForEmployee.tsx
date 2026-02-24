import DropDownInput from "@app/modules/common/inputs/DropdownInput";
import TextInput from "@app/modules/common/inputs/TextInput";
import TimePickerInput from "@app/modules/common/inputs/TimeInput";
import { RootState } from "@redux/store";
import { createUpdateAttendanceRequest, fetchAllEmployees, getAllKpiFactors, createKpiScore } from "@services/employee";
import { fetchWorkingMethods } from "@services/options";
import { errorConfirmation, successConfirmation } from "@utils/modal";
import { isValidTime } from "@utils/statistics";
import dayjs from "dayjs";
import { Formik, useField } from "formik";
import { useState, useEffect, useMemo } from "react";
import { Modal, Form } from "react-bootstrap";
import { useSelector } from "react-redux";
import * as Yup from "yup";
import eventBus from "@utils/EventBus";
import { EVENT_KEYS } from "@constants/eventKeys";
import Select, { components } from "react-select";

interface RaiseRequestForEmployeeProps {
  show: boolean;
  onHide: () => void;
  selectedDate: string; // YYYY-MM-DD format
}

interface EmployeeOption {
  value: string;
  label: string;
  avatar?: string;
}

// Custom Option component with avatar
const EmployeeOptionComponent = (props: any) => {
  const { data } = props;
  const avatarUrl = data.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.label)}&background=eeeeee&color=888888&size=20&rounded=true`;

  return (
    <components.Option {...props}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <img
          src={avatarUrl}
          alt={data.label}
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            objectFit: "cover",
            marginRight: 10,
          }}
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.label)}&background=eeeeee&color=888888&size=20&rounded=true`;
          }}
        />
        <span>{data.label}</span>
      </div>
    </components.Option>
  );
};

// Custom SingleValue component with avatar (shown when selected)
const EmployeeSingleValue = (props: any) => {
  const { data } = props;
  const avatarUrl = data.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.label)}&background=eeeeee&color=888888&size=20&rounded=true`;

  return (
    <components.SingleValue {...props}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <img
          src={avatarUrl}
          alt={data.label}
          style={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            objectFit: "cover",
            marginRight: 8,
          }}
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.label)}&background=eeeeee&color=888888&size=20&rounded=true`;
          }}
        />
        <span>{data.label}</span>
      </div>
    </components.SingleValue>
  );
};

const RaiseRequestForEmployee = ({
  show,
  onHide,
  selectedDate,
}: RaiseRequestForEmployeeProps) => {
  const [workingMethodOptions, setWorkingMethodOptions] = useState<any[]>([]);
  const [employeeOptions, setEmployeeOptions] = useState<EmployeeOption[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [allTheFactorDetails, setAllTheFactorDetails] = useState<any>([]);

  const currentEmployeeId = useSelector(
    (state: any) => state.employee?.currentEmployee?.id
  );

  const currentCompanyId = useSelector(
    (state: RootState) => state?.employee?.currentEmployee?.companyId
  );

  // Fetch working methods
  useEffect(() => {
    const getWorkingMethods = async () => {
      try {
        const {
          data: { workingMethods },
        } = await fetchWorkingMethods();
        const options = workingMethods.map((wm: any) => ({
          value: wm.id,
          label: wm.type,
        }));
        setWorkingMethodOptions(options);
      } catch (err) {
        console.error("Failed to load working methods", err);
      }
    };
    getWorkingMethods();
  }, []);

  // Fetch KPI factors
  useEffect(() => {
    const fetchFactorDetails = async () => {
      try {
        const { data: { factors } } = await getAllKpiFactors();
        setAllTheFactorDetails(factors);
      } catch (error) {
        console.error('Error fetching KPI factors:', error);
      }
    };
    fetchFactorDetails();
  }, []);

  // Fetch employees when modal opens
  useEffect(() => {
    const getEmployees = async () => {
      if (!show) return;

      setLoadingEmployees(true);
      try {
        const response = await fetchAllEmployees(true); // Only active employees
        const employees = response.data.employees || [];

        const options: EmployeeOption[] = employees.map((emp: any) => ({
          value: emp.id,
          label: `${emp?.users?.firstName || ''} ${emp?.users?.lastName || ''}`.trim() || emp?.users?.email || 'Unknown',
          avatar: emp?.avatar || emp?.users?.avatar || '',
        }));

        setEmployeeOptions(options);
      } catch (err) {
        console.error("Failed to load employees", err);
        errorConfirmation("Failed to load employees. Please try again.");
      } finally {
        setLoadingEmployees(false);
      }
    };

    getEmployees();
  }, [show]);

  // Initial form values
  const initialValues = useMemo(() => {
    return {
      employeeId: "",
      checkIn: "",
      checkOut: "",
      workingMethodId: "",
      remarks: "",
      status: "0", // Default to Pending
    };
  }, []);

  const validationSchema = Yup.object({
    employeeId: Yup.string().required("Employee is required"),
    checkIn: Yup.string()
      .matches(/^([01]\d|2[0-3]):([0-5]\d)$/, "Time must be in 24h format HH:mm").required("Check In Time is required"),
    checkOut: Yup.string()
      .matches(/^([01]\d|2[0-3]):([0-5]\d)$/, "Time must be in 24h format HH:mm").required("Check Out Time is required"),
    workingMethodId: Yup.string().required("Working Method is required"),
    remarks: Yup.string().required("Remarks are required"),
    status: Yup.string().required("Status is required"),
  });

  // Handle form submission
  const handleSubmit = async (values: any, { setSubmitting, resetForm }: any) => {
    try {
      // Validate company ID exists
      if (!currentCompanyId) {
        errorConfirmation("Company ID is missing. Please refresh and try again.");
        return;
      }

      // Validate employee ID exists
      if (!values.employeeId) {
        errorConfirmation("Please select an employee.");
        return;
      }

      // Validate at least one time is provided
      if (!values.checkIn && !values.checkOut) {
        errorConfirmation("Please provide at least Check In or Check Out time.");
        return;
      }

      const formattedDate = dayjs(selectedDate).format("YYYY-MM-DD");
      const updatedValues = { ...values };

      // Validate & format Check-In
      if (values.checkIn) {
        if (!isValidTime(values.checkIn)) {
          errorConfirmation("Enter Check In in HH:MM (24 hr format)");
          return;
        }
        const checkInUTC = dayjs(`${formattedDate} ${values.checkIn}`, "YYYY-MM-DD HH:mm").toISOString();
        updatedValues.checkIn = checkInUTC;
      }

      // Validate & format Check-Out
      if (values.checkOut) {
        if (!isValidTime(values.checkOut)) {
          errorConfirmation("Enter Check Out in HH:MM (24 hr format)");
          return;
        }
        const checkOutUTC = dayjs(`${formattedDate} ${values.checkOut}`, "YYYY-MM-DD HH:mm").toISOString();
        updatedValues.checkOut = checkOutUTC;
      }

      // Validate time sequence
      if (updatedValues.checkIn && updatedValues.checkOut) {
        if (!dayjs(updatedValues.checkOut).isAfter(dayjs(updatedValues.checkIn))) {
          errorConfirmation("Check Out must be after Check In");
          return;
        }
      }

      // Final payload
      const finalPayload: any = {
        employeeId: updatedValues.employeeId,
        workingMethodId: updatedValues.workingMethodId,
        companyId: currentCompanyId,
        checkIn: updatedValues.checkIn || null,
        checkOut: updatedValues.checkOut || null,
        remarks: updatedValues.remarks || "",
        latitude: 0.0,
        longitude: 0.0,
        status: Number(updatedValues.status) || 0,
        updatedById: currentEmployeeId, // Track who raised the request
      };

      const response = await createUpdateAttendanceRequest(finalPayload, true);

      // Create KPI score for "Request Raised" only when status is Approved (1)
      if (updatedValues.status === "1") {
        const requestRaised = allTheFactorDetails.find((el: any) => el?.name?.toLowerCase() === 'request raised');
        if (requestRaised) {
          let requestRaisedWeightage = Number(requestRaised?.weightage);
          const requestRaisedWeightageType = requestRaised?.type;
          if (requestRaisedWeightageType === "NEGATIVE") {
            if (requestRaisedWeightage > 0) {
              requestRaisedWeightage = requestRaisedWeightage * -1;
            }
          }
          const requestRaisedFactorId = requestRaised?.id;
          const requestRaisedScore = requestRaisedWeightage * 1;

          const requestRaisedPayload = {
            employeeId: updatedValues.employeeId,
            factorId: requestRaisedFactorId,
            value: 1,
            score: requestRaisedScore.toString(),
          };

          try {
            await createKpiScore(requestRaisedPayload);
          } catch (error) {
            console.error('Error creating KPI score:', error);
          }
        }
      }

      // Emit event to refresh tables
      eventBus.emit(EVENT_KEYS.attendanceRequestCreated, {
        id: response?.data?.id || "",
        employeeId: updatedValues.employeeId
      });

      successConfirmation("Attendance Request created successfully for the employee");
      resetForm();
      onHide();
    } catch (err) {
      console.error(err);
      errorConfirmation("Attendance Request failed. Try again later.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Raise Attendance Request for Employee</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {loadingEmployees ? (
          <div className="d-flex justify-content-center align-items-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading employees...</span>
            </div>
          </div>
        ) : (
          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            enableReinitialize
            onSubmit={handleSubmit}
          >
            {(formikProps) => (
              <Form
                className="d-flex flex-column"
                noValidate
                id="raise_request_for_employee_form"
                onSubmit={formikProps.handleSubmit}
              >
                {/* Date Display */}
                <div className="col-lg mb-5">
                  <label className="form-label fw-bold">Date</label>
                  <div className="form-control bg-light">
                    {dayjs(selectedDate).format("DD MMM YYYY")}
                  </div>
                </div>

                {/* Employee Selection with Avatar */}
                <div className="col-lg mb-5">
                  <label className="form-label required">Select Employee</label>
                  <Select
                    name="employeeId"
                    options={employeeOptions}
                    onChange={(selectedOption: any) => {
                      formikProps.setFieldValue("employeeId", selectedOption?.value || "");
                    }}
                    value={employeeOptions.find((opt) => opt.value === formikProps.values.employeeId) || null}
                    placeholder="Search and select employee..."
                    isClearable
                    isSearchable
                    classNamePrefix="react-select"
                    className="react-select-styled"
                    components={{
                      Option: EmployeeOptionComponent,
                      SingleValue: EmployeeSingleValue,
                    }}
                  />
                  {formikProps.touched.employeeId && formikProps.errors.employeeId && (
                    <div className="text-danger mt-1" style={{ fontSize: "0.875rem" }}>
                      {formikProps.errors.employeeId}
                    </div>
                  )}
                </div>

                {/* Check In Time */}
                <div className="col-lg mb-5">
                  <TimePickerInput
                    isRequired={true}
                    label="Check In (24 hr HH:MM)"
                    formikField="checkIn"
                    placeholder="HH MM"
                  />
                </div>

                {/* Check Out Time */}
                <div className="col-lg mb-5">
                  <TimePickerInput
                    isRequired={true}
                    label="Check Out (24 hr HH:MM)"
                    formikField="checkOut"
                    placeholder="HH MM"
                  />
                </div>

                {/* Working Method */}
                <div className="col-lg mb-5">
                  <DropDownInput
                    isRequired={true}
                    formikField="workingMethodId"
                    inputLabel="Working Method"
                    options={workingMethodOptions}
                  />
                </div>

                {/* Status */}
                <div className="col-lg mb-5">
                  <DropDownInput
                    isRequired={true}
                    formikField="status"
                    inputLabel="Status"
                    options={[
                      { label: "Pending", value: "0" },
                      { label: "Approved", value: "1" },
                      { label: "Rejected", value: "2" },
                    ]}
                  />
                </div>

                {/* Remarks */}
                <div className="col-lg mb-5">
                  <TextInput
                    isRequired={true}
                    label="Remarks"
                    formikField="remarks"
                  />
                </div>

                {/* Submit Button */}
                <div className="d-flex justify-content-end mt-4">
                  <button
                    type="button"
                    className="btn btn-secondary me-3"
                    onClick={onHide}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formikProps.isSubmitting}
                    className="btn btn-primary"
                    style={{ backgroundColor: "#9D4141", borderColor: "#9D4141" }}
                  >
                    {formikProps.isSubmitting ? "Saving..." : "Raise Request"}
                  </button>
                </div>
              </Form>
            )}
          </Formik>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default RaiseRequestForEmployee;
