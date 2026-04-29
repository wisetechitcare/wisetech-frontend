import React, { useState, useEffect } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { Formik, Form, FormikValues } from 'formik';
import * as Yup from 'yup';
import TextInput from '@app/modules/common/inputs/TextInput';
import { KTIcon } from '@metronic/helpers';
import { errorConfirmation, successConfirmation } from '@utils/modal';
import { createUpdateDeductionConfiguration, fetchDeductionConfiguration, validateDeductionConfigurationJson } from '@services/employee';
import { IMonthlyApiResponse, IBreakdownData } from '@redux/slices/salaryData';
import { IconButton } from '@mui/material';
import { Close } from '@mui/icons-material';

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
    value: number;
    type: string;
    isNew: boolean;
}

/**
 * Transform monthly salary API deduction data to modal format
 * @param deductionBreakdown - The deductionBreakdown from monthly salary API
 * @returns Transformed data in modal format
 */
const transformApiDataToModalFormat = (deductionBreakdown: IBreakdownData) => {
    console.log('🔄 [DeductionModal] Transforming API data to modal format');
    console.log('Input deductionBreakdown:', deductionBreakdown);
    
    const transformedData: any = {};
    
    try {
        // Only use fixed deductions as per requirements
        const fixedDeductions = deductionBreakdown?.fixed || {};
        
        Object.entries(fixedDeductions).forEach(([key, data]: [string, any]) => {
            transformedData[key] = {
                name: key, // Use the key as the name
                type: 'number', // Always set to 'number' as per requirements
                value: data.earned || data.value || 0, // Use 'earned' first, then 'value', fallback to 0
                isActive: true // Always true for API data
            };
            
            console.log(`✅ Transformed ${key}:`, transformedData[key]);
        });
        
        console.log('🎯 Final transformed data:', transformedData);
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

    const resetForm = () => {
        setDynamicFields([]);
        setFieldCounter(1);
        setDeletedFields([]);
        setDeductionDistributionData({});
        setInitialValues({});
    };

    const addNewField = () => {
        const newField: DynamicField = {
            id: `new_field_${Date.now()}`,
            name: `Other ${fieldCounter}`,
            value: 0,
            type: "number",
            isNew: true
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

        console.log("deductionDistributionData:: ", deductionDistributionData);
        console.log("initialValues:: ", initialValues);

        return initialValues;
    };

    const validateFormFields = (formValues: any, allFields: DynamicField[]) => {
        console.log("=== VALIDATING DEDUCTION FORM FIELDS ===");
        console.log("Form values:", formValues);
        console.log("All fields:", allFields);

        // Check if there are any fields at all
        if (allFields.length === 0) {
            console.log("❌ No fields available");
            return {
                isValid: false,
                hasFields: false,
                errors: ["No fields available. Please add at least one field."]
            };
        }

        const errors: string[] = [];
        let hasEmptyValues = false;
        let hasEmptyNames = false;

        // Validate each field
        allFields.forEach(field => {
            const fieldValue = formValues[field.id];

            // Check for empty names in dynamic fields
            if (field.isNew && (!field.name || field.name.trim() === '')) {
                hasEmptyNames = true;
                errors.push(`Field name cannot be empty for new field`);
            }

            // Check for empty or invalid values
            if (fieldValue === undefined || fieldValue === null || fieldValue === '' || isNaN(Number(fieldValue))) {
                hasEmptyValues = true;
                errors.push(`Value is required for field: ${field.name || field.id}`);
            }

            // Check for negative values
            if (Number(fieldValue) < 0) {
                errors.push(`Value cannot be negative for field: ${field.name || field.id}`);
            }
        });

        const isValid = !hasEmptyValues && !hasEmptyNames && errors.length === 0;

        console.log(`Validation result: ${isValid ? '✅ Valid' : '❌ Invalid'}`);
        if (errors.length > 0) {
            console.log("Validation errors:", errors);
        }

        return {
            isValid,
            hasFields: true,
            hasEmptyValues,
            hasEmptyNames,
            errors
        };
    };

    const getSubmitButtonState = (formikProps: any, allFields: DynamicField[], loading: boolean) => {
        const validation = validateFormFields(formikProps.values, allFields);

        const isDisabled =
            loading ||
            !formikProps.isValid ||
            !validation.isValid ||
            !validation.hasFields;

        let disabledReason = '';
        if (loading) disabledReason = 'Loading...';
        else if (!validation.hasFields) disabledReason = 'No fields available';
        else if (validation.hasEmptyValues) disabledReason = 'Some fields have empty values';
        else if (validation.hasEmptyNames) disabledReason = 'Some fields have empty names';
        else if (!formikProps.isValid) disabledReason = 'Form validation failed';

        return {
            isDisabled,
            disabledReason,
            validation
        };
    };

    const fetchDeductionDistributionData = async () => {
        try {
            setLoading(true);
            console.log("=== FETCHING DEDUCTION DISTRIBUTION DATA ===");
            console.log(`Employee ID: ${employeeId}, Month: ${month}, Year: ${year}`);

            // PRIORITY 1: Check EmployeeDeductionConfiguration first
            try {
                const apiResult = await fetchDeductionConfiguration(employeeId, month, year);
                console.log("API Result from EmployeeDeductionConfiguration:", apiResult);

                if (!apiResult.hasError && apiResult.data && apiResult.data.configuration) {
                    console.log("✅ Found data in EmployeeDeductionConfiguration");
                    const jsonObject = apiResult.data.configuration;

                    setDeductionDistributionData(jsonObject);

                    // Transform data for form initial values
                    const initialValues: any = {};
                    Object.entries(jsonObject).forEach(([key, value]: [string, any]) => {
                        if (key !== '_fieldOrder') { // Skip metadata (backward compatibility)
                            initialValues[key] = value.value;
                        }
                    });

                    setInitialValues(initialValues);
                    console.log("Initial values set:", initialValues);
                    return; // Exit early if data found
                } else {
                    console.log("❌ No data found in EmployeeDeductionConfiguration, falling back to old API");
                }
            } catch (apiError: any) {
                console.log("API Error (expected for first time):", apiError?.message);
                // Continue to fallback - this is expected behavior for first-time users
            }

            // PRIORITY 2: Use monthly salary API data if available
            if (monthlyApiData?.salaryData?.[0]?.deductionBreakdown) {
                console.log("🔄 Using monthly salary API deduction data");
                const apiDeductionData = monthlyApiData.salaryData[0].deductionBreakdown;
                
                try {
                    const transformedData = transformApiDataToModalFormat(apiDeductionData);
                    
                    if (Object.keys(transformedData).length > 0) {
                        console.log("✅ API deduction data transformed successfully");
                        setDeductionDistributionData(transformedData);
                        
                        // Transform data for form initial values
                        const initialValues: any = {};
                        Object.entries(transformedData).forEach(([key, value]: [string, any]) => {
                            initialValues[key] = value.value;
                        });
                        
                        setInitialValues(initialValues);
                        console.log("✅ Monthly salary API data loaded as defaults");
                        return;
                    } else {
                        console.log("❌ API data transformation resulted in empty object, falling back to hardcoded defaults");
                    }
                } catch (transformError) {
                    console.error("❌ Error transforming API data, falling back to hardcoded defaults:", transformError);
                }
            } else {
                console.log("❌ No monthly API data available, falling back to hardcoded defaults");
            }

            // PRIORITY 3: Use hardcoded default configuration (last resort)
            console.log("🔄 Using hardcoded default deduction configuration");
            const defaultDeductionConfig = {
                'Provident Fund': {
                    name: 'Provident Fund',
                    type: 'percentage',
                    value: 0,
                    isActive: true
                },
                'Professional Tax': {
                    name: 'Professional Tax',
                    type: 'number',
                    value: 0,
                    isActive: true
                }
            };

            console.log("Default config loaded:", defaultDeductionConfig);
            setDeductionDistributionData(defaultDeductionConfig);

            // Transform data for form initial values
            const initialValues: any = {};
            Object.entries(defaultDeductionConfig).forEach(([key, value]: [string, any]) => {
                initialValues[key] = value.value;
            });

            setInitialValues(initialValues);
            console.log("✅ Hardcoded default deduction data loaded successfully");

        } catch (error) {
            console.error("❌ Critical error in fetchDeductionDistributionData:", error);
            errorConfirmation("Failed to fetch deduction distribution data");
            setDeductionDistributionData({});
            setInitialValues({});
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (values: any, actions: FormikValues) => {
        try {
            setLoading(true);

            console.log("=== DEDUCTION FORM SUBMISSION VALUES ===");
            console.log("Raw form values:", values);
            console.log("Existing fields data:", deductionDistributionData);
            console.log("Dynamic fields:", dynamicFields);
            console.log("Deleted fields:", deletedFields);

            const transformedData: any = {};

            // Handle existing fields (not deleted)
            Object.entries(deductionDistributionData)
                .filter(([key]) => !deletedFields.includes(key))
                .forEach(([key, fieldData]: [string, any]) => {
                    transformedData[key] = {
                        ...fieldData,
                        value: Number(values[key]),
                        type: "number" // Always set type to number
                    };
                });

            // Handle new dynamic fields
            dynamicFields.forEach(field => {
                const newKey = field.name.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, ''); // Remove spaces and special chars for key
                transformedData[newKey] = {
                    name: field.name,
                    value: Number(values[field.id]),
                    type: "number",
                    isActive: true
                };
            });

            console.log("=== TRANSFORMED DEDUCTION DATA FOR API ===");
            console.log("Final transformed data:", transformedData);

            // Validate final data structure before submission
            const configValidation = validateDeductionConfigurationJson(transformedData);
            if (!configValidation.isValid) {
                console.error("❌ Final configuration validation failed:", configValidation.error);
                errorConfirmation(`Validation failed: ${configValidation.error}`);
                return;
            }

            // Save to new API endpoint
            const apiPayload = {
                employeeId: employeeId,
                month: parseInt(month),
                year: parseInt(year),
                configuration: transformedData
            };

            console.log("=== DEDUCTION API PAYLOAD ===");
            console.log("Payload being sent to API:", apiPayload);

            const result = await createUpdateDeductionConfiguration(apiPayload as any);
            console.log("✅ API response:", result);

            successConfirmation(`Deduction distribution updated successfully! ${Object.keys(transformedData).length} field(s) saved.`);
            resetForm();
            onSuccess();

        } catch (error: any) {
            console.error("❌ Error updating deduction distribution:", error);
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
        <Modal show={show} onHide={onClose} centered size="lg">
            <Modal.Header closeButton>
                <Modal.Title>Modify Deduction Distribution</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {loading && (
                    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                    </div>
                )}

                {!loading && (Object.keys(deductionDistributionData).length > 0 || dynamicFields.length > 0) && (
                    <Formik
                        initialValues={getDynamicInitialValues()}
                        onSubmit={handleSubmit}
                        validationSchema={getDynamicValidationSchema()}
                        enableReinitialize={false}
                    >
                        {(formikProps) => {
                            // Combine existing and new fields for display
                            const existingFields = Object.entries(deductionDistributionData)
                                .filter(([key]) => !deletedFields.includes(key) && key !== '_fieldOrder')
                                .map(([key, value]: [string, any]) => ({
                                    id: key,
                                    ...value,
                                    isNew: false
                                }));

                            const allFields = [...existingFields, ...dynamicFields];

                            return (
                                <Form className='d-flex flex-column' noValidate placeholder={undefined}>
                                    {/* Add New Field Button */}
                                    <div className="d-flex justify-content-between align-items-center mb-4">
                                        <h6 className="mb-0">Deduction Distribution Fields</h6>
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-primary"
                                            onClick={addNewField}
                                        >
                                            <KTIcon iconName="plus" className="fs-6 me-1" />
                                            Add New Field
                                        </button>
                                    </div>

                                    {/* Dynamic Fields */}
                                    <div className="row">
                                        {allFields.map((field) => (
                                            <div key={field.id} className="col-lg-6 mb-4">
                                                <div className="d-flex align-items-start gap-2">
                                                    <div className="flex-grow-1">
                                                        {/* Field Name Input for new fields */}
                                                        {field.isNew && (
                                                            <div className="mb-2">
                                                                <label className="form-label">Field Name</label>
                                                                <input
                                                                    type="text"
                                                                    className="form-control form-control-sm"
                                                                    value={field.name}
                                                                    onChange={(e) => updateFieldName(field.id, e.target.value, field.isNew)}
                                                                    placeholder="Enter field name"
                                                                />
                                                            </div>
                                                        )}

                                                        {/* Value Input */}
                                                        <TextInput
                                                            isRequired={true}
                                                            label={field.isNew ? "Value" : (field.name || field.id)}
                                                            formikField={field.id}
                                                            type="number"
                                                        />

                                                        {!field.isNew && (
                                                            <small className="text-muted">
                                                                Original: {field.value}
                                                            </small>
                                                        )}
                                                    </div>
                                                    <IconButton
                                                        onClick={() => removeField(field.id, field.isNew)}
                                                        sx={{ color: '#d32f2f' }}
                                                        title="Remove field"
                                                    >
                                                        <Close />
                                                    </IconButton>
                                                    {/* Remove Button */}
                                                    {/* <button
                                                        type="button"
                                                        className="btn btn-sm btn-danger mt-4"
                                                        onClick={() => removeField(field.id, field.isNew)}
                                                        title="Remove field"
                                                    >
                                                        <KTIcon iconName="close" className="fs-6 text-white" />
                                                    </button> */}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* No Fields Message */}
                                    {allFields.length === 0 && (
                                        <div className="text-center py-4">
                                            <p className="text-muted mb-3">No deduction fields configured yet.</p>
                                            <button
                                                type="button"
                                                className="btn btn-primary btn-sm"
                                                onClick={addNewField}
                                            >
                                                <KTIcon iconName="plus" className="fs-6 me-1" />
                                                Add Your First Field
                                            </button>
                                        </div>
                                    )}

                                    {/* Submit Button */}
                                    <div className="text-end mt-4">
                                        <Button
                                            type="submit"
                                            className="btn btn-primary"
                                            disabled={getSubmitButtonState(formikProps, allFields, loading).isDisabled}
                                        >
                                            {loading ? 'Saving...' : 'Save Deduction Distribution'}
                                        </Button>
                                    </div>
                                </Form>
                            );
                        }}
                    </Formik>
                )}

                {!loading && Object.keys(deductionDistributionData).length === 0 && dynamicFields.length === 0 && (
                    <div className="text-center py-5">
                        <h5 className="text-muted mb-3">No Deduction Configuration Found</h5>
                        <p className="text-muted mb-4">Start by adding your first deduction field.</p>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={addNewField}
                        >
                            <KTIcon iconName="plus" className="fs-6 me-1" />
                            Add First Field
                        </button>
                    </div>
                )}
            </Modal.Body>
        </Modal>
    );
};