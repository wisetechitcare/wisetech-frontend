import type { WtSelectOption } from '@app/modules/common/components/ui/WtSelect';

export type PickOption = WtSelectOption & { name?: string; __isNew__?: boolean };

/**
 * Sections as ONE flat list — a disabled heading row, then its people.
 *
 * Flat on purpose: WtSelect windows a long menu at a fixed row height, and a react-select
 * group renders as a single (tall) row, so grouped options would overlap. Empty sections vanish.
 */
export const sectioned = (sections: Array<[string, PickOption[]]>): PickOption[] =>
  sections.flatMap(([title, rows]) =>
    rows.length ? [{ value: `__section:${title}`, label: title, isDisabled: true, isHeader: true }, ...rows] : [],
  );

/** People not yet in the list: the project's own first, then everybody else. */
export const rosterFirst = (
  all: PickOption[],
  rosterIds: Set<string> | null,
  presentIds: Set<string>,
  titles: [string, string],
): PickOption[] => {
  const open = all.filter((o) => !presentIds.has(o.value));
  if (!rosterIds?.size) return sectioned([[titles[1], open]]);
  return sectioned([
    [titles[0], open.filter((o) => rosterIds.has(o.value))],
    [titles[1], open.filter((o) => !rosterIds.has(o.value))],
  ]);
};
