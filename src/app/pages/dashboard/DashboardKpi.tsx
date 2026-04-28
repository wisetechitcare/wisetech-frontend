import { resourceNameMapWithCamelCase } from "@constants/statistics";
import KpiGraphicalToggle from "@pages/employee/kpis/personal/views/my-kpi/KpiGraphicalToggle";
import { ToggleItemsCallBackFunctions } from "@pages/employee/kpis/personal/views/my-kpi/KpiGraphicalToggle";
import { Dayjs } from "dayjs";
import {
  fetchEmpDailyKpiStatistics,
  fetchEmpMonthlyKpiStatistics,
  fetchEmpWeeklyKpiStatistics,
  fetchEmpAllTimeKpiStatistics,
  fetchEmpYearlyKpiStatistics,
} from "@utils/statistics";
import { fetchConfiguration } from "@services/company";
import { DATE_SETTINGS_KEY } from "@constants/configurations-key";
import { useEffect, useState, memo } from "react";
import { Container } from "react-bootstrap";

const DashboardKpi = memo(({ fromAdmin = false }: { fromAdmin?: boolean }) => {
  const [dateSettingsEnabled, setDateSettingsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDateSettings() {
      try {
        const {
          data: { configuration },
        } = await fetchConfiguration(DATE_SETTINGS_KEY);
        const parsed =
          typeof configuration.configuration === "string"
            ? JSON.parse(configuration.configuration)
            : configuration.configuration;
        setDateSettingsEnabled(parsed?.useDateSettings ?? false);
      } catch (err) {
        console.error("Error fetching date settings", err);
        setDateSettingsEnabled(false);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDateSettings();
  }, []);

  const toggleItemsActions: ToggleItemsCallBackFunctions = {
    daily: function (day: Dayjs): void {
      fetchEmpDailyKpiStatistics(day, fromAdmin);
    },
    weekly: function (startWeek: Dayjs, endWeek: Dayjs): void {
      fetchEmpWeeklyKpiStatistics(startWeek, endWeek, fromAdmin);
    },
    monthly: function (month: Dayjs, endDate: Dayjs): void {
      fetchEmpMonthlyKpiStatistics(month, fromAdmin, {
        startDate: month.startOf("month"),
        endDate,
      });
    },
    yearly: function (year: Dayjs, endDate: Dayjs): void {
      fetchEmpYearlyKpiStatistics(year, fromAdmin, {
        startDate: year.startOf("year"),
        endDate,
      });
    },

    alltime: function (): void {
      fetchEmpAllTimeKpiStatistics(fromAdmin);
    },
    custom: function (startDate: Dayjs, endDate: Dayjs): void {
      fetchEmpYearlyKpiStatistics(startDate, fromAdmin, {
        startDate,
        endDate,
      });
    },
  };

  if (isLoading) {
    return (
      <Container
        fluid
        className="my-4 w-100 px-0 d-flex justify-content-center align-items-center"
        style={{ minHeight: "300px" }}
      >
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </Container>
    );
  }

  const resourseAndView = [
    {
      resource: resourceNameMapWithCamelCase.kpi,
      viewOwn: true,
      viewOthers: false,
    }
  ];

  return (
    <div
      className="card border-0 rounded-3 dashboard-kpi-container"
      style={{ boxShadow: '8px 8px 16px 0px rgba(0,0,0,0.04)' }}
    >
      <style>{`
        .dashboard-kpi-container .d-flex.flex-column.mb-10 {
          display: none !important;
        }
      `}</style>
      <div className="card-body p-3 p-md-4">
        <h5
          className="fw-semibold mb-4"
          style={{
            fontFamily: 'Barlow',
            fontSize: '20px',
            letterSpacing: '0.2px'
          }}
        >
          My KPI
        </h5>
        <KpiGraphicalToggle
          toggleItemsActions={toggleItemsActions}
          fromAdmin={fromAdmin}
          resourseAndView={resourseAndView}
          dateSettingsEnabled={dateSettingsEnabled}
          dashboardView={false}
        />
      </div>
    </div>
  );
});

DashboardKpi.displayName = 'DashboardKpi';

export default DashboardKpi;
