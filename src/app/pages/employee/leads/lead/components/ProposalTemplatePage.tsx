import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Form, Row, Col, Badge } from 'react-bootstrap';
import { KTIcon } from '@metronic/helpers';
import { getProposalConfigurations, getProposalRules, getAvailableExportFields, exportLeadDocx, exportLeadPdf } from '@services/leads';
import PercentageConfigurationTable from './PercentageConfigurationTable';
import MeetingConfigurationTable from './MeetingConfigurationTable';
import { showError } from '@utils/modal';
import dayjs from 'dayjs';

interface ProposalTemplatePageProps {
    show: boolean;
    onHide: () => void;
    leadData: any;
    companyData?: any;
    contactData?: any;
    projectData?: any;
}

const ProposalTemplatePage: React.FC<ProposalTemplatePageProps> = ({ 
    show, 
    onHide, 
    leadData,
    companyData,
    contactData,
    projectData 
}) => {
    const [templates, setTemplates] = useState<any[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [currentConfig, setCurrentConfig] = useState<any>(null);
    const [formData, setFormData] = useState<any>({});
    const [percentages, setPercentages] = useState<any[]>([]);
    const [meetings, setMeetings] = useState<any[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [availableFields, setAvailableFields] = useState<any[]>([]);
    const [templateBase64, setTemplateBase64] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'fields' | 'rules'>('fields');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchDefinitions = async () => {
            try {
                const [configs, fields] = await Promise.all([
                    getProposalConfigurations(),
                    getAvailableExportFields()
                ]);
                setTemplates(configs);
                setAvailableFields(fields);
            } catch (err) {
                console.error("Failed to fetch proposal definitions", err);
            }
        };
        fetchDefinitions();
    }, []);

    useEffect(() => {
        if (!show || availableFields.length === 0 || !leadData) return;

        const details = leadData?.additionalDetails || projectData?.additionalDetails || leadData?.project?.additionalDetails || {};
        
        // Helper to extract nested data from API responses
        const extract = (obj: any, keys: string[]) => {
            let current = obj;
            for (const key of keys) {
                if (current && typeof current === 'object' && key in current) {
                    current = current[key];
                } else if (current?.data && typeof current.data === 'object' && key in current.data) {
                    current = current.data[key];
                } else {
                    return null;
                }
            }
            return current;
        };

        const company = companyData?.company || companyData?.data?.company || companyData || leadData?.company || leadData?.leadTeams?.[0]?.company || {};
        const contact = contactData?.contact || contactData?.data?.contact || contactData || leadData?.contact || leadData?.leadTeams?.[0]?.contact || {};
        
        const commercial = leadData?.commercials || projectData?.commercials || leadData?.project?.commercials || [];
        const totalCost = commercial.reduce((sum: number, c: any) => sum + (parseFloat(c.cost) || 0), 0);
        
        const joinNames = (arr: any[]) => {
            if (!arr || !Array.isArray(arr)) return '';
            return arr.map(i => {
                const val = i?.name || i?.service?.name || i?.category?.name || i?.subCategory?.name || i?.subcategory?.name;
                return typeof val === 'string' ? val : (typeof val === 'number' ? String(val) : '');
            }).filter(Boolean).join(', ');
        };

        const initialData: any = {};
        availableFields.forEach((f: any) => {
            let val = leadData[f.key];
            if (!val || typeof val === 'object') {
                switch(f.key) {
                    case 'inquiry_no': val = leadData.inquiryNo || leadData.prefix || ''; break;
                    case 'reference_no': val = leadData.referenceNo || leadData.prefix || leadData.id || ''; break;
                    case 'revision_no': val = leadData.revisionNo || leadData.revisionCount || '0'; break;
                    case 'lead_name': val = leadData.name || leadData.title || ''; break;
                    case 'lead_status': val = leadData.leadStatus?.name || leadData.status?.name || leadData.status || ''; break;
                    case 'lead_summary': val = leadData.summary || leadData.description || leadData.notes || ''; break;
                    case 'created_by': val = leadData.createdBy?.name || (leadData.createdBy?.users ? `${leadData.createdBy.users.firstName} ${leadData.createdBy.users.lastName || ''}` : ''); break;
                    case 'our_company_name': val = 'WiseTech Consultancy'; break;
                    case 'sender_company_name': val = leadData.senderCompany?.name || 'WiseTech Consultancy'; break;
                    case 'client_company_name': val = company.name || company.companyName || leadData.clientCompany?.name || ''; break;
                    case 'client_contact_person': val = contact.name || contact.fullName || leadData.clientContactPerson || ''; break;
                    case 'client_address_line_1': val = details.projectAddress || company.address || ''; break;
                    case 'client_address_line_2': val = details.city || company.city || ''; break;
                    case 'client_address_line_3': val = details.state || company.state || ''; break;
                    case 'project_name': val = leadData.projectName || leadData.title || ''; break;
                    case 'project_location': val = details.locality || details.city || ''; break;
                    case 'project_type': val = leadData.services?.[0]?.service?.name || leadData.leadCategories?.[0]?.category?.name || leadData.projectType || ''; break;
                    case 'plot_area': val = details.plotArea || '0'; break;
                    case 'plot_area_unit': val = details.plotAreaUnit || 'sqft'; break;
                    case 'built_up_area': val = details.builtUpArea || details.projectArea || '0'; break;
                    case 'built_up_area_unit': val = details.builtUpAreaUnit || 'sqft'; break;
                    case 'building_detail': val = details.buildingDetail || ''; break;
                    case 'total_project_cost': val = totalCost; break;
                    case 'services': val = joinNames(leadData.services); break;
                    case 'categories': val = joinNames(leadData.leadCategories); break;
                    case 'sub_categories': val = joinNames(leadData.leadSubCategories); break;
                    case 'service_1': val = leadData.services?.[0]?.service?.name || ''; break;
                    case 'service_2': val = leadData.services?.[1]?.service?.name || ''; break;
                    case 'service_3': val = leadData.services?.[2]?.service?.name || ''; break;
                    case 'category_1': val = leadData.leadCategories?.[0]?.category?.name || ''; break;
                    case 'category_2': val = leadData.leadCategories?.[1]?.category?.name || ''; break;
                    case 'category_3': val = leadData.leadCategories?.[2]?.category?.name || ''; break;
                    case 'sub_category_1': val = leadData.leadSubCategories?.[0]?.subcategory?.name || ''; break;
                    case 'sub_category_2': val = leadData.leadSubCategories?.[1]?.subcategory?.name || ''; break;
                    case 'sub_category_3': val = leadData.leadSubCategories?.[2]?.subcategory?.name || ''; break;
                    case 'city': val = details.city || ''; break;
                    case 'state': val = details.state || ''; break;
                    case 'country': val = details.country || ''; break;
                    case 'zip_code': val = details.zipCode || ''; break;
                    case 'project_full_address': val = details.projectAddress || ''; break;
                    case 'locality': val = details.locality || ''; break;
                    case 'formatted_date': val = dayjs().format('DD MMM, YYYY'); break;
                    case 'date': val = dayjs().format('DD/MM/YYYY'); break;
                    case 'inquiry_date': val = leadData.inquiryDate ? dayjs(leadData.inquiryDate).format('DD MMM, YYYY') : ''; break;
                    default: val = typeof val === 'object' ? '' : (val || '');
                }
            }
            initialData[f.key] = val || '';
        });

        setFormData(initialData);
        setSelectedTemplateId('');
        setCurrentConfig(null);
        setPercentages([]);
        setMeetings([]);
        setTemplateBase64('');
        setActiveTab('fields');
    }, [show, leadData, availableFields]);

    const handleTemplateChange = async (templateId: string) => {
        if (!templateId) {
            setSelectedTemplateId('');
            setCurrentConfig(null);
            return;
        }

        setSelectedTemplateId(templateId);
        const config = templates.find((t) => t.id === templateId);
        setCurrentConfig(config);

        if (config) {
            try {
                const area = parseFloat(formData.built_up_area) || 0;
                const rules = await getProposalRules(templateId, area);
                setPercentages(rules.percentage || []);
                setMeetings(rules.meeting || []);

                // Also update formData with indexed placeholders and template defaults
                setFormData((prev: any) => {
                    const updated = { ...prev };
                    
                    // Add template duration defaults
                    updated.completion_years = config.completionYear || 0;
                    updated.completion_months = config.completionMonth || 0;

                    // Clear old indexed keys first (optional but safer)
                    Object.keys(updated).forEach(key => {
                        if (key.startsWith('stage_') || key.startsWith('meeting_')) {
                            delete updated[key];
                        }
                    });

                    // Add new ones
                    (rules.percentage || []).forEach((p: any, idx: number) => {
                        const baseKey = `stage_${idx + 1}`;
                        updated[`${baseKey}_name`] = p.configKey || '';
                        updated[`${baseKey}_value`] = p.value || 0;
                        if (p.configKey) {
                            updated[p.configKey.toLowerCase().replace(/\s+/g, '_')] = p.value;
                        }
                    });
                    (rules.meeting || []).forEach((m: any, idx: number) => {
                        const baseKey = `meeting_${idx + 1}`;
                        updated[`${baseKey}_name`] = m.configKey || '';
                        updated[`${baseKey}_value`] = m.value || 0;
                        if (m.configKey) {
                            updated[m.configKey.toLowerCase().replace(/\s+/g, '_')] = m.value;
                        }
                    });
                    
                    return updated;
                });
            } catch (err) {
                console.error("Failed to load rules", err);
            }
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const base64 = (event.target?.result as string).split(',')[1];
                setTemplateBase64(base64);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev: any) => {
            const updated = { ...prev, [name]: value };
            if (name === 'built_up_area' && selectedTemplateId) {
                handleTemplateChange(selectedTemplateId);
            }
            return updated;
        });
    };

    const handleExport = async (type: 'docx' | 'pdf') => {
        if (!selectedTemplateId) return;

        setIsGenerating(true);
        try {
            const exportData = {
                templateId: selectedTemplateId,
                edited_data: {
                    ...formData,
                    percentages,
                    meetings
                },
                customTemplate: templateBase64
            };

            const response = type === 'docx' 
                ? await exportLeadDocx(leadData.id, exportData)
                : await exportLeadPdf(leadData.id, exportData);

            const blob = new Blob([response], { 
                type: type === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf' 
            });
            
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${formData.project_name || 'Proposal'}.${type}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error: any) {
            console.error(`Error exporting ${type}:`, error);
            
            let errorMessage = `Failed to generate ${type}. Please check template and rules.`;
            
            // If the error response is a Blob (common with responseType: 'blob'), we need to parse it to read the JSON error message
            if (error.response?.data instanceof Blob) {
                try {
                    const text = await error.response.data.text();
                    const json = JSON.parse(text);
                    if (json.message) errorMessage = json.message;
                } catch (e) {
                    console.error("Failed to parse error blob", e);
                }
            } else if (error.message) {
                errorMessage = error.message;
            }

            showError("Export Error", errorMessage);
        } finally {
            setIsGenerating(false);
            onHide();
        }
    };

    const totalPercentage = percentages.reduce((sum, row) => sum + (parseFloat(row.value) || 0), 0);
    const isValidPercentage = percentages.length === 0 || Math.abs(totalPercentage - 100) < 0.01;
    const canExport = selectedTemplateId && isValidPercentage && !isGenerating;

    return (
        <Modal 
            show={show} 
            onHide={onHide} 
            size="xl" 
            backdrop="static" 
            dialogClassName="mw-1000px"
            contentClassName="rounded-4 border-0 overflow-hidden"
        >
            <Modal.Header closeButton className="bg-white border-bottom py-5 px-10">
                <Modal.Title className="d-flex align-items-center">
                    <KTIcon iconName="document" className="fs-1 text-primary me-3" />
                    <div className="d-flex flex-column">
                        <span className="fs-2 fw-bolder text-dark">Generate Proposal Document</span>
                        <span className="text-muted fs-7 fw-bold">Configure and export document for {leadData?.title}</span>
                    </div>
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-0 bg-light">
                <Row className="g-0 h-100">
                    {/* Left Sidebar - Template Selection */}
                    <Col lg={3} className="bg-white border-end p-8 scroll-y" style={{ height: '75vh' }}>
                        <h5 className="fw-bolder text-dark mb-6">Select Template</h5>
                        <div className="d-flex flex-column gap-2">
                            {templates.map((tpl: any) => (
                                <div 
                                    key={tpl.id} 
                                    onClick={() => handleTemplateChange(tpl.id)}
                                    className={`p-4 rounded-3 cursor-pointer transition-all ${selectedTemplateId === tpl.id ? 'bg-light-primary border border-primary' : 'bg-hover-light border border-transparent'}`}
                                >
                                    <div className="d-flex align-items-center">
                                        <div className="symbol symbol-40px me-3">
                                            <span className={`symbol-label ${selectedTemplateId === tpl.id ? 'bg-primary text-white' : 'bg-light-primary text-primary'}`}>
                                                <KTIcon iconName="document" className="fs-2" />
                                            </span>
                                        </div>
                                        <div className="d-flex flex-column">
                                            <span className="text-dark fw-bolder fs-7">{tpl.templateName}</span>
                                            <span className="text-muted fw-bold fs-9">{tpl.templateCode}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <div className="separator border-gray-200 my-8"></div>
                        
                        <h5 className="fw-bolder text-dark mb-4">Custom Template</h5>
                        <Form.Group>
                            <Form.Label className="fs-9 fw-bolder text-uppercase text-muted mb-2">Word Template (.docx)</Form.Label>
                            <Form.Control 
                                type="file" 
                                accept=".docx" 
                                ref={fileInputRef}
                                onChange={handleFileUpload} 
                                className="form-control-solid form-control-sm"
                            />
                            {templateBase64 && (
                                <Badge bg="light-success" className="text-success mt-2 w-100">File Uploaded</Badge>
                            )}
                        </Form.Group>
                    </Col>

                    {/* Right Main Area */}
                    <Col lg={9} md={8} className="p-4 p-lg-10 scroll-y" style={{ height: '75vh' }}>
                        {currentConfig ? (
                            <div className="d-flex flex-column gap-6 gap-lg-8">
                                {/* General Info Card - More compact */}
                                <div className="card border-0 shadow-sm rounded-4">
                                    <div className="card-body p-6 p-lg-8">
                                        <div className="d-flex align-items-center mb-6">
                                            <div className="symbol symbol-35px symbol-lg-40px bg-light-warning me-4">
                                                <span className="symbol-label">
                                                    <KTIcon iconName="notepad-edit" className="fs-2 text-warning" />
                                                </span>
                                            </div>
                                            <h4 className="fw-bolder text-dark mb-0 fs-5 fs-lg-4">General Configuration</h4>
                                        </div>
                                        <Row className="g-4 g-lg-6">
                                            <Col sm={6} md={4}>
                                                <div className="fs-9 fs-lg-8 fw-bolder text-uppercase text-muted mb-1">Active Template</div>
                                                <div className="fw-bold fs-7 fs-lg-6 text-dark text-truncate">{currentConfig.templateName}</div>
                                            </Col>
                                            <Col xs={6} md={4}>
                                                <div className="fs-9 fs-lg-8 fw-bolder text-uppercase text-muted mb-1">Internal Code</div>
                                                <div className="fw-bold fs-7 fs-lg-6 text-dark">{currentConfig.templateCode}</div>
                                            </Col>
                                            <Col xs={6} md={4}>
                                                <div className="fs-9 fs-lg-8 fw-bolder text-uppercase text-muted mb-1">Standard Duration</div>
                                                <div className="fw-bold fs-7 fs-lg-6 text-dark">{currentConfig.completionYear || 0}Y {currentConfig.completionMonth || 0}M</div>
                                            </Col>
                                        </Row>
                                    </div>
                                </div>

                                {/* Tabs Navigation - Responsive Stretch */}
                                <div className="nav nav-tabs nav-line-tabs nav-stretch fs-6 border-0 bg-white rounded-top shadow-sm px-6 px-lg-8 pt-4 overflow-auto flex-nowrap">
                                    <li className="nav-item">
                                        <a className={`nav-link text-active-primary fw-bolder py-4 cursor-pointer text-nowrap ${activeTab === 'fields' ? 'active' : ''}`} onClick={() => setActiveTab('fields')}>
                                            <KTIcon iconName="element-11" className="fs-2 me-2" /> Placeholder Mapping
                                        </a>
                                    </li>
                                    <li className="nav-item">
                                        <a className={`nav-link text-active-primary fw-bolder py-4 cursor-pointer text-nowrap ${activeTab === 'rules' ? 'active' : ''}`} onClick={() => setActiveTab('rules')}>
                                            <KTIcon iconName="crown" className="fs-2 me-2" /> Area Rules
                                        </a>
                                    </li>
                                </div>

                                {/* Tabs Content - Optimized for width */}
                                <div className="card border-0 shadow-sm rounded-bottom rounded-top-0">
                                    <div className="card-body p-6 p-lg-8">
                                        {activeTab === 'fields' ? (
                                            <Row className="g-4 g-lg-6">
                                                {availableFields
                                                    .filter(f => currentConfig.enabledFields?.includes(f.key))
                                                    .map((field, index) => (
                                                        <Col sm={6} xl={4} key={index}>
                                                            <Form.Group>
                                                                <Form.Label className="fs-9 fw-bolder text-uppercase text-muted mb-1">{field.label}</Form.Label>
                                                                <Form.Control 
                                                                    size="sm" 
                                                                    className="form-control-solid fw-bold"
                                                                    type={(field.key === 'inquiry_date' || field.key === 'date' || field.key === 'offer_date' || field.key === 'validity_date') ? 'date' : 'text'} 
                                                                    name={field.key} 
                                                                    value={formData[field.key] || ''} 
                                                                    onChange={handleInputChange} 
                                                                />
                                                            </Form.Group>
                                                        </Col>
                                                    ))}
                                            </Row>
                                        ) : (
                                            <div className="border border-gray-200 rounded-4 p-4 p-lg-8 bg-light-primary border-dashed position-relative">
                                                <div className="d-flex flex-column gap-6">
                                                    <div className="bg-white rounded p-6 shadow-sm">
                                                        <PercentageConfigurationTable percentages={percentages} setPercentages={setPercentages} />
                                                        {!isValidPercentage && (
                                                            <div className="text-danger fs-8 mt-2 fw-bold animate__animated animate__headShake">
                                                                <KTIcon iconName="information-5" className="text-danger me-1" />
                                                                Total percentage must equal 100%
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="bg-white rounded p-6 shadow-sm">
                                                        <MeetingConfigurationTable meetings={meetings} setMeetings={setMeetings} />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="py-20 text-center border rounded-4 border-dashed bg-white">
                                <div className="symbol symbol-100px mb-5">
                                    <div className="symbol-label bg-light-primary">
                                        <KTIcon iconName="setting-2" className="fs-3x text-primary" />
                                    </div>
                                </div>
                                <h3 className="fw-bolder text-gray-800">Select a template</h3>
                                <p className="text-muted fs-6">Choose a template from the sidebar to configure the proposal.</p>
                            </div>
                        )}
                    </Col>
                </Row>
            </Modal.Body>
            <Modal.Footer className="bg-white border-top py-4 px-8 justify-content-between">
                <Button variant="light" className="fw-bold px-6" onClick={onHide} disabled={isGenerating}>Cancel</Button>
                <div className="d-flex gap-3">
                    <Button 
                        variant="primary" 
                        className="fw-bold px-8 shadow-sm"
                        onClick={() => handleExport('docx')}
                        disabled={!canExport}
                    >
                        {isGenerating ? <span className="spinner-border spinner-border-sm me-2" /> : <KTIcon iconName="word" className="fs-2 me-1" />}
                        Generate DOCX
                    </Button> 
                </div>
            </Modal.Footer>
        </Modal>
    );
};

export default ProposalTemplatePage;

