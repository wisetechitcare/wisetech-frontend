import React, { useState } from 'react';
import { Modal, Button, Form, Row, Col } from 'react-bootstrap';
import { payrollService } from '../../services/payrollService';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import { formatINRRounded } from '../../utils/payrollFormatters';

interface RecordGovtPaymentModalProps {
  show: boolean;
  onHide: () => void;
  payrollId: string;
  paymentType: string;
  totalDue: number;
  onSuccess: () => void;
}

export const RecordGovtPaymentModal: React.FC<RecordGovtPaymentModalProps> = ({
  show,
  onHide,
  payrollId,
  paymentType,
  totalDue,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    amount: totalDue,
    paymentDate: dayjs().format('YYYY-MM-DD'),
    transactionId: '',
    remarks: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      await payrollService.recordGovtPayment({
        payrollId,
        paymentType,
        amount: Number(formData.amount),
        paymentDate: formData.paymentDate,
        transactionId: formData.transactionId,
        remarks: formData.remarks,
      });
      toast.success(`${paymentType} payment recorded successfully`);
      onSuccess();
    } catch (error) {
      console.error('Error recording govt payment:', error);
      toast.error(`Failed to record ${paymentType} payment`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Record {paymentType} Payment</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <div className="alert alert-dismissible bg-light-warning d-flex flex-column flex-sm-row p-5 mb-10">
            <div className="d-flex flex-column pe-0 pe-sm-10">
              <h4 className="fw-bold">Statutory Payment: {paymentType}</h4>
              <span>Total Accrued from Payroll: <strong>{formatINRRounded(totalDue || 0)}</strong></span>
            </div>
          </div>

          <Row className="mb-5">
            <Col md={12}>
              <Form.Group>
                <Form.Label className="required fw-bold fs-6 mb-2">Amount Paid</Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                  required
                />
              </Form.Group>
            </Col>
          </Row>

          <Row className="mb-5">
            <Col md={12}>
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
            <Col md={12}>
              <Form.Group>
                <Form.Label className="fw-bold fs-6 mb-2">Transaction ID / Challan Number</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter Challan Ref"
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
            {loading ? 'Processing...' : 'Record Payment'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};
