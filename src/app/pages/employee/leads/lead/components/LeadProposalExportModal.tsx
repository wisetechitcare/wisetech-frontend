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
        built_up_area: leadData.builtUpArea || leadData.plotArea || "",
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
        total_offer_cost: initialCost,
        enabledFields: [],
      });
      setUploadedFile(null);
      setTemplateBase64("");
    }
  }, [show, leadData]);

  useEffect(() => {
    setAvailableFields([
      { key: "project_name", label: "Project Name" },
      { key: "client_name", label: "Client Name" },
      { key: "total_offer_cost", label: "Total Cost" },
      { key: "built_up_area", label: "Built-up Area" },
      { key: "offer_date", label: "Offer Date" },
    ]);
  }, []);

  const handleTemplateChange = (
    templateId: string,
    currentTemplates?: any[],
  ) => {
    const tplList = currentTemplates || templates;
    setSelectedTemplateId(templateId);
    const template = tplList.find((tpl) => tpl.id === templateId);

    if (template) {
      console.log("Wizard Area Rules (Before Grouping):", template.rules);

      // Group flat rules into area-based rule groups
      const groupedRules: any[] = [];
      const rulesMap = new Map<string, any>();

      if (template.rules && Array.isArray(template.rules)) {
        template.rules.forEach((r: any) => {
          const key = `${r.minArea}-${r.maxArea}`;
          if (!rulesMap.has(key)) {
            const newRuleGroup = {
              id: r.id,
              minArea: r.minArea,
              maxArea: r.maxArea,
              completionYear: r.completionYear || 0,
              completionMonth: r.completionMonth || 0,
              configurations: [],
            };
            rulesMap.set(key, newRuleGroup);
            groupedRules.push(newRuleGroup);
          }
          rulesMap.get(key).configurations.push({
            id: r.id,
            configType: r.configType,
            configKey: r.configKey,
            value: r.value,
          });
        });
      }

      console.log("Wizard Area Rules (Grouped):", groupedRules);
      setRules(groupedRules);
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
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
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
    const exportData = {
      ...leadData,
      ...formData,
      templateId: selectedTemplateId,
      templateBase64: templateBase64,
      areaRules: rules,
      enabledFields: formData.enabledFields || [],
    };
    console.log("Builder Area Rules:", rules);
    console.log("Wizard Area Rules:", currentTemplate?.rules);
    console.log("Export Payload Rules:", exportData.areaRules);
    onExport(type, exportData);
  };

  const canExport = (rules.length > 0 || templateBase64) && !isGenerating;
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
                      <Row className="g-4 mb-8">
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="fs-7 fw-bolder mb-2">
                              Project Name
                            </Form.Label>
                            <Form.Control
                              className="form-control-solid"
                              value={formData.project_name}
                              name="project_name"
                              onChange={handleInputChange}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="fs-7 fw-bolder mb-2">
                              Client Company
                            </Form.Label>
                            <Form.Control
                              className="form-control-solid"
                              value={formData.client_company_name}
                              name="client_company_name"
                              onChange={handleInputChange}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group>
                            <Form.Label className="fs-7 fw-bolder mb-2">
                              Built-up Area
                            </Form.Label>
                            <Form.Control
                              className="form-control-solid"
                              value={formData.built_up_area}
                              name="built_up_area"
                              onChange={handleInputChange}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group>
                            <Form.Label className="fs-7 fw-bolder mb-2">
                              Total Offer Cost
                            </Form.Label>
                            <Form.Control
                              className="form-control-solid"
                              type="number"
                              value={formData.total_offer_cost}
                              name="total_offer_cost"
                              onChange={handleInputChange}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group>
                            <Form.Label className="fs-7 fw-bolder mb-2">
                              Offer Date
                            </Form.Label>
                            <Form.Control
                              className="form-control-solid"
                              type="date"
                              value={formData.offer_date}
                              name="offer_date"
                              onChange={handleInputChange}
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                      <div className="separator separator-dashed mb-8"></div>
                      <h6 className="fw-bolder mb-6">
                        Enabled Placeholder Fields
                      </h6>
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
                      <div className="d-flex justify-content-between align-items-center mb-8">
                        <h4 className="fw-bolder mb-0">Project Area Rules</h4>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={handleAddRule}
                        >
                          <KTIcon iconName="plus" className="fs-3 me-1" /> Add
                          New Area Range
                        </Button>
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
                            <Row className="g-8">
                              <Col lg={7}>
                                <div className="bg-white rounded-4 p-6 shadow-sm h-100">
                                  <PercentageConfigurationTable
                                    percentages={rule.configurations.filter((c: any) => {
                                      const type = (c.configType || c.config_type || '').toLowerCase();
                                      return type === 'percentage' || type === 'payment';
                                    })}
                                    setPercentages={(newPerc) => {
                                      const updatedRules = [...rules];
                                      const otherConfigs = updatedRules[ruleIdx].configurations.filter((c: any) => {
                                        const type = (c.configType || c.config_key || '').toLowerCase();
                                        return type !== 'percentage' && type !== 'payment';
                                      });
                                      updatedRules[ruleIdx].configurations = [...newPerc, ...otherConfigs];
                                      setRules(updatedRules);
                                    }}
                                    totalCost={parseFloat(formData.total_project_cost || formData.total_offer_cost || 0)}
                                  />
                                </div>
                              </Col>
                              <Col lg={5}>
                                <div className="bg-white rounded-4 p-6 shadow-sm h-100">
                                  <div className="d-flex justify-content-between align-items-center mb-4">
                                    <h6 className="fw-bolder mb-0">
                                      <KTIcon
                                        iconName="timer"
                                        className="text-warning me-2"
                                      />
                                      Meetings & Durations
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
                                    className="align-middle gs-0 gy-3"
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
                              </Col>
                            </Row>
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
