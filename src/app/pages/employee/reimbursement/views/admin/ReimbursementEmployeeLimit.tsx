import MaterialTable from "@app/modules/common/components/MaterialTable";
import { IReimbursementEmployeeLimit } from "@models/employee";
import { fetchReimbursementEmployeeLimits } from "@services/options";
import { updateEmployee } from "@services/employee";
import { MRT_ColumnDef } from "material-react-table";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";

function ReimbursementEmployeeLimit() {
  const [employeeLimits, setEmployeeLimits] = useState<IReimbursementEmployeeLimit[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editError, setEditError] = useState<string>("");

  const employeeId = useSelector(
    (state: RootState) => state.employee.currentEmployee.id
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchReimbursementEmployeeLimits();
      const limits: IReimbursementEmployeeLimit[] = (res?.data?.employeeLimits ?? []).sort(
        (a: IReimbursementEmployeeLimit, b: IReimbursementEmployeeLimit) =>
          a.name.localeCompare(b.name)
      );
      setEmployeeLimits(limits);
    } catch {
      setEmployeeLimits([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEdit = useCallback((row: IReimbursementEmployeeLimit) => {
    setEditingId(row.id);
    setEditValue(
      row.reimbursementLimitPerRequest != null
        ? String(row.reimbursementLimitPerRequest)
        : ""
    );
    setEditError("");
  }, []);

  const handleCancel = useCallback(() => {
    setEditingId(null);
    setEditValue("");
    setEditError("");
  }, []);

  const handleSave = useCallback(
    async (row: IReimbursementEmployeeLimit) => {
      const trimmed = editValue.trim();
      if (trimmed === "") {
        setEditError("Amount is required.");
        return;
      }
      const parsed = Number(trimmed);
      if (isNaN(parsed) || parsed < 0) {
        setEditError("Enter a valid non-negative number.");
        return;
      }
      setEditError("");
      setSavingId(row.id);
      try {
        await updateEmployee(row.id, { reimbursementLimitPerRequest: parsed });
        setEditingId(null);
        setEditValue("");
        await loadData();
      } catch {
        setEditError("Failed to save. Please try again.");
      } finally {
        setSavingId(null);
      }
    },
    [editValue, loadData]
  );

  const columns = useMemo<MRT_ColumnDef<IReimbursementEmployeeLimit>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Employee",
        enableSorting: false,
        enableColumnActions: false,
        Cell: ({ renderedCellValue }: any) => renderedCellValue,
      },
      {
        accessorKey: "reimbursementLimitPerRequest",
        header: "Amount Limit Per Request",
        enableSorting: false,
        enableColumnActions: false,
        Cell: ({ row }: any) => {
          const rowData = row.original as IReimbursementEmployeeLimit;
          if (editingId === rowData.id) {
            return (
              <div>
                <input
                  className={`form-control form-control-sm${editError ? " is-invalid" : ""}`}
                  style={{ maxWidth: 180 }}
                  value={editValue}
                  min={0}
                  step="any"
                  onChange={(e) => {
                    setEditValue(e.target.value);
                    setEditError("");
                  }}
                  autoFocus
                  disabled={savingId === rowData.id}
                />
                {editError && (
                  <div className="text-danger fs-8 mt-1">{editError}</div>
                )}
              </div>
            );
          }
          return rowData.reimbursementLimitPerRequest != null
            ? Number(rowData.reimbursementLimitPerRequest).toLocaleString("en-IN")
            : "-";
        },
      },
      {
        id: "actions",
        header: "Action",
        enableSorting: false,
        enableColumnActions: false,
        size: 120,
        Cell: ({ row }: any) => {
          const rowData = row.original as IReimbursementEmployeeLimit;
          const isEditing = editingId === rowData.id;
          const isSaving = savingId === rowData.id;

          if (isEditing) {
            return (
              <div className="d-flex align-items-center gap-2">
                <button
                  type="button"
                  className="btn btn-icon btn-sm btn-light-success"
                  title="Save"
                  onClick={() => handleSave(rowData)}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <span
                      className="spinner-border spinner-border-sm text-success"
                      role="status"
                    />
                  ) : (
                    <i className="ki-duotone ki-check fs-3 text-success" />
                  )}
                </button>
                <button
                  type="button"
                  className="btn btn-icon btn-sm btn-light-danger"
                  title="Cancel"
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  <i className="ki-duotone ki-cross fs-3 text-danger">
                    <span className="path1" />
                    <span className="path2" />
                  </i>
                </button>
              </div>
            );
          }

          return (
            <button
              type="button"
              className="btn btn-icon btn-sm btn-light-primary"
              title="Edit"
              onClick={() => handleEdit(rowData)}
            >
              <i className="ki-duotone ki-pencil fs-4 text-primary">
                <span className="path1" />
                <span className="path2" />
              </i>
            </button>
          );
        },
      },
    ],
    [editingId, editValue, editError, savingId, handleEdit, handleCancel, handleSave]
  );

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4">
        <h2>Reimbursement Employee Per Request Limit</h2>
      </div>

      <MaterialTable
        columns={columns}
        data={employeeLimits}
        hideExportCenter={true}
        employeeId={employeeId}
        isLoading={loading}
        muiTableProps={{
          sx: {
            "& .MuiTableBody-root .MuiTableCell-root": {
              borderBottom: "none",
              paddingY: "5px",
            },
          },
        }}
        tableName="Reimbursement Employee Limits"
      />
    </>
  );
}

export default ReimbursementEmployeeLimit;
