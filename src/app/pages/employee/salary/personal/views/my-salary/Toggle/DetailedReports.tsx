import React from 'react';

interface DetailedReportsProps {
    data: any[];
    loading?: boolean;
}

const DetailedReports = ({ data, loading = false }: DetailedReportsProps) => {

    // List of months in fiscal year order
    const fiscalMonths = [
        'April', 'May', 'June', 'July', 'August', 'September',
        'October', 'November', 'December', 'January', 'February', 'March'
    ];

    // Align backend data to the 12 fiscal months
    const alignedData = fiscalMonths.map((monthName) => {
        const record = data?.find(
            (item: any) => String(item?.month || '').toLowerCase() === monthName.toLowerCase()
        );
        if (record) {
            return {
                ...record,
                isPlaceholder: false
            };
        }
        return {
            month: monthName,
            isPlaceholder: true,
            basicSalary: '-',
            payableHours: '-',
            workingHours: '-',
            overTime: '-',
            remainingTime: '-',
            totalGrossPayAmount: '-',
            totalDeductedAmount: '-',
            netAmount: '-',
            amountPaid: '-',
            due: '-',
            status: 'Pending',
            presentDays: 0,
            absentDays: 0,
            leavesDays: 0,
            lateCheckinDays: 0,
            workingdays: 0,
            extraDaysWorked: 0,
            grossPayBreakdown: null,
            deductionBreakdown: null,
            paymentHistory: []
        };
    });

    const getStatusBadge = (status: string) => {
        let bgColor = '#f4f4f4';
        let textColor = '#5e6278';
        
        switch (status) {
            case 'Full Paid':
            case 'Fully Paid':
                bgColor = '#E8F5E9';
                textColor = '#2E7D32';
                break;
            case 'Partially Paid':
                bgColor = '#E8EAF6';
                textColor = '#3F51B5';
                break;
            case 'Pending':
                bgColor = '#FFF3E0';
                textColor = '#E65100';
                break;
        }

        return (
            <span style={{
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor: bgColor,
                color: textColor,
                display: 'inline-block'
            }}>
                {status}
            </span>
        );
    };

    const formatCurrency = (val: any) => {
        if (val === null || val === undefined || val === '-') return '-';
        if (typeof val === 'number') {
            return val.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 });
        }
        // If it's a string, clean and ensure currency symbol
        const str = String(val).trim();
        if (str.startsWith('₹')) return str;
        const cleaned = str.replace(/[₹,]/g, '');
        const num = Number(cleaned);
        if (!isNaN(num)) {
            return num.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 });
        }
        return str;
    };

    const getAttendanceDeductionAmount = (row: any): number => {
        if (row.isPlaceholder) return 0;
        return Number(
            row.deductionBreakdown?.variable?.['Late Checkins']?.earned || 
            row.deductionBreakdown?.variable?.['Late Attendance']?.earned || 0
        );
    };

    const getSalaryAfterAttendance = (row: any) => {
        if (row.isPlaceholder) return '-';
        
        const grossAmt = typeof row.totalGrossPayAmountInNumber === 'number' 
            ? row.totalGrossPayAmountInNumber 
            : (Number(String(row.totalGrossPayAmount ?? row.totalGrossPay ?? '0').replace(/[₹,]/g, '')) || 0);
            
        const lateCheckinDeduction = getAttendanceDeductionAmount(row);
        
        return grossAmt - lateCheckinDeduction;
    };

    const renderAttendanceDeduction = (row: any) => {
        if (row.isPlaceholder) return '-';
        
        const amt = getAttendanceDeductionAmount(row);
        if (amt <= 0) return <span style={{ color: '#718096', fontSize: '12px' }}>-</span>;
        
        return (
            <span style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#D84315', // Dark orange-red
                backgroundColor: '#D8431512',
                padding: '4px 8px',
                borderRadius: '4px',
                whiteSpace: 'nowrap',
                border: '1px solid #D8431525',
                display: 'inline-block'
            }}>
                Late: {formatCurrency(amt)}
            </span>
        );
    };

    const renderGovtPayrollDeduction = (row: any) => {
        if (row.isPlaceholder) return '-';
        
        const cuts: { label: string; amount: number; color: string }[] = [];
        
        // Check fixed deductions (PF, Professional Tax, Professional Fees)
        if (row.deductionBreakdown?.fixed) {
            Object.entries(row.deductionBreakdown.fixed).forEach(([key, item]: [string, any]) => {
                if (item.isActive !== false && Number(item.earned || 0) > 0) {
                    let label = key;
                    let color = '#C62828'; // Crimson
                    if (key.toLowerCase().includes('provident fund')) {
                        label = 'PF';
                        color = '#1565C0'; // Blue
                    } else if (key.toLowerCase().includes('professional tax')) {
                        label = 'Tax';
                        color = '#E65100'; // Orange
                    } else if (key.toLowerCase().includes('professional fees')) {
                        label = 'Fees';
                        color = '#6A1B9A'; // Purple
                    }
                    cuts.push({ label, amount: Number(item.earned), color });
                }
            });
        }
        
        if (cuts.length === 0) {
            return <span style={{ color: '#718096', fontSize: '12px' }}>-</span>;
        }
        
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                {cuts.map((cut, idx) => (
                    <span key={idx} style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: cut.color,
                        backgroundColor: cut.color + '12',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        whiteSpace: 'nowrap',
                        border: `1px solid ${cut.color}25`
                    }}>
                        {cut.label}: {formatCurrency(cut.amount)}
                    </span>
                ))}
            </div>
        );
    };

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

    if (loading) {
        return (
            <div className="card p-4 mb-5" style={{
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                borderRadius: '12px',
                backgroundColor: '#fff'
            }}>
                <SkeletonLoader width="180px" height="24px" />
                <div style={{ marginTop: '24px', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                        <thead>
                            <tr>
                                {[...Array(15)].map((_, i) => (
                                    <th key={i} style={{ padding: '12px', textAlign: 'left' }}>
                                        <SkeletonLoader width="100px" height="16px" />
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {[...Array(5)].map((_, rowIndex) => (
                                <tr key={rowIndex} style={{ borderTop: rowIndex > 0 ? '1px solid #f0f0f0' : 'none' }}>
                                    {[...Array(15)].map((_, colIndex) => (
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
            boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
            borderRadius: '12px',
            backgroundColor: '#fff'
        }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h4 className="mb-0" style={{
                    fontSize: '20px',
                    fontWeight: 600,
                    color: '#2d3748'
                }}>
                    Detailed Reports (April - March)
                </h4>
            </div>

            <div style={{ overflowX: 'auto' }}>
                <table style={{
                    width: '100%',
                    borderCollapse: 'separate',
                    borderSpacing: 0
                }}>
                    <thead>
                        <tr style={{
                            backgroundColor: '#f8fafc',
                            fontSize: '13px',
                            fontFamily: 'Inter, sans-serif',
                            color: '#4a5568',
                            borderBottom: '1px solid #e2e8f0'
                        }}>
                            <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 600, minWidth: '100px' }}>Month</th>
                            <th style={{ padding: '16px 12px', textAlign: 'right', fontWeight: 600, minWidth: '110px' }}>Basic Salary</th>
                            <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 600, minWidth: '110px' }}>Payable Hours</th>
                            <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 600, minWidth: '110px' }}>Working Hours</th>
                            <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 600, minWidth: '90px' }}>Overtime</th>
                            <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 600, minWidth: '90px' }}>Remaining</th>
                            <th style={{ padding: '16px 12px', textAlign: 'right', fontWeight: 600, minWidth: '130px' }}>TOTAL GROSS PAY</th>
                            <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 600, minWidth: '160px' }}>Attendance Deductions</th>
                            <th style={{ padding: '16px 12px', textAlign: 'right', fontWeight: 600, minWidth: '220px' }}>Total Salary After Attendance Adjustments</th>
                            <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: 600, minWidth: '180px' }}>Govt & Payroll Deductions</th>
                            <th style={{ padding: '16px 12px', textAlign: 'right', fontWeight: 600, minWidth: '140px' }}>TOTAL DEDUCTIONS</th>
                            <th style={{ padding: '16px 12px', textAlign: 'right', fontWeight: 600, minWidth: '120px' }}>Net Pay</th>
                            <th style={{ padding: '16px 12px', textAlign: 'right', fontWeight: 600, minWidth: '120px' }}>Paid Amount</th>
                            <th style={{ padding: '16px 12px', textAlign: 'right', fontWeight: 600, minWidth: '120px' }}>Due Amount</th>
                            <th style={{ padding: '16px 12px', textAlign: 'center', fontWeight: 600, minWidth: '120px' }}>Status</th>
                        </tr>
                    </thead>
                    <tbody style={{
                        fontSize: '13.5px',
                        fontFamily: 'Inter, sans-serif',
                        color: '#2d3748'
                    }}>
                        {alignedData.map((row, index) => {
                            // Get overtime and paid amount, handling alternate casings
                            const overtimeVal = row.overTime ?? row.overtime ?? '-';
                            const paidAmtVal = row.amountPaid ?? row.paidAmount ?? '-';

                            return (
                                <tr 
                                    key={index}
                                    style={{
                                        borderTop: '1px solid #edf2f7'
                                    }}
                                >
                                    <td style={{ padding: '16px 12px', fontWeight: 500 }}>{row.month}</td>
                                    <td style={{ padding: '16px 12px', textAlign: 'right' }}>{formatCurrency(row.basicSalary)}</td>
                                    <td style={{ padding: '16px 12px' }}>{row.payableHours || '-'}</td>
                                    <td style={{ padding: '16px 12px' }}>{row.workingHours || '-'}</td>
                                    <td style={{ padding: '16px 12px', color: overtimeVal !== '-' ? '#2E7D32' : 'inherit' }}>
                                        {overtimeVal}
                                    </td>
                                    <td style={{ padding: '16px 12px', color: row.remainingTime && row.remainingTime !== '-' ? '#C62828' : 'inherit' }}>
                                        {row.remainingTime || '-'}
                                    </td>
                                    <td style={{ padding: '16px 12px', textAlign: 'right', color: '#2E7D32', fontWeight: 500 }}>
                                        {formatCurrency(row.totalGrossPayAmount ?? row.totalGrossPay)}
                                    </td>
                                    <td style={{ padding: '16px 12px' }}>
                                        {renderAttendanceDeduction(row)}
                                    </td>
                                    <td style={{ padding: '16px 12px', textAlign: 'right', fontWeight: 600, color: '#1565C0' }}>
                                        {formatCurrency(getSalaryAfterAttendance(row))}
                                    </td>
                                    <td style={{ padding: '16px 12px' }}>
                                        {renderGovtPayrollDeduction(row)}
                                    </td>
                                    <td style={{ padding: '16px 12px', textAlign: 'right', color: '#C62828', fontWeight: 500 }}>
                                        {formatCurrency(row.totalDeductedAmount ?? row.totalDeducted)}
                                    </td>
                                    <td style={{ padding: '16px 12px', textAlign: 'right', fontWeight: 600 }}>
                                        {formatCurrency(row.netAmount)}
                                    </td>
                                    <td style={{ padding: '16px 12px', textAlign: 'right' }}>
                                        {formatCurrency(paidAmtVal)}
                                    </td>
                                    <td style={{ padding: '16px 12px', textAlign: 'right', color: row.due && parseFloat(String(row.due).replace(/[₹,]/g, '')) > 0 ? '#C62828' : 'inherit' }}>
                                        {formatCurrency(row.due)}
                                    </td>
                                    <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                                        {getStatusBadge(row.status)}
                                    </td>
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
