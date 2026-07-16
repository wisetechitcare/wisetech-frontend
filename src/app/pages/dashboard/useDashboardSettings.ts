// import { useState, useEffect } from "react";
import { getUserTablePreferences, upsertUserTablePreferences } from "@services/users";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import eventBus from "@utils/EventBus";
import { EVENT_KEYS } from "@constants/eventKeys";
import { canViewModule } from "@utils/can";
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

// Map dashboard section keys to the real canonical RBAC module (see
// ACCESS_AREAS in accessAreas.ts) that section previews data from. Each card
// is a preview of the employee's own access to that module, so visibility
// should follow whatever view access they actually hold on it — not a
// separate "dashboardX" resource that no role/override has ever been able to
// grant (that was the bug: every card silently resolved to a permission key
// nothing could ever satisfy, so the whole dashboard rendered empty for any
// non-admin).
const SECTION_TO_MODULE_MAP: Record<string, string> = {
  announcements: "dashboard",
  attendance: "attendance",
  dailyAttendanceOverview: "attendance.employees",
  tasks: "tasks",
  upcomingEvents: "calendar",
  todoCard: "tasks",
  pendingRequests: "approvals",
  leaderboard: "kpi",
  analyticsGraphs: "kpi",
  allLoans: "finance.loans",
  ongoingLoans: "finance.loans",
  kpiSection: "kpi",
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

    // Then check RBAC view access on the module this card previews. Checked
    // at any scope tier (self/team/department/all/global) since some cards
    // are inherently team-scoped (e.g. dailyAttendanceOverview) rather than
    // "own record" — a fixed self-scope check would wrongly hide those for
    // anyone whose grant is team+ scoped instead of self.
    const module = SECTION_TO_MODULE_MAP[key];
    if (module) return canViewModule(module);

    // If no module mapping exists, fall back to user preference
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
