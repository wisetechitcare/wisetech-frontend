import { useEffect, useState } from "react";
import { Dayjs } from "dayjs";
import { getProjectTeamCount, getProjectExternalTeamCount } from "@services/projects";
import { convertToChartData } from "@utils/leadsProjectCompaniesStatistics";
import AnalyticsHeader from "@pages/dashboard/leadAnalytics/AnalyticsHeader";
import AnalyticsCard from "@pages/dashboard/leadAnalytics/AnalyticsCard";
import RankedBarChart from "@pages/dashboard/leadAnalytics/RankedBarChart";
import { ChartDatum } from "@pages/dashboard/leadAnalytics/leadAnalyticsUtils";
import { ChartDialogModal } from "@pages/employee/leads/overview/components/ChartDialogModal";

type ExternalMode = "companyType" | "company" | "contact";
const NA = "__NA__";
const MODE_LABEL: Record<ExternalMode, string> = {
  companyType: "Company Type",
  company: "Company",
  contact: "Contact",
};

const isEmpty = (d?: ChartDatum[]) =>
  !d || d.length === 0 || d.every((x) => !x.value || x.value <= 0);

/**
 * Team Analysis — two drill-down project charts, each with an NA bucket:
 *   • Projects by Internal Team — execution team; NA = no team assigned.
 *   • Projects by External Team — toggle Company Type / Company / Contact
 *     (mirrors the Client Analysis toggle); NA = no external team.
 * Sourced from getProjectTeamCount + getProjectExternalTeamCount (received/project
 * scope). Clicking a bar (incl. NA) opens the filtered project list.
 */
const ProjectTeamsSection = ({
  startDate,
  endDate,
}: {
  startDate?: Dayjs;
  endDate?: Dayjs;
}) => {
  const startStr = startDate ? startDate.format("YYYY-MM-DD") : "";
  const endStr = endDate ? endDate.format("YYYY-MM-DD") : "";

  const [internalData, setInternalData] = useState<ChartDatum[]>([]);
  const [internalRaw, setInternalRaw] = useState<any[]>([]);
  const [externalMode, setExternalMode] = useState<ExternalMode>("companyType");
  const [externalData, setExternalData] = useState<ChartDatum[]>([]);
  const [externalRaw, setExternalRaw] = useState<any[]>([]);

  const [teamDrill, setTeamDrill] = useState<{ open: boolean; id?: string; title?: string }>({ open: false });
  const [extDrill, setExtDrill] = useState<{ open: boolean; mode: ExternalMode; id?: string; title?: string }>({
    open: false,
    mode: "companyType",
  });

  useEffect(() => {
    if (!startStr || !endStr) return;
    let active = true;
    getProjectTeamCount(startStr, endStr)
      .then((r: any) => {
        if (!active) return;
        const rows = r?.projectCountByTeams || [];
        setInternalRaw(rows);
        // Drop 0-count teams; the NA bucket (added by the API only when >0) stays.
        setInternalData(convertToChartData(rows, "projectsCount", "name", "budget").filter((d) => d.value > 0));
      })
      .catch(() => {
        if (active) {
          setInternalRaw([]);
          setInternalData([]);
        }
      });
    return () => {
      active = false;
    };
  }, [startStr, endStr]);

  useEffect(() => {
    if (!startStr || !endStr) return;
    let active = true;
    getProjectExternalTeamCount(startStr, endStr, externalMode)
      .then((r: any) => {
        if (!active) return;
        const rows = r?.projectCountByExternalTeam || [];
        setExternalRaw(rows);
        setExternalData(convertToChartData(rows, "projectsCount", "name", "budget").filter((d) => d.value > 0));
      })
      .catch(() => {
        if (active) {
          setExternalRaw([]);
          setExternalData([]);
        }
      });
    return () => {
      active = false;
    };
  }, [startStr, endStr, externalMode]);

  const onInternalClick = (label: string) => {
    const found = internalRaw.find((t: any) => t.name === label);
    setTeamDrill({ open: true, id: found?.id || NA, title: `Internal Team · ${label}` });
  };
  const onExternalClick = (label: string) => {
    const found = externalRaw.find((t: any) => t.name === label);
    setExtDrill({
      open: true,
      mode: externalMode,
      id: found?.id || NA,
      title: `External ${MODE_LABEL[externalMode]} · ${label}`,
    });
  };

  const toggle = (
    <div
      style={{
        display: "inline-flex",
        background: "#F8FAFC",
        borderRadius: 10,
        padding: 4,
        gap: 4,
        border: "1px solid #E2E8F0",
        boxShadow: "0 1px 3px rgba(15,23,42,0.08)",
      }}
    >
      {(Object.keys(MODE_LABEL) as ExternalMode[]).map((m) => {
        const active = externalMode === m;
        return (
          <button
            key={m}
            type="button"
            onClick={() => setExternalMode(m)}
            style={{
              border: "none",
              cursor: "pointer",
              padding: "6px 12px",
              borderRadius: 8,
              fontFamily: "Inter, sans-serif",
              fontSize: 12,
              fontWeight: active ? 600 : 500,
              color: active ? "#1E40AF" : "#64748B",
              background: active ? "#fff" : "transparent",
              boxShadow: active ? "0 2px 4px rgba(15,23,42,0.08)" : "none",
              whiteSpace: "nowrap",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              if (!active) {
                e.currentTarget.style.background = "#F1F5F9";
              }
            }}
            onMouseLeave={(e) => {
              if (!active) {
                e.currentTarget.style.background = "transparent";
              }
            }}
          >
            {MODE_LABEL[m]}
          </button>
        );
      })}
    </div>
  );

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <AnalyticsHeader
        title="Team Analysis"
        subtitle="Projects by internal execution team and external stakeholders — NA = none assigned"
        icon="bi-people"
        accent="#F59E0B"
      />
      <div className="row g-3">
        <div className="col-12 col-lg-6">
          <AnalyticsCard
            title="Projects by Internal Team"
            subtitle="Execution team · NA = no team assigned"
            index={0}
            isEmpty={isEmpty(internalData)}
            emptyHint="No projects with an execution team in this period."
          >
            <RankedBarChart data={internalData} onSelect={onInternalClick} valueLabel />
          </AnalyticsCard>
        </div>
        <div className="col-12 col-lg-6">
          <AnalyticsCard
            title="Projects by External Team"
            subtitle={`Grouped by ${MODE_LABEL[externalMode]} · NA = no external team`}
            index={1}
            isEmpty={isEmpty(externalData)}
            emptyHint="No external-team data in this period."
            headerRight={toggle}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 16, height: "100%" }}>
              <RankedBarChart data={externalData} onSelect={onExternalClick} valueLabel />
            </div>
          </AnalyticsCard>
        </div>
      </div>

      <ChartDialogModal
        open={teamDrill.open}
        onClose={() => setTeamDrill((s) => ({ ...s, open: false }))}
        title={teamDrill.title}
        teamId={teamDrill.id}
        startDate={startDate}
        endDate={endDate}
        receivedOnly
        entityScope="project"
      />
      <ChartDialogModal
        open={extDrill.open}
        onClose={() => setExtDrill((s) => ({ ...s, open: false }))}
        title={extDrill.title}
        externalCompanyTypeId={extDrill.mode === "companyType" ? extDrill.id : undefined}
        externalCompanyId={extDrill.mode === "company" ? extDrill.id : undefined}
        externalContactId={extDrill.mode === "contact" ? extDrill.id : undefined}
        startDate={startDate}
        endDate={endDate}
        receivedOnly
        entityScope="project"
      />
    </section>
  );
};

export default ProjectTeamsSection;
