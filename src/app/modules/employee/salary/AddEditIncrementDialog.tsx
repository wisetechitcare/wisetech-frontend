import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    TextField,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import dayjs, { Dayjs } from 'dayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { incrementService, IncrementRecord } from '@services/incrementService';
import { formatCurrencyRounded } from '@utils/currency';
import { T } from '@app/modules/common/components/ui/tokens';
import { toast, alertDialog } from '@app/modules/common/components/ui/feedback';

export interface AddEditIncrementDialogProps {
    open: boolean;
    onClose: () => void;
    employeeId: string;
    employeeName: string;
    /** When set, the dialog edits this record instead of creating a new one. */
    record?: IncrementRecord | null;
    /** Preloaded history for the previous-salary preview. When omitted, the dialog fetches it on open. */
    history?: IncrementRecord[];
    /** Called after a successful create/update — caller refetches its own data. */
    onSuccess?: () => void;
}

const fieldSx = {
    '& .MuiOutlinedInput-root': {
        backgroundColor: T.color.panel,
        borderRadius: `${T.radius.sm}px`,
        '& fieldset': { borderColor: T.color.line },
        '&:hover fieldset': { borderColor: T.color.inkFaint },
        '&.Mui-focused fieldset': { borderColor: T.color.brand },
    },
};

const AddEditIncrementDialog: React.FC<AddEditIncrementDialogProps> = ({
    open,
    onClose,
    employeeId,
    employeeName,
    record = null,
    history,
    onSuccess,
}) => {
    const isEdit = !!record;

    const [newSalary, setNewSalary] = useState('');
    const [selectedDate, setSelectedDate] = useState<Dayjs | null>(dayjs().startOf('month'));
    const [touched, setTouched] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [fetchedHistory, setFetchedHistory] = useState<IncrementRecord[]>([]);

    // Reset form each time the dialog opens
    useEffect(() => {
        if (open) {
            setNewSalary(record ? String(record.newSalary) : '');
            setSelectedDate(record ? dayjs(record.effectiveDate) : dayjs().startOf('month'));
            setTouched(false);
            setSubmitting(false);
        }
    }, [open, record]);

    // Only fetch history when the caller didn't preload it (SalaryReport path)
    useEffect(() => {
        if (open && !history && employeeId) {
            incrementService
                .fetchIncrementHistory(employeeId)
                .then(setFetchedHistory)
                .catch(() => setFetchedHistory([]));
        }
    }, [open, history, employeeId]);

    const effectiveHistory = history ?? fetchedHistory;

    /** Active salary as of the selected month, excluding the record being edited. */
    const previousSalary = useMemo(() => {
        if (!selectedDate) return 0;
        const target = selectedDate.endOf('month').valueOf();
        const active = effectiveHistory
            .filter(r => r.id !== record?.id)
            .filter(r => dayjs(r.effectiveDate).startOf('day').valueOf() <= target)
            .sort((a, b) => dayjs(b.effectiveDate).valueOf() - dayjs(a.effectiveDate).valueOf())[0];
        return active?.newSalary ?? 0;
    }, [effectiveHistory, selectedDate, record]);

    const minDate = dayjs().subtract(5, 'year').startOf('month');
    const isBackdated = !!selectedDate && selectedDate.isBefore(dayjs().startOf('month'), 'month');
    const isFuture = !!selectedDate && selectedDate.isAfter(dayjs().endOf('month'), 'month');

    const salaryNum = Number(newSalary);
    const salaryError = touched && (!newSalary || isNaN(salaryNum) || salaryNum <= 0);
    const dateError = touched && (!selectedDate || !selectedDate.isValid());
    const isValid = !!newSalary && !isNaN(salaryNum) && salaryNum > 0 && !!selectedDate && selectedDate.isValid();

    const incrementAmt = salaryNum - previousSalary;
    const incrementPct = previousSalary > 0 ? Number(((incrementAmt / previousSalary) * 100).toFixed(2)) : 0;
    const showPreview = isValid && previousSalary > 0;
    const previewTone = incrementAmt >= 0
        ? { fg: T.color.success, soft: T.color.successSoft }
        : { fg: T.color.danger, soft: T.color.dangerSoft };

    const handleSubmit = async () => {
        setTouched(true);
        if (!isValid || !selectedDate) return;

        setSubmitting(true);
        const payload: Partial<IncrementRecord> = {
            effectiveDate: selectedDate.startOf('month').format('YYYY-MM-DD'),
            newSalary: salaryNum,
        };

        try {
            if (isEdit && record) {
                await incrementService.updateIncrement(employeeId, record.id, payload);
            } else {
                await incrementService.createIncrement(employeeId, payload);
            }
            toast({ icon: 'success', title: isEdit ? 'Increment updated' : 'Increment added' });
            onSuccess?.();
            onClose();
        } catch (error: any) {
            alertDialog({
                icon: 'error',
                title: isEdit ? 'Failed to update increment' : 'Failed to add increment',
                text: error?.response?.data?.message || error?.message || 'Something went wrong. Please try again.',
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={submitting ? undefined : onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{ sx: { borderRadius: `${T.radius.lg}px`, boxShadow: T.shadow.modal } }}
        >
            <DialogTitle sx={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderBottom: `1px solid ${T.color.line}`, px: 3, py: 2.25,
            }}>
                <Typography component="span" sx={{ fontWeight: 700, fontSize: '1.1rem', color: T.color.ink }}>
                    {isEdit ? 'Edit Increment' : 'Add Increment'}
                </Typography>
                <IconButton size="small" onClick={onClose} disabled={submitting} sx={{ color: T.color.inkSoft }}>
                    <CloseIcon fontSize="small" />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ px: 3, pt: '20px !important', pb: 2 }}>
                <Box sx={{ mb: 2.5 }}>
                    <Typography sx={{
                        color: T.color.inkFaint, fontSize: '0.75rem', fontWeight: 600,
                        textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.3,
                    }}>
                        Employee
                    </Typography>
                    <Typography sx={{ color: T.color.ink, fontSize: '1rem', fontWeight: 700 }}>
                        {employeeName}
                    </Typography>
                </Box>

                <Typography sx={{ color: T.color.inkSoft, fontWeight: 600, fontSize: '0.85rem', mb: 1 }}>
                    Effective Month
                </Typography>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                        value={selectedDate}
                        onChange={(v) => setSelectedDate(v)}
                        views={['year', 'month']}
                        format="MMMM, YYYY"
                        minDate={minDate}
                        slotProps={{
                            textField: {
                                fullWidth: true,
                                error: dateError,
                                helperText: dateError ? 'Select a valid effective month' : undefined,
                                sx: fieldSx,
                            },
                        }}
                    />
                </LocalizationProvider>

                <Box sx={{ mt: 2 }}>
                    {isBackdated ? (
                        <Alert severity="warning" sx={{ borderRadius: `${T.radius.sm}px`, fontSize: '0.8rem' }}>
                            <strong>Backdated increment:</strong> salary for previous months from the selected
                            date will be updated automatically, and affected salary records will reflect the
                            revised amount.
                        </Alert>
                    ) : isFuture ? (
                        <Alert severity="info" sx={{ borderRadius: `${T.radius.sm}px`, fontSize: '0.8rem' }}>
                            Future increment — the new salary will apply automatically when this month arrives.
                        </Alert>
                    ) : (
                        <Alert severity="info" icon={false} sx={{ borderRadius: `${T.radius.sm}px`, fontSize: '0.8rem', bgcolor: T.color.panel, color: T.color.inkSoft }}>
                            Current month increment — takes effect immediately.
                        </Alert>
                    )}
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mt: 2.5, mb: 2.5 }}>
                    <TextField
                        label={selectedDate ? `Salary as of ${selectedDate.format('MMM YYYY')}` : 'Current Salary'}
                        value={previousSalary ? formatCurrencyRounded(previousSalary) : '—'}
                        disabled
                        fullWidth
                        sx={fieldSx}
                    />
                    <TextField
                        label="New Monthly Salary"
                        type="number"
                        value={newSalary}
                        onChange={(e) => setNewSalary(e.target.value)}
                        onBlur={() => setTouched(true)}
                        error={salaryError}
                        helperText={salaryError ? 'Enter a valid positive salary' : undefined}
                        placeholder="e.g. 20000"
                        fullWidth
                        sx={fieldSx}
                    />
                </Box>

                {showPreview && (
                    <Box sx={{
                        bgcolor: previewTone.soft,
                        border: `1px solid ${previewTone.fg}33`,
                        borderRadius: `${T.radius.sm}px`,
                        px: 1.75, py: 1.25,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                        <Typography sx={{ color: previewTone.fg, fontSize: '0.85rem', fontWeight: 600 }}>
                            {incrementAmt >= 0 ? 'Increment' : 'Reduction'}
                        </Typography>
                        <Typography sx={{ color: previewTone.fg, fontSize: '0.95rem', fontWeight: 800 }}>
                            {incrementAmt >= 0 ? '+' : '-'}{formatCurrencyRounded(Math.abs(incrementAmt))}
                            {' '}
                            <Typography component="span" sx={{ fontSize: '0.78rem', fontWeight: 600 }}>
                                ({incrementAmt >= 0 ? '+' : ''}{incrementPct}%)
                            </Typography>
                        </Typography>
                    </Box>
                )}
            </DialogContent>

            <DialogActions sx={{ borderTop: `1px solid ${T.color.lineSoft}`, px: 3, py: 1.75 }}>
                <Button
                    onClick={onClose}
                    disabled={submitting}
                    sx={{ textTransform: 'none', fontWeight: 600, color: T.color.inkSoft }}
                >
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={submitting || (touched && !isValid)}
                    sx={{
                        textTransform: 'none', fontWeight: 600,
                        bgcolor: T.color.brand,
                        '&:hover': { bgcolor: T.color.brandHover },
                        borderRadius: `${T.radius.sm}px`, px: 2.5,
                    }}
                >
                    {submitting ? 'Processing…' : isEdit ? 'Save Changes' : 'Create Increment'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default AddEditIncrementDialog;
