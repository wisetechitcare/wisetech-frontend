import { useState, useEffect, useMemo, useCallback } from 'react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import Select from 'react-select';
import { Button, Modal, Form as BootstrapForm, Row, Col, Spinner } from 'react-bootstrap';
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

// if user device is iOS/iphone then use norman html date time picker


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
        <BootstrapForm.Group className='mb-3'>
            <BootstrapForm.Label className='fs-6'>{label}</BootstrapForm.Label>
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
            minHeight: '38px',
            fontSize: '14px',
            borderColor: state.isFocused ? '#86b7fe' : '#ced4da',
            boxShadow: state.isFocused ? '0 0 0 0.25rem rgba(13, 110, 253, 0.25)' : 'none',
            '&:hover': {
                borderColor: state.isFocused ? '#86b7fe' : '#ced4da',
            },
        }),
        multiValue: (provided: any) => ({
            ...provided,
            backgroundColor: '#e9ecef',
            fontSize: '13px'
        }),
        multiValueLabel: (provided: any) => ({
            ...provided,
            fontSize: '13px',
            padding: '3px 6px'
        }),
        multiValueRemove: (provided: any) => ({
            ...provided,
            fontSize: '16px',
            ':hover': {
                backgroundColor: '#dc3545',
                color: 'white',
            },
        }),
        menu: (provided: any) => ({
            ...provided,
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
            backgroundColor: state.isSelected ? '#0d6efd' : state.isFocused ? '#f8f9fa' : 'white',
            color: state.isSelected ? 'white' : '#212529',
            ':hover': {
                backgroundColor: state.isSelected ? '#0d6efd' : '#e9ecef',
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
                    <Form placeholder={''}>
                        <Modal.Body className='p-2'>
                            {/* Meeting Type Selection */}
                            <BootstrapForm.Group className='mb-1'>
                                <BootstrapForm.Label className='fw-bold'>Meeting Type</BootstrapForm.Label>
                                <div>
                                    <BootstrapForm.Check
                                        inline
                                        type='radio'
                                        label='Online'
                                        name='isOnline'
                                        checked={values.isOnline}
                                        onChange={() => setFieldValue('isOnline', true)}
                                    />
                                    <BootstrapForm.Check
                                        inline
                                        type='radio'
                                        label='Offline'
                                        name='isOnline'
                                        checked={!values.isOnline}
                                        onChange={() => setFieldValue('isOnline', false)}
                                    />
                                </div>
                            </BootstrapForm.Group>

                            {/* Title */}
                            <BootstrapForm.Group className='mb-3'>
                                <TextInput
                                    isRequired
                                    label='Title'
                                    formikField='title'
                                    placeholder='Enter meeting title'
                                />
                                <BootstrapForm.Control.Feedback type='invalid'>{errors.title}</BootstrapForm.Control.Feedback>
                            </BootstrapForm.Group>

                            {/* Meeting Link or Location */}
                            <BootstrapForm.Group className="mb-3">
                                <TextInput
                                    label={values.isOnline ? "Meeting Link" : "Location"}
                                    formikField={values.isOnline ? "meetingLink" : "location"}
                                    isRequired
                                    placeholder={values.isOnline ? "Enter meeting link (Zoom, Teams, etc.)" : "Enter meeting location"}
                                />
                                <BootstrapForm.Control.Feedback type="invalid">
                                    {values.isOnline ? errors.meetingLink : errors.location}
                                </BootstrapForm.Control.Feedback>
                            </BootstrapForm.Group>

                            {/* Participants Selection */}
                            <BootstrapForm.Group className='mb-3'>
                                <BootstrapForm.Label className='fs-6'>Add Participant</BootstrapForm.Label>
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
                                    <div className="text-danger">{errors.participants}</div>
                                )}
                            </BootstrapForm.Group>

                            {/* Start and End Date Pickers - Mobile Optimized for All Devices */}
                            <Row className='mt-5'>
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

                            {/* Description */}
                            <BootstrapForm.Group className='mt-3'>
                                <TextInput
                                    isRequired
                                    label='Description'
                                    formikField='description'
                                    placeholder='Enter meeting description'
                                />
                                <BootstrapForm.Control.Feedback type='invalid'>{errors.description}</BootstrapForm.Control.Feedback>
                            </BootstrapForm.Group>
                        </Modal.Body>

                        <Modal.Footer>
                            <Button variant='secondary' onClick={onClose} className='text-white'>Cancel</Button>
                            <Button type='submit' variant='primary' disabled={loading || isSubmitting}>
                                {loading ? (
                                    <>
                                        Submitting...
                                        <Spinner animation="border" size="sm" className="me-2" />
                                    </>
                                ) : (
                                    "Submit"
                                )}
                            </Button>
                        </Modal.Footer>
                    </Form>
                )}
            </Formik>
        </LocalizationProvider>
    );
}