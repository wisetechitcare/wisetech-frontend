import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { AppDispatch } from "@redux/store";
import { Alert, Box, Typography } from "@mui/material";
import { AutoGrid, GlassDialog, GlassHeader, WtButton, WtSwitchField } from "@app/modules/common/components/ui";
import { successConfirmation, errorConfirmation } from "@utils/modal";
import eventBus from "@utils/EventBus";
import { EVENT_KEYS } from "@constants/eventKeys";
import {
  fetchAllConfigurations,
  saveAllConfigurations,
  updateSetting,
  selectChartSettings,
  selectIsLoading,
  selectError,
} from "@redux/slices/leadProjectCompanies";
import Loader from "@app/modules/common/utils/Loader";
import { PROJECT_CHART_SETTINGS_MODAL_TYPE } from "@constants/configurations-key";

type ChartSettings = {
  // Leads settings
  showLeadsStatusChart: boolean;
  showLeadsByServiceChart: boolean;
  showLeadsMonthlyByStatus: boolean;
  showLeadsByProjectCategory: boolean;
  showLeadsBySource: boolean;
  showLeadsFromReferral: boolean;
  showLeadsFromDirect: boolean;
  showLeadsBySubCategory: boolean;
  showLeadsByLocation: boolean;
  showLeadsByCancellationReason: boolean;
  showTopLeads: boolean;
  showLeadsByCompanyType: boolean;
  
  // Projects settings
  showProjectsStatus: boolean;
  showProjectsByService: boolean;
  showProjectsByTeam: boolean;
  showProjectsByLocation: boolean;
  showProjectsByCategory: boolean;
  showProjectsBySubCategory: boolean;
  showProjectsMonthlyStatus: boolean;
  showProjectsMonthlyCompanyType: boolean;
  showProjectYealyCustomCompanyType: boolean;
  
  // Companies settings
  showCompaniesByType: boolean;
  showCompaniesByRoles: boolean;
  showCompaniesByLocation: boolean;
  showCompaniesByStatus: boolean;
  showCompaniesByRating: boolean;
  showUpcomingContactBirthdays: boolean;
  
  // Meta states
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  configMap: Record<string, string>;
};

type ConfigKey = keyof Omit<ChartSettings, 'isLoading' | 'error' | 'isInitialized' | 'configMap'>;

type ConfigItem = {
  key: ConfigKey;
  label: string;
  section: "Leads" | "Projects" | "Companies";
};

const CONFIG_ITEMS: ConfigItem[] = [
  // Leads
  { key: "showLeadsStatusChart", label: "Leads Status Chart", section: "Leads" },
  { key: "showLeadsByServiceChart", label: "Leads By Service Chart", section: "Leads" },
  { key: "showLeadsMonthlyByStatus", label: "Monthly Leads By Status", section: "Leads" },
  { key: "showLeadsByProjectCategory", label: "Leads By Project Category", section: "Leads" },
  { key: "showLeadsBySource", label: "Leads By Source", section: "Leads" },
  { key: "showLeadsFromReferral", label: "Leads From Referral Sources", section: "Leads" },
  { key: "showLeadsFromDirect", label: "Leads From Direct Sources", section: "Leads" },
  { key: "showLeadsBySubCategory", label: "Leads By Sub Category", section: "Leads" },
  { key: "showLeadsByLocation", label: "Leads By Location", section: "Leads" },
  { key: "showLeadsByCancellationReason", label: "Leads By Cancellation Reason", section: "Leads" },
  { key: "showTopLeads", label: "Top Leads", section: "Leads" },
  { key: "showLeadsByCompanyType", label: "Leads By Company Type", section: "Leads" },

  // Projects
  { key: "showProjectsStatus", label: "Projects Status", section: "Projects" },
  { key: "showProjectsByService", label: "Projects By Service", section: "Projects" },
  { key: "showProjectsByTeam", label: "Projects By Team", section: "Projects" },
  { key: "showProjectsByLocation", label: "Projects By Location", section: "Projects" },
  { key: "showProjectsByCategory", label: "Projects By Category", section: "Projects" },
  { key: "showProjectsBySubCategory", label: "Projects By Sub Category", section: "Projects" },
  { key: "showProjectsMonthlyStatus", label: "Monthly Projects Status", section: "Projects" },
  { key: "showProjectsMonthlyCompanyType", label: "Monthly Projects Company Type", section: "Projects" },
  { key: "showProjectYealyCustomCompanyType", label: "Yearly Projects Company Type", section: "Projects" },

  // Companies
  { key: "showCompaniesByType", label: "Companies By Type", section: "Companies" },
  { key: "showCompaniesByRoles", label: "Companies By Roles", section: "Companies" },
  { key: "showCompaniesByLocation", label: "Companies By Location", section: "Companies" },
  { key: "showCompaniesByStatus", label: "Companies By Status", section: "Companies" },
  { key: "showCompaniesByRating", label: "Companies By Rating", section: "Companies" },
  { key: "showUpcomingContactBirthdays", label: "Upcoming Contacts Birthdays", section: "Companies" },
];


const SECTION_BY_TYPE: Record<string, { section: ConfigItem["section"]; title: string }> = {
  [PROJECT_CHART_SETTINGS_MODAL_TYPE.LEAD]: { section: "Leads", title: "Leads charts" },
  [PROJECT_CHART_SETTINGS_MODAL_TYPE.PROJECT]: { section: "Projects", title: "Projects charts" },
  [PROJECT_CHART_SETTINGS_MODAL_TYPE.COMPANY]: { section: "Companies", title: "Companies charts" },
};

interface ChartVisibilitySettingsProps {
  type?: string;
  /** Renders a Back button beside Save (the dialog passes its close handler). */
  onBack?: () => void;
}

const ChartVisibilitySettings: React.FC<ChartVisibilitySettingsProps> = ({ type, onBack }) => {
  const dispatch = useDispatch<AppDispatch>();
  const chartSettings = useSelector(selectChartSettings);
  const isLoading = useSelector(selectIsLoading);
  const error = useSelector(selectError);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    dispatch(fetchAllConfigurations());
  }, [dispatch]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const resultAction = await dispatch(saveAllConfigurations(chartSettings as Partial<ChartSettings>));
      if (!saveAllConfigurations.fulfilled.match(resultAction)) throw new Error();
      successConfirmation("Settings saved successfully!");
      // Refresh the charts, then close whichever modal hosts this.
      eventBus.emit(EVENT_KEYS.chartSettingsUpdated, {});
      eventBus.emit(EVENT_KEYS.closeChartDialogModal, {});
    } catch {
      errorConfirmation("Something went wrong while saving.");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading && !chartSettings.configMap) return <Loader />;

  const sections = type && SECTION_BY_TYPE[type] ? [SECTION_BY_TYPE[type]] : [];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
      {error && <Alert severity="error">{error}</Alert>}

      {sections.map(({ section, title }) => {
        const items = CONFIG_ITEMS.filter((item) => item.section === section);
        const onCount = items.filter((i) => Boolean(chartSettings[i.key as keyof typeof chartSettings])).length;
        return (
          <Box key={section}>
            <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", mb: 1.5 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "text.secondary" }}>
                {title}
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>
                {onCount} of {items.length} visible
              </Typography>
            </Box>
            <AutoGrid min={280} gap={10}>
              {items.map((item) => (
                <Box
                  key={item.key}
                  sx={{
                    px: 2, py: 1.25, borderRadius: 2,
                    border: 1, borderColor: "divider", bgcolor: "background.paper",
                    transition: "border-color .15s, background-color .15s",
                    "&:hover": { borderColor: "primary.light", bgcolor: "action.hover" },
                  }}
                >
                  <WtSwitchField
                    title={item.label}
                    checked={Boolean(chartSettings[item.key as keyof typeof chartSettings])}
                    onChange={(_, checked) => dispatch(updateSetting({ key: item.key, value: checked }))}
                    inputProps={{ "aria-label": item.label }}
                  />
                </Box>
              ))}
            </AutoGrid>
          </Box>
        );
      })}

      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, pt: 2, borderTop: 1, borderColor: "divider" }}>
        {onBack && (
          <WtButton ghost onClick={onBack} disabled={saving}>
            Back
          </WtButton>
        )}
        <WtButton onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save settings"}
        </WtButton>
      </Box>
    </Box>
  );
};

/**
 * The "Customize cards visibility" modal every overview page opens. One component so the
 * pages stop re-drawing their own react-bootstrap shell around the settings.
 */
export const ChartVisibilityDialog: React.FC<{ open: boolean; onClose: () => void; type: string }> = ({ open, onClose, type }) => (
  <GlassDialog
    open={open}
    onClose={onClose}
    maxWidth="md"
    header={
      <GlassHeader
        variant="plain"
        title="Customize cards visibility"
        subtitle="Choose which charts appear on this overview"
        onBack={onClose}
        backLabel="Back"
        onClose={onClose}
      />
    }
  >
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <ChartVisibilitySettings type={type} onBack={onClose} />
    </Box>
  </GlassDialog>
);

export default ChartVisibilitySettings;
