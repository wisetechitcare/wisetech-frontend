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
  projectCompanyMappings?: {
    project?: {
      cost?: number | string;
    };
  }[];
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

export interface ContactService {
  id: string;
  name: string;
  color?: string;
  isActive?: boolean;
}

// One row of the contact ⇄ service join table, as returned by the API.
export interface ContactServiceMapping {
  id?: string;
  serviceId: string;
  service?: ContactService;
}

// One row of the contact ⇄ sub-service join table.
export interface ContactSubServiceMapping {
  id?: string;
  subServiceId: string;
  subService?: { id: string; name: string };
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

/** One phone / email of a contact, as the API returns it. */
export interface ContactChannel {
  id: string;
  type: "EMAIL" | "PHONE";
  value: string;
  label?: string | null;
  isPrimary: boolean;
}

/** One stint of a contact at a client company. `endDate` null = the current company. */
export interface ContactCompanyStint {
  id: string;
  companyId: string;
  roleInCompany?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  company?: { id: string; companyName: string; logo?: string | null } | null;
  contactRole?: { id: string; name: string } | null;
}

/** One row of the contact form's phone / email list. `key` is client-only (React list key). */
export interface ContactChannelInput {
  key: string;
  value: string;
  label: string;
  isPrimary: boolean;
}

export interface ContactFormValues {
  // Company Details
  companyId: string;
  branchId: string;
  branch?: string;
  roleInCompany: string;
  contactRoleId: string;
  statusId?: string;
  serviceIds: string[];
  serviceMappings?: ContactServiceMapping[];
  subServiceIds: string[];
  subServiceMappings?: ContactSubServiceMapping[];
  primaryContact?: boolean;
  isPrimaryContact?: boolean;
  
  // Personal Details
  fullName: string;
  dob?: string;
  anniversary?: string;
  gender: string;
  dateOfBirth?: string;
  

  // Contact Details. The form edits `phones` / `emails`; the server writes the primary ones
  // back to `phone` / `phone2` / `email`, which is what the rest of the app reads.
  phones: ContactChannelInput[];
  emails: ContactChannelInput[];
  phone?: string;
  phone2?: string;
  email?: string;
  channels?: ContactChannel[];
  companyHistory?: ContactCompanyStint[];
  /** Set by "Move to another company": the day the new stint starts. */
  companyMovedOn?: string;

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