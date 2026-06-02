import { useEffect, useState } from "react";
import { KTCard, KTCardBody } from '@metronic/helpers';
import {
    fetchAllAddonLeavesAllowances,
    recomputeAllLeaveBalances,
    IAddonLeavesAllowance
} from "@services/addonLeavesAllowance";
import { Modal } from "react-bootstrap";
import AddonLeavesAllowanceForm from "./AddonLeavesAllowanceForm";
import { useEventBus } from "@hooks/useEventBus";
import { EVENT_KEYS } from "@constants/eventKeys";
import eventBus from "@utils/EventBus";

interface AddonLeavesAllowanceCardProps {
    onCardClick?: () => void;
}

function AddonLeavesAllowanceCard({ onCardClick }: AddonLeavesAllowanceCardProps = {}) {
    const [allowances, setAllowances] = useState<IAddonLeavesAllowance[]>([]);
    const [loading, setLoading] = useState(true);
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [syncing, setSyncing] = useState(false);

    const loadAllowances = async () => {
        try {
            setLoading(true);
            const response = await fetchAllAddonLeavesAllowances();
            if (!response?.hasError && response.data?.addonLeavesAllowances) {
                setAllowances(response.data.addonLeavesAllowances);
            }
        } catch (error) {
            console.error('Error loading addon leaves allowances:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAllowances();
    }, []);

    useEventBus(EVENT_KEYS.addonLeavesAllowanceUpdated, () => {
        loadAllowances();
    });

    const handleConfigClose = () => {
        setShowConfigModal(false);
        loadAllowances();
    };

    const handleResetConfirmed = async () => {
        setShowResetConfirm(false);
        setSyncing(true);
        try {
            await recomputeAllLeaveBalances();
            eventBus.emit(EVENT_KEYS.addonLeavesAllowanceUpdated, {});
            eventBus.emit(EVENT_KEYS.leaveOptionsUpdated, {});
        } catch (err) {
            console.error('Reset failed:', err);
        } finally {
            setSyncing(false);
        }
    };

    const getAllowanceByExperience = (experience: number) => {
        return allowances.find(a => a.experienceInCompany === experience)?.addonLeavesCount || 0;
    };

    return (
        <>
            <KTCard>
                <KTCardBody className='py-8'>
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <div>
                            <h3 className="fw-bolder text-dark mb-1">Addon Leaves Allowance</h3>
                            <div className="text-muted fw-bold fs-6">
                                Configure additional leave days based on employee experience
                            </div>
                        </div>
                        <div className="d-flex gap-2">
                            <button
                                className="btn btn-sm btn-light-danger"
                                onClick={() => setShowResetConfirm(true)}
                                disabled={syncing}
                                title="Reset all leave overrides and recalculate balances from branch policy"
                            >
                                {syncing
                                    ? <span className="spinner-border spinner-border-sm me-1" />
                                    : <i className="ki-duotone ki-arrows-circle fs-2"><span className="path1"></span><span className="path2"></span></i>
                                }
                                {syncing ? 'Resetting...' : 'Reset & Recalculate'}
                            </button>
                            <button
                                className="btn btn-sm btn-primary"
                                onClick={(e) => { e.stopPropagation(); setShowConfigModal(true); }}
                            >
                                <i className="ki-duotone ki-setting-2 fs-2">
                                    <span className="path1"></span>
                                    <span className="path2"></span>
                                </i>
                                Configure
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center py-5">
                            <div className="spinner-border spinner-border-lg text-primary" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                        </div>
                    ) : (
                        <div className="row g-3">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((experience) => {
                                const addonLeaves = getAllowanceByExperience(experience);
                                const isConfigured = allowances.some(a => a.experienceInCompany === experience);

                                return (
                                    <div key={experience} className="col-md-6 col-lg-4">
                                        <div className={`card card-custom card-stretch ${isConfigured ? 'border-success' : 'border-warning'}`}>
                                            <div className="card-body text-center py-4">
                                                <div className={`symbol symbol-50px symbol-circle mb-3 ${isConfigured ? 'bg-light-success' : 'bg-light-warning'}`}>
                                                    <span className={`fw-bolder fs-2 ${isConfigured ? 'text-success' : 'text-warning'}`}>
                                                        {experience === 11 ? '10+' : experience}
                                                    </span>
                                                </div>
                                                <div className="fw-bolder text-dark fs-6 mb-1">
                                                    {experience === 11 ? '10+ Years Experience' : `${experience} Year${experience > 1 ? 's' : ''} Experience`}
                                                </div>
                                                <div className={`fw-bold fs-4 ${isConfigured ? 'text-success' : 'text-muted'}`}>
                                                    {addonLeaves}
                                                    <span className="fs-6 text-muted ms-1">addon leave{addonLeaves !== 1 ? 's' : ''}</span>
                                                </div>
                                                <div className={`badge ${isConfigured ? 'badge-light-success' : 'badge-light-warning'} mt-2`}>
                                                    {isConfigured ? 'Configured' : 'Not Configured'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {!loading && allowances.length === 0 && (
                        <div className="text-center py-5">
                            <div className="symbol symbol-100px symbol-circle bg-light-warning mb-4">
                                <i className="ki-duotone ki-information-5 fs-2hx text-warning">
                                    <span className="path1"></span><span className="path2"></span><span className="path3"></span>
                                </i>
                            </div>
                            <h4 className="fw-bolder text-dark mb-2">No Configuration Found</h4>
                            <p className="text-muted mb-4">No addon leaves allowance configured yet. Click Configure to set up.</p>
                            <button className="btn btn-primary" onClick={(e) => { e.stopPropagation(); setShowConfigModal(true); }}>
                                Configure Now
                            </button>
                        </div>
                    )}

                    {!loading && allowances.length > 0 && (
                        <div className="alert alert-primary d-flex align-items-center mt-4">
                            <i className="ki-duotone ki-information-5 fs-2hx text-primary me-4">
                                <span className="path1"></span><span className="path2"></span><span className="path3"></span>
                            </i>
                            <div className="d-flex flex-column">
                                <h4 className="mb-1 text-dark">How Addon Leaves Work</h4>
                                <span>Employees receive additional leave days based on their years of experience. These are added to their base leave allowance automatically.</span>
                            </div>
                        </div>
                    )}
                </KTCardBody>
            </KTCard>

            {/* Configure Modal */}
            <Modal show={showConfigModal} onHide={handleConfigClose} size="lg" centered>
                <Modal.Header closeButton>
                    <Modal.Title>Configure Addon Leaves Allowance</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <AddonLeavesAllowanceForm onClose={handleConfigClose} />
                </Modal.Body>
            </Modal>

            {/* Reset Confirmation Modal */}
            <Modal show={showResetConfirm} onHide={() => setShowResetConfirm(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Reset & Recalculate All Leave Balances</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="alert alert-warning d-flex align-items-center mb-4">
                        <i className="ki-duotone ki-information-5 fs-2hx text-warning me-3">
                            <span className="path1"></span><span className="path2"></span><span className="path3"></span>
                        </i>
                        <div>
                            <strong>This will clear all custom per-employee leave overrides</strong> for the current fiscal year and recalculate every employee's balance from the branch policy + addon tiers.
                            <br /><br />
                            Use this to fix incorrect balances caused by stale data. Any genuine custom allocations will need to be re-set manually after this operation.
                        </div>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <button className="btn btn-light" onClick={() => setShowResetConfirm(false)}>Cancel</button>
                    <button className="btn btn-danger" onClick={handleResetConfirmed}>Yes, Reset & Recalculate</button>
                </Modal.Footer>
            </Modal>
        </>
    );
}

export default AddonLeavesAllowanceCard;
