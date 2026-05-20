import React from "react";
import { Collapse } from "react-bootstrap";
import { ExpandMore, ExpandLess } from "@mui/icons-material";
import "../shared/Workspace.css";

interface SectionWrapperProps {
  id: string;
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export const SectionWrapper: React.FC<SectionWrapperProps> = ({
  id,
  title,
  isOpen,
  onToggle,
  children,
  icon,
}) => {
  return (
    <div className="workspace-accordion-section mb-6" id={id}>
      <div 
        className="workspace-accordion-header d-flex justify-content-between align-items-center px-6 py-4"
        onClick={onToggle}
        style={{
          borderLeft: isOpen ? "4px solid hsl(var(--workspace-primary-hsl))" : "4px solid transparent"
        }}
      >
        <div className="workspace-accordion-title d-flex align-items-center gap-2">
          {icon ? (
            <span className="text-primary d-flex align-items-center">{icon}</span>
          ) : (
            <span className="step-status-dot" />
          )}
          <span className="fw-bold fs-5 text-gray-800" style={{ fontFamily: "Barlow, sans-serif" }}>
            {title}
          </span>
        </div>
        <div className="workspace-accordion-indicator text-muted">
          {isOpen ? <ExpandLess /> : <ExpandMore />}
        </div>
      </div>
      <Collapse in={isOpen}>
        <div>
          <div className="workspace-accordion-body p-6">
            {children}
          </div>
        </div>
      </Collapse>
    </div>
  );
};
