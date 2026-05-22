/**
 * Builds the payload sent to /api/leads/export/docx|pdf from lead form values.
 */
export function buildLeadExportPayload(
  values: any,
  context: {
    countries: any[];
    states: any[];
    cities: any[];
    companies: any[];
    allCompanyTypes: any[];
    services: any[];
    categories: any[];
    userId?: string;
  }
) {
  const {
    countries,
    states,
    cities,
    companies,
    allCompanyTypes,
    services,
    categories,
    userId,
  } = context;

  const selectedCompanyType =
    allCompanyTypes.find(
      (t) => String(t.id) === String(values.fileLocationCompanyType),
    )?.name || "";
  const selectedCompany =
    companies.find((c) => String(c.id) === String(values.fileLocationCompany))
      ?.companyName || "";

  const firstAddr = values.addresses?.[0] || {};
  const stateSelection = values.addressStateSelections?.[0];
  const citySelection = values.addressCitySelections?.[0];
  const stateOptions = values.addressStatesOptions?.[0] || [];
  const cityOptions = values.addressCitiesOptions?.[0] || [];

  const resolvedCountry =
    countries.find((c) => String(c.id) === String(firstAddr.country))?.name ||
    firstAddr.country ||
    "";

  const resolvedState =
    stateSelection?.name ||
    states.find((s) => String(s.id) === String(firstAddr.state))?.name ||
    stateOptions.find((s: any) => String(s.id) === String(firstAddr.state))
      ?.name ||
    firstAddr.state ||
    "";

  const resolvedCity =
    citySelection?.name ||
    cities.find((c) => String(c.id) === String(firstAddr.city))?.name ||
    cityOptions.find((c: any) => String(c.id) === String(firstAddr.city))
      ?.name ||
    firstAddr.city ||
    "";

  const resolvedServices = (values.serviceIds || []).map(
    (id: string) =>
      services.find((s) => String(s.id) === String(id))?.name || id,
  );
  const resolvedCategories = (values.categoryIds || []).map(
    (id: string) =>
      categories.find((c) => String(c.id) === String(id))?.name || id,
  );

  const normalizedGlobalStages = (values.globalPaymentStages || []).map(
    (c: any) => ({
      configType: c.configType || c.config_type || "percentage",
      configKey: c.configKey || c.config_key || "",
      value: String(c.value ?? 0),
    }),
  );

  const normalizedAreaRules = (values.rules || []).map((rule: any) => ({
    minArea: rule.minArea ?? rule.min_area,
    maxArea: rule.maxArea ?? rule.max_area,
    completionYear: rule.completionYear ?? rule.completion_year ?? 0,
    completionMonth: rule.completionMonth ?? rule.completion_month ?? 0,
    configurations: (rule.configurations || []).map((c: any) => ({
      configType: c.configType || c.config_type || "",
      configKey: c.configKey || c.config_key || "",
      value: String(c.value ?? 0),
    })),
  }));

  const areaRules = [
    { minArea: -1, maxArea: -1, configurations: normalizedGlobalStages },
    ...normalizedAreaRules,
  ];

  return {
    proposalTemplateId: values.proposalTemplateId,
    templateId: values.proposalTemplateId,
    project_name: values.projectName || values.project_name,
    projectName: values.projectName || values.project_name,
    total_project_cost:
      values.total_project_cost || values.total_offer_cost || values.cost || 0,
    total_offer_cost: values.total_offer_cost || values.total_project_cost || 0,
    built_up_area: values.built_up_area || values.projectArea,
    client_company_name: values.client_company_name,
    client_contact_name: values.client_contact_name || values.contact_person,
    contact_person: values.contact_person || values.client_contact_name,
    completion_years: values.completion_years,
    completion_months: values.completion_months,
    inquiry_no: values.inquiry_no,
    offer_number: values.offer_number,
    fileLocationCompanyType:
      selectedCompanyType || values.fileLocationCompanyType,
    fileLocationCompany: selectedCompany || values.fileLocationCompany,
    service_names: resolvedServices,
    category_names: resolvedCategories,
    addresses: values.addresses?.map((addr: any, index: number) =>
      index === 0
        ? {
            ...addr,
            country: resolvedCountry,
            state: resolvedState,
            city: resolvedCity,
          }
        : addr,
    ),
    address:
      values.addresses?.[0]?.projectAddress || values.projectAddress || "",
    templateName:
      values.selected_template || values.exportTemplate || "placeholder.docx",
    areaRules,
    rules: areaRules,
    userId,
  };
}
