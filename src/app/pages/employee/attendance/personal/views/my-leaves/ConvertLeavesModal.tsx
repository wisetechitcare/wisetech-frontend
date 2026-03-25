import React, { useState, useEffect } from 'react';
import { Modal } from 'react-bootstrap';
import { createLeaveManagement, getAllEmployeeWithMonthDailyHourlySalary } from '@services/employee';
import { fetchLeaveOptions } from '@services/company';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';
import { RootState } from '@redux/store';
import dayjs from 'dayjs';
import { leaveManagementIcon } from '@metronic/assets/sidepanelicons';
import { successConfirmation } from '@utils/modal';
import eventBus from '@utils/EventBus';
import { EVENT_KEYS } from '@constants/eventKeys';
import { ANNUAL_LEAVES, CASUAL_LEAVES, FLOATER_LEAVES, MATERNAL_LEAVES, SICK_LEAVES, LEAVE_MANAGEMENT_TYPE } from '@constants/statistics';

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
    const [leaveTypeIds, setLeaveTypeIds] = useState<any[]>([]);
    const [transferCounts, setTransferCounts] = useState<Record<string, number>>({});
    const [encashCounts, setEncashCounts] = useState<Record<string, number>>({});

    const employeeId = useSelector((state: RootState) => state.employee.currentEmployee.id);
    const employeeBranchId = useSelector((state: RootState) => state.employee.currentEmployee?.branchId);

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
                       console.warn('Could not fetch salary information');
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

    // Fetch leave type IDs when component mounts
    useEffect(() => {
        if (!show || !employeeBranchId) return;

        const fetchLeaveTypeIds = async () => {
            try {
                const response = await fetchLeaveOptions();

                if (response?.data?.leaveOptions && Array.isArray(response.data.leaveOptions)) {
                    // Filter leave options by branch and get leave types with balances
                    const branchLeaveOptions = response.data.leaveOptions.filter(
                        (option: any) => option.branchId === employeeBranchId
                    );

                    // Create an array of leave type IDs for leaves that have remaining balance
                    const leaveTypeIdsArray: any[] = [];

                    branchLeaveOptions.forEach((option: any) => {
                        const leaveType = option.leaveType;
                        let hasBalance = false;

                        // Check if this leave type has remaining balance
                        if (leaveType === ANNUAL_LEAVES && leaveBalances.annualLeaves > 0) {
                            hasBalance = true;
                        } else if (leaveType === CASUAL_LEAVES && leaveBalances.casualLeaves > 0) {
                            hasBalance = true;
                        } else if (leaveType === SICK_LEAVES && leaveBalances.sickLeaves > 0) {
                            hasBalance = true;
                        } else if (leaveType === FLOATER_LEAVES && leaveBalances.floaterLeaves > 0) {
                            hasBalance = true;
                        } else if (leaveType === MATERNAL_LEAVES && leaveBalances.maternalLeaves > 0) {
                            hasBalance = true;
                        }

                        if (hasBalance) {
                            leaveTypeIdsArray.push({
                                leaveTypeId: option.id,
                                leaveType: option.leaveType,
                                count: leaveType === ANNUAL_LEAVES ? leaveBalances.annualLeaves :
                                       leaveType === CASUAL_LEAVES ? leaveBalances.casualLeaves :
                                       leaveType === SICK_LEAVES ? leaveBalances.sickLeaves :
                                       leaveType === FLOATER_LEAVES ? leaveBalances.floaterLeaves :
                                       leaveType === MATERNAL_LEAVES ? leaveBalances.maternalLeaves : 0
                            });
                        }
                    });

                    setLeaveTypeIds(leaveTypeIdsArray);

                    // Initialize transfer counts with all available leaves by default
                    const initialTransferCounts: Record<string, number> = {};
                    leaveTypeIdsArray.forEach((item: any) => {
                        initialTransferCounts[item.leaveType] = item.count;
                    });
                    setTransferCounts(initialTransferCounts);

                    // Initialize encash counts with all available leaves by default
                    const initialEncashCounts: Record<string, number> = {};
                    leaveTypeIdsArray.forEach((item: any) => {
                        initialEncashCounts[item.leaveType] = item.count;
                    });
                    setEncashCounts(initialEncashCounts);

                    // Recalculate transferable amount based on initial encash counts
                    const totalEncashLeaves = Object.values(initialEncashCounts).reduce((sum, count) => sum + count, 0);
                    if (dailySalary > 0) {
                        const amount = Math.round(dailySalary * totalEncashLeaves);
                        setTransferableAmount(amount);
                    }
                } else {
                    console.warn('Invalid leave options response format');
                }
            } catch (error) {
                console.error('Error fetching leave type IDs:', error);
                toast.error('Failed to fetch leave type information');
            }
        };

        fetchLeaveTypeIds();
    }, [show, employeeBranchId, leaveBalances]);

    // Recalculate transferable amount when daily salary is fetched and encash counts exist
    useEffect(() => {
        if (dailySalary > 0 && Object.keys(encashCounts).length > 0) {
            const totalEncashLeaves = Object.values(encashCounts).reduce((sum, count) => sum + count, 0);
            const amount = Math.round(dailySalary * totalEncashLeaves);
            setTransferableAmount(amount);
        }
    }, [dailySalary, encashCounts]);

    // Handler for updating transfer count for a specific leave type
    const handleTransferCountChange = (leaveType: string, value: string) => {
        const numValue = parseInt(value) || 0;
        const maxBalance = leaveTypeIds.find((item: any) => item.leaveType === leaveType)?.count || 0;

        // Ensure value doesn't exceed maximum balance
        const finalValue = Math.min(Math.max(0, numValue), maxBalance);

        setTransferCounts(prev => ({
            ...prev,
            [leaveType]: finalValue
        }));
    };

    // Handler for updating encash count for a specific leave type
    const handleEncashCountChange = (leaveType: string, value: string) => {
        const numValue = parseInt(value) || 0;
        const maxBalance = leaveTypeIds.find((item: any) => item.leaveType === leaveType)?.count || 0;

        // Ensure value doesn't exceed maximum balance
        const finalValue = Math.min(Math.max(0, numValue), maxBalance);

        setEncashCounts(prev => ({
            ...prev,
            [leaveType]: finalValue
        }));
        // Note: transferable amount will be recalculated automatically by useEffect
    };

    // Calculate total leaves to be transferred
    const getTotalTransferLeaves = () => {
        return Object.values(transferCounts).reduce((sum, count) => sum + count, 0);
    };

    // Calculate total leaves to be encashed
    const getTotalEncashLeaves = () => {
        return Object.values(encashCounts).reduce((sum, count) => sum + count, 0);
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            // Log leave balances for debugging
            // console.log('Leave Balances:', leaveBalances);
            // console.log('Total Leaves being sent:', leaveBalances.totalLeaves);
            // console.log('Individual leaves:', {
            //     annual: leaveBalances.annualLeaves,
            //     casual: leaveBalances.casualLeaves,
            //     sick: leaveBalances.sickLeaves,
            //     floater: leaveBalances.floaterLeaves,
            //     maternal: leaveBalances.maternalLeaves
            // });

            // Prepare payload based on the Prisma schema
            const payload: any = {
                employeeId,
                managementType: selectedOption === 'encash' ? LEAVE_MANAGEMENT_TYPE.CASH : LEAVE_MANAGEMENT_TYPE.TRANSFER,
                leaveCount: selectedOption === 'transfer' ? getTotalTransferLeaves() : getTotalEncashLeaves(),
                status: 0, // Pending status
                createdById: employeeId,
                updatedById: employeeId,
            };

            // For both TRANSFER and ENCASH, send leave type breakdown
            if (leaveTypeIds.length > 0) {
                if (selectedOption === 'transfer') {
                    // For TRANSFER: send only leave types with counts > 0 (user selected)
                    const selectedLeaveTypeIds = leaveTypeIds
                        .filter((item: any) => transferCounts[item.leaveType] > 0)
                        .map((item: any) => ({
                            ...item,
                            count: transferCounts[item.leaveType]
                        }));
                    payload.leaveTypeIds = selectedLeaveTypeIds;
                    // console.log('Sending leave type IDs for TRANSFER:', selectedLeaveTypeIds);
                } else if (selectedOption === 'encash') {
                    // For ENCASH: send only leave types with counts > 0 (user selected)
                    const selectedLeaveTypeIds = leaveTypeIds
                        .filter((item: any) => encashCounts[item.leaveType] > 0)
                        .map((item: any) => ({
                            ...item,
                            count: encashCounts[item.leaveType]
                        }));
                    payload.leaveTypeIds = selectedLeaveTypeIds;
                    // console.log('Sending leave type IDs for ENCASH:', selectedLeaveTypeIds);
                }
            }

            // Only add optional fields if they have valid values
            if (leaveTypeId) {
                payload.leaveTypeId = leaveTypeId;
            }

            if (selectedOption === 'encash' && transferableAmount) {
                payload.totalAmount = transferableAmount;
            }

            // Call the API
            const response = await createLeaveManagement(payload);

            // Emit event to notify other components
            eventBus.emit(EVENT_KEYS.leaveManagementRequestCreated, {
                requestId: response?.data?.id || ''
            });

            onHide();
            await successConfirmation(selectedOption === 'encash' ? 'Leave encashment request submitted successfully!' : 'Leave transfer request submitted successfully!');

            // Call onSuccess callback if provided
            if (onSuccess) {
                onSuccess();
            }

        } catch (error: any) {
            console.error('Error submitting leave management:', error);
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
                                <img src={leaveManagementIcon.leavesEnCashIcon.default} />
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
                                <img src={leaveManagementIcon.transferLeaveIcon.default} />
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

                {/* Transfer Leave Selection - Only show when transfer option is selected */}
                {selectedOption === 'transfer' && leaveTypeIds.length > 0 && (
                    <div style={{ marginBottom: '32px' }}>
                        <div style={{
                            fontSize: '14px',
                            fontWeight: 600,
                            color: '#1f1f1f',
                            marginBottom: '16px',
                            fontFamily: 'Inter, sans-serif',
                        }}>
                            Select how many leaves you want to transfer:
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {leaveTypeIds.map((item: any, index: number) => (
                                <div key={index} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '16px',
                                    padding: '12px 16px',
                                    border: '1px solid #e0e0e0',
                                    borderRadius: '8px',
                                    backgroundColor: '#fafafa',
                                }}>
                                    <div style={{ flex: '1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{
                                            fontSize: '14px',
                                            fontWeight: 500,
                                            color: '#1f1f1f',
                                            fontFamily: 'Inter, sans-serif',
                                        }}>
                                            {item.leaveType}
                                        </span>
                                        <span style={{
                                            fontSize: '13px',
                                            color: '#6d7a8b',
                                            fontFamily: 'Inter, sans-serif',
                                        }}>
                                            (Available: {item.count})
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input
                                            type="number"
                                            min="0"
                                            max={item.count}
                                            value={transferCounts[item.leaveType] || 0}
                                            onChange={(e) => handleTransferCountChange(item.leaveType, e.target.value)}
                                            style={{
                                                width: '80px',
                                                padding: '6px 12px',
                                                border: '1px solid #c8cfda',
                                                borderRadius: '6px',
                                                fontSize: '14px',
                                                fontFamily: 'Inter, sans-serif',
                                                textAlign: 'center',
                                            }}
                                        />
                                        <span style={{
                                            fontSize: '13px',
                                            color: '#6d7a8b',
                                            fontFamily: 'Inter, sans-serif',
                                        }}>
                                            days
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div style={{
                            marginTop: '16px',
                            padding: '12px 16px',
                            backgroundColor: '#f4e7e7',
                            borderRadius: '6px',
                            border: '1px solid #9d4141',
                        }}>
                            <span style={{
                                fontSize: '14px',
                                fontWeight: 600,
                                color: '#1f1f1f',
                                fontFamily: 'Inter, sans-serif',
                            }}>
                                Total leaves to transfer: {getTotalTransferLeaves()} days
                            </span>
                        </div>
                    </div>
                )}

                {/* Encash Leave Selection - Only show when encash option is selected */}
                {selectedOption === 'encash' && leaveTypeIds.length > 0 && (
                    <div style={{ marginBottom: '32px' }}>
                        <div style={{
                            fontSize: '14px',
                            fontWeight: 600,
                            color: '#1f1f1f',
                            marginBottom: '16px',
                            fontFamily: 'Inter, sans-serif',
                        }}>
                            Select how many leaves you want to encash:
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {leaveTypeIds.map((item: any, index: number) => (
                                <div key={index} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '16px',
                                    padding: '12px 16px',
                                    border: '1px solid #e0e0e0',
                                    borderRadius: '8px',
                                    backgroundColor: '#fafafa',
                                }}>
                                    <div style={{ flex: '1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{
                                            fontSize: '14px',
                                            fontWeight: 500,
                                            color: '#1f1f1f',
                                            fontFamily: 'Inter, sans-serif',
                                        }}>
                                            {item.leaveType}
                                        </span>
                                        <span style={{
                                            fontSize: '13px',
                                            color: '#6d7a8b',
                                            fontFamily: 'Inter, sans-serif',
                                        }}>
                                            (Available: {item.count})
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input
                                            type="number"
                                            min="0"
                                            max={item.count}
                                            value={encashCounts[item.leaveType] || 0}
                                            onChange={(e) => handleEncashCountChange(item.leaveType, e.target.value)}
                                            style={{
                                                width: '80px',
                                                padding: '6px 12px',
                                                border: '1px solid #c8cfda',
                                                borderRadius: '6px',
                                                fontSize: '14px',
                                                fontFamily: 'Inter, sans-serif',
                                                textAlign: 'center',
                                            }}
                                        />
                                        <span style={{
                                            fontSize: '13px',
                                            color: '#6d7a8b',
                                            fontFamily: 'Inter, sans-serif',
                                        }}>
                                            days
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div style={{
                            marginTop: '16px',
                            padding: '12px 16px',
                            backgroundColor: '#f4e7e7',
                            borderRadius: '6px',
                            border: '1px solid #9d4141',
                        }}>
                            <span style={{
                                fontSize: '14px',
                                fontWeight: 600,
                                color: '#1f1f1f',
                                fontFamily: 'Inter, sans-serif',
                            }}>
                                Total leaves to encash: {getTotalEncashLeaves()} days
                            </span>
                        </div>
                    </div>
                )}

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
                        <div style={{ textAlign: 'right' }} className='d-flex justify-content-center gap-3 mt-4'>
                            <div style={{
                                fontSize: '14px',
                                color: '#000000',
                                marginBottom: '4px',
                                fontFamily: 'Inter, sans-serif',
                            }}>
                                Transferable Amount
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

                {/* Important Information */}
                {(selectedOption === 'transfer' && getTotalTransferLeaves() > 0) || (selectedOption === 'encash' && getTotalEncashLeaves() > 0) ? (
                    <div style={{
                        padding: '12px 16px',
                        backgroundColor: '#fff3cd',
                        borderRadius: '6px',
                        border: '1px solid #ffc107',
                        marginBottom: '24px',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                            <i className="bi bi-info-circle" style={{ color: '#856404', fontSize: '16px', marginTop: '2px' }}></i>
                            <div style={{ flex: 1 }}>
                                <div style={{
                                    fontSize: '13px',
                                    color: '#856404',
                                    fontFamily: 'Inter, sans-serif',
                                    lineHeight: '1.5',
                                }}>
                                    <strong>Important:</strong> {selectedOption === 'encash' ? (
                                        <>
                                            Once submitted, <strong>{getTotalEncashLeaves()} {getTotalEncashLeaves() === 1 ? 'leave' : 'leaves'}</strong> will be deducted from your available balance. You will receive <strong>₹{transferableAmount.toLocaleString()}</strong> for these leaves after admin approval. If rejected or revoked, the leaves will be restored to your balance.
                                        </>
                                    ) : (
                                        <>
                                            Once submitted, <strong>{getTotalTransferLeaves()} {getTotalTransferLeaves() === 1 ? 'leave' : 'leaves'}</strong> will be deducted from your current balance and transferred to the next fiscal year after admin approval. If rejected or revoked, the leaves will be restored to your current year balance.
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}

                {/* Submit Button */}
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading || (selectedOption === 'transfer' && getTotalTransferLeaves() === 0) || (selectedOption === 'encash' && getTotalEncashLeaves() === 0)}
                    style={{
                        backgroundColor: '#9d4141',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '10px 32px',
                        fontSize: '14px',
                        fontWeight: 500,
                        cursor: (loading || (selectedOption === 'transfer' && getTotalTransferLeaves() === 0) || (selectedOption === 'encash' && getTotalEncashLeaves() === 0)) ? 'not-allowed' : 'pointer',
                        opacity: (loading || (selectedOption === 'transfer' && getTotalTransferLeaves() === 0) || (selectedOption === 'encash' && getTotalEncashLeaves() === 0)) ? 0.7 : 1,
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
