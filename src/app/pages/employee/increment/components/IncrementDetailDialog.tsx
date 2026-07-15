import React from 'react';
import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Stack,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import dayjs from 'dayjs';
import { IncrementRecord } from '@services/incrementService';
import { formatCurrencyDecimal } from '@utils/currency';
import { T } from '@app/modules/common/components/ui/tokens';

interface DialogProps {
    open: boolean;
    onClose: () => void;
    record: IncrementRecord | null;
    employeeName: string;
}

const DetailRow = ({ label, value, isHighlight = false }: { label: string; value: React.ReactNode; isHighlight?: boolean }) => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1.5, borderBottom: `1px solid ${T.color.lineSoft}` }}>
        <Typography sx={{ color: T.color.inkSoft, fontSize: '0.9rem', fontWeight: 600 }}>{label}</Typography>
        <Typography sx={{ color: isHighlight ? T.color.ink : T.color.inkSoft, fontSize: '0.95rem', fontWeight: isHighlight ? 700 : 500 }}>
            {value}
        </Typography>
    </Box>
);

const IncrementDetailDialog = ({ open, onClose, record, employeeName }: DialogProps) => (
    <Dialog
        open={open && !!record}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: `${T.radius.lg}px`, boxShadow: T.shadow.modal } }}
    >
        <DialogTitle sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderBottom: `1px solid ${T.color.line}`, px: 3, py: 2.25,
        }}>
            <Typography component="span" sx={{ fontWeight: 700, fontSize: '1.15rem', color: T.color.ink }}>
                Increment Details
            </Typography>
            <IconButton size="small" onClick={onClose} sx={{ color: T.color.inkSoft }}>
                <CloseIcon fontSize="small" />
            </IconButton>
        </DialogTitle>

        {record && (
            <DialogContent sx={{ px: 3, pt: '20px !important', pb: 2 }}>
                <Box sx={{ mb: 3 }}>
                    <Typography sx={{ color: T.color.inkSoft, fontSize: '0.85rem', mb: 0.5 }}>Employee</Typography>
                    <Typography sx={{ color: T.color.ink, fontSize: '1.1rem', fontWeight: 700 }}>{employeeName}</Typography>
                </Box>

                <Box sx={{ bgcolor: T.color.panel, p: 2, borderRadius: `${T.radius.md}px`, mb: 3 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Box>
                            <Typography sx={{ color: T.color.inkSoft, fontSize: '0.8rem', mb: 0.5, fontWeight: 600 }}>Previous</Typography>
                            <Typography sx={{ color: T.color.inkSoft, fontSize: '1.1rem', fontWeight: 600 }}>
                                {formatCurrencyDecimal(record.previousSalary)}
                            </Typography>
                        </Box>
                        <Box sx={{ color: T.color.inkFaint }}>→</Box>
                        <Box textAlign="right">
                            <Typography sx={{ color: T.color.inkSoft, fontSize: '0.8rem', mb: 0.5, fontWeight: 600 }}>New Salary</Typography>
                            <Typography sx={{ color: T.color.ink, fontSize: '1.25rem', fontWeight: 800 }}>
                                {formatCurrencyDecimal(record.newSalary)}
                            </Typography>
                        </Box>
                    </Stack>
                    <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${T.color.line}`, display: 'flex', justifyContent: 'space-between' }}>
                        <Typography sx={{ color: T.color.inkSoft, fontSize: '0.85rem', fontWeight: 600 }}>Difference</Typography>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <Typography sx={{ color: T.color.success, fontSize: '1rem', fontWeight: 700 }}>
                                +{formatCurrencyDecimal(record.incrementAmount)}
                            </Typography>
                            <Chip
                                label={`${record.incrementPercentage}%`}
                                size="small"
                                sx={{
                                    height: 20, fontSize: '0.75rem', fontWeight: 700,
                                    bgcolor: T.color.successSoft, color: T.color.success,
                                }}
                            />
                        </Box>
                    </Box>
                </Box>

                <Box>
                    <DetailRow label="Effective Date" value={dayjs(record.effectiveDate).format('DD MMM YYYY')} isHighlight />
                    <DetailRow label="Added On" value={dayjs(record.createdAt).format('DD MMM YYYY')} />
                </Box>
            </DialogContent>
        )}

        <DialogActions sx={{ px: 3, py: 1.75 }}>
            <Button onClick={onClose} sx={{ textTransform: 'none', fontWeight: 600, color: T.color.inkSoft }}>
                Close
            </Button>
        </DialogActions>
    </Dialog>
);

export default IncrementDetailDialog;
