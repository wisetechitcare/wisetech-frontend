export interface Company {
  id: string;
  logo?: string;
  companyName: string;
  companyTypeId?: string;
  companyTypeName?: string;
  status: string;
  overallRating: number;
  phone?: string;
  prefix?: string;
  phone2?: string;
  fax?: string;
  email?: string;
  website?: string;
  address?: string;
  area?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  blacklisted: boolean;
  visibility: string;
  note?: string;
  isActive: boolean;
  branches?: number;
  location?: string;
  latitude?: number | string;
  longitude?: number | string;
  references?: any[];
  referenceType?: string;
  internalReferenceEmployeeId?: string;
  externalReferenceContactId?: string;
}


export interface Branch {
  id: string;
  name: string;
  value: string;
}

export  interface ContactRoleType {
  id: string;
  name: string;
}

export interface Country {
  id: string | number | undefined;
  name: string;
  iso2?: string;
  iso3?: string;
  native?: string;
  [key: string]: any;
}

export interface State {
  id: string | number;
  name: string;
  iso2?: string;
  state_code?: string;
  [key: string]: any;
}

export interface City {
  id: string | number;
  name: string;
  [key: string]: any;
}

export interface ContactFormValues {
  // Company Details
  companyId: string;
  branchId: string;
  branch?: string;
  roleInCompany: string;
  contactRoleId: string;
  statusId?: string;
  primaryContact?: boolean;
  isPrimaryContact?: boolean;
  
  // Personal Details
  fullName: string;
  dob?: string;
  anniversary?: string;
  gender: string;
  dateOfBirth?: string;
  

  // Contact Details
  phone: string;
  phone2: string;
  email: string;
  
  // Address
  country: string;
  zipCode: string;
  area: string;
  city: string;
  state: string;
  address: string;
  locationOnMap: string;
  latitude: string;
  longitude: string;
  isContactActive: boolean;
  gmbLink: string;
  googleMapLink: string;
  
  // Portal
  visibility: 'Only Me' | 'Everyone' | 'Super Admins' | 'Admins' | 'Temporary';
  note: string;
  
  // Profile Photo
  profilePhoto: File | null;
}