import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from 'react-bootstrap';
import { KTIcon } from '@metronic/helpers';
import { getLeadById } from '@services/leads';
import { getClientCompanyById } from '@services/companies';
import { getClientContactById } from '@services/companies';
import { getAllProjectDataForOverviewById } from '@services/projects';
import { miscellaneousIcons } from '@metronic/assets/miscellaneousicons';
import LeadOverview from './components/LeadOverview';
import BlankBasicProjectForm from '@pages/employee/projects/overview/components/BlankBasicProjectForm';
import { leadAndProjectTemplateTypeId } from '@constants/statistics';
import LeadFormModal from './LeadFormModal';
import dayjs from 'dayjs';
import { mapLeadToFormInitialValues } from './utils';
import { getAllLeadStatus } from '@services/lead';

type TabType = 'overview'


interface EntityBase {
    id: string;
    name?: string;
    title?: string;
    [key: string]: any;
}
 
const LeadDetails = () => {
    const { leadId } = useParams<{ leadId: string }>();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [lead, setLead] = useState<any | null>(null);
    const [company, setCompany] = useState<EntityBase | null>(null);
    const [allStatuses, setAllStatuses] = useState([]);
    const [contact, setContact] = useState<EntityBase | null>(null);
    const [project, setProject] = useState<EntityBase | null>(null);
    const [formValues, setFormValues] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showConvertModal, setShowConvertModal] = useState(false);
    const [leadDetailsForConvertToProject, setLeadDetailsForConvertToProject] = useState<any>()
    const [leadTemplateId, setLeadTemplateId] = useState()
    const tabs = [
        { key: 'overview', label: 'Overview' },
        // { key: 'activities', label: 'Activities' },
        // { key: 'proposals', label: 'Proposals' },
        // { key: 'files', label: 'Files' },
    ];
    const [refreshData, setRefreshData] = useState(false);

    const fetchLeadDetails = async () => {
        if (!leadId) {
            setError('No lead ID provided');
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const leadResponse = await getLeadById(leadId);
            const leadData = leadResponse.data.data.lead;
            setLead(leadData);

            const fetchPromises = [];

            if (leadData.companyId) {
                fetchPromises.push(
                    getClientCompanyById(leadData.companyId)
                        .then(setCompany)
                        .catch(console.error)
                );
            }

            if (leadData.contactId) {
                fetchPromises.push(
                    getClientContactById(leadData.contactId)
                        .then(setContact)
                        .catch(console.error)
                );
            }

            if (leadData.projectId) {
                fetchPromises.push(
                    getAllProjectDataForOverviewById(leadData.projectId)
                        .then(setProject)
                        .catch(console.error)
                );
            }

            const res = await Promise.all(fetchPromises);
            setError(null);
        } catch (err) {
            console.error('Error fetching lead details:', err);
            setError('Failed to load lead details. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(()=>{
        async function fetchLeadStatus() {
            const {leadStatuses} = await getAllLeadStatus()
            setAllStatuses(leadStatuses);
        }
        fetchLeadStatus();
    },[])

    useEffect(() => {
        fetchLeadDetails();
    }, [leadId, refreshData]);

    // useEventBus('leadUpdated', fetchLeadDetails);
    // useEventBus('leadUpdated', () => {
    //     fetchLeadDetails();
    // });

    const handleBackClick = () => {
        navigate(-1);
    };

    const handleEditClick = () => {
        // Handle edit functionality
    };
    // Enhanced function to map lead data to project form with robust array handling
    function mapLeadToProjectForm(lead: any) {
        
        try {
            // Helper function to safely extract IDs from array objects
            const extractIds = (array: any[], idField: string = 'id') => {
                if (!Array.isArray(array)) return [];
                return array
                    .filter(item => item && item[idField])
                    .map(item => item[idField]);
            };

            // Helper function to safely extract service data
            const mapServices = (services: any[]) => {
                if (!Array.isArray(services)) return [];
                return services
                    .filter(service => service && (service.serviceId || service.id))
                    .map(service => service.serviceId || service.id);
            };

            // Helper function to map lead categories to category IDs
            const mapCategories = (leadCategories: any[]) => {
                if (!Array.isArray(leadCategories)) return [];
                return leadCategories
                    .filter(cat => cat && cat.categoryId)
                    .map(cat => cat.categoryId);
            };

            // Helper function to map lead subcategories to subcategory IDs
            const mapSubCategories = (leadSubCategories: any[]) => {
                if(typeof(leadSubCategories) === 'object'){
                    leadSubCategories = Object.values(leadSubCategories);
                }
                
                if (!Array.isArray(leadSubCategories)) return [];
                return leadSubCategories
                    .filter(subCat => subCat && subCat.subcategoryId)
                    .map(subCat => subCat.subcategoryId);
            };

            // Helper function to map commercials array with field transformation
            const mapCommercials = (commercials: any[]) => {
                if (!Array.isArray(commercials)) return [];
                return commercials
                    .filter(commercial => commercial)
                    .map(commercial => ({
                        area: commercial.area || "",
                        label: commercial.label || "",
                        costType: commercial.costType || "",
                        rate: commercial.rate || "",
                        cost: commercial.cost || ""
                    }));
            };

            // Helper function to map leadTeams to companies array
            const mapLeadTeamsToCompanies = (leadTeams: any[], leadData: any) => {
                const companies = [];
                
                // If leadTeams exist, map them to companies
                if (Array.isArray(leadTeams) && leadTeams.length > 0) {
                    leadTeams.forEach(team => {
                        if (team && team.companyId) {
                            companies.push({
                                companyId: team.companyId,
                                company: team.companyId,
                                serviceId: team.serviceId || leadData.projectServiceId || "",
                                service: team.serviceId || leadData.projectServiceId || "",
                                branchId: team.branchId || team.subCompanyId || (leadData.branchMappings && leadData.branchMappings[0]?.branchId) || "",
                                branch: team.branchId || team.subCompanyId || (leadData.branchMappings && leadData.branchMappings[0]?.branchId) || "",
                                subCompanyId: team.subCompanyId || "",
                                subCompany: team.subCompany || null,
                                companyTypeId: team.companyTypeId || "",
                                companyType: team.companyType || null,
                                contactPersonId: team.contactId || team.contactPersonId || leadData.contactId || "",
                                contactPerson: team.contactId || team.contactPersonId || leadData.contactId || "",
                                contact: team.contact || null
                            });
                        }
                    });
                }
                
                // If no leadTeams but we have basic company info, add it
                if (companies.length === 0 && leadData.companyId) {
                    companies.push({
                        companyId: leadData.companyId,
                        company: leadData.companyId,
                        serviceId: leadData.projectServiceId || "",
                        service: leadData.projectServiceId || "",
                        branchId: (leadData.branchMappings && leadData.branchMappings[0]?.branchId) || leadData.subCompanyId || "",
                        branch: (leadData.branchMappings && leadData.branchMappings[0]?.branchId) || leadData.subCompanyId || "",
                        subCompanyId: leadData.subCompanyId || "",
                        subCompany: null,
                        companyTypeId: "",
                        companyType: null,
                        contactPersonId: leadData.contactId || "",
                        contactPerson: leadData.contactId || "",
                        contact: null
                    });
                }
                
                return companies;
            };

            // Helper function to map addresses array with field compatibility
            const mapAddresses = (addresses: any[]) => {
                if (!Array.isArray(addresses)) return [];
                return addresses
                    .filter(address => address)
                    .map(address => ({
                        address: address.address || address.projectAddress || "",
                        zipCode: address.zipCode || address.zipcode || "",
                        country: address.country || "",
                        state: address.state || "",
                        city: address.city || "",
                        locality: address.locality || "",
                        latitude: address.latitude || "",
                        longitude: address.longitude || "",
                        mapLocation: address.mapLocation || ""
                    }));
            };
            
            // Extract array data with null checks
            const serviceIds = mapServices(lead.services || []);
            const categoryIds = mapCategories(lead.leadCategories || []);
            const subcategoryIds = mapSubCategories(lead.leadSubCategories || []);
            const commercials = mapCommercials(lead.commercials || []);
            const companies = mapLeadTeamsToCompanies(lead.leadTeams || [], lead);
            const addresses = mapAddresses(lead.addresses || []);
            
            // Build the mapped project form data
            const mappedData = {
                // Basic fields
                title: lead.title || "",
                description: lead.description || "",
                startDate: lead.startDate || "",
                endDate: lead.endDate || "",
                cost: lead.budget || "",
                statusId: lead.statusId || "",
                assignedToId: lead.assignedToId || "",
                notes: lead.notes || "",
                rate: lead.rate || "",
                
                // Array fields with robust handling
                serviceIds: serviceIds.length > 0 ? serviceIds : (lead.projectServiceId ? [lead.projectServiceId] : []),
                categoryIds: categoryIds.length > 0 ? categoryIds : (lead.projectCategoryId ? [lead.projectCategoryId] : []),
                subcategoryIds: subcategoryIds.length > 0 ? subcategoryIds : (lead.projectSubCategoryId ? [lead.projectSubCategoryId] : []),
                commercials: commercials,
                companies: companies,
                addresses: addresses,
                
                // Legacy single field mappings for backward compatibility
                serviceId: lead.projectServiceId || (serviceIds.length > 0 ? serviceIds[0] : ""),
                projectCategoryId: lead.projectCategoryId || (categoryIds.length > 0 ? categoryIds[0] : ""),
                projectSubCategoryId: lead.projectSubCategoryId || (subcategoryIds.length > 0 ? subcategoryIds[0] : ""),
                companyId: lead.companyId || "",
                contactId: lead.contactId || "",
                
                // Additional data
                additionalDetails: lead.additionalDetails || {},
                referrals: Array.isArray(lead.referrals) ? lead.referrals : [],

                // file location
                fileLocation: lead?.fileLocation || "",
                fileLocationCompanyType: lead?.fileLocationCompanyType || "",
                fileLocationCompany: lead?.fileLocationCompany || "",

                // PO details
                poFile: lead?.poFile || lead?.additionalDetails?.poFile || "",
                poNumber: lead?.additionalDetails?.poNumber || lead?.poNumber || "",
                poDate: lead?.additionalDetails?.poDate || lead?.poDate || null,

                // Handle By entries
                handledByEntries: Array.isArray(lead?.handledByEntries) && lead.handledByEntries.length > 0
                    ? lead.handledByEntries.map((entry: any) => ({
                        id: entry.id || Date.now().toString(),
                        employeeId: entry.employeeId || "",
                        handledDate: entry.handledDate ? new Date(entry.handledDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                        handledOutDate: entry.handledOutDate ? new Date(entry.handledOutDate).toISOString().split('T')[0] : "",
                    }))
                    : [],
                
                // Lead metadata
                ...(lead?.id && { leadId: lead.id }),
                leadTemplateId: lead.leadTemplateId || null,
                
                // Template-specific fields for MEP
                ...(leadTemplateId == leadAndProjectTemplateTypeId.mep ? {
                    ...(lead?.additionalDetails ? {
                        ...lead.additionalDetails,
                        ...(lead?.additionalDetails?.zipCode ? {
                            zipcode: lead.additionalDetails.zipCode
                        } : {})
                    } : {})
                } : {})
            };

            return mappedData;

        } catch (error) {
            console.error("Error mapping lead to project form:", error);
            // Fallback to basic mapping if enhanced mapping fails
            return {
                title: lead?.title || "",
                description: lead?.description || "",
                serviceId: lead?.projectServiceId || "",
                projectCategoryId: lead?.projectCategoryId || "",
                projectSubCategoryId: lead?.projectSubCategoryId || "",
                companyId: lead?.companyId || "",
                contactId: lead?.contactId || "",
                startDate: lead?.startDate || "",
                endDate: lead?.endDate || "",
                cost: lead?.budget || "",
                leadTemplateId: lead?.leadTemplateId || null,
                additionalDetails: lead?.additionalDetails || {},
                referrals: lead?.referrals || [],
                serviceIds: [],
                categoryIds: [],
                subcategoryIds: [],
                commercials: [],
                companies: [],
                addresses: []
            };
        }
    }

    // Original basic mapping function (commented out for reference)
    // function mapLeadToProjectForm(lead: any) {
    //     console.log("ALLLleadlead:: ",lead);
    //     
    //     return {
    //         title: lead.title || "",
    //         description: lead.description || "",
    //         serviceId: lead.projectServiceId || "",
    //         projectCategoryId: lead.projectCategoryId || "",
    //         projectSubCategoryId: lead.projectSubCategoryId || "",
    //         companyId: lead.companyId || "",
    //         contactId: lead.contactId || "",
    //         startDate: lead.startDate || "",
    //         endDate: lead.endDate || "",
    //         cost: lead.budget || "",
    //         statusId: lead.statusId || "",
    //         assignedToId: lead.assignedToId || "",
    //         notes: lead.notes || "",
    //         additionalDetails: lead.additionalDetails || {},
    //         rate: lead.rate || "",
    //         referrals: lead.referrals || [],
    //         // Add more mappings as needed,
    //         ...(lead?.id && { leadId: lead?.id }),
    //         leadTemplateId: lead.leadTemplateId || null, // pass separately if form expects
    //         ...(lead?.companyId && {companies: [{
    //             companyId: lead?.companyId,
    //             company: lead?.companyId,
    //             serviceId: lead?.projectServiceId,
    //             service: lead?.projectServiceId,
    //             branchId: lead?.branchMappings[0]?.branchId || "",
    //             branch: lead?.branchMappings[0]?.branchId || "",
    //             contactPersonId: lead?.contactId || "",
    //             contactPerson: lead?.contactId || ""
    //         }]}),
    //         ...(leadTemplateId == leadAndProjectTemplateTypeId.mep ? {
    //             ...(lead?.additionalDetails ? {
    //                 ...lead.additionalDetails,
    //                 ...(lead?.additionalDetails?.zipCode ? {
    //                     zipcode : lead.additionalDetails.zipCode
    //                 }: {})
    //             }: {})
    //         } : {})
    //     };
    // }

    useEffect(() => {
        if (!leadId) return;
        async function fetchAllTheLeadDetails() {
            const allDetails = await getLeadById(leadId as string);
            
            const restructuredData = mapLeadToProjectForm(allDetails?.data?.data?.lead)
            
            setLeadDetailsForConvertToProject(restructuredData);
            const templateId = restructuredData?.leadTemplateId;
            setLeadTemplateId(templateId);
        }
        fetchAllTheLeadDetails();
    }, [leadId])

    // function mapLeadToFormInitialValues(
    //         lead: any      ) {
    //         const additional = lead?.additionalDetails || {};
    //         // Determine template type
    //         const leadTemplateId = lead?.leadTemplateId;
    //         // Map referrals if present
    //         const referrals = Array.isArray(lead?.referrals) && lead.referrals.length
    //           ? lead.referrals.map((r: any) => ({
    //               ...r,
    //               referralType: r?.referralTypeId || "",
    //               referringCompany: r?.referringCompanyId || '',
    //               referringContact: r?.referredByContactId || '',
    //               referredByContactId: r?.referredByContactId || ''
    //               // Add any mapping for referral fields if needed
    //             }))
    //           : [];
          
    //         // Compose the result object
    //         const formValues: any = {
    //           id: lead.id,
    //           leadTemplateId: leadTemplateId,
    //           projectName: lead.title || "",
    //           service: lead.projectServiceId || "",
    //           category: lead.projectCategoryId || "",
    //           subCategory: lead.projectSubCategoryId || "",
    //           startDate: lead.startDate || "",
    //           endDate: lead.endDate || "",
    //           rate: lead.rate || "",
    //           description: lead.description || "",
    //           companyId: lead.companyId || "",
    //           branchId: (lead.branchMappings && lead.branchMappings[0]?.branchId) || "",
    //           company: lead.company?.companyName || "",
    //           contactPersonId: lead?.contactId || "",
    //           contactRoleId: lead.contactRoleId || lead.contact?.contactRoleId || "",
    //           leadInquiryDate: lead.inquiryDate || "",
    //           leadAssignedTo: lead.assignedToId || "",
    //           leadSource: lead.leadSource || "",
    //           referrals: referrals,
    //           source: lead.source || "",
    //           cost: lead.budget || "",
    //           // Additional fields for web-dev
    //           ...(leadTemplateId == leadAndProjectTemplateTypeId.webDev && {
    //             type: additional.type || "",
    //             numberOfPages: additional.numberOfPages || "",
    //           }),
    //           // Additional fields for mep
    //           ...(leadTemplateId == leadAndProjectTemplateTypeId.mep && {
    //             projectArea: additional.projectArea || "",
    //             projectAddress: additional.projectAddress || "",
    //             zipCode: additional.zipCode || "",
    //             mapLocation: additional.mapLocation || "",
    //             country: additional.country || "",
    //             state: additional.state || "",
    //             city: additional.city || "",
    //             locality: additional.locality || "",
    //             poNumber: additional.poNumber || "",
    //             poDate: dayjs(additional.poDate).format("YYYY-MM-DD") || "",
    //           })
    //         };
    //         return formValues;
    //       }

    // function mapLeadToFormInitialValues(
    //         lead: any) {
    //         const additional = lead?.additionalDetails || {};
    //         // Determine template type
    //         const leadTemplateId = lead?.leadTemplateId;
    //         // Map referrals if present
    //         const referrals = Array.isArray(lead?.referrals) && lead.referrals.length
    //             ? lead.referrals.map((r: any) => ({
    //                 ...r,
    //                 referralType: r?.referralTypeId || "",
    //                 referringCompany: r?.referringCompanyId || '',
    //                 referringContact: r?.referredByContactId || '',
    //                 referredByContactId: r?.referredByContactId || ''
    //                 // Add any mapping for referral fields if needed
    //             }))
    //             : [];
    
    //         // Compose the result object
    //         const formValues: any = {
    //           id: lead.id,
    //           leadTemplateId: leadTemplateId,
    //           projectName: lead.title || "",
    //           service: lead.projectServiceId || "",
    //           category: lead.projectCategoryId || "",
    //           subCategory: lead.projectSubCategoryId || "",
    //           startDate: lead.startDate || "",
    //           endDate: lead.endDate || "",
    //           rate: lead.rate || "",
    //           description: lead.description || "",
    //           companyId: lead.companyId || "",
    //           branchId: (lead.branchMappings && lead.branchMappings[0]?.branchId) || "",
    //           company: lead.company?.companyName || "",
    //           contactPersonId: lead?.contactId || "",
    //           contactRoleId: lead.contactRoleId || lead.contact?.contactRoleId || "",
    //           leadInquiryDate: lead.inquiryDate || "",
    //           leadAssignedTo: lead.assignedToId || "",
    //           leadSource: lead.leadSource || "",
    //           referrals: referrals,
    //           source: lead.source || "",
    //           cost: lead.budget || "",
    //           // Additional fields for web-dev
    //           ...(leadTemplateId == leadAndProjectTemplateTypeId.webDev && {
    //             type: additional.type || "",
    //             numberOfPages: additional.numberOfPages || "",
    //             latitude: additional.latitude || "",
    //             longitude: additional.longitude || "",
    //             mapLocation: additional.mapLocation || "",
    //             country: additional.country || "",
    //             state: additional.state || "",
    //             city: additional.city || "",
    //             locality: additional.locality || "",
    //             zipCode: additional.zipCode || "",
    //             poNumber: additional.poNumber || "",
    //             poDate: additional.poDate || "",
    //           }),
    //           // Additional fields for mep
    //           ...(leadTemplateId == leadAndProjectTemplateTypeId.mep && {
    //             projectArea: additional.projectArea || "",
    //             projectAddress: additional.projectAddress || "",
    //             zipCode: additional.zipCode || "",
    //             mapLocation: additional.mapLocation || "",
    //             country: additional.country || "",
    //             state: additional.state || "",
    //             city: additional.city || "",
    //             locality: additional.locality || "",
    //             poNumber: additional.poNumber || "",
    //             poDate: dayjs(additional.poDate).format("YYYY-MM-DD") || "",
    //             latitude: additional.latitude || "",
    //             longitude: additional.longitude || "",
    //           })
    //         };
    //         console.log("formValuesformValues:: ", formValues);
    //         return formValues;
    //     }
    
    const handleConvertToProject = async (projectData: {
        name: string;
        startDate: string;
        description: string;
    }) => {
        if (!leadId) return;
        //   get data from here and open the form
        try {
            // TODO: Replace with actual API call to convert lead to project

            // Show success message
            alert('Lead successfully converted to project!');
            setShowConvertModal(false);

            // Optionally refresh the page or update the UI
            // fetchLeadDetails();
        } catch (error) {
            console.error('Error converting lead to project:', error);
            alert('Failed to convert lead to project. Please try again.');
        }
    };

    const renderTabContent = () => {
        if (isLoading) {
            return (
                <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
                    <div className="spinner-border" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            );
        }

        if (error || !lead) {
            return (
                <div className="alert alert-danger">
                    {error || 'No lead data available'}
                </div>
            );
        }

        switch (activeTab) {
            case 'overview':
                return <LeadOverview lead={lead} />;
            // case 'activities':
            //     return <LeadActivities leadId={lead.id} />;
            // case 'proposals':
            //     return <LeadProposals leadId={lead.id} />;
            // case 'files':
            //     return <LeadFiles leadId={lead.id} />;
            default:
                return null;
        }
    };

    return (
        <div className="d-flex flex-column flex-lg-row p-6">
            <div className="flex-lg-row-fluid ">
                <div className='d-flex align-items-center justify-content-between flex-wrap'>
                    <div className="d-flex align-items-center gap-2 gap-md-3 flex-grow-1">
                        <button
                            className="btn btn-icon btn-bg-light btn-active-color-primary btn-sm"
                            // onClick={handleBackClick}
                            onClick={() => navigate(-1)}
                        >
                            <img
                                src={miscellaneousIcons.leftArrow}
                                alt=""
                                style={{
                                    width: "24px",
                                    height: "24px",
                                    cursor: "pointer"
                                }}
                                className="d-block d-md-none"
                            />
                            <img
                                src={miscellaneousIcons.leftArrow}
                                alt=""
                                style={{
                                    width: "36px",
                                    height: "36px",
                                    cursor: "pointer"
                                }}
                                className="d-none d-md-block"
                            />
                        </button>
                        <div className="flex-grow-1">
                            <div className="text-muted small font-inter d-flex align-items-center">
                                <span style={{
                                    fontFamily: 'Inter, sans-serif',
                                    fontWeight: 500,
                                    fontStyle: 'normal',
                                    fontSize: '14px',
                                    lineHeight: '100%',
                                    letterSpacing: '0',
                                }}>
                                    Lead
                                </span>

                                <span className="ms-2">{`#${lead?.prefix || "N/A"}`}</span>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                                <h2
                                    className="mb-0 text-truncate"
                                    style={{
                                        fontFamily: "Barlow",
                                        fontWeight: "600",
                                        fontSize: "24px",
                                    }}
                                >
                                    {lead?.title}
                                </h2>
                                <div className="d-flex align-items-center gap-1">
                                    <KTIcon iconName="star" className="fs-6 text-warning" />
                                    <span className="text-muted small" >{lead?.priority || 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="d-flex align-items-center gap-1 flex-wrap">
                        {(() => {
                            const isReceived = lead?.status?.name?.toLowerCase() === 'received';
                            const hasProject = !!lead?.projectId;
                            const canConvert = isReceived || hasProject;
                            return (
                                <span
                                    title={!canConvert ? "Lead must be in 'Received' status to convert to a Client Project" : ""}
                                    style={{ display: 'inline-block', cursor: !canConvert ? 'not-allowed' : 'default' }}
                                >
                                    <Button
                                        variant={hasProject ? "success" : "primary"}
                                        onClick={() => canConvert && setShowConvertModal(true)}
                                        className="me-2"
                                        disabled={!canConvert}
                                        style={{
                                            ...(hasProject ? { backgroundColor: '#28a745', borderColor: '#28a745' } : {}),
                                            ...(!canConvert ? { pointerEvents: 'none', opacity: 0.6 } : {}),
                                        }}
                                    >
                                        <KTIcon iconName="files" className="fs-2" />
                                        {hasProject ? "View/Edit Client Project" : "Convert to Client Project"}
                                    </Button>
                                </span>
                            );
                        })()}
                        <Button
                            variant="primary"
                            className="me-2"
                            onClick={() => {
                                const currLead = lead;
                                const formLeadDataFinal = mapLeadToFormInitialValues(currLead);
                                setFormValues(formLeadDataFinal);
                                // setSelectedLead(row.original);
                                // setFormValues(lead);
                                // setIsModalOpen(true);
                            }}
                        >
                            <KTIcon iconName="files" className="fs-2" />
                            Edit Details
                        </Button>
                    </div>
                </div>
                <div className="card-body mt-8">
                    <div className="d-flex overflow-auto h-55px mb-1">
                        <ul className="nav nav-stretch nav-line-tabs nav-line-tabs-2x border-transparent fs-5 fw-bold flex-nowrap">
                            {tabs.map((tab) => (
                                <li key={tab.key}>
                                    <a
                                        className={`
                                  nav-link
                                  px-6 py-2
                                  rounded-pill
                                  border
                                  ${activeTab === tab.key
                                                ? 'border-primary text-primary'
                                                : 'border-black text-black'}
                                  hover:bg-gray-100
                                  transition
                                  me-4
                                  cursor-pointer
                                `}
                                        onClick={() => setActiveTab(tab.key as TabType)}
                                        style={{ fontFamily: 'Inter, sans-serif',}}
                                    >
                                        {tab.label}
                                    </a>
                                </li>

                            ))}
                        </ul>
                    </div>

                    <div className="tab-content">
                        {renderTabContent()}
                    </div>
                    

                </div>
            </div>
            {/* <ConvertToClientProject
                show={showConvertModal}
                onHide={() => setShowConvertModal(false)}
                onConvert={handleConvertToProject}
                leadName={lead?.name || ''}
            /> */}
            {formValues &&
                <LeadFormModal
                    leadTemplateId={formValues?.leadTemplateId}
                    open={true}
                    onClose={() => setFormValues(null)}
                    title={`Edit ${formValues.title || formValues?.projectName} Lead`}
                    initialData={{ id: formValues?.leadTemplateId }}
                    initialFormData={formValues}
                    isEditMode={true}
                />
            }
            {showConvertModal && <BlankBasicProjectForm
                showBlankProjectForm={showConvertModal}
                onHide={() => setShowConvertModal(false)}
                // Only pass lead conversion data when creating a NEW project (not editing an existing one)
                // When hasProject is true the user clicked "View/Edit Client Project" — load from projectData only
                intitalDataForLeadToProjectConversion={lead?.projectId ? undefined : leadDetailsForConvertToProject}
                selectedProjectType={leadTemplateId}
                setRefreshData={setRefreshData}
                editingProjectId={lead?.projectId || null}
                />}
        </div>
    );
};
// Helper function to get priority color
const getPriorityColor = (priority: string) => {
    switch ((priority || '').toLowerCase()) {
        case 'high': return 'danger';
        case 'medium': return 'warning';
        case 'low': return 'success';
        default: return 'light';
    }
};
export default LeadDetails;
