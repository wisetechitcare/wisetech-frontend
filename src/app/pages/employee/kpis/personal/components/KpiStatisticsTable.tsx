import React from "react";
import { Card, Container, Table } from "react-bootstrap";

interface Factor {
  factor: string;
  calculatedFrom?: string;
  maxValue?: number;
  value?: number;
  weightage?: number;
  score?: number;
  unit?: string;
}

interface Module {
  moduleName?: string;
  totalScore?: number;
  factors?: Factor[];
}

interface KpiStatisticsTableProps {
  data: Module[] | null;
}

const KpiStatisticsTable: React.FC<KpiStatisticsTableProps> = ({ data }) => {
  const headerStyle: React.CSSProperties = {
    color: "#70829A",
    fontWeight: 500,
    fontFamily: "Inter, sans-serif",
  };

  const factorsStyle: React.CSSProperties = {
    color: "#000000",
    fontWeight: 500,
  };

  // ✅ Safe empty state
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <Container fluid className="my-4 px-0">
        <p>No KPI data available for the selected period.</p>
      </Container>
    );
  }

  // ✅ Safe sorting
  const sortedData = [...data].sort((a, b) => {
    if (a?.moduleName === "Attendance") return -1;
    if (b?.moduleName === "Attendance") return 1;
    return 0;
  });

  return (
    <Container fluid className="my-4 px-0">
      <Card
        className="p-lg-10 p-5 mx-lg-3 mx-0"
        style={{ borderRadius: "12px", backgroundColor: "#fff" }}
      >
        <h2 className="mb-6">Report</h2>

        {sortedData.map((module, moduleIndex) => {
          const factors = Array.isArray(module?.factors)
            ? module.factors
            : [];

          const totalScore = Number(module?.totalScore) || 0;

          return (
            <div key={moduleIndex} className="mb-4">
              <Card.Body
                style={{
                  border: "1px solid #C1C9D6",
                  padding: "28px",
                  borderRadius: "12px",
                }}
              >
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="fw-bold mb-0" style={{ fontSize: "16px" }}>
                    {module?.moduleName || "Other"}
                  </h5>
                </div>

                <Table responsive>
                  <thead>
                    <tr>
                      <th style={headerStyle}>Factors</th>
                      <th style={headerStyle}>Calculated From</th>
                      <th style={headerStyle}>Weightage</th>
                      <th style={headerStyle}>Value</th>
                      <th style={headerStyle}>Score</th>
                    </tr>
                  </thead>

                  <tbody>
                    {factors.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center">
                          No data
                        </td>
                      </tr>
                    ) : (
                      factors.map((factor, index) => {
                        const value = Number(factor?.value) || 0;
                        const score = Number(factor?.score) || 0;
                        const maxValue = Number(factor?.maxValue) || 0;

                        return (
                          <tr key={index}>
                            <td style={factorsStyle}>
                              {factor?.factor || "-"}
                            </td>

                            <td>{factor?.calculatedFrom || "-"}</td>

                            <td>
                              {Number(factor?.weightage ?? 0)}
                              {factor?.unit ? ` / ${factor.unit}` : ""}
                            </td>

                            <td>
                              {value.toFixed(2)}
                              {factor?.unit ? ` ${factor.unit}` : ""}
                            </td>

                            <td>
                              <span
                                style={{
                                  color: score >= 0 ? "#42A121" : "#B32828",
                                  fontFamily: "Inter, sans-serif",
                                  fontWeight: 600,
                                  fontSize: "14px",
                                }}
                              >
                                {score >= 0
                                  ? `+${score.toFixed(2)}`
                                  : score.toFixed(2)}
                                {factor?.unit ? ` ${factor.unit}` : ""}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </Table>

                <div className="text-end">
                  <strong>
                    Total :
                    <span
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontWeight: 600,
                        fontSize: "14px",
                        marginLeft: "6px",
                      }}
                    >
                      {totalScore.toFixed(2)}
                    </span>
                  </strong> 
                </div>
              </Card.Body>
            </div>
          );
        })}
      </Card>
    </Container>
  );
};

export default KpiStatisticsTable;
