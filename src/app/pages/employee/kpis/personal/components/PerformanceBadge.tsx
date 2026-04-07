import React, { useMemo } from "react";
import { Col, Image, Row } from "react-bootstrap";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import { getAvatar } from "@utils/avatar";
import ScoreBar from "./ScoreBar";
import OutstandingBadge from "@metronic/assets/miscellaneousicons/Outstanding.svg";
import GoodBadge from "@metronic/assets/miscellaneousicons/Good.svg";
import SatisfactoryBadge from "@metronic/assets/miscellaneousicons/Satisfactory.svg";
import PoorBadge from "@metronic/assets/miscellaneousicons/Poor.svg";
import CriticalBadge from "@metronic/assets/miscellaneousicons/Critical.svg";

type Gender = 0 | 1 | 2;

export const badgeMapping: Record<string, string> = {
  Outstanding: OutstandingBadge,
  Good: GoodBadge,
  Satisfactory: SatisfactoryBadge,
  Poor: PoorBadge,
  Critical: CriticalBadge,
};

function getOrdinalSuffix(rank: number): string {
  const j = rank % 10;
  const k = rank % 100;
  if (j === 1 && k !== 11) return rank + "st";
  if (j === 2 && k !== 12) return rank + "nd";
  if (j === 3 && k !== 13) return rank + "rd";
  return rank + "th";
}

interface PerformanceBadgeProps {
  remark: string;
  rank: number | null;
  maxTotal: number;
  yourPoints: number;
  fromAdmin?: boolean;
  rankLoading?: boolean;
}

const PerformanceBadge: React.FC<PerformanceBadgeProps> = ({
  remark,
  rank,           // ✅ Fixed — no JSX default value here, receives from parent
  yourPoints,
  maxTotal,
  fromAdmin = false,
  rankLoading = false,
}) => {
  const employee = useSelector((state: RootState) =>
    fromAdmin ? state.employee?.selectedEmployee : state.employee.currentEmployee
  );

  const avatar = getAvatar(
    employee.avatar || "",
    employee.gender as unknown as Gender
  );

  const badgeImage = useMemo(() => badgeMapping[remark] || GoodBadge, [remark]);

  const rankLabel =
    rankLoading
      ? "Loading..."
      : typeof rank === "number" && rank > 0
      ? getOrdinalSuffix(rank)
      : "-";

  const CommonCard: React.FC<{
    children?: React.ReactNode;
    styles?: React.CSSProperties;
  }> = ({ children, styles }) => (
    <div
      className="d-flex flex-column m-md-3 p-5 p-md-10"
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: "10px",
        fontFamily: "Inter",
        ...styles,
      }}
    >
      {children}
    </div>
  );

  return (
    <div className="d-flex flex-column flex-lg-row gap-3 sticky-responsive">
      <style jsx>{`
        .sticky-responsive {
          position: static;
          background-color: white;
          padding: 10px;
        }
        @media (min-width: 992px) {
          .sticky-responsive {
            position: sticky;
            top: 125px;
            z-index: 50;
          }
        }
      `}</style>

      <div style={{ flex: 3 }}>
        <CommonCard styles={{ width: "100%" }}>
          <Row className="flex-column flex-lg-row justify-content-center justify-content-lg-start text-center text-lg-start align-items-center">
            <Col
              md={3}
              className="d-flex align-items-center justify-content-center justify-content-lg-start mb-3 mb-lg-0"
            >
              <Image
                src={badgeImage}
                alt={remark}
                style={{ width: "100%", height: "auto", maxHeight: "70px" }}
                className="me-3"
                fluid
              />
            </Col>

            <Col
              md={2}
              className="d-flex flex-column justify-content-center align-items-center align-items-md-start mb-3 mb-lg-0"
            >
              <h5 className="mb-1">{rankLabel}</h5>
              <small className="text-muted">Rank</small>
            </Col>

            <Col
              md={2}
              className="d-flex flex-column justify-content-center align-items-center align-items-md-start mb-3 mb-lg-0"
            >
              <h5 className="mb-1">{parseFloat(yourPoints.toFixed(2))}</h5>
              <small className="text-muted">Your Points</small>
            </Col>

            <Col
              md={5}
              className="d-flex align-items-center justify-content-center justify-content-lg-start"
            >
              <ScoreBar score={yourPoints} maxScore={Math.abs(maxTotal)} />
            </Col>
          </Row>
        </CommonCard>
      </div>

      <div style={{ flex: 1 }}>
        <CommonCard>
          <Row className="align-items-center justify-content-center justify-content-lg-start">
            <Col className="d-flex align-items-center gap-2 text-center text-lg-start">
              <Image
                src={avatar}
                roundedCircle
                width={40}
                height={40}
                alt="Profile"
              />
              <div>
                <h5 className="mb-1">
                  {employee?.users?.firstName} {employee?.users?.lastName}
                </h5>
                <small className="text-muted">{employee?.employeeCode}</small>
              </div>
            </Col>
          </Row>
        </CommonCard>
      </div>
    </div>
  );
};

export default PerformanceBadge;