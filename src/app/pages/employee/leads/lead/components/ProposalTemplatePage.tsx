import React, { useState, useEffect, useRef } from "react";
import { Modal, Button, Form, Row, Col, Badge } from "react-bootstrap";
import { KTIcon } from "@metronic/helpers";
import {
  getProposalConfigurations,
  getAvailableExportFields,
  exportLeadDocx,
  exportLeadPdf,
} from "@services/leads";
import PercentageConfigurationTable from "./PercentageConfigurationTable";
import MeetingConfigurationTable from "./MeetingConfigurationTable";
import { showError } from "@utils/modal";
import dayjs from "dayjs";

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
  projectData,
}) => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [currentConfig, setCurrentConfig] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [rules, setRules] = useState<any[]>([]);
  const [templateBase64, setTemplateBase64] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [availableFields, setAvailableFields] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"fields" | "rules">("fields");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchDefinitions = async () => {
      try {
        const [configs, fields] = await Promise.all([
          getProposalConfigurations(),
          getAvailableExportFields(),
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

    const details =
      leadData?.additionalDetails ||
      projectData?.additionalDetails ||
      leadData?.project?.additionalDetails ||
      {};

    const company =
      companyData?.company ||
      companyData?.data?.company ||
      companyData ||
      leadData?.company ||
      leadData?.leadTeams?.[0]?.company ||
      {};
    const contact =
      contactData?.contact ||
      contactData?.data?.contact ||
      contactData ||
      leadData?.contact ||
      leadData?.leadTeams?.[0]?.contact ||
      {};

    const commercial =
      leadData?.commercials ||
      projectData?.commercials ||
      leadData?.project?.commercials ||
      [];
    const totalCost = commercial.reduce(
      (sum: number, c: any) => sum + (parseFloat(c.cost) || 0),
      0,
    );

    const joinNames = (arr: any[]) => {
      if (!arr || !Array.isArray(arr)) return "";
      return arr
        .map((i) => {
          const val =
            i?.name ||
            i?.service?.name ||
            i?.category?.name ||
            i?.subCategory?.name ||
            i?.subcategory?.name;
          return typeof val === "string"
            ? val
            : typeof val === "number"
              ? String(val)
              : "";
        })
        .filter(Boolean)
        .join(", ");
    };

    const initialData: any = {};
    availableFields.forEach((f: any) => {
      let val = leadData[f.key];
      if (!val || typeof val === "object") {
        switch (f.key) {
          case "inquiry_no":
            val = leadData.inquiryNo || leadData.prefix || "";
            break;
          case "reference_no":
            val = leadData.referenceNo || leadData.prefix || leadData.id || "";
            break;
          case "revision_no":
            val = leadData.revisionNo || leadData.revisionCount || "0";
            break;
          case "lead_name":
            val = leadData.name || leadData.title || "";
            break;
          case "lead_status":
            val =
              leadData.leadStatus?.name ||
              leadData.status?.name ||
              leadData.status ||
              "";
            break;
          case "status":
            val =
              leadData.leadStatus?.name ||
              leadData.status?.name ||
              leadData.status ||
              "";
            break;
          case "lead_summary":
            val =
              leadData.summary || leadData.description || leadData.notes || "";
            break;
          case "created_by":
            val =
              leadData.createdBy?.name ||
              (leadData.createdBy?.users
                ? `${leadData.createdBy.users.firstName} ${leadData.createdBy.users.lastName || ""}`
                : "");
            break;
          case "our_company_name":
            val = "WiseTech Consultancy";
            break;
          case "sender_company_name":
            val = leadData.senderCompany?.name || "WiseTech Consultancy";
            break;
          case "client_company_name":
            val =
              company.name ||
              company.companyName ||
              leadData.clientCompany?.name ||
              "";
            break;
          case "client_name":
            val =
              company.name ||
              company.companyName ||
              leadData.clientCompany?.name ||
              "";
            break;
          case "company_name":
            val =
              company.name ||
              company.companyName ||
              leadData.clientCompany?.name ||
              "";
            break;
          case "client_contact_person":
            val =
              contact.name ||
              contact.fullName ||
              leadData.clientContactPerson ||
              "";
            break;
          case "contact_person":
            val =
              contact.name ||
              contact.fullName ||
              leadData.clientContactPerson ||
              "";
            break;
          case "contact_name":
            val =
              contact.name ||
              contact.fullName ||
              leadData.clientContactPerson ||
              "";
            break;
          case "client_address_line_1":
            val = details.projectAddress || company.address || "";
            break;
          case "client_address_line_2":
            val = details.city || company.city || "";
            break;
          case "client_address_line_3":
            val = details.state || company.state || "";
            break;
          case "sender_company":
            val = leadData.senderCompany?.name || "WiseTech Consultancy";
            break;
          case "project_name":
            val = leadData.projectName || leadData.title || "";
            break;
          case "project_location":
            val = details.locality || details.city || "";
            break;
          case "project_type":
            val =
              leadData.services?.[0]?.service?.name ||
              leadData.leadCategories?.[0]?.category?.name ||
              leadData.projectType ||
              "";
            break;
          case "plot_area":
            val = details.plotArea || "0";
            break;
          case "plot_area_unit":
            val = details.plotAreaUnit || "sqft";
            break;
          case "built_up_area":
            val =
              (leadData.commercials?.length > 0
                ? leadData.commercials.reduce(
                    (sum: number, comm: any) =>
                      sum + (parseFloat(comm.area) || 0),
                    0,
                  )
                : details.builtUpArea || details.projectArea || "0") || "0";
            break;
          case "built_up_area_unit":
            val = details.builtUpAreaUnit || "sqft";
            break;
          case "building_detail":
            val = details.buildingDetail || "";
            break;
          case "total_project_cost":
            val = totalCost;
            break;
          case "services":
            val = joinNames(leadData.services);
            break;
          case "categories":
            val = joinNames(leadData.leadCategories);
            break;
          case "sub_categories":
            val = joinNames(leadData.leadSubCategories);
            break;
          case "service_1":
            val = leadData.services?.[0]?.service?.name || "";
            break;
          case "service_2":
            val = leadData.services?.[1]?.service?.name || "";
            break;
          case "service_3":
            val = leadData.services?.[2]?.service?.name || "";
            break;
          case "category_1":
            val = leadData.leadCategories?.[0]?.category?.name || "";
            break;
          case "category_2":
            val = leadData.leadCategories?.[1]?.category?.name || "";
            break;
          case "category_3":
            val = leadData.leadCategories?.[2]?.category?.name || "";
            break;
          case "sub_category_1":
            val = leadData.leadSubCategories?.[0]?.subcategory?.name || "";
            break;
          case "sub_category_2":
            val = leadData.leadSubCategories?.[1]?.subcategory?.name || "";
            break;
          case "sub_category_3":
            val = leadData.leadSubCategories?.[2]?.subcategory?.name || "";
            break;
          case "sub_category_4":
            val = leadData.leadSubCategories?.[3]?.subcategory?.name || "";
            break;
          case "sub_category_5":
            val = leadData.leadSubCategories?.[4]?.subcategory?.name || "";
            break;
          case "sub_categories_1":
            val = leadData.leadSubCategories?.[0]?.subcategory?.name || "";
            break;
          case "sub_categories_2":
            val = leadData.leadSubCategories?.[1]?.subcategory?.name || "";
            break;
          case "sub_categories_3":
            val = leadData.leadSubCategories?.[2]?.subcategory?.name || "";
            break;
          case "sub_categories_4":
            val = leadData.leadSubCategories?.[3]?.subcategory?.name || "";
            break;
          case "sub_categories_5":
            val = leadData.leadSubCategories?.[4]?.subcategory?.name || "";
            break;
          case "city":
            val = details.city || "";
            break;
          case "state":
            val = details.state || "";
            break;
          case "country":
            val = details.country || "";
            break;
          case "zip_code":
            val = details.zipCode || "";
            break;
          case "project_full_address":
            val = details.projectAddress || "";
            break;
          case "project_address":
            val = details.projectAddress || "";
            break;
          case "total_project_area":
            val =
              (leadData.commercials?.length > 0
                ? leadData.commercials.reduce(
                    (sum: number, comm: any) =>
                      sum + (parseFloat(comm.area) || 0),
                    0,
                  )
                : details.builtUpArea || details.projectArea || "0") || "0";
            break;
          case "total_commercial_area":
            val =
              leadData.commercials?.reduce(
                (s: number, c: any) => s + (parseFloat(c.area) || 0),
                0,
              ) || "0";
            break;
          case "total_area":
            val =
              leadData.commercials?.reduce(
                (s: number, c: any) => s + (parseFloat(c.area) || 0),
                0,
              ) ||
              details.builtUpArea ||
              details.projectArea ||
              "0";
            break;
          case "locality":
            val = details.locality || "";
            break;
          case "formatted_date":
            val = dayjs().format("DD MMM, YYYY");
            break;
          case "template_name":
            val = currentConfig?.templateName || "";
            break;
          case "date":
            val = dayjs().format("DD/MM/YYYY");
            break;
          case "inquiry_date":
            val = leadData.inquiryDate
              ? dayjs(leadData.inquiryDate).format("DD MMM, YYYY")
              : "";
            break;
          case "commercial_1_label":
            val = commercial[0]?.label || "";
            break;
          case "commercial_1_area":
            val = commercial[0]?.area || "";
            break;
          case "commercial_1_cost_type":
            val = commercial[0]?.costType || "";
            break;
          case "commercial_1_rate":
            val = commercial[0]?.rate || "";
            break;
          case "commercial_1_cost":
            val = commercial[0]?.cost || "";
            break;
          case "commercial_2_label":
            val = commercial[1]?.label || "";
            break;
          case "commercial_2_area":
            val = commercial[1]?.area || "";
            break;
          case "commercial_2_cost_type":
            val = commercial[1]?.costType || "";
            break;
          case "commercial_2_rate":
            val = commercial[1]?.rate || "";
            break;
          case "commercial_2_cost":
            val = commercial[1]?.cost || "";
            break;
          case "project_area_1_label":
            val = commercial[0]?.label || "";
            break;
          case "project_area_1_area":
            val = commercial[0]?.area || "";
            break;
          case "project_area_1_cost_type":
            val = commercial[0]?.costType || "";
            break;
          case "project_area_1_rate":
            val = commercial[0]?.rate || "";
            break;
          case "project_area_1_cost":
            val = commercial[0]?.cost || "";
            break;
          default:
            val = typeof val === "object" ? "" : val || "";
        }
      }
      initialData[f.key] = val || "";
    });

    // Add alias keys so transformer can find them under both names
    initialData.total_offer_cost    = initialData.total_project_cost || totalCost || 0;
    initialData.client_contact_person = initialData.contact_person || initialData.client_contact_name || (contact.name || contact.fullName || '');

    setFormData(initialData);
    setSelectedTemplateId("");
    setCurrentConfig(null);
    setRules([]);
    setTemplateBase64("");
    setActiveTab("fields");
  }, [show, leadData, availableFields]);

  const [globalPaymentStages, setGlobalPaymentStages] = useState<any[]>([]);

  const handleTemplateChange = async (templateId: string) => {
    if (!templateId) {
      setSelectedTemplateId("");
      setCurrentConfig(null);
      setRules([]);
      setGlobalPaymentStages([]);
      return;
    }

    setSelectedTemplateId(templateId);
    const config = templates.find((t) => t.id === templateId);
    setCurrentConfig(config);

    if (config) {
      try {
        // Group rules by area range
        const areaRules: any[] = [];
        const globalStages: any[] = [];
        const rulesMap = new Map<string, any>();
        
        (config.rules || []).forEach((r: any) => {
          const min = r.minArea !== undefined ? r.minArea : r.min_area;
          const max = r.maxArea !== undefined ? r.maxArea : r.max_area;

          if (Number(min) === -1 && Number(max) === -1) {
            globalStages.push({
              ...r,
              config_type: r.configType || r.config_type,
              config_key: r.configKey || r.config_key,
            });
          } else {
            const key = `${min}-${max}`;
            if (!rulesMap.has(key)) {
              const newGroup = {
                minArea: min,
                maxArea: max,
                completionYear: r.completionYear || r.completion_year || 0,
                completionMonth: r.completionMonth || r.completion_month || 0,
                configurations: [],
              };
              rulesMap.set(key, newGroup);
              areaRules.push(newGroup);
            }
            rulesMap.get(key).configurations.push({
              ...r,
              config_type: r.configType || r.config_type,
              config_key: r.configKey || r.config_key,
            });
          }
        });

        setRules(areaRules);
        setGlobalPaymentStages(globalStages);

        // Update formData with ALL rules for mapping
        setFormData((prev: any) => {
          const updated = { ...prev };
          updated.completion_years = config.completionYear || 0;
          updated.completion_months = config.completionMonth || 0;

          // Clear old indexed keys
          Object.keys(updated).forEach((key) => {
            if (
              key.startsWith("stage_") ||
              key.startsWith("meeting_") ||
              key.startsWith("rule_")
            ) {
              delete updated[key];
            }
          });

          // 1. Map Global Stages
          globalStages.forEach((c: any, sIdx: number) => {
            const num = sIdx + 1;
            updated[`stage_${num}_name`] = c.config_key || `Stage ${num}`;
            updated[`stage_${num}_value`] = c.value || 0;
          });

          // 2. Map Area Rules
          areaRules.forEach((rule, ruleIdx) => {
            const ruleNum = ruleIdx + 1;
            let sIdx = 1; // For rule-specific stage mapping if needed
            let mIdx = 1;
            rule.configurations.forEach((c: any) => {
              const type = (c.config_type || "").toLowerCase();
              const key = c.config_key;
              if (type === "percentage" || type === "payment") {
                updated[`rule_${ruleNum}_stage_${sIdx}_name`] = key || `Stage ${sIdx}`;
                updated[`rule_${ruleNum}_stage_${sIdx}_value`] = c.value || 0;
                sIdx++;
              } else if (type === "meeting") {
                updated[`rule_${ruleNum}_meeting_${mIdx}_name`] = key || `Meeting ${mIdx}`;
                updated[`rule_${ruleNum}_meeting_${mIdx}_value`] = c.value || 0;
                mIdx++;
              }
            });
          });

          // 3. Match generic meeting placeholders to best area rule
          const area = parseFloat(formData.total_project_area || formData.built_up_area) || 0;
          const bestRule =
            areaRules.find(
              (r) => area >= Number(r.minArea) && area <= Number(r.maxArea),
            ) || areaRules[0];

          if (bestRule) {
            let mIdx = 1;
            bestRule.configurations.forEach((c: any) => {
              const type = (c.config_type || "").toLowerCase();
              const key = c.config_key;
              if (type === "meeting") {
                updated[`meeting_${mIdx}_name`] = key || `Meeting ${mIdx}`;
                updated[`meeting_${mIdx}_value`] = c.value || 0;
                mIdx++;
              }
            });
          }

          return updated;
        });
      } catch (err) {
        console.error("Failed to load rules", err);
      }
    }
  };

  const handleRuleAreaChange = (
    ruleIdx: number,
    field: "minArea" | "maxArea" | "completionYear" | "completionMonth",
    value: any,
  ) => {
    const updatedRules = [...rules];
    updatedRules[ruleIdx][field] = value;
    setRules(updatedRules);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = (event.target?.result as string).split(",")[1];
        setTemplateBase64(base64);
        // If no template selected and no rules, add a default rule
        if (!selectedTemplateId && rules.length === 0) {
          setRules([{ minArea: 0, maxArea: 100000, configurations: [] }]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddRule = () => {
    setRules([
      ...rules,
      {
        minArea: 0,
        maxArea: 0,
        completionYear: 0,
        completionMonth: 0,
        configurations: [],
      },
    ]);
  };

  const handleRemoveRule = (idx: number) => {
    setRules(rules.filter((_, i) => i !== idx));
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
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

  const handleExport = async (type: "docx" | "pdf") => {
    if (!selectedTemplateId && !templateBase64) return;

    setIsGenerating(true);
    try {
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
        templateId: selectedTemplateId,
        ...formData,
        // Ensure total_project_cost is always present (transformer priority check)
        total_project_cost: formData.total_project_cost || formData.total_offer_cost || 0,
        areaRules: [
          { minArea: -1, maxArea: -1, configurations: normalizedGlobalStages },
          ...normalizedAreaRules,
        ],
        customTemplate: templateBase64 || undefined,
      };
      console.log(`📤 [Export] ${type.toUpperCase()} | Global stages: ${normalizedGlobalStages.length} | Area rules: ${normalizedAreaRules.length}`);

      const response =
        type === "docx"
          ? await exportLeadDocx(leadData.id, exportData)
          : await exportLeadPdf(leadData.id, exportData);

      const blob = new Blob([response], {
        type:
          type === "docx"
            ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            : "application/pdf",
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `${formData.project_name || "Proposal"}.${type}`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error(`Error exporting ${type}:`, error);
      let errorMessage = `Failed to generate ${type}. Please check template and rules.`;
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

  const canExport = (selectedTemplateId || templateBase64) && !isGenerating;

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
            <span className="fs-2 fw-bolder text-dark">
              Generate Proposal Document
            </span>
            <span className="text-muted fs-7 fw-bold">
              Configure and export document for {leadData?.title}
            </span>
          </div>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-0 bg-light">
        <Row className="g-0 h-100">
          <Col
            lg={3}
            className="bg-white border-end p-8 scroll-y"
            style={{ height: "75vh" }}
          >
            <h5 className="fw-bolder text-dark mb-6">Select Template</h5>
            <div className="d-flex flex-column gap-2">
              {templates.map((tpl: any) => (
                <div
                  key={tpl.id}
                  onClick={() => handleTemplateChange(tpl.id)}
                  className={`p-4 rounded-3 cursor-pointer transition-all ${selectedTemplateId === tpl.id ? "bg-light-primary border border-primary" : "bg-hover-light border border-transparent"}`}
                >
                  <div className="d-flex align-items-center">
                    <div className="symbol symbol-40px me-3">
                      <span
                        className={`symbol-label ${selectedTemplateId === tpl.id ? "bg-primary text-white" : "bg-light-primary text-primary"}`}
                      >
                        <KTIcon iconName="document" className="fs-2" />
                      </span>
                    </div>
                    <div className="d-flex flex-column">
                      <span className="text-dark fw-bolder fs-7">
                        {tpl.templateName}
                      </span>
                      <span className="text-muted fw-bold fs-9">
                        {tpl.templateCode}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="separator border-gray-200 my-8"></div>
            <h5 className="fw-bolder text-dark mb-4">Custom Template</h5>
            <Form.Group>
              <Form.Label className="fs-9 fw-bolder text-uppercase text-muted mb-2">
                Word Template (.docx)
              </Form.Label>
              <Form.Control
                type="file"
                accept=".docx"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="form-control-solid form-control-sm"
              />
              {templateBase64 && (
                <Badge bg="light-success" className="text-success mt-2 w-100">
                  File Uploaded
                </Badge>
              )}
            </Form.Group>
          </Col>

          <Col
            lg={9}
            md={8}
            className="p-4 p-lg-10 scroll-y"
            style={{ height: "75vh" }}
          >
            {currentConfig || templateBase64 ? (
              <div className="d-flex flex-column gap-6 gap-lg-8">
                <div className="card border-0 shadow-sm rounded-4">
                  <div className="card-body p-6 p-lg-8">
                    <div className="d-flex align-items-center mb-6">
                      <div className="symbol symbol-35px symbol-lg-40px bg-light-warning me-4">
                        <span className="symbol-label">
                          <KTIcon
                            iconName="notepad-edit"
                            className="fs-2 text-warning"
                          />
                        </span>
                      </div>
                      <h4 className="fw-bolder text-dark mb-0 fs-5 fs-lg-4">
                        General Configuration
                      </h4>
                    </div>
                    <Row className="g-4 g-lg-6">
                      <Col sm={6} md={6}>
                        <div className="fs-9 fs-lg-8 fw-bolder text-uppercase text-muted mb-1">
                          Active Template
                        </div>
                        <div className="fw-bold fs-7 fs-lg-6 text-dark text-truncate">
                          {currentConfig?.templateName || "Custom Upload"}
                        </div>
                      </Col>

                      <Col xs={6} md={6}>
                        <div className="fs-9 fs-lg-8 fw-bolder text-uppercase text-muted mb-1">
                          Internal Code
                        </div>
                        <div className="fw-bold fs-7 fs-lg-6 text-dark">
                          {currentConfig?.templateCode || "TEMP_FILE"}
                        </div>
                      </Col>
                    </Row>
                  </div>
                </div>

                <div className="nav nav-tabs nav-line-tabs nav-stretch fs-6 border-0 bg-white rounded-top shadow-sm px-6 px-lg-8 pt-4 overflow-auto flex-nowrap">
                  <li className="nav-item">
                    <a
                      className={`nav-link text-active-primary fw-bolder py-4 cursor-pointer text-nowrap ${activeTab === "fields" ? "active" : ""}`}
                      onClick={() => setActiveTab("fields")}
                    >
                      <KTIcon iconName="element-11" className="fs-2 me-2" />{" "}
                      Placeholder Mapping
                    </a>
                  </li>
                  <li className="nav-item">
                    <a
                      className={`nav-link text-active-primary fw-bolder py-4 cursor-pointer text-nowrap ${activeTab === "rules" ? "active" : ""}`}
                      onClick={() => setActiveTab("rules")}
                    >
                      <KTIcon iconName="crown" className="fs-2 me-2" /> Area
                      Rules
                    </a>
                  </li>
                </div>

                <div className="card border-0 shadow-sm rounded-bottom rounded-top-0">
                  <div className="card-body p-6 p-lg-8">
                    {activeTab === "fields" ? (
                      <Row className="g-4 g-lg-6">
                        {availableFields
                          .filter(
                            (f) =>
                              // Show all fields if:
                              // 1. No template selected (currentConfig null)
                              // 2. Template has no enabledFields (null/undefined/empty array) - show all
                              // 3. Template's enabledFields explicitly includes this field
                              !currentConfig ||
                              !currentConfig.enabledFields?.length ||
                              currentConfig.enabledFields?.includes(f.key),
                          )
                          .map((field, index) => (
                            <Col sm={6} xl={4} key={index}>
                              <Form.Group>
                                <Form.Label className="fs-9 fw-bolder text-uppercase text-muted mb-1">
                                  {field.label}
                                </Form.Label>
                                <Form.Control
                                  size="sm"
                                  className="form-control-solid fw-bold"
                                  type={
                                    field.key === "inquiry_date" ||
                                    field.key === "date" ||
                                    field.key === "offer_date" ||
                                    field.key === "validity_date"
                                      ? "date"
                                      : "text"
                                  }
                                  name={field.key}
                                  value={formData[field.key] || ""}
                                  onChange={handleInputChange}
                                />
                              </Form.Group>
                            </Col>
                          ))}
                      </Row>
                    ) : (
                      <div className="d-flex flex-column gap-8">
                        {/* Global Payment Breakdown */}
                        <div className="border border-gray-200 rounded-4 p-4 p-lg-8 bg-white shadow-sm border-dashed">
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

                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <h4 className="fw-bolder text-dark mb-0">
                            Area-Specific Rules
                          </h4>
                          <Button
                            variant="light-primary"
                            size="sm"
                            onClick={handleAddRule}
                          >
                            <KTIcon iconName="plus" className="fs-3 me-1" /> Add
                            Range
                          </Button>
                        </div>
                        {rules.map((rule, ruleIdx) => (
                          <div
                            key={ruleIdx}
                            className="border border-gray-200 rounded-4 p-4 p-lg-8 bg-light-primary border-dashed position-relative"
                          >
                            <div className="position-absolute top-0 end-0 mt-4 me-4">
                              <Button
                                variant="icon"
                                className="btn btn-icon btn-light-danger btn-sm"
                                onClick={() => handleRemoveRule(ruleIdx)}
                              >
                                <KTIcon iconName="trash" className="fs-4" />
                              </Button>
                            </div>
                            <div className="d-flex align-items-center gap-3 mb-6 pe-10">
                              <div className="symbol symbol-35px bg-light-danger">
                                <span className="symbol-label">
                                  <KTIcon
                                    iconName="abstract-26"
                                    className="fs-2 text-danger"
                                  />
                                </span>
                              </div>
                              <div className="flex-grow-1">
                                <h5 className="fw-bolder text-dark mb-2">
                                  Rule Range {ruleIdx + 1}
                                </h5>
                                <div className="d-flex align-items-center gap-4">
                                  <div className="d-flex align-items-center gap-2">
                                    <span className="text-muted fs-8 fw-bold text-uppercase">
                                      Min:
                                    </span>
                                    <Form.Control
                                      type="number"
                                      size="sm"
                                      className="form-control-solid w-70px"
                                      value={rule.minArea}
                                      onChange={(e) =>
                                        handleRuleAreaChange(
                                          ruleIdx,
                                          "minArea",
                                          e.target.value,
                                        )
                                      }
                                    />
                                  </div>
                                  <div className="d-flex align-items-center gap-2">
                                    <span className="text-muted fs-8 fw-bold text-uppercase">
                                      Max:
                                    </span>
                                    <Form.Control
                                      type="number"
                                      size="sm"
                                      className="form-control-solid w-70px"
                                      value={rule.maxArea}
                                      onChange={(e) =>
                                        handleRuleAreaChange(
                                          ruleIdx,
                                          "maxArea",
                                          e.target.value,
                                        )
                                      }
                                    />
                                  </div>
                                  <div className="d-flex align-items-center gap-2 border-start ps-4">
                                    <span className="text-muted fs-8 fw-bold text-uppercase">
                                      Years:
                                    </span>
                                    <Form.Control
                                      type="number"
                                      size="sm"
                                      className="form-control-solid w-60px"
                                      value={rule.completionYear}
                                      onChange={(e) =>
                                        handleRuleAreaChange(
                                          ruleIdx,
                                          "completionYear",
                                          e.target.value,
                                        )
                                      }
                                    />
                                  </div>
                                  <div className="d-flex align-items-center gap-2">
                                    <span className="text-muted fs-8 fw-bold text-uppercase">
                                      Months:
                                    </span>
                                    <Form.Control
                                      type="number"
                                      size="sm"
                                      className="form-control-solid w-60px"
                                      value={rule.completionMonth}
                                      onChange={(e) =>
                                        handleRuleAreaChange(
                                          ruleIdx,
                                          "completionMonth",
                                          e.target.value,
                                        )
                                      }
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="d-flex flex-column gap-6">
                              <div className="bg-white rounded p-6 shadow-sm">
                                <MeetingConfigurationTable
                                  meetings={rule.configurations.filter(
                                    (c: any) =>
                                      (c.config_type || "").toLowerCase() ===
                                      "meeting",
                                  )}
                                  setMeetings={(newMeetings) => {
                                    const updatedRules = [...rules];
                                    const otherConfigs = updatedRules[
                                      ruleIdx
                                    ].configurations.filter(
                                      (c: any) =>
                                        (c.config_type || "").toLowerCase() !==
                                        "meeting",
                                    );
                                    updatedRules[ruleIdx].configurations = [
                                      ...otherConfigs,
                                      ...newMeetings,
                                    ];
                                    setRules(updatedRules);
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                        {rules.length === 0 && (
                          <div className="text-center py-10 border border-dashed rounded bg-white">
                            <p className="text-muted mb-0">
                              No area rules configured for this template.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-20 text-center border rounded-4 border-dashed bg-white">
                <div className="symbol symbol-100px mb-5">
                  <div className="symbol-label bg-light-primary">
                    <KTIcon
                      iconName="setting-2"
                      className="fs-3x text-primary"
                    />
                  </div>
                </div>
                <h3 className="fw-bolder text-gray-800">Select a template</h3>
                <p className="text-muted fs-6">
                  Choose a template from the sidebar to configure the proposal.
                </p>
              </div>
            )}
          </Col>
        </Row>
      </Modal.Body>
      <Modal.Footer className="bg-white border-top py-4 px-8 justify-content-between">
        <Button
          variant="light"
          className="fw-bold px-6"
          onClick={onHide}
          disabled={isGenerating}
        >
          Cancel
        </Button>
        <div className="d-flex gap-3">
          <Button
            variant="primary"
            className="fw-bold px-8 shadow-sm"
            onClick={() => handleExport("docx")}
            disabled={!canExport}
          >
            {isGenerating ? (
              <span className="spinner-border spinner-border-sm me-2" />
            ) : (
              <KTIcon iconName="word" className="fs-2 me-1" />
            )}
            Generate DOCX
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
};

export default ProposalTemplatePage;
