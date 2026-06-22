/**
 * Project Analytics Utilities — pure functions for project execution data transformation.
 * Focus: Project lifecycle, execution, delivery, billing, risk, and operations.
 * Different business domain from Lead Analytics (sales) → Project Analytics (PMO/execution).
 */

export interface ProjectStatus {
  name: string;
  count: number;
  budget?: number;
}

export interface ProjectHealthMetric {
  label: string;
  value: number;
  status: "healthy" | "at-risk" | "delayed" | "critical";
  color: string;
  icon: string;
}

export interface ProjectPipelineStage {
  stage: string;
  projectCount: number;
  totalValue: number;
  avgDuration: number;
  bottleneck?: boolean;
}

export interface ProjectKpi {
  label: string;
  value: number | string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  accent: string;
  icon: string;
  trend?: number;
  trendDirection?: "up" | "down";
}

/**
 * Build project KPIs from status data.
 * Reflects project lifecycle: Received → Planning → Execution → Billing → Completion.
 */
export const buildProjectCommandCenterKpis = (statusData: ProjectStatus[]): ProjectKpi[] => {
  const totalProjects = statusData.reduce((sum, s) => sum + s.count, 0);
  const totalContractValue = statusData.reduce((sum, s) => sum + (s.budget || 0), 0);

  // Map statuses to lifecycle stages
  const completed = statusData.find(s => s.name?.toLowerCase().includes("completed"))?.count || 0;
  const delayed = statusData.find(s => s.name?.toLowerCase().includes("delayed"))?.count || 0;
  const onHold = statusData.find(s => s.name?.toLowerCase().includes("hold"))?.count || 0;
  const active = totalProjects - completed - onHold;

  const billedAmount = (totalContractValue * 0.65); // Assumption: 65% typical billing
  const pendingBilling = totalContractValue - billedAmount;

  return [
    {
      label: "Active Projects",
      value: active,
      accent: "#3B82F6",
      icon: "bi-play-circle-fill",
      trend: 12,
      trendDirection: "up",
    },
    {
      label: "Completed",
      value: completed,
      accent: "#10B981",
      icon: "bi-check-circle-fill",
      trend: 8,
      trendDirection: "up",
    },
    {
      label: "Delayed",
      value: delayed,
      accent: "#F59E0B",
      icon: "bi-exclamation-circle-fill",
      trend: -5,
      trendDirection: "down",
    },
    {
      label: "On Hold",
      value: onHold,
      accent: "#8B5CF6",
      icon: "bi-pause-circle-fill",
    },
    {
      label: "Contract Value",
      value: totalContractValue,
      prefix: "₹",
      decimals: 0,
      accent: "#059669",
      icon: "bi-cash-stack",
    },
    {
      label: "Billed Amount",
      value: billedAmount,
      prefix: "₹",
      decimals: 0,
      accent: "#06B6D4",
      icon: "bi-receipt",
    },
    {
      label: "Pending Billing",
      value: pendingBilling,
      prefix: "₹",
      decimals: 0,
      accent: "#EC4899",
      icon: "bi-hourglass-split",
    },
    {
      label: "Collection Outstanding",
      value: pendingBilling * 0.3, // Assumption: 30% outstanding
      prefix: "₹",
      decimals: 0,
      accent: "#EF4444",
      icon: "bi-exclamation-triangle-fill",
    },
  ];
};

/**
 * Build project pipeline stages (lifecycle flow).
 * Projects flow: Received → Planning → Execution → QA → Billing → Completed.
 */
export const buildProjectPipelineStages = (statusData: ProjectStatus[]): ProjectPipelineStage[] => {
  const stageMapping: { [key: string]: string } = {
    "received": "Received",
    "planning": "Planning",
    "execution": "Execution",
    "qa": "QA",
    "billing": "Billing",
    "completed": "Completed",
  };

  const stages: ProjectPipelineStage[] = [];
  const avgDurations: { [key: string]: number } = {
    "Received": 5,
    "Planning": 14,
    "Execution": 45,
    "QA": 7,
    "Billing": 3,
    "Completed": 0,
  };

  statusData.forEach(status => {
    const statusLower = status.name?.toLowerCase() || "";
    const stageName = Object.entries(stageMapping).find(([key]) =>
      statusLower.includes(key)
    )?.[1];

    if (stageName) {
      stages.push({
        stage: stageName,
        projectCount: status.count,
        totalValue: status.budget || 0,
        avgDuration: avgDurations[stageName] || 10,
        bottleneck: status.count > 50, // Flag bottleneck if >50 projects
      });
    }
  });

  // Ensure all stages exist in order
  const orderedStages = ["Received", "Planning", "Execution", "QA", "Billing", "Completed"]
    .map(stage => stages.find(s => s.stage === stage) || {
      stage,
      projectCount: 0,
      totalValue: 0,
      avgDuration: avgDurations[stage],
    });

  return orderedStages as ProjectPipelineStage[];
};

/**
 * Calculate project health scores for matrix visualization.
 * Categorize projects as Healthy / At Risk / Delayed / Critical.
 */
export const calculateProjectHealthMetrics = (statusData: ProjectStatus[]): ProjectHealthMetric[] => {
  const metrics: ProjectHealthMetric[] = [];
  const totalProjects = statusData.reduce((sum, s) => sum + s.count, 0);

  statusData.forEach(status => {
    const percentage = (status.count / totalProjects) * 100;
    let healthStatus: "healthy" | "at-risk" | "delayed" | "critical" = "healthy";
    let color = "#10B981";
    let icon = "bi-check-circle";

    const statusLower = status.name?.toLowerCase() || "";
    if (statusLower.includes("delayed")) {
      healthStatus = "delayed";
      color = "#F59E0B";
      icon = "bi-exclamation-circle";
    } else if (statusLower.includes("critical")) {
      healthStatus = "critical";
      color = "#EF4444";
      icon = "bi-x-circle";
    } else if (statusLower.includes("risk")) {
      healthStatus = "at-risk";
      color = "#FB923C";
      icon = "bi-exclamation-triangle";
    }

    metrics.push({
      label: status.name || "Unknown",
      value: percentage,
      status: healthStatus,
      color,
      icon,
    });
  });

  return metrics;
};

/**
 * Format Indian currency for display.
 */
export const formatINRShort = (value: number): string => {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return `₹${value.toFixed(0)}`;
};

/**
 * Generate project-specific insights based on execution data.
 */
export const generateProjectInsights = (
  statusData: ProjectStatus[],
  categoryData: any[],
  teamData: any[]
): string[] => {
  const insights: string[] = [];
  const totalProjects = statusData.reduce((sum, s) => sum + s.count, 0);

  // Insight 1: Overall completion rate
  const completed = statusData.find(s => s.name?.toLowerCase().includes("completed"))?.count || 0;
  const completionRate = ((completed / totalProjects) * 100).toFixed(0);
  insights.push(`${completionRate}% of projects have been successfully completed this period.`);

  // Insight 2: Delayed projects alert
  const delayed = statusData.find(s => s.name?.toLowerCase().includes("delayed"))?.count || 0;
  if (delayed > 0) {
    const delayRate = ((delayed / totalProjects) * 100).toFixed(0);
    insights.push(`⚠️ ${delayRate}% of active projects are running behind schedule.`);
  }

  // Insight 3: Top performing category
  if (categoryData && categoryData.length > 0) {
    const topCategory = categoryData.reduce((max, c) =>
      (c.count || 0) > (max.count || 0) ? c : max
    );
    insights.push(`${topCategory.name} projects are the highest volume category this quarter.`);
  }

  // Insight 4: Resource utilization
  if (teamData && teamData.length > 0) {
    const avgTeamProjects = (totalProjects / teamData.length).toFixed(0);
    insights.push(`Average project load per team member: ${avgTeamProjects} projects.`);
  }

  // Insight 5: Bottleneck detection
  const executionProjects = statusData.find(s => s.name?.toLowerCase().includes("execution"))?.count || 0;
  if (executionProjects > totalProjects * 0.4) {
    insights.push(`🔴 Execution phase contains ${((executionProjects / totalProjects) * 100).toFixed(0)}% of workload — potential bottleneck.`);
  }

  return insights.slice(0, 5);
};
