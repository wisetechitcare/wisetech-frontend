export interface Referral {
    id: string;
    referralType: string;
    referringCompany: string;
    referringContact: string;
    referredByEmployeeId?: string; // Added: For internal referrals - employee ID
    companyName?: string; // Added: For internal referrals - readonly company name
}

export interface ProjectFormValues {
    projectName: string;
    companyId: string;
    branchId: string;
    contactPerson: string;
    roleInCompany: string;
    contactRoleId: string;
    primaryContact: boolean;
    category: string;
    subCategory: string;
    service: string;
    status: string;
    priority: string;
    startDate: string;
    endDate: string;
    estimatedHours: string;
    budget: string;
    rate?: number;
    cost?: number;
    description: string;
    leadInquiryDate: string;
    leadAssignedTo: string;
    leadSource: string;
    referrals: Referral[];
}

export interface SelectOption {
    id: string;
    name: string;
    [key: string]: any; // For additional properties
}

// Added: Interface for Employee dropdown options in internal referrals
export interface EmployeeOption {
    id: string;
    users: {
        firstName: string;
        lastName: string;
        personalEmailId?: string;
    };
    fullName?: string; // Computed property combining firstName + lastName
}

// Added: Interface for Company Overview dropdown options
export interface CompanyOverviewOption {
    id: string;
    name: string;
}
