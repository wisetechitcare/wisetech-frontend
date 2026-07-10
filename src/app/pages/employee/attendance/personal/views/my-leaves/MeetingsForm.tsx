import { useState, useEffect, useMemo, useCallback } from 'react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import Select from 'react-select';
import { Modal, Form as BootstrapForm, Row, Col } from 'react-bootstrap';
import { errorConfirmation, successConfirmation } from '@utils/modal';
import { createMeetings, fetchAllEmployees } from '@services/employee';
import { useSelector } from 'react-redux';
import { RootState } from '@redux/store';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import dayjs, { Dayjs } from 'dayjs';
import { MobileDateTimePicker, MobileDateTimePickerProps } from '@mui/x-date-pickers/MobileDateTimePicker';
import TextInput from '@app/modules/common/inputs/TextInput';
import { UAParser } from 'ua-parser-js';
import { KTIcon } from '@metronic/helpers';
import { T } from '@app/modules/common/components/ui/tokens';

// if user device is iOS/iphone then use norman html date time picker

/** Small icon-badge + label used above each form section — mirrors the
 * "Create New Holiday" form so all quick-action modals share one rhythm. */
const SectionHeading = ({ icon, label }: { icon: string; label: string }) => (
    <div className="d-flex align-items-center gap-2 mb-4">
        <span
            style={{
                width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                background: `${T.color.brand}14`, color: T.color.brand,
            }}
        >
            <KTIcon iconName={icon} className="fs-8" />
        </span>
        <p className="fs-8 fw-bold text-uppercase text-gray-500 m-0" style={{ letterSpacing: '0.8px' }}>{label}</p>
    </div>
);

const sectionBoxStyle: React.CSSProperties = {
    background: '#f8fafc',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '14px',
    border: '1px solid #e9edf2',
    borderTop: `3px solid ${T.color.brand}`,
};

const toggleBtnStyle = (active: boolean): React.CSSProperties => ({
    borderRadius: '8px',
    border: active ? `2px solid ${T.color.brand}` : '1.5px solid #dde2ec',
    background: active ? T.color.brand : '#ffffff',
    color: active ? '#ffffff' : '#6b7280',
    boxShadow: active ? '0 3px 10px rgba(30, 58, 138, 0.22)' : 'none',
    transition: 'all 0.18s ease',
    padding: '8px 0',
    fontSize: '13px',
});


const MeetingsSchema = Yup.object().shape({
    title: Yup.string()
        .min(10, 'Must be at least 10 characters')
        .max(100, 'Cannot exceed 100 characters')
        .required('Title is required'),

    description: Yup.string().required('Description is required'),
    startDate: Yup.date()
        .required('Start date is required')
        .test('is-future', 'Meeting cannot be scheduled in the past', function(value) {
            return !value || dayjs(value).isAfter(dayjs().subtract(1, 'minute'));
        }),
    endDate: Yup.date()
        .required('End date is required')
        .test('is-after-start', 'End date must be after start date', function(value) {
            const { startDate } = this.parent;
            return !startDate || !value || dayjs(value).isAfter(dayjs(startDate));
        })
        .test('is-future', 'Meeting end time cannot be in the past', function(value) {
            return !value || dayjs(value).isAfter(dayjs().subtract(1, 'minute'));
        }),

    meetingLink: Yup.string().nullable().when("isOnline", {
        is: true,
        then: (schema) => schema.required("Meeting link is required for online meetings"),
        otherwise: (schema) => schema.nullable(),
    }),

    location: Yup.string().nullable().when("isOnline", {
        is: false,
        then: (schema) => schema.required("Location is required for offline meetings"),
        otherwise: (schema) => schema.nullable(),
    }),

    participants: Yup.array().min(1, "At least one participant is required"),
});

// Optimized DateTimePicker using mobile design for all devices
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
    const pickerProps = useMemo(() => ({
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
                variant: 'outlined' as const,
                error: Boolean(error && touched),
                helperText: (error && touched) ? error : '',
                size: 'small',
                InputProps: {
                    style: { fontSize: '14px' }
                }
            },
            // Optimize dialog for better mobile experience
            dialog: {
                PaperProps: {
                    style: {
                        maxHeight: '85vh',
                        maxWidth: '95vw',
                        margin: '10px',
                        borderRadius: '12px'
                    },
                },
            },
            // Optimize layout for better mobile performance
            layout: {
                sx: {
                    '& .MuiPickersLayout-root': {
                        maxHeight: '70vh',
                        overflow: 'auto'
                    }
                }
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
    }), [value, onChange, error, touched, minDateTime, props]);

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
        <BootstrapForm.Group className='mb-0'>
            <label className="fs-7 fw-bold text-gray-700 d-block mb-2">{label} <span className="text-danger">*</span></label>
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
                <MobileDateTimePicker {...pickerProps}
                />
            )}
            {error && touched && (
                <BootstrapForm.Text className="text-danger small mt-1">
                    {error}
                </BootstrapForm.Text>
            )}
        </BootstrapForm.Group>
    );
};

export default function MeetingsForm({ onClose, selectedDateTimeInfo }: { onClose: () => void, selectedDateTimeInfo: any }) {
    const [loading, setLoading] = useState(false);
    const [participants, setParticipants] = useState<{ label: string; value: string }[]>([]);
    const [participantsLoading, setParticipantsLoading] = useState(true);
    const employeeId = useSelector((state: RootState) => state.employee.currentEmployee.id);

    // Memoize initial values to prevent unnecessary re-renders
    const initialValues = useMemo(() => {
        let startDate = null;
        let endDate = null;
        const now = dayjs();

        // Handle selected date from calendar
        if (selectedDateTimeInfo?.start) {
            const selectedStart = dayjs(selectedDateTimeInfo.start);

            // If selected date is in the past, use current date/time instead
            if (selectedStart.isBefore(now)) {
                startDate = now;
            } else {
                startDate = selectedStart;
                if (selectedDateTimeInfo.allDay) {
                    // If it's an all-day selection, set to current time or next hour if same day
                    if (selectedStart.isSame(now, 'day')) {
                        // Same day: use current time + 1 hour to avoid immediate past time
                        startDate = now.add(1, 'hour');
                    } else {
                        // Future day: use 9 AM as default meeting time
                        startDate = selectedStart.hour(9).minute(0).second(0);
                    }
                }
            }
        }

        if (selectedDateTimeInfo?.end) {
            const selectedEnd = dayjs(selectedDateTimeInfo.end);
            
            if (selectedDateTimeInfo.allDay) {
                // If it's an all-day selection, set end to 1 hour after start
                endDate = startDate ? startDate.add(1, 'hour') : now.add(2, 'hour');
            } else {
                // If selected end date is in the past, set to 1 hour after start
                if (selectedEnd.isBefore(now) || (startDate && selectedEnd.isBefore(startDate))) {
                    endDate = startDate ? startDate.add(1, 'hour') : now.add(1, 'hour');
                } else {
                    endDate = selectedEnd;
                }
            }
        }

        // If no dates selected, default to current time + 1 hour for start and + 2 hours for end
        if (!startDate) {
            startDate = now.add(1, 'hour');
        }
        if (!endDate) {
            endDate = startDate.add(1, 'hour');
        }

        return {
            title: '',
            description: '',
            startDate,
            endDate,
            isOnline: true,
            meetingLink: '',
            location: '',
            participants: [] as string[],
        };
    }, [selectedDateTimeInfo]);

    // Fetch Employee List with error handling and loading state
    useEffect(() => {
        let isMounted = true;
        
        async function fetchParticipants() {
            try {
                setParticipantsLoading(true);
                const response = await fetchAllEmployees();
                
                if (!isMounted) return;
                
                const employees = response?.data?.employees || [];
                const formattedParticipants = employees.map((emp: any) => ({
                    label: `${emp.users?.firstName || ''} ${emp.users?.lastName || ''}`.trim(),
                    value: emp.id,
                })).filter((p: any) => p.label && p.value); // Filter out invalid entries

                setParticipants(formattedParticipants);
            } catch (error) {
                console.error("Failed to fetch participants", error);
                if (isMounted) {
                    errorConfirmation("Failed to load participants");
                }
            } finally {
                if (isMounted) {
                    setParticipantsLoading(false);
                }
            }
        }
        
        fetchParticipants();
        
        return () => {
            isMounted = false;
        };
    }, []);

    // Optimize select styles for better performance
    const selectStyles = useMemo(() => ({
        control: (provided: any, state: any) => ({
            ...provided,
            borderRadius: '8px',
            minHeight: '42px',
            fontSize: '14px',
            borderColor: state.isFocused ? T.color.brand : '#dde2ec',
            boxShadow: 'none',
            '&:hover': {
                borderColor: T.color.brand,
            },
        }),
        multiValue: (provided: any) => ({
            ...provided,
            backgroundColor: T.color.brandSoft,
            borderRadius: '6px',
            fontSize: '13px'
        }),
        multiValueLabel: (provided: any) => ({
            ...provided,
            color: T.color.brand,
            fontSize: '13px',
            padding: '3px 6px'
        }),
        multiValueRemove: (provided: any) => ({
            ...provided,
            color: T.color.brand,
            fontSize: '16px',
            ':hover': {
                backgroundColor: T.color.accent,
                color: 'white',
            },
        }),
        menu: (provided: any) => ({
            ...provided,
            borderRadius: '8px',
            zIndex: 9999,
            maxHeight: '200px',
            fontSize: '14px'
        }),
        menuList: (provided: any) => ({
            ...provided,
            maxHeight: '200px',
        }),
        option: (provided: any, state: any) => ({
            ...provided,
            fontSize: '14px',
            padding: '8px 12px',
            backgroundColor: state.isSelected ? T.color.brand : state.isFocused ? '#EEF2FF' : 'white',
            color: state.isSelected ? 'white' : '#374151',
            ':hover': {
                backgroundColor: state.isSelected ? T.color.brand : '#EEF2FF',
            },
        }),
        placeholder: (provided: any) => ({
            ...provided,
            fontSize: '14px',
            color: '#6c757d'
        }),
        loadingIndicator: (provided: any) => ({
            ...provided,
            color: '#6c757d'
        })
    }), []);

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Formik
                initialValues={initialValues}
                validationSchema={MeetingsSchema}
                enableReinitialize={true}
                onSubmit={async (values, { setSubmitting }) => {
                    setLoading(true);
                    try {
                        // Validate dates
                        if (values.startDate && values.endDate && dayjs(values.endDate).isBefore(values.startDate)) {
                            errorConfirmation("End date must be after start date");
                            return;
                        }

                        const formattedParticipants = values.participants;

                        const response = await createMeetings({
                            ...values,
                            participants: formattedParticipants,
                            employeeId,
                        });
                        
                        if (response && response.statusCode === 201) {
                            successConfirmation("Meeting created successfully");
                            document.dispatchEvent(new CustomEvent("meetingAdded", { detail: response.data }));
                            onClose();
                        } else {
                            console.error("Invalid response from API:", response);
                            errorConfirmation("Failed to create meeting - Invalid response.");
                        }

                    } catch (error) {
                        console.error("Error creating meeting:", error);
                        errorConfirmation("Failed to create meeting");
                    } finally {
                        setLoading(false);
                        setSubmitting(false);
                    }
                }}
            >
                {({ values, setFieldValue, errors, touched, isSubmitting }) => (
                    <Form>
                        <Modal.Body className='p-2'>
                            {/* ── SECTION 1 · Meeting Details ──────────────────────────── */}
                            <div style={sectionBoxStyle}>
                                <SectionHeading icon="setting-2" label="Meeting Details" />
                                <div className="mb-4">
                                    <label className="fs-7 fw-bold text-gray-700 d-block mb-3">
                                        Meeting Type <span className="text-danger">*</span>
                                    </label>
                                    <div className="d-flex gap-2" style={{ maxWidth: 280 }}>
                                        {[{ label: 'Online', value: true }, { label: 'Offline', value: false }].map(opt => (
                                            <button
                                                key={String(opt.value)}
                                                type="button"
                                                onClick={() => setFieldValue('isOnline', opt.value)}
                                                className="btn btn-sm fw-semibold flex-fill d-flex align-items-center justify-content-center gap-1.5"
                                                style={toggleBtnStyle(values.isOnline === opt.value)}
                                            >
                                                {values.isOnline === opt.value && <i className="bi bi-check-circle-fill" style={{ fontSize: 12 }} />}
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <TextInput
                                    isRequired
                                    label='Title'
                                    formikField='title'
                                    placeholder='Enter meeting title'
                                />
                                <BootstrapForm.Control.Feedback type='invalid'>{errors.title}</BootstrapForm.Control.Feedback>
                            </div>

                            {/* ── SECTION 2 · Meeting Link / Location ──────────────────── */}
                            <div style={sectionBoxStyle}>
                                <SectionHeading icon="geolocation" label={values.isOnline ? 'Meeting Link' : 'Location'} />
                                <TextInput
                                    label={values.isOnline ? "Meeting Link" : "Location"}
                                    formikField={values.isOnline ? "meetingLink" : "location"}
                                    isRequired
                                    placeholder={values.isOnline ? "Enter meeting link (Zoom, Teams, etc.)" : "Enter meeting location"}
                                />
                                <BootstrapForm.Control.Feedback type="invalid">
                                    {values.isOnline ? errors.meetingLink : errors.location}
                                </BootstrapForm.Control.Feedback>
                            </div>

                            {/* ── SECTION 3 · Participants ─────────────────────────────── */}
                            <div style={sectionBoxStyle}>
                                <SectionHeading icon="people" label="Participants" />
                                <label className="fs-7 fw-bold text-gray-700 d-block mb-2">
                                    Add Participant <span className="text-danger">*</span>
                                </label>
                                <Select
                                    isMulti
                                    options={participants}
                                    value={participants.filter(p => values.participants.includes(p.value))}
                                    onChange={(selected: any) =>
                                        setFieldValue('participants', selected?.map((s: { value: string }) => s.value) || [])
                                    }
                                    styles={selectStyles}
                                    placeholder={
                                        participantsLoading
                                            ? "Loading participants..."
                                            : "Select meeting participants"
                                    }
                                    isLoading={participantsLoading}
                                    isDisabled={participantsLoading}
                                    noOptionsMessage={() =>
                                        participantsLoading ? "Loading..." : "No participants found"
                                    }
                                />
                                {errors.participants && touched.participants && (
                                    <div className="text-danger fs-8 mt-1">{errors.participants as string}</div>
                                )}
                            </div>

                            {/* ── SECTION 4 · Schedule ─────────────────────────────────── */}
                            <div style={sectionBoxStyle}>
                                <SectionHeading icon="calendar" label="Schedule" />
                                <Row>
                                    <Col md={6}>
                                        <OptimizedDateTimePicker
                                            label="Start Date and Time"
                                            value={values.startDate}
                                            onChange={(date: Dayjs | null) => {
                                                setFieldValue('startDate', date);
                                                // Auto-set end date to 1 hour later if not set or if end is before start
                                                if (date && (!values.endDate || dayjs(values.endDate).isBefore(date))) {
                                                    setFieldValue('endDate', date.add(1, 'hour'));
                                                }
                                                // Validate that the selected date is not in the past
                                                if (date && date.isBefore(dayjs())) {
                                                    errorConfirmation("Meeting cannot be scheduled in the past. Please select a future date and time.");
                                                    setFieldValue('startDate', dayjs().add(1, 'hour'));
                                                    setFieldValue('endDate', dayjs().add(2, 'hour'));
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
                                            onChange={(date: Dayjs | null) => setFieldValue('endDate', date)}
                                            error={errors.endDate}
                                            touched={touched.endDate}
                                            minDateTime={values.startDate ? dayjs(values.startDate) : dayjs()}
                                        />
                                    </Col>
                                </Row>
                            </div>

                            {/* ── SECTION 5 · Description ──────────────────────────────── */}
                            <div style={{ ...sectionBoxStyle, marginBottom: '18px' }}>
                                <SectionHeading icon="text" label="Description" />
                                <TextInput
                                    isRequired
                                    label='Description'
                                    formikField='description'
                                    placeholder='Enter meeting description'
                                />
                                <BootstrapForm.Control.Feedback type='invalid'>{errors.description}</BootstrapForm.Control.Feedback>
                            </div>

                            {/* ── FOOTER ────────────────────────────────────────────────── */}
                            <div className="d-flex align-items-center justify-content-end gap-3 pt-4" style={{ borderTop: '1px solid #eef1f5' }}>
                                <button
                                    type="button"
                                    className="btn btn-sm fw-semibold px-6"
                                    style={{ borderRadius: '8px', border: '1.5px solid #dde2ec', background: '#ffffff', color: '#6b7280', fontSize: '13px' }}
                                    onClick={onClose}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-sm fw-bold px-7 text-white d-flex align-items-center gap-2"
                                    disabled={loading || isSubmitting}
                                    style={{
                                        borderRadius: '8px',
                                        background: loading || isSubmitting ? '#93A8D4' : `linear-gradient(180deg, ${T.color.brand} 0%, ${T.color.brandHover} 100%)`,
                                        border: 'none',
                                        fontSize: '13px',
                                        boxShadow: '0 4px 12px rgba(30, 58, 138, 0.25)',
                                        transition: 'all 0.2s ease',
                                        minWidth: '120px',
                                        justifyContent: 'center',
                                    }}
                                >
                                    {loading ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm"></span>
                                            Submitting…
                                        </>
                                    ) : (
                                        <>
                                            <i className="bi bi-check2" style={{ fontSize: 14 }} />
                                            Submit
                                        </>
                                    )}
                                </button>
                            </div>
                        </Modal.Body>
                    </Form>
                )}
            </Formik>
        </LocalizationProvider>
    );
}