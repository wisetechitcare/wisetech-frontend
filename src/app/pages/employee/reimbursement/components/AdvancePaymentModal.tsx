import React from 'react';
import { Modal, Button, Row, Col } from 'react-bootstrap';
import { Formik, Form as FormikForm, FormikValues } from 'formik';
import * as Yup from 'yup';
import TextInput from '@app/modules/common/inputs/TextInput';
import DateInput from '@app/modules/common/inputs/DateInput';
import FormikDropdownInput from '@app/modules/common/inputs/FormikDropdownInput';
import { KTIcon } from '@metronic/helpers';
import { IReimbursementPayment } from '@models/employee';

interface AdvancePaymentModalProps {
    show: boolean;
    onHide: () => void;
    loading: boolean;
    employeeName?: string;
    onSubmit: (values: any, actions: FormikValues) => void;
    editPayment?: IReimbursementPayment | null;
}

const advancePaymentSchema = Yup.object({
    paidAt: Yup.date().required('Date is required'),
    paymentMethod: Yup.string().required('Method is required'),
    amountPaid: Yup.number().required('Amount is required').min(1, 'Amount must be greater than 0'),
});

const paymentMethods = [
    { label: 'Bank Transfer', value: 'BANK_TRANSFER' },
    { label: 'Cash', value: 'CASH' },
    { label: 'Cheque', value: 'CHEQUE' },
    { label: 'UPI / Online', value: 'UPI' },
];

const AdvancePaymentModal: React.FC<AdvancePaymentModalProps> = ({
    show,
    onHide,
    loading,
    employeeName,
    onSubmit,
    editPayment,
}) => {
    const isEditMode = !!editPayment;

    const initialValues = isEditMode
        ? {
              paidAt: editPayment!.paymentDate
                  ? new Date(editPayment!.paymentDate).toISOString().split('T')[0]
                  : new Date().toISOString().split('T')[0],
              paymentMethod: editPayment!.paymentMethod ?? 'CASH',
              amountPaid: Number(editPayment!.amountPaid),
              remarks: editPayment!.remarks ?? '',
          }
        : {
              paidAt: new Date().toISOString().split('T')[0],
              paymentMethod: 'CASH',
              amountPaid: '' as any,
              remarks: '',
          };

    return (
        <Modal show={show} onHide={onHide} size="lg" centered className="wt-payment-modal shadow-lg overflow-hidden">
            <Modal.Header closeButton className="bg-light border-0 py-5">
                <Modal.Title className="d-flex align-items-center gap-3">
                    <div className="symbol symbol-50px">
                        <div className="symbol-label bg-white shadow-sm">
                            <KTIcon iconName="wallet" className="fs-1 text-warning" />
                        </div>
                    </div>
                    <div>
                        <span className="fw-bolder fs-2 text-gray-900">
                            {isEditMode ? 'Edit Advance Payment' : 'Record Advance Payment'}
                        </span>
                        {employeeName && (
                            <div className="text-muted fs-7 fw-bold">{employeeName}</div>
                        )}
                    </div>
                </Modal.Title>
            </Modal.Header>

            <Modal.Body className="p-0 bg-light">
                <Formik
                    initialValues={initialValues}
                    validationSchema={advancePaymentSchema}
                    onSubmit={onSubmit}
                    enableReinitialize
                >
                    {(formikProps) => (
                        <FormikForm className="p-8">
                            <div className="bg-white rounded-3 p-6 shadow-sm border">
                                <h4 className="fw-bolder text-gray-800 mb-6 d-flex align-items-center">
                                    <KTIcon iconName="setting-2" className="fs-2 text-warning me-2" />
                                    Payout Configuration
                                </h4>
                                <Row className="g-6">
                                    <Col md={6}>
                                        <DateInput
                                            inputLabel="Value Date"
                                            isRequired={true}
                                            formikProps={formikProps}
                                            formikField="paidAt"
                                            placeHolder="DD/MM/YYYY"
                                        />
                                    </Col>
                                    <Col md={6}>
                                        <FormikDropdownInput
                                            inputLabel="Disbursement Mode"
                                            formikField="paymentMethod"
                                            options={paymentMethods}
                                            isRequired={true}
                                        />
                                    </Col>
                                    <Col md={6}>
                                        <TextInput
                                            label="Amount"
                                            formikField="amountPaid"
                                            type="number"
                                            isRequired={true}
                                            placeholder="Enter advance amount"
                                        />
                                    </Col>
                                    <Col md={6}>
                                        <TextInput
                                            label="Internal Note"
                                            formikField="remarks"
                                            isRequired={false}
                                            placeholder="Add notes here..."
                                        />
                                    </Col>
                                </Row>
                            </div>

                            <div className="d-flex justify-content-end align-items-center mt-8 gap-3 border-top pt-8">
                                <Button variant="light" onClick={onHide} className="fw-bold px-8 py-3">
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={loading || !formikProps.isValid}
                                    className="fw-bold px-12 py-3 shadow-sm"
                                    style={{ backgroundColor: '#1E3A8A', borderColor: '#1E3A8A', color: '#fff' }}
                                >
                                    {loading ? (
                                        <span className="indicator-label">
                                            Processing...{' '}
                                            <span className="spinner-border spinner-border-sm align-middle ms-2" />
                                        </span>
                                    ) : (
                                        <>
                                            <KTIcon iconName="check-circle" className="fs-2 me-1" />
                                            {isEditMode ? 'Save Changes' : 'Authorize Disbursement'}
                                        </>
                                    )}
                                </Button>
                            </div>
                        </FormikForm>
                    )}
                </Formik>
            </Modal.Body>
        </Modal>
    );
};

export default AdvancePaymentModal;
