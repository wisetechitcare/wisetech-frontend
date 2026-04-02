import React, { useState } from 'react';
import { ExpandMore } from '@mui/icons-material';

interface FaqSectionProps {
    title: string;
    children: React.ReactNode;
    defaultExpanded?: boolean;
}

const FaqSection: React.FC<FaqSectionProps> = ({
    title,
    children,
    defaultExpanded = true,
}) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    const toggleAccordion = () => {
        setIsExpanded(!isExpanded);
    };

    return (
        <div
            style={{
                backgroundColor: '#fff',
                borderRadius: '12px',
                padding: '24px',
                marginBottom: '16px',
                boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
            }}
        >
            <div
                className="d-flex align-items-center justify-content-between"
                onClick={toggleAccordion}
                style={{ cursor: 'pointer', marginBottom: isExpanded ? '16px' : '0' }}
            >
                <h3
                    style={{
                        fontSize: '18px',
                        fontWeight: 600,
                        color: '#000',
                        marginBottom: '0',
                    }}
                >
                    {title}
                </h3>
                <ExpandMore
                    style={{
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                        color: '#666',
                        fontSize: '32px',
                    }}
                />
            </div>
            <div
                style={{
                    maxHeight: isExpanded ? '10000px' : '0',
                    overflow: 'hidden',
                    transition: 'max-height 0.1s ease',
                }}
            >
                {children}
            </div>
        </div>
    );
};

export default FaqSection;
