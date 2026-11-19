import { useState } from "react"
import { ArrowUpRight, Fingerprint, MapPin, MoreHorizontal, Pencil, Plus, Search, Trash2, Users } from "lucide-react"
import { toast } from "sonner"

import { AutoGrid } from "@/ds/patterns/auto-grid"
import { ConfirmDialog } from "@/ds/patterns/confirm-dialog"
import { EmptyState } from "@/ds/patterns/empty-state"
import { EntityCard } from "@/ds/patterns/entity-card"
import { SectionHeader } from "@/ds/patterns/section-header"
import { Badge } from "@/ds/ui/badge"
import { Button } from "@/ds/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/ds/ui/dropdown-menu"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/ds/ui/input-group"
import { BranchEmployeesDialog } from "./BranchEmployeesDialog"
import { BranchFormDialog } from "./BranchFormDialog"

import { useOrganizationStore } from "@/ds/prototypes/hooks/organization"
import type { Branch, Organization, OrgScope } from "@/ds/prototypes/types/organization/organization"
import { plural } from "@/ds/prototypes/utils/common/format"
import { attentionLabel, countNeedingAttention } from "@/ds/prototypes/utils/organization/organization"

const MIN_CARD_WIDTH = 300

interface BranchGroup {
  owner: Organization
  items: Branch[]
}

interface BranchEditTarget {
  branch?: Branch
}

interface BranchesTabProps {
  org: Organization
  scope: OrgScope
  onShowDevices: (branchId: string) => void
}

/** Every branch the organization is responsible for, grouped by the organization that owns it. */
export function BranchesTab({ org, scope, onShowDevices }: BranchesTabProps) {
  const { orgs, now, deleteBranch, promoteBranch } = useOrganizationStore()
  const [query, setQuery] = useState<string>("")
  const [editing, setEditing] = useState<BranchEditTarget | null>(null)
  const [peopleOf, setPeopleOf] = useState<Branch | null>(null)
  const [promoting, setPromoting] = useState<Branch | null>(null)
  const [deleting, setDeleting] = useState<Branch | null>(null)

  const q = query.trim().toLowerCase()
  const groups = scope.orgIds
    .map((id) => ({
      owner: orgs.find((o) => o.id === id),
      items: scope.branches.filter((b) => b.companyId === id && (!q || `${b.name} ${b.town} ${b.city}`.toLowerCase().includes(q))),
    }))
    .filter((g): g is BranchGroup => !!g.owner && g.items.length > 0)
  const devicesAt = (branchId: string) => scope.devices.filter((d) => d.branchId === branchId)
  const promotingParent = orgs.find((o) => o.id === promoting?.companyId)
  const deletingEmployees = deleting?.employeeCount ?? 0

  return (
    <div className="space-y-5 pt-5">
      <div className="flex flex-wrap items-center gap-2">
        <InputGroup className="max-w-xs">
          <InputGroupAddon>
            <Search aria-hidden />
          </InputGroupAddon>
          <InputGroupInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search branch, town or city" aria-label="Search branches" />
        </InputGroup>
        <Button className="ml-auto" onClick={() => setEditing({})}>
          <Plus data-icon="inline-start" aria-hidden /> New branch
        </Button>
      </div>

      {!scope.branches.length && (
        <EmptyState
          icon={<MapPin />}
          title="No branches yet"
          description="Add the places people work from. Attendance check-ins are matched to a branch."
          action={<Button onClick={() => setEditing({})}>New branch</Button>}
        />
      )}
      {scope.branches.length > 0 && !groups.length && <EmptyState variant="no-match" title="No branch matches" description={`Nothing matches “${query.trim()}”.`} />}

      {groups.map(({ owner, items }) => (
        <section key={owner.id} className="space-y-3">
          {(groups.length > 1 || owner.id !== org.id) && (
            <SectionHeader title={owner.name} description={owner.id === org.id ? "Direct branches" : "Sub-organization"} />
          )}
          <AutoGrid min={MIN_CARD_WIDTH}>
            {items.map((branch) => {
              const branchDevices = devicesAt(branch.id)
              const attention = countNeedingAttention(branchDevices, now)
              return (
                <EntityCard
                  key={branch.id}
                  title={branch.name}
                  subtitle={[branch.town, branch.city, branch.state].filter(Boolean).join(", ")}
                  icon={<MapPin />}
                  tone={branch.isActive ? "cyan" : "slate"}
                  status={
                    <Badge variant={branch.isActive ? "success" : "neutral"} dot>
                      {branch.isActive ? "Active" : "Inactive"}
                    </Badge>
                  }
                  meta={attention > 0 ? <Badge variant="warning">{attentionLabel(attention)}</Badge> : <span>{plural(branchDevices.length, "device")}</span>}
                  description={branch.address}
                  actions={
                    <>
                      <Button size="sm" variant="outline" onClick={() => setEditing({ branch })}>
                        <Pencil data-icon="inline-start" aria-hidden /> Edit
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setPeopleOf(branch)} aria-label={`${plural(branch.employeeCount, "employee")} at ${branch.name}`}>
                        <Users data-icon="inline-start" aria-hidden />
                        <span className="tabular">{branch.employeeCount}</span>
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => onShowDevices(branch.id)} aria-label={`${plural(branchDevices.length, "device")} at ${branch.name}`}>
                        <Fingerprint data-icon="inline-start" aria-hidden />
                        <span className="tabular">{branchDevices.length}</span>
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button size="icon-sm" variant="ghost" className="ml-auto" aria-label={`More actions for ${branch.name}`} />}>
                          <MoreHorizontal aria-hidden />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setPromoting(branch)}>
                            <ArrowUpRight aria-hidden /> Promote to sub-organization
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onClick={() => setDeleting(branch)}>
                            <Trash2 aria-hidden /> Delete branch
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  }
                />
              )
            })}
          </AutoGrid>
        </section>
      ))}

      {editing && <BranchFormDialog open onOpenChange={(open) => !open && setEditing(null)} branch={editing.branch} orgId={org.id} />}
      <BranchEmployeesDialog branch={peopleOf} onOpenChange={(open) => !open && setPeopleOf(null)} />

      <ConfirmDialog
        open={!!promoting}
        onOpenChange={(open) => !open && setPromoting(null)}
        variant="confirm"
        title={`Make ${promoting?.name} a sub-organization?`}
        description={`A sub-organization named “${promoting?.name}” is created under ${promotingParent?.name}, and this branch${
          promoting?.employeeCount ? ` with its ${plural(promoting.employeeCount, "employee")}` : ""
        } moves into it. Employees keep their branch.`}
        confirmLabel="Promote"
        onConfirm={() => {
          const created = promoting && promoteBranch(promoting.id)
          if (created) toast.success(`${created.name} is now a sub-organization.`)
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        variant={deletingEmployees ? "warning" : "delete"}
        title={deletingEmployees ? "Can't delete yet" : `Delete ${deleting?.name}?`}
        description={
          deletingEmployees
            ? `${deleting?.name} still has ${plural(deletingEmployees, "employee")}. Move them to another branch first.`
            : `Its ${plural(devicesAt(deleting?.id ?? "").length, "biometric device")} are removed too. This can't be undone.`
        }
        showCancel={!deletingEmployees}
        confirmLabel={deletingEmployees ? "OK" : "Delete branch"}
        onConfirm={() => {
          if (!deleting || deletingEmployees) return
          deleteBranch(deleting.id)
          toast.success(`${deleting.name} deleted.`)
        }}
      />
    </div>
  )
}
