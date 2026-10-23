import React from "react";
import { Collapse } from "react-bootstrap";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import "@app/pages/employee/forms/shared/Workspace.css";

interface FormSectionProps {
  id: string;
  title: string;
  subtitle?: string;
  isOpen: boolean;
  onToggle: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const FormSection: React.FC<FormSectionProps> = ({
  id,
  title,
  subtitle,
  isOpen,
  onToggle,
  icon,
  children,
}) => {
  return (
    <section className="workspace-accordion-section mb-6" id={id}>
      <button
        type="button"
        className="workspace-accordion-header d-flex justify-content-between align-items-center px-6 py-4 w-100 border-0 text-start"
        onClick={onToggle}
        style={{
          borderLeft: isOpen
            ? "4px solid hsl(var(--workspace-primary-hsl))"
            : "4px solid transparent",
        }}
      >
        <span className="workspace-accordion-title d-flex align-items-center gap-2">
          {icon ? (
            <span className="text-primary d-flex align-items-center">{icon}</span>
          ) : (
            <span className="step-status-dot" />
          )}
          <span>
            <span
              className="fw-bold fs-5 text-gray-800 d-block"
              style={{ fontFamily: "Barlow, sans-serif" }}
            >
              {title}
            </span>
            {subtitle && <span className="fs-8 text-gray-500 fw-semibold">{subtitle}</span>}
          </span>
        </span>
        <span className="workspace-accordion-indicator text-muted">
          {isOpen ? <ExpandLess /> : <ExpandMore />}
        </span>
      </button>
      <Collapse in={isOpen}>
        <div>
          <div className="workspace-accordion-body p-6">{children}</div>
        </div>
      </Collapse>
    </section>
  );
};

export default FormSection;
