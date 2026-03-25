// Define all valid events and their payload(optional) types for event emitter
export type AppEventMap = {
    userRaisedRequestSubmitted: { formId: string }; 
    weekendColor: { color: string }; 
    reimbursementRecords: { records: any };
    holidayUpdated: { id: string };
    holidayDeleted: { id: string };
    leadStatusCreated: { id: string };
    leadStatusUpdated: { id: string };
    leadStatusDeleted: { id: string };
    leadReferralTypeCreated: { id: string };
    leadReferralTypeUpdated: { id: string };
    leadReferralTypeDeleted: { id: string };
    leadDirectSourceCreated: { id: string };
    leadDirectSourceUpdated: { id: string };
    leadDirectSourceDeleted: { id: string };
    leadCancellationReasonCreated: { id: string };
    leadCancellationReasonUpdated: { id: string };

    projectCategoryCreated: { id: string };
    projectCategoryUpdated: { id: string };
    projectCategoryDeleted: { id: string };
    projectSubcategoryCreated: { id: string };
    projectSubcategoryUpdated: { id: string };
    projectSubcategoryDeleted: { id: string };
    projectServiceCreated: { id: string };
    projectServiceUpdated: { id: string };
    projectServiceDeleted: { id: string };
    projectStatusCreated: { id: string };
    projectStatusUpdated: { id: string };
    projectStatusDeleted: { id: string };
    companyTypeCreated: { id: string };
    companyTypeUpdated: { id: string };
    companyTypeDeleted: { id: string };
    contactRoleTypeCreated: { id: string };
    contactRoleTypeUpdated: { id: string };
    contactRoleTypeDeleted: { id: string };
    contactStatusCreated: { id: string };
    contactStatusUpdated: { id: string };
    contactStatusDeleted: { id: string };
    companyCreated: { id: string };
    companyServiceCreated: { id: string };
    companyServiceUpdated: { id: string };
    companyServiceDeleted: { id: string };
    branchCreated: { id: string };
    clientContactUpdated: { id: string };
    ratingFactorCreated: { id: string };
    ratingFactorUpdated: { id: string };
    ratingFactorDeleted: { id: string };
    stakeholderCreated: { id: string };
    stakeholderUpdated: { id: string };
    stakeholderDeleted: { id: string };
    meetingUpdated: { id: string };
    meetingDeleted: { id: string };

    leadCreated: { id: string };
    leadUpdated: { id: string };
    leadDeleted: { id: string };

    projectCreated: { id: string };
    projectUpdated: { id: string };
    projectDeleted: { id: string };

    taskStatusCreated: { id: string };
    taskStatusUpdated: { id: string };
    // taskStatusDeleted: { id: string };
    taskPriorityCreated: { id: string };
    taskPriorityUpdated: { id: string };
    // taskPriorityDeleted: { id: string };
    presetTaskCreated: { id: string };
    presetTaskUpdated: { id: string };
    presetTaskDeleted: { id: string };
    
    timesheetDeleted: { id: string };
    closeChartDialogModal: {  };
    chartSettingsUpdated: {  };

    NewTimeLogFromCreated: { id: string };
    organisationProfileUpdated: {  };
    leaveManagementRequestCreated: { requestId: string };
    leaveManagementRequestUpdated: { requestId: string };
    leaveRequestCreated: { leaveId: string };
    leaveRequestUpdated: { leaveId: string };
    organizationConfigCreated: { type: string };
    organizationConfigUpdated: { id: string };
    employeeConfigCreated: { type: string };
    employeeConfigUpdated: { id: string };
    attendanceRequestCreated: { id: string };
    attendanceRequestUpdated: { id: string };
    attendanceRequestApproved: { id: string };
    attendanceRequestRejected: { id: string };
    faqCreated: { id: string };
    faqUpdated: { id: string };
    faqDeleted: { id: string };
    dashboardSettingsUpdated: { sections: any[] };
  };

  export type AppEventKey = keyof AppEventMap;
  
  export const EVENT_KEYS: Record<AppEventKey, AppEventKey> = {
    userRaisedRequestSubmitted: 'userRaisedRequestSubmitted',
    weekendColor: 'weekendColor',
    reimbursementRecords: 'reimbursementRecords',
    holidayUpdated: 'holidayUpdated',
    holidayDeleted: 'holidayDeleted',
    leadStatusCreated: 'leadStatusCreated',
    leadStatusUpdated: 'leadStatusUpdated',
    leadStatusDeleted: 'leadStatusDeleted',
    leadReferralTypeCreated: 'leadReferralTypeCreated',
    leadReferralTypeUpdated: 'leadReferralTypeUpdated',
    leadReferralTypeDeleted: 'leadReferralTypeDeleted',
    leadDirectSourceCreated: 'leadDirectSourceCreated',
    leadDirectSourceUpdated: 'leadDirectSourceUpdated',
    leadDirectSourceDeleted: 'leadDirectSourceDeleted',
    leadCancellationReasonCreated: 'leadCancellationReasonCreated',
    leadCancellationReasonUpdated: 'leadCancellationReasonUpdated',

    projectCategoryCreated: 'projectCategoryCreated',
    projectCategoryUpdated: 'projectCategoryUpdated',
    projectCategoryDeleted: 'projectCategoryDeleted',
    projectSubcategoryCreated: 'projectSubcategoryCreated',
    projectSubcategoryUpdated: 'projectSubcategoryUpdated',
    projectSubcategoryDeleted: 'projectSubcategoryDeleted',
    projectServiceCreated: 'projectServiceCreated',
    projectServiceUpdated: 'projectServiceUpdated',
    projectServiceDeleted: 'projectServiceDeleted',
    projectStatusCreated: 'projectStatusCreated',
    projectStatusUpdated: 'projectStatusUpdated',
    projectStatusDeleted: 'projectStatusDeleted',
    companyTypeCreated: 'companyTypeCreated',
    companyTypeUpdated: 'companyTypeUpdated',
    companyTypeDeleted: 'companyTypeDeleted',
    contactRoleTypeCreated: 'contactRoleTypeCreated',
    contactRoleTypeUpdated: 'contactRoleTypeUpdated',
    contactRoleTypeDeleted: 'contactRoleTypeDeleted',
    contactStatusCreated: 'contactStatusCreated',
    contactStatusUpdated: 'contactStatusUpdated',
    contactStatusDeleted: 'contactStatusDeleted',
    companyCreated: 'companyCreated',
    companyServiceCreated: 'companyServiceCreated',
    companyServiceUpdated: 'companyServiceUpdated',
    companyServiceDeleted: 'companyServiceDeleted',
    branchCreated: 'branchCreated',
    clientContactUpdated: 'clientContactUpdated',
    ratingFactorCreated: 'ratingFactorCreated',
    ratingFactorUpdated: 'ratingFactorUpdated',
    ratingFactorDeleted: 'ratingFactorDeleted',
    stakeholderCreated: 'stakeholderCreated',
    stakeholderUpdated: 'stakeholderUpdated',
    stakeholderDeleted: 'stakeholderDeleted',
    meetingUpdated: 'meetingUpdated',
    meetingDeleted: 'meetingDeleted',

    leadCreated: 'leadCreated',
    leadUpdated: 'leadUpdated',
    leadDeleted: 'leadDeleted',

    projectCreated: 'projectCreated',
    projectUpdated: 'projectUpdated',
    projectDeleted: 'projectDeleted',

    taskStatusCreated: 'taskStatusCreated',
    taskStatusUpdated: 'taskStatusUpdated',
    // taskStatusDeleted: 'taskStatusDeleted',
    taskPriorityCreated: 'taskPriorityCreated',
    taskPriorityUpdated: 'taskPriorityUpdated',

    // taskPriorityDeleted: 'taskPriorityDeleted',
    presetTaskCreated: 'presetTaskCreated',
    presetTaskUpdated: 'presetTaskUpdated',
    presetTaskDeleted: 'presetTaskDeleted',
    timesheetDeleted: 'timesheetDeleted',
    closeChartDialogModal: 'closeChartDialogModal',
    chartSettingsUpdated: 'chartSettingsUpdated',

    NewTimeLogFromCreated: 'NewTimeLogFromCreated',
    organisationProfileUpdated: 'organisationProfileUpdated',
    leaveManagementRequestCreated: 'leaveManagementRequestCreated',
    leaveManagementRequestUpdated: 'leaveManagementRequestUpdated',
    leaveRequestCreated: 'leaveRequestCreated',
    leaveRequestUpdated: 'leaveRequestUpdated',
    organizationConfigCreated: 'organizationConfigCreated',
    organizationConfigUpdated: 'organizationConfigUpdated',
    employeeConfigCreated: 'employeeConfigCreated',
    employeeConfigUpdated: 'employeeConfigUpdated',
    attendanceRequestCreated: 'attendanceRequestCreated',
    attendanceRequestUpdated: 'attendanceRequestUpdated',
    attendanceRequestApproved: 'attendanceRequestApproved',
    attendanceRequestRejected: 'attendanceRequestRejected',
    faqCreated: 'faqCreated',
    faqUpdated: 'faqUpdated',
    faqDeleted: 'faqDeleted',
    dashboardSettingsUpdated: 'dashboardSettingsUpdated',

  };