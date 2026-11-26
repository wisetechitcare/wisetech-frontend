import { useState } from "react"
import { AppShell, type ScreenId } from "@/storybook/screens/app/AppShell"
import { DashboardScreen } from "@/storybook/screens/app/DashboardScreen"
import { EmployeesScreen } from "@/storybook/screens/app/EmployeesScreen"
import { EmployeeDetailScreen } from "@/storybook/screens/app/EmployeeDetailScreen"
import { LeaveMobileScreen } from "@/storybook/screens/app/LeaveMobileScreen"
import { PEOPLE, type Person } from "@/storybook/screens/app/fixtures"

const CRUMBS: Record<ScreenId, string[]> = {
  dashboard: ["Workspace", "Dashboard"],
  employees: ["People", "Employees"],
  employee: ["People", "Employees", "Profile"],
  leave: ["People", "Attendance & Leave", "Apply leave"],
}

/** The v2 app shell with the hero screens (prototype). Navigate with the sidebar, or press Ctrl K. */
export function PrototypeApp({ initialScreen = "dashboard" }: { initialScreen?: ScreenId }) {
  const [screen, setScreen] = useState<ScreenId>(initialScreen)
  const [person, setPerson] = useState<Person>(PEOPLE[0])

  return (
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
  )
}
