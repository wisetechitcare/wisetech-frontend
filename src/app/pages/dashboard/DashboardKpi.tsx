import { safeJsonParse } from '@utils/safeJson';
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
import { Box, CircularProgress, Typography } from "@mui/material";
import { GlassCard } from "@app/modules/common/components/ui";

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
          typeof configuration?.configuration === "string"
            ? safeJsonParse(configuration.configuration)
            : configuration?.configuration;
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
      <Box
        className="my-4 w-100"
        sx={{
          minHeight: 300,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          px: 0,
        }}
      >
        <CircularProgress size={36} />
      </Box>
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
    <GlassCard preset="section" sx={{ overflow: "hidden" }}>
      <style>{`
        .dashboard-kpi-container .d-flex.flex-column.mb-10 {
          display: none !important;
        }
      `}</style>
      <Box className="dashboard-kpi-container">
        <Typography
          component="h5"
          sx={{
            fontWeight: 700,
            fontSize: 20,
            letterSpacing: "-0.02em",
            mb: 2,
          }}
        >
          My KPI
        </Typography>
        <KpiGraphicalToggle
          toggleItemsActions={toggleItemsActions}
          fromAdmin={fromAdmin}
          resourseAndView={resourseAndView}
          dateSettingsEnabled={dateSettingsEnabled}
          dashboardView={false}
        />
      </Box>
    </GlassCard>
  );
});

DashboardKpi.displayName = 'DashboardKpi';

export default DashboardKpi;
