import DropDownInput from "@app/modules/common/inputs/DropdownInput";
import TextInput from "@app/modules/common/inputs/TextInput";
import TimePickerInput from "@app/modules/common/inputs/TimeInput";
import { RootState } from "@redux/store";
import { createUpdateAttendanceRequest } from "@services/employee";
import { fetchWorkingMethods } from "@services/options";
import { errorConfirmation, successConfirmation } from "@utils/modal";
import { isValidTime } from "@utils/statistics";
import dayjs from "dayjs";
import { Formik } from "formik";
import { useState, useEffect, useMemo } from "react";
import { Modal, Form } from "react-bootstrap";
import { useSelector } from "react-redux";
import * as Yup from "yup";
import eventBus from "@utils/EventBus";
import { EVENT_KEYS } from "@constants/eventKeys";

interface EditAttendanceRequestProps {
  show: boolean;
  onHide: () => void;
  selectedAttendanceRequest: any;
}

const EditAttendanceRequest = ({
  show,
  onHide,
  selectedAttendanceRequest,
}: EditAttendanceRequestProps) => {
  const [workingMethodOptions, setWorkingMethodOptions] = useState<any[]>([]);
  const currentEmployeeId = useSelector(
    (state: any) => state.employee?.currentEmployee?.id
  );

  const currentCompanyId = useSelector((state: RootState) => state?.employee?.currentEmployee?.companyId);

  // Fetch working methods properly
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

  // Prepare initial form values
  const initialValues = useMemo(() => {
    const attendance = selectedAttendanceRequest || {};

    // Check if attendanceRequests exists (nested structure) or use attendance directly
    const req = attendance?.attendanceRequests || attendance;

    return {
      id: req?.id || null,
      employeeId: req?.employeeId || "",
      checkIn: req?.checkIn || "",
      checkOut: req?.checkOut || "",
      workingMethodId: req?.workingMethodId || "",
      remarks: req?.remarks || "",
      date: attendance?.date || req?.date || "",
      status: req?.status !== undefined ? String(req.status) : "0",
    };
  }, [selectedAttendanceRequest]);

  const validationSchema = Yup.object({
    checkIn: Yup.string().required("Check In is required"),
    remarks: Yup.string().required("Remarks are required"),
    workingMethodId: Yup.string().required("Working Method is required"),
  });

  // Handle form submission
  const handleSubmit = async (values: any, { setSubmitting, resetForm }: any) => {
    console.log("values", values);

    try {
      // Validate company ID exists
      if (!currentCompanyId) {
        errorConfirmation("Company ID is missing. Please refresh and try again.");
        return;
      }

      // Validate employee ID exists
      if (!values.employeeId) {
        errorConfirmation("Employee ID is missing. Please refresh and try again.");
        return;
      }

      const formattedDate = dayjs(values.date).format("YYYY-MM-DD");
      const updatedValues = { ...values };

      // Validate & format Check-In
      // Use IST (Asia/Kolkata) timezone so that "17:45" is stored as 12:15 UTC (not 17:45 UTC)
      // which would make checkout appear as 5:45 AM instead of 5:45 PM in reports.
      if (values.checkIn) {
        if (!isValidTime(values.checkIn)) {
          errorConfirmation("Enter Check In in HH:MM (24 hr format)");
          return;
        }
        // const checkInUTC = dayjs(`${formattedDate} ${values.checkIn}`, "YYYY-MM-DD HH:mm").toISOString();

        const checkInUTC = dayjs.tz(`${formattedDate} ${values.checkIn}`, "YYYY-MM-DD HH:mm", "Asia/Kolkata").toISOString();
        updatedValues.checkIn = checkInUTC;
      }

      // Validate & format Check-Out
      if (values.checkOut && values.checkOut !== "-NA-") {
        if (!isValidTime(values.checkOut)) {
          errorConfirmation("Enter Check Out in HH:MM (24 hr format)");
          return;
        }
        const checkOutUTC = dayjs.tz(`${formattedDate} ${values.checkOut}`, "YYYY-MM-DD HH:mm", "Asia/Kolkata").toISOString();
        updatedValues.checkOut = checkOutUTC;
      } else {
        delete updatedValues.checkOut;
      }

      // Validate time sequence
      if (updatedValues.checkIn && updatedValues.checkOut) {
        if (!dayjs(updatedValues.checkOut).isAfter(dayjs(updatedValues.checkIn))) {
          errorConfirmation("Check Out must be after Check In");
          return;
        }
      }

      //  FINAL PAYLOAD (Fixed)
      const finalPayload: any = {
        employeeId: updatedValues.employeeId,
        workingMethodId: updatedValues.workingMethodId,
        companyId: currentCompanyId,
        checkIn: updatedValues.checkIn || null,
        checkOut: updatedValues.checkOut || null,
        remarks: updatedValues.remarks || "",
        latitude: 0.0,
        longitude: 0.0,
        status: Number(updatedValues.status) || 0, //  added required field
        updatedById: currentEmployeeId, // Track who updated the request
      };

      // Include the ID if it exists (for updating existing requests)
      if (values.id) {
        finalPayload.id = values.id;
      }

      console.log("finalPayload", finalPayload);

      const response = await createUpdateAttendanceRequest(finalPayload, true);

      // Emit event to refresh both tables
      if (values.id) {
        eventBus.emit(EVENT_KEYS.attendanceRequestUpdated, { id: values.id });
      } else {
        eventBus.emit(EVENT_KEYS.attendanceRequestCreated, { id: response?.data?.id || finalPayload.id || "" });
      }

      successConfirmation("Attendance Request saved successfully");
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
        <Modal.Title>Edit Request (24 hr HH:MM)</Modal.Title>
      </Modal.Header>

      <Modal.Body>
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
              id="attendance_edit_form"
              onSubmit={formikProps.handleSubmit}
            >
              <div className="col-lg mb-5">
                <TimePickerInput
                  isRequired
                  label="Check In"
                  formikField="checkIn"
                  placeholder="HH MM"
                />
              </div>

              <div className="col-lg mb-5">
                <TimePickerInput
                  label="Check Out"
                  formikField="checkOut"
                  placeholder="HH MM"
                />
              </div>

              <div className="col-lg mb-5">
                <TextInput
                  isRequired
                  label="Remarks"
                  formikField="remarks"
                />
              </div>

              <div className="col-lg mb-5">
                <DropDownInput
                  isRequired={false}
                  formikField="workingMethodId"
                  inputLabel="Working Method"
                  options={workingMethodOptions}
                />
              </div>

              <div className="col-lg mb-5">
                <DropDownInput
                  isRequired={false}
                  formikField="status"
                  inputLabel="Status"
                  options={[
                    { label: "Pending", value: "0" },
                    { label: "Approved", value: "1" },
                    { label: "Rejected", value: "2" },
                  ]}

                />
              </div>

              <div className="d-flex justify-content-end mt-8">
                <button
                  type="submit"
                  disabled={formikProps.isSubmitting}
                  className="btn btn-primary"
                  style={{ backgroundColor: "#9D4141", borderColor: "#9D4141" }}
                >
                  {formikProps.isSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </Modal.Body>
    </Modal>
  );
};

export default EditAttendanceRequest;

