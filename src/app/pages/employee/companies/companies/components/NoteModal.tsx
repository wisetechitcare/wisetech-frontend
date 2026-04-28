import { Button, Form, Modal } from "react-bootstrap";
import { updateClientCompany, getClientCompanyById } from "@services/companies";
import { useState, useEffect } from "react";
import { Company } from "@models/companies";
import eventBus from "@utils/EventBus";

const NoteModal = ({show, onClose, companyId}: {show: boolean, onClose: () => void, companyId: string}) => {
    const [note, setNote] = useState('');
    const [response, setResponse] = useState<Company | null>(null);
    const [loading, setLoading] = useState(false);
    
    const handleUpdateNote = async () => {
        setLoading(true);
        try {
            const updatedCompany = {
                ...response,
                note,
            };

            await updateClientCompany(companyId, updatedCompany);
            eventBus.emit("companyCreated");
            onClose();
        } catch (error) {
            console.error('Failed to update note', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const fetchCompany = async () => {
            try {
                const response = await getClientCompanyById(companyId);
                setNote(response?.data?.company?.note || '');
                setResponse(response?.data?.company || null);
            } catch (error) {
                console.error('Failed to fetch company', error);
            }
        };
        fetchCompany();
    }, [companyId]);


    return (
        <Modal show={show} onHide={onClose}>
            <Modal.Header closeButton>
                <Modal.Title>Notes</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form>
                    <Form.Group controlId="note">
                        <Form.Control
                            type="text"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Enter notes"
                        />
                    </Form.Group>
                </Form>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onClose}>
                    Close
                </Button>
                <Button variant="primary" onClick={handleUpdateNote} disabled={loading}>
                    {loading ? 'Updating...' : 'Update'}
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default NoteModal;
