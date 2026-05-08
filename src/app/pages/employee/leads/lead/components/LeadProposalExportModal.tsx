import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col } from 'react-bootstrap';
import { KTIcon } from '@metronic/helpers';
import FeeBreakupTable from './FeeBreakupTable';
import MeetingConfigurationTable from './MeetingConfigurationTable';

interface LeadProposalExportModalProps {
    show: boolean;
    onHide: () => void;
    leadData: any;
    onExport: (type: 'docx' | 'pdf', data: any) => Promise<void>;
    isGenerating: boolean;
}

// Simulated from config (in real app, this could be fetched from API)
const proposalTemplates = {
    bungalow: {
        template_name: "Bungalow Proposal",
        template_file_name: "bungalow.docx",
        default_fee_breakup: [
            { stage_name: "Advance", percentage: 30 },
            { stage_name: "Design Concept", percentage: 20 },
            { stage_name: "Drawings", percentage: 30 },
            { stage_name: "Completion", percentage: 20 }
        ],
        default_meetings: [
            { config_key: "Concept Meeting", value: 2 },
            { config_key: "Site Visit", value: 1 }
        ]
    },
    commercial: {
        template_name: "Commercial Proposal",
        template_file_name: "commercial.docx",
        default_fee_breakup: [
            { stage_name: "Advance", percentage: 20 },
            { stage_name: "Tendering", percentage: 30 },
            { stage_name: "Execution", percentage: 40 },
            { stage_name: "Handover", percentage: 10 }
        ],
        default_meetings: [
            { config_key: "Coordination Meeting", value: 4 },
            { config_key: "Site Progress Review", value: 2 }
        ]
    },
    residential: {
        template_name: "Residential Proposal",
        template_file_name: "residential.docx",
        default_fee_breakup: [
            { stage_name: "Advance", percentage: 25 },
            { stage_name: "Design", percentage: 25 },
            { stage_name: "Construction", percentage: 40 },
            { stage_name: "Handover", percentage: 10 }
        ],
        default_meetings: [
            { config_key: "Meeting", value: 2 },
            { config_key: "Site Visit", value: 1 }
        ]
    }
};

const LeadProposalExportModal: React.FC<LeadProposalExportModalProps> = ({ show, onHide, leadData, onExport, isGenerating }) => {
    const [selectedTemplate, setSelectedTemplate] = useState<string>('bungalow');
    const [formData, setFormData] = useState<any>({});
    const [feeBreakup, setFeeBreakup] = useState<any[]>([]);
    const [meetings, setMeetings] = useState<any[]>([]);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [templateBase64, setTemplateBase64] = useState<string>('');

    useEffect(() => {
        if (show && leadData) {
            // Calculate initial cost similar to backend logic
            const calculatedCommercialCost = (leadData.commercials || []).reduce((sum: number, item: any) => sum + (parseFloat(item.cost) || 0), 0);
            const calculatedProjectAreaCost = (leadData.projectAreas || []).reduce((sum: number, item: any) => sum + (parseFloat(item.cost) || 0), 0);
            const initialCost = leadData.totalAmount || leadData.totalCost || leadData.cost || leadData.budget || calculatedCommercialCost || calculatedProjectAreaCost || 0;

            const primaryTeam = leadData.leadTeams?.[0];
            
            // Pre-fill fields from Lead Data
            setFormData({
                project_name: leadData.title || leadData.projectName || '',
                client_company_name: primaryTeam?.company?.companyName || leadData.company?.companyName || leadData.company || '',
                client_contact_name: primaryTeam?.contact?.fullName || leadData.contact?.fullName || leadData.contactPerson || '',
                client_address_line1: leadData.addresses?.[0]?.projectAddress || '',
                client_address_line2: leadData.addresses?.[0]?.city || '',
                client_address_line3: leadData.addresses?.[0]?.state || '',
                project_location: leadData.addresses?.[0]?.locality || '',
                project_type: leadData.leadCategories?.[0]?.category?.name || '',
                built_up_area: leadData.builtUpArea || leadData.plotArea || '',
                offer_number: leadData.prefix || leadData.id || '',
                offer_date: leadData.inquiryDate ? new Date(leadData.inquiryDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                validity_date: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0], // +30 days
                submitted_by: 'WiseTech Consultant',
                company_name: 'WiseTech Consultancy',
                company_address: '123 Business Avenue, Tech Park',
                authorized_person_name: 'Authorized Signatory',
                remarks: leadData.description || '',
                additional_notes: leadData.notes || '',
                total_offer_cost: initialCost
            });

            // Load default fee breakup for selected template
            handleTemplateChange('bungalow');
            setUploadedFile(null);
            setTemplateBase64('');
        }
    }, [show, leadData]);

    const handleTemplateChange = (templateKey: string) => {
        setSelectedTemplate(templateKey);
        const templateConfig = proposalTemplates[templateKey as keyof typeof proposalTemplates];
        if (templateConfig) {
            setFeeBreakup([...templateConfig.default_fee_breakup]);
            setMeetings([...(templateConfig as any).default_meetings || []]);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setUploadedFile(file);
            const reader = new FileReader();
            reader.onload = (event) => {
                const base64 = event.target?.result?.toString().split(',')[1] || '';
                setTemplateBase64(base64);
                setSelectedTemplate('custom');
            };
            reader.readAsDataURL(file);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev: any) => ({ ...prev, [name]: value }));
    };

    const handleResetToDefault = () => {
        if (selectedTemplate !== 'custom') {
            handleTemplateChange(selectedTemplate);
        }
    };

    const handleGenerate = (type: 'docx' | 'pdf') => {
        const exportData = {
            ...leadData,
            ...formData,
            selected_template: selectedTemplate,
            templateBase64: templateBase64,
            fee_breakup: feeBreakup,
            meetings: meetings
        };
        onExport(type, exportData);
    };

    const totalPercentage = feeBreakup.reduce((sum, row) => sum + (row.percentage || 0), 0);
    const isValid = totalPercentage === 100;
    const hasEmptyStages = feeBreakup.some(row => !row.stage_name.trim());
    const canExport = isValid && !hasEmptyStages && !isGenerating;

    return (
        <Modal show={show} onHide={onHide} size="xl" backdrop="static">
            <Modal.Header closeButton className="bg-light">
                <Modal.Title className="d-flex align-items-center">
                    <KTIcon iconName="document" className="fs-1 text-primary me-3" />
                    Configure Proposal Export
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="py-8">
                {/* SECTION 1: Template Selection */}
                <div className="mb-8 p-5 bg-light-primary rounded border border-primary border-dashed">
                    <h5 className="mb-4 text-primary">1. Select Proposal Template</h5>
                    
                    <Form.Group className="mb-4">
                        <Form.Label className="fw-bold">Upload Custom Template (DOCX)</Form.Label>
                        <Form.Control 
                            type="file" 
                            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
                            onChange={handleFileUpload} 
                        />
                        <Form.Text className="text-muted d-block mt-1">
                            Upload a custom .docx template from your PC.
                        </Form.Text>
                    </Form.Group>

                    <Form.Group>
                        <Form.Label className="fw-bold">Or Select System Template</Form.Label>
                        <Form.Select 
                            value={selectedTemplate} 
                            onChange={(e) => {
                                handleTemplateChange(e.target.value);
                                setUploadedFile(null);
                                setTemplateBase64('');
                            }}
                            className="form-select-solid fw-bold"
                        >
                            <option value="custom" disabled hidden>Custom Uploaded Template</option>
                            {Object.entries(proposalTemplates).map(([key, tpl]) => (
                                <option key={key} value={key}>{tpl.template_name}</option>
                            ))}
                        </Form.Select>
                        <Form.Text className="text-muted mt-2 d-block">
                            Selecting a system template will load its default fee breakup percentages.
                        </Form.Text>
                    </Form.Group>
                </div>

                <Row>
                    <Col lg={7}>
                        {/* SECTION 2: Proposal Information */}
                        <div className="mb-8">
                            <h5 className="mb-4">2. Proposal Information</h5>
                            
                            <h6 className="text-muted border-bottom pb-2 mb-4">Client Details</h6>
                            <Row className="g-3 mb-6">
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="fs-7 fw-semibold">Company Name</Form.Label>
                                        <Form.Control size="sm" type="text" name="client_company_name" value={formData.client_company_name || ''} onChange={handleInputChange} />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="fs-7 fw-semibold">Contact Person</Form.Label>
                                        <Form.Control size="sm" type="text" name="client_contact_name" value={formData.client_contact_name || ''} onChange={handleInputChange} />
                                    </Form.Group>
                                </Col>
                                <Col md={12}>
                                    <Form.Group>
                                        <Form.Label className="fs-7 fw-semibold">Address Line 1</Form.Label>
                                        <Form.Control size="sm" type="text" name="client_address_line1" value={formData.client_address_line1 || ''} onChange={handleInputChange} />
                                    </Form.Group>
                                </Col>
                            </Row>

                            <h6 className="text-muted border-bottom pb-2 mb-4 mt-6">Project Details</h6>
                            <Row className="g-3 mb-6">
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="fs-7 fw-semibold">Project Name</Form.Label>
                                        <Form.Control size="sm" type="text" name="project_name" value={formData.project_name || ''} onChange={handleInputChange} />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="fs-7 fw-semibold">Project Location</Form.Label>
                                        <Form.Control size="sm" type="text" name="project_location" value={formData.project_location || ''} onChange={handleInputChange} />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="fs-7 fw-semibold">Total Offer Cost</Form.Label>
                                        <Form.Control size="sm" type="number" name="total_offer_cost" value={formData.total_offer_cost || ''} onChange={handleInputChange} />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="fs-7 fw-semibold">Built-up Area</Form.Label>
                                        <Form.Control size="sm" type="text" name="built_up_area" value={formData.built_up_area || ''} onChange={handleInputChange} />
                                    </Form.Group>
                                </Col>
                            </Row>

                            <h6 className="text-muted border-bottom pb-2 mb-4 mt-6">Offer Details</h6>
                            <Row className="g-3">
                                <Col md={4}>
                                    <Form.Group>
                                        <Form.Label className="fs-7 fw-semibold">Offer Number</Form.Label>
                                        <Form.Control size="sm" type="text" name="offer_number" value={formData.offer_number || ''} onChange={handleInputChange} />
                                    </Form.Group>
                                </Col>
                                <Col md={4}>
                                    <Form.Group>
                                        <Form.Label className="fs-7 fw-semibold">Offer Date</Form.Label>
                                        <Form.Control size="sm" type="date" name="offer_date" value={formData.offer_date || ''} onChange={handleInputChange} />
                                    </Form.Group>
                                </Col>
                                <Col md={4}>
                                    <Form.Group>
                                        <Form.Label className="fs-7 fw-semibold">Validity Date</Form.Label>
                                        <Form.Control size="sm" type="date" name="validity_date" value={formData.validity_date || ''} onChange={handleInputChange} />
                                    </Form.Group>
                                </Col>
                                <Col md={12} className="mt-4">
                                    <Form.Group>
                                        <Form.Label className="fs-7 fw-semibold">Remarks</Form.Label>
                                        <Form.Control as="textarea" rows={2} size="sm" name="remarks" value={formData.remarks || ''} onChange={handleInputChange} />
                                    </Form.Group>
                                </Col>
                            </Row>
                        </div>
                    </Col>
                    <Col lg={5}>
                        {/* SECTION 3: Dynamic Fee Configurations */}
                        <div className="bg-light p-5 rounded h-100 shadow-sm border border-gray-200">
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <h5 className="mb-0 fw-bolder text-dark">
                                    <KTIcon iconName="setting-2" className="fs-3 text-primary me-2" />
                                    3. Dynamic Fee Configurations
                                </h5>
                                <Button variant="link" size="sm" className="text-danger p-0 fw-bold" onClick={handleResetToDefault}>
                                    Reset to Default
                                </Button>
                            </div>

                            <div className="alert alert-dismissible bg-light-warning d-flex flex-column flex-sm-row p-3 mb-4 border border-warning border-dashed">
                                <KTIcon iconName="information-5" className="fs-2 text-warning me-4 mb-5 mb-sm-0" />
                                <div className="d-flex flex-column pe-0 pe-sm-10">
                                    <span className="fw-bold fs-8">Temporary Configuration Only</span>
                                    <span className="fs-9 text-muted">Changes made here are only used for this export and will not be saved to the database.</span>
                                </div>
                            </div>
                            
                            <FeeBreakupTable 
                                rows={feeBreakup} 
                                totalCost={parseFloat(formData.total_offer_cost || '0')} 
                                onChange={setFeeBreakup} 
                            />

                            <MeetingConfigurationTable 
                                meetings={meetings} 
                                setMeetings={setMeetings} 
                            />

                            {hasEmptyStages && (
                                <div className="text-danger fs-7 mt-2">
                                    All stages must have a valid name.
                                </div>
                            )}
                        </div>
                    </Col>
                </Row>
            </Modal.Body>
            <Modal.Footer className="bg-light justify-content-between">
                <Button variant="light" onClick={onHide} disabled={isGenerating}>
                    Cancel
                </Button>
                <div className="d-flex gap-3">
                    <Button 
                        variant="primary" 
                        style={{ backgroundColor: '#2B4C7E', borderColor: '#2B4C7E' }}
                        onClick={() => handleGenerate('docx')}
                        disabled={!canExport}
                    >
                        {isGenerating ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="bi bi-file-earmark-word me-2"></i>}
                        Generate DOCX
                    </Button>
                    <Button 
                        variant="danger"
                        style={{ backgroundColor: '#B53A3A', borderColor: '#B53A3A' }}
                        onClick={() => handleGenerate('pdf')}
                        disabled={!canExport}
                    >
                        {isGenerating ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="bi bi-file-earmark-pdf me-2"></i>}
                        Generate PDF
                    </Button>
                </div>
            </Modal.Footer>
        </Modal>
    );
};

export default LeadProposalExportModal;
