import { Skeleton as MuiSkeleton } from '@mui/material';

// ─── Base block ───────────────────────────────────────────────────────────────

interface SkeletonBlockProps {
    width?: string | number;
    height?: number;
    radius?: number;
    className?: string;
    style?: React.CSSProperties;
}

export const SkeletonBlock = ({
    width = '100%',
    height = 16,
    radius = 6,
    className = '',
    style,
}: SkeletonBlockProps) => (
    <MuiSkeleton
        variant="rounded"
        width={width}
        height={height}
        className={className}
        sx={{ borderRadius: `${radius}px`, bgcolor: '#f1f5f9', ...style }}
    />
);

// ─── KPI / stat card ──────────────────────────────────────────────────────────

interface SkeletonKpiCardProps {
    iconSize?: number;
    style?: React.CSSProperties;
}

export const SkeletonKpiCard = ({ iconSize = 40, style }: SkeletonKpiCardProps) => (
    <div
        style={{
            background: '#fff',
            border: '1px solid #e5e8ed',
            borderRadius: 12,
            padding: 16,
            ...style,
        }}
    >
        <SkeletonBlock width={iconSize} height={iconSize} radius={10} style={{ marginBottom: 10 }} />
        <SkeletonBlock width="55%" height={12} style={{ marginBottom: 6 }} />
        <SkeletonBlock width="75%" height={20} />
    </div>
);

// ─── Table ────────────────────────────────────────────────────────────────────

interface SkeletonTableProps {
    rows?: number;
    cols?: number;
    showHeader?: boolean;
    showTitle?: boolean;
    style?: React.CSSProperties;
}

export const SkeletonTable = ({
    rows = 4,
    cols = 5,
    showHeader = true,
    showTitle = false,
    style,
}: SkeletonTableProps) => (
    <div
        style={{
            background: '#fff',
            border: '1px solid #e5e8ed',
            borderRadius: 12,
            overflow: 'hidden',
            ...style,
        }}
    >
        {showTitle && (
            <div
                style={{
                    padding: '14px 20px',
                    borderBottom: '1px solid #e5e8ed',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}
            >
                <SkeletonBlock width={160} height={18} />
                <SkeletonBlock width={96} height={32} radius={8} />
            </div>
        )}
        {showHeader && (
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${cols}, 1fr)`,
                    gap: 12,
                    padding: '10px 16px',
                    background: '#f8fafc',
                    borderBottom: '1px solid #e5e8ed',
                }}
            >
                {Array.from({ length: cols }).map((_, i) => (
                    <SkeletonBlock key={i} height={12} />
                ))}
            </div>
        )}
        {Array.from({ length: rows }).map((_, r) => (
            <div
                key={r}
                style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${cols}, 1fr)`,
                    gap: 12,
                    padding: '12px 16px',
                    borderBottom: '1px solid #f1f5f9',
                }}
            >
                {Array.from({ length: cols }).map((_, c) => (
                    <SkeletonBlock key={c} height={14} width={c === 0 ? '90%' : '70%'} />
                ))}
            </div>
        ))}
    </div>
);

// ─── Form field ───────────────────────────────────────────────────────────────

interface SkeletonFormFieldProps {
    labelWidth?: string | number;
    style?: React.CSSProperties;
}

export const SkeletonFormField = ({ labelWidth = '40%', style }: SkeletonFormFieldProps) => (
    <div style={style}>
        <SkeletonBlock width={labelWidth} height={12} style={{ marginBottom: 6 }} />
        <SkeletonBlock height={36} radius={8} />
    </div>
);

// ─── Form (multiple fields) ───────────────────────────────────────────────────

interface SkeletonFormProps {
    fields?: number;
    cols?: number;
    showTitle?: boolean;
    showAction?: boolean;
    style?: React.CSSProperties;
}

export const SkeletonForm = ({
    fields = 4,
    cols = 2,
    showTitle = true,
    showAction = false,
    style,
}: SkeletonFormProps) => (
    <div style={{ padding: '8px 0', ...style }}>
        {showTitle && (
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 20,
                }}
            >
                <SkeletonBlock width={180} height={18} />
                {showAction && <SkeletonBlock width={110} height={32} radius={8} />}
            </div>
        )}
        {Array.from({ length: fields }).map((_, i) => (
            <div
                key={i}
                style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${cols}, 1fr)`,
                    gap: 12,
                    marginBottom: 14,
                }}
            >
                {Array.from({ length: cols }).map((_, c) => (
                    <SkeletonFormField key={c} />
                ))}
            </div>
        ))}
    </div>
);

// ─── Text lines ───────────────────────────────────────────────────────────────

interface SkeletonTextProps {
    lines?: number;
    lastLineWidth?: string;
    style?: React.CSSProperties;
}

export const SkeletonText = ({ lines = 3, lastLineWidth = '60%', style }: SkeletonTextProps) => (
    <div style={style}>
        {Array.from({ length: lines }).map((_, i) => (
            <SkeletonBlock
                key={i}
                height={14}
                width={i === lines - 1 ? lastLineWidth : '100%'}
                style={{ marginBottom: i < lines - 1 ? 8 : 0 }}
            />
        ))}
    </div>
);

// ─── List rows (avatar + text) ────────────────────────────────────────────────

interface SkeletonListProps {
    items?: number;
    showAvatar?: boolean;
    style?: React.CSSProperties;
}

export const SkeletonList = ({ items = 5, showAvatar = false, style }: SkeletonListProps) => (
    <div style={style}>
        {Array.from({ length: items }).map((_, i) => (
            <div
                key={i}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 0',
                    borderBottom: i < items - 1 ? '1px solid #f1f5f9' : 'none',
                }}
            >
                {showAvatar && (
                    <MuiSkeleton variant="circular" width={36} height={36} sx={{ flexShrink: 0, bgcolor: '#f1f5f9' }} />
                )}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <SkeletonBlock width="55%" height={13} />
                    <SkeletonBlock width="35%" height={11} />
                </div>
                <SkeletonBlock width={60} height={22} radius={11} />
            </div>
        ))}
    </div>
);

// ─── Card with inner text ─────────────────────────────────────────────────────

interface SkeletonCardProps {
    titleWidth?: string | number;
    lines?: number;
    showFooter?: boolean;
    style?: React.CSSProperties;
}

export const SkeletonCard = ({
    titleWidth = '50%',
    lines = 2,
    showFooter = false,
    style,
}: SkeletonCardProps) => (
    <div
        style={{
            background: '#fff',
            border: '1px solid #e5e8ed',
            borderRadius: 12,
            padding: 20,
            ...style,
        }}
    >
        <SkeletonBlock width={titleWidth} height={18} style={{ marginBottom: 14 }} />
        <SkeletonText lines={lines} />
        {showFooter && (
            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                <SkeletonBlock width={80} height={32} radius={8} />
                <SkeletonBlock width={80} height={32} radius={8} />
            </div>
        )}
    </div>
);
