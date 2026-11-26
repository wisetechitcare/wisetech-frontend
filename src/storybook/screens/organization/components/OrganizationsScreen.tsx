import { useMemo, useState } from "react"
import { Building2, ChevronsDownUp, ChevronsUpDown, Network, Plus, Search, Store, Users } from "lucide-react"
import { toast } from "sonner"

import { ConfirmDialog } from "@/ds/patterns/confirm-dialog"
import { EmptyState } from "@/ds/patterns/empty-state"
import { PageHeader } from "@/ds/patterns/page-header"
import { StatCard } from "@/ds/patterns/stat-card"
import { Button } from "@/ds/ui/button"
import { Card, CardContent, CardHeader } from "@/ds/ui/card"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/ds/ui/input-group"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ds/ui/tabs"
import { BranchEmployeesDialog } from "./BranchEmployeesDialog"
import { BranchFormDialog } from "./BranchFormDialog"
import { OrgFormDialog } from "./OrgFormDialog"
import { OrgTree } from "./OrgTree"
import { TownsPanel } from "./TownsPanel"

import { useOrganizationStore } from "@/storybook/screens/organization/hooks"
import { OrgDetailTab, OrgListTab, type Branch, type Organization } from "@/storybook/screens/organization/types/organization"
import { buildOrgTree, deleteBlocker, filterOrgTree, orgStats } from "@/storybook/screens/organization/utils/organization"

const allIds = (orgs: Organization[]) => new Set(orgs.map((o) => o.id))

interface CreateOrgTarget {
  parentId: string | null
}

interface BranchDialogTarget {
  orgId: string
  branch?: Branch
}

interface OrganizationsScreenProps {
  initialTab?: OrgListTab
  onOpenOrg: (orgId: string, tab?: OrgDetailTab) => void
}

/** The hierarchy at a glance: totals, a searchable tree of organizations and branches, and the shared Towns list. */
export function OrganizationsScreen({ initialTab = OrgListTab.HIERARCHY, onOpenOrg }: OrganizationsScreenProps) {
  const { orgs, branches, deleteOrg } = useOrganizationStore()
  const [tab, setTab] = useState<OrgListTab>(initialTab)
  const [query, setQuery] = useState<string>("")
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(orgs.filter((o) => !o.parentId).map((o) => o.id)))
  const [creating, setCreating] = useState<CreateOrgTarget | null>(null)
  const [branchDialog, setBranchDialog] = useState<BranchDialogTarget | null>(null)
  const [peopleOf, setPeopleOf] = useState<Branch | null>(null)
  const [deleting, setDeleting] = useState<Organization | null>(null)

  const tree = useMemo(() => buildOrgTree(orgs, branches), [orgs, branches])
  const visible = useMemo(() => filterOrgTree(tree, query), [tree, query])
  const stats = orgStats(orgs, branches)
  const searching = query.trim().length > 0
  const allOpen = expanded.size >= orgs.length
  const blocker = deleting && deleteBlocker(deleting, orgs, branches)
  const branchById = (id: string) => branches.find((b) => b.id === id) ?? null

  const toggle = (id: string) =>
    setExpanded((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <div className="space-y-5 p-6">
      <PageHeader
        eyebrow="Organization"
        title="Organization Profile"
        description="Your organizations, the branches under them and where people check in."
        actions={
          <Button onClick={() => setCreating({ parentId: null })}>
            <Plus data-icon="inline-start" aria-hidden /> New organization
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard size="sm" label="Organizations" value={stats.rootOrgs} tone="brand" icon={<Building2 aria-hidden />} />
        <StatCard size="sm" label="Sub-organizations" value={stats.subOrgs} tone="purple" icon={<Network aria-hidden />} />
        <StatCard size="sm" label="Branches" value={stats.totalBranches} tone="cyan" icon={<Store aria-hidden />} />
        <StatCard size="sm" label="Employees" value={stats.totalEmployees} tone="green" icon={<Users aria-hidden />} />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as OrgListTab)}>
        <TabsList variant="line" aria-label="Organization views">
          <TabsTrigger value={OrgListTab.HIERARCHY}>Hierarchy</TabsTrigger>
          <TabsTrigger value={OrgListTab.TOWNS}>Towns</TabsTrigger>
        </TabsList>

        <TabsContent value={OrgListTab.HIERARCHY}>
          <Card variant="panel" className="gap-0 py-0">
            <CardHeader className="flex flex-wrap items-center gap-2 border-b py-3">
              <InputGroup className="max-w-sm">
                <InputGroupAddon>
                  <Search aria-hidden />
                </InputGroupAddon>
                <InputGroupInput
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search organizations, branches or addresses"
                  aria-label="Search organizations and branches"
                />
              </InputGroup>
              <Button variant="ghost" size="sm" className="ml-auto" disabled={searching} onClick={() => setExpanded(allOpen ? new Set() : allIds(orgs))}>
                {allOpen ? <ChevronsDownUp data-icon="inline-start" aria-hidden /> : <ChevronsUpDown data-icon="inline-start" aria-hidden />}
                {allOpen ? "Collapse all" : "Expand all"}
              </Button>
            </CardHeader>
            <CardContent className="p-2">
              {visible.length > 0 && (
                <OrgTree
                  nodes={visible}
                  expanded={searching ? allIds(orgs) : expanded}
                  onToggle={toggle}
                  onOpenOrg={(id) => onOpenOrg(id)}
                  onAddSubOrg={(parentId) => setCreating({ parentId })}
                  onAddBranch={(orgId) => setBranchDialog({ orgId })}
                  onDeleteOrg={(id) => setDeleting(orgs.find((o) => o.id === id) ?? null)}
                  onOpenBranch={(b) => setBranchDialog({ orgId: b.companyId, branch: branchById(b.id) ?? undefined })}
                  onViewEmployees={(b) => setPeopleOf(branchById(b.id))}
                />
              )}
              {!visible.length && searching && (
                <EmptyState variant="no-match" title="Nothing matches" description={`No organization or branch matches “${query.trim()}”.`} />
              )}
              {!visible.length && !searching && (
                <EmptyState
                  icon={<Building2 />}
                  title="No organizations yet"
                  description="Create your first organization, then add its branches."
                  action={<Button onClick={() => setCreating({ parentId: null })}>New organization</Button>}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value={OrgListTab.TOWNS}>
          <TownsPanel />
        </TabsContent>
      </Tabs>

      {creating && (
        <OrgFormDialog
          open
          onOpenChange={(open) => !open && setCreating(null)}
          parentId={creating.parentId}
          onSaved={(org) => onOpenOrg(org.id, OrgDetailTab.OVERVIEW)}
        />
      )}
      {branchDialog && (
        <BranchFormDialog open onOpenChange={(open) => !open && setBranchDialog(null)} orgId={branchDialog.orgId} branch={branchDialog.branch} />
      )}
      <BranchEmployeesDialog branch={peopleOf} onOpenChange={(open) => !open && setPeopleOf(null)} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        variant={blocker ? "warning" : "delete"}
        title={blocker ? "Can't delete yet" : `Delete ${deleting?.name}?`}
        description={blocker ?? "Its profile and custom fields are removed. This can't be undone."}
        showCancel={!blocker}
        confirmLabel={blocker ? "OK" : "Delete organization"}
        onConfirm={() => {
          if (!deleting || blocker) return
          deleteOrg(deleting.id)
          toast.success(`${deleting.name} deleted.`)
        }}
      />
    </div>
  )
}
