import React, { useState } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import { DropdownOption } from '../../types/deleteConfirmation';

export interface DeleteConfirmationModalProps {
    visible: boolean;
    onCancel: () => void;
    onConfirm: (targetId?: string) => Promise<void>;
    entityName: string;
    entityDisplayName: string;
    dropdownOptions?: DropdownOption[];
    loading?: boolean;
    showTransferOption?: boolean;
    transferDescription?: string;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
    visible,
    onCancel,
    onConfirm,
    entityName,
    entityDisplayName,
    dropdownOptions = [],
    loading = false,
    showTransferOption = true,
    transferDescription
}) => {
    const [showTransfer, setShowTransfer] = useState(false);
    const [selectedTargetId, setSelectedTargetId] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleTransferChange = (checked: boolean) => {
        setShowTransfer(checked);
        if (!checked) {
            setSelectedTargetId('');
        }
    };

    const handleConfirm = async () => {
        if (showTransfer && !selectedTargetId) {
            return; // Don't proceed if transfer is selected but no target chosen
        }

        setIsSubmitting(true);
        try {
            await onConfirm(showTransfer ? selectedTargetId : undefined);
            onCancel(); // Close modal on success
        } catch (error) {
            console.error('Delete failed:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const isConfirmDisabled = loading || isSubmitting || (showTransfer && !selectedTargetId);

    return (
        <Modal
            show={visible}
            onHide={onCancel}
            centered
            backdrop="static"
            keyboard={false}
        >
            <Modal.Header closeButton>
                <Modal.Title>
                    ⚠️ Confirm Delete
                </Modal.Title>
            </Modal.Header>

            <Modal.Body>
                <div className="alert alert-warning" role="alert">
                    <strong>Warning!</strong> Are you sure you want to delete "{entityDisplayName}"? This action cannot be undone.
                </div>

                {showTransferOption && dropdownOptions.length > 0 && (
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Check
                                type="checkbox"
                                id="transfer-checkbox"
                                label={`🔄 Transfer existing data to another ${entityName.toLowerCase()}`}
                                checked={showTransfer}
                                onChange={(e) => handleTransferChange(e.target.checked)}
                            />
                        </Form.Group>

                        {showTransfer && (
                            <>
                                <div className="mb-3">
                                    <small className="text-muted">
                                        {transferDescription}
                                    </small>
                                </div>

                                <Form.Group className="mb-3">
                                    <Form.Label>Select target {entityName.toLowerCase()} *</Form.Label>
                                    <Form.Select
                                        value={selectedTargetId}
                                        onChange={(e) => setSelectedTargetId(e.target.value)}
                                        required
                                    >
                                        <option value="">Choose a {entityName.toLowerCase()} to transfer data to</option>
                                        {dropdownOptions.map(option => (
                                            <option key={option.key} value={option.key}>
                                                {option.value}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>

                                <div className="mb-3">
                                    <small className="text-muted">
                                        Please select a target before proceeding with deletion.
                                    </small>
                                </div>
                            </>
                        )}
                    </Form>
                )}

                {showTransferOption && dropdownOptions.length === 0 && (
                    <div className="alert alert-info" role="alert">
                        <strong>No Transfer Options Available</strong><br />
                        There are no other {entityName.toLowerCase()}s available to transfer data to. The {entityName.toLowerCase()} will be deleted directly.
                    </div>
                )}

                {!showTransferOption && (
                    <div className="alert alert-info" role="alert">
                        <strong>Direct Deletion</strong><br />
                        The {entityName.toLowerCase()} will be deleted directly without transferring data.
                    </div>
                )}
            </Modal.Body>

            <Modal.Footer className="d-flex justify-content-end gap-2">
                <Button 
                    variant="outline-secondary" 
                    onClick={onCancel} 
                    disabled={isSubmitting}
                    style={{
                        minWidth: '80px',
                        fontWeight: '500',
                        border: '1px solid black',
                        
                    }}
                >
                    Cancel
                </Button>
                <Button
                    variant="danger"
                    onClick={handleConfirm}
                    disabled={isConfirmDisabled}
                    style={{
                        minWidth: '80px',
                        fontWeight: '500',
                        
                    }}
                >
                    {isSubmitting ? 'Deleting...' : 'Delete'}
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default DeleteConfirmationModal;
