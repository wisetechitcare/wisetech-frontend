import { combineReducers } from "@reduxjs/toolkit";
import authReducer from '@redux/slices/auth';
import employeeReducer from '@redux/slices/employee';
import companyReducer from '@redux/slices/company';
import attendanceReducer from '@redux/slices/attendance';
import leavesReducer from '@redux/slices/leaves';
import locationsReducer from '@redux/slices/locations';
import attendanceStatsReducer from '@redux/slices/attendanceStats';
import customColorsReducer from '@redux/slices/customColors';
import rolesAndPermissionsReducer from '@redux/slices/rolesAndPermissions';
import appSettingsReducer from '@redux/slices/appSettings';
import loansReducer from '@redux/slices/loans';
import featureConfigurationReducer from '@redux/slices/featureConfiguration';
import leadProjectCompaniesReducer from '@redux/slices/leadProjectCompanies';
import allEmployeesReducer from '@redux/slices/allEmployees';
import userAgentReducer from '@redux/slices/userAgent';
import timerReducer from '@redux/slices/timer';
import salaryDataReducer from '@redux/slices/salaryData';

const rootReducer = combineReducers({
    auth: authReducer,
    employee: employeeReducer,
    company: companyReducer,
    attendance: attendanceReducer,
    chartSettings: leadProjectCompaniesReducer,
    leaves: leavesReducer,
    locations: locationsReducer,
    attendanceStats: attendanceStatsReducer,
    customColors: customColorsReducer,
    rolesAndPermissions: rolesAndPermissionsReducer,
    appSettings: appSettingsReducer,
    loan: loansReducer,
    featureConfiguration: featureConfigurationReducer,
    allEmployees: allEmployeesReducer,
    userAgent: userAgentReducer,
    timer: timerReducer,
    salaryData: salaryDataReducer
});

export default rootReducer;