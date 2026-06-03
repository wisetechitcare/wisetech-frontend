import { Box, LinearProgress, Paper, Stack, Typography } from '@mui/material';

interface PaymentProgressCardProps {
    title?: string;
    subtitle?: string;
    percentPaid: number;
    paidAmount: string;
    remainingAmount: string;
}

const legend = [
    { label: 'Paid', color: '#3b82f6' }, // Modern Blue
    { label: 'Remaining', color: '#f59e0b' }, // Modern Amber/Orange
];

const PaymentProgressCard = ({ title, subtitle, percentPaid, paidAmount, remainingAmount }: PaymentProgressCardProps) => {
    const normalized = Math.max(0, Math.min(100, Number.isFinite(percentPaid) ? percentPaid : 0));

    return (
        <Paper
            elevation={0}
            sx={{
                p: { xs: 2.5, md: 3 },
                borderRadius: '20px',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -4px rgba(0, 0, 0, 0.05)',
                },
            }}
        >
            <Typography sx={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                {title || 'Payment Progress'}
            </Typography>
            <Typography sx={{ mt: 0.5, fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>
                {subtitle || 'Your salary payments for this financial year.'}
            </Typography>

            <Box sx={{ mt: 4, mb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                    <Typography sx={{ fontSize: '2.5rem', fontWeight: 900, color: '#0f172a', lineHeight: 0.8 }}>
                        {normalized}%
                    </Typography>
                    <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: '#3b82f6' }}>
                        Paid
                    </Typography>
                </Box>
                <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>
                    {normalized}% Completed
                </Typography>
            </Box>

            <LinearProgress
                variant="determinate"
                value={normalized}
                sx={{
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: '#ffe4e6', // Soft pink/red for remaining
                    '& .MuiLinearProgress-bar': {
                        borderRadius: 6,
                        backgroundColor: '#3b82f6', // Solid blue for paid (matching the image)
                    },
                }}
            />

            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: 2,
                    mt: 3,
                }}
            >
                {/* Paid Box */}
                <Box
                    sx={{
                        p: 2,
                        borderRadius: '12px',
                        backgroundColor: '#f8fafc',
                        border: '1px solid #dbeafe', // Light blue border
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                    }}
                >
                    <Typography sx={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, mb: 0.5 }}>
                        Paid
                    </Typography>
                    <Typography sx={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                        {paidAmount}
                    </Typography>
                </Box>

                {/* Remaining Box */}
                <Box
                    sx={{
                        p: 2,
                        borderRadius: '12px',
                        backgroundColor: '#fff1f2', // Light red background
                        border: '1px solid #fecaca', // Light red border
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                    }}
                >
                    <Typography sx={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, mb: 0.5 }}>
                        Remaining
                    </Typography>
                    <Typography sx={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                        {remainingAmount}
                    </Typography>
                </Box>
            </Box>

            <Stack direction="row" spacing={2} sx={{ mt: 'auto', pt: 3 }}>
                {legend.map((item) => (
                    <Stack key={item.label} direction="row" spacing={1} alignItems="center">
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: item.color }} />
                        <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>
                            {item.label}
                        </Typography>
                    </Stack>
                ))}
            </Stack>
        </Paper>
    );
};

export default PaymentProgressCard;