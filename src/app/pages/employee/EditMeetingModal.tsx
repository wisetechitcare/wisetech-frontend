import { useMemo, useState, useEffect } from "react";
import { Modal, Form as BootstrapForm, Row, Col, Button, Spinner } from "react-bootstrap";
import { Formik } from "formik";
import * as Yup from "yup";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import { updateMeeting } from "@services/employee";
import { errorConfirmation, successConfirmation } from "@utils/modal";
import TextInput from "@app/modules/common/inputs/TextInput";
import { LocalizationProvider, MobileDateTimePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import Select from "react-select";
import eventBus from "@utils/EventBus";
import { EVENT_KEYS } from "@constants/eventKeys";
import { UAParser } from "ua-parser-js";

interface Meetings {
  id: string;
  title: string;
  isOnline: boolean;
  startDate: string;
  endDate: string;
  employeeId: string;
  participants: string[] | string;
  participantNames?: string[];
  organizerName: string;
  organizerId: string;
  description?: string;
  meetingLink?: string;
  location?: string;
}

interface EditMeetingModalProps {
  isEditModalOpen: boolean;
  setIsEditModalOpen: (open: boolean) => void;
  editingMeeting: Meetings | null;
  participants: { label: string; value: string }[];
}

const MeetingsSchema = Yup.object().shape({
  title: Yup.string()
    .min(10, "Must be at least 10 characters")
    .max(100, "Cannot exceed 100 characters")
    .required("Title is required"),
  description: Yup.string().required("Description is required"),
  startDate: Yup.date().required("Start date is required"),
  endDate: Yup.date().required("End date is required"),
  meetingLink: Yup.string()
    .nullable()
    .when("isOnline", {
      is: true,
      then: (schema) =>
        schema.required("Meeting link is required for online meetings"),
      otherwise: (schema) => schema.nullable(),
    }),
  location: Yup.string()
    .nullable()
    .when("isOnline", {
      is: false,
      then: (schema) =>
        schema.required("Location is required for offline meetings"),
      otherwise: (schema) => schema.nullable(),
    }),
  participants: Yup.array().min(1, "At least one participant is required"),
});

  const OptimizedDateTimePicker = ({
    value,
    onChange,
    label,
    error,
    touched,
    minDateTime,
    ...props
  }: any) => {
    // Detect if device is iOS mobile
    const [isIOSMobile, setIsIOSMobile] = useState<boolean>(false);
    
    useEffect(() => {
        const parser = new UAParser();
        const result = parser.getResult();
        setIsIOSMobile(
            result.device.type === 'mobile' && 
            result.os.name === 'iOS'
        );
    }, []);
    
    // Memoize picker props for better performance
    const pickerProps = useMemo(
      () => ({
        value: value ? dayjs(value) : null,
        onChange: (date: Dayjs | null) => {
          if (onChange) {
            onChange(date);
          }
        },
        format: "DD/MM/YYYY hh:mm A",
        minDateTime: minDateTime || dayjs(),
        // Use 12-hour format with AM/PM
        ampm: true,
        slotProps: {
          textField: {
            fullWidth: true,
            variant: "outlined" as const,
            error: Boolean(error && touched),
            helperText: error && touched ? error : "",
            size: "small",
            InputProps: {
              style: { fontSize: "14px" },
            },
          },
          // Optimize dialog for better mobile experience
          dialog: {
            PaperProps: {
              style: {
                maxHeight: "85vh",
                maxWidth: "95vw",
                margin: "10px",
                borderRadius: "12px",
              },
            },
          },
          // Optimize layout for better mobile performance
          layout: {
            sx: {
              "& .MuiPickersLayout-root": {
                maxHeight: "70vh",
                overflow: "auto",
              },
            },
          },
          toolbar: {
            sx: {
                // Style the entire container for the time display
                '& .MuiDateTimePickerToolbar-timeContainer': {
                    alignItems: 'center',
                },
                // AM/PM container buttons
                '& .MuiDateTimePickerToolbar-ampmSelection .MuiButtonBase-root': {
                    borderRadius: 8,
                    minWidth: '48px',
                    border: '1px solid transparent',
                },
                // AM/PM text itself
                '& .MuiDateTimePickerToolbar-ampmSelection .MuiButtonBase-root span': {
                    fontSize: '1rem',
                    fontWeight: 200,
                },
                // style only the selected AM/PM item
                '& .MuiDateTimePickerToolbar-ampmSelection .Mui-selected': {
                    padding: '12px',
                    backgroundColor: '#E6F0FF',
                    color: '#0B61D8',
                    borderColor: '#0B61D8',
                    fontWeight: 900,
                    borderRadius: '30px',
                },
            },
        },
        },
        // Always use mobile optimized version for consistency and performance
        reduceAnimations: true,
        // Disable unnecessary animations for better performance
        TransitionComponent: undefined,
        ...props,
      }),
      [value, onChange, error, touched, minDateTime, props]
    );

    // Format the date value for HTML input if needed
    const formatDateForHTMLInput = (dateValue: any) => {
        if (!dateValue) return '';
        const date = dayjs(dateValue);
        return date.format('YYYY-MM-DDTHH:mm');
    };

    // Handle change for HTML datetime-local input
    const handleHTMLDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = e.target.value ? dayjs(e.target.value) : null;
        if (onChange) {
            onChange(newDate);
        }
    };
    
    return (
      <BootstrapForm.Group className="mb-3">
        <BootstrapForm.Label className="fs-6">{label}</BootstrapForm.Label>
        {isIOSMobile ? (
            // Use native HTML datetime-local input for iOS mobile devices
            <BootstrapForm.Control
                type="datetime-local"
                value={formatDateForHTMLInput(value)}
                onChange={handleHTMLDateChange}
                min={minDateTime ? formatDateForHTMLInput(minDateTime) : formatDateForHTMLInput(dayjs())}
                isInvalid={Boolean(error && touched)}
                className="form-control"
            />
        ) : (
            // Use MUI MobileDateTimePicker for all other devices
            <MobileDateTimePicker {...pickerProps} />
        )}
        {error && touched && (
          <BootstrapForm.Text className="text-danger small mt-1">
            {error}
          </BootstrapForm.Text>
        )}
      </BootstrapForm.Group>
    );
  };



const EditMeetingModal = ({ isEditModalOpen, setIsEditModalOpen, editingMeeting, participants }: EditMeetingModalProps) => {

  // console.log("editingMeeting", editingMeeting);
  // console.log("participants", participants);
  // console.log("isEditModalOpen", isEditModalOpen);

  const [loading, setLoading] = useState(false);
  const employeeId = useSelector((state: RootState) => state.employee.currentEmployee?.id);

  if (!editingMeeting) return null;

  return (
    <Modal show={isEditModalOpen} onHide={() => setIsEditModalOpen(false)}>
      <Modal.Header closeButton>
        <Modal.Title>Edit Meeting</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Formik
          initialValues={{
            title: editingMeeting.title,
            description: editingMeeting.description || "",
            startDate: editingMeeting.startDate,
            endDate: editingMeeting.endDate,
            isOnline: editingMeeting.isOnline,
            meetingLink: editingMeeting.meetingLink || "",
            location: editingMeeting.location || "",
            participants: typeof editingMeeting.participants === 'string'
              ? JSON.parse(editingMeeting.participants)
              : editingMeeting.participants,
          }}
          validationSchema={MeetingsSchema}
          onSubmit={async (values, { setSubmitting }) => {
            if (employeeId !== editingMeeting.organizerId && employeeId !== editingMeeting.employeeId) {
              errorConfirmation("You are not authorized to update this meeting.");
              return;
            }

            try {
              setLoading(true);
              await updateMeeting(
                editingMeeting.id,
                employeeId,
                {
                  ...values,
                  employeeId,
                }
              );

              eventBus.emit(EVENT_KEYS.meetingUpdated);
              successConfirmation("Meeting updated successfully!");
              setIsEditModalOpen(false);
            } catch (error) {
              errorConfirmation("Failed to update meeting.");
            } finally {
              setLoading(false);
              setSubmitting(false);
            }
          }}
        >
          {({ values, setFieldValue, errors, touched, handleSubmit }) => (
            <BootstrapForm onSubmit={handleSubmit}>
              <BootstrapForm.Group className="mb-2">
                <BootstrapForm.Label className="fw-bold">Meeting Type</BootstrapForm.Label>
                <div>
                  <BootstrapForm.Check
                    inline
                    type="radio"
                    label="Online"
                    name="isOnline"
                    checked={values.isOnline}
                    onChange={() => setFieldValue("isOnline", true)}
                  />
                  <BootstrapForm.Check
                    inline
                    type="radio"
                    label="Offline"
                    name="isOnline"
                    checked={!values.isOnline}
                    onChange={() => setFieldValue("isOnline", false)}
                  />
                </div>
              </BootstrapForm.Group>

              <BootstrapForm.Group className="mb-2">
                <TextInput label="Title" isRequired formikField="title" />
              </BootstrapForm.Group>

              <BootstrapForm.Group className="mb-2">
                <TextInput
                  label={values.isOnline ? "Meeting Link" : "Location"}
                  formikField={values.isOnline ? "meetingLink" : "location"}
                  isRequired
                />
              </BootstrapForm.Group>

              <BootstrapForm.Group className="mb-2">
                <BootstrapForm.Label>Add Participant</BootstrapForm.Label>
                <Select
                  isMulti
                  options={participants}
                  value={participants.filter((p) =>
                    values.participants.includes(p.value)
                  )}
                  onChange={(selected: any) =>
                    setFieldValue(
                      "participants",
                      selected.map((s: { value: string }) => s.value)
                    )
                  }
                />
                {errors.participants && touched.participants && (
                  <div className="text-danger">
                    {typeof errors.participants === 'string'
                      ? errors.participants
                      : 'At least one participant is required'}
                  </div>
                )}
              </BootstrapForm.Group>

              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <Row>
                  <Col md={6}>
                    <OptimizedDateTimePicker
                      label="Start Date and Time"
                      value={values.startDate}
                      onChange={(date: Dayjs | null) => {
                        setFieldValue("startDate", date);
                        if (
                          date &&
                          (!values.endDate ||
                            dayjs(values.endDate).isBefore(date))
                        ) {
                          setFieldValue("endDate", date.add(1, "hour"));
                        }
                      }}
                      error={errors.startDate}
                      touched={touched.startDate}
                    />
                  </Col>
                  <Col md={6}>
                    <OptimizedDateTimePicker
                      label="End Date and Time"
                      value={values.endDate}
                      onChange={(date: Dayjs | null) =>
                        setFieldValue("endDate", date)
                      }
                      error={errors.endDate}
                      touched={touched.endDate}
                      minDateTime={
                        values.startDate
                          ? dayjs(values.startDate)
                          : dayjs()
                      }
                    />
                  </Col>
                </Row>
              </LocalizationProvider>

              <BootstrapForm.Group className="mb-2 mt-3">
                <TextInput
                  label="Description"
                  formikField="description"
                  isRequired
                />
              </BootstrapForm.Group>

              <Modal.Footer>
                <Button variant="secondary" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      Updating...
                      <Spinner animation="border" size="sm" className="ms-2" />
                    </>
                  ) : (
                    "Update"
                  )}
                </Button>
              </Modal.Footer>
            </BootstrapForm>
          )}
        </Formik>
      </Modal.Body>
    </Modal>
  );
};

export default EditMeetingModal;
