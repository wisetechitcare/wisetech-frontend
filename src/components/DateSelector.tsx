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
        <div className={`d-flex align-items-center bg-white border border-gray-200 rounded shadow-sm ${className}`}>
            <button 
                className="btn btn-sm btn-icon btn-active-light border-end border-gray-200 rounded-start rounded-0 w-35px h-35px d-flex justify-content-center align-items-center" 
                onClick={onPrevious}
            >
                <i className="bi bi-chevron-left text-muted fs-6"></i>
            </button>
            
            <span className="fw-bolder px-4 py-1 fs-6 text-center" style={{ color: '#aa393d', minWidth: '120px' }}>
                {displayValue}
            </span>
            
            <button 
                className="btn btn-sm btn-icon btn-active-light border-start border-gray-200 rounded-end rounded-0 w-35px h-35px d-flex justify-content-center align-items-center" 
                onClick={onNext}
                disabled={disableNext}
                style={{ cursor: disableNext ? 'not-allowed' : 'pointer' }}
                title={disableNext ? nextDisabledMessage : ""}
            >
                <i className={`bi bi-chevron-right fs-6 ${disableNext ? 'text-gray-400' : 'text-muted'}`}></i>
            </button>
        </div>
    );
};

export default DateSelector;
