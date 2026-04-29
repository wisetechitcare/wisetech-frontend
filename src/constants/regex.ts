export const employeeOnBardingFormRegexes: { [key: string]: RegExp } = {
    "firstName": /^[a-zA-Z\s]+$/,
    "lastName": /^[a-zA-Z\s]+$/,
    "personalPhoneNumber": /^[0-9]+$/,
    "alternatePhoneNumber": /^[0-9]+$/,
    "familyInfo.name": /^[a-zA-Z\s]+$/,
    "familyInfo.relationship": /^[a-zA-Z\s]+$/,
    "familyInfo.mobileNumber": /^[0-9]+$/,
    "bankInfo.accountName": /^[a-zA-Z\s]+$/,
    "bankInfo.accountNumber": /^[0-9]+$/,
    "addressInfo.permanentPostalCode": /^[0-9]+$/,
    "companyPhoneNumber": /^[0-9]+$/,
    "emergencyDetails.emergencyContactName": /^[a-zA-Z\s]+$/,
    "emergencyDetails.emergencyContactNumber": /^[0-9]+$/,
  };
  