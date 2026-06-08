import React from 'react'

interface YearlyOverViewCardProps {
    overview?: {
        startDate: string;
        endDate: string;
        totalPayableDays: number;
        totalNetAmount: number;
        totalPaidAmount: number;
        totalDueAmount: number;
        totalMonths: number;
    };
    loading?: boolean;
}

const YearlyOverViewCard = ({ overview, loading = false  }: YearlyOverViewCardProps) => {
    const payableDays = overview?.totalPayableDays ?? 0;
    const netPayable = overview?.totalNetAmount ?? 0;
    const paidAmount = overview?.totalPaidAmount ?? 0;
    const remainingAmount = overview?.totalDueAmount ?? 0;
    const startDate = overview?.startDate ?? '';
    const endDate = overview?.endDate ?? '';

    // Format fiscal year as "2023-2024"
    const startYear = startDate ? new Date(startDate).getFullYear() : '';
    const endYear = endDate ? new Date(endDate).getFullYear() : '';
    const paymentYear = startYear && endYear ? `${startYear}-${endYear}` : '';

    console.log("Yearly Overview Card Rendered with overview: ===================>", overview);

    // Skeleton loader component
    const SkeletonLoader = ({ width = "100%", height = "20px", marginBottom = "0px" }: { width?: string; height?: string; marginBottom?: string }) => (
        <div style={{
            width,
            height,
            backgroundColor: "#e0e0e0",
            borderRadius: "4px",
            marginBottom,
            animation: "pulse 1.5s ease-in-out infinite"
        }} />
    );

    // Add keyframe animation
    const styleElement = document.createElement('style');
    styleElement.innerHTML = `
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
    `;
    if (!document.querySelector('style[data-skeleton-animation]')) {
        styleElement.setAttribute('data-skeleton-animation', 'true');
        document.head.appendChild(styleElement);
    }

    if (loading) {
        return (
            <div style={{ width: "100%", paddingBottom: "16px" }}>
                <div style={{ display: "flex", gap: "16px", alignItems: "stretch" }}>
                    {/* Loading Skeleton for Yearly Overview Card */}
                    <div style={{ flex: 1 }}>
                        <div style={{
                            background: "#fff",
                            padding: "20px 24px",
                            borderRadius: "12px",
                            boxShadow: "8px 8px 16px rgba(0,0,0,0.04)",
                            display: "flex",
                            flexDirection: "column",
                            gap: "24px"
                        }}>
                            <SkeletonLoader width="150px" height="24px" />
                            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                                <SkeletonLoader width="100%" height="16px" />
                                <SkeletonLoader width="100%" height="16px" />
                            </div>
                            <SkeletonLoader width="100%" height="1.5px" />
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <SkeletonLoader width="40%" height="40px" />
                                <SkeletonLoader width="30%" height="24px" />
                            </div>
                        </div>
                    </div>

                    {/* Loading Skeleton for Payment Details Card */}
                    <div style={{ flex: 1 }}>
                        <div style={{
                            background: "#fff",
                            padding: "20px 24px",
                            borderRadius: "12px",
                            boxShadow: "8px 8px 16px rgba(0,0,0,0.04)",
                            display: "flex",
                            flexDirection: "column",
                            gap: "24px",
                            height: "100%"
                        }}>
                            <SkeletonLoader width="150px" height="24px" />
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                <SkeletonLoader width="100%" height="20px" />
                                <SkeletonLoader width="100%" height="20px" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ width: "100%", paddingBottom: "16px" }}>
            <div style={{ display: "flex", gap: "16px", alignItems: "stretch" }}>

                {/* Yearly Overview Card */}
                <div style={{ flex: 1 }}>
                    <div
                        style={{
                            background: "#fff",
                            padding: "20px 24px",
                            borderRadius: "12px",
                            boxShadow: "8px 8px 16px rgba(0,0,0,0.04)",
                            display: "flex",
                            flexDirection: "column",
                            gap: "24px"
                        }}
                    >
                        {/* Title */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            <h6 style={{
                                fontFamily: "'Barlow', sans-serif",
                                fontWeight: 600,
                                fontSize: "20px",
                                letterSpacing: "0.2px",
                                margin: 0,
                                color: "#000"
                            }}>
                                Yearly Overview
                            </h6>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            {/* Year and Days Section */}
                            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                                {/* Payment Year */}
                                <div style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    fontFamily: "'Inter', sans-serif",
                                    fontWeight: 500,
                                    fontSize: "14px",
                                    color: "#000"
                                }}>
                                    <span>Payment Year</span>
                                    <span>{paymentYear}</span>
                                </div>

                                {/* Payable Days */}
                                <div style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    fontFamily: "'Inter', sans-serif",
                                    fontWeight: 500,
                                    fontSize: "14px",
                                    color: "#000"
                                }}>
                                    <span>Payable Days</span>
                                    <span>{payableDays}</span>
                                </div>
                            </div>

                            {/* Divider */}
                            <div style={{
                                width: "100%",
                                height: "1.5px",
                                backgroundColor: "#d9d9d9"
                            }}></div>

                            {/* Net Payable */}
                            <div style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center"
                            }}>
                                <div style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "7px",
                                    fontFamily: "'Inter', sans-serif",
                                    fontWeight: 500,
                                    fontSize: "14px"
                                }}>
                                    <span style={{ color: "#000" }}>Net Payable this year</span>
                                    <span style={{ color: "#8998ab" }}>Gross pay(A) - Deductions(B)</span>
                                </div>

                                <span style={{
                                    fontFamily: "'Inter', sans-serif",
                                    fontWeight: 600,
                                    color: "#2aa11f",
                                    fontSize: "18px"
                                }}>
                                    ₹{netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Payment Details Card */}
                <div style={{ flex: 1 }}>
                    <div
                        style={{
                            background: "#fff",
                            padding: "20px 24px",
                            borderRadius: "12px",
                            boxShadow: "8px 8px 16px rgba(0,0,0,0.04)",
                            display: "flex",
                            flexDirection: "column",
                            gap: "24px",
                            height: "100%"
                        }}
                    >
                        {/* Title */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            <h6 style={{
                                fontFamily: "'Barlow', sans-serif",
                                fontWeight: 600,
                                fontSize: "20px",
                                letterSpacing: "0.2px",
                                margin: 0,
                                color: "#000"
                            }}>
                                Payment Details
                            </h6>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                {/* Paid Amount */}
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center"
                                    }}
                                >
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        {/* Green checkmark icon */}
                                        <div
                                            style={{
                                                width: "24px",
                                                height: "24px",
                                                borderRadius: "50%",
                                                backgroundColor: "#2aa11f",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center"
                                            }}
                                        >
                                            <svg width="14" height="11" viewBox="0 0 14 11" fill="none">
                                                <path d="M1 5.5L5 9.5L13 1.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                        </div>
                                        <span style={{
                                            fontFamily: "'Inter', sans-serif",
                                            fontWeight: 500,
                                            fontSize: "14px",
                                            color: "#000"
                                        }}>
                                            Paid Amount
                                        </span>
                                    </div>
                                    <span style={{
                                        fontFamily: "'Inter', sans-serif",
                                        fontWeight: 500,
                                        fontSize: "14px",
                                        color: "#000"
                                    }}>
                                        ₹{paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>

                                {/* Remaining Amount */}
                                <div style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center"
                                }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                        {/* Blue clock icon */}
                                        {/* <div
                                            style={{
                                                width: "19.5px",
                                                height: "19.5px",
                                                borderRadius: "50%",
                                                backgroundColor: "#007bff",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center"
                                            }}
                                        >
                                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                                <circle cx="6" cy="6" r="5" stroke="white" strokeWidth="1.5" fill="none"/>
                                                <path d="M6 3V6L8 8" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                                            </svg> */}
                                             <div
                                            style={{
                                                width: "24px",
                                                height: "24px",
                                                borderRadius: "50%",
                                                backgroundColor: "#007bff",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center"
                                            }}
                                        >
                                            <svg width="14" height="11" viewBox="0 0 14 11" fill="none">
                                                <path d="M1 5.5L5 9.5L13 1.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                        </div>
                                        <span style={{
                                            fontFamily: "'Inter', sans-serif",
                                            fontWeight: 500,
                                            fontSize: "14px",
                                            color: "#000"
                                        }}>
                                            Remaining
                                        </span>
                                    </div>
                                    <span style={{
                                        fontFamily: "'Inter', sans-serif",
                                        fontWeight: 500,
                                        fontSize: "14px",
                                        color: "#000"
                                    }}>
                                        ₹{remainingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default YearlyOverViewCard;
