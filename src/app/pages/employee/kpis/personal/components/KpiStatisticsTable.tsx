import React from "react";
import { Card, Container, Table } from "react-bootstrap";
import { sortKpiFactors } from "@utils/kpiSort";

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
  // ✅ Safe empty state
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <Container fluid className="my-4 px-0">
        <div className="card shadow-sm border border-gray-200">
           <div className="card-body p-10 text-center">
              <p className="text-muted fs-6 mb-0">No KPI data available for the selected period.</p>
           </div>
        </div>
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
      <div className="card shadow-sm border-0" style={{ borderRadius: "12px" }}>
        <div className="card-header border-0 pt-8 px-10">
          <h3 className="card-title align-items-start flex-column">
            <span className="card-label fw-bolder fs-3 mb-1" style={{ fontFamily: "Barlow" }}>KPI Performance Report</span>
            <span className="text-muted fw-bold fs-7">Detailed breakdown of factor scores across modules</span>
          </h3>
        </div>
        
        <style jsx>{`
          .hover-neutral:hover {
            background-color: #F9FAFB !important;
          }
          .table-header-bg {
            background-color: #F9FAFB;
          }
        `}</style>

        <div className="card-body py-8 px-10">
          {sortedData.map((module, moduleIndex) => {
            const factors = Array.isArray(module?.factors) ? module.factors : [];
            const totalScore = Number(module?.totalScore) || 0;

            return (
              <div key={moduleIndex} className="card shadow-none mb-10" style={{ border: "1px solid #EFF2F5", borderRadius: "12px" }}>
                <div className="card-body p-6">
                  <div className="d-flex justify-content-between align-items-center mb-6">
                    <div className="d-flex align-items-center gap-3">
                      <div 
                        className="d-flex align-items-center justify-content-center bg-light rounded"
                        style={{ width: "35px", height: "35px", border: "1px solid #EFF2F5" }}
                      >
                        <i className="fa-solid fa-layer-group text-primary fs-5" />
                      </div>
                      <h5 className="fw-bolder text-dark mb-0 fs-5" style={{ fontFamily: "Barlow" }}>
                        {module?.moduleName || "Other"}
                      </h5>
                    </div>
                    <div className="badge badge-light-primary fw-bolder px-4 py-2 fs-8">
                      Module Total: {totalScore.toFixed(2)}
                    </div>
                  </div>

                  <div className="table-responsive">
                    <table className="table table-row-dashed table-row-gray-300 align-middle gs-0 gy-4">
                      <thead>
                        <tr className="fw-bolder text-muted bg-light table-header-bg">
                          <th className="ps-4 min-w-200px rounded-start">Factor</th>
                          <th className="text-center min-w-150px">Calculation Context</th>
                          <th className="text-center min-w-100px">Weightage</th>
                          <th className="text-center min-w-100px">Value</th>
                          <th className="text-center min-w-100px pe-4 rounded-end">Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {factors.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="text-center text-muted py-8 fs-7">
                              No data available for this module.
                            </td>
                          </tr>
                        ) : (
                          sortKpiFactors(factors, (f: Factor) => f.factor).map((factor: Factor, index: number) => {
                            const value = Number(factor?.value) || 0;
                            const score = Number(factor?.score) || 0;

                            return (
                              <tr key={index} className="hover-neutral transition-all">
                                <td className="ps-4">
                                  <span className="text-dark fw-bolder text-hover-primary mb-1 fs-6">
                                    {factor?.factor || "-"}
                                  </span>
                                </td>
                                <td className="text-center">
                                  <span className="text-muted fw-bold d-block fs-7">
                                    {factor?.calculatedFrom || "N/A"}
                                  </span>
                                </td>
                                <td className="text-center">
                                  <span className="text-dark fw-bold fs-7">
                                    {Number(factor?.weightage ?? 0)}
                                    <span className="text-muted fs-9 ms-1">{factor?.unit || ""}</span>
                                  </span>
                                </td>
                                <td className="text-center">
                                  <span className="text-dark fw-bold fs-7">
                                    {value.toFixed(2)}
                                    <span className="text-muted fs-9 ms-1">{factor?.unit || ""}</span>
                                  </span>
                                </td>
                                <td className="text-center pe-4">
                                  <span
                                    className={`badge fw-bolder fs-7 px-3 py-1 ${
                                      score >= 0 ? "badge-light-success" : "badge-light-danger"
                                    }`}
                                  >
                                    {score >= 0 ? `+${score.toFixed(2)}` : score.toFixed(2)}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Container>
  );
};

export default KpiStatisticsTable;
