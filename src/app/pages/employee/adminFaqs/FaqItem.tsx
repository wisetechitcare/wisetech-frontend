import { useState } from 'react';
import { KTIcon } from '@metronic/helpers';
import { IFaqs } from '@models/company';

interface FaqItemProps {
    faq: IFaqs;
    isLast?: boolean;
    onEdit?: (faq: IFaqs) => void;
    onDelete?: (faq: IFaqs) => void;
}

/** Splits an answer string into displayable paragraphs/bullets */
function renderAnswer(answer: string) {
    // Try bullet/numbered split first (lines starting with -, *, •, digits)
    const lines = answer.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length > 1) {
        const isBulleted = lines.some((l) => /^[-*•\d]/.test(l));
        if (isBulleted) {
            return (
                <ul style={{ margin: '0', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {lines.map((l, i) => (
                        <li key={i} style={{ lineHeight: 1.55 }}>
                            {l.replace(/^[-*•]\s*/, '').replace(/^\d+\.\s*/, '')}
                        </li>
                    ))}
                </ul>
            );
        }
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {lines.map((l, i) => <p key={i} style={{ margin: 0, lineHeight: 1.55 }}>{l}</p>)}
            </div>
        );
    }
    // Single long string — render as-is
    return <span style={{ lineHeight: 1.55 }}>{answer}</span>;
}

const FaqItem = ({ faq, isLast = false, onEdit, onDelete }: FaqItemProps) => {
    const [expanded, setExpanded] = useState(false);
    const showActions = !!(onEdit || onDelete);

    return (
        <>
            <div className="d-flex justify-content-between align-items-start gap-3">
                {/* Q + A */}
                <div className="flex-grow-1" style={{ minWidth: 0 }}>
                    {/* Question row — clickable to toggle answer */}
                    <div
                        className="d-flex align-items-start justify-content-between gap-2"
                        onClick={() => setExpanded((v) => !v)}
                        style={{ cursor: 'pointer' }}
                    >
                        <div
                            style={{
                                fontSize: '14px',
                                fontWeight: 600,
                                color: '#111827',
                                lineHeight: 1.5,
                                flex: 1,
                            }}
                        >
                            {faq.question}
                        </div>
                        {/* Per-item chevron */}
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 20 20"
                            fill="none"
                            style={{
                                flexShrink: 0,
                                marginTop: '2px',
                                color: '#9ca3af',
                                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.18s ease',
                            }}
                        >
                            <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>

                    {/* Answer — animated */}
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateRows: expanded ? '1fr' : '0fr',
                            transition: 'grid-template-rows 0.2s ease',
                        }}
                    >
                        <div style={{ overflow: 'hidden' }}>
                            <div
                                style={{
                                    fontSize: '13.5px',
                                    color: '#4b5563',
                                    marginTop: expanded ? '8px' : '0',
                                    transition: 'margin-top 0.2s ease',
                                }}
                            >
                                {renderAnswer(faq.answer)}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Admin action buttons */}
                {showActions && (
                    <div className="d-flex gap-1 flex-shrink-0" style={{ marginTop: '1px' }}>
                        {onEdit && (
                            <button
                                className="btn btn-icon btn-sm p-0"
                                onClick={(e) => { e.stopPropagation(); onEdit(faq); }}
                                style={{ width: '26px', height: '26px', background: 'transparent', border: 'none', color: '#9ca3af' }}
                                title="Edit"
                            >
                                <KTIcon iconName="pencil" className="fs-5" />
                            </button>
                        )}
                        {onDelete && (
                            <button
                                className="btn btn-icon btn-sm p-0"
                                onClick={(e) => { e.stopPropagation(); onDelete(faq); }}
                                style={{ width: '26px', height: '26px', background: 'transparent', border: 'none', color: '#9ca3af' }}
                                title="Delete"
                            >
                                <KTIcon iconName="trash" className="fs-5" />
                            </button>
                        )}
                    </div>
                )}
            </div>

            {!isLast && (
                <hr style={{ borderColor: '#f3f4f6', margin: '16px 0' }} />
            )}
        </>
    );
};

export default FaqItem;
