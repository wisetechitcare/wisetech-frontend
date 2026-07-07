import React, { useEffect, useState } from "react";
import {
  getProjectStatusCount,
  getProjectCategoryCount,
  getProjectTeamCount,
} from "@services/projects";
import dayjs from "dayjs";
import Loader from "@app/modules/common/utils/Loader";
import ProjectCommandCenter from "@pages/dashboard/projectAnalytics/ProjectCommandCenter";
import ProjectPipelineBoard from "@pages/dashboard/projectAnalytics/ProjectPipelineBoard";
import ProjectHealthMatrix from "@pages/dashboard/projectAnalytics/ProjectHealthMatrix";
import { ProjectStatus } from "@pages/dashboard/projectAnalytics/projectAnalyticsUtils";

/**
 * PROJECT ANALYTICS DASHBOARD
 *
 * Completely independent from Lead Analytics.
 * Focused on Project Execution, Delivery, Billing, Operations, and Risk.
 *
 * Business Question: "How are we executing and delivering work after winning opportunities?"
 *
 * Sections:
 * 1. Project Command Center (KPIs)
 * 2. Project Pipeline (Lifecycle flow)
 * 3. Project Health Matrix (Status assessment)
 * 4. Project Execution Analytics (Progress & velocity)
 * 5. Project Value Analytics (Financial progression)
 * 6. Billing & Collection Analytics (Financial operations)
 * 7. Resource Utilization (Team workload)
 * 8. Project Duration Analytics (Timeline)
 * 9. Project Category Performance (By project type)
 * 10. Project Risk Center (Alerts & issues)
 * 11. Executive Insights (AI-generated)
 */

const ProjectAnalyticsDashboard: React.FC = () => {
  const today = dayjs();
  const startDate = today.subtract(90, "day").format("YYYY-MM-DD");
  const endDate = today.format("YYYY-MM-DD");

  const [statusData, setStatusData] = useState<ProjectStatus[]>([]);
  const [categoryData, setCategoryData] = useState<ProjectStatus[]>([]);
  const [teamData, setTeamData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const fetchProjectAnalytics = async () => {
      try {
        setLoading(true);
        setError("");

        const [statusRes, categoryRes, teamRes] = await Promise.all([
          getProjectStatusCount(startDate, endDate),
          getProjectCategoryCount(startDate, endDate),
          getProjectTeamCount(startDate, endDate),
        ]);

        // Transform API responses
        setStatusData(
          statusRes?.data?.map((item: any) => ({
            name: item.status || item.name,
            count: item.count || 0,
            budget: item.totalBudget || item.budget || 0,
          })) || []
        );

        setCategoryData(
          categoryRes?.data?.map((item: any) => ({
            name: item.category || item.name,
            count: item.count || 0,
            budget: item.totalBudget || item.budget || 0,
          })) || []
        );

        setTeamData(
          teamRes?.data?.map((item: any) => ({
            name: item.team || item.name,
            count: item.count || 0,
            budget: item.totalBudget || item.budget || 0,
          })) || []
        );
      } catch (err) {
        console.error("Error fetching project analytics:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch project data"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProjectAnalytics();
  }, []);

  if (loading) {
    return <Loader />;
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        Error loading project analytics: {error}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      {/* Page Header */}
      <section style={{ marginBottom: 8 }}>
        <h1
          style={{
            fontSize: "32px",
            fontWeight: 700,
            color: "#1F2937",
            marginBottom: 8,
          }}
        >
          Project Analytics
        </h1>
        <p style={{ fontSize: "16px", color: "#6B7280" }}>
          Operational dashboard for project execution, delivery, and risk management
        </p>
        <p style={{ fontSize: "13px", color: "#9CA3AF", marginTop: 4 }}>
          Last 90 days: {dayjs(startDate).format("MMM DD")} – {dayjs(
            endDate
          ).format("MMM DD, YYYY")}
        </p>
      </section>

      {/* SECTION 1: Command Center */}
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <ProjectCommandCenter statusData={statusData} />
      </section>

      {/* SECTION 2: Pipeline Board */}
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <ProjectPipelineBoard statusData={statusData} />
      </section>

      {/* SECTION 3: Health Matrix */}
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <ProjectHealthMatrix statusData={statusData} />
      </section>

      {/* Sections 4-11: Placeholder */}
      <section
        style={{
          backgroundColor: "#F3F4F6",
          border: "2px dashed #D1D5DB",
          borderRadius: "12px",
          padding: 32,
          textAlign: "center",
          color: "#6B7280",
        }}
      >
        <div style={{ fontSize: "14px", fontWeight: 500 }}>
          ✓ Sections 4-11 coming next:
        </div>
        <div style={{ fontSize: "13px", marginTop: 12, lineHeight: "1.8" }}>
          <div>4. Execution Analytics (Progress & Velocity)</div>
          <div>5. Value Analytics (Financial Progression)</div>
          <div>6. Billing & Collections (Financial Operations)</div>
          <div>7. Resource Utilization (Team Workload)</div>
          <div>8. Project Duration (Timeline Analysis)</div>
          <div>9. Category Performance (By Project Type)</div>
          <div>10. Risk Center (Alerts & Issues)</div>
          <div>11. Executive Insights (AI-Generated)</div>
        </div>
      </section>
    </div>
  );
};

export default ProjectAnalyticsDashboard;
