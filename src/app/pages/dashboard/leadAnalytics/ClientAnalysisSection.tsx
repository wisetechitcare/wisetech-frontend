import React, { useEffect, useState } from "react";
import dayjs from "dayjs";
import AnalyticsCard from "./AnalyticsCard";
import AnalyticsHeader from "./AnalyticsHeader";
import RankedBarChart from "./RankedBarChart";
import { ChartDatum } from "./leadAnalyticsUtils";
import { getLeadsByExternalReferralAnalytics } from "@services/lead";
import { convertToChartData } from "@utils/leadsProjectCompaniesStatistics";
import { ChartDialogModal } from "@pages/employee/leads/overview/components/ChartDialogModal";

interface Props {
  /** Formatted range (YYYY-MM-DD) — must match the other analytics calls on the page. */
  startDate: string;
  endDate: string;
}

const isEmpty = (d?: ChartDatum[]) =>
  !d || d.length === 0 || d.every((x) => !x.value || x.value <= 0);

const NA = "__NA__";
type ViewKey = "companyType" | "company" | "contact";

/**
 * Client Analysis — one full-width ranked bar chart with a segmented toggle to
 * switch between three breakdowns, all sourced from EXTERNAL referrals
 * (Referral Details → External):
 *   • By Company Type (referring company's type)
 *   • By Company (referring company)
 *   • By Contact (referring contact)
 *
 * A single full-width chart (instead of three cramped columns) gives long company
 * and contact names room to breathe. Self-contained: fetches its own analytics for
 * the given range so pages only drop it in with the dates they already compute.
 */
const ClientAnalysisSection: React.FC<Props> = ({ startDate, endDate }) => {
  const [companyTypeData, setCompanyTypeData] = useState<ChartDatum[]>([]);
  const [companyData, setCompanyData] = useState<ChartDatum[]>([]);
  const [contactData, setContactData] = useState<ChartDatum[]>([]);
  const [view, setView] = useState<ViewKey>("companyType");

  useEffect(() => {
    if (!startDate || !endDate) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await getLeadsByExternalReferralAnalytics(startDate, endDate);
        if (cancelled) return;

        const payload = res?.data || {};
        // All three breakdowns are flat { name, count, color, totalBudget }.
        setCompanyTypeData(convertToChartData(payload.companyType || [], "count", "name", "totalBudget"));
        setCompanyData(convertToChartData(payload.company || [], "count", "name", "totalBudget"));
        setContactData(convertToChartData(payload.contact || [], "count", "name", "totalBudget"));
      } catch {
        if (cancelled) return;
        setCompanyTypeData([]);
        setCompanyData([]);
        setContactData([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [startDate, endDate]);

  const views: {
    key: ViewKey;
    label: string;
    icon: string;
    accent: string;
    data: ChartDatum[];
    barColor?: string;
    title: string;
    emptyHint: string;
  }[] = [
    {
      key: "companyType",
      label: "Company Type",
      icon: "bi-diagram-3",
      accent: "#6366F1",
      data: companyTypeData,
      title: "Leads by Company Type",
      emptyHint: "No company-type data for this period.",
    },
    {
      key: "company",
      label: "Company",
      icon: "bi-building",
      accent: "#0EA5E9",
      data: companyData,
      barColor: "#0EA5E9",
      title: "Leads by Company",
      emptyHint: "No company data for this period.",
    },
    {
      key: "contact",
      label: "Contact",
      icon: "bi-person",
      accent: "#8B5CF6",
      data: contactData,
      barColor: "#8B5CF6",
      title: "Leads by Contact",
      emptyHint: "No contact data for this period.",
    },
  ];

  const activeView = views.find((v) => v.key === view) || views[0];
  const totalLeads = activeView.data.reduce((sum, d) => sum + (d.value || 0), 0);

  // Drill-down: each bar's ChartDatum already carries the real backend id (the
  // companyTypeId / referringCompanyId / referredByContactId, or the "__NA__"
  // sentinel — see getLeadsByExternalReferralAnalytics), so we look it up by the
  // clicked label instead of re-fetching or matching on name alone.
  const [drill, setDrill] = useState<{ open: boolean; mode: ViewKey; id?: string; title?: string }>({
    open: false,
    mode: "companyType",
  });

  const handleSelect = (label: string) => {
    const found = activeView.data.find((d) => d.label === label);
    setDrill({
      open: true,
      mode: view,
      id: found?.id || NA,
      title: `${activeView.title} · ${label}`,
    });
  };

  const drillStart = startDate ? dayjs(startDate) : undefined;
  const drillEnd = endDate ? dayjs(endDate) : undefined;

  const segmentedToggle = (
    <div
      style={{
        display: "flex",
        gap: 4,
        padding: 4,
        background: "#EEF2F7",
        borderRadius: 12,
        flexWrap: "wrap",
      }}
    >
      {views.map((v) => {
        const isActive = v.key === view;
        return (
          <button
            key={v.key}
            type="button"
            onClick={() => setView(v.key)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              whiteSpace: "nowrap",
              border: "none",
              cursor: "pointer",
              padding: "7px 14px",
              borderRadius: 9,
              fontFamily: "Inter, sans-serif",
              fontWeight: 600,
              fontSize: 13,
              color: isActive ? v.accent : "#64748B",
              background: isActive ? "#FFFFFF" : "transparent",
              boxShadow: isActive ? "0 1px 3px rgba(15,23,42,0.10)" : "none",
              transition: "all 0.18s ease",
            }}
          >
            <i className={`bi ${v.icon}`} style={{ fontSize: 14, color: isActive ? v.accent : "#94A3B8" }} />
            {v.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <AnalyticsHeader
        title="Client Analysis"
        subtitle="Which clients and segments generate the most leads"
        icon="bi-buildings"
        accent="#EC4899"
      />
      <AnalyticsCard
        title={`By ${activeView.label}`}
        subtitle={
          isEmpty(activeView.data)
            ? "Ranked by lead volume"
            : `Ranked by lead volume · ${activeView.data.length} groups · ${totalLeads} referral leads`
        }
        index={0}
        isEmpty={isEmpty(activeView.data)}
        emptyHint={activeView.emptyHint}
        headerRight={segmentedToggle}
      >
        <RankedBarChart
          key={activeView.key}
          data={activeView.data}
          onSelect={handleSelect}
          valueLabel
          height={400}
          barColor={activeView.barColor}
          title={activeView.title}
        />
      </AnalyticsCard>

      <ChartDialogModal
        open={drill.open}
        onClose={() => setDrill((s) => ({ ...s, open: false }))}
        title={drill.title}
        referralCompanyTypeId={drill.mode === "companyType" ? drill.id : undefined}
        referralCompanyId={drill.mode === "company" ? drill.id : undefined}
        referralContactId={drill.mode === "contact" ? drill.id : undefined}
        startDate={drillStart}
        endDate={drillEnd}
      />
    </section>
  );
};

export default React.memo(ClientAnalysisSection);
