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
            paymentBreakdown: [
                { config_type: "percentage", config_key: "Advance (To be paid along with the Work Order)", value: 0 },
                { config_type: "percentage", config_key: "Design Concept", value: 0 },
                { config_type: "percentage", config_key: "Design Detailing", value: 0 },
                { config_type: "percentage", config_key: "Tendering", value: 0 },
                { config_type: "percentage", config_key: "Procurement, Installation & Commissioning (Part-1)", value: 0 },
                { config_type: "percentage", config_key: "Procurement, Installation & Commissioning (Part-2)", value: 0 }
            ],
            rules: [],
            isActive: true
        };
        setSelectedConfig(newTemplate);
        setTemplateBase64('');
        setActiveTab('fields');
    };

    const handleSelectTemplate = (tpl: any) => {
        const areaRules: any[] = [];
        const globalPaymentStages: any[] = [];
        const rulesMap = new Map<string, any>();

        if (tpl.rules && Array.isArray(tpl.rules)) {
            tpl.rules.forEach((r: any) => {
                const min = r.minArea !== undefined ? r.minArea : r.min_area;
                const max = r.maxArea !== undefined ? r.maxArea : r.max_area;
                const type = (r.configType || r.config_type || '').toLowerCase();
                const key = r.configKey || r.config_key;
                const val = r.value !== undefined ? r.value : r.config_value;
                
                const mappedRule = {
                    id: r.id,
                    config_type: type,
                    config_key: key,
                    configType: type,
                    configKey: key,
                    value: val,
                    config_value: val
                };

                // If it's a percentage (payment stage), it's ALWAYS global now
                if (type === 'percentage' || type === 'payment' || (Number(min) === -1 && Number(max) === -1)) {
                    globalPaymentStages.push(mappedRule);
                } else {
                    const areaKey = `${min}-${max}`;
                    if (!rulesMap.has(areaKey)) {
                        rulesMap.set(areaKey, {
                            id: r.id,
                            min_area: min,
                            max_area: max,
                            minArea: min,
                            maxArea: max,
                            completionYear: r.completionYear ?? r.completion_year ?? 0,
                            completionMonth: r.completionMonth ?? r.completion_month ?? 0,
                            configurations: []
                        });
                        areaRules.push(rulesMap.get(areaKey));
                    }
                    rulesMap.get(areaKey).configurations.push(mappedRule);
                }
            });
        }

        setSelectedConfig({
            ...tpl,
            paymentBreakdown: globalPaymentStages,
            rules: areaRules
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

        // Validate percentages
        const total = (selectedConfig.paymentBreakdown || [])
            .reduce((sum: number, c: any) => sum + (parseFloat(c.value) || 0), 0);
        
        if (total !== 100 && (selectedConfig.paymentBreakdown || []).length > 0) {
            showWarning("Invalid Rules", `The global payment breakdown percentages sum to ${total}%. They must sum to exactly 100%.`);
            return;
        }

        setIsSaving(true);
        try {
            // Flatten global and area rules back for backend
            const flattenedRules = [
                // Global rule
                {
                    minArea: -1,
                    maxArea: -1,
                    configurations: selectedConfig.paymentBreakdown || [],
                    completionYear: selectedConfig.completionYear || 0,
                    completionMonth: selectedConfig.completionMonth || 0
                },
                // Area rules
                ...(selectedConfig.rules || []).map((r: any) => ({
                    ...r,
                    minArea: r.minArea ?? r.min_area,
                    maxArea: r.maxArea ?? r.max_area,
                    completionYear: r.completionYear ?? r.completion_year,
                    completionMonth: r.completionMonth ?? r.completion_month
                }))
            ];

            const result = await saveProposalConfiguration({ ...selectedConfig, rules: flattenedRules }, templateBase64);
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
                { config_type: "meeting", config_key: "RCC Slab Checking for MEP up to Typical Floor", value: 0 },
                { config_type: "meeting", config_key: "RCC Slab Checking after Typical Floor", value: 0 },
                { config_type: "meeting", config_key: "Testing and Commissioning", value: 0 },
                { config_type: "meeting", config_key: "Installation Site Co-ordination", value: 0 },
                { config_type: "meeting", config_key: "Handover", value: 0 }
            ],
            completion_year: 0,
            completion_month: 0
        };
        setSelectedConfig({ ...selectedConfig, rules: [...(selectedConfig.rules || []), newGroup] });
    };

    const handleAutoFixGlobal = () => {
        const percentages = selectedConfig.paymentBreakdown || [];
        if (percentages.length === 0) return;

        const currentTotal = percentages.reduce((s: number, c: any) => s + (parseFloat(c.value) || 0), 0);
        
        if (currentTotal === 0) {
            const even = 100 / percentages.length;
            const updated = percentages.map((p: any) => ({ ...p, value: parseFloat(even.toFixed(2)) }));
            setSelectedConfig({ ...selectedConfig, paymentBreakdown: updated });
            return;
        }

        const ratio = 100 / currentTotal;
        let runningTotal = 0;
        const updated = percentages.map((p: any, i: number) => {
            if (i === percentages.length - 1) {
                return { ...p, value: parseFloat((100 - runningTotal).toFixed(2)) };
            }
            const newVal = parseFloat(((parseFloat(p.value) || 0) * ratio).toFixed(2));
            runningTotal += newVal;
            return { ...p, value: newVal };
        });

        setSelectedConfig({ ...selectedConfig, paymentBreakdown: updated });
    };

    const handleRemoveRuleGroup = (index: number) => {
        const updated = [...selectedConfig.rules];
        updated.splice(index, 1);
        setSelectedConfig({ ...selectedConfig, rules: updated });
    };

    const handleAddGlobalStage = () => {
        const updated = [...(selectedConfig.paymentBreakdown || []), { config_type: 'percentage', config_key: 'New Stage', value: 0 }];
        setSelectedConfig({ ...selectedConfig, paymentBreakdown: updated });
    };

    const handleRemoveGlobalStage = (idx: number) => {
        const updated = [...selectedConfig.paymentBreakdown];
        updated.splice(idx, 1);
        setSelectedConfig({ ...selectedConfig, paymentBreakdown: updated });
    };

    const handleGlobalStageChange = (idx: number, key: string, value: any) => {
        const updated = [...selectedConfig.paymentBreakdown];
        updated[idx][key] = value;
        setSelectedConfig({ ...selectedConfig, paymentBreakdown: updated });
    };

    const handleAddItem = (ruleIndex: number, type: 'meeting') => {
        const updatedRules = [...selectedConfig.rules];
        updatedRules[ruleIndex].configurations.push({
            config_type: type,
            config_key: "meeting",
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

    const [draggedConfigIndex, setDraggedConfigIndex] = useState<number | null>(null);
    const [draggedRuleIndex, setDraggedRuleIndex] = useState<number | null>(null);
    const [dragContext, setDragContext] = useState<'global' | 'rule' | null>(null);

    const handleDragStart = (index: number, context: 'global' | 'rule', ruleIdx?: number) => {
        setDraggedConfigIndex(index);
        setDragContext(context);
        if (ruleIdx !== undefined) setDraggedRuleIndex(ruleIdx);
    };

    const handleDragOver = (e: React.DragEvent, targetIdx: number, ruleIdx?: number) => {
        e.preventDefault();
        if (dragContext === 'global') {
            if (draggedConfigIndex === null || draggedConfigIndex === targetIdx) return;
            const updated = [...selectedConfig.paymentBreakdown];
            const itemToMove = updated[draggedConfigIndex];
            updated.splice(draggedConfigIndex, 1);
            updated.splice(targetIdx, 0, itemToMove);
            setSelectedConfig({ ...selectedConfig, paymentBreakdown: updated });
            setDraggedConfigIndex(targetIdx);
        } else if (dragContext === 'rule' && ruleIdx !== undefined && draggedRuleIndex === ruleIdx) {
            if (draggedConfigIndex === null || draggedConfigIndex === targetIdx) return;
            const updatedRules = [...selectedConfig.rules];
            const configs = [...updatedRules[ruleIdx].configurations];
            const itemToMove = configs[draggedConfigIndex];
            configs.splice(draggedConfigIndex, 1);
            configs.splice(targetIdx, 0, itemToMove);
            updatedRules[ruleIdx].configurations = configs;
            setSelectedConfig({ ...selectedConfig, rules: updatedRules });
            setDraggedConfigIndex(targetIdx);
        }
    };

    const handleDragEnd = () => {
        setDraggedConfigIndex(null);
        setDraggedRuleIndex(null);
        setDragContext(null);
    };

    const goBack = () => navigate('/qc/leads');

    return (
        <div className="d-flex flex-column flex-column-fluid" style={{ backgroundColor: '#F9FAFB', minHeight: '100vh' }}>
            {/* Header omitted for brevity, same as original */}
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
                                                    <Button variant="light-primary" size="sm" className="fw-bold" onClick={() => {
                                                        const allKeys = availableFields.map(f => f.key);
                                                        const current = selectedConfig.enabledFields || [];
                                                        const isAllSelected = allKeys.length > 0 && allKeys.every(k => current.includes(k));
                                                        setSelectedConfig({ ...selectedConfig, enabledFields: isAllSelected ? [] : allKeys });
                                                    }}>
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
                                            <div className="d-flex flex-column gap-8">
                                                {/* Global Payment Breakdown Section */}
                                                <div className="border border-gray-200 rounded-4 p-8 bg-white shadow-sm border-dashed">
                                                    <div className="d-flex justify-content-between align-items-center mb-6">
                                                        <div className="d-flex align-items-center">
                                                            <div className="symbol symbol-40px bg-light-primary me-4">
                                                                <span className="symbol-label"><KTIcon iconName="percentage" className="fs-2 text-primary" /></span>
                                                            </div>
                                                            <div>
                                                                <h4 className="fw-bolder mb-0 text-dark">Global Payment Breakdown</h4>
                                                                <span className="text-muted fs-8 fw-bold">These stages apply to ALL area ranges</span>
                                                            </div>
                                                        </div>
                                                        <div className="d-flex align-items-center gap-3">
                                                            {(() => {
                                                                const totalPerc = (selectedConfig.paymentBreakdown || []).reduce((s:number, c:any) => s + (parseFloat(c.value) || 0), 0);
                                                                const isValid = totalPerc === 100;
                                                                return (
                                                                    <>
                                                                        <Badge bg={isValid ? 'light-success' : 'light-danger'} className={isValid ? 'text-success' : 'text-danger'}>Total: {totalPerc}%</Badge>
                                                                        {!isValid && (selectedConfig.paymentBreakdown || []).length > 0 && (
                                                                            <Button variant="light-danger" size="sm" className="btn-sm py-0 px-2 fs-9 fw-bold" onClick={handleAutoFixGlobal}>
                                                                                <KTIcon iconName="magic" className="fs-9 me-1" /> Auto-Fix
                                                                            </Button>
                                                                        )}
                                                                    </>
                                                                );
                                                            })()}
                                                            <Button variant="light-primary" size="sm" onClick={handleAddGlobalStage} className="btn-icon w-25px h-25px">
                                                                <KTIcon iconName="plus" className="fs-3" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    
                                                        <Table bordered size="sm" className="bg-white align-middle gs-0 gy-3 mb-0">
                                                            <thead className="bg-light">
                                                                <tr className="fw-bolder text-muted fs-8 text-uppercase border-bottom border-gray-200">
                                                                    <th className="ps-4 w-30px"></th>
                                                                    <th className="ps-2 w-40px">Sr</th>
                                                                    <th className="min-w-150px">Stage Name</th>
                                                                    <th className="w-120px text-center">Value (%)</th>
                                                                    <th className="text-end pe-4 w-80px">Action</th>
                                                                </tr>
                                                            </thead>
                                                        <tbody>
                                                            {(selectedConfig.paymentBreakdown || []).map((config: any, cIdx: number) => (
                                                                <tr 
                                                                    key={cIdx} 
                                                                    className={`border-bottom border-gray-100 ${draggedConfigIndex === cIdx && dragContext === 'global' ? 'opacity-50 bg-light shadow-sm' : ''}`}
                                                                    draggable
                                                                    onDragStart={() => handleDragStart(cIdx, 'global')}
                                                                    onDragOver={(e) => handleDragOver(e, cIdx)}
                                                                    onDragEnd={handleDragEnd}
                                                                    style={{ cursor: 'move' }}
                                                                >
                                                                    <td className="ps-4 text-center">
                                                                        <KTIcon iconName="row-horizontal" className="fs-3 text-gray-400" />
                                                                    </td>
                                                                    <td className="ps-2 fw-bold text-gray-700">{cIdx + 1}</td>
                                                                    <td>
                                                                        <Form.Control 
                                                                            size="sm" 
                                                                            className="form-control-solid fw-bold py-1" 
                                                                            value={config.config_key || config.configKey || ''} 
                                                                            onChange={(e) => handleGlobalStageChange(cIdx, 'config_key', e.target.value)} 
                                                                            placeholder="Stage name..."
                                                                        />
                                                                    </td>
                                                                    <td className="text-center">
                                                                        <div className="d-flex align-items-center justify-content-center">
                                                                            <Form.Control 
                                                                                type="number" 
                                                                                size="sm" 
                                                                                className="form-control-solid fw-bold w-75px text-center py-1" 
                                                                                value={config.value || config.config_value || 0} 
                                                                                onChange={(e) => handleGlobalStageChange(cIdx, 'value', e.target.value)} 
                                                                            />
                                                                            <span className="ms-1 fw-bold">%</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="text-end pe-4">
                                                                        <Button 
                                                                            variant="light-danger" 
                                                                            className="btn-sm btn-icon w-25px h-25px" 
                                                                            onClick={() => handleRemoveGlobalStage(cIdx)}
                                                                        >
                                                                            <KTIcon iconName="trash" className="fs-6" />
                                                                        </Button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                        <tfoot>
                                                            <tr className="bg-light-primary fw-bolder fs-8 border-top border-gray-300">
                                                                <td colSpan={3} className="text-end pe-4 text-gray-800">Total</td>
                                                                <td className="text-center text-primary">
                                                                    {(selectedConfig.paymentBreakdown || []).reduce((sum: number, c: any) => sum + (parseFloat(c.value || c.config_value || 0) || 0), 0)}%
                                                                </td>
                                                                <td></td>
                                                            </tr>
                                                        </tfoot>
                                                    </Table>
                                                    {(!selectedConfig.paymentBreakdown || selectedConfig.paymentBreakdown.length === 0) && (
                                                        <div className="text-center py-4 text-muted fs-8 border border-dashed rounded mt-4">No global stages added yet.</div>
                                                    )}
                                                </div>

                                                <div className="separator separator-dashed my-4"></div>

                                                <div className="d-flex justify-content-between align-items-center">
                                                    <h4 className="fw-bolder mb-0 text-dark">Area-Specific Meetings & Durations</h4>
                                                    <Button variant="primary" size="sm" onClick={handleAddRuleGroup}>
                                                        <KTIcon iconName="plus" className="fs-3 me-1" /> Add Area Range
                                                    </Button>
                                                </div>

                                                <div className="d-flex flex-column gap-6">
                                                    {(selectedConfig.rules || []).map((rule: any, ruleIdx: number) => (
                                                        <div key={ruleIdx} className="border border-gray-200 rounded-4 p-6 bg-light-primary border-dashed position-relative">
                                                            <div className="position-absolute top-0 end-0 mt-4 me-4" style={{ zIndex: 10 }}>
                                                                <Button variant="light-danger" size="sm" onClick={() => handleRemoveRuleGroup(ruleIdx)}>
                                                                    <KTIcon iconName="trash" className="fs-3" />
                                                                </Button>
                                                            </div>

                                                            <Row className="align-items-center mb-6 pe-12">
                                                                <Col md={2}><Form.Group><Form.Label className="fs-8 fw-bolder text-uppercase text-danger mb-1">Min Area</Form.Label><Form.Control type="number" className="form-control-solid" value={rule.completionYear !== undefined ? rule.minArea : rule.min_area} onChange={(e) => { const updated = [...selectedConfig.rules]; updated[ruleIdx].minArea = parseInt(e.target.value) || 0; setSelectedConfig({ ...selectedConfig, rules: updated }); }} /></Form.Group></Col>
                                                                <Col md={2}><Form.Group><Form.Label className="fs-8 fw-bolder text-uppercase text-danger mb-1">Max Area</Form.Label><Form.Control type="number" className="form-control-solid" value={rule.completionYear !== undefined ? rule.maxArea : rule.max_area} onChange={(e) => { const updated = [...selectedConfig.rules]; updated[ruleIdx].maxArea = parseInt(e.target.value) || 0; setSelectedConfig({ ...selectedConfig, rules: updated }); }} /></Form.Group></Col>
                                                                <Col md={2}><Form.Group><Form.Label className="fs-8 fw-bolder text-uppercase text-primary mb-1">Duration (Y)</Form.Label><Form.Control type="number" className="form-control-solid" value={rule.completionYear ?? rule.completion_year ?? 0} onChange={(e) => { const updated = [...selectedConfig.rules]; updated[ruleIdx].completionYear = parseInt(e.target.value) || 0; setSelectedConfig({ ...selectedConfig, rules: updated }); }} /></Form.Group></Col>
                                                                <Col md={2}><Form.Group><Form.Label className="fs-8 fw-bolder text-uppercase text-primary mb-1">Duration (M)</Form.Label><Form.Control type="number" className="form-control-solid" value={rule.completionMonth ?? rule.completion_month ?? 0} onChange={(e) => { const updated = [...selectedConfig.rules]; updated[ruleIdx].completionMonth = parseInt(e.target.value) || 0; setSelectedConfig({ ...selectedConfig, rules: updated }); }} /></Form.Group></Col>
                                                            </Row>

                                                            <div className="bg-white rounded p-4 p-lg-6 shadow-sm">
                                                                <div className="d-flex justify-content-between align-items-center mb-4">
                                                                    <h6 className="fw-bolder mb-0"><KTIcon iconName="timer" className="text-warning me-2" />Meetings Configuration</h6>
                                                                    <Button variant="light-warning" size="sm" onClick={() => handleAddItem(ruleIdx, 'meeting')} className="btn-icon w-25px h-25px">
                                                                        <KTIcon iconName="plus" className="fs-3" />
                                                                    </Button>
                                                                </div>
                                                                <Table borderless className="align-middle gs-0 gy-3 mb-0">
                                                                    <thead><tr className="fw-bolder text-muted fs-8 text-uppercase border-bottom border-gray-200"><th className="w-30px ps-0"></th><th className="ps-0">Meeting Type</th><th className="w-80px text-center">Count</th><th className="text-end pe-0 w-50px">Action</th></tr></thead>
                                                                    <tbody>
                                                                        {rule.configurations.map((config: any, cIdx: number) => (
                                                                            <tr 
                                                                                key={cIdx}
                                                                                draggable
                                                                                onDragStart={() => handleDragStart(cIdx, 'rule', ruleIdx)}
                                                                                onDragOver={(e) => handleDragOver(e, cIdx, ruleIdx)}
                                                                                onDragEnd={handleDragEnd}
                                                                                className={dragContext === 'rule' && draggedConfigIndex === cIdx ? 'opacity-50 bg-light' : ''}
                                                                                style={{ cursor: 'move' }}
                                                                            >
                                                                                <td className="ps-0 text-center"><KTIcon iconName="row-horizontal" className="fs-3 text-gray-400" /></td>
                                                                                <td className="ps-0"><Form.Control size="sm" className="form-control-solid py-1" value={config.config_key} onChange={(e) => handleConfigChange(ruleIdx, cIdx, 'config_key', e.target.value)} /></td>
                                                                                <td><Form.Control size="sm" type="number" className="form-control-solid py-1 text-center" value={config.value} onChange={(e) => handleConfigChange(ruleIdx, cIdx, 'value', e.target.value)} /></td>
                                                                                <td className="text-end pe-0"><Button variant="light-danger" size="sm" className="btn-icon w-25px h-25px" onClick={() => handleRemoveItem(ruleIdx, cIdx)}><KTIcon iconName="trash" className="fs-6" /></Button></td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </Table>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {(!selectedConfig.rules || selectedConfig.rules.length === 0) && (
                                                        <div className="text-center py-10 text-muted fs-6 border border-dashed rounded bg-white">No area rules added yet. Click "Add Area Range" to begin.</div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </Card.Body>
                                </Card>
                            </div>
                        ) : (
                            <div className="d-flex flex-center h-100 min-h-500px flex-column bg-white rounded-4 shadow-sm border border-dashed border-gray-300">
                                <KTIcon iconName="document" className="fs-5x text-gray-200 mb-5" />
                                <h3 className="fs-2 fw-bolder text-gray-400">Select a Template</h3>
                                <p className="text-gray-400 fs-6">Choose a template from the list on the left to begin configuring rules.</p>
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

