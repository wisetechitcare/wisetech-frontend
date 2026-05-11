import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Dropdown } from 'react-bootstrap';
import { KTIcon } from '@metronic/helpers';
import { getLeadById, exportLeadDocx, exportLeadPdf } from '@services/leads';
import { getClientCompanyById, getClientContactById } from '@services/companies';
import { getAllProjectDataForOverviewById } from '@services/projects';
import { getAllLeadStatus } from '@services/lead';
import { miscellaneousIcons } from '@metronic/assets/miscellaneousicons';
import { leadAndProjectTemplateTypeId } from '@constants/statistics';
import { useEventBus } from '@hooks/useEventBus';
import { EVENT_KEYS } from '@constants/eventKeys';
import { mapLeadToFormInitialValues } from './utils';
import dayjs from 'dayjs';
import { useAuth } from '../../../../modules/auth';

import LeadOverview from './components/LeadOverview';
import LeadFiles from './components/LeadFiles';
import LeadFormModal from './LeadFormModal';
import BlankBasicProjectForm from '@pages/employee/projects/overview/components/BlankBasicProjectForm';
import ProposalTemplatePage from './components/ProposalTemplatePage';
import { ExportCenterModal } from './components/dms/components/ExportCenterModal';
import { DMSProvider } from './components/dms/store/DmsContext';

type TabType = 'overview' | 'files';

interface EntityBase {
    id: string;
    name?: string;
    title?: string;
    [key: string]: any;
}

const LeadDetails: React.FC = () => {
    const { currentUser } = useAuth();
    const { leadId } = useParams<{ leadId: string }>();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [lead, setLead] = useState<any | null>(null);
    const [company, setCompany] = useState<EntityBase | null>(null);
    const [contact, setContact] = useState<EntityBase | null>(null);
    const [project, setProject] = useState<EntityBase | null>(null);
    const [allStatuses, setAllStatuses] = useState<any[]>([]);
    
    const [formValues, setFormValues] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showConvertModal, setShowConvertModal] = useState(false);
    const [refreshData, setRefreshData] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showProposalModal, setShowProposalModal] = useState(false);

    const [leadDetailsForConvertToProject, setLeadDetailsForConvertToProject] = useState<any>(null);
    const [leadTemplateId, setLeadTemplateId] = useState<any>(null);

    const tabs = [
        { key: 'overview', label: 'Overview' },
        { key: 'files', label: 'Files' },
    ];

    const handleExport = async (type: 'docx' | 'pdf' | 'excel', exportData: any) => {
        const enhancedExportData = {
            ...exportData,
            userId: currentUser?.id,
            userName: `${currentUser?.first_name || ''} ${currentUser?.last_name || ''}`.trim()
        };
        if (!lead?.id) return;
        if (type === 'excel') {
            alert('Excel export is not supported by the backend yet.');
            return;
        }
        setIsGenerating(true);
        try {
            const data = type === 'docx' 
                ? await exportLeadDocx(lead.id, enhancedExportData) 
                : await exportLeadPdf(lead.id, enhancedExportData);

            const blob = new Blob([data], {
                type: type === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf'
            });

            if ('showSaveFilePicker' in window) {
                try {
                    const handle = await (window as any).showSaveFilePicker({
                        suggestedName: `Lead_${lead.title || lead.id}.${type}`,
                        types: [{
                            description: type === 'docx' ? 'Word Document' : 'PDF Document',
                            accept: { [blob.type]: [`.${type}`] }
                        }]
                    });
                    const writable = await handle.createWritable();
                    await writable.write(blob);
                    await writable.close();
                    setIsGenerating(false);
                    setShowProposalModal(false);
                    return;
                } catch (err: any) {
                    if (err.name === 'AbortError') {
                        setIsGenerating(false);
                        return;
                    }
                }
            }

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Lead_${lead.title || lead.id}.${type}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error(`Error exporting ${type}:`, error);
            alert(`Failed to export ${type}. Please try again.`);
        } finally {
            setIsGenerating(false);
            setShowProposalModal(false);
        }
    };

    const fetchLeadDetails = useCallback(async () => {
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

            await Promise.all(fetchPromises);
            setError(null);
        } catch (err) {
            console.error('Error fetching lead details:', err);
            setError('Failed to load lead details. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [leadId]);

    // Enhanced function to map lead data to project form
    const mapLeadToProjectForm = useCallback((lead: any) => {
        try {
            const mapCommercials = (commercials: any[]) => {
                if (!Array.isArray(commercials)) return [];
                return commercials
                    .filter(c => c)
                    .map(c => ({
                        area: c.area || "",
                        label: c.label || "",
                        costType: c.costType || "",
                        rate: c.rate || "",
                        cost: c.cost || ""
                    }));
            };

            const mapLeadTeamsToCompanies = (leadTeams: any[], leadData: any) => {
                const companies: any[] = [];
                if (Array.isArray(leadTeams)) {
                    leadTeams.forEach(team => {
                        if (team?.companyId) {
                            companies.push({
                                companyId: team.companyId,
                                company: team.companyId,
                                serviceId: team.serviceId || leadData.projectServiceId || "",
                                service: team.serviceId || leadData.projectServiceId || "",
                                branchId: team.branchId || team.subCompanyId || (leadData.branchMappings && leadData.branchMappings[0]?.branchId) || "",
                                branch: team.branchId || team.subCompanyId || (leadData.branchMappings && leadData.branchMappings[0]?.branchId) || "",
                                subCompanyId: team.subCompanyId || "",
                                companyTypeId: team.companyTypeId || "",
                                contactPersonId: team.contactId || team.contactPersonId || leadData.contactId || "",
                            });
                        }
                    });
                }
                
                if (companies.length === 0 && leadData.companyId) {
                    companies.push({
                        companyId: leadData.companyId,
                        company: leadData.companyId,
                        serviceId: leadData.projectServiceId || "",
                        service: leadData.projectServiceId || "",
                        branchId: (leadData.branchMappings && leadData.branchMappings[0]?.branchId) || leadData.subCompanyId || "",
                        branch: (leadData.branchMappings && leadData.branchMappings[0]?.branchId) || leadData.subCompanyId || "",
                        subCompanyId: leadData.subCompanyId || "",
                        contactPersonId: leadData.contactId || "",
                    });
                }
                return companies;
            };

            const mapAddresses = (addresses: any[]) => {
                if (!Array.isArray(addresses)) return [];
                return addresses
                    .filter(a => a)
                    .map(a => ({
                        address: a.address || a.projectAddress || "",
                        zipCode: a.zipCode || a.zipcode || "",
                        country: a.country || "",
                        state: a.state || "",
                        city: a.city || "",
                        locality: a.locality || "",
                        latitude: a.latitude || "",
                        longitude: a.longitude || "",
                        mapLocation: a.mapLocation || ""
                    }));
            };

            const serviceIds = Array.isArray(lead.services) ? lead.services.map((s: any) => s.serviceId || s.id) : [];
            const categoryIds = Array.isArray(lead.leadCategories) ? lead.leadCategories.map((c: any) => c.categoryId) : [];
            const subcategoryIds = Array.isArray(lead.leadSubCategories) ? Object.values(lead.leadSubCategories).map((s: any) => s.subcategoryId) : [];

            return {
                title: lead.title || "",
                description: lead.description || "",
                startDate: lead.startDate || "",
                endDate: lead.endDate || "",
                cost: lead.budget || "",
                statusId: lead.statusId || "",
                assignedToId: lead.assignedToId || "",
                notes: lead.notes || "",
                rate: lead.rate || "",
                serviceIds: serviceIds.length > 0 ? serviceIds : (lead.projectServiceId ? [lead.projectServiceId] : []),
                categoryIds: categoryIds.length > 0 ? categoryIds : (lead.projectCategoryId ? [lead.projectCategoryId] : []),
                subcategoryIds: subcategoryIds.length > 0 ? subcategoryIds : (lead.projectSubCategoryId ? [lead.projectSubCategoryId] : []),
                commercials: mapCommercials(lead.commercials || []),
                companies: mapLeadTeamsToCompanies(lead.leadTeams || [], lead),
                addresses: mapAddresses(lead.addresses || []),
                serviceId: lead.projectServiceId || (serviceIds.length > 0 ? serviceIds[0] : ""),
                projectCategoryId: lead.projectCategoryId || (categoryIds.length > 0 ? categoryIds[0] : ""),
                projectSubCategoryId: lead.projectSubCategoryId || (subcategoryIds.length > 0 ? subcategoryIds[0] : ""),
                companyId: lead.companyId || "",
                contactId: lead.contactId || "",
                additionalDetails: lead.additionalDetails || {},
                referrals: Array.isArray(lead.referrals) ? lead.referrals : [],
                fileLocation: lead?.fileLocation || "",
                fileLocationCompanyType: lead?.fileLocationCompanyType || "",
                fileLocationCompany: lead?.fileLocationCompany || "",
                poFile: lead?.poFile || lead?.additionalDetails?.poFile || "",
                poNumber: lead?.additionalDetails?.poNumber || lead?.poNumber || "",
                poDate: lead?.additionalDetails?.poDate || lead?.poDate || null,
                handledByEntries: Array.isArray(lead?.handledByEntries) ? lead.handledByEntries.map((entry: any) => ({
                    id: entry.id || Date.now().toString(),
                    employeeId: entry.employeeId || "",
                    handledDate: entry.handledDate ? new Date(entry.handledDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                    handledOutDate: entry.handledOutDate ? new Date(entry.handledOutDate).toISOString().split('T')[0] : "",
                })) : [],
                leadId: lead.id,
                leadTemplateId: lead.leadTemplateId || null,
            };
        } catch (error) {
            console.error("Error mapping lead to project form:", error);
            return { title: lead?.title || "", cost: lead?.budget || "", leadTemplateId: lead?.leadTemplateId || null };
        }
    }, []);

    useEffect(() => {
        async function fetchLeadStatus() {
            try {
                const { leadStatuses } = await getAllLeadStatus();
                setAllStatuses(leadStatuses || []);
            } catch (err) {
                console.error('Error fetching lead statuses:', err);
            }
        }
        fetchLeadStatus();
    }, []);

    useEffect(() => {
        fetchLeadDetails();
    }, [fetchLeadDetails, refreshData]);

    useEffect(() => {
        if (!leadId) return;
        async function fetchAllTheLeadDetails() {
            try {
                const response = await getLeadById(leadId as string);
                const leadData = response?.data?.data?.lead;
                const restructuredData = mapLeadToProjectForm(leadData);
                setLeadDetailsForConvertToProject(restructuredData);
                setLeadTemplateId(restructuredData?.leadTemplateId);
            } catch (err) {
                console.error('Error fetching extended lead details:', err);
            }
        }
        fetchAllTheLeadDetails();
    }, [leadId, mapLeadToProjectForm]);

    useEventBus(EVENT_KEYS.leadUpdated, fetchLeadDetails);

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
            case 'files':
                return <LeadFiles lead={lead} />;
            default:
                return null;
        }
    };

    if (isLoading || !lead) {
        return (
            <div className="d-flex justify-content-center align-items-center min-vh-100">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <DMSProvider
            leadId={lead.id}
            inquiryNumber={lead.inquiryNo || lead.prefix || 'N/A'}
            leadTitle={lead.title || lead.name || 'Lead'}
        >
            <div className="d-flex flex-column flex-lg-row p-6">
                <div className="flex-lg-row-fluid">
                    <div className='d-flex align-items-center justify-content-between flex-wrap'>
                        <div className="d-flex align-items-center gap-2 gap-md-3 flex-grow-1">
                            <button
                                className="btn btn-icon btn-bg-light btn-active-color-primary btn-sm"
                                onClick={() => navigate(-1)}
                            >
                                <img
                                    src={miscellaneousIcons.leftArrow}
                                    alt="Back"
                                    style={{ width: "24px", height: "24px", cursor: "pointer" }}
                                    className="d-block d-md-none"
                                />
                                <img
                                    src={miscellaneousIcons.leftArrow}
                                    alt="Back"
                                    style={{ width: "36px", height: "36px", cursor: "pointer" }}
                                    className="d-none d-md-block"
                                />
                            </button>
                            <div className="flex-grow-1">
                                <div className="text-muted small font-inter d-flex align-items-center">
                                    <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: '14px' }}>Lead</span>
                                    <span className="ms-2">{`#${lead?.prefix || "N/A"}`}</span>
                                </div>
                                <div className="d-flex align-items-center gap-2">
                                    <h2 className="mb-0 text-truncate" style={{ fontFamily: "Barlow", fontWeight: "600", fontSize: "24px" }}>
                                        {lead?.title}
                                    </h2>
                                    <div className="d-flex align-items-center gap-1">
                                        <KTIcon iconName="star" className="fs-6 text-warning" />
                                        <span className="text-muted small">{lead?.priority || 0}</span>
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
                                            style={hasProject ? { backgroundColor: '#28a745', borderColor: '#28a745' } : {}}
                                        >
                                            <KTIcon iconName="files" className="fs-2" />
                                            {hasProject ? "View/Edit Client Project" : "Convert to Client Project"}
                                        </Button>
                                    </span>
                                );
                            })()}

                            <Dropdown className="me-2">
                                <Dropdown.Toggle variant="info" id="dropdown-basic" disabled={isGenerating}>
                                    {isGenerating ? (
                                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                    ) : (
                                        <KTIcon iconName="file-down" className="fs-2" />
                                    )}
                                    Export
                                </Dropdown.Toggle>
                                <Dropdown.Menu>
                                    <Dropdown.Item onClick={() => setShowProposalModal(true)}>
                                        <i className="bi bi-file-earmark-word me-2 text-primary"></i> Export to DOCX
                                    </Dropdown.Item>
                                    <Dropdown.Item onClick={() => setShowProposalModal(true)}>
                                        <i className="bi bi-file-earmark-pdf me-2 text-danger"></i> Export to PDF
                                    </Dropdown.Item>
                                    <Dropdown.Item onClick={() => handleExport('excel', lead)}>
                                        <i className="bi bi-file-earmark-excel me-2 text-success"></i> Export to Excel
                                    </Dropdown.Item>
                                </Dropdown.Menu>
                            </Dropdown>

                            <Button
                                variant="primary"
                                className="me-2"
                                onClick={() => {
                                    const formLeadDataFinal = mapLeadToFormInitialValues(lead);
                                    setFormValues(formLeadDataFinal);
                                }}
                            >
                                <KTIcon iconName="files" className="fs-2" />
                                Edit Details
                            </Button>
                        </div>
                    </div>

                    <div className="mt-8">
                        <div className="d-flex overflow-auto h-55px mb-6">
                            <ul className="nav nav-stretch nav-line-tabs nav-line-tabs-2x border-transparent fs-5 fw-bold flex-nowrap">
                                {tabs.map((tab) => (
                                    <li key={tab.key}>
                                        <a
                                            className={`nav-link px-6 py-2 rounded-pill border ${activeTab === tab.key ? 'border-primary text-primary' : 'border-black text-black'} cursor-pointer me-4`}
                                            onClick={() => setActiveTab(tab.key as TabType)}
                                            style={{ fontFamily: 'Inter, sans-serif' }}
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
            </div>

            {formValues && (
                <LeadFormModal
                    leadTemplateId={formValues?.leadTemplateId}
                    open={true}
                    onClose={() => setFormValues(null)}
                    title={`Edit ${formValues.title || formValues?.projectName} Lead`}
                    initialData={{ id: formValues?.leadTemplateId }}
                    initialFormData={formValues}
                    isEditMode={true}
                />
            )}

            {showConvertModal && (
                <BlankBasicProjectForm
                    showBlankProjectForm={showConvertModal}
                    onHide={() => setShowConvertModal(false)}
                    intitalDataForLeadToProjectConversion={lead?.projectId ? undefined : leadDetailsForConvertToProject}
                    selectedProjectType={leadTemplateId}
                    setRefreshData={setRefreshData}
                    editingProjectId={lead?.projectId || null}
                />
            )}

            <ProposalTemplatePage
                show={showProposalModal}
                onHide={() => setShowProposalModal(false)}
                leadData={lead}
                companyData={company}
                contactData={contact}
                projectData={project}
            />

        </DMSProvider>
    );
};

export default LeadDetails;
