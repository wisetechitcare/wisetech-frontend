import { useState } from "react"
import { AppShell, type ScreenId } from "../screens/AppShell"
import { DashboardScreen } from "../screens/DashboardScreen"
import { EmployeesScreen } from "../screens/EmployeesScreen"
import { EmployeeDetailScreen } from "../screens/EmployeeDetailScreen"
import { LeaveMobileScreen } from "../screens/LeaveMobileScreen"
import { PEOPLE, type Person } from "../screens/fixtures"

const CRUMBS: Record<ScreenId, string[]> = {
  dashboard: ["Workspace", "Dashboard"],
  employees: ["People", "Employees"],
  employee: ["People", "Employees", "Profile"],
  leave: ["People", "Attendance & Leave", "Apply leave"],
}

/** The v2 app shell with the hero screens. Navigate with the sidebar, or press Ctrl K. */
export function Screens() {
  const initial = (new URLSearchParams(location.search).get("screen") as ScreenId) ?? "dashboard"
  const [screen, setScreen] = useState<ScreenId>(CRUMBS[initial] ? initial : "dashboard")
  const [person, setPerson] = useState<Person>(PEOPLE[0])

  return (
    <div className="space-y-3">
      <p className="text-body text-muted-foreground">
        Prototype of the new app shell and hero screens — use the sidebar, or press <kbd className="rounded border bg-card px-1 font-mono text-label">Ctrl K</kbd>.
      </p>
      <AppShell active={screen} onNavigate={setScreen} breadcrumb={CRUMBS[screen]}>
        {screen === "dashboard" && <DashboardScreen />}
        {screen === "employees" && (
          <EmployeesScreen
            onOpen={(p) => {
              setPerson(p)
              setScreen("employee")
            }}
          />
        )}
        {screen === "employee" && <EmployeeDetailScreen person={person} onBack={() => setScreen("employees")} />}
        {screen === "leave" && <LeaveMobileScreen />}
      </AppShell>
    </div>
  )
}
