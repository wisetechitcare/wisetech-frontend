import React from 'react';

interface DateSelectorProps {
    onPrevious: () => void;
    onNext: () => void;
    displayValue: React.ReactNode;
    disableNext?: boolean;
    nextDisabledMessage?: string;
    className?: string;
}

const DateSelector: React.FC<DateSelectorProps> = ({
    onPrevious,
    onNext,
    displayValue,
    disableNext = false,
    nextDisabledMessage = "Cannot view future dates",
    className = ""
}) => {
    return (
        <div
            className={`d-inline-flex align-items-center ${className}`}
            style={{
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                background: '#f9fafb',
                overflow: 'hidden',
                height: 28,
            }}
        >
            <button
                onClick={onPrevious}
                style={{
                    width: 26, height: '100%', border: 'none', borderRight: '1px solid #e5e7eb',
                    background: 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', padding: 0, flexShrink: 0,
                    color: '#9ca3af', transition: 'all 0.12s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.color = '#374151'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9ca3af'; }}
            >
                <i className="bi bi-chevron-left" style={{ fontSize: 10, lineHeight: 1 }} />
            </button>

            <span style={{
                fontSize: 12, fontWeight: 600, color: '#374151',
                padding: '0 10px', textAlign: 'center', letterSpacing: '-0.01em',
                whiteSpace: 'nowrap', userSelect: 'none',
            }}>
                {displayValue}
            </span>

            <button
                onClick={onNext}
                disabled={disableNext}
                title={disableNext ? nextDisabledMessage : ''}
                style={{
                    width: 26, height: '100%', border: 'none', borderLeft: '1px solid #e5e7eb',
                    background: 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: disableNext ? 'not-allowed' : 'pointer', padding: 0, flexShrink: 0,
                    color: disableNext ? '#d1d5db' : '#9ca3af', transition: 'all 0.12s ease',
                }}
                onMouseEnter={e => { if (!disableNext) { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.color = '#374151'; } }}
                onMouseLeave={e => { if (!disableNext) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9ca3af'; } }}
            >
                <i className="bi bi-chevron-right" style={{ fontSize: 10, lineHeight: 1 }} />
            </button>
        </div>
    );
};

export default DateSelector;
