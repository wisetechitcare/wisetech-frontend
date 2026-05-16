import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import { Formik, Form, FormikValues } from 'formik';
import TextInput from '@app/modules/common/inputs/TextInput';
import { KTIcon } from '@metronic/helpers';
import { GrossDistributionData, DynamicField } from '../../types/payroll.types';

interface GrossDistributionModalProps {
    show: boolean;
    onHide: () => void;
    loading: boolean;
    initialValues: any;
    validationSchema: any;
    grossDistributionData: GrossDistributionData;
    dynamicFields: DynamicField[];
    deletedFields: string[];
    onAddComment: () => void; // This was addNewField in original
    onRemoveField: (id: string, isNew: boolean) => void;
    onUpdateFieldName: (id: string, name: string, isNew: boolean) => void;
    onSubmit: (values: any, actions: FormikValues) => void;
}

const GrossDistributionModal: React.FC<GrossDistributionModalProps> = ({
    show,
    onHide,
    loading,
    initialValues,
    validationSchema,
    grossDistributionData,
    dynamicFields,
    deletedFields,
    onAddComment,
    onRemoveField,
    onUpdateFieldName,
    onSubmit
}) => {
    return (
        <Modal show={show} onHide={onHide} size="lg" className="wt-payment-modal">
            <Modal.Header closeButton>
                <Modal.Title>Modify Gross Distribution</Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-4">
                <Formik
                    initialValues={initialValues}
                    validationSchema={validationSchema}
                    onSubmit={onSubmit}
                    enableReinitialize
                >
                    {(formikProps) => (
                        <Form placeholder={undefined}>
                            <div className="mb-4 d-flex justify-content-between align-items-center">
                                <h6 className="fw-bold mb-0">Earnings Components</h6>
                                <Button 
                                    variant="outline-primary" 
                                    size="sm" 
                                    onClick={onAddComment}
                                    className="d-flex align-items-center"
                                    
                                >
                                    <KTIcon iconName="plus" className="fs-4 me-1" />
                                    Add Other Component
                                </Button>
                            </div>

                            <div className="row g-4">
                                {/* Existing Fields */}
                                {Object.entries(grossDistributionData)
                                    .filter(([key]) => !deletedFields.includes(key))
                                    .map(([key, field]) => (
                                        <div className="col-md-6" key={key}>
                                            <div className="d-flex align-items-end gap-2">
                                                <div className="flex-grow-1">
                                                    <TextInput
                                                        label={field.name}
                                                        formikField={key}
                                                        type="number"
                                                        placeholder={`Enter ${field.name}`}
                                                        isRequired={true}
                                                    />
                                                </div>
                                                {field.name?.toLowerCase() !== 'basic salary' && (
                                                    <Button 
                                                        variant="light-danger" 
                                                        className="btn-icon mb-1"
                                                        onClick={() => onRemoveField(key, false)}
                                                        
                                                    >
                                                        <KTIcon iconName="trash" className="fs-3" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                {/* Dynamic New Fields */}
                                {dynamicFields.map((field) => (
                                    <div className="col-md-6" key={field.id}>
                                        <div className="d-flex align-items-end gap-2">
                                            <div className="flex-grow-1">
                                                <div className="mb-2">
                                                    <input
                                                        type="text"
                                                        className="form-control form-control-sm border-0 border-bottom bg-transparent fw-bold"
                                                        value={field.name}
                                                        onChange={(e) => onUpdateFieldName(field.id, e.target.value, true)}
                                                        placeholder="Enter Description"
                                                        style={{ fontSize: '0.9rem', padding: '0 0 5px 0' }}
                                                    />
                                                </div>
                                                <TextInput
                                                    label=""
                                                    formikField={field.id}
                                                    type="number"
                                                    placeholder="0.00"
                                                    isRequired={true}
                                                />
                                            </div>
                                            <Button 
                                                variant="light-danger" 
                                                className="btn-icon mb-1"
                                                onClick={() => onRemoveField(field.id, true)}
                                                
                                            >
                                                <KTIcon iconName="trash" className="fs-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="d-flex justify-content-end mt-5 gap-3">
                                <Button variant="light" onClick={onHide} >Cancel</Button>
                                <Button 
                                    type="submit" 
                                    variant="primary" 
                                    disabled={loading || !formikProps.isValid}
                                    className="wt-btn-primary"
                                    
                                >
                                    {loading ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </div>
                        </Form>
                    )}
                </Formik>
            </Modal.Body>
        </Modal>
    );
};

export default GrossDistributionModal;
