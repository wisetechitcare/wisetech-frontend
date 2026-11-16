import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import { Employee, saveSelectedEmployee } from "@redux/slices/employee";
import { RootState } from "@redux/store";
import { fetchAllEmployees } from "@services/employee";
import { useTeamFilter } from "@/contexts/TeamFilterContext";
import { cn } from "@/ds/lib/utils";
import { Card } from "@/ds/ui/card";
import { Field, FieldLabel } from "@/ds/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ds/ui/select";
import { PersonPicker, type PersonOption } from "@/ds/patterns/person-picker";

type EmployeeStatus = "all" | "active" | "inactive";

const STATUS_ITEMS: { value: EmployeeStatus; label: string; dot?: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active", dot: "bg-success" },
  { value: "inactive", label: "Inactive", dot: "bg-muted-foreground" },
];

const fullName = (e: Employee) => `${e.users?.firstName ?? ""} ${e.users?.lastName ?? ""}`.trim();

/** A status option: the label and, for Active / Inactive, the dot the old picker used. */
function StatusLabel({ value }: { value: EmployeeStatus }) {
  const item = STATUS_ITEMS.find((s) => s.value === value)!;
  return (
    <span className="flex items-center gap-2">
      {item.dot && <span aria-hidden className={cn("size-2 shrink-0 rounded-full", item.dot)} />}
      {item.label}
    </span>
  );
}

/**
 * "Whose records am I looking at?" — the bar at the top of every admin Search Employee screen
 * (reimbursement, salary, loans, KPIs, increments, attendance). Picks an employee into
 * `state.employee.selectedEmployee`, which those screens read.
 *
 * On the design system: an Employee Status Select beside the kit `PersonPicker` (type a name or an
 * employee code; namesakes are told apart by code and role), both floating-label fields in one card.
 * Was MUI Autocomplete + TextField inside react-bootstrap Rows, with a desktop and a mobile copy of
 * the same markup; one responsive grid now.
 *
 * Behaviour is unchanged:
 * - opens on Active, and the logged-in employee is selected until someone else is picked;
 * - changing the status clears the pick (the person may not be in the new list);
 * - clearing the search goes back to the logged-in employee;
 * - the team filter (TeamFilterContext) narrows the list;
 * - arriving with `location.state.employeeId` (a row clicked on Reimbursement Details / payroll)
 *   selects that employee once the list has loaded.
 */
const AllEmployeesSearchDropdown = () => {
  const location = useLocation();
  const dispatch = useDispatch();
  const loggedInEmployee = useSelector((state: RootState) => state.employee.currentEmployee);
  const { filterIds } = useTeamFilter();

  const [statusFilter, setStatusFilter] = useState<EmployeeStatus>("active");
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [selectedId, setSelectedId] = useState<string>(loggedInEmployee?.id ?? "");

  const select = (employee: Employee | null | undefined) => {
    setSelectedId(employee?.id ?? "");
    if (employee) dispatch(saveSelectedEmployee(employee));
  };

  // Fetch employees for the status filter (the API filters; `all` sends no flag).
  useEffect(() => {
    let cancelled = false;
    const isActive = statusFilter === "active" ? true : statusFilter === "inactive" ? false : undefined;
    fetchAllEmployees(isActive)
      .then(({ data }) => {
        if (cancelled) return;
        const employees: Employee[] = data?.employees ?? [];
        setAllEmployees(filterIds ? employees.filter((e) => filterIds.includes(e.id)) : employees);
      })
      .catch(() => { if (!cancelled) setAllEmployees([]); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on status only, as before
  }, [statusFilter]);

  // The logged-in employee is the selection on first open.
  useEffect(() => {
    if (loggedInEmployee?.id) dispatch(saveSelectedEmployee(loggedInEmployee));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on mount
  }, []);

  // Arrived from a row elsewhere (Reimbursement Details, payroll): select that employee.
  useEffect(() => {
    const targetId = (location.state as { employeeId?: string } | null)?.employeeId;
    if (!targetId || allEmployees.length === 0) return;
    const match = allEmployees.find((e) => e.id === targetId);
    if (match) select(match);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- select is stable in effect
  }, [allEmployees, location.state]);

  // Sorted by first name, as before; the option shows the code and role so namesakes can be told apart.
  const people = useMemo<PersonOption[]>(
    () => [...allEmployees]
      .sort((a, b) => (a.users?.firstName ?? "").localeCompare(b.users?.firstName ?? ""))
      .map((e) => ({
        id: e.id,
        name: fullName(e),
        code: e.employeeCode ?? undefined,
        subtitle: [e.designations?.role, e.isActive === false ? "Inactive" : null].filter(Boolean).join(" · ") || undefined,
        avatarUrl: e.avatar ?? undefined,
      })),
    [allEmployees],
  );

  return (
    <Card variant="panel" className="p-4">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
        <Field>
          <FieldLabel htmlFor="employee-search-status">Employee Status</FieldLabel>
          <Select
            items={STATUS_ITEMS.map(({ value, label }) => ({ value, label }))}
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v as EmployeeStatus);
              // The person may not be in the new list; show the placeholder until someone is picked.
              setSelectedId("");
            }}
          >
            <SelectTrigger id="employee-search-status" className="w-full">
              <SelectValue>{(v: EmployeeStatus) => <StatusLabel value={v} />}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {STATUS_ITEMS.map((s) => (
                <SelectItem key={s.value} value={s.value}><StatusLabel value={s.value} /></SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="employee-search-person">Search by Name or ID</FieldLabel>
          <PersonPicker
            id="employee-search-person"
            people={people}
            value={selectedId ? [selectedId] : []}
            placeholder="Type a name or employee ID"
            onChange={(ids) => {
              if (ids[0]) select(allEmployees.find((e) => e.id === ids[0]));
              // Cleared: back to the logged-in employee, as before.
              else select(loggedInEmployee);
            }}
          />
        </Field>
      </div>
    </Card>
  );
};

export default AllEmployeesSearchDropdown;
