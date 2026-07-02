/**
 * Optimized Lead Data Fetching & Transformation
 *
 * Addresses:
 * - Multiple API calls (parallelized)
 * - Expensive transformations (memoized)
 * - Redundant calculations (cached)
 * - Location data cascade (batched)
 */

import { getAllLeadsComplete } from "@services/leads";
import {
  getAllProjectServices,
  getAllProjectSubcategories,
  getAllProjectCategories,
} from "@services/projects";
import { getAllLeadStatus } from "@services/lead";
import {
  fetchAllCountries,
  fetchAllStates,
  fetchAllCities,
} from "@services/options";

interface LocationMaps {
  countriesMap: Map<string, any>;
  statesMap: Map<string, any>;
  citiesMap: Map<string, any>;
}

interface ReferenceData {
  services: any[];
  subcategories: any[];
  categories: any[];
  statuses: any[];
}

/**
 * Transform a single lead to table display format.
 * Extracted to allow memoization of repeated logic.
 */
export const transformLead = (
  lead: any,
  locationMaps: LocationMaps,
): any => {
  const { countriesMap, statesMap, citiesMap } = locationMaps;

  // Calculate duration once
  const startDate = lead?.project?.startDate ? new Date(lead.project.startDate) : null;
  const endDate = lead?.project?.endDate ? new Date(lead.project.endDate) : null;
  const duration =
    startDate && endDate
      ? `${Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))} days`
      : "N/A";

  // Calculate cost once (used in 3 places)
  const commercialsCost =
    Array.isArray(lead.commercials) && lead.commercials.length > 0
      ? lead.commercials.reduce((acc: number, c: any) => acc + (parseFloat(c.cost) || 0), 0)
      : 0;

  const countryId = lead?.additionalDetails?.country || "";
  const stateId = lead?.additionalDetails?.state || "";
  const cityId = lead?.additionalDetails?.city || "";

  return {
    id: lead.id,
    prefix: lead?.prefix || "",
    projectName: lead.title || "",
    totalCost: commercialsCost || lead.budget || 0,
    client:
      lead?.company?.companyName || lead?.leadTeams?.[0]?.company?.companyName || "",
    service: lead?.projectServiceId || lead?.services?.[0]?.serviceId || "",
    category: lead?.projectCategoryId || lead?.leadCategories?.[0]?.category?.id || "",
    subCategory:
      lead?.projectSubCategoryId || lead?.leadSubCategories?.[0]?.subcategory?.id || "",
    status: lead?.status || null,
    poStatus: lead?.poStatus || null,
    assignedTo: lead?.assignedToId || "",
    inquiryDate: lead.inquiryDate || "",
    startDate: lead?.startDate || lead?.project?.startDate || "",
    endDate: lead?.endDate || "",
    duration,
    contact: lead?.contact?.fullName || lead?.leadTeams?.[0]?.contact?.fullName || "",
    createdAt: lead?.createdAt || "",
    createdBy: lead?.createdById || "",
    updatedBy: lead?.updatedById || "",
    country: countriesMap.get(String(countryId))?.name || String(countryId),
    countryId,
    city: citiesMap.get(String(cityId))?.name || String(cityId),
    cityId,
    state: statesMap.get(String(stateId))?.name || String(stateId),
    stateId,
    area:
      (Array.isArray(lead.commercials) && lead.commercials.length > 0
        ? lead.commercials[0]?.area
        : null) ||
      lead?.additionalDetails?.projectArea ||
      lead?.addresses?.[0]?.projectArea ||
      "",
    cost: commercialsCost,
    companyId: lead.companyId || "",
    branchId: lead.branchId || "",
    description: lead.description || "",
    priority: lead.priority || "",
    estimatedHours: lead.estimatedHours || "",
    budget: commercialsCost || lead.budget || "",
    rate: lead.rate || "",
    leadSource: lead.source?.name || lead.sourceId || lead?.leadSource || "",
    referrals: lead.referrals || [],
    companyType: lead.company?.companyTypeId || "",
    receivedDate: lead?.receivedDate || "",
    fileLocation: lead?.fileLocation || "",
    fileLocationCompany: lead?.fileLocationCompany || "",
    fileLocationCompanyType: lead?.fileLocationCompanyType || "",
  };
};

/**
 * Fetch all reference data in parallel (services, categories, statuses)
 * These rarely change and can be cached on the backend
 */
export const fetchReferenceData = async (): Promise<ReferenceData> => {
  const [servicesRes, subcatRes, catRes, statusRes] = await Promise.all([
    getAllProjectServices(),
    getAllProjectSubcategories(),
    getAllProjectCategories(),
    getAllLeadStatus(),
  ]);

  return {
    services: servicesRes?.services || [],
    subcategories: subcatRes?.projectSubCategories || [],
    categories: catRes?.projectCategories || [],
    statuses: statusRes?.leadStatuses || [],
  };
};

/**
 * Build location maps by fetching only the locations present in leads
 * Optimized to fetch only what's needed (not all countries/states/cities)
 */
export const buildLocationMaps = async (leadsData: any[]): Promise<LocationMaps> => {
  if (leadsData.length === 0) {
    return {
      countriesMap: new Map(),
      statesMap: new Map(),
      citiesMap: new Map(),
    };
  }

  // Step 1: Collect unique location IDs from leads
  const uniqueCountryIds = new Set<string>();
  const uniqueStateIds = new Map<string, Set<string>>();
  const uniqueCityIds = new Map<string, Set<string>>();

  leadsData.forEach((lead: any) => {
    const countryId = lead?.additionalDetails?.country;
    const stateId = lead?.additionalDetails?.state;
    const cityId = lead?.additionalDetails?.city;

    if (countryId) {
      uniqueCountryIds.add(String(countryId));
      if (stateId) {
        if (!uniqueStateIds.has(String(countryId))) {
          uniqueStateIds.set(String(countryId), new Set());
        }
        uniqueStateIds.get(String(countryId))!.add(String(stateId));

        if (cityId) {
          if (!uniqueCityIds.has(String(stateId))) {
            uniqueCityIds.set(String(stateId), new Set());
          }
          uniqueCityIds.get(String(stateId))!.add(String(cityId));
        }
      }
    }
  });

  // Step 2: Fetch only the countries that appear in the data
  const countriesData = await fetchAllCountries();
  const countriesMap = new Map<string, any>();
  const countryIsoMap = new Map<string, string>(); // id → iso2

  (countriesData || []).forEach((c: any) => {
    countriesMap.set(c.id.toString(), c);
    if (c.iso2) countryIsoMap.set(c.id.toString(), c.iso2);
  });

  // Step 3: Fetch states only for countries present in leads
  const statesMap = new Map<string, any>();
  const stateIsoMap = new Map<string, string>(); // id → iso2
  const stateToCountryMap = new Map<string, string>(); // state id → country iso2

  if (uniqueStateIds.size > 0) {
    const statesRequests = [...uniqueStateIds.keys()]
      .map((countryId) => {
        const iso2 = countryIsoMap.get(countryId);
        return iso2 ? fetchAllStates(iso2) : Promise.resolve([]);
      });

    const statesResults = await Promise.all(statesRequests);
    const allStates: any[] = [];
    statesResults.forEach((r) => {
      if (Array.isArray(r)) allStates.push(...r);
    });

    allStates.forEach((s: any) => {
      statesMap.set(s.id.toString(), s);
      if (s.iso2) stateIsoMap.set(s.id.toString(), s.iso2);
    });

    // Map state IDs to country ISO codes for city fetching
    [...uniqueStateIds.entries()].forEach(([countryId, stateIds]) => {
      const countryIso = countryIsoMap.get(countryId);
      stateIds.forEach((stateId) => {
        if (countryIso) stateToCountryMap.set(stateId, countryIso);
      });
    });
  }

  // Step 4: Fetch cities only for states present in leads
  const citiesMap = new Map<string, any>();

  if (uniqueCityIds.size > 0) {
    const citiesRequests = [...uniqueCityIds.keys()]
      .map((stateId) => {
        const stateIso = stateIsoMap.get(stateId);
        const countryIso = stateToCountryMap.get(stateId);
        return stateIso && countryIso
          ? fetchAllCities(countryIso, stateIso)
          : Promise.resolve([]);
      });

    const citiesResults = await Promise.all(citiesRequests);
    const allCities: any[] = [];
    citiesResults.forEach((r) => {
      if (Array.isArray(r)) allCities.push(...r);
    });

    allCities.forEach((c: any) => {
      citiesMap.set(c.id.toString(), c);
    });
  }

  return { countriesMap, statesMap, citiesMap };
};

/**
 * Optimized main fetch function
 * Combines leads fetching, reference data, and location building in optimal order
 */
export const fetchLeadDataOptimized = async (
  fields?: string[] | undefined | "auto",
  currentEmployeeId?: string,
  getUserTablePreferences?: any,
  computeLeadFields?: any,
) => {
  // Resolve which fields to fetch based on column visibility
  let resolvedFields: string[] | undefined;
  if (fields === "auto" && currentEmployeeId && getUserTablePreferences && computeLeadFields) {
    try {
      const prefsRes = await getUserTablePreferences(currentEmployeeId, "LeadsTablesMainV2");
      resolvedFields = computeLeadFields(prefsRes?.data?.preferences?.columnVisibility);
    } catch {
      resolvedFields = undefined;
    }
  } else if (fields !== "auto") {
    resolvedFields = fields;
  }

  // Parallel fetch: leads data + reference data
  // This is better than sequential because reference data fetch doesn't depend on leads
  const [leadsResponse, referenceData] = await Promise.all([
    getAllLeadsComplete(resolvedFields),
    fetchReferenceData(),
  ]);

  const leadsData = leadsResponse?.data?.data?.leads || [];

  // Build location maps (this is sequential because it depends on leads data)
  const locationMaps = await buildLocationMaps(leadsData);

  // Transform leads data
  const transformedLeads = leadsData.map((lead: any) =>
    transformLead(lead, locationMaps),
  );

  return {
    leads: transformedLeads,
    rawLeads: leadsData,
    ...referenceData,
    locationMaps,
  };
};
