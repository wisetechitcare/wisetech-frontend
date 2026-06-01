import React, { useState, useEffect } from 'react';
import { Modal, Button, OverlayTrigger, Tooltip as BSTooltip } from 'react-bootstrap';
import { Formik, Form, FormikValues } from 'formik';
import * as Yup from 'yup';
import TextInput from '@app/modules/common/inputs/TextInput';
import { KTIcon } from '@metronic/helpers';
import { errorConfirmation, successConfirmation } from '@utils/modal';
import { createUpdateDeductionConfiguration, fetchDeductionConfiguration, validateDeductionConfigurationJson, updateEmployee } from '@services/employee';
import { IMonthlyApiResponse, IBreakdownData } from '@redux/slices/salaryData';
import { IconButton } from '@mui/material';
import { Close, InfoOutlined } from '@mui/icons-material';
import { formatINR2 } from '../../../../../../../modules/payroll/utils/payrollFormatters';

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

    const addNewField = () => {
        const newField: DynamicField = {
            id: `new_field_${Date.now()}`,
            name: `Other ${fieldCounter}`,
            value: 0,
            type: "number",
            isNew: true,
            autoAmount: 0
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
                    .required(`${deductionDistributionData[key].name} is required`)
                    .min(0, `${deductionDistributionData[key].name} must be greater than or equal to 0`);
            });

        // Add validation for new fields
        dynamicFields.forEach(field => {
            schemaFields[field.id] = Yup.number()
                .typeError(`${field.name} must be a valid number`)
                .required(`${field.name} is required`)
                .min(0, `${field.name} must be greater than or equal to 0`);
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
            
            // 1. Extract auto-calculated values from monthlyApiData for preview
            const autoDeductions: Record<string, number> = {};
            if (monthlyApiData?.salaryData?.[0]?.deductionBreakdown?.fixed) {
                const fixed = monthlyApiData.salaryData[0].deductionBreakdown.fixed;
                Object.entries(fixed).forEach(([key, data]: [string, any]) => {
                    autoDeductions[key] = data.earned || 0;
                });
                
                // Check mutual exclusivity from API data
                setProfFeesEnabled(!!fixed['Professional Fees']?.isActive);
                setProfTaxEnabled(!!fixed['Professional Tax']?.isActive);
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

            // 3. Prepare the fields
            const defaultFields: any = {
                'Provident Fund': { name: 'Provident Fund', type: 'number', value: 0, isActive: true },
                'Professional Tax': { name: 'Professional Tax', type: 'number', value: 0, isActive: true },
                'Professional Fees': { name: 'Professional Fees', type: 'number', value: 0, isActive: true }
            };

            // Merge existing data if found
            const finalData: any = {};
            const baseData = existingAdditionalData || defaultFields;
            
            Object.entries(baseData).forEach(([key, value]: [string, any]) => {
                if (key === '_fieldOrder') return;
                finalData[key] = {
                    ...value,
                    value: value.value || 0,
                    type: 'number'
                };
            });

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
            const pfAmount = Number(values['Professional Fees'] || 0);

            // Handle existing fields (not deleted)
            Object.entries(deductionDistributionData)
                .filter(([key]) => !deletedFields.includes(key))
                .forEach(([key, fieldData]: [string, any]) => {
                    const isProfTax = key === 'Professional Tax';
                    // When PF has a positive amount the employee switches to contract-based,
                    // so suppress any PT additional amount to avoid double-deduction.
                    let finalValue = Number(values[key]);
                    if (isProfTax && pfAmount > 0) finalValue = 0;

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
                    isActive: true
                };
            });

            const apiPayload = {
                employeeId: employeeId,
                month: parseInt(month),
                year: parseInt(year),
                configuration: transformedData
            };

            await createUpdateDeductionConfiguration(apiPayload as any);

            // Sync Professional Fees to employee's Financial Config (App Settings)
            // so the two places always stay in agreement.
            if (pfAmount > 0) {
                // Entering a PF amount means the employee is contract-based.
                await updateEmployee(employeeId, {
                    id: employeeId,
                    professionalFeesEnabled: true,
                    professionalFeesType: "FIXED",
                    professionalFeesAmount: pfAmount,
                    professionalFeesPercentage: null,
                });
            } else if (profFeesEnabled) {
                // PF was previously active but has been zeroed out — revert to salary-based
                // so PT is re-enabled on next calculation.
                await updateEmployee(employeeId, {
                    id: employeeId,
                    professionalFeesEnabled: false,
                    professionalFeesType: "FIXED",
                    professionalFeesAmount: null,
                    professionalFeesPercentage: null,
                });
            }

            successConfirmation(`Additional deductions updated successfully!`);
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

    const renderPreview = (fieldName: string, extraValue: number) => {
        const auto = autoCalculatedDeductions[fieldName] || 0;
        const total = auto + extraValue;
        
        return (
            <div className="mt-2 p-3 bg-light rounded border border-dashed border-gray-300">
                <div className="d-flex justify-content-between fs-8 text-gray-600 mb-1">
                    <span>Auto Calculated:</span>
                    <span>{formatINR2(auto)}</span>
                </div>
                <div className="d-flex justify-content-between fs-8 text-primary mb-1">
                    <span>Additional:</span>
                    <span>+{formatINR2(extraValue)}</span>
                </div>
                <div className="separator separator-dashed my-1"></div>
                <div className="d-flex justify-content-between fs-7 fw-bolder text-gray-800">
                    <span>Final {fieldName}:</span>
                    <span>{formatINR2(total)}</span>
                </div>
            </div>
        );
    };

    return (
        <Modal show={show} onHide={onClose} centered size="lg" backdrop="static">
            <Modal.Header closeButton>
                <Modal.Title className="fw-bolder fs-3 text-gray-800">Modify Deduction Distribution</Modal.Title>
            </Modal.Header>
            <Modal.Body className="py-8">
                {loading ? (
                    <div className="d-flex justify-content-center align-items-center py-20">
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
                                .map(([key, value]: [string, any]) => ({
                                    id: key,
                                    ...value,
                                    isNew: false
                                }));

                            const allFields = [...existingFields, ...dynamicFields];

                            return (
                                <Form className='d-flex flex-column' noValidate>
                                    <div className="alert alert-dismissible bg-light-primary border border-primary border-dashed d-flex flex-column flex-sm-row p-5 mb-8">
                                        <InfoOutlined className="fs-2 text-primary me-4 mb-5 mb-sm-0" />
                                        <div className="d-flex flex-column pe-0 pe-sm-10">
                                            <h5 className="mb-1 text-primary fw-bolder">Important Note</h5>
                                            <span className="fs-7 text-gray-700">
                                                Amounts entered here will be <strong>added</strong> to the payroll calculated deductions. 
                                                They will <strong>not</strong> overwrite the original calculations.
                                            </span>
                                        </div>
                                    </div>

                                    <div className="d-flex justify-content-between align-items-center mb-6">
                                        <h6 className="fw-bolder text-gray-800 mb-0">Deduction Adjustment Fields</h6>
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-light-primary fw-bold"
                                            onClick={addNewField}
                                        >
                                            <KTIcon iconName="plus" className="fs-6 me-1" />
                                            Add Other Deduction
                                        </button>
                                    </div>

                                    <div className="row g-6">
                                        {allFields.map((field) => {
                                            const isProfTax = field.id === 'Professional Tax';
                                            const isProfFees = field.id === 'Professional Fees';

                                            // Professional Tax is disabled when Professional Fees has an amount
                                            // or when the employee is already contract-based.
                                            const pfCurrentValue = Number(formikProps.values['Professional Fees'] || 0);
                                            const isDisabled = isProfTax && (profFeesEnabled || pfCurrentValue > 0);
                                            const disabledReason = isDisabled ? "Professional Tax disabled because Professional Fees is active" : '';

                                            // Show a sync hint on the PF card when the employee is currently salary-based
                                            const showSyncHint = isProfFees && !profFeesEnabled;

                                            const currentExtra = Number(formikProps.values[field.id] || 0);

                                            return (
                                                <div key={field.id} className="col-lg-6">
                                                    <div className={`p-5 rounded-4 border ${isDisabled ? 'bg-light-secondary border-gray-300' : 'bg-white border-gray-200'} shadow-sm h-100 position-relative`}>
                                                        <div className="d-flex justify-content-between align-items-start mb-4">
                                                            <div className="flex-grow-1 pe-8">
                                                                {field.isNew ? (
                                                                    <div className="mb-3">
                                                                        <label className="form-label fw-bold text-gray-700 fs-8 text-uppercase">Component Name</label>
                                                                        <input
                                                                            type="text"
                                                                            className="form-control form-control-sm form-control-solid"
                                                                            value={field.name}
                                                                            onChange={(e) => updateFieldName(field.id, e.target.value, field.isNew)}
                                                                            placeholder="e.g. Loan Recovery"
                                                                        />
                                                                    </div>
                                                                ) : (
                                                                    <div className="d-flex align-items-center gap-2 mb-1">
                                                                        <span className={`fw-bolder fs-6 ${isDisabled ? 'text-gray-500' : 'text-gray-800'}`}>
                                                                            {field.name || field.id}
                                                                        </span>
                                                                        {isDisabled && (
                                                                            <OverlayTrigger
                                                                                placement="top"
                                                                                overlay={<BSTooltip>{disabledReason}</BSTooltip>}
                                                                            >
                                                                                <InfoOutlined sx={{ fontSize: 16, color: '#999' }} />
                                                                            </OverlayTrigger>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <IconButton
                                                                onClick={() => removeField(field.id, field.isNew)}
                                                                size="small"
                                                                className="position-absolute top-0 end-0 mt-2 me-2"
                                                                sx={{ color: '#f1416c', '&:hover': { backgroundColor: '#fff5f8' } }}
                                                            >
                                                                <Close fontSize="small" />
                                                            </IconButton>
                                                        </div>

                                                        {/* Sync hint: entering a PF amount will switch the employee to Contract Based */}
                                                        {showSyncHint && (
                                                            <div className="alert alert-dismissible bg-light-warning border border-warning border-dashed d-flex align-items-start gap-2 p-3 mb-3">
                                                                <InfoOutlined sx={{ fontSize: 15, color: '#f6c000', flexShrink: 0, mt: '1px' }} />
                                                                <span className="fs-8 text-gray-700">
                                                                    Entering an amount here will automatically switch this employee to <strong>Contract Based</strong> and sync the value to <strong>App Settings → Financial Config</strong>.
                                                                </span>
                                                            </div>
                                                        )}

                                                        <div className="mb-2">
                                                            <label className={`form-label fw-bold fs-8 text-uppercase ${isDisabled ? 'text-gray-500' : 'text-gray-700'}`}>
                                                                Additional Deduction Amount
                                                            </label>
                                                            <TextInput
                                                                isRequired={true}
                                                                label=""
                                                                formikField={field.id}
                                                                type="number"
                                                                placeholder="0.00"
                                                                readonly={isDisabled}
                                                            />
                                                        </div>

                                                        {!isDisabled && renderPreview(field.isNew ? field.id : field.name || field.id, currentExtra)}

                                                        {isDisabled && (
                                                            <div className="text-center py-4 bg-gray-100 rounded border border-dashed border-gray-300 mt-2">
                                                                <span className="text-muted fs-8 fw-bold italic">{disabledReason}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {allFields.length === 0 && (
                                        <div className="text-center py-20 bg-light rounded-4 border border-dashed border-gray-300">
                                            <KTIcon iconName="document" className="fs-3x text-gray-400 mb-5" />
                                            <p className="text-gray-600 fw-bold mb-5">No deduction adjustments configured.</p>
                                            <button
                                                type="button"
                                                className="btn btn-primary btn-sm px-6"
                                                onClick={addNewField}
                                            >
                                                Add First Adjustment
                                            </button>
                                        </div>
                                    )}

                                    <div className="d-flex justify-content-end gap-3 mt-12 pt-8 border-top">
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            className="btn btn-light"
                                            onClick={onClose}
                                            disabled={loading}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
                                            className="btn btn-primary"
                                            disabled={loading || !formikProps.isValid}
                                        >
                                            {loading ? 'Saving Changes...' : 'Save Deduction Distribution'}
                                        </Button>
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