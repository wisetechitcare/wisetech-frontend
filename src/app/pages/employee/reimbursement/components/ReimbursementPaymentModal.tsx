import React from 'react';
import { Modal, Button, Row, Col, Badge, Card } from 'react-bootstrap';
import { Formik, Form as FormikForm, FormikValues } from 'formik';
import * as Yup from 'yup';
import TextInput from '@app/modules/common/inputs/TextInput';
import DateInput from '@app/modules/common/inputs/DateInput';
import FormikDropdownInput from '@app/modules/common/inputs/FormikDropdownInput';
import { KTIcon } from '@metronic/helpers';
import { IReimbursementPayment, IReimbursementsFetch } from '@models/employee';
import { useReimbursementLookups } from '@hooks/useReimbursementLookups';

interface ReimbursementPaymentModalProps {
    show: boolean;
    onHide: () => void;
    loading: boolean;
    employeeName?: string;
    unpaidReimbursements: IReimbursementsFetch[];
    onSubmit: (values: any, actions: FormikValues) => void;
    /** When provided the modal opens in edit mode with prefilled data */
    editPayment?: IReimbursementPayment | null;
}

const buildPaymentSchema = (isEditMode: boolean) =>
    Yup.object({
        paidAt: Yup.date().required('Date is required'),
        paymentMethod: Yup.string().required('Method is required'),
        amountPaid: Yup.number().required('Amount is required').min(1, 'Amount must be greater than 0'),
        ...(isEditMode
            ? {}
            : { selectedReimbursementIds: Yup.array().min(1, 'Select at least one reimbursement') }),
    });

const paymentMethods = [
    { label: 'Bank Transfer', value: 'BANK_TRANSFER' },
    { label: 'Cash', value: 'CASH' },
    { label: 'Cheque', value: 'CHEQUE' },
    { label: 'UPI / Online', value: 'UPI' },
];

const formatINR = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

const ReimbursementPaymentModal: React.FC<ReimbursementPaymentModalProps> = ({
    show,
    onHide,
    loading,
    employeeName,
    unpaidReimbursements,
    onSubmit,
    editPayment,
}) => {
    const isEditMode = !!editPayment;

    const { resolveClientType, resolveClientCompany, resolveProject } =
        useReimbursementLookups(unpaidReimbursements);

    const allIds = unpaidReimbursements.map((r) => r.id as string).filter(Boolean);

    const totalRequests = isEditMode ? editPayment!.totalRequests : unpaidReimbursements.length;
    const totalAmount = isEditMode
        ? Number(editPayment!.totalAmount)
        : unpaidReimbursements.reduce((sum, r) => sum + parseFloat(String(r.amount ?? '0')), 0);

    const initialValues = isEditMode
        ? {
              paidAt: editPayment!.paymentDate
                  ? new Date(editPayment!.paymentDate).toISOString().split('T')[0]
                  : new Date().toISOString().split('T')[0],
              paymentMethod: editPayment!.paymentMethod ?? 'BANK_TRANSFER',
              amountPaid: Number(editPayment!.amountPaid),
              transactionId: editPayment!.transactionId ?? '',
              installmentLabel: '',
              remarks: editPayment!.remarks ?? '',
              selectedReimbursementIds: allIds,
          }
        : {
              paidAt: new Date().toISOString().split('T')[0],
              paymentMethod: 'CASH',
              amountPaid: Math.round(totalAmount),
              transactionId: '',
              installmentLabel: '',
              remarks: '',
              selectedReimbursementIds: allIds,
          };

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
                        <span className="fw-bolder fs-2 text-gray-900">
                            {isEditMode ? 'Edit Reimbursement Payout' : 'Record Reimbursement Payout'}
                        </span>
                        {employeeName && (
                            <div className="text-muted fs-7 fw-bold">{employeeName}</div>
                        )}
                    </div>
                </Modal.Title>
            </Modal.Header>

            <Modal.Body className="p-0 bg-light">
                {!isEditMode && totalRequests === 0 ? (
                    <div className="p-10 text-center">
                        <KTIcon iconName="information-5" className="fs-3x text-muted mb-3" />
                        <p className="text-gray-500 fw-bold fs-6">
                            No approved unpaid reimbursements found for this employee.
                        </p>
                    </div>
                ) : (
                    <Formik
                        initialValues={initialValues}
                        validationSchema={buildPaymentSchema(isEditMode)}
                        onSubmit={onSubmit}
                        enableReinitialize
                    >
                        {(formikProps) => {
                            const { values, setFieldValue } = formikProps;
                            const selectedIds: string[] = values.selectedReimbursementIds ?? allIds;

                            const selectedAmount = unpaidReimbursements
                                .filter((r) => r.id && selectedIds.includes(r.id))
                                .reduce((sum, r) => sum + parseFloat(String(r.amount ?? '0')), 0);

                            const paid = Number(values.amountPaid) || 0;
                            const rem = isEditMode ? totalAmount - paid : selectedAmount - paid;
                            const selectedCount = selectedIds.length;
                            const isAllSelected = selectedCount === unpaidReimbursements.length && unpaidReimbursements.length > 0;
                            const isNoneSelected = selectedCount === 0;

                            const toggleId = (id: string) => {
                                const next = selectedIds.includes(id)
                                    ? selectedIds.filter((x) => x !== id)
                                    : [...selectedIds, id];
                                setFieldValue('selectedReimbursementIds', next);
                                const nextAmount = unpaidReimbursements
                                    .filter((r) => r.id && next.includes(r.id))
                                    .reduce((sum, r) => sum + parseFloat(String(r.amount ?? '0')), 0);
                                setFieldValue('amountPaid', Math.round(nextAmount));
                            };

                            const toggleAll = () => {
                                const next = isAllSelected ? [] : allIds;
                                setFieldValue('selectedReimbursementIds', next);
                                const nextAmount = isAllSelected ? 0 : Math.round(totalAmount);
                                setFieldValue('amountPaid', nextAmount);
                            };

                            return (
                                <>
                                {/* Summary Cards */}
                                <div className="px-8 py-6 bg-white border-bottom">
                                    <Row className="g-5">
                                        <Col md={4}>
                                            <Card className="bg-light-primary border-0 shadow-none h-100">
                                                <Card.Body className="p-4">
                                                    <span className="text-gray-600 fs-8 fw-bold d-block mb-1 text-uppercase">
                                                        Total Requests
                                                    </span>
                                                    <span className="text-gray-900 fs-3 fw-bolder d-block">
                                                        {totalRequests}
                                                    </span>
                                                    <Badge bg="primary" className="bg-opacity-10 text-primary mt-1">
                                                        {isEditMode ? 'Payment Record' : 'Approved & Unpaid'}
                                                    </Badge>
                                                </Card.Body>
                                            </Card>
                                        </Col>
                                        <Col md={4}>
                                            <Card className="bg-light-success border-0 shadow-none h-100">
                                                <Card.Body className="p-4">
                                                    <span className="text-gray-600 fs-8 fw-bold d-block mb-1 text-uppercase">
                                                        Total Requested Amount
                                                    </span>
                                                    <span className="text-success fs-3 fw-bolder d-block">
                                                        {formatINR(totalAmount)}
                                                    </span>
                                                    <Badge bg="success" className="bg-opacity-10 text-success mt-1">
                                                        {isEditMode ? 'Net Payable' : 'Pending Payment'}
                                                    </Badge>
                                                </Card.Body>
                                            </Card>
                                        </Col>
                                        <Col md={4}>
                                            <Card className={`border-0 shadow-none h-100 ${rem > 0 ? 'bg-light-warning' : 'bg-light-danger'}`}>
                                                <Card.Body className="p-4">
                                                    <span className="text-gray-600 fs-8 fw-bold d-block mb-1 text-uppercase">
                                                        Remaining Amount
                                                    </span>
                                                    <span className={`fs-3 fw-bolder d-block ${rem > 0 ? 'text-warning' : 'text-danger'}`}>
                                                        {formatINR(Math.max(0, rem))}
                                                    </span>
                                                    <Badge bg={rem > 0 ? 'warning' : 'danger'} className="bg-opacity-10 mt-1" style={{ color: rem > 0 ? '#f6c000' : '#f1416c' }}>
                                                        {rem > 0 ? 'Pending' : 'Fully Paid'}
                                                    </Badge>
                                                </Card.Body>
                                            </Card>
                                        </Col>
                                    </Row>
                                </div>
                                <FormikForm className="p-8">
                                    <Row className="g-8">
                                        {/* Left – Payout Configuration */}
                                        <Col lg={4}>
                                            <div className="bg-white rounded-3 p-6 shadow-sm border h-100">
                                                <h4 className="fw-bolder text-gray-800 mb-6 d-flex align-items-center">
                                                    <KTIcon iconName="setting-2" className="fs-2 text-primary me-2" />
                                                    Payout Configuration
                                                </h4>

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

                                                {/* <TextInput
                                                    label="Internal Notes"
                                                    formikField="remarks"
                                                    isRequired={false}
                                                    placeholder="Note for audit..."
                                                /> */}
                                            </div>
                                        </Col>

                                        {/* Right – Reimbursement Installment */}
                                        <Col lg={8}>
                                            <div className="bg-white rounded-3 p-0 shadow-sm border h-100 overflow-hidden">
                                                <div className="px-6 py-4 bg-light border-bottom d-flex justify-content-between align-items-center">
                                                    <h4 className="fw-bolder text-gray-800 mb-0">
                                                        Reimbursement Payment
                                                    </h4>
                                                </div>
                                                <div className="p-6">
                                                    <Row className="g-5">
                                                        <Col md={6}>
                                                            <TextInput
                                                                label="Amount to Transfer"
                                                                formikField="amountPaid"
                                                                type="number"
                                                                isRequired={true}
                                                            />
                                                            <div className="text-muted fs-8 mt-1">
                                                                Remaining: {formatINR(Math.max(0, rem))}
                                                            </div>
                                                        </Col>
                                                        <Col md={6}>
                                                            <TextInput
                                                                label="Internal Notes"
                                                                formikField="remarks"
                                                                isRequired={false}
                                                                placeholder="Add notes here..."
                                                            />
                                                        </Col>
                                                    </Row>

                                                    {/* List of included reimbursements */}
                                                    {!isEditMode && (
                                                        <div className="mt-6">
                                                            <div className="d-flex align-items-center justify-content-between mb-3">
                                                                <span className="text-gray-600 fs-7 fw-bold text-uppercase">
                                                                    Included Reimbursements ({selectedCount}/{totalRequests})
                                                                </span>
                                                                <div className="d-flex align-items-center gap-2">
                                                                    <label className="d-flex align-items-center gap-2 mb-0 cursor-pointer user-select-none fs-8 fw-semibold text-gray-700">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={isAllSelected}
                                                                            ref={(el) => {
                                                                                if (el) el.indeterminate = !isAllSelected && !isNoneSelected;
                                                                            }}
                                                                            onChange={toggleAll}
                                                                            className="form-check-input m-0"
                                                                            style={{ width: 16, height: 16 }}
                                                                        />
                                                                        Select All
                                                                    </label>
                                                                </div>
                                                            </div>
                                                            <div className="table-responsive" style={{ maxHeight: 240, overflowY: 'auto' }}>
                                                                <table className="table table-row-dashed table-row-gray-200 align-middle gs-0 gy-2 fs-8">
                                                                    <thead>
                                                                        <tr className="fw-bold text-muted bg-light">
                                                                            <th className="ps-3" style={{ width: 36 }}></th>
                                                                            <th>Date</th>
                                                                            <th>Type</th>
                                                                            <th>Note</th>
                                                                            <th>Client Type</th>
                                                                            <th>Client Name</th>
                                                                            <th>Project</th>
                                                                            <th className="text-end pe-3">Amount</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {unpaidReimbursements.map((r, i) => {
                                                                            const id = r.id ?? String(i);
                                                                            const isChecked = selectedIds.includes(id);
                                                                            return (
                                                                                <tr
                                                                                    key={id}
                                                                                    onClick={() => r.id && toggleId(r.id)}
                                                                                    className={isChecked ? 'bg-light-primary' : ''}
                                                                                    style={{ cursor: 'pointer' }}
                                                                                >
                                                                                    <td className="ps-3">
                                                                                        <input
                                                                                            type="checkbox"
                                                                                            checked={isChecked}
                                                                                            onChange={() => r.id && toggleId(r.id)}
                                                                                            onClick={(e) => e.stopPropagation()}
                                                                                            className="form-check-input m-0"
                                                                                            style={{ width: 15, height: 15 }}
                                                                                        />
                                                                                    </td>
                                                                                    <td className="text-gray-700">
                                                                                        {r.expenseDate
                                                                                            ? new Date(r.expenseDate).toLocaleDateString('en-IN')
                                                                                            : '--'}
                                                                                    </td>
                                                                                    <td className="text-gray-700">
                                                                                        {(r as any).reimbursementType?.type ?? '--'}
                                                                                    </td>
                                                                                    <td className="text-muted" style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                                        {r.description ?? '--'}
                                                                                    </td>
                                                                                    <td className="text-gray-600">
                                                                                        {resolveClientType(r.clientTypeId)}
                                                                                    </td>
                                                                                    <td className="text-gray-600" style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                                        {resolveClientCompany(r.clientCompanyId)}
                                                                                    </td>
                                                                                    <td className="text-gray-600" style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                                        {resolveProject(r.projectId)}
                                                                                    </td>
                                                                                    <td className="text-end pe-3 fw-bold text-gray-800">
                                                                                        {formatINR(parseFloat(String(r.amount ?? '0')))}
                                                                                    </td>
                                                                                </tr>
                                                                            );
                                                                        })}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                            {isNoneSelected && (
                                                                <div className="text-danger fs-8 mt-2 fw-semibold">
                                                                    Select at least one reimbursement to proceed.
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {isEditMode && (
                                                        <div className="mt-6">
                                                            <div className="alert alert-info d-flex align-items-center p-4">
                                                                <KTIcon iconName="information-5" className="fs-3 text-info me-3" />
                                                                <span className="fs-7 text-gray-700">
                                                                    Editing this payment updates the payout details only. The linked reimbursements remain unchanged.
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </Col>
                                    </Row>

                                    <div className="d-flex justify-content-end align-items-center mt-10 gap-3 border-top pt-8">
                                        <Button variant="light" onClick={onHide} className="fw-bold px-8 py-3">
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
                                            variant="primary"
                                            disabled={loading || !formikProps.isValid || (!isEditMode && isNoneSelected)}
                                            className="wt-btn-primary fw-bold px-12 py-3 shadow-sm"
                                            style={{ backgroundColor: '#AA393D', borderColor: '#AA393D' }}
                                        >
                                            {loading ? (
                                                <span className="indicator-label">
                                                    Processing...{' '}
                                                    <span className="spinner-border spinner-border-sm align-middle ms-2" />
                                                </span>
                                            ) : (
                                                <>
                                                    <KTIcon iconName="check-circle" className="fs-2 me-1" />
                                                    {isEditMode
                                                        ? 'Save Changes'
                                                        : `Authorize Disbursement${selectedCount > 0 ? ` (${selectedCount})` : ''}`}
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </FormikForm>
                                </>
                            );
                        }}
                    </Formik>
                )}
            </Modal.Body>
        </Modal>
    );
};

export default ReimbursementPaymentModal;
