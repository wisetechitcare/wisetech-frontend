import React from 'react';
import { Modal } from 'react-bootstrap';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import isToday from 'dayjs/plugin/isToday';
import type { DraftData } from '@hooks/useDraft';

dayjs.extend(relativeTime);
dayjs.extend(isToday);

const LEAD_STEP_NAMES = [
    'Overview & Assignment',
    'Company & Relationships',
    'Project & Service Details',
    'Commercials & Costing',
    'Proposal Configuration',
    'Address, Location & Docs',
    'Review & Workflow',
];

const PROJECT_STEP_NAMES = [
    'Overview & Assignment',
    'Project Specs',
    'Team & Companies',
    'Commercials & Costing',
    'Address & Location',
    'Review & Workflow',
];

interface DraftRecoveryModalProps {
    show: boolean;
    draft: DraftData | null;
    entityName?: string;
    onResume: () => void;
    onDiscard: () => void;
    onStartFresh: () => void;
}

export const DraftRecoveryModal: React.FC<DraftRecoveryModalProps> = ({
    show,
    draft,
    entityName,
    onResume,
    onDiscard,
    onStartFresh,
}) => {
    if (!draft) return null;

    const stepNames = draft.entityType === 'lead' ? LEAD_STEP_NAMES : PROJECT_STEP_NAMES;
    const stepName = stepNames[draft.currentStep] || `Step ${draft.currentStep + 1}`;
    const savedAt = draft.lastSavedAt ? dayjs(draft.lastSavedAt) : null;
    const savedLabel = savedAt
        ? savedAt.isToday()
            ? `Today • ${savedAt.format('hh:mm A')}`
            : savedAt.fromNow()
        : 'Unknown';

    const entityLabel = draft.entityType === 'lead' ? 'Lead' : 'Project';
    const displayName = entityName || draft.formData?.projectName || draft.formData?.title || `Untitled ${entityLabel}`;

    return (
        <Modal
            show={show}
            centered
            backdrop="static"
            keyboard={false}
            className="draft-recovery-modal"
            dialogClassName="rounded-4"
        >
            <Modal.Body className="p-0">
                <div className="p-4 border-bottom bg-white" style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
                    <div className="d-flex align-items-start gap-3">
                        <div className="flex-shrink-0">
                            <div className="d-flex align-items-center justify-content-center rounded-3" style={{ width: 48, height: 48, backgroundColor: '#F4F6FA' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M8 3H16C18 3 19 4 19 6V18C19 20 18 21 16 21H8C6 21 5 20 5 18V6C5 4 6 3 8 3Z" stroke="#5D6B82" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="white"/>
                                    <path d="M8 7H16" stroke="#5D6B82" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M8 11H12" stroke="#5D6B82" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M15 15H8" stroke="#5D6B82" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M12 19H8" stroke="#5D6B82" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </div>
                        </div>
                        <div className="flex-grow-1">
                            <h5 className="fw-bold mb-0" style={{ color: '#1A2332' }}>Continue Draft</h5>
                            <p className="small mb-0" style={{ color: '#7E849C' }}>Unsaved work from previous session</p>
                        </div>
                    </div>
                </div>

                <div className="p-4" style={{ backgroundColor: '#F8F9FC' }}>
                    <div className="bg-white rounded-3 p-3 mb-4 shadow-sm border" style={{ borderColor: '#EDF2F7' }}>
                        <div className="fw-semibold mb-3" style={{ color: '#1A2332', fontSize: '0.95rem' }}>{displayName}</div>

                        <div className="d-flex flex-column gap-2">
                            <div className="d-flex justify-content-between align-items-center">
                                <span className="small" style={{ color: '#7E849C' }}>Last saved</span>
                                <span className="small fw-medium" style={{ color: '#1A2332' }}>{savedLabel}</span>
                            </div>
                            <div className="d-flex justify-content-between align-items-center">
                                <span className="small" style={{ color: '#7E849C' }}>Current step</span>
                                <span className="small fw-medium" style={{ color: '#1A2332' }}>{stepName}</span>
                            </div>
                            <div className="mt-1">
                                <div className="d-flex justify-content-between align-items-center mb-1">
                                    <span className="small" style={{ color: '#7E849C' }}>Progress</span>
                                    <span className="small fw-bold" style={{ color: '#2A6DFF' }}>{draft.completionPercentage ?? 0}%</span>
                                </div>
                                <div className="rounded-pill overflow-hidden" style={{ height: 6, backgroundColor: '#E9ECF3' }}>
                                    <div className="h-100 rounded-pill" style={{ width: `${draft.completionPercentage ?? 0}%`, backgroundColor: '#2A6DFF', transition: 'width 0.3s ease' }} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="d-flex gap-2">
                        <button
                            className="btn btn-primary fw-semibold flex-grow-1 py-2"
                            onClick={onResume}
                            style={{ backgroundColor: '#2A6DFF', borderColor: '#2A6DFF', borderRadius: '10px' }}
                        >
                            Resume Draft
                        </button>
                        <button
                            className="btn btn-outline-secondary fw-medium py-2 px-3"
                            onClick={onDiscard}
                            style={{ borderColor: '#DCE3EC', color: '#5D6B82', borderRadius: '10px' }}
                        >
                            Discard
                        </button>
                        <button
                            className="btn btn-link fw-medium py-2 px-3 text-decoration-none"
                            onClick={onStartFresh}
                            style={{ color: '#7E849C', borderRadius: '10px' }}
                        >
                            Fresh
                        </button>
                    </div>
                </div>
            </Modal.Body>
        </Modal>
    );
};

export default DraftRecoveryModal;