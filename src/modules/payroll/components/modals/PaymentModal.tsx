import React, { useEffect, useState } from 'react';
import { Modal, Button, Row, Col, Badge, Card } from 'react-bootstrap';
import { Formik, Form as FormikForm, FormikValues } from 'formik';
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
    govtPayments?: any[]; // raw govt payment records { deductionType: 'PT'|'TDS'|'PF', paidAmount: number }
}

const paymentSchema = Yup.object({
    paymentType: Yup.string().required("Payment type is required"),
    paidAt: Yup.date().required("Date is required"),
    paymentMethod: Yup.string().required("Method is required"),
});

// Maps a breakdown key (e.g. "Professional Tax", "Professional Fees") to the
// normalized deductionType enum stored on govtPayments ('PT', 'TDS', 'PF').
const normalizeDeductionKey = (key: string): string => {
    const t = key.toUpperCase();
    if (t.includes('PROVIDENT') || t.includes(' PF') || t === 'PF') return 'PF';
    if (t.includes('PROFESSIONAL TAX') || t === 'PT') return 'PT';
    if (t.includes('PROFESSIONAL FEES') || t.includes('TDS') || t.includes('SOURCE')) return 'TDS';
    return t;
};

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
    statutoryBreakdown = {},
    govtPayments = [],
}) => {
    const salaryInHand = Math.max(0, netPayable);
    const salaryPending = Math.max(0, salaryInHand - salaryPaid);

    const currentDate = new Date();
    const paymentDate = month && year ? new Date(`${month} 1, ${year}`) : null;
    const isCurrentMonth = paymentDate
        ? paymentDate.getFullYear() === currentDate.getFullYear() &&
          paymentDate.getMonth() === currentDate.getMonth()
        : true;

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

    const govtDeductions = Object.entries(statutoryBreakdown || {})
        .map(([key, data]: [string, any]) => ({
            label: key === 'Professional Fees' ? 'Tax Deducted at Source (TDS)' : key,
            value: key,
            amount: Number(data?.earned ?? data?.value ?? (data || 0)),
            isActive: data?.isActive !== false,
        }))
        .filter(d => d.amount > 0); // show any deduction with earned > 0, even if auto-calc is inactive (e.g. TDS added via modify)

    // Sum paid amounts per normalized deduction type from govtPayments
    const paidByNormalizedType: Record<string, number> = (govtPayments || []).reduce((acc: Record<string, number>, p: any) => {
        const type = (p.deductionType ?? '').toUpperCase();
        acc[type] = (acc[type] || 0) + Number(p.paidAmount ?? p.amount ?? 0);
        return acc;
    }, {});

    const isDeductionFullyPaid = (breakdownKey: string, owed: number): boolean => {
        const type = normalizeDeductionKey(breakdownKey);
        return (paidByNormalizedType[type] || 0) >= owed && owed > 0;
    };

    const getPaidForDeduction = (breakdownKey: string): number => {
        const type = normalizeDeductionKey(breakdownKey);
        return paidByNormalizedType[type] || 0;
    };

    const shortDeductionLabel = (label: string): string => {
        const l = label.toLowerCase();
        if (l.includes('tds') || l.includes('source') || l.includes('professional fees')) return 'TDS';
        if (l.includes('professional tax')) return 'Prof. Tax';
        if (l.includes('provident') || l.includes(' pf')) return 'PF';
        return label.length > 14 ? label.slice(0, 13) + '…' : label;
    };

    const hasGovtDeductions = govtDeductions.length > 0;
    const availablePaymentModes = hasGovtDeductions
        ? paymentModes
        : paymentModes.filter(mode => mode.value === 'SALARY');

    useEffect(() => {
        if (!hasGovtDeductions && activeTab !== 'SALARY') {
            setActiveTab('SALARY');
        }
    }, [activeTab, hasGovtDeductions]);

    // Use fixedDeductions prop as the authoritative total; fall back to summing breakdown entries
    const correctedFixedDeductions = fixedDeductions > 0
        ? fixedDeductions
        : Math.max(0, govtDeductions.reduce((sum, item) => sum + item.amount, 0));

    const govtPending = Math.max(0, correctedFixedDeductions - governmentPaid);
    const payableAmount = Math.max(0, salaryInHand - salaryPaid);

    const displayGovType = govtDeductions.length === 1
        ? govtDeductions[0].label
        : 'Government Deductions';

    return (
        <Modal show={show} onHide={onHide} size="xl" centered className="wt-payment-modal shadow-lg overflow-hidden">
            <Modal.Header closeButton className="bg-light border-0 py-5">
                <Modal.Title className="d-flex align-items-center gap-3">
                    <div className="symbol symbol-50px">
                        <div className="symbol-label bg-white shadow-sm">
                            <KTIcon iconName="wallet" className="fs-1 text-primary" />
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
                                    <span className="text-gray-900 fs-3 fw-bolder d-block">{formatINR2(salaryInHand)}</span>
                                    <Badge bg="primary" className="bg-opacity-10 text-primary mt-1">Pending: {formatINR2(salaryPending)}</Badge>
                                </Card.Body>
                            </Card>
                        </Col>
                        {hasGovtDeductions && (
                            <Col md={3}>
                                <Card className="bg-light-danger border-0 shadow-none h-100">
                                    <Card.Body className="p-4 d-flex flex-column">
                                        <div className="d-flex align-items-center gap-2 mb-3">
                                            <div style={{ width: 3, height: 16, borderRadius: 2, backgroundColor: '#f1416c', flexShrink: 0 }} />
                                            <span className="text-gray-500 fs-9 fw-bold text-uppercase" style={{ letterSpacing: '0.06em' }}>Govt. Deductions</span>
                                        </div>

                                        {govtDeductions.length > 1 ? (
                                            <>
                                                <div className="flex-grow-1">
                                                    {govtDeductions.map(d => (
                                                        <div key={d.value} className="d-flex justify-content-between align-items-center mb-2">
                                                            <div className="d-flex align-items-center gap-2">
                                                                <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#f1416c', flexShrink: 0 }} />
                                                                <span className="fs-8 text-gray-700 fw-semibold">{shortDeductionLabel(d.label)}</span>
                                                            </div>
                                                            <span className="fs-8 fw-bolder text-gray-900">{formatINR2(d.amount)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="border-top border-danger border-opacity-25 mt-2 pt-3">
                                                    <div className="d-flex justify-content-between align-items-center">
                                                        <span className="fs-8 fw-semibold text-gray-500">Total</span>
                                                        <span className="fs-5 fw-bolder text-gray-900">{formatINR2(correctedFixedDeductions)}</span>
                                                    </div>
                                                    <Badge bg="danger" className="bg-opacity-10 text-danger mt-2 px-3 rounded-pill">Pending: {formatINR2(govtPending)}</Badge>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <span className="text-gray-900 fs-3 fw-bolder d-block">{formatINR2(correctedFixedDeductions)}</span>
                                                <Badge bg="danger" className="bg-opacity-10 text-danger mt-1">Pending: {formatINR2(govtPending)}</Badge>
                                            </>
                                        )}
                                    </Card.Body>
                                </Card>
                            </Col>
                        )}
                        <Col md={3}>
                            <Card className="bg-light-success border-0 shadow-none h-100">
                                <Card.Body className="p-4">
                                    <span className="text-gray-600 fs-8 fw-bold d-block mb-1 text-uppercase">Salary Paid</span>
                                    <span className="text-success fs-3 fw-bolder d-block">{formatINR2(salaryPaid)}</span>
                                    <Badge bg="success" className="bg-opacity-10 text-success mt-1">Paid to Employee</Badge>
                                </Card.Body>
                            </Card>
                        </Col>
                        {hasGovtDeductions && (
                            <Col md={3}>
                                <Card className="bg-light-info border-0 shadow-none h-100">
                                    <Card.Body className="p-4 d-flex flex-column">
                                        <div className="d-flex align-items-center gap-2 mb-3">
                                            <div style={{ width: 3, height: 16, borderRadius: 2, backgroundColor: '#009ef7', flexShrink: 0 }} />
                                            <span className="text-gray-500 fs-9 fw-bold text-uppercase" style={{ letterSpacing: '0.06em' }}>Govt. Deductions Paid</span>
                                        </div>

                                        {govtDeductions.length > 1 ? (
                                            <>
                                                <div className="flex-grow-1">
                                                    {govtDeductions.map(d => {
                                                        const paidAmt = getPaidForDeduction(d.value);
                                                        const fullyPaid = paidAmt >= d.amount;
                                                        return (
                                                            <div key={d.value} className="d-flex justify-content-between align-items-center mb-2">
                                                                <div className="d-flex align-items-center gap-2">
                                                                    <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: fullyPaid ? '#50cd89' : '#b5b5c3', flexShrink: 0 }} />
                                                                    <span className="fs-8 text-gray-700 fw-semibold">{shortDeductionLabel(d.label)}</span>
                                                                </div>
                                                                <div className="d-flex align-items-center gap-1">
                                                                    <span className={`fs-8 fw-bolder ${fullyPaid ? 'text-success' : 'text-gray-400'}`}>
                                                                        {formatINR2(paidAmt)}
                                                                    </span>
                                                                    {fullyPaid
                                                                        ? <span className="badge badge-light-success rounded-pill px-2 py-1" style={{ fontSize: '9px' }}>✓</span>
                                                                        : <span className="badge badge-light rounded-pill px-2 py-1" style={{ fontSize: '9px', color: '#b5b5c3' }}>—</span>
                                                                    }
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                <div className="border-top border-info border-opacity-25 mt-2 pt-3">
                                                    <div className="d-flex justify-content-between align-items-center">
                                                        <span className="fs-8 fw-semibold text-gray-500">Total Paid</span>
                                                        <span className="fs-5 fw-bolder text-info">{formatINR2(governmentPaid)}</span>
                                                    </div>
                                                    <Badge bg="info" className="bg-opacity-10 text-info mt-2 px-3 rounded-pill">Paid</Badge>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <span className="text-info fs-3 fw-bolder d-block">{formatINR2(governmentPaid)}</span>
                                                <Badge bg="info" className="bg-opacity-10 text-info mt-1">Paid</Badge>
                                            </>
                                        )}
                                    </Card.Body>
                                </Card>
                            </Col>
                        )}
                    </Row>
                </div>

                <Formik
                    initialValues={{
                        ...initialValues,
                        paymentType: activeTab,
                        salaryAmount: Math.round(initialValues.salaryAmount || payableAmount),
                        govAmount: Math.round(initialValues.govAmount || 0),
                        govType: initialValues.govType || (hasGovtDeductions ? govtDeductions[0].value : ''),
                        govChallan: initialValues.govChallan || '',
                        paymentMethod: initialValues.paymentMethod || 'BANK_TRANSFER',
                        paidAt: initialValues.paidAt || new Date().toISOString().split('T')[0],
                        _netSalary: netPayable,
                        _salaryPaid: salaryPaid,
                        sendEmail: isCurrentMonth,
                    }}
                    validationSchema={paymentSchema}
                    onSubmit={onSubmit}
                    enableReinitialize
                >
                    {(formikProps) => {
                        const { values, setFieldValue } = formikProps;
                        
                        return (
                            <FormikForm className="p-8">
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
                                                    options={availablePaymentModes}
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
                                                     activeTab === 'GOVERNMENT' ? `${displayGovType} Settlement` : 
                                                     'Combined Disbursement'}
                                                </h4>
                                            </div>

                                            <div className="p-6">
                                                {/* SECTION: Salary Payment */}
                                                {(activeTab === 'SALARY' || activeTab === 'COMBINED') && (
                                                    <div className="mb-8">
                                                        {activeTab === 'COMBINED' && (
                                                            <div className="d-flex align-items-center mb-4">
                                                                <div className="bullet bullet-vertical bg-primary h-20px me-3"></div>
                                                                <h5 className="fw-bold text-gray-800 m-0">Employee Salary Portion</h5>
                                                            </div>
                                                        )}
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
                                                                    label="Internal Notes"
                                                                    formikField="installmentLabel"
                                                                    isRequired={false}
                                                                    placeholder="Add notes here..."
                                                                />
                                                            </Col>
                                                        </Row>
                                                    </div>
                                                )}

                                                {/* SECTION: Government Payment */}
                                                {hasGovtDeductions && (activeTab === 'GOVERNMENT' || activeTab === 'COMBINED') && (
                                                    <div>
                                                        {activeTab === 'COMBINED' && (
                                                            <div className="d-flex align-items-center mb-6">
                                                                <div className="bullet bullet-vertical bg-danger h-20px me-3"></div>
                                                                <h5 className="fw-bold text-gray-800 m-0">{displayGovType} Settlement</h5>
                                                            </div>
                                                        )}
                                                        <Row className="g-5">
                                                            <Col md={4}>
                                                                <FormikDropdownInput
                                                                    inputLabel="Deduction Type"
                                                                    formikField="govType"
                                                                    options={govtDeductions.map(d => {
                                                                        const paid = isDeductionFullyPaid(d.value, d.amount);
                                                                        return {
                                                                            label: paid
                                                                                ? `${d.label} (₹${Math.round(d.amount).toLocaleString('en-IN')}) — ✓ Paid`
                                                                                : `${d.label} (₹${Math.round(d.amount).toLocaleString('en-IN')})`,
                                                                            value: d.value,
                                                                            color: paid ? '#22c55e' : '#FFB700',
                                                                            isDisabled: paid,
                                                                        };
                                                                    })}
                                                                    isRequired={activeTab === 'GOVERNMENT'}
                                                                    onChange={(option: any) => {
                                                                        const selected = govtDeductions.find(d => d.value === option.value);
                                                                        setFieldValue('govType', option.value);
                                                                        if (selected) {
                                                                            setFieldValue('govAmount', Math.round(selected.amount));
                                                                        } else {
                                                                            setFieldValue('govAmount', 0);
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
                                                                    {values.govType && `Total pending govt: ${formatINR2(govtPending)}`}
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
                                                                        Government & statutory deduction payments update the ledger and master status.
                                                                        Ensure the Challan / Reference # is recorded for audit purposes.
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

                                <div className="d-flex justify-content-between align-items-center mt-10 gap-3 border-top pt-8">
                                    <div className="form-check form-switch d-flex align-items-center gap-2 m-0">
                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            role="switch"
                                            id="sendEmailToggle"
                                            checked={values.sendEmail !== false}
                                            onChange={(e) => setFieldValue('sendEmail', e.target.checked)}
                                            disabled={!isCurrentMonth}
                                            style={{ width: '2.5rem', height: '1.25rem', cursor: isCurrentMonth ? 'pointer' : 'not-allowed' }}
                                        />
                                        <label className="form-check-label fw-semibold text-gray-700 fs-7" htmlFor="sendEmailToggle">
                                            <KTIcon iconName="sms" className="fs-5 me-1 text-primary" />
                                            Send Email Notification
                                            {!isCurrentMonth && (
                                                <span className="text-muted fs-8 ms-1">(current month only)</span>
                                            )}
                                        </label>
                                    </div>
                                    <div className="d-flex gap-3">
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
