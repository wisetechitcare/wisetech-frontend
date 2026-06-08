import { useEffect, useState } from "react";
import * as Yup from 'yup';
import Select from 'react-select';
import { useFormik } from 'formik';
import Flatpickr from "react-flatpickr";
import { PageLink, PageTitle } from '@metronic/layout/core'
import { KTCard, KTCardBody } from '@metronic/helpers'
import { IPublicHoliday, IPublicHolidayUpdate } from "@models/company";
import { createPublicHoliday, fetchCompanyOverview, updatePublicHolidayById } from "@services/company";
import { fetchAllCountries } from "@services/options";
import { fetchHolidays } from '@services/company';
import { errorConfirmation, successConfirmation } from "@utils/modal";
import { dateFormatter } from "@utils/date";
import { PageHeadingTitle } from "@metronic/layout/components/header/page-title/PageHeadingTitle";
import { Modal } from 'react-bootstrap';
import Holiday from "./Holiday";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@redux/store";
import dayjs from "dayjs";
import { hasPermission } from "@utils/authAbac";
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from "@constants/statistics";
import { components } from 'react-select';
import RadioInput from "@app/modules/common/inputs/RadioInput";

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
    isFixed: false,
    isActive: false,
    isWeekend: false,
    colorCode: "",
    observedIn: "",
    companyId: "",
    from: "",
    to: "",
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
    const [durationType, setDurationType] = useState<'fullDay' | 'customTime'>('fullDay');
    
    const refreshHolidayList = async () => {
        try {
            const { data: { companyOverview } } = await fetchCompanyOverview();
            const { data: { holidays } } = await fetchHolidays(companyOverview[0].id);
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
                    values.companyId = companyOverview[0].id;
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
            const { data: { holidays } } = await fetchHolidays(companyOverview[0].id);
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
    // Important todo:
    // after merging curr branch with main, make the below form reusable, and replace it with the current page component used in the calendar->holiday section because in main branch a bug is fixed that is related to adding new holiday, right now I am importing this page component as it is
    return (
        <>
            <PageTitle breadcrumbs={usersBreadcrumbs}>Holidays</PageTitle>
            <div>
 
            {hasPermission(resourceNameMapWithCamelCase.holiday, permissionConstToUseWithHasPermission.create) && !showTheNewHolidayForm && <form onSubmit={formik.handleSubmit} noValidate className='form'>
                    <KTCardBody className='p-0'>
                         <div className='row mb-9'>
                            {/* <div className='col-lg-6 fv-row mb-9 mb-lg-0'>
                                <label className='required col-lg-6 col-form-label fw-bold fs-6 mb-3'>Color</label>
                                <input
                                    type='color'
                                    className='form-control form-control-lg form-control-solid'
                                    placeholder='Color'
                                    {...formik.getFieldProps('colorCode')}
                                />
                                {formik.touched.colorCode && formik.errors.colorCode && (
                                    <div className='fv-plugins-message-container'>
                                        <div className='fv-help-block'>{formik.errors.colorCode}</div>
                                    </div>
                                )}
                            </div> */}
                            <div className='col-lg-6'>
                                <div className='d-flex flex-column mb-7 fv-row'>
                                    <label className='d-flex align-items-center fs-6 fw-bold form-label mb-2'>
                                        <span className='required'>Holiday Type</span>
                                    </label>
                                    <div className='d-flex gap-4'>
                                        <label style={{ position: 'relative', display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '14px' }}>
                                            <input
                                                type='radio'
                                                name='isFixed'
                                                checked={formik.values.isFixed === true}
                                                onChange={() => formik.setFieldValue('isFixed', true)}
                                                style={{ position: 'absolute', opacity: 0, cursor: 'pointer' }}
                                            />
                                            <span style={{
                                                height: '16px',
                                                width: '16px',
                                                borderRadius: '50%',
                                                border: formik.values.isFixed === true ? '2px solid rgba(220, 84, 84, 0.3)' : '2px solid #c4c4c4',
                                                backgroundColor: formik.values.isFixed === true ? 'rgba(157, 65, 65, 0.5)' : 'transparent',
                                                boxShadow: formik.values.isFixed === true ? '0 0 8px 3px rgba(220, 84, 84, 0.8)' : 'none',
                                                display: 'inline-block',
                                                position: 'relative',
                                                transition: 'all 0.2s ease-in-out'
                                            }}>
                                                {formik.values.isFixed === true && (
                                                    <span style={{
                                                        content: '""',
                                                        position: 'absolute',
                                                        top: '3px',
                                                        left: '3px',
                                                        width: '6px',
                                                        height: '6px',
                                                        borderRadius: '50%',
                                                        background: 'rgba(157, 65, 65, 1)'
                                                    }}></span>
                                                )}
                                            </span>
                                            <span className='px-2'>Fixed</span>
                                        </label>
                                        <label style={{ position: 'relative', display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '14px' }}>
                                            <input
                                                type='radio'
                                                name='isFixed'
                                                checked={formik.values.isFixed === false}
                                                onChange={() => formik.setFieldValue('isFixed', false)}
                                                style={{ position: 'absolute', opacity: 0, cursor: 'pointer' }}
                                            />
                                            <span style={{
                                                height: '16px',
                                                width: '16px',
                                                borderRadius: '50%',
                                                border: formik.values.isFixed === false ? '2px solid rgba(220, 84, 84, 0.3)' : '2px solid #c4c4c4',
                                                backgroundColor: formik.values.isFixed === false ? 'rgba(157, 65, 65, 0.5)' : 'transparent',
                                                boxShadow: formik.values.isFixed === false ? '0 0 8px 3px rgba(220, 84, 84, 0.8)' : 'none',
                                                display: 'inline-block',
                                                position: 'relative',
                                                transition: 'all 0.2s ease-in-out'
                                            }}>
                                                {formik.values.isFixed === false && (
                                                    <span style={{
                                                        content: '""',
                                                        position: 'absolute',
                                                        top: '3px',
                                                        left: '3px',
                                                        width: '6px',
                                                        height: '6px',
                                                        borderRadius: '50%',
                                                        background: 'rgba(157, 65, 65, 1)'
                                                    }}></span>
                                                )}
                                            </span>
                                            <span className='px-2'>Floater</span>
                                        </label>
                                    </div>
                                    {formik.touched.isFixed && formik.errors.isFixed && (
                                        <div className='fv-plugins-message-container'>
                                            <div className='fv-help-block'>{formik.errors.isFixed}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                             <div className='col-lg-6'>
                                <div className='d-flex flex-column mb-7 fv-row'>
                                    <label className='d-flex align-items-center fs-6 fw-bold form-label mb-2'>
                                        <span className='required'>Status</span>
                                    </label>
                                    <div className='d-flex gap-4'>
                                        <label style={{ position: 'relative', display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '14px' }}>
                                            <input
                                                type='radio'
                                                name='isActive'
                                                checked={formik.values.isActive === true}
                                                onChange={() => formik.setFieldValue('isActive', true)}
                                                style={{ position: 'absolute', opacity: 0, cursor: 'pointer' }}
                                            />
                                            <span style={{
                                                height: '16px',
                                                width: '16px',
                                                borderRadius: '50%',
                                                border: formik.values.isActive === true ? '2px solid rgba(220, 84, 84, 0.3)' : '2px solid #c4c4c4',
                                                backgroundColor: formik.values.isActive === true ? 'rgba(157, 65, 65, 0.5)' : 'transparent',
                                                boxShadow: formik.values.isActive === true ? '0 0 8px 3px rgba(220, 84, 84, 0.8)' : 'none',
                                                display: 'inline-block',
                                                position: 'relative',
                                                transition: 'all 0.2s ease-in-out'
                                            }}>
                                                {formik.values.isActive === true && (
                                                    <span style={{
                                                        content: '""',
                                                        position: 'absolute',
                                                        top: '3px',
                                                        left: '3px',
                                                        width: '6px',
                                                        height: '6px',
                                                        borderRadius: '50%',
                                                        background: 'rgba(157, 65, 65, 1)'
                                                    }}></span>
                                                )}
                                            </span>
                                            <span className='px-2'>Active</span>
                                        </label>
                                        <label style={{ position: 'relative', display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '14px' }}>
                                            <input
                                                type='radio'
                                                name='isActive'
                                                checked={formik.values.isActive === false}
                                                onChange={() => formik.setFieldValue('isActive', false)}
                                                style={{ position: 'absolute', opacity: 0, cursor: 'pointer' }}
                                            />
                                            <span style={{
                                                height: '16px',
                                                width: '16px',
                                                borderRadius: '50%',
                                                border: formik.values.isActive === false ? '2px solid rgba(220, 84, 84, 0.3)' : '2px solid #c4c4c4',
                                                backgroundColor: formik.values.isActive === false ? 'rgba(157, 65, 65, 0.5)' : 'transparent',
                                                boxShadow: formik.values.isActive === false ? '0 0 8px 3px rgba(220, 84, 84, 0.8)' : 'none',
                                                display: 'inline-block',
                                                position: 'relative',
                                                transition: 'all 0.2s ease-in-out'
                                            }}>
                                                {formik.values.isActive === false && (
                                                    <span style={{
                                                        content: '""',
                                                        position: 'absolute',
                                                        top: '3px',
                                                        left: '3px',
                                                        width: '6px',
                                                        height: '6px',
                                                        borderRadius: '50%',
                                                        background: 'rgba(157, 65, 65, 1)'
                                                    }}></span>
                                                )}
                                            </span>
                                            <span className='px-2'>Inactive</span>
                                        </label>
                                    </div>
                                    {formik.touched.isActive && formik.errors.isActive && (
                                        <div className='fv-plugins-message-container'>
                                            <div className='fv-help-block'>{formik.errors.isActive}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                           
                            
                        </div>
                        <div className='row mb-9'>
                            <div className='col-lg-12 fv-row mb-9 mb-lg-0'>
                                <label className='required fs-6 fw-bold form-label mb-4'>Name </label> 
                                {/* // changes here */}
                                <Select
                                    components={{ MenuList: CustomMenuList }}
                                    options={holidaysOption}
                                    defaultInputValue={isEditMode ? holidayNameForEditMode : ''}
                                    onChange={(option: any) => formik.setFieldValue('holidayId', option.value, true)} 
                                />
                                {formik.touched.holidayId && formik.errors.holidayId && (
                                    <div className='fv-plugins-message-container'>
                                        <div className='fv-help-block'>{formik.errors.holidayId}</div>
                                    </div>
                                )}
                            </div>

                            {/* <div className='col-lg-6 fv-row'>
                                <label className='required fs-6 fw-bold form-label mb-3'>Date</label>
                                <Flatpickr
                                    value={formik.values.date}
                                    defaultValue={isEditMode ? editData?.date.toString()  : ''}
                                    className='form-control form-control-lg form-control-solid'
                                    placeholder='Holiday date'
                                    onChange={(selectedDates: Date[]) => {
                                        formik.setFieldValue('date', dateFormatter.format(selectedDates[0]), true);
                                        formik.setFieldTouched('dateOfBirth', false);
                                    }}
                                    onOpen={() => {
                                        formik.setFieldTouched('dateOfBirth', true);
                                    }}
                                    options={{
                                        dateFormat: "Y-m-d",
                                        altInput: true,
                                        altFormat: "F j, Y",
                                        enableTime: false,
                                    }}
                                />
                                {formik.touched.date && formik.errors.date && (
                                    <div className='fv-plugins-message-container'>
                                        <div className='fv-help-block'>{formik.errors.date}</div>
                                    </div>
                                )}
                            </div> */}
                        </div>

                        <div className='row mb-9'>
                            <div className='col-lg-12'>
                                <div className='d-flex flex-column mb-7 fv-row'>
                                    <label className='d-flex align-items-center fs-6 fw-bold form-label mb-2'>
                                        <span className='required'>Duration</span>
                                    </label>
                                    <div className='d-flex gap-4'>
                                        <label style={{ position: 'relative', display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '14px' }}>
                                            <input
                                                type='radio'
                                                name='duration'
                                                checked={durationType === 'fullDay'}
                                                onChange={() => setDurationType('fullDay')}
                                                style={{ position: 'absolute', opacity: 0, cursor: 'pointer' }}
                                            />
                                            <span style={{
                                                height: '16px',
                                                width: '16px',
                                                borderRadius: '50%',
                                                border: durationType === 'fullDay' ? '2px solid rgba(220, 84, 84, 0.3)' : '2px solid #c4c4c4',
                                                backgroundColor: durationType === 'fullDay' ? 'rgba(157, 65, 65, 0.5)' : 'transparent',
                                                boxShadow: durationType === 'fullDay' ? '0 0 8px 3px rgba(220, 84, 84, 0.8)' : 'none',
                                                display: 'inline-block',
                                                position: 'relative',
                                                transition: 'all 0.2s ease-in-out'
                                            }}>
                                                {durationType === 'fullDay' && (
                                                    <span style={{
                                                        content: '""',
                                                        position: 'absolute',
                                                        top: '3px',
                                                        left: '3px',
                                                        width: '6px',
                                                        height: '6px',
                                                        borderRadius: '50%',
                                                        background: 'rgba(157, 65, 65, 1)'
                                                    }}></span>
                                                )}
                                            </span>
                                            <span className='px-2'>Full Day</span>
                                        </label>
                                        <label style={{ position: 'relative', display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '14px' }}>
                                            <input
                                                type='radio'
                                                name='duration'
                                                checked={durationType === 'customTime'}
                                                onChange={() => setDurationType('customTime')}
                                                style={{ position: 'absolute', opacity: 0, cursor: 'pointer' }}
                                            />
                                            <span style={{
                                                height: '16px',
                                                width: '16px',
                                                borderRadius: '50%',
                                                border: durationType === 'customTime' ? '2px solid rgba(220, 84, 84, 0.3)' : '2px solid #c4c4c4',
                                                backgroundColor: durationType === 'customTime' ? 'rgba(157, 65, 65, 0.5)' : 'transparent',
                                                boxShadow: durationType === 'customTime' ? '0 0 8px 3px rgba(220, 84, 84, 0.8)' : 'none',
                                                display: 'inline-block',
                                                position: 'relative',
                                                transition: 'all 0.2s ease-in-out'
                                            }}>
                                                {durationType === 'customTime' && (
                                                    <span style={{
                                                        content: '""',
                                                        position: 'absolute',
                                                        top: '3px',
                                                        left: '3px',
                                                        width: '6px',
                                                        height: '6px',
                                                        borderRadius: '50%',
                                                        background: 'rgba(157, 65, 65, 1)'
                                                    }}></span>
                                                )}
                                            </span>
                                            <span className='px-2'>Custom time</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {durationType === 'fullDay' && (
                            <div className='row mb-9'>
                                <div className='col-lg-12 fv-row'>
                                    <label className='required fs-6 fw-bold form-label mb-3'>Date</label>
                                    <div style={{ position: 'relative' }}>
                                        <Flatpickr
                                            value={formik.values.date}
                                            defaultValue={isEditMode ? editData?.date.toString()  : ''}
                                            className='form-control form-control-lg form-control-solid'
                                            placeholder='Holiday date'
                                            onChange={(selectedDates: Date[]) => {
                                                formik.setFieldValue('date', dateFormatter.format(selectedDates[0]), true);
                                                formik.setFieldTouched('dateOfBirth', false);
                                            }}
                                            onOpen={() => {
                                                formik.setFieldTouched('dateOfBirth', true);
                                            }}
                                            options={{
                                                dateFormat: "Y-m-d",
                                                altInput: true,
                                                altFormat: "F j, Y",
                                                enableTime: false,
                                            }}
                                        />
                                        <i className='bi bi-calendar3 fs-3 position-absolute' style={{
                                            right: '15px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            color: '#9D4141',
                                            pointerEvents: 'none'
                                        }}></i>
                                    </div>
                                    {formik.touched.date && formik.errors.date && (
                                        <div className='fv-plugins-message-container'>
                                            <div className='fv-help-block'>{formik.errors.date}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {durationType === 'customTime' && (
                            <div className='row mb-9'>
                                <div className='col-lg-6 fv-row'>
                                    <label className='fs-6 fw-bold form-label mb-3'>Work From</label>
                                    <div className='d-flex align-items-center gap-2'>
                                        <Flatpickr
                                            value={formik.values.from}
                                            className='form-control form-control-lg form-control-solid'
                                            placeholder='From time'
                                            onChange={(_, dateStr: string) => {
                                                formik.setFieldValue('from', dateStr, true);
                                            }}
                                            options={{
                                                enableTime: true,
                                                noCalendar: true,
                                                dateFormat: "h:i K",
                                                time_24hr: false,
                                            }}
                                        />
                                        {formik.values.from && (
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-light"
                                                style={{ marginLeft: 8 }}
                                                onClick={() => formik.setFieldValue('from', '', true)}
                                                title="Clear time"
                                            >
                                                Reset
                                            </button>
                                        )}
                                    </div>
                                    {formik.touched.from && formik.errors.from && (
                                        <div className='fv-plugins-message-container'>
                                            <div className='fv-help-block'>{formik.errors.from}</div>
                                        </div>
                                    )}
                                </div>
                                <div className='col-lg-6 fv-row'>
                                    <label className='fs-6 fw-bold form-label mb-3'>Work To</label>
                                    <div className="d-flex align-items-center gap-2">
                                        <Flatpickr
                                            value={formik.values.to}
                                            className='form-control form-control-lg form-control-solid'
                                            placeholder='To time'
                                            onChange={(_, dateStr: string) => {
                                                formik.setFieldValue('to', dateStr, true);
                                            }}
                                            options={{
                                                enableTime: true,
                                                noCalendar: true,
                                                dateFormat: "h:i K",
                                                time_24hr: false,
                                            }}
                                        />
                                        {formik.values.to && (
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-light"
                                                style={{ marginLeft: 8 }}
                                                onClick={() => formik.setFieldValue('to', '', true)}
                                                title="Clear time"
                                            >
                                                Reset
                                            </button>
                                        )}
                                    </div>
                                    {formik.touched.to && formik.errors.to && (
                                        <div className='fv-plugins-message-container'>
                                            <div className='fv-help-block'>{formik.errors.to}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className='row mb-9'>
                            {/* <div className='col-lg-6 fv-row mb-9 mb-lg-0'>
                                <label className='required col-lg-6 col-form-label fw-bold fs-6 mb-3'>Color</label>
                                <input
                                    type='color'
                                    className='form-control form-control-lg form-control-solid'
                                    placeholder='Color'
                                    {...formik.getFieldProps('colorCode')}
                                />
                                {formik.touched.colorCode && formik.errors.colorCode && (
                                    <div className='fv-plugins-message-container'>
                                        <div className='fv-help-block'>{formik.errors.colorCode}</div>
                                    </div>
                                )}
                            </div> */}

                            <div className='col-lg-12 fv-row' onClick={getAllCountries}>
                                <label className='required col-lg-6 col-form-label fw-bold fs-6 mb-4'>Observed In</label>
                                <Select
                                    options={countriesOption}
                                    defaultValue={isEditMode ? 
                                        { value: editData?.observedIn, label: editData?.observedIn } : 
                                        { value: 'India', label: 'India' }}
                                    onChange={(option: any) => formik.setFieldValue('observedIn', option.label, true)} />
                                {formik.touched.observedIn && formik.errors.observedIn && (
                                    <div className='fv-plugins-message-container'>
                                        <div className='fv-help-block'>{formik.errors.observedIn}</div>
                                    </div>
                                )}
                            </div>
                            {/* <div className='col-lg-6'>
                                <div className='d-flex flex-column mb-7 fv-row'>
                                    <label className='d-flex align-items-center fs-6 fw-bold form-label mb-2'>
                                        <span className='required'>Holiday Type</span>
                                    </label>
                                    <div className='d-flex gap-4'>
                                        <label style={{ position: 'relative', display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '14px' }}>
                                            <input
                                                type='radio'
                                                name='isFixed'
                                                checked={formik.values.isFixed === true}
                                                onChange={() => formik.setFieldValue('isFixed', true)}
                                                style={{ position: 'absolute', opacity: 0, cursor: 'pointer' }}
                                            />
                                            <span style={{
                                                height: '16px',
                                                width: '16px',
                                                borderRadius: '50%',
                                                border: formik.values.isFixed === true ? '2px solid rgba(220, 84, 84, 0.3)' : '2px solid #c4c4c4',
                                                backgroundColor: formik.values.isFixed === true ? 'rgba(157, 65, 65, 0.5)' : 'transparent',
                                                boxShadow: formik.values.isFixed === true ? '0 0 8px 3px rgba(220, 84, 84, 0.8)' : 'none',
                                                display: 'inline-block',
                                                position: 'relative',
                                                transition: 'all 0.2s ease-in-out'
                                            }}>
                                                {formik.values.isFixed === true && (
                                                    <span style={{
                                                        content: '""',
                                                        position: 'absolute',
                                                        top: '3px',
                                                        left: '3px',
                                                        width: '6px',
                                                        height: '6px',
                                                        borderRadius: '50%',
                                                        background: 'rgba(157, 65, 65, 1)'
                                                    }}></span>
                                                )}
                                            </span>
                                            <span className='px-2'>Fixed</span>
                                        </label>
                                        <label style={{ position: 'relative', display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '14px' }}>
                                            <input
                                                type='radio'
                                                name='isFixed'
                                                checked={formik.values.isFixed === false}
                                                onChange={() => formik.setFieldValue('isFixed', false)}
                                                style={{ position: 'absolute', opacity: 0, cursor: 'pointer' }}
                                            />
                                            <span style={{
                                                height: '16px',
                                                width: '16px',
                                                borderRadius: '50%',
                                                border: formik.values.isFixed === false ? '2px solid rgba(220, 84, 84, 0.3)' : '2px solid #c4c4c4',
                                                backgroundColor: formik.values.isFixed === false ? 'rgba(157, 65, 65, 0.5)' : 'transparent',
                                                boxShadow: formik.values.isFixed === false ? '0 0 8px 3px rgba(220, 84, 84, 0.8)' : 'none',
                                                display: 'inline-block',
                                                position: 'relative',
                                                transition: 'all 0.2s ease-in-out'
                                            }}>
                                                {formik.values.isFixed === false && (
                                                    <span style={{
                                                        content: '""',
                                                        position: 'absolute',
                                                        top: '3px',
                                                        left: '3px',
                                                        width: '6px',
                                                        height: '6px',
                                                        borderRadius: '50%',
                                                        background: 'rgba(157, 65, 65, 1)'
                                                    }}></span>
                                                )}
                                            </span>
                                            <span className='px-2'>Floater</span>
                                        </label>
                                    </div>
                                    {formik.touched.isFixed && formik.errors.isFixed && (
                                        <div className='fv-plugins-message-container'>
                                            <div className='fv-help-block'>{formik.errors.isFixed}</div>
                                        </div>
                                    )}
                                </div>
                            </div> */}
                        </div>

                        <div className='row mb-9'>

                            {/* <div className='col-lg-6'>
                                <div className='d-flex flex-column mb-7 fv-row'>
                                    <label className='d-flex align-items-center fs-6 fw-bold form-label mb-2'>
                                        <span className='required'>Status</span>
                                    </label>
                                    <div className='d-flex gap-4'>
                                        <label style={{ position: 'relative', display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '14px' }}>
                                            <input
                                                type='radio'
                                                name='isActive'
                                                checked={formik.values.isActive === true}
                                                onChange={() => formik.setFieldValue('isActive', true)}
                                                style={{ position: 'absolute', opacity: 0, cursor: 'pointer' }}
                                            />
                                            <span style={{
                                                height: '16px',
                                                width: '16px',
                                                borderRadius: '50%',
                                                border: formik.values.isActive === true ? '2px solid rgba(220, 84, 84, 0.3)' : '2px solid #c4c4c4',
                                                backgroundColor: formik.values.isActive === true ? 'rgba(157, 65, 65, 0.5)' : 'transparent',
                                                boxShadow: formik.values.isActive === true ? '0 0 8px 3px rgba(220, 84, 84, 0.8)' : 'none',
                                                display: 'inline-block',
                                                position: 'relative',
                                                transition: 'all 0.2s ease-in-out'
                                            }}>
                                                {formik.values.isActive === true && (
                                                    <span style={{
                                                        content: '""',
                                                        position: 'absolute',
                                                        top: '3px',
                                                        left: '3px',
                                                        width: '6px',
                                                        height: '6px',
                                                        borderRadius: '50%',
                                                        background: 'rgba(157, 65, 65, 1)'
                                                    }}></span>
                                                )}
                                            </span>
                                            <span className='px-2'>Active</span>
                                        </label>
                                        <label style={{ position: 'relative', display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '14px' }}>
                                            <input
                                                type='radio'
                                                name='isActive'
                                                checked={formik.values.isActive === false}
                                                onChange={() => formik.setFieldValue('isActive', false)}
                                                style={{ position: 'absolute', opacity: 0, cursor: 'pointer' }}
                                            />
                                            <span style={{
                                                height: '16px',
                                                width: '16px',
                                                borderRadius: '50%',
                                                border: formik.values.isActive === false ? '2px solid rgba(220, 84, 84, 0.3)' : '2px solid #c4c4c4',
                                                backgroundColor: formik.values.isActive === false ? 'rgba(157, 65, 65, 0.5)' : 'transparent',
                                                boxShadow: formik.values.isActive === false ? '0 0 8px 3px rgba(220, 84, 84, 0.8)' : 'none',
                                                display: 'inline-block',
                                                position: 'relative',
                                                transition: 'all 0.2s ease-in-out'
                                            }}>
                                                {formik.values.isActive === false && (
                                                    <span style={{
                                                        content: '""',
                                                        position: 'absolute',
                                                        top: '3px',
                                                        left: '3px',
                                                        width: '6px',
                                                        height: '6px',
                                                        borderRadius: '50%',
                                                        background: 'rgba(157, 65, 65, 1)'
                                                    }}></span>
                                                )}
                                            </span>
                                            <span className='px-2'>Inactive</span>
                                        </label>
                                    </div>
                                    {formik.touched.isActive && formik.errors.isActive && (
                                        <div className='fv-plugins-message-container'>
                                            <div className='fv-help-block'>{formik.errors.isActive}</div>
                                        </div>
                                    )}
                                </div>
                            </div> */}
                            <div className='col-lg-6'>
                                <div className='d-flex flex-column mb-7 fv-row'>
                                    <label className='d-flex align-items-center fs-6 fw-bold form-label mb-2'>
                                        <span className='required'>Is Weekend</span>
                                    </label>
                                    <div className='d-flex gap-4'>
                                        <label style={{ position: 'relative', display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '14px' }}>
                                            <input
                                                type='radio'
                                                name='isWeekend'
                                                checked={formik.values.isWeekend === true}
                                                onChange={() => formik.setFieldValue('isWeekend', true)}
                                                style={{ position: 'absolute', opacity: 0, cursor: 'pointer' }}
                                            />
                                            <span style={{
                                                height: '16px',
                                                width: '16px',
                                                borderRadius: '50%',
                                                border: formik.values.isWeekend === true ? '2px solid rgba(220, 84, 84, 0.3)' : '2px solid #c4c4c4',
                                                backgroundColor: formik.values.isWeekend === true ? 'rgba(157, 65, 65, 0.5)' : 'transparent',
                                                boxShadow: formik.values.isWeekend === true ? '0 0 8px 3px rgba(220, 84, 84, 0.8)' : 'none',
                                                display: 'inline-block',
                                                position: 'relative',
                                                transition: 'all 0.2s ease-in-out'
                                            }}>
                                                {formik.values.isWeekend === true && (
                                                    <span style={{
                                                        content: '""',
                                                        position: 'absolute',
                                                        top: '3px',
                                                        left: '3px',
                                                        width: '6px',
                                                        height: '6px',
                                                        borderRadius: '50%',
                                                        background: 'rgba(157, 65, 65, 1)'
                                                    }}></span>
                                                )}
                                            </span>
                                            <span className='px-2'>Yes</span>
                                        </label>
                                        <label style={{ position: 'relative', display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '14px' }}>
                                            <input
                                                type='radio'
                                                name='isWeekend'
                                                checked={formik.values.isWeekend === false}
                                                onChange={() => formik.setFieldValue('isWeekend', false)}
                                                style={{ position: 'absolute', opacity: 0, cursor: 'pointer' }}
                                            />
                                            <span style={{
                                                height: '16px',
                                                width: '16px',
                                                borderRadius: '50%',
                                                border: formik.values.isWeekend === false ? '2px solid rgba(220, 84, 84, 0.3)' : '2px solid #c4c4c4',
                                                backgroundColor: formik.values.isWeekend === false ? 'rgba(157, 65, 65, 0.5)' : 'transparent',
                                                boxShadow: formik.values.isWeekend === false ? '0 0 8px 3px rgba(220, 84, 84, 0.8)' : 'none',
                                                display: 'inline-block',
                                                position: 'relative',
                                                transition: 'all 0.2s ease-in-out'
                                            }}>
                                                {formik.values.isWeekend === false && (
                                                    <span style={{
                                                        content: '""',
                                                        position: 'absolute',
                                                        top: '3px',
                                                        left: '3px',
                                                        width: '6px',
                                                        height: '6px',
                                                        borderRadius: '50%',
                                                        background: 'rgba(157, 65, 65, 1)'
                                                    }}></span>
                                                )}
                                            </span>
                                            <span className='px-2'>No</span>
                                        </label>
                                    </div>
                                    {formik.touched.isWeekend && formik.errors.isWeekend && (
                                        <div className='fv-plugins-message-container'>
                                            <div className='fv-help-block'>{formik.errors.isWeekend}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </KTCardBody>

                <div className='card-footer d-flex justify-content-end py-6 px-9'>
                    <button type='submit' className='btn btn-primary' disabled={loading || !formik.isValid}>
                        {!loading && (isEditMode ? 'Update' : 'Save Changes')}
                        {loading && (
                            <span className='indicator-progress' style={{ display: 'block' }}>
                                Please wait...{' '}
                                <span className='spinner-border spinner-border-sm align-middle ms-2'></span>
                            </span>
                        )}
                    </button>
                </div>
            </form>}
</div>
            {/* Add New Holiday Form Modal */}
            <Modal show={showTheNewHolidayForm} onHide={handleCloseNewHolidayForm} centered>
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
