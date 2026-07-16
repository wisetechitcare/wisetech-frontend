import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import { T } from '@app/modules/common/components/ui/tokens';

/** Card shell shared by the increment panels — consistent border, radius and header. */
export const Panel = ({
    title,
    subtitle,
    children,
    footer,
    padded = true,
    sx = {},
}: {
    title?: string;
    subtitle?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    padded?: boolean;
    sx?: object;
}) => (
    <Paper
        elevation={0}
        sx={{
            borderRadius: `${T.radius.lg}px`,
            border: `1px solid ${T.color.line}`,
            boxShadow: T.shadow.card,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            ...sx,
        }}
    >
        {title && (
            <Box sx={{ px: 2.5, pt: 2.5, pb: 1.5 }}>
                <Typography sx={{ color: T.color.ink, fontSize: '0.95rem', fontWeight: 800 }}>{title}</Typography>
                {subtitle && (
                    <Typography sx={{ color: T.color.inkFaint, fontSize: '0.78rem', mt: 0.2 }}>{subtitle}</Typography>
                )}
            </Box>
        )}
        <Box sx={{ flex: 1, px: padded ? 2.5 : 0, pb: padded ? 2.5 : 0 }}>{children}</Box>
        {footer && (
            <Box sx={{
                px: 2.5, py: 1.25,
                borderTop: `1px solid ${T.color.lineSoft}`,
                bgcolor: T.color.panel,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
                {footer}
            </Box>
        )}
    </Paper>
);

/** Small key/value pair used inside Panel footers. */
export const FooterStat = ({ label, value, blur = false }: { label: string; value: React.ReactNode; blur?: boolean }) => (
    <>
        <Typography sx={{
            color: T.color.inkFaint, fontSize: '0.72rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.04em',
        }}>
            {label}
        </Typography>
        <Typography sx={{
            color: T.color.ink, fontSize: '0.88rem', fontWeight: 800,
            filter: blur ? 'blur(4px)' : 'none',
        }}>
            {value}
        </Typography>
    </>
);

/** Empty state for panels with no data — follows the entity module's widgets pattern. */
export const EmptyState = ({
    title,
    subtitle,
    icon,
}: {
    title: string;
    subtitle?: string;
    icon?: React.ReactNode;
}) => (
    <Box sx={{ py: 6, px: 3, textAlign: 'center' }}>
        <Box sx={{
            width: 44, height: 44, borderRadius: `${T.radius.md}px`,
            bgcolor: T.color.panel, color: T.color.inkFaint,
            display: 'grid', placeItems: 'center', mx: 'auto', mb: 1.5,
        }}>
            {icon ?? <InsightsOutlinedIcon sx={{ fontSize: 22 }} />}
        </Box>
        <Typography sx={{ color: T.color.ink, fontSize: '0.92rem', fontWeight: 700 }}>{title}</Typography>
        {subtitle && (
            <Typography sx={{ color: T.color.inkSoft, fontSize: '0.8rem', mt: 0.5 }}>{subtitle}</Typography>
        )}
    </Box>
);
