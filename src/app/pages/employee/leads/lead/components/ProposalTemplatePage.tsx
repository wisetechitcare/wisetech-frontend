import React, { useState, useEffect, useRef } from "react";
import { Modal, Button, Form, Row, Col, Badge } from "react-bootstrap";
import { KTIcon } from "@metronic/helpers";
import {
  getProposalConfigurations,
  getAvailableExportFields,
  exportLeadDocx,
  exportLeadPdf,
  saveProposalConfiguration,
} from "@services/leads";
import PercentageConfigurationTable from "./PercentageConfigurationTable";
import MeetingConfigurationTable from "./MeetingConfigurationTable";
import { showError } from "@utils/modal";
import dayjs from "dayjs";
import { ExportCenterModal } from "./dms/components/ExportCenterModal";
import { useAuth } from "../../../../../modules/auth";

interface ProposalTemplatePageProps {
  show: boolean;
  onHide: () => void;
  leadData: any;
  companyData?: any;
  contactData?: any;
  projectData?: any;
}

interface ProposalConfiguration {
  config_type: string;
  config_key: string;
  value: any;
  configType?: string;
  configKey?: string;
  [key: string]: any;
}

interface ProposalRule {
  minArea: string | number;
  maxArea: string | number;
  completionYear?: number;
  completionMonth?: number;
  configurations: ProposalConfiguration[];
  [key: string]: any;
}

const ProposalTemplatePage: React.FC<ProposalTemplatePageProps> = ({
  show,
  onHide,
  leadData,
  companyData,
  contactData,
  projectData,
}) => {
  const { currentUser } = useAuth();
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [currentConfig, setCurrentConfig] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [rules, setRules] = useState<ProposalRule[]>([]);
  const [templateBase64, setTemplateBase64] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [availableFields, setAvailableFields] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"fields" | "rules">("fields");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showExportCenter, setShowExportCenter] = useState(false);
  const initialFormDataRef = useRef<any>(null);
  const [globalPaymentStages, setGlobalPaymentStages] = useState<
    ProposalConfiguration[]
  >([]);

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
      leadData?.referrals?.find((r: any) => r.referredByContact)?.referredByContact ||
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
          case "contact_title":
            val = (() => {
              if (contact.title || contact.prefix) return (contact.title || contact.prefix);
              const g = (contact.gender || '').toUpperCase();
              if (g === 'MALE') return 'Mr';
              if (g === 'FEMALE') return 'Ms';
              return 'Mr/Ms';
            })().replace(/\.$/, '');
            break;
          case "contact_title_2":
            val = (() => {
              const g = (contact.gender || '').toUpperCase();
              if (g === 'MALE') return 'Sir';
              if (g === 'FEMALE') return 'Madam';
              return 'Sir/Madam';
            })();
            break;
          case "client_address_line_1":
            val = details.projectAddress || company.address || leadData.project?.projectAddress || "";
            break;
          case "client_address_line_2":
            val = details.city || company.city || leadData.project?.city || "";
            break;
          case "client_address_line_3":
            val = details.state || company.state || leadData.project?.state || "";
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
          case "client_contact_email":
          case "contact_email":
            val = contact.email || "";
            break;
          case "client_contact_phone":
          case "contact_phone":
            val = contact.phone || "";
            break;
          case "client_designation":
          case "contact_designation":
            val = contact.roleInCompany || contact.designation || "";
            break;
          case "company_website":
            val = company.website || "";
            break;
          case "company_phone":
            val = company.phone || company.phoneNumber || "";
            break;
          case "company_email":
            val = company.email || "";
            break;
          case "assigned_to_name":
            val = leadData.assignedTo?.users ? `${leadData.assignedTo.users.firstName} ${leadData.assignedTo.users.lastName || ''}`.trim() : "";
            break;
          case "assigned_to_email":
            val = leadData.assignedTo?.users?.personalEmailId || "";
            break;
          case "assigned_to_phone":
            val = leadData.assignedTo?.users?.personalPhoneNumber || "";
            break;
          case "project_description":
            val = leadData.description || leadData.summary || "";
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
          case "total_cost_in_words":
          case "total_offer_cost_in_words":
            val = ""; // Let the backend handle the conversion or user override it
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
            val = dayjs().format("YYYY-MM-DD");
            break;
          case "inquiry_date":
            val = leadData.inquiryDate
              ? dayjs(leadData.inquiryDate).format("YYYY-MM-DD")
              : "";
            break;
          case "offer_date":
          case "validity_date":
            val = dayjs().format("YYYY-MM-DD");
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
          case "project_area_1_cost_type":
            val = commercial[0]?.costType || "";
            break;
          default:
            val = typeof val === "object" ? "" : val || "";
        }
      }
      initialData[f.key] = val || "";
    });

    // Add alias keys so transformer can find them under both names
    initialData.total_offer_cost =
      initialData.total_project_cost || totalCost || 0;
    initialData.client_contact_person =
      initialData.contact_person ||
      initialData.client_contact_name ||
      contact.name ||
      contact.fullName ||
      "";

    setFormData(initialData);
    initialFormDataRef.current = JSON.parse(JSON.stringify(initialData));
    setSelectedTemplateId("");
    setCurrentConfig(null);
    setRules([]);
    setTemplateBase64("");
    setActiveTab("fields");
  }, [show, leadData, availableFields]);

  // Removed duplicate state declaration

  useEffect(() => {
    if (!selectedTemplateId && !templateBase64) return;

    setFormData((prev: any) => {
      const updated = { ...prev };

      // 1. Sync Global Stages Placeholders
      let sIdx = 1;
      (globalPaymentStages || []).forEach((c: any) => {
        const type = (c.config_type || c.configType || "").toLowerCase();
        if (type !== "meeting") {
          updated[`stage_${sIdx}_name`] =
            c.config_key || c.configKey || `Stage ${sIdx}`;
          updated[`stage_${sIdx}_value`] = c.value || 0;
          sIdx++;
        }
      });

      // Clear trailing stage placeholders
      for (let i = sIdx; i <= 15; i++) {
        delete updated[`stage_${i}_name`];
        delete updated[`stage_${i}_value`];
      }

      // 2. Sync Meetings
      const currentArea =
        parseFloat(updated.total_project_area || updated.built_up_area) || 0;
      return syncMeetings(updated, currentArea, rules, globalPaymentStages);
    });
  }, [globalPaymentStages, rules]);

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

          // 1. Map Global Stages (Non-meetings)
          globalStages.forEach((c: any, sIdx: number) => {
            const num = sIdx + 1;
            const type = (c.config_type || "").toLowerCase();
            if (type !== "meeting") {
              updated[`stage_${num}_name`] = c.config_key || `Stage ${num}`;
              updated[`stage_${num}_value`] = c.value || 0;
            }
          });

          // 2. Map Area Rules (Non-meetings)
          areaRules.forEach((rule, ruleIdx) => {
            const ruleNum = ruleIdx + 1;
            let sIdx = 1;
            rule.configurations.forEach((c: any) => {
              const type = (c.config_type || "").toLowerCase();
              const key = c.config_key;
              if (type === "percentage" || type === "payment") {
                updated[`rule_${ruleNum}_stage_${sIdx}_name`] =
                  key || `Stage ${sIdx}`;
                updated[`rule_${ruleNum}_stage_${sIdx}_value`] = c.value || 0;
                sIdx++;
              }
            });
          });

          // 3. Sync Dynamic Meetings
          const currentArea =
            parseFloat(updated.total_project_area || updated.built_up_area) ||
            0;
          return syncMeetings(updated, currentArea, areaRules, globalStages);
        });
      } catch (err) {
        console.error("Failed to load rules", err);
      }
    }
  };

  const syncMeetings = (
    updatedData: any,
    area: number,
    currentRules: any[],
    currentGlobal: any[],
  ) => {
    // Clear old meeting keys
    Object.keys(updatedData).forEach((k) => {
      if (k.startsWith("meeting_")) delete updatedData[k];
    });

    let mIdx = 1;

    // 1. Add Global Meetings
    (currentGlobal || []).forEach((c: any) => {
      if ((c.config_type || c.configType || "").toLowerCase() === "meeting") {
        updatedData[`meeting_${mIdx}_name`] =
          c.config_key || c.configKey || `Meeting ${mIdx}`;
        updatedData[`meeting_${mIdx}_value`] = c.value || 0;
        mIdx++;
      }
    });

    // 2. Add Area-Specific Meetings
    const bestRule =
      (currentRules || []).find(
        (r) => area >= Number(r.minArea) && area <= Number(r.maxArea),
      ) || currentRules?.[0];
    if (bestRule) {
      (bestRule.configurations || []).forEach((c: any) => {
        if ((c.config_type || c.configType || "").toLowerCase() === "meeting") {
          updatedData[`meeting_${mIdx}_name`] =
            c.config_key || c.configKey || `Meeting ${mIdx}`;
          updatedData[`meeting_${mIdx}_value`] = c.value || 0;
          mIdx++;
        }
      });
    }
    return updatedData;
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

      // Sync Area Aliases and Update Meetings
      if (
        [
          "built_up_area",
          "total_project_area",
          "total_area",
          "project_area",
        ].includes(name)
      ) {
        updated.built_up_area = value;
        updated.total_project_area = value;
        updated.total_area = value;
        updated.project_area = value;

        // Dynamic Meeting Update based on new area
        return syncMeetings(
          updated,
          parseFloat(value) || 0,
          rules,
          globalPaymentStages,
        );
      }

      // Sync Cost Aliases
      if (
        [
          "total_offer_cost",
          "total_project_cost",
          "cost",
          "total_cost",
        ].includes(name)
      ) {
        updated.total_offer_cost = value;
        updated.total_project_cost = value;
        updated.cost = value;
        updated.total_cost = value;
      }

      // Sync Contact Aliases
      if (
        [
          "client_contact_name",
          "client_contact_person",
          "contact_person",
          "contact_name",
        ].includes(name)
      ) {
        updated.client_contact_name = value;
        updated.client_contact_person = value;
        updated.contact_person = value;
        updated.contact_name = value;
      }

      // Sync Company Aliases
      if (
        ["client_company_name", "company_name", "client_name"].includes(name)
      ) {
        updated.client_company_name = value;
        updated.company_name = value;
        updated.client_name = value;
      }

      return updated;
    });
  };

  const handleSaveConfig = async () => {
    if (!selectedTemplateId && !currentConfig) return;
    setIsSaving(true);
    try {
      const normalizedGlobalStages = globalPaymentStages.map((c: any) => ({
        configType: c.configType || c.config_type || "percentage",
        configKey: c.configKey || c.config_key || "",
        value: String(c.value || 0),
      }));

      const normalizedAreaRules = rules.map((rule: any) => ({
        minArea: rule.minArea,
        maxArea: rule.maxArea,
        completionYear: rule.completionYear || 0,
        completionMonth: rule.completionMonth || 0,
        configurations: (rule.configurations || []).map((c: any) => ({
          configType: c.configType || c.config_type || "",
          configKey: c.configKey || c.config_key || "",
          value: String(c.value || 0),
        })),
      }));

      const configToSave = {
        ...currentConfig,
        completionYear: formData.completion_years,
        completionMonth: formData.completion_months,
        rules: [
          { minArea: -1, maxArea: -1, configurations: normalizedGlobalStages },
          ...normalizedAreaRules,
        ],
      };

      await saveProposalConfiguration(
        configToSave,
        templateBase64 || undefined,
      );
      alert("Template configuration saved successfully!");
    } catch (err: any) {
      showError("Failed to save template changes: " + (err.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async (type: "docx" | "pdf", modalConfig?: any) => {
    if (!selectedTemplateId && !templateBase64) return;

    setIsGenerating(true);
    try {
      // Normalize global payment stages
      const normalizedGlobalStages = globalPaymentStages.map((c: any) => ({
        configType: c.configType || c.config_type || "percentage",
        configKey: c.configKey || c.config_key || "",
        value: String(c.value || 0),
      }));

      // Normalize area rules
      const normalizedAreaRules = rules.map((rule: any) => ({
        minArea: rule.minArea,
        maxArea: rule.maxArea,
        completionYear: rule.completionYear || 0,
        completionMonth: rule.completionMonth || 0,
        configurations: (rule.configurations || []).map((c: any) => ({
          configType: c.configType || c.config_type || "",
          configKey: c.configKey || c.config_key || "",
          value: String(c.value || 0),
        })),
      }));

      const exportData = {
        templateId: selectedTemplateId,
        ...formData,
        // Ensure total_project_cost is always present (transformer priority check)
        total_project_cost:
          formData.total_project_cost || formData.total_offer_cost || 0,
        areaRules: [
          { minArea: -1, maxArea: -1, configurations: normalizedGlobalStages },
          ...normalizedAreaRules,
        ],
        customTemplate: templateBase64 || undefined,
        userId: currentUser?.id,
        userName:
          `${currentUser?.first_name || ""} ${currentUser?.last_name || ""}`.trim(),
        // --- Export Center Payload from Modal ---
        ...(modalConfig || {}),
      };

      const { destination, fileName } = modalConfig || {
        destination: "device",
      };

      console.log(`📤 [Export] ${type.toUpperCase()} | Dest: ${destination}`);

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

      // Handle Destination
      if (destination === "device" || destination === "both") {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute(
          "download",
          fileName || `${formData.project_name || "Proposal"}.${type}`,
        );
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      }

      if (destination === "cloud" || destination === "both") {
        window.dispatchEvent(new CustomEvent("dms-refresh"));
      }
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
    >
      <Modal.Header closeButton className="py-3 px-6 border-bottom">
        <Modal.Title>
          <span className="fs-3 fw-bolder">Proposal Builder</span>
          <div className="fs-9 text-muted fw-bold">Lead-Specific</div>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-0">
        <Row className="g-0">
          <Col
            lg={3}
            className="bg-white border-end p-5 scroll-y"
            style={{ height: "70vh" }}
          >
            <h6 className="fw-bolder mb-5">Templates</h6>
            <div className="d-flex flex-column gap-2">
              {templates.map((tpl: any) => (
                <div
                  key={tpl.id}
                  onClick={() => handleTemplateChange(tpl.id)}
                  className={`p-3 rounded-2 cursor-pointer mb-2 transition-all ${selectedTemplateId === tpl.id ? "bg-primary text-white" : "bg-hover-light border"}`}
                >
                  <div className="fw-bold fs-7">{tpl.templateName}</div>
                  <div
                    className={`fs-9 ${selectedTemplateId === tpl.id ? "text-white-50" : "text-muted"}`}
                  >
                    {tpl.templateCode}
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
            className="bg-white p-6 scroll-y"
            style={{ height: "70vh" }}
          >
            {currentConfig || templateBase64 ? (
              <div className="p-4">
                {/* General Configuration */}
                <div className="mb-8">
                  <h5 className="fw-bolder mb-4 text-dark">
                    General Configuration
                  </h5>
                  <Row className="bg-light p-4 rounded border">
                    <Col sm={6}>
                      <div className="fs-8 text-muted fw-bold text-uppercase mb-1">
                        Active Template
                      </div>
                      <div className="fw-bolder fs-6">
                        {currentConfig?.templateName || "Custom Upload"}
                      </div>
                    </Col>
                    <Col sm={6}>
                      <div className="fs-8 text-muted fw-bold text-uppercase mb-1">
                        Internal Code
                      </div>
                      <div className="fw-bolder fs-6">
                        {currentConfig?.templateCode || "TEMP_FILE"}
                      </div>
                    </Col>
                  </Row>
                </div>

                {/* Navigation Tabs */}
                <ul className="nav nav-tabs nav-line-tabs mb-8 fs-6 border-bottom">
                  <li className="nav-item">
                    <a
                      className={`nav-link fw-bolder cursor-pointer py-3 ${activeTab === "fields" ? "active text-primary border-primary" : "text-muted"}`}
                      onClick={() => setActiveTab("fields")}
                    >
                      Placeholders
                    </a>
                  </li>
                  <li className="nav-item">
                    <a
                      className={`nav-link fw-bolder cursor-pointer py-3 ${activeTab === "rules" ? "active text-primary border-primary" : "text-muted"}`}
                      onClick={() => setActiveTab("rules")}
                    >
                      Configuration
                    </a>
                  </li>
                </ul>

                {/* Content Area */}
                <div className="py-2">
                  {activeTab === "fields" ? (
                    <Row className="g-5">
                      {availableFields
                        .filter((f) => {
                          // Exclude dynamic configuration and address fields that are managed elsewhere
                          if (
                            f.key.startsWith("stage_") ||
                            f.key.startsWith("percentage_") ||
                            f.key.startsWith("meeting_") ||
                            f.key.includes("completion_") ||
                            f.key === "total_meetings" ||
                            [
                              "project_address",
                              "project_full_address",
                              "project_location",
                              "locality",
                              "city",
                              "state",
                              "zip_code",
                              "country",
                              "lead_summary",
                              "project_description",
                              "plot_area",
                              "built_up_area",
                              "building_detail",
                              "total_commercial_area",
                              "template_name",
                            ].includes(f.key) ||
                            f.key.startsWith("commercial_")
                          )
                            return false;

                          return (
                            !currentConfig ||
                            !currentConfig.enabledFields?.length ||
                            currentConfig.enabledFields?.includes(f.key)
                          );
                        })
                        .map((field, index) => (
                          <Col sm={6} xl={4} key={index}>
                            <Form.Group>
                              <Form.Label className="fs-8 fw-bolder text-muted mb-1">
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
                    <div className="d-flex flex-column gap-6">
                      {/* Project Area (Controls meeting resolution) */}
                      <div className="mb-4">
                        <Row className="align-items-center">
                          <Col sm={4}>
                            <h5 className="fw-bolder text-dark mb-0">
                              Total Project Area
                            </h5>
                            <span className="text-muted fs-9">
                              Controls meeting rules
                            </span>
                          </Col>
                          <Col sm={3}>
                            <Form.Control
                              type="number"
                              placeholder="Enter Area..."
                              className="form-control-solid fw-bold"
                              value={formData.total_project_area || ""}
                              onChange={(e) => handleInputChange(e as any)}
                              name="total_project_area"
                            />
                          </Col>
                        </Row>
                      </div>

                      <div className="separator border-gray-200 my-4"></div>

                      {/* Global Payment Breakdown */}
                      <div className="mb-4">
                        <h5 className="fw-bolder text-dark mb-4">
                          Payment Breakdown
                        </h5>
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

                      <div className="separator border-gray-200 my-4"></div>

                      {/* Meetings & Deliverables */}
                      <div>
                        <h5 className="fw-bolder text-dark mb-4">
                          Meetings & Deliverables
                        </h5>
                        {rules.length > 0 ? (
                          rules
                            .filter((r: ProposalRule) => {
                              const area = parseFloat(
                                formData.total_project_area || "0",
                              );
                              if (!formData.total_project_area) return true;
                              return (
                                area >= Number(r.minArea) &&
                                area <= Number(r.maxArea)
                              );
                            })
                            .map((rule: ProposalRule, ruleIdx: number) => (
                              <div key={ruleIdx} className="mb-6">
                                <MeetingConfigurationTable
                                  meetings={rule.configurations.filter(
                                    (c: ProposalConfiguration) =>
                                      (c.config_type || "").toLowerCase() ===
                                      "meeting",
                                  )}
                                  setMeetings={(newMeetings) => {
                                    const updatedRules = [...rules];
                                    const others = updatedRules[
                                      ruleIdx
                                    ].configurations.filter(
                                      (c: ProposalConfiguration) =>
                                        (c.config_type || "").toLowerCase() !==
                                        "meeting",
                                    );
                                    updatedRules[ruleIdx].configurations = [
                                      ...others,
                                      ...newMeetings,
                                    ];
                                    setRules(updatedRules);
                                  }}
                                />
                              </div>
                            ))
                        ) : (
                          <div className="text-center py-10 border border-dashed rounded bg-light">
                            <p className="text-muted mb-0">
                              No meetings configured for this template.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-20 text-center border rounded border-dashed bg-light">
                <h3 className="fw-bolder text-gray-800">Select a template</h3>
                <p className="text-muted fs-6">
                  Choose a template from the sidebar to begin.
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
            disabled={!canExport || isGenerating}
            onClick={() => setShowExportCenter(true)}
          >
            {isGenerating ? (
              <span className="spinner-border spinner-border-sm me-2" />
            ) : (
              <KTIcon iconName="word" className="fs-2 me-1" />
            )}
            Process & Export
          </Button>
        </div>
      </Modal.Footer>

      {/* Export Center Modal Hook */}
      <ExportCenterModal
        show={showExportCenter}
        onHide={() => setShowExportCenter(false)}
        leadData={leadData}
        templateId={selectedTemplateId || "custom"}
        isDataModified={(() => {
          if (!initialFormDataRef.current) return false;

          // Only check CRITICAL fields to avoid false positives from technical/hidden fields
          const criticalFields = [
            "project_name",
            "total_project_cost",
            "total_project_area",
            "client_company_name",
            "contact_person",
          ];

          return criticalFields.some((key) => {
            const val1 =
              formData[key] === null || formData[key] === undefined
                ? ""
                : String(formData[key]).trim();
            const val2 =
              initialFormDataRef.current[key] === null ||
              initialFormDataRef.current[key] === undefined
                ? ""
                : String(initialFormDataRef.current[key]).trim();
            return val1 !== val2;
          });
        })()}
        onExport={async (config) => {
          await handleExport("docx", config);
        }}
      />
    </Modal>
  );
};

export default ProposalTemplatePage;
