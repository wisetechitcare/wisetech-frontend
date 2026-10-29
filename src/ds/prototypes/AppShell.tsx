import { Fragment, useEffect, useState, type ReactNode } from "react"
import {
  Bell,
  Briefcase,
  CalendarCheck,
  CalendarDays,
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
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/ds/ui/breadcrumb"
import { Button } from "@/ds/ui/button"
import { Kbd, KbdGroup } from "@/ds/ui/kbd"
import { Separator } from "@/ds/ui/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/ds/ui/sidebar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ds/ui/tooltip"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/ds/ui/command"

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

/** The app shell, built from shadcn's Sidebar (collapses to icons; Ctrl/⌘ B toggles it). */
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
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" onClick={() => go("dashboard")}>
                <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary text-xs font-bold text-primary-foreground">
                  W
                </span>
                <span className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-semibold">WiseTech</span>
                  <span className="truncate text-xs text-muted-foreground">MEP Consultants</span>
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          {NAV.map((g) => (
            <SidebarGroup key={g.group}>
              <SidebarGroupLabel>{g.group}</SidebarGroupLabel>
              <SidebarMenu>
                {g.items.map((it) => {
                  const isActive = it.id === active || (active === "employee" && it.id === "employees")
                  return (
                    <SidebarMenuItem key={it.id}>
                      <SidebarMenuButton
                        isActive={isActive}
                        aria-current={isActive ? "page" : undefined}
                        tooltip={it.label}
                        onClick={() => go(it.id)}
                      >
                        {it.icon}
                        <span>{it.label}</span>
                      </SidebarMenuButton>
                      {it.badge && <SidebarMenuBadge className="tabular">{it.badge}</SidebarMenuBadge>}
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroup>
          ))}
        </SidebarContent>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-w-0">
        <header className="surface-chrome sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-vertical:h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumb.map((b, i) => (
                <Fragment key={b}>
                  {i > 0 && <BreadcrumbSeparator />}
                  <BreadcrumbItem>
                    {i === breadcrumb.length - 1 ? <BreadcrumbPage>{b}</BreadcrumbPage> : b}
                  </BreadcrumbItem>
                </Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
          <Button variant="outline" className="ml-auto w-72 justify-start text-muted-foreground" onClick={() => setPalette(true)}>
            <Search data-icon="inline-start" />
            <span className="flex-1 text-left font-normal">Search or jump to…</span>
            <KbdGroup>
              <Kbd>Ctrl</Kbd>
              <Kbd>K</Kbd>
            </KbdGroup>
          </Button>
          <Tooltip>
            <TooltipTrigger render={<Button variant="ghost" size="icon" aria-label="Notifications" className="relative" />}>
              <Bell />
              <span className="absolute right-2 top-2 size-2 rounded-full bg-destructive ring-2 ring-background" />
            </TooltipTrigger>
            <TooltipContent>Notifications</TooltipContent>
          </Tooltip>
          <Avatar>
            <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">ZA</AvatarFallback>
          </Avatar>
        </header>
        <div className="min-h-0 flex-1">{children}</div>
      </SidebarInset>

      <CommandDialog open={palette} onOpenChange={setPalette} title="Command palette" description="Search people and actions">
        <Command>
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
                  <Avatar size="sm">
                    <AvatarFallback>{p.split(" ").map((x) => x[0]).join("")}</AvatarFallback>
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
        </Command>
      </CommandDialog>
    </SidebarProvider>
  )
}
