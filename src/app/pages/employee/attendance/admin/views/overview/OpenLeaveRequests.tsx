import MaterialTable from "@app/modules/common/components/MaterialTable";
import { LeaveStatus, LeaveTypes } from "@constants/attendance";
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from "@constants/statistics";
import { KTIcon, toAbsoluteUrl } from "@metronic/helpers";
import { LeaveOptions } from "@models/employee";
import { transformLeaveRequests } from "@pages/employee/attendance/admin/OverviewView";
import { saveLeaveRequests } from "@redux/slices/attendance";
import { RootState } from "@redux/store";
import { createKpiScore, fetchLeaveRequest, getAllKpiFactors, updateLeaveStatus } from "@services/employee";
import { fetchConfiguration, fetchLeaveOptions } from "@services/company";
import { hasPermission } from "@utils/authAbac";
import { rejectConfirmation, successConfirmation } from "@utils/modal";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { SANDWICH_LEAVE_KEY } from "@constants/configurations-key";
import { formatDateFromISTString } from "@utils/statistics";
import { fetchColorAndStoreInSlice } from "@utils/file";
import dayjs from "dayjs";

function OpenLeaveRequests() {
    // FIX: state.auth.currentUser has no `role` field — use isAdmin flag + roles[] array instead
    const isAdminUser = useSelector((state: RootState) => state.auth.currentUser?.isAdmin);
    const currentEmployeeRoles: any[] = useSelector((state: RootState) => state.employee.currentEmployee.roles || []);
    const selectedEmployeeId = useSelector((state: RootState) => state.employee.selectedEmployee?.id || '');
    // Admin/HR bypass: they can see and act on all pending leave requests
    const hasAdminOrHRAccess = isAdminUser || currentEmployeeRoles.some((r: any) =>
        ['hr', 'admin', 'super_admin', 'superadmin'].includes((r?.name || r?.role || '').toLowerCase())
    );

    const [sickLeaves, setSickLeaves] = useState<string[]>([]);
    const [floaterLeaves, setFloaterLeaves] = useState<string[]>([]);
    const [annualLeaves, setAnnualLeaves] = useState<string[]>([]);
    const [maternal, setMaternal] = useState<string[]>([]);
    const [unpaidLeaves, setunpaidLeaves] = useState<string[]>([]);
    const [casualLeaves, setCasualLeaves] = useState<string[]>([]);    
    const [allTheFactorDetails, setAllTheFactorDetails] = useState<any>([])
    const [sandwhichConfiguration, setsandwhichConfiguration] = useState(false)
    const employeeIdCurrent = useSelector((state: RootState) => state.employee.currentEmployee.id);
    const [loading, setLoading] = useState(false);
    const [processingRowId, setProcessingRowId] = useState<string | null>(null);
    const [processingAction, setProcessingAction] = useState<'approve' | 'reject' | null>(null);


    const [leaveActionId, setLeaveActionId] = useState("");
    const dispatch = useDispatch();
    const leaveTypeColors = useSelector((state: RootState) => state.customColors?.leaveTypes);

    // Get employee's working and off days configuration
    const branchDetails = useSelector((state: RootState) => state.employee?.currentEmployee?.branches);
    const employeeWorkingAndOffDays = JSON.parse(branchDetails?.workingAndOffDays || '{}');

    // Map leave type names to color keys
    const getLeaveTypeColor = (leaveType: string): string => {
        if (!leaveTypeColors) return '#3498DB'; // default color

        const normalizedType = leaveType?.toLowerCase() || '';

        if (normalizedType.includes('sick')) return leaveTypeColors.sickLeaveColor || '#E74C3C';
        if (normalizedType.includes('casual')) return leaveTypeColors.casualLeaveColor || '#3498DB';
        if (normalizedType.includes('annual')) return leaveTypeColors.annualLeaveColor || '#2ECC71';
        if (normalizedType.includes('maternal') || normalizedType.includes('maternity')) return leaveTypeColors.maternalLeaveColor || '#9B59B6';
        if (normalizedType.includes('floater')) return leaveTypeColors.floaterLeaveColor || '#F39C12';
        if (normalizedType.includes('unpaid')) return leaveTypeColors.unpaidLeaveColor || '#95A5A6';

        return '#3498DB'; // default color
    };
 
    const { employeeId, openLeaveRequests } = useSelector((state: RootState) => {
        const { attendance, employee } = state;
        // return {
        //     employeeId: employee.currentEmployee.id,
        //     openLeaveRequests: attendance.leaveRequests.filter((el: any) => {
        //         let isAccessible = true;
        //         if (el.type == LeaveTypes.SICK_LEAVE) {
        //             isAccessible = sickLeaves.includes(userRoles);
        //         } else if (el.type == LeaveTypes.FLOATER_LEAVE) {
        //             isAccessible = floaterLeaves.includes(userRoles);
        //         } else if (el.type == LeaveTypes.ANNUAL_LEAVE) {
        //             isAccessible = annualLeaves.includes(userRoles);
        //         } else if (el.type == LeaveTypes.UNPAID_LEAVE) {
        //             isAccessible = unpaidLeaves.includes(userRoles);
        //         } else if (el.type == LeaveTypes.CASUAL_LEAVE) {
        //             isAccessible = casualLeaves.includes(userRoles);
        //         } else if(el.type == LeaveTypes.MATERNAL_LEAVE) {
        //             isAccessible = maternal.includes(userRoles);
        //         }
        //         return el.status == 0;
        //     }),
        // }
        return {
            employeeId: employee.currentEmployee.id,
            openLeaveRequests: attendance.leaveRequests.filter((el: any) => {
                // FIX: Admin/HR see all pending requests unconditionally
                if (hasAdminOrHRAccess) return el.status == 0;

                // FIX: canApprove stores employee IDs — compare against current employee's ID, not a role string
                let isAccessible = false;
                const empId = employee.currentEmployee.id;
                if (el.type == LeaveTypes.SICK_LEAVE) {
                    isAccessible = Array.isArray(sickLeaves) && sickLeaves.includes(empId);
                } else if (el.type == LeaveTypes.FLOATER_LEAVE) {
                    isAccessible = Array.isArray(floaterLeaves) && floaterLeaves.includes(empId);
                } else if (el.type == LeaveTypes.ANNUAL_LEAVE) {
                    isAccessible = Array.isArray(annualLeaves) && annualLeaves.includes(empId);
                } else if (el.type == LeaveTypes.UNPAID_LEAVE) {
                    isAccessible = Array.isArray(unpaidLeaves) && unpaidLeaves.includes(empId);
                } else if (el.type == LeaveTypes.CASUAL_LEAVE) {
                    isAccessible = Array.isArray(casualLeaves) && casualLeaves.includes(empId);
                } else if (el.type == LeaveTypes.MATERNAL_LEAVE) {
                    isAccessible = Array.isArray(maternal) && maternal.includes(empId);
                }

                return isAccessible && el.status == 0;
            }),
        }
 
    });
    

      useEffect(() => {
          
          const fetchConfigurations = async () => {
              try {
                const configuration = await fetchConfiguration(SANDWICH_LEAVE_KEY);
                const jsonObjectSandwhich = JSON.parse(configuration.data.configuration.configuration);
                const customRules = jsonObjectSandwhich.isSandwichLeaveSixthEnabled===true || jsonObjectSandwhich.isSandwichLeaveFifthEnabled===true
                setsandwhichConfiguration(customRules);
              }
              catch (error ) {
                console.log("Error fetching configuration", error);
              }
          }
          fetchConfigurations();
        },[])

     useEffect(() => {
            async function fetchAllTheFactorDetails() {
                const { data: { factors } } = await getAllKpiFactors();  
                setAllTheFactorDetails(factors);
            }
            
            fetchAllTheFactorDetails();
        }, [])


    const approveLeave = async (leave: any) => {
        try{
        setLoading(true);
        setProcessingRowId(leave.id);
        setProcessingAction('approve');
        let approvedBy: string[] = JSON.parse(leave?.approvedBy);
        
        const requestToHandle = leave;
        const typeOfleave = requestToHandle?.type?.toLowerCase()?.includes("unpaid") ? "total unpaid leaves taken" : "total paid leaves taken";
        
        const requestRaised = allTheFactorDetails.find((el: any) => el?.name?.toLowerCase() === typeOfleave);
        let workingDaysWeightage = Number(requestRaised?.weightage);
        
        const workingDaysWeightageType = requestRaised?.type;
        if(workingDaysWeightageType=="NEGATIVE"){
            if(workingDaysWeightage>0){
                workingDaysWeightage = workingDaysWeightage*-1;
            }
        }

        const fromDate = requestToHandle?.dateFrom;
        const toDate = requestToHandle?.dateTo;
        let leaveDays = 0
        if (fromDate && toDate) {
            const start = new Date(fromDate);
            const end = new Date(toDate);
            if (start > end) {
                leaveDays = 0
            }
            else{
                // Get off days from employee configuration (days where value is '0')
                const offDays = Object.keys(employeeWorkingAndOffDays)
                    .filter(day => employeeWorkingAndOffDays[day] === '0')
                    .map(day => day.toLowerCase());

                const currentDate = new Date(start);
                while (currentDate <= end) {
                  const dayName = dayjs(currentDate).format('dddd').toLowerCase(); // "monday", "tuesday", etc.

                  // Count if: sandwich config enabled OR it's a working day (not in offDays)
                  if (!offDays.includes(dayName)) {
                    leaveDays += 1;
                  }
                  currentDate.setDate(currentDate.getDate() + 1);
                }
            }
        }
        
        leaveDays = Number(leaveDays)
        const workingDaysFactorId = requestRaised?.id;
        const workingDaysScore = workingDaysWeightage * leaveDays
        const workingDaysPayload = {
            employeeId: leave?.employeeId,
            factorId: workingDaysFactorId,
            value: leaveDays.toString(), // Total leave days taken
            score: workingDaysScore.toString(), // Weightage × leave days
        }
        
        const res = await createKpiScore(workingDaysPayload)
        
        approvedBy.push(employeeIdCurrent); // FIX: push employee ID, not undefined role string
        await updateLeaveStatus({ id: leave.id, status: LeaveStatus.Approved, approvedBy, approvedById: employeeIdCurrent });
        successConfirmation('Leave request approved successfully');

        setLeaveActionId(leave.id);
        const { data: { leaveRequest } } = await fetchLeaveRequest(selectedEmployeeId || undefined);
        dispatch(saveLeaveRequests(transformLeaveRequests(leaveRequest)));
    } finally {
        setLoading(false);
        setProcessingRowId(null);
        setProcessingAction(null);
    }

    };

    const rejectLeave = async (leaveId: string) => {
        try {
            setLoading(true);
            setProcessingRowId(leaveId);
            setProcessingAction('reject');
            const sure = await rejectConfirmation('Yes, reject it!')
            if(sure){
                await updateLeaveStatus({ id: leaveId, status: LeaveStatus.Rejected, rejectedById: employeeIdCurrent });
                successConfirmation('Leave request rejected successfully');
                setLeaveActionId(leaveId);
                const { data: { leaveRequest } } = await fetchLeaveRequest(selectedEmployeeId || undefined);
                dispatch(saveLeaveRequests(transformLeaveRequests(leaveRequest)));
            }

        } finally {
            setLoading(false);
            setProcessingRowId(null);
            setProcessingAction(null);
        }
    };

    const columns = [
        {
            accessorKey: "createdDate",
            header: "CreatedAt",
            size: 100,
            minSize: 100,
            maxSize: 150,
            Cell: ({ renderedCellValue }: any) => formatDateFromISTString(renderedCellValue),
        },
        {
            accessorKey: "date",
            header: "Leave Date",
            size: 100,
            minSize: 100,
            maxSize: 150,
            Cell: ({ renderedCellValue }: any) => renderedCellValue
        },
        {
            accessorKey: "name",
            header: "Name",
            size: 100,
            minSize: 100,
            maxSize: 150,
            Cell: ({ renderedCellValue }: any) => renderedCellValue
        },
        {
            accessorKey: "code",
            header: "Employee Code",
            size: 100,
            minSize: 100,
            maxSize: 150,
            Cell: ({ renderedCellValue }: any) => renderedCellValue
        },
        {
            accessorKey: "type",
            header: "Leave Type",
            size: 100,
            minSize: 100,
            maxSize: 150,
            Cell: ({ renderedCellValue }: any) => (
                <span
                    className="badge"
                    style={{
                        backgroundColor: getLeaveTypeColor(renderedCellValue),
                        color: 'white',
                        fontWeight: '500',
                        fontSize: '11px',
                        padding: '5px 8px',
                        borderRadius: '12px',
                        display: 'inline-block',
                        minWidth: '60px',
                        textAlign: 'center'
                    }}
                >
                    {renderedCellValue}
                </span>
            )
        },
        {
            accessorKey: "remark",
            header: "Reason",
            size: 100,
            minSize: 100,
            maxSize: 150,
            Cell: ({ renderedCellValue }: any) => renderedCellValue
        },
        ({
            accessorKey: "actions",
            header: "Actions",
            size: 100,
            minSize: 100,
            maxSize: 150,
            Cell: ({ row }: any) => {
              const res = hasPermission(
                resourceNameMapWithCamelCase.leave,
                permissionConstToUseWithHasPermission.editOthers,
                row.original
              );
          
              if (!res) return 'Not Allowed';
          
              return (
                <>
                  <button
                    className='btn btn-icon btn-sm'
                    onClick={() => approveLeave(row.original)}
                    title="Approve Leave"
                    disabled={loading || processingRowId === row.original.id}
                  >
                    {processingRowId === row.original.id && processingAction === 'approve' ? (
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    ) : (
                        <img src={toAbsoluteUrl('media/svg/misc/tick.svg')} />
                    )}
                  </button>
                  <button
                    className='btn btn-icon btn-sm'
                    onClick={() => rejectLeave(row.original.id)}
                    title="Reject Leave"
                    disabled={loading || processingRowId === row.original.id}
                  >
                    {processingRowId === row.original.id && processingAction === 'reject' ? (
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    ) : (
                        <img src={toAbsoluteUrl('media/svg/misc/cross.svg')} />
                    )}
                  </button>
                </>
              );
            }
          })
          
          
    ];

    useEffect(() => {
        // Initialize color scheme from backend
        fetchColorAndStoreInSlice();
    }, []);

    useEffect(() => {
        async function callEndpoint() {
            const { data: { leaveRequest } } = await fetchLeaveRequest(selectedEmployeeId || undefined);
            dispatch(saveLeaveRequests(transformLeaveRequests(leaveRequest)));
        }

        const fetchOptions = async () => {
            try {
                const { data: { leaveOptions } } = await fetchLeaveOptions();

                leaveOptions.map((option: LeaveOptions) => {
                    if (option.leaveType == LeaveTypes.SICK_LEAVE) {
                        setSickLeaves(JSON.parse(option.canApprove));
                    } else if (option.leaveType == LeaveTypes.FLOATER_LEAVE) {
                        setFloaterLeaves(JSON.parse(option.canApprove));
                    } else if (option.leaveType == LeaveTypes.ANNUAL_LEAVE) {
                        setAnnualLeaves(JSON.parse(option.canApprove));
                    } else if (option.leaveType == LeaveTypes.UNPAID_LEAVE) {
                        setunpaidLeaves(JSON.parse(option.canApprove));
                    } else if (option.leaveType == LeaveTypes.CASUAL_LEAVE) {
                        setCasualLeaves(JSON.parse(option.canApprove));
                    } else if(option.leaveType == LeaveTypes.MATERNAL_LEAVE) {
                        setMaternal(JSON.parse(option.canApprove));
                    }
                })
            } catch (error) {
                console.error("Error fetching leave options:", error);
            }
        };

        fetchOptions();
        callEndpoint();
    }, [leaveActionId, selectedEmployeeId]); // FIX: refresh when admin switches to a different employee

    return (
        <>
            <h3 className='pt-8 fw-bold'>Open Leave Requests</h3>
            <MaterialTable
                data={openLeaveRequests}
                columns={columns}
                hideFilters={false}
                tableName="Open Leave Requests"
                resource={resourceNameMapWithCamelCase.leave}
                viewOthers={true}
                viewOwn={true}
                employeeId={employeeIdCurrent}
            />
        </>
    );
}

export default OpenLeaveRequests;