import React from 'react';

interface StatusBadgeProps {
    status: 'Paid' | 'Partial' | 'No Payment';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
    const getBadgeClass = () => {
        switch (status) {
            case 'Paid': return 'status-badge-paid';
            case 'Partial': return 'status-badge-partial';
            default: return 'status-badge-none';
        }
    };

    const getDotClass = () => {
        switch (status) {
            case 'Paid': return 'status-dot-paid';
            case 'Partial': return 'status-dot-partial';
            default: return 'status-dot-none';
        }
    };

    return (
        <span className={`status-badge ${getBadgeClass()}`}>
            <span className={`status-dot ${getDotClass()}`} />
            {status}
        </span>
    );
};

export default React.memo(StatusBadge);
