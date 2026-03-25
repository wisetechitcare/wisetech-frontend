import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { AppDispatch } from "@redux/store";
import { Formik, Form } from "formik";
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


interface leadProjectCompanyCHartSettingsProp {
  type?:string
}
const LeadsProjectCompanyChartSettings: React.FC<leadProjectCompanyCHartSettingsProp> = ({type}) => {
  const dispatch = useDispatch<AppDispatch>();
  const chartSettings = useSelector(selectChartSettings);
  const isLoading = useSelector(selectIsLoading);
  const error = useSelector(selectError);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    dispatch(fetchAllConfigurations());
    setLoading(false);
  }, [dispatch]);

  const handleSubmit = async (values: Partial<ChartSettings>) => {
    try {
      setLoading(true);
      const resultAction = await dispatch(saveAllConfigurations(values));
      if (saveAllConfigurations.fulfilled.match(resultAction)) {
        successConfirmation("Settings saved successfully!");
        // Emit event to refresh data in other components
        eventBus.emit(EVENT_KEYS.chartSettingsUpdated, {});
        // Emit event to close the modal
        eventBus.emit(EVENT_KEYS.closeChartDialogModal, {});
      } else {
        throw new Error();
      }
    } catch {
      errorConfirmation("Something went wrong while saving.");
    } finally {
      setLoading(false);
    }
  };

  const renderSection = (title: string, items: ConfigItem[]) => (
    <div className="mb-4">
      <h5 className="border-bottom pb-2">{title}</h5>
      {items.map((item) => (
        <div key={item.key} className="d-flex justify-content-between align-items-center mb-3 flex-wrap">
          <label className="form-label mb-0" htmlFor={item.key}>
            {item.label}
          </label>
          <div className="form-check form-switch">
            <input
              type="checkbox"
              className="form-check-input"
              id={item.key}
              name={item.key}
              checked={Boolean(chartSettings[item.key as keyof typeof chartSettings])}
              onChange={(e) => {
                dispatch(updateSetting({ key: item.key, value: e.target.checked }));
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );

  if (isLoading && !chartSettings.configMap && !loading) {
    return <Loader />;
  }

  return (
    <div className="container mt-4">
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <Formik
        initialValues={chartSettings}
        enableReinitialize
        onSubmit={handleSubmit}
      >
        {({ handleSubmit, isSubmitting }) => (
          <Form placeholder={''}>
            {(type && type == PROJECT_CHART_SETTINGS_MODAL_TYPE.LEAD) && renderSection(
              "Leads Charts",
              CONFIG_ITEMS.filter((item) => item.section === "Leads")
            )}
            {(type && type == PROJECT_CHART_SETTINGS_MODAL_TYPE.PROJECT) && renderSection(
              "Projects Charts",
              CONFIG_ITEMS.filter((item) => item.section === "Projects")
            )}
            {(type && type == PROJECT_CHART_SETTINGS_MODAL_TYPE.COMPANY) && renderSection(
              "Companies Charts",
              CONFIG_ITEMS.filter((item) => item.section === "Companies")
            )}

            <button
              type="button"
              className="btn btn-primary mt-3"
              onClick={() => handleSubmit()}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save Settings"}
            </button>
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default LeadsProjectCompanyChartSettings;