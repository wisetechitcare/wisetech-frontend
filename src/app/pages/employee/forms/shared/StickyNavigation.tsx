import React, { useEffect, useState } from "react";
import { useFormikContext } from "formik";
import { CheckCircle, Error, RadioButtonUnchecked } from "@mui/icons-material";
import "./Workspace.css";

export interface NavigationSection {
  id: string;
  label: string;
  fields: string[]; // Fields belonging to this section to calculate progress and errors
}

interface StickyNavigationProps {
  sections: NavigationSection[];
  totalFieldsCount?: number;
}

export const StickyNavigation: React.FC<StickyNavigationProps> = ({
  sections,
}) => {
  const { values, errors, touched } = useFormikContext<any>();
  const [activeSection, setActiveSection] = useState<string>("");

  // 1. Scrollspy implementation to track active section in viewport
  useEffect(() => {
    const handleScroll = () => {
      let currentSectionId = sections[0]?.id || "";
      for (const section of sections) {
        const element = document.getElementById(section.id);
        if (element) {
          const rect = element.getBoundingClientRect();
          // If the element is near the top of the viewport
          if (rect.top <= 120) {
            currentSectionId = section.id;
          }
        }
      }
      setActiveSection(currentSectionId);
    };

    window.addEventListener("scroll", handleScroll);
    // Trigger once on mount
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [sections]);

  // 2. Compute status of each section based on Formik validations
  const getSectionStatus = (section: NavigationSection) => {
    let hasError = false;
    let hasTouched = false;
    let isFilled = true;

    // Check if any field inside this section is invalid
    for (const field of section.fields) {
      if (errors[field]) {
        hasError = true;
      }
      if (touched[field]) {
        hasTouched = true;
      }
      // Simple filled validation (non-empty)
      const val = values[field];
      if (val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0)) {
        isFilled = false;
      }
    }

    if (hasError && hasTouched) {
      return "error";
    }
    if (isFilled && !hasError) {
      return "success";
    }
    return "pending";
  };

  // 3. Compute form completion progress percentage
  const calculateOverallProgress = () => {
    // Collect all unique fields across all sections
    const allFields = Array.from(new Set(sections.flatMap((s) => s.fields)));
    if (allFields.length === 0) return 0;

    let filledCount = 0;
    for (const field of allFields) {
      const val = values[field];
      const hasVal = val !== undefined && val !== null && val !== "" && (!Array.isArray(val) || val.length > 0);
      if (hasVal) {
        filledCount++;
      }
    }
    return Math.round((filledCount / allFields.length) * 100);
  };

  const progressPercent = calculateOverallProgress();

  const handleStepClick = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="glass-nav-card">
      {/* circular/linear Progress widget */}
      <div className="progress-dashboard">
        <div className="progress-header">Workspace Progress</div>
        <div className="progress-number">{progressPercent}%</div>
        <div className="progress-bar-container">
          <div 
            className="progress-bar-fill" 
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="fs-8 text-white-50 mt-2 fw-semibold">
          Keep completing form sections
        </div>
      </div>

      {/* Navigation steps */}
      <ul className="navigation-steps">
        {sections.map((sec) => {
          const status = getSectionStatus(sec);
          const isActive = activeSection === sec.id;

          return (
            <li
              key={sec.id}
              onClick={() => handleStepClick(sec.id)}
              className={`navigation-step-item ${isActive ? "active" : ""}`}
            >
              {status === "error" ? (
                <Error className="step-status-icon danger" />
              ) : status === "success" ? (
                <CheckCircle className="step-status-icon success" />
              ) : (
                <RadioButtonUnchecked className="step-status-icon" style={{ opacity: 0.6 }} />
              )}
              <span className="text-truncate">{sec.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
