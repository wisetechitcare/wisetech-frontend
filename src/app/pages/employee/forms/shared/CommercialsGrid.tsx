import React from "react";
import { FieldArray, useFormikContext } from "formik";
import { Button } from "react-bootstrap";
import { Delete, Add } from "@mui/icons-material";
import "./Workspace.css";

interface CommercialsGridProps {
  type: "lead" | "project";
}

export const CommercialsGrid: React.FC<CommercialsGridProps> = ({ type }) => {
  const { values, setFieldValue, setFieldError } = useFormikContext<any>();

  const isLead = type === "lead";
  const arrayPath = isLead ? "projectAreas" : "commercials";
  const items = values[arrayPath] || [];

  // Helper to safely format numbers as standard Indian Rupees
  const formatCurrency = (val: number) => {
    return val.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Perform auto-calculation for a given row
  const recalculateRow = (index: number, updatedFields: Partial<any>) => {
    // Merge the latest values array with the incoming change to bypass stale closures
    const currentItems = values[arrayPath] || [];
    const item = { ...(currentItems[index] || {}), ...updatedFields };

    if (isLead) {
      const area = parseFloat(item.projectArea) || 0;
      const rate = parseFloat(item.rate) || 0;
      const costType = String(item.costType);

      if (costType === "1") {
        // Rate cost type: calculate total
        const calculatedCost = parseFloat((area * rate).toFixed(4));
        setFieldValue(`projectAreas.${index}.cost`, calculatedCost.toString());

        // Validate max 100 Crore limit
        if (calculatedCost > 10000000000) {
          setFieldError(`projectAreas.${index}.cost`, "Calculated cost exceeds 100 Crores limit");
        } else {
          setFieldError(`projectAreas.${index}.cost`, "");
        }
      } else if (costType === "2") {
        // Lumpsum: clear rate
        setFieldValue(`projectAreas.${index}.rate`, "0");
      }
    } else {
      const area = parseFloat(item.area) || 0;
      const rate = parseFloat(item.rate) || 0;
      const costType = String(item.costType);

      if (costType === "RATE") {
        const calculatedCost = parseFloat((area * rate).toFixed(4));
        setFieldValue(`commercials.${index}.rateCost`, calculatedCost.toString());
      } else if (costType === "LUMPSUM") {
        setFieldValue(`commercials.${index}.rate`, "0");
      }
    }
  };

  // Calculate Grand Total of all rows
  const getGrandTotal = () => {
    let grandTotal = 0;
    for (const item of items) {
      if (isLead) {
        if (item.costType === "1") {
          grandTotal += parseFloat(item.cost) || 0;
        } else if (item.costType === "2") {
          grandTotal += parseFloat(item.cost) || 0; // standard lumpsum cost
        }
      } else {
        if (item.costType === "RATE") {
          grandTotal += parseFloat(item.rateCost) || 0;
        } else if (item.costType === "LUMPSUM") {
          grandTotal += parseFloat(item.lumpsumCost) || 0;
        }
      }
    }
    return grandTotal;
  };

  return (
    <FieldArray name={arrayPath}>
      {({ push, remove }) => (
        <div className="commercials-grid-card">
          <div className="table-responsive">
            <table className="commercials-table">
              <thead className="commercials-thead">
                <tr>
                  <th className="commercials-th" style={{ width: "25%" }}>Label</th>
                  <th className="commercials-th" style={{ width: "15%" }}>Area (sqft)</th>
                  <th className="commercials-th" style={{ width: "18%" }}>Cost Type</th>
                  <th className="commercials-th" style={{ width: "17%" }}>Rate</th>
                  <th className="commercials-th" style={{ width: "20%" }}>Calculated Cost</th>
                  <th className="commercials-th" style={{ width: "5%", textAlign: "center" }}></th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-gray-500 fw-semibold fs-7">
                      No commercial items added yet. Click "+ Add Row" to begin.
                    </td>
                  </tr>
                ) : (
                  items.map((item: any, index: number) => {
                    const costType = item.costType;
                    const showRateField = isLead ? costType !== "2" : costType !== "LUMPSUM";

                    return (
                      <tr key={index} className="commercials-tr">
                        {/* Label field */}
                        <td className="commercials-td">
                          <input
                            type="text"
                            value={item.label || ""}
                            onChange={(e) => setFieldValue(`${arrayPath}.${index}.label`, e.target.value)}
                            className="commercials-input"
                            placeholder="e.g. Basement Ground"
                          />
                        </td>

                        {/* Area field */}
                        <td className="commercials-td">
                          <input
                            type="number"
                            value={isLead ? item.projectArea || "" : item.area || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              const areaKey = isLead ? "projectArea" : "area";
                              setFieldValue(`${arrayPath}.${index}.${areaKey}`, val);
                              recalculateRow(index, { [areaKey]: val });
                            }}
                            className="commercials-input"
                            placeholder="0"
                          />
                        </td>

                        {/* Cost Type select */}
                        <td className="commercials-td">
                          <select
                            value={costType || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFieldValue(`${arrayPath}.${index}.costType`, val);
                              recalculateRow(index, { costType: val });
                            }}
                            className="commercials-input form-select"
                          >
                            {isLead ? (
                              <>
                                <option value="1">Rate</option>
                                <option value="2">Lumpsum</option>
                              </>
                            ) : (
                              <>
                                <option value="RATE">Rate</option>
                                <option value="LUMPSUM">Lumpsum</option>
                              </>
                            )}
                          </select>
                        </td>

                        {/* Rate field */}
                        <td className="commercials-td">
                          {showRateField ? (
                            <input
                              type="number"
                              value={item.rate || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setFieldValue(`${arrayPath}.${index}.rate`, val);
                                recalculateRow(index, { rate: val });
                              }}
                              className="commercials-input"
                              placeholder="0.00"
                            />
                          ) : (
                            <span className="text-gray-400 fs-7 px-3 fw-semibold">N/A (Lumpsum)</span>
                          )}
                        </td>

                        {/* Cost field (Calculated or input depending on Type) */}
                        <td className="commercials-td">
                          {showRateField ? (
                            <input
                              type="text"
                              value={isLead ? item.cost || "" : item.rateCost || ""}
                              readOnly
                              className="commercials-input bg-light text-gray-700 fw-semibold"
                              placeholder="Calculated"
                            />
                          ) : (
                            <input
                              type="number"
                              value={isLead ? item.cost || "" : item.lumpsumCost || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                const costKey = isLead ? "cost" : "lumpsumCost";
                                setFieldValue(`${arrayPath}.${index}.${costKey}`, val);
                              }}
                              className="commercials-input"
                              placeholder="Enter Cost"
                            />
                          )}
                        </td>

                        {/* Delete Row button */}
                        <td className="commercials-td text-center">
                          <Button
                            variant="link"
                            className="text-danger p-1"
                            onClick={() => remove(index)}
                            title="Delete Row"
                          >
                            <Delete />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table summary actions footer */}
          <div className="d-flex justify-content-between align-items-center p-4 bg-light border-top">
            <Button
              variant="outline-primary"
              size="sm"
              onClick={() => {
                if (isLead) {
                  push({ label: "", projectArea: "", costType: "1", rate: "", cost: "" });
                } else {
                  push({ label: "", area: "", costType: "RATE", rate: "", rateCost: "", lumpsumCost: "" });
                }
              }}
              className="d-flex align-items-center gap-1 fw-bold"
            >
              <Add style={{ fontSize: "1.1rem" }} />
              Add Commercial Row
            </Button>

            <div className="d-flex align-items-center gap-2">
              <span className="text-gray-600 fs-7 fw-bold uppercase">Grand Total:</span>
              <span className="text-primary fs-6 fw-bolder">
                ₹ {formatCurrency(getGrandTotal())}
              </span>
            </div>
          </div>
        </div>
      )}
    </FieldArray>
  );
};
