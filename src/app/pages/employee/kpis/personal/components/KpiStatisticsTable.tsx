import React from "react";
import { Card, Container, Table, Spinner } from "react-bootstrap";
import { getFactorUnit } from "../../common/kpiUtils";

interface Factor {
  factor: string;
  calculatedFrom: string;
  maxValue: number;
  employeesValue: number;
  weightage: number;
  score: number;
  maxScore?: number;
  unit?: string;
}

interface Module {
  moduleName: string;
  totalScore: number;
  maxScore?: number;
  factors: Factor[];
}

interface KpiStatisticsTableProps {
  data: Module[] | null;
}

const KpiStatisticsTable: React.FC<KpiStatisticsTableProps> = ({
  data,
}) => {
  const headerStyle: React.CSSProperties = {
    color: "#70829A",
    fontWeight: 500,
    fontFamily: "Inter, sans-serif",
  };

  const factorsStyle: React.CSSProperties = {
    color: "#000000",
    fontWeight: 500,
  };

  if (!data || data.length === 0) {
    return (
      <Container fluid className="my-4 px-0">
        <p>No KPI data available for the selected period.</p>
      </Container>
    );
  }

  const sortedData = [...data].sort((a, b) => {
    if (a.moduleName === "Attendance") return -1;
    if (b.moduleName === "Attendance") return 1;
    return 0;
  });

  return (
    <Container fluid className="my-4 px-0 ">
      <Card
        className="p-lg-10 p-5 mx-lg-3 mx-0"
        style={{ borderRadius: "12px", backgroundColor: "#fff" }}
      >
        <h2 className="mb-6">Report </h2>

        {sortedData.map((module, moduleIndex) => (
          <div key={moduleIndex} className="mb-4">
            <Card.Body
              style={{
                border: "1px solid #C1C9D6",
                padding: "28px",
                borderRadius: "12px",
              }}
            >
              <div className="d-flex justify-content-between align-items-center mb-3 ">
                <h5 className="fw-bold mb-0">{module.moduleName}</h5>
              </div>

              <Table responsive>
                <thead>
                  <tr>
                    <th style={headerStyle}>Factors</th>
                    <th style={headerStyle}>Calculated From</th>
                    <th style={headerStyle}>Weightage</th>
                    <th style={headerStyle}>Value / Max</th>
                    <th style={headerStyle}>Score / Max</th>
                  </tr>
                </thead>
                <tbody>
                  {module.factors.map((factor, index) => {
                    const unit = getFactorUnit(factor.factor);
                    return (
                      <tr key={index}>
                        <td style={factorsStyle}>{factor.factor} </td>
                        <td>{factor.calculatedFrom}</td>
                        <td>
                          {factor.weightage}
                          {unit ? ` / ${unit}` : ""}
                        </td>
                        <td>
                          <span style={{ fontWeight: 600 }}>{factor.employeesValue.toFixed(2)}</span>
                          <span style={{ color: "#295d8e", fontSize: "12px", marginLeft: "4px" }}>
                            / {factor.maxValue ?? 0} {unit}
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              color: factor.score >= 0 ? "#42A121" : "#B32828",
                              fontFamily: "Inter, sans-serif",
                              fontWeight: 600,
                              fontSize: "14px",
                            }}
                          >
                            {factor.score >= 0 ? `+${factor.score.toFixed(2)}` : factor.score.toFixed(2)}
                          </span>
                          <span style={{ color: "#295d8e", fontSize: "12px", marginLeft: "4px", fontWeight: 600 }}>
                            / {factor.maxScore?.toFixed(2) ?? 0}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
              <div className="text-end">
                <strong>
                  Total Score:{" "}
                  <span
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontWeight: 700,
                      fontSize: "16px",
                      color: "#000",
                    }}
                  >
                    {module.totalScore.toFixed(2)}
                  </span>
                  {module.maxScore !== undefined && (
                    <span style={{ color: "#295d8e", fontSize: "14px", fontWeight: 600, marginLeft: "4px" }}>
                      / {module.maxScore.toFixed(2)}
                    </span>
                  )}
                </strong>
              </div>
            </Card.Body>
          </div>
        ))}
      </Card>
    </Container>
  );
};

export default KpiStatisticsTable;
