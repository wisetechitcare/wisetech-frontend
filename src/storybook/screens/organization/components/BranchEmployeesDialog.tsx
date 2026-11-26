import { useMemo, useState } from "react"
import { Search, Users } from "lucide-react"

import { EmptyState } from "@/ds/patterns/empty-state"
import { FormDialog } from "@/ds/patterns/form-dialog"
import { PersonCell } from "@/ds/patterns/person"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/ds/ui/input-group"
import { Item, ItemGroup } from "@/ds/ui/item"

import { employeesOf } from "@/storybook/screens/organization/fixtures/organization"
import type { Branch } from "@/storybook/screens/organization/types/organization"
import { plural } from "@/storybook/screens/organization/utils/format"

interface BranchEmployeesDialogProps {
  branch: Branch | null
  onOpenChange: (open: boolean) => void
}

/** Read-only list of who works at a branch; the count matches the tree and the branch cards. */
export function BranchEmployeesDialog({ branch, onOpenChange }: BranchEmployeesDialogProps) {
  const [query, setQuery] = useState<string>("")
  const people = useMemo(() => (branch ? employeesOf(branch) : []), [branch])
  const q = query.trim().toLowerCase()
  const shown = q ? people.filter((p) => `${p.name} ${p.code} ${p.subtitle}`.toLowerCase().includes(q)) : people

  return (
    <FormDialog
      open={!!branch}
      onOpenChange={onOpenChange}
      title="Employees"
      description={branch ? `${branch.name} · ${plural(people.length, "employee")}` : undefined}
      icon={<Users />}
      tone="info"
    >
      <div className="space-y-3">
        <InputGroup>
          <InputGroupAddon>
            <Search aria-hidden />
          </InputGroupAddon>
          <InputGroupInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, code or role" aria-label="Search employees" />
        </InputGroup>
        {shown.length > 0 && (
          <ItemGroup>
            {shown.map((p) => (
              <Item key={p.id} role="listitem" size="sm">
                <PersonCell name={p.name} code={p.code} subtitle={p.subtitle} />
              </Item>
            ))}
          </ItemGroup>
        )}
        {!shown.length && (
          <EmptyState
            size="sm"
            variant={people.length ? "no-match" : "empty"}
            title={people.length ? "No one matches" : "No employees yet"}
            description={people.length ? "Try another name or code." : "People assigned to this branch appear here."}
          />
        )}
      </div>
    </FormDialog>
  )
}
