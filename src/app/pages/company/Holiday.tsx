import { resolveActiveOrgId } from '@utils/activeOrg';
import { KTCardBody } from '@metronic/helpers';
import { PageLink, PageTitle } from '@metronic/layout/core';
import { IHoliday } from '@models/company';
import { createHoliday, fetchCompanyOverview, updateHolidayOptionsById } from '@services/company';
import { errorConfirmation, successConfirmation } from '@utils/modal';
import { useFormik } from 'formik';
import { useState } from 'react';
import * as Yup from 'yup';

const usersBreadcrumbs: Array<PageLink> = [
    {
        title: 'Holiday',
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
];

const initialValues: IHoliday = {
    name: "",
    isFixed: false,
    isActive: false,
    colorCode: "",
    companyId: "",
};

const holidaySchema = Yup.object().shape({
    name: Yup.string().required('Holiday Name is required'),
    isFixed: Yup.boolean().required('Is fixed is required'),
    colorCode: Yup.string().required('Color is required'),
    isActive: Yup.boolean().required('Is active is required'),
    companyId: Yup.string(),
}).strict(true);

export const PRESET_COLORS = ['#1E3A8A', '#1E3A8A', '#14966B', '#B4771A', '#C13F6B', '#6B5AD1', '#2F7CC2', '#5E6B7E'];

export interface HolidayEditData extends IHoliday {
    id: string;
}

function Holiday({
    onCloseHolidayForm,
    refreshHolidayList,
    isEditMode = false,
    editData,
}: {
    onCloseHolidayForm: () => void;
    refreshHolidayList?: () => void;
    /** When true, the same form updates an existing master-list holiday instead of
     * creating a new one — this is what makes "Edit Holiday" show the same
     * name/type/status/color fields as "Add Holiday" instead of a bare rename box. */
    isEditMode?: boolean;
    editData?: HolidayEditData;
}) {
    const [loading, setLoading] = useState(false);

    const formik = useFormik<IHoliday>({
        initialValues: isEditMode && editData ? editData : initialValues,
        validationSchema: holidaySchema,
        onSubmit: async (values) => {
            setLoading(true);
            try {
                if (isEditMode && editData) {
                    const res = await updateHolidayOptionsById(editData.id, values);
                    if (res && !res.hasError) {
                        successConfirmation('Successfully updated holiday');
                        setLoading(false);
                        formik.resetForm();
                        if (refreshHolidayList) {
                            refreshHolidayList();
                        }
                        onCloseHolidayForm();
                    }
                } else {
                    const { data: { companyOverview } } = await fetchCompanyOverview();
                    values.companyId = (resolveActiveOrgId(companyOverview) ?? '');

                    const res = await createHoliday(values);
                    if (res && !res.hasError) {
                        successConfirmation('Successfully created holiday');
                        setLoading(false);
                        formik.resetForm();
                        if (refreshHolidayList) {
                            refreshHolidayList();
                        }
                        onCloseHolidayForm();
                    }
                }
            }
            catch {
                errorConfirmation(`Failed to ${isEditMode ? 'update' : 'create'} holiday`);
                setLoading(false);
                formik.resetForm();
            }
        },
        enableReinitialize: true,
        validateOnMount: true,
    });

    return (
        <>
            <PageTitle breadcrumbs={usersBreadcrumbs}>{isEditMode ? 'Edit Holiday' : 'Add New Holiday'}</PageTitle>

            <form onSubmit={formik.handleSubmit} noValidate>
                <KTCardBody className="p-0">

                    {/* ── SECTION 1 · Name ──────────────────────────────────────────────── */}
                    <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '20px', marginBottom: '16px', border: '1px solid #e9edf2' }}>
                        <p className="fs-8 fw-bold text-uppercase text-gray-500 mb-4" style={{ letterSpacing: '0.8px' }}>Holiday Details</p>
                        <label className="fs-7 fw-bold text-gray-700 d-block mb-2">
                            Holiday name <span className="text-danger">*</span>
                        </label>
                        <input
                            type="text"
                            className="form-control form-control-solid"
                            placeholder="Holiday name"
                            style={{ borderRadius: '8px', border: '1.5px solid #dde2ec', minHeight: '42px', fontSize: '14px' }}
                            {...formik.getFieldProps('name')}
                        />
                        {formik.touched.name && formik.errors.name && (
                            <div className="text-danger fs-8 mt-1">{formik.errors.name}</div>
                        )}
                    </div>

                    {/* ── SECTION 2 · Status ────────────────────────────────────────────── */}
                    <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '20px', marginBottom: '16px', border: '1px solid #e9edf2' }}>
                        <p className="fs-8 fw-bold text-uppercase text-gray-500 mb-4" style={{ letterSpacing: '0.8px' }}>Status</p>
                        <div className="row g-4">
                            <div className="col-6">
                                <label className="fs-7 fw-bold text-gray-700 d-block mb-3">
                                    Is Fixed <span className="text-danger">*</span>
                                </label>
                                <div className="d-flex gap-2">
                                    {[{ label: 'Fixed', value: true }, { label: 'Floating', value: false }].map(opt => (
                                        <button
                                            key={String(opt.value)}
                                            type="button"
                                            onClick={() => formik.setFieldValue('isFixed', opt.value, true)}
                                            className="btn btn-sm fw-semibold flex-fill"
                                            style={{
                                                borderRadius: '8px',
                                                border: formik.values.isFixed === opt.value ? '2px solid #1E3A8A' : '1.5px solid #dde2ec',
                                                background: formik.values.isFixed === opt.value ? '#1E3A8A' : '#ffffff',
                                                color: formik.values.isFixed === opt.value ? '#ffffff' : '#6b7280',
                                                transition: 'all 0.18s ease',
                                                padding: '8px 0',
                                                fontSize: '13px'
                                            }}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="col-6">
                                <label className="fs-7 fw-bold text-gray-700 d-block mb-3">
                                    Is Active <span className="text-danger">*</span>
                                </label>
                                <div className="d-flex gap-2">
                                    {[{ label: 'Active', value: true }, { label: 'Inactive', value: false }].map(opt => (
                                        <button
                                            key={String(opt.value)}
                                            type="button"
                                            onClick={() => formik.setFieldValue('isActive', opt.value, true)}
                                            className="btn btn-sm fw-semibold flex-fill"
                                            style={{
                                                borderRadius: '8px',
                                                border: formik.values.isActive === opt.value ? '2px solid #1E3A8A' : '1.5px solid #dde2ec',
                                                background: formik.values.isActive === opt.value ? '#1E3A8A' : '#ffffff',
                                                color: formik.values.isActive === opt.value ? '#ffffff' : '#6b7280',
                                                transition: 'all 0.18s ease',
                                                padding: '8px 0',
                                                fontSize: '13px'
                                            }}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── SECTION 3 · Color ─────────────────────────────────────────────── */}
                    <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '20px', marginBottom: '4px', border: '1px solid #e9edf2' }}>
                        <p className="fs-8 fw-bold text-uppercase text-gray-500 mb-4" style={{ letterSpacing: '0.8px' }}>
                            Color <span className="text-danger">*</span>
                        </p>
                        <div className="d-flex align-items-center gap-3 flex-wrap">
                            <div
                                style={{
                                    width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                                    background: formik.values.colorCode || '#e9edf2',
                                    border: '1px solid #dde2ec', boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
                                }}
                            />
                            <div className="d-flex align-items-center gap-2 flex-wrap">
                                {PRESET_COLORS.map(c => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => formik.setFieldValue('colorCode', c, true)}
                                        aria-label={`Use color ${c}`}
                                        style={{
                                            width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer',
                                            border: formik.values.colorCode === c ? '2px solid #1E3A8A' : '2px solid transparent',
                                            boxShadow: formik.values.colorCode === c ? '0 0 0 2px #ffffff, 0 0 0 3px #1E3A8A55' : '0 0 0 1px rgba(0,0,0,0.08)',
                                            transition: 'all 0.15s ease',
                                        }}
                                    />
                                ))}
                                <label
                                    title="Custom color"
                                    style={{
                                        width: 28, height: 28, borderRadius: '50%', position: 'relative', overflow: 'hidden',
                                        border: '1.5px dashed #b8c0cf', display: 'grid', placeItems: 'center', cursor: 'pointer',
                                        color: '#6b7280', fontSize: 14, fontWeight: 700, background: '#ffffff',
                                    }}
                                >
                                    +
                                    <input
                                        type="color"
                                        value={formik.values.colorCode || '#1E3A8A'}
                                        onChange={(e) => formik.setFieldValue('colorCode', e.target.value, true)}
                                        style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', border: 'none', padding: 0 }}
                                    />
                                </label>
                            </div>
                        </div>
                        {formik.touched.colorCode && formik.errors.colorCode && (
                            <div className="text-danger fs-8 mt-2">{formik.errors.colorCode}</div>
                        )}
                    </div>
                </KTCardBody>

                {/* ── FOOTER ────────────────────────────────────────────────────────── */}
                <div className="d-flex align-items-center justify-content-end gap-3 pt-2 pb-1">
                    <button
                        type="button"
                        className="btn btn-sm fw-semibold px-6"
                        style={{ borderRadius: '8px', border: '1.5px solid #dde2ec', background: '#ffffff', color: '#6b7280', fontSize: '13px' }}
                        onClick={onCloseHolidayForm}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="btn btn-sm fw-bold px-7 text-white"
                        disabled={loading || !formik.isValid}
                        style={{
                            borderRadius: '8px',
                            background: loading || !formik.isValid ? '#93A8D4' : 'linear-gradient(180deg, #1E3A8A 0%, #172554 100%)',
                            border: 'none',
                            fontSize: '13px',
                            boxShadow: '0 4px 12px rgba(30, 58, 138, 0.25)',
                            transition: 'all 0.2s ease',
                            minWidth: '120px'
                        }}
                    >
                        {loading ? (
                            <span className="d-flex align-items-center gap-2 justify-content-center">
                                <span className="spinner-border spinner-border-sm"></span>
                                Saving…
                            </span>
                        ) : 'Save Changes'}
                    </button>
                </div>
            </form>
        </>
    )
}

export default Holiday;
