import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import { Formik, Form, FormikValues } from 'formik';
import * as Yup from 'yup';
import TextInput from '@app/modules/common/inputs/TextInput';
import DateInput from '@app/modules/common/inputs/DateInput';

interface PaymentModalProps {
    show: boolean;
    onHide: () => void;
    loading: boolean;
    initialValues: any;
    editMode: boolean;
    onSubmit: (values: any, actions: FormikValues) => void;
}

const paymentSchema = Yup.object({
    amountPaid: Yup.number().typeError("Payment must be a valid number!").required().label('Payment'),
    paidAt: Yup.date().required().label('Paid At')
});

const PaymentModal: React.FC<PaymentModalProps> = ({
    show,
    onHide,
    loading,
    initialValues,
    editMode,
    onSubmit
}) => {
    return (
        <Modal show={show} onHide={onHide} className="wt-payment-modal">
            <Modal.Header closeButton>
                <Modal.Title>{editMode ? 'Edit Payment' : 'Add Payment'}</Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-4">
                <Formik
                    initialValues={initialValues}
                    validationSchema={paymentSchema}
                    onSubmit={onSubmit}
                    enableReinitialize
                >
                    {(formikProps) => (
                        <Form placeholder={undefined}>
                            <div className="mb-4">
                                <TextInput
                                    label="Amount Paid"
                                    formikField="amountPaid"
                                    type="number"
                                    placeholder="Enter amount"
                                    isRequired={true}
                                />
                            </div>
                            <div className="mb-4">
                                <DateInput
                                    inputLabel="Payment Date"
                                    isRequired={true}
                                    formikProps={formikProps}
                                    formikField="paidAt"
                                    placeHolder="Select date"
                                />
                            </div>
                            <div className="d-flex justify-content-end mt-5 gap-3">
                                <Button variant="light" onClick={onHide} >Cancel</Button>
                                <Button 
                                    type="submit" 
                                    variant="primary" 
                                    disabled={loading || !formikProps.isValid}
                                    className="wt-btn-primary"
                                    
                                >
                                    {loading ? 'Processing...' : (editMode ? 'Update Payment' : 'Create Payment')}
                                </Button>
                            </div>
                        </Form>
                    )}
                </Formik>
            </Modal.Body>
        </Modal>
    );
};

export default PaymentModal;
