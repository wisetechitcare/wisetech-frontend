import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from 'react-bootstrap';
import { KTIcon } from '@metronic/helpers';
import { getLeadById, exportLeadDocx, exportLeadPdf } from '@services/leads';
import { getClientCompanyById, getClientContactById } from '@services/companies';
import { getAllLeadStatus } from '@services/lead';
import { miscellaneousIcons } from '@metronic/assets/miscellaneousicons';
import { useEventBus } from '@hooks/useEventBus';
import { EVENT_KEYS } from '@constants/eventKeys';
import { mapLeadToFormInitialValues } from '@pages/employee/leads/lead/utils';
import { useAuth } from '@app/modules/auth';

import LeadOverview from '@pages/employee/leads/lead/components/LeadOverview';
import LeadFiles from '@pages/employee/leads/lead/components/LeadFiles';
import LeadFormModal from '@pages/employee/leads/lead/LeadFormModal';
import ProposalTemplatePage from '@pages/employee/leads/lead/components/ProposalTemplatePage';
import { DMSProvider } from '@pages/employee/leads/lead/components/dms/store/DmsContext';
import TasksMainTable from '@pages/employee/tasks/tasks/TasksMainTable';
import TaskTimesheet from '@pages/employee/tasks/tasks/components/TaskTimesheet';
import ProjectReimbursements from '@pages/employee/projects/project/components/ProjectReimbursements';
import ProjectFiles from '@pages/employee/projects/project/components/ProjectFlies';

import EntityProjectSection from './EntityProjectSection';
import { isProjectEntity, getProjectPhase, PHASE_THEMES } from './entityUtils';

type TabType = 'overview' | 'tasks' | 'timelog' | 'reimbursements' | 'files';

interface EntityBase {
    id: string;
    name?: string;
    title?: string;
    [key: string]: any;
}

/**
 * Unified Entity detail page — replaces LeadDetails AND the project detail
 * (AllProjectMainToggle) with one page. Lead sections always render; project
 * tabs/sections appear when lead.status.isProjectTrigger (or a legacy
 * projectId link) — "lead evolved into project", never a separate page.
 *
 * Data strategy: ONE call to GET /client-companies/leads/:id (its project
 * include is enriched server-side). Tasks / timesheet / reimbursement tabs
 * lazy-fetch their own data only when opened.
 */
const EntityDetailPage: React.FC = () => {
    const { currentUser } = useAuth();
    // Supports both /employee/lead/:leadId and /leads/:leadId
    const params = useParams<{ leadId?: string; id?: string }>();
    const leadId = params.leadId || params.id;
    const navigate = useNavigate();
    const location = useLocation();

    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [lead, setLead] = useState<any | null>(null);
    const [company, setCompany] = useState<EntityBase | null>(null);
    const [contact, setContact] = useState<EntityBase | null>(null);
    const [allStatuses, setAllStatuses] = useState<any[]>([]);

    const [formValues, setFormValues] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshData, setRefreshData] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showProposalModal, setShowProposalModal] = useState(false);

    // Context-aware project detection: if accessed from Lead page, show lead UI even if status is "Received"
    const locationState = location.state as any;
    const isProjectContext = locationState?.isProject === true;
    const isProject = isProjectEntity(lead) && isProjectContext;
    const projectId = lead?.projectId || lead?.project?.id || null;
    const phase = getProjectPhase(lead);
    const phaseTheme = PHASE_THEMES[phase] ?? PHASE_THEMES.none;

    const tabs = useMemo(() => {
        const base: { key: TabType; label: string; projectOnly?: boolean }[] = [
            { key: 'overview', label: 'Overview' },
            { key: 'tasks', label: 'Tasks', projectOnly: true },
            { key: 'timelog', label: 'Timesheet', projectOnly: true },
            { key: 'reimbursements', label: 'Reimbursements', projectOnly: true },
            { key: 'files', label: 'Files' },
        ];
        return base.filter(t => !t.projectOnly || (isProject && projectId));
    }, [isProject, projectId]);

    // If the entity loses its project (status reverted), fall back off project tabs.
    useEffect(() => {
        if (!tabs.some(t => t.key === activeTab)) setActiveTab('overview');
    }, [tabs, activeTab]);

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
                    getClientCompanyById(leadData.companyId).then(setCompany).catch(console.error)
                );
            }
            if (leadData.contactId) {
                fetchPromises.push(
                    getClientContactById(leadData.contactId).then(setContact).catch(console.error)
                );
            }
            await Promise.all(fetchPromises);
            setError(null);
        } catch (err) {
            console.error('Error fetching lead details:', err);
            setError('Failed to load details. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [leadId]);

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

    useEventBus(EVENT_KEYS.leadUpdated, fetchLeadDetails);
    useEventBus(EVENT_KEYS.projectUpdated, fetchLeadDetails);
    useEventBus(EVENT_KEYS.projectCreated, fetchLeadDetails);

    const renderTabContent = () => {
        if (error || !lead) {
            return (
                <div className="alert alert-danger">
                    {error || 'No data available'}
                </div>
            );
        }

        switch (activeTab) {
            case 'overview':
                return (
                    <>
                        <LeadOverview lead={lead} />
                        {isProject && <EntityProjectSection lead={lead} project={lead.project} />}
                    </>
                );
            case 'tasks':
                return projectId ? <TasksMainTable projectId={projectId} /> : null;
            case 'timelog':
                return projectId ? <TaskTimesheet fetchMode="project" projectId={projectId} /> : null;
            case 'reimbursements':
                return projectId ? <ProjectReimbursements projectId={projectId} /> : null;
            case 'files':
                return (
                    <>
                        <LeadFiles lead={lead} />
                        {isProject && projectId && (
                            <div className="mt-8">
                                <ProjectFiles projectId={projectId} />
                            </div>
                        )}
                    </>
                );
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
                                <div className="text-muted small font-inter d-flex align-items-center flex-wrap gap-2">
                                    {/* Entity stage badge — the heart of the unified UX */}
                                    <span
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                            background: isProject ? phaseTheme.bg : '#F1F5F9',
                                            color: isProject ? phaseTheme.fg : '#475569',
                                            borderRadius: '999px',
                                            padding: '3px 12px',
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            fontFamily: 'Inter, sans-serif',
                                        }}
                                    >
                                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: isProject ? phaseTheme.fg : '#475569', display: 'inline-block' }} />
                                        {isProject ? `PROJECT · ${phaseTheme.label.toUpperCase()}` : 'LEAD'}
                                    </span>
                                    <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: '13px' }}>
                                        {`#${lead?.prefix || 'N/A'}`}
                                    </span>
                                    {isProject && lead?.project?.prefix && (
                                        <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: '13px', color: '#0A5C2A' }}>
                                            · {`Project #${lead.project.prefix}`}
                                        </span>
                                    )}
                                    {lead?.status?.name && (
                                        <span
                                            className="badge"
                                            style={{ backgroundColor: lead.status.color || '#64748B', color: '#fff', fontSize: '10px' }}
                                        >
                                            {lead.status.name}
                                        </span>
                                    )}
                                </div>
                                <div className="d-flex align-items-center gap-2">
                                    <h2 className="mb-0 text-truncate" style={{ fontFamily: "Barlow", fontWeight: "600", fontSize: "24px" }}>
                                        {lead?.title}
                                    </h2>
                                    {lead?.priority && (
                                        <div className="d-flex align-items-center gap-1">
                                            <KTIcon iconName="star" className="fs-6 text-warning" />
                                            <span className="text-muted small">{lead.priority}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="d-flex align-items-center gap-1 flex-wrap">
                            <Button
                                variant="primary"
                                className="me-2"
                                onClick={() => setFormValues(mapLeadToFormInitialValues(lead))}
                                style={{ backgroundColor: '#AA393D', borderColor: '#AA393D' }}
                            >
                                <KTIcon iconName="pencil" className="fs-2" />
                                Edit
                            </Button>

                            <Button
                                variant="info"
                                disabled={isGenerating}
                                onClick={() => setShowProposalModal(true)}
                                className="me-2"
                                style={{ backgroundColor: '#7239ea', borderColor: '#7239ea', color: 'white' }}
                            >
                                {isGenerating ? (
                                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                ) : (
                                    <KTIcon iconName="file-down" className="fs-2" />
                                )}
                                Export
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
                                            onClick={() => setActiveTab(tab.key)}
                                            style={{ fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}
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
                    key={formValues?.id || "edit-lead-modal"}
                    leadTemplateId={formValues?.leadTemplateId}
                    open={true}
                    onClose={() => setFormValues(null)}
                    title={formValues?.id ? `Edit Lead / Project` : "New Lead"}
                    initialData={formValues?.id ? { id: formValues?.leadTemplateId } : { ...formValues, title: '' }}
                    initialFormData={formValues}
                    isEditMode={!!formValues?.id}
                />
            )}

            <ProposalTemplatePage
                show={showProposalModal}
                onHide={() => setShowProposalModal(false)}
                leadData={lead}
                companyData={company}
                contactData={contact}
                projectData={lead?.project || null}
            />

        </DMSProvider>
    );
};

export default EntityDetailPage;
