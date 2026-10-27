import { useEffect, useState, type ReactNode } from "react"
import {
  Bell,
  Briefcase,
  CalendarCheck,
  CalendarDays,
  ChevronsLeft,
  ChevronsRight,
  FileText,
  LayoutDashboard,
  Plus,
  Receipt,
  Search,
  Settings,
  Users,
  Wallet,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/ds/ui/avatar"
import { Badge } from "@/ds/ui/badge"
import { Button } from "@/ds/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ds/ui/tooltip"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/ds/ui/command"
import { cn } from "@/ds/lib/utils"

export type ScreenId = "dashboard" | "employees" | "employee" | "leave"

const NAV: Array<{ group: string; items: Array<{ id: ScreenId | string; label: string; icon: ReactNode; badge?: string }> }> = [
  {
    group: "Workspace",
    items: [
      { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard /> },
      { id: "inbox", label: "Approvals", icon: <CalendarCheck />, badge: "17" },
    ],
  },
  {
    group: "People",
    items: [
      { id: "employees", label: "Employees", icon: <Users /> },
      { id: "leave", label: "Attendance & Leave", icon: <CalendarDays /> },
      { id: "docs", label: "Documents", icon: <FileText /> },
    ],
  },
  {
    group: "Hiring",
    items: [{ id: "recruit", label: "Recruitment", icon: <Briefcase />, badge: "42" }],
  },
  {
    group: "Finance",
    items: [
      { id: "payroll", label: "Payroll", icon: <Wallet /> },
      { id: "claims", label: "Reimbursements", icon: <Receipt /> },
    ],
  },
]

export function AppShell({
  active,
  onNavigate,
  breadcrumb,
  children,
}: {
  active: ScreenId
  onNavigate: (id: ScreenId) => void
  breadcrumb: string[]
  children: ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [palette, setPalette] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setPalette((p) => !p)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const go = (id: string) => {
    if (["dashboard", "employees", "employee", "leave"].includes(id)) onNavigate(id as ScreenId)
  }

  return (
    <div className="flex h-[760px] overflow-hidden rounded-2xl border bg-background shadow-e3">
      {/* Sidebar */}
      <aside
        className={cn(
          "surface-chrome flex shrink-0 flex-col border-r bg-sidebar/80 transition-[width] duration-[var(--duration-slow)] ease-standard",
          collapsed ? "w-[68px]" : "w-60",
        )}
      >
        <div className="flex h-14 items-center gap-2.5 px-4">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-label font-bold text-primary-foreground">
            W
          </span>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-body font-semibold leading-tight">WiseTech</p>
              <p className="truncate text-label text-muted-foreground">MEP Consultants</p>
            </div>
          )}
        </div>
        <nav aria-label="Main" className="flex-1 space-y-5 overflow-y-auto px-3 py-3">
          {NAV.map((g) => (
            <div key={g.group}>
              {!collapsed && (
                <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground">{g.group}</p>
              )}
              <ul className="space-y-0.5">
                {g.items.map((it) => {
                  const isActive = it.id === active || (active === "employee" && it.id === "employees")
                  const btn = (
                    <button
                      type="button"
                      onClick={() => go(it.id)}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "group flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-body font-medium transition-colors duration-[var(--duration-fast)] [&>svg]:size-[18px] [&>svg]:shrink-0",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                        collapsed && "justify-center px-0",
                      )}
                    >
                      {it.icon}
                      {!collapsed && <span className="flex-1 truncate text-left">{it.label}</span>}
                      {!collapsed && it.badge && (
                        <span className="tabular rounded-full bg-primary/10 px-1.5 text-[11px] font-semibold text-primary">{it.badge}</span>
                      )}
                    </button>
                  )
                  return (
                    <li key={it.id}>
                      {collapsed ? (
                        <Tooltip>
                          <TooltipTrigger asChild>{btn}</TooltipTrigger>
                          <TooltipContent side="right">{it.label}</TooltipContent>
                        </Tooltip>
                      ) : (
                        btn
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="border-t p-3">
          <Button
            variant="ghost"
            size="sm"
            className={cn("w-full text-muted-foreground", collapsed ? "justify-center" : "justify-start")}
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronsRight /> : <ChevronsLeft />}
            {!collapsed && "Collapse"}
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="surface-chrome z-10 flex h-14 shrink-0 items-center gap-3 border-b px-5">
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-body">
            {breadcrumb.map((b, i) => (
              <span key={b} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-subtle-foreground">/</span>}
                <span className={i === breadcrumb.length - 1 ? "font-medium text-foreground" : "text-muted-foreground"}>{b}</span>
              </span>
            ))}
          </nav>
          <button
            type="button"
            onClick={() => setPalette(true)}
            className="ml-auto flex h-9 w-72 items-center gap-2 rounded-lg border bg-muted/60 px-3 text-body text-muted-foreground transition-colors hover:bg-muted"
          >
            <Search className="size-4" />
            <span className="flex-1 text-left">Search or jump to…</span>
            <kbd className="rounded border bg-card px-1.5 font-mono text-[11px]">Ctrl K</kbd>
          </button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
                <Bell />
                <span className="absolute right-2 top-2 size-2 rounded-full bg-destructive ring-2 ring-card" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Notifications</TooltipContent>
          </Tooltip>
          <Avatar className="size-8">
            <AvatarFallback className="bg-primary text-label font-semibold text-primary-foreground">ZA</AvatarFallback>
          </Avatar>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>

      <CommandDialog open={palette} onOpenChange={setPalette} title="Command palette" description="Search people and actions">
        <CommandInput placeholder="Search people, pages and actions…" />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>
          <CommandGroup heading="Actions">
            <CommandItem onSelect={() => setPalette(false)}>
              <Plus /> Add employee <CommandShortcut>N E</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => { go("leave"); setPalette(false) }}>
              <CalendarDays /> Apply leave <CommandShortcut>A L</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => setPalette(false)}>
              <CalendarCheck /> Review approvals <Badge variant="info" className="ml-auto">17</Badge>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="People">
            {["Abhishek Phatak", "Sheetal Kulkarni", "Rohan Mehta"].map((p) => (
              <CommandItem key={p} onSelect={() => { go("employee"); setPalette(false) }}>
                <Avatar className="size-5">
                  <AvatarFallback className="text-[10px]">{p.split(" ").map((x) => x[0]).join("")}</AvatarFallback>
                </Avatar>
                {p}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Go to">
            <CommandItem onSelect={() => { go("dashboard"); setPalette(false) }}>
              <LayoutDashboard /> Dashboard
            </CommandItem>
            <CommandItem onSelect={() => { go("employees"); setPalette(false) }}>
              <Users /> Employees
            </CommandItem>
            <CommandItem onSelect={() => setPalette(false)}>
              <Settings /> Settings
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  )
}
