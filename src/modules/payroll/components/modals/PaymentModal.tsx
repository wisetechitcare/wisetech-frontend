import React, { useState, useEffect } from 'react';
import { Modal, Button, Row, Col, Badge, Form, Card } from 'react-bootstrap';
import { Formik, Form as FormikForm, FormikValues, Field } from 'formik';
import * as Yup from 'yup';
import TextInput from '@app/modules/common/inputs/TextInput';
import DateInput from '@app/modules/common/inputs/DateInput';
import FormikDropdownInput from '@app/modules/common/inputs/FormikDropdownInput';
import { KTIcon } from '@metronic/helpers';
import { formatINR2 } from '../../utils/payrollFormatters';

interface PaymentModalProps {
    show: boolean;
    onHide: () => void;
    loading: boolean;
    initialValues: any;
    editMode: boolean;
    onSubmit: (values: any, actions: FormikValues) => void;
    employeeName?: string;
    month?: string;
    year?: string;
    netPayable?: number;
    salaryPaid?: number;
    governmentPaid?: number;
    grossSalary?: number;
    variableDeductions?: number;
    fixedDeductions?: number;
    statutoryBreakdown?: any; // { PF: 100, PT: 200, ... }
}

const paymentSchema = Yup.object({
    paymentType: Yup.string().required("Payment type is required"),
    paidAt: Yup.date().required("Date is required"),
    paymentMethod: Yup.string().required("Method is required"),
});

const PaymentModal: React.FC<PaymentModalProps> = ({
    show,
    onHide,
    loading,
    initialValues,
    editMode,
    onSubmit,
    employeeName,
    month,
    year,
    netPayable = 0,
    salaryPaid = 0,
    governmentPaid = 0,
    grossSalary = 0,
    variableDeductions = 0,
    fixedDeductions = 0,
    statutoryBreakdown = {}
}) => {
    const salaryPending = Math.max(0, netPayable - salaryPaid);
    const govtPending = Math.max(0, fixedDeductions - governmentPaid);

    const [activeTab, setActiveTab] = useState('SALARY');

    const paymentModes = [
        { label: 'Salary Payment', value: 'SALARY' },
        { label: 'Government Fee Payment', value: 'GOVERNMENT' },
        { label: 'Combined Payment', value: 'COMBINED' },
    ];

    const paymentMethods = [
        { label: 'Bank Transfer', value: 'BANK_TRANSFER' },
        { label: 'Cash', value: 'CASH' },
        { label: 'Cheque', value: 'CHEQUE' },
        { label: 'UPI / Online', value: 'UPI' }
    ];

    const govtDeductions = Object.entries(statutoryBreakdown || {}).map(([key, data]: [string, any]) => ({
        label: key,
        value: key,
        amount: Number(data?.earned || 0)
    })).filter(d => d.amount > 0);

    const activeGovType = govtDeductions.length > 0 ? govtDeductions[0].label : 'Statutory';

    return (
        <Modal show={show} onHide={onHide} size="xl" centered className="wt-payment-modal shadow-lg overflow-hidden">
            <Modal.Header closeButton className="bg-light border-0 py-5">
                <Modal.Title className="d-flex align-items-center gap-3">
                    <div className="symbol symbol-50px">
                        <div className={`symbol-label bg-white shadow-sm`}>
                            <KTIcon iconName="wallet" className={`fs-1 text-primary`} />
                        </div>
                    </div>
                    <div>
                        <span className="fw-bolder fs-2 text-gray-900">{editMode ? 'Edit Transaction' : 'Record Payroll Payout'}</span>
                        <div className="text-muted fs-7 fw-bold">{employeeName} • {month} {year}</div>
                    </div>
                </Modal.Title>
            </Modal.Header>
            
            <Modal.Body className="p-0 bg-light">
                {/* Enterprise Summary Header */}
                <div className="px-8 py-6 bg-white border-bottom">
                    <Row className="g-5">
                        <Col md={3}>
                            <Card className="bg-light-primary border-0 shadow-none h-100">
                                <Card.Body className="p-4">
                                    <span className="text-gray-600 fs-8 fw-bold d-block mb-1 text-uppercase">Salary In Hand</span>
                                    <span className="text-gray-900 fs-3 fw-bolder d-block">{formatINR2(netPayable)}</span>
                                    <Badge bg="primary" className="bg-opacity-10 text-primary mt-1">Pending: {formatINR2(salaryPending)}</Badge>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={3}>
                            <Card className="bg-light-danger border-0 shadow-none h-100">
                                <Card.Body className="p-4">
                                    <span className="text-gray-600 fs-8 fw-bold d-block mb-1 text-uppercase">{activeGovType} Payable</span>
                                    <span className="text-gray-900 fs-3 fw-bolder d-block">{formatINR2(fixedDeductions)}</span>
                                    <Badge bg="danger" className="bg-opacity-10 text-danger mt-1">Pending: {formatINR2(govtPending)}</Badge>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={3}>
                            <Card className="bg-light-success border-0 shadow-none h-100">
                                <Card.Body className="p-4">
                                    <span className="text-gray-600 fs-8 fw-bold d-block mb-1 text-uppercase">Salary Paid</span>
                                    <span className="text-success fs-3 fw-bolder d-block">{formatINR2(salaryPaid)}</span>
                                    <Badge bg="success" className="bg-opacity-10 text-success mt-1">Paid to Employee</Badge>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={3}>
                            <Card className="bg-light-info border-0 shadow-none h-100">
                                <Card.Body className="p-4">
                                    <span className="text-gray-600 fs-8 fw-bold d-block mb-1 text-uppercase">{activeGovType} Paid</span>
                                    <span className="text-info fs-3 fw-bolder d-block">{formatINR2(governmentPaid)}</span>
                                    <Badge bg="info" className="bg-opacity-10 text-info mt-1">Paid to Govt</Badge>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                </div>

                <Formik
                    initialValues={{
                        ...initialValues,
                        paymentType: activeTab,
                        salaryAmount: initialValues.salaryAmount || salaryPending,
                        govAmount: initialValues.govAmount || 0,
                        govType: initialValues.govType || (govtDeductions.length > 0 ? govtDeductions[0].value : 'TDS'),
                        govChallan: initialValues.govChallan || '',
                        paymentMethod: 'BANK_TRANSFER',
                        paidAt: new Date().toISOString().split('T')[0]
                    }}
                    validationSchema={paymentSchema}
                    onSubmit={onSubmit}
                    enableReinitialize
                >
                    {(formikProps) => {
                        const { values, setFieldValue } = formikProps;
                        
                        return (
                            <FormikForm className="p-8" placeholder="">
                                <Row className="g-8">
                                    {/* Left Column: Transaction Metadata */}
                                    <Col lg={4}>
                                        <div className="bg-white rounded-3 p-6 shadow-sm border h-100">
                                            <h4 className="fw-bolder text-gray-800 mb-6 d-flex align-items-center">
                                                <KTIcon iconName="setting-2" className="fs-2 text-primary me-2" />
                                                Payout Configuration
                                            </h4>

                                            <div className="mb-6">
                                                <FormikDropdownInput
                                                    inputLabel="Payment Category"
                                                    formikField="paymentType"
                                                    options={paymentModes}
                                                    isRequired={true}
                                                    onChange={(option: any) => {
                                                        const value = option?.value || '';
                                                        setActiveTab(value);
                                                        setFieldValue('paymentType', value);
                                                    }}
                                                />
                                            </div>

                                            <div className="mb-6">
                                                <DateInput
                                                    inputLabel="Value Date"
                                                    isRequired={true}
                                                    formikProps={formikProps}
                                                    formikField="paidAt"
                                                    placeHolder="DD/MM/YYYY"
                                                />
                                            </div>

                                            <div className="mb-6">
                                                <FormikDropdownInput
                                                    inputLabel="Disbursement Mode"
                                                    formikField="paymentMethod"
                                                    options={paymentMethods}
                                                    isRequired={true}
                                                />
                                            </div>

                                            <div className="mb-6">
                                                <TextInput
                                                    label="Transaction Ref / ID"
                                                    formikField="transactionId"
                                                    placeholder="UTR / Cheque #"
                                                    isRequired={false}
                                                />
                                            </div>

                                                <TextInput
                                                    label="Internal Notes"
                                                    formikField="remarks"
                                                    isRequired={false}
                                                    placeholder="Note for audit..."
                                                />
                                        </div>
                                    </Col>

                                    {/* Right Column: Dynamic Payment Content */}
                                    <Col lg={8}>
                                        <div className="bg-white rounded-3 p-0 shadow-sm border h-100 overflow-hidden">
                                            <div className="px-6 py-4 bg-light border-bottom d-flex justify-content-between align-items-center">
                                                <h4 className="fw-bolder text-gray-800 mb-0">
                                                    {activeTab === 'SALARY' ? 'Salary Installment' : 
                                                     activeTab === 'GOVERNMENT' ? 'Statutory Fee Settlement' : 
                                                     'Combined Disbursement'}
                                                </h4>
                                                <Badge bg="primary" className="fw-bold">Step 2 of 2</Badge>
                                            </div>

                                            <div className="p-6">
                                                {/* SECTION: Salary Payment */}
                                                {(activeTab === 'SALARY' || activeTab === 'COMBINED') && (
                                                    <div className="mb-8">
                                                        <div className="d-flex align-items-center mb-4">
                                                            <div className="bullet bullet-vertical bg-primary h-20px me-3"></div>
                                                            <h5 className="fw-bold text-gray-800 m-0">Employee Salary Portion</h5>
                                                        </div>
                                                        <Row className="g-5">
                                                            <Col md={6}>
                                                                <TextInput
                                                                    label="Amount to Transfer"
                                                                    formikField="salaryAmount"
                                                                    type="number"
                                                                    isRequired={activeTab === 'SALARY'}
                                                                />
                                                                <div className="text-muted fs-8 mt-1">Remaining: {formatINR2(salaryPending)}</div>
                                                            </Col>
                                                            <Col md={6}>
                                                                <TextInput
                                                                    label="Installment Label"
                                                                    formikField="installmentLabel"
                                                                    isRequired={false}
                                                                    placeholder="e.g. Installment #1"
                                                                />
                                                            </Col>
                                                        </Row>
                                                    </div>
                                                )}

                                                {/* SECTION: Government Payment */}
                                                {(activeTab === 'GOVERNMENT' || activeTab === 'COMBINED') && (
                                                    <div>
                                                        <div className="d-flex align-items-center mb-6">
                                                            <div className="bullet bullet-vertical bg-danger h-20px me-3"></div>
                                                            <h5 className="fw-bold text-gray-800 m-0">Statutory Fee Settlement (TDS / PF / PT)</h5>
                                                        </div>
                                                        
                                                        <Row className="g-5">
                                                            <Col md={4}>
                                                                <FormikDropdownInput
                                                                    inputLabel="Deduction Type"
                                                                    formikField="govType"
                                                                    options={govtDeductions}
                                                                    isRequired={activeTab === 'GOVERNMENT'}
                                                                    onChange={(option: any) => {
                                                                        const selected = govtDeductions.find(d => d.value === option.value);
                                                                        if (selected) {
                                                                            setFieldValue('govAmount', selected.amount);
                                                                        }
                                                                    }}
                                                                />
                                                            </Col>
                                                            <Col md={4}>
                                                                <TextInput
                                                                    label="Amount to Transfer"
                                                                    formikField="govAmount"
                                                                    type="number"
                                                                    isRequired={activeTab === 'GOVERNMENT'}
                                                                />
                                                                <div className="text-muted fs-8 mt-1">
                                                                    {values.govType && `Pending for ${values.govType}: ${formatINR2(govtDeductions.find(d => d.value === values.govType)?.amount || 0)}`}
                                                                </div>
                                                            </Col>
                                                            <Col md={4}>
                                                                <TextInput
                                                                    label="Challan / Ref #"
                                                                    formikField="govChallan"
                                                                    placeholder="Enter Challan #"
                                                                    isRequired={false}
                                                                />
                                                            </Col>
                                                        </Row>
                                                        
                                                        <div className="mt-6 p-5 bg-light-danger rounded border border-danger border-dashed">
                                                            <div className="d-flex flex-stack">
                                                                <div className="d-flex align-items-center">
                                                                    <KTIcon iconName="information-5" className="fs-1 text-danger me-4" />
                                                                    <div className="text-gray-700 fw-bold fs-7">
                                                                        Government payments will update the statutory ledger and master status. 
                                                                        Ensure the Challan # is recorded for audit purposes.
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </Col>
                                </Row>

                                <div className="d-flex justify-content-end mt-10 gap-3 border-top pt-8">
                                    <Button variant="light" onClick={onHide} className="fw-bold px-8 py-3">
                                        Cancel
                                    </Button>
                                    <Button 
                                        type="submit" 
                                        variant="primary" 
                                        disabled={loading || !formikProps.isValid}
                                        className="wt-btn-primary fw-bold px-12 py-3 shadow-sm"
                                    >
                                        {loading ? (
                                            <span className="indicator-label">
                                                Processing... <span className="spinner-border spinner-border-sm align-middle ms-2"></span>
                                            </span>
                                        ) : (
                                            <>
                                                <KTIcon iconName="check-circle" className="fs-2 me-1" />
                                                Authorize Disbursement
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </FormikForm>
                        );
                    }}
                </Formik>
            </Modal.Body>
        </Modal>
    );
};

export default PaymentModal;
