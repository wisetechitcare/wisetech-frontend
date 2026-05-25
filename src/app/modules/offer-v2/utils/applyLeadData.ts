import { OfferData } from '../types/offer.types';

export const applyLeadData = (leadData: any, companyData?: any, contactData?: any, currentUser?: any): OfferData => {
  // Map raw lead data to our OfferData structure
  
  // Extract addresses
  const addressObj = leadData?.addresses?.[0] || {};
  const companyAddressObj = companyData?.addresses?.[0] || {};
  
  // Extract commercials for area and cost
  const totalArea = leadData?.commercials?.reduce((sum: number, comm: any) => sum + (parseFloat(comm.area) || 0), 0) || leadData?.built_up_area || 'N/A';
  
  const getContactTitle = () => {
    if (contactData?.title || contactData?.prefix) return contactData.title || contactData.prefix;
    if (leadData?.contact_title) return leadData.contact_title;
    
    const g = (contactData?.gender || leadData?.gender || '').toUpperCase();
    if (g === 'MALE') return 'Mr';
    if (g === 'FEMALE') return 'Ms';
    return '';
  };
  
  return {
    proposalTemplateId: leadData?.proposalTemplateId || leadData?.leadTemplateId || '',
    contactPerson: contactData?.name || contactData?.fullName || leadData?.clientContactPerson || leadData?.contactPerson?.name || leadData?.client_contact_name || leadData?.contact_person || 'N/A',
    contactTitle: getContactTitle(),
    projectName: leadData?.name || leadData?.title || leadData?.project_name || 'N/A',
    submittedBy: currentUser?.firstName ? `${currentUser.firstName} ${currentUser.lastName || ''}`.trim() : (leadData?.createdBy?.name || leadData?.assignedToName || leadData?.created_by || 'N/A'),
    inquiryNumber: leadData?.prefix || leadData?.inquiryNo || leadData?.inquiry_no || 'N/A',
    revisionNumber: leadData?.revisionNo || leadData?.revisionCount || 'Rev 0',
    offerDate: leadData?.inquiryDate ? new Date(leadData.inquiryDate).toLocaleDateString() : (leadData?.formatted_date || new Date().toLocaleDateString()),
    companyName: companyData?.name || companyData?.companyName || leadData?.clientCompany?.name || leadData?.client_company_name || leadData?.company_name || 'N/A',
    companyAddress: companyAddressObj?.address || addressObj?.projectAddress || addressObj?.address || leadData?.company_address || 'N/A',
    companyArea: companyAddressObj?.locality || addressObj?.locality || leadData?.company_area || '',
    companyCity: companyAddressObj?.city || addressObj?.city || leadData?.company_city || '',
    companyZipcode: companyAddressObj?.zipCode || addressObj?.zipCode || leadData?.company_zipcode || '',
    companyState: companyAddressObj?.state || addressObj?.state || leadData?.company_state || '',
    companyCountry: companyAddressObj?.country || addressObj?.country || leadData?.company_country || '',
    services: Array.isArray(leadData?.services) 
      ? leadData.services.map((s: any) => s?.service?.name || s?.name || s?.serviceId || '').filter(Boolean).join(', ') 
      : (leadData?.services || 'N/A'),
    projectLocation: addressObj?.city || addressObj?.locality || addressObj?.projectAddress || addressObj?.address || leadData?.project_location || 'N/A',
    totalProjectArea: totalArea !== 'N/A' && totalArea > 0 ? String(totalArea) : 'N/A',
    totalProjectCost: leadData?.budget || leadData?.total_project_cost || 'N/A',
    completionDate: leadData?.endDate ? new Date(leadData.endDate).toLocaleDateString() : (leadData?.completion_date || 'N/A'),
    feeBreakup: leadData?.fee_breakup || '',
    paymentSchedule: leadData?.payment_data || '',
    stagePercentages: leadData?.stage_percentages || '',
    paymentData: leadData?.payment_data || '',
    meetingSchedule: leadData?.meeting_schedule || '',
    meetingCounts: leadData?.meeting_counts || '',
    notes: '',
    clauses: '',
    projectSpecificParagraphs: '',
  };
};
