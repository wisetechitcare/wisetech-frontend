export const ATTENDANCE_STATUS = {
    PRESENT: 'Present',
    ABSENT: 'Absent',
    CHECK_IN_MISSING: 'Check in missing',
    CHECK_OUT_MISSING: 'Check out missing',
    WEEKEND: 'Weekend',
    LEAVE: 'Leave',
    LEAVE_TYPE: {
        ANNUAL_LEAVE: 'Annual Leave',
        MATERNAL_LEAVE: 'Maternal Leave',
        FLOATER_LEAVE: 'Floater Leave',
        CASUAL_LEAVE: 'Casual Leave',
        SICK_LEAVE: 'Sick Leave',
        UNPAID_LEAVE: 'Unpaid Leave',
    },
    WORKING_WEEKEND: 'Working on weekend',
    MARKED_PRESENT_VIA_REQUEST_RAISED: 'Marked Present Via Request Raised',
    RAISE_REQUEST: 'Present (Raise Request)',
    HOLIDAY: 'Holiday',
    ON_LEAVE: 'Leave'
}

export enum LeaveStatus {
    ApprovalPending = 0,
    Approved = 1,
    Rejected = 2
}

export const LEAVE_STATUS: { [key in LeaveStatus]: string } = {
    [LeaveStatus.ApprovalPending]: 'Approval Pending',
    [LeaveStatus.Approved]: 'Approved',
    [LeaveStatus.Rejected]: 'Rejected'
};

export enum LeaveTypes {
  SICK_LEAVE = "Sick Leaves",
  ANNUAL_LEAVE = "Annual Leaves",
  FLOATER_LEAVE = "Floater Leaves",
  UNPAID_LEAVE = "Unpaid Leaves",
  CASUAL_LEAVE = "Casual Leaves",
  MATERNAL_LEAVE = "Maternal Leaves",
}

export enum WorkingMethod {
    OFFICE = 0,
    ON_SITE = 1,
    REMOTE = 2,
}

export const WORKING_METHOD_STATUS: { [key in WorkingMethod]: string } = {
    [WorkingMethod.OFFICE]: 'Office',
    [WorkingMethod.ON_SITE]: 'On-site',
    [WorkingMethod.REMOTE]: 'Hybrid'
};

export const WORKING_METHOD_TYPE = {
    OFFICE: 'Office',
    ON_SITE: 'On-site',
    REMOTE: 'Hybrid',
}