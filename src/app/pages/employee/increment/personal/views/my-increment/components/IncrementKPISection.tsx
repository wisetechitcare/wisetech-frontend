import React from 'react';
import { Box, Paper, Typography, Skeleton } from '@mui/material';

type Tone = 'blue' | 'green' | 'purple' | 'orange' | 'cyan' | 'rose' | 'indigo';
type FooterTone = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

export interface KPICardConfig {
    label: string;
    value: string;
    subValue?: string;          // secondary small value below main
    icon: React.ReactNode;
    tone: Tone;
    footer?: string;            // left-side footer label
    footerValue?: string;       // right-side footer value
    footerTone?: FooterTone;    // colour of footer strip
    isSensitive?: boolean;
    showSensitiveData?: boolean;
}

interface KPISectionProps {
    cards: KPICardConfig[];
    loading: boolean;
    skeletonCount?: number;
    columns?: number;
}

const toneMap: Record<Tone, { color: string; bg: string; border: string; light: string }> = {
    blue:   { color: '#2563eb', bg: '#eff6ff', border: '#dbeafe', light: '#f0f7ff' },
    green:  { color: '#16a34a', bg: '#f0fdf4', border: '#dcfce7', light: '#f0fdf4' },
    purple: { color: '#7c3aed', bg: '#f5f3ff', border: '#ede9fe', light: '#faf5ff' },
    orange: { color: '#ea580c', bg: '#fff7ed', border: '#ffedd5', light: '#fff7ed' },
    cyan:   { color: '#0891b2', bg: '#ecfeff', border: '#cffafe', light: '#ecfeff' },
    rose:   { color: '#AA393D', bg: '#fff1f2', border: '#fecdd3', light: '#fff8f8' },
    indigo: { color: '#4338ca', bg: '#eef2ff', border: '#e0e7ff', light: '#eef2ff' },
};

const footerToneMap: Record<FooterTone, { color: string; bg: string; border: string }> = {
    success: { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
    warning: { color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
    danger:  { color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
    neutral: { color: '#475569', bg: '#f8fafc', border: '#e2e8f0' },
    info:    { color: '#0891b2', bg: '#ecfeff', border: '#cffafe' },
};

const MetricCard = ({
    label, value, subValue, icon, tone,
    footer, footerValue, footerTone = 'neutral',
    isSensitive, showSensitiveData = true,
}: KPICardConfig) => {
    const palette = toneMap[tone];
    const fp = footerToneMap[footerTone];
    const blur = isSensitive && !showSensitiveData;
    const hasFooter = !!footer;

    return (
        <Box
            className="card h-100 overflow-hidden position-relative"
            style={{
                backgroundColor: '#ffffff',
                border: `1px solid ${palette.border}`,
                borderRadius: '14px',
                boxShadow: '0 1px 3px rgba(15,23,42,0.05)',
            }}
        >
            <div className="card-body p-0 d-flex flex-column" style={{ padding: 0 }}>
                {/* Main content */}
                <div style={{ padding: '14px 16px', flex: 1 }}>
                    {/* Icon + label */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: 9,
                            display: 'grid', placeItems: 'center',
                            color: palette.color, backgroundColor: palette.bg,
                            border: `1px solid ${palette.border}`,
                            flexShrink: 0,
                        }}>
                            {icon}
                        </div>
                        <span style={{
                            color: '#94a3b8', fontWeight: 700, fontSize: '0.67rem',
                            textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1.3,
                        }}>
                            {label}
                        </span>
                    </div>

                    {/* Value */}
                    <div style={{
                        color: '#0f172a', fontSize: '1.35rem', fontWeight: 900, lineHeight: 1.1,
                        filter: blur ? 'blur(6px)' : 'none',
                        userSelect: blur ? 'none' : 'auto',
                        marginBottom: subValue ? 2 : 0,
                    }}>
                        {value}
                    </div>

                    {/* Sub value */}
                    {subValue && (
                        <div style={{
                            color: '#64748b', fontSize: '0.78rem', fontWeight: 600, marginTop: 3,
                            filter: blur ? 'blur(4px)' : 'none',
                        }}>
                            {subValue}
                        </div>
                    )}
                </div>

                {/* Footer strip */}
                {hasFooter && (
                    <div style={{
                        backgroundColor: fp.bg,
                        borderTop: `1px solid ${fp.border}`,
                        padding: '6px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        minHeight: 32,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{
                                width: 6, height: 6, borderRadius: '50%',
                                backgroundColor: fp.color, flexShrink: 0,
                            }} />
                            <span style={{ color: fp.color, fontSize: '0.72rem', fontWeight: 700 }}>
                                {footer}
                            </span>
                        </div>
                        {footerValue && (
                            <span style={{ color: fp.color, fontSize: '0.72rem', fontWeight: 800 }}>
                                {footerValue}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </Box>
    );
};

const IncrementKPISection = ({ cards, loading, skeletonCount, columns }: KPISectionProps) => {
    const count = skeletonCount ?? cards.length;
    const cols = columns ?? (count <= 3 ? count : count <= 4 ? 4 : count <= 6 ? 3 : 4);
    const smCols = Math.min(cols, 3);

    if (loading) {
        return (
            <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr 1fr', sm: `repeat(${smCols}, 1fr)`, lg: `repeat(${cols}, 1fr)` },
                gap: 1.25, mb: 3,
            }}>
                {Array.from({ length: count }).map((_, i) => (
                    <Skeleton key={i} variant="rounded" height={90} sx={{ borderRadius: '14px' }} />
                ))}
            </Box>
        );
    }

    return (
        <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr 1fr', sm: `repeat(${smCols}, 1fr)`, lg: `repeat(${cols}, 1fr)` },
            gap: 1.25, mb: 3,
        }}>
            {cards.map((card, idx) => (
                <MetricCard key={idx} {...card} />
            ))}
        </Box>
    );
};

export default IncrementKPISection;
