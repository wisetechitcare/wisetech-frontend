import React, { useState } from 'react';
import { Modal, Button, Form, Row, Col } from 'react-bootstrap';
import { payrollService } from '../../services/payrollService';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';

interface RecordPaymentModalProps {
  show: boolean;
  onHide: () => void;
  employeeData: any;
  payrollId: string;
  onSuccess: () => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  show,
  onHide,
  employeeData,
  payrollId,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const pendingAmount = employeeData.netSalary - employeeData.paidAmount;
  
  const [formData, setFormData] = useState({
    amountPaid: pendingAmount,
    paymentDate: dayjs().format('YYYY-MM-DD'),
    paymentMethod: 'Bank Transfer',
    transactionId: '',
    remarks: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.amountPaid <= 0) {
      toast.error('Amount paid must be greater than zero');
      return;
    }

    if (formData.amountPaid > pendingAmount) {
      toast.error('Amount paid cannot exceed pending salary');
      return;
    }

    try {
      setLoading(true);
      await payrollService.recordPayment({
        payrollId,
        employeeId: employeeData.employeeId,
        amountPaid: Number(formData.amountPaid),
        paymentDate: formData.paymentDate,
        paymentMethod: formData.paymentMethod,
        transactionId: formData.transactionId,
        remarks: formData.remarks,
      });
      toast.success('Payment recorded successfully');
      onSuccess();
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Record Salary Payment</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <div className="alert alert-dismissible bg-light-primary d-flex flex-column flex-sm-row p-5 mb-10">
            <div className="d-flex flex-column pe-0 pe-sm-10">
              <h4 className="fw-bold">Payment for {employeeData.employee?.fullName}</h4>
              <span>Net Salary: <strong>₹{employeeData.netSalary?.toLocaleString('en-IN')}</strong> | 
              Already Paid: <strong>₹{employeeData.paidAmount?.toLocaleString('en-IN')}</strong> | 
              Pending: <strong className="text-danger">₹{pendingAmount?.toLocaleString('en-IN')}</strong></span>
            </div>
          </div>

          <Row className="mb-5">
            <Col md={6}>
              <Form.Group>
                <Form.Label className="required fw-bold fs-6 mb-2">Amount to Disburse</Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  max={pendingAmount}
                  value={formData.amountPaid}
                  onChange={(e) => setFormData({ ...formData, amountPaid: Number(e.target.value) })}
                  required
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label className="required fw-bold fs-6 mb-2">Payment Date</Form.Label>
                <Form.Control
                  type="date"
                  value={formData.paymentDate}
                  onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                  required
                />
              </Form.Group>
            </Col>
          </Row>

          <Row className="mb-5">
            <Col md={6}>
              <Form.Group>
                <Form.Label className="required fw-bold fs-6 mb-2">Payment Method</Form.Label>
                <Form.Select
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  required
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="UPI">UPI</option>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-bold fs-6 mb-2">Transaction ID / Reference</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="UTR Number, UPI Ref, etc."
                  value={formData.transactionId}
                  onChange={(e) => setFormData({ ...formData, transactionId: e.target.value })}
                />
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-5">
            <Form.Label className="fw-bold fs-6 mb-2">Remarks</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={onHide} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? 'Processing...' : 'Confirm Payment'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};
