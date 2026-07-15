import React, { useMemo } from "react";
import { Col, Image, Row } from "react-bootstrap";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import { getAvatar } from "@utils/avatar";
import ScoreBar from "./ScoreBar";

type Gender = 0 | 1 | 2;

// Helper to add ordinal suffix to rank number
function getOrdinalSuffix(rank: number): string {
  const j = rank % 10,
    k = rank % 100;

  if (j === 1 && k !== 11) {
    return rank + "st";
  }
  if (j === 2 && k !== 12) {
    return rank + "nd";
  }
  if (j === 3 && k !== 13) {
    return rank + "rd";
  }
  return rank + "th";
}

interface PerformanceBadgeProps {
  remark: string;
  rank: number | string | null;
  maxTotal: number;
  yourPoints: number;
  fromAdmin?: boolean;
}

const PerformanceBadge: React.FC<PerformanceBadgeProps> = ({
  remark,
  rank,
  yourPoints,
  maxTotal,
  fromAdmin = false,
}) => {
  const employee = useSelector((state: RootState) =>
    fromAdmin ? state.employee?.selectedEmployee : state.employee.currentEmployee
  );

  const avatar = getAvatar(
    employee.avatar || "",
    employee.gender as unknown as Gender
  );

  const percentage = Math.max(0, Math.min((yourPoints / (maxTotal || 1)) * 100, 100));

  const moodData = useMemo(() => {
    if (percentage < 20) {
      return {
        state: "Needs Attention",
        subtitle: "Below target",
        color: "#1E3A8A",
        stateKey: "danger",
        icon: "fa-face-frown",
        animation: "animate-pulse-soft"
      };
    } else if (percentage < 40) {
      return {
        state: "Keep Improving",
        subtitle: "Making progress",
        color: "#F99F1F",
        stateKey: "warning",
        icon: "fa-arrow-trend-up",
        animation: ""
      };
    } else if (percentage < 60) {
      return {
        state: "Good Progress",
        subtitle: "On the right track",
        color: "#FFC700",
        stateKey: "warning",
        icon: "fa-face-smile",
        animation: ""
      };
    } else if (percentage < 80) {
      return {
        state: "Great Performance",
        subtitle: "High efficiency",
        color: "#50CD89",
        stateKey: "success",
        icon: "fa-bolt",
        animation: "animate-float-soft"
      };
    } else {
      return {
        state: "Excellent",
        subtitle: "Elite level",
        color: "#7239EA",
        stateKey: "info",
        icon: "fa-crown",
        animation: "animate-shine-premium"
      };
    }
  }, [percentage]);

  return (
    <div className="d-flex flex-column flex-lg-row gap-3 mb-4">
      <style>{`
        @keyframes pulse-soft {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(0.95); }
        }
        .animate-pulse-soft {
          animation: pulse-soft 2.5s ease-in-out infinite;
        }
        
        @keyframes float-soft {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .animate-float-soft {
          animation: float-soft 4s ease-in-out infinite;
        }
        
        @keyframes shine-premium {
          0% { opacity: 0.8; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
          100% { opacity: 0.8; transform: scale(1); }
        }
        .animate-shine-premium {
          animation: shine-premium 3s ease-in-out infinite;
        }
        
        .hover-elevated:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }
      `}</style>

      <div className="flex-grow-1">
        <div className="card shadow-sm border-0" style={{ borderRadius: "12px" }}>
          <div className="card-body p-3 p-lg-4">
            <Row className="align-items-center g-3">
              {/* Modern KPI Mood Widget */}
              <Col lg={3} className="border-end-lg border-gray-200">
                <div className="d-flex align-items-center gap-4 py-1 px-1">
                  <div
                    className={`symbol symbol-55px d-flex align-items-center justify-content-center rounded-3 transition-all hover-elevated`}
                    style={{
                      width: "100px",
                      height: "80px",
                      backgroundColor: `${moodData.color}15`,
                      border: `5px solid ${moodData.color}30`
                    }}
                  >
                    <i
                      className={`fa-solid ${moodData.icon} ${moodData.animation}`}
                      style={{ color: moodData.color, fontSize: "1.8rem" }}
                    />
                  </div>
                  <div className="d-flex flex-column">
                    <h4 className={`fw-bolder mb-1 fs-5 text-dark`} style={{ fontFamily: "Barlow" }}>
                      {moodData.state}
                    </h4>
                    <span className="text-muted fw-bold fs-9 text-uppercase ls-1">
                      {moodData.subtitle}
                    </span>
                  </div>
                </div>
              </Col>

              {/* Rank Section */}
              <Col xs={6} lg={2} className="d-flex flex-column align-items-center border-end border-end-lg-1 border-gray-200">
                <span className="text-muted fw-bold fs-9 text-uppercase ls-1 mb-2">Rank</span>
                <h2 className="fw-boldest text-dark mb-0 fs-2" style={{ fontFamily: "Barlow", letterSpacing: "-0.5px" }}>
                  {rank && rank !== 0 && rank !== "0"
                    ? getOrdinalSuffix(Number(rank))
                    : "NR"}
                </h2>
              </Col>

              {/* Efficiency Section */}
              <Col xs={6} lg={2} className="d-flex flex-column align-items-center border-end-lg border-gray-200">
                <span className="text-muted fw-bold fs-9 text-uppercase ls-1 mb-2">Efficiency</span>
                <h2 className="fw-boldest text-success mb-0 fs-2" style={{ fontFamily: "Barlow", letterSpacing: "-0.5px" }}>
                  {percentage.toFixed(0)}%
                </h2>
              </Col>

              {/* Progress Bar Section - High-Density Vertical Layout */}
              <Col lg={5} className="ps-lg-8">
                <div className="d-flex flex-column h-100 justify-content-center py-0">
                  <div className="d-flex justify-content-between align-items-center mb-5">
                    <span className="text-muted fw-bolder fs-9 text-uppercase ls-1">Points</span>
                    {/* <span className={`fw-bolder fs-6`} style={{ fontFamily: "Barlow", color: moodData.color }}> {parseFloat(yourPoints.toFixed(2))}</span> */}
                  </div>

                  <ScoreBar score={yourPoints} maxScore={maxTotal} />

                  <div className="d-flex flex-column mt-4">
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="text-dark fs-5 fw-boldest">0</span>
                      <span className="fs-5 fw-boldest" style={{ color: "#1E3A8A" }}>{maxTotal}</span>
                    </div>
                    <div className="text-center mt-n1">
                      <span className="text-muted fw-bold text-uppercase ls-2 fs-9">Target</span>
                    </div>
                  </div>
                </div>
              </Col>
            </Row>
          </div>
        </div>
      </div>

      <div style={{ flex: "0 0 auto", minWidth: "280px" }}>
        <div className="card shadow-sm border-0 h-100" style={{ borderRadius: "12px" }}>
          <div className="card-body p-4 d-flex align-items-center">
            <div className="d-flex align-items-center gap-4 w-100">
              <div className="symbol symbol-60px symbol-circle border border-2 border-white shadow-sm flex-shrink-0">
                <Image src={avatar} alt="Profile" />
              </div>
              <div className="d-flex flex-column min-w-0">
                <h5 className="fw-boldest text-dark mb-1 fs-4" style={{ fontFamily: "Barlow", lineHeight: "1.2" }}>
                  {employee?.users?.firstName} {employee?.users?.lastName}
                </h5>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <span className="badge badge-light-secondary fw-bold fs-9 px-2 py-1">{employee?.employeeCode}</span>
                  <span className="text-muted fs-9 fw-bold">Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceBadge;
