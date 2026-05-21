import React from 'react';
import { Modal } from 'react-bootstrap';

interface UnsavedChangesModalProps {
    show: boolean;
    isSaving?: boolean;
    onSaveDraft: () => void;
    onContinueEditing: () => void;
    onDiscard: () => void;
}

export const UnsavedChangesModal: React.FC<UnsavedChangesModalProps> = ({
    show,
    isSaving,
    onSaveDraft,
    onContinueEditing,
    onDiscard,
}) => {
    return (
        <Modal
            show={show}
            centered
            backdrop="static"
            keyboard={false}
            size="sm"
            className="unsaved-changes-modal"
        >
            <Modal.Body style={{ padding: '2rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <div style={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #FFA80015, #FFA80030)',
                        border: '2px solid #FFA80040',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1rem',
                        fontSize: '1.4rem',
                    }}>
                        ⚠️
                    </div>
                    <h5 style={{ fontWeight: 700, marginBottom: '0.25rem', color: '#181C32' }}>
                        Unsaved Changes
                    </h5>
                    <p style={{ color: '#7E8299', fontSize: '0.85rem', margin: 0 }}>
                        You have unsaved work. What would you like to do?
                    </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <button
                        className="btn btn-primary w-100"
                        onClick={onSaveDraft}
                        disabled={isSaving}
                        style={{ fontWeight: 600 }}
                    >
                        {isSaving ? 'Saving…' : 'Save Draft'}
                    </button>
                    <button
                        className="btn btn-light-primary w-100"
                        onClick={onContinueEditing}
                        disabled={isSaving}
                        style={{ fontWeight: 500 }}
                    >
                        Continue Editing
                    </button>
                    <button
                        className="btn btn-light-danger w-100"
                        onClick={onDiscard}
                        disabled={isSaving}
                        style={{ fontWeight: 500 }}
                    >
                        Discard Changes
                    </button>
                </div>
            </Modal.Body>
        </Modal>
    );
};

export default UnsavedChangesModal;
