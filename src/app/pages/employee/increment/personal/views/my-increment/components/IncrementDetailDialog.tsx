import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import { Box, Typography, Chip, Stack } from '@mui/material';
import { IncrementRecord } from '../../../../../../../../services/incrementService';
import dayjs from 'dayjs';
import { formatCurrencyDecimal } from '@utils/currency';

interface DialogProps {
    show: boolean;
    onHide: () => void;
    record: IncrementRecord | null;
    employeeName: string;
}

const IncrementDetailDialog = ({ show, onHide, record, employeeName }: DialogProps) => {
    if (!record) return null;

    const DetailRow = ({ label, value, isHighlight = false }: { label: string, value: React.ReactNode, isHighlight?: boolean }) => (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1.5, borderBottom: '1px solid #f1f5f9' }}>
            <Typography sx={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 600 }}>{label}</Typography>
            <Typography sx={{ color: isHighlight ? '#0f172a' : '#475569', fontSize: '0.95rem', fontWeight: isHighlight ? 700 : 500 }}>
                {value}
            </Typography>
        </Box>
    );

    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header closeButton style={{ borderBottom: '1px solid #e2e8f0', padding: '20px 24px' }}>
                <Modal.Title style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '1.25rem', color: '#0f172a' }}>
                    Increment Details
                </Modal.Title>
            </Modal.Header>
            <Modal.Body style={{ padding: '24px' }}>
                <Box sx={{ mb: 3 }}>
                    <Typography sx={{ color: '#64748b', fontSize: '0.85rem', mb: 0.5 }}>Employee</Typography>
                    <Typography sx={{ color: '#0f172a', fontSize: '1.1rem', fontWeight: 700 }}>{employeeName}</Typography>
                </Box>
                
                <Box sx={{ bgcolor: '#f8fafc', p: 2, borderRadius: '12px', mb: 3 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Box>
                            <Typography sx={{ color: '#64748b', fontSize: '0.8rem', mb: 0.5, fontWeight: 600 }}>Previous</Typography>
                            <Typography sx={{ color: '#475569', fontSize: '1.1rem', fontWeight: 600 }}>{formatCurrencyDecimal(record.previousSalary)}</Typography>
                        </Box>
                        <Box sx={{ color: '#cbd5e1' }}>→</Box>
                        <Box textAlign="right">
                            <Typography sx={{ color: '#64748b', fontSize: '0.8rem', mb: 0.5, fontWeight: 600 }}>New Salary</Typography>
                            <Typography sx={{ color: '#0f172a', fontSize: '1.25rem', fontWeight: 800 }}>{formatCurrencyDecimal(record.newSalary)}</Typography>
                        </Box>
                    </Stack>
                    <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
                        <Typography sx={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>Difference</Typography>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <Typography sx={{ color: '#16a34a', fontSize: '1rem', fontWeight: 700 }}>+{formatCurrencyDecimal(record.incrementAmount)}</Typography>
                            <Chip label={`${record.incrementPercentage}%`} size="small" sx={{ height: 20, fontSize: '0.75rem', fontWeight: 700, bgcolor: '#dcfce7', color: '#15803d' }} />
                        </Box>
                    </Box>
                </Box>

                <Box>
                    <DetailRow label="Effective Date" value={dayjs(record.effectiveDate).format('DD MMM YYYY')} isHighlight />
                    <DetailRow label="Added On" value={dayjs(record.createdAt).format('DD MMM YYYY')} />
                </Box>
            </Modal.Body>
            <Modal.Footer style={{ borderTop: 'none', padding: '16px 24px' }}>
                <Button variant="light" onClick={onHide} style={{ fontWeight: 600, color: '#475569' }}>
                    Close
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default IncrementDetailDialog;
