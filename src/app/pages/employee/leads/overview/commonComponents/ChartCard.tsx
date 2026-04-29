import React from "react";
import { Card } from "react-bootstrap";
import { ResponsiveContainer } from "recharts";

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  filter?: React.ReactNode;
  height?: number | string;
  className?: string;
  onHeaderActionClick?: () => void;
  headerActionLabel?: string;
  onExpandClick?: () => void;
}

const ChartCard: React.FC<ChartCardProps> = ({
  title,
  children,
  filter,
  height = 350,
  className = "",
  onHeaderActionClick,
  headerActionLabel,
  onExpandClick,
}) => {
  return (
    <Card
      className={`border-0 shadow-sm transition-all hover-elevate ${className}`}
      style={{
        borderRadius: "16px",
        overflow: "hidden",
        height: "100%",
        backgroundColor: "#ffffff",
      }}
    >
      <Card.Header
        className="bg-transparent border-0 pt-7 px-7 d-flex align-items-center justify-content-between"
        style={{ minHeight: "70px" }}
      >
        <div className="d-flex flex-column">
          <h3
            className="card-label fw-bold text-dark fs-4 m-0"
            style={{ fontFamily: "'Inter', sans-serif", letterSpacing: '-0.02em' }}
          >
            {title}
          </h3>
        </div>
        <div className="card-toolbar d-flex align-items-center gap-3">
          {onHeaderActionClick && headerActionLabel && (
            <button
              onClick={onHeaderActionClick}
              className="btn btn-sm btn-light-primary fw-bold"
              style={{
                fontSize: "11px",
                padding: "8px 12px",
                borderRadius: "8px",
              }}
            >
              {headerActionLabel}
            </button>
          )}
          {filter}
          {onExpandClick && (
            <button 
              onClick={onExpandClick} 
              className="btn btn-sm btn-icon btn-light btn-active-light-primary w-30px h-30px rounded-8 shadow-sm"
              title="Expand Chart"
            >
              <i className="bi bi-arrows-fullscreen fs-9"></i>
            </button>
          )}
        </div>
      </Card.Header>
      <Card.Body className="p-7 pt-2">
        <div 
          className="chart-body-container"
          style={{ width: "100%", height: height, cursor: onExpandClick ? 'pointer' : 'default' }}
          onClick={() => onExpandClick && onExpandClick()}
        >
          <ResponsiveContainer width="100%" height="100%">
            {children as React.ReactElement}
          </ResponsiveContainer>
        </div>
      </Card.Body>
    </Card>
  );
};

export default ChartCard;
