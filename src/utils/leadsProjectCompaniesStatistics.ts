import { ChartData } from "@models/clientProject";
import { useMemo } from "react";

export const convertToChartData = (
  apiData: any[],
  countKey: string,
  labelKey: string,
  totalCostKey: string
): ChartData[] => {
  // console.log("apiData", apiData);
  return apiData.map((item, index) => ({
    label: item[labelKey],
    value: item[countKey],
    color: item.color || "#3B82F6",
    totalCost: item[totalCostKey] || 0,
    id: item.id || `${item[labelKey]}-${index}`,
  }));
};

// Convert direct source API data to chart format
export const convertDirectSourceData = (
  directSourceApiData: any[],
  selectedSource?: string
): ChartData[] => {
  if (!directSourceApiData || directSourceApiData.length === 0) return [];

  // If no specific source is selected, show all statuses with their total counts
  if (!selectedSource || selectedSource === "" || selectedSource === "all") {
    const result = directSourceApiData
      .map((statusItem, index) => {
        const totalCount =
          statusItem.leadsData?.reduce(
            (sum: number, lead: any) => sum + (lead.count || 0),
            0
          ) || 0;
        const totalBudget =
          statusItem.leadsData?.reduce(
            (sum: number, lead: any) => sum + (lead.budget || 0),
            0
          ) || 0;
        return {
          label: statusItem.name,
          value: totalCount,
          color: statusItem.color || "#3B82F6",
          totalCost: totalBudget,
          id: statusItem.id || `status-${index}`,
        };
      })
      .filter((item) => item.value > 0);
    return result;
  }

  // When a specific status is selected, return that status with its total count
  const selectedStatusData = directSourceApiData.find(
    (item) => item.name === selectedSource
  );
  if (selectedStatusData) {
    const totalCount =
      selectedStatusData.leadsData?.reduce(
        (sum: number, lead: any) => sum + (lead.count || 0),
        0
      ) || 0;
    const totalBudget =
      selectedStatusData.leadsData?.reduce(
        (sum: number, lead: any) => sum + (lead.budget || 0),
        0
      ) || 0;

    const result = [
      {
        label: selectedStatusData.name, // return the status name, not lead source name
        value: totalCount,
        color: selectedStatusData.color || "#3B82F6",
        totalCost: totalBudget,
        id: selectedStatusData.id,
      },
    ].filter((item) => item.value > 0);
    return result;
  }

  return [];
};

export const convertReferralSourceData = (
  referralSourceApiData: any[],
  selectedFilter?: string
): ChartData[] => {
  if (!referralSourceApiData || referralSourceApiData.length === 0) return [];
  

  // If no specific filter is selected, show all referral sources
  if (!selectedFilter || selectedFilter === "" || selectedFilter === "all") {
    
    const referralSourceMap = new Map();

    referralSourceApiData.forEach((statusItem) => {
      if (statusItem.leadsData) {
        statusItem.leadsData.forEach((lead: any) => {
          const key = lead.name;
          if (referralSourceMap.has(key)) {
            const existing = referralSourceMap.get(key);
            referralSourceMap.set(key, {
              ...existing,
              value: existing.value + (lead.count || 0),
              totalCost: existing.totalCost + (lead.budget || 0),
            });
          } else {
            referralSourceMap.set(key, {
              label: lead.name,
              value: lead.count || 0,
              color: lead.color || "#3B82F6",
              totalCost: lead.budget || 0,
              id: lead.id,
            });
          }
        });
      }
    });

    const result = Array.from(referralSourceMap.values()).filter(
      (item) => item.value > 0
    );
    return result;
  }

  const selectedStatusData = referralSourceApiData.find(
    (item) => item.name === selectedFilter || item.id === selectedFilter
  );
  
  if (selectedStatusData && selectedStatusData.leadsData) {
    return selectedStatusData.leadsData.map((lead: any, index: number) => ({
      label: lead.name,
      value: lead.count || 0,
      color: lead.color || "#3B82F6",
      totalCost: lead.budget || 0,
      id: lead.id || `referral-lead-${index}`,
    }));
  }

  let referralSourceMap = new Map();
  let foundByName = false;

  referralSourceApiData.forEach((statusItem) => {
    if (statusItem.leadsData) {
      statusItem.leadsData.forEach((lead: any) => {
        if (lead.name === selectedFilter) {
          foundByName = true;
          const key = lead.name;
          if (referralSourceMap.has(key)) {
            const existing = referralSourceMap.get(key);
            referralSourceMap.set(key, {
              ...existing,
              value: existing.value + (lead.count || 0),
              totalCost: existing.totalCost + (lead.budget || 0),
            });
          } else {
            referralSourceMap.set(key, {
              label: lead.name,
              value: lead.count || 0,
              color: lead.color || "#3B82F6",
              totalCost: lead.budget || 0,
              id: lead.id,
            });
          }
        }
      });
    }
  });

  if (foundByName) {
    return Array.from(referralSourceMap.values());
  }
  referralSourceMap = new Map();
  let foundById = false;

  referralSourceApiData.forEach((statusItem) => {
    if (statusItem.leadsData) {
      statusItem.leadsData.forEach((lead: any) => {
        if (lead.id === selectedFilter) {
          foundById = true;
          const key = lead.name; // Still use name as the key
          if (referralSourceMap.has(key)) {
            const existing = referralSourceMap.get(key);
            referralSourceMap.set(key, {
              ...existing,
              value: existing.value + (lead.count || 0),
              totalCost: existing.totalCost + (lead.budget || 0),
            });
          } else {
            referralSourceMap.set(key, {
              label: lead.name,
              value: lead.count || 0,
              color: lead.color || "#3B82F6",
              totalCost: lead.budget || 0,
              id: lead.id,
            });
          }
        }
      });
    }
  });

  if (foundById) {
    return Array.from(referralSourceMap.values());
  }

  
  const allReferralNames: string[] = [];
  const allReferralIds: string[] = [];
  referralSourceApiData.forEach((statusItem) => {
    if (statusItem.leadsData) {
      statusItem.leadsData.forEach((lead: any) => {
        if (!allReferralNames.includes(lead.name)) {
          allReferralNames.push(lead.name);
        }
        if (!allReferralIds.includes(lead.id)) {
          allReferralIds.push(lead.id);
        }
      });
    }
  });

  return [];
};

// convert company type api data to chart formate
export const convertCompanyTypeData = (
  companyTypeApiData: any[],
  selectedFilter?: string
): ChartData[] => {
  if (!companyTypeApiData || companyTypeApiData.length === 0) return [];
  
  // If no specific filter is selected, show all company types across all statuses
  if (!selectedFilter || selectedFilter === "" || selectedFilter === "all") {
    const companyTypeMap = new Map();

    companyTypeApiData.forEach((statusItem) => {
      if (statusItem.allLeadsByAllCompanyType) {
        statusItem.allLeadsByAllCompanyType.forEach((item: any) => {
          const key = item.name;
          if (companyTypeMap.has(key)) {
            const existing = companyTypeMap.get(key);
            companyTypeMap.set(key, {
              ...existing,
              value: existing.value + (item.count || 0),
              totalCost: existing.totalCost + (item.budget || 0),
            });
          } else {
            companyTypeMap.set(key, {
              label: item.name,
              value: item.count || 0,
              color: item.color || "#3B82F6",
              totalCost: item.budget || 0,
              id: item.id,
            });
          }
        });
      }
    });

    const result = Array.from(companyTypeMap.values()).filter(
      (item) => item.value > 0
    );
    return result;
  }

  // CASE 1: Check if selectedFilter is a STATUS name or ID
  const selectedStatusData = companyTypeApiData.find(
    (item) => item.name === selectedFilter || item.id === selectedFilter
  );
  
  if (selectedStatusData && selectedStatusData.allLeadsByAllCompanyType) {
    // console.log("Filter matched STATUS - showing all company types for this status");
    return selectedStatusData.allLeadsByAllCompanyType.map((item: any, index: number) => ({
      label: item.name,
      value: item.count || 0,
      color: item.color || "#3B82F6",
      totalCost: item.budget || 0,
      id: item.id || `company-type-${index}`,
    }));
  }

  // CASE 2: Check if selectedFilter is a COMPANY TYPE name
  // console.log("Checking if filter is a company type name");
  let companyTypeMap = new Map();
  let foundByName = false;

  companyTypeApiData.forEach((statusItem) => {
    if (statusItem.allLeadsByAllCompanyType) {
      statusItem.allLeadsByAllCompanyType.forEach((item: any) => {
        if (item.name === selectedFilter) {
          foundByName = true;
          const key = item.name;
          if (companyTypeMap.has(key)) {
            const existing = companyTypeMap.get(key);
            companyTypeMap.set(key, {
              ...existing,
              value: existing.value + (item.count || 0),
              totalCost: existing.totalCost + (item.budget || 0),
            });
          } else {
            companyTypeMap.set(key, {
              label: item.name,
              value: item.count || 0,
              color: item.color || "#3B82F6",
              totalCost: item.budget || 0,
              id: item.id,
            });
          }
        }
      });
    }
  });

  if (foundByName) {
    // console.log("Filter matched COMPANY TYPE NAME");
    return Array.from(companyTypeMap.values());
  }

  // CASE 3: Check if selectedFilter is a COMPANY TYPE ID
  // console.log("Checking if filter is a company type ID");
  companyTypeMap = new Map();
  let foundById = false;

  companyTypeApiData.forEach((statusItem) => {
    if (statusItem.allLeadsByAllCompanyType) {
      statusItem.allLeadsByAllCompanyType.forEach((item: any) => {
        if (item.id === selectedFilter) {
          foundById = true;
          const key = item.name; // Still use name as the key
          if (companyTypeMap.has(key)) {
            const existing = companyTypeMap.get(key);
            companyTypeMap.set(key, {
              ...existing,
              value: existing.value + (item.count || 0),
              totalCost: existing.totalCost + (item.budget || 0),
            });
          } else {
            companyTypeMap.set(key, {
              label: item.name,
              value: item.count || 0,
              color: item.color || "#3B82F6",
              totalCost: item.budget || 0,
              id: item.id,
            });
          }
        }
      });
    }
  });

  if (foundById) {
    // console.log("Filter matched COMPANY TYPE ID");
    return Array.from(companyTypeMap.values());
  }

  // No match found - comprehensive debugging info  
  const allCompanyTypeNames: string[] = [];
  const allCompanyTypeIds: string[] = [];
  companyTypeApiData.forEach((statusItem) => {
    if (statusItem.allLeadsByAllCompanyType) {
      statusItem.allLeadsByAllCompanyType.forEach((item: any) => {
        if (!allCompanyTypeNames.includes(item.name)) {
          allCompanyTypeNames.push(item.name);
        }
        if (item.id && !allCompanyTypeIds.includes(item.id)) {
          allCompanyTypeIds.push(item.id);
        }
      });
    }
  });  
  return [];
};

// Helper function to convert subcategory data with filtering
export const convertSubcategoryData = (
  rawData: any[],
  selectedCategory?: string
) => {
  let filteredData = rawData;

  // If a category is selected, filter to only show that category's subcategories
  if (
    selectedCategory &&
    selectedCategory !== "all" &&
    selectedCategory !== ""
  ) {
    filteredData = rawData.filter(
      (category) => category.name === selectedCategory
    );
  }

  // Flatten subcategories and calculate totals
  const subcategoriesWithTotals = filteredData.flatMap((category: any) =>
    (category.subCategories || []).map((subcat: any) => {
      const totalBudget =
        subcat.leads?.reduce(
          (sum: number, lead: any) => sum + (parseFloat(lead.budget) || 0),
          0
        ) || 0;
      const leadCount = subcat.leads?.length || 0;

      return {
        label: subcat.name,
        value: leadCount,
        totalCost: totalBudget,
        count: leadCount,
        categoryName: category.name,
        color: subcat.color || category.color,
      };
    })
  );

  return subcategoriesWithTotals;
};

// Transform monthly data for yearly chart
export const transformYearlyData = (apiData: any[]) => {
  const monthNames = [
    "",
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const statusMap: any = {};

  apiData.forEach((monthEntry) => {
    const monthName =
      monthNames[monthEntry.month] || `Month ${monthEntry.month}`;

    monthEntry.projectsCountByStatus.forEach((status: any) => {
      if (!statusMap[status.name]) {
        statusMap[status.name] = {
          label: status.name,
          color: status.color || "#ccc",
          data: [],
        };
      }
      statusMap[status.name].data.push({
        x: monthName,
        y: status.projectsCount,
      });
    });
  });

  return Object.values(statusMap);
};

export const transformYearlyDatas = (apiData: any[]) => {
  const monthNames = [
    "",
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const sourceMap: Record<
    string,
    { label: string; color: string; data: { x: string; y: number }[] }
  > = {};

  apiData.forEach((monthEntry) => {
    const [year, monthStr] = monthEntry.month.split("-");
    const monthIndex = parseInt(monthStr);
    const monthName = monthNames[monthIndex];

    const seenSources = new Set();

    monthEntry.data.forEach((source: any) => {
      const sourceName = source.name.trim();
      const color = source.color || "#ccc";
      const leadCount = source.leads?.length || 0;

      if (!sourceMap[sourceName]) {
        sourceMap[sourceName] = {
          label: sourceName,
          color,
          data: [],
        };
      }

      sourceMap[sourceName].data.push({ x: monthName, y: leadCount });
      seenSources.add(sourceName);
    });

    // Handle sources that are missing for this month (fill with 0)
    Object.keys(sourceMap).forEach((existingSource) => {
      if (!seenSources.has(existingSource)) {
        sourceMap[existingSource].data.push({ x: monthName, y: 0 });
      }
    });
  });

  return Object.values(sourceMap);
};

export const transformYearlyDataReferralSources = (apiData: any[]) => {
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  // Map to store referral type series data
  const statusMap: Record<
    string,
    {
      label: string;
      color: string;
      data: {
        x: string; // Month name (e.g., "April")
        y: number; // Lead count
        totalBudget: number; // Budget total
      }[];
    }
  > = {};

  // Color map for each referral type
  const statusColorMap: Record<string, string> = {};

  // Monthly referral status data: { monthName -> { referralName -> { count, budget } } }
  const monthlyStatusData: Record<
    string,
    Record<string, { count: number; totalBudget: number }>
  > = {};

  // List of months in API order
  const monthNameList: string[] = [];

  apiData.forEach((monthEntry) => {
    const [_, monthStr] = monthEntry.month.split("-");
    const monthIndex = parseInt(monthStr, 10) - 1;
    const monthName = monthNames[monthIndex];

    // Avoid duplicates in month list
    if (!monthNameList.includes(monthName)) {
      monthNameList.push(monthName);
    }

    if (!monthlyStatusData[monthName]) {
      monthlyStatusData[monthName] = {};
    }

    monthEntry.data.forEach((referralType: any) => {
      const name = referralType.name.trim();
      const color = referralType.color || "#cccccc";
      const referrals = referralType.referrals || [];

      let count = 0;
      let budgetTotal = 0;

      referrals.forEach((ref: any) => {
        count += 1;
        const budget = parseFloat(ref?.lead?.budget || "0");
        budgetTotal += isNaN(budget) ? 0 : budget;
      });

      monthlyStatusData[monthName][name] = {
        count,
        totalBudget: budgetTotal,
      };

      if (!statusColorMap[name]) {
        statusColorMap[name] = color;
      }
    });
  });

  const allStatuses = Object.keys(statusColorMap);

  allStatuses.forEach((statusName) => {
    const statusColor = statusColorMap[statusName];

    statusMap[statusName] = {
      label: statusName,
      color: statusColor,
      data: monthNameList.map((monthName) => {
        const entry = monthlyStatusData[monthName]?.[statusName] || {
          count: 0,
          totalBudget: 0,
        };
        return {
          x: monthName,
          y: entry.count,
          totalBudget: entry.totalBudget,
        };
      }),
    };
  });

  return Object.values(statusMap);
};

export const transformYearlyDataDirectSources = (apiData: any[]) => {
  const statusMap: Record<
    string,
    {
      label: string;
      color: string;
      data: {
        x: string; // Month name
        y: number; // Lead count
        totalBudget: number;
      }[];
    }
  > = {};

  const statusColorMap: Record<string, string> = {};
  const monthNameList: string[] = [];

  const monthlyStatusData: Record<
    string,
    Record<string, { count: number; totalBudget: number }>
  > = {};

  apiData.forEach((monthEntry) => {
    const date = new Date(monthEntry.month + "-01");
    const monthName = date.toLocaleString("default", { month: "long" });

    if (!monthNameList.includes(monthName)) {
      monthNameList.push(monthName);
    }

    if (!monthlyStatusData[monthName]) {
      monthlyStatusData[monthName] = {};
    }

    monthEntry.data.forEach((sourceType: any) => {
      const name = sourceType.name.trim();
      const color = sourceType.color || "#cccccc";
      const leads = sourceType.leads || [];

      let count = 0;
      let budgetTotal = 0;

      leads.forEach((lead: any) => {
        count += 1;
        const budget = parseFloat(lead.budget || "0");
        budgetTotal += isNaN(budget) ? 0 : budget;
      });

      monthlyStatusData[monthName][name] = {
        count,
        totalBudget: budgetTotal,
      };

      if (!statusColorMap[name]) {
        statusColorMap[name] = color;
      }
    });
  });

  const allStatuses = Object.keys(statusColorMap);

  allStatuses.forEach((statusName) => {
    const statusColor = statusColorMap[statusName];

    statusMap[statusName] = {
      label: statusName,
      color: statusColor,
      data: monthNameList.map((monthName) => {
        const entry = monthlyStatusData[monthName]?.[statusName] || {
          count: 0,
          totalBudget: 0,
        };
        return {
          x: monthName,
          y: entry.count,
          totalBudget: entry.totalBudget,
        };
      }),
    };
  });

  return Object.values(statusMap);
};



// Monthly top Leads
export function transformTopLeadsData(rawData: any, groupBy: string = "source") {
  const result: {
    label: string;
    value: number;
    budget: number;
    color: string;
    leads?: any[];
  }[] = [];

  if (!Array.isArray(rawData)) {
    return result;
  }

  // Group leads by the specified criteria
  const groupedData: { [key: string]: any[] } = {};

  rawData.forEach((statusItem: any) => {
    const statusName = statusItem?.name;
    const statusColor = statusItem?.color;

    if (!statusItem?.data) return;

    // Process referral type data
    if (statusItem.data.referralType && Array.isArray(statusItem.data.referralType)) {
      statusItem.data.referralType.forEach((referralType: any) => {
        if (referralType.data && Array.isArray(referralType.data)) {
          referralType.data.forEach((leadItem: any) => {
            const lead = leadItem.lead;
            if (!lead) return;

            let groupKey = "";
            
            // Determine grouping key based on groupBy parameter
            switch (groupBy) {
              case "source":
                // Group by referral type name
                groupKey = referralType.name || "Unknown Source";
                break;
              case "category":
                // Group by project category (you might need to fetch this from lead data)
                groupKey = lead.projectCategoryName || "Unknown Category";
                break;
              case "service":
                // Group by service (you might need to fetch this from lead data)
                groupKey = lead.serviceName || "Unknown Service";
                break;
              case "status":
                // Group by status
                groupKey = statusName || "Unknown Status";
                break;
              default:
                groupKey = referralType.name || "Unknown";
            }

            if (!groupedData[groupKey]) {
              groupedData[groupKey] = [];
            }

            groupedData[groupKey].push({
              ...lead,
              statusName,
              statusColor,
              referralTypeName: referralType.name,
              sourceType: "referral"
            });
          });
        }
      });
    }

    // Process direct source data (if it has leads)
    if (statusItem.data.directSource && Array.isArray(statusItem.data.directSource)) {
      statusItem.data.directSource.forEach((directSource: any) => {
        if (directSource.data && Array.isArray(directSource.data)) {
          directSource.data.forEach((leadItem: any) => {
            const lead = leadItem.lead;
            if (!lead) return;

            let groupKey = "";
            
            switch (groupBy) {
              case "source":
                groupKey = directSource.name || "Unknown Source";
                break;
              case "category":
                groupKey = lead.projectCategoryName || "Unknown Category";
                break;
              case "service":
                groupKey = lead.serviceName || "Unknown Service";
                break;
              case "status":
                groupKey = statusName || "Unknown Status";
                break;
              default:
                groupKey = directSource.name || "Unknown";
            }

            if (!groupedData[groupKey]) {
              groupedData[groupKey] = [];
            }

            groupedData[groupKey].push({
              ...lead,
              statusName,
              statusColor,
              directSourceName: directSource.name,
              sourceType: "direct"
            });
          });
        }
      });
    }
  });

  // Convert grouped data to chart format
  Object.entries(groupedData).forEach(([key, leads]) => {
    const totalBudget = leads.reduce((sum, lead) => {
      const budget = parseFloat(lead.budget || "0");
      return sum + budget;
    }, 0);

    const count = leads.length;
    
    // Use the first lead's color or a default color
    const color = leads[0]?.statusColor || getRandomColor();

    result.push({
      label: key,
      value: count,
      budget: totalBudget,
      color: color,
      leads: leads
    });
  });

  // Sort by count descending and take top 10
  const sortedResult = result
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  return sortedResult;
}

// Helper function to generate random colors for missing color data
function getRandomColor(): string {
  const colors = [
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7",
    "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9"
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Alternative function if you want to group by multiple criteria
export function transformTopLeadsDataAdvanced(rawData: any, filters: {
  groupBy: string;
  status?: string;
  referralType?: string;
  directSource?: string;
}) {
  const result: {
    label: string;
    value: number;
    budget: number;
    color: string;
    leads?: any[];
  }[] = [];

  if (!Array.isArray(rawData)) {
    return result;
  }

  const groupedData: { [key: string]: any[] } = {};

  rawData.forEach((statusItem: any) => {
    const statusName = statusItem?.name;
    const statusColor = statusItem?.color;

    // Filter by status if specified
    if (filters.status && filters.status !== "all" && statusName !== filters.status) {
      return;
    }

    if (!statusItem?.data) return;

    // Process referral type data
    if (statusItem.data.referralType && Array.isArray(statusItem.data.referralType)) {
      statusItem.data.referralType.forEach((referralType: any) => {
        // Filter by referral type if specified
        if (filters.referralType && filters.referralType !== "all" && referralType.name !== filters.referralType) {
          return;
        }

        if (referralType.data && Array.isArray(referralType.data)) {
          referralType.data.forEach((leadItem: any) => {
            const lead = leadItem.lead;
            if (!lead) return;

            let groupKey = getGroupKey(lead, referralType, null, statusName, filters.groupBy);

            if (!groupedData[groupKey]) {
              groupedData[groupKey] = [];
            }

            groupedData[groupKey].push({
              ...lead,
              statusName,
              statusColor,
              referralTypeName: referralType.name,
              sourceType: "referral"
            });
          });
        }
      });
    }

    // Process direct source data
    if (statusItem.data.directSource && Array.isArray(statusItem.data.directSource)) {
      statusItem.data.directSource.forEach((directSource: any) => {
        // Filter by direct source if specified
        if (filters.directSource && filters.directSource !== "all" && directSource.name !== filters.directSource) {
          return;
        }

        if (directSource.data && Array.isArray(directSource.data)) {
          directSource.data.forEach((leadItem: any) => {
            const lead = leadItem.lead;
            if (!lead) return;

            let groupKey = getGroupKey(lead, null, directSource, statusName, filters.groupBy);

            if (!groupedData[groupKey]) {
              groupedData[groupKey] = [];
            }

            groupedData[groupKey].push({
              ...lead,
              statusName,
              statusColor,
              directSourceName: directSource.name,
              sourceType: "direct"
            });
          });
        }
      });
    }
  });

  // Convert to chart format
  Object.entries(groupedData).forEach(([key, leads]) => {
    const totalBudget = leads.reduce((sum, lead) => {
      const budget = parseFloat(lead.budget || "0");
      return sum + budget;
    }, 0);

    const count = leads.length;
    const color = leads[0]?.statusColor || getRandomColor();

    result.push({
      label: key,
      value: count,
      budget: totalBudget,
      color: color,
      leads: leads
    });
  });

  return result
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
}

// Helper function to determine group key
function getGroupKey(lead: any, referralType: any, directSource: any, statusName: string, groupBy: string): string {
  switch (groupBy) {
    case "source":
      return referralType?.name || directSource?.name || "Unknown Source";
    case "category":
      return lead.projectCategoryName || "Unknown Category";
    case "service":
      return lead.serviceName || "Unknown Service";
    case "status":
      return statusName || "Unknown Status";
    case "title":
      return lead.title || "Unknown Title";
    case "company":
      return lead.companyName || "Unknown Company";
    default:
      return referralType?.name || directSource?.name || "Unknown";
  }
}