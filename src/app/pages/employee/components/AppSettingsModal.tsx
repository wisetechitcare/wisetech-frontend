import React, { useState, useEffect } from "react";
import { Modal, Button } from "react-bootstrap";
import { Formik, Form as FormikForm } from "formik";
import * as Yup from "yup";
import { fetchWizardData, updateEmployee } from "@services/employee";
import { successConfirmation, errorConfirmation } from "@utils/modal";
import RadioInput, { RadioButton } from "@app/modules/common/inputs/RadioInput";
import NumberInput from "@app/modules/common/inputs/NumberInput";
import Loader from "@app/modules/common/utils/Loader";

interface AppSettingsModalProps {
    show: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    employeeId: string;
}

const showAppSettingsRadioBtn: RadioButton[] = [
    { label: 'Yes', value: "1" },
    { label: 'No', value: "0" }
];

const allowOverTimeRadioBtn: RadioButton[] = [
    { label: 'Yes', value: "1" },
    { label: 'No', value: "0" }
];

const validationSchema = Yup.object().shape({
    isAdmin: Yup.string().required("This field is required"),
    allowOverTime: Yup.string().required("This field is required"),
    allowedPerMonth: Yup.number()
        .required("This field is required")
        .min(1, "Must be at least 1"),
    attendanceRequestRaiseLimit: Yup.number()
        .required("This field is required")
        .min(0, "Cannot be negative"),
});

const AppSettingsModal: React.FC<AppSettingsModalProps> = ({
    show,
    onClose,
    onSuccess,
    employeeId,
}) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [initialValues, setInitialValues] = useState({
        isAdmin: "0",
        allowOverTime: "0",
        allowedPerMonth: 1,
        attendanceRequestRaiseLimit: 0,
    });

    useEffect(() => {
        const loadEmployeeData = async () => {
            if (!show || !employeeId) return;

            setIsLoading(true);
            setError(null);

            try {
                const { data: { wizardData } } = await fetchWizardData(employeeId, false);

                setInitialValues({
                    isAdmin: wizardData?.isAdmin ? "1" : "0",
                    allowOverTime: wizardData?.allowOverTime =="1" ? "1" : "0",
                    allowedPerMonth: wizardData?.allowedPerMonth || 1,
                    attendanceRequestRaiseLimit: wizardData?.attendanceRequestRaiseLimit || 0,
                });
            } catch (err: any) {
                console.error("Error loading employee data:", err);
                setError("Failed to load employee settings");
            } finally {
                setIsLoading(false);
            }
        };

        loadEmployeeData();
    }, [show, employeeId]);

    const handleSubmit = async (values: typeof initialValues) => {
        setError(null);
        setIsSubmitting(true);

        try {
            const payload = {
                id: employeeId,
                isAdmin: values.isAdmin === "1" ? true : false,
                allowOverTime: values.allowOverTime,
                allowedPerMonth: Number(values.allowedPerMonth),
                attendanceRequestRaiseLimit: Number(values.attendanceRequestRaiseLimit),
            };

            await updateEmployee(employeeId, payload);
            successConfirmation("App settings updated successfully");

            if (onSuccess) onSuccess();
            onClose();
        } catch (err: any) {
            const errMessage = err.response?.data?.message || err.response?.data?.detail || "Failed to update app settings";
            setError(errMessage);
            errorConfirmation(errMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!show) return null;

    return (
        <Modal show={show} onHide={onClose} centered>
            <Modal.Header
                closeButton
                style={{ borderBottom: "none", paddingBottom: "8px" }}
            >
                <Modal.Title
                    style={{ fontWeight: "600", fontSize: "18px", color: "#1a1a1a" }}
                >
                    App Settings
                </Modal.Title>
            </Modal.Header>

            {isLoading ? (
                <Modal.Body style={{ minHeight: "200px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Loader />
                </Modal.Body>
            ) : (
                <Formik
                    initialValues={initialValues}
                    validationSchema={validationSchema}
                    onSubmit={handleSubmit}
                    enableReinitialize
                >
                    {() => (
                        <FormikForm placeholder={""}>
                            <Modal.Body style={{ paddingTop: "16px" }}>
                                {error && <div className="alert alert-danger mb-3">{error}</div>}

                                {/* Show App Settings */}
                                <div className="mb-4">
                                    <RadioInput
                                        inputLabel="Show App Settings"
                                        isRequired={true}
                                        radioBtns={showAppSettingsRadioBtn}
                                        formikField="isAdmin"
                                    />
                                </div>

                                {/* Allow Overtime */}
                                <div className="mb-4">
                                    <RadioInput
                                        inputLabel="Allow Overtime"
                                        isRequired={true}
                                        radioBtns={allowOverTimeRadioBtn}
                                        formikField="allowOverTime"
                                    />
                                </div>

                                {/* Allowed Per Month */}
                                <div className="mb-4">
                                    <NumberInput
                                        isRequired={true}
                                        formikField="allowedPerMonth"
                                        label="Allowed Per Month"
                                        min={1}
                                    />
                                    <div className="form-text text-muted mt-1" style={{ fontSize: "12px" }}>
                                        <i className="bi bi-info-circle me-1"></i>
                                        Combined monthly leave limit across all leave types.
                                    </div>
                                </div>

                                {/* Attendance Request Limit */}
                                <div className="mb-4">
                                    <NumberInput
                                        isRequired={true}
                                        formikField="attendanceRequestRaiseLimit"
                                        label="Attendance Request Limit"
                                        min={0}
                                    />
                                </div>
                            </Modal.Body>

                            <Modal.Footer style={{ borderTop: "none", paddingTop: "0" }}>
                                <Button
                                    variant="secondary"
                                    onClick={onClose}
                                    disabled={isSubmitting}
                                    style={{
                                        color: "white",
                                        borderRadius: "8px",
                                        padding: "10px 24px",
                                        fontWeight: "500",
                                        fontSize: "14px",
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="primary"
                                    type="submit"
                                    disabled={isSubmitting}
                                    style={{
                                        backgroundColor: "#8B4444",
                                        border: "none",
                                        borderRadius: "8px",
                                        padding: "10px 24px",
                                        fontWeight: "500",
                                        fontSize: "14px",
                                    }}
                                >
                                    {isSubmitting ? "Saving..." : "Save Changes"}
                                </Button>
                            </Modal.Footer>
                        </FormikForm>
                    )}
                </Formik>
            )}
        </Modal>
    );
};

export default AppSettingsModal;
