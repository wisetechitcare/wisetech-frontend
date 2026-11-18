import { Fragment, useState } from "react"
import { Download, Fingerprint, LayoutDashboard, Link2, ListChecks, MessageCircle, Pencil, Share2, Store } from "lucide-react"
import { toast } from "sonner"

import { EmptyState } from "@/ds/patterns/empty-state"
import { PageHeader } from "@/ds/patterns/page-header"
import { PageTabs } from "@/ds/patterns/page-tabs"
import { Badge } from "@/ds/ui/badge"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/ds/ui/breadcrumb"
import { Button } from "@/ds/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/ds/ui/dropdown-menu"
import { SmartAvatar } from "@/ds/ui/smart-avatar"
import { BranchesTab } from "./BranchesTab"
import { DevicesTab } from "./DevicesTab"
import { OrgFormDialog } from "./OrgFormDialog"
import { OrgOverviewTab } from "./OrgOverviewTab"
import { ProfileFieldsTab } from "./ProfileFieldsTab"

import { useOrganizationStore } from "@/ds/prototypes/hooks/organization"
import { ALL_BRANCHES } from "@/ds/prototypes/constants/organization/organization"
import { BuiltinFieldId, OrgDetailTab } from "@/ds/prototypes/types/organization/organization"
import { isFiscalYearOver, orgKind, orgPath, orgScope } from "@/ds/prototypes/utils/organization/organization"

interface OrganizationDetailScreenProps {
  orgId: string
  initialTab?: OrgDetailTab
  onBack: () => void
  onOpenOrg: (orgId: string, tab?: OrgDetailTab) => void
}

/** One page per organization: profile, branches, devices and the profile's own fields as tabs. */
export function OrganizationDetailScreen({ orgId, initialTab = OrgDetailTab.OVERVIEW, onBack, onOpenOrg }: OrganizationDetailScreenProps) {
  const { orgs, branches, devices, now } = useOrganizationStore()
  const [tab, setTab] = useState<OrgDetailTab>(initialTab)
  const [deviceBranch, setDeviceBranch] = useState<string>(ALL_BRANCHES)
  const [editing, setEditing] = useState<boolean>(false)

  const org = orgs.find((o) => o.id === orgId)
  if (!org) {
    return (
      <div className="p-6">
        <EmptyState variant="error" title="Organization not found" description="It may have been deleted." action={<Button onClick={onBack}>Back to organizations</Button>} />
      </div>
    )
  }

  const path = orgPath(orgs, org.id)
  const scope = orgScope(org.id, orgs, branches, devices)
  const kind = orgKind(org.parentId, orgs.some((o) => o.parentId === org.id))
  const parent = path.at(-2)
  const description = [org.values[BuiltinFieldId.BUSINESS_TYPE], parent && `Part of ${parent.name}`].filter(Boolean).join(" · ")

  const showDevices = (branchId: string) => {
    setDeviceBranch(branchId)
    setTab(OrgDetailTab.DEVICES)
  }

  return (
    <div className="space-y-5 p-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Button variant="link" className="h-auto p-0" onClick={onBack} />}>Organizations</BreadcrumbLink>
          </BreadcrumbItem>
          {path.map((p) => (
            <Fragment key={p.id}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {p.id === org.id ? (
                  <BreadcrumbPage>{p.name}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink render={<Button variant="link" className="h-auto p-0" onClick={() => onOpenOrg(p.id)} />}>{p.name}</BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-start gap-4">
        <SmartAvatar name={org.name} seed={org.id} src={org.logo} shape="rounded" size="lg" decorative />
        <PageHeader
          className="min-w-0 flex-1"
          eyebrow={
            <span className="flex flex-wrap items-center gap-2">
              {kind}
              {isFiscalYearOver(org.fiscalYear, now) && (
                <Badge variant="warning" dot>
                  Fiscal year ended
                </Badge>
              )}
            </span>
          }
          title={org.name}
          description={description || undefined}
          actions={
            <>
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="outline" />}>
                  <Share2 data-icon="inline-start" aria-hidden /> Share
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => toast.success("Profile link copied.")}>
                    <Link2 aria-hidden /> Copy link
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toast.info("Opens WhatsApp with the profile link.")}>
                    <MessageCircle aria-hidden /> Send on WhatsApp
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" onClick={() => toast.info("Preparing the profile PDF…")}>
                <Download data-icon="inline-start" aria-hidden /> Download PDF
              </Button>
              <Button onClick={() => setEditing(true)}>
                <Pencil data-icon="inline-start" aria-hidden /> Edit profile
              </Button>
            </>
          }
        />
      </div>

      <PageTabs
        value={tab}
        onValueChange={(v) => setTab(v as OrgDetailTab)}
        scrollOnChange={false}
        items={[
          {
            value: OrgDetailTab.OVERVIEW,
            label: "Overview",
            icon: LayoutDashboard,
            content: <OrgOverviewTab org={org} scope={scope} onEdit={() => setEditing(true)} onOpenTab={setTab} />,
          },
          {
            value: OrgDetailTab.BRANCHES,
            label: "Branches",
            icon: Store,
            badge: scope.branches.length,
            content: <BranchesTab org={org} scope={scope} onShowDevices={showDevices} />,
          },
          {
            value: OrgDetailTab.DEVICES,
            label: "Devices",
            icon: Fingerprint,
            badge: scope.devices.length,
            content: <DevicesTab scope={scope} branchFilter={deviceBranch} onBranchFilterChange={setDeviceBranch} />,
          },
          {
            value: OrgDetailTab.FIELDS,
            label: "Profile fields",
            shortLabel: "Fields",
            icon: ListChecks,
            content: <ProfileFieldsTab key={org.id} org={org} />,
          },
        ]}
      />

      {editing && <OrgFormDialog open onOpenChange={setEditing} org={org} />}
    </div>
  )
}
