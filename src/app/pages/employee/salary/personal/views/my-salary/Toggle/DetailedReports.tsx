import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper 
} from '@mui/material';

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
            <div style={{ display: 'flex', flexDirection: 'row', gap: '6px', alignItems: 'center', whiteSpace: 'nowrap' }}>
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
                <TableContainer component={Paper} sx={{ marginTop: '24px', boxShadow: 'none', border: '1px solid #edf2f7', borderRadius: '8px', overflowX: 'auto' }}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                {[...Array(15)].map((_, i) => (
                                    <TableCell key={i} style={{ padding: '6px 12px' }}>
                                        <SkeletonLoader width="100px" height="16px" />
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {[...Array(5)].map((_, rowIndex) => (
                                <TableRow key={rowIndex}>
                                    {[...Array(15)].map((_, colIndex) => (
                                        <TableCell key={colIndex} style={{ padding: '6px 12px' }}>
                                            <SkeletonLoader width="90%" height="16px" />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
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

            <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid #e2e8f0', borderRadius: '8px', overflowX: 'auto' }}>
                <Table sx={{ minWidth: '1600px' }}>
                    <TableHead>
                        <TableRow style={{
                            backgroundColor: '#f8fafc',
                            fontSize: '13px',
                            fontFamily: 'Inter, sans-serif',
                            color: '#4a5568'
                        }}>
                            <TableCell style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, minWidth: '100px', fontSize: '13px', color: '#4a5568', whiteSpace: 'nowrap' }}>Month</TableCell>
                            <TableCell style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, minWidth: '110px', fontSize: '13px', color: '#4a5568', whiteSpace: 'nowrap' }}>Basic Salary</TableCell>
                            <TableCell style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, minWidth: '110px', fontSize: '13px', color: '#4a5568', whiteSpace: 'nowrap' }}>Payable Hours</TableCell>
                            <TableCell style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, minWidth: '110px', fontSize: '13px', color: '#4a5568', whiteSpace: 'nowrap' }}>Working Hours</TableCell>
                            <TableCell style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, minWidth: '90px', fontSize: '13px', color: '#4a5568', whiteSpace: 'nowrap' }}>Overtime</TableCell>
                            <TableCell style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, minWidth: '90px', fontSize: '13px', color: '#4a5568', whiteSpace: 'nowrap' }}>Remaining</TableCell>
                            <TableCell style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, minWidth: '130px', fontSize: '13px', color: '#4a5568', whiteSpace: 'nowrap' }}>TOTAL GROSS PAY</TableCell>
                            <TableCell style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, minWidth: '160px', fontSize: '13px', color: '#4a5568', whiteSpace: 'nowrap' }}>Attendance Deductions</TableCell>
                            <TableCell style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, minWidth: '220px', fontSize: '13px', color: '#4a5568', whiteSpace: 'nowrap' }}>Total Salary After Attendance Adjustments</TableCell>
                            <TableCell style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, minWidth: '180px', fontSize: '13px', color: '#4a5568', whiteSpace: 'nowrap' }}>Govt & Payroll Deductions</TableCell>
                            <TableCell style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, minWidth: '140px', fontSize: '13px', color: '#4a5568', whiteSpace: 'nowrap' }}>TOTAL DEDUCTIONS</TableCell>
                            <TableCell style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, minWidth: '120px', fontSize: '13px', color: '#4a5568', whiteSpace: 'nowrap' }}>Net Pay</TableCell>
                            <TableCell style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, minWidth: '120px', fontSize: '13px', color: '#4a5568', whiteSpace: 'nowrap' }}>Paid Amount</TableCell>
                            <TableCell style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, minWidth: '120px', fontSize: '13px', color: '#4a5568', whiteSpace: 'nowrap' }}>Due Amount</TableCell>
                            <TableCell style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600, minWidth: '120px', fontSize: '13px', color: '#4a5568', whiteSpace: 'nowrap' }}>Status</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody style={{
                        fontSize: '13.5px',
                        fontFamily: 'Inter, sans-serif',
                        color: '#2d3748'
                    }}>
                        {alignedData.map((row, index) => {
                            // Get overtime and paid amount, handling alternate casings
                            const overtimeVal = row.overTime ?? row.overtime ?? '-';
                            const paidAmtVal = row.amountPaid ?? row.paidAmount ?? '-';

                            return (
                                <TableRow 
                                    key={index}
                                    style={{
                                        borderTop: '1px solid #edf2f7'
                                    }}
                                >
                                    <TableCell style={{ padding: '6px 12px', textAlign: 'left', fontWeight: 500, fontSize: '13.5px', color: '#2d3748', whiteSpace: 'nowrap' }}>{row.month}</TableCell>
                                    <TableCell style={{ padding: '6px 12px', textAlign: 'left', fontSize: '13.5px', color: '#2d3748', whiteSpace: 'nowrap' }}>{formatCurrency(row.basicSalary)}</TableCell>
                                    <TableCell style={{ padding: '6px 12px', textAlign: 'left', fontSize: '13.5px', color: '#2d3748', whiteSpace: 'nowrap' }}>{row.payableHours || '-'}</TableCell>
                                    <TableCell style={{ padding: '6px 12px', textAlign: 'left', fontSize: '13.5px', color: '#2d3748', whiteSpace: 'nowrap' }}>{row.workingHours || '-'}</TableCell>
                                    <TableCell style={{ padding: '6px 12px', textAlign: 'left', color: overtimeVal !== '-' ? '#2E7D32' : '#2d3748', fontSize: '13.5px', whiteSpace: 'nowrap' }}>
                                        {overtimeVal}
                                    </TableCell>
                                    <TableCell style={{ padding: '6px 12px', textAlign: 'left', color: row.remainingTime && row.remainingTime !== '-' ? '#C62828' : '#2d3748', fontSize: '13.5px', whiteSpace: 'nowrap' }}>
                                        {row.remainingTime || '-'}
                                    </TableCell>
                                    <TableCell style={{ padding: '6px 12px', textAlign: 'left', color: '#2E7D32', fontWeight: 500, fontSize: '13.5px', whiteSpace: 'nowrap' }}>
                                        {formatCurrency(row.totalGrossPayAmount ?? row.totalGrossPay)}
                                    </TableCell>
                                    <TableCell style={{ padding: '6px 12px', textAlign: 'left', fontSize: '13.5px', whiteSpace: 'nowrap' }}>
                                        {renderAttendanceDeduction(row)}
                                    </TableCell>
                                    <TableCell style={{ padding: '6px 12px', textAlign: 'left', fontWeight: 600, color: '#1565C0', fontSize: '13.5px', whiteSpace: 'nowrap' }}>
                                        {formatCurrency(getSalaryAfterAttendance(row))}
                                    </TableCell>
                                    <TableCell style={{ padding: '6px 12px', textAlign: 'left', fontSize: '13.5px', whiteSpace: 'nowrap' }}>
                                        {renderGovtPayrollDeduction(row)}
                                    </TableCell>
                                    <TableCell style={{ padding: '6px 12px', textAlign: 'left', color: '#C62828', fontWeight: 500, fontSize: '13.5px', whiteSpace: 'nowrap' }}>
                                        {formatCurrency(row.totalDeductedAmount ?? row.totalDeducted)}
                                    </TableCell>
                                    <TableCell style={{ padding: '6px 12px', textAlign: 'left', fontWeight: 600, fontSize: '13.5px', color: '#2d3748', whiteSpace: 'nowrap' }}>
                                        {formatCurrency(row.netAmount)}
                                    </TableCell>
                                    <TableCell style={{ padding: '6px 12px', textAlign: 'left', fontSize: '13.5px', color: '#2d3748', whiteSpace: 'nowrap' }}>
                                        {formatCurrency(paidAmtVal)}
                                    </TableCell>
                                    <TableCell style={{ padding: '6px 12px', textAlign: 'left', color: row.due && parseFloat(String(row.due).replace(/[₹,]/g, '')) > 0 ? '#C62828' : '#2d3748', fontSize: '13.5px', whiteSpace: 'nowrap' }}>
                                        {formatCurrency(row.due)}
                                    </TableCell>
                                    <TableCell style={{ padding: '6px 12px', textAlign: 'center', fontSize: '13.5px', whiteSpace: 'nowrap' }}>
                                        {getStatusBadge(row.status)}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
        </div>
    );
};

export default DetailedReports;
