import React, { useState, useEffect } from "react";
import { Modal } from "react-bootstrap";
import CloseIcon from "@mui/icons-material/Close";
import { Typography } from "@mui/material";
import { successConfirmation } from "@utils/modal";
import { useDashboardSettings, DashboardSection } from "./useDashboardSettings";

interface CustomizeDashboardProps {
  show: boolean;
  onHide: () => void;
  onSettingsChange?: () => void;
}

const CustomizeDashboard: React.FC<CustomizeDashboardProps> = ({ show, onHide, onSettingsChange }) => {
  const { sections: savedSections, saveSections } = useDashboardSettings();
  const [sections, setSections] = useState<DashboardSection[]>(savedSections);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update local state when modal opens
  useEffect(() => {
    if (show) {
      setSections(savedSections);
    }
  }, [show, savedSections]);

  const handleToggle = (key: string) => {
    setSections((prevSections) =>
      prevSections.map((section) =>
        section.key === key ? { ...section, enabled: !section.enabled } : section
      )
    );
  };

  const handleSave = async () => {
    try {
      setIsSubmitting(true);

      // Save to API
      await saveSections(sections);

      successConfirmation("Dashboard settings saved successfully!");

      // Notify parent component to refresh
      if (onSettingsChange) {
        onSettingsChange();
      }

      onHide();
    } catch (error) {
      console.error("Error saving dashboard settings:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="xl"
      centered
      className="responsive-modal"
    >
      <Modal.Body
        style={{
          backgroundColor: "white",
          padding: "20px",
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      >
        <div
          style={{
            backgroundColor: "white",
            padding: "20px",
            borderRadius: "8px",
          }}
        >
          {/* Custom Close Button */}
          <button
            onClick={onHide}
            style={{
              position: "absolute",
              top: "15px",
              right: "20px",
              background: "none",
              border: "none",
              fontSize: "18px",
              cursor: "pointer",
              color: "#6c757d",
              zIndex: 1,
            }}
          >
            <CloseIcon style={{ fontSize: "24px" }} />
          </button>

          <Typography
            style={{
              fontFamily: "Inter",
              fontWeight: 600,
              fontSize: "18px",
              color: "#333",
              marginBottom: "10px",
            }}
          >
            Customize Cards Visibility
          </Typography>

          <p
            style={{
              fontFamily: "Inter",
              fontSize: "14px",
              color: "#666",
              marginBottom: "20px",
            }}
          >
            Select which sections you want to display on your dashboard.
          </p>

          {/* Dashboard Sections */}
          <div className="container mt-4">
            <div className="mb-4">
              <h5 className="border-bottom pb-2">Dashboard Sections</h5>
              {sections.map((section) => (
                <div
                  key={section.key}
                  className="d-flex justify-content-between align-items-center mb-3 flex-wrap"
                >
                  <label className="form-label mb-0" htmlFor={section.key}>
                    {section.label}
                  </label>
                  <div className="form-check form-switch">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id={section.key}
                      checked={section.enabled}
                      onChange={() => handleToggle(section.key)}
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="btn btn-primary mt-3"
              onClick={handleSave}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default CustomizeDashboard;
