import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from 'react-bootstrap';
import { KTIcon } from '@metronic/helpers';
import { getLeadById } from '@services/leads';
import { getClientCompanyById, getClientContactById } from '@services/companies';
import { miscellaneousIcons } from '@metronic/assets/miscellaneousicons';
import { useEventBus } from '@hooks/useEventBus';
import { EVENT_KEYS } from '@constants/eventKeys';
import { mapLeadToFormInitialValues } from './utils';

import LeadOverview from './components/LeadOverview';
import LeadFiles from './components/LeadFiles';
import LeadFormModal from './LeadFormModal';
import {
    LeadProjectExecutionBanner,
    LeadProjectExecutionTab,
    LeadTasksTab,
} from './components/LeadProjectExecutionWidget';

type TabType = 'overview' | 'files' | 'execution' | 'tasks';

const LeadDetails: React.FC = () => {
    // Support both route patterns: /leads/:id and /employee/lead/:leadId
    const { id, leadId: leadIdParam } = useParams<{ id?: string; leadId?: string }>();
    const leadId = id ?? leadIdParam;
    const navigate = useNavigate();
    const location = useLocation();

    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [lead, setLead] = useState<any | null>(null);
    const [formValues, setFormValues] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Auto-open edit modal when navigated from Project detail (openEditModal in location state).
    // Also captures returnToProject so closing the modal navigates back to the project page.
    const [autoOpenEditTriggered, setAutoOpenEditTriggered] = useState(false);
    const [returnToProjectId, setReturnToProjectId] = useState<string | null>(null);
    useEffect(() => {
        if (!autoOpenEditTriggered && !isLoading && lead && (location.state as any)?.openEditModal) {
            setAutoOpenEditTriggered(true);
            const formLeadDataFinal = mapLeadToFormInitialValues(lead);
            setFormValues(formLeadDataFinal);
            // Capture the return destination before clearing state
            const returnProject = (location.state as any)?.returnToProject || null;
            setReturnToProjectId(returnProject);
            // Clear the state so a manual refresh doesn't re-trigger
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [isLoading, lead, location.state, autoOpenEditTriggered, navigate, location.pathname]);

    // Derived from lead.status. Falls back to name-based detection for legacy DB rows
    // where isReceivedTrigger was never explicitly seeded (defaults to false).
    const isReceivedStatus = !!(lead?.status?.isReceivedTrigger) ||
        lead?.status?.name?.trim().toLowerCase() === 'received';

    const tabs = React.useMemo(() => [
        { key: 'overview', label: 'Overview' },
        { key: 'files', label: 'Files' },
        ...(isReceivedStatus ? [
            { key: 'execution', label: '⚡ Execution' },
            { key: 'tasks', label: '✓ Tasks' },
        ] : []),
    ], [isReceivedStatus]);

    // When tabs change (e.g. after status changes to received) keep the active
    // tab valid — fall back to overview if current tab no longer exists.
    useEffect(() => {
        const validKeys = tabs.map(t => t.key);
        if (!validKeys.includes(activeTab)) {
            setActiveTab('overview');
        }
    }, [tabs, activeTab]);

    const fetchLeadDetails = useCallback(async () => {
        if (!leadId) {
            setError('No lead ID provided');
            setIsLoading(false);
            return;
        }

        if (!lead) setIsLoading(true);

        try {
            const leadResponse = await getLeadById(leadId);
            const leadData = leadResponse.data.data.lead;
            setLead(leadData);

            // Fetch company/contact in parallel — best-effort, non-blocking
            const side: Promise<any>[] = [];
            if (leadData.companyId) {
                side.push(getClientCompanyById(leadData.companyId).catch(console.error));
            }
            if (leadData.contactId) {
                side.push(getClientContactById(leadData.contactId).catch(console.error));
            }
            await Promise.all(side);

            setError(null);
        } catch (err) {
            console.error('Error fetching lead details:', err);
            setError('Failed to load lead details. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [leadId]);

    useEffect(() => {
        fetchLeadDetails();
    }, [fetchLeadDetails]);

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
            return <div className="alert alert-danger">{error || 'No lead data available'}</div>;
        }

        switch (activeTab) {
            case 'overview':   return <LeadOverview lead={lead} />;
            case 'files':      return <LeadFiles lead={lead} />;
            case 'execution':  return <LeadProjectExecutionTab leadId={lead.id} />;
            case 'tasks':      return <LeadTasksTab leadId={lead.id} />;
            default:           return null;
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
        <>
            <div className="d-flex flex-column flex-lg-row p-6">
                <div className="flex-lg-row-fluid">

                    {/* ── Header ──────────────────────────────────────────── */}
                    <div className="d-flex align-items-center justify-content-between flex-wrap">
                        <div className="d-flex align-items-center gap-2 gap-md-3 flex-grow-1">
                            <button
                                className="btn btn-icon btn-bg-light btn-active-color-primary btn-sm"
                                onClick={() => navigate(-1)}
                            >
                                <img src={miscellaneousIcons.leftArrow} alt="Back"
                                    style={{ width: "24px", height: "24px", cursor: "pointer" }}
                                    className="d-block d-md-none" />
                                <img src={miscellaneousIcons.leftArrow} alt="Back"
                                    style={{ width: "36px", height: "36px", cursor: "pointer" }}
                                    className="d-none d-md-block" />
                            </button>
                            <div className="flex-grow-1">
                                <div className="text-muted small d-flex align-items-center"
                                    style={{ fontFamily: 'Inter, sans-serif', fontWeight: 500, fontSize: '14px' }}>
                                    <span>Lead</span>
                                    <span className="ms-2">{`#${lead?.prefix || "N/A"}`}</span>
                                </div>
                                <div className="d-flex align-items-center gap-2">
                                    <h2 className="mb-0 text-truncate"
                                        style={{ fontFamily: "Barlow", fontWeight: "600", fontSize: "24px" }}>
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
                            <Button
                                variant="primary"
                                className="me-2"
                                onClick={() => {
                                    const formLeadDataFinal = mapLeadToFormInitialValues(lead);
                                    setFormValues(formLeadDataFinal);
                                }}
                            >
                                <KTIcon iconName="pencil" className="fs-2" />
                                Edit Details
                            </Button>
                        </div>
                    </div>

                    {/* ── Execution banner (only when RECEIVED) ──────────── */}
                    <div className="mt-8">
                        {isReceivedStatus && <LeadProjectExecutionBanner lead={lead} />}

                        {/* ── Tab nav ────────────────────────────────────── */}
                        <div className="d-flex overflow-auto h-55px mb-6">
                            <ul className="nav nav-stretch nav-line-tabs nav-line-tabs-2x border-transparent fs-5 fw-bold flex-nowrap">
                                {tabs.map((tab) => (
                                    <li key={tab.key}>
                                        <a
                                            className={`nav-link px-6 py-2 rounded-pill border ${
                                                activeTab === tab.key
                                                    ? 'border-primary text-primary'
                                                    : 'border-black text-black'
                                            } cursor-pointer me-4`}
                                            onClick={() => setActiveTab(tab.key as TabType)}
                                            style={{ fontFamily: 'Inter, sans-serif' }}
                                        >
                                            {tab.label}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="tab-content">{renderTabContent()}</div>
                    </div>
                </div>
            </div>

            {/* ── Edit Lead modal ────────────────────────────────────────── */}
            {formValues && (
                <LeadFormModal
                    leadTemplateId={formValues?.leadTemplateId}
                    open={true}
                    onClose={() => {
                        setFormValues(null);
                        if (returnToProjectId) {
                            // Opened from project detail — navigate back there
                            navigate(`/projects/${returnToProjectId}`);
                        } else {
                            fetchLeadDetails();
                        }
                    }}
                    title={`Edit ${formValues.title || formValues?.projectName} Lead`}
                    initialData={{ id: formValues?.leadTemplateId }}
                    initialFormData={formValues}
                    isEditMode={true}
                />
            )}
        </>
    );
};

export default LeadDetails;
