// import { useState, useEffect } from "react";
import { getUserTablePreferences, upsertUserTablePreferences } from "@services/users";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import eventBus from "@utils/EventBus";
import { EVENT_KEYS } from "@constants/eventKeys";
import { hasPermission } from "@utils/authAbac";
import { resourceNameMapWithCamelCase, permissionConstToUseWithHasPermission } from "@constants/statistics";
import { useState, useEffect, useCallback } from "react";

export type DashboardSection = {
  key: string;
  label: string;
  enabled: boolean;
};

const DEFAULT_SECTIONS: DashboardSection[] = [
  { key: "announcements", label: "Announcements", enabled: true },
  { key: "attendance", label: "Attendance", enabled: true },
  { key: "dailyAttendanceOverview", label: "Daily Attendance Overview", enabled: true },
  { key: "tasks", label: "Tasks", enabled: true },
  { key: "upcomingEvents", label: "Upcoming Events", enabled: true },
  { key: "todoCard", label: "Todo Card", enabled: true },
  { key: "pendingRequests", label: "Pending Requests", enabled: true },
  { key: "leaderboard", label: "Leaderboard", enabled: true },
  { key: "analyticsGraphs", label: "Analytics Graphs", enabled: true },
  { key: "allLoans", label: "All Loans Overview", enabled: true },
  { key: "ongoingLoans", label: "Ongoing Loans Overview", enabled: true },
  { key: "kpiSection", label: "KPI Section", enabled: true },
];

const TABLE_NAME = "dashboardSettings";

// Map dashboard section keys to ABAC resource names
const SECTION_TO_RESOURCE_MAP: Record<string, string> = {
  announcements: resourceNameMapWithCamelCase.dashboardAnnouncements,
  attendance: resourceNameMapWithCamelCase.dashboardAttendance,
  dailyAttendanceOverview: resourceNameMapWithCamelCase.dashboardDailyAttendanceOverview,
  tasks: resourceNameMapWithCamelCase.dashboardTasks,
  upcomingEvents: resourceNameMapWithCamelCase.dashboardUpcomingEvents,
  todoCard: resourceNameMapWithCamelCase.dashboardTodoCard,
  pendingRequests: resourceNameMapWithCamelCase.dashboardPendingRequests,
  leaderboard: resourceNameMapWithCamelCase.dashboardLeaderboard,
  analyticsGraphs: resourceNameMapWithCamelCase.dashboardAnalyticsGraphs,
  allLoans: resourceNameMapWithCamelCase.dashboardAllLoans,
  ongoingLoans: resourceNameMapWithCamelCase.dashboardOngoingLoans,
  kpiSection: resourceNameMapWithCamelCase.dashboardKpiSection,
};

export const useDashboardSettings = () => {
  const employeeId = useSelector((state: RootState) => state.employee.currentEmployee?.id);
  const [sections, setSections] = useState<DashboardSection[]>(DEFAULT_SECTIONS);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings from API on mount
  useEffect(() => {
    const loadSettings = async () => {
      if (!employeeId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await getUserTablePreferences(employeeId, TABLE_NAME);

        if (response?.data?.preferences?.sections) {
          const storedSections = response.data.preferences.sections;

          // Merge with defaults to handle new sections
          const mergedSections = DEFAULT_SECTIONS.map((defaultSection) => {
            const storedSection = storedSections.find((s: DashboardSection) => s.key === defaultSection.key);
            return storedSection || defaultSection;
          });

          setSections(mergedSections);
        } else {
          // No preferences found, use defaults
          setSections(DEFAULT_SECTIONS);
        }
      } catch (error) {
        console.error("Error loading dashboard settings:", error);
        // Fallback to defaults on error
        setSections(DEFAULT_SECTIONS);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [employeeId]);

  const saveSections = async (newSections: DashboardSection[]) => {
    if (!employeeId) {
      throw new Error("Employee ID is required to save settings");
    }

    try {
      const preferences = {
        sections: newSections,
      };

      await upsertUserTablePreferences(employeeId, TABLE_NAME, preferences);
      setSections(newSections);

      // Emit event to notify dashboard to update immediately
      eventBus.emit(EVENT_KEYS.dashboardSettingsUpdated, { sections: newSections });
    } catch (error) {
      console.error("Error saving dashboard settings:", error);
      throw error;
    }
  };

  const isSectionEnabled = (key: string): boolean => {
    // First check if section is enabled in user preferences
    const section = sections.find((s) => s.key === key);
    const isEnabledByUser = section?.enabled ?? true;

    if (!isEnabledByUser) {
      return false;
    }

    // Then check ABAC permissions
    const resourceName = SECTION_TO_RESOURCE_MAP[key];
    if (resourceName) {
      // Check if user has permission to view this dashboard section
      const hasViewPermission = hasPermission(
        resourceName,
        permissionConstToUseWithHasPermission.readOwn
      );
      return hasViewPermission;
    }

    // If no resource mapping exists, fall back to user preference
    return isEnabledByUser;
  };

   // const isSectionEnabled = useCallback((key: string): boolean => {
  //   const section = sections.find((s) => s.key === key);
  //   return section?.enabled ?? true;
  // }, [sections]);
  const refreshSettings = async () => {
    if (!employeeId) return;

    try {
      const response = await getUserTablePreferences(employeeId, TABLE_NAME);

      if (response?.data?.preferences?.sections) {
        const storedSections = response.data.preferences.sections;

        // Merge with defaults to handle new sections
        const mergedSections = DEFAULT_SECTIONS.map((defaultSection) => {
          const storedSection = storedSections.find((s: DashboardSection) => s.key === defaultSection.key);
          return storedSection || defaultSection;
        });

        setSections(mergedSections);
      } else {
        setSections(DEFAULT_SECTIONS);
      }
    } catch (error) {
      console.error("Error refreshing dashboard settings:", error);
    }
  };

  return {
    sections,
    saveSections,
    isSectionEnabled,
    isLoading,
    refreshSettings,
  };
};
