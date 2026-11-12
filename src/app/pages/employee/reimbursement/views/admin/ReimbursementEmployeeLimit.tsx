import { createContext, useCallback, useContext, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Check, Pencil, ShieldCheck, X } from "lucide-react";
import { Button } from "@/ds/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/ds/ui/input-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ds/ui/tooltip";
import { DataTable, SortableHeader, type ColumnDef } from "@/ds/patterns/data-table";
import { PersonCell } from "@/ds/patterns/person";
import { SettingsSection } from "@/ds/patterns/settings-section";
import { useOrgFilters, OrgFilterSheetButton } from "@app/modules/common/components/ui/OrgFilterToolbar";
import { IReimbursementEmployeeLimit } from "@models/employee";
import { fetchReimbursementEmployeeLimits } from "@services/options";
import { updateEmployee, fetchAllEmployees } from "@services/employee";
import { can } from "@utils/can";
import { useEventBus } from "@hooks/useEventBus";
import { EVENT_KEYS } from "@constants/eventKeys";
import { formatCurrency, getCurrencySymbol } from "@utils/currency";

/** A limits row with the org facts joined on, so the shared filters can narrow it. */
type LimitRow = IReimbursementEmployeeLimit & {
  subOrganization: string;
  branch: string;
  team: string;
  isActive: boolean;
};

// ─── Inline edit ──────────────────────────────────────────────────────────────
// The edit state reaches the cells through context, so the column definitions stay STABLE. The
// table renders each cell as a component; columns rebuilt on every keystroke would remount the
// input under the caret and drop focus after one character.

interface EditState {
  editingId: string | null;
  editValue: string;
  editError: string;
  savingId: string | null;
  setEditValue: (v: string) => void;
  edit: (row: LimitRow) => void;
  cancel: () => void;
  save: (row: LimitRow) => void;
}
const EditContext = createContext<EditState | null>(null);
const useEdit = () => useContext(EditContext)!;

/** A row icon action with its tooltip (Button story "Tinted"). */
function RowAction({ label, tint, disabled, loading, onClick, children }: {
  label: string;
  tint?: string;
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="tinted"
            size="icon-sm"
            aria-label={label}
            disabled={disabled}
            loading={loading}
            onClick={onClick}
            style={tint ? ({ "--tint": tint } as CSSProperties) : undefined}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function LimitCell({ row }: { row: LimitRow }) {
  const e = useEdit();
  if (e.editingId === row.id) {
    const errorId = `limit-error-${row.id}`;
    return (
      <div className="space-y-1">
        <InputGroup className="h-9 w-44">
          <InputGroupAddon>
            <InputGroupText>{getCurrencySymbol()}</InputGroupText>
          </InputGroupAddon>
          <InputGroupInput
            aria-label={`Limit per request for ${row.name}`}
            aria-invalid={e.editError ? true : undefined}
            aria-describedby={e.editError ? errorId : undefined}
            inputMode="decimal"
            value={e.editValue}
            autoFocus
            disabled={e.savingId === row.id}
            onChange={(ev) => e.setEditValue(ev.target.value)}
            // Enter saves, Esc cancels — the keyboard path to the two buttons beside it.
            onKeyDown={(ev) => {
              if (ev.key === "Enter") { ev.preventDefault(); e.save(row); }
              if (ev.key === "Escape") { ev.preventDefault(); e.cancel(); }
            }}
          />
        </InputGroup>
        {e.editError && <p id={errorId} role="alert" className="m-0 text-xs text-destructive">{e.editError}</p>}
      </div>
    );
  }
  return row.reimbursementLimitPerRequest != null ? (
    <span className="tabular font-semibold">{formatCurrency(Number(row.reimbursementLimitPerRequest))}</span>
  ) : (
    <span className="text-muted-foreground italic">No Limit Set</span>
  );
}

function ActionsCell({ row }: { row: LimitRow }) {
  const e = useEdit();
  if (e.editingId === row.id) {
    const saving = e.savingId === row.id;
    return (
      <div className="flex items-center gap-1.5">
        <RowAction label="Save" tint="var(--cta-success)" loading={saving} onClick={() => e.save(row)}>
          <Check aria-hidden />
        </RowAction>
        <RowAction label="Cancel" tint="var(--cta-danger)" disabled={saving} onClick={e.cancel}>
          <X aria-hidden />
        </RowAction>
      </div>
    );
  }
  return (
    <RowAction label={`Edit limit for ${row.name}`} onClick={() => e.edit(row)}>
      <Pencil aria-hidden />
    </RowAction>
  );
}

const COLUMNS: ColumnDef<LimitRow, any>[] = [
  {
    accessorKey: "name",
    meta: { label: "Employee" },
    enableHiding: false,
    header: ({ column }) => <SortableHeader column={column} title="Employee" />,
    cell: ({ row }) => <PersonCell showAvatar={false} name={row.original.name} inactive={!row.original.isActive} />,
  },
  {
    accessorKey: "subOrganization",
    meta: { label: "Sub Organization" },
    header: ({ column }) => <SortableHeader column={column} title="Sub Organization" />,
  },
  {
    accessorKey: "branch",
    meta: { label: "Branch" },
    header: ({ column }) => <SortableHeader column={column} title="Branch" />,
  },
  {
    id: "limit",
    accessorFn: (r) => (r.reimbursementLimitPerRequest == null ? -1 : Number(r.reimbursementLimitPerRequest)),
    meta: {
      label: "Amount Limit Per Request",
      exportValue: (r: LimitRow) => (r.reimbursementLimitPerRequest == null ? "No limit set" : Number(r.reimbursementLimitPerRequest)),
    },
    header: ({ column }) => <SortableHeader column={column} title="Amount Limit Per Request" />,
    cell: ({ row }) => <LimitCell row={row.original} />,
  },
  {
    id: "actions",
    enableHiding: false,
    enableSorting: false,
    meta: { label: "Actions", pin: "end", export: false },
    header: "Actions",
    cell: ({ row }) => <ActionsCell row={row.original} />,
  },
];

function ReimbursementEmployeeLimit() {
  const [employeeLimits, setEmployeeLimits] = useState<LimitRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editError, setEditError] = useState<string>("");

  // The limits endpoint returns id, name and the limit — sub-org, branch and team are joined in
  // from the employee list, the same source the payroll and payment toolbars filter on. A failed
  // join costs the filters their options, never a row: an employee whose org data is missing
  // still appears and is still editable.
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [limitsRes, employeesRes] = await Promise.all([
        fetchReimbursementEmployeeLimits(),
        fetchAllEmployees().catch(() => null),
      ]);

      const org = new Map<string, { subOrganization: string; branch: string; team: string; isActive: boolean }>();
      ((employeesRes as any)?.data?.employees ?? []).forEach((emp: any) => {
        org.set(emp.id, {
          subOrganization: emp.companyOverview?.name || 'N/A',
          branch: emp.branches?.name || 'N/A',
          // One team per employee; prefer the active membership (same rule as payroll).
          team: (emp.teamMemberships ?? []).find((m: any) => m.isActive !== false)?.team?.name || 'N/A',
          isActive: emp.isActive !== false,
        });
      });

      const limits: LimitRow[] = (limitsRes?.data?.employeeLimits ?? [])
        .map((l: IReimbursementEmployeeLimit) => ({
          ...l,
          subOrganization: org.get(l.id)?.subOrganization ?? 'N/A',
          branch: org.get(l.id)?.branch ?? 'N/A',
          team: org.get(l.id)?.team ?? 'N/A',
          isActive: org.get(l.id)?.isActive ?? true,
        }))
        .sort((a: LimitRow, b: LimitRow) => a.name.localeCompare(b.name));

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
      // Rewriting an employee's spending limit had no permission gate at all — reachable by
      // anyone who could open this tab, which until now meant anyone with `finance.view.team`.
      if (!can("finance.manage.all")) {
        setEditError("You are not authorized to change spending limits.");
        return;
      }
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

  const filters = useOrgFilters(employeeLimits);
  const visibleLimits = useMemo(
    () => employeeLimits.filter(filters.matches),
    [employeeLimits, filters],
  );

  const edit = useMemo<EditState>(() => ({
    editingId,
    editValue,
    editError,
    savingId,
    setEditValue: (v) => { setEditValue(v); setEditError(""); },
    edit: handleEdit,
    cancel: handleCancel,
    save: handleSave,
  }), [editingId, editValue, editError, savingId, handleEdit, handleCancel, handleSave]);

  return (
    <SettingsSection
      title="Employee Limits"
      description="Set custom per-request reimbursement limits for individual employees."
      icon={<ShieldCheck />}
      tone="blue"
      count={visibleLimits.length}
      divided={false}
    >
      <EditContext.Provider value={edit}>
        <DataTable
          caption="Reimbursement employee limits"
          stateKey="reimbursement.employee-limits"
          columns={COLUMNS}
          data={visibleLimits}
          getRowId={(r) => r.id}
          loading={loading}
          searchPlaceholder="Search employee…"
          filters={<OrgFilterSheetButton filters={filters} />}
          initialSorting={[{ id: "name", desc: false }]}
        />
      </EditContext.Provider>
    </SettingsSection>
  );
}

export default ReimbursementEmployeeLimit;
