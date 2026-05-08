import React, { useState, useEffect } from 'react';
import { Form, Button, Table, Card, Row, Col, Badge, Modal } from 'react-bootstrap';
import { getProposalConfigurations, getAvailableExportFields, saveProposalConfiguration, deleteProposalConfiguration } from '@services/leads';
import { KTIcon } from '@metronic/helpers';
import { useNavigate } from 'react-router-dom';
import { showSuccess, showError, showWarning } from '@utils/modal';

const ProposalConfigurationPage: React.FC = () => {
    const navigate = useNavigate();
    const [configurations, setConfigurations] = useState<any[]>([]);
    const [availableFields, setAvailableFields] = useState<any[]>([]);
    const [selectedConfig, setSelectedConfig] = useState<any>(null);
    const [templateBase64, setTemplateBase64] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [activeTab, setActiveTab] = useState<'fields' | 'rules'>('fields');
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const [configs, fields] = await Promise.all([
                getProposalConfigurations(),
                getAvailableExportFields()
            ]);
            setConfigurations(configs);
            setAvailableFields(fields);
        } catch (err) {
            console.error("Error fetching data", err);
            showError("Data Error", "Failed to load configuration data.");
        }
    };

    const handleCreateNew = () => {
        const newTemplate = {
            templateName: "New Proposal Template",
            templateCode: `TPL_${Date.now()}`,
            templateFileName: "",
            completionYear: 0,
            completionMonth: 0,
            enabledFields: availableFields.map(f => f.key),
            enabledSections: ["percentages", "meetings"],
            rules: [
                {
                    min_area: 0,
                    max_area: 100000,
                    configurations: [
                        { config_type: "percentage", config_key: "advance", value: 100 }
                    ],
                    completion_year: 0,
                    completion_month: 0
                }
            ]
        };
        setSelectedConfig(newTemplate);
        setTemplateBase64('');
        setActiveTab('fields');
    };

    const handleSelectTemplate = (tpl: any) => {
        const groupedRules: any[] = [];
        const rulesMap = new Map<string, any>();

        if (tpl.rules && Array.isArray(tpl.rules)) {
            tpl.rules.forEach((r: any) => {
                const key = `${r.minArea}-${r.maxArea}`;
                if (!rulesMap.has(key)) {
                    rulesMap.set(key, {
                        min_area: r.minArea,
                        max_area: r.maxArea,
                        completion_year: r.completionYear || 0,
                        completion_month: r.completionMonth || 0,
                        configurations: []
                    });
                    groupedRules.push(rulesMap.get(key));
                }
                rulesMap.get(key).configurations.push({
                    config_type: r.configType,
                    config_key: r.configKey,
                    value: r.value
                });
            });
        }

        setSelectedConfig({
            ...tpl,
            rules: groupedRules.length > 0 ? groupedRules : tpl.rules
        });
        setTemplateBase64('');
        setActiveTab('fields');
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && selectedConfig) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const base64 = (event.target?.result as string).split(',')[1];
                setTemplateBase64(base64);
                setSelectedConfig({ ...selectedConfig, templateFileName: file.name });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        if (!selectedConfig.id && !templateBase64) {
            showError("Missing File", "Please upload a .docx template file before saving a new configuration.");
            return;
        }

        for (const rule of (selectedConfig.rules || [])) {
            const total = rule.configurations
                .filter((c: any) => c.config_type === 'percentage')
                .reduce((sum: number, c: any) => sum + (parseFloat(c.value) || 0), 0);
            
            if (total !== 100) {
                showWarning("Invalid Rules", `The percentages for area ${rule.min_area}-${rule.max_area} sum to ${total}%. They must sum to exactly 100%.`);
                return;
            }
        }

        setIsSaving(true);
        try {
            const result = await saveProposalConfiguration(selectedConfig, templateBase64);
            showSuccess("Success", "Proposal configuration saved successfully.");
            
            const [configs] = await Promise.all([
                getProposalConfigurations(),
                getAvailableExportFields().then(f => { setAvailableFields(f); return f; })
            ]);
            setConfigurations(configs);

            const savedId = selectedConfig.id || result.id;
            const updated = configs.find((c: any) => c.id === savedId);
            if (updated) handleSelectTemplate(updated);
            
        } catch (err: any) {
            showError("Save Failed", err?.message || "Could not save configuration.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedConfig?.id) return;
        setIsDeleting(true);
        try {
            await deleteProposalConfiguration(selectedConfig.id);
            showSuccess("Deleted", "Template and all associated rules have been permanently removed.");
            setSelectedConfig(null);
            fetchInitialData();
            setShowDeleteModal(false);
        } catch (err) {
            showError("Delete Failed", "Could not remove template.");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleAddRuleGroup = () => {
        const newGroup = {
            min_area: 0,
            max_area: 5000,
            configurations: [
                { config_type: "percentage", config_key: "advance", value: 100 }
            ],
            completion_year: 0,
            completion_month: 0
        };
        setSelectedConfig({ ...selectedConfig, rules: [...(selectedConfig.rules || []), newGroup] });
    };

    const handleAutoFix = (ruleIdx: number) => {
        const rule = selectedConfig.rules[ruleIdx];
        const percentages = rule.configurations.filter((c: any) => c.config_type === 'percentage');
        if (percentages.length === 0) return;

        const currentTotal = percentages.reduce((s: number, c: any) => s + (parseFloat(c.value) || 0), 0);
        
        if (currentTotal === 0) {
            const even = 100 / percentages.length;
            const updatedRules = [...selectedConfig.rules];
            updatedRules[ruleIdx].configurations = updatedRules[ruleIdx].configurations.map((c: any) => 
                c.config_type === 'percentage' ? { ...c, value: parseFloat(even.toFixed(2)) } : c
            );
            setSelectedConfig({ ...selectedConfig, rules: updatedRules });
            return;
        }

        const ratio = 100 / currentTotal;
        let runningTotal = 0;
        const updatedRules = [...selectedConfig.rules];
        
        // Find all indices of percentage configs in this rule
        const percIndices = rule.configurations
            .map((c: any, i: number) => c.config_type === 'percentage' ? i : -1)
            .filter((i: number) => i !== -1);

        percIndices.forEach((cIdx: number, i: number) => {
            const config = updatedRules[ruleIdx].configurations[cIdx];
            if (i === percIndices.length - 1) {
                config.value = parseFloat((100 - runningTotal).toFixed(2));
            } else {
                const newVal = parseFloat(((parseFloat(config.value) || 0) * ratio).toFixed(2));
                config.value = newVal;
                runningTotal += newVal;
            }
        });

        setSelectedConfig({ ...selectedConfig, rules: updatedRules });
    };

    const handleRemoveRuleGroup = (index: number) => {
        const updated = [...selectedConfig.rules];
        updated.splice(index, 1);
        setSelectedConfig({ ...selectedConfig, rules: updated });
    };

    const handleAddItem = (ruleIndex: number, type: 'percentage' | 'meeting') => {
        const updatedRules = [...selectedConfig.rules];
        let configKey = "stage";
        if (type === 'meeting') configKey = "meeting";

        updatedRules[ruleIndex].configurations.push({
            config_type: type,
            config_key: configKey,
            value: 0
        });
        setSelectedConfig({ ...selectedConfig, rules: updatedRules });
    };

    const handleRemoveItem = (ruleIndex: number, configIndex: number) => {
        const updatedRules = [...selectedConfig.rules];
        updatedRules[ruleIndex].configurations.splice(configIndex, 1);
        setSelectedConfig({ ...selectedConfig, rules: updatedRules });
    };

    const handleConfigChange = (ruleIndex: number, configIndex: number, key: string, value: any) => {
        const updatedRules = [...selectedConfig.rules];
        updatedRules[ruleIndex].configurations[configIndex][key] = value;
        setSelectedConfig({ ...selectedConfig, rules: updatedRules });
    };

    const goBack = () => navigate('/qc/leads');

    return (
        <div className="d-flex flex-column flex-column-fluid" style={{ backgroundColor: '#F9FAFB', minHeight: '100vh' }}>
            {/* Header */}
            <div className="bg-white border-bottom py-4 px-8 d-flex justify-content-between align-items-center shadow-sm sticky-top" style={{ zIndex: 100 }}>
                <div className="d-flex align-items-center">
                    <Button variant="link" className="p-0 me-4 text-gray-600 text-hover-primary" onClick={goBack}>
                        <KTIcon iconName="arrow-left" className="fs-1" />
                    </Button>
                    <div>
                        <h1 className="fs-2 fw-bolder mb-0 text-dark">Proposal Template Builder</h1>
                        <span className="text-muted fs-7 fw-bold">Design your export documents and fee rules</span>
                    </div>
                </div>
                <div className="d-flex gap-3">
                    {selectedConfig?.id && (
                        <Button variant="light-danger" className="fw-bold" onClick={() => setShowDeleteModal(true)}>
                            <KTIcon iconName="trash" className="fs-2 me-1" /> Delete Template
                        </Button>
                    )}
                    <Button variant="light-primary" className="fw-bold" onClick={handleCreateNew}>
                        <KTIcon iconName="plus" className="fs-2 me-1" /> New Template
                    </Button>
                    {selectedConfig && (
                        <Button variant="primary" className="fw-bold shadow-sm" onClick={handleSave} disabled={isSaving}>
                            <KTIcon iconName="save-2" className="fs-2 me-1" /> {isSaving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    )}
                </div>
            </div>

            <div className="p-8">
                <Row className="g-8">
                    <Col lg={3}>
                        <Card className="border-0 shadow-sm rounded-4 h-100">
                            <Card.Header className="border-0 pt-6">
                                <h3 className="card-title fw-bolder text-dark">Document Templates</h3>
                            </Card.Header>
                            <Card.Body className="px-4">
                                <div className="d-flex flex-column gap-2">
                                    {configurations.map((config, index) => (
                                        <div 
                                            key={index} 
                                            onClick={() => handleSelectTemplate(config)}
                                            className={`p-4 rounded-3 cursor-pointer transition-all ${selectedConfig?.id === config.id ? 'bg-light-primary border border-primary' : 'bg-hover-light border border-transparent'}`}
                                        >
                                            <div className="d-flex align-items-center">
                                                <div className="symbol symbol-45px me-4">
                                                    <span className={`symbol-label ${selectedConfig?.id === config.id ? 'bg-primary text-white' : 'bg-light-primary text-primary'}`}>
                                                        <KTIcon iconName="document" className="fs-2" />
                                                    </span>
                                                </div>
                                                <div className="d-flex flex-column">
                                                    <span className="text-dark fw-bolder fs-6">{config.templateName}</span>
                                                    <span className="text-muted fw-bold fs-8">{config.templateCode}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>

                    <Col lg={9}>
                        {selectedConfig ? (
                            <div className="d-flex flex-column gap-8">
                                {/* General Config */}
                                <Card className="border-0 shadow-sm rounded-4">
                                    <Card.Body className="p-8">
                                        <div className="d-flex align-items-center mb-8">
                                            <div className="symbol symbol-40px bg-light-warning me-4">
                                                <span className="symbol-label">
                                                    <KTIcon iconName="notepad-edit" className="fs-2 text-warning" />
                                                </span>
                                            </div>
                                            <h4 className="fw-bolder text-dark mb-0">General Configuration</h4>
                                        </div>
                                        <Row className="g-6">
                                            <Col md={3}>
                                                <Form.Group>
                                                    <Form.Label className="fs-8 fw-bolder text-uppercase text-muted mb-2">Template Name</Form.Label>
                                                    <Form.Control className="form-control-solid fw-bold" value={selectedConfig.templateName} onChange={(e) => setSelectedConfig({ ...selectedConfig, templateName: e.target.value })} />
                                                </Form.Group>
                                            </Col>
                                            <Col md={3}>
                                                <Form.Group>
                                                    <Form.Label className="fs-8 fw-bolder text-uppercase text-muted mb-2">Internal Code</Form.Label>
                                                    <Form.Control className="form-control-solid fw-bold" value={selectedConfig.templateCode} onChange={(e) => setSelectedConfig({ ...selectedConfig, templateCode: e.target.value })} />
                                                </Form.Group>
                                            </Col>
                                            <Col md={6}>
                                                <Form.Group>
                                                    <Form.Label className="fs-8 fw-bolder text-uppercase text-muted mb-2">
                                                        {selectedConfig.id ? 'Change Word Template' : 'Add Word Template'} (.docx)
                                                    </Form.Label>
                                                    <div className="d-flex align-items-center">
                                                        <Form.Control type="file" accept=".docx" onChange={handleFileUpload} className="form-control-solid" />
                                                        {selectedConfig.templateFileName && (
                                                            <Badge bg="light-success" className="ms-3 text-success p-2 border border-success border-dashed">{selectedConfig.templateFileName}</Badge>
                                                        )}
                                                    </div>
                                                </Form.Group>
                                                </Col>
                                        </Row>
                                    </Card.Body>
                                </Card>

                                <div className="nav nav-tabs nav-line-tabs nav-stretch fs-6 border-0 bg-white rounded-top shadow-sm px-8 pt-4">
                                    <li className="nav-item">
                                        <a className={`nav-link text-active-primary fw-bolder py-4 cursor-pointer ${activeTab === 'fields' ? 'active' : ''}`} onClick={() => setActiveTab('fields')}>
                                            <KTIcon iconName="element-11" className="fs-2 me-2" /> Placeholder Fields Mapping
                                        </a>
                                    </li>
                                    <li className="nav-item">
                                        <a className={`nav-link text-active-primary fw-bolder py-4 cursor-pointer ${activeTab === 'rules' ? 'active' : ''}`} onClick={() => setActiveTab('rules')}>
                                            <KTIcon iconName="crown" className="fs-2 me-2" /> Area-Based Fee Rules
                                        </a>
                                    </li>
                                </div>
                                <Card className="border-0 shadow-sm rounded-bottom rounded-top-0">
                                    <Card.Body className="p-8">
                                        {activeTab === 'fields' ? (
                                            <div>
                                                <div className="d-flex justify-content-between align-items-center mb-6">
                                                    <h5 className="fw-bolder mb-0">Select fields to enable in this template:</h5>
                                                    <Button 
                                                        variant="light-primary" 
                                                        size="sm" 
                                                        className="fw-bold"
                                                        onClick={() => {
                                                            const allKeys = availableFields.map(f => f.key);
                                                            const current = selectedConfig.enabledFields || [];
                                                            const isAllSelected = allKeys.length > 0 && allKeys.every(k => current.includes(k));
                                                            setSelectedConfig({ 
                                                                ...selectedConfig, 
                                                                enabledFields: isAllSelected ? [] : allKeys 
                                                            });
                                                        }}
                                                    >
                                                        <KTIcon iconName={availableFields.length > 0 && availableFields.map(f => f.key).every(k => (selectedConfig.enabledFields || []).includes(k)) ? 'cross-circle' : 'check-circle'} className="fs-3 me-1" />
                                                        {availableFields.length > 0 && availableFields.map(f => f.key).every(k => (selectedConfig.enabledFields || []).includes(k)) ? 'Deselect All' : 'Select All'}
                                                    </Button>
                                                </div>
                                                <Row className="g-4">
                                                    {availableFields.map((field, idx) => (
                                                        <Col md={4} lg={3} key={idx}>
                                                            <div className="form-check form-check-custom form-check-solid">
                                                                <input className="form-check-input h-20px w-20px" type="checkbox" checked={selectedConfig.enabledFields?.includes(field.key)} onChange={() => {
                                                                    const current = selectedConfig.enabledFields || [];
                                                                    const updated = current.includes(field.key) ? current.filter((k:any) => k !== field.key) : [...current, field.key];
                                                                    setSelectedConfig({ ...selectedConfig, enabledFields: updated });
                                                                }} />
                                                                <label className="form-check-label fw-bold text-gray-700 ms-3">{field.label}</label>
                                                            </div>
                                                        </Col>
                                                    ))}
                                                </Row>
                                            </div>
                                        ) : (
                                            <div>
                                                <div className="d-flex justify-content-between align-items-center mb-8">
                                                    <h4 className="fw-bolder mb-0">Project Area Rules</h4>
                                                    <Button variant="primary" size="sm" onClick={handleAddRuleGroup}>
                                                        <KTIcon iconName="plus" className="fs-3 me-1" /> Add New Area Range
                                                    </Button>
                                                </div>

                                                <div className="d-flex flex-column gap-6">
                                                    {(selectedConfig.rules || []).map((rule: any, ruleIdx: number) => {
                                                        const totalPerc = rule.configurations.filter((c:any) => c.config_type === 'percentage').reduce((s:number, c:any) => s + (parseFloat(c.value) || 0), 0);
                                                        const isPercValid = totalPerc === 100;

                                                        return (
                                                            <div key={ruleIdx} className="border border-gray-200 rounded-4 p-6 bg-light-primary border-dashed position-relative">
                                                                <div className="position-absolute top-0 end-0 mt-4 me-4" style={{ zIndex: 10 }}>
                                                                    <Button variant="light-danger" size="sm" onClick={() => handleRemoveRuleGroup(ruleIdx)}>
                                                                        <KTIcon iconName="trash" className="fs-3" />
                                                                    </Button>
                                                                </div>

                                                                <Row className="align-items-center mb-8 pe-12">
                                                                    <Col md={2}><Form.Group><Form.Label className="fs-8 fw-bolder text-uppercase text-danger mb-1">Min Area</Form.Label><Form.Control type="number" className="form-control-solid" value={rule.min_area} onChange={(e) => { const updated = [...selectedConfig.rules]; updated[ruleIdx].min_area = parseInt(e.target.value); setSelectedConfig({ ...selectedConfig, rules: updated }); }} /></Form.Group></Col>
                                                                    <Col md={2}><Form.Group><Form.Label className="fs-8 fw-bolder text-uppercase text-danger mb-1">Max Area</Form.Label><Form.Control type="number" className="form-control-solid" value={rule.max_area} onChange={(e) => { const updated = [...selectedConfig.rules]; updated[ruleIdx].max_area = parseInt(e.target.value); setSelectedConfig({ ...selectedConfig, rules: updated }); }} /></Form.Group></Col>
                                                                    <Col md={2}><Form.Group><Form.Label className="fs-8 fw-bolder text-uppercase text-primary mb-1">Duration (Y)</Form.Label><Form.Control type="number" className="form-control-solid" value={rule.completion_year} onChange={(e) => { const updated = [...selectedConfig.rules]; updated[ruleIdx].completion_year = parseInt(e.target.value); setSelectedConfig({ ...selectedConfig, rules: updated }); }} /></Form.Group></Col>
                                                                    <Col md={2}><Form.Group><Form.Label className="fs-8 fw-bolder text-uppercase text-primary mb-1">Duration (M)</Form.Label><Form.Control type="number" className="form-control-solid" value={rule.completion_month} onChange={(e) => { const updated = [...selectedConfig.rules]; updated[ruleIdx].completion_month = parseInt(e.target.value); setSelectedConfig({ ...selectedConfig, rules: updated }); }} /></Form.Group></Col>
                                                                </Row>

                                                                <Row className="g-6">
                                                                    <Col lg={7}>
                                                                        <div className="bg-white rounded p-6 shadow-sm h-100">
                                                                             <div className="d-flex justify-content-between align-items-center mb-4">
                                                                                 <h6 className="fw-bolder mb-0"><KTIcon iconName="percentage" className="text-primary me-2" />Payment Breakdown</h6>
                                                                                 <div className="d-flex align-items-center gap-3">
                                                                                     <Badge bg={isPercValid ? 'light-success' : 'light-danger'} className={isPercValid ? 'text-success' : 'text-danger'}>Total: {totalPerc}%</Badge>
                                                                                     {!isPercValid && (
                                                                                         <Button 
                                                                                             variant="light-danger" 
                                                                                             size="sm" 
                                                                                             className="btn-sm py-0 px-2 fs-9 fw-bold"
                                                                                             onClick={() => handleAutoFix(ruleIdx)}
                                                                                         >
                                                                                             <KTIcon iconName="magic" className="fs-9 me-1" /> Fix
                                                                                         </Button>
                                                                                     )}
                                                                                     <Button variant="light-primary" size="sm" onClick={() => handleAddItem(ruleIdx, 'percentage')} className="btn-icon w-25px h-25px">
                                                                                         <KTIcon iconName="plus" className="fs-3" />
                                                                                     </Button>
                                                                                 </div>
                                                                             </div>
                                                                             <Table borderless className="align-middle gs-0 gy-3">
                                                                                 <thead><tr className="fw-bolder text-muted fs-8 text-uppercase border-bottom border-gray-200"><th className="ps-0 min-w-150px">Stage Name</th><th className="min-w-80px">Value (%)</th><th className="text-end">Action</th></tr></thead>
                                                                                 <tbody>{rule.configurations.map((config: any, cIdx: number) => config.config_type === 'percentage' && (<tr key={cIdx}><td className="ps-0"><Form.Control size="sm" className="form-control-solid" value={config.config_key} onChange={(e) => handleConfigChange(ruleIdx, cIdx, 'config_key', e.target.value)} /></td><td><Form.Control size="sm" type="number" className="form-control-solid" value={config.value} onChange={(e) => handleConfigChange(ruleIdx, cIdx, 'value', e.target.value)} /></td><td className="text-end pe-0"><Button variant="light-danger" size="sm" onClick={() => handleRemoveItem(ruleIdx, cIdx)}><KTIcon iconName="trash" className="fs-4" /></Button></td></tr>))}</tbody>
                                                                             </Table>
                                                                        </div>
                                                                    </Col>

                                                                    <Col lg={5}>
                                                                        <div className="bg-white rounded p-6 shadow-sm h-100">
                                                                             <div className="d-flex justify-content-between align-items-center mb-4">
                                                                                 <h6 className="fw-bolder mb-0"><KTIcon iconName="timer" className="text-warning me-2" />Meetings & Durations</h6>
                                                                                 <Button variant="light-warning" size="sm" onClick={() => handleAddItem(ruleIdx, 'meeting')} className="btn-icon w-25px h-25px">
                                                                                     <KTIcon iconName="plus" className="fs-3" />
                                                                                 </Button>
                                                                             </div>
                                                                             <Table borderless className="align-middle gs-0 gy-3">
                                                                                 <thead><tr className="fw-bolder text-muted fs-8 text-uppercase border-bottom border-gray-200"><th className="ps-0">Meeting Type</th><th className="min-w-80px">Count</th><th className="text-end pe-0">Action</th></tr></thead>
                                                                                 <tbody>{rule.configurations.map((config: any, cIdx: number) => config.config_type === 'meeting' && (<tr key={cIdx}><td className="ps-0"><Form.Control size="sm" className="form-control-solid" value={config.config_key} onChange={(e) => handleConfigChange(ruleIdx, cIdx, 'config_key', e.target.value)} /></td><td><Form.Control size="sm" type="number" className="form-control-solid" value={config.value} onChange={(e) => handleConfigChange(ruleIdx, cIdx, 'value', e.target.value)} /></td><td className="text-end pe-0"><Button variant="light-danger" size="sm" onClick={() => handleRemoveItem(ruleIdx, cIdx)}><KTIcon iconName="trash" className="fs-4" /></Button></td></tr>))}</tbody>
                                                                             </Table>
                                                                        </div>
                                                                    </Col>
                                                                </Row>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </Card.Body>
                                </Card>
                            </div>
                        ) : (
                            <div className="py-20 text-center border rounded-4 border-dashed bg-white">
                                <div className="symbol symbol-100px mb-5"><div className="symbol-label bg-light-primary"><KTIcon iconName="setting-2" className="fs-3x text-primary" /></div></div>
                                <h3 className="fw-bolder text-gray-800">Select a template to configure</h3>
                                <p className="text-muted fs-6">Choose from the list on the left or create a new one.</p>
                            </div>
                        )}
                    </Col>
                </Row>
            </div>

            <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
                <Modal.Header closeButton><Modal.Title>Permanently Delete Template?</Modal.Title></Modal.Header>
                <Modal.Body>
                    <p className="mb-0 text-gray-700">Are you sure you want to delete <strong>{selectedConfig?.templateName}</strong>? This action will:</p>
                    <ul className="mt-4 text-danger fw-bold">
                        <li>Permanently remove the .docx file from AWS S3.</li>
                        <li>Delete all associated Area Rules from the database.</li>
                        <li>This action cannot be undone.</li>
                    </ul>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="light" onClick={() => setShowDeleteModal(false)} disabled={isDeleting}>Cancel</Button>
                    <Button variant="danger" onClick={handleDelete} disabled={isDeleting}>
                        {isDeleting ? <span className="spinner-border spinner-border-sm me-2" /> : <KTIcon iconName="trash" className="me-1" />}
                        Confirm Hard Delete
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default ProposalConfigurationPage;
