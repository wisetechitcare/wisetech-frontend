import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

const AllTime = ({
    fromAdmin = false,
    showSensitiveData,
    year,
}: {
    fromAdmin?: boolean;
    showSensitiveData: boolean;
    year: any;
}) => {
    const isHidden = !showSensitiveData;
    const label = fromAdmin ? 'All Time Salary Insights' : 'All Time Salary Insights';

    return (
        <Paper
            elevation={0}
            sx={{
                mt: 3,
                p: { xs: 2.5, md: 3 },
                borderRadius: '20px',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Box
                    sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '12px',
                        display: 'grid',
                        placeItems: 'center',
                        backgroundColor: '#eff6ff',
                        color: '#2563eb',
                        border: '1px solid #dbeafe',
                        flexShrink: 0,
                    }}
                >
                    <TrendingUpIcon fontSize="small" />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                        {label}
                    </Typography>
                    <Typography sx={{ fontSize: '0.85rem', color: '#64748b' }}>
                        Increment graph will be added in a future release
                    </Typography>
                </Box>
            </Box>

            <Box
                sx={{
                    minHeight: { xs: 180, md: 240 },
                    borderRadius: '16px',
                    border: '1px dashed #cbd5e1',
                    background: 'linear-gradient(180deg, #f8fbff 0%, #ffffff 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    px: 3,
                }}
            >
                <Box>
                    <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', mb: 0.5 }}>
                        Coming Soon
                    </Typography>
                    <Typography sx={{ fontSize: '0.85rem', color: '#64748b' }}>
                        We&apos;re preparing the all-time increment timeline for a future update.
                    </Typography>
                    <Typography sx={{ fontSize: '0.8rem', color: '#94a3b8', mt: 1 }}>
                        {year ? `Selected year: ${year.format ? year.format('YYYY') : year}` : ''}
                    </Typography>
                    {isHidden && (
                        <Typography sx={{ fontSize: '0.8rem', color: '#94a3b8', mt: 0.5 }}>
                            Sensitive data is hidden
                        </Typography>
                    )}
                </Box>
            </Box>
        </Paper>
    );
};

export default AllTime;
