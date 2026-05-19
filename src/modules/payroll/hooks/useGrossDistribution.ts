import { useState, useCallback, useMemo } from 'react';
import * as Yup from 'yup';
import { GrossDistributionData, DynamicField } from '../types/payroll.types';
import { PayrollService } from '../services/payroll.service';
import { successConfirmation, errorConfirmation } from '@utils/modal';

export const useGrossDistribution = (employee: any, month: string, year: string, onRefresh: () => void) => {
    const [loading, setLoading] = useState(false);
    const [grossDistributionData, setGrossDistributionData] = useState<GrossDistributionData>({});
    const [dynamicFields, setDynamicFields] = useState<DynamicField[]>([]);
    const [deletedFields, setDeletedFields] = useState<string[]>([]);
    const [fieldCounter, setFieldCounter] = useState(1);

    const fetchGrossDistributionData = useCallback(async () => {
        try {
            setLoading(true);
            const apiResult = await PayrollService.fetchGrossPayConfig(employee.id, month, year);
            if (!apiResult.hasError && apiResult.data?.configuration) {
                setGrossDistributionData(apiResult.data.configuration);
            }
        } catch (error) {
            console.error("Failed to fetch gross distribution data", error);
        } finally {
            setLoading(false);
        }
    }, [employee.id, month, year]);

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
            setDynamicFields(dynamicFields.filter(f => f.id !== fieldId));
        } else {
            setDeletedFields([...deletedFields, fieldId]);
        }
    };

    const updateFieldName = (fieldId: string, newName: string, isNew: boolean) => {
        if (isNew) {
            setDynamicFields(dynamicFields.map(f => f.id === fieldId ? { ...f, name: newName } : f));
        } else {
            setGrossDistributionData({
                ...grossDistributionData,
                [fieldId]: { ...grossDistributionData[fieldId], name: newName }
            });
        }
    };

    const handleSubmit = async (values: any) => {
        try {
            setLoading(true);
            const transformedData: any = {};

            Object.entries(grossDistributionData)
                .filter(([key]) => !deletedFields.includes(key) && key?.toLowerCase() !== 'basic salary')
                .forEach(([key, fieldData]) => {
                    transformedData[key] = {
                        ...fieldData,
                        value: Number(values[key]),
                        type: "number"
                    };
                });

            dynamicFields.forEach(field => {
                transformedData[field.name] = {
                    name: field.name,
                    value: Number(values[field.id]),
                    type: "number",
                    isActive: true
                };
            });

            await PayrollService.saveGrossPayConfig({
                employeeId: employee.id,
                month: parseInt(month),
                year: parseInt(year),
                configuration: transformedData
            } as any);

            successConfirmation('Gross distribution updated successfully!');
            onRefresh();
            return true;
        } catch (error: any) {
            errorConfirmation(error.message || "Failed to update gross distribution");
            return false;
        } finally {
            setLoading(false);
        }
    };

    const initialValues = useMemo(() => {
        const values: any = {};
        Object.entries(grossDistributionData).forEach(([key, field]) => {
            values[key] = field.value;
        });
        dynamicFields.forEach(field => {
            values[field.id] = field.value;
        });
        return values;
    }, [grossDistributionData, dynamicFields]);

    const validationSchema = useMemo(() => {
        const schema: any = {};
        Object.keys(grossDistributionData).forEach(key => {
            schema[key] = Yup.number().typeError("Must be a valid number").required("Required");
        });
        dynamicFields.forEach(field => {
            schema[field.id] = Yup.number().typeError("Must be a valid number").required("Required");
        });
        return Yup.object(schema);
    }, [grossDistributionData, dynamicFields]);

    return {
        loading,
        grossDistributionData,
        dynamicFields,
        deletedFields,
        initialValues,
        validationSchema,
        fetchGrossDistributionData,
        addNewField,
        removeField,
        updateFieldName,
        handleSubmit
    };
};
