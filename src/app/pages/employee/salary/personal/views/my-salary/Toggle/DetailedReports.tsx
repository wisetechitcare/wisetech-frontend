interface DetailedReportsProps {
    data: any[];
    loading?: boolean;
}

const DetailedReports = ({ data, loading = false }: DetailedReportsProps) => {
    console.log("Detailed Reports Data:", data);

    // Skeleton loader component
    const SkeletonLoader = ({ width = "100%", height = "20px" }: { width?: string; height?: string }) => (
        <div style={{
            width,
            height,
            backgroundColor: "#e0e0e0",
            borderRadius: "4px",
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

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Full Paid':
                return '#309e27';
            case 'Partially Paid':
                return '#4234d8';
            case 'Pending':
                return '#b0b0b0';
            default:
                return '#000';
        }
    };

    if (loading) {
        return (
            <div className="card p-4 mb-5" style={{
                boxShadow: '8px 8px 16px 0px rgba(0, 0, 0, 0.04)',
                borderRadius: '12px',
                backgroundColor: '#fff'
            }}>
                <SkeletonLoader width="180px" height="24px" />
                <div style={{ marginTop: '24px', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                        <thead>
                            <tr>
                                {[...Array(12)].map((_, i) => (
                                    <th key={i} style={{ padding: '12px', textAlign: 'left' }}>
                                        <SkeletonLoader width="100px" height="16px" />
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {[...Array(5)].map((_, rowIndex) => (
                                <tr key={rowIndex} style={{ borderTop: rowIndex > 0 ? '1px solid #f0f0f0' : 'none' }}>
                                    {[...Array(12)].map((_, colIndex) => (
                                        <td key={colIndex} style={{ padding: '12px' }}>
                                            <SkeletonLoader width="90%" height="16px" />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    return (
        <div className="card p-4 mb-5" style={{
            boxShadow: '8px 8px 16px 0px rgba(0, 0, 0, 0.04)',
            borderRadius: '12px',
            backgroundColor: '#fff'
        }}>
            <h4 className="mb-4" style={{
                fontSize: '20px',
                fontWeight: 600,
                letterSpacing: '0.2px',
                color: '#000'
            }}>
                Detailed Reports
            </h4>

            <div style={{ overflowX: 'auto' }}>
                <table style={{
                    width: '100%',
                    borderCollapse: 'separate',
                    borderSpacing: 0
                }}>
                    <thead>
                        <tr style={{
                            backgroundColor: '#fff',
                            fontSize: '14px',
                            fontFamily: 'Inter, sans-serif',
                            color: '#7a8597'
                        }}>
                            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 400, minWidth: '108px' }}>Month</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 400, minWidth: '112px' }}>Basic Salary</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 400, minWidth: '112px' }}>Payable Hours</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 400, minWidth: '112px' }}>Working Hours</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 400, minWidth: '112px' }}>Overtime</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 400, minWidth: '112px' }}>Remaining time</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 400, minWidth: '160px' }}>Total Gross Pay Amount</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 400, minWidth: '160px' }}>Total Deducted Amount</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 400, minWidth: '112px' }}>Net Amount</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 400, minWidth: '112px' }}>Paid Amount</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 400, minWidth: '112px' }}>Due</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 400, minWidth: '104px' }}>Status</th>
                            {/* <th style={{ padding: '12px', textAlign: 'left', fontWeight: 400, minWidth: '114px' }}>Action</th> */}
                        </tr>
                    </thead>
                    <tbody style={{
                        fontSize: '14px',
                        fontFamily: 'Inter, sans-serif',
                        color: '#000'
                    }}>
                        {data.map((row, index) => {
                            const isPending = row.status === 'Pending';
                            return (
                                <tr key={index} style={{
                                    backgroundColor: '#fff',
                                    borderTop: index > 0 ? '1px solid #f0f0f0' : 'none'
                                }}>
                                    <td style={{ padding: '12px' }}>{row.month}</td>
                                    <td style={{ padding: '12px' }}>
                                        {row.basicSalary ? `${row.basicSalary.toLocaleString()}` : '-'}
                                    </td>
                                    <td style={{ padding: '12px' }}>{row.payableHours || '-'}</td>
                                    <td style={{ padding: '12px' }}>{row.workingHours || '-'}</td>
                                    <td style={{ padding: '12px', color: row.overtime ? '#309e27' : '#000' }}>
                                        {row.overtime || '-'}
                                    </td>
                                    <td style={{ padding: '12px', color: row.remainingTime ? '#d43535' : '#000' }}>
                                        {row.remainingTime || '-'}
                                    </td>
                                    <td style={{ padding: '12px', color: row.totalGrossPayAmount ? '#309e27' : '#000' }}>
                                        {row.totalGrossPayAmount ? `${row.totalGrossPayAmount.toLocaleString()}` : '-'}
                                    </td>
                                    <td style={{ padding: '12px', color: row.totalDeductedAmount ? '#d43535' : '#000' }}>
                                        {row.totalDeductedAmount ? `${row.totalDeductedAmount.toLocaleString()}` : '-'}
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        {row.netAmount ? `${row.netAmount.toLocaleString()}` : '-'}
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        {row.paidAmount ? `${row.paidAmount.toLocaleString()}` : '-'}
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        {row.due ? `${row.due.toLocaleString()}` : '-'}
                                    </td>
                                    <td style={{ padding: '12px', color: getStatusColor(row.status) }}>
                                        {row.status}
                                    </td>
                                    {/* <td style={{ padding: '12px' }}>
                                        <div style={{
                                            display: 'flex',
                                            gap: '12px',
                                            color: isPending ? '#b0b0b0' : '#9d4141'
                                        }}>
                                            <span style={{
                                                cursor: isPending ? 'not-allowed' : 'pointer',
                                                textDecoration: isPending ? 'none' : 'none'
                                            }}>
                                                Download
                                            </span>
                                            <span style={{
                                                cursor: isPending ? 'not-allowed' : 'pointer',
                                                textDecoration: isPending ? 'none' : 'none'
                                            }}>
                                                Email
                                            </span>
                                        </div>
                                    </td> */}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DetailedReports;
