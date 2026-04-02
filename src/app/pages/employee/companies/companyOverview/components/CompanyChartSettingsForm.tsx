import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { AppDispatch } from "@redux/store";
import {
  fetchAllConfigurations,
  saveAllConfigurations,
  updateSetting,
  selectChartSettings,
  selectIsLoading,
  selectError,
} from "@redux/slices/leadProjectCompanies";
import Loader from "@app/modules/common/utils/Loader";

type ChartSettings = {
  showCompaniesByType: boolean;
  showCompaniesByRoles: boolean;
  showCompaniesByLocation: boolean;
  showCompaniesByStatus: boolean;
  showCompaniesByRating: boolean;
  showUpcomingContactBirthdays: boolean;

  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  configMap: Record<string, string>;
};

type ConfigKey = keyof Omit<ChartSettings, 'isLoading' | 'error' | 'isInitialized' | 'configMap'>;

type ConfigItem = {
  key: ConfigKey;
  label: string;
  section: "Companies";
};

const COMPANY_CONFIG_ITEMS: ConfigItem[] = [
  { key: "showCompaniesByType", label: "Companies By Type", section: "Companies" },
  { key: "showCompaniesByRoles", label: "Companies By Roles", section: "Companies" },
  { key: "showCompaniesByLocation", label: "Companies By Location", section: "Companies" },
  { key: "showCompaniesByStatus", label: "Companies By Status", section: "Companies" },
  { key: "showCompaniesByRating", label: "Companies By Rating", section: "Companies" },
  { key: "showUpcomingContactBirthdays", label: "Upcoming Contacts Birthdays", section: "Companies" },
];

interface CompanyChartSettingsFormProps {
  onSaveSuccess?: () => void;
}

const CompanyChartSettingsForm: React.FC<CompanyChartSettingsFormProps> = ({ onSaveSuccess }) => {
  const dispatch = useDispatch<AppDispatch>();
  const chartSettings = useSelector(selectChartSettings);
  const isLoading = useSelector(selectIsLoading);
  const error = useSelector(selectError);

  const [loading, setLoading] = useState(false);
  const [localSettings, setLocalSettings] = useState<Partial<ChartSettings>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    dispatch(fetchAllConfigurations());
    setLoading(false);
  }, [dispatch]);

  useEffect(() => {
    // Initialize local settings when chart settings are loaded
    if (chartSettings.isInitialized) {
      setLocalSettings(chartSettings);
    }
  }, [chartSettings.isInitialized]);

  const handleToggleChange = (key: ConfigKey, value: boolean) => {
    // Only update local state, don't save immediately
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Update Redux state with local changes
      Object.entries(localSettings).forEach(([key, value]) => {
        if (key !== 'isLoading' && key !== 'error' && key !== 'isInitialized' && key !== 'configMap') {
          dispatch(updateSetting({ key: key as ConfigKey, value: Boolean(value) }));
        }
      });

      // Save all settings to backend
      await dispatch(saveAllConfigurations(localSettings as ChartSettings));

      // Call success callback to close modal
      onSaveSuccess?.();
    } catch (error) {
      console.error("Error saving settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const renderSection = (title: string, items: ConfigItem[]) => (
    <div className="mb-4">
      <h5 className="pb-2">{title}</h5>
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
              checked={Boolean(localSettings[item.key as keyof typeof localSettings] ?? chartSettings[item.key as keyof typeof chartSettings])}
              onChange={(e) => {
                handleToggleChange(item.key, e.target.checked);
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
    <div className="container">
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {renderSection("", COMPANY_CONFIG_ITEMS)}

      <div className="d-flex justify-content-start mt-4">
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSave}
          disabled={isSaving}
          style={{
            backgroundColor: '#9D4141',
            borderColor: '#9D4141',
            fontFamily: 'Inter',
            fontWeight: '600'
          }}
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};

export default CompanyChartSettingsForm;