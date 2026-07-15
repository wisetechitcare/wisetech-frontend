import MaterialTable from "@app/modules/common/components/MaterialTable";
import { C, FONT, RADIUS, ConfigSectionCard } from "@app/modules/configuration";
import { IReimbursementEmployeeLimit } from "@models/employee";
import { fetchReimbursementEmployeeLimits } from "@services/options";
import { updateEmployee } from "@services/employee";
import { MRT_ColumnDef } from "material-react-table";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import { useEventBus } from "@hooks/useEventBus";
import { EVENT_KEYS } from "@constants/eventKeys";

// ─── Small icon-only action button, matches the hover-tint pattern used by ──
// the other configuration pages' chip edit/delete controls.
const RowIconBtn: React.FC<{
  icon: string;
  title: string;
  tone: "primary" | "success" | "danger";
  onClick: () => void;
  disabled?: boolean;
}> = ({ icon, title, tone, onClick, disabled }) => {
  const [hov, setHov] = useState(false);
  const TONE = {
    primary: { bg: "#eff6ff", color: "#4f82c4" },
    success: { bg: C.successLight, color: "#16a34a" },
    danger: { bg: C.dangerLight, color: C.danger },
  }[tone];

  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov && !disabled ? TONE.bg : "transparent",
        border: "none",
        borderRadius: RADIUS.sm,
        padding: "6px 8px",
        cursor: disabled ? "not-allowed" : "pointer",
        color: hov && !disabled ? TONE.color : C.textMuted,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.5 : 1,
        transition: "all 0.15s ease",
      }}
    >
      <i className={`bi ${icon}`} style={{ fontSize: "14px" }} />
    </button>
  );
};

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

  useEventBus(EVENT_KEYS.reimbursementChanged, () => { loadData(); });

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
        enableSorting: true,
        enableColumnActions: false,
        Cell: ({ renderedCellValue }: any) => (
          <span style={{ fontFamily: FONT.body, fontWeight: 500, fontSize: "13px", color: C.textPrimary }}>
            {renderedCellValue}
          </span>
        ),
      },
      {
        accessorKey: "reimbursementLimitPerRequest",
        header: "Amount Limit Per Request",
        enableSorting: true,
        enableColumnActions: false,
        Cell: ({ row }: any) => {
          const rowData = row.original as IReimbursementEmployeeLimit;
          if (editingId === rowData.id) {
            return (
              <div>
                <input
                  className="rl-edit-input"
                  style={{
                    maxWidth: 180,
                    height: 34,
                    border: `1px solid ${editError ? C.danger : C.border}`,
                    borderRadius: RADIUS.md,
                    padding: "0 10px",
                    fontSize: "13px",
                    fontFamily: FONT.body,
                    color: C.textPrimary,
                    outline: "none",
                    transition: "border-color 0.15s ease",
                  }}
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
                  <div style={{ fontFamily: FONT.body, fontSize: "11px", color: C.danger, marginTop: "4px" }}>
                    {editError}
                  </div>
                )}
              </div>
            );
          }
          return (
            <span
              style={{
                fontFamily: FONT.body,
                fontWeight: 600,
                fontSize: "13px",
                color: rowData.reimbursementLimitPerRequest != null ? C.textPrimary : C.textMuted,
                fontStyle: rowData.reimbursementLimitPerRequest != null ? "normal" : "italic",
              }}
            >
              {rowData.reimbursementLimitPerRequest != null
                ? `₹${Number(rowData.reimbursementLimitPerRequest).toLocaleString("en-IN")}`
                : "No limit set"}
            </span>
          );
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
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                {isSaving ? (
                  <span
                    className="spinner-border spinner-border-sm"
                    style={{ color: C.primary, margin: "6px 8px" }}
                    role="status"
                    aria-hidden="true"
                  />
                ) : (
                  <RowIconBtn
                    icon="bi-check-lg"
                    title="Save"
                    tone="success"
                    onClick={() => handleSave(rowData)}
                    disabled={isSaving}
                  />
                )}
                <RowIconBtn
                  icon="bi-x-lg"
                  title="Cancel"
                  tone="danger"
                  onClick={handleCancel}
                  disabled={isSaving}
                />
              </div>
            );
          }

          return (
            <RowIconBtn
              icon="bi-pencil"
              title="Edit"
              tone="primary"
              onClick={() => handleEdit(rowData)}
            />
          );
        },
      },
    ],
    [editingId, editValue, editError, savingId, handleEdit, handleCancel, handleSave]
  );

  return (
    <>
      <style>{`
        .rl-edit-input:focus {
          border-color: ${C.primary} !important;
          box-shadow: 0 0 0 3px ${C.primaryLight} !important;
        }
      `}</style>

      <ConfigSectionCard
        title="Employee Limits"
        description="Set custom per-request reimbursement limits for individual employees."
        icon="bi-shield-check"
        iconColor="blue"
      >
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
      </ConfigSectionCard>
    </>
  );
}

export default ReimbursementEmployeeLimit;
