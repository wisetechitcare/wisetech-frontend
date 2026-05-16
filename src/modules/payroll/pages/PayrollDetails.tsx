import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Card, Button, Badge, Row, Col, Nav, Tab, ListGroup } from 'react-bootstrap';
import { KTIcon } from '@metronic/helpers';
import MaterialTable from '@app/modules/common/components/MaterialTable';
import { PayrollService } from '../services/payroll.service'; // Use the consolidated service
import { payrollService as legacyService } from '../services/payrollService'; // Keep for other methods if needed
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import PaymentModal from '../components/modals/PaymentModal';
import { formatINR2 } from '../utils/payrollFormatters';
import { normalizePayrollRecord, aggregatePayrollSummary, NormalizedPayrollRecord } from '../utils/normalizePayrollRecord';

const PayrollDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [payroll, setPayroll] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState<any>(null);

  const fetchPayrollDetails = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await legacyService.getPayrollById(id);
      setPayroll(data);
    } catch (error) {
      console.error('Error fetching payroll details:', error);
      toast.error('Failed to load payroll details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayrollDetails();
  }, [id]);

  // Canonical per-row view — single source of truth for all cards/columns/history.
  const normalizedRows: NormalizedPayrollRecord[] = useMemo(
    () => (payroll?.salaryRecords || []).map(normalizePayrollRecord),
    [payroll]
  );

  // Aggregate KPIs — replaces stale payroll.totalPaid / totalPending which can be wrong on legacy data.
  const summary = useMemo(() => aggregatePayrollSummary(normalizedRows), [normalizedRows]);

  const handleRecordPayment = (row: any) => {
    setSelectedRow(row);
    setShowPaymentModal(true);
  };

  const employeeColumns = useMemo(() => [
    {
      header: 'Employee Details',
      accessorKey: 'employee.fullName',
      size: 250,
      Cell: ({ row }: any) => {
        const rowData: NormalizedPayrollRecord = row.original;
        const emp = rowData.employee || {};
        const fullName = emp.fullName || [emp?.users?.firstName, emp?.users?.lastName].filter(Boolean).join(' ') || '—';
        return (
          <div className="d-flex align-items-center">
            <div className="symbol symbol-40px me-4">
              <div className="symbol-label fs-4 bg-light-primary text-primary fw-bold shadow-sm">
                {fullName.charAt(0)}
              </div>
            </div>
            <div className="d-flex flex-column">
              <span className="text-gray-900 fw-bolder text-hover-primary fs-6">{fullName}</span>
              <span className="text-muted fw-bold fs-8">
                {emp.employeeCode || ''} {emp.designation ? `• ${emp.designation}` : ''}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Net Payable',
      accessorKey: 'finalNetSalary',
      size: 150,
      Cell: ({ row }: any) => (
        <span className="fw-bolder text-gray-800">{formatINR2(row.original.finalNetSalary)}</span>
      ),
    },
    {
      header: 'Disbursed',
      accessorKey: 'salaryPaid',
      size: 150,
      Cell: ({ row }: any) => {
        const r: NormalizedPayrollRecord = row.original;
        return (
          <span className="text-success fw-bolder">
            {formatINR2(r.salaryPaid)}
            {r.hasLegacyFallback && (
              <span className="badge badge-light-warning ms-2 fs-9" title="From legacy record">LEGACY</span>
            )}
          </span>
        );
      },
    },
    {
      header: 'Balance',
      accessorKey: 'salaryPending',
      size: 150,
      Cell: ({ row }: any) => {
        const pending = row.original.salaryPending;
        return (
          <span className={`fw-bolder ${pending > 0 ? 'text-danger' : 'text-gray-400'}`}>
            {formatINR2(pending)}
          </span>
        );
      },
    },
    {
      header: 'Payout Status',
      accessorKey: 'status',
      size: 150,
      Cell: ({ row }: any) => {
        const status = row.original.status;
        if (status === 'PAID') return <Badge bg="success" className="badge-light-success py-2 px-4">FULLY DISBURSED</Badge>;
        if (status === 'PARTIAL') return <Badge bg="warning" className="badge-light-warning py-2 px-4">PARTIAL</Badge>;
        return <Badge bg="danger" className="badge-light-danger py-2 px-4">UNPAID</Badge>;
      },
    },
    {
      header: 'Actions',
      size: 200,
      Cell: ({ row }: any) => {
        const r: NormalizedPayrollRecord = row.original;
        return (
          <div className="d-flex gap-2">
            <Button
              variant="primary"
              size="sm"
              className="wt-btn-primary fw-bold"
              onClick={() => handleRecordPayment(r)}
              disabled={r.salaryPending <= 0}
            >
              <KTIcon iconName="wallet" className="fs-3 me-1" /> Pay
            </Button>
            <Button
              variant="light-info"
              size="sm"
              className="fw-bold"
              onClick={() => navigate(`/finance/salary?employeeId=${r.employeeId}&month=${payroll.month}&year=${payroll.year}`)}
            >
              <KTIcon iconName="document" className="fs-3" />
            </Button>
          </div>
        );
      },
    },
  ], [payroll, navigate]);

  const govtColumns = [
    {
      header: 'Tax / Fund Component',
      accessorKey: 'paymentType',
      Cell: ({ cell }: any) => <span className="fw-bolder text-gray-800">{cell.getValue()}</span>,
    },
    {
      header: 'Total Liability',
      accessorKey: 'amount',
      Cell: ({ cell }: any) => <span className="fw-bold">{formatINR2(cell.getValue())}</span>,
    },
    {
      header: 'Reference # / Challan',
      accessorKey: 'transactionId',
      Cell: ({ cell }: any) => <span className="text-muted fw-bold">{cell.getValue() || '--'}</span>,
    },
    {
      header: 'Settlement Date',
      accessorKey: 'paymentDate',
      Cell: ({ cell }: any) => <span className="text-muted">{cell.getValue() ? dayjs(cell.getValue()).format('DD MMM YYYY') : '--'}</span>,
    },
    {
      header: 'Status',
      Cell: ({ row }: any) => (
        row.original.transactionId ? 
        <Badge bg="success" className="badge-light-success py-2 px-3">SETTLED</Badge> : 
        <Badge bg="danger" className="badge-light-danger py-2 px-3">PENDING</Badge>
      ),
    },
  ];

  const getStatutorySummary = () => {
    if (!payroll) return [];
    return [
      { paymentType: 'Provident Fund (PF)', amount: payroll.totalDeductions * 0.6, ...payroll.govtPayments?.find((p: any) => p.paymentType === 'PF') },
      { paymentType: 'Professional Tax (PT)', amount: payroll.totalDeductions * 0.1, ...payroll.govtPayments?.find((p: any) => p.paymentType === 'PT') },
      { paymentType: 'TDS / Income Tax', amount: payroll.totalDeductions * 0.3, ...payroll.govtPayments?.find((p: any) => p.paymentType === 'TDS') },
    ];
  };

  const renderDetailPanel = ({ row }: any) => {
    const data: NormalizedPayrollRecord = row.original;
    const fixedBreakdown: Record<string, any> = (data.deductionBreakdown?.fixed) || {};
    const fixedEntries = Object.entries(fixedBreakdown);

    return (
      <div className="p-8 bg-light rounded-3 m-4 shadow-sm border border-gray-200">
        <Row className="g-8">
          <Col md={4}>
            <div className="bg-white p-6 rounded-3 h-100 border">
              <h6 className="fw-bolder text-gray-800 mb-4 d-flex align-items-center">
                <KTIcon iconName="abstract-14" className="fs-3 text-primary me-2" />
                Earnings & Variable Cuts
              </h6>
              <ListGroup variant="flush">
                <ListGroup.Item className="d-flex justify-content-between py-3">
                  <span className="text-gray-600">Gross Salary</span>
                  <span className="fw-bold">{formatINR2(data.grossPay)}</span>
                </ListGroup.Item>
                <ListGroup.Item className="d-flex justify-content-between py-3">
                  <span className="text-gray-600">Variable Deductions</span>
                  <span className="text-danger">-{formatINR2(data.variableDeductions)}</span>
                </ListGroup.Item>
                <ListGroup.Item className="d-flex justify-content-between py-3 bg-light rounded-1 mt-2">
                  <span className="fw-bolder text-gray-800">Intermediate Salary</span>
                  <span className="fw-bolder text-gray-900">{formatINR2(data.intermediateSalary)}</span>
                </ListGroup.Item>
                <ListGroup.Item className="d-flex justify-content-between py-3">
                  <span className="text-gray-600">Fixed Deductions</span>
                  <span className="text-danger">-{formatINR2(data.fixedDeductions)}</span>
                </ListGroup.Item>
                <ListGroup.Item className="d-flex justify-content-between py-3 bg-light rounded-1 mt-2">
                  <span className="fw-bolder text-gray-800">Net Payable</span>
                  <span className="fw-bolder text-gray-900">{formatINR2(data.finalNetSalary)}</span>
                </ListGroup.Item>
              </ListGroup>
            </div>
          </Col>

          <Col md={4}>
            <div className="bg-white p-6 rounded-3 h-100 border">
              <h6 className="fw-bolder text-gray-800 mb-4 d-flex align-items-center">
                <KTIcon iconName="lock" className="fs-3 text-danger me-2" />
                Statutory Deductions (Fixed)
              </h6>
              {fixedEntries.length > 0 ? (
                <ListGroup variant="flush">
                  {fixedEntries.map(([key, val]: any) => {
                    const amount = typeof val === 'number' ? val : (val?.earned ?? val?.amount ?? 0);
                    return (
                      <ListGroup.Item key={key} className="d-flex justify-content-between py-3">
                        <span className="text-gray-600">{key}</span>
                        <span className="text-danger fw-bold">-{formatINR2(amount)}</span>
                      </ListGroup.Item>
                    );
                  })}
                </ListGroup>
              ) : (
                <div className="text-muted fs-8 text-center py-6">No fixed deduction breakdown available.</div>
              )}
            </div>
          </Col>

          <Col md={4}>
            <div className="bg-white p-6 rounded-3 h-100 border">
              <h6 className="fw-bolder text-gray-800 mb-4 d-flex align-items-center">
                <KTIcon iconName="bank" className="fs-3 text-success me-2" />
                Disbursement History
                {data.hasLegacyFallback && (
                  <span className="badge badge-light-warning ms-2 fs-9">LEGACY</span>
                )}
              </h6>
              {data.paymentHistory.length > 0 ? (
                <div className="timeline-items">
                  {data.paymentHistory.map((p, idx) => (
                    <div key={p.id || idx} className="d-flex align-items-center mb-4 border-bottom pb-3 last-child-border-0">
                      <div className="symbol symbol-30px me-3">
                        <div className={`symbol-label ${p.source === 'LEGACY' ? 'bg-light-warning' : 'bg-light-success'}`}>
                          <KTIcon iconName="check" className={`fs-5 ${p.source === 'LEGACY' ? 'text-warning' : 'text-success'}`} />
                        </div>
                      </div>
                      <div className="d-flex flex-column flex-grow-1">
                        <span className="text-gray-800 fw-bold fs-7">
                          {formatINR2(p.amount)}
                          {p.paymentMethod ? ` via ${p.paymentMethod}` : ''}
                        </span>
                        <span className="text-muted fs-9">
                          {p.paymentDate ? dayjs(p.paymentDate).format('DD MMM YYYY') : '—'} • {p.transactionId || (p.source === 'LEGACY' ? 'Legacy record' : 'No Ref')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                   <KTIcon iconName="information" className="fs-1 text-gray-300 mb-3" />
                   <div className="text-gray-500 fs-7">No payment records found.</div>
                </div>
              )}
            </div>
          </Col>
        </Row>
      </div>
    );
  };

  if (loading && !payroll) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '600px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="payroll-details-page bg-light-subtle pb-12">
      <Container fluid className="px-10">
        {/* Breadcrumb & Header */}
        <div className="py-10 d-flex justify-content-between align-items-center">
          <div>
            <div className="d-flex align-items-center mb-2">
              <Button variant="white" className="btn-sm btn-icon shadow-sm me-4" onClick={() => navigate('/payroll/ledger')}>
                <KTIcon iconName="arrow-left" className="fs-2" />
              </Button>
              <h1 className="text-gray-900 fw-bolder fs-1 mb-0">
                Payroll Cycle: {dayjs().month(payroll?.month - 1).format('MMMM')} {payroll?.year}
              </h1>
            </div>
            <span className="text-muted fw-bold fs-7 ms-14">Ledger ID: {id} • Status: <Badge bg="primary" className="ms-2">{payroll?.status}</Badge></span>
          </div>
          <div className="d-flex gap-4">
            <Button variant="white" className="fw-bolder shadow-sm px-6">
              <KTIcon iconName="file-down" className="fs-2 me-1" /> Download Report
            </Button>
            <Button variant="primary" className="fw-bolder shadow-sm px-8 wt-btn-primary">
              <KTIcon iconName="check-circle" className="fs-2 me-1" /> Finalize Payouts
            </Button>
          </div>
        </div>

        {/* Financial KPI Grid — derived from normalized rows so legacy data is included. */}
        <Row className="g-6 mb-10">
          <Col xl={3}>
            <div className="card border-0 shadow-sm bg-primary h-100 p-8">
              <KTIcon iconName="wallet" className="fs-2hx text-white opacity-50 mb-5" />
              <div className="text-white fw-bolder fs-2hx mb-1">{formatINR2(summary.netSalary)}</div>
              <div className="fw-bold text-white opacity-75 fs-6">Total Monthly Liability</div>
            </div>
          </Col>
          <Col xl={3}>
            <div className="card border-0 shadow-sm bg-white h-100 p-8 border-start border-success border-4">
              <KTIcon iconName="check-circle" className="fs-2hx text-success mb-5" />
              <div className="text-gray-900 fw-bolder fs-2hx mb-1">{formatINR2(summary.salaryPaid)}</div>
              <div className="fw-bold text-gray-500 fs-6">Actually Disbursed</div>
            </div>
          </Col>
          <Col xl={3}>
            <div className="card border-0 shadow-sm bg-white h-100 p-8 border-start border-danger border-4">
              <KTIcon iconName="information-5" className="fs-2hx text-danger mb-5" />
              <div className="text-gray-900 fw-bolder fs-2hx mb-1">{formatINR2(summary.salaryPending)}</div>
              <div className="fw-bold text-gray-500 fs-6">Pending Dues</div>
            </div>
          </Col>
          <Col xl={3}>
            <div className="card border-0 shadow-sm bg-white h-100 p-8 border-start border-warning border-4">
              <KTIcon iconName="bank" className="fs-2hx text-warning mb-5" />
              <div className="text-gray-900 fw-bolder fs-2hx mb-1">{formatINR2(summary.totalFixedDeduction)}</div>
              <div className="fw-bold text-gray-500 fs-6">Statutory Liabilities</div>
            </div>
          </Col>
        </Row>

        {/* Disbursement Ledger */}
        <Tab.Container defaultActiveKey="salaries">
          <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
            <Card.Header className="bg-white pt-5 border-0">
              <Nav variant="pills" className="nav-line-tabs nav-line-tabs-2x border-transparent fs-5 fw-bolder">
                <Nav.Item>
                  <Nav.Link eventKey="salaries" className="text-active-primary py-4 px-8">Employee Disbursements</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="govt" className="text-active-primary py-4 px-8">Statutory Settlements</Nav.Link>
                </Nav.Item>
              </Nav>
            </Card.Header>
            <Card.Body className="p-0">
              <Tab.Content>
                <Tab.Pane eventKey="salaries">
                  <MaterialTable
                    columns={employeeColumns}
                    data={normalizedRows}
                    tableName="Disbursement History"
                    isLoading={loading}
                    enableExpandAll={false}
                    renderDetailPanel={renderDetailPanel}
                    muiTableProps={{
                      sx: {
                        '& .MuiTableBody-root tr:hover': {
                          backgroundColor: '#F9F9F9',
                        },
                      }
                    }}
                  />
                </Tab.Pane>
                <Tab.Pane eventKey="govt" className="p-8">
                  <MaterialTable
                    columns={govtColumns}
                    data={getStatutorySummary()}
                    tableName="Government Dues Ledger"
                    isLoading={loading}
                  />
                </Tab.Pane>
              </Tab.Content>
            </Card.Body>
          </Card>
        </Tab.Container>
      </Container>

      {/* Unified Enterprise Payment Modal */}
      {selectedRow && (
        <PaymentModal
          show={showPaymentModal}
          onHide={() => setShowPaymentModal(false)}
          loading={loading}
          editMode={false}
          initialValues={{}}
          onSubmit={async (values) => {
            await PayrollService.recordSalaryPayment({
              salaryId: selectedRow.id,
              employeeId: selectedRow.employeeId,
              amount: values.salaryAmount,
              paymentDate: values.paidAt,
              paymentMethod: values.paymentMethod,
              transactionId: values.transactionId,
              remarks: values.remarks
            });
            toast.success('Disbursement recorded successfully');
            setShowPaymentModal(false);
            fetchPayrollDetails();
          }}
          employeeName={selectedRow.employee?.fullName || [selectedRow.employee?.users?.firstName, selectedRow.employee?.users?.lastName].filter(Boolean).join(' ')}
          month={dayjs().month(payroll?.month - 1).format('MMMM')}
          year={payroll?.year.toString()}
          netPayable={selectedRow.finalNetSalary}
          salaryPaid={selectedRow.salaryPaid}
          governmentPaid={selectedRow.governmentPaid}
          grossSalary={selectedRow.grossPay}
          variableDeductions={selectedRow.variableDeductions}
          fixedDeductions={selectedRow.fixedDeductions}
          statutoryBreakdown={selectedRow.deductionBreakdown?.fixed || {}}
        />
      )}
    </div>
  );
};

export default PayrollDetails;
