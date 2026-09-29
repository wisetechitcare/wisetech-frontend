// import { useState, useEffect } from "react";
import { getUserTablePreferences, upsertUserTablePreferences } from "@services/users";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import eventBus from "@utils/EventBus";
import { EVENT_KEYS } from "@constants/eventKeys";
import { can, canSection } from "@utils/can";
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
  { key: "ongoingLoans", label: "Ongoing Loans Overview", enabled: true },
  { key: "kpiSection", label: "KPI Section", enabled: true },
];

const TABLE_NAME = "dashboardSettings";

// Each widget shows data from one part of the app, so it follows that part's access: a widget
// is visible only with Read on its source section (on top of Read on the Dashboard itself).
// Widgets not listed are personal (the todo card) and need only the Dashboard.
const WIDGET_ACCESS: Record<string, () => boolean> = {
  announcements: () => canSection("settings.announcements"),
  attendance: () => canSection("attendance.personal"),
  dailyAttendanceOverview: () => canSection("attendance.employees"),
  tasks: () => canSection("tasks"),
  upcomingEvents: () => canSection("calendar"),
  // A queue of requests waiting on YOUR approval: approvers are granted it by the workflow setup.
  pendingRequests: () => can("approvals.approve.team"),
  leaderboard: () => canSection("kpi.leaderboard"),
  analyticsGraphs: () => canSection("projects") || canSection("crm.leads"),
  ongoingLoans: () => canSection("finance.loans"),
  kpiSection: () => canSection("kpi.my"),
};

/** Whether the signed-in employee may see a dashboard widget at all (their own toggle aside). */
export const isWidgetAllowed = (key: string): boolean =>
  canSection("dashboard") && (WIDGET_ACCESS[key]?.() ?? true);

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
    const isEnabledByUser = sections.find((s) => s.key === key)?.enabled ?? true;
    return isEnabledByUser && isWidgetAllowed(key);
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
