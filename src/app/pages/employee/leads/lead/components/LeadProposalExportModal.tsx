import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Row, Col, Badge, Table } from "react-bootstrap";
import { KTIcon } from "@metronic/helpers";
import { getProposalConfigurations } from "@services/leads";
import PercentageConfigurationTable from "./PercentageConfigurationTable";
import MeetingConfigurationTable from "./MeetingConfigurationTable";

interface LeadProposalExportModalProps {
  show: boolean;
  onHide: () => void;
  leadData: any;
  onExport: (type: "docx" | "pdf", data: any) => Promise<void>;
  isGenerating: boolean;
}

const LeadProposalExportModal: React.FC<LeadProposalExportModalProps> = ({
  show,
  onHide,
  leadData,
  onExport,
  isGenerating,
}) => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [formData, setFormData] = useState<any>({});
  const [rules, setRules] = useState<any[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [templateBase64, setTemplateBase64] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"fields" | "rules">("rules");
  const [availableFields, setAvailableFields] = useState<any[]>([]);

  useEffect(() => {
    const fetchTemplates = async () => {
      setIsLoading(true);
      try {
        const data = await getProposalConfigurations();
        setTemplates(data || []);
        if (data && data.length > 0) {
          handleTemplateChange(data[0].id, data);
        }
      } catch (error) {
        console.error("Error fetching templates:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (show) {
      fetchTemplates();
      const calculatedCommercialCost = (leadData.commercials || []).reduce(
        (sum: number, item: any) => sum + (parseFloat(item.cost) || 0),
        0,
      );
      const calculatedProjectAreaCost = (leadData.projectAreas || []).reduce(
        (sum: number, item: any) => sum + (parseFloat(item.cost) || 0),
        0,
      );
      const initialCost =
        leadData.totalAmount ||
        leadData.totalCost ||
        leadData.cost ||
        leadData.budget ||
        calculatedCommercialCost ||
        calculatedProjectAreaCost ||
        0;

      const primaryTeam = leadData.leadTeams?.[0];

      setFormData({
        project_name: leadData.title || leadData.projectName || "",
        client_company_name:
          primaryTeam?.company?.companyName ||
          leadData.company?.companyName ||
          leadData.company ||
          "",
        client_contact_name:
          primaryTeam?.contact?.fullName ||
          leadData.contact?.fullName ||
          leadData.contactPerson ||
          "",
        client_address_line_1: leadData.addresses?.[0]?.projectAddress || "",
        client_address_line_2: leadData.addresses?.[0]?.city || "",
        client_address_line_3: leadData.addresses?.[0]?.state || "",
        project_location: leadData.addresses?.[0]?.locality || "",
        project_type: leadData.leadCategories?.[0]?.category?.name || "",
        built_up_area:
          (leadData.commercials?.length > 0
            ? leadData.commercials.reduce(
                (sum: number, comm: any) => sum + (parseFloat(comm.area) || 0),
                0,
              )
            : leadData.builtUpArea ||
              leadData.additionalDetails?.builtUpArea ||
              leadData.additionalDetails?.projectArea ||
              leadData.project?.builtUpArea ||
              leadData.project?.projectArea ||
              leadData.projectArea ||
              leadData.plotArea ||
              "") || "",
        offer_number: leadData.prefix || leadData.id || "",
        offer_date: leadData.inquiryDate
          ? new Date(leadData.inquiryDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        validity_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        submitted_by: "WiseTech Consultant",
        company_name: "WiseTech Consultancy",
        company_address: "",
        authorized_person_name: "Authorized Signatory",
        remarks: leadData.description || "",
        additional_notes: leadData.notes || "",
        total_project_area:
          (leadData.commercials?.length > 0
            ? leadData.commercials.reduce(
                (sum: number, comm: any) => sum + (parseFloat(comm.area) || 0),
                0,
              )
            : leadData.builtUpArea ||
              leadData.additionalDetails?.builtUpArea ||
              leadData.additionalDetails?.projectArea ||
              "") || "",
        total_area:
          (leadData.commercials?.length > 0
            ? leadData.commercials.reduce(
                (sum: number, comm: any) => sum + (parseFloat(comm.area) || 0),
                0,
              )
            : leadData.builtUpArea ||
              leadData.additionalDetails?.builtUpArea ||
              leadData.additionalDetails?.projectArea ||
              "") || "",
        total_offer_cost: initialCost,
        // Alias so transformer finds it under both key names
        total_project_cost: initialCost,
        // Alias contact person under both key names
        client_contact_person: primaryTeam?.contact?.fullName || leadData.contact?.fullName || leadData.contactPerson || "",
        enabledFields: [],
      });
      setUploadedFile(null);
      setTemplateBase64("");
    }
  }, [show, leadData]);

  // Re-trigger rule matching when area changes
  useEffect(() => {
    if (selectedTemplateId && selectedTemplateId !== "custom") {
      const area = parseFloat(formData.built_up_area || formData.total_area || 0);
      if (area > 0) {
        handleTemplateChange(selectedTemplateId);
      }
    }
  }, [formData.built_up_area, formData.total_area]);

  useEffect(() => {
    setAvailableFields([
      { key: "project_name", label: "Project Name" },
      { key: "client_name", label: "Client Name" },
      { key: "total_offer_cost", label: "Total Cost" },
      { key: "built_up_area", label: "Built-up Area" },
      { key: "total_project_area", label: "Total Project Area" },
      { key: "total_area", label: "Total Area" },
      { key: "offer_date", label: "Offer Date" },
    ]);
  }, []);

  const [globalPaymentStages, setGlobalPaymentStages] = useState<any[]>([]);

  const handleTemplateChange = (
    templateId: string,
    currentTemplates?: any[],
  ) => {
    const tplList = currentTemplates || templates;
    setSelectedTemplateId(templateId);
    const template = tplList.find((tpl) => tpl.id === templateId);

    if (template) {
      const areaRules: any[] = [];
      const globalStages: any[] = [];
      const rulesMap = new Map<string, any>();

      if (template.rules && Array.isArray(template.rules)) {
        template.rules.forEach((r: any) => {
          const min = r.minArea !== undefined ? r.minArea : r.min_area;
          const max = r.maxArea !== undefined ? r.maxArea : r.max_area;
          const type = r.configType || r.config_type;

          if (type === 'percentage' || (Number(min) === -1 && Number(max) === -1)) {
            globalStages.push({
              ...r,
              configType: type,
              configKey: r.configKey || r.config_key,
              config_type: type,
              config_key: r.configKey || r.config_key,
            });
          } else {
            const key = `${min}-${max}`;
            if (!rulesMap.has(key)) {
              const newRuleGroup = {
                id: r.id,
                minArea: min,
                maxArea: max,
                completionYear: r.completionYear || r.completion_year || 0,
                completionMonth: r.completionMonth || r.completion_month || 0,
                configurations: [],
              };
              rulesMap.set(key, newRuleGroup);
              areaRules.push(newRuleGroup);
            }
            rulesMap.get(key).configurations.push({
              ...r,
              configType: type,
              configKey: r.configKey || r.config_key,
              config_type: type,
              config_key: r.configKey || r.config_key,
            });
          }
        });
      }

      setRules(areaRules);
      setGlobalPaymentStages(globalStages);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result?.toString().split(",")[1] || "";
        setTemplateBase64(base64);
        setSelectedTemplateId("custom");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    
    setFormData((prev: any) => {
        const updated = { ...prev, [name]: value };
        
        // Sync Area Aliases
        if (['built_up_area', 'total_project_area', 'total_area', 'project_area'].includes(name)) {
            updated.built_up_area = value;
            updated.total_project_area = value;
            updated.total_area = value;
            updated.project_area = value;
        }
        
        // Sync Cost Aliases
        if (['total_offer_cost', 'total_project_cost', 'cost', 'total_cost'].includes(name)) {
            updated.total_offer_cost = value;
            updated.total_project_cost = value;
            updated.cost = value;
            updated.total_cost = value;
        }
        
        // Sync Contact Aliases
        if (['client_contact_name', 'client_contact_person', 'contact_person', 'contact_name'].includes(name)) {
            updated.client_contact_name = value;
            updated.client_contact_person = value;
            updated.contact_person = value;
            updated.contact_name = value;
        }

        // Sync Company Aliases
        if (['client_company_name', 'company_name', 'client_name'].includes(name)) {
            updated.client_company_name = value;
            updated.company_name = value;
            updated.client_name = value;
        }

        return updated;
    });
  };

  const handleResetToDefault = () => {
    if (selectedTemplateId && selectedTemplateId !== "custom") {
      handleTemplateChange(selectedTemplateId);
    }
  };

  const handleRuleChange = (
    ruleIdx: number,
    field: "minArea" | "maxArea" | "completionYear" | "completionMonth",
    value: any,
  ) => {
    const updated = [...rules];
    updated[ruleIdx] = { ...updated[ruleIdx], [field]: value };
    setRules(updated);
  };

  const handleConfigChange = (
    ruleIdx: number,
    configIdx: number,
    field: string,
    value: any,
  ) => {
    const updated = [...rules];
    updated[ruleIdx].configurations[configIdx] = {
      ...updated[ruleIdx].configurations[configIdx],
      [field]: value,
    };
    setRules(updated);
  };

  const handleAddRule = () => {
    setRules([
      ...rules,
      { minArea: 0, maxArea: 0, completionYear: 0, completionMonth: 0, configurations: [] },
    ]);
  };

  const handleRemoveRule = (idx: number) => {
    setRules(rules.filter((_: any, i: number) => i !== idx));
  };

  const handleAddConfig = (ruleIdx: number, type: "percentage" | "meeting") => {
    const updated = [...rules];
    updated[ruleIdx].configurations.push({
      configType: type,
      configKey: type === "percentage" ? "New Stage" : "New Meeting",
      value: 0,
    });
    setRules(updated);
  };

  const handleRemoveConfig = (ruleIdx: number, configIdx: number) => {
    const updated = [...rules];
    updated[ruleIdx].configurations = updated[ruleIdx].configurations.filter(
      (_: any, i: number) => i !== configIdx,
    );
    setRules(updated);
  };

  const handleGenerate = (type: "docx" | "pdf") => {
    // Normalize global payment stages
    const normalizedGlobalStages = globalPaymentStages.map((c: any) => ({
      configType: c.configType || c.config_type || 'percentage',
      configKey:  c.configKey  || c.config_key  || '',
      value:      String(c.value || 0),
    }));

    // Normalize area rules
    const normalizedAreaRules = rules.map((rule: any) => ({
      minArea:         rule.minArea,
      maxArea:         rule.maxArea,
      completionYear:  rule.completionYear  || 0,
      completionMonth: rule.completionMonth || 0,
      configurations: (rule.configurations || []).map((c: any) => ({
        configType: c.configType || c.config_type || '',
        configKey:  c.configKey  || c.config_key  || '',
        value:      String(c.value || 0),
      })),
    }));

    const exportData = {
      ...formData,
      templateId: selectedTemplateId,
      templateBase64: templateBase64 || undefined,
      // Ensure total_project_cost is always set for the transformer
      total_project_cost: formData.total_project_cost || formData.total_offer_cost || 0,
      areaRules: [
        { minArea: -1, maxArea: -1, configurations: normalizedGlobalStages },
        ...normalizedAreaRules,
      ],
      enabledFields: formData.enabledFields || [],
    };
    console.log(`📤 [Modal Export] ${type.toUpperCase()} | Global: ${normalizedGlobalStages.length} | Area rules: ${normalizedAreaRules.length}`);
    onExport(type, exportData);
  };

  // Allow export if we have a template selected (or uploaded) regardless of area rules
  const canExport = (selectedTemplateId || templateBase64) && !isGenerating;
  const currentTemplate = templates.find((t) => t.id === selectedTemplateId);

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="xl"
      backdrop="static"
      className="proposal-export-modal"
    >
      <Modal.Header closeButton className="bg-white border-bottom-0 pt-8 px-10">
        <div>
          <Modal.Title className="fw-bolder fs-1 d-flex align-items-center">
            <img
              src="/media/icons/duotune/files/fil003.svg"
              className="me-3 h-30px"
              alt=""
            />
            Generate Proposal Document
          </Modal.Title>
          <div className="text-muted fs-7 fw-bold mt-1">
            Configure and export document for{" "}
            {leadData.title || leadData.projectName}
          </div>
        </div>
      </Modal.Header>

      <Modal.Body className="bg-light-light p-0">
        <Row className="g-0 h-100">
          <Col
            md={3}
            className="bg-white border-end p-8"
            style={{ minHeight: "700px" }}
          >
            <div className="mb-10">
              <h5 className="fw-bolder text-dark mb-6">Select Template</h5>
              <div className="d-flex flex-column gap-3">
                {templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    onClick={() => handleTemplateChange(tpl.id)}
                    className={`d-flex align-items-center p-4 rounded-3 cursor-pointer border-2 border ${selectedTemplateId === tpl.id ? "border-primary bg-light-primary" : "border-transparent bg-light"}`}
                  >
                    <div className="symbol symbol-40px me-3">
                      <div className="symbol-label bg-white shadow-sm">
                        <KTIcon
                          iconName="document"
                          className={`fs-2 ${selectedTemplateId === tpl.id ? "text-primary" : "text-gray-600"}`}
                        />
                      </div>
                    </div>
                    <div className="d-flex flex-column">
                      <span className="fw-bolder fs-6 text-gray-800">
                        {tpl.templateName}
                      </span>
                      <span className="fs-9 text-muted fw-bold">
                        {tpl.templateCode || "TPL_DEFAULT"}
                      </span>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="text-center py-4">
                    <span className="spinner-border spinner-border-sm text-primary"></span>
                  </div>
                )}
              </div>
            </div>
            <div className="separator separator-dashed mb-8"></div>
            <div>
              <h5 className="fw-bolder text-dark mb-4">Custom Template</h5>
              <Form.Group className="mb-0">
                <Form.Label className="fs-9 fw-bolder text-muted text-uppercase mb-2">
                  Word Template (.docx)
                </Form.Label>
                <Form.Control
                  size="sm"
                  type="file"
                  accept=".docx"
                  onChange={handleFileUpload}
                  className="form-control-solid fs-8"
                />
              </Form.Group>
            </div>
          </Col>

          <Col
            md={9}
            className="p-10"
            style={{ maxHeight: "80vh", overflowY: "auto" }}
          >
            <div className="d-flex flex-column gap-8">
              <div className="card border-0 shadow-sm rounded-4">
                <div className="card-body p-8">
                  <div className="d-flex align-items-center mb-8">
                    <div className="symbol symbol-40px bg-light-warning me-4">
                      <span className="symbol-label">
                        <KTIcon
                          iconName="notepad-edit"
                          className="fs-2 text-warning"
                        />
                      </span>
                    </div>
                    <h4 className="fw-bolder text-dark mb-0">
                      General Configuration
                    </h4>
                  </div>
                  <Row className="g-6">
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label className="fs-8 fw-bolder text-uppercase text-muted mb-2">
                          Active Template
                        </Form.Label>
                        <div className="fs-6 fw-bolder text-gray-800">
                          {currentTemplate?.templateName || "Custom"}
                        </div>
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label className="fs-8 fw-bolder text-uppercase text-muted mb-2">
                          Internal Code
                        </Form.Label>
                        <div className="fs-6 fw-bolder text-gray-800">
                          {currentTemplate?.templateCode || "-"}
                        </div>
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label className="fs-8 fw-bolder text-uppercase text-primary mb-2">
                          Standard Duration
                        </Form.Label>
                        <div className="fs-6 fw-bolder text-gray-800">
                          {currentTemplate?.completionYear
                            ? `${currentTemplate.completionYear}Y `
                            : ""}
                          {currentTemplate?.completionMonth
                            ? `${currentTemplate.completionMonth}M`
                            : currentTemplate?.completionYear
                              ? ""
                              : "-"}
                        </div>
                      </Form.Group>
                    </Col>
                  </Row>
                </div>
              </div>

              <div className="nav nav-tabs nav-line-tabs nav-stretch fs-6 border-0 bg-white rounded-top shadow-sm px-8 pt-4">
                <li className="nav-item">
                  <a
                    className={`nav-link text-active-primary fw-bolder py-4 cursor-pointer ${activeTab === "fields" ? "active" : ""}`}
                    onClick={() => setActiveTab("fields")}
                  >
                    <KTIcon iconName="element-11" className="fs-2 me-2" />{" "}
                    Placeholder Mapping
                  </a>
                </li>
                <li className="nav-item">
                  <a
                    className={`nav-link text-active-primary fw-bolder py-4 cursor-pointer ${activeTab === "rules" ? "active" : ""}`}
                    onClick={() => setActiveTab("rules")}
                  >
                    <KTIcon iconName="crown" className="fs-2 me-2" /> Area Rules
                  </a>
                </li>
              </div>

              <div className="card border-0 shadow-sm rounded-bottom rounded-top-0">
                <div className="card-body p-8">
                  {activeTab === "fields" ? (
                    <div>
                      <h6 className="fw-bolder mb-6 text-primary border-bottom pb-2">Project Information</h6>
                      <Row className="g-4 mb-8">
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="fs-8 fw-bolder text-uppercase mb-2 text-muted">Project Name</Form.Label>
                            <Form.Control className="form-control-solid" value={formData.project_name} name="project_name" onChange={handleInputChange} />
                          </Form.Group>
                        </Col>
                        <Col md={3}>
                          <Form.Group>
                            <Form.Label className="fs-8 fw-bolder text-uppercase mb-2 text-muted">Project Location</Form.Label>
                            <Form.Control className="form-control-solid" value={formData.project_location} name="project_location" onChange={handleInputChange} />
                          </Form.Group>
                        </Col>
                        <Col md={3}>
                          <Form.Group>
                            <Form.Label className="fs-8 fw-bolder text-uppercase mb-2 text-muted">Project Type</Form.Label>
                            <Form.Control className="form-control-solid" value={formData.project_type} name="project_type" onChange={handleInputChange} />
                          </Form.Group>
                        </Col>
                      </Row>

                      <h6 className="fw-bolder mb-6 text-primary border-bottom pb-2">Client Information</h6>
                      <Row className="g-4 mb-8">
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="fs-8 fw-bolder text-uppercase mb-2 text-muted">Client Company Name</Form.Label>
                            <Form.Control className="form-control-solid" value={formData.client_company_name} name="client_company_name" onChange={handleInputChange} />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="fs-8 fw-bolder text-uppercase mb-2 text-muted">Client Contact Name</Form.Label>
                            <Form.Control className="form-control-solid" value={formData.client_contact_name} name="client_contact_name" onChange={handleInputChange} />
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group>
                            <Form.Label className="fs-8 fw-bolder text-uppercase mb-2 text-muted">Address Line 1</Form.Label>
                            <Form.Control className="form-control-solid" value={formData.client_address_line_1} name="client_address_line_1" onChange={handleInputChange} />
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group>
                            <Form.Label className="fs-8 fw-bolder text-uppercase mb-2 text-muted">Address Line 2</Form.Label>
                            <Form.Control className="form-control-solid" value={formData.client_address_line_2} name="client_address_line_2" onChange={handleInputChange} />
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group>
                            <Form.Label className="fs-8 fw-bolder text-uppercase mb-2 text-muted">Address Line 3</Form.Label>
                            <Form.Control className="form-control-solid" value={formData.client_address_line_3} name="client_address_line_3" onChange={handleInputChange} />
                          </Form.Group>
                        </Col>
                      </Row>

                      <h6 className="fw-bolder mb-6 text-primary border-bottom pb-2">Proposal & Metrics</h6>
                      <Row className="g-4 mb-8">
                        <Col md={3}>
                          <Form.Group>
                            <Form.Label className="fs-8 fw-bolder text-uppercase mb-2 text-muted">Offer Number</Form.Label>
                            <Form.Control className="form-control-solid" value={formData.offer_number} name="offer_number" onChange={handleInputChange} />
                          </Form.Group>
                        </Col>
                        <Col md={3}>
                          <Form.Group>
                            <Form.Label className="fs-8 fw-bolder text-uppercase mb-2 text-muted">Offer Date</Form.Label>
                            <Form.Control className="form-control-solid" type="date" value={formData.offer_date} name="offer_date" onChange={handleInputChange} />
                          </Form.Group>
                        </Col>
                        <Col md={3}>
                          <Form.Group>
                            <Form.Label className="fs-8 fw-bolder text-uppercase mb-2 text-muted">Validity Date</Form.Label>
                            <Form.Control className="form-control-solid" type="date" value={formData.validity_date} name="validity_date" onChange={handleInputChange} />
                          </Form.Group>
                        </Col>
                        <Col md={3}>
                          <Form.Group>
                            <Form.Label className="fs-8 fw-bolder text-uppercase mb-2 text-muted">Built-up Area</Form.Label>
                            <Form.Control className="form-control-solid" value={formData.built_up_area} name="built_up_area" onChange={handleInputChange} />
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group>
                            <Form.Label className="fs-8 fw-bolder text-uppercase mb-2 text-muted">Total Offer Cost</Form.Label>
                            <Form.Control className="form-control-solid" type="number" value={formData.total_offer_cost} name="total_offer_cost" onChange={handleInputChange} />
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group>
                            <Form.Label className="fs-8 fw-bolder text-uppercase mb-2 text-muted">Submitted By</Form.Label>
                            <Form.Control className="form-control-solid" value={formData.submitted_by} name="submitted_by" onChange={handleInputChange} />
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group>
                            <Form.Label className="fs-8 fw-bolder text-uppercase mb-2 text-muted">Authorized Signatory</Form.Label>
                            <Form.Control className="form-control-solid" value={formData.authorized_person_name} name="authorized_person_name" onChange={handleInputChange} />
                          </Form.Group>
                        </Col>
                      </Row>

                      <div className="separator separator-dashed mb-8"></div>
                      <h6 className="fw-bolder mb-6">Enabled Placeholder Fields</h6>
                      <Row className="g-4">
                        {availableFields.map((field, idx) => (
                          <Col md={4} key={idx}>
                            <div className="form-check form-check-custom form-check-solid">
                              <input
                                className="form-check-input h-20px w-20px"
                                type="checkbox"
                                checked={formData.enabledFields?.includes(
                                  field.key,
                                )}
                                onChange={() => {
                                  const current = formData.enabledFields || [];
                                  const updated = current.includes(field.key)
                                    ? current.filter(
                                        (k: any) => k !== field.key,
                                      )
                                    : [...current, field.key];
                                  setFormData({
                                    ...formData,
                                    enabledFields: updated,
                                  });
                                }}
                              />
                              <label className="form-check-label fw-bold text-gray-700 ms-3">
                                {field.label}
                              </label>
                            </div>
                          </Col>
                        ))}
                      </Row>
                    </div>
                  ) : (
                    <div>
                      <div className="d-flex flex-column gap-8 mb-8">
                        {/* Global Payment Breakdown */}
                        <div className="border border-gray-200 rounded-4 p-8 bg-white shadow-sm border-dashed">
                          <div className="d-flex align-items-center gap-3 mb-6">
                            <div className="symbol symbol-35px bg-light-primary">
                              <span className="symbol-label">
                                <KTIcon
                                  iconName="percentage"
                                  className="fs-2 text-primary"
                                />
                              </span>
                            </div>
                            <div>
                              <h5 className="fw-bolder text-dark mb-0">
                                Global Payment Breakdown
                              </h5>
                              <span className="text-muted fs-8 fw-bold">Applies to all area ranges</span>
                            </div>
                          </div>
                          
                          <PercentageConfigurationTable
                            percentages={globalPaymentStages}
                            setPercentages={setGlobalPaymentStages}
                            totalCost={parseFloat(
                              formData.total_project_cost ||
                                formData.total_offer_cost ||
                                0,
                            )}
                          />
                        </div>

                        <div className="separator separator-dashed"></div>

                        <div className="d-flex justify-content-between align-items-center mb-0">
                          <h4 className="fw-bolder mb-0">Area-Specific Rules</h4>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={handleAddRule}
                          >
                            <KTIcon iconName="plus" className="fs-3 me-1" /> Add
                            New Area Range
                          </Button>
                        </div>
                      </div>
                      
                      <div className="d-flex flex-column gap-8">
                        {rules.map((rule, ruleIdx) => (
                          <div
                            key={ruleIdx}
                            className="border border-gray-200 rounded-4 p-8 bg-light-primary border-dashed position-relative"
                          >
                            <div className="position-absolute top-0 end-0 mt-4 me-4">
                              <Button
                                variant="light-danger"
                                size="sm"
                                className="btn-icon w-30px h-30px"
                                onClick={() => handleRemoveRule(ruleIdx)}
                              >
                                <KTIcon iconName="trash" className="fs-3" />
                              </Button>
                            </div>
                            <Row className="align-items-center mb-8 pe-12">
                              <Col md={2}>
                                <Form.Group>
                                  <Form.Label className="fs-8 fw-bolder text-uppercase text-danger mb-1">
                                    Min Area
                                  </Form.Label>
                                  <Form.Control
                                    type="number"
                                    className="form-control-solid"
                                    value={rule.minArea}
                                    onChange={(e) =>
                                      handleRuleChange(
                                        ruleIdx,
                                        "minArea",
                                        e.target.value,
                                      )
                                    }
                                  />
                                </Form.Group>
                              </Col>
                              <Col md={2}>
                                <Form.Group>
                                  <Form.Label className="fs-8 fw-bolder text-uppercase text-danger mb-1">
                                    Max Area
                                  </Form.Label>
                                  <Form.Control
                                    type="number"
                                    className="form-control-solid"
                                    value={rule.maxArea}
                                    onChange={(e) =>
                                      handleRuleChange(
                                        ruleIdx,
                                        "maxArea",
                                        e.target.value,
                                      )
                                    }
                                  />
                                </Form.Group>
                              </Col>
                              <Col md={2}>
                                <Form.Group>
                                  <Form.Label className="fs-8 fw-bolder text-uppercase text-primary mb-1">
                                    Duration (Y)
                                  </Form.Label>
                                  <Form.Control
                                    type="number"
                                    className="form-control-solid"
                                    value={rule.completionYear}
                                    onChange={(e) =>
                                      handleRuleChange(
                                        ruleIdx,
                                        "completionYear",
                                        e.target.value,
                                      )
                                    }
                                  />
                                </Form.Group>
                              </Col>
                              <Col md={2}>
                                <Form.Group>
                                  <Form.Label className="fs-8 fw-bolder text-uppercase text-primary mb-1">
                                    Duration (M)
                                  </Form.Label>
                                  <Form.Control
                                    type="number"
                                    className="form-control-solid"
                                    value={rule.completionMonth}
                                    onChange={(e) =>
                                      handleRuleChange(
                                        ruleIdx,
                                        "completionMonth",
                                        e.target.value,
                                      )
                                    }
                                  />
                                </Form.Group>
                              </Col>
                            </Row>
                            <div className="bg-white rounded-4 p-6 shadow-sm">
                              <div className="d-flex justify-content-between align-items-center mb-4">
                                <h6 className="fw-bolder mb-0">
                                  <KTIcon
                                    iconName="timer"
                                    className="text-warning me-2"
                                  />
                                  Meetings Configuration
                                </h6>
                                <Button
                                  variant="light-warning"
                                  size="sm"
                                  className="btn-icon w-25px h-25px"
                                  onClick={() =>
                                    handleAddConfig(ruleIdx, "meeting")
                                  }
                                >
                                  <KTIcon
                                    iconName="plus"
                                    className="fs-3"
                                  />
                                </Button>
                              </div>
                              <Table
                                borderless
                                className="align-middle gs-0 gy-3 mb-0"
                              >
                                <thead>
                                  <tr className="fw-bolder text-muted fs-8 text-uppercase border-bottom">
                                    <th className="ps-0">Meeting Type</th>
                                    <th className="min-w-80px">Count</th>
                                    <th className="text-end">Action</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {rule.configurations
                                    .filter(
                                      (c: any) =>
                                        (
                                          c.configType ||
                                          c.config_type ||
                                          ""
                                        ).toLowerCase() === "meeting",
                                    )
                                    .map((config: any, cIdx: number) => (
                                      <tr key={cIdx}>
                                        <td className="ps-0">
                                          <Form.Control
                                            size="sm"
                                            className="form-control-solid"
                                            value={
                                              config.configKey ||
                                              config.config_key
                                            }
                                            onChange={(e) =>
                                              handleConfigChange(
                                                ruleIdx,
                                                rule.configurations.indexOf(
                                                  config,
                                                ),
                                                "configKey",
                                                e.target.value,
                                              )
                                            }
                                          />
                                        </td>
                                        <td>
                                          <Form.Control
                                            size="sm"
                                            type="number"
                                            className="form-control-solid"
                                            value={config.value}
                                            onChange={(e) =>
                                              handleConfigChange(
                                                ruleIdx,
                                                rule.configurations.indexOf(
                                                  config,
                                                ),
                                                "value",
                                                e.target.value,
                                              )
                                            }
                                          />
                                        </td>
                                        <td className="text-end pe-0">
                                          <Button
                                            variant="light-danger"
                                            size="sm"
                                            className="btn-icon w-25px h-25px"
                                            onClick={() =>
                                              handleRemoveConfig(
                                                ruleIdx,
                                                rule.configurations.indexOf(
                                                  config,
                                                ),
                                              )
                                            }
                                          >
                                            <KTIcon
                                              iconName="trash"
                                              className="fs-4"
                                            />
                                          </Button>
                                        </td>
                                      </tr>
                                    ))}
                                </tbody>
                              </Table>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Col>
        </Row>
      </Modal.Body>
      <Modal.Footer className="bg-white border-top-0 pt-0 pb-10 px-10">
        <Button
          variant="light"
          onClick={onHide}
          disabled={isGenerating}
          className="fw-bolder px-8"
        >
          Cancel
        </Button>
        <div className="d-flex gap-3">
          <Button
            variant="primary"
            className="fw-bolder px-8"
            onClick={() => handleGenerate("docx")}
            disabled={!canExport}
          >
            {isGenerating ? (
              <span className="spinner-border spinner-border-sm me-2" />
            ) : (
              <i className="bi bi-file-earmark-word me-2 fs-4"></i>
            )}
            Generate DOCX
          </Button>
          <Button
            variant="danger"
            className="fw-bolder px-8"
            onClick={() => handleGenerate("pdf")}
            disabled={!canExport}
          >
            {isGenerating ? (
              <span className="spinner-border spinner-border-sm me-2" />
            ) : (
              <i className="bi bi-file-earmark-pdf me-2 fs-4"></i>
            )}
            Generate PDF
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
};

export default LeadProposalExportModal;
