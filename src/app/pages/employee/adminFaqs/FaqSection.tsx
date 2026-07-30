import React, { useEffect, useId, useRef, useState } from 'react';

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
    const panelId = useId();
    const panelRef = useRef<HTMLDivElement>(null);

    // When collapsed, take the panel out of the tab order + accessibility tree so
    // its (height:0) contents aren't focusable/announced — set via ref so it works
    // regardless of the React version's `inert` prop support. (WCAG 2.4.3 / 4.1.2)
    useEffect(() => {
        const el = panelRef.current;
        if (el) (el as unknown as { inert: boolean }).inert = !isExpanded;
    }, [isExpanded]);

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
            {/* Section header — a real button so it is keyboard-operable + announces
                its expanded state. */}
            <button
                type="button"
                className="d-flex align-items-center justify-content-between w-100"
                onClick={() => setIsExpanded((v) => !v)}
                aria-expanded={isExpanded}
                aria-controls={panelId}
                style={{
                    cursor: 'pointer',
                    padding: '20px 24px',
                    userSelect: 'none',
                    borderBottom: isExpanded ? '1px solid #f3f4f6' : 'none',
                    transition: 'border-bottom 0.15s ease',
                    background: 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    font: 'inherit',
                    color: 'inherit',
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
                    aria-hidden="true"
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
            </button>

            {/* Collapsible body — CSS grid trick for smooth animation */}
            <div
                id={panelId}
                ref={panelRef}
                role="region"
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
