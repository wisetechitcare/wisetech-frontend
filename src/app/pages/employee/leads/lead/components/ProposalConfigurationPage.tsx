import React, { useState, useEffect } from "react";
import {
  Form,
  Button,
  Table,
  Card,
  Row,
  Col,
  Badge,
  Modal,
} from "react-bootstrap";
import {
  getProposalConfigurations,
  getAvailableExportFields,
  saveProposalConfiguration,
  deleteProposalConfiguration,
} from "@services/leads";
import { KTIcon } from "@metronic/helpers";
import { useNavigate } from "react-router-dom";
import { showSuccess, showError, showWarning } from "@utils/modal";
import PercentageConfigurationTable from "./PercentageConfigurationTable";
import MeetingConfigurationTable from "./MeetingConfigurationTable";

const ProposalConfigurationPage: React.FC = () => {
  const navigate = useNavigate();
  const [configurations, setConfigurations] = useState<any[]>([]);
  const [availableFields, setAvailableFields] = useState<any[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<any>(null);
  const [templateBase64, setTemplateBase64] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<"fields" | "rules">("fields");
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [configs, fields] = await Promise.all([
        getProposalConfigurations(),
        getAvailableExportFields(),
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
      templateCode: `TPL_${(configurations.length + 1).toString().padStart(2, "0")}`,
      templateFileName: "",
      completionYear: 0,
      completionMonth: 0,
      enabledFields: availableFields.map((f) => f.key),
      enabledSections: ["percentages", "meetings"],
      paymentBreakdown: [
        {
          config_type: "percentage",
          config_key: "Advance (To be paid along with the Work Order)",
          value: 0,
        },
        { config_type: "percentage", config_key: "Design Concept", value: 0 },
        { config_type: "percentage", config_key: "Design Detailing", value: 0 },
        { config_type: "percentage", config_key: "Tendering", value: 0 },
        {
          config_type: "percentage",
          config_key: "Procurement, Installation & Commissioning (Part-1)",
          value: 0,
        },
        {
          config_type: "percentage",
          config_key: "Procurement, Installation & Commissioning (Part-2)",
          value: 0,
        },
      ],
      rules: [],
      isActive: true,
    };
    setSelectedConfig(newTemplate);
    setTemplateBase64("");
    setActiveTab("fields");
  };

  const handleSelectTemplate = (tpl: any) => {
    const areaRules: any[] = [];
    const globalPaymentStages: any[] = [];
    const rulesMap = new Map<string, any>();

    if (tpl.rules && Array.isArray(tpl.rules)) {
      tpl.rules.forEach((r: any) => {
        const min = r.minArea !== undefined ? r.minArea : r.min_area;
        const max = r.maxArea !== undefined ? r.maxArea : r.max_area;
        const type = (r.configType || r.config_type || "").toLowerCase();
        const key = r.configKey || r.config_key;
        const val = r.value !== undefined ? r.value : r.config_value;

        const mappedRule = {
          id: r.id,
          config_type: type,
          config_key: key,
          configType: type,
          configKey: key,
          value: val,
          config_value: val,
        };

        // If it's a percentage (payment stage), it's ALWAYS global now
        if (
          type === "percentage" ||
          type === "payment" ||
          (Number(min) === -1 && Number(max) === -1)
        ) {
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
              configurations: [],
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
      rules: areaRules,
    });
    setTemplateBase64("");
    setActiveTab("fields");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedConfig) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = (event.target?.result as string).split(",")[1];
        setTemplateBase64(base64);
        setSelectedConfig({ ...selectedConfig, templateFileName: file.name });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!selectedConfig.id && !templateBase64) {
      showError(
        "Missing File",
        "Please upload a .docx template file before saving a new configuration.",
      );
      return;
    }

    // Validate percentages
    const total = (selectedConfig.paymentBreakdown || []).reduce(
      (sum: number, c: any) => sum + (parseFloat(c.value) || 0),
      0,
    );

    if (total !== 100 && (selectedConfig.paymentBreakdown || []).length > 0) {
      showWarning(
        "Invalid Rules",
        `The global payment breakdown percentages sum to ${total}%. They must sum to exactly 100%.`,
      );
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
          completionMonth: selectedConfig.completionMonth || 0,
        },
        // Area rules
        ...(selectedConfig.rules || []).map((r: any) => ({
          ...r,
          minArea: r.minArea ?? r.min_area,
          maxArea: r.maxArea ?? r.max_area,
          completionYear: r.completionYear ?? r.completion_year,
          completionMonth: r.completionMonth ?? r.completion_month,
        })),
      ];

      const result = await saveProposalConfiguration(
        { ...selectedConfig, rules: flattenedRules },
        templateBase64,
      );
      showSuccess("Success", "Proposal configuration saved successfully.");

      const [configs] = await Promise.all([
        getProposalConfigurations(),
        getAvailableExportFields().then((f) => {
          setAvailableFields(f);
          return f;
        }),
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
      showSuccess(
        "Deleted",
        "Template and all associated rules have been permanently removed.",
      );
      setSelectedConfig(null);
      fetchInitialData();
      setShowDeleteModal(false);
    } catch (err) {
      showError("Delete Failed", "Could not remove template.");
    } finally {
      setIsDeleting(false);
    }
  };

  const setGlobalPaymentStages = (updated: any[]) => {
    setSelectedConfig({ ...selectedConfig, paymentBreakdown: updated });
  };

  const setAreaRules = (ruleIdx: number, updatedConfigs: any[]) => {
    const updatedRules = [...selectedConfig.rules];
    updatedRules[ruleIdx].configurations = updatedConfigs;
    setSelectedConfig({ ...selectedConfig, rules: updatedRules });
  };

  const goBack = () => navigate("/qc/leads");

  return (
    <div
      className="d-flex flex-column flex-column-fluid"
      style={{ backgroundColor: "#F9FAFB", minHeight: "100vh" }}
    >
      {/* Header omitted for brevity, same as original */}
      <div
        className="bg-white border-bottom py-4 px-8 d-flex justify-content-between align-items-center shadow-sm sticky-top"
        style={{ zIndex: 100 }}
      >
        <div className="d-flex align-items-center">
          <Button
            variant="link"
            className="p-0 me-4 text-gray-600 text-hover-primary"
            onClick={goBack}
          >
            <KTIcon iconName="arrow-left" className="fs-1" />
          </Button>
          <div>
            <h1 className="fs-2 fw-bolder mb-0 text-dark">
              Proposal Template Builder
            </h1>
            <span className="text-muted fs-7 fw-bold">
              Design your export documents and fee rules
            </span>
          </div>
        </div>
        <div className="d-flex gap-3">
          {selectedConfig?.id && (
            <Button
              variant="light-danger"
              className="fw-bold"
              onClick={() => setShowDeleteModal(true)}
            >
              <KTIcon iconName="trash" className="fs-2 me-1" /> Delete Template
            </Button>
          )}
          <Button
            variant="light-primary"
            className="fw-bold"
            onClick={handleCreateNew}
          >
            <KTIcon iconName="plus" className="fs-2 me-1" /> New Template
          </Button>
          {selectedConfig && (
            <Button
              variant="primary"
              className="fw-bold shadow-sm"
              onClick={handleSave}
              disabled={isSaving}
            >
              <KTIcon iconName="save-2" className="fs-2 me-1" />{" "}
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          )}
        </div>
      </div>

      <div className="p-8">
        <Row className="g-8">
          <Col lg={3}>
            <Card className="border-0 shadow-sm rounded-4 h-100">
              <Card.Header className="border-0 pt-6">
                <h3 className="card-title fw-bolder text-dark">
                  Document Templates
                </h3>
              </Card.Header>
              <Card.Body className="px-4">
                <div className="d-flex flex-column gap-2">
                  {configurations.map((config, index) => (
                    <div
                      key={index}
                      onClick={() => handleSelectTemplate(config)}
                      className={`p-4 rounded-3 cursor-pointer transition-all ${selectedConfig?.id === config.id ? "bg-light-primary border border-primary" : "bg-hover-light border border-transparent"}`}
                    >
                      <div className="d-flex align-items-center">
                        <div className="symbol symbol-45px me-4">
                          <span
                            className={`symbol-label ${selectedConfig?.id === config.id ? "bg-primary text-white" : "bg-light-primary text-primary"}`}
                          >
                            <KTIcon iconName="document" className="fs-2" />
                          </span>
                        </div>
                        <div className="d-flex flex-column">
                          <span className="text-dark fw-bolder fs-6">
                            {config.templateName}
                          </span>
                          <span className="text-muted fw-bold fs-8">
                            {config.templateCode}
                          </span>
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
                      <Col md={3}>
                        <Form.Group>
                          <Form.Label className="fs-8 fw-bolder text-uppercase text-muted mb-2">
                            Template Name
                          </Form.Label>
                          <Form.Control
                            className="form-control-solid fw-bold"
                            value={selectedConfig.templateName}
                            onChange={(e) =>
                              setSelectedConfig({
                                ...selectedConfig,
                                templateName: e.target.value,
                              })
                            }
                          />
                        </Form.Group>
                      </Col>
                      <Col md={3}>
                        <Form.Group>
                          <Form.Label className="fs-8 fw-bolder text-uppercase text-muted mb-2">
                            Internal Code
                          </Form.Label>
                          <Form.Control
                            className="form-control-solid fw-bold"
                            value={selectedConfig.templateCode}
                            onChange={(e) =>
                              setSelectedConfig({
                                ...selectedConfig,
                                templateCode: e.target.value,
                              })
                            }
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="fs-8 fw-bolder text-uppercase text-muted mb-2">
                            {selectedConfig.id
                              ? "Change Word Template"
                              : "Add Word Template"}{" "}
                            (.docx)
                          </Form.Label>
                          <div className="d-flex align-items-center">
                            <Form.Control
                              type="file"
                              accept=".docx"
                              onChange={handleFileUpload}
                              className="form-control-solid"
                            />
                            {selectedConfig.templateFileName && (
                              <Badge
                                bg="light-success"
                                className="ms-3 text-success p-2 border border-success border-dashed"
                              >
                                {selectedConfig.templateFileName}
                              </Badge>
                            )}
                          </div>
                        </Form.Group>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>

                <div className="nav nav-tabs nav-line-tabs nav-stretch fs-6 border-0 bg-white rounded-top shadow-sm px-8 pt-4">
                  <li className="nav-item">
                    <a
                      className={`nav-link text-active-primary fw-bolder py-4 cursor-pointer ${activeTab === "fields" ? "active" : ""}`}
                      onClick={() => setActiveTab("fields")}
                    >
                      <KTIcon iconName="element-11" className="fs-2 me-2" />{" "}
                      Placeholder Fields Mapping
                    </a>
                  </li>
                  <li className="nav-item">
                    <a
                      className={`nav-link text-active-primary fw-bolder py-4 cursor-pointer ${activeTab === "rules" ? "active" : ""}`}
                      onClick={() => setActiveTab("rules")}
                    >
                      <KTIcon iconName="crown" className="fs-2 me-2" />{" "}
                      Area-Based Fee Rules
                    </a>
                  </li>
                </div>
                <Card className="border-0 shadow-sm rounded-bottom rounded-top-0">
                  <Card.Body className="p-8">
                    {activeTab === "fields" ? (
                      <div>
                        <div className="d-flex justify-content-between align-items-center mb-6">
                          <h5 className="fw-bolder mb-0">
                            Select fields to enable in this template:
                          </h5>
                          <Button
                            variant="light-primary"
                            size="sm"
                            className="fw-bold"
                            onClick={() => {
                              const allKeys = availableFields.map((f) => f.key);
                              const current =
                                selectedConfig.enabledFields || [];
                              const isAllSelected =
                                allKeys.length > 0 &&
                                allKeys.every((k) => current.includes(k));
                              setSelectedConfig({
                                ...selectedConfig,
                                enabledFields: isAllSelected ? [] : allKeys,
                              });
                            }}
                          >
                            <KTIcon
                              iconName={
                                availableFields.length > 0 &&
                                availableFields
                                  .map((f) => f.key)
                                  .every((k) =>
                                    (
                                      selectedConfig.enabledFields || []
                                    ).includes(k),
                                  )
                                  ? "cross-circle"
                                  : "check-circle"
                              }
                              className="fs-3 me-1"
                            />
                            {availableFields.length > 0 &&
                            availableFields
                              .map((f) => f.key)
                              .every((k) =>
                                (selectedConfig.enabledFields || []).includes(
                                  k,
                                ),
                              )
                              ? "Deselect All"
                              : "Select All"}
                          </Button>
                        </div>
                        <Row className="g-4">
                          {availableFields.map((field, idx) => (
                            <Col md={4} lg={3} key={idx}>
                              <div className="form-check form-check-custom form-check-solid">
                                <input
                                  className="form-check-input h-20px w-20px"
                                  type="checkbox"
                                  checked={selectedConfig.enabledFields?.includes(
                                    field.key,
                                  )}
                                  onChange={() => {
                                    const current =
                                      selectedConfig.enabledFields || [];
                                    const updated = current.includes(field.key)
                                      ? current.filter(
                                          (k: any) => k !== field.key,
                                        )
                                      : [...current, field.key];
                                    setSelectedConfig({
                                      ...selectedConfig,
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
                      <div className="d-flex flex-column gap-8">
                        {/* Global Payment Breakdown Section */}
                        <div className="border border-gray-200 rounded-4 p-8 bg-white shadow-sm border-dashed">
                          <PercentageConfigurationTable
                            percentages={selectedConfig.paymentBreakdown || []}
                            setPercentages={setGlobalPaymentStages}
                            title="Global Payment Breakdown"
                            description="These stages apply to ALL area ranges"
                          />
                        </div>

                        <div className="separator separator-dashed my-4"></div>

                        <div className="d-flex justify-content-between align-items-center">
                          <h4 className="fw-bolder mb-0 text-dark">
                            Area-Specific Meetings & Durations
                          </h4>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              const newGroup = {
                                min_area: 0,
                                max_area: 5000,
                                configurations: [
                                  {
                                    config_type: "meeting",
                                    config_key:
                                      "RCC Slab Checking for MEP up to Typical Floor",
                                    value: 0,
                                  },
                                  {
                                    config_type: "meeting",
                                    config_key:
                                      "RCC Slab Checking after Typical Floor",
                                    value: 0,
                                  },
                                  {
                                    config_type: "meeting",
                                    config_key: "Testing and Commissioning",
                                    value: 0,
                                  },
                                  {
                                    config_type: "meeting",
                                    config_key:
                                      "Installation Site Co-ordination",
                                    value: 0,
                                  },
                                  {
                                    config_type: "meeting",
                                    config_key: "Handover",
                                    value: 0,
                                  },
                                ],
                                completion_year: 0,
                                completion_month: 0,
                              };
                              setSelectedConfig({
                                ...selectedConfig,
                                rules: [
                                  ...(selectedConfig.rules || []),
                                  newGroup,
                                ],
                              });
                            }}
                          >
                            <KTIcon iconName="plus" className="fs-3 me-1" /> Add
                            Area Range
                          </Button>
                        </div>

                        <div className="d-flex flex-column gap-6">
                          {(selectedConfig.rules || []).map(
                            (rule: any, ruleIdx: number) => (
                              <div
                                key={ruleIdx}
                                className="border border-gray-200 rounded-4 p-6 bg-light-primary border-dashed position-relative"
                              >
                                <div
                                  className="position-absolute top-0 end-0 mt-4 me-4"
                                  style={{ zIndex: 10 }}
                                >
                                  <Button
                                    variant="light-danger"
                                    size="sm"
                                    onClick={() => {
                                      const updated = [...selectedConfig.rules];
                                      updated.splice(ruleIdx, 1);
                                      setSelectedConfig({
                                        ...selectedConfig,
                                        rules: updated,
                                      });
                                    }}
                                  >
                                    <KTIcon iconName="trash" className="fs-3" />
                                  </Button>
                                </div>

                                <Row className="align-items-center mb-6 pe-12">
                                  <Col md={2}>
                                    <Form.Group>
                                      <Form.Label className="fs-8 fw-bolder text-uppercase text-danger mb-1">
                                        Min Area (Sq Ft)
                                      </Form.Label>
                                      <Form.Control
                                        type="number"
                                        className="form-control-solid"
                                        value={
                                          rule.minArea !== undefined
                                            ? rule.minArea
                                            : rule.min_area
                                        }
                                        onChange={(e) => {
                                          const updated = [
                                            ...selectedConfig.rules,
                                          ];
                                          updated[ruleIdx].minArea =
                                            parseInt(e.target.value) || 0;
                                          updated[ruleIdx].min_area =
                                            updated[ruleIdx].minArea;
                                          setSelectedConfig({
                                            ...selectedConfig,
                                            rules: updated,
                                          });
                                        }}
                                      />
                                    </Form.Group>
                                  </Col>
                                  <Col md={2}>
                                    <Form.Group>
                                      <Form.Label className="fs-8 fw-bolder text-uppercase text-danger mb-1">
                                        Max Area (Sq Ft)
                                      </Form.Label>
                                      <Form.Control
                                        type="number"
                                        className="form-control-solid"
                                        value={
                                          rule.maxArea !== undefined
                                            ? rule.maxArea
                                            : rule.max_area
                                        }
                                        onChange={(e) => {
                                          const updated = [
                                            ...selectedConfig.rules,
                                          ];
                                          updated[ruleIdx].maxArea =
                                            parseInt(e.target.value) || 0;
                                          updated[ruleIdx].max_area =
                                            updated[ruleIdx].maxArea;
                                          setSelectedConfig({
                                            ...selectedConfig,
                                            rules: updated,
                                          });
                                        }}
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
                                        value={
                                          rule.completionYear ??
                                          rule.completion_year ??
                                          0
                                        }
                                        onChange={(e) => {
                                          const updated = [
                                            ...selectedConfig.rules,
                                          ];
                                          updated[ruleIdx].completionYear =
                                            parseInt(e.target.value) || 0;
                                          updated[ruleIdx].completion_year =
                                            updated[ruleIdx].completionYear;
                                          setSelectedConfig({
                                            ...selectedConfig,
                                            rules: updated,
                                          });
                                        }}
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
                                        value={
                                          rule.completionMonth ??
                                          rule.completion_month ??
                                          0
                                        }
                                        onChange={(e) => {
                                          const updated = [
                                            ...selectedConfig.rules,
                                          ];
                                          updated[ruleIdx].completionMonth =
                                            parseInt(e.target.value) || 0;
                                          updated[ruleIdx].completion_month =
                                            updated[ruleIdx].completionMonth;
                                          setSelectedConfig({
                                            ...selectedConfig,
                                            rules: updated,
                                          });
                                        }}
                                      />
                                    </Form.Group>
                                  </Col>
                                </Row>

                                <div className="bg-white rounded p-4 p-lg-6 shadow-sm">
                                  <MeetingConfigurationTable
                                    meetings={rule.configurations}
                                    setMeetings={(updatedConfigs) =>
                                      setAreaRules(ruleIdx, updatedConfigs)
                                    }
                                  />
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                        {(!selectedConfig.rules ||
                          selectedConfig.rules.length === 0) && (
                          <div className="text-center py-10 text-muted fs-6 border border-dashed rounded bg-white">
                            No area rules added yet. Click "Add Area Range" to
                            begin.
                          </div>
                        )}
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </div>
            ) : (
              <div className="d-flex flex-center h-100 min-h-500px flex-column bg-white rounded-4 shadow-sm border border-dashed border-gray-300">
                <KTIcon
                  iconName="document"
                  className="fs-5x text-gray-200 mb-5"
                />
                <h3 className="fs-2 fw-bolder text-gray-400">
                  Select a Template
                </h3>
                <p className="text-gray-400 fs-6">
                  Choose a template from the list on the left to begin
                  configuring rules.
                </p>
              </div>
            )}
          </Col>
        </Row>
      </div>

      <Modal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Permanently Delete Template?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-0 text-gray-700">
            Are you sure you want to delete{" "}
            <strong>{selectedConfig?.templateName}</strong>? This action will:
          </p>
          <ul className="mt-4 text-danger fw-bold">
            <li>Permanently remove the .docx file from AWS S3.</li>
            <li>Delete all associated Area Rules from the database.</li>
            <li>This action cannot be undone.</li>
          </ul>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="light"
            onClick={() => setShowDeleteModal(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? (
              <span className="spinner-border spinner-border-sm me-2" />
            ) : (
              <KTIcon iconName="trash" className="me-1" />
            )}
            Confirm Hard Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ProposalConfigurationPage;
