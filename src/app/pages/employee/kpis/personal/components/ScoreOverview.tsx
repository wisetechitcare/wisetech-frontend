import React from "react";
import CommonCard from "@app/modules/common/components/CommonCard";
import { Row, Col } from "react-bootstrap";

interface OverviewData {
  icon: string;
  label: string;
  score: number;
}

const ScoreOverview: React.FC<{ data: OverviewData[] }> = ({ data }) => {
  return (
    <div className="card shadow-sm border-0 mb-8" style={{ borderRadius: "12px" }}>
      <div className="card-header border-0 pt-6 px-10">
        <h3 className="card-title">
          <span className="card-label fw-bolder fs-4 text-dark" style={{ fontFamily: "Barlow" }}>Module Performance Overview</span>
        </h3>
      </div>
      <div className="card-body py-6 px-10">
        <Row className="gy-4 gx-4">
          {data.map((item, index) => {
            const isAttendanceOrLeaves =
              item.label.toLowerCase() === "attendance" ||
              item.label.toLowerCase() === "leaves";
            
            return (
              <Col
                key={index}
                xs={12}
                sm={6}
                md={4}
                lg={3}
              >
                <div
                  className="d-flex align-items-center justify-content-between p-5 transition-all"
                  style={{
                    backgroundColor: isAttendanceOrLeaves ? "#ffffff" : "#F9FAFB",
                    borderRadius: "12px",
                    border: isAttendanceOrLeaves ? "1.5px solid #E1E3EA" : "1px solid #EFF2F5",
                    opacity: isAttendanceOrLeaves ? 1 : 0.6,
                    boxShadow: isAttendanceOrLeaves ? "0 4px 12px rgba(0,0,0,0.03)" : "none"
                  }}
                >
                  <div className="d-flex align-items-center gap-3">
                    <div className={`symbol symbol-35px ${isAttendanceOrLeaves ? "symbol-light-primary" : "symbol-light-secondary"}`}>
                      <div className="symbol-label">
                        <img
                          src={item.icon}
                          alt={item.label}
                          style={{ width: "20px", height: "20px" }}
                        />
                      </div>
                    </div>
                    <span className={`fs-7 fw-bolder ${isAttendanceOrLeaves ? "text-dark" : "text-muted"}`}>
                      {item.label}
                    </span>
                  </div>
                  <span className={`fs-6 fw-bolder ${isAttendanceOrLeaves ? "text-primary" : "text-gray-600"}`}>
                    {item.score.toFixed(2)}
                  </span>
                </div>
              </Col>
            );
          })}
        </Row>
      </div>
    </div>
  );
};

export default ScoreOverview;
