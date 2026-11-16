import * as React from "react"
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/ds/ui/combobox"
import { PersonCell } from "./person"

export type PersonOption = {
  id: string
  name: string
  code?: string
  subtitle?: string
  avatarUrl?: string
}

const toLabel = (p: PersonOption | null) => p?.name ?? ""

function Option({ person }: { person: PersonOption }) {
  return (
    <ComboboxItem value={person}>
      <PersonCell name={person.name} code={person.code} subtitle={person.subtitle} avatarUrl={person.avatarUrl} />
    </ComboboxItem>
  )
}

/**
 * Pick one or more people by typing a name or employee code. Replaces the live `EmployeePickerField`,
 * `AllEmployeesSearchDropdown` and — for single picks — `EmployeeSelectionDialog` (a single value is never
 * a dialog). Each option shows the avatar, code and role so two people with the same name can be told apart.
 * Works on ids: pass `people` (already scoped to the user's org family by the caller) and the chosen ids.
 */
export function PersonPicker({
  id,
  people,
  value,
  onChange,
  multiple = false,
  placeholder = "Search by name or code",
  disabled,
  invalid,
  "aria-labelledby": labelledBy,
}: {
  id?: string
  people: PersonOption[]
  value: string[]
  onChange: (ids: string[]) => void
  multiple?: boolean
  placeholder?: string
  disabled?: boolean
  invalid?: boolean
  /** For multiple: the id of the visible label (the chips input has no `id` of its own). */
  "aria-labelledby"?: string
}) {
  const anchor = useComboboxAnchor()
  const byId = React.useMemo(() => new Map(people.map((p) => [p.id, p])), [people])
  const selected = value.map((v) => byId.get(v)).filter((p): p is PersonOption => !!p)
  const filter = (p: PersonOption, query: string) => {
    const q = query.trim().toLowerCase()
    return !q || p.name.toLowerCase().includes(q) || (p.code ?? "").toLowerCase().includes(q)
  }

  const list = (
    <>
      <ComboboxEmpty>No one matches. Check the spelling or the employee code.</ComboboxEmpty>
      <ComboboxList>{(p: PersonOption) => <Option key={p.id} person={p} />}</ComboboxList>
    </>
  )

  if (multiple) {
    return (
      <Combobox
        multiple
        items={people}
        value={selected}
        onValueChange={(next: PersonOption[]) => onChange(next.map((p) => p.id))}
        itemToStringLabel={toLabel}
        isItemEqualToValue={(a: PersonOption, b: PersonOption) => a.id === b.id}
        filter={filter}
        disabled={disabled}
      >
        <ComboboxChips ref={anchor} aria-invalid={invalid || undefined}>
          <ComboboxValue>
            {(values: PersonOption[]) => (
              <>
                {values.map((p) => (
                  <ComboboxChip key={p.id}>{p.name}</ComboboxChip>
                ))}
                <ComboboxChipsInput id={id} aria-labelledby={labelledBy} placeholder={values.length ? "" : placeholder} />
              </>
            )}
          </ComboboxValue>
        </ComboboxChips>
        <ComboboxContent anchor={anchor}>{list}</ComboboxContent>
      </Combobox>
    )
  }

  return (
    <Combobox
      items={people}
      value={selected[0] ?? null}
      onValueChange={(next: PersonOption | null) => onChange(next ? [next.id] : [])}
      itemToStringLabel={toLabel}
      isItemEqualToValue={(a: PersonOption, b: PersonOption) => a.id === b.id}
      filter={filter}
      disabled={disabled}
    >
      <ComboboxInput id={id} placeholder={placeholder} showClear aria-invalid={invalid || undefined} />
      <ComboboxContent>{list}</ComboboxContent>
    </Combobox>
  )
}
