import React from "react";
import "./Workspace.css";

interface WorkspaceLayoutProps {
  leftPanel: React.ReactNode;
  centerPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  headerTitle?: string;
  headerSub?: string;
  headerActions?: React.ReactNode;
}

export const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({
  leftPanel,
  centerPanel,
  rightPanel,
  headerTitle,
  headerSub,
  headerActions,
}) => {
  return (
    <div className="d-flex flex-column min-h-100 bg-light">
      {/* Top Workspace Premium Header Bar */}
      {(headerTitle || headerActions) && (
        <div 
          className="d-flex align-items-center justify-content-between px-8 py-4 border-bottom bg-white"
          style={{
            position: "sticky",
            top: 0,
            zIndex: 100,
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
          }}
        >
          <div>
            <h1 className="fs-3 fw-bold text-gray-900 m-0" style={{ fontFamily: "Barlow, sans-serif" }}>
              {headerTitle}
            </h1>
            {headerSub && (
              <p className="fs-7 text-gray-500 m-0 mt-1 fw-semibold">
                {headerSub}
              </p>
            )}
          </div>
          {headerActions && (
            <div className="d-flex align-items-center gap-3">
              {headerActions}
            </div>
          )}
        </div>
      )}

      {/* Main Responsive Grid layout */}
      <div className="workspace-container">
        {/* Left Sticky navigation panel */}
        <aside className="workspace-left-panel">
          {leftPanel}
        </aside>

        {/* Center Scrollable Form Panel */}
        <main className="workspace-center-panel">
          {centerPanel}
        </main>

        {/* Right Sticky Summary & Dashboard panel */}
        <aside className="workspace-right-panel">
          {rightPanel}
        </aside>
      </div>
    </div>
  );
};
