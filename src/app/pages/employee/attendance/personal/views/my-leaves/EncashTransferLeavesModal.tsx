import React, { useState, useEffect } from 'react';
import { Modal } from 'react-bootstrap';
import { createLeaveManagement, getAllEmployeeWithMonthDailyHourlySalary } from '@services/employee';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';
import { RootState } from '@redux/store';
import dayjs from 'dayjs';
import eventBus from '@utils/EventBus';
import { EVENT_KEYS } from '@constants/eventKeys';

interface EncashTransferLeavesModalProps {
    show: boolean;
    onHide: () => void;
    leaveTypeId?: string;
    leaveBalances?: {
        totalLeaves: number;
        casualLeaves: number;
        sickLeaves: number;
        floaterLeaves: number;
        annualLeaves: number;
        maternalLeaves: number;
    };
    onSuccess?: () => void;
}

const EncashTransferLeavesModal: React.FC<EncashTransferLeavesModalProps> = ({
    show,
    onHide,
    leaveTypeId,
    leaveBalances = {
        totalLeaves: 0,
        casualLeaves: 0,
        sickLeaves: 0,
        floaterLeaves: 0,
        annualLeaves: 0,
        maternalLeaves: 0,
    },
    onSuccess,
}) => {
    const [selectedOption, setSelectedOption] = useState<'encash' | 'transfer'>('encash');
    const [loading, setLoading] = useState(false);
    const [transferableAmount, setTransferableAmount] = useState<number>(0);
    const [dailySalary, setDailySalary] = useState<number>(0);
    const [transferCounts, setTransferCounts] = useState<Record<string, number>>({});

    const employeeId = useSelector((state: RootState) => state.employee.currentEmployee.id);

    // Fetch daily salary when component mounts
    useEffect(() => {
        if (!employeeId || !show) return;

        const fetchDailySalary = async () => {
            try {
                const response = await getAllEmployeeWithMonthDailyHourlySalary(
                    employeeId,
                    dayjs().format('YYYY-MM-DD')
                );

                if (response?.salaries && Array.isArray(response.salaries)) {
                    // Filter the salary data for the current employee
                    const employeeSalaryData = response.salaries.find(
                        (salaryRecord: any) => salaryRecord.employeeId === employeeId
                    );

                    if (employeeSalaryData?.dailySalary) {
                        const salary = employeeSalaryData.dailySalary;
                        setDailySalary(salary);
                        // Calculate transferable amount: dailySalary * totalLeaves
                        const amount = Math.round(salary * leaveBalances.totalLeaves);
                        setTransferableAmount(amount);
                    } else {
                        console.warn('Daily salary not found for employee:', employeeId);
                        toast.warning('Could not fetch salary information');
                    }
                } else {
                    console.warn('Invalid salary response format');
                }
            } catch (error) {
                console.error('Error fetching daily salary:', error);
                toast.error('Failed to fetch salary information');
            }
        };

        fetchDailySalary();
    }, [employeeId, show, leaveBalances.totalLeaves]);

    const handleSubmit = async () => {
        setLoading(true);
        try {
            // Prepare payload based on the Prisma schema
            const payload: any = {
                employeeId,
                managementType: selectedOption === 'encash' ? 'CASH' : 'TRANSFER',
                leaveCount: leaveBalances.totalLeaves,
                status: 0, // Pending status
                createdById: employeeId,
                updatedById: employeeId,
            };

            // Only add optional fields if they have valid values
            if (leaveTypeId) {
                payload.leaveTypeId = leaveTypeId;
            }

            if (selectedOption === 'encash' && transferableAmount) {
                payload.totalAmount = transferableAmount;
            }

            // Call the API
            const response = await createLeaveManagement(payload);

            if (response.success) {
                // Emit event to notify other components
                eventBus.emit(EVENT_KEYS.leaveManagementRequestCreated, {
                    requestId: response?.data?.id || ''
                });

                toast.success(
                    selectedOption === 'encash'
                        ? 'Leave encashment request submitted successfully!'
                        : 'Leave transfer request submitted successfully!'
                );

                // Call onSuccess callback if provided
                if (onSuccess) {
                    onSuccess();
                }

                onHide();
            } else {
                toast.error(response.message || 'Failed to submit leave management request');
            }
        } catch (error: any) {
            console.error('Error submitting leave management:', error);
            toast.error(error?.response?.data?.message || 'An error occurred while submitting the request');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal show={show} onHide={onHide} centered size="lg">
            <Modal.Body style={{ padding: '40px 44px' }}>
                {/* Title */}
                <div style={{ marginBottom: '32px' }}>
                    <h3 style={{
                        fontSize: '24px',
                        fontWeight: 600,
                        color: '#000000',
                        margin: 0,
                        fontFamily: 'Barlow, sans-serif',
                        letterSpacing: '0.24px',
                    }}>
                        Choose what you want to do with your unused leaves
                    </h3>
                </div>

                {/* Options Section */}
                <div style={{ marginBottom: '32px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* Encash Option */}
                        <div
                            onClick={() => setSelectedOption('encash')}
                            style={{
                                border: selectedOption === 'encash' ? '2px solid #9d4141' : '1px solid #c8cfda',
                                borderRadius: '8px',
                                padding: '12px 16px',
                                cursor: 'pointer',
                                backgroundColor: selectedOption === 'encash' ? '#fffafa' : '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                            }}
                        >
                            {/* Radio Button */}
                            <div style={{
                                width: '21px',
                                height: '21px',
                                borderRadius: '50%',
                                backgroundColor: selectedOption === 'encash' ? '#f1cccc' : '#eef1f7',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}>
                                {selectedOption === 'encash' && (
                                    <div style={{
                                        width: '10px',
                                        height: '10px',
                                        borderRadius: '50%',
                                        backgroundColor: '#9d4141',
                                    }} />
                                )}
                            </div>

                            {/* Icon */}
                            <div style={{
                                width: '52px',
                                height: '52px',
                                borderRadius: '32px',
                                backgroundColor: selectedOption === 'encash' ? '#f4e7e7' : '#eef1f7',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13.41 18.09V19.5C13.41 20.05 12.96 20.5 12.41 20.5H11.59C11.04 20.5 10.59 20.05 10.59 19.5V18.07C9.27 17.79 8.13 17.04 7.59 15.9C7.39 15.51 7.66 15.03 8.1 15.03H9.15C9.42 15.03 9.66 15.2 9.79 15.45C10.08 15.97 10.67 16.28 11.59 16.28H12.57C13.56 16.28 14.16 15.77 14.16 15.08C14.16 14.5 13.89 14.07 12.71 13.78L10.21 13.18C8.37 12.73 7.59 11.71 7.59 10.14C7.59 8.65 8.74 7.49 10.59 7.15V5.5C10.59 4.95 11.04 4.5 11.59 4.5H12.41C12.96 4.5 13.41 4.95 13.41 5.5V7.13C14.52 7.38 15.44 7.99 15.93 9.01C16.14 9.41 15.87 9.91 15.42 9.91H14.48C14.22 9.91 13.99 9.76 13.85 9.53C13.6 9.12 13.12 8.84 12.41 8.84H11.59C10.67 8.84 10.09 9.28 10.09 9.95C10.09 10.58 10.42 10.93 11.49 11.19L13.99 11.79C15.92 12.26 16.66 13.22 16.66 14.83C16.66 16.38 15.52 17.75 13.41 18.09Z" fill={selectedOption === 'encash' ? '#9d4141' : '#6d7a8b'}/>
                                </svg>
                            </div>

                            {/* Text */}
                            <div style={{ flex: 1 }}>
                                <div style={{
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    color: selectedOption === 'encash' ? '#9d4141' : '#1f1f1f',
                                    marginBottom: '6px',
                                    fontFamily: 'Inter, sans-serif',
                                }}>
                                    Encash
                                </div>
                                <div style={{
                                    fontSize: '13px',
                                    color: '#1f1f1f',
                                    fontFamily: 'Inter, sans-serif',
                                }}>
                                    Convert them into cash
                                </div>
                            </div>
                        </div>

                        {/* Transfer Option */}
                        <div
                            onClick={() => setSelectedOption('transfer')}
                            style={{
                                border: selectedOption === 'transfer' ? '2px solid #9d4141' : '1px solid #c8cfda',
                                borderRadius: '8px',
                                padding: '12px 16px',
                                cursor: 'pointer',
                                backgroundColor: selectedOption === 'transfer' ? '#fffafa' : '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                            }}
                        >
                            {/* Radio Button */}
                            <div style={{
                                width: '21px',
                                height: '21px',
                                borderRadius: '50%',
                                backgroundColor: selectedOption === 'transfer' ? '#f1cccc' : '#eef1f7',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}>
                                {selectedOption === 'transfer' && (
                                    <div style={{
                                        width: '10px',
                                        height: '10px',
                                        borderRadius: '50%',
                                        backgroundColor: '#9d4141',
                                    }} />
                                )}
                            </div>

                            {/* Icon */}
                            <div style={{
                                width: '52px',
                                height: '52px',
                                borderRadius: '32px',
                                backgroundColor: selectedOption === 'transfer' ? '#f4e7e7' : '#eef1f7',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M16 17.01V10H14V17.01H11L15 21L19 17.01H16ZM9 3L5 6.99H8V14H10V6.99H13L9 3Z" fill={selectedOption === 'transfer' ? '#9d4141' : '#6d7a8b'}/>
                                </svg>
                            </div>

                            {/* Text */}
                            <div style={{ flex: 1 }}>
                                <div style={{
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    color: selectedOption === 'transfer' ? '#9d4141' : '#1f1f1f',
                                    marginBottom: '6px',
                                    fontFamily: 'Inter, sans-serif',
                                }}>
                                    Transfer
                                </div>
                                <div style={{
                                    fontSize: '13px',
                                    color: '#1f1f1f',
                                    fontFamily: 'Inter, sans-serif',
                                }}>
                                    Transfer to next year
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Leave Statistics and Transferable Amount */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end',
                    marginBottom: '32px',
                    flexWrap: 'wrap',
                    gap: '16px',
                }}>
                    {/* Left Side - Leave Statistics */}
                    <div>
                        <div style={{
                            fontSize: '14px',
                            fontWeight: 600,
                            color: '#1f1f1f',
                            marginBottom: '16px',
                            textTransform: 'uppercase',
                            fontFamily: 'Inter, sans-serif',
                        }}>
                            Your Unused Leaves:
                        </div>
                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                            <div>
                                <div style={{
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    color: '#000000',
                                    marginBottom: '4px',
                                    fontFamily: 'Inter, sans-serif',
                                }}>
                                    {leaveBalances.totalLeaves}
                                </div>
                                <div style={{
                                    fontSize: '14px',
                                    color: '#6d7a8b',
                                    fontFamily: 'Inter, sans-serif',
                                }}>
                                    Total Leaves
                                </div>
                            </div>
                            {leaveBalances.annualLeaves !== undefined && leaveBalances.annualLeaves !== 0 && (
                                <div>
                                    <div style={{
                                        fontSize: '14px',
                                        fontWeight: 500,
                                        color: '#000000',
                                        marginBottom: '4px',
                                        fontFamily: 'Inter, sans-serif',
                                    }}>
                                        {leaveBalances.annualLeaves}
                                    </div>
                                    <div style={{
                                        fontSize: '14px',
                                        color: '#6d7a8b',
                                        fontFamily: 'Inter, sans-serif',
                                    }}>
                                        Annual Leaves
                                    </div>
                                </div>
                            )}
                            {leaveBalances.casualLeaves !== undefined && leaveBalances.casualLeaves !== 0 && (
                                <div>
                                    <div style={{
                                        fontSize: '14px',
                                        fontWeight: 500,
                                        color: '#000000',
                                        marginBottom: '4px',
                                        fontFamily: 'Inter, sans-serif',
                                    }}>
                                        {leaveBalances.casualLeaves}
                                    </div>
                                    <div style={{
                                        fontSize: '14px',
                                        color: '#6d7a8b',
                                        fontFamily: 'Inter, sans-serif',
                                    }}>
                                        Casual Leaves
                                    </div>
                                </div>
                            )}
                            {leaveBalances.sickLeaves !== undefined && leaveBalances.sickLeaves !== 0 && (
                                <div>
                                    <div style={{
                                        fontSize: '14px',
                                        fontWeight: 500,
                                        color: '#000000',
                                        marginBottom: '4px',
                                        fontFamily: 'Inter, sans-serif',
                                    }}>
                                        {leaveBalances.sickLeaves}
                                    </div>
                                    <div style={{
                                        fontSize: '14px',
                                        color: '#6d7a8b',
                                        fontFamily: 'Inter, sans-serif',
                                    }}>
                                        Sick Leaves
                                    </div>
                                </div>
                            )}
                            {leaveBalances.floaterLeaves !== undefined && leaveBalances.floaterLeaves !== 0 && (
                                <div>
                                    <div style={{
                                        fontSize: '14px',
                                        fontWeight: 500,
                                        color: '#000000',
                                        marginBottom: '4px',
                                        fontFamily: 'Inter, sans-serif',
                                    }}>
                                        {leaveBalances.floaterLeaves}
                                    </div>
                                    <div style={{
                                        fontSize: '14px',
                                        color: '#6d7a8b',
                                        fontFamily: 'Inter, sans-serif',
                                    }}>
                                        Floater Leaves
                                    </div>
                                </div>
                            )}
                            {leaveBalances.maternalLeaves !== undefined && leaveBalances.maternalLeaves !== 0 && (
                                <div>
                                    <div style={{
                                        fontSize: '14px',
                                        fontWeight: 500,
                                        color: '#000000',
                                        marginBottom: '4px',
                                        fontFamily: 'Inter, sans-serif',
                                    }}>
                                        {leaveBalances.maternalLeaves}
                                    </div>
                                    <div style={{
                                        fontSize: '14px',
                                        color: '#6d7a8b',
                                        fontFamily: 'Inter, sans-serif',
                                    }}>
                                        Maternal Leaves
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Side - Encashment Amount (only show for encash option) */}
                    {selectedOption === 'encash' && (
                        <div style={{ textAlign: 'right' }}>
                            <div style={{
                                fontSize: '14px',
                                color: '#000000',
                                marginBottom: '4px',
                                fontFamily: 'Inter, sans-serif',
                            }}>
                                Encashment Amount
                            </div>
                            <div style={{
                                fontSize: '14px',
                                fontWeight: 500,
                                color: '#2b9725',
                                fontFamily: 'Inter, sans-serif',
                            }}>
                                ₹{transferableAmount.toLocaleString()}
                            </div>
                        </div>
                    )}
                </div>

                {/* Submit Button */}
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    style={{
                        backgroundColor: '#9d4141',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '10px 32px',
                        fontSize: '14px',
                        fontWeight: 500,
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.7 : 1,
                        fontFamily: 'Inter, sans-serif',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                    }}
                >
                    {loading ? (
                        <>
                            <span className="spinner-border spinner-border-sm" />
                            Submitting...
                        </>
                    ) : (
                        'Submit'
                    )}
                </button>
            </Modal.Body>
        </Modal>
    );
};

export default EncashTransferLeavesModal;
