import { useState, type ReactNode } from "react"
import { toast } from "sonner"
import { Bell, ChevronDown, Download, Mail, Plus, Settings, Trash2, TriangleAlert, Upload, UserPlus } from "lucide-react"
import { Button } from "@/ds/ui/button"
import { Badge } from "@/ds/ui/badge"
import { Input } from "@/ds/ui/input"
import { Label } from "@/ds/ui/label"
import { Checkbox } from "@/ds/ui/checkbox"
import { Switch } from "@/ds/ui/switch"
import { Avatar, AvatarFallback } from "@/ds/ui/avatar"
import { Progress } from "@/ds/ui/progress"
import { Skeleton } from "@/ds/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ds/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ds/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ds/ui/dropdown-menu"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/ds/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ds/ui/table"
import { EmptyState } from "@/ds/patterns/empty-state"
import { StatCard } from "@/ds/patterns/stat-card"

function Block({ title, children, wide }: { title: string; children: ReactNode; wide?: boolean }) {
  return (
    <section className={wide ? "lg:col-span-2" : undefined}>
      <h3 className="mb-3 text-label font-medium uppercase tracking-wider text-muted-foreground">{title}</h3>
      <div className="rounded-xl border bg-card p-5 shadow-e1">{children}</div>
    </section>
  )
}

export function Components() {
  const [notify, setNotify] = useState(true)
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <Block title="Buttons">
        <div className="flex flex-wrap items-center gap-2">
          <Button>
            <Plus /> Add employee
          </Button>
          <Button variant="secondary">Save draft</Button>
          <Button variant="outline">
            <Download /> Export
          </Button>
          <Button variant="ghost">Cancel</Button>
          <Button variant="destructive">
            <Trash2 /> Delete
          </Button>
          <Button variant="link">View policy</Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button size="lg">Large</Button>
          <Button>Default</Button>
          <Button size="sm">Small</Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="outline" aria-label="Settings">
                <Settings />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Settings</TooltipContent>
          </Tooltip>
          <Button disabled>Disabled</Button>
        </div>
      </Block>

      <Block title="Status badges">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="success" dot>Present</Badge>
          <Badge variant="warning" dot>Late</Badge>
          <Badge variant="danger" dot>Absent</Badge>
          <Badge variant="info" dot>On leave</Badge>
          <Badge variant="brand">Probation</Badge>
          <Badge variant="neutral">Draft</Badge>
          <Badge>Primary</Badge>
          <Badge variant="outline">Outline</Badge>
        </div>
        <div className="mt-4 flex items-center gap-3">
          {["AP", "SK", "RM"].map((i) => (
            <Avatar key={i}>
              <AvatarFallback className="bg-accent text-accent-foreground">{i}</AvatarFallback>
            </Avatar>
          ))}
          <Progress value={62} className="ml-2 h-2 flex-1" aria-label="Onboarding progress" />
          <span className="tabular text-label text-muted-foreground">62%</span>
        </div>
      </Block>

      <Block title="Form fields">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="fn">First name</Label>
            <Input id="fn" placeholder="e.g. Abhishek" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="em">Work email</Label>
            <Input id="em" type="email" defaultValue="abhishek@" aria-invalid aria-describedby="em-err" />
            <p id="em-err" className="text-label text-destructive-foreground">Enter a complete email address.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Department</Label>
            <Select defaultValue="eng">
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="eng">Engineering</SelectItem>
                <SelectItem value="hr">Human Resources</SelectItem>
                <SelectItem value="fin">Finance</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3 pt-1">
            <label className="flex items-center gap-2 text-body">
              <Checkbox defaultChecked /> Send welcome email
            </label>
            <label className="flex items-center gap-2 text-body">
              <Switch checked={notify} onCheckedChange={setNotify} /> Notify manager
            </label>
          </div>
        </div>
      </Block>

      <Block title="Overlays">
        <div className="flex flex-wrap gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Discard changes…</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <span className="mb-2 grid size-11 place-items-center rounded-xl bg-warning-soft text-warning-foreground">
                  <TriangleAlert className="size-5" />
                </span>
                <DialogTitle>Discard unsaved changes?</DialogTitle>
                <DialogDescription>Your changes to this employee haven't been saved.</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Keep editing</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button variant="destructive">Discard</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Actions <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Employee</DropdownMenuLabel>
              <DropdownMenuItem>
                <Mail /> Send email
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Upload /> Upload document
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive">
                <Trash2 /> Deactivate
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="secondary" onClick={() => toast.success("Leave approved", { description: "Abhishek · 28–30 Oct · 3 days" })}>
            <Bell /> Show toast
          </Button>
        </div>
      </Block>

      <Block title="Stat cards" wide>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Headcount" value="248" trend={{ direction: "up", value: "4.2%", good: true }} hint="vs last month" />
          <StatCard label="Present today" value="212" trend={{ direction: "down", value: "1.1%", good: false }} hint="85% of staff" />
          <StatCard label="Pending approvals" value="17" hint="5 overdue" />
          <StatCard label="Open roles" value="9" hint="42 candidates" />
        </div>
      </Block>

      <Block title="Data table" wide>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Leave balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[
              ["Abhishek Phatak", "Engineering", "success", "Present", "12.5"],
              ["Sheetal Kulkarni", "Human Resources", "info", "On leave", "6.0"],
              ["Rohan Mehta", "Finance", "warning", "Late", "9.5"],
            ].map(([n, d, v, s, b]) => (
              <TableRow key={n}>
                <TableCell className="font-medium">{n}</TableCell>
                <TableCell className="text-muted-foreground">{d}</TableCell>
                <TableCell>
                  <Badge variant={v as "success"} dot>
                    {s}
                  </Badge>
                </TableCell>
                <TableCell className="tabular text-right">{b}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Block>

      <Block title="Loading">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </Block>

      <Block title="Empty state">
        <EmptyState
          icon={<UserPlus />}
          title="No candidates yet"
          description="Publish the advert or add a candidate by hand to start the pipeline."
          action={
            <Button size="sm">
              <Plus /> Add candidate
            </Button>
          }
        />
      </Block>
    </div>
  )
}
