import { useEffect, useState } from "react";
import {
  createNewConfiguration,
  fetchConfiguration,
  updateConfigurationById,
} from "@services/company";
import { SHOW_PROJECT_BUTTONS } from "@constants/configurations-key";

const ProjectButtonSettings = () => {
  const [projectCanAddFromLeads, setProjectCanAddFromLeads] = useState(true);
  const [configId, setConfigId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const response = await fetchConfiguration(SHOW_PROJECT_BUTTONS);

      if (response?.data?.configuration) {
        const parsedConfig = parseConfig(
          response.data.configuration.configuration
        );

        setProjectCanAddFromLeads(parsedConfig.projectCanAddFromLeads || false);
        setConfigId(response.data.configuration.id || null);
      } else {
        setProjectCanAddFromLeads(false);
        setConfigId(null);
      }
    } catch (error) {
      console.error("Fetch API failed:", error);
      setProjectCanAddFromLeads(false);
      setConfigId(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleToggle = async (checked: boolean) => {
    if (isSaving) return;

    const previousValue = projectCanAddFromLeads;
    setProjectCanAddFromLeads(checked);
    setIsSaving(true);

    try {
      if (!configId) {
        const response = await createNewConfiguration({
          module: SHOW_PROJECT_BUTTONS,
          configuration: JSON.stringify({
            projectCanAddFromLeads: checked,
          }),
        });

        if (response?.data?.id) {
          setConfigId(response.data.id);
        }
      } else {
        await updateConfigurationById(configId, {
          module: SHOW_PROJECT_BUTTONS,
          configuration: JSON.stringify({
            projectCanAddFromLeads: checked,
          }),
        });
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      setProjectCanAddFromLeads(previousValue);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white shadow-sm rounded-lg border p-4 flex items-center justify-between">
        <div className="flex-1 mr-4">
          <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
          <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4"></div>
        </div>
        <div className="w-6 h-6 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="card p-3 shadow-sm">
      <div className="d-flex justify-content-between align-items-center">
        {/* Left: Labels */}
        <div>
          <p
            className="mb-1"
            style={{ fontFamily: "Inter", fontSize: "16px", fontWeight: "600" }}
          >
            Projects can be only added from Leads
          </p>
          <small
            style={{ fontFamily: "Inter", fontSize: "12px", fontWeight: "400", color:'#8696AD'}}
          >
            Disable adding projects from projects screen
          </small>
        </div>

        {/* Right: Toggle */}
        <div className="form-check form-switch m-0">
          <input
            className="form-check-input"
            type="checkbox"
            role="switch"
            id="projectToggle"
            checked={projectCanAddFromLeads}
            onChange={(e) => handleToggle(e.target.checked)}
            disabled={isSaving}
          />
        </div>
      </div>
    </div>
  );
};

export default ProjectButtonSettings;

export const parseConfig = (rawConfig: any) => {
  let config = rawConfig;

  try {
    if (typeof config === "string") {
      config = JSON.parse(config);
      if (typeof config === "string") {
        config = JSON.parse(config);
      }
    }
  } catch (e) {
    console.error("Error parsing config:", e);
    config = {};
  }

  return config;
};
