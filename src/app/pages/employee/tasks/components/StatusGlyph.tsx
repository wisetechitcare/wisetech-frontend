import React from 'react';
import { Box, keyframes } from '@mui/material';

/** The glyphs a task stage can show — `TaskStatus.icon`. Anything else draws the default. */
export const STATUS_ICONS = ['in_progress', 'completed', 'on_hold', 'cancelled'] as const;
export type StatusIcon = (typeof STATUS_ICONS)[number];

export const STATUS_ICON_LABELS: Record<StatusIcon | 'default', string> = {
    in_progress: 'In progress',
    completed: 'Completed',
    on_hold: 'On hold',
    cancelled: 'Cancelled',
    default: 'Default',
};

const spin = keyframes`to { transform: rotate(360deg); }`;
const draw = keyframes`from { stroke-dashoffset: 24; } to { stroke-dashoffset: 0; }`;
const breathe = keyframes`0%, 100% { opacity: 1; } 50% { opacity: .35; }`;
const ripple = keyframes`0% { transform: scale(.6); opacity: .7; } 100% { transform: scale(1.5); opacity: 0; }`;
const pop = keyframes`0% { transform: scale(.7); } 60% { transform: scale(1.08); } 100% { transform: scale(1); }`;

/**
 * A stage's animated glyph — one motion per meaning, so the state reads before the label does:
 * in progress turns, completed ticks itself in, on hold breathes, cancelled crosses itself out,
 * and any other stage (a lane a project added) pulses gently. Motion stops entirely for anyone
 * who asks the system for reduced motion; the shapes alone still say it.
 */
const StatusGlyph: React.FC<{ icon?: string | null; color: string; size?: number }> = ({ icon, color, size = 28 }) => {
    const kind: StatusIcon | 'default' = (STATUS_ICONS as readonly string[]).includes(icon ?? '') ? (icon as StatusIcon) : 'default';
    const stroke = { fill: 'none', stroke: color, strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
    const drawIn = { strokeDasharray: 24, animation: `${draw} .7s ease-out both` };

    return (
        <Box
            component="svg"
            viewBox="0 0 24 24"
            width={size}
            height={size}
            aria-label={STATUS_ICON_LABELS[kind]}
            role="img"
            sx={{
                display: 'block',
                overflow: 'visible',
                '& .g-spin': { transformOrigin: '12px 12px', animation: `${spin} 1.4s linear infinite` },
                '& .g-bar': { animation: `${breathe} 1.6s ease-in-out infinite` },
                '& .g-bar2': { animationDelay: '.8s' },
                '& .g-ripple': { transformOrigin: '12px 12px', animation: `${ripple} 2s ease-out infinite` },
                '& .g-pop': { transformOrigin: '12px 12px', animation: `${pop} .45s ease-out both` },
                '@media (prefers-reduced-motion: reduce)': { '& *': { animation: 'none !important' } },
            }}
        >
            {kind === 'in_progress' && (
                <>
                    <circle cx="12" cy="12" r="9" {...stroke} strokeOpacity={0.2} />
                    <path className="g-spin" d="M12 3a9 9 0 0 1 9 9" {...stroke} />
                    <circle cx="12" cy="12" r="2.2" fill={color} />
                </>
            )}
            {kind === 'completed' && (
                <g className="g-pop">
                    <circle cx="12" cy="12" r="9" {...stroke} />
                    <path d="M7.8 12.4l2.8 2.8 5.6-6" {...stroke} style={drawIn} />
                </g>
            )}
            {kind === 'on_hold' && (
                <>
                    <circle cx="12" cy="12" r="9" {...stroke} strokeOpacity={0.25} />
                    <rect className="g-bar" x="8.6" y="8" width="2.2" height="8" rx="1.1" fill={color} />
                    <rect className="g-bar g-bar2" x="13.2" y="8" width="2.2" height="8" rx="1.1" fill={color} />
                </>
            )}
            {kind === 'cancelled' && (
                <g className="g-pop">
                    <circle cx="12" cy="12" r="9" {...stroke} />
                    <path d="M9 9l6 6" {...stroke} style={drawIn} />
                    <path d="M15 9l-6 6" {...stroke} style={{ ...drawIn, animationDelay: '.2s' }} />
                </g>
            )}
            {kind === 'default' && (
                <>
                    <circle className="g-ripple" cx="12" cy="12" r="6" fill={color} fillOpacity={0.35} />
                    <circle cx="12" cy="12" r="4" fill={color} />
                </>
            )}
        </Box>
    );
};

export default StatusGlyph;
