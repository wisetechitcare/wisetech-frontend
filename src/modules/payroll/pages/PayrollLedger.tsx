import React, { useState, useEffect, useMemo } from 'react';
import { Container, Card, Button, Badge } from 'react-bootstrap';
import { KTIcon } from '@metronic/helpers';
import MaterialTable from '@app/modules/common/components/MaterialTable';
import { payrollService } from '../services/payrollService';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const PayrollLedger: React.FC = () => {
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchPayrolls = async () => {
    try {
      setLoading(true);
      const data = await payrollService.getAllPayrolls();
      setPayrolls(data);
    } catch (error) {
      console.error('Error fetching payrolls:', error);
      toast.error('Failed to load payroll records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayrolls();
  }, []);

  const handleGeneratePayroll = async () => {
    const month = dayjs().month() + 1; // Current month
    const year = dayjs().year();
    
    try {
      toast.info(`Generating payroll for ${dayjs().format('MMMM YYYY')}...`);
      await payrollService.generatePayroll(month, year);
      toast.success('Payroll generated successfully');
      fetchPayrolls();
    } catch (error) {
      console.error('Error generating payroll:', error);
      toast.error('Failed to generate payroll');
    }
  };

  const columns = useMemo(() => [
    {
      header: 'Payroll Cycle',
      accessorKey: 'month',
      size: 250,
      Cell: ({ row }: any) => {
        const rowData = row.original;
        return (
          <div className="d-flex align-items-center">
            <div className="symbol symbol-40px me-3">
              <div className="symbol-label bg-light-primary text-primary fw-bold">
                {dayjs().month(rowData.month - 1).format('MMM')}
              </div>
            </div>
            <div className="d-flex flex-column">
              <span className="text-gray-900 fw-bolder text-hover-primary mb-1 fs-6">
                {dayjs().month(rowData.month - 1).format('MMMM')} {rowData.year}
              </span>
              <span className="text-muted fw-bold d-block fs-8">Cycle ID: {rowData.id.substring(0, 8)}</span>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Status',
      accessorKey: 'status',
      size: 150,
      Cell: ({ cell }: any) => {
        const status = cell.getValue();
        let color = 'secondary';
        if (status === 'GENERATED' || status === 'GENERATED') color = 'primary';
        if (status === 'PAID' || status === 'FULLY_PAID') color = 'success';
        if (status === 'PARTIALLY_PAID') color = 'warning';
        return <Badge bg={color} className={`badge-light-${color} fw-bold px-4 py-2`}>{status}</Badge>;
      },
    },
    {
      header: 'Total Gross',
      accessorKey: 'totalGross',
      size: 150,
      Cell: ({ cell }: any) => (
        <span className="fw-bolder text-gray-800">₹{Number(cell.getValue() || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
      ),
    },
    {
      header: 'Statutory Dues',
      accessorKey: 'totalDeductions',
      size: 150,
      Cell: ({ cell }: any) => (
        <span className="text-danger fw-bold">₹{Number(cell.getValue() || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
      ),
    },
    {
      header: 'Net Payable',
      accessorKey: 'totalNet',
      size: 150,
      Cell: ({ cell }: any) => (
        <span className="text-primary fw-bolder">₹{Number(cell.getValue() || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
      ),
    },
    {
      header: 'Actions',
      size: 150,
      Cell: ({ row }: any) => (
        <Button 
          variant="primary" 
          size="sm" 
          className="wt-btn-primary fw-bold"
          onClick={() => navigate(`/payroll/ledger/${row.original.id}`)}
        >
          <KTIcon iconName="eye" className="fs-3 me-1" /> View Ledger
        </Button>
      ),
    },
  ], [navigate]);

  return (
    <div className="payroll-ledger-page">
      <Container fluid className="my-5">
        <div className="d-flex justify-content-between align-items-center mb-8">
          <div>
            <h1 className="text-dark fw-bold my-1 fs-2">Payroll Ledger</h1>
            <ul className="breadcrumb breadcrumb-dot fw-semibold fs-7 my-1">
              <li className="breadcrumb-item text-muted">Finance</li>
              <li className="breadcrumb-item text-dark">Payroll Ledger</li>
            </ul>
          </div>
          <div className="d-flex gap-3">
            <Button variant="light" onClick={fetchPayrolls}>
              <KTIcon iconName="arrows-circle" className="fs-2" />
              Refresh
            </Button>
            <Button variant="primary" onClick={handleGeneratePayroll}>
              <KTIcon iconName="plus" className="fs-2" />
              Generate Current Month
            </Button>
          </div>
        </div>

        <Card className="shadow-sm">
          <Card.Body className="py-4">
            <MaterialTable
              columns={columns}
              data={payrolls}
              tableName="Monthly Payroll Cycles"
              isLoading={loading}
            />
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
};

export default PayrollLedger;
