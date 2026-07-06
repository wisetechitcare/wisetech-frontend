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


interface ChartVisibilitySettingsProps {
  type?:string
}
const ChartVisibilitySettings: React.FC<ChartVisibilitySettingsProps> = ({type}) => {
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
    <div className="mb-5">
      <h5 style={{
        fontSize: "15px",
        fontWeight: 700,
        color: "#64748B",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        borderBottom: "2px solid #E2E8F0",
        paddingBottom: "10px",
        marginBottom: "20px"
      }}>
        {title}
      </h5>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))",
        gap: "16px"
      }}>
        {items.map((item) => (
          <div key={item.key} style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 20px",
            backgroundColor: "#F8FAFC",
            borderRadius: "8px",
            border: "1px solid #F1F5F9",
            transition: "all 0.2s ease-in-out",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#FFFFFF";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.05)";
            e.currentTarget.style.borderColor = "#E2E8F0";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#F8FAFC";
            e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.02)";
            e.currentTarget.style.borderColor = "#F1F5F9";
          }}
          >
            <label style={{
              margin: 0,
              fontSize: "15px",
              fontWeight: 600,
              color: "#334155",
              cursor: "pointer"
            }} htmlFor={item.key}>
              {item.label}
            </label>
            <label className="premium-switch">
              <input
                type="checkbox"
                id={item.key}
                name={item.key}
                checked={Boolean(chartSettings[item.key as keyof typeof chartSettings])}
                onChange={(e) => {
                  dispatch(updateSetting({ key: item.key, value: e.target.checked }));
                }}
              />
              <span className="premium-slider"></span>
            </label>
          </div>
        ))}
      </div>
    </div>
  );

  if (isLoading && !chartSettings.configMap && !loading) {
    return <Loader />;
  }

  return (
    <div className="container-fluid py-2">
      <style>{`
        .premium-switch {
          position: relative;
          display: inline-block;
          width: 48px;
          height: 24px;
        }
        .premium-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .premium-slider {
          position: absolute;
          cursor: pointer;
          top: 0; left: 0; right: 0; bottom: 0;
          background-color: #CBD5E1;
          transition: .3s cubic-bezier(0.4, 0.0, 0.2, 1);
          border-radius: 4px;
        }
        .premium-slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: .3s cubic-bezier(0.4, 0.0, 0.2, 1);
          border-radius: 3px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .premium-switch input:checked + .premium-slider {
          background-color: #9D4141;
        }
        .premium-switch input:checked + .premium-slider:before {
          transform: translateX(24px);
        }
        .premium-switch input:focus + .premium-slider {
          box-shadow: 0 0 0 3px rgba(157, 65, 65, 0.2);
        }
      `}</style>

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
          <Form>
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

            <div className="d-flex justify-content-end mt-4 pt-3 border-top">
              <button
                type="button"
                className="btn text-white fw-bold px-4 py-2 shadow-sm"
                style={{ backgroundColor: "#9D4141", border: "none", borderRadius: "6px" }}
                onClick={() => handleSubmit()}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default ChartVisibilitySettings;
