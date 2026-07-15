import React, { useState, useEffect } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { Formik, Form, FormikValues } from 'formik';
import * as Yup from 'yup';
import { KTIcon } from '@metronic/helpers';
import { errorConfirmation, successConfirmation } from '@utils/modal';
import { createUpdateDeductionConfiguration, fetchDeductionConfiguration } from '@services/employee';
import { IMonthlyApiResponse, IBreakdownData } from '@redux/slices/salaryData';
import { Close, InfoOutlined } from '@mui/icons-material';
import { formatINRDecimal } from '../../../../../../../modules/payroll/utils/payrollFormatters';
import { deductionMasterService } from '@modules/payroll/services/payrollService';

interface DeductionDistributionModalProps {
    show: boolean;
    onClose: () => void;
    employeeId: string;
    month: string;
    year: string;
    onSuccess: () => void;
    monthlyApiData?: IMonthlyApiResponse | null;
}

interface DynamicField {
    id: string;
    name: string;
    value: number; // This will store the "Extra" amount
    type: string;
    isNew: boolean;
    autoAmount?: number; // Added to store the auto-calculated amount for preview
    section?: 'government' | 'attendance' | 'custom'; // Added to allow section selection
}

/**
 * Transform monthly salary API deduction data to modal format
 * Modified to treat these as "Additional" amounts. 
 */
const transformApiDataToModalFormat = (deductionBreakdown: IBreakdownData) => {
    console.log('🔄 [DeductionModal] Transforming API data to modal format');
    
    const transformedData: any = {};
    
    try {
        // Only use fixed deductions as per requirements
        const fixedDeductions = deductionBreakdown?.fixed || {};
        
        Object.entries(fixedDeductions).forEach(([key, data]: [string, any]) => {
            transformedData[key] = {
                name: key,
                type: 'number',
                value: 0, // Default additional amount is 0
                isActive: data.isActive !== false
            };
        });
        
        return transformedData;
    } catch (error) {
        console.error('❌ Error transforming API data to modal format:', error);
        return {};
    }
};

export const DeductionDistributionModal: React.FC<DeductionDistributionModalProps> = ({
    show,
    onClose,
    employeeId,
    month,
    year,
    onSuccess,
    monthlyApiData
}) => {
    const [deductionDistributionData, setDeductionDistributionData] = useState<any>({});
    const [dynamicFields, setDynamicFields] = useState<DynamicField[]>([]);
    const [fieldCounter, setFieldCounter] = useState(1);
    const [deletedFields, setDeletedFields] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [initialValues, setInitialValues] = useState<any>({});
    const [autoCalculatedDeductions, setAutoCalculatedDeductions] = useState<Record<string, number>>({});

    // Mutual exclusivity rules
    const [profFeesEnabled, setProfFeesEnabled] = useState(false);
    const [profTaxEnabled, setProfTaxEnabled] = useState(false);

    const resetForm = () => {
        setDynamicFields([]);
        setFieldCounter(1);
        setDeletedFields([]);
        setDeductionDistributionData({});
        setInitialValues({});
        setAutoCalculatedDeductions({});
    };

    const addNewField = (section: 'government' | 'attendance' | 'custom' = 'custom') => {
        const sectionLabels = {
            government: 'Deduction',
            attendance: 'Attendance',
            custom: 'Other'
        };
        const newField: DynamicField = {
            id: `new_field_${Date.now()}`,
            name: `${sectionLabels[section]} ${fieldCounter}`,
            value: 0,
            type: "number",
            isNew: true,
            autoAmount: 0,
            section: section
        };
        setDynamicFields([...dynamicFields, newField]);
        setFieldCounter(fieldCounter + 1);
    };

    const removeField = (fieldId: string, isNew: boolean) => {
        if (isNew) {
            setDynamicFields(dynamicFields.filter(field => field.id !== fieldId));
        } else {
            setDeletedFields([...deletedFields, fieldId]);
        }
    };

    const updateFieldName = (fieldId: string, newName: string, isNew: boolean) => {
        if (isNew) {
            setDynamicFields(dynamicFields.map(field =>
                field.id === fieldId ? { ...field, name: newName } : field
            ));
        } else {
            setDeductionDistributionData({
                ...deductionDistributionData,
                [fieldId]: {
                    ...deductionDistributionData[fieldId],
                    name: newName
                }
            });
        }
    };

    const getDynamicValidationSchema = () => {
        const schemaFields: any = {};

        // Add validation for existing fields
        Object.keys(deductionDistributionData)
            .filter(key => !deletedFields.includes(key))
            .forEach(key => {
                schemaFields[key] = Yup.number()
                    .typeError(`${deductionDistributionData[key].name} must be a valid number`)
                    .required(`${deductionDistributionData[key].name} is required`);
            });

        // Add validation for new fields
        dynamicFields.forEach(field => {
            schemaFields[field.id] = Yup.number()
                .typeError(`${field.name} must be a valid number`)
                .required(`${field.name} is required`);
        });

        return Yup.object().shape(schemaFields);
    };

    const getDynamicInitialValues = () => {
        const initialValues: any = {};

        // Add existing fields
        Object.entries(deductionDistributionData)
            .filter(([key]) => !deletedFields.includes(key))
            .forEach(([key, value]: [string, any]) => {
                initialValues[key] = value.value;
            });

        // Add new fields
        dynamicFields.forEach(field => {
            initialValues[field.id] = field.value;
        });

        return initialValues;
    };

    const fetchDeductionDistributionData = async () => {
        try {
            setLoading(true);
            
            // 1. Extract auto-calculated values from monthlyApiData for preview (fixed + variable)
            const autoDeductions: Record<string, number> = {};
            const breakdown = monthlyApiData?.salaryData?.[0]?.deductionBreakdown;
            if (breakdown?.fixed) {
                const fixed = breakdown.fixed;
                Object.entries(fixed).forEach(([key, data]: [string, any]) => {
                    autoDeductions[key] = data.earned || 0;
                });
                setProfFeesEnabled(!!fixed['Professional Fees']?.isActive);
                setProfTaxEnabled(!!fixed['Professional Tax']?.isActive);
            }
            if (breakdown?.variable) {
                // Also capture attendance-section auto amounts so previews show correctly
                Object.entries(breakdown.variable).forEach(([key, data]: [string, any]) => {
                    if (!(key in autoDeductions)) autoDeductions[key] = data.earned || 0;
                });
            }
            setAutoCalculatedDeductions(autoDeductions);

            // 2. Fetch existing "Additional" amounts from database
            let existingAdditionalData: any = null;
            try {
                const apiResult = await fetchDeductionConfiguration(employeeId, month, year);
                if (!apiResult.hasError && apiResult.data && apiResult.data.configuration) {
                    existingAdditionalData = apiResult.data.configuration;
                }
            } catch (err) {
                console.log("No existing deduction config found, using defaults");
            }

            // 3. Build default fields from active DEBIT components in Salary Component Master.
            //    Falls back to the original 3 if the API call fails.
            const defaultFields: any = {};
            try {
                const masterItems = await deductionMasterService.getAll();
                const activeDebit = masterItems.filter(c => c.direction === 'DEBIT' && c.isActive);
                activeDebit
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .forEach(c => {
                        defaultFields[c.displayName] = { name: c.displayName, type: 'number', value: 0, isActive: true, _masterCategory: c.category };
                    });
            } catch {
                // fallback: keep original three hardcoded fields so modal still works
                defaultFields['Provident Fund']    = { name: 'Provident Fund',               type: 'number', value: 0, isActive: true };
                defaultFields['Professional Tax']  = { name: 'Professional Tax',              type: 'number', value: 0, isActive: true };
                defaultFields['Professional Fees'] = { name: 'Tax Deducted at Source (TDS)', type: 'number', value: 0, isActive: true };
            }

            // Always start with all default fields, then overlay any saved values
            const finalData: any = {};
            const masterKeys = new Set(Object.keys(defaultFields));

            // Mark all master items so we can filter non-master items out of gov/att sections
            Object.entries(defaultFields).forEach(([key, value]: [string, any]) => {
                finalData[key] = { ...value, value: 0, type: 'number', _isFromMaster: true };
            });

            if (existingAdditionalData) {
                Object.entries(existingAdditionalData).forEach(([key, value]: [string, any]) => {
                    if (key === '_fieldOrder') return;
                    if (masterKeys.has(key)) {
                        // Overlay saved value onto master item (keep _isFromMaster: true)
                        finalData[key] = { ...finalData[key], ...value, value: value.value || 0, type: 'number', _isFromMaster: true };
                    } else {
                        // Preserve non-master custom fields with their section information
                        finalData[key] = {
                            ...value,
                            value: value.value || 0,
                            type: 'number',
                            isActive: true,
                            _isFromMaster: false,
                            _section: value._section || 'custom'
                        };
                    }
                });
            }

            setDeductionDistributionData(finalData);
            
            const initialVals: any = {};
            Object.entries(finalData).forEach(([key, value]: [string, any]) => {
                initialVals[key] = value.value;
            });
            setInitialValues(initialVals);

        } catch (error) {
            console.error("❌ Error fetching deduction data:", error);
            errorConfirmation("Failed to fetch deduction distribution data");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (values: any, actions: FormikValues) => {
        try {
            setLoading(true);

            const transformedData: any = {};

            // Handle existing fields (not deleted)
            Object.entries(deductionDistributionData)
                .filter(([key]) => !deletedFields.includes(key))
                .forEach(([key, fieldData]: [string, any]) => {
                    // NOTE: Extra manual amounts are ALWAYS saved regardless of whether the
                    // auto-calculated component is enabled or disabled. The auto-calculation
                    // engine already handles the Professional Tax / Professional Fees mutual
                    // exclusivity. The extra amount here is independent (additive).
                    const finalValue = Number(values[key]);

                    transformedData[key] = {
                        ...fieldData,
                        value: finalValue,
                        type: "number"
                    };
                });

            // Handle new dynamic fields
            dynamicFields.forEach(field => {
                const newKey = field.name.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '');
                transformedData[newKey] = {
                    name: field.name,
                    value: Number(values[field.id]),
                    type: "number",
                    isActive: true,
                    _section: field.section || 'custom'  // Preserve section for persistence
                };
            });

            const apiPayload = {
                employeeId: employeeId,
                month: parseInt(month),
                year: parseInt(year),
                configuration: transformedData
            };

            await createUpdateDeductionConfiguration(apiPayload as any);
            successConfirmation(`Deduction adjustments updated successfully!`);
            onSuccess();
            onClose();

        } catch (error: any) {
            console.error("❌ Error updating deductions:", error);
            errorConfirmation(error.message || "Failed to update deduction distribution");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (show) {
            fetchDeductionDistributionData();
        } else {
            resetForm();
        }
    }, [show]);

    return (
        <Modal show={show} onHide={onClose} centered size="lg" backdrop="static" scrollable>
            <Modal.Header closeButton className="border-bottom-0 pb-2 px-6 pt-5">
                <div>
                    <Modal.Title className="fw-bolder fs-4 text-gray-800">Modify Deductions</Modal.Title>
                    <p className="text-muted fs-8 mb-0 mt-1">
                        Positive increases deduction · Negative reduces it · Does not overwrite auto-calculations
                    </p>
                </div>
            </Modal.Header>

            <Modal.Body className="px-6 pt-4 pb-0" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
                {loading ? (
                    <div className="d-flex justify-content-center py-20">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                    </div>
                ) : (
                    <Formik
                        initialValues={getDynamicInitialValues()}
                        onSubmit={handleSubmit}
                        validationSchema={getDynamicValidationSchema()}
                        enableReinitialize={true}
                    >
                        {(formikProps) => {
                            const existingFields = Object.entries(deductionDistributionData)
                                .filter(([key]) => !deletedFields.includes(key) && key !== '_fieldOrder')
                                .map(([key, value]: [string, any]) => ({ id: key, ...value, isNew: false }));

                            const allFields = [...existingFields, ...dynamicFields];

                            const SYS_ATTENDANCE = ['late checkins', 'late attendance', 'early checkout', 'unpaid leave', 'half day', 'missed punch'];

                            const getGroup = (field: any): 'government' | 'attendance' | 'other' => {
                                // Check if field has explicit section (new fields or persisted custom fields)
                                if (field.section === 'government') return 'government';
                                if (field.section === 'attendance') return 'attendance';
                                if (field._section === 'government') return 'government';
                                if (field._section === 'attendance') return 'attendance';

                                // For new fields without explicit section, default to custom
                                if (field.isNew) return 'other';

                                // Non-master items always go to Custom, never government/attendance
                                if (!field._isFromMaster) return 'other';

                                const cat = (field._masterCategory || '').toLowerCase();
                                const name = (field.name || field.id || '').toLowerCase();
                                if (cat.includes('attendance') || SYS_ATTENDANCE.some(s => name.includes(s))) return 'attendance';
                                if (cat.includes('government') || cat.includes('statutory') ||
                                    name.includes('provident fund') || name.includes('professional tax') ||
                                    name.includes('professional fees') || name.includes('esi') ||
                                    name.includes('epf') || name.includes('tds')) return 'government';
                                return 'other';
                            };

                            const allFieldsWithGrouping = [...existingFields, ...dynamicFields];
                            const govFields = allFieldsWithGrouping.filter(f => getGroup(f) === 'government');
                            const allAttFields = allFieldsWithGrouping.filter(f => getGroup(f) === 'attendance');
                            // Late Checkins is auto-calculated — read-only; the rest are editable adjustments
                            const lateCheckinFields = allAttFields.filter(f => (f.name || f.id) === 'Late Checkins');
                            const editableAttFields = allAttFields.filter(f => (f.name || f.id) !== 'Late Checkins');

                            // Read-only row for attendance (same green style as Work Earnings in Gross modal)
                            const renderReadOnlyRow = (field: any) => {
                                const fieldName = field.name || field.id;
                                const amount = autoCalculatedDeductions[fieldName] || 0;
                                return (
                                    <div
                                        key={field.id}
                                        className="d-flex align-items-center gap-3 px-5 py-3"
                                        style={{ borderBottom: '1px solid #f0fdf4', background: '#fff' }}
                                    >
                                        <div style={{ flex: '1 1 0' }}>
                                            <span className="fw-semibold fs-7 text-gray-700">{fieldName}</span>
                                        </div>
                                        <div style={{ width: 160 }}>
                                            <div className="input-group input-group-sm">
                                                <span className="input-group-text border-end-0 px-2" style={{ fontSize: '0.75rem', background: '#f0fdf4', borderColor: '#bbf7d0', color: '#16a34a' }}>₹</span>
                                                <input
                                                    type="text"
                                                    readOnly
                                                    value={formatINRDecimal(amount).replace('₹', '')}
                                                    className="form-control border-start-0 ps-1 text-end fw-bolder"
                                                    style={{ fontSize: '0.85rem', background: '#f0fdf4', borderColor: '#bbf7d0', color: '#16a34a', cursor: 'default' }}
                                                />
                                            </div>
                                        </div>
                                        <div style={{ width: 28 }} />
                                    </div>
                                );
                            };

                            const renderRow = (field: any) => {
                                const fieldKey = field.id;
                                const currentExtra = Number(formikProps.values[fieldKey] || 0);
                                const fieldName = field.name || field.id;
                                const auto = autoCalculatedDeductions[fieldName] || 0;
                                const total = Math.max(0, auto + currentExtra);

                                const isProfTax = field.id === 'Professional Tax';
                                const isProfFees = field.id === 'Professional Fees';
                                let warningMsg = '';
                                if (isProfTax && !profTaxEnabled) warningMsg = 'Auto-disabled (TDS active)';
                                else if (isProfFees && !profFeesEnabled) warningMsg = 'Auto-disabled (P-Tax active)';

                                return (
                                    <div
                                        key={field.id}
                                        className="d-flex align-items-center gap-3 px-5 py-3"
                                        style={{ borderBottom: '1px solid #f5f5f5' }}
                                    >
                                        <div style={{ flex: '1 1 0', minWidth: 0 }}>
                                            {field.isNew ? (
                                                <input
                                                    className="form-control form-control-sm border-0 border-bottom rounded-0 bg-transparent fw-bold text-primary ps-0"
                                                    value={field.name}
                                                    onChange={(e) => updateFieldName(field.id, e.target.value, true)}
                                                    placeholder="Component name…"
                                                    style={{ fontSize: '0.82rem' }}
                                                />
                                            ) : (
                                                <div>
                                                    <span className="fw-semibold fs-7 text-gray-800">{field.name || field.id}</span>
                                                    {warningMsg && <div className="text-warning fs-9 mt-1">{warningMsg}</div>}
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ width: 120 }}>
                                            <div className="input-group input-group-sm">
                                                <span className="input-group-text bg-light border-end-0 text-gray-500 px-2" style={{ fontSize: '0.75rem' }}>₹</span>
                                                <input
                                                    type="number"
                                                    className="form-control border-start-0 ps-1 text-end"
                                                    {...formikProps.getFieldProps(fieldKey)}
                                                    placeholder="0"
                                                    style={{ fontWeight: 600, fontSize: '0.85rem' }}
                                                />
                                            </div>
                                        </div>

                                        <div className="text-end" style={{ minWidth: 76 }}>
                                            <div className="text-muted fs-9 mb-1">Auto</div>
                                            <div className="fw-semibold fs-7 text-gray-700">{formatINRDecimal(auto)}</div>
                                        </div>

                                        <div className="text-end" style={{ minWidth: 80 }}>
                                            <div className="text-muted fs-9 mb-1">Final</div>
                                            <div className="fw-bolder fs-7" style={{ color: total > 0 ? '#f1416c' : '#a1a5b7' }}>
                                                {formatINRDecimal(total)}
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => removeField(field.id, field.isNew)}
                                            style={{ width: 28, height: 28, minWidth: 28, border: 'none', background: 'transparent', color: '#f1416c', cursor: 'pointer', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                                        >
                                            <Close fontSize="small" />
                                        </button>
                                    </div>
                                );
                            };

                            const renderSection = (
                                title: string,
                                color: string,
                                fields: any[],
                                showAdd = false,
                                readOnly = false,
                                sectionType?: 'government' | 'attendance' | 'custom'
                            ) => {
                                if (fields.length === 0 && !showAdd) return null;
                                return (
                                    <div className="mb-5">
                                        <div className="d-flex align-items-center justify-content-between mb-2">
                                            <div className="d-flex align-items-center gap-2">
                                                <div style={{ width: 3, height: 14, borderRadius: 2, backgroundColor: color }} />
                                                <span className="fw-bolder fs-9 text-uppercase text-gray-500" style={{ letterSpacing: '0.06em' }}>
                                                    {title}
                                                </span>
                                                {readOnly && <span className="badge badge-light-success fs-9 py-1 px-2">Auto-Calculated</span>}
                                            </div>
                                            {showAdd && (
                                                <button type="button" className="btn btn-sm btn-light-primary fw-bold py-1 px-3 fs-8" onClick={() => addNewField(sectionType || 'custom')}>
                                                    <KTIcon iconName="plus" className="fs-8 me-1" />
                                                    Add Component
                                                </button>
                                            )}
                                        </div>

                                        {fields.length > 0 ? (
                                            <div className="rounded-3 overflow-hidden" style={{ border: readOnly ? '1px solid #bbf7d0' : '1px solid #e9ecef' }}>
                                                {/* Column headers */}
                                                <div
                                                    className="d-flex align-items-center gap-3 px-5 py-2"
                                                    style={{
                                                        background: readOnly ? '#f0fdf4' : '#f9f9f9',
                                                        borderBottom: readOnly ? '1px solid #bbf7d0' : '1px solid #e9ecef',
                                                    }}
                                                >
                                                    <div style={{ flex: '1 1 0', color: readOnly ? '#16a34a' : undefined }} className="fw-bold fs-9 text-uppercase">Component</div>
                                                    {readOnly ? (
                                                        <div style={{ width: 160, color: '#16a34a' }} className="fw-bold fs-9 text-uppercase text-end">Amount (Auto)</div>
                                                    ) : (
                                                        <>
                                                            <div style={{ width: 120 }} className="text-muted fs-9 fw-bold text-uppercase text-center">Adjustment</div>
                                                            <div style={{ minWidth: 76 }} className="text-muted fs-9 fw-bold text-uppercase text-end">Auto</div>
                                                            <div style={{ minWidth: 80 }} className="text-muted fs-9 fw-bold text-uppercase text-end">Final</div>
                                                        </>
                                                    )}
                                                    <div style={{ width: 28 }} />
                                                </div>
                                                {fields.map(readOnly ? renderReadOnlyRow : renderRow)}
                                            </div>
                                        ) : (
                                            showAdd && (
                                                <div className="text-center py-6 bg-light rounded-3 border border-dashed border-gray-300">
                                                    <span className="text-muted fs-8">No custom deductions yet. Click Add to create one.</span>
                                                </div>
                                            )
                                        )}
                                    </div>
                                );
                            };

                            return (
                                <Form noValidate>
                                    {renderSection('Government & Statutory', '#3e97ff', govFields, true, false, 'government')}
                                    {lateCheckinFields.length > 0 && renderSection('Late Checkins', '#50cd89', lateCheckinFields, false, true)}
                                    {renderSection('Attendance Deductions', '#ffa621', editableAttFields, true, false, 'attendance')}

                                    {allFields.length === 0 && (
                                        <div className="text-center py-14 bg-light rounded-4 border border-dashed border-gray-300 mb-4">
                                            <KTIcon iconName="document" className="fs-3x text-gray-400 mb-4" />
                                            <p className="text-gray-600 fw-bold mb-4 fs-7">No deduction adjustments configured.</p>
                                            <button type="button" className="btn btn-primary btn-sm px-6" onClick={() => addNewField('custom')}>
                                                Add First Adjustment
                                            </button>
                                        </div>
                                    )}

                                    <div className="d-flex justify-content-between align-items-center py-4 border-top mt-2">
                                        <span className="text-muted fs-9 d-flex align-items-center gap-1">
                                            <InfoOutlined sx={{ fontSize: 13, verticalAlign: 'middle' }} />
                                            Positive increases · Negative reduces
                                        </span>
                                        <div className="d-flex gap-3">
                                            <Button type="button" variant="light" onClick={onClose} disabled={loading}>
                                                Cancel
                                            </Button>
                                            <Button
                                                type="submit"
                                                disabled={loading || !formikProps.isValid}
                                                style={{ backgroundColor: '#1E3A8A', borderColor: '#1E3A8A', color: '#fff' }}
                                            >
                                                {loading ? 'Saving…' : 'Save Changes'}
                                            </Button>
                                        </div>
                                    </div>
                                </Form>
                            );
                        }}
                    </Formik>
                )}
            </Modal.Body>
        </Modal>
    );
};
