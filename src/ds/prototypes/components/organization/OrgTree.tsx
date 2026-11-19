import { Building2, ChevronRight, MapPin, MoreHorizontal, Plus, Trash2, Users } from "lucide-react"

import { IconBox } from "@/ds/patterns/icon-box"
import { Badge } from "@/ds/ui/badge"
import { Button } from "@/ds/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/ds/ui/dropdown-menu"
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@/ds/ui/item"
import { SmartAvatar } from "@/ds/ui/smart-avatar"

import { cn } from "@/ds/lib/utils"
import type { IOrgBranchNode, IOrgNode } from "@/models/company"
import { OrgKind, OrgTreeRowType } from "@/ds/prototypes/types/organization/organization"
import { plural } from "@/ds/prototypes/utils/common/format"
import { flattenOrgTree, orgKind } from "@/ds/prototypes/utils/organization/organization"

const INDENT = ["", "pl-8", "pl-16", "pl-24", "pl-32"]
const indent = (depth: number) => INDENT[Math.min(depth, INDENT.length - 1)]

export interface OrgTreeActions {
  onOpenOrg: (orgId: string) => void
  onAddSubOrg: (parentId: string) => void
  onAddBranch: (orgId: string) => void
  onDeleteOrg: (orgId: string) => void
  onOpenBranch: (branch: IOrgBranchNode) => void
  onViewEmployees: (branch: IOrgBranchNode) => void
}

interface OrgTreeProps extends OrgTreeActions {
  nodes: IOrgNode[]
  expanded: ReadonlySet<string>
  onToggle: (orgId: string) => void
}

export function OrgTree({ nodes, expanded, onToggle, ...actions }: OrgTreeProps) {
  return (
    <ItemGroup className="gap-1">
      {flattenOrgTree(nodes, expanded).map((row) =>
        row.type === OrgTreeRowType.ORGANIZATION ? (
          <OrgRow key={row.node.id} node={row.node} depth={row.depth} expandable={row.expandable} open={expanded.has(row.node.id)} onToggle={onToggle} {...actions} />
        ) : (
          <BranchRow key={row.branch.id} branch={row.branch} depth={row.depth} {...actions} />
        ),
      )}
    </ItemGroup>
  )
}

interface OrgRowProps extends OrgTreeActions {
  node: IOrgNode
  depth: number
  expandable: boolean
  open: boolean
  onToggle: (orgId: string) => void
}

function OrgRow({ node, depth, expandable, open, onToggle, ...actions }: OrgRowProps) {
  const kind = orgKind(node.parentOrganizationId, node.childCount > 0)
  const summary = [node.childCount > 0 && plural(node.childCount, "sub-organization"), plural(node.branchCount, "branch", "branches"), plural(node.employeeCount, "employee")]

  return (
    <Item role="listitem" size="sm" className={cn("hover:bg-muted/50", indent(depth))}>
      {expandable ? (
        <Button variant="ghost" size="icon-sm" aria-expanded={open} aria-label={`${open ? "Collapse" : "Expand"} ${node.name}`} onClick={() => onToggle(node.id)}>
          <ChevronRight aria-hidden className={cn("transition-transform", open && "rotate-90")} />
        </Button>
      ) : (
        <span aria-hidden className="size-8" />
      )}
      <ItemMedia>
        <SmartAvatar name={node.name} seed={node.id} src={node.logo} shape="rounded" size="sm" decorative />
      </ItemMedia>
      <ItemContent className="min-w-0">
        <ItemTitle>
          <Button variant="link" className="h-auto truncate p-0 text-foreground" onClick={() => actions.onOpenOrg(node.id)}>
            {node.name}
          </Button>
          <Badge variant={kind === OrgKind.SUB_ORGANIZATION ? "neutral" : "brand"}>{kind}</Badge>
        </ItemTitle>
        <ItemDescription className="tabular">{summary.filter(Boolean).join(" · ")}</ItemDescription>
      </ItemContent>
      <ItemActions>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${node.name}`} />}>
            <MoreHorizontal aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => actions.onOpenOrg(node.id)}>
              <Building2 aria-hidden /> Open profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => actions.onAddSubOrg(node.id)}>
              <Plus aria-hidden /> Add sub-organization
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => actions.onAddBranch(node.id)}>
              <MapPin aria-hidden /> Add branch
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => actions.onDeleteOrg(node.id)}>
              <Trash2 aria-hidden /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </ItemActions>
    </Item>
  )
}

interface BranchRowProps extends Pick<OrgTreeActions, "onOpenBranch" | "onViewEmployees"> {
  branch: IOrgBranchNode
  depth: number
}

function BranchRow({ branch, depth, onOpenBranch, onViewEmployees }: BranchRowProps) {
  return (
    <Item role="listitem" size="sm" className={cn("hover:bg-muted/50", indent(depth))}>
      <span aria-hidden className="size-8" />
      <ItemMedia>
        <IconBox icon={<MapPin />} tone="cyan" size="sm" />
      </ItemMedia>
      <ItemContent className="min-w-0">
        <ItemTitle>
          <Button variant="link" className="h-auto truncate p-0 text-foreground" onClick={() => onOpenBranch(branch)}>
            {branch.name}
          </Button>
          {branch.isActive === false && <Badge variant="neutral">Inactive</Badge>}
        </ItemTitle>
        <ItemDescription className="truncate">{branch.address}</ItemDescription>
      </ItemContent>
      <ItemActions>
        <Button variant="ghost" size="sm" onClick={() => onViewEmployees(branch)} aria-label={`${plural(branch.employeeCount, "employee")} at ${branch.name}`}>
          <Users data-icon="inline-start" aria-hidden />
          <span className="tabular">{branch.employeeCount}</span>
        </Button>
      </ItemActions>
    </Item>
  )
}
