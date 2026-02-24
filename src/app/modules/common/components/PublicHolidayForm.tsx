import { useEffect, useState } from "react";
import * as Yup from 'yup';
import Select from 'react-select';
import { useFormik } from 'formik';
import Flatpickr from "react-flatpickr";
import { KTCard, KTCardBody } from '@metronic/helpers'
import { IPublicHoliday } from "@models/company";
import { createPublicHoliday, fetchCompanyOverview } from "@services/company";
import { fetchAllCountries } from "@services/options";
import { fetchHolidays } from '@services/company';
import { errorConfirmation, successConfirmation } from "@utils/modal";
import { dateFormatter } from "@utils/date";
import DropdownAdd from "@app/modules/common/utils/DropdownAdd";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@redux/store";

const initialValues: IPublicHoliday = {
    date: "",
    holidayId: "",
    isFixed: false,
    isActive: false,
    colorCode: "",
    observedIn: "",
    companyId: "",
    from: "",
    to: "",
}

const publicHolidaySchema = Yup.object().shape({
    date: Yup.string().required('Holiday date is required'),
    holidayId: Yup.string().required('Holiday name is required'),
    colorCode: Yup.string(),
    isFixed: Yup.boolean().required('Is fixed is required'),
    isActive: Yup.boolean().required('Is active is required'),
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

function PublicHolidayForm({ onClose, setShowNewHolidayForm }: { onClose: () => void, setShowNewHolidayForm: any }) {
    const dispatch = useDispatch();
    const { countries } = useSelector((state: RootState) => state.locations);

    const [currentYear, setCurrentYear] = useState(new Date().getFullYear() + '');

    const [loading, setLoading] = useState(false);
    const [countriesOption, setCountriesOptions] = useState([]);
    const [holidaysOption, setHolidaysOptions] = useState([]);

    const formik = useFormik<IPublicHoliday>({
        initialValues,
        validationSchema: publicHolidaySchema,
        onSubmit: async (values) => {
            setLoading(true);
            try {
                const { data: { companyOverview } } = await fetchCompanyOverview();
                values.companyId = companyOverview[0].id;
                const res = await createPublicHoliday(values);
                if (res && !res.hasError) {
                    successConfirmation('Successfully created public holiday');
                    setLoading(false);
                    formik.resetForm();
                    onClose();
                }
            }
            catch {
                errorConfirmation('Failed to create public holiday');
                setLoading(false);
                formik.resetForm();
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
    }, [currentYear]);

    const addDropdown = () => {
        onClose();
        setShowNewHolidayForm(true);
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

    return (
        <>
            <form onSubmit={formik.handleSubmit} noValidate className='form'>
                <KTCard>
                    <KTCardBody className='p-7'>
                        <div className='row mb-9'>
                            <div className='col-lg-6 fv-row mb-9 mb-lg-0'>
                                <label className='required fs-6 fw-bold form-label mb-4'>Holiday Name</label>
                                <Select
                                    components={{ MenuList: (props) => <DropdownAdd{...props} onClick={addDropdown} /> }}
                                    options={holidaysOption}
                                    onChange={(option: any) => formik.setFieldValue('holidayId', option.value, true)} />

                                {formik.touched.holidayId && formik.errors.holidayId && (
                                    <div className='fv-plugins-message-container'>
                                        <div className='fv-help-block'>{formik.errors.holidayId}</div>
                                    </div>
                                )}
                            </div>

                            <div className='col-lg-6 fv-row'>
                                <label className='required fs-6 fw-bold form-label mb-3'>Holiday date</label>
                                <Flatpickr
                                    value={formik.values.date}
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
                            </div>
                        </div>

                        <div className='row mb-9'>
                            <div className='col-lg-6 fv-row mb-9 mb-lg-0'>
                                <label className='fs-6 fw-bold form-label mb-3'>From Time</label>
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
                                {formik.touched.from && formik.errors.from && (
                                    <div className='fv-plugins-message-container'>
                                        <div className='fv-help-block'>{formik.errors.from}</div>
                                    </div>
                                )}
                            </div>

                            <div className='col-lg-6 fv-row'>
                                <label className='fs-6 fw-bold form-label mb-3'>To Time</label>
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
                                {formik.touched.to && formik.errors.to && (
                                    <div className='fv-plugins-message-container'>
                                        <div className='fv-help-block'>{formik.errors.to}</div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className='row mb-9'>
                            <div className='col-lg-6 fv-row mb-9 mb-lg-0'>
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
                            </div>

                            <div className='col-lg-6 fv-row' onClick={getAllCountries}>
                                <label className='required col-lg-6 col-form-label fw-bold fs-6 mb-4'>Observed In</label>
                                <Select
                                    options={countriesOption}
                                    onChange={(option: any) => formik.setFieldValue('observedIn', option.label, true)} />

                                {formik.touched.observedIn && formik.errors.observedIn && (
                                    <div className='fv-plugins-message-container'>
                                        <div className='fv-help-block'>{formik.errors.observedIn}</div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className='row mb-9'>
                            <div className='col-lg-6'>
                                <label htmlFor="isFixed" className='required col-lg-4 col-form-label fw-bold fs-6 mb-3'>Is Fixed</label>
                                <div className='form-check form-check-solid form-switch fv-row'>
                                    <input
                                        className='form-check-input w-45px h-30px'
                                        type='checkbox'
                                        id='isFixed'
                                        checked={formik.values.isFixed}
                                        {...formik.getFieldProps('isFixed')}
                                    />
                                    <label className='form-check-label'></label>
                                </div>
                            </div>

                            <div className='col-lg-6'>
                                <label htmlFor="isActive" className='required col-lg-5 col-form-label fw-bold fs-6 mb-3'>Is Active</label>
                                <div className='form-check form-check-solid form-switch fv-row'>
                                    <input
                                        className='form-check-input w-45px h-30px'
                                        type='checkbox'
                                        id='isActive'
                                        checked={formik.values.isActive}
                                        {...formik.getFieldProps('isActive')}
                                    />
                                    <label className='form-check-label'></label>
                                </div>
                            </div>
                        </div>
                    </KTCardBody>
                </KTCard>
                <div className='card-footer d-flex justify-content-end py-6 px-9'>
                    <button type='submit' className='btn btn-primary' disabled={loading || !formik.isValid}>
                        {!loading && 'Save Changes'}
                        {loading && (
                            <span className='indicator-progress' style={{ display: 'block' }}>
                                Please wait...{' '}
                                <span className='spinner-border spinner-border-sm align-middle ms-2'></span>
                            </span>
                        )}
                    </button>
                </div>
            </form>
        </>
    );
}

export default PublicHolidayForm;
