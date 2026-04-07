import React from "react";
import CommonCard from "@app/modules/common/components/CommonCard";
import { Row, Col } from "react-bootstrap";
import { getFactorUnit } from "../../common/kpiUtils";

interface OverviewData {
  icon: string;
  label: string;
  score: number;
  maxScore?: number; // 🔥 NEW FIELD
}

const ScoreOverview: React.FC<{ data: OverviewData[] }> = ({ data }) => {
  return (
    <div>
      <CommonCard>
        <h5 className="mb-4">Score Overview</h5>
        <Row className="gy-3 gx-2">
          {data.map((item, index) => {
            const highlight =
              item.label.toLowerCase() === "attendance" ||
              item.label.toLowerCase() === "leaves";

            const unit = getFactorUnit(item.label);

            return (
              <Col
                key={index}
                xs={12}
                sm={6}
                md={4}
                lg={3}
              >
                <div
                  className="d-flex align-items-center justify-content-between"
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "8px",
                    border: "1.5px solid #D4DBE4",
                    padding: "15px",
                    height: "100%",
                    opacity: highlight ? 1 : 0.2,
                  }}
                >
                  <div className="d-flex align-items-center gap-2">
                    <img
                      src={item.icon}
                      alt={item.label}
                      style={{ width: "24px", height: "24px" }}
                    />
                    <span style={{ fontSize: "14px", fontWeight: "500" }}>{item.label}</span>
                  </div>
                  <div className="d-flex flex-column align-items-end">
                    <span style={{ fontWeight: "600", fontSize: "15px" }}>
                      {item.score.toFixed(2)}
                      {item.maxScore !== undefined && (
                        <span style={{ color: "#295d8e", fontSize: "12px", marginLeft: "2px" }}>
                          / {item.maxScore.toFixed(2)}
                        </span>
                      )}
                    </span>
                    {unit && (
                      <span style={{ color: "#295d8e", fontSize: "11px", fontWeight: "600" }}>
                        {unit}
                      </span>
                    )}
                  </div>
                </div>
              </Col>
            );
          })}
        </Row>
      </CommonCard>
    </div>
  );
};


export default ScoreOverview;
