import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import { Formik, Form } from 'formik';
import { KTIcon } from '@metronic/helpers';
import { Close } from '@mui/icons-material';
import { GrossDistributionData, DynamicField } from '../../types/payroll.types';
import { formatINRDecimal } from '../../utils/payrollFormatters';

interface GrossDistributionModalProps {
    show: boolean;
    onHide: () => void;
    loading: boolean;
    initialValues: any;
    validationSchema: any;
    grossDistributionData: GrossDistributionData;
    workEarningsData?: Record<string, any>;
    dynamicFields: DynamicField[];
    deletedFields: string[];
    onAddComment: () => void;
    onRemoveField: (id: string, isNew: boolean) => void;
    onUpdateFieldName: (id: string, name: string, isNew: boolean) => void;
    onSubmit: (values: any, actions: any) => void;
}

const GrossDistributionModal: React.FC<GrossDistributionModalProps> = ({
    show, onHide, loading, initialValues, validationSchema,
    grossDistributionData, workEarningsData = {}, dynamicFields,
    deletedFields, onAddComment, onRemoveField, onUpdateFieldName, onSubmit,
}) => {
    const workEntries = Object.entries(workEarningsData).filter(([, item]: [string, any]) => item?.isActive !== false);
    const workTotal = workEntries.reduce((sum, [, item]: [string, any]) => sum + Number(item?.earned || 0), 0);
    const allowanceEntries = Object.entries(grossDistributionData)
        .filter(([key]) => !deletedFields.includes(key) && key.toLowerCase() !== 'basic salary');

    return (
        <Modal show={show} onHide={onHide} size="lg" scrollable>
            <Modal.Header closeButton className="border-bottom-0 pb-2 px-6 pt-5">
                <div>
                    <Modal.Title className="fw-bolder fs-4 text-gray-800">Modify Gross Distribution</Modal.Title>
                    <p className="text-muted fs-8 mb-0 mt-1">
                        Fixed allowances are editable · Work earnings are auto-calculated from attendance
                    </p>
                </div>
            </Modal.Header>

            <Modal.Body className="px-6 pt-4 pb-0" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
                {/* ── Work Earnings (read-only, same table style as Allowances) ── */}
                {workEntries.length > 0 && (
                    <div className="mb-6">
                        <div className="d-flex align-items-center justify-content-between mb-3">
                            <div className="d-flex align-items-center gap-2">
                                <div style={{ width: 3, height: 16, borderRadius: 2, backgroundColor: '#50cd89' }} />
                                <span className="fw-bolder fs-8 text-uppercase text-gray-600" style={{ letterSpacing: '0.06em' }}>
                                    Work Earnings
                                </span>
                                <span className="badge badge-light-success fs-9 py-1 px-2">Auto-Calculated</span>
                            </div>
                            <span className="fw-bolder fs-6 text-success">+{formatINRDecimal(workTotal)}</span>
                        </div>

                        <div className="rounded-3 overflow-hidden mb-1" style={{ border: '1px solid #bbf7d0' }}>
                            {/* Header row */}
                            <div className="d-flex align-items-center gap-3 px-5 py-2" style={{ background: '#f0fdf4', borderBottom: '1px solid #bbf7d0' }}>
                                <div style={{ flex: '1 1 0', letterSpacing: '0.05em', color: '#16a34a' }} className="fw-bold fs-9 text-uppercase">Component</div>
                                <div style={{ width: 160, color: '#16a34a' }} className="fw-bold fs-9 text-uppercase text-end">Amount (₹)</div>
                                <div style={{ width: 30 }} />
                            </div>
                            {workEntries.map(([key, item]: [string, any]) => (
                                <div key={key} className="d-flex align-items-center gap-3 px-5 py-3" style={{ borderBottom: '1px solid #f0fdf4', background: '#fff' }}>
                                    <div style={{ flex: '1 1 0' }}>
                                        <span className="fw-semibold fs-7 text-gray-700">{item.name || key}</span>
                                    </div>
                                    <div style={{ width: 160 }}>
                                        <div className="input-group input-group-sm">
                                            <span className="input-group-text border-end-0 px-2" style={{ fontSize: '0.75rem', background: '#f0fdf4', borderColor: '#bbf7d0', color: '#16a34a' }}>₹</span>
                                            <input
                                                type="text"
                                                readOnly
                                                value={formatINRDecimal(Number(item.earned || 0)).replace('₹', '')}
                                                className="form-control border-start-0 ps-1 text-end fw-bolder"
                                                style={{ fontSize: '0.85rem', background: '#f0fdf4', borderColor: '#bbf7d0', color: '#16a34a', cursor: 'default' }}
                                            />
                                        </div>
                                    </div>
                                    {/* spacer to align with delete col in allowances */}
                                    <div style={{ width: 30 }} />
                                </div>
                            ))}
                        </div>
                        <p className="text-muted fs-9 mb-0">Auto-calculated from attendance — not editable here.</p>
                    </div>
                )}

                {/* ── Allowances & Benefits (editable) ── */}
                <Formik
                    initialValues={initialValues}
                    validationSchema={validationSchema}
                    onSubmit={onSubmit}
                    enableReinitialize
                >
                    {(formikProps) => (
                        <Form>
                            <div className="d-flex align-items-center justify-content-between mb-3">
                                <div className="d-flex align-items-center gap-2">
                                    <div style={{ width: 3, height: 16, borderRadius: 2, backgroundColor: '#3e97ff' }} />
                                    <span className="fw-bolder fs-8 text-uppercase text-gray-600" style={{ letterSpacing: '0.06em' }}>
                                        Allowances & Benefits
                                    </span>
                                </div>
                                <Button variant="outline-primary" size="sm" onClick={onAddComment} className="py-1 px-3 fs-8 fw-bold">
                                    <KTIcon iconName="plus" className="fs-8 me-1" />
                                    Add Component
                                </Button>
                            </div>

                            {(allowanceEntries.length > 0 || dynamicFields.length > 0) ? (
                                <div className="rounded-3 border border-gray-200 overflow-hidden mb-2">
                                    {/* Header row */}
                                    <div className="d-flex align-items-center gap-3 px-5 py-2 bg-light" style={{ borderBottom: '1px solid #e9ecef' }}>
                                        <div style={{ flex: '1 1 0' }} className="text-muted fs-9 fw-bold text-uppercase">Component</div>
                                        <div style={{ width: 160 }} className="text-muted fs-9 fw-bold text-uppercase text-end">Amount (₹)</div>
                                        <div style={{ width: 30 }} />
                                    </div>

                                    {allowanceEntries.map(([key, field]) => (
                                        <div key={key} className="d-flex align-items-center gap-3 px-5 py-3" style={{ borderBottom: '1px solid #f5f5f5' }}>
                                            <div style={{ flex: '1 1 0' }}>
                                                <span className="fw-semibold fs-7 text-gray-800">{field.name}</span>
                                            </div>
                                            <div style={{ width: 160 }}>
                                                <div className="input-group input-group-sm">
                                                    <span className="input-group-text bg-light border-end-0 text-gray-500 px-2" style={{ fontSize: '0.75rem' }}>₹</span>
                                                    <input
                                                        type="number"
                                                        className="form-control border-start-0 ps-1 text-end"
                                                        {...formikProps.getFieldProps(key)}
                                                        placeholder="0"
                                                        style={{ fontWeight: 600, fontSize: '0.85rem' }}
                                                    />
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => onRemoveField(key, false)}
                                                style={{ width: 28, height: 28, minWidth: 28, border: 'none', background: 'transparent', color: '#f1416c', cursor: 'pointer', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                                            >
                                                <Close sx={{ fontSize: 16 }} />
                                            </button>
                                        </div>
                                    ))}

                                    {dynamicFields.map((field) => (
                                        <div key={field.id} className="d-flex align-items-center gap-3 px-5 py-3" style={{ borderBottom: '1px solid #f5f5f5' }}>
                                            <div style={{ flex: '1 1 0' }}>
                                                <input
                                                    type="text"
                                                    className="form-control form-control-sm border-0 border-bottom rounded-0 bg-transparent fw-bold text-primary ps-0"
                                                    value={field.name}
                                                    onChange={(e) => onUpdateFieldName(field.id, e.target.value, true)}
                                                    placeholder="Component name…"
                                                    style={{ fontSize: '0.82rem' }}
                                                />
                                            </div>
                                            <div style={{ width: 160 }}>
                                                <div className="input-group input-group-sm">
                                                    <span className="input-group-text bg-light border-end-0 text-gray-500 px-2" style={{ fontSize: '0.75rem' }}>₹</span>
                                                    <input
                                                        type="number"
                                                        className="form-control border-start-0 ps-1 text-end"
                                                        {...formikProps.getFieldProps(field.id)}
                                                        placeholder="0"
                                                        style={{ fontWeight: 600, fontSize: '0.85rem' }}
                                                    />
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => onRemoveField(field.id, true)}
                                                style={{ width: 28, height: 28, minWidth: 28, border: 'none', background: 'transparent', color: '#f1416c', cursor: 'pointer', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                                            >
                                                <Close sx={{ fontSize: 16 }} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-10 bg-light rounded-3 border border-dashed border-gray-300 mb-2">
                                    <KTIcon iconName="abstract-26" className="fs-2x text-gray-400 mb-3" />
                                    <p className="text-muted fs-7 mb-0">No allowances configured. Click "Add Component" to add one.</p>
                                </div>
                            )}

                            <div className="d-flex justify-content-end gap-3 py-4 border-top mt-2">
                                <Button variant="light" onClick={onHide} disabled={loading}>Cancel</Button>
                                <Button
                                    type="submit"
                                    disabled={loading || !formikProps.isValid}
                                    style={{ backgroundColor: '#AA393D', borderColor: '#AA393D', color: '#fff' }}
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
