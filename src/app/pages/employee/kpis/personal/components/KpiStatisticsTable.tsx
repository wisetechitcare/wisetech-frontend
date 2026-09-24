import React, { useMemo } from "react";
import { Container } from "react-bootstrap";
import { useSelector } from "react-redux";
import type { RootState } from "@redux/store";
import { sortKpiFactors } from "@utils/kpiSort";
import { formatHours, formatWeightageUnit, isHourUnit } from "@app/pages/employee/kpis/common/kpiUtils";
import MaterialTable from "@app/modules/common/components/MaterialTable";

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
  const currentUserId = useSelector((s: RootState) => s.auth?.currentUser?.id);

  // Every module renders the same five columns, so the model is built once.
  // Numbers stay numbers on the row (weightage/value/score) so sorting is numeric;
  // the Cell renderers reproduce the old markup exactly.
  const columns = useMemo(() => [
    {
      accessorKey: "factor",
      header: "Factor",
      Cell: ({ cell }: any) => (
        <span className="text-dark fw-bolder text-hover-primary mb-1 fs-6">{cell.getValue() || "-"}</span>
      ),
    },
    {
      accessorKey: "calculatedFrom",
      header: "Calculation Context",
      Cell: ({ cell }: any) => (
        <span className="text-muted fw-bold d-block fs-7">{cell.getValue() || "N/A"}</span>
      ),
    },
    {
      accessorKey: "weightage",
      header: "Weightage",
      Cell: ({ row }: any) => (
        <span className="text-dark fw-bold fs-7">
          {formatWeightageUnit(Number(row.original?.weightage ?? 0), row.original?.unit)}
        </span>
      ),
    },
    {
      accessorKey: "value",
      header: "Value",
      Cell: ({ row }: any) => {
        const value = Number(row.original?.value) || 0;
        const unit = row.original?.unit;
        return (
          <span className="text-dark fw-bold fs-7">
            {isHourUnit(unit) ? formatHours(value) : (
              <>
                {value.toFixed(2)}
                {unit && <span className="text-muted fs-9 ms-1">{unit}</span>}
              </>
            )}
          </span>
        );
      },
    },
    {
      accessorKey: "score",
      header: "Score",
      Cell: ({ cell }: any) => {
        const score = Number(cell.getValue()) || 0;
        return (
          <span className={`badge fw-bolder fs-7 px-3 py-1 ${score >= 0 ? "badge-light-success" : "badge-light-danger"}`}>
            {score >= 0 ? `+${score.toFixed(2)}` : score.toFixed(2)}
          </span>
        );
      },
    },
  ], []);

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

                  {factors.length === 0 ? (
                    <div className="text-center text-muted py-8 fs-7">
                      No data available for this module.
                    </div>
                  ) : (
                    <MaterialTable
                      tableName="KpiStatistics"
                      employeeId={currentUserId}
                      data={sortKpiFactors(factors, (f: Factor) => f.factor)}
                      columns={columns}
                      hidePagination
                      hideExportCenter
                      enableColumnActions={false}
                    />
                  )}
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
