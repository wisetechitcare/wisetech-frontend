import { resourceNameMapWithCamelCase } from "@constants/statistics";
import KpiGraphicalToggle from "./my-kpi/KpiGraphicalToggle";
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
import { useEffect, useState } from "react";
import { Container } from "react-bootstrap";


const MyKpi = ({ fromAdmin = false }: { fromAdmin?: boolean }) => {
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
    <div>
      <h2 className='mb-5'>My KPI</h2>
      <KpiGraphicalToggle
        toggleItemsActions={toggleItemsActions}
        fromAdmin={fromAdmin}
        resourseAndView={resourseAndView}
        dateSettingsEnabled={dateSettingsEnabled}
      />
    </div>
  );
};

export default MyKpi;
