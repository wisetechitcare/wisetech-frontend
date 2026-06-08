import React, { useEffect, useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { Box, Typography } from '@mui/material';
import { IncrementRecord } from '../../../../../../../../services/incrementService';
import dayjs, { Dayjs } from 'dayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

interface DialogProps {
    show: boolean;
    onHide: () => void;
    record: IncrementRecord | null;
    employeeName: string;
    currentSalary: number;
    onSubmit: (payload: Partial<IncrementRecord>) => void;
}

const AddEditIncrementDialog = ({ show, onHide, record, employeeName, currentSalary, onSubmit }: DialogProps) => {
    const isEdit = !!record;

    // For edits keep original date; for new increments default to current month
    const [newSalary, setNewSalary] = useState(isEdit ? record.newSalary.toString() : '');
    const [selectedDate, setSelectedDate] = useState<Dayjs | null>(
        isEdit ? dayjs(record.effectiveDate) : dayjs().startOf('month')
    );
    const [loading, setLoading] = useState(false);

    const previousSalary = isEdit ? record.previousSalary : currentSalary;

    // Earliest selectable month — current month only forward
    const minDate = dayjs().startOf('month');

    useEffect(() => {
        if (show) {
            setNewSalary(isEdit ? record.newSalary.toString() : '');
            setSelectedDate(isEdit ? dayjs(record.effectiveDate) : dayjs().startOf('month'));
            setLoading(false);
        }
    }, [show, record, isEdit]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const newSal = Number(newSalary);
        if (isNaN(newSal) || newSal <= 0) {
            alert('Please enter a valid positive salary');
            return;
        }

        if (!selectedDate || !selectedDate.isValid()) {
            alert('Please select a valid effective month');
            return;
        }

        setLoading(true);

        const payload: Partial<IncrementRecord> = {
            effectiveDate: selectedDate.startOf('month').format('YYYY-MM-DD'),
            newSalary: newSal,
        };

        await onSubmit(payload);
        setLoading(false);
    };

    const incrementAmt = Number(newSalary) - previousSalary;
    const incrementPct = previousSalary > 0
        ? Number(((incrementAmt / previousSalary) * 100).toFixed(2))
        : 0;
    const showPreview = !!newSalary && !isNaN(Number(newSalary)) && Number(newSalary) > 0;

    return (
        <Modal show={show} onHide={onHide} centered>
            <Form onSubmit={handleSubmit}>
                <Modal.Header closeButton style={{ borderBottom: '1px solid #e2e8f0', padding: '20px 24px' }}>
                    <Modal.Title style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '1.15rem', color: '#0f172a' }}>
                        {isEdit ? 'Edit Increment' : 'Add Increment'}
                    </Modal.Title>
                </Modal.Header>

                <Modal.Body style={{ padding: '24px' }}>
                    {/* Employee */}
                    <Box sx={{ mb: 2.5 }}>
                        <Typography sx={{ color: '#94a3b8', fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.3 }}>
                            Employee
                        </Typography>
                        <Typography sx={{ color: '#0f172a', fontSize: '1rem', fontWeight: 700 }}>
                            {employeeName}
                        </Typography>
                    </Box>

                    {/* Date picker — past months are disabled */}
                    <Form.Group className="mb-2">
                        <Form.Label style={{ color: '#475569', fontWeight: 600, fontSize: '0.88rem', marginBottom: '8px' }}>
                            Effective Month
                        </Form.Label>
                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                            <DatePicker
                                value={selectedDate}
                                onChange={(newValue) => setSelectedDate(newValue)}
                                views={['year', 'month']}
                                format="MMMM, YYYY"
                                minDate={minDate}
                                slotProps={{
                                    textField: {
                                        fullWidth: true,
                                        required: true,
                                        sx: {
                                            '& .MuiOutlinedInput-root': {
                                                backgroundColor: '#f8fafc',
                                                borderRadius: '8px',
                                                '& fieldset': { borderColor: '#e2e8f0' },
                                                '&:hover fieldset': { borderColor: '#cbd5e1' },
                                                '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
                                            },
                                            '& .MuiInputBase-input': { padding: '12px 16px', color: '#0f172a' },
                                        },
                                    },
                                }}
                            />
                        </LocalizationProvider>
                    </Form.Group>

                    {/* Info note */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
                        <InfoOutlinedIcon sx={{ fontSize: 14, color: '#94a3b8', flexShrink: 0 }} />
                        <Typography sx={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                            Only current month and future months can be selected.
                        </Typography>
                    </Box>

                    {/* Salary inputs */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2.5 }}>
                        <Form.Group>
                            <Form.Label style={{ color: '#475569', fontWeight: 600, fontSize: '0.85rem' }}>
                                Previous Salary
                            </Form.Label>
                            <Form.Control
                                type="text"
                                value={previousSalary || '—'}
                                disabled
                                style={{ backgroundColor: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px', fontSize: '0.9rem' }}
                            />
                        </Form.Group>
                        <Form.Group>
                            <Form.Label style={{ color: '#475569', fontWeight: 600, fontSize: '0.85rem' }}>
                                New Monthly Salary
                            </Form.Label>
                            <Form.Control
                                type="number"
                                value={newSalary}
                                onChange={(e) => setNewSalary(e.target.value)}
                                required
                                min={1}
                                placeholder="e.g. 20000"
                                style={{ borderRadius: '8px', padding: '10px 14px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                            />
                        </Form.Group>
                    </Box>

                    {/* Increment preview */}
                    {showPreview && (
                        <Box sx={{
                            bgcolor: incrementAmt > 0 ? '#f0fdf4' : '#fef2f2',
                            border: `1px solid ${incrementAmt > 0 ? '#bbf7d0' : '#fecaca'}`,
                            p: '10px 14px',
                            borderRadius: '8px',
                        }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography sx={{ color: incrementAmt > 0 ? '#166534' : '#991b1b', fontSize: '0.85rem', fontWeight: 600 }}>
                                    {incrementAmt > 0 ? 'Increment' : 'Reduction'}
                                </Typography>
                                <Typography sx={{ color: incrementAmt > 0 ? '#166534' : '#991b1b', fontSize: '0.95rem', fontWeight: 800 }}>
                                    {incrementAmt > 0 ? '+' : ''}₹{Math.abs(incrementAmt).toLocaleString('en-IN')}
                                    {' '}
                                    <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                                        ({incrementAmt > 0 ? '+' : ''}{incrementPct}%)
                                    </span>
                                </Typography>
                            </Box>
                        </Box>
                    )}
                </Modal.Body>

                <Modal.Footer style={{ borderTop: '1px solid #f1f5f9', padding: '14px 24px' }}>
                    <Button
                        variant="light"
                        onClick={onHide}
                        disabled={loading}
                        style={{ fontWeight: 600, color: '#475569', padding: '9px 18px', borderRadius: '8px', fontSize: '0.9rem' }}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        type="submit"
                        disabled={loading}
                        style={{ fontWeight: 600, backgroundColor: '#AA393D', border: 'none', padding: '9px 18px', borderRadius: '8px', fontSize: '0.9rem' }}
                    >
                        {loading ? 'Processing…' : isEdit ? 'Save Changes' : 'Create Increment'}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
};

export default AddEditIncrementDialog;
