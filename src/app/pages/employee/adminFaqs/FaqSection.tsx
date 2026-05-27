import React, { useState } from 'react';

interface FaqSectionProps {
    title: string;
    children: React.ReactNode;
    defaultExpanded?: boolean;
    badge?: number;
}

const FaqSection: React.FC<FaqSectionProps> = ({
    title,
    children,
    defaultExpanded = true,
    badge,
}) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    return (
        <div
            style={{
                backgroundColor: '#fff',
                borderRadius: '12px',
                border: '1px solid #f1f1f1',
                marginBottom: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                overflow: 'hidden',
            }}
        >
            {/* Section header */}
            <div
                className="d-flex align-items-center justify-content-between"
                onClick={() => setIsExpanded((v) => !v)}
                style={{
                    cursor: 'pointer',
                    padding: '20px 24px',
                    userSelect: 'none',
                    borderBottom: isExpanded ? '1px solid #f3f4f6' : 'none',
                    transition: 'border-bottom 0.15s ease',
                }}
            >
                <div className="d-flex align-items-center gap-3">
                    <h3
                        style={{
                            fontSize: '16px',
                            fontWeight: 700,
                            color: '#111827',
                            margin: 0,
                            letterSpacing: '-0.01em',
                        }}
                    >
                        {title}
                    </h3>
                    {badge !== undefined && badge > 0 && (
                        <span
                            style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                color: '#6b7280',
                                background: '#f3f4f6',
                                border: '1px solid #e5e7eb',
                                borderRadius: '20px',
                                padding: '1px 8px',
                            }}
                        >
                            {badge}
                        </span>
                    )}
                </div>
                {/* Chevron */}
                <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    style={{
                        flexShrink: 0,
                        color: '#9ca3af',
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.22s ease',
                    }}
                >
                    <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </div>

            {/* Collapsible body — CSS grid trick for smooth animation */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateRows: isExpanded ? '1fr' : '0fr',
                    transition: 'grid-template-rows 0.22s ease',
                }}
            >
                <div style={{ overflow: 'hidden' }}>
                    <div style={{ padding: isExpanded ? '20px 24px' : '0 24px' }}>
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FaqSection;
