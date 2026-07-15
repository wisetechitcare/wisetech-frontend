import { useState, useEffect, useMemo } from 'react';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import Select from 'react-select';
import { Modal, Form as BootstrapForm, Row, Col } from 'react-bootstrap';
import { errorConfirmation, successConfirmation } from '@utils/modal';
import { createMeetings, fetchAllEmployees } from '@services/employee';
import { getAllCompanyTypes, getAllClientCompanies } from '@services/companies';
import { getAllProjects } from '@services/projects';
import { getLeadById } from '@services/leadService';
import { useSelector } from 'react-redux';
import { RootState } from '@redux/store';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import dayjs, { Dayjs } from 'dayjs';
import { MobileDateTimePicker } from '@mui/x-date-pickers/MobileDateTimePicker';
import TextInput from '@app/modules/common/inputs/TextInput';
import { UAParser } from 'ua-parser-js';
import { KTIcon } from '@metronic/helpers';
import { T } from '@app/modules/common/components/ui/tokens';

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
        {/* Brand navy (not grey) so the heading is clearly readable — matches the
            icon chip and the card's top border, same treatment as the
            "WORKSPACE CALENDAR" page heading. */}
        <p className="fs-8 fw-bolder text-uppercase m-0" style={{ letterSpacing: '0.8px', color: T.color.brand }}>{label}</p>
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

/** Option row with avatar — react-select renders this for both the menu list
 * and the selected multi-value chips. Falls back to ui-avatars initials,
 * the same pattern the project Teams tab uses. */
const renderParticipantOption = (option: any) => (
    <div className="d-flex align-items-center gap-2">
        <img
            src={option.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(option.label || 'U')}&background=eeeeee&color=888888&size=24&rounded=true`}
            alt=""
            style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
        />
        <span>{option.label}</span>
    </div>
);

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
    projectId: Yup.string().required("Project is required"),
    internalParticipants: Yup.array().min(1, "At least one team member is required"),
});

const OptimizedDateTimePicker = ({ value, onChange, label, error, touched, minDateTime, ...props }: any) => {
    const [isIOSMobile, setIsIOSMobile] = useState<boolean>(false);

    useEffect(() => {
        const parser = new UAParser();
        const result = parser.getResult();
        setIsIOSMobile(result.device.type === 'mobile' && result.os.name === 'iOS');
    }, []);

    const pickerProps = useMemo(() => ({
        value: value ? dayjs(value) : null,
        onChange: (date: Dayjs | null) => onChange?.(date),
        format: "DD/MM/YYYY hh:mm A",
        minDateTime: minDateTime || dayjs(),
        ampm: true,
        slotProps: {
            textField: {
                fullWidth: true,
                variant: 'outlined' as const,
                error: Boolean(error && touched),
                helperText: (error && touched) ? error : '',
                size: 'small',
                InputProps: { style: { fontSize: '14px' } }
            },
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
            toolbar: {
                sx: {
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
        reduceAnimations: true,
        TransitionComponent: undefined,
        ...props,
    }), [value, onChange, error, touched, minDateTime, props]);

    const formatDateForHTMLInput = (dateValue: any) => {
        if (!dateValue) return '';
        return dayjs(dateValue).format('YYYY-MM-DDTHH:mm');
    };

    const handleHTMLDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = e.target.value ? dayjs(e.target.value) : null;
        onChange?.(newDate);
    };

    return (
        <BootstrapForm.Group className='mb-0'>
            <label className="fs-7 fw-bold text-gray-700 d-block mb-2">{label} <span className="text-danger">*</span></label>
            {isIOSMobile ? (
                <BootstrapForm.Control
                    type="datetime-local"
                    value={formatDateForHTMLInput(value)}
                    onChange={handleHTMLDateChange}
                    min={minDateTime ? formatDateForHTMLInput(minDateTime) : formatDateForHTMLInput(dayjs())}
                    isInvalid={Boolean(error && touched)}
                    className="form-control"
                />
            ) : (
                <MobileDateTimePicker {...pickerProps} />
            )}
            {error && touched && (
                <BootstrapForm.Text className="text-danger small mt-1">{error}</BootstrapForm.Text>
            )}
        </BootstrapForm.Group>
    );
};

export default function MeetingsForm({ onClose, selectedDateTimeInfo }: { onClose: () => void, selectedDateTimeInfo: any }) {
    const [loading, setLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(true);
    const [allCompanyTypes, setAllCompanyTypes] = useState<any[]>([]);
    const [allCompanies, setAllCompanies] = useState<any[]>([]);
    const [allProjects, setAllProjects] = useState<any[]>([]);
    // id → { name, avatar } map used to resolve team-member names (team members
    // carry only employeeId — same client-side resolution the project Teams tab uses).
    const [employeeInfoById, setEmployeeInfoById] = useState<Record<string, { name: string; avatar: string | null }>>({});
    // Full lead/project detail (execution.team.members, internalMembers, leadTeams
    // with contact) — the list endpoint doesn't include these, so we fetch the
    // detail via getLeadById when a project is picked.
    const [projectDetail, setProjectDetail] = useState<any>(null);
    const [teamLoading, setTeamLoading] = useState(false);

    const employeeId = useSelector((state: RootState) => state.employee.currentEmployee.id);

    const initialValues = useMemo(() => {
        let startDate = null;
        let endDate = null;
        const now = dayjs();

        if (selectedDateTimeInfo?.start) {
            const selectedStart = dayjs(selectedDateTimeInfo.start);
            if (selectedStart.isBefore(now)) {
                startDate = now;
            } else {
                startDate = selectedStart;
                if (selectedDateTimeInfo.allDay) {
                    startDate = selectedStart.isSame(now, 'day')
                        ? now.add(1, 'hour')
                        : selectedStart.hour(9).minute(0).second(0);
                }
            }
        }

        if (selectedDateTimeInfo?.end) {
            const selectedEnd = dayjs(selectedDateTimeInfo.end);
            if (selectedDateTimeInfo.allDay) {
                endDate = startDate ? startDate.add(1, 'hour') : now.add(2, 'hour');
            } else {
                endDate = selectedEnd.isBefore(now) || (startDate && selectedEnd.isBefore(startDate))
                    ? (startDate ? startDate.add(1, 'hour') : now.add(1, 'hour'))
                    : selectedEnd;
            }
        }

        if (!startDate) startDate = now.add(1, 'hour');
        if (!endDate) endDate = startDate.add(1, 'hour');

        return {
            title: '',
            description: '',
            startDate,
            endDate,
            isOnline: true,
            meetingLink: '',
            location: '',
            fileLocationCompanyType: '',
            fileLocationCompany: '',
            projectId: '',
            internalParticipants: [] as string[],
            externalParticipants: [] as string[],
        };
    }, [selectedDateTimeInfo]);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoadingData(true);
                const [typesRes, companiesRes, projectsRes, employeesRes] = await Promise.all([
                    getAllCompanyTypes(),
                    getAllClientCompanies(),
                    getAllProjects(),
                    fetchAllEmployees(),
                ]);

                setAllCompanyTypes(typesRes.companyTypes || []);
                setAllCompanies(companiesRes?.data?.companies || []);
                setAllProjects(projectsRes?.data?.projects || projectsRes?.projects || []);

                const infoMap: Record<string, { name: string; avatar: string | null }> = {};
                (employeesRes?.data?.employees || []).forEach((emp: any) => {
                    const name = `${emp.users?.firstName || ''} ${emp.users?.lastName || ''}`.trim();
                    if (emp.id && name) {
                        infoMap[emp.id] = { name, avatar: emp.avatar || emp.users?.avatar || null };
                    }
                });
                setEmployeeInfoById(infoMap);
            } catch (error) {
                console.error("Failed to load data", error);
                errorConfirmation("Failed to load project data");
            } finally {
                setLoadingData(false);
            }
        };

        loadData();
    }, []);

    const selectStyles = useMemo(() => ({
        control: (provided: any, state: any) => ({
            ...provided,
            borderRadius: '8px',
            minHeight: '42px',
            fontSize: '14px',
            borderColor: state.isFocused ? T.color.brand : '#dde2ec',
            boxShadow: 'none',
        }),
        multiValue: (provided: any) => ({
            ...provided,
            backgroundColor: T.color.brandSoft,
            borderRadius: '6px',
            fontSize: '13px'
        }),
        option: (provided: any, state: any) => ({
            ...provided,
            fontSize: '14px',
            backgroundColor: state.isSelected ? T.color.brand : state.isFocused ? '#EEF2FF' : 'white',
            color: state.isSelected ? 'white' : '#374151',
        }),
    }), []);

    const getFilteredCompanies = (typeId: string) =>
        allCompanies.filter((c: any) => !typeId || c.companyTypeId === typeId);

    const getFilteredProjects = (typeId: string, companyId: string) =>
        allProjects.filter((p: any) => {
            if (!p.fileLocationCompanyType && !p.fileLocationCompany) return false;
            if (typeId && p.fileLocationCompanyType !== typeId) return false;
            if (companyId && p.fileLocationCompany !== companyId) return false;
            return true;
        });

    // Internal roster — mirrors the project Teams tab: the per-lead internal
    // roster (internalMembers) wins when persisted; otherwise fall back to the
    // live execution-team roster. Team members carry only employeeId, so names
    // resolve from the employee map.
    const getProjectTeamMembers = (projectId: string) => {
        if (!projectDetail || projectDetail.id !== projectId) return [];

        const internal: any[] = (projectDetail.internalMembers || []).filter((m: any) => m.isActive !== false);
        const teamRoster: any[] = projectDetail.execution?.team?.members || [];
        const roster = internal.length > 0 ? internal : teamRoster;

        const seen = new Set<string>();
        return roster
            .filter((m: any) => {
                if (!m.employeeId || seen.has(m.employeeId)) return false;
                seen.add(m.employeeId);
                return true;
            })
            .map((m: any) => ({
                label: employeeInfoById[m.employeeId]?.name || `Employee ${m.employeeId}`,
                value: m.employeeId,
                avatar: employeeInfoById[m.employeeId]?.avatar || null,
            }))
            .sort((a: any, b: any) => a.label.localeCompare(b.label));
    };

    // External roster — the project's client stakeholders: leadTeams contacts
    // plus any additional external members that reference a contact.
    const getProjectExternalParticipants = (projectId: string) => {
        if (!projectDetail || projectDetail.id !== projectId) return [];

        const fromLeadTeams = (projectDetail.leadTeams || [])
            .filter((t: any) => t.contact?.id)
            .map((t: any) => ({
                label: t.contact.fullName || t.company?.companyName || 'Unknown',
                value: t.contact.id,
                avatar: t.contact.profilePhoto || t.contact.avatar || null,
            }));

        const fromExternalMembers = (projectDetail.externalMembers || [])
            .filter((m: any) => m.contactId)
            .map((m: any) => ({
                label: m.name || 'Unknown',
                value: m.contactId,
                avatar: null,
            }));

        const seen = new Set<string>();
        return [...fromLeadTeams, ...fromExternalMembers]
            .filter((o: any) => {
                if (seen.has(o.value)) return false;
                seen.add(o.value);
                return true;
            })
            .sort((a: any, b: any) => a.label.localeCompare(b.label));
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Formik
                initialValues={initialValues}
                validationSchema={MeetingsSchema}
                enableReinitialize={true}
                onSubmit={async (values, { setSubmitting }) => {
                    setLoading(true);
                    try {
                        if (values.startDate && values.endDate && dayjs(values.endDate).isBefore(values.startDate)) {
                            errorConfirmation("End date must be after start date");
                            return;
                        }

                        const payload = {
                            employeeId,
                            title: values.title,
                            description: values.description,
                            startDate: values.startDate ? dayjs(values.startDate).toISOString() : '',
                            endDate: values.endDate ? dayjs(values.endDate).toISOString() : '',
                            isOnline: values.isOnline,
                            meetingLink: values.meetingLink || undefined,
                            location: values.location || undefined,
                            participants: values.internalParticipants?.length ? values.internalParticipants.join(',') : undefined,
                            externalParticipants: values.externalParticipants?.length ? values.externalParticipants.join(',') : undefined,
                            projectId: values.projectId || undefined,
                        };

                        const response = await createMeetings(payload);

                        if (response && response.statusCode === 201) {
                            successConfirmation("Meeting created successfully");
                            document.dispatchEvent(new CustomEvent("meetingAdded", { detail: response.data }));
                            onClose();
                        } else {
                            errorConfirmation("Failed to create meeting");
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
                            {/* Meeting Details */}
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
                            </div>

                            {/* Meeting Link / Location */}
                            <div style={sectionBoxStyle}>
                                <SectionHeading icon="geolocation" label={values.isOnline ? 'Meeting Link' : 'Location'} />
                                <TextInput
                                    label={values.isOnline ? "Meeting Link" : "Location"}
                                    formikField={values.isOnline ? "meetingLink" : "location"}
                                    isRequired
                                    placeholder={values.isOnline ? "Enter meeting link (Zoom, Teams, etc.)" : "Enter meeting location"}
                                />
                            </div>

                            {/* Project Selection (File Location pattern) */}
                            <div style={sectionBoxStyle}>
                                <SectionHeading icon="folder" label="Project" />
                                <Row>
                                    <Col md={4}>
                                        <label className="fs-7 fw-bold text-gray-700 d-block mb-2">File Location Type</label>
                                        <Select
                                            options={allCompanyTypes.map((t: any) => ({ label: t.name, value: t.id }))}
                                            value={allCompanyTypes.find((t: any) => t.id === values.fileLocationCompanyType)
                                                ? { label: allCompanyTypes.find((t: any) => t.id === values.fileLocationCompanyType)?.name, value: values.fileLocationCompanyType }
                                                : null}
                                            onChange={(option: any) => {
                                                setFieldValue('fileLocationCompanyType', option?.value || '');
                                                setFieldValue('fileLocationCompany', '');
                                                setFieldValue('projectId', '');
                                                setFieldValue('internalParticipants', []);
                                                setFieldValue('externalParticipants', []);
                                            }}
                                            styles={selectStyles}
                                            isClearable
                                            isLoading={loadingData}
                                            placeholder="Select type"
                                        />
                                    </Col>
                                    <Col md={4}>
                                        <label className="fs-7 fw-bold text-gray-700 d-block mb-2">File Location Company</label>
                                        <Select
                                            options={getFilteredCompanies(values.fileLocationCompanyType).map((c: any) => ({ label: c.companyName, value: c.id }))}
                                            value={getFilteredCompanies(values.fileLocationCompanyType).find((c: any) => c.id === values.fileLocationCompany)
                                                ? { label: getFilteredCompanies(values.fileLocationCompanyType).find((c: any) => c.id === values.fileLocationCompany)?.companyName, value: values.fileLocationCompany }
                                                : null}
                                            onChange={(option: any) => {
                                                setFieldValue('fileLocationCompany', option?.value || '');
                                                setFieldValue('projectId', '');
                                                setFieldValue('internalParticipants', []);
                                                setFieldValue('externalParticipants', []);
                                            }}
                                            styles={selectStyles}
                                            isClearable
                                            isDisabled={!values.fileLocationCompanyType}
                                            placeholder={!values.fileLocationCompanyType ? "Select type first" : "Select company"}
                                        />
                                    </Col>
                                    <Col md={4}>
                                        <label className="fs-7 fw-bold text-gray-700 d-block mb-2">Project <span className="text-danger">*</span></label>
                                        <Select
                                            options={allProjects.map((p: any) => ({ label: p.title, value: p.id }))}
                                            value={allProjects.find((p: any) => p.id === values.projectId)
                                                ? { label: allProjects.find((p: any) => p.id === values.projectId)?.title, value: values.projectId }
                                                : null}
                                            onChange={async (option: any) => {
                                                setFieldValue('internalParticipants', []);
                                                setFieldValue('externalParticipants', []);
                                                setProjectDetail(null);

                                                if (!option?.value) {
                                                    setFieldValue('projectId', '');
                                                    return;
                                                }

                                                const proj = allProjects.find((p: any) => p.id === option.value);
                                                setFieldValue('projectId', option.value);

                                                if (proj?.fileLocationCompanyType) {
                                                    setFieldValue('fileLocationCompanyType', proj.fileLocationCompanyType);
                                                }
                                                if (proj?.fileLocationCompany) {
                                                    setFieldValue('fileLocationCompany', proj.fileLocationCompany);
                                                }

                                                // The projects list endpoint returns the team WITHOUT its
                                                // members (and leadTeams without contact) — fetch the full
                                                // detail the same way the project's Teams tab does.
                                                try {
                                                    setTeamLoading(true);
                                                    // leadService's api.get already unwraps the axios
                                                    // response, so the body is { ..., data: { lead } }.
                                                    const leadResponse: any = await getLeadById(option.value);
                                                    setProjectDetail(leadResponse?.data?.lead || leadResponse?.data?.data?.lead || null);
                                                } catch (err) {
                                                    console.error('Failed to load project team', err);
                                                    errorConfirmation('Failed to load the project team');
                                                } finally {
                                                    setTeamLoading(false);
                                                }
                                            }}
                                            styles={selectStyles}
                                            isClearable
                                            placeholder="Select project"
                                        />
                                        {errors.projectId && touched.projectId && (
                                            <div className="text-danger fs-8 mt-1">{errors.projectId}</div>
                                        )}
                                    </Col>
                                </Row>
                            </div>

                            {/* Internal Participants (from project team) */}
                            {values.projectId && (
                                <div style={sectionBoxStyle}>
                                    <SectionHeading icon="person-badge" label="Team Members" />
                                    <label className="fs-7 fw-bold text-gray-700 d-block mb-2">
                                        Add Team Members <span className="text-danger">*</span>
                                    </label>
                                    <Select
                                        isMulti
                                        options={getProjectTeamMembers(values.projectId)}
                                        value={getProjectTeamMembers(values.projectId).filter((p: any) => values.internalParticipants.includes(p.value))}
                                        onChange={(selected: any) =>
                                            setFieldValue('internalParticipants', selected?.map((s: any) => s.value) || [])
                                        }
                                        styles={selectStyles}
                                        isLoading={teamLoading}
                                        formatOptionLabel={renderParticipantOption}
                                        placeholder={teamLoading ? "Loading project team..." : "Select team members"}
                                        noOptionsMessage={() =>
                                            teamLoading
                                                ? "Loading..."
                                                : "No team members — assign an execution team in the project's Teams tab"
                                        }
                                    />
                                    {errors.internalParticipants && touched.internalParticipants && (
                                        <div className="text-danger fs-8 mt-1">{errors.internalParticipants as string}</div>
                                    )}
                                </div>
                            )}

                            {/* External Participants (from project leadTeams/stakeholders) */}
                            {values.projectId && (
                                <div style={sectionBoxStyle}>
                                    <SectionHeading icon="buildings" label="Client Stakeholders" />
                                    <label className="fs-7 fw-bold text-gray-700 d-block mb-2">Add Stakeholders (Optional)</label>
                                    <Select
                                        isMulti
                                        options={getProjectExternalParticipants(values.projectId)}
                                        value={getProjectExternalParticipants(values.projectId).filter((p: any) => values.externalParticipants.includes(p.value))}
                                        onChange={(selected: any) =>
                                            setFieldValue('externalParticipants', selected?.map((s: any) => s.value) || [])
                                        }
                                        styles={selectStyles}
                                        isLoading={teamLoading}
                                        formatOptionLabel={renderParticipantOption}
                                        placeholder={teamLoading ? "Loading project team..." : "Select stakeholders"}
                                        noOptionsMessage={() =>
                                            teamLoading
                                                ? "Loading..."
                                                : "No stakeholders with a contact person on this project's External Team"
                                        }
                                    />
                                </div>
                            )}

                            {!values.projectId && (
                                <div style={sectionBoxStyle}>
                                    <p className="text-muted text-center mb-0">
                                        💡 Select a project above to auto-populate team members and client stakeholders
                                    </p>
                                </div>
                            )}

                            {/* Schedule */}
                            <div style={sectionBoxStyle}>
                                <SectionHeading icon="calendar" label="Schedule" />
                                <Row>
                                    <Col md={6}>
                                        <OptimizedDateTimePicker
                                            label="Start Date and Time"
                                            value={values.startDate}
                                            onChange={(date: Dayjs | null) => {
                                                setFieldValue('startDate', date);
                                                if (date && (!values.endDate || dayjs(values.endDate).isBefore(date))) {
                                                    setFieldValue('endDate', date.add(1, 'hour'));
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

                            {/* Description */}
                            <div style={{ ...sectionBoxStyle, marginBottom: '18px' }}>
                                <SectionHeading icon="text" label="Description" />
                                <TextInput
                                    isRequired
                                    label='Description'
                                    formikField='description'
                                    placeholder='Enter meeting description'
                                />
                            </div>

                            {/* Footer */}
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
