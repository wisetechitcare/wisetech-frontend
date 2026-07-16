import { resolveActiveOrgId } from '@utils/activeOrg';
import { useEffect, useState } from "react";
import * as Yup from 'yup';
import Select from 'react-select';
import { useFormik } from 'formik';
import Flatpickr from "react-flatpickr";
import { PageLink, PageTitle } from '@metronic/layout/core'
import { KTIcon } from '@metronic/helpers'
import { IPublicHoliday, IPublicHolidayUpdate } from "@models/company";
import { createPublicHoliday, fetchAllBranches, fetchCompanyOverview, updatePublicHolidayById } from "@services/company";
import { fetchAllCountries } from "@services/options";
import { fetchHolidays } from '@services/company';
import { errorConfirmation, successConfirmation } from "@utils/modal";
import { dateFormatter } from "@utils/date";
import { Modal } from 'react-bootstrap';
import Holiday from "./Holiday";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@redux/store";
import { hasPermission } from "@utils/authAbac";
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from "@constants/statistics";
import { components } from 'react-select';
import { T } from '@app/modules/common/components/ui/tokens';

const usersBreadcrumbs: Array<PageLink> = [
    {
        title: 'Company',
        path: '#',
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

const initialValues: IPublicHoliday = {
    date: "",
    holidayId: "",
    // Default Fixed/Active to YES — with the old `false` defaults a holiday
    // saved without touching the toggles was created inactive and never
    // reached the workspace calendar, even though the schedule listed it.
    isFixed: true,
    isActive: true,
    isWeekend: false,
    colorCode: "",
    observedIn: "",
    companyId: "",
    from: "",
    to: "",
    branchId: "",
}

const publicHolidaySchema = Yup.object().shape({
    date: Yup.string().required('Holiday date is required'),
    holidayId: Yup.string().required('Holiday name is required'),
    // colorCode: Yup.string().optional(),
    isFixed: Yup.boolean().required('Is fixed is required'),
    isActive: Yup.boolean().required('Is active is required'),
    isWeekend: Yup.boolean().required('Is weekend is required'),
    observedIn: Yup.string().required('Observed in is required'),
    companyId: Yup.string(),
    branchId: Yup.string().nullable().optional(),
    from: Yup.string(),
    to: Yup.string().test('is-greater', 'To time must be after From time', function(value) {
        const { from } = this.parent;
        if (!from || !value) return true; // Skip validation if either is empty

        // Convert time strings to comparable format
        const fromTime = new Date(`1970/01/01 ${from}`);
        const toTime = new Date(`1970/01/01 ${value}`);

        return toTime > fromTime;
    }),
}).strict(true);

/** Small icon-badge + label used above each form section — gives the sections a
 * consistent, scannable rhythm instead of a bare uppercase caption. */
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

const CustomMenuList = ({ children, ...props }: any) => {
    // Only open the new holiday form, do NOT close the parent form/modal
    const addNewHoliday = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent bubbling to dropdown close
        if (typeof window !== 'undefined') {
            const event = new CustomEvent('addNewHoliday');
            window.dispatchEvent(event);
        }
    };

    return (
        <components.MenuList {...props}>
            <div
                className="dropdown-add-option"
                onClick={addNewHoliday}
                style={{
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    borderBottom: '1px solid #e9ecef'
                }}
            >
                <span style={{ marginRight: '8px', fontSize: '16px', fontWeight: 'bold' }}>+</span>
                <span>Add New</span>
            </div>
            {children}
        </components.MenuList>
    );
};

function PublicHoliday({ onClose, setShowNewHolidayForm, isEditMode = false, editData, holidayNameForEditMode, setRefetch, sendNotification, selectedDateTimeInfo }: { onClose: () => void, setShowNewHolidayForm: any, isEditMode?: boolean, editData?: IPublicHolidayUpdate, holidayNameForEditMode?: string, setRefetch?: any, sendNotification?: any , selectedDateTimeInfo?: any }) {
    const dispatch = useDispatch();
    const { countries } = useSelector((state: RootState) => state.locations);
    const [showTheNewHolidayForm, setShowTheNewHolidayForm] = useState(false)
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear() + '');
    const [loading, setLoading] = useState(false);
    const [countriesOption, setCountriesOptions] = useState([]);
    const [holidaysOption, setHolidaysOptions] = useState([]);
    const [branchOptions, setBranchOptions] = useState<{ value: string; label: string }[]>([]);

    
    const refreshHolidayList = async () => {
        try {
            const { data: { companyOverview } } = await fetchCompanyOverview();
            const { data: { holidays } } = await fetchHolidays((resolveActiveOrgId(companyOverview) ?? ''));
            const transformedRes = holidays.map((holiday: any) => ({ label: holiday.name, value: holiday.id }));
            setHolidaysOptions(transformedRes);
        } catch (error) {
            console.error('Failed to refresh holiday list:', error);
        }
    };

    const formik = useFormik<IPublicHoliday>({
        initialValues: isEditMode ? (editData ? editData : initialValues) : initialValues,
        validationSchema: publicHolidaySchema,
        onSubmit: async (values) => {
            setLoading(true);
            
            if(isEditMode){
                try {
                    const res = await updatePublicHolidayById(editData?.id as string, values);
                    if (res && !res.hasError) {
                        successConfirmation('Successfully updated public holiday');
                        setLoading(false);
                        formik.resetForm();
                        if(sendNotification){
                            sendNotification();
                        }
                        onClose();
                    }
                }
                catch {
                    errorConfirmation('Failed to update public holiday');
                    setLoading(false);
                    formik.resetForm();
                }
            }
            else{
                try {
                    const { data: { companyOverview } } = await fetchCompanyOverview();
                    values.companyId = (resolveActiveOrgId(companyOverview) ?? '');
                    const res = await createPublicHoliday(values);
                    if (res && !res.hasError) {
                        successConfirmation('Successfully created public holiday');
                        setLoading(false);
                        formik.resetForm();
                        if(sendNotification){
                            sendNotification();
                        }
                        onClose();
                    }
                }
                catch {
                    errorConfirmation('Failed to create public holiday');
                    setLoading(false);
                    formik.resetForm();
                }
            }
            if(setRefetch){
                setRefetch((prev: boolean) => !prev);
            }
        },
        enableReinitialize: true,
        validateOnMount: true,
    });

    useEffect(() => {
        async function getAllHolidays() {
            const { data: { companyOverview } } = await fetchCompanyOverview();
            const { data: { holidays } } = await fetchHolidays((resolveActiveOrgId(companyOverview) ?? ''));
            const transformedRes = holidays.map((holiday: any) => ({ label: holiday.name, value: holiday.id }));

            setHolidaysOptions(transformedRes);
        }

        getAllHolidays();
        
        // Add event listener for the custom event
        const handleAddNewHoliday = () => {
         //   onClose();
            setShowTheNewHolidayForm(true);
        };
        
        window.addEventListener('addNewHoliday', handleAddNewHoliday);
        
        // Clean up event listener
        return () => {
            window.removeEventListener('addNewHoliday', handleAddNewHoliday);
        };
    }, [currentYear, onClose]);


    const handleCloseNewHolidayForm = () => {
        if(setShowNewHolidayForm){
            setShowNewHolidayForm(false);
        }
        if(showTheNewHolidayForm){
            setShowTheNewHolidayForm(false);
        }
    }

    async function getAllCountries() {
        if (countries != null) {
            setCountriesOptions(countries);
            return;
        }

        const countriesResponse = await fetchAllCountries();
        const options = countriesResponse.map((country: any) => ({ value: country.name, label: country.name }));
        setCountriesOptions(options);
    }
        useEffect(() => {
        if (selectedDateTimeInfo && selectedDateTimeInfo.startStr) {
            formik.setFieldValue('date', selectedDateTimeInfo.startStr);
        }

        // Initialize observedIn field with India if in create mode
        if (!isEditMode) {
            formik.setFieldValue('observedIn', 'India', true);
        }
        // eslint-disable-next-line
    }, []);

    useEffect(() => {
        fetchAllBranches()
            .then((res: any) => {
                const branches = res?.data?.branches ?? [];
                setBranchOptions(branches.map((b: any) => ({ value: b.id, label: b.name })));
            })
            .catch(() => {});
    }, []);

    return (
        <>
            <PageTitle breadcrumbs={usersBreadcrumbs}>Holidays</PageTitle>
            <div>
            {hasPermission(resourceNameMapWithCamelCase.holiday, permissionConstToUseWithHasPermission.create) && !showTheNewHolidayForm && (
                <form onSubmit={formik.handleSubmit} noValidate>

                    {/* ── SECTION 1 · Meta Info ─────────────────────────────────────────── */}
                    <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px 20px 14px', marginBottom: '14px', border: '1px solid #e9edf2', borderTop: `3px solid ${T.color.brand}` }}>
                        <SectionHeading icon="setting-2" label="Holiday Details" />
                        <div className="row g-5">

                            {/* Holiday Type */}
                            <div className="col-lg-6">
                                <label className="fs-7 fw-bold text-gray-700 d-block mb-3">
                                    Holiday Type <span className="text-danger">*</span>
                                </label>
                                <div className="d-flex gap-2">
                                    {[{ label: 'Fixed', value: true }, { label: 'Floating', value: false }].map(opt => (
                                        <button
                                            key={String(opt.value)}
                                            type="button"
                                            onClick={() => formik.setFieldValue('isFixed', opt.value)}
                                            className="btn btn-sm fw-semibold flex-fill d-flex align-items-center justify-content-center gap-1.5"
                                            style={{
                                                borderRadius: '8px',
                                                border: formik.values.isFixed === opt.value ? `2px solid ${T.color.brand}` : '1.5px solid #dde2ec',
                                                background: formik.values.isFixed === opt.value ? T.color.brand : '#ffffff',
                                                color: formik.values.isFixed === opt.value ? '#ffffff' : '#6b7280',
                                                boxShadow: formik.values.isFixed === opt.value ? '0 3px 10px rgba(30, 58, 138, 0.22)' : 'none',
                                                transition: 'all 0.18s ease',
                                                padding: '8px 0',
                                                fontSize: '13px'
                                            }}
                                        >
                                            {formik.values.isFixed === opt.value && <i className="bi bi-check-circle-fill" style={{ fontSize: 12 }} />}
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                                {formik.touched.isFixed && formik.errors.isFixed && (
                                    <div className="text-danger fs-8 mt-1">{String(formik.errors.isFixed)}</div>
                                )}
                            </div>

                            {/* Status */}
                            <div className="col-lg-6">
                                <label className="fs-7 fw-bold text-gray-700 d-block mb-3">
                                    Status <span className="text-danger">*</span>
                                </label>
                                <div className="d-flex gap-2">
                                    {[{ label: 'Active', value: true }, { label: 'Inactive', value: false }].map(opt => (
                                        <button
                                            key={String(opt.value)}
                                            type="button"
                                            onClick={() => formik.setFieldValue('isActive', opt.value)}
                                            className="btn btn-sm fw-semibold flex-fill d-flex align-items-center justify-content-center gap-1.5"
                                            style={{
                                                borderRadius: '8px',
                                                border: formik.values.isActive === opt.value ? `2px solid ${T.color.brand}` : '1.5px solid #dde2ec',
                                                background: formik.values.isActive === opt.value ? T.color.brand : '#ffffff',
                                                color: formik.values.isActive === opt.value ? '#ffffff' : '#6b7280',
                                                boxShadow: formik.values.isActive === opt.value ? '0 3px 10px rgba(30, 58, 138, 0.22)' : 'none',
                                                transition: 'all 0.18s ease',
                                                padding: '8px 0',
                                                fontSize: '13px'
                                            }}
                                        >
                                            {formik.values.isActive === opt.value && <i className="bi bi-check-circle-fill" style={{ fontSize: 12 }} />}
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                                {formik.touched.isActive && formik.errors.isActive && (
                                    <div className="text-danger fs-8 mt-1">{String(formik.errors.isActive)}</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── SECTION 2 · Name ──────────────────────────────────────────────── */}
                    <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', marginBottom: '14px', border: '1px solid #e9edf2', borderTop: `3px solid ${T.color.brand}` }}>
                        <SectionHeading icon="text" label="Holiday Name" />
                        <label className="fs-7 fw-bold text-gray-700 d-block mb-2">
                            Name <span className="text-danger">*</span>
                        </label>
                        <Select
                            components={{ MenuList: CustomMenuList }}
                            options={holidaysOption}
                            defaultInputValue={isEditMode ? holidayNameForEditMode : ''}
                            placeholder="Search & select a holiday..."
                            onChange={(option: any) => formik.setFieldValue('holidayId', option.value, true)}
                            styles={{
                                control: (base) => ({
                                    ...base,
                                    borderRadius: '8px',
                                    borderColor: '#dde2ec',
                                    minHeight: '42px',
                                    fontSize: '14px',
                                    boxShadow: 'none',
                                    '&:hover': { borderColor: T.color.brand }
                                }),
                                menu: (base) => ({ ...base, borderRadius: '8px', fontSize: '14px' }),
                                option: (base, state) => ({
                                    ...base,
                                    background: state.isSelected ? T.color.brand : state.isFocused ? '#EEF2FF' : '#ffffff',
                                    color: state.isSelected ? '#ffffff' : '#374151',
                                })
                            }}
                        />
                        {formik.touched.holidayId && formik.errors.holidayId && (
                            <div className="text-danger fs-8 mt-1">{formik.errors.holidayId}</div>
                        )}
                    </div>

                    {/* ── SECTION 3 · Date ──────────────────────────────────────────────── */}
                    <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', marginBottom: '14px', border: '1px solid #e9edf2', borderTop: `3px solid ${T.color.brand}` }}>
                        <SectionHeading icon="calendar" label="Schedule" />
                        <label className="fs-7 fw-bold text-gray-700 d-block mb-2">Date <span className="text-danger">*</span></label>
                        <div style={{ position: 'relative' }}>
                            <Flatpickr
                                value={formik.values.date}
                                defaultValue={isEditMode ? editData?.date.toString() : ''}
                                className='form-control form-control-solid'
                                placeholder='Pick a holiday date…'
                                onChange={(selectedDates: Date[]) => {
                                    formik.setFieldValue('date', dateFormatter.format(selectedDates[0]), true);
                                    formik.setFieldTouched('date', true);
                                }}
                                options={{
                                    dateFormat: "Y-m-d",
                                    altInput: true,
                                    altFormat: "F j, Y",
                                    enableTime: false,
                                }}
                                style={{ borderRadius: '8px', border: '1.5px solid #dde2ec', minHeight: '42px', fontSize: '14px' }}
                            />
                            <i className='bi bi-calendar3 fs-4 position-absolute' style={{ right: '14px', top: '50%', transform: 'translateY(-50%)', color: T.color.brand, pointerEvents: 'none' }}></i>
                        </div>
                        {formik.touched.date && formik.errors.date && (
                            <div className="text-danger fs-8 mt-1">{formik.errors.date}</div>
                        )}
                    </div>

                    {/* ── SECTION 4 · Location & Weekend ───────────────────────────────── */}
                    <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', marginBottom: '18px', border: '1px solid #e9edf2', borderTop: `3px solid ${T.color.brand}` }}>
                        <SectionHeading icon="geolocation" label="Scope & Availability" />
                        <div className="row g-4">

                            {/* Observed In */}
                            <div className="col-lg-4" onClick={getAllCountries}>
                                <label className="fs-7 fw-bold text-gray-700 d-block mb-2">
                                    Observed In <span className="text-danger">*</span>
                                </label>
                                <Select
                                    options={countriesOption}
                                    defaultValue={isEditMode
                                        ? { value: editData?.observedIn, label: editData?.observedIn }
                                        : { value: 'India', label: 'India' }}
                                    placeholder="Select country…"
                                    onChange={(option: any) => formik.setFieldValue('observedIn', option.label, true)}
                                    styles={{
                                        control: (base) => ({
                                            ...base,
                                            borderRadius: '8px',
                                            borderColor: '#dde2ec',
                                            minHeight: '42px',
                                            fontSize: '14px',
                                            boxShadow: 'none',
                                            '&:hover': { borderColor: T.color.brand }
                                        }),
                                        menu: (base) => ({ ...base, borderRadius: '8px', fontSize: '14px' }),
                                        option: (base, state) => ({
                                            ...base,
                                            background: state.isSelected ? T.color.brand : state.isFocused ? '#EEF2FF' : '#ffffff',
                                            color: state.isSelected ? '#ffffff' : '#374151',
                                        })
                                    }}
                                />
                                {formik.touched.observedIn && formik.errors.observedIn && (
                                    <div className="text-danger fs-8 mt-1">{formik.errors.observedIn}</div>
                                )}
                            </div>

                            {/* Branch — unset/"All Locations" means this holiday applies company-wide;
                                picking a branch scopes it to that branch only (e.g. a branch-specific
                                observance or override). */}
                            <div className="col-lg-4">
                                <label className="fs-7 fw-bold text-gray-700 d-block mb-2">
                                    Branch
                                </label>
                                <Select
                                    options={[{ value: '', label: 'All Locations' }, ...branchOptions]}
                                    defaultValue={isEditMode && editData?.branchId
                                        ? branchOptions.find(b => b.value === editData.branchId) || { value: '', label: 'All Locations' }
                                        : { value: '', label: 'All Locations' }}
                                    placeholder="All Locations"
                                    onChange={(option: any) => formik.setFieldValue('branchId', option?.value || '', true)}
                                    styles={{
                                        control: (base) => ({
                                            ...base,
                                            borderRadius: '8px',
                                            borderColor: '#dde2ec',
                                            minHeight: '42px',
                                            fontSize: '14px',
                                            boxShadow: 'none',
                                            '&:hover': { borderColor: T.color.brand }
                                        }),
                                        menu: (base) => ({ ...base, borderRadius: '8px', fontSize: '14px' }),
                                        option: (base, state) => ({
                                            ...base,
                                            background: state.isSelected ? T.color.brand : state.isFocused ? '#EEF2FF' : '#ffffff',
                                            color: state.isSelected ? '#ffffff' : '#374151',
                                        })
                                    }}
                                />
                            </div>

                            {/* Is Weekend */}
                            <div className="col-lg-4">
                                <label className="fs-7 fw-bold text-gray-700 d-block mb-2">
                                    Weekend Holiday? <span className="text-danger">*</span>
                                </label>
                                <div className="d-flex gap-2 mt-1">
                                    {[{ label: 'Yes', value: true }, { label: 'No', value: false }].map(opt => (
                                        <button
                                            key={String(opt.value)}
                                            type="button"
                                            onClick={() => formik.setFieldValue('isWeekend', opt.value)}
                                            className="btn btn-sm fw-semibold flex-fill d-flex align-items-center justify-content-center gap-1.5"
                                            style={{
                                                borderRadius: '8px',
                                                border: formik.values.isWeekend === opt.value ? `2px solid ${T.color.brand}` : '1.5px solid #dde2ec',
                                                background: formik.values.isWeekend === opt.value ? T.color.brand : '#ffffff',
                                                color: formik.values.isWeekend === opt.value ? '#ffffff' : '#6b7280',
                                                boxShadow: formik.values.isWeekend === opt.value ? '0 3px 10px rgba(30, 58, 138, 0.22)' : 'none',
                                                transition: 'all 0.18s ease',
                                                padding: '8px 0',
                                                fontSize: '13px'
                                            }}
                                        >
                                            {formik.values.isWeekend === opt.value && <i className="bi bi-check-circle-fill" style={{ fontSize: 12 }} />}
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                                {formik.touched.isWeekend && formik.errors.isWeekend && (
                                    <div className="text-danger fs-8 mt-1">{String(formik.errors.isWeekend)}</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── FOOTER ────────────────────────────────────────────────────────── */}
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
                            disabled={loading || !formik.isValid}
                            style={{
                                borderRadius: '8px',
                                background: loading || !formik.isValid ? '#93A8D4' : `linear-gradient(180deg, ${T.color.brand} 0%, ${T.color.brandHover} 100%)`,
                                border: 'none',
                                fontSize: '13px',
                                boxShadow: '0 4px 12px rgba(30, 58, 138, 0.25)',
                                transition: 'all 0.2s ease',
                                minWidth: '120px',
                                justifyContent: 'center'
                            }}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner-border spinner-border-sm"></span>
                                    Saving…
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-check2" style={{ fontSize: 14 }} />
                                    {isEditMode ? 'Update Holiday' : 'Save Holiday'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            )}
            </div>

            {/* Add New Holiday Form Modal */}
            <Modal show={showTheNewHolidayForm} onHide={handleCloseNewHolidayForm} centered fullscreen="md-down">
                <Modal.Header closeButton>
                    <Modal.Title>Add New Holiday</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Holiday onCloseHolidayForm={handleCloseNewHolidayForm} refreshHolidayList={refreshHolidayList} />
                </Modal.Body>
            </Modal>
        </>
    );
}

export default PublicHoliday;
